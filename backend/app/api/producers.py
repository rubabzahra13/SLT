import asyncio
import json
import uuid
from datetime import date, datetime, timezone
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.orm.attributes import flag_modified

from app.api.auth import get_current_user, require_full_access
from app.core.database import get_db
from app.lib.producer_assignment import (
    canonical_producer_assignment_key,
    normalize_producer_key,
    resolve_producer_by_assignment_key,
)
from app.models.mtd_record import MTDRecord
from app.models.order import Order
from app.models.producer import Producer, ProducerTimeOff
from app.models.user import User
from app.schemas.mtd_record import MTDRecordSchema
from app.schemas.order import OrderSchema
from app.schemas.producer import ProducerCreateSchema, ProducerSchema, ProducerUpdateSchema
from app.services.board_events import board_event_hub
from app.services.producer_events import producer_event_hub

router = APIRouter()

_LEGACY_GENERAL_CATEGORY = "general"
_CANONICAL_TEAM_PERF_CATEGORY = "Team Performance / Variety"


def _rewrite_legacy_general_category(categories: Any) -> list[str]:
    if not isinstance(categories, list):
        return []
    next_cats: list[str] = []
    seen: set[str] = set()
    for raw in categories:
        if not isinstance(raw, str):
            continue
        value = (
            _CANONICAL_TEAM_PERF_CATEGORY
            if raw.strip().lower() == _LEGACY_GENERAL_CATEGORY
            else raw
        )
        if value in seen:
            continue
        next_cats.append(value)
        seen.add(value)
    return next_cats


def _normalize_rate_value(val: Any) -> Any:
    if val is None:
        return None
    try:
        number = float(val)
    except (TypeError, ValueError):
        return val
    return number / 100.0 if number > 1 else number


def _rewrite_legacy_general_rates(rates: Any) -> Any:
    if not isinstance(rates, dict):
        return rates
    general_keys = [
        key
        for key in rates
        if isinstance(key, str) and key.strip().lower() == _LEGACY_GENERAL_CATEGORY
    ]
    next_rates = {
        key: _normalize_rate_value(value)
        for key, value in rates.items()
        if not (isinstance(key, str) and key.strip().lower() == _LEGACY_GENERAL_CATEGORY)
    }
    if general_keys:
        general_rate = rates.get(general_keys[0])
        if _CANONICAL_TEAM_PERF_CATEGORY not in next_rates and general_rate is not None:
            next_rates[_CANONICAL_TEAM_PERF_CATEGORY] = _normalize_rate_value(general_rate)
    return next_rates


def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(val)
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def _parse_date(val: Any) -> Optional[date]:
    if val is None:
        return None
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        return val.date()
    text = str(val).strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).date()
    except ValueError:
        try:
            return date.fromisoformat(text[:10])
        except ValueError:
            return None


def _as_utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _touch_updated_at(producer: Producer) -> None:
    producer.updated_at = datetime.now(timezone.utc)


def _serialize_producer(producer: Producer) -> dict[str, Any]:
    return ProducerSchema.model_validate(producer).model_dump(mode="json")


def _publish_producer_updated(producer: Producer) -> None:
    producer_event_hub.publish(
        {
            "type": "producer.updated",
            "producer": _serialize_producer(producer),
        }
    )


def _cascade_assignment_key_change(
    db: Session,
    producer: Producer,
    old_key: str,
    new_key: str,
) -> None:
    """Keep Orders / MTD assignment strings aligned when initials change.

    MTD serializes assigned_producer from the Producer relationship (FK), but
    Orders store initials as a plain string. Without this cascade, other
    browsers briefly resolve the old key to nobody and show Assign.
    """
    old_norm = normalize_producer_key(old_key)
    new_norm = normalize_producer_key(new_key)
    if not old_norm or not new_norm or old_norm == new_norm:
        return

    canonical = canonical_producer_assignment_key(producer) or new_norm
    touched_orders: list[Order] = []
    touched_mtd: list[MTDRecord] = []

    orders = (
        db.query(Order)
        .filter(
            (Order.assigned_producer_id == producer.id)
            | (func.upper(Order.assigned_producer) == old_norm)
            | (func.upper(Order.editor_request) == old_norm)
            | (func.upper(Order.requested_producer) == old_norm)
            | (func.upper(Order.requested_editor) == old_norm)
        )
        .all()
    )
    for order in orders:
        changed = False
        if order.assigned_producer_id == producer.id or normalize_producer_key(
            order.assigned_producer
        ) == old_norm:
            if order.assigned_producer != canonical:
                order.assigned_producer = canonical
                changed = True
            if order.assigned_producer_id != producer.id:
                order.assigned_producer_id = producer.id
                changed = True
        if normalize_producer_key(order.editor_request) == old_norm:
            order.editor_request = canonical
            changed = True
        if normalize_producer_key(order.requested_producer) == old_norm:
            order.requested_producer = canonical
            changed = True
        if normalize_producer_key(order.requested_editor) == old_norm:
            order.requested_editor = canonical
            changed = True
        if changed:
            touched_orders.append(order)

    mtd_rows = (
        db.query(MTDRecord)
        .filter(
            (MTDRecord.assigned_producer_id == producer.id)
            | (func.upper(MTDRecord.editor_initials) == old_norm)
            | (func.upper(MTDRecord.editor_request) == old_norm)
        )
        .all()
    )
    for mtd in mtd_rows:
        changed = False
        if mtd.assigned_producer_id == producer.id or normalize_producer_key(
            mtd.editor_initials
        ) == old_norm:
            if mtd.editor_initials != canonical:
                mtd.editor_initials = canonical
                changed = True
            if mtd.assigned_producer_id != producer.id:
                mtd.assigned_producer_id = producer.id
                changed = True
        if normalize_producer_key(mtd.editor_request) == old_norm:
            mtd.editor_request = canonical
            changed = True
        if changed:
            touched_mtd.append(mtd)

    for order in touched_orders:
        board_event_hub.publish(
            {
                "type": "order.updated",
                "order": OrderSchema.model_validate(order).model_dump(mode="json"),
            }
        )
    for mtd in touched_mtd:
        board_event_hub.publish(
            {
                "type": "mtd.updated",
                "mtd": MTDRecordSchema.model_validate(mtd).model_dump(mode="json"),
            }
        )


