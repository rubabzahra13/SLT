"""Parse ISO created_at window params for board / list queries."""
from __future__ import annotations

from datetime import datetime, timezone


def parse_iso_datetime(value: str | None) -> datetime | None:
    if not value or not str(value).strip():
        return None
    raw = str(value).strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(raw)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def apply_created_at_bounds(query, column, created_after: str | None, created_before: str | None):
    """Filter ``column`` to an inclusive [after, before] window when provided."""
    after = parse_iso_datetime(created_after)
    before = parse_iso_datetime(created_before)
    if after is not None:
        query = query.filter(column >= after)
    if before is not None:
        query = query.filter(column <= before)
    return query
