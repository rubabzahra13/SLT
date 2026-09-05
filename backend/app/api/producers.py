from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.producer import Producer
from app.schemas.producer import ProducerSchema, ProducerCreateSchema, ProducerUpdateSchema

router = APIRouter()

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
    # Look up by UUID or legacy_id
    producer = db.query(Producer).filter((Producer.id == producer_id) | (Producer.legacy_id == producer_id)).first()
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
    producer = db.query(Producer).filter((Producer.id == producer_id) | (Producer.legacy_id == producer_id)).first()
    if not producer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producer not found")

    db.delete(producer)
    db.commit()
    return None
