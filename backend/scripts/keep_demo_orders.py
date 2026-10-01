#!/usr/bin/env python3
"""Keep only the 5 Greek Demo Coach orders; delete everything else.

Usage (from repo root):
  cd backend && set -a && source ../.env && set +a && \\
    PYTHONPATH=. ./venv/bin/python scripts/keep_demo_orders.py
"""
from __future__ import annotations

import os
import sys

# Prefer direct connection for DDL/bulk deletes (session mode).
os.environ.pop("RUNTIME_DATABASE_URL", None)

from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import engine

KEEP_PROGRAM_FRAGMENTS = (
    "Gamma Prep",
    "Beta Academy",
    "Alpha High",
    "Delta Middle",
    "Epsilon Junior",
)


def main() -> int:
    url = settings.get_database_url()
    print("Connecting:", url.split("@")[-1] if "@" in url else url)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        before = db.execute(text("SELECT count(*) FROM orders")).scalar()
        print(f"orders before: {before}")

        keep_rows = db.execute(
            text(
                """
                SELECT id, contact_name, program_name, package, price
                FROM orders
                WHERE """
                + " OR ".join(
                    f"program_name ILIKE :p{i}" for i in range(len(KEEP_PROGRAM_FRAGMENTS))
                )
            ),
            {f"p{i}": f"%{frag}%" for i, frag in enumerate(KEEP_PROGRAM_FRAGMENTS)},
        ).fetchall()

        print(f"matched keep-set ({len(keep_rows)}):")
        for row in keep_rows:
            print(" ", dict(row._mapping))

        if len(keep_rows) < 1:
            print("ABORT: no demo orders found — refusing to delete.")
            return 1

        keep_ids = [str(r.id) for r in keep_rows]
        # Also match by legacy string ids stored on mtd/addons if any
        placeholders = ", ".join(f":k{i}" for i in range(len(keep_ids)))
        params = {f"k{i}": kid for i, kid in enumerate(keep_ids)}

        # Dependent rows first
        for stmt in (
            f"DELETE FROM payroll_addons WHERE order_id IS NOT NULL AND order_id::text NOT IN ({placeholders})",
            f"DELETE FROM mtd_records WHERE order_id IS NOT NULL AND order_id::text NOT IN ({placeholders})",
            f"DELETE FROM orders WHERE id::text NOT IN ({placeholders})",
        ):
            try:
                res = db.execute(text(stmt), params)
                print(f"  {stmt.split()[2]} deleted≈{res.rowcount}")
            except Exception as exc:
                print(f"  skip/fail {stmt.split()[2]}: {exc}")
                db.rollback()
                return 1

        db.commit()
        after = db.execute(text("SELECT count(*) FROM orders")).scalar()
        mtd = db.execute(text("SELECT count(*) FROM mtd_records")).scalar()
        print(f"orders after: {after}; mtd_records: {mtd}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
