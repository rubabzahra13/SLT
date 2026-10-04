"use client";

import Link from "next/link";
import type { WeekCapacityDay } from "@/lib/dashboard";
import { weekDayInsight } from "@/lib/dashboard-tooltips";
import { DashboardTip } from "@/components/dashboard/DashboardTip";

const AT_CAPACITY_BAR_CLASS = "bg-brand-signature";
const HAS_CAPACITY_BAR_CLASS = "bg-brand-orange";
const AT_CAPACITY_LEGEND_CLASS = "bg-brand-signature";
const HAS_CAPACITY_LEGEND_CLASS = "bg-brand-orange";

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
    const atCapacityPct = (day.atCapacity / maxTotal) * 100;
    const hasCapacityPct = (day.hasCapacity / maxTotal) * 100;
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
            {day.hasCapacity > 0 ? (
              <div
                className={`w-full rounded-sm ${HAS_CAPACITY_BAR_CLASS}`}
                style={{ height: `${hasCapacityPct}%`, minHeight: 3 }}
              />
            ) : null}
            {day.atCapacity > 0 ? (
              <div
                className={`w-full rounded-sm ${AT_CAPACITY_BAR_CLASS}`}
                style={{ height: `${atCapacityPct}%`, minHeight: 3 }}
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

  const legend = (
    <div
      className={
        compact
          ? "mt-2.5 flex shrink-0 items-center justify-center gap-4 text-[9px] font-semibold uppercase tracking-wide text-brand-ink-tertiary"
          : "mt-3 flex items-center justify-center gap-4 text-[10px] text-brand-ink-tertiary"
      }
    >
      <DashboardTip
        title="Full"
        body="Hit their daily mix or cost limit."
        placement="top"
      >
        <span className="flex cursor-default items-center gap-1.5">
          <span className={`h-2 w-2 rounded-sm ${AT_CAPACITY_LEGEND_CLASS}`} />
          Full
        </span>
      </DashboardTip>
      <DashboardTip
        title="Open"
        body="Still have room for new mixes."
        placement="top"
      >
        <span className="flex cursor-default items-center gap-1.5">
          <span className={`h-2 w-2 rounded-sm ${HAS_CAPACITY_LEGEND_CLASS}`} />
          Open
        </span>
      </DashboardTip>
    </div>
  );

  if (compact) {
    return (
      <div className="flex h-full min-h-0 flex-col px-3 py-3">
        <div className="flex min-h-0 flex-1 items-end justify-between gap-2.5">
          {days.map(dayBar)}
        </div>
        {legend}
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-end justify-between gap-1.5">{days.map(dayBar)}</div>
      {legend}
    </div>
  );
}
