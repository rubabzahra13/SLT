"""Seed producers from LEGACY_producers_rows.csv into the producers table.

Emails are forced to non-deliverable @invalid.example addresses so Gmail/send
flows can never reach a real inbox. Categories + rates_by_category (and
voiceover/rush rates) are preserved from the CSV.

Idempotent: skips rows whose initials already exist.
"""

from __future__ import annotations

import csv
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.producer import Producer

CSV_PATH = Path(__file__).resolve().parent / "data" / "LEGACY_producers_rows.csv"

CATEGORY_SLUG_TO_LABEL = {
    "all-star-cheer": "All-Star Cheer",
    "school-cheer": "School Cheer",
    "youth-rec-cheer": "Youth Rec Cheer",
    "pom": "Pom",
    "hip-hop": "Hip Hop",
    "team-performance-variety": "Team Performance / Variety",
    "gameday": "Gameday",
    "jazz-kick": "Jazz / Kick",
    "jazz / kick": "Jazz / Kick",
    "marching-band": "Marching Band",
    "sports-entertainment": "Sports Entertainment",
    "school-anthem": "School Anthem",
    "cheer": "All-Star Cheer",
}


def _parse_json_field(raw: str | None) -> Any:
    text = (raw or "").strip()
    if not text or text.lower() == "null":
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # CSV may use doubled quotes already unescaped by csv module.
        return None


def _normalize_rate(val: Any) -> float | None:
    if val is None or val == "":
        return None
    try:
        number = float(val)
    except (TypeError, ValueError):
        return None
    if number > 1:
        number = number / 100.0
    return round(number, 4)


def _canonicalize_category(raw: str) -> str | None:
    text = (raw or "").strip()
    if not text:
        return None
    mapped = CATEGORY_SLUG_TO_LABEL.get(text.lower())
    return mapped or text


def _normalize_categories(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    seen: set[str] = set()
    for item in raw:
        if not isinstance(item, str):
            continue
        cat = _canonicalize_category(item)
        if not cat or cat in seen:
            continue
        out.append(cat)
        seen.add(cat)
    return out


def _normalize_rates(raw: Any, categories: list[str], default_rate: Any) -> dict[str, float] | None:
    rates: dict[str, float] = {}
    if isinstance(raw, dict):
        for key, value in raw.items():
            if not isinstance(key, str):
                continue
            cat = _canonicalize_category(key)
            rate = _normalize_rate(value)
            if cat and rate is not None:
                rates[cat] = rate

    default = _normalize_rate(default_rate)
    if default is not None:
        for cat in categories:
            rates.setdefault(cat, default)

    return rates or None


def _safe_email(name: str, initials: str) -> str:
    """Non-routable mailbox — .invalid never resolves (RFC 2606)."""
    slug = re.sub(r"[^a-z0-9]+", "-", f"{initials}-{name}".lower()).strip("-")
    slug = slug[:48] or "producer"
    return f"noreply+{slug}@invalid.example"


def _parse_work_days(raw: Any) -> list[str]:
    if isinstance(raw, list) and raw:
        return [str(d).lower() for d in raw]
    return ["mon", "tue", "wed", "thu", "fri"]


def _parse_extra_days(raw: Any) -> list[str]:
    if isinstance(raw, list):
        return [str(d) for d in raw if str(d).strip()]
    return []


def _int_or_none(raw: str | None) -> int | None:
    text = (raw or "").strip()
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def load_rows() -> list[dict[str, str]]:
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"Missing CSV: {CSV_PATH}")
    with CSV_PATH.open(newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def seed(*, dry_run: bool = False) -> None:
    rows = load_rows()
    db = SessionLocal()
    created = 0
    skipped = 0
    try:
        existing = {
            (p.initials or "").strip().upper(): p
            for p in db.query(Producer).all()
        }
        seen_in_batch: set[str] = set()

        for row in rows:
            name = (row.get("name") or "").strip()
            initials = (row.get("initials") or "").strip().upper()
            # Updated CSV has many blank spacer rows — skip quietly.
            if not name and not initials:
                continue
            if not name or not initials:
                skipped += 1
                print(f"skip incomplete row: name={name!r} initials={initials!r}")
                continue

            if initials in existing or initials in seen_in_batch:
                skipped += 1
                print(f"skip existing initials {initials} ({name})")
                continue

            categories = _normalize_categories(_parse_json_field(row.get("categories")))
            # If categories blank, try specialty when it is a known producer category.
            if not categories:
                specialty_cat = _canonicalize_category(row.get("specialty") or "")
                if specialty_cat and specialty_cat in {
                    "All-Star Cheer",
                    "School Cheer",
                    "Youth Rec Cheer",
                    "Pom",
                    "Hip Hop",
                    "Team Performance / Variety",
                    "Gameday",
                    "Jazz / Kick",
                    "Marching Band",
                    "Sports Entertainment",
                    "School Anthem",
                }:
                    categories = [specialty_cat]
            rates = _normalize_rates(
                _parse_json_field(row.get("rates_by_category")),
                categories,
                row.get("default_rate"),
            )
            work_days = _parse_work_days(_parse_json_field(row.get("work_days")))
            extra_days = _parse_extra_days(_parse_json_field(row.get("overtime_days")))
            email = _safe_email(name, initials)
            compensation_model = (row.get("compensation_model") or "").strip() or None

            payload = {
                "name": name,
                "initials": initials,
                "email": email,
                "categories": categories or None,
                "avatar": (row.get("avatar") or "").strip() or None,
                "mixes_this_week": _int_or_none(row.get("mixes_this_week")) or 0,
                "work_days": work_days,
                "max_mixes_per_day": _int_or_none(row.get("max_mixes_per_day")),
                "max_producer_cost_per_day": _int_or_none(
                    row.get("max_producer_cost_per_day")
                ),
                "extra_days": extra_days,
                "compensation_model": compensation_model,
                "rates_by_category": rates,
                "dance_voiceover_rate": _normalize_rate(row.get("dance_voiceover_rate")),
                "cheer_voiceover_rate": _normalize_rate(row.get("cheer_voiceover_rate")),
                "rush_fee_rate": _normalize_rate(row.get("rush_fee_rate")),
            }

            print(
                f"{'would create' if dry_run else 'create'} {initials} {name} "
                f"<{email}> cats={categories} rates={rates}"
            )
            if dry_run:
                created += 1
                seen_in_batch.add(initials)
                continue

            producer = Producer(**payload)
            db.add(producer)
            seen_in_batch.add(initials)
            created += 1

        if not dry_run:
            db.commit()
        print(f"done: created={created} skipped={skipped} dry_run={dry_run}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    seed(dry_run=dry)
