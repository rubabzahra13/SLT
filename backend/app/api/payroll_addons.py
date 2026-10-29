import uuid
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.lib.delete_norm import allow_missing_query, missing_or_found
from app.lib.pagination import page_size_query, page_token_query, paginate_query
from app.lib.producer_assignment import resolve_producer_by_assignment_key
from app.models.payroll_addon import PayrollAddon
from app.models.order import Order
from app.schemas.payroll_addon import (
    PayrollAddonCreate,
    PayrollAddonOut,
    PayrollAddonUpdate,
)
from app.services.rush_fee import RushFeeValidationError, apply_rush_fee_fields

router = APIRouter()


class PayrollAddonListResponse(BaseModel):
    payroll_addons: list[PayrollAddonOut]
    next_page_token: str | None = None


def _resolve_producer_id(raw_id: Optional[str], db: Session) -> Optional[uuid.UUID]:
    if not raw_id:
        return None
    raw_str = str(raw_id).strip()
    try:
        return uuid.UUID(raw_str)
    except ValueError:
        pass
    producer = resolve_producer_by_assignment_key(db, raw_str)
    return producer.id if producer else None


def _resolve_order_id(raw_id: Optional[str], db: Session) -> Optional[uuid.UUID]:
    if not raw_id:
        return None
    raw_str = str(raw_id).strip()
    try:
        return uuid.UUID(raw_str)
    except ValueError:
        pass
    return None


def _decimal(value) -> Optional[Decimal]:
    if value is None:
        return None
    return Decimal(str(value))


def _apply_rush_fields(data: dict) -> dict:
    try:
        normalized = apply_rush_fee_fields(
            addon_type=data["addon_type"],
            amount=_decimal(data.get("amount")),
            quantity=data.get("quantity"),
            unit_amount=_decimal(data.get("unit_amount")),
            compensation_rate=data.get("compensation_rate"),
            compensation_overridden=bool(data.get("compensation_overridden")),
        )
    except RushFeeValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    data.update(normalized)
    return data


def _resolve_uuid(raw_id: Optional[str]) -> Optional[uuid.UUID]:
    if not raw_id:
        return None
    try:
        return uuid.UUID(str(raw_id).strip())
    except ValueError:
        return None


@router.get("/payroll-addons", response_model=PayrollAddonListResponse)
def list_payroll_addons(
    page_size: int = Depends(page_size_query),
    page_token: str | None = Depends(page_token_query),
    db: Session = Depends(get_db),
):
    """Return payroll add-ons ordered by creation date descending (AIP-158)."""
    query = db.query(PayrollAddon).order_by(
        PayrollAddon.created_at.desc(), PayrollAddon.id.asc()
    )
    page, next_token = paginate_query(
        query, page_size=page_size, page_token=page_token
    )
    return PayrollAddonListResponse(
        payroll_addons=page, next_page_token=next_token
    )


@router.post("/payroll-addons", response_model=PayrollAddonOut, status_code=201)
def create_payroll_addon(
    payload: PayrollAddonCreate, db: Session = Depends(get_db)
):
    """Create a standalone or row-level payroll add-on (voiceover, rush fee, or misc)."""
    data = payload.model_dump()

    raw_mtd_id = str(data.get("mtd_id")).strip() if data.get("mtd_id") else None
    raw_order_id = str(data.get("order_id")).strip() if data.get("order_id") else None

    # Resolve IDs gracefully for legacy string IDs (e.g. "prod-3", "ord-101")
    resolved_producer_id = _resolve_producer_id(data.get("producer_id"), db)
    resolved_order_id = _resolve_order_id(raw_order_id, db)
    resolved_mtd_id = _resolve_uuid(raw_mtd_id)

    data["producer_id"] = resolved_producer_id
    data["order_id"] = resolved_order_id
    data["mtd_id"] = resolved_mtd_id

    # If raw string IDs were passed that couldn't be converted to UUIDs, store in notes for frontend recovery
    extra_notes = []
    if raw_mtd_id and not resolved_mtd_id:
        extra_notes.append(f"mtd_id:{raw_mtd_id}")
    if raw_order_id and not resolved_order_id:
        extra_notes.append(f"order_id:{raw_order_id}")

    if extra_notes:
        existing_notes = data.get("notes") or ""
        data["notes"] = f"{existing_notes} [{'; '.join(extra_notes)}]".strip()

    _apply_rush_fields(data)

    addon = PayrollAddon(**data)
    db.add(addon)
    db.commit()
    db.refresh(addon)
    return addon


@router.patch("/payroll-addons/{addon_id}", response_model=PayrollAddonOut)
def update_payroll_addon(
    addon_id: uuid.UUID,
    payload: PayrollAddonUpdate,
    db: Session = Depends(get_db),
):
    """Update rush-fee quantity, unit amount, or the order-specific rate override."""
    addon = db.query(PayrollAddon).filter(PayrollAddon.id == addon_id).first()
    if not addon:
        raise HTTPException(status_code=404, detail="Payroll add-on not found")

    patch = payload.model_dump(exclude_unset=True)
    if "producer_id" in patch:
        addon.producer_id = _resolve_producer_id(patch.get("producer_id"), db)
    if "producer_initials" in patch:
        addon.producer_initials = patch.get("producer_initials")
    if "notes" in patch:
        addon.notes = patch.get("notes")

    quantity = patch["quantity"] if "quantity" in patch else addon.quantity
    unit_amount = (
        patch["unit_amount"] if "unit_amount" in patch else addon.unit_amount
    )
    amount = patch["amount"] if "amount" in patch else addon.amount
    if "compensation_overridden" in patch:
        overridden = bool(patch["compensation_overridden"])
    else:
        overridden = bool(addon.compensation_overridden)
    if "compensation_rate" in patch:
        rate = patch.get("compensation_rate")
    else:
        rate = addon.compensation_rate

    normalized = _apply_rush_fields(
        {
            "addon_type": addon.addon_type,
            "amount": amount,
            "quantity": quantity,
            "unit_amount": unit_amount,
            "compensation_rate": rate,
            "compensation_overridden": overridden,
        }
    )
    addon.amount = normalized["amount"]
    addon.quantity = normalized["quantity"]
    addon.unit_amount = normalized["unit_amount"]
    addon.compensation_rate = normalized["compensation_rate"]
    addon.compensation_overridden = normalized["compensation_overridden"]

    db.commit()
    db.refresh(addon)
    return addon


@router.delete("/payroll-addons/{addon_id}", status_code=204)
def delete_payroll_addon(
    addon_id: uuid.UUID,
    db: Session = Depends(get_db),
    allow_missing: bool = Depends(allow_missing_query),
):
    """Delete a payroll add-on by ID (AIP-135 allow_missing)."""
    addon = db.query(PayrollAddon).filter(PayrollAddon.id == addon_id).first()
    if missing_or_found(
        addon, allow_missing=allow_missing, detail="Payroll add-on not found"
    ):
        return None
    db.delete(addon)
    db.commit()
