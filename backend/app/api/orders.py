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

# Magento School Anthem has no package-type field — always flat rate card.
SCHOOL_ANTHEM_PACKAGE = "SCHOOL ANTHEMS"
SCHOOL_ANTHEM_PRICE = 1250.0


def _apply_school_anthem_defaults(data: dict, form_type: str | None = None) -> None:
    """Force package + $1,250 whenever form_type is school-anthem.

    Magento School Anthem has no package-type field — one flat rate card.
    """
    ft = form_type if form_type is not None else data.get("form_type")
    if ft != "school-anthem":
        return
    data["package_type"] = SCHOOL_ANTHEM_PACKAGE
    data["package"] = SCHOOL_ANTHEM_PACKAGE
    data["price"] = SCHOOL_ANTHEM_PRICE


# Shared business fields that must stay aligned between orders and mtd_records.
# Phase 3: identity (contact/program/package/music_theme/editor request/category)
# is Orders-only — do not mirror onto mtd_records. Assignment + schedule +
# collection + price display cache still sync to the board row.
# Phase 3–5: identity / assignment / collection are Orders-only (projected
# onto MTD responses). Mirror only customer-price display cache onto MTD.
ORDER_MTD_SHARED_KEYS = (
    "price",
    "final_customer_price",
    "final_customer_price_overridden",
    "price_compliance",
)


def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(val)
        return True
    except (ValueError, TypeError, AttributeError):
        return False


_BILLING_ALIASES = (
    "gym_billing_address",
    "school_billing_address",
    "youth_rec_billing_address",
    "organization_billing_address",
    "school_address",
)

_COLOR_ALIASES = (
    "team_colors",
    "youth_rec_colors",
    "school_program_colors",
)

_COACH_NAME_ALIASES = ("coach_contact_full_name",)
_COACH_EMAIL_ALIASES = ("coach_email_address",)
_YOUTH_REC_EMAIL_ALIASES = ("email_address",)
_CHOREOGRAPHER_NAME_ALIASES = ("viroc_choreographer_name",)
_CHOREOGRAPHER_EMAIL_ALIASES = ("viroc_choreographer_email",)
_REQUESTED_EDITOR_ALIASES = ("requested_producer",)
_EDITOR_INITIALS_ALIASES = ("editor_request",)
_EIGHT_COUNT_SHEETS_ALIASES = ("using_eight_count_sheets",)
_INSTRUMENTATION_NOTES_ALIASES = ("instrumental_style_preference",)


def _coerce_alias_column(
    data: dict,
    target: str,
    aliases: tuple[str, ...],
    unset_ok: bool = False,
) -> None:
    """Fold legacy aliases into a single target column."""
    if data.get(target):
        for key in aliases:
            data.pop(key, None)
        return
    picked = None
    any_defined = target in data
    for key in aliases:
        if key not in data:
            continue
        any_defined = True
        val = data.pop(key)
        if picked is None and val is not None and str(val).strip():
            picked = val
        elif picked is None and val is not None and not unset_ok:
            picked = val
    if not any_defined:
        return
    if target not in data:
        data[target] = picked
    elif picked is not None and not (
        data.get(target) and str(data.get(target)).strip()
    ):
        # Create payloads include target=None; still fold a filled alias in.
        data[target] = picked


def _coerce_billing_address(data: dict, unset_ok: bool = False) -> None:
    """Fold legacy billing/address aliases into school_gym_billing_address."""
    _coerce_alias_column(
        data, "school_gym_billing_address", _BILLING_ALIASES, unset_ok=unset_ok
    )


def _coerce_colors(data: dict, unset_ok: bool = False) -> None:
    """Fold team/youth_rec/school_program color aliases into colors."""
    _coerce_alias_column(data, "colors", _COLOR_ALIASES, unset_ok=unset_ok)


def _coerce_coach_fields(data: dict, unset_ok: bool = False) -> None:
    """Fold Magento coach aliases into coach_name / coach_email."""
    _coerce_alias_column(
        data, "coach_name", _COACH_NAME_ALIASES, unset_ok=unset_ok
    )
    _coerce_alias_column(
        data, "coach_email", _COACH_EMAIL_ALIASES, unset_ok=unset_ok
    )
    _coerce_alias_column(
        data,
        "youth_rec_extra_email_address",
        _YOUTH_REC_EMAIL_ALIASES,
        unset_ok=unset_ok,
    )


def _coerce_choreographer_fields(data: dict, unset_ok: bool = False) -> None:
    """Fold V!ROC Magento choreographer aliases into name/email SoT columns."""
    _coerce_alias_column(
        data, "choreographer_name", _CHOREOGRAPHER_NAME_ALIASES, unset_ok=unset_ok
    )
    _coerce_alias_column(
        data, "choreographer_email", _CHOREOGRAPHER_EMAIL_ALIASES, unset_ok=unset_ok
    )


def _coerce_requested_editor_fields(data: dict, unset_ok: bool = False) -> None:
    """Fold legacy requested_producer into Magento requested_editor."""
    _coerce_alias_column(
        data, "requested_editor", _REQUESTED_EDITOR_ALIASES, unset_ok=unset_ok
    )


def _coerce_editor_initials_fields(data: dict, unset_ok: bool = False) -> None:
    """Fold legacy editor_request into editor_initials."""
    _coerce_alias_column(
        data, "editor_initials", _EDITOR_INITIALS_ALIASES, unset_ok=unset_ok
    )


