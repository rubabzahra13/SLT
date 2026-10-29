import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.api.auth import require_full_access
from app.core.database import get_db
from app.lib.delete_norm import allow_missing_query, missing_or_found
from app.lib.pagination import page_size_query, page_token_query, paginate_query
from app.models.discount_code import DiscountCode
from app.schemas.discount_code import (
    DiscountCodeCreateSchema,
    DiscountCodeSchema,
    DiscountCodeUpdateSchema,
)

router = APIRouter()


class DiscountCodeListResponse(BaseModel):
    discount_codes: list[DiscountCodeSchema]
    next_page_token: str | None = None


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


@router.get("/discount-codes", response_model=DiscountCodeListResponse)
def get_discount_codes(
    page_size: int = Depends(page_size_query),
    page_token: str | None = Depends(page_token_query),
    db: Session = Depends(get_db),
):
    query = db.query(DiscountCode).order_by(
        DiscountCode.code.asc(), DiscountCode.id.asc()
    )
    page, next_token = paginate_query(
        query, page_size=page_size, page_token=page_token
    )
    return DiscountCodeListResponse(
        discount_codes=page, next_page_token=next_token
    )


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
    allow_missing: bool = Depends(allow_missing_query),
):
    dc = get_discount_code_by_id_or_code(db, code_id)
    if missing_or_found(
        dc, allow_missing=allow_missing, detail="Coupon code not found"
    ):
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    try:
        db.delete(dc)
        db.commit()
    except OperationalError:
        # Transient pooler/SSL drop after (or during) commit: retry once
        # against a fresh connection state.
        db.rollback()
        dc = get_discount_code_by_id_or_code(db, code_id)
        if missing_or_found(
            dc, allow_missing=True, detail="Coupon code not found"
        ):
            return Response(status_code=status.HTTP_204_NO_CONTENT)
        db.delete(dc)
        db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
