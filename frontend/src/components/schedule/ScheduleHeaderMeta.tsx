"use client";

import type { ReactNode } from "react";
import type { ScheduleViewRange } from "@/lib/schedule-view";
import { ScheduleLegend } from "@/components/schedule/schedule-legend";

type ScheduleHeaderMetaProps = {
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
  offToday,
  totalProducers,
  view,
}: ScheduleHeaderMetaProps) {
  const isToday = view === "today";

  return (
    <div className="flex w-full flex-wrap items-center justify-start gap-x-6 gap-y-3">
      <ScheduleLegend />
      {isToday ? (
        <MetaStat label="Off today">
          <span className="tabular-nums text-brand-orange-deep">{offToday}</span>
          <span className="text-[12px] font-medium text-brand-ink-tertiary">
            / {totalProducers}
          </span>
        </MetaStat>
      ) : null}
    </div>
  );
}