def _publish_producer_deleted(producer_id: uuid.UUID) -> None:
    producer_event_hub.publish(
        {
            "type": "producer.deleted",
            "id": str(producer_id),
        }
    )


def _conflict_detail(producer: Producer) -> dict[str, Any]:
    return {
        "message": "Producer was updated elsewhere",
        "producer": _serialize_producer(producer),
    }


def _time_off_row_from_payload(item: dict, producer_id: uuid.UUID) -> Optional[ProducerTimeOff]:
    start = _parse_date(item.get("start_date"))
    end = _parse_date(item.get("end_date")) or start
    if not start or not end:
        return None
    raw_id = item.get("id")
    row_id = uuid.UUID(str(raw_id)) if raw_id and is_valid_uuid(str(raw_id)) else uuid.uuid4()
    return ProducerTimeOff(
        id=row_id,
        producer_id=producer_id,
        start_date=start,
        end_date=end,
        type=(item.get("type") or "personal").strip() or "personal",
        reason=item.get("reason") or "",
    )


def _sync_time_offs(producer: Producer, time_offs: Optional[List[Any]], db: Session) -> bool:
    """Replace producer_time_off rows with the provided list (full replace).

    Returns True when time_offs were provided (and thus the producer was touched).
    """
    if time_offs is None:
        return False

    # Clear existing rows via the relationship so cascade delete-orphan applies.
    producer.time_offs.clear()
    db.flush()

    for raw in time_offs:
        item = raw if isinstance(raw, dict) else (
            raw.model_dump() if hasattr(raw, "model_dump") else dict(raw)
        )
        row = _time_off_row_from_payload(item, producer.id)
        if row is not None:
            producer.time_offs.append(row)
    _touch_updated_at(producer)
    return True


def _find_producer(
    db: Session,
    producer_id: str,
    initials: Optional[str] = None,
    name: Optional[str] = None,
    email: Optional[str] = None,
) -> Producer | None:
    if not producer_id or not str(producer_id).strip():
        return None
    pid_str = str(producer_id).strip()

    # 1. UUID lookup
    if is_valid_uuid(pid_str):
        prod = db.query(Producer).filter(Producer.id == uuid.UUID(pid_str)).first()
        if prod:
            return prod

    # 2. Assignment key (initials / name)
    prod = resolve_producer_by_assignment_key(db, pid_str)
    if prod:
        return prod

    # 3. Case-insensitive fallback on name or initials from path param
    prod = db.query(Producer).filter(
        (func.lower(Producer.name) == pid_str.lower()) |
        (func.lower(Producer.initials) == pid_str.lower())
    ).first()
    if prod:
        return prod

    # 4. Fallback lookup by payload initials, name, or email (handles synthetic client IDs like prod-12345)
    if initials and initials.strip():
        prod = db.query(Producer).filter(func.lower(Producer.initials) == initials.strip().lower()).first()
        if prod:
            return prod
    if name and name.strip():
        prod = db.query(Producer).filter(func.lower(Producer.name) == name.strip().lower()).first()
        if prod:
            return prod
    if email and email.strip():
        prod = db.query(Producer).filter(func.lower(Producer.email) == email.strip().lower()).first()
        if prod:
            return prod

    return None


def _load_producer(db: Session, producer_id: uuid.UUID) -> Producer:
    return (
        db.query(Producer)
        .options(selectinload(Producer.time_offs))
        .filter(Producer.id == producer_id)
        .one()
    )


@router.get("/producers", response_model=List[ProducerSchema])
def get_producers(db: Session = Depends(get_db)):
    # Eager-load time_offs so serializing each producer's time_offs does not
    # fire one query per producer (N+1) against the remote database.
    # Stable name order matches /api/bootstrap so the roster never reshuffles.
    return (
        db.query(Producer)
        .options(selectinload(Producer.time_offs))
        .order_by(Producer.name.asc())
        .all()
    )


