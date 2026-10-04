import asyncio
import json
import uuid
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.auth import get_current_user, require_full_access
from app.core.database import get_db
from app.lib.producer_assignment import (
    canonical_producer_assignment_key,
    resolve_producer_by_assignment_key,
)
from app.models.mtd_record import MTDRecord
from app.models.order import Order
from app.models.producer import Producer
from app.models.user import User
from app.schemas.mtd_record import MTDRecordSchema
from app.schemas.order import OrderSchema, OrderCreateSchema, OrderUpdateSchema
from app.services.board_events import board_event_hub

router = APIRouter()

# Shared business fields that must stay aligned between orders and mtd_records.
ORDER_MTD_SHARED_KEYS = (
    "assigned_producer",
    "assigned_producer_id",
    "mix_start_date",
    "mix_end_date",
    "price",
    "final_customer_price",
    "final_customer_price_overridden",
    "editor_request",
    "collection_states",
    "order_status",
    "have_songs",
    "eight_count_sheet",
    "is_reassigned",
    "missing_data_email_sent_at",
    "producer_email_sent_at",
    "producer_email_sent_to",
    "contact_name",
    "program_name",
    "package",
    "music_theme",
    "price_compliance",
)


def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(val)
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def _find_order(db: Session, order_id: str) -> Order | None:
    if is_valid_uuid(order_id):
        return db.query(Order).filter(
            (Order.id == uuid.UUID(order_id)) | (Order.legacy_id == order_id)
        ).first()
    return db.query(Order).filter(Order.legacy_id == order_id).first()


def _apply_producer_assignment(db: Session, order: Order, update_data: dict) -> None:
    """Resolve assigned_producer initials <-> assigned_producer_id FK."""
    if "assigned_producer_id" in update_data and update_data["assigned_producer_id"]:
        prod = (
            db.query(Producer)
            .filter(Producer.id == update_data["assigned_producer_id"])
            .first()
        )
        if prod:
            order.assigned_producer_id = prod.id
            order.assigned_producer = canonical_producer_assignment_key(prod)
            update_data.pop("assigned_producer", None)
            update_data.pop("assigned_producer_id", None)
            return

    if "assigned_producer" in update_data:
        raw = update_data.pop("assigned_producer")
        update_data.pop("assigned_producer_id", None)
        if raw:
            producer = resolve_producer_by_assignment_key(db, str(raw))
            order.assigned_producer_id = producer.id if producer else None
            order.assigned_producer = (
                canonical_producer_assignment_key(producer)
                if producer
                else str(raw).strip().upper()
            )
        else:
            order.assigned_producer_id = None
            order.assigned_producer = None


def _mirror_shared_fields_to_mtd(db: Session, order: Order, changed: dict) -> None:
    """Keep linked MTD board rows in sync after an order write (order is canonical)."""
    shared = {k: v for k, v in changed.items() if k in ORDER_MTD_SHARED_KEYS}
    if not shared and "status" not in changed:
        return
    linked = (
        db.query(MTDRecord)
        .filter(MTDRecord.order_id == order.id)
        .order_by(MTDRecord.updated_at.desc())
        .all()
    )
    if not linked:
        return
    for mtd in linked:
        if "assigned_producer_id" in shared or "assigned_producer" in changed:
            mtd.assigned_producer_id = order.assigned_producer_id
            if order.assigned_producer:
                mtd.editor_initials = order.assigned_producer
        if "mix_start_date" in shared:
            # Orders store dates as strings; MTD uses Date — never mirror "".
            raw_start = order.mix_start_date
            mtd.mix_start_date = raw_start if raw_start else None
        if "mix_end_date" in shared:
            raw_end = order.mix_end_date
            mtd.mix_end_date = raw_end if raw_end else None
        if "price" in shared:
            mtd.price = order.price
        if "final_customer_price" in shared:
            mtd.final_customer_price = order.final_customer_price
        if "final_customer_price_overridden" in shared:
            mtd.final_customer_price_overridden = bool(
                order.final_customer_price_overridden
            )
        if "price_compliance" in shared:
            mtd.price_compliance = order.price_compliance
        if "editor_request" in shared:
            mtd.editor_request = order.editor_request
        if "collection_states" in shared:
            mtd.collection_states = order.collection_states
        if "order_status" in shared:
            mtd.order_status = order.order_status
        if "have_songs" in shared:
            mtd.have_songs = order.have_songs or ""
        if "eight_count_sheet" in shared:
            mtd.eight_count_sheet = order.eight_count_sheet or ""
        if "is_reassigned" in shared:
            mtd.is_reassigned = bool(order.is_reassigned)
        if "missing_data_email_sent_at" in shared:
            mtd.missing_data_email_sent_at = order.missing_data_email_sent_at
        if "producer_email_sent_at" in shared:
            mtd.producer_email_sent_at = order.producer_email_sent_at
        if "producer_email_sent_to" in shared:
            mtd.producer_email_sent_to = order.producer_email_sent_to
        if "contact_name" in shared:
            mtd.contact_name = order.contact_name or mtd.contact_name
        if "program_name" in shared:
            mtd.program_name = order.program_name or mtd.program_name
        if "package" in shared:
            mtd.package = order.package or mtd.package
        if "music_theme" in shared:
            mtd.music_theme = order.music_theme
        if "price_compliance" in shared:
            mtd.price_compliance = order.price_compliance or mtd.price_compliance
        if changed.get("status") == "in_mtd":
            mtd.in_mtd = True
        elif changed.get("status") == "active" and mtd.in_mtd:
            mtd.in_mtd = False


