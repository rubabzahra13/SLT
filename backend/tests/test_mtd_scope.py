"""MTD list scope: live excludes paid archive; archive is paid-only."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.mtd import _apply_mtd_scope, _mtd_live_filter
from app.models.base import Base
from app.models.mtd_record import MTDRecord
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


def _make_mtd(
    db: Session,
    *,
    in_payroll: bool = False,
    status: str = "active",
    paid_at: datetime | None = None,
) -> MTDRecord:
    row = MTDRecord(
        id=uuid.uuid4(),
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


def test_mtd_scope_live_excludes_paid_archive(db: Session):
    board = _make_mtd(db)
    unpaid = _make_mtd(db, in_payroll=True, status="completed")
    paid = _make_mtd(
        db,
        in_payroll=True,
        status="completed",
        paid_at=datetime.now(timezone.utc),
    )

    rows = _apply_mtd_scope(db.query(MTDRecord), "live").all()
    ids = {str(r.id) for r in rows}
    assert str(board.id) in ids
    assert str(unpaid.id) in ids
    assert str(paid.id) not in ids


def test_mtd_scope_archive_only_paid(db: Session):
    _make_mtd(db)
    paid = _make_mtd(
        db,
        in_payroll=True,
        status="completed",
        paid_at=datetime.now(timezone.utc),
    )

    rows = _apply_mtd_scope(db.query(MTDRecord), "archive").all()
    ids = {str(r.id) for r in rows}
    assert ids == {str(paid.id)}


def test_mtd_scope_board_and_payroll(db: Session):
    board = _make_mtd(db, in_payroll=False)
    unpaid = _make_mtd(db, in_payroll=True, status="completed")
    _make_mtd(
        db,
        in_payroll=True,
        status="completed",
        paid_at=datetime.now(timezone.utc),
    )

    board_ids = {str(r.id) for r in _apply_mtd_scope(db.query(MTDRecord), "board").all()}
    payroll_ids = {
        str(r.id) for r in _apply_mtd_scope(db.query(MTDRecord), "payroll").all()
    }
    assert str(board.id) in board_ids
    assert str(unpaid.id) not in board_ids
    assert str(unpaid.id) in payroll_ids
    assert str(board.id) not in payroll_ids


def test_bootstrap_live_filter_matches_scope_live(db: Session):
    live = _make_mtd(db)
    _make_mtd(
        db,
        in_payroll=True,
        paid_at=datetime.now(timezone.utc),
    )
    rows = db.query(MTDRecord).filter(_mtd_live_filter()).all()
    ids = {str(r.id) for r in rows}
    assert str(live.id) in ids
    assert all(r.paid_at is None for r in rows)
