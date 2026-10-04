"""normalize producer percent rates to fractions (0.5 = 50%)

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-10-04
"""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "d3e4f5a6b7c8"
down_revision: Union[str, None] = "c2d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _normalize_fraction(value: Any) -> Any:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return value
    if number > 1:
        return number / 100.0
    return number


def _normalize_rate_map(raw: Any) -> Optional[Dict[str, Any]]:
    if raw is None:
        return None
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            return None
    if not isinstance(raw, dict):
        return None
    changed = False
    next_map: Dict[str, Any] = {}
    for key, value in raw.items():
        normalized = _normalize_fraction(value)
        if normalized != value:
            changed = True
        next_map[key] = normalized
    return next_map if changed else None


def _scalar_changed(current: Any, normalized: Any) -> bool:
    if current is None or normalized is None:
        return False
    try:
        return float(current) != float(normalized)
    except (TypeError, ValueError):
        return False


def upgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            """
            SELECT id, rates_by_category, default_rate, dance_voiceover_rate,
                   cheer_voiceover_rate, rush_fee_rate, rate_overrides
            FROM producers
            """
        )
    ).mappings()

    for row in rows:
        next_rates = _normalize_rate_map(row["rates_by_category"])
        next_overrides = _normalize_rate_map(row["rate_overrides"])
        next_default = _normalize_fraction(row["default_rate"])
        next_dance = _normalize_fraction(row["dance_voiceover_rate"])
        next_cheer = _normalize_fraction(row["cheer_voiceover_rate"])
        next_rush = _normalize_fraction(row["rush_fee_rate"])

        params: Dict[str, Any] = {"id": str(row["id"])}
        sets: List[str] = []

        if next_rates is not None:
            sets.append("rates_by_category = CAST(:rates AS json)")
            params["rates"] = json.dumps(next_rates)
        if next_overrides is not None:
            sets.append("rate_overrides = CAST(:overrides AS json)")
            params["overrides"] = json.dumps(next_overrides)
        if _scalar_changed(row["default_rate"], next_default):
            sets.append("default_rate = :default_rate")
            params["default_rate"] = next_default
        if _scalar_changed(row["dance_voiceover_rate"], next_dance):
            sets.append("dance_voiceover_rate = :dance")
            params["dance"] = next_dance
        if _scalar_changed(row["cheer_voiceover_rate"], next_cheer):
            sets.append("cheer_voiceover_rate = :cheer")
            params["cheer"] = next_cheer
        if _scalar_changed(row["rush_fee_rate"], next_rush):
            sets.append("rush_fee_rate = :rush")
            params["rush"] = next_rush

        if not sets:
            continue

        conn.execute(
            sa.text(f"UPDATE producers SET {', '.join(sets)} WHERE id = :id"),
            params,
        )


def downgrade() -> None:
    # Irreversible data normalization (50 and 0.5 both mean 50%).
    pass
