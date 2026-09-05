"""
conftest.py — Pytest fixtures for pricing engine unit tests.
Uses SQLite in-memory database; no Supabase connection required.
Seeds pricing rules + producers directly using service functions.
"""
import os
import json
import uuid
from decimal import Decimal
from typing import Generator

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.models.base import Base
from app.models.pricing_rule import PricingRule
from app.models.addon_rule import AddonRule
from app.models.compliant_affiliate import CompliantAffiliate
from app.models.producer import Producer

# Import all models so their tables are created
import app.models  # noqa


PRICING_RULES_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../pricing-rules.json")
)


@pytest.fixture(scope="session")
def engine():
    """In-memory SQLite engine for the test session."""
    eng = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(eng)
    return eng


@pytest.fixture(scope="session")
def seeded_session(engine) -> Generator[Session, None, None]:
    """
    Single session for the entire test session.
    Seeds pricing rules, affiliates, add-ons, and key producers.
    SQLite doesn't support server-side UUIDs, so we generate them explicitly.
    """
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()

    _seed_pricing(session)
    _seed_producers(session)
    session.commit()

    yield session
    session.close()


@pytest.fixture
def db(seeded_session) -> Session:
    """Per-test session — uses savepoints for rollback isolation."""
    seeded_session.begin_nested()
    yield seeded_session
    seeded_session.rollback()


# ---------------------------------------------------------------------------
# Seeding helpers
# ---------------------------------------------------------------------------

def _seed_pricing(session: Session) -> None:
    """Seed pricing rules, addon_rules, and compliant_affiliates from pricing-rules.json."""
    from app.seed.seed_pricing import seed_pricing as _real_seed

    # The real seeder does DB queries that work fine with SQLite
    _real_seed(session)


def _seed_producers(session: Session) -> None:
    """Seed a minimal set of producers needed for compensation tests."""
    producers = [
        {
            "initials": "CM",
            "name": "Casey",
            "email": "casey@soundslikethat.com",
            "specialty": "Cheer",
            "compensation_model": "percentage_of_payroll_base",
            "default_rate": None,
            "rates_by_category": None,
            "rate_overrides": {
                "old_pricing": 0.72,
                "new_pricing": 0.70,
                "dance_voiceover": 0.80,
                "cheer_voiceover": 1.0,
            },
            "manual_input_fields": [
                {"label": "100% Manual Field 1 (rush)", "rate_or_null": 1.0},
                {"label": "Cheer Song Reimbursement", "rate_or_null": None},
            ],
            "notes": "No trigger for old vs new pricing.",
        },
        {
            "initials": "MM",
            "name": "Mark",
            "email": "mark@soundslikethat.com",
            "specialty": "Dance",
            "compensation_model": "percentage_of_payroll_base",
            "default_rate": None,
            "rates_by_category": {
                "jazz-kick": 0.72,
                "pom": 0.72,
                "hip-hop": 0.72,
                "team-performance-variety": 0.72,
                "all-star-cheer": 0.60,
                "school-cheer": 0.60,
                "youth-rec-cheer": 0.60,
            },
            "rate_overrides": None,
            "manual_input_fields": None,
            "notes": "72% dance; 60% cheer.",
        },
        {
            "initials": "R",
            "name": "Riley",
            "email": "riley@soundslikethat.com",
            "specialty": "Cheer",
            "compensation_model": None,  # intentionally no rule
            "default_rate": None,
            "rates_by_category": None,
            "rate_overrides": None,
            "manual_input_fields": None,
            "notes": "No compensation rule on file.",
        },
        {
            "initials": "G",
            "name": "Griffin",
            "email": "griffin@soundslikethat.com",
            "specialty": "Cheer",
            "compensation_model": "hourly_manual",
            "default_rate": None,
            "rates_by_category": None,
            "rate_overrides": None,
            "manual_input_fields": None,
            "notes": "Hourly.",
        },
        {
            "initials": "SS",
            "name": "Steve",
            "email": "steve@soundslikethat.com",
            "specialty": "Hip-Hop",
            "compensation_model": "not_paid_for_mixing",
            "default_rate": None,
            "rates_by_category": None,
            "rate_overrides": None,
            "manual_input_fields": None,
            "notes": "Not paid for mixing.",
        },
        {
            "initials": "MS",
            "name": "Matt",
            "email": "matt@soundslikethat.com",
            "specialty": "Cheer",
            "compensation_model": "percentage_of_payroll_base",
            "default_rate": 0.60,
            "rates_by_category": None,
            "rate_overrides": None,
            "manual_input_fields": None,
            "notes": None,
        },
    ]

    for p in producers:
        existing = session.query(Producer).filter(Producer.initials == p["initials"]).first()
        if not existing:
            session.add(Producer(
                id=uuid.uuid4(),
                legacy_id=f"prod-test-{p['initials'].lower()}",
                name=p["name"],
                initials=p["initials"],
                email=p["email"],
                specialty=p["specialty"],
                status="available",
                work_days=["mon", "tue", "wed", "thu", "fri"],
                overtime_days=[],
                compensation_model=p["compensation_model"],
                default_rate=Decimal(str(p["default_rate"])) if p["default_rate"] is not None else None,
                rates_by_category=p["rates_by_category"],
                rate_overrides=p["rate_overrides"],
                manual_input_fields=p["manual_input_fields"],
                notes=p["notes"],
            ))
