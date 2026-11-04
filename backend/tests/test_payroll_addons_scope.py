"""Payroll add-on list scopes stay bounded (no full-table bootstrap)."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.payroll_addons import list_payroll_addons
from app.models.base import Base
from app.models.mtd_record import MTDRecord
from app.models.order import Order
from app.models.payroll_addon import PayrollAddon
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


def _order(db: Session) -> Order:
    row = Order(
        id=uuid.uuid4(),
        form_type="school-all-star-cheer",
        status="in_mtd",
        school_gym_name="Gym",
        customer_name="Test",
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _mtd(db: Session, order: Order, *, in_payroll: bool, paid: bool) -> MTDRecord:
    row = MTDRecord(
        id=uuid.uuid4(),
        order_id=order.id,
        section="CHEERLEADING MUSIC",
        price=100,
        invoice="",
        status="completed" if paid else "active",
        in_mtd=True,
        in_payroll=in_payroll,
        paid_at=datetime.now(timezone.utc) if paid else None,
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _addon(
    db: Session,
    *,
    addon_type: str,
    mtd_id=None,
    order_id=None,
    program_name: str = "Team",
) -> PayrollAddon:
    row = PayrollAddon(
        id=uuid.uuid4(),
        program_name=program_name,
        category="Cheer",
        addon_type=addon_type,
        amount=Decimal("20.00"),
        rate_source="predefined",
        compensation_overridden=False,
        mtd_id=mtd_id,
        order_id=order_id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def test_payroll_linked_scope_excludes_voiceovers_and_non_payroll(db: Session):
    live = _order(db)
    payroll = _order(db)
    archived = _order(db)
    live_mtd = _mtd(db, live, in_payroll=False, paid=False)
    pay_mtd = _mtd(db, payroll, in_payroll=True, paid=False)
    archive_mtd = _mtd(db, archived, in_payroll=True, paid=True)

    linked_rush = _addon(
        db, addon_type="rush_fee", mtd_id=pay_mtd.id, order_id=payroll.id
    )
    archive_rush = _addon(
        db, addon_type="rush_fee", mtd_id=archive_mtd.id, order_id=archived.id
    )
    _addon(db, addon_type="rush_fee", mtd_id=live_mtd.id, order_id=live.id)
    orphan_vo = _addon(db, addon_type="voiceover", program_name="VO Only")

    linked = list_payroll_addons(
        page_size=50,
        page_token=None,
        addon_type=None,
        scope="payroll_linked",
        mtd_ids=None,
        since_days=None,
        db=db,
    )
    ids = {str(a.id) for a in linked.payroll_addons}
    assert str(linked_rush.id) in ids
    assert str(archive_rush.id) not in ids  # paid archive excluded
    assert str(orphan_vo.id) not in ids
    assert all(a.addon_type in ("rush_fee", "misc_adjustment") for a in linked.payroll_addons)

    by_ids = list_payroll_addons(
        page_size=50,
        page_token=None,
        addon_type=None,
        scope=None,
        mtd_ids=str(archive_mtd.id),
        since_days=None,
        db=db,
    )
    assert str(archive_rush.id) in {str(a.id) for a in by_ids.payroll_addons}

    vos = list_payroll_addons(
        page_size=50,
        page_token=None,
        addon_type="voiceover",
        scope=None,
        mtd_ids=None,
        since_days=None,
        db=db,
    )
    vo_ids = {str(a.id) for a in vos.payroll_addons}
    assert str(orphan_vo.id) in vo_ids
    assert str(linked_rush.id) not in vo_ids
