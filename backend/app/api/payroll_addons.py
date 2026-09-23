import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.payroll_addon import PayrollAddon
from app.models.producer import Producer
from app.models.order import Order
from app.schemas.payroll_addon import PayrollAddonCreate, PayrollAddonOut

router = APIRouter()


def _resolve_producer_id(raw_id: Optional[str], db: Session) -> Optional[uuid.UUID]:
    if not raw_id:
        return None
    raw_str = str(raw_id).strip()
    try:
        return uuid.UUID(raw_str)
    except ValueError:
        pass
    producer = (
        db.query(Producer)
        .filter(
            (Producer.legacy_id == raw_str)
            | (Producer.initials == raw_str)
            | (Producer.name == raw_str)
        )
        .first()
    )
    return producer.id if producer else None


def _resolve_order_id(raw_id: Optional[str], db: Session) -> Optional[uuid.UUID]:
    if not raw_id:
        return None
    raw_str = str(raw_id).strip()
    try:
        return uuid.UUID(raw_str)
    except ValueError:
        pass
    order = (
        db.query(Order)
        .filter(Order.legacy_id == raw_str)
        .first()
    )
    return order.id if order else None


def _resolve_uuid(raw_id: Optional[str]) -> Optional[uuid.UUID]:
    if not raw_id:
        return None
    try:
        return uuid.UUID(str(raw_id).strip())
    except ValueError:
        return None


@router.get("/payroll-addons", response_model=List[PayrollAddonOut])
def list_payroll_addons(db: Session = Depends(get_db)):
    """Return all payroll add-ons ordered by creation date descending."""
    return (
        db.query(PayrollAddon)
        .order_by(PayrollAddon.created_at.desc())
        .all()
    )


@router.post("/payroll-addons", response_model=PayrollAddonOut, status_code=201)
def create_payroll_addon(
    payload: PayrollAddonCreate, db: Session = Depends(get_db)
):
    """Create a new standalone or row-level payroll add-on (voiceover or rush fee)."""
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

    addon = PayrollAddon(**data)
    db.add(addon)
    db.commit()
    db.refresh(addon)
    return addon


@router.delete("/payroll-addons/{addon_id}", status_code=204)
def delete_payroll_addon(addon_id: uuid.UUID, db: Session = Depends(get_db)):
    """Delete a payroll add-on by ID."""
    addon = db.query(PayrollAddon).filter(PayrollAddon.id == addon_id).first()
    if not addon:
        raise HTTPException(status_code=404, detail="Payroll add-on not found")
    db.delete(addon)
    db.commit()
