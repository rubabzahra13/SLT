"use client";

import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { DottedScroll } from "@/components/ui/DottedScroll";
import { HoverTip } from "@/components/ui/HoverTip";
import type {
  CellBooking,
  ColumnAggregate,
  TeamScheduleRow,
} from "@/lib/schedule-view";

type ScheduleInsightPanelProps = {
  rows: TeamScheduleRow[];
  columns: ColumnAggregate[];
  activeProducerId?: string | null;
  onSelectProducer: (row: TeamScheduleRow) => void;
  className?: string;
};

function uniqueBookings(row: TeamScheduleRow): CellBooking[] {
  const seen = new Set<string>();
  const list: CellBooking[] = [];
  for (const cell of row.cells) {
    if (cell.status !== "mix" || !cell.booking) continue;
    const key = `${cell.booking.work}|${cell.booking.until}`;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(cell.booking);
    if (list.length >= 3) break;
  }
  return list;
}

export function ScheduleInsightPanel({
  rows,
  columns,
  activeProducerId,
  onSelectProducer,
  className,
}: ScheduleInsightPanelProps) {
  const today = columns.find((c) => c.isToday);
  const busiest = columns.reduce<ColumnAggregate | null>((best, col) => {
    if (!best || col.unavailableCount > best.unavailableCount) return col;
    return best;
  }, null);

  const openToday =
    today != null ? today.total - today.unavailableCount : rows.length;

  const producerStats = rows.map((row) => {
    const off = row.cells.filter((c) => c.unavailable).length;
    return {
      row,
      off,
      open: row.cells.length - off,
      bookings: uniqueBookings(row),
    };
  });

  return (
    <aside
      className={clsx(
        "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-brand-line/80 bg-brand-bg shadow-[var(--shadow-premium-sm)]",
        className
      )}
    >
      <div className="shrink-0 border-b border-brand-line bg-brand-bg-subtle/80 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-secondary">
          Snapshot
        </p>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-px border-b border-brand-line bg-brand-line/60">
        <div className="bg-brand-bg-subtle/80 px-4 py-3.5">
          <p className="text-[11px] text-brand-ink-tertiary">Available today</p>
          <p className="mt-1 text-[22px] font-semibold tabular-nums tracking-[-0.03em] text-brand-ink">
            {openToday}
            <span className="text-[13px] font-medium text-brand-ink-tertiary">
              /{rows.length}
            </span>
          </p>
        </div>
        <div className="bg-brand-bg-subtle/80 px-4 py-3.5">
          <p className="text-[11px] text-brand-ink-tertiary">Busiest day</p>
          <p className="mt-1 text-[15px] font-semibold text-brand-ink">
            {busiest ? `${busiest.dayLabel} ${busiest.label}` : "—"}
          </p>
          {busiest ? (
            <p className="mt-0.5 text-[12px] tabular-nums text-brand-orange">
              {busiest.unavailableCount}/{busiest.total} booked
            </p>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-b border-brand-line bg-brand-bg-subtle/50 px-4 py-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
          Legend
        </p>
        <div className="mt-2.5 flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <span className="h-3.5 w-8 rounded-[4px] bg-brand-signature" />
            <span className="text-[12px] text-brand-ink-secondary">
              Booked
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="h-3.5 w-8 rounded-[4px] bg-brand-surface ring-1 ring-inset ring-brand-line/80" />
            <span className="text-[12px] text-brand-ink-secondary">
              Available
            </span>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <p className="shrink-0 px-4 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
          Team load
        </p>
        <DottedScroll
          className="min-h-0 flex-1"
          scrollClassName="h-full overflow-y-scroll scrollbar-hide px-2 pb-3"
          indicatorPlacement="overlay"
          contentClassName="flex flex-col gap-1"
        >
          {producerStats.map(({ row, off, open, bookings }) => {
            const active = row.producer.id === activeProducerId;
            const button = (
              <button
                type="button"
                onClick={() => onSelectProducer(row)}
                className={clsx(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition",
                  active
                    ? "bg-brand-orange-soft ring-1 ring-brand-orange/30"
                    : "hover:bg-brand-blue-soft/50"
                )}
              >
                <Avatar
                  src={row.producer.avatar}
                  alt={row.producer.name}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-brand-ink">
                    {row.producer.name}
                  </p>
                  <p className="truncate text-[11px] text-brand-ink-tertiary">
                    {row.producer.specialty}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-medium tabular-nums text-brand-signature">
                    {open} free days
                  </p>
                  <p className="text-[11px] tabular-nums text-brand-orange">
                    {off} bookings
                  </p>
                </div>
              </button>
            );

            if (bookings.length === 0) {
              return <div key={row.producer.id}>{button}</div>;
            }

            return (
              <HoverTip
                key={row.producer.id}
                className="w-full"
                placement="left"
                content={
                  <div className="min-w-[180px] max-w-[220px]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-signature">
                      Booked work
                    </p>
                    <ul className="mt-1.5 flex flex-col gap-2">
                      {bookings.map((booking) => (
                        <li key={`${booking.work}-${booking.until}`}>
                          <p className="text-[12px] font-medium leading-snug text-brand-ink">
                            {booking.work}
                          </p>
                          <p className="mt-0.5 text-[11px] text-brand-ink-secondary">
                            Until {booking.until}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                }
              >
                {button}
              </HoverTip>
            );
          })}
        </DottedScroll>
      </div>
    </aside>
  );
}
