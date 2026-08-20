"use client";

import { Fragment, useMemo } from "react";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { DottedScroll } from "@/components/ui/DottedScroll";
import {
  formatMatrixDateCell,
  statusLabel,
  type ColumnAggregate,
  type ScheduleCell,
  type ScheduleViewRange,
  type TeamScheduleRow,
} from "@/lib/schedule-view";

type TeamScheduleMatrixProps = {
  rows: TeamScheduleRow[];
  columns: ColumnAggregate[];
  range: ScheduleViewRange;
  activeProducerId?: string | null;
  onSelectProducer: (row: TeamScheduleRow, cell?: ScheduleCell) => void;
  className?: string;
};

type DayRow = {
  column: ColumnAggregate;
  entries: { row: TeamScheduleRow; cell: ScheduleCell }[];
};

function DateColumnCell({
  column,
  range,
  previousKey,
}: {
  column: ColumnAggregate;
  range: ScheduleViewRange;
  previousKey?: string;
}) {
  const { top, bottom, title } = formatMatrixDateCell(column, range, previousKey);

  return (
    <div className="leading-none w-full text-center" title={title}>
      <p
        className={clsx(
          "truncate text-[9px] font-medium uppercase tracking-wide",
          column.isToday ? "text-brand-signature" : "text-brand-ink-tertiary"
        )}
      >
        {top}
      </p>
      {bottom ? (
        <p
          className={clsx(
            "mt-0.5 truncate text-[13px] font-semibold tabular-nums",
            column.isToday ? "text-brand-signature" : "text-brand-ink"
          )}
        >
          {bottom}
        </p>
      ) : null}
    </div>
  );
}

