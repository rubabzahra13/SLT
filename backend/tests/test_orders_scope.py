"""Orders list scope + bootstrap active filter exclude completed/past history."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.orders import _apply_created_since_days, _apply_orders_scope
from app.models.base import Base
from app.models.order import Order
import app.models  # noqa: F401 — register tables


@pytest.fixture()
def db() -> Session:
    """Minimal in-memory DB — no pricing seed required for scope filters."""
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


def _make_order(
    db: Session,
    *,
    status: str,
    is_past_order: bool = False,
    customer_name: str = "Test",
    created_at: datetime | None = None,
) -> Order:
    order = Order(
        id=uuid.uuid4(),
        customer_name=customer_name,
        status=status,
        is_past_order=is_past_order,
        form_type="school-all-star-cheer",
        created_at=created_at or datetime.now(timezone.utc),
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def test_orders_scope_active_excludes_completed_and_past(db: Session):
    active = _make_order(db, status="new", customer_name="Active")
    completed = _make_order(db, status="completed", customer_name="Done")
    past_flag = _make_order(
        db, status="active", is_past_order=True, customer_name="PastFlag"
    )

    rows = _apply_orders_scope(db.query(Order), "active").all()
    ids = {str(r.id) for r in rows}
    assert str(active.id) in ids
    assert str(completed.id) not in ids
    assert str(past_flag.id) not in ids


def test_orders_scope_past_includes_completed_and_past_flag(db: Session):
    _make_order(db, status="new", customer_name="Active")
    completed = _make_order(db, status="completed", customer_name="Done")
    past_flag = _make_order(
        db, status="active", is_past_order=True, customer_name="PastFlag"
    )

    rows = _apply_orders_scope(db.query(Order), "past").all()
    ids = {str(r.id) for r in rows}
    assert str(completed.id) in ids
    assert str(past_flag.id) in ids
    assert all(r.status == "completed" or bool(r.is_past_order) for r in rows)


def test_scope_active_includes_in_mtd_excludes_completed(db: Session):
    active = _make_order(db, status="in_mtd", customer_name="Board")
    _make_order(db, status="completed", customer_name="History")

    rows = _apply_orders_scope(db.query(Order), "active").all()
    ids = {str(r.id) for r in rows}
    assert str(active.id) in ids
    assert all((not r.is_past_order) and r.status != "completed" for r in rows)


def test_bootstrap_returns_empty_orders_and_mtd(db: Session, monkeypatch):
    """Bootstrap must stay constant-size as boards grow."""
    from app.api import bootstrap as bootstrap_mod

    monkeypatch.setattr(
        bootstrap_mod, "_ensure_default_holidays", lambda _db: []
    )
    monkeypatch.setattr(
        bootstrap_mod, "_ensure_default_reasons", lambda _db: []
    )
    monkeypatch.setattr(
        bootstrap_mod, "ensure_default_secret_menu", lambda _db: None
    )
    monkeypatch.setattr(
        bootstrap_mod, "secret_menu_to_schema", lambda _m: {}
    )
    _make_order(db, status="new", customer_name="Live")
    payload = bootstrap_mod.bootstrap(db=db)
    assert payload["orders"] == []
    assert payload["mtd"] == []
    assert payload["payroll_addons"] == []


def test_since_days_limits_past_orders_to_chart_window(db: Session):
    recent = _make_order(
        db,
        status="completed",
        customer_name="Recent",
        created_at=datetime.now(timezone.utc) - timedelta(days=3),
    )
    old = _make_order(
        db,
        status="completed",
        customer_name="Old",
        created_at=datetime.now(timezone.utc) - timedelta(days=40),
    )

    query = _apply_orders_scope(db.query(Order), "past")
    rows = _apply_created_since_days(query, 14).all()
    ids = {str(r.id) for r in rows}
    assert str(recent.id) in ids
    assert str(old.id) not in ids
