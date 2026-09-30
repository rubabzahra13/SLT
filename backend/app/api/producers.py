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


def _find_producer(db: Session, producer_id: str) -> Producer | None:
    if not producer_id or not str(producer_id).strip():
        return None
    pid_str = str(producer_id).strip()

    # 1. UUID lookup
    if is_valid_uuid(pid_str):
        prod = db.query(Producer).filter(
            (Producer.id == uuid.UUID(pid_str)) | (Producer.legacy_id == pid_str)
        ).first()
        if prod:
            return prod

    # 2. Exact legacy_id match
    prod = db.query(Producer).filter(Producer.legacy_id == pid_str).first()
    if prod:
        return prod

    # 3. Handle prod- prefix variations (prod-10 vs 10)
    if pid_str.startswith("prod-"):
        short_id = pid_str.replace("prod-", "")
        prod = db.query(Producer).filter(Producer.legacy_id == short_id).first()
        if prod:
            return prod
    else:
        full_id = f"prod-{pid_str}"
        prod = db.query(Producer).filter(Producer.legacy_id == full_id).first()
        if prod:
            return prod

    # 4. Lookup using assignment key resolver (checks initials, name, first name, legacy_id)
    prod = resolve_producer_by_assignment_key(db, pid_str)
    if prod:
        return prod

    # 5. Case-insensitive fallback on name or initials
    return db.query(Producer).filter(
        (func.lower(Producer.name) == pid_str.lower()) |
        (func.lower(Producer.initials) == pid_str.lower())
    ).first()


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
    return db.query(Producer).options(selectinload(Producer.time_offs)).all()


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

    if not (data.get("specialty") or "").strip():
        categories = data.get("categories") or []
        data["specialty"] = categories[0] if categories else "General"

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
    producer = _find_producer(db, producer_id)
    if not producer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producer not found")

    update_data = payload.model_dump(exclude_unset=True)
    time_offs = update_data.pop("time_offs", None)

    for key, value in update_data.items():
        setattr(producer, key, value)

    _sync_time_offs(producer, time_offs, db)

    db.commit()
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
