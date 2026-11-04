"""Dashboard KPI pulse — small cached snapshot, not a full board recount.

Read path: return cached pulse (KPIs + chart aggregates + orders-in series).
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
from app.order_identity import category_from_form_type

DASHBOARD_PULSE_TTL_S = 60.0
ORDERS_IN_DAYS = 14

_pulse_cache: dict[str, tuple[float, dict[str, Any]]] = {}


def invalidate_dashboard_pulse_cache() -> None:
    _pulse_cache.clear()


def _today_iso() -> str:
    return date.today().isoformat()


def _iso_or_empty(value: Any) -> str:
    if value is None:
        return ""
    if hasattr(value, "isoformat"):
        return value.isoformat()[:10]
    text = str(value).strip()
    return text[:10] if text else ""


def _order_has_producer_row(
    assigned_producer: str | None, assigned_producer_id: Any
) -> bool:
    key = (assigned_producer or "").strip()
    if assigned_producer_id is not None:
        return True
    return bool(key) and key.upper() != "NA"


def _is_outsourced_row(status: str | None, section: str | None) -> bool:
    return status == "outsourced" or section == "OUTSOURCED MIXES"


def _is_open_row(status: str | None, in_payroll: bool | None) -> bool:
    return status != "completed" and not bool(in_payroll)


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
    week_end_s = (today + timedelta(days=7)).isoformat()

    # One pass for Orders tab badge + unassigned (same pre-MTD / unflagged base).
    pre_mtd = or_(Order.status.is_(None), Order.status != "in_mtd")
    orders_row = (
        db.query(
            func.count(Order.id).label("orders_tab"),
            func.coalesce(
                func.sum(cast(_order_not_assigned(), Integer)), 0
            ).label("unassigned"),
        )
        .filter(pre_mtd, _not_flagged())
        .one()
    )
    orders_tab = int(orders_row.orders_tab or 0)
    unassigned = int(orders_row.unassigned or 0)

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

    # Open MTD is tiny vs Orders — pull once and derive KPIs + charts in Python.
    open_rows = (
        db.query(
            MTDRecord.status,
            MTDRecord.section,
            MTDRecord.in_payroll,
            MTDRecord.invoice,
            Order.form_type,
            Order.assigned_producer,
            Order.assigned_producer_id,
            Order.mix_start_date,
            Order.mix_end_date,
            Order.needs_attention,
        )
        .select_from(MTDRecord)
        .outerjoin(Order, MTDRecord.order_id == Order.id)
        .filter(
            MTDRecord.paid_at.is_(None),
            or_(MTDRecord.status.is_(None), MTDRecord.status != "completed"),
            or_(MTDRecord.in_payroll.is_(False), MTDRecord.in_payroll.is_(None)),
        )
        .all()
    )

    in_queue = 0
    todays_mixes = 0
    outsourced = 0
    mtd_open = 0
    overdue = 0
    starting_today = 0
    due_this_week = 0
    missing_data = 0
    on_track = 0
    category_counts: dict[str, int] = {}
    open_bookings: list[dict[str, str]] = []

    for (
        status,
        section,
        in_payroll,
        invoice,
        form_type,
        assigned_producer,
        assigned_producer_id,
        mix_start,
        mix_end,
        needs_attention,
    ) in open_rows:
        if not _is_open_row(status, in_payroll):
            continue
        mtd_open += 1
        cat = category_from_form_type(form_type)
        category_counts[cat] = category_counts.get(cat, 0) + 1

        is_out = _is_outsourced_row(status, section)
        if is_out:
            outsourced += 1

        has_producer = _order_has_producer_row(
            assigned_producer, assigned_producer_id
        )
        start = _iso_or_empty(mix_start)
        end = _iso_or_empty(mix_end)
        waiting = bool(needs_attention) or status == "needs_attention"

        if has_producer:
            producer_key = (assigned_producer or "").strip()
            if producer_key and producer_key.upper() != "NA":
                open_bookings.append(
                    {"producer": producer_key, "start": start, "end": end}
                )

        if (
            not is_out
            and has_producer
            and not waiting
            and start
            and start > today_s
        ):
            in_queue += 1

        if (
            not is_out
            and has_producer
            and start
            and start <= today_s
            and (not end or end >= today_s)
        ):
            todays_mixes += 1

        # Mix timeline buckets (mutually exclusive, soonest milestone first).
        ready = bool(
            has_producer and (invoice or "").strip() and start and end
        )
        if end and end < today_s:
            overdue += 1
        elif start == today_s:
            starting_today += 1
        elif end and end <= week_end_s:
            due_this_week += 1
        elif not ready:
            missing_data += 1
        else:
            on_track += 1

    category_pipeline = [
        {"category": cat, "count": count}
        for cat, count in sorted(
            category_counts.items(), key=lambda item: (-item[1], item[0])
        )
    ]

    orders_in_total, orders_in_by_day = _orders_in_series(db, today)

    return {
        "unassigned": unassigned,
        "orders_tab": orders_tab,
        "in_queue": in_queue,
        "todays_mixes": todays_mixes,
        "outsourced": outsourced,
        "mtd_open": mtd_open,
        "payroll_open": payroll_open,
        "orders_in_total": orders_in_total,
        "orders_in_by_day": orders_in_by_day,
        "overdue": overdue,
        "starting_today": starting_today,
        "due_this_week": due_this_week,
        "mix_ops": {
            "overdue": overdue,
            "starting_today": starting_today,
            "due_this_week": due_this_week,
            "missing_data": missing_data,
            "on_track": on_track,
        },
        "category_pipeline": category_pipeline,
        "open_bookings": open_bookings,
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
