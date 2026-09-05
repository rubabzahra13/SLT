import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.mtd_record import MTDRecord
from app.models.order import Order
from app.models.producer import Producer
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
def get_mtd_records(db: Session = Depends(get_db)):
    records = db.query(MTDRecord).all()
    return records

@router.get("/mtd/{mtd_id}", response_model=MTDRecordSchema)
def get_mtd_record(mtd_id: str, db: Session = Depends(get_db)):
    mtd = _find_mtd(db, mtd_id)
    if not mtd:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MTD Record not found")
    return mtd

@router.post("/mtd", response_model=MTDRecordSchema, status_code=status.HTTP_201_CREATED)
def create_mtd_record(payload: MTDRecordCreateSchema, db: Session = Depends(get_db)):
    data = payload.model_dump()
    assigned_prod_str = data.pop("assigned_producer", None)
    assigned_producer_id = None
    if assigned_prod_str:
        p = db.query(Producer).filter(Producer.initials == assigned_prod_str.strip()).first()
        if p:
            assigned_producer_id = p.id

    mtd = MTDRecord(**data, assigned_producer_id=assigned_producer_id, editor_initials=assigned_prod_str)
    db.add(mtd)
    db.commit()
    db.refresh(mtd)
    return mtd

@router.patch("/mtd/{mtd_id}", response_model=MTDRecordSchema)
def update_mtd_record(mtd_id: str, payload: MTDRecordUpdateSchema, db: Session = Depends(get_db)):
    mtd = _find_mtd(db, mtd_id)
    if not mtd:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MTD Record not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "assigned_producer" in update_data:
        assigned_prod_str = update_data.pop("assigned_producer")
        if assigned_prod_str:
            p = db.query(Producer).filter(Producer.initials == assigned_prod_str.strip()).first()
            mtd.assigned_producer_id = p.id if p else None
            mtd.editor_initials = assigned_prod_str
        else:
            mtd.assigned_producer_id = None

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
