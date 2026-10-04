"""replace producer General category with Team Performance / Variety

Revision ID: f9a0b1c2d3e4
Revises: e8f9a0b1c2d3
Create Date: 2026-10-04 17:46:00.000000
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f9a0b1c2d3e4"
down_revision: Union[str, Sequence[str], None] = "e8f9a0b1c2d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LEGACY = "General"
CANONICAL = "Team Performance / Variety"


def _rewrite_categories(categories: Any) -> Optional[List[str]]:
    if not isinstance(categories, list):
        return None
    next_cats: List[str] = []
    seen: set[str] = set()
    changed = False
    for raw in categories:
        if not isinstance(raw, str):
            continue
        value = CANONICAL if raw.strip().lower() == LEGACY.lower() else raw
        if value != raw:
            changed = True
        if value in seen:
            changed = True
            continue
        next_cats.append(value)
        seen.add(value)
    return next_cats if changed else None


def _rewrite_rates(rates: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(rates, dict):
        return None

    general_keys = [
        key
        for key in rates
        if isinstance(key, str) and key.strip().lower() == LEGACY.lower()
    ]
    if not general_keys:
        return None

    next_rates: Dict[str, Any] = {}
    general_rate = None
    for key, value in rates.items():
        if isinstance(key, str) and key.strip().lower() == LEGACY.lower():
            general_rate = value
            continue
        next_rates[key] = value

    if CANONICAL not in next_rates and general_rate is not None:
        next_rates[CANONICAL] = general_rate
    return next_rates


def upgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(
        sa.text("SELECT id, categories, rates_by_category FROM producers")
    ).mappings()

    for row in rows:
        next_categories = _rewrite_categories(row["categories"])
        next_rates = _rewrite_rates(row["rates_by_category"])
        if next_categories is None and next_rates is None:
            continue

        params: Dict[str, Any] = {"id": str(row["id"])}
        sets: List[str] = []
        if next_categories is not None:
            sets.append("categories = CAST(:categories AS json)")
            params["categories"] = json.dumps(next_categories)
        if next_rates is not None:
            sets.append("rates_by_category = CAST(:rates AS json)")
            params["rates"] = json.dumps(next_rates)

        conn.execute(
            sa.text(f"UPDATE producers SET {', '.join(sets)} WHERE id = :id"),
            params,
        )


def downgrade() -> None:
    # One-way data cleanup; no safe reverse mapping.
    pass
