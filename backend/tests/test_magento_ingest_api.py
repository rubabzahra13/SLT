"""Tests for Magento ingest route auth + batch handling (no Live HTTP client)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Generator
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

import app.models  # noqa: F401
from app.models.base import Base
from app.models.order import Order
from app.api.magento_ingest import (
    MAX_INGEST_BATCH_SIZE,
    MagentoIngestRequest,
    ingest_magento_batch,
    require_magento_ingest_secret,
)

CUTOFF = datetime(2026, 11, 3, 5, 0, tzinfo=timezone.utc)
SECRET = "test-magento-ingest-secret-not-real"


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


@pytest.fixture
def db() -> Generator[Session, None, None]:
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


def test_auth_accepts_valid_secret():
    with patch("app.api.magento_ingest.settings.MAGENTO_INGEST_SECRET", SECRET):
        assert require_magento_ingest_secret(x_magento_ingest_secret=SECRET) is None


def test_auth_rejects_missing_secret():
    with patch("app.api.magento_ingest.settings.MAGENTO_INGEST_SECRET", SECRET):
        with pytest.raises(HTTPException) as exc:
            require_magento_ingest_secret(x_magento_ingest_secret=None)
        assert exc.value.status_code == 401


def test_auth_rejects_invalid_secret():
    with patch("app.api.magento_ingest.settings.MAGENTO_INGEST_SECRET", SECRET):
        with pytest.raises(HTTPException) as exc:
            require_magento_ingest_secret(x_magento_ingest_secret="nope")
        assert exc.value.status_code == 401


def test_auth_unavailable_when_secret_not_configured():
    with patch("app.api.magento_ingest.settings.MAGENTO_INGEST_SECRET", ""):
        with pytest.raises(HTTPException) as exc:
            require_magento_ingest_secret(x_magento_ingest_secret="anything")
        assert exc.value.status_code == 503


def test_batch_creates_and_publishes(db: Session):
    payload = MagentoIngestRequest(
        form_id=1,
        results=[
            _form1_result(result_id="api-new-1", created_at="2026-11-03 06:00:00")
        ],
    )
    with patch(
        "app.api.magento_ingest.ensure_import_cutoff", return_value=CUTOFF
    ), patch(
        "app.services.magento_orders.board_event_hub.publish"
    ) as publish:
        response = ingest_magento_batch(payload, db=db, _=None)

    assert response.received == 1
    assert response.created == 1
    assert response.created_result_ids == ["api-new-1"]
    assert response.items[0].status == "created"
    assert db.query(Order).filter(Order.magento_result_id == "api-new-1").count() == 1
    assert publish.call_count == 1
    event = publish.call_args[0][0]
    assert event["type"] == "order.updated"
    assert event["order"]["magento_result_id"] == "api-new-1"


def test_batch_skips_duplicate_cutoff_mismatch_missing_id(db: Session):
    keep = _form1_result(result_id="api-keep-1", created_at="2026-11-03 06:00:00")
    with patch(
        "app.api.magento_ingest.ensure_import_cutoff", return_value=CUTOFF
    ), patch("app.services.magento_orders.board_event_hub.publish"):
        ingest_magento_batch(MagentoIngestRequest(form_id=1, results=[keep]), db=db, _=None)

    batch = MagentoIngestRequest(
        form_id=1,
        results=[
            keep,
            _form1_result(result_id="api-old-1", created_at="2026-11-03 04:00:00"),
            {
                "result_id": "api-mm-1",
                "form_id": 3,
                "created_at": "2026-11-03 07:00:00",
                "fields": [_field("1", "Wrong")],
            },
            {"form_id": 1, "created_at": "2026-11-03 08:00:00", "fields": []},
        ],
    )
    with patch(
        "app.api.magento_ingest.ensure_import_cutoff", return_value=CUTOFF
    ), patch(
        "app.services.magento_orders.board_event_hub.publish"
    ) as publish:
        response = ingest_magento_batch(batch, db=db, _=None)

    assert response.created == 0
    assert response.skipped_duplicate == 1
    assert response.skipped_cutoff == 1
    assert response.skipped_form_mismatch == 1
    assert response.skipped_missing_result_id == 1
    assert publish.call_count == 0


def test_form2_unroutable_skipped(db: Session):
    payload = MagentoIngestRequest(
        form_id=2,
        results=[
            {
                "result_id": "api-f2-bad",
                "form_id": 2,
                "created_at": "2026-11-03 08:00:00",
                "fields": [_field("27", "Central")],
            }
        ],
    )
    with patch(
        "app.api.magento_ingest.ensure_import_cutoff", return_value=CUTOFF
    ), patch(
        "app.services.magento_orders.board_event_hub.publish"
    ) as publish:
        response = ingest_magento_batch(payload, db=db, _=None)

    assert response.skipped_unroutable == 1
    assert response.created == 0
    assert publish.call_count == 0


def test_batch_rejects_oversize(db: Session):
    results = [
        _form1_result(
            result_id=f"api-over-{i}",
            created_at="2026-11-03 06:00:00",
        )
        for i in range(MAX_INGEST_BATCH_SIZE + 1)
    ]
    payload = MagentoIngestRequest(form_id=1, results=results)
    with patch(
        "app.api.magento_ingest.ensure_import_cutoff", return_value=CUTOFF
    ), patch("app.services.magento_orders.board_event_hub.publish"):
        with pytest.raises(HTTPException) as exc:
            ingest_magento_batch(payload, db=db, _=None)
    assert exc.value.status_code == 400
    assert db.query(Order).count() == 0


def test_candidate_result_ids_from_batch_only():
    from app.api.magento_ingest import _candidate_result_ids

    assert _candidate_result_ids(
        [
            {"result_id": "a"},
            "skip",
            {"result_id": "  "},
            {"result_id": "b"},
            {"form_id": 1},
        ]
    ) == ["a", "b"]


def test_batch_known_lookup_scopes_to_request_ids(db: Session):
    """Many existing Magento ids must not block create; batch dup still skips."""
    for i in range(40):
        db.add(
            Order(
                school_gym_name=f"Other {i}",
                form_type="school-all-star-cheer",
                magento_result_id=f"noise-{i}",
            )
        )
    db.add(
        Order(
            school_gym_name="Already In",
            form_type="school-all-star-cheer",
            magento_result_id="api-scoped-dup",
        )
    )
    db.commit()

    payload = MagentoIngestRequest(
        form_id=1,
        results=[
            _form1_result(
                result_id="api-scoped-1", created_at="2026-11-03 06:00:00"
            ),
            _form1_result(
                result_id="api-scoped-dup", created_at="2026-11-03 06:30:00"
            ),
        ],
    )
    with patch(
        "app.api.magento_ingest.ensure_import_cutoff", return_value=CUTOFF
    ), patch("app.services.magento_orders.board_event_hub.publish"):
        response = ingest_magento_batch(payload, db=db, _=None)

    assert response.created == 1
    assert response.skipped_duplicate == 1
    assert response.created_result_ids == ["api-scoped-1"]
    assert db.query(Order).count() == 42


def test_mixed_batch_and_idempotent_retry(db: Session):
    results = [
        _form1_result(result_id="api-mix-old", created_at="2026-11-03 04:00:00"),
        _form1_result(
            result_id="api-mix-a", created_at="2026-11-03 06:00:00", gym="Alpha"
        ),
        _form1_result(
            result_id="api-mix-b", created_at="2026-11-03 07:00:00", gym="Beta"
        ),
    ]
    payload = MagentoIngestRequest(form_id=1, results=results)
    with patch(
        "app.api.magento_ingest.ensure_import_cutoff", return_value=CUTOFF
    ), patch(
        "app.services.magento_orders.board_event_hub.publish"
    ) as publish:
        first = ingest_magento_batch(payload, db=db, _=None)
        assert first.created == 2
        assert first.skipped_cutoff == 1
        assert set(first.created_result_ids) == {"api-mix-a", "api-mix-b"}
        assert publish.call_count == 2

        retry = ingest_magento_batch(payload, db=db, _=None)
        assert retry.created == 0
        assert retry.skipped_duplicate == 2
        assert retry.skipped_cutoff == 1
        assert publish.call_count == 2

    assert (
        db.query(Order)
        .filter(Order.magento_result_id.in_(["api-mix-a", "api-mix-b"]))
        .count()
        == 2
    )
