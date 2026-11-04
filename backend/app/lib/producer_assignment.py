"""Resolve producer assignment keys (initials, names, legacy codes) to Producer rows."""

from __future__ import annotations

import time
from dataclasses import dataclass

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


@dataclass(frozen=True)
class _ProducerRosterRow:
    id: str
    initials: str
    name: str
    first_name: str


# Process-local roster snapshot — avoids Producer.all() on every assign PATCH.
# Short TTL keeps memory safe across roster edits without wiring every CRUD path.
_ROSTER_TTL_S = 45.0
_roster_cache: tuple[float, list[_ProducerRosterRow]] | None = None


def invalidate_producer_assignment_roster_cache() -> None:
    global _roster_cache
    _roster_cache = None


def normalize_producer_key(raw: str | None) -> str:
    if not raw:
        return ""
    normalized = raw.strip().upper()
    return LEGACY_PRODUCER_KEYS.get(normalized, normalized)


def is_first_available_request(raw: str | None) -> bool:
    if not raw or not raw.strip():
        return True
    return normalize_producer_key(raw) in FIRST_AVAILABLE_VALUES


def _roster_rows(db: Session) -> list[_ProducerRosterRow]:
    global _roster_cache
    now = time.monotonic()
    if _roster_cache and now - _roster_cache[0] < _ROSTER_TTL_S:
        return _roster_cache[1]
    rows: list[_ProducerRosterRow] = []
    for producer in db.query(Producer).all():
        name = (producer.name or "").strip().upper()
        rows.append(
            _ProducerRosterRow(
                id=str(producer.id),
                initials=(producer.initials or "").strip().upper(),
                name=name,
                first_name=name.split()[0] if name else "",
            )
        )
    _roster_cache = (now, rows)
    return rows


def resolve_producer_by_assignment_key(db: Session, key: str | None) -> Producer | None:
    if not key or not key.strip():
        return None

    normalized = normalize_producer_key(key)

    # Roster match wins over reserved request codes ("FA" = First available).
    # A producer whose initials are FA must still resolve for assignment.
    matched_id: str | None = None
    for row in _roster_rows(db):
        if row.id.upper() == normalized:
            matched_id = row.id
            break
        if row.initials == normalized:
            matched_id = row.id
            break
        if normalize_producer_key(row.initials) == normalized:
            matched_id = row.id
            break
        if row.name == normalized:
            matched_id = row.id
            break
        if row.first_name == normalized:
            matched_id = row.id
            break

    if matched_id:
        return db.get(Producer, matched_id)

    if is_first_available_request(key):
        return None

    return None


def canonical_producer_assignment_key(producer: Producer) -> str:
    initials = (producer.initials or "").strip().upper()
    if initials:
        return initials
    return (producer.name or "").strip().upper()
