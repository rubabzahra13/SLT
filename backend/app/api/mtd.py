import uuid
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from app.core.database import get_db
from app.models.mtd_record import MTDRecord
from app.models.order import Order
from app.lib.producer_assignment import (
    canonical_producer_assignment_key,
    normalize_producer_key,
    resolve_producer_by_assignment_key,
)
from app.schemas.mtd_record import (
    MTDRecordSchema,
    MTDRecordCreateSchema,
    MTDRecordUpdateSchema,
    ManualScheduleCreateSchema,
)
from app.schemas.order import OrderSchema
from app.services.board_events import board_event_hub

router = APIRouter()

def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(val)
        return True
    except (ValueError, TypeError, AttributeError):
        return False

def _find_mtd(db: Session, mtd_id: str) -> MTDRecord | None:
    if is_valid_uuid(mtd_id):
        parsed_uuid = uuid.UUID(mtd_id)
        mtd = (
            db.query(MTDRecord)
            .filter(
                (MTDRecord.id == parsed_uuid)
                | (MTDRecord.order_id == parsed_uuid)
                | (MTDRecord.legacy_id == mtd_id)
            )
            .first()
        )
        if mtd:
            return mtd
    return db.query(MTDRecord).filter(MTDRecord.legacy_id == mtd_id).first()

@router.get("/mtd", response_model=List[MTDRecordSchema])
def get_mtd_records(
    form_type: str | None = None,
    cheer_form_subtype: str | None = None,
    category: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db)
):
    # Eager-load the producer relationship so serializing assigned_producer for
    # every row does NOT fire one query per record (N+1). This collapses ~248
    # extra round-trips to Supabase into a single batched query.
    query = db.query(MTDRecord).options(selectinload(MTDRecord.assigned_producer))
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
    order_id = data.get("order_id")

    # Resolve legacy order ids to the real UUID FK before insert.
    if order_id is not None:
        from app.api.orders import _find_order

        linked = _find_order(db, str(order_id))
        if linked:
            data["order_id"] = linked.id
            order_id = linked.id
        elif not isinstance(order_id, uuid.UUID):
            # Non-UUID that didn't resolve — omit FK rather than 422.
            data["order_id"] = None
            order_id = None

    # If an MTD record already exists for this order_id, update it instead of duplicating
    existing_mtd = None
    if order_id:
        existing_mtd = _find_mtd(db, str(order_id))

    if existing_mtd:
        assigned_prod_str = data.pop("assigned_producer", None)
        if assigned_prod_str:
            producer = resolve_producer_by_assignment_key(db, assigned_prod_str)
            existing_mtd.assigned_producer_id = producer.id if producer else None
            existing_mtd.editor_initials = (
                canonical_producer_assignment_key(producer)
                if producer
                else assigned_prod_str.strip().upper()
            )
        for field, value in data.items():
            if value is not None:
                setattr(existing_mtd, field, value)
        db.commit()
        db.refresh(existing_mtd)
        return existing_mtd

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
            if producer:
                mtd.assigned_producer_id = producer.id
                mtd.editor_initials = canonical_producer_assignment_key(producer)
            else:
                # Don't orphan the FK when a rename races ahead of producer
                # persistence — keep the link and only refresh the display key.
                mtd.editor_initials = assigned_prod_str.strip().upper()
        else:
            mtd.assigned_producer_id = None
            if (
                previous_key
                and mtd.editor_initials
                and normalize_producer_key(mtd.editor_initials) == normalize_producer_key(previous_key)
            ):
                mtd.editor_initials = None

    for key, value in update_data.items():
        # Text columns that store JSON dicts must be serialised to string
        if isinstance(value, (dict, list)) and key in (
            "pricing_breakdown",
            "payroll_breakdown",
        ):
            value = json.dumps(value)
        setattr(mtd, key, value)

    # Canonical sync: mirror shared fields onto the linked Order (order is SoT).
    if mtd.order_id:
        linked_order = db.query(Order).filter(Order.id == mtd.order_id).first()
        if linked_order:
            unset = payload.model_dump(exclude_unset=True)
            if "assigned_producer" in unset:
                linked_order.assigned_producer_id = mtd.assigned_producer_id
                linked_order.assigned_producer = mtd.editor_initials
            if "mix_start_date" in unset:
                linked_order.mix_start_date = (
                    mtd.mix_start_date.isoformat()
                    if hasattr(mtd.mix_start_date, "isoformat") and mtd.mix_start_date
                    else (str(mtd.mix_start_date) if mtd.mix_start_date else None)
                )
            if "mix_end_date" in unset:
                linked_order.mix_end_date = (
                    mtd.mix_end_date.isoformat()
                    if hasattr(mtd.mix_end_date, "isoformat") and mtd.mix_end_date
                    else (str(mtd.mix_end_date) if mtd.mix_end_date else None)
                )
            if "contact_name" in unset:
                linked_order.contact_name = mtd.contact_name
                linked_order.customer_name = mtd.contact_name
            if "program_name" in unset:
                linked_order.program_name = mtd.program_name
            if "package" in unset:
                linked_order.package = mtd.package
            if "music_theme" in unset:
                linked_order.music_theme = mtd.music_theme
            if "price" in unset:
                linked_order.price = mtd.price
            if "final_customer_price" in unset:
                linked_order.final_customer_price = mtd.final_customer_price
            if "final_customer_price_overridden" in unset:
                linked_order.final_customer_price_overridden = bool(
                    mtd.final_customer_price_overridden
                )
            if "price_compliance" in unset:
                linked_order.price_compliance = mtd.price_compliance
            if "editor_request" in unset:
                linked_order.editor_request = mtd.editor_request
            if "is_reassigned" in unset:
                linked_order.is_reassigned = mtd.is_reassigned
            if "order_status" in unset:
                linked_order.order_status = mtd.order_status
            if "collection_states" in unset:
                linked_order.collection_states = mtd.collection_states
            if "have_songs" in unset:
                linked_order.have_songs = mtd.have_songs
            if "eight_count_sheet" in unset:
                linked_order.eight_count_sheet = mtd.eight_count_sheet
            if "missing_data_email_sent_at" in unset:
                linked_order.missing_data_email_sent_at = mtd.missing_data_email_sent_at
            if "producer_email_sent_at" in unset:
                linked_order.producer_email_sent_at = mtd.producer_email_sent_at
            if "producer_email_sent_to" in unset:
                linked_order.producer_email_sent_to = mtd.producer_email_sent_to
            if "in_mtd" in unset:
                if mtd.in_mtd:
                    linked_order.status = "in_mtd"
                elif linked_order.status == "in_mtd":
                    linked_order.status = "active"
            if "status" in unset and mtd.status == "completed":
                linked_order.status = "completed"

    unset = payload.model_dump(exclude_unset=True)
    db.commit()
    db.refresh(mtd)
    _publish_mtd_updated(mtd)
    if mtd.order_id and any(
        key in unset
        for key in (
            "price",
            "final_customer_price",
            "final_customer_price_overridden",
            "price_compliance",
        )
    ):
        linked_order = db.query(Order).filter(Order.id == mtd.order_id).first()
        if linked_order:
            board_event_hub.publish(
                {
                    "type": "order.updated",
                    "order": OrderSchema.model_validate(linked_order).model_dump(
                        mode="json"
                    ),
                }
            )
    return mtd


