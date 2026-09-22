"""Backfill MTDRecord.order_id for rows that were never linked to their Order.

Many MTD records have a NULL order_id, so the same booking shows up twice on the
Orders tab (once as the unlinked MTD row, once as a synthetic row generated from
the Order) and "Move to Orders / MTD" can't keep Order.status in sync.

This script matches each unlinked MTD record to a single unused Order by
normalized (program_name, package), using contact_name as a tie-breaker, and
only links when the match is unambiguous (1:1). Ambiguous or unmatched rows are
reported and left untouched.

Usage:
    python -m scripts.backfill_mtd_order_id            # dry-run (no writes)
    python -m scripts.backfill_mtd_order_id --write     # apply the links
"""
import sys
import re
from collections import defaultdict

from app.core.database import SessionLocal
from app.models.order import Order
from app.models.mtd_record import MTDRecord


def norm(value) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().upper())


def main(write: bool) -> None:
    db = SessionLocal()
    try:
        orders = db.query(Order).all()
        mtd = db.query(MTDRecord).all()

        already_linked = {m.order_id for m in mtd if m.order_id is not None}

        # Orders still available to be linked, grouped by (program, package).
        available = defaultdict(list)
        for o in orders:
            if o.id in already_linked:
                continue
            available[(norm(o.program_name), norm(o.package))].append(o)

        unlinked = [m for m in mtd if m.order_id is None]

        linked, ambiguous, unmatched = [], [], []
        used = set()

        for m in unlinked:
            key = (norm(m.program_name), norm(m.package))
            candidates = [o for o in available.get(key, []) if o.id not in used]

            if not candidates:
                unmatched.append(m)
                continue

            chosen = None
            if len(candidates) == 1:
                chosen = candidates[0]
            else:
                # Narrow by contact_name; only accept if that is unique.
                by_contact = [
                    o
                    for o in candidates
                    if norm(o.contact_name) == norm(m.contact_name)
                    or norm(o.customer_name) == norm(m.contact_name)
                ]
                if len(by_contact) == 1:
                    chosen = by_contact[0]

            if chosen is None:
                ambiguous.append((m, candidates))
                continue

            used.add(chosen.id)
            linked.append((m, chosen))

        print(f"MTD records total:            {len(mtd)}")
        print(f"  already linked:             {len(mtd) - len(unlinked)}")
        print(f"  unlinked (null order_id):   {len(unlinked)}")
        print(f"  -> matched 1:1 (will link): {len(linked)}")
        print(f"  -> ambiguous (skipped):     {len(ambiguous)}")
        print(f"  -> no order match (skipped):{len(unmatched)}")
        print()
        print("Sample of proposed links:")
        for m, o in linked[:15]:
            print(f"  MTD {m.id} '{m.program_name}' [{m.package}] -> Order {o.id}")
        if ambiguous:
            print("\nAmbiguous (multiple candidate orders, left untouched):")
            for m, cands in ambiguous[:10]:
                print(f"  MTD {m.id} '{m.program_name}' [{m.package}] -> {len(cands)} candidates")

        if not write:
            print("\nDRY RUN — no changes written. Re-run with --write to apply.")
            return

        for m, o in linked:
            m.order_id = o.id
        db.commit()
        print(f"\nWROTE {len(linked)} order_id links.")
    finally:
        db.close()


if __name__ == "__main__":
    main(write="--write" in sys.argv)