def _coerce_eight_count_sheets_fields(data: dict, unset_ok: bool = False) -> None:
    """Fold Magento using/sending 8-count labels into sending_eight_count_sheets."""
    _coerce_alias_column(
        data,
        "sending_eight_count_sheets",
        _EIGHT_COUNT_SHEETS_ALIASES,
        unset_ok=unset_ok,
    )


def _coerce_instrumentation_notes_fields(data: dict, unset_ok: bool = False) -> None:
    """Fold School Anthem style preference into instrumentation_notes."""
    _coerce_alias_column(
        data,
        "instrumentation_notes",
        _INSTRUMENTATION_NOTES_ALIASES,
        unset_ok=unset_ok,
    )


def _find_order(db: Session, order_id: str) -> Order | None:
    if not is_valid_uuid(order_id):
        return None
    return db.query(Order).filter(Order.id == uuid.UUID(order_id)).first()


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
        if "price" in shared:
            mtd.price = order.price
        if "final_customer_price" in shared:
            mtd.final_customer_price = order.final_customer_price
        if "final_customer_price_overridden" in shared:
            mtd.final_customer_price_overridden = bool(
                order.final_customer_price_overridden
            )
        if "price_compliance" in shared:
            mtd.price_compliance = order.price_compliance or mtd.price_compliance
        # Phase 3–5: identity + assignment + collection are Orders-only.
        if "coach_name" in changed or "coach_contact_full_name" in changed:
            coach = (
                (order.coach_name or "").strip()
                or (getattr(order, "coach_contact_full_name", None) or "").strip()
            )
            if coach and not (order.contact_name or "").strip():
                order.contact_name = coach
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
        # category is derived from form_type (no stored column).
        from app.order_identity import category_from_form_type

        form_types = [
            ft
            for ft in (
                "school-all-star-cheer",
                "school-all-star-dance",
                "marching-band",
                "sports-entertainment",
                "school-anthem",
            )
            if category_from_form_type(ft) == category
        ]
        if form_types:
            query = query.filter(Order.form_type.in_(form_types))
        else:
            query = query.filter(False)
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
    from app.api.mtd import _serialize_mtd

    linked = (
        db.query(MTDRecord)
        .filter(MTDRecord.order_id == order.id)
        .order_by(MTDRecord.updated_at.desc())
        .all()
    )
    for mtd in linked:
        mtd.order = order
        board_event_hub.publish(
            {
                "type": "mtd.updated",
                "mtd": _serialize_mtd(mtd).model_dump(mode="json"),
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
    # category + program_name are derived; aliases → school_name / school_gym_billing_address.
    data.pop("category", None)
    data.pop("program_name", None)
    for alias_key in ("school_program_name", "gym_name", "school_name"):
        alias = data.pop(alias_key, None)
        if alias and not data.get("school_gym_name"):
            data["school_gym_name"] = alias
    _coerce_billing_address(data)
    _coerce_colors(data)
    _coerce_coach_fields(data)
    _coerce_choreographer_fields(data)
    _coerce_requested_editor_fields(data)
    _coerce_editor_initials_fields(data)
    _coerce_eight_count_sheets_fields(data)
    _coerce_instrumentation_notes_fields(data)
    _apply_school_anthem_defaults(data)
    # Response/API aliases only — never constructor kwargs on Order.
    for alias_only in (
        "coach_youth_rec_extra_email_address",
        "coach_contact_full_name",
        "coach_email_address",
        "email_address",
        "viroc_choreographer_name",
        "viroc_choreographer_email",
        "editor_request",
        "requested_producer",
        "using_eight_count_sheets",
        "instrumental_style_preference",
        "school_program_name",
        "program_name",
        "school_name",
        "gym_name",
        "school_billing_address",
        "billing_address",
        "gym_billing_address",
        "youth_rec_billing_address",
        "organization_billing_address",
        "school_address",
        "team_colors",
        "youth_rec_colors",
        "school_program_colors",
        "legacy_id",
        "category",
    ):
        data.pop(alias_only, None)
    order = Order(
        **{
            k: v
            for k, v in data.items()
            if k not in ("assigned_producer", "assigned_producer_id")
        }
    )
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
    update_data.pop("category", None)
    legacy_program = update_data.pop("program_name", None)
    for alias_key in ("school_program_name", "gym_name", "school_name"):
        alias = update_data.pop(alias_key, None)
        if alias is not None and "school_gym_name" not in update_data:
            update_data["school_gym_name"] = alias
    if legacy_program is not None and "school_gym_name" not in update_data:
        update_data["school_gym_name"] = legacy_program or None
    _coerce_billing_address(update_data, unset_ok=True)
    _coerce_colors(update_data, unset_ok=True)
    _coerce_coach_fields(update_data, unset_ok=True)
    _coerce_choreographer_fields(update_data, unset_ok=True)
    _coerce_requested_editor_fields(update_data, unset_ok=True)
    _coerce_editor_initials_fields(update_data, unset_ok=True)
    _coerce_eight_count_sheets_fields(update_data, unset_ok=True)
    _coerce_instrumentation_notes_fields(update_data, unset_ok=True)
    _apply_school_anthem_defaults(
        update_data,
        form_type=update_data.get("form_type", order.form_type),
    )

    _apply_producer_assignment(db, order, update_data)

    for key, value in update_data.items():
        setattr(order, key, value)

    # Canonical sync: order first, then mirror shared fields onto linked MTD rows.
    changed = {k: v for k, v in update_data.items()}
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
