"""Per-result Magento ingest helper: cutoff, duplicates, routing, mapping."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Generator

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

import app.models  # noqa: F401 — register Order metadata
from app.models.base import Base
from app.models.order import Order
from app.services.magento_orders import (
    ingest_magento_result,
    order_values_from_result,
    upsert_form_results,
)


@pytest.fixture
def db() -> Generator[Session, None, None]:
    """Isolated in-memory orders table (no pricing seed / network required)."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine, tables=[Order.__table__])
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def _field(field_id: str, value: str) -> dict:
    return {"field_id": field_id, "code": "ignored", "value": value}


def _form1_result(
    *,
    result_id: str,
    created_at: str,
    gym: str = "North Gym",
) -> dict:
    return {
        "result_id": result_id,
        "form_id": 1,
        "created_at": created_at,
        "fields": [
            _field("1", gym),
            _field("2", "100 Main"),
            _field("13", "Coach Kim"),
            _field("19", "Gold Package"),
            _field("20", "1:30"),
        ],
    }


CUTOFF = datetime(2026, 11, 3, 5, 0, tzinfo=timezone.utc)


def test_ingest_creates_submission_newer_than_cutoff(db):
    result = _form1_result(result_id="ingest-new-1", created_at="2026-11-03 05:00:01")
    outcome = ingest_magento_result(
        db,
        1,
        result,
        cutoff=CUTOFF,
        known_result_ids=set(),
    )
    assert outcome.status == "created"
    assert outcome.result_id == "ingest-new-1"
    assert outcome.order is not None
    assert outcome.order["magento_result_id"] == "ingest-new-1"
    assert outcome.order["form_type"] == "school-all-star-cheer"
    assert outcome.order["cheer_form_subtype"] == "all-star-cheer"
    assert outcome.order["school_gym_name"] == "North Gym"
    assert outcome.order["package_type"] == "Gold Package"
    assert outcome.order["status"] == "new"
    assert outcome.order["is_manual_entry"] is False

    stored = (
        db.query(Order)
        .filter(Order.magento_result_id == "ingest-new-1")
        .one()
    )
    assert stored.school_gym_name == "North Gym"


def test_ingest_skips_submission_at_or_before_cutoff(db):
    older = _form1_result(result_id="ingest-old-1", created_at="2026-11-03 04:59:59")
    same = _form1_result(result_id="ingest-same-1", created_at="2026-11-03 05:00:00")

    older_out = ingest_magento_result(
        db, 1, older, cutoff=CUTOFF, known_result_ids=set()
    )
    same_out = ingest_magento_result(
        db, 1, same, cutoff=CUTOFF, known_result_ids=set()
    )

    assert older_out.status == "skipped_cutoff"
    assert same_out.status == "skipped_cutoff"
    assert (
        db.query(Order)
        .filter(Order.magento_result_id.in_(["ingest-old-1", "ingest-same-1"]))
        .count()
        == 0
    )


def test_ingest_skips_already_imported_result_id(db):
    result = _form1_result(result_id="ingest-dup-1", created_at="2026-11-03 06:00:00")
    first = ingest_magento_result(
        db, 1, result, cutoff=CUTOFF, known_result_ids=set()
    )
    assert first.status == "created"

    known = {"ingest-dup-1"}
    second = ingest_magento_result(
        db, 1, result, cutoff=CUTOFF, known_result_ids=known
    )
    assert second.status == "skipped_duplicate"

    third = ingest_magento_result(db, 1, result, cutoff=CUTOFF)
    assert third.status == "skipped_duplicate"
    assert (
        db.query(Order).filter(Order.magento_result_id == "ingest-dup-1").count()
        == 1
    )


def test_ingest_skips_unroutable_form2_without_page_url(db):
    result = {
        "result_id": "ingest-f2-bad",
        "form_id": 2,
        "created_at": "2026-11-03 06:00:00",
        "fields": [_field("27", "Central High")],
    }
    outcome = ingest_magento_result(
        db, 2, result, cutoff=CUTOFF, known_result_ids=set()
    )
    assert outcome.status == "skipped_unroutable"
    assert (
        db.query(Order)
        .filter(Order.magento_result_id == "ingest-f2-bad")
        .count()
        == 0
    )


def test_ingest_preserves_form1_field_mapping():
    result = _form1_result(result_id="map-check", created_at="2026-11-03 06:00:00")
    values = order_values_from_result(result, 1)
    assert values is not None
    assert values["school_gym_name"] == "North Gym"
    assert values["school_gym_billing_address"] == "100 Main"
    assert values["coach_name"] == "Coach Kim"
    assert values["package_type"] == "Gold Package"
    assert values["package"] == "Gold Package"
    assert values["time_length_of_mix"] == "1:30"
    assert values["magento_form_id"] == "1"


def test_upsert_form_results_uses_ingest_helper(db):
    results = [
        _form1_result(result_id="batch-old", created_at="2026-11-03 04:00:00"),
        _form1_result(result_id="batch-new-a", created_at="2026-11-03 06:00:00", gym="Alpha"),
        _form1_result(result_id="batch-new-b", created_at="2026-11-03 07:00:00", gym="Beta"),
        {
            "result_id": "batch-mismatch",
            "form_id": 3,
            "created_at": "2026-11-03 08:00:00",
            "fields": [_field("1", "Wrong Form")],
        },
    ]
    created, before_cutoff = upsert_form_results(db, 1, results, CUTOFF)
    assert before_cutoff == 1
    assert len(created) == 2
    ids = {row["magento_result_id"] for row in created}
    assert ids == {"batch-new-a", "batch-new-b"}
    assert (
        db.query(Order)
        .filter(Order.magento_result_id == "batch-mismatch")
        .count()
        == 0
    )
