"use client";

import Link from "next/link";
import type { WeekCapacityDay } from "@/lib/dashboard";
import { weekDayInsight } from "@/lib/dashboard-tooltips";
import { DashboardTip } from "@/components/dashboard/DashboardTip";

const BOOKED_BAR_CLASS = "bg-brand-signature";
const AVAILABLE_BAR_CLASS = "bg-brand-orange";
const BOOKED_LEGEND_CLASS = "bg-brand-signature";
const AVAILABLE_LEGEND_CLASS = "bg-brand-orange";

type ScheduleWeekChartProps = {
  days: WeekCapacityDay[];
  href?: string;
  compact?: boolean;
};

export function ScheduleWeekChart({
  days,
  href = "/schedule",
  compact = false,
}: ScheduleWeekChartProps) {
  if (days.length === 0) {
    return (
      <p className="px-4 py-5 text-center text-[11px] text-brand-ink-tertiary">
        No schedule data
      </p>
    );
  }

  const maxTotal = Math.max(...days.map((d) => d.total), 1);

  const dayBar = (day: WeekCapacityDay) => {
    const bookedPct = (day.booked / maxTotal) * 100;
    const availablePct = (day.available / maxTotal) * 100;
    const insight = weekDayInsight(day);

    return (
      <DashboardTip
        key={`${day.dayLabel}-${day.label}`}
        title={insight.title}
        body={insight.body}
        className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
        placement="top"
      >
        <Link
          href={href}
          className="flex h-full min-w-0 w-full flex-col items-center justify-end gap-2"
        >
          <div className="flex w-full max-w-[34px] flex-1 flex-col justify-end gap-1 overflow-hidden rounded-lg border border-brand-line/15 bg-brand-line/8 p-1">
            {day.available > 0 ? (
              <div
                className={`w-full rounded-sm ${AVAILABLE_BAR_CLASS}`}
                style={{ height: `${availablePct}%`, minHeight: 3 }}
              />
            ) : null}
            {day.booked > 0 ? (
              <div
                className={`w-full rounded-sm ${BOOKED_BAR_CLASS}`}
                style={{ height: `${bookedPct}%`, minHeight: 3 }}
              />
            ) : null}
          </div>
          <span
            className={
              day.isToday
                ? "text-[10px] font-bold text-brand-ink"
                : "text-[10px] font-semibold text-brand-ink-tertiary"
            }
          >
            {day.dayLabel}
          </span>
        </Link>
      </DashboardTip>
    );
  };

  if (compact) {
    return (
      <div className="flex h-full min-h-0 flex-col px-3 py-3">
        <div className="flex min-h-0 flex-1 items-end justify-between gap-2.5">
          {days.map(dayBar)}
        </div>
        <div className="mt-2.5 flex shrink-0 items-center justify-center gap-4 text-[9px] font-semibold uppercase tracking-wide text-brand-ink-tertiary">
          <DashboardTip
            title="Booked"
            body="Producers marked unavailable — mixes or time off scheduled."
            placement="top"
          >
            <span className="flex cursor-default items-center gap-1.5">
              <span className={`h-2 w-2 rounded-sm ${BOOKED_LEGEND_CLASS}`} />
              Booked
            </span>
          </DashboardTip>
          <DashboardTip
            title="Available"
            body="Producers still open for new assignments that day."
            placement="top"
          >
            <span className="flex cursor-default items-center gap-1.5">
              <span className={`h-2 w-2 rounded-sm ${AVAILABLE_LEGEND_CLASS}`} />
              Available
            </span>
          </DashboardTip>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-end justify-between gap-1.5">{days.map(dayBar)}</div>
      <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-brand-ink-tertiary">
        <DashboardTip title="Booked" body="Producers marked unavailable that day." placement="top">
          <span className="flex cursor-default items-center gap-1.5">
            <span className={`h-2 w-2 rounded-sm ${BOOKED_LEGEND_CLASS}`} />
            Booked
          </span>
        </DashboardTip>
        <DashboardTip title="Available" body="Open producer capacity that day." placement="top">
          <span className="flex cursor-default items-center gap-1.5">
            <span className={`h-2 w-2 rounded-sm ${AVAILABLE_LEGEND_CLASS}`} />
            Available
          </span>
        </DashboardTip>
      </div>
    </div>
  );
}
