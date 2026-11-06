from datetime import datetime, timezone

from app.lib.created_at_bounds import parse_iso_datetime


def test_parse_iso_datetime_accepts_z_and_offset():
    z = parse_iso_datetime("2026-05-06T00:00:00.000Z")
    assert z is not None
    assert z.tzinfo is not None
    assert z.year == 2026 and z.month == 5 and z.day == 6

    offset = parse_iso_datetime("2026-11-06T23:59:59.999+05:00")
    assert offset is not None
    assert offset.utcoffset() is not None


def test_parse_iso_datetime_rejects_garbage():
    assert parse_iso_datetime(None) is None
    assert parse_iso_datetime("") is None
    assert parse_iso_datetime("not-a-date") is None


def test_parse_iso_datetime_naive_becomes_utc():
    dt = parse_iso_datetime("2026-05-06T12:00:00")
    assert dt is not None
    assert dt.tzinfo == timezone.utc
