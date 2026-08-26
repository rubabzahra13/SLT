"use client";

import type { ColumnAggregate } from "@/lib/schedule-view";

type ScheduleHeaderMetaProps = {
  columns: ColumnAggregate[];
  availableToday: number;
  totalProducers: number;
};

function MetaStat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
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
  availableToday,
  totalProducers,
}: ScheduleHeaderMetaProps) {
  const busiest = columns.reduce<ColumnAggregate | null>((best, col) => {
    if (!best || col.unavailableCount > best.unavailableCount) return col;
    return best;
  }, null);

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
        <MetaStat label="Available today">
          <span className="tabular-nums text-brand-signature">{availableToday}</span>
          <span className="text-[12px] font-medium text-brand-ink-tertiary">
            / {totalProducers}
          </span>
        </MetaStat>

        {busiest ? (
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

      <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
          Legend
        </span>
        <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-brand-ink-secondary">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-4 shrink-0 rounded-[3px] bg-brand-signature"
              aria-hidden
            />
            Booked
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-4 shrink-0 rounded-[3px] bg-brand-orange/80"
              aria-hidden
            />
            Off
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-4 shrink-0 rounded-[3px] bg-white ring-1 ring-inset ring-brand-line/70"
              aria-hidden
            />
            Available
          </span>
        </div>
      </div>
    </div>
  );
}