function ScheduleCellButton({
  cell,
  range,
  selected,
  onClick,
}: {
  cell: ScheduleCell;
  range: ScheduleViewRange;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${cell.dayLabel} ${cell.dateLabel} · ${statusLabel(cell.status)}`}
      className={clsx(
        "w-full rounded-[3px] transition-colors hover:ring-1 hover:ring-brand-signature/30",
        range === "week" ? "h-5 max-w-[34px]" : "h-3.5 max-w-[26px]",
        cell.unavailable ? "bg-brand-accent" : "bg-brand-line/55",
        selected && "ring-1 ring-brand-signature ring-offset-1 ring-offset-brand-surface"
      )}
      aria-label={`${cell.dayLabel} ${cell.dateLabel}, ${statusLabel(cell.status)}`}
    />
  );
}

export function TeamScheduleMatrix({
  rows,
  columns,
  range,
  activeProducerId,
  onSelectProducer,
  className,
}: TeamScheduleMatrixProps) {
  const dayRows = useMemo<DayRow[]>(
    () =>
      columns.map((column, dayIndex) => ({
        column,
        entries: rows.map((row) => ({
          row,
          cell: row.cells[dayIndex],
        })),
      })),
    [columns, rows]
  );

  const dateColWidth = 96;
  const offColWidth = 84;
  const producerColWidth = 64;
  const teamTotal = rows.length;
  const dayCount = columns.length;

  const producerCount = Math.max(rows.length, 1);

  const matrixWidth =
    dateColWidth + offColWidth + producerCount * producerColWidth;

  const gridTemplateColumns = useMemo(() => {
    if (producerCount === 1) {
      return `${dateColWidth}px ${offColWidth}px minmax(${producerColWidth}px, 1fr)`;
    }

    return `${dateColWidth}px ${offColWidth}px repeat(${producerCount - 1}, ${producerColWidth}px) minmax(${producerColWidth}px, 1fr)`;
  }, [producerCount]);

  const scrollStyle = useMemo(() => {
    const headerRowHeight = range === "week" ? 84 : 76;
    const rowHeight = range === "week" ? 40 : range === "month" ? 36 : 34;
    const contentHeight = headerRowHeight + dayCount * rowHeight;
    const fittedHeight = Math.max(280, Math.min(contentHeight, 720));

    return {
      height: `min(${fittedHeight}px, calc(100dvh - 10.75rem))`,
      minHeight: "280px",
    } as const;
  }, [dayCount, range]);

  return (
    <div
      className={clsx(
        "flex min-h-0 w-fit max-w-full flex-col overflow-hidden rounded-xl border border-brand-line/80 bg-brand-surface shadow-[var(--shadow-premium-sm)]",
        className
      )}
      style={{ width: matrixWidth, ...scrollStyle }}
    >
      <DottedScroll
        className="h-full min-h-0 shrink-0"
        scrollClassName="h-full overflow-y-scroll scrollbar-hide"
        indicatorPlacement="overlay"
        contentClassName="min-w-0"
      >
        <DottedScroll
          orientation="horizontal"
          scrollClassName="w-full overflow-x-scroll scrollbar-hide"
          indicatorPlacement="below"
          contentClassName="w-full min-w-0"
        >
          <div
            className="grid w-full text-[11px]"
            style={{ gridTemplateColumns }}
          >
            <div className="sticky left-0 top-0 z-40 border-b border-r border-brand-line/70 bg-brand-surface/95 px-2 py-2 backdrop-blur-md flex items-center justify-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-brand-ink-tertiary text-center">
                Date
              </p>
            </div>
            <div
              className="sticky top-0 z-40 border-b border-r border-brand-line/70 bg-brand-surface/95 px-1.5 py-2 backdrop-blur-md flex flex-col items-center justify-center text-center"
              style={{ left: dateColWidth }}
            >
              <p className="text-[9px] font-medium uppercase leading-tight tracking-wide text-brand-ink-tertiary">
                Unavailable
              </p>
              <p className="mt-0.5 text-[9px] tabular-nums text-brand-ink-tertiary">
                of {teamTotal}
              </p>
            </div>

            {rows.map((row, index) => {
              const isActive = row.producer.id === activeProducerId;
              const isLast = index === rows.length - 1;
              return (
                <button
                  key={row.producer.id}
                  type="button"
                  onClick={() => onSelectProducer(row)}
                  title={row.producer.name}
                  className={clsx(
                    "sticky top-0 z-30 flex min-w-0 w-full flex-col items-center justify-center gap-1.5 border-b border-r border-brand-line/70 bg-brand-surface/95 px-0.5 py-2.5 backdrop-blur-md transition hover:bg-brand-accent-soft/40",
                    isLast && "border-r-0",
                    isActive && "bg-brand-accent-soft/70"
                  )}
                >
                  <div
                    className={clsx(
                      "rounded-full ring-1 ring-offset-1 ring-offset-brand-surface",
                      isActive ? "ring-brand-signature/50" : "ring-brand-line/70"
                    )}
                  >
                    <Avatar
                      src={row.producer.avatar}
                      alt={row.producer.name}
                      size="md"
                    />
                  </div>
                  <span className="max-w-full truncate text-[10.5px] font-semibold text-brand-ink-secondary">
                    {row.producer.initials}
                  </span>
                </button>
              );
            })}

            {dayRows.map(({ column, entries }, rowIndex) => (
              <Fragment key={column.key}>
                <div
                  className={clsx(
                    "sticky left-0 z-20 border-b border-r border-brand-line/70 px-2 py-1.5",
                    column.isToday ? "bg-brand-signature-soft" : "bg-brand-surface"
                  )}
                >
                  <DateColumnCell
                    column={column}
                    range={range}
                    previousKey={rowIndex > 0 ? dayRows[rowIndex - 1].column.key : undefined}
                  />
                </div>
                <div
                  className={clsx(
                    "sticky z-20 flex items-center border-b border-r border-brand-line/70 px-1.5 py-1.5",
                    column.isToday ? "bg-brand-signature-soft" : "bg-brand-surface"
                  )}
                  style={{ left: dateColWidth }}
                >
                  <p
                    className={clsx(
                      "w-full text-center text-[12px] font-semibold tabular-nums leading-none",
                      column.unavailableCount === 0
                        ? "text-brand-ink-tertiary"
                        : column.unavailableCount === column.total
                          ? "text-brand-ink"
                          : "text-brand-ink-secondary"
                    )}
                    title={`${column.unavailableCount} of ${column.total} unavailable`}
                  >
                    {column.unavailableCount}/{column.total}
                  </p>
                </div>

                {entries.map(({ row, cell }, entryIndex) => {
                  const isActive = row.producer.id === activeProducerId;
                  const isLast = entryIndex === entries.length - 1;
                  return (
                    <div
                      key={`${column.key}-${row.producer.id}`}
                      className={clsx(
                        "flex min-w-0 items-center justify-center border-b border-r border-brand-line/25 px-0.5 py-1",
                        isLast && "border-r-0",
                        column.isToday && "bg-brand-signature-soft",
                        isActive && "bg-brand-accent-soft/25"
                      )}
                    >
                      <ScheduleCellButton
                        cell={cell}
                        range={range}
                        selected={isActive && cell.key === column.key}
                        onClick={() => onSelectProducer(row, cell)}
                      />
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </DottedScroll>
      </DottedScroll>

    </div>
  );
}
