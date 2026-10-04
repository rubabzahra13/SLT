import uuid
from datetime import date, datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.api.auth import require_full_access
from app.core.database import get_db
from app.lib.producer_assignment import resolve_producer_by_assignment_key
from app.models.producer import Producer, ProducerTimeOff
from app.schemas.producer import ProducerCreateSchema, ProducerSchema, ProducerUpdateSchema

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
    if isinstance(val, (int, float)):
        return float(val / 100.0) if val > 1 else float(val)
    return val


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


def _sync_time_offs(producer: Producer, time_offs: Optional[List[Any]], db: Session) -> None:
    """Replace producer_time_off rows with the provided list (full replace)."""
    if time_offs is None:
        return

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
    for rate_key in ("default_rate", "dance_voiceover_rate", "cheer_voiceover_rate", "rush_fee_rate"):
        if rate_key in data and data[rate_key] is not None:
            data[rate_key] = _normalize_rate_value(data[rate_key])

    data["initials"] = initials

    producer = Producer(**data)
    db.add(producer)
    db.flush()
    _sync_time_offs(producer, time_offs, db)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A producer with initials “{initials}” already exists.",
        ) from None
    return _load_producer(db, producer.id)


@router.patch("/producers/{producer_id}", response_model=ProducerSchema)
def update_producer(
    producer_id: str,
    payload: ProducerUpdateSchema,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    update_data = payload.model_dump(exclude_unset=True)
    producer = _find_producer(
        db,
        producer_id,
        initials=update_data.get("initials"),
        name=update_data.get("name"),
        email=update_data.get("email"),
    )
    if not producer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producer not found")
    time_offs = update_data.pop("time_offs", None)

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

    for key, value in update_data.items():
        setattr(producer, key, value)

    _sync_time_offs(producer, time_offs, db)

    db.commit()
    # Fresh load so time_offs / extra_days are present in the response
    # (stale identity-map rows were omitting leave until a full page refresh).
    db.expire_all()
    return _load_producer(db, producer.id)


@router.delete("/producers/{producer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_producer(
    producer_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    producer = _find_producer(db, producer_id)
    if producer:
        db.delete(producer)
        db.commit()
    return None
