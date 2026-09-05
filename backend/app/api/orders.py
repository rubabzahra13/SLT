import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.order import Order
from app.schemas.order import OrderSchema, OrderCreateSchema, OrderUpdateSchema

router = APIRouter()

def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(val)
        return True
    except (ValueError, TypeError, AttributeError):
        return False

def _find_order(db: Session, order_id: str) -> Order | None:
    if is_valid_uuid(order_id):
        return db.query(Order).filter((Order.id == uuid.UUID(order_id)) | (Order.legacy_id == order_id)).first()
    return db.query(Order).filter(Order.legacy_id == order_id).first()

@router.get("/orders", response_model=List[OrderSchema])
def get_orders(db: Session = Depends(get_db)):
    return db.query(Order).all()

@router.get("/orders/{order_id}", response_model=OrderSchema)
def get_order(order_id: str, db: Session = Depends(get_db)):
    order = _find_order(db, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order

@router.post("/orders", response_model=OrderSchema, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreateSchema, db: Session = Depends(get_db)):
    order = Order(**payload.model_dump())
    db.add(order)
    db.commit()
    db.refresh(order)
    return order

@router.patch("/orders/{order_id}", response_model=OrderSchema)
def update_order(order_id: str, payload: OrderUpdateSchema, db: Session = Depends(get_db)):
    order = _find_order(db, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(order, key, value)

    db.commit()
    db.refresh(order)
    return order
