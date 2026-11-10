"""Paged MTD board query + counts for live/payroll/archive scopes."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine, func
from sqlalchemy.orm import Session, sessionmaker

from app.api.mtd_board import (
    BOARD_DEFAULT_PAGE_SIZE,
    _get_mtd_counts_db,
    _mtd_board_query,
)
from app.lib.pagination import paginate_keyset_by_created
from app.models.base import Base
from app.models.mtd_record import MTDRecord
from app.models.order import Order
import app.models  # noqa: F401


@pytest.fixture()
def db() -> Session:
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def _order(db: Session, *, form_type: str = "school-all-star-cheer") -> Order:
    row = Order(
        id=uuid.uuid4(),
        form_type=form_type,
        status="in_mtd",
        school_gym_name="Gym",
        customer_name="Test",
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _mtd(
    db: Session,
    *,
    order: Order | None = None,
    in_payroll: bool = False,
    status: str = "active",
    paid_at: datetime | None = None,
) -> MTDRecord:
    row = MTDRecord(
        id=uuid.uuid4(),
        order_id=order.id if order else None,
        section="CHEERLEADING MUSIC",
        price=100,
        invoice="",
        status=status,
        in_payroll=in_payroll,
        paid_at=paid_at,
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def test_mtd_board_uses_order_timestamp_for_sort_and_date(db: Session):
    """Timestamp column is order intake time, not mtd_records.created_at."""
    older = _order(db)
    newer = _order(db)
    older.created_at = datetime(2025, 1, 1, tzinfo=timezone.utc)
    newer.created_at = datetime(2026, 6, 1, tzinfo=timezone.utc)
    db.commit()

    # Insert clocks are the opposite of the order intake times.
    recent_insert = _mtd(db, order=older)
    recent_insert.created_at = datetime(2026, 8, 1, tzinfo=timezone.utc)
    old_insert = _mtd(db, order=newer)
    old_insert.created_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
    db.commit()

    q = _mtd_board_query(
        db,
        scope="live",
        form_type="school-all-star-cheer",
        cheer_form_subtype=None,
        category=None,
        search=None,
        status=None,
    )
    page, _token = paginate_keyset_by_created(
        q,
        model=MTDRecord,
        page_size=10,
        page_token=None,
        sort="newest",
        created_column=func.coalesce(Order.created_at, MTDRecord.created_at),
        created_at_of=lambda row: (
            row.order.created_at
            if row.order is not None and row.order.created_at is not None
            else row.created_at
        ),
    )
    assert [row.id for row in page] == [old_insert.id, recent_insert.id]

    window = _mtd_board_query(
        db,
        scope="live",
        form_type="school-all-star-cheer",
        cheer_form_subtype=None,
        category=None,
        search=None,
        status=None,
        created_after="2026-01-01T00:00:00+00:00",
    )
    assert [row.id for row in window.all()] == [old_insert.id]


def test_mtd_board_default_page_size():
    assert BOARD_DEFAULT_PAGE_SIZE == 50


def test_mtd_board_live_excludes_paid_archive(db: Session):
    live = _mtd(db)
    _mtd(
        db,
        in_payroll=True,
        status="completed",
        paid_at=datetime.now(timezone.utc),
    )
    rows = _mtd_board_query(
        db,
        scope="live",
        form_type=None,
        cheer_form_subtype=None,
        category=None,
        search=None,
        status=None,
    ).all()
    assert {str(r.id) for r in rows} == {str(live.id)}


def test_mtd_board_payroll_and_archive_scopes(db: Session):
    unpaid = _mtd(db, in_payroll=True, status="completed")
    paid = _mtd(
        db,
        in_payroll=True,
        status="completed",
        paid_at=datetime.now(timezone.utc),
    )
    payroll = _mtd_board_query(
        db,
        scope="payroll",
        form_type=None,
        cheer_form_subtype=None,
        category=None,
        search=None,
        status=None,
    ).all()
    archive = _mtd_board_query(
        db,
        scope="archive",
        form_type=None,
        cheer_form_subtype=None,
        category=None,
        search=None,
        status=None,
    ).all()
    assert {str(r.id) for r in payroll} == {str(unpaid.id)}
    assert {str(r.id) for r in archive} == {str(paid.id)}


def test_mtd_board_form_filter_and_paging(db: Session):
    cheer_a = _order(db, form_type="school-all-star-cheer")
    cheer_b = _order(db, form_type="school-all-star-cheer")
    dance = _order(db, form_type="school-all-star-dance")
    _mtd(db, order=cheer_a)
    _mtd(db, order=cheer_b)
    _mtd(db, order=dance)

    q = _mtd_board_query(
        db,
        scope="live",
        form_type="school-all-star-cheer",
        cheer_form_subtype=None,
        category=None,
        search=None,
        status=None,
    )
    total = int(q.with_entities(func.count(MTDRecord.id)).scalar() or 0)
    assert total == 2

    page1, token = paginate_keyset_by_created(
        q, model=MTDRecord, page_size=1, page_token=None, sort="newest"
    )
    assert len(page1) == 1
    assert token
    page2, token2 = paginate_keyset_by_created(
        q, model=MTDRecord, page_size=1, page_token=token, sort="newest"
    )
    assert len(page2) == 1
    assert token2 is None


def test_mtd_counts_cache_and_category_from_forms(db: Session):
    from app.services.form_chip_cache import (
        invalidate_mtd_read_caches,
        mtd_counts_cache,
    )

    cheer = _order(db, form_type="school-all-star-cheer")
    dance = _order(db, form_type="school-all-star-dance")
    band = _order(db, form_type="marching-band")
    _mtd(db, order=cheer)
    _mtd(db, order=dance)
    _mtd(db, order=band)

    invalidate_mtd_read_caches()
    first = _get_mtd_counts_db(
        db,
        scope="live",
        form_type=None,
        cheer_form_subtype=None,
        category=None,
        search=None,
        search_q="",
        cache_key="test|live",
    ).counts
    assert first.all == 3
    assert first.by_form_type["school-all-star-cheer"] == 1
    assert first.by_form_type["school-all-star-dance"] == 1
    assert first.by_form_type["marching-band"] == 1
    assert first.by_category["Cheer"] == 1
    assert first.by_category["Dance"] == 1
    assert first.by_category["Marching Band"] == 1
    assert "test|live" in mtd_counts_cache

    invalidate_mtd_read_caches()
    assert not mtd_counts_cache
