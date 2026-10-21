import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.api.auth import require_full_access
from app.core.database import get_db
from app.models.discount_code import DiscountCode
from app.schemas.discount_code import (
    DiscountCodeCreateSchema,
    DiscountCodeSchema,
    DiscountCodeUpdateSchema,
)

router = APIRouter()


def get_discount_code_by_id_or_code(db: Session, code_id: str) -> Optional[DiscountCode]:
    # 1. UUID primary key
    try:
        val = uuid.UUID(code_id)
        dc = db.query(DiscountCode).filter(DiscountCode.id == val).first()
        if dc:
            return dc
    except ValueError:
        pass

    # 2. Lookup by unique coupon code string (case-insensitive)
    needle = code_id.strip().upper()
    if not needle:
        return None
    return (
        db.query(DiscountCode)
        .filter(DiscountCode.code == needle)
        .first()
    )


@router.get("/discount-codes", response_model=List[DiscountCodeSchema])
def get_discount_codes(db: Session = Depends(get_db)):
    return db.query(DiscountCode).order_by(DiscountCode.code.asc()).all()


@router.post(
    "/discount-codes",
    response_model=DiscountCodeSchema,
    status_code=status.HTTP_201_CREATED,
)
def create_discount_code(
    payload: DiscountCodeCreateSchema,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    code_str = payload.code.strip().upper()
    if not code_str:
        raise HTTPException(status_code=400, detail="Coupon code is required")
    existing = db.query(DiscountCode).filter(DiscountCode.code == code_str).first()
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    dc = DiscountCode(code=code_str)
    db.add(dc)
    db.commit()
    db.refresh(dc)
    return dc


@router.patch("/discount-codes/{code_id}", response_model=DiscountCodeSchema)
def update_discount_code(
    code_id: str,
    payload: DiscountCodeUpdateSchema,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    dc = get_discount_code_by_id_or_code(db, code_id)
    if not dc:
        raise HTTPException(status_code=404, detail="Coupon code not found")
    update_data = payload.model_dump(exclude_unset=True)
    if "code" in update_data and update_data["code"]:
        update_data["code"] = update_data["code"].strip().upper()
        if not update_data["code"]:
            raise HTTPException(status_code=400, detail="Coupon code is required")
        clash = (
            db.query(DiscountCode)
            .filter(
                DiscountCode.code == update_data["code"],
                DiscountCode.id != dc.id,
            )
            .first()
        )
        if clash:
            raise HTTPException(status_code=400, detail="Coupon code already exists")
    for key, val in update_data.items():
        setattr(dc, key, val)
    db.commit()
    db.refresh(dc)
    return dc


@router.delete("/discount-codes/{code_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_discount_code(
    code_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    dc = get_discount_code_by_id_or_code(db, code_id)
    if not dc:
        # Idempotent: already gone (or optimistic UI raced a prior delete).
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    try:
        db.delete(dc)
        db.commit()
    except OperationalError:
        # Transient pooler/SSL drop after (or during) commit — retry once
        # against a fresh connection state.
        db.rollback()
        dc = get_discount_code_by_id_or_code(db, code_id)
        if not dc:
            return Response(status_code=status.HTTP_204_NO_CONTENT)
        db.delete(dc)
        db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