@router.get("/orders", response_model=List[OrderSchema])
def get_orders(
    form_type: str | None = None,
    cheer_form_subtype: str | None = None,
    category: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Order)
    if cheer_form_subtype and cheer_form_subtype != "all":
        query = query.filter(Order.cheer_form_subtype == cheer_form_subtype)
    elif form_type:
        query = query.filter(Order.form_type == form_type)
    if category and category != "All":
        query = query.filter(Order.category == category)
    if status:
        query = query.filter(Order.status == status)
    return query.all()


def _serialize_order(order: Order) -> dict[str, Any]:
    return OrderSchema.model_validate(order).model_dump(mode="json")


def _publish_order_updated(order: Order) -> None:
    board_event_hub.publish(
        {
            "type": "order.updated",
            "order": _serialize_order(order),
        }
    )


def _publish_linked_mtd_rows(db: Session, order: Order) -> None:
    linked = (
        db.query(MTDRecord)
        .filter(MTDRecord.order_id == order.id)
        .order_by(MTDRecord.updated_at.desc())
        .all()
    )
    for mtd in linked:
        board_event_hub.publish(
            {
                "type": "mtd.updated",
                "mtd": MTDRecordSchema.model_validate(mtd).model_dump(mode="json"),
            }
        )


@router.get("/orders/stream")
async def stream_orders(_: User = Depends(get_current_user)):
    """Authenticated SSE fan-out of order / MTD board changes."""
    queue = board_event_hub.subscribe()

    async def event_generator():
        try:
            yield f"event: ready\ndata: {json.dumps({'ok': True})}\n\n"
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=25.0)
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
                    continue
                event_type = str(event.get("type") or "message")
                yield f"event: {event_type}\ndata: {json.dumps(event, default=str)}\n\n"
        finally:
            board_event_hub.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/orders/{order_id}", response_model=OrderSchema)
def get_order(order_id: str, db: Session = Depends(get_db)):
    order = _find_order(db, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.post("/orders", response_model=OrderSchema, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreateSchema,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    data = payload.model_dump()
    order = Order(**{k: v for k, v in data.items() if k not in ("assigned_producer", "assigned_producer_id")})
    _apply_producer_assignment(db, order, data)
    db.add(order)
    db.commit()
    db.refresh(order)
    _publish_order_updated(order)
    return order


@router.patch("/orders/{order_id}", response_model=OrderSchema)
def update_order(
    order_id: str,
    payload: OrderUpdateSchema,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    order = _find_order(db, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    update_data = payload.model_dump(exclude_unset=True)
    _apply_producer_assignment(db, order, update_data)

    for key, value in update_data.items():
        setattr(order, key, value)

    # Canonical sync: order first, then mirror shared fields onto linked MTD rows.
    changed = payload.model_dump(exclude_unset=True)
    _mirror_shared_fields_to_mtd(db, order, changed)

    db.commit()
    db.refresh(order)
    _publish_order_updated(order)
    if any(
        key in changed
        for key in (
            "price",
            "final_customer_price",
            "final_customer_price_overridden",
            "price_compliance",
        )
    ):
        _publish_linked_mtd_rows(db, order)
    return order
