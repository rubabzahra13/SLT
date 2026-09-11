"""Resolve producer assignment keys (initials, names, legacy codes) to Producer rows."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.producer import Producer

LEGACY_PRODUCER_KEYS: dict[str, str] = {
    "MATT": "MS",
    "NATE": "NC",
    "JUSTIN": "JD",
    "JUST": "JD",
    "MARK": "MM",
    "GRIFFIN": "GP",
    "GRIF": "GP",
    "G": "GP",
    "GP": "GP",
    "JOSH": "JM",
    "JOEL": "JOP",
    "BRENT": "BV",
    "BREN": "BV",
    "RILEY": "R",
    "RILE": "R",
    "STEVE": "SS",
    "STEV": "SS",
    "CASEY": "CM",
    "CM": "CM",
    "ANNE": "AJ",
    "LAUREN": "LV",
    "RORY": "RF",
    "JOHN": "JP",
    "MAX": "MT",
    "CHRIS": "CC",
    "JOE": "JB",
}

FIRST_AVAILABLE_VALUES = frozenset(
    {
        "",
        "FA",
        "NA",
        "-",
        "FIRST AVAILABLE",
        "FIRSTAVAILABLE",
        "EDITORS CHOICE",
        "EDITOR'S CHOICE",
        "EDITORS CHOICE",
    }
)


def normalize_producer_key(raw: str | None) -> str:
    if not raw:
        return ""
    normalized = raw.strip().upper()
    return LEGACY_PRODUCER_KEYS.get(normalized, normalized)


def is_first_available_request(raw: str | None) -> bool:
    if not raw or not raw.strip():
        return True
    return normalize_producer_key(raw) in FIRST_AVAILABLE_VALUES


def resolve_producer_by_assignment_key(db: Session, key: str | None) -> Producer | None:
    if not key or not key.strip() or is_first_available_request(key):
        return None

    normalized = normalize_producer_key(key)
    producers = db.query(Producer).all()

    for producer in producers:
        initials = (producer.initials or "").strip().upper()
        name = (producer.name or "").strip().upper()
        first_name = name.split()[0] if name else ""
        legacy_id = (producer.legacy_id or "").strip().upper()
        producer_id = str(producer.id).upper()

        if producer_id == normalized:
            return producer
        if initials == normalized:
            return producer
        if normalize_producer_key(initials) == normalized:
            return producer
        if name == normalized:
            return producer
        if first_name == normalized:
            return producer
        if legacy_id and legacy_id == normalized:
            return producer

    return None


def canonical_producer_assignment_key(producer: Producer) -> str:
    initials = (producer.initials or "").strip().upper()
    if initials:
        return initials
    return (producer.name or "").strip().upper()
