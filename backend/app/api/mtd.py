import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload
from app.core.database import get_db
from app.models.mtd_record import MTDRecord
from app.models.order import Order
from app.lib.delete_norm import allow_missing_query, missing_or_found
from app.lib.pagination import page_size_query, page_token_query, paginate_query
from app.lib.producer_assignment import (
    canonical_producer_assignment_key,
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
from app.services.mtd_identity import (
    ORDER_ASSIGNMENT_KEYS,
    ORDER_COLLECTION_KEYS,
    ORDER_IDENTITY_KEYS,
    apply_assignment_writes_to_order,
    apply_collection_writes_to_order,
    apply_identity_writes_to_order,
    ensure_mtd_section_from_order,
    order_projection_for_mtd,
    section_for_form_type,
    strip_order_sot_from_mtd_payload,
)
from app.api.auth import require_full_access


class MtdListResponse(BaseModel):
    mtd: list[MTDRecordSchema]
    next_page_token: str | None = None

router = APIRouter()

# form_type values that map to each board category filter.
_CATEGORY_FORM_TYPES: dict[str, tuple[str, ...]] = {
    "Cheer": ("school-all-star-cheer",),
    "Dance": ("school-all-star-dance",),
    "Marching Band": ("marching-band",),
    "Sports Entertainment": ("sports-entertainment",),
    "School Anthem": ("school-anthem",),
}


def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(val)
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def _mtd_load_options():
    return (selectinload(MTDRecord.order),)


def _find_mtd(db: Session, mtd_id: str) -> MTDRecord | None:
    if not is_valid_uuid(mtd_id):
        return None
    parsed_uuid = uuid.UUID(mtd_id)
    return (
        db.query(MTDRecord)
        .options(*_mtd_load_options())
        .filter(
            (MTDRecord.id == parsed_uuid) | (MTDRecord.order_id == parsed_uuid)
        )
        .first()
    )


def _serialize_mtd(mtd: MTDRecord) -> MTDRecordSchema:
    """Project Order-SoT identity + assignment + collection onto MTD API shape."""
    base = MTDRecordSchema.model_validate(mtd)
    return base.model_copy(update=order_projection_for_mtd(mtd.order))


def _pop_order_sot_updates(data: dict) -> tuple[dict, dict, dict]:
    """Split payload into (identity, assignment, collection) Order-SoT updates."""
    identity = {
        k: data.pop(k)
        for k in list(data.keys())
        if k in ORDER_IDENTITY_KEYS
    }
    assignment = {
        k: data.pop(k)
        for k in list(data.keys())
        if k in ORDER_ASSIGNMENT_KEYS
    }
    collection = {
        k: data.pop(k)
        for k in list(data.keys())
        if k in ORDER_COLLECTION_KEYS
    }
    return identity, assignment, collection


@router.get("/mtd", response_model=MtdListResponse)
def get_mtd_records(
    form_type: str | None = None,
    cheer_form_subtype: str | None = None,
    category: str | None = None,
    status: str | None = None,
    page_size: int = Depends(page_size_query),
    page_token: str | None = Depends(page_token_query),
    db: Session = Depends(get_db)
):
    query = db.query(MTDRecord).options(*_mtd_load_options()).order_by(
        MTDRecord.created_at.desc(), MTDRecord.id.asc()
    )
    needs_order_join = bool(
        (cheer_form_subtype and cheer_form_subtype != "all")
        or form_type
        or (category and category != "All")
    )
    if needs_order_join:
        query = query.join(Order, MTDRecord.order_id == Order.id)
    if cheer_form_subtype and cheer_form_subtype != "all":
        query = query.filter(Order.cheer_form_subtype == cheer_form_subtype)
    elif form_type:
        query = query.filter(Order.form_type == form_type)
    if category and category != "All":
        form_types = _CATEGORY_FORM_TYPES.get(category)
        if form_types:
            query = query.filter(Order.form_type.in_(form_types))
        else:
            # Unknown label — empty result rather than scanning denorm column.
            return MtdListResponse(mtd=[], next_page_token=None)
    if status:
        query = query.filter(MTDRecord.status == status)
    page, next_token = paginate_query(
        query, page_size=page_size, page_token=page_token
    )
    return MtdListResponse(
        mtd=[_serialize_mtd(row) for row in page],
        next_page_token=next_token,
    )


@router.get("/mtd/{mtd_id}", response_model=MTDRecordSchema)
def get_mtd_record(mtd_id: str, db: Session = Depends(get_db)):
    mtd = _find_mtd(db, mtd_id)
    if not mtd:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MTD Record not found")
    return _serialize_mtd(mtd)


@router.post("/mtd", response_model=MTDRecordSchema, status_code=status.HTTP_201_CREATED)
def create_mtd_record(payload: MTDRecordCreateSchema, db: Session = Depends(get_db), _: None = Depends(require_full_access)):
    data = payload.model_dump()
    order_id = data.get("order_id")
    # Drop any Order-SoT keys from the insert payload (create must not write them).
    _pop_order_sot_updates(data)

    # Resolve legacy order ids to the real UUID FK before insert.
    linked_order = None
    if order_id is not None:
        from app.api.orders import _find_order

        linked_order = _find_order(db, str(order_id))
        if linked_order:
            data["order_id"] = linked_order.id
            order_id = linked_order.id
        elif not isinstance(order_id, uuid.UUID):
            data["order_id"] = None
            order_id = None

    # Phase 4 rule: every MTD row must link to an order.
    if not order_id or not linked_order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="order_id is required — MTD rows cannot be unlinked",
        )

    # Create only links the board row. Order already holds identity /
    # assignment / collection SoT — applying empty create defaults here
    # wiped producers, mix dates, and form fields on move-to-MTD.
    # Intentional SoT edits go through PATCH /mtd or Orders APIs.
    data = strip_order_sot_from_mtd_payload(data)

    # 1:1 with orders when order_id is set (uq_mtd_records_order_id).
    existing_mtd = (
        db.query(MTDRecord)
        .options(*_mtd_load_options())
        .filter(MTDRecord.order_id == order_id)
        .first()
    )

    if existing_mtd:
        for field, value in data.items():
            if value is not None and hasattr(existing_mtd, field):
                setattr(existing_mtd, field, value)
        ensure_mtd_section_from_order(existing_mtd, linked_order)
        db.commit()
        db.refresh(existing_mtd)
        return _serialize_mtd(_find_mtd(db, str(existing_mtd.id)) or existing_mtd)

    # Only pass columns that still exist on mtd_records.
    mtd_kwargs = {
        k: v
        for k, v in data.items()
        if v is not None and hasattr(MTDRecord, k) and k != "order_id"
    }
    if not mtd_kwargs.get("section"):
        mtd_kwargs["section"] = section_for_form_type(linked_order.form_type)
    if mtd_kwargs.get("price") is None:
        mtd_kwargs["price"] = linked_order.price or 0
    if linked_order.price_compliance:
        mtd_kwargs.setdefault("price_compliance", linked_order.price_compliance)

    mtd = MTDRecord(
        order_id=order_id,
        **mtd_kwargs,
    )
    db.add(mtd)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raced = (
            db.query(MTDRecord)
            .options(*_mtd_load_options())
            .filter(MTDRecord.order_id == order_id)
            .first()
        )
        if raced:
            return _serialize_mtd(raced)
        raise
    db.refresh(mtd)
    return _serialize_mtd(_find_mtd(db, str(mtd.id)) or mtd)


