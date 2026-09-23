import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload
from app.core.database import get_db
from app.models.producer import Producer
from app.schemas.producer import ProducerSchema, ProducerCreateSchema, ProducerUpdateSchema

router = APIRouter()

def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(val)
        return True
    except (ValueError, TypeError, AttributeError):
        return False

from sqlalchemy import func
from app.lib.producer_assignment import resolve_producer_by_assignment_key

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

from app.api.auth import require_full_access

@router.get("/producers", response_model=List[ProducerSchema])
def get_producers(db: Session = Depends(get_db)):
    # Eager-load time_offs so serializing each producer's time_offs does not
    # fire one query per producer (N+1) against the remote database.
    return db.query(Producer).options(selectinload(Producer.time_offs)).all()

@router.post("/producers", response_model=ProducerSchema, status_code=status.HTTP_201_CREATED)
def create_producer(payload: ProducerCreateSchema, db: Session = Depends(get_db), _: None = Depends(require_full_access)):
    data = payload.model_dump()
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
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A producer with initials “{initials}” already exists.",
        ) from None
    db.refresh(producer)
    return producer

@router.patch("/producers/{producer_id}", response_model=ProducerSchema)
def update_producer(producer_id: str, payload: ProducerUpdateSchema, db: Session = Depends(get_db), _: None = Depends(require_full_access)):
    producer = _find_producer(db, producer_id)
    if not producer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producer not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(producer, key, value)

    db.commit()
    db.refresh(producer)
    return producer

@router.delete("/producers/{producer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_producer(producer_id: str, db: Session = Depends(get_db), _: None = Depends(require_full_access)):
    producer = _find_producer(db, producer_id)
    if producer:
        db.delete(producer)
        db.commit()
    return None
