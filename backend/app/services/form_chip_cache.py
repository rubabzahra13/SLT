"""Shared read caches for Orders board chips and Match Orders.

Lives outside api.orders / api.orders_board so order writes can invalidate
without a circular import (which hung uvicorn reload and surfaced as 500s).
"""
from __future__ import annotations

# Form/subtype chip GROUP BYs are expensive — reuse briefly.
# Cleared on order write so Assigned / Not assigned badges stay honest.
FORM_CHIP_TTL_S = 60.0
form_chip_cache: dict[str, tuple] = {}

# Full /orders/counts response (tab badges + chip maps). Same TTL family as
# chips; cleared on every order write so Assigned / Not assigned stay honest.
ORDERS_COUNTS_TTL_S = 45.0
orders_counts_cache: dict[str, tuple[float, dict]] = {}

# Full /mtd/counts response (live / payroll scopes). Cleared on order + MTD writes.
MTD_COUNTS_TTL_S = 45.0
mtd_counts_cache: dict[str, tuple[float, dict]] = {}

# Match Orders first pool page + badge totals. A match is an order write, so
# these must drop with the chips or the matched pair comes back on reload.
match_pool_page_cache: dict[str, tuple] = {}
match_counts_cache: dict[str, tuple] = {}


def invalidate_order_read_caches() -> None:
    form_chip_cache.clear()
    orders_counts_cache.clear()
    mtd_counts_cache.clear()
    match_pool_page_cache.clear()
    match_counts_cache.clear()
    # Dashboard home KPIs (unassigned / queue / today / outsourced).
    from app.services.dashboard_pulse import invalidate_dashboard_pulse_cache

    invalidate_dashboard_pulse_cache()


def invalidate_mtd_read_caches() -> None:
    """MTD board edits — drop MTD counts + dashboard pulse (orders chips stay)."""
    mtd_counts_cache.clear()
    from app.services.dashboard_pulse import invalidate_dashboard_pulse_cache

    invalidate_dashboard_pulse_cache()
