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


class CategoryPipelineOut(BaseModel):
    category: str
    count: int


class MixOpsOut(BaseModel):
    overdue: int = 0
    starting_today: int = 0
    due_this_week: int = 0
    missing_data: int = 0
    on_track: int = 0


class OpenBookingOut(BaseModel):
    """Slim booking span for team / week capacity (not a full MTD row)."""

    producer: str
    start: str = ""
    end: str = ""
    # "yes" = live MTD; "no" = Orders-tab Assigned (pre-MTD).
    in_mtd: str = "yes"


class DashboardPulseOut(BaseModel):
    unassigned: int
    orders_tab: int = 0
    in_queue: int
    todays_mixes: int
    outsourced: int
    mtd_open: int = 0
    # MTD open + Orders-tab Assigned with dates (capacity / timeline).
    open_assigned: int = 0
    payroll_open: int = 0
    orders_in_total: int = 0
    orders_in_by_day: list[OrdersInDayOut] = []
    overdue: int = 0
    starting_today: int = 0
    due_this_week: int = 0
    mix_ops: MixOpsOut = MixOpsOut()
    category_pipeline: list[CategoryPipelineOut] = []
    open_bookings: list[OpenBookingOut] = []
    cached: bool = False
    as_of_day: str | None = None


@router.get("/dashboard/pulse", response_model=DashboardPulseOut)
def dashboard_pulse(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Home KPIs + chart aggregates (cached; invalidate on order/MTD write)."""
    return DashboardPulseOut(**get_dashboard_pulse(db))