@router.get("/producers/stream")
async def stream_producers(_: User = Depends(get_current_user)):
    """Authenticated SSE fan-out of confirmed producer changes."""
    queue = producer_event_hub.subscribe()

    async def event_generator():
        try:
            yield f"event: ready\ndata: {json.dumps({'ok': True})}\n\n"
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=25.0)
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
                    continue
                event_type = str(event.get("type") or "message")
                yield f"event: {event_type}\ndata: {json.dumps(event, default=str)}\n\n"
        finally:
            producer_event_hub.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/producers", response_model=ProducerSchema, status_code=status.HTTP_201_CREATED)
def create_producer(
    payload: ProducerCreateSchema,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    data = payload.model_dump()
    time_offs = data.pop("time_offs", None)
    initials = (data.get("initials") or "").strip().upper()
    if not initials:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Producer initials are required.",
        )

    existing = db.query(Producer).filter(Producer.initials == initials).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A producer with initials “{initials}” already exists.",
        )

    categories = data.get("categories") or []
    data["categories"] = _rewrite_legacy_general_category(categories)
    if "rates_by_category" in data:
        data["rates_by_category"] = _rewrite_legacy_general_rates(
            data.get("rates_by_category")
        )
    for rate_key in ("default_rate", "dance_voiceover_rate", "cheer_voiceover_rate", "rush_fee_rate"):
        if rate_key in data and data[rate_key] is not None:
            data[rate_key] = _normalize_rate_value(data[rate_key])

    data["initials"] = initials

    producer = Producer(**data)
    db.add(producer)
    db.flush()
    _sync_time_offs(producer, time_offs, db)
    _touch_updated_at(producer)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A producer with initials “{initials}” already exists.",
        ) from None
    loaded = _load_producer(db, producer.id)
    _publish_producer_updated(loaded)
    return loaded


@router.patch("/producers/{producer_id}", response_model=ProducerSchema)
def update_producer(
    producer_id: str,
    payload: ProducerUpdateSchema,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    update_data = payload.model_dump(exclude_unset=True)
    if_match = update_data.pop("if_match_updated_at", None)
    producer = _find_producer(
        db,
        producer_id,
        initials=update_data.get("initials"),
        name=update_data.get("name"),
        email=update_data.get("email"),
    )
    if not producer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producer not found")

    if if_match is not None:
        client_ts = _as_utc(if_match if isinstance(if_match, datetime) else None)
        if client_ts is None and isinstance(if_match, str):
            try:
                client_ts = _as_utc(datetime.fromisoformat(if_match.replace("Z", "+00:00")))
            except ValueError:
                client_ts = None
        server_ts = _as_utc(producer.updated_at)
        if client_ts and server_ts and server_ts > client_ts:
            current = _load_producer(db, producer.id)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=_conflict_detail(current),
            )

    time_offs = update_data.pop("time_offs", None)
    old_assignment_key = canonical_producer_assignment_key(producer)

    if "categories" in update_data:
        update_data["categories"] = _rewrite_legacy_general_category(
            update_data.get("categories")
        )
    if "rates_by_category" in update_data:
        update_data["rates_by_category"] = _rewrite_legacy_general_rates(
            update_data.get("rates_by_category")
        )
    for rate_key in ("default_rate", "dance_voiceover_rate", "cheer_voiceover_rate", "rush_fee_rate"):
        if rate_key in update_data and update_data[rate_key] is not None:
            update_data[rate_key] = _normalize_rate_value(update_data[rate_key])

    if "initials" in update_data and update_data["initials"] is not None:
        update_data["initials"] = str(update_data["initials"]).strip().upper()

    for key, value in update_data.items():
        setattr(producer, key, value)

    # JSON columns are not always marked dirty by identity comparison alone.
    for json_key in (
        "categories",
        "work_days",
        "extra_days",
        "rates_by_category",
        "rate_overrides",
        "manual_input_fields",
    ):
        if json_key in update_data:
            flag_modified(producer, json_key)

    touched_leave = _sync_time_offs(producer, time_offs, db)
    if update_data or touched_leave:
        _touch_updated_at(producer)

    new_assignment_key = canonical_producer_assignment_key(producer)
    if (
        "initials" in update_data
        and old_assignment_key
        and new_assignment_key
        and normalize_producer_key(old_assignment_key)
        != normalize_producer_key(new_assignment_key)
    ):
        _cascade_assignment_key_change(
            db, producer, old_assignment_key, new_assignment_key
        )

    db.commit()
    # Fresh load so time_offs / extra_days are present in the response
    # (stale identity-map rows were omitting leave until a full page refresh).
    db.expire_all()
    loaded = _load_producer(db, producer.id)
    _publish_producer_updated(loaded)
    return loaded


@router.delete("/producers/{producer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_producer(
    producer_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    producer = _find_producer(db, producer_id)
    if producer:
        deleted_id = producer.id
        db.delete(producer)
        db.commit()
        _publish_producer_deleted(deleted_id)
    return None