@router.patch("/mtd/{mtd_id}", response_model=MTDRecordSchema)
def update_mtd_record(mtd_id: str, payload: MTDRecordUpdateSchema, db: Session = Depends(get_db), _: None = Depends(require_full_access)):
    mtd = _find_mtd(db, mtd_id)
    if not mtd:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MTD Record not found")

    update_data = payload.model_dump(exclude_unset=True)
    identity_updates, assignment_updates, collection_updates = _pop_order_sot_updates(
        update_data
    )

    for key, value in update_data.items():
        if hasattr(mtd, key):
            setattr(mtd, key, value)

    linked_order = None
    if mtd.order_id:
        linked_order = db.query(Order).filter(Order.id == mtd.order_id).first()

    if not linked_order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MTD row is missing linked order_id — cannot update",
        )

    # Phase 3–5: identity + assignment + collection writes → Orders only.
    if identity_updates:
        apply_identity_writes_to_order(linked_order, identity_updates)
    if assignment_updates:
        apply_assignment_writes_to_order(db, linked_order, assignment_updates)
    if collection_updates:
        apply_collection_writes_to_order(linked_order, collection_updates)

    unset = payload.model_dump(exclude_unset=True)
    if "in_mtd" in unset:
        if mtd.in_mtd:
            linked_order.status = "in_mtd"
        elif linked_order.status == "in_mtd":
            linked_order.status = "active"
    if "status" in unset and mtd.status == "completed":
        linked_order.status = "completed"

    db.commit()
    refreshed = _find_mtd(db, str(mtd.id)) or mtd
    _publish_mtd_updated(refreshed)
    return _serialize_mtd(refreshed)


