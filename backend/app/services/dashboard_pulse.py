"""Dashboard KPI pulse — small cached snapshot, not a full board recount.

Read path: return cached pulse (KPIs + orders-in series + open MTD total).
Write path: invalidate on order/MTD changes (see form_chip_cache + mtd publish).
Date-sensitive fields are keyed by calendar day.
"""
from __future__ import annotations

import time
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import Date, Integer, and_, cast, func, or_
from sqlalchemy.orm import Session

from app.models.mtd_record import MTDRecord
from app.models.order import Order

DASHBOARD_PULSE_TTL_S = 60.0
ORDERS_IN_DAYS = 14

_pulse_cache: dict[str, tuple[float, dict[str, Any]]] = {}


def invalidate_dashboard_pulse_cache() -> None:
    _pulse_cache.clear()


def _today_iso() -> str:
    return date.today().isoformat()


def _order_has_producer():
    return or_(
        and_(
            Order.assigned_producer.isnot(None),
            Order.assigned_producer != "",
            Order.assigned_producer != "NA",
        ),
        Order.assigned_producer_id.isnot(None),
    )


def _order_not_assigned():
    return and_(
        or_(Order.is_reassigned.is_(False), Order.is_reassigned.is_(None)),
        or_(
            Order.assigned_producer.is_(None),
            Order.assigned_producer == "",
            Order.assigned_producer == "NA",
        ),
        Order.assigned_producer_id.is_(None),
    )


def _not_flagged():
    return or_(
        Order.affiliate_flag_status.is_(None),
        Order.affiliate_flag_status != "open",
    )


def _is_outsourced():
    return or_(
        MTDRecord.status == "outsourced",
        MTDRecord.section == "OUTSOURCED MIXES",
    )


def _is_waiting():
    return or_(
        Order.needs_attention.is_(True),
        MTDRecord.status == "needs_attention",
    )


def _is_open_mtd():
    return and_(
        or_(MTDRecord.status.is_(None), MTDRecord.status != "completed"),
        or_(MTDRecord.in_payroll.is_(False), MTDRecord.in_payroll.is_(None)),
    )


def _orders_in_series(db: Session, today: date) -> tuple[int, list[dict[str, Any]]]:
    """Creations per day for the last ORDERS_IN_DAYS (any status)."""
    start_day = today - timedelta(days=ORDERS_IN_DAYS - 1)
    start_dt = datetime(
        start_day.year, start_day.month, start_day.day, tzinfo=timezone.utc
    )
    day_col = cast(Order.created_at, Date)
    rows = (
        db.query(day_col.label("day"), func.count(Order.id))
        .filter(Order.created_at.isnot(None), Order.created_at >= start_dt)
        .group_by(day_col)
        .all()
    )
    by_day = {
        (d.isoformat() if hasattr(d, "isoformat") else str(d)[:10]): int(n or 0)
        for d, n in rows
        if d is not None
    }
    series: list[dict[str, Any]] = []
    total = 0
    today_s = today.isoformat()
    for i in range(ORDERS_IN_DAYS):
        day = start_day + timedelta(days=i)
        iso = day.isoformat()
        count = by_day.get(iso, 0)
        total += count
        series.append({"iso": iso, "count": count, "is_today": iso == today_s})
    return total, series


def _compute_pulse(db: Session, today: date) -> dict[str, Any]:
    today_s = today.isoformat()

    # Orders tab badge: pre-MTD board, exclude open affiliate flags (same as
    # /orders/counts all with exclude_flagged).
    orders_tab = int(
        db.query(func.count(Order.id))
        .filter(
            or_(Order.status.is_(None), Order.status != "in_mtd"),
            _not_flagged(),
        )
        .scalar()
        or 0
    )

    unassigned = int(
        db.query(func.count(Order.id))
        .filter(
            or_(Order.status.is_(None), Order.status != "in_mtd"),
            _not_flagged(),
            _order_not_assigned(),
        )
        .scalar()
        or 0
    )

    payroll_open = int(
        db.query(func.count(MTDRecord.id))
        .filter(
            MTDRecord.paid_at.is_(None),
            or_(
                MTDRecord.in_payroll.is_(True),
                MTDRecord.status == "completed",
            ),
        )
        .scalar()
        or 0
    )

    start = func.coalesce(Order.mix_start_date, "")
    end = func.coalesce(Order.mix_end_date, "")

    in_queue_expr = and_(
        _is_open_mtd(),
        ~_is_outsourced(),
        _order_has_producer(),
        ~_is_waiting(),
        start != "",
        start > today_s,
    )
    todays_expr = and_(
        _is_open_mtd(),
        ~_is_outsourced(),
        _order_has_producer(),
        start != "",
        start <= today_s,
        or_(end == "", end >= today_s),
    )
    outsourced_expr = and_(
        _is_outsourced(),
        or_(MTDRecord.in_payroll.is_(False), MTDRecord.in_payroll.is_(None)),
    )
    mtd_open_expr = and_(_is_open_mtd(), MTDRecord.paid_at.is_(None))

    row = (
        db.query(
            func.coalesce(func.sum(cast(in_queue_expr, Integer)), 0).label("in_queue"),
            func.coalesce(
                func.sum(cast(todays_expr, Integer)), 0
            ).label("todays_mixes"),
            func.coalesce(
                func.sum(cast(outsourced_expr, Integer)), 0
            ).label("outsourced"),
            func.coalesce(
                func.sum(cast(mtd_open_expr, Integer)), 0
            ).label("mtd_open"),
        )
        .select_from(MTDRecord)
        .outerjoin(Order, MTDRecord.order_id == Order.id)
        .filter(MTDRecord.paid_at.is_(None))
        .one()
    )

    orders_in_total, orders_in_by_day = _orders_in_series(db, today)

    return {
        "unassigned": unassigned,
        "orders_tab": orders_tab,
        "in_queue": int(row.in_queue or 0),
        "todays_mixes": int(row.todays_mixes or 0),
        "outsourced": int(row.outsourced or 0),
        "mtd_open": int(row.mtd_open or 0),
        "payroll_open": payroll_open,
        "orders_in_total": orders_in_total,
        "orders_in_by_day": orders_in_by_day,
    }


def get_dashboard_pulse(db: Session) -> dict[str, Any]:
    day = _today_iso()
    now = time.monotonic()
    hit = _pulse_cache.get(day)
    if hit and now - hit[0] < DASHBOARD_PULSE_TTL_S:
        return {**hit[1], "cached": True, "as_of_day": day}

    pulse = _compute_pulse(db, date.fromisoformat(day))
    _pulse_cache.clear()
    _pulse_cache[day] = (now, pulse)
    return {**pulse, "cached": False, "as_of_day": day}
