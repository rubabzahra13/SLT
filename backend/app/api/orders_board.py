"""Paged Orders board + counts + CSV export for unbounded growth."""
from __future__ import annotations

import csv
import io
import time
from typing import Any

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import Integer, and_, func, not_, or_
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.api.orders import OrderListResponse, _apply_orders_scope, _serialize_order
from app.core.database import get_db
from app.lib.pagination import (
    page_token_query,
    paginate_keyset_by_created,
    paginate_query,
)
from app.models.order import Order
from app.models.user import User
from app.order_identity import category_from_form_type
from app.schemas.order import OrderSchema
from app.services.form_chip_cache import (
    FORM_CHIP_TTL_S as _FORM_CHIP_TTL_S,
    form_chip_cache as _form_chip_cache,
    match_counts_cache as _match_counts_cache,
    match_pool_page_cache as _match_pool_page_cache,
)

router = APIRouter()

BOARD_DEFAULT_PAGE_SIZE = 50

_FORM_TYPES = (
    "school-all-star-cheer",
    "school-all-star-dance",
    "marching-band",
    "sports-entertainment",
    "school-anthem",
)


_CHEER_SUBTYPES = (
    "all-star-cheer",
    "school-cheer-viroc-yes",
    "school-cheer-viroc-no",
    "youth-rec-cheer",
)
_DANCE_SUBTYPES = (
    "pom",
    "hip-hop",
    "team-performance-variety",
    "gameday",
    "jazz-kick",
)


class OrdersBoardCounts(BaseModel):
    all: int = 0
    complete_data: int = 0
    missing_data: int = 0
    assigned: int = 0
    not_assigned: int = 0
    reassigned: int = 0
    flagged: int = 0
    # Source menu: Magento/form vs New Order manuals (not_flagged board).
    form: int = 0
    manual: int = 0
    by_form_type: dict[str, int] = Field(default_factory=dict)
    by_cheer_form_subtype: dict[str, int] = Field(default_factory=dict)
    by_dance_form_subtype: dict[str, int] = Field(default_factory=dict)
    # Source menu scoped to the selected form / subtype (source-agnostic maps).
    form_by_form_type: dict[str, int] = Field(default_factory=dict)
    manual_by_form_type: dict[str, int] = Field(default_factory=dict)
    form_by_cheer_form_subtype: dict[str, int] = Field(default_factory=dict)
    manual_by_cheer_form_subtype: dict[str, int] = Field(default_factory=dict)
    form_by_dance_form_subtype: dict[str, int] = Field(default_factory=dict)
    manual_by_dance_form_subtype: dict[str, int] = Field(default_factory=dict)
    # Per-form range badges — lets the client skip form-scoped /counts refetches.
    complete_data_by_form_type: dict[str, int] = Field(default_factory=dict)
    missing_data_by_form_type: dict[str, int] = Field(default_factory=dict)
    assigned_by_form_type: dict[str, int] = Field(default_factory=dict)
    not_assigned_by_form_type: dict[str, int] = Field(default_factory=dict)
    reassigned_by_form_type: dict[str, int] = Field(default_factory=dict)
    # Per-subtype range badges (Cheer / Dance) — board tabs are subtype-scoped.
    complete_data_by_cheer_form_subtype: dict[str, int] = Field(default_factory=dict)
    missing_data_by_cheer_form_subtype: dict[str, int] = Field(default_factory=dict)
    assigned_by_cheer_form_subtype: dict[str, int] = Field(default_factory=dict)
    not_assigned_by_cheer_form_subtype: dict[str, int] = Field(default_factory=dict)
    reassigned_by_cheer_form_subtype: dict[str, int] = Field(default_factory=dict)
    complete_data_by_dance_form_subtype: dict[str, int] = Field(default_factory=dict)
    missing_data_by_dance_form_subtype: dict[str, int] = Field(default_factory=dict)
    assigned_by_dance_form_subtype: dict[str, int] = Field(default_factory=dict)
    not_assigned_by_dance_form_subtype: dict[str, int] = Field(default_factory=dict)
    reassigned_by_dance_form_subtype: dict[str, int] = Field(default_factory=dict)
    # Complete ∩ assignment chips. Missing ∩ X = X − Complete ∩ X (complement
    # is exact: both exprs are NULL-safe). Scoped maps omit zero entries.
    complete_assigned: int = 0
    complete_not_assigned: int = 0
    complete_reassigned: int = 0
    complete_assigned_by_form_type: dict[str, int] = Field(default_factory=dict)
    complete_not_assigned_by_form_type: dict[str, int] = Field(default_factory=dict)
    complete_reassigned_by_form_type: dict[str, int] = Field(default_factory=dict)
    complete_assigned_by_cheer_form_subtype: dict[str, int] = Field(default_factory=dict)
    complete_not_assigned_by_cheer_form_subtype: dict[str, int] = Field(
        default_factory=dict
    )
    complete_reassigned_by_cheer_form_subtype: dict[str, int] = Field(
        default_factory=dict
    )
    complete_assigned_by_dance_form_subtype: dict[str, int] = Field(default_factory=dict)
    complete_not_assigned_by_dance_form_subtype: dict[str, int] = Field(
        default_factory=dict
    )
    complete_reassigned_by_dance_form_subtype: dict[str, int] = Field(
        default_factory=dict
    )


class OrdersBoardCountsResponse(BaseModel):
    counts: OrdersBoardCounts