def _publish_mtd_updated(mtd: MTDRecord) -> None:
    board_event_hub.publish(
        {
            "type": "mtd.updated",
            "mtd": MTDRecordSchema.model_validate(mtd).model_dump(mode="json"),
        }
    )


@router.delete("/mtd/{mtd_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mtd_record(
    mtd_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    """Permanently delete an archived payroll mix (and its linked order)."""
    from app.models.payroll_addon import PayrollAddon

    mtd = _find_mtd(db, mtd_id)
    if not mtd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="MTD Record not found"
        )

    order_id = mtd.order_id
    db.query(PayrollAddon).filter(PayrollAddon.mtd_id == mtd.id).delete(
        synchronize_session=False
    )
    db.delete(mtd)

    if order_id:
        linked = db.query(Order).filter(Order.id == order_id).first()
        if linked:
            db.query(PayrollAddon).filter(PayrollAddon.order_id == order_id).delete(
                synchronize_session=False
            )
            db.delete(linked)

    db.commit()
    return None


from app.schemas.order import OrderSchema

@router.post("/mtd/manual-schedule", response_model=OrderSchema, status_code=status.HTTP_201_CREATED)
def create_manual_schedule_entry(
    payload: ManualScheduleCreateSchema,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access)
):
    data = payload.model_dump()
    assigned_prod_str = data.pop("assigned_producer", None)

    category = data.get("category") or "Cheer"
    form_type = data.get("form_type") or "school-all-star-cheer"
    cheer_form_subtype = data.get("cheer_form_subtype")
    dance_form_subtype = data.get("dance_form_subtype")

    contact = data.get("contact_name")
    program = data.get("program_name")
    school_program = data.get("school_program_name")
    cust_name = contact or program or school_program or "Customer"

    order = Order(
        category=category,
        form_type=form_type,
        cheer_form_subtype=cheer_form_subtype,
        dance_form_subtype=dance_form_subtype,
        customer_name=cust_name,
        contact_name=contact,
        program_name=program,
        school_program_name=school_program,
        email_address=data.get("email"),
        coach_email=data.get("coach_email"),
        package=data.get("package") or "Standard",
        mix_start_date=data.get("mix_start_date"),
        mix_end_date=data.get("mix_end_date"),
        order_status="Complete",
        status="new",
        price=0.0,
        routine_notes=data.get("routine_notes"),
        music_affiliate=data.get("music_affiliate"),
        time_length_of_mix=data.get("time_length_of_mix"),
        song_list_suggestions=data.get("song_list_suggestions"),
        custom_voiceovers=data.get("custom_voiceovers"),
        eight_count_sheet=data.get("eight_count_sheet"),
        have_songs="HAVE SONGS" if data.get("song_list_suggestions") else "NEED SONGS",
    )
    if assigned_prod_str:
        producer = resolve_producer_by_assignment_key(db, assigned_prod_str)
        order.assigned_producer_id = producer.id if producer else None
        order.assigned_producer = (
            canonical_producer_assignment_key(producer)
            if producer
            else assigned_prod_str.strip().upper()
        )

    db.add(order)
    db.commit()
    db.refresh(order)
    return order
