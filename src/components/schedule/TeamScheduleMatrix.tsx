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
  className?: string;
};

type DayRow = {
  column: ColumnAggregate;
  entries: { row: TeamScheduleRow; cell: ScheduleCell }[];
};

const LAYOUT = {
  dateCol: 88,
  offCol: 72,
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
        "mx-auto w-full rounded-md transition-all duration-150 hover:scale-[1.04] hover:ring-1 hover:ring-brand-blue/40",
        isWeek ? "h-6 max-h-8 min-h-5" : "h-3.5",
        cell.unavailable
          ? "bg-gradient-to-b from-brand-blue to-brand-signature shadow-[0_1px_2px_rgba(15,30,45,0.18)]"
          : "bg-white ring-1 ring-inset ring-brand-line/70 hover:bg-brand-blue-soft/40",
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-signature">
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
  className,
}: TeamScheduleMatrixProps) {
  const isWeek = range === "week";
  const showMonthBars = !isWeek;

  const monthGroups = useMemo(
    () => (showMonthBars ? buildMatrixMonthGroups(columns) : []),
    [columns, showMonthBars]
  );

  const groupByStart = useMemo(() => {
    const map = new Map<number, MatrixMonthGroup>();
    for (const group of monthGroups) {
      map.set(group.startIndex, group);
    }
    return map;
  }, [monthGroups]);

  const dayRows = useMemo<DayRow[]>(() => {
    return columns.map((column, dayIndex) => ({
      column,
      entries: rows.map((row) => ({
        row,
        cell: row.cells[dayIndex],
      })),
    }));
  }, [columns, rows]);

  const teamTotal = rows.length;
  const producerCount = Math.max(rows.length, 1);
  const producerCol = LAYOUT.producerCol[range];
  const dayCount = Math.max(columns.length, 1);

  const matrixWidth =
    LAYOUT.dateCol + LAYOUT.offCol + producerCount * producerCol;

  const gridTemplateColumns = useMemo(() => {
    return `${LAYOUT.dateCol}px ${LAYOUT.offCol}px repeat(${producerCount}, minmax(${producerCol}px, 1fr))`;
  }, [producerCount, producerCol]);

  const gridTemplateRows = useMemo(() => {
    if (isWeek) {
      return `${LAYOUT.headerH.week}px repeat(${dayCount}, minmax(0, 1fr))`;
    }
    return `${LAYOUT.headerH[range]}px`;
  }, [dayCount, isWeek, range]);

  const dateStickyLeft = 0;
  const availableStickyLeft = LAYOUT.dateCol;
  const monthBarTop = LAYOUT.headerH[range];
  const monthBarH =
    range === "week" ? 0 : LAYOUT.monthBarH[range];

  const grid = (
    <div
      className={clsx(
        "grid w-full min-w-0 text-[11px]",
        isWeek ? "h-full min-h-0" : "h-auto"
      )}
      style={{
        minWidth: matrixWidth,
        height: isWeek ? "100%" : undefined,
        gridTemplateColumns,
        gridTemplateRows,
        gridAutoRows: isWeek ? undefined : `${LAYOUT.rowH[range]}px`,
      }}
    >
      <div
        className="sticky left-0 top-0 z-40 flex items-center justify-center border-b border-r border-brand-line/60 bg-brand-bg-subtle/95 px-2 py-2 backdrop-blur-md"
      >
        <p className="text-center text-[9px] font-bold uppercase tracking-[0.06em] text-brand-ink-tertiary">
          Date
        </p>
      </div>
      <div
        className="sticky top-0 z-40 flex items-center justify-center border-b border-r border-brand-line/60 bg-brand-bg-subtle/95 px-1.5 py-2 text-center backdrop-blur-md"
        style={{ left: availableStickyLeft }}
      >
        <div className="relative flex w-full flex-col items-center justify-center">
          <p className="text-[9px] font-bold uppercase leading-tight tracking-[0.06em] text-brand-ink-tertiary">
            Available
          </p>
          <p className="absolute top-full mt-0.5 text-[10px] font-semibold tabular-nums text-brand-ink-tertiary">
            out of {teamTotal}
          </p>
        </div>
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
              "sticky top-0 z-30 flex min-h-0 min-w-0 w-full flex-col items-center justify-center gap-1 overflow-visible border-b border-r border-brand-line/60 bg-brand-bg-subtle/95 px-0.5 py-1.5 backdrop-blur-md transition hover:bg-brand-blue-soft/60",
              isLast && "border-r-0",
              isActive && "bg-brand-orange-soft hover:bg-brand-orange-soft"
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
        );
      })}

      {dayRows.map(({ column, entries }, rowIndex) => {
        const monthStart = groupByStart.get(rowIndex);

        return (
          <Fragment key={column.key}>
            {monthStart ? (
              <div
                className="sticky z-[25] flex items-center border border-brand-line/60 bg-brand-bg-subtle/95 px-3 backdrop-blur-md"
                style={{
                  gridColumn: "1 / -1",
                  top: monthBarTop,
                  height: monthBarH,
                  minHeight: monthBarH,
                }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-ink-secondary">
                  {monthStart.label}
                </p>
              </div>
            ) : null}

            <div
              className="sticky left-0 z-20 flex items-center border-b border-r border-brand-line/70 bg-white px-1.5 py-1.5"
              style={{ left: dateStickyLeft }}
            >
              <DateColumnCell column={column} range={range} />
            </div>
            <div
              className="sticky z-20 flex items-center border-b border-r border-brand-line/70 bg-white px-1 py-1.5"
              style={{ left: availableStickyLeft }}
            >
              <p
                className={clsx(
                  "w-full text-center text-[11px] font-semibold tabular-nums leading-none",
                  column.openCount === column.total
                    ? "text-brand-signature"
                    : column.openCount === 0
                      ? "text-brand-orange"
                      : "text-brand-ink-secondary"
                )}
                title={`${column.openCount} of ${column.total} available`}
              >
                {column.openCount}
              </p>
            </div>

            {entries.map(({ row, cell }, entryIndex) => {
              const isActive = row.producer.id === activeProducerId;
              const isLast = entryIndex === entries.length - 1;
              return (
                <div
                  key={`${column.key}-${row.producer.id}`}
                  className={clsx(
                    "group/cell flex min-h-0 min-w-0 items-center justify-center border-b border-r border-brand-line/20 bg-white px-0.5 py-1 transition-colors",
                    isLast && "border-r-0",
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
      })}
    </div>
  );

  return (
    <div
      className={clsx(
        "flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-brand-line/50 bg-white shadow-[var(--shadow-premium-sm)] ring-1 ring-inset ring-brand-line/20",
        className
      )}
      style={{
        width: "100%",
        height: "100%",
        maxHeight: "100%",
        minHeight: 0,
      }}
    >
      {isWeek ? (
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
          {grid}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto scrollbar-hide">{grid}</div>
      )}
    </div>
  );
}
