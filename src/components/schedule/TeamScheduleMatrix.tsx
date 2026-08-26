"use client";

import { Fragment, useMemo } from "react";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { HoverTip } from "@/components/ui/HoverTip";
import {
  buildMatrixMonthGroups,
  formatMatrixDateCell,
  statusLabel,
  type ColumnAggregate,
  type MatrixMonthGroup,
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
  emptyMessage?: string;
  className?: string;
};

type ProducerRow = {
  row: TeamScheduleRow;
  availableCount: number;
  bookingCount: number;
  entries: { column: ColumnAggregate; cell: ScheduleCell }[];
};

const LAYOUT = {
  dateCol: 88,
  statCol: 56,
  monthBarH: {
    month: 28,
    "90days": 26,
  },
  producerCol: {
    week: 58,
    month: 52,
    "90days": 48,
  },
  barMax: {
    week: 48,
    month: 28,
    "90days": 24,
  },
  headerH: {
    week: 88,
    month: 86,
    "90days": 84,
  },
  rowH: {
    week: 34,
    month: 32,
    "90days": 30,
  },
} as const;

function DateColumnCell({
  column,
  range,
}: {
  column: ColumnAggregate;
  range: ScheduleViewRange;
}) {
  const { top, day, title, emphasizeTop } = formatMatrixDateCell(column, range);

  return (
    <div className="w-full text-center leading-none" title={title}>
      <p
        className={clsx(
          "truncate text-[9px] font-medium uppercase tracking-wide",
          emphasizeTop || column.isToday
            ? "text-brand-signature"
            : "text-brand-ink-tertiary"
        )}
      >
        {top}
      </p>
      <p
        className={clsx(
          "mt-0.5 truncate text-[13px] font-semibold tabular-nums",
          column.isToday ? "text-brand-signature" : "text-brand-ink"
        )}
      >
        {day}
      </p>
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
  const isWeek = range === "week";
  const booking = cell.booking;
  const isOff = cell.status === "off";

  const button = (
    <button
      type="button"
      onClick={onClick}
      title={
        booking
          ? undefined
          : `${cell.dayLabel} ${cell.dateLabel} · ${statusLabel(cell.status)}`
      }
      className={clsx(
        "mx-auto w-full rounded-md transition-all duration-150 hover:scale-[1.04] hover:ring-1",
        isWeek ? "h-6 max-h-8 min-h-5" : "h-3.5",
        isOff
          ? "bg-brand-orange/80 shadow-[0_1px_2px_rgba(240,120,64,0.16)] hover:ring-brand-orange/30"
          : cell.unavailable
            ? "bg-gradient-to-b from-brand-blue to-brand-signature shadow-[0_1px_2px_rgba(15,30,45,0.18)] hover:ring-brand-blue/40"
            : "bg-white ring-1 ring-inset ring-brand-line/70 hover:bg-brand-blue-soft/40 hover:ring-brand-blue/40",
        selected &&
          "ring-2 ring-brand-orange ring-offset-1 ring-offset-white"
      )}
      style={{ maxWidth: LAYOUT.barMax[range] }}
      aria-label={
        booking
          ? `${statusLabel(cell.status)}: ${booking.work}, until ${booking.until}`
          : `${cell.dayLabel} ${cell.dateLabel}, ${statusLabel(cell.status)}`
      }
    />
  );

  if (!booking) return button;

  return (
    <HoverTip
      className="w-full justify-center"
      placement="top"
      content={
        <div className="min-w-[160px]">
          <p
            className={clsx(
              "text-[10px] font-semibold uppercase tracking-[0.06em]",
              isOff ? "text-brand-orange" : "text-brand-signature"
            )}
          >
            {statusLabel(cell.status)}
          </p>
          <p className="mt-1 text-[12px] font-medium leading-snug text-brand-ink">
            {booking.work}
          </p>
          <p className="mt-1.5 text-[11px] text-brand-ink-secondary">
            Until {booking.until}
          </p>
        </div>
      }
    >
      {button}
    </HoverTip>
  );
}

export function TeamScheduleMatrix({
  rows,
  columns,
  range,
  activeProducerId,
  onSelectProducer,
  emptyMessage = "No producers in this view.",
  className,
}: TeamScheduleMatrixProps) {
  const isWeek = range === "week";
  const showMonthBars = !isWeek;
  const hasProducers = rows.length > 0;

  const monthGroups = useMemo(
    () => (showMonthBars ? buildMatrixMonthGroups(columns) : []),
    [columns, showMonthBars]
  );

  const producerRows = useMemo<ProducerRow[]>(() => {
    return rows.map((row) => ({
      row,
      availableCount: row.cells.filter((cell) => !cell.unavailable).length,
      bookingCount: row.cells.filter((cell) => cell.unavailable).length,
      entries: columns.map((column, dayIndex) => ({
        column,
        cell: row.cells[dayIndex],
      })),
    }));
  }, [columns, rows]);

  const producerCount = hasProducers ? rows.length : 1;
  const dayCount = Math.max(columns.length, 1);
  const producerLabelCol = LAYOUT.dateCol;
  const statCol = LAYOUT.statCol;
  const dayCol = LAYOUT.producerCol[range];
  const monthBarH = isWeek ? 0 : LAYOUT.monthBarH[range];
  const stickyStatCount = 2;

  const matrixWidth =
    producerLabelCol + statCol * stickyStatCount + dayCount * dayCol;

  const gridTemplateColumns = useMemo(() => {
    return `${producerLabelCol}px ${statCol}px ${statCol}px repeat(${dayCount}, minmax(${dayCol}px, 1fr))`;
  }, [dayCol, dayCount, producerLabelCol, statCol]);

  const gridTemplateRows = useMemo(() => {
    const parts = [`${LAYOUT.headerH[range]}px`];
    if (showMonthBars) {
      parts.push(`${monthBarH}px`);
    }
    parts.push(`repeat(${producerCount}, minmax(0, 1fr))`);
    return parts.join(" ");
  }, [monthBarH, producerCount, range, showMonthBars]);

  const producerStickyLeft = 0;
  const freeStickyLeft = producerLabelCol;
  const bookingsStickyLeft = producerLabelCol + statCol;
  const dateColOffset = 3;
  const bodyGridRow = showMonthBars ? 3 : 2;
  const emptyBodyTop = LAYOUT.headerH[range] + (showMonthBars ? monthBarH : 0);

  const emptyStateOverlay = !hasProducers ? (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-center justify-center px-6"
      style={{ top: emptyBodyTop }}
    >
      <div className="max-w-md text-center">
        <p className="text-[13px] font-semibold text-brand-ink">{emptyMessage}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-brand-ink-tertiary">
          Try another team filter or add a producer with this specialty.
        </p>
      </div>
    </div>
  ) : null;

  const grid = (
    <div
      className="schedule-matrix-grid grid min-h-0 w-full min-w-0 flex-1 text-[11px]"
      style={{
        minWidth: matrixWidth,
        minHeight: "100%",
        height: "100%",
        gridTemplateColumns,
        gridTemplateRows,
      }}
    >
      <div className="schedule-chrome-header sticky left-0 top-0 z-40 flex items-center justify-center border-r border-brand-line/60 px-2 py-2">
        <p className="text-center text-[9px] font-bold uppercase tracking-[0.06em] text-brand-ink-tertiary">
          Producer
        </p>
      </div>
      <div
        className="schedule-chrome-header sticky top-0 z-40 flex items-center justify-center border-r border-brand-line/60 px-1 py-2 text-center"
        style={{ left: freeStickyLeft }}
      >
        <p className="text-[9px] font-bold uppercase leading-tight tracking-[0.06em] text-brand-ink-tertiary">
          Free
        </p>
      </div>
      <div
        className="schedule-chrome-header sticky top-0 z-40 flex items-center justify-center border-r border-brand-line/60 px-1 py-2 text-center"
        style={{ left: bookingsStickyLeft }}
      >
        <p className="text-[9px] font-bold uppercase leading-tight tracking-[0.06em] text-brand-ink-tertiary">
          Booked
        </p>
      </div>

      {columns.map((column, index) => {
        const isLast = index === columns.length - 1;
        return (
          <div
            key={column.key}
            className={clsx(
              "schedule-chrome-header sticky top-0 z-30 flex items-center justify-center border-r border-brand-line/60 px-1 py-2",
              isLast && "border-r-0"
            )}
          >
            <DateColumnCell column={column} range={range} />
          </div>
        );
      })}

      {showMonthBars ? (
        <>
          <div className="sticky left-0 z-20 border-b border-r border-brand-line/60 bg-brand-bg-subtle/95" />
          <div
            className="sticky z-20 border-b border-r border-brand-line/60 bg-brand-bg-subtle/95"
            style={{ left: freeStickyLeft }}
          />
          <div
            className="sticky z-20 border-b border-r border-brand-line/60 bg-brand-bg-subtle/95"
            style={{ left: bookingsStickyLeft }}
          />
          {monthGroups.map((group) => (
            <div
              key={group.key}
              className="sticky z-[25] flex items-center border-b border-r border-brand-line/60 bg-brand-bg-subtle/95 px-3"
              style={{
                gridColumn: `${group.startIndex + dateColOffset + 1} / span ${group.rowCount}`,
                top: LAYOUT.headerH[range],
                height: monthBarH,
                minHeight: monthBarH,
              }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-ink-secondary">
                {group.label}
              </p>
            </div>
          ))}
        </>
      ) : null}

      {!hasProducers ? (
        <>
          <div
            className="sticky left-0 z-20 h-full min-h-0 self-stretch border-b border-r border-brand-line/60 bg-white"
            style={{ gridRow: bodyGridRow }}
          />
          <div
            className="sticky z-20 h-full min-h-0 self-stretch border-b border-r border-brand-line/60 bg-white"
            style={{ left: freeStickyLeft, gridRow: bodyGridRow }}
          />
          <div
            className="sticky z-20 h-full min-h-0 self-stretch border-b border-r border-brand-line/60 bg-white"
            style={{ left: bookingsStickyLeft, gridRow: bodyGridRow }}
          />
          {columns.map((column, index) => {
            const isLast = index === columns.length - 1;
            return (
              <div
                key={column.key}
                className={clsx(
                  "h-full min-h-0 self-stretch border-b border-r border-brand-line/20 bg-white",
                  isLast && "border-r-0"
                )}
                style={{ gridRow: bodyGridRow }}
              />
            );
          })}
        </>
      ) : null}

      {hasProducers
        ? producerRows.map(({ row, availableCount, bookingCount, entries }, rowIndex) => {
        const isActive = row.producer.id === activeProducerId;
        const isLastRow = rowIndex === producerRows.length - 1;

        return (
          <Fragment key={row.producer.id}>
            <button
              type="button"
              onClick={() => onSelectProducer(row)}
              title={row.producer.name}
              className={clsx(
                "sticky left-0 z-20 flex h-full min-h-0 min-w-0 w-full flex-col items-center justify-center gap-1 self-stretch overflow-visible border-b border-r border-brand-line/60 bg-white px-0.5 py-1.5 transition hover:bg-brand-blue-soft/30",
                isLastRow && "border-b-0",
                isActive && "bg-brand-orange-soft/40 hover:bg-brand-orange-soft/40"
              )}
            >
              <div
                className={clsx(
                  "shrink-0 rounded-full ring-1 ring-offset-1 ring-offset-white",
                  isActive ? "ring-brand-orange/60" : "ring-brand-blue/30"
                )}
              >
                <Avatar
                  src={row.producer.avatar}
                  alt={row.producer.name}
                  size="sm"
                />
              </div>
              <span
                className={clsx(
                  "max-w-full shrink-0 truncate text-[10px] font-bold leading-none",
                  isActive ? "text-brand-orange-deep" : "text-brand-ink-secondary"
                )}
              >
                {row.producer.initials}
              </span>
            </button>

            <div
              className={clsx(
                "sticky z-20 flex h-full min-h-0 items-center self-stretch border-b border-r border-brand-line/70 bg-white px-1 py-1.5",
                isLastRow && "border-b-0"
              )}
              style={{ left: freeStickyLeft }}
            >
              <p
                className={clsx(
                  "w-full text-center text-[11px] font-medium tabular-nums leading-none",
                  availableCount === columns.length
                    ? "text-brand-signature"
                    : availableCount === 0
                      ? "text-brand-orange"
                      : "text-brand-ink-secondary"
                )}
                title={`${availableCount} free days in view`}
              >
                {availableCount}
              </p>
            </div>

            <div
              className={clsx(
                "sticky z-20 flex h-full min-h-0 items-center self-stretch border-b border-r border-brand-line/70 bg-white px-1 py-1.5",
                isLastRow && "border-b-0"
              )}
              style={{ left: bookingsStickyLeft }}
            >
              <p
                className={clsx(
                  "w-full text-center text-[11px] tabular-nums leading-none",
                  bookingCount === 0
                    ? "text-brand-ink-tertiary"
                    : "text-brand-orange"
                )}
                title={`${bookingCount} bookings in view`}
              >
                {bookingCount}
              </p>
            </div>

            {entries.map(({ column, cell }, entryIndex) => {
              const isLastCol = entryIndex === entries.length - 1;
              return (
                <div
                  key={`${row.producer.id}-${column.key}`}
                  className={clsx(
                    "group/cell flex h-full min-h-0 min-w-0 items-center justify-center self-stretch border-b border-r border-brand-line/20 bg-white px-0.5 py-1 transition-colors",
                    isLastRow && "border-b-0",
                    isLastCol && "border-r-0",
                    isActive
                      ? "bg-brand-orange-soft/40"
                      : "hover:bg-brand-blue-soft/25"
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
        );
      })
        : null}
    </div>
  );

  return (
    <div
      className={clsx(
        "dashboard-panel dashboard-panel-framed flex h-full min-h-0 w-full flex-col overflow-hidden",
        className
      )}
      style={{
        width: "100%",
        height: "100%",
        maxHeight: "100%",
        minHeight: 0,
      }}
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-hidden">
        {grid}
        {emptyStateOverlay}
      </div>
    </div>
  );
}
