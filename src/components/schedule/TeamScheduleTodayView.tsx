"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { ScheduleStatusTile, getCellBookings } from "@/components/schedule/schedule-legend";
import { TruncatedText } from "@/components/ui/TruncatedText";
import {
  type ScheduleCell,
  type TeamScheduleRow,
} from "@/lib/schedule-view";

type TeamScheduleTodayViewProps = {
  rows: TeamScheduleRow[];
  date: Date;
  activeProducerId?: string | null;
  onSelectProducer: (row: TeamScheduleRow, cell?: ScheduleCell) => void;
  emptyMessage?: string;
  className?: string;
};

type ProducerDayEntry = {
  row: TeamScheduleRow;
  cell: ScheduleCell;
};

function formatTodayHeading(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function buildTodayEntries(rows: TeamScheduleRow[]): ProducerDayEntry[] {
  const entries: ProducerDayEntry[] = [];
  const statusOrder: Record<ScheduleCell["status"], number> = {
    available: 0,
    mix: 1,
    off: 2,
    capacity: 3,
  };

  for (const row of rows) {
    const cell = row.cells[0];
    if (cell) entries.push({ row, cell });
  }

  entries.sort((a, b) => {
    const statusDiff = statusOrder[a.cell.status] - statusOrder[b.cell.status];
    if (statusDiff !== 0) return statusDiff;
    return a.row.producer.name.localeCompare(b.row.producer.name);
  });

  return entries;
}

export function TeamScheduleTodayView({
  rows,
  date,
  activeProducerId,
  onSelectProducer,
  emptyMessage = "No producers in this view.",
  className,
}: TeamScheduleTodayViewProps) {
  const entries = useMemo(() => buildTodayEntries(rows), [rows]);
  const hasEntries = entries.length > 0;
  const shouldStretchRows = entries.length > 2;

  const columns = useMemo<Column<ProducerDayEntry>[]>(
    () => [
      {
        key: "producer",
        header: "Producer",
        width: "72px",
        align: "center",
        nowrap: false,
        cellClassName: "!overflow-visible whitespace-normal",
        render: (entry) => {
          const { producer } = entry.row;
          const active = producer.id === activeProducerId;
          return (
            <div
              className="mx-auto flex w-full flex-col items-center justify-center gap-1"
              title={producer.name}
            >
              <div
                className={clsx(
                  "shrink-0 rounded-full ring-1 ring-offset-1 ring-offset-white",
                  active ? "ring-brand-orange/60" : "ring-brand-blue/30"
                )}
              >
                <Avatar src={producer.avatar} alt={producer.name} size="sm" />
              </div>
              <span
                className={clsx(
                  "max-w-full truncate text-[10px] font-bold leading-none",
                  active ? "text-brand-orange-deep" : "text-brand-ink-secondary"
                )}
              >
                {producer.initials}
              </span>
            </div>
          );
        },
      },
      {
        key: "bookedOn",
        header: "Booked On",
        width: "320px",
        align: "center",
        render: (entry) => {
          const bookings = getCellBookings(entry.cell);
          if (bookings.length === 0) {
            if (entry.cell.status === "available") {
              return (
                <span className="text-[12px] font-semibold text-brand-signature">Available</span>
              );
            }
            if (entry.cell.status === "capacity") {
              return (
                <span className="text-[12px] font-semibold text-amber-700">Capacity Reached</span>
              );
            }
            return <span className="text-brand-ink-tertiary">—</span>;
          }
          const extraCount = bookings.length - 1;
          return (
            <div className="min-w-0 w-full text-center">
              <TruncatedText
                text={bookings[0].work}
                className="text-[12px] font-medium text-brand-ink"
              />
              {extraCount > 0 ? (
                <p className="mt-0.5 text-[11px] font-medium text-brand-ink-tertiary">
                  +{extraCount} more mix{extraCount === 1 ? "" : "es"}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        key: "endDate",
        header: "End Date",
        width: "120px",
        align: "center",
        render: (entry) => {
          const bookings = getCellBookings(entry.cell);
          const until = bookings[0]?.until;
          if (!until && entry.cell.status === "available") {
            return (
              <span className="text-[12px] font-semibold text-brand-signature">Available</span>
            );
          }
          if (!until && entry.cell.status === "capacity") {
            return (
              <span className="text-[12px] font-semibold text-amber-700">At daily limit</span>
            );
          }
          return (
            <span
              className={clsx(
                "text-[12px] tabular-nums",
                until ? "font-medium text-brand-ink-secondary" : "text-brand-ink-tertiary"
              )}
            >
              {until ?? "—"}
            </span>
          );
        },
      },
      {
        key: "status",
        header: "Status",
        width: "88px",
        align: "center",
        nowrap: false,
        cellClassName: "!overflow-visible whitespace-normal",
        render: (entry) => (
          <ScheduleStatusTile
            status={entry.cell.status}
            cell={entry.cell}
            className={
              shouldStretchRows ? "h-8 w-14 max-w-[56px]" : undefined
            }
          />
        ),
      },
    ],
    [activeProducerId, shouldStretchRows]
  );

  return (
    <div
      className={clsx(
        "dashboard-panel dashboard-panel-framed flex h-full min-h-0 w-full flex-col overflow-hidden",
        className
      )}
    >
      <div className="shrink-0 border-b border-brand-line/60 px-5 py-4 lg:px-6">
        <p className="text-label">Today</p>
        <h2 className="text-display mt-1 text-[20px]">{formatTodayHeading(date)}</h2>
        <p className="mt-1 text-[13px] text-brand-ink-secondary">
          {rows.length} producer{rows.length === 1 ? "" : "s"} on roster
        </p>
      </div>

      <div
        className={clsx(
          "min-h-0 flex-1",
          hasEntries && shouldStretchRows
            ? "flex flex-col overflow-hidden"
            : hasEntries
              ? "overflow-y-auto"
              : "flex flex-col"
        )}
      >
        {hasEntries ? (
          <DataTable
            data={entries}
            columns={columns}
            rowKey={(entry) => entry.row.producer.id}
            onRowClick={(entry) => onSelectProducer(entry.row, entry.cell)}
            emptyMessage={emptyMessage}
            embedded
            compact
            showScrollIndicator={false}
            stretchRows={shouldStretchRows}
            className={shouldStretchRows ? "h-full min-h-0 flex-1" : undefined}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 py-12">
            <div className="max-w-md text-center">
              <p className="text-[13px] font-semibold text-brand-ink">{emptyMessage}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-brand-ink-tertiary">
                Try another filter or category to see producers in this view.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
