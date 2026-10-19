"""Orders is SoT for MTD board identity, assignment, and collection fields.

MTD no longer stores:
  Phase 3 identity: program_name / category / package / music_theme /
                    contact_name / editor_request
  Phase 4 assignment: assigned_producer_id / editor_initials (assigned key) /
                      mix_start_date / mix_end_date / is_reassigned
  Phase 5 collection/ops: received_eight_count_sheet / have_songs /
                      collection_states / order_status / needs_attention /
                      missing_data_email_sent_at / producer_email_sent_*

API responses still expose those keys for the frontend by projecting from the
linked Order. Writes from MTD endpoints are redirected onto Orders.

MTD still stores board/payroll lifecycle: section, invoice, waiting_on,
record_status, status, in_mtd, in_payroll, paid_at, is_manual_schedule_entry,
completed_at, and customer-price display cache.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.lib.producer_assignment import (
    canonical_producer_assignment_key,
    resolve_producer_by_assignment_key,
)
from app.models.mtd_record import MTDRecord
from app.models.order import Order
from app.order_identity import category_from_form_type, order_identity_name

# Fields that live on Orders only (never stored on mtd_records after Phase 3).
ORDER_IDENTITY_KEYS = frozenset(
    {
        "category",
        "contact_name",
        "program_name",
        "package",
        "music_theme",
        "editor_request",
    }
)

# Phase 4: assignment / schedule / reassignment flag — Orders SoT.
ORDER_ASSIGNMENT_KEYS = frozenset(
    {
        "assigned_producer",
        "assigned_producer_id",
        "editor_initials",  # MTD payload alias for assigned key (not request code)
        "mix_start_date",
        "mix_end_date",
        "is_reassigned",
    }
)

# Phase 5: collection / email / attention — Orders SoT.
ORDER_COLLECTION_KEYS = frozenset(
    {
        "received_eight_count_sheet",
        "have_songs",
        "collection_states",
        "order_status",
        "needs_attention",
        "missing_data_email_sent_at",
        "producer_email_sent_at",
        "producer_email_sent_to",
    }
)

# Union of all Order-SoT keys stripped from mtd_records payloads.
ORDER_SOT_MTD_KEYS = (
    ORDER_IDENTITY_KEYS | ORDER_ASSIGNMENT_KEYS | ORDER_COLLECTION_KEYS
)


def _parse_date(value: Any) -> Optional[date]:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value).strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text[:10])
    except ValueError:
        return None


def _date_to_order_str(value: Any) -> Optional[str]:
    parsed = _parse_date(value)
    return parsed.isoformat() if parsed else None


def _needs_attention_from_collection(sheet: Any, songs: Any) -> bool:
    sheet_u = str(sheet or "").upper()
    songs_u = str(songs or "").upper()
    return ("NEED" in sheet_u) or ("NEED" in songs_u)


def _linked_form_order(order: Optional[Order]) -> Optional[Order]:
    """Magento form linked via merged_form_order_id (when present)."""
    if not order:
        return None
    form_id = getattr(order, "merged_form_order_id", None)
    if not form_id:
        return None
    try:
        from sqlalchemy.orm import object_session

        sess = object_session(order)
        if sess is not None:
            return sess.get(Order, form_id)
    except Exception:
        return None
    return None


def _pick_str(*vals: Any) -> str:
    for v in vals:
        if v is None:
            continue
        text = str(v).strip()
        if text:
            return text
    return ""


def identity_from_order(order: Optional[Order]) -> dict[str, Any]:
    if not order:
        return {
            "category": "Cheer",
            "contact_name": "",
            "program_name": "",
            "package": "",
            "music_theme": None,
            "editor_request": None,
        }
    form = _linked_form_order(order)
    contact = _pick_str(
        order.contact_name,
        order.coach_name,
        order.customer_name,
        getattr(form, "contact_name", None) if form else None,
        getattr(form, "coach_name", None) if form else None,
        getattr(form, "customer_name", None) if form else None,
    )
    # Magento forms store the tier on package_type; legacy/manual may use package.
    package = _pick_str(
        order.package,
        getattr(order, "package_type", None),
        getattr(form, "package", None) if form else None,
        getattr(form, "package_type", None) if form else None,
    )
    program = _pick_str(
        order_identity_name(order),
        order_identity_name(form) if form else "",
    )
    return {
        "category": category_from_form_type(order.form_type),
        "contact_name": contact,
        "program_name": program,
        "package": package,
        "music_theme": order.music_theme
        if order.music_theme is not None
        else (getattr(form, "music_theme", None) if form else None),
        "editor_request": order.editor_initials
        or (getattr(form, "editor_initials", None) if form else None),
    }


def assignment_from_order(order: Optional[Order]) -> dict[str, Any]:
    """Project assignment/schedule onto the MTD API shape."""
    if not order:
        return {
            "assigned_producer_id": None,
            "assigned_producer": None,
            "editor_initials": None,
            "mix_start_date": None,
            "mix_end_date": None,
            "is_reassigned": False,
        }
    assigned_key = (order.assigned_producer or "").strip() or None
    return {
        "assigned_producer_id": order.assigned_producer_id,
        "assigned_producer": assigned_key,
        "editor_initials": assigned_key,
        "mix_start_date": _parse_date(order.mix_start_date),
        "mix_end_date": _parse_date(order.mix_end_date),
        "is_reassigned": bool(order.is_reassigned),
    }


def collection_from_order(order: Optional[Order]) -> dict[str, Any]:
    """Project collection / email / attention onto the MTD API shape."""
    if not order:
        return {
            "received_eight_count_sheet": "",
            "have_songs": "",
            "collection_states": None,
            "order_status": None,
            "needs_attention": False,
            "missing_data_email_sent_at": None,
            "producer_email_sent_at": None,
            "producer_email_sent_to": None,
        }
    sheet = order.received_eight_count_sheet or ""
    songs = order.have_songs or ""
    # Prefer stored flag; fall back to NEED CS/SONGS derivation.
    needs = bool(order.needs_attention) or _needs_attention_from_collection(
        sheet, songs
    )
    return {
        "received_eight_count_sheet": sheet,
        "have_songs": songs,
        "collection_states": order.collection_states,
        "order_status": order.order_status,
        "needs_attention": needs,
        "missing_data_email_sent_at": order.missing_data_email_sent_at,
        "producer_email_sent_at": order.producer_email_sent_at,
        "producer_email_sent_to": order.producer_email_sent_to,
    }


def order_projection_for_mtd(order: Optional[Order]) -> dict[str, Any]:
    """Full Order-SoT projection for MTD serialize."""
    return {
        **identity_from_order(order),
        **assignment_from_order(order),
        **collection_from_order(order),
    }


def apply_identity_writes_to_order(
    order: Order, identity: dict[str, Any]
) -> None:
    """Persist identity CRUD onto Orders (SoT). Ignores unknown keys."""
    if "contact_name" in identity and identity["contact_name"] is not None:
        name = str(identity["contact_name"]).strip()
        order.contact_name = name or None
        order.customer_name = name or None
        if name:
            order.coach_name = name
    if "program_name" in identity and identity["program_name"] is not None:
        order.school_gym_name = str(identity["program_name"]).strip() or None
    if "package" in identity and identity["package"] is not None:
        pkg = str(identity["package"]).strip() or None
        order.package = pkg
        # Magento forms read package_type; keep both columns in sync on board edits.
        if pkg:
            order.package_type = pkg
    if "music_theme" in identity:
        order.music_theme = identity["music_theme"]
    if "editor_request" in identity:
        raw = identity["editor_request"]
        order.editor_initials = (
            str(raw).strip() or None if raw is not None else None
        )


def apply_assignment_writes_to_order(
    db: Session, order: Order, assignment: dict[str, Any]
) -> None:
    """Persist assignment/schedule CRUD onto Orders (SoT)."""
    if "assigned_producer_id" in assignment and assignment["assigned_producer_id"]:
        from app.models.producer import Producer

        prod = (
            db.query(Producer)
            .filter(Producer.id == assignment["assigned_producer_id"])
            .first()
        )
        if prod:
            order.assigned_producer_id = prod.id
            order.assigned_producer = canonical_producer_assignment_key(prod)
        else:
            order.assigned_producer_id = None
            order.assigned_producer = None
    elif "assigned_producer" in assignment:
        raw = assignment["assigned_producer"]
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
    elif "editor_initials" in assignment:
        raw = assignment["editor_initials"]
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

    if "mix_start_date" in assignment:
        order.mix_start_date = _date_to_order_str(assignment["mix_start_date"])
    if "mix_end_date" in assignment:
        order.mix_end_date = _date_to_order_str(assignment["mix_end_date"])
    if "is_reassigned" in assignment and assignment["is_reassigned"] is not None:
        order.is_reassigned = bool(assignment["is_reassigned"])


def apply_collection_writes_to_order(
    order: Order, collection: dict[str, Any]
) -> None:
    """Persist collection / email / attention CRUD onto Orders (SoT)."""
    if "received_eight_count_sheet" in collection:
        raw = collection["received_eight_count_sheet"]
        order.received_eight_count_sheet = (
            str(raw).strip() if raw is not None else ""
        ) or ""
    if "have_songs" in collection:
        raw = collection["have_songs"]
        order.have_songs = (str(raw).strip() if raw is not None else "") or ""
    if "collection_states" in collection:
        order.collection_states = collection["collection_states"]
    if "order_status" in collection:
        order.order_status = collection["order_status"]
    if "missing_data_email_sent_at" in collection:
        order.missing_data_email_sent_at = collection[
            "missing_data_email_sent_at"
        ]
    if "producer_email_sent_at" in collection:
        order.producer_email_sent_at = collection["producer_email_sent_at"]
    if "producer_email_sent_to" in collection:
        raw = collection["producer_email_sent_to"]
        order.producer_email_sent_to = (
            str(raw).strip() or None if raw is not None else None
        )

    if "needs_attention" in collection and collection["needs_attention"] is not None:
        order.needs_attention = bool(collection["needs_attention"])
    elif (
        "received_eight_count_sheet" in collection
        or "have_songs" in collection
    ):
        order.needs_attention = _needs_attention_from_collection(
            order.received_eight_count_sheet, order.have_songs
        )


def strip_order_sot_from_mtd_payload(data: dict[str, Any]) -> dict[str, Any]:
    """Remove Order-SoT keys before inserting/updating mtd_records."""
    return {k: v for k, v in data.items() if k not in ORDER_SOT_MTD_KEYS}


def strip_identity_from_mtd_payload(data: dict[str, Any]) -> dict[str, Any]:
    return strip_order_sot_from_mtd_payload(data)


def section_for_form_type(form_type: str | None) -> str:
    mapping = {
        "school-all-star-dance": "DANCE MUSIC",
        "marching-band": "MARCHING BAND",
        "sports-entertainment": "SPORTS ENTERTAINMENT",
        "school-anthem": "SCHOOL ANTHEMS",
    }
    return mapping.get(form_type or "", "CHEERLEADING MUSIC")


def ensure_mtd_section_from_order(mtd: MTDRecord, order: Optional[Order]) -> None:
    if order and (not mtd.section or mtd.section == "CHEERLEADING MUSIC"):
        mtd.section = section_for_form_type(order.form_type)


def require_linked_order(mtd: MTDRecord) -> None:
    """Phase 4 rule: every mtd_records row must have order_id."""
    if not mtd.order_id:
        raise ValueError("mtd_records.order_id is required (no unlinked MTD rows)")