def _publish_mtd_updated(mtd: MTDRecord) -> None:
    board_event_hub.publish(
        {
            "type": "mtd.updated",
            "mtd": _serialize_mtd(mtd).model_dump(mode="json"),
        }
    )


@router.delete("/mtd/{mtd_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mtd_record(
    mtd_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
    allow_missing: bool = Depends(allow_missing_query),
):
    """Permanently delete an archived payroll mix (and its linked order)."""
    from app.models.payroll_addon import PayrollAddon

    mtd = _find_mtd(db, mtd_id)
    if missing_or_found(
        mtd, allow_missing=allow_missing, detail="MTD Record not found"
    ):
        return None

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
    # Subtype is exclusive by form family — never store dance subtype on cheer (or vice versa).
    if form_type == "school-all-star-cheer":
        cheer_form_subtype = data.get("cheer_form_subtype") or "all-star-cheer"
        dance_form_subtype = None
    elif form_type == "school-all-star-dance":
        cheer_form_subtype = None
        dance_form_subtype = data.get("dance_form_subtype") or "pom"
    else:
        cheer_form_subtype = None
        dance_form_subtype = None

    contact = (data.get("contact_name") or data.get("coach_name") or "").strip() or None
    program = data.get("program_name")
    school_program = data.get("school_program_name")
    identity = (
        program
        or school_program
        or data.get("gym_name")
        or data.get("school_gym_name") or data.get("school_name")
        or ""
    ).strip() or None
    # customer_name / contact_name are people — never seed from school/org identity.

    # One identity column: school_gym_name (Gym / School / Program / Org).
    school_gym_name = (
        data.get("school_gym_name")
        or data.get("school_name")
        or data.get("gym_name")
        or school_program
        or identity
    )
    team_name = data.get("team_name")

    order = Order(
        form_type=form_type,
        cheer_form_subtype=cheer_form_subtype,
        dance_form_subtype=dance_form_subtype,
        customer_name=contact,
        contact_name=contact,
        school_gym_name=school_gym_name,
        team_name=team_name,
        coach_email=data.get("coach_email") or data.get("email"),
        billing_person_email=(
            data.get("billing_person_email")
            or data.get("youth_rec_extra_email_address")
            or data.get("email_address")
            or None
        ),
        package=(
            "SCHOOL ANTHEMS"
            if form_type == "school-anthem"
            else (data.get("package") or "Standard")
        ),
        package_type="SCHOOL ANTHEMS" if form_type == "school-anthem" else None,
        mix_start_date=data.get("mix_start_date"),
        mix_end_date=data.get("mix_end_date"),
        order_status="Complete",
        status="new",
        price=1250.0 if form_type == "school-anthem" else 0.0,
        is_manual_entry=True,
        routine_notes=data.get("routine_notes"),
        music_affiliate=data.get("music_affiliate"),
        time_length_of_mix=data.get("time_length_of_mix"),
        song_list_suggestions=data.get("song_list_suggestions"),
        custom_voiceovers=data.get("custom_voiceovers"),
        received_eight_count_sheet=data.get("received_eight_count_sheet"),
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
