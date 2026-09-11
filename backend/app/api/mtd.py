import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.mtd_record import MTDRecord
from app.models.order import Order
from app.lib.producer_assignment import (
    canonical_producer_assignment_key,
    normalize_producer_key,
    resolve_producer_by_assignment_key,
)
from app.schemas.mtd_record import MTDRecordSchema, MTDRecordCreateSchema, MTDRecordUpdateSchema

router = APIRouter()

def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(val)
        return True
    except (ValueError, TypeError, AttributeError):
        return False

def _find_mtd(db: Session, mtd_id: str) -> MTDRecord | None:
    if is_valid_uuid(mtd_id):
        return db.query(MTDRecord).filter((MTDRecord.id == uuid.UUID(mtd_id)) | (MTDRecord.legacy_id == mtd_id)).first()
    return db.query(MTDRecord).filter(MTDRecord.legacy_id == mtd_id).first()

@router.get("/mtd", response_model=List[MTDRecordSchema])
def get_mtd_records(
    form_type: str | None = None,
    cheer_form_subtype: str | None = None,
    category: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(MTDRecord)
    if cheer_form_subtype and cheer_form_subtype != "all":
        query = query.join(Order, MTDRecord.order_id == Order.id).filter(Order.cheer_form_subtype == cheer_form_subtype)
    elif form_type:
        query = query.join(Order, MTDRecord.order_id == Order.id).filter(Order.form_type == form_type)
    if category and category != "All":
        query = query.filter(MTDRecord.category == category)
    if status:
        query = query.filter(MTDRecord.status == status)
    return query.all()

@router.get("/mtd/{mtd_id}", response_model=MTDRecordSchema)
def get_mtd_record(mtd_id: str, db: Session = Depends(get_db)):
    mtd = _find_mtd(db, mtd_id)
    if not mtd:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MTD Record not found")
    return mtd

from app.api.auth import require_full_access

@router.post("/mtd", response_model=MTDRecordSchema, status_code=status.HTTP_201_CREATED)
def create_mtd_record(payload: MTDRecordCreateSchema, db: Session = Depends(get_db), _: None = Depends(require_full_access)):
    data = payload.model_dump()
    assigned_prod_str = data.pop("assigned_producer", None)
    assigned_producer_id = None
    editor_initials = None
    if assigned_prod_str:
        producer = resolve_producer_by_assignment_key(db, assigned_prod_str)
        if producer:
            assigned_producer_id = producer.id
            editor_initials = canonical_producer_assignment_key(producer)
        else:
            editor_initials = assigned_prod_str.strip().upper()

    mtd = MTDRecord(
        **data,
        assigned_producer_id=assigned_producer_id,
        editor_initials=editor_initials,
    )
    db.add(mtd)
    db.commit()
    db.refresh(mtd)
    return mtd

@router.patch("/mtd/{mtd_id}", response_model=MTDRecordSchema)
def update_mtd_record(mtd_id: str, payload: MTDRecordUpdateSchema, db: Session = Depends(get_db), _: None = Depends(require_full_access)):
    mtd = _find_mtd(db, mtd_id)
    if not mtd:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MTD Record not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "assigned_producer" in update_data:
        assigned_prod_str = update_data.pop("assigned_producer")
        previous_key = None
        if mtd.assigned_producer:
            previous_key = canonical_producer_assignment_key(mtd.assigned_producer)
        elif mtd.editor_initials:
            previous_key = mtd.editor_initials.strip().upper()

        if assigned_prod_str:
            producer = resolve_producer_by_assignment_key(db, assigned_prod_str)
            mtd.assigned_producer_id = producer.id if producer else None
            mtd.editor_initials = (
                canonical_producer_assignment_key(producer)
                if producer
                else assigned_prod_str.strip().upper()
            )
        else:
            mtd.assigned_producer_id = None
            if (
                previous_key
                and mtd.editor_initials
                and normalize_producer_key(mtd.editor_initials) == normalize_producer_key(previous_key)
            ):
                mtd.editor_initials = None

    for key, value in update_data.items():
        setattr(mtd, key, value)

    # Sync fields to linked Order if present
    if mtd.order_id:
        linked_order = db.query(Order).filter(Order.id == mtd.order_id).first()
        if linked_order:
            if "contact_name" in update_data:
                linked_order.contact_name = mtd.contact_name
                linked_order.customer_name = mtd.contact_name
            if "program_name" in update_data:
                linked_order.program_name = mtd.program_name
            if "package" in update_data:
                linked_order.package = mtd.package
            if "music_theme" in update_data:
                linked_order.music_theme = mtd.music_theme
            if "price" in update_data:
                linked_order.price = mtd.price
            if "price_compliance" in update_data:
                linked_order.price_compliance = mtd.price_compliance
            if "status" in update_data and mtd.status == "completed":
                linked_order.status = "completed"

    db.commit()
    db.refresh(mtd)
    return mtd
