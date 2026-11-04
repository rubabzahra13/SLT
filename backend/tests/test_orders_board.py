"""Paged orders board + counts + import chunk contract."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine, func
from sqlalchemy.orm import Session, sessionmaker

from app.api.orders_board import (
    BOARD_DEFAULT_PAGE_SIZE,
    _board_base_query,
    _flagged_expr,
)
from app.api.orders_import import (
    ImportChunkRequest,
    ImportChunkRow,
    MAX_CHUNK_ROWS,
    import_orders_chunk,
)
from app.lib.pagination import paginate_keyset_by_created
from app.models.base import Base
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


def _order(
    db: Session,
    *,
    status: str = "new",
    needs_attention: bool = False,
    assigned: str | None = None,
    is_reassigned: bool = False,
    flag: str | None = None,
    form_type: str = "school-all-star-cheer",
    is_past_order: bool = False,
    created_at: datetime | None = None,
) -> Order:
    row = Order(
        id=uuid.uuid4(),
        form_type=form_type,
        status=status,
        school_gym_name="Gym",
        customer_name="Test",
        needs_attention=needs_attention,
        assigned_producer=assigned,
        is_reassigned=is_reassigned,
        affiliate_flag_status=flag,
        is_past_order=is_past_order,
        created_at=created_at or datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _base(
    db: Session,
    *,
    range_filter: str = "all",
    exclude_flagged: bool = True,
    form_type: str | None = None,
    search: str | None = None,
):
    return _board_base_query(
        db,
        form_type=form_type,
        cheer_form_subtype=None,
        dance_form_subtype=None,
        category=None,
        source=None,
        search=search,
        range_filter=range_filter,
        exclude_flagged=exclude_flagged,
    )


def test_board_default_page_size_is_fifty():
    assert BOARD_DEFAULT_PAGE_SIZE == 50


def test_board_base_excludes_in_mtd_completed_and_past(db: Session):
    live = _order(db, status="new")
    _order(db, status="in_mtd")
    _order(db, status="completed")
    _order(db, status="new", is_past_order=True)
    rows = _base(db).all()
    ids = {str(r.id) for r in rows}
    assert str(live.id) in ids
    assert len(rows) == 1


def test_board_range_assigned_missing_and_flagged(db: Session):
    assigned = _order(db, assigned="CM")
    missing = _order(db, needs_attention=True)
    flagged = _order(db, flag="open")

    assigned_rows = _base(db, range_filter="assigned").all()
    assert {r.id for r in assigned_rows} == {assigned.id}

    missing_rows = _base(db, range_filter="missing_data").all()
    assert any(r.id == missing.id for r in missing_rows)

    flagged_rows = (
        _base(db, range_filter="flagged", exclude_flagged=False)
        .filter(_flagged_expr())
        .all()
    )
    assert any(r.id == flagged.id for r in flagged_rows)


def test_board_keyset_paging_advances(db: Session):
    now = datetime.now(timezone.utc)
    for i in range(3):
        _order(
            db,
            status="new",
            created_at=now - timedelta(minutes=i),
        )
    q = _base(db)
    page1, token = paginate_keyset_by_created(
        q, model=Order, page_size=2, page_token=None, sort="newest"
    )
    assert len(page1) == 2
    assert token
    page2, token2 = paginate_keyset_by_created(
        q, model=Order, page_size=2, page_token=token, sort="newest"
    )
    assert len(page2) == 1
    assert token2 is None
    assert {r.id for r in page1}.isdisjoint({r.id for r in page2})


def test_counts_mirror_range_filters(db: Session):
    _order(db, assigned="CM")
    _order(db, assigned=None)
    _order(db, needs_attention=True)
    base = _base(db)
    total = int(base.with_entities(func.count(Order.id)).scalar() or 0)
    assert total == 3
    missing = int(
        base.filter(Order.needs_attention.is_(True))
        .with_entities(func.count(Order.id))
        .scalar()
        or 0
    )
    assert missing == 1


def test_counts_complete_cross_matches_combined_range(db: Session):
    from app.api.orders_board import _get_orders_counts_db
    from app.services.form_chip_cache import invalidate_order_read_caches

    def complete(**kw) -> Order:
        row = _order(db, **kw)
        row.package_type = "PREMIUM"
        row.time_length_of_mix = "2:30"
        row.song_list_suggestions = "Song A"
        row.routine_notes = "Notes"
        row.received_eight_count_sheet = "HAVE"
        row.have_songs = "HAVE"
        db.commit()
        return row

    complete(assigned="CM")
    complete()
    _order(db, assigned="CM", needs_attention=True)
    _order(db, needs_attention=True)
    _order(db, needs_attention=True)

    invalidate_order_read_caches()
    c = _get_orders_counts_db(
        db,
        form_type=None,
        cheer_form_subtype=None,
        dance_form_subtype=None,
        category=None,
        source=None,
        search=None,
        flagged_only=False,
        cache_key=None,
    ).counts

    def combined(rng: str) -> int:
        return int(
            _base(db, range_filter=rng).with_entities(func.count(Order.id)).scalar()
            or 0
        )

    assert c.complete_assigned == combined("complete_data,assigned") == 1
    assert c.complete_not_assigned == combined("complete_data,not_assigned") == 1
    assert c.complete_reassigned == 0
    assert c.assigned - c.complete_assigned == combined("missing_data,assigned") == 1
    assert (
        c.not_assigned - c.complete_not_assigned
        == combined("missing_data,not_assigned")
        == 2
    )
    cheer = "school-all-star-cheer"
    assert c.complete_assigned_by_form_type == {cheer: 1}
    assert c.complete_reassigned_by_form_type == {}


def test_match_write_clears_cached_match_pool_and_counts(db: Session):
    from app.api.orders import _publish_order_updated
    from app.api.orders_board import (
        _get_orders_match_counts_db,
        _get_orders_match_pool_db,
        _match_pool_cache_key,
    )
    from app.services.form_chip_cache import invalidate_order_read_caches

    manual = _order(db)
    manual.is_manual_entry = True
    form = _order(db)
    form.is_manual_entry = False
    db.commit()

    def pool_ids() -> set[str]:
        page = _get_orders_match_pool_db(
            db,
            form_type=None,
            cheer_form_subtype=None,
            dance_form_subtype=None,
            page_size=25,
            page_token=None,
            cache_key=_match_pool_cache_key(
                form_type=None,
                cheer_form_subtype=None,
                dance_form_subtype=None,
                page_size=25,
                page_token=None,
            ),
        )
        return {str(o.id) for o in page.orders}

    invalidate_order_read_caches()
    before = _get_orders_match_counts_db(db).counts
    assert (before.magento, before.manual) == (1, 1)
    assert pool_ids() == {str(manual.id), str(form.id)}

    manual.merged_form_order_id = str(form.id)
    form.merged_into_manual_order_id = str(manual.id)
    db.commit()
    _publish_order_updated(form)

    after = _get_orders_match_counts_db(db).counts
    assert (after.magento, after.manual) == (0, 0)
    assert pool_ids() == set()


def test_import_chunk_max_and_idempotent_external_id(db: Session, monkeypatch):
    monkeypatch.setattr(
        "app.api.orders_import._publish_order_updated", lambda *_a, **_k: None
    )
    monkeypatch.setattr(
        "app.api.orders_import._apply_producer_assignment", lambda *_a, **_k: None
    )

    assert MAX_CHUNK_ROWS == 100
    payload = ImportChunkRequest(
        job_id="job-1",
        chunk_index=0,
        rows=[
            ImportChunkRow(
                external_id="sheet-1",
                school_gym_name="Import Gym",
                coach_name="Coach",
                package="PREMIUM",
            ),
            ImportChunkRow(
                external_id="sheet-1",
                school_gym_name="Import Gym Dup",
                coach_name="Coach",
                package="PREMIUM",
            ),
        ],
    )
    first = import_orders_chunk(payload, db=db, _=None)
    assert first.imported == 2
    assert first.failed == 0
    assert db.query(Order).count() == 1
    row = db.query(Order).one()
    assert row.import_external_id == "sheet-1"

    second = import_orders_chunk(payload, db=db, _=None)
    assert second.imported == 2
    assert db.query(Order).count() == 1


def test_import_chunk_rejects_over_max_by_truncation(db: Session, monkeypatch):
    monkeypatch.setattr(
        "app.api.orders_import._publish_order_updated", lambda *_a, **_k: None
    )
    monkeypatch.setattr(
        "app.api.orders_import._apply_producer_assignment", lambda *_a, **_k: None
    )
    rows = [
        ImportChunkRow(
            external_id=f"e-{i}",
            school_gym_name=f"G{i}",
            coach_name="C",
            package="PREMIUM",
        )
        for i in range(MAX_CHUNK_ROWS + 25)
    ]
    result = import_orders_chunk(ImportChunkRequest(rows=rows), db=db, _=None)
    assert result.imported == MAX_CHUNK_ROWS
    assert db.query(Order).count() == MAX_CHUNK_ROWS
