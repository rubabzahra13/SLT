import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
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

def _find_producer(db: Session, producer_id: str) -> Producer | None:
    if is_valid_uuid(producer_id):
        return db.query(Producer).filter((Producer.id == uuid.UUID(producer_id)) | (Producer.legacy_id == producer_id)).first()
    return db.query(Producer).filter(Producer.legacy_id == producer_id).first()

@router.get("/producers", response_model=List[ProducerSchema])
def get_producers(db: Session = Depends(get_db)):
    return db.query(Producer).all()

@router.post("/producers", response_model=ProducerSchema, status_code=status.HTTP_201_CREATED)
def create_producer(payload: ProducerCreateSchema, db: Session = Depends(get_db)):
    producer = Producer(**payload.model_dump())
    db.add(producer)
    db.commit()
    db.refresh(producer)
    return producer

@router.patch("/producers/{producer_id}", response_model=ProducerSchema)
def update_producer(producer_id: str, payload: ProducerUpdateSchema, db: Session = Depends(get_db)):
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
def delete_producer(producer_id: str, db: Session = Depends(get_db)):
    producer = _find_producer(db, producer_id)
    if not producer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producer not found")

    db.delete(producer)
    db.commit()
    return None
