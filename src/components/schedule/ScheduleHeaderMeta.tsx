"use client";

import type { ReactNode } from "react";
import type { ColumnAggregate, ScheduleViewRange } from "@/lib/schedule-view";
import { ScheduleLegend } from "@/components/schedule/schedule-legend";

type ScheduleHeaderMetaProps = {
  columns: ColumnAggregate[];
  availableCount: number;
  offToday: number;
  totalProducers: number;
  view: ScheduleViewRange;
};

function MetaStat({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-baseline gap-2">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
        {label}
      </span>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0 text-[13px] font-semibold leading-none text-brand-ink">
        {children}
      </div>
    </div>
  );
}

export function ScheduleHeaderMeta({
  columns,
  availableCount,
  offToday,
  totalProducers,
  view,
}: ScheduleHeaderMetaProps) {
  const isToday = view === "today";
  const busiest = columns.reduce<ColumnAggregate | null>((best, col) => {
    if (!best || col.unavailableCount > best.unavailableCount) return col;
    return best;
  }, null);

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
        <MetaStat label="Available today">
          <span className="tabular-nums text-brand-signature">{availableCount}</span>
          <span className="text-[12px] font-medium text-brand-ink-tertiary">
            / {totalProducers}
          </span>
        </MetaStat>

        {isToday ? (
          <>
            <span className="hidden h-3.5 w-px shrink-0 bg-brand-line/45 sm:block" aria-hidden />
            <MetaStat label="Off today">
              <span className="tabular-nums text-brand-orange-deep">{offToday}</span>
              <span className="text-[12px] font-medium text-brand-ink-tertiary">
                / {totalProducers}
              </span>
            </MetaStat>
          </>
        ) : null}

        {!isToday && busiest ? (
          <>
            <span className="hidden h-3.5 w-px shrink-0 bg-brand-line/45 sm:block" aria-hidden />
            <MetaStat label="Busiest">
              <span className="truncate">
                {busiest.dayLabel} {busiest.label}
              </span>
              <span className="text-[12px] font-medium tabular-nums text-brand-orange">
                {busiest.unavailableCount}/{busiest.total} booked
              </span>
            </MetaStat>
          </>
        ) : null}
      </div>

      <ScheduleLegend />
    </div>
  );
}