def _assigned_expr():
    return and_(
        or_(Order.is_reassigned.is_(False), Order.is_reassigned.is_(None)),
        or_(
            and_(
                Order.assigned_producer.isnot(None),
                Order.assigned_producer != "",
                Order.assigned_producer != "NA",
            ),
            Order.assigned_producer_id.isnot(None),
        ),
    )


def _not_assigned_expr():
    return and_(
        or_(Order.is_reassigned.is_(False), Order.is_reassigned.is_(None)),
        or_(
            Order.assigned_producer.is_(None),
            Order.assigned_producer == "",
            Order.assigned_producer == "NA",
        ),
        Order.assigned_producer_id.is_(None),
    )


def _reassigned_expr():
    return Order.is_reassigned.is_(True)


def _blank_text_expr(column):
    """Empty / whitespace / common Magento placeholders (client empty-field tokens)."""
    trimmed = func.upper(func.trim(func.coalesce(column, "")))
    return or_(
        trimmed == "",
        trimmed.in_(
            (
                "TBD",
                "TBA",
                "N/A",
                "NA",
                "NONE",
                "NULL",
                "-",
                "--",
                "---",
                ".",
                "..",
                "...",
                "0:00",
                "SELECT",
                "PENDING",
                "UNKNOWN",
            )
        ),
    )


def _missing_data_expr():
    """Board Missing data tab — matches client red pills, not only needs_attention.

    Complete data = Mix Time + Songs + Notes (and CS when applicable) are green.
    Stored needs_attention is often stale/false while those fields are still empty;
    without field checks the Complete tab fills with red-pill rows.

    Coalesce sheet/songs before ILIKE so NULL columns don't poison NOT(...)
    into unknown (which zeroed Complete data counts).
    """
    pkg = func.upper(func.trim(func.coalesce(Order.package_type, "")))
    sheet = func.coalesce(Order.received_eight_count_sheet, "")
    sheet_u = func.upper(func.trim(sheet))
    songs = func.coalesce(Order.have_songs, "")
    sending = func.upper(
        func.trim(func.coalesce(Order.sending_eight_count_sheets, ""))
    )
    # CS pill red: Magento said Yes, sheets not collected yet.
    cs_outstanding = and_(
        or_(sending.in_(("YES", "Y")), sending.like("YES%")),
        ~sheet_u.like("%HAVE%"),
    )
    return or_(
        Order.needs_attention.is_(True),
        sheet.ilike("%NEED%"),
        songs.ilike("%NEED%"),
        pkg.in_(("", "TBD")),
        # Mix Time pill SoT
        _blank_text_expr(Order.time_length_of_mix),
        # Songs pill SoT — list empty and no Cheer musicTheme fallback
        and_(
            _blank_text_expr(Order.song_list_suggestions),
            _blank_text_expr(Order.music_theme),
        ),
        # Notes pill SoT
        _blank_text_expr(Order.routine_notes),
        cs_outstanding,
    )


def _complete_data_expr():
    return not_(_missing_data_expr())


def _complete_cross_sums(complete_expr):
    """Complete ∩ Assigned / Not assigned / Reassign in the same scan."""
    return (
        func.sum(func.cast(and_(complete_expr, _assigned_expr()), Integer)),
        func.sum(func.cast(and_(complete_expr, _not_assigned_expr()), Integer)),
        func.sum(func.cast(and_(complete_expr, _reassigned_expr()), Integer)),
    )


def _nonzero(counts: dict[str, int]) -> dict[str, int]:
    return {k: v for k, v in counts.items() if v}


def _flagged_expr():
    return Order.affiliate_flag_status == "open"


def _board_base_query(
    db: Session,
    *,
    form_type: str | None,
    cheer_form_subtype: str | None,
    dance_form_subtype: str | None,
    category: str | None,
    source: str | None,
    search: str | None,
    range_filter: str | None,
    exclude_flagged: bool,
):
    query = db.query(Order)
    query = _apply_orders_scope(query, "active")
    # Pre-MTD board: hide rows already moved into MTD.
    query = query.filter(or_(Order.status.is_(None), Order.status != "in_mtd"))

    if exclude_flagged:
        query = query.filter(
            or_(
                Order.affiliate_flag_status.is_(None),
                Order.affiliate_flag_status != "open",
            )
        )

    if cheer_form_subtype and cheer_form_subtype not in ("all", "All"):
        query = query.filter(Order.cheer_form_subtype == cheer_form_subtype)
    elif dance_form_subtype and dance_form_subtype not in ("all", "All"):
        query = query.filter(Order.dance_form_subtype == dance_form_subtype)
    elif form_type and form_type not in ("all", "All"):
        query = query.filter(Order.form_type == form_type)

    if category and category != "All":
        form_types = [
            ft for ft in _FORM_TYPES if category_from_form_type(ft) == category
        ]
        if form_types:
            query = query.filter(Order.form_type.in_(form_types))
        else:
            query = query.filter(False)

    if source == "manual":
        query = query.filter(Order.is_manual_entry.is_(True))
    elif source == "form":
        query = query.filter(
            or_(Order.is_manual_entry.is_(False), Order.is_manual_entry.is_(None))
        )

    if search and search.strip():
        # Keep portable for SQLite tests; remote latency dominates anyway —
        # the Orders UI filters the loaded page instantly while this runs.
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Order.school_gym_name.ilike(term),
                Order.team_name.ilike(term),
                Order.coach_name.ilike(term),
                Order.contact_name.ilike(term),
                Order.customer_name.ilike(term),
                Order.billing_person_name.ilike(term),
            )
        )

    # Comma-separated tokens AND together so Complete/Missing can combine with
    # Assigned/Not assigned/Reassign. Exclusive pairs are enforced by the UI.
    tokens = [
        t.strip().lower()
        for t in (range_filter or "all").split(",")
        if t.strip()
    ]
    if not tokens or tokens == ["all"]:
        return query

    for rf in tokens:
        if rf in ("assigned",):
            query = query.filter(_assigned_expr())
        elif rf in ("not_assigned",):
            query = query.filter(_not_assigned_expr())
        elif rf in ("reassigned", "reassign_leave", "reassign_rush"):
            query = query.filter(_reassigned_expr())
        elif rf in ("waiting_for_data", "missing_data"):
            query = query.filter(_missing_data_expr())
        elif rf in ("need_to_be_scheduled", "new_orders", "complete_data"):
            query = query.filter(_complete_data_expr())
        elif rf == "flagged":
            query = query.filter(_flagged_expr())

    return query


