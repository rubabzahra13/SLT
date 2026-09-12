import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.discount_code import DiscountCode
from app.schemas.discount_code import DiscountCodeSchema, DiscountCodeCreateSchema, DiscountCodeUpdateSchema
from app.api.auth import require_full_access

router = APIRouter()

def get_discount_code_by_id_or_code(db: Session, code_id: str) -> Optional[DiscountCode]:
    # 1. Try UUID lookup if code_id is a valid UUID format
    try:
        val = uuid.UUID(code_id)
        dc = db.query(DiscountCode).filter(DiscountCode.id == val).first()
        if dc:
            return dc
    except ValueError:
        pass

    # 2. Fallback to legacy_id or code lookup
    return db.query(DiscountCode).filter(
        (DiscountCode.legacy_id == code_id) | (DiscountCode.code == code_id.upper())
    ).first()

@router.get("/discount-codes", response_model=List[DiscountCodeSchema])
def get_discount_codes(db: Session = Depends(get_db)):
    return db.query(DiscountCode).all()

@router.post("/discount-codes", response_model=DiscountCodeSchema, status_code=status.HTTP_201_CREATED)
def create_discount_code(payload: DiscountCodeCreateSchema, db: Session = Depends(get_db), _: None = Depends(require_full_access)):
    code_str = payload.code.strip().upper()
    existing = db.query(DiscountCode).filter(DiscountCode.code == code_str).first()
    if existing:
        raise HTTPException(status_code=400, detail="Discount code already exists")
    dc = DiscountCode(
        code=code_str,
        description=payload.description,
        discount_type=payload.discount_type,
        discount_value=payload.discount_value,
    )
    db.add(dc)
    db.commit()
    db.refresh(dc)
    return dc

@router.patch("/discount-codes/{code_id}", response_model=DiscountCodeSchema)
def update_discount_code(code_id: str, payload: DiscountCodeUpdateSchema, db: Session = Depends(get_db), _: None = Depends(require_full_access)):
    dc = get_discount_code_by_id_or_code(db, code_id)
    if not dc:
        raise HTTPException(status_code=404, detail="Discount code not found")
    update_data = payload.model_dump(exclude_unset=True)
    if "code" in update_data and update_data["code"]:
        update_data["code"] = update_data["code"].strip().upper()
    for key, val in update_data.items():
        setattr(dc, key, val)
    db.commit()
    db.refresh(dc)
    return dc

@router.delete("/discount-codes/{code_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_discount_code(code_id: str, db: Session = Depends(get_db), _: None = Depends(require_full_access)):
    dc = get_discount_code_by_id_or_code(db, code_id)
    if not dc:
        raise HTTPException(status_code=404, detail="Discount code not found")
    db.delete(dc)
    db.commit()
    return None

