import Link from "next/link";
import type { WeekCapacityDay } from "@/lib/dashboard";

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

  if (compact) {
    return (
      <div className="flex h-full min-h-0 flex-col px-3 py-3">
        <div className="flex min-h-0 flex-1 items-end justify-between gap-2.5">
          {days.map((day) => {
            const bookedPct = (day.booked / maxTotal) * 100;
            const openPct = (day.open / maxTotal) * 100;
            return (
              <Link
                key={`${day.dayLabel}-${day.label}`}
                href={href}
                className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
              >
                <div className="flex w-full max-w-[34px] flex-1 flex-col justify-end gap-1 overflow-hidden rounded-lg border border-brand-line/15 bg-brand-line/8 p-1">
                {day.open > 0 ? (
                  <div
                    className="w-full rounded-sm bg-brand-blue"
                    style={{ height: `${openPct}%`, minHeight: 3 }}
                    title={`${day.open} open`}
                  />
                ) : null}
                {day.booked > 0 ? (
                  <div
                    className="w-full rounded-sm bg-brand-signature"
                    style={{ height: `${bookedPct}%`, minHeight: 3 }}
                    title={`${day.booked} booked`}
                  />
                ) : null}
                </div>
                <span
                  className={
                    day.isToday
                      ? "text-[10px] font-bold text-brand-signature"
                      : "text-[10px] font-semibold text-brand-ink-tertiary"
                  }
                >
                  {day.dayLabel}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="mt-2.5 flex shrink-0 items-center justify-center gap-4 text-[9px] font-semibold uppercase tracking-wide text-brand-ink-tertiary">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-brand-signature" />
            Booked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-brand-blue" />
            Open
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-end justify-between gap-1.5">
        {days.map((day) => {
          const bookedPct = (day.booked / maxTotal) * 100;
          const openPct = (day.open / maxTotal) * 100;
          return (
            <Link
              key={`${day.dayLabel}-${day.label}`}
              href={href}
              className="group flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <div
                className="flex w-full max-w-[34px] flex-col justify-end gap-0.5 overflow-hidden rounded-lg bg-brand-line/12 p-0.5"
                style={{ height: "76px" }}
              >
                {day.open > 0 ? (
                  <div
                    className="w-full rounded-sm bg-brand-blue"
                    style={{ height: `${openPct}%`, minHeight: 3 }}
                    title={`${day.open} open`}
                  />
                ) : null}
                {day.booked > 0 ? (
                  <div
                    className="w-full rounded-sm bg-brand-signature"
                    style={{ height: `${bookedPct}%`, minHeight: 3 }}
                    title={`${day.booked} booked`}
                  />
                ) : null}
              </div>
              <span
                className={
                  day.isToday
                    ? "text-[10px] font-bold text-brand-signature"
                    : "text-[10px] font-medium text-brand-ink-tertiary"
                }
              >
                {day.dayLabel}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-brand-ink-tertiary">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-brand-signature" />
          Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-brand-blue" />
          Open
        </span>
      </div>
    </div>
  );
}
