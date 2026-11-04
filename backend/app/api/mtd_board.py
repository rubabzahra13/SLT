"""Paged MTD / payroll board + counts for unbounded growth."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.api.mtd import (
    MtdListResponse,
    _apply_mtd_scope,
    _mtd_load_options,
    _serialize_mtd,
)
from app.core.database import get_db
from app.lib.pagination import page_token_query, paginate_keyset_by_created
from app.models.mtd_record import MTDRecord
from app.models.order import Order
from app.models.user import User
from app.order_identity import category_from_form_type

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

_CATEGORY_FORM_TYPES: dict[str, tuple[str, ...]] = {
    "Cheer": ("school-all-star-cheer",),
    "Dance": ("school-all-star-dance",),
    "Marching Band": ("marching-band",),
    "Sports Entertainment": ("sports-entertainment",),
    "School Anthem": ("school-anthem",),
}


class MtdBoardCounts(BaseModel):
    all: int = 0
    by_form_type: dict[str, int] = Field(default_factory=dict)
    by_category: dict[str, int] = Field(default_factory=dict)
    by_cheer_form_subtype: dict[str, int] = Field(default_factory=dict)
    by_dance_form_subtype: dict[str, int] = Field(default_factory=dict)


class MtdBoardCountsResponse(BaseModel):
    counts: MtdBoardCounts


def _mtd_board_query(
    db: Session,
    *,
    scope: str,
    form_type: str | None,
    cheer_form_subtype: str | None,
    category: str | None,
    search: str | None,
    status: str | None,
):
    query = db.query(MTDRecord).options(*_mtd_load_options())
    query = _apply_mtd_scope(query, scope)

    needs_join = bool(
        (cheer_form_subtype and cheer_form_subtype not in ("all", "All"))
        or (form_type and form_type not in ("all", "All"))
        or (category and category != "All")
        or (search and search.strip())
    )
    if needs_join:
        query = query.join(Order, MTDRecord.order_id == Order.id, isouter=True)

    if cheer_form_subtype and cheer_form_subtype not in ("all", "All"):
        query = query.filter(Order.cheer_form_subtype == cheer_form_subtype)
    elif form_type and form_type not in ("all", "All"):
        query = query.filter(Order.form_type == form_type)

    if category and category != "All":
        form_types = _CATEGORY_FORM_TYPES.get(category)
        if form_types:
            query = query.filter(Order.form_type.in_(form_types))
        else:
            query = query.filter(False)

    if status and status != "all":
        query = query.filter(MTDRecord.status == status)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Order.school_gym_name.ilike(term),
                Order.team_name.ilike(term),
                Order.coach_name.ilike(term),
                Order.contact_name.ilike(term),
                MTDRecord.invoice.ilike(term),
                MTDRecord.section.ilike(term),
            )
        )

    return query


@router.get("/mtd/board", response_model=MtdListResponse)
def get_mtd_board(
    scope: str = "live",
    form_type: str | None = None,
    cheer_form_subtype: str | None = None,
    category: str | None = None,
    search: str | None = None,
    status: str | None = None,
    page_size: int | None = Query(None, ge=1, le=500),
    page_token: str | None = Depends(page_token_query),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    size = page_size if page_size is not None else BOARD_DEFAULT_PAGE_SIZE
    query = _mtd_board_query(
        db,
        scope=scope,
        form_type=form_type,
        cheer_form_subtype=cheer_form_subtype,
        category=category,
        search=search,
        status=status,
    )
    page, next_token = paginate_keyset_by_created(
        query,
        model=MTDRecord,
        page_size=size,
        page_token=page_token,
        sort="newest",
    )
    return MtdListResponse(
        mtd=[_serialize_mtd(row) for row in page],
        next_page_token=next_token,
    )


@router.get("/mtd/counts", response_model=MtdBoardCountsResponse)
def get_mtd_counts(
    scope: str = "live",
    form_type: str | None = None,
    cheer_form_subtype: str | None = None,
    category: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    base = _mtd_board_query(
        db,
        scope=scope,
        form_type=form_type,
        cheer_form_subtype=cheer_form_subtype,
        category=category,
        search=search,
        status=None,
    )

    def _count(q) -> int:
        return int(
            q.with_entities(func.count(MTDRecord.id)).scalar() or 0
        )

    # Form / subtype chips are unscoped by the active tab (Orders pattern).
    chip_base = db.query(MTDRecord)
    chip_base = _apply_mtd_scope(chip_base, scope)
    chip_base = chip_base.outerjoin(Order, MTDRecord.order_id == Order.id)
    if search and search.strip():
        term = f"%{search.strip()}%"
        chip_base = chip_base.filter(
            or_(
                Order.school_gym_name.ilike(term),
                Order.team_name.ilike(term),
                Order.coach_name.ilike(term),
                Order.contact_name.ilike(term),
                MTDRecord.invoice.ilike(term),
                MTDRecord.section.ilike(term),
            )
        )

    by_form = {ft: 0 for ft in _FORM_TYPES}
    for ft, n in (
        chip_base.with_entities(Order.form_type, func.count(MTDRecord.id))
        .group_by(Order.form_type)
        .all()
    ):
        if ft in by_form:
            by_form[ft] = int(n or 0)

    by_cheer = {st: 0 for st in _CHEER_SUBTYPES}
    for st, n in (
        chip_base.filter(Order.form_type == "school-all-star-cheer")
        .with_entities(Order.cheer_form_subtype, func.count(MTDRecord.id))
        .group_by(Order.cheer_form_subtype)
        .all()
    ):
        if st in by_cheer:
            by_cheer[st] = int(n or 0)

    by_dance = {st: 0 for st in _DANCE_SUBTYPES}
    for st, n in (
        chip_base.filter(Order.form_type == "school-all-star-dance")
        .with_entities(Order.dance_form_subtype, func.count(MTDRecord.id))
        .group_by(Order.dance_form_subtype)
        .all()
    ):
        if st in by_dance:
            by_dance[st] = int(n or 0)

    by_cat: dict[str, int] = {}
    for cat in _CATEGORY_FORM_TYPES:
        q = _mtd_board_query(
            db,
            scope=scope,
            form_type=None,
            cheer_form_subtype=None,
            category=cat,
            search=search,
            status=None,
        )
        by_cat[cat] = _count(q)

    return MtdBoardCountsResponse(
        counts=MtdBoardCounts(
            all=_count(base),
            by_form_type=by_form,
            by_category=by_cat,
            by_cheer_form_subtype=by_cheer,
            by_dance_form_subtype=by_dance,
        )
    )
