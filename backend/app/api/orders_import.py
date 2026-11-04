"""Chunked sheet/order import for large uploads (Vercel-safe per request)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.auth import require_full_access
from app.api.orders import _apply_producer_assignment, _publish_order_updated
from app.core.database import get_db
from app.models.order import Order
from app.services.mtd_identity import _needs_attention_from_collection

router = APIRouter()

MAX_CHUNK_ROWS = 100


class ImportChunkRow(BaseModel):
    """Minimal row from a sheet; unknown keys ignored by Order columns."""

    external_id: str | None = None
    form_type: str = "school-all-star-cheer"
    school_gym_name: str | None = None
    team_name: str | None = None
    coach_name: str | None = None
    contact_name: str | None = None
    customer_name: str | None = None
    package: str | None = None
    music_affiliate: str | None = None
    status: str = "new"
    is_manual_entry: bool = True
    assigned_producer: str | None = None
    received_eight_count_sheet: str | None = None
    have_songs: str | None = None
    extra: dict[str, Any] = Field(default_factory=dict)


class ImportChunkRequest(BaseModel):
    rows: list[ImportChunkRow] = Field(default_factory=list)
    job_id: str | None = None
    chunk_index: int | None = None


class ImportChunkError(BaseModel):
    index: int
    message: str
    external_id: str | None = None


class ImportChunkResponse(BaseModel):
    imported: int
    failed: int
    errors: list[ImportChunkError] = Field(default_factory=list)
    order_ids: list[str] = Field(default_factory=list)
    job_id: str | None = None
    chunk_index: int | None = None


def _find_by_external_id(db: Session, external_id: str) -> Order | None:
    existing = (
        db.query(Order).filter(Order.import_external_id == external_id).first()
    )
    if existing:
        return existing
    # One-time legacy fallback from early import markers.
    marker = f"import_external_id:{external_id}"
    legacy = (
        db.query(Order)
        .filter(Order.attention_reason.contains(marker))
        .first()
    )
    if legacy and not legacy.import_external_id:
        legacy.import_external_id = external_id
        db.flush()
    return legacy


def _default_needs_attention(row: ImportChunkRow) -> bool:
    if row.received_eight_count_sheet is not None or row.have_songs is not None:
        return _needs_attention_from_collection(
            row.received_eight_count_sheet, row.have_songs
        )
    # Incomplete sheet rows land in missing-data until filled in.
    gym = (row.school_gym_name or "").strip()
    coach = (row.coach_name or row.contact_name or "").strip()
    package = (row.package or "").strip()
    return (not gym) or (not coach) or (not package) or package.upper() == "TBD"


@router.post("/orders/import/chunk", response_model=ImportChunkResponse)
def import_orders_chunk(
    payload: ImportChunkRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    rows = payload.rows[:MAX_CHUNK_ROWS]
    imported = 0
    failed = 0
    errors: list[ImportChunkError] = []
    order_ids: list[str] = []
    created: list[Order] = []

    for index, row in enumerate(rows):
        try:
            external_id = (row.external_id or "").strip() or None
            if external_id:
                existing = _find_by_external_id(db, external_id)
                if existing:
                    order_ids.append(str(existing.id))
                    imported += 1
                    continue

            data: dict[str, Any] = {
                "form_type": row.form_type or "school-all-star-cheer",
                "school_gym_name": row.school_gym_name,
                "team_name": row.team_name,
                "coach_name": row.coach_name,
                "contact_name": row.contact_name or row.coach_name,
                "customer_name": row.customer_name or row.coach_name,
                "package": row.package or "TBD",
                "music_affiliate": row.music_affiliate,
                "status": row.status or "new",
                "is_manual_entry": bool(row.is_manual_entry),
                "needs_attention": _default_needs_attention(row),
            }
            if external_id:
                data["import_external_id"] = external_id
            if row.received_eight_count_sheet is not None:
                data["received_eight_count_sheet"] = row.received_eight_count_sheet
            if row.have_songs is not None:
                data["have_songs"] = row.have_songs
            for key, value in (row.extra or {}).items():
                if hasattr(Order, key) and key not in data:
                    data[key] = value

            assign_payload = {"assigned_producer": row.assigned_producer}
            order = Order(
                **{
                    k: v
                    for k, v in data.items()
                    if k not in ("assigned_producer", "assigned_producer_id")
                }
            )
            _apply_producer_assignment(db, order, assign_payload)
            try:
                with db.begin_nested():
                    db.add(order)
                    db.flush()
            except IntegrityError:
                # Concurrent chunk with same external_id — treat as resume hit.
                if external_id:
                    existing = _find_by_external_id(db, external_id)
                    if existing:
                        order_ids.append(str(existing.id))
                        imported += 1
                        continue
                raise
            created.append(order)
            order_ids.append(str(order.id))
            imported += 1
        except Exception as exc:  # noqa: BLE001 — per-row isolation
            failed += 1
            errors.append(
                ImportChunkError(
                    index=index,
                    message=str(exc)[:300],
                    external_id=row.external_id,
                )
            )

    db.commit()
    for order in created:
        db.refresh(order)
        _publish_order_updated(order)

    return ImportChunkResponse(
        imported=imported,
        failed=failed,
        errors=errors,
        order_ids=order_ids,
        job_id=payload.job_id,
        chunk_index=payload.chunk_index,
    )
