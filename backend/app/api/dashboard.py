"""Dashboard read APIs — tiny KPI payloads for the home strip."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.dashboard_pulse import get_dashboard_pulse

router = APIRouter()


class OrdersInDayOut(BaseModel):
    iso: str
    count: int
    is_today: bool = False


class DashboardPulseOut(BaseModel):
    unassigned: int
    orders_tab: int = 0
    in_queue: int
    todays_mixes: int
    outsourced: int
    mtd_open: int = 0
    payroll_open: int = 0
    orders_in_total: int = 0
    orders_in_by_day: list[OrdersInDayOut] = []
    cached: bool = False
    as_of_day: str | None = None


@router.get("/dashboard/pulse", response_model=DashboardPulseOut)
def dashboard_pulse(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Home KPIs + orders-in series (cached; invalidate on order/MTD write)."""
    return DashboardPulseOut(**get_dashboard_pulse(db))