def _apply_sort(query, sort_by: str | None):
    key = (sort_by or "newest").strip().lower()
    if key in ("oldest", "created_asc"):
        return query.order_by(Order.created_at.asc(), Order.id.asc())
    if key in ("name", "gym", "program"):
        return query.order_by(
            Order.school_gym_name.asc().nullslast(), Order.created_at.desc()
        )
    return query.order_by(Order.created_at.desc(), Order.id.asc())


@router.get("/orders/board", response_model=OrderListResponse)
def get_orders_board(
    form_type: str | None = None,
    cheer_form_subtype: str | None = None,
    dance_form_subtype: str | None = None,
    category: str | None = None,
    source: str | None = None,
    search: str | None = None,
    range_filter: str | None = Query(None, alias="range"),
    sort_by: str | None = None,
    exclude_flagged: bool = True,
    page_size: int | None = Query(None, ge=1, le=500),
    page_token: str | None = Depends(page_token_query),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    size = page_size if page_size is not None else BOARD_DEFAULT_PAGE_SIZE
    query = _board_base_query(
        db,
        form_type=form_type,
        cheer_form_subtype=cheer_form_subtype,
        dance_form_subtype=dance_form_subtype,
        category=category,
        source=source,
        search=search,
        range_filter=range_filter,
        exclude_flagged=exclude_flagged,
    )
    sort_key = (sort_by or "newest").strip().lower()
    if sort_key in ("name", "gym", "program"):
        # Name sort still uses offset; keyset needs a composite name cursor.
        query = _apply_sort(query, sort_by)
        page, next_token = paginate_query(
            query, page_size=size, page_token=page_token
        )
    else:
        page, next_token = paginate_keyset_by_created(
            query,
            model=Order,
            page_size=size,
            page_token=page_token,
            sort=sort_key,
        )
    return OrderListResponse(orders=page, next_page_token=next_token)


@router.get("/orders/counts", response_model=OrdersBoardCountsResponse)
def get_orders_counts(
    form_type: str | None = None,
    cheer_form_subtype: str | None = None,
    dance_form_subtype: str | None = None,
    category: str | None = None,
    source: str | None = None,
    search: str | None = None,
    flagged_only: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Tab badges in one scan; form chips in one GROUP BY (no N+1)."""
    if flagged_only:
        # Flagged Orders page: badges must count open flags only — never the full board.
        flagged_base = _board_base_query(
            db,
            form_type=None,
            cheer_form_subtype=None,
            dance_form_subtype=None,
            category=category,
            source=source,
            search=search,
            range_filter="flagged",
            exclude_flagged=False,
        )
        by_form = {ft: 0 for ft in _FORM_TYPES}
        by_cheer = {st: 0 for st in _CHEER_SUBTYPES}
        by_dance = {st: 0 for st in _DANCE_SUBTYPES}
        flagged_total = int(
            flagged_base.with_entities(func.count(Order.id)).scalar() or 0
        )
        for ft, n in (
            flagged_base.with_entities(Order.form_type, func.count(Order.id))
            .group_by(Order.form_type)
            .all()
        ):
            if ft in by_form:
                by_form[ft] = int(n or 0)
        for st, n in (
            flagged_base.filter(Order.form_type == "school-all-star-cheer")
            .with_entities(Order.cheer_form_subtype, func.count(Order.id))
            .group_by(Order.cheer_form_subtype)
            .all()
        ):
            if st in by_cheer:
                by_cheer[st] = int(n or 0)
        for st, n in (
            flagged_base.filter(Order.form_type == "school-all-star-dance")
            .with_entities(Order.dance_form_subtype, func.count(Order.id))
            .group_by(Order.dance_form_subtype)
            .all()
        ):
            if st in by_dance:
                by_dance[st] = int(n or 0)
        return OrdersBoardCountsResponse(
            counts=OrdersBoardCounts(
                all=flagged_total,
                flagged=flagged_total,
                by_form_type=by_form,
                by_cheer_form_subtype=by_cheer,
                by_dance_form_subtype=by_dance,
            )
        )

    # Include flagged rows so we can SUM flag status in the same pass.
    base = _board_base_query(
        db,
        form_type=form_type,
        cheer_form_subtype=cheer_form_subtype,
        dance_form_subtype=dance_form_subtype,
        category=category,
        source=source,
        search=search,
        range_filter="all",
        exclude_flagged=False,
    )
    not_flagged = or_(
        Order.affiliate_flag_status.is_(None),
        Order.affiliate_flag_status != "open",
    )
    is_manual = Order.is_manual_entry.is_(True)
    is_form = or_(Order.is_manual_entry.is_(False), Order.is_manual_entry.is_(None))
    tab_row = base.with_entities(
        func.sum(func.cast(not_flagged, Integer)).label("all"),
        func.sum(
            func.cast(
                and_(not_flagged, _complete_data_expr()),
                Integer,
            )
        ).label("complete_data"),
        func.sum(
            func.cast(
                and_(not_flagged, _missing_data_expr()),
                Integer,
            )
        ).label("missing_data"),
        func.sum(
            func.cast(and_(not_flagged, _assigned_expr()), Integer)
        ).label("assigned"),
        func.sum(
            func.cast(and_(not_flagged, _not_assigned_expr()), Integer)
        ).label("not_assigned"),
        func.sum(
            func.cast(and_(not_flagged, _reassigned_expr()), Integer)
        ).label("reassigned"),
        func.sum(func.cast(_flagged_expr(), Integer)).label("flagged"),
        func.sum(func.cast(and_(not_flagged, is_form), Integer)).label(
            "form_count"
        ),
        func.sum(func.cast(and_(not_flagged, is_manual), Integer)).label(
            "manual_count"
        ),
        *(
            s.label(name)
            for s, name in zip(
                _complete_cross_sums(and_(not_flagged, _complete_data_expr())),
                ("complete_assigned", "complete_not_assigned", "complete_reassigned"),
            )
        ),
    ).one()

    by_form = {ft: 0 for ft in _FORM_TYPES}
    by_cheer = {st: 0 for st in _CHEER_SUBTYPES}
    by_dance = {st: 0 for st in _DANCE_SUBTYPES}
    by_complete = {ft: 0 for ft in _FORM_TYPES}
    by_missing = {ft: 0 for ft in _FORM_TYPES}
    by_assigned = {ft: 0 for ft in _FORM_TYPES}
    by_not_assigned = {ft: 0 for ft in _FORM_TYPES}
    by_reassigned = {ft: 0 for ft in _FORM_TYPES}
    form_by_form = {ft: 0 for ft in _FORM_TYPES}
    manual_by_form = {ft: 0 for ft in _FORM_TYPES}
    form_by_cheer = {st: 0 for st in _CHEER_SUBTYPES}
    manual_by_cheer = {st: 0 for st in _CHEER_SUBTYPES}
    form_by_dance = {st: 0 for st in _DANCE_SUBTYPES}
    manual_by_dance = {st: 0 for st in _DANCE_SUBTYPES}
    by_complete_cheer = {st: 0 for st in _CHEER_SUBTYPES}
    by_missing_cheer = {st: 0 for st in _CHEER_SUBTYPES}
    by_assigned_cheer = {st: 0 for st in _CHEER_SUBTYPES}
    by_not_assigned_cheer = {st: 0 for st in _CHEER_SUBTYPES}
    by_reassigned_cheer = {st: 0 for st in _CHEER_SUBTYPES}
    by_complete_dance = {st: 0 for st in _DANCE_SUBTYPES}
    by_missing_dance = {st: 0 for st in _DANCE_SUBTYPES}
    by_assigned_dance = {st: 0 for st in _DANCE_SUBTYPES}
    by_not_assigned_dance = {st: 0 for st in _DANCE_SUBTYPES}
    by_reassigned_dance = {st: 0 for st in _DANCE_SUBTYPES}
    # Complete ∩ assignment, per scope: [assigned, not_assigned, reassigned].
    cross_form: dict[str, list[int]] = {ft: [0, 0, 0] for ft in _FORM_TYPES}
    cross_cheer: dict[str, list[int]] = {st: [0, 0, 0] for st in _CHEER_SUBTYPES}
    cross_dance: dict[str, list[int]] = {st: [0, 0, 0] for st in _DANCE_SUBTYPES}
    # Form/subtype chips + per-form range badges (unscoped by active tab).
    # Cache only the no-search chip scan — search results change every query.
    # v3: Missing/Complete use TBD package/mix + NEED (not needs_attention alone).
    # v4: + Complete ∩ assignment cross maps.
    _CHIP_CACHE_LEN = 28
    chip_key = f"v4|{category or ''}|{source or ''}"
    cached_chips = _form_chip_cache.get(chip_key)
    now = time.monotonic()
    if (
        not (search and search.strip())
        and cached_chips
        and now - cached_chips[0] < _FORM_CHIP_TTL_S
        and len(cached_chips) >= _CHIP_CACHE_LEN
    ):
        by_form = dict(cached_chips[1])
        by_cheer = dict(cached_chips[2])
        by_dance = dict(cached_chips[3])
        by_complete = dict(cached_chips[4])
        by_missing = dict(cached_chips[5])
        by_assigned = dict(cached_chips[6])
        by_not_assigned = dict(cached_chips[7])
        by_reassigned = dict(cached_chips[8])
        form_by_form = dict(cached_chips[9])
        manual_by_form = dict(cached_chips[10])
        form_by_cheer = dict(cached_chips[11])
        manual_by_cheer = dict(cached_chips[12])
        form_by_dance = dict(cached_chips[13])
        manual_by_dance = dict(cached_chips[14])
        by_complete_cheer = dict(cached_chips[15])
        by_missing_cheer = dict(cached_chips[16])
        by_assigned_cheer = dict(cached_chips[17])
        by_not_assigned_cheer = dict(cached_chips[18])
        by_reassigned_cheer = dict(cached_chips[19])
        by_complete_dance = dict(cached_chips[20])
        by_missing_dance = dict(cached_chips[21])
        by_assigned_dance = dict(cached_chips[22])
        by_not_assigned_dance = dict(cached_chips[23])
        by_reassigned_dance = dict(cached_chips[24])
        cross_form = {k: list(v) for k, v in cached_chips[25].items()}
        cross_cheer = {k: list(v) for k, v in cached_chips[26].items()}
        cross_dance = {k: list(v) for k, v in cached_chips[27].items()}
    else:
        forms_base = _board_base_query(
            db,
            form_type=None,
            cheer_form_subtype=None,
            dance_form_subtype=None,
            category=category,
            source=source,
            search=search,
            range_filter="all",
            exclude_flagged=True,
        )
        # Source menu maps must stay usable under Form/Manual filter — never
        # inherit source= from the active board.
        source_maps_base = (
            forms_base
            if source not in ("form", "manual")
            else _board_base_query(
                db,
                form_type=None,
                cheer_form_subtype=None,
                dance_form_subtype=None,
                category=category,
                source=None,
                search=search,
                range_filter="all",
                exclude_flagged=True,
            )
        )
        complete_expr = _complete_data_expr()
        missing_expr = _missing_data_expr()
        for row in (
            forms_base.with_entities(
                Order.form_type,
                func.count(Order.id),
                func.sum(func.cast(complete_expr, Integer)),
                func.sum(func.cast(missing_expr, Integer)),
                func.sum(func.cast(_assigned_expr(), Integer)),
                func.sum(func.cast(_not_assigned_expr(), Integer)),
                func.sum(func.cast(_reassigned_expr(), Integer)),
                *_complete_cross_sums(complete_expr),
            )
            .group_by(Order.form_type)
            .all()
        ):
            (
                ft,
                n,
                complete_n,
                missing_n,
                assigned_n,
                not_assigned_n,
                reassigned_n,
                *cross_n,
            ) = row
            if ft not in by_form:
                continue
            by_form[ft] = int(n or 0)
            by_complete[ft] = int(complete_n or 0)
            by_missing[ft] = int(missing_n or 0)
            by_assigned[ft] = int(assigned_n or 0)
            by_not_assigned[ft] = int(not_assigned_n or 0)
            by_reassigned[ft] = int(reassigned_n or 0)
            cross_form[ft] = [int(x or 0) for x in cross_n]
        for row in (
            source_maps_base.with_entities(
                Order.form_type,
                func.sum(func.cast(is_form, Integer)),
                func.sum(func.cast(is_manual, Integer)),
            )
            .group_by(Order.form_type)
            .all()
        ):
            ft, form_n, manual_n = row
            if ft not in form_by_form:
                continue
            form_by_form[ft] = int(form_n or 0)
            manual_by_form[ft] = int(manual_n or 0)
        for row in (
            forms_base.filter(Order.form_type == "school-all-star-cheer")
            .with_entities(
                Order.cheer_form_subtype,
                func.count(Order.id),
                func.sum(func.cast(complete_expr, Integer)),
                func.sum(func.cast(missing_expr, Integer)),
                func.sum(func.cast(_assigned_expr(), Integer)),
                func.sum(func.cast(_not_assigned_expr(), Integer)),
                func.sum(func.cast(_reassigned_expr(), Integer)),
                *_complete_cross_sums(complete_expr),
            )
            .group_by(Order.cheer_form_subtype)
            .all()
        ):
            (
                st,
                n,
                complete_n,
                missing_n,
                assigned_n,
                not_assigned_n,
                reassigned_n,
                *cross_n,
            ) = row
            if st not in by_cheer:
                continue
            by_cheer[st] = int(n or 0)
            by_complete_cheer[st] = int(complete_n or 0)
            by_missing_cheer[st] = int(missing_n or 0)
            by_assigned_cheer[st] = int(assigned_n or 0)
            by_not_assigned_cheer[st] = int(not_assigned_n or 0)
            by_reassigned_cheer[st] = int(reassigned_n or 0)
            cross_cheer[st] = [int(x or 0) for x in cross_n]
        for st, form_n, manual_n in (
            source_maps_base.filter(Order.form_type == "school-all-star-cheer")
            .with_entities(
                Order.cheer_form_subtype,
                func.sum(func.cast(is_form, Integer)),
                func.sum(func.cast(is_manual, Integer)),
            )
            .group_by(Order.cheer_form_subtype)
            .all()
        ):
            if st in form_by_cheer:
                form_by_cheer[st] = int(form_n or 0)
                manual_by_cheer[st] = int(manual_n or 0)
        for row in (
            forms_base.filter(Order.form_type == "school-all-star-dance")
            .with_entities(
                Order.dance_form_subtype,
                func.count(Order.id),
                func.sum(func.cast(complete_expr, Integer)),
                func.sum(func.cast(missing_expr, Integer)),
                func.sum(func.cast(_assigned_expr(), Integer)),
                func.sum(func.cast(_not_assigned_expr(), Integer)),
                func.sum(func.cast(_reassigned_expr(), Integer)),
                *_complete_cross_sums(complete_expr),
            )
            .group_by(Order.dance_form_subtype)
            .all()
        ):
            (
                st,
                n,
                complete_n,
                missing_n,
                assigned_n,
                not_assigned_n,
                reassigned_n,
                *cross_n,
            ) = row
            if st not in by_dance:
                continue
            by_dance[st] = int(n or 0)
            by_complete_dance[st] = int(complete_n or 0)
            by_missing_dance[st] = int(missing_n or 0)
            by_assigned_dance[st] = int(assigned_n or 0)
            by_not_assigned_dance[st] = int(not_assigned_n or 0)
            by_reassigned_dance[st] = int(reassigned_n or 0)
            cross_dance[st] = [int(x or 0) for x in cross_n]
        for st, form_n, manual_n in (
            source_maps_base.filter(Order.form_type == "school-all-star-dance")
            .with_entities(
                Order.dance_form_subtype,
                func.sum(func.cast(is_form, Integer)),
                func.sum(func.cast(is_manual, Integer)),
            )
            .group_by(Order.dance_form_subtype)
            .all()
        ):
            if st in form_by_dance:
                form_by_dance[st] = int(form_n or 0)
                manual_by_dance[st] = int(manual_n or 0)
        if not (search and search.strip()):
            _form_chip_cache[chip_key] = (
                now,
                dict(by_form),
                dict(by_cheer),
                dict(by_dance),
                dict(by_complete),
                dict(by_missing),
                dict(by_assigned),
                dict(by_not_assigned),
                dict(by_reassigned),
                dict(form_by_form),
                dict(manual_by_form),
                dict(form_by_cheer),
                dict(manual_by_cheer),
                dict(form_by_dance),
                dict(manual_by_dance),
                dict(by_complete_cheer),
                dict(by_missing_cheer),
                dict(by_assigned_cheer),
                dict(by_not_assigned_cheer),
                dict(by_reassigned_cheer),
                dict(by_complete_dance),
                dict(by_missing_dance),
                dict(by_assigned_dance),
                dict(by_not_assigned_dance),
                dict(by_reassigned_dance),
                {k: list(v) for k, v in cross_form.items()},
                {k: list(v) for k, v in cross_cheer.items()},
                {k: list(v) for k, v in cross_dance.items()},
            )

    # Source menu must stay usable while a Source filter is active — compute
    # form/manual without the source= constraint (still scoped by form/search).
    if source in ("form", "manual"):
        source_base = _board_base_query(
            db,
            form_type=form_type,
            cheer_form_subtype=cheer_form_subtype,
            dance_form_subtype=dance_form_subtype,
            category=category,
            source=None,
            search=search,
            range_filter="all",
            exclude_flagged=False,
        )
        src_row = source_base.with_entities(
            func.sum(func.cast(and_(not_flagged, is_form), Integer)).label(
                "form_count"
            ),
            func.sum(func.cast(and_(not_flagged, is_manual), Integer)).label(
                "manual_count"
            ),
        ).one()
        form_count = int(src_row.form_count or 0)
        manual_count = int(src_row.manual_count or 0)
    else:
        form_count = int(tab_row.form_count or 0)
        manual_count = int(tab_row.manual_count or 0)

    counts = OrdersBoardCounts(
        all=int(tab_row.all or 0),
        complete_data=int(tab_row.complete_data or 0),
        missing_data=int(tab_row.missing_data or 0),
        assigned=int(tab_row.assigned or 0),
        not_assigned=int(tab_row.not_assigned or 0),
        reassigned=int(tab_row.reassigned or 0),
        flagged=int(tab_row.flagged or 0),
        form=form_count,
        manual=manual_count,
        by_form_type=by_form,
        by_cheer_form_subtype=by_cheer,
        by_dance_form_subtype=by_dance,
        form_by_form_type=form_by_form,
        manual_by_form_type=manual_by_form,
        form_by_cheer_form_subtype=form_by_cheer,
        manual_by_cheer_form_subtype=manual_by_cheer,
        form_by_dance_form_subtype=form_by_dance,
        manual_by_dance_form_subtype=manual_by_dance,
        complete_data_by_form_type=by_complete,
        missing_data_by_form_type=by_missing,
        assigned_by_form_type=by_assigned,
        not_assigned_by_form_type=by_not_assigned,
        reassigned_by_form_type=by_reassigned,
        complete_data_by_cheer_form_subtype=by_complete_cheer,
        missing_data_by_cheer_form_subtype=by_missing_cheer,
        assigned_by_cheer_form_subtype=by_assigned_cheer,
        not_assigned_by_cheer_form_subtype=by_not_assigned_cheer,
        reassigned_by_cheer_form_subtype=by_reassigned_cheer,
        complete_data_by_dance_form_subtype=by_complete_dance,
        missing_data_by_dance_form_subtype=by_missing_dance,
        assigned_by_dance_form_subtype=by_assigned_dance,
        not_assigned_by_dance_form_subtype=by_not_assigned_dance,
        reassigned_by_dance_form_subtype=by_reassigned_dance,
        complete_assigned=int(tab_row.complete_assigned or 0),
        complete_not_assigned=int(tab_row.complete_not_assigned or 0),
        complete_reassigned=int(tab_row.complete_reassigned or 0),
        complete_assigned_by_form_type=_nonzero(
            {k: v[0] for k, v in cross_form.items()}
        ),
        complete_not_assigned_by_form_type=_nonzero(
            {k: v[1] for k, v in cross_form.items()}
        ),
        complete_reassigned_by_form_type=_nonzero(
            {k: v[2] for k, v in cross_form.items()}
        ),
        complete_assigned_by_cheer_form_subtype=_nonzero(
            {k: v[0] for k, v in cross_cheer.items()}
        ),
        complete_not_assigned_by_cheer_form_subtype=_nonzero(
            {k: v[1] for k, v in cross_cheer.items()}
        ),
        complete_reassigned_by_cheer_form_subtype=_nonzero(
            {k: v[2] for k, v in cross_cheer.items()}
        ),
        complete_assigned_by_dance_form_subtype=_nonzero(
            {k: v[0] for k, v in cross_dance.items()}
        ),
        complete_not_assigned_by_dance_form_subtype=_nonzero(
            {k: v[1] for k, v in cross_dance.items()}
        ),
        complete_reassigned_by_dance_form_subtype=_nonzero(
            {k: v[2] for k, v in cross_dance.items()}
        ),
    )
    return OrdersBoardCountsResponse(counts=counts)


@router.get("/orders/export.csv")
def export_orders_csv(
    form_type: str | None = None,
    cheer_form_subtype: str | None = None,
    dance_form_subtype: str | None = None,
    category: str | None = None,
    source: str | None = None,
    search: str | None = None,
    range_filter: str | None = Query(None, alias="range"),
    sort_by: str | None = None,
    exclude_flagged: bool = True,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = _board_base_query(
        db,
        form_type=form_type,
        cheer_form_subtype=cheer_form_subtype,
        dance_form_subtype=dance_form_subtype,
        category=category,
        source=source,
        search=search,
        range_filter=range_filter,
        exclude_flagged=exclude_flagged,
    )
    query = _apply_sort(query, sort_by)
    # Hard cap export rows per request on Hobby.
    rows = query.limit(5000).all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "id",
            "created_at",
            "form_type",
            "school_gym_name",
            "team_name",
            "coach_name",
            "contact_name",
            "package",
            "music_affiliate",
            "assigned_producer",
            "status",
            "is_manual_entry",
            "needs_attention",
            "price",
        ]
    )
    for o in rows:
        writer.writerow(
            [
                str(o.id),
                o.created_at.isoformat() if o.created_at else "",
                o.form_type or "",
                o.school_gym_name or "",
                o.team_name or "",
                o.coach_name or "",
                o.contact_name or "",
                o.package or "",
                o.music_affiliate or "",
                o.assigned_producer or "",
                o.status or "",
                "yes" if o.is_manual_entry else "no",
                "yes" if o.needs_attention else "no",
                str(o.price or 0),
            ]
        )

    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="orders_export.csv"'
        },
    )


def _match_pool_base_query(db: Session):
    query = _apply_orders_scope(db.query(Order), "active")
    query = query.filter(or_(Order.status.is_(None), Order.status != "in_mtd"))
    return query.filter(
        Order.merged_into_manual_order_id.is_(None),
        or_(
            Order.merged_form_order_id.is_(None),
            Order.merged_form_order_id == "",
        ),
    )


def _unmatched_magento_expr():
    return and_(
        or_(Order.is_manual_entry.is_(False), Order.is_manual_entry.is_(None)),
        or_(
            Order.suppress_manual_form_merge.is_(False),
            Order.suppress_manual_form_merge.is_(None),
        ),
        or_(
            Order.affiliate_flag_status.is_(None),
            Order.affiliate_flag_status != "open",
        ),
    )


def _unmatched_manual_expr():
    return and_(
        Order.is_manual_entry.is_(True),
        or_(
            Order.suppress_manual_form_merge.is_(False),
            Order.suppress_manual_form_merge.is_(None),
        ),
        or_(Order.status.is_(None), Order.status != "completed"),
    )


class OrdersMatchCounts(BaseModel):
    magento: int = 0
    manual: int = 0
    by_form_type: dict[str, int] = Field(default_factory=dict)
    by_cheer_form_subtype: dict[str, int] = Field(default_factory=dict)
    by_dance_form_subtype: dict[str, int] = Field(default_factory=dict)
    manual_by_form_type: dict[str, int] = Field(default_factory=dict)
    manual_by_cheer_form_subtype: dict[str, int] = Field(default_factory=dict)
    manual_by_dance_form_subtype: dict[str, int] = Field(default_factory=dict)


class OrdersMatchCountsResponse(BaseModel):
    counts: OrdersMatchCounts


_MATCH_COUNTS_TTL_S = 45.0

# First-page Match pool is ~1.5s+ on large cheer subtypes; reuse briefly so
# soft-nav / tab revisit paints from cache while counts are already warm.
_MATCH_POOL_TTL_S = 45.0
_MATCH_POOL_CACHE_MAX = 48


def _match_pool_cache_key(
    *,
    form_type: str | None,
    cheer_form_subtype: str | None,
    dance_form_subtype: str | None,
    page_size: int,
    page_token: str | None,
) -> str:
    return "|".join(
        [
            form_type or "",
            cheer_form_subtype or "",
            dance_form_subtype or "",
            str(page_size),
            page_token or "",
        ]
    )


def _read_match_pool_page_cache(
    key: str,
) -> tuple[list[OrderSchema], str | None] | None:
    hit = _match_pool_page_cache.get(key)
    if not hit:
        return None
    ts, orders, next_token = hit
    if time.monotonic() - ts >= _MATCH_POOL_TTL_S:
        _match_pool_page_cache.pop(key, None)
        return None
    return orders, next_token


def _write_match_pool_page_cache(
    key: str, orders: list[OrderSchema], next_token: str | None
) -> None:
    if len(_match_pool_page_cache) >= _MATCH_POOL_CACHE_MAX:
        oldest_key = min(
            _match_pool_page_cache.items(), key=lambda kv: kv[1][0]
        )[0]
        _match_pool_page_cache.pop(oldest_key, None)
    _match_pool_page_cache[key] = (time.monotonic(), orders, next_token)


@router.get("/orders/match-counts", response_model=OrdersMatchCountsResponse)
def get_orders_match_counts(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """True Match Orders badge totals (not limited to loaded pool pages)."""
    now = time.monotonic()
    cached = _match_counts_cache.get("all")
    if cached and now - cached[0] < _MATCH_COUNTS_TTL_S:
        return OrdersMatchCountsResponse(counts=cached[1])

    base = _match_pool_base_query(db)
    magento_q = base.filter(_unmatched_magento_expr())
    manual_q = base.filter(_unmatched_manual_expr())

    by_form = {ft: 0 for ft in _FORM_TYPES}
    by_cheer = {st: 0 for st in _CHEER_SUBTYPES}
    by_dance = {st: 0 for st in _DANCE_SUBTYPES}
    manual_by_form = {ft: 0 for ft in _FORM_TYPES}
    manual_by_cheer = {st: 0 for st in _CHEER_SUBTYPES}
    manual_by_dance = {st: 0 for st in _DANCE_SUBTYPES}

    magento_total = int(magento_q.with_entities(func.count(Order.id)).scalar() or 0)
    manual_total = int(manual_q.with_entities(func.count(Order.id)).scalar() or 0)

    for ft, n in (
        magento_q.with_entities(Order.form_type, func.count(Order.id))
        .group_by(Order.form_type)
        .all()
    ):
        if ft in by_form:
            by_form[ft] = int(n or 0)
    for st, n in (
        magento_q.filter(Order.form_type == "school-all-star-cheer")
        .with_entities(Order.cheer_form_subtype, func.count(Order.id))
        .group_by(Order.cheer_form_subtype)
        .all()
    ):
        if st in by_cheer:
            by_cheer[st] = int(n or 0)
    for st, n in (
        magento_q.filter(Order.form_type == "school-all-star-dance")
        .with_entities(Order.dance_form_subtype, func.count(Order.id))
        .group_by(Order.dance_form_subtype)
        .all()
    ):
        if st in by_dance:
            by_dance[st] = int(n or 0)

    for ft, n in (
        manual_q.with_entities(Order.form_type, func.count(Order.id))
        .group_by(Order.form_type)
        .all()
    ):
        if ft in manual_by_form:
            manual_by_form[ft] = int(n or 0)
    for st, n in (
        manual_q.filter(Order.form_type == "school-all-star-cheer")
        .with_entities(Order.cheer_form_subtype, func.count(Order.id))
        .group_by(Order.cheer_form_subtype)
        .all()
    ):
        if st in manual_by_cheer:
            manual_by_cheer[st] = int(n or 0)
    for st, n in (
        manual_q.filter(Order.form_type == "school-all-star-dance")
        .with_entities(Order.dance_form_subtype, func.count(Order.id))
        .group_by(Order.dance_form_subtype)
        .all()
    ):
        if st in manual_by_dance:
            manual_by_dance[st] = int(n or 0)

    counts = OrdersMatchCounts(
        magento=magento_total,
        manual=manual_total,
        by_form_type=by_form,
        by_cheer_form_subtype=by_cheer,
        by_dance_form_subtype=by_dance,
        manual_by_form_type=manual_by_form,
        manual_by_cheer_form_subtype=manual_by_cheer,
        manual_by_dance_form_subtype=manual_by_dance,
    )
    _match_counts_cache["all"] = (now, counts)
    return OrdersMatchCountsResponse(counts=counts)


@router.get("/orders/match-pool", response_model=OrderListResponse)
def get_orders_match_pool(
    form_type: str | None = None,
    cheer_form_subtype: str | None = None,
    dance_form_subtype: str | None = None,
    page_size: int | None = Query(None, ge=1, le=500),
    page_token: str | None = Depends(page_token_query),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Unmatched manuals + Magento forms for Match Orders (paged, optional form scope)."""
    size = page_size if page_size is not None else BOARD_DEFAULT_PAGE_SIZE
    cache_key = _match_pool_cache_key(
        form_type=form_type,
        cheer_form_subtype=cheer_form_subtype,
        dance_form_subtype=dance_form_subtype,
        page_size=size,
        page_token=page_token,
    )
    # Cache first page only — tab switches / soft-nav hit this path constantly.
    if not page_token:
        cached = _read_match_pool_page_cache(cache_key)
        if cached is not None:
            orders, next_token = cached
            return OrderListResponse(orders=orders, next_page_token=next_token)

    query = _match_pool_base_query(db)
    if cheer_form_subtype and cheer_form_subtype not in ("all", "All"):
        query = query.filter(
            Order.form_type == "school-all-star-cheer",
            Order.cheer_form_subtype == cheer_form_subtype,
        )
    elif dance_form_subtype and dance_form_subtype not in ("all", "All"):
        query = query.filter(
            Order.form_type == "school-all-star-dance",
            Order.dance_form_subtype == dance_form_subtype,
        )
    elif form_type and form_type not in ("all", "All"):
        query = query.filter(Order.form_type == form_type)
    page, next_token = paginate_keyset_by_created(
        query,
        model=Order,
        page_size=size,
        page_token=page_token,
        sort="newest",
    )
    orders = [OrderSchema.model_validate(row) for row in page]
    if not page_token:
        _write_match_pool_page_cache(cache_key, orders, next_token)
    return OrderListResponse(orders=orders, next_page_token=next_token)
