#!/usr/bin/env python3
"""One-off backfill of Magento history for forms that were never bulk-imported.

Forms 1 and 2 were backfilled earlier. Forms 3–11 only received post-cutoff
poll inserts. This script maps stored WebForms results (local data folder,
optionally refreshed from Magento) through the same ``order_values_from_result``
path the poller uses, then inserts any missing ``magento_result_id`` rows.

The forward-only poll cursor is left alone. Board SSE is not published.

Usage (from backend/):
  ./venv/bin/python -m scripts.backfill_magento_legacy_forms --dry-run
  ./venv/bin/python -m scripts.backfill_magento_legacy_forms
  ./venv/bin/python -m scripts.backfill_magento_legacy_forms --forms 3,4 --live
"""

from __future__ import annotations

import argparse
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.order import Order
from app.services.magento_orders import (
    extract_results,
    fetch_form_results,
    order_values_from_result,
)

# Leftover CRM-mapped forms (skip 1/2 already backfilled; 12/13 not in CRM; 14 empty).
DEFAULT_FORMS = (3, 4, 5, 6, 7, 8, 9, 10, 11)
DEFAULT_DATA_DIR = Path(
    "/home/hp/Desktop/VECTOR/SLT-API-SCRIPTS/data"
)
CHUNK = 100

BOOL_DEFAULTS = {
    "is_reassigned": False,
    "needs_attention": False,
    "is_past_order": False,
    "suppress_manual_form_merge": False,
    "final_customer_price_overridden": False,
    "is_manual_entry": False,
}


def load_local_results(data_dir: Path, form_id: int) -> list[dict[str, Any]]:
    path = data_dir / f"form_{form_id}_results.json"
    if not path.exists():
        raise FileNotFoundError(f"missing local results file: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    return extract_results(payload)


def merge_by_result_id(
    *batches: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    by_id: dict[str, dict[str, Any]] = {}
    for batch in batches:
        for result in batch:
            result_id = str(result.get("result_id") or "").strip()
            if not result_id:
                continue
            by_id[result_id] = result
    return list(by_id.values())


def known_result_ids(db: Session) -> set[str]:
    return {
        row[0]
        for row in db.query(Order.magento_result_id)
        .filter(Order.magento_result_id.isnot(None))
        .all()
        if row[0]
    }


def row_from_values(values: dict[str, Any]) -> dict[str, Any]:
    """bulk_insert_mappings does not apply SQLAlchemy Column defaults."""
    row = dict(values)
    row["id"] = uuid.uuid4()
    for key, default in BOOL_DEFAULTS.items():
        row.setdefault(key, default)
    created = row.get("created_at")
    if created is None:
        created = datetime.now(timezone.utc)
        row["created_at"] = created
    row.setdefault("updated_at", created)
    row.setdefault("status", "new")
    row.setdefault("price", 0)
    row.setdefault("is_manual_entry", False)
    return row


def backfill_form(
    db: Session,
    form_id: int,
    results: list[dict[str, Any]],
    known: set[str],
    *,
    dry_run: bool,
) -> dict[str, int]:
    stats = {
        "submissions": len(results),
        "already_known": 0,
        "unroutable": 0,
        "mapped": 0,
        "inserted": 0,
    }
    pending: list[dict[str, Any]] = []
    for result in results:
        result_id = str(result.get("result_id") or "").strip()
        if not result_id:
            stats["unroutable"] += 1
            continue
        if result_id in known:
            stats["already_known"] += 1
            continue
        values = order_values_from_result(result, form_id)
        if not values or not values.get("magento_result_id"):
            stats["unroutable"] += 1
            continue
        stats["mapped"] += 1
        pending.append(row_from_values(values))
        known.add(result_id)

    if dry_run:
        stats["inserted"] = 0
        print(
            f"  form {form_id}: dry-run would insert {len(pending)} "
            f"(known={stats['already_known']}, unroutable={stats['unroutable']})"
        )
        return stats

    for start in range(0, len(pending), CHUNK):
        chunk = pending[start : start + CHUNK]
        db.bulk_insert_mappings(Order, chunk)
        db.commit()
        stats["inserted"] += len(chunk)
        print(
            f"  form {form_id}: inserted {stats['inserted']}/{len(pending)}"
        )
    if not pending:
        print(
            f"  form {form_id}: nothing to insert "
            f"(known={stats['already_known']}, unroutable={stats['unroutable']})"
        )
    return stats


def parse_forms(raw: str | None) -> list[int]:
    if not raw or not raw.strip():
        return list(DEFAULT_FORMS)
    out: list[int] = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        form_id = int(part)
        if form_id not in DEFAULT_FORMS:
            raise SystemExit(
                f"form {form_id} is not in the leftover backfill set {DEFAULT_FORMS}"
            )
        out.append(form_id)
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--forms",
        default=",".join(str(f) for f in DEFAULT_FORMS),
        help="Comma-separated Magento form ids (default: leftover set 3–11)",
    )
    parser.add_argument(
        "--data-dir",
        default=str(DEFAULT_DATA_DIR),
        help="Directory with form_<id>_results.json files",
    )
    parser.add_argument(
        "--live",
        action="store_true",
        help="Also GET Magento results and merge with local files by result_id",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Map and count only; do not write to the database",
    )
    args = parser.parse_args()
    forms = parse_forms(args.forms)
    data_dir = Path(args.data_dir)
    if not data_dir.is_dir():
        print(f"ERROR: data dir not found: {data_dir}", file=sys.stderr)
        return 1

    db = SessionLocal()
    totals = {
        "submissions": 0,
        "already_known": 0,
        "unroutable": 0,
        "mapped": 0,
        "inserted": 0,
    }
    try:
        known = known_result_ids(db)
        print(
            f"Backfill start forms={forms} dry_run={args.dry_run} "
            f"live={args.live} known_result_ids={len(known)}"
        )
        for form_id in forms:
            local = load_local_results(data_dir, form_id)
            live: list[dict[str, Any]] = []
            if args.live:
                try:
                    live = fetch_form_results(form_id)
                    print(
                        f"  form {form_id}: local={len(local)} live={len(live)}"
                    )
                except Exception as exc:
                    print(
                        f"  form {form_id}: live fetch failed ({exc}); "
                        f"using local only ({len(local)})"
                    )
            else:
                print(f"  form {form_id}: local={len(local)}")
            results = merge_by_result_id(local, live)
            stats = backfill_form(
                db, form_id, results, known, dry_run=args.dry_run
            )
            for key in totals:
                totals[key] += stats[key]
        print(
            "Backfill done: "
            f"submissions={totals['submissions']} "
            f"already_known={totals['already_known']} "
            f"unroutable={totals['unroutable']} "
            f"mapped={totals['mapped']} "
            f"inserted={totals['inserted']}"
        )
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
