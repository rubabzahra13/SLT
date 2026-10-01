#!/usr/bin/env python3
"""Keep only the 5 Greek Demo Coach orders; delete everything else.

Usage (from repo root, via Terminal — agent DNS often cannot reach Supabase):
  bash backend/run-cleanup.command
"""
from __future__ import annotations

import os
import sys
from urllib.parse import urlparse

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Prefer direct/session connection for bulk deletes (not the transaction pooler).
os.environ.pop("RUNTIME_DATABASE_URL", None)


def _direct_url() -> str:
    url = (
        os.environ.get("SUPABASE_DIRECT_CONNECTION_STRING")
        or os.environ.get("DATABASE_URL")
        or ""
    ).strip()
    if not url:
        raise SystemExit(
            "ERROR: set SUPABASE_DIRECT_CONNECTION_STRING (db.*.supabase.co:5432) in .env"
        )
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    if "pooler.supabase.com" in url:
        raise SystemExit(
            "ERROR: SUPABASE_DIRECT_CONNECTION_STRING must be the direct host "
            "(db.*.supabase.co), not the pooler."
        )
    if "sslmode=" not in url:
        url = f"{url}&sslmode=require" if "?" in url else f"{url}?sslmode=require"
    return url


KEEP_PROGRAM_FRAGMENTS = (
    "Gamma Prep",
    "Beta Academy",
    "Alpha High",
    "Delta Middle",
    "Epsilon Junior",
)


def main() -> int:
    url = _direct_url()
    host = urlparse(url).hostname
    print("Connecting:", host)

    engine = create_engine(url, pool_pre_ping=True, connect_args={"connect_timeout": 15})
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
        placeholders = ", ".join(f":k{i}" for i in range(len(keep_ids)))
        params = {f"k{i}": kid for i, kid in enumerate(keep_ids)}

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
        engine.dispose()


if __name__ == "__main__":
    sys.exit(main())
