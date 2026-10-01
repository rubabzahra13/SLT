"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { HoverTip } from "@/components/ui/HoverTip";
import {
  buildMatrixMonthGroups,
  formatMatrixDateCell,
  statusLabel,
  type CellBooking,
  type ColumnAggregate,
  type MatrixMonthGroup,
  type ScheduleCell,
  type ScheduleStatusFilter,
  type ScheduleViewRange,
  type TeamScheduleRow,
} from "@/lib/schedule-view";

type TeamScheduleMatrixProps = {
  rows: TeamScheduleRow[];
  columns: ColumnAggregate[];
  range: ScheduleViewRange;
  statusFilter?: ScheduleStatusFilter;
  activeProducerId?: string | null;
  onSelectProducer: (row: TeamScheduleRow, cell?: ScheduleCell) => void;
  emptyMessage?: string;
  className?: string;
};

type ProducerRow = {
  row: TeamScheduleRow;
  availableCount: number;
  bookingCount: number;
  offCount: number;
  nonworkCount: number;
  entries: { column: ColumnAggregate; cell: ScheduleCell }[];
};

const LAYOUT = {
  dateCol: 88,
  statCol: 56,
  monthBarH: {
    today: 28,
    month: 28,
    "90days": 26,
    "6months": 26,
  },
  producerCol: {
    today: 58,
    week: 58,
    month: 54,
    "90days": 52,
    "6months": 48,
  },
  barMax: {
    today: 48,
    week: 48,
    month: 34,
    "90days": 34,
    "6months": 30,
  },
  headerH: {
    today: 88,
    week: 88,
    month: 86,
    "90days": 84,
    "6months": 84,
  },
  rowH: {
    today: 58,
    week: 58,
    month: 58,
    "90days": 58,
    "6months": 58,
  },
} as const;

function scheduleStatusTooltipTone(status: ScheduleCell["status"]) {
  if (status === "off") return "text-brand-orange";
  if (status === "nonwork") return "text-brand-orange";
  if (status === "capacity") return "text-amber-600";
  return "text-brand-signature";
}

function BookingTooltipContent({
  cell,
  booking,
  index,
  total,
}: {
  cell: ScheduleCell;
  booking: CellBooking;
  index?: number;
  total?: number;
}) {
  return (
    <>
      <p
        className={clsx(
          "text-[10px] font-semibold uppercase tracking-[0.06em]",
          scheduleStatusTooltipTone(cell.status)
        )}
      >
        {statusLabel(cell.status)}
        {total && total > 1 && index != null ? ` (#${index + 1})` : ""}
      </p>
      <p className="mt-1 text-[12px] font-medium leading-snug text-brand-ink">{booking.work}</p>
      <p className="mt-1.5 text-[11px] text-brand-ink-secondary">Until {booking.until}</p>
    </>
  );
}

function MultiBookingTooltipContent({
  cell,
  bookings,
}: {
  cell: ScheduleCell;
  bookings: CellBooking[];
}) {
  return (
    <div className="min-w-[180px]">
      <p
        className={clsx(
          "text-[10px] font-semibold uppercase tracking-[0.06em]",
          scheduleStatusTooltipTone(cell.status)
        )}
      >
        {statusLabel(cell.status)} · {bookings.length} mixes
      </p>
      <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
        {bookings.map((booking, index) => (
          <div
            key={booking.mixId ?? `${cell.key}-${index}`}
            className="rounded-lg border border-brand-line/60 bg-brand-surface/80 px-2.5 py-2"
          >
            <BookingTooltipContent
              cell={cell}
              booking={booking}
              index={index}
              total={bookings.length}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function DateColumnCell({
  column,
  range,
}: {
  column: ColumnAggregate;
  range: ScheduleViewRange;
}) {
  const { top, day, title, emphasizeTop, weekday } = formatMatrixDateCell(
    column,
    range
  );

  return (
    <div className="w-full text-center leading-none" title={title}>
      <p
        className={clsx(
          "truncate text-[9px] font-medium uppercase tracking-wide",
          emphasizeTop || column.isToday
            ? "!text-brand-signature"
            : "text-brand-ink-tertiary"
        )}
      >
        {top}
      </p>
      {column.isToday && weekday ? (
        <p className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-wide !text-brand-ink-secondary">
          {weekday}
        </p>
      ) : null}
      {column.isToday ? (
        <p
          className="mt-1 inline-flex max-w-full items-center justify-center rounded-md bg-brand-signature px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
          style={{ color: "#fff", textShadow: "none" }}
        >
          <span className="truncate" style={{ color: "#fff" }}>
            {day}
          </span>
        </p>
      ) : (
        <p className="mt-0.5 truncate text-[13px] font-semibold tabular-nums text-brand-ink">
          {day}
        </p>
      )}
    </div>
  );
}

function scheduleCellBarHeightClass(
  range: ScheduleViewRange,
  stretchRows = false
) {
  if (stretchRows && (range === "week" || range === "today")) {
    return "h-8 max-h-14 min-h-6";
  }
  if (range === "week" || range === "today") return "h-6 max-h-8 min-h-5";
  return "h-5 min-h-[18px]";
}

function scheduleCellBarClass(
  cell: ScheduleCell,
  range: ScheduleViewRange,
  stretchRows = false
) {
  return clsx(
    "mx-auto flex w-full items-center justify-center rounded-md transition-all duration-150 hover:scale-[1.04] hover:ring-1",
    scheduleCellBarHeightClass(range, stretchRows),
    cell.status === "off"
      ? "bg-brand-orange/80 shadow-[0_1px_2px_rgba(240,120,64,0.16)] hover:ring-brand-orange/30"
      : cell.status === "nonwork"
        ? "ring-1 ring-inset ring-brand-orange shadow-[0_1px_2px_rgba(240,120,64,0.12)] hover:ring-brand-orange"
        : cell.status === "capacity"
          ? "bg-amber-400/85 shadow-[0_1px_2px_rgba(245,158,11,0.20)] hover:ring-amber-400/40"
          : cell.status === "mix"
            ? "bg-gradient-to-b from-brand-blue to-brand-signature shadow-[0_1px_2px_rgba(15,30,45,0.18)] hover:ring-brand-blue/40"
            : "bg-cyan-50/80 ring-1 ring-inset ring-cyan-400/60 shadow-[0_1px_2px_rgba(6,182,212,0.12)] hover:bg-cyan-100 hover:ring-cyan-500/70"
  );
}

function scheduleCellCountClass(
  status: ScheduleCell["status"],
  range: ScheduleViewRange
) {
  const sizeClass =
    range === "week" || range === "today" ? "text-[11px]" : "text-[10px]";

  return clsx(
    "pointer-events-none font-semibold tabular-nums leading-none",
    sizeClass,
    status === "available"
      ? "text-brand-signature"
      : status === "capacity"
        ? "text-amber-950"
        : "text-white"
  );
}

function ScheduleCellButton({
  cell,
  range,
  selected,
  stretchRows = false,
  onClick,
}: {
  cell: ScheduleCell;
  range: ScheduleViewRange;
  selected?: boolean;
  stretchRows?: boolean;
  onClick: () => void;
}) {
  if (cell.filteredOut) {
    return <span className="block w-full" aria-hidden />;
  }

  const bookings = cell.bookings ?? (cell.booking ? [cell.booking] : []);
  const booking = bookings[0] ?? cell.booking;
  const showCount = bookings.length > 1;

  const wrapWithTooltip = (node: React.ReactNode, content: React.ReactNode) => (
    <HoverTip className="w-full justify-center" placement="top" content={content}>
      {node}
    </HoverTip>
  );

  const selectedRing =
    selected && "ring-2 ring-brand-orange ring-offset-1 ring-offset-white";

  const button = (
    <button
      type="button"
      onClick={onClick}
      title={
        booking && !showCount
          ? undefined
          : cell.status === "off" || (cell.status === "available" && cell.isOvertime)
            ? undefined
            : `${cell.dayLabel} ${cell.dateLabel} · ${statusLabel(cell.status)}`
      }
      className={clsx(
        scheduleCellBarClass(cell, range, stretchRows),
        selectedRing
      )}
      style={{
        maxWidth: stretchRows ? Math.min(LAYOUT.barMax[range] * 1.35, 72) : LAYOUT.barMax[range],
        ...(cell.status === "nonwork" ? { backgroundColor: "#fff1e8" } : null),
      }}
      aria-label={
        showCount
          ? `${statusLabel(cell.status)}: ${bookings.length} mixes on ${cell.dayLabel}, ${cell.dateLabel}`
          : booking
            ? `${statusLabel(cell.status)}: ${booking.work}, until ${booking.until}`
            : cell.status === "off" && cell.offDetail
              ? `${cell.dayLabel} ${cell.dateLabel}, Off, ${cell.offDetail}`
              : `${cell.dayLabel} ${cell.dateLabel}, ${statusLabel(cell.status)}`
      }
    >
      {showCount ? (
        <span className={scheduleCellCountClass(cell.status, range)}>
          {bookings.length}
        </span>
      ) : null}
    </button>
  );

  if (showCount) {
    return wrapWithTooltip(
      button,
      <MultiBookingTooltipContent cell={cell} bookings={bookings} />
    );
  }

  if (!booking) {
    if (cell.status === "off") {
      return wrapWithTooltip(
        button,
        <div className="min-w-[140px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-orange">
            Off
          </p>
          <p className="mt-1 text-[12px] font-medium leading-snug text-brand-ink">
            {cell.offDetail ?? "Unavailable"}
          </p>
          <p className="mt-1 text-[11px] text-brand-ink-secondary">
            {cell.dayLabel}, {cell.dateLabel}
          </p>
        </div>
      );
    }
    if (cell.status === "available" && cell.isOvertime) {
      return wrapWithTooltip(
        button,
        <div className="min-w-[140px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-signature">
            Available
          </p>
          <p className="mt-1 text-[12px] font-medium leading-snug text-brand-ink">
            Overtime day
          </p>
          <p className="mt-1 text-[11px] text-brand-ink-secondary">
            {cell.dayLabel}, {cell.dateLabel}
          </p>
        </div>
      );
    }
    return button;
  }

  return wrapWithTooltip(
    button,
    <div className="min-w-[160px]">
      <BookingTooltipContent cell={cell} booking={booking} />
    </div>
  );
}

export function TeamScheduleMatrix({
  rows,
  columns,
  range,
  statusFilter = "all",
  activeProducerId,
  onSelectProducer,
  emptyMessage = "No producers in this view.",
  className,
}: TeamScheduleMatrixProps) {
  const isWeek = range === "week";
  const showMonthBars = !isWeek;
  const showStatColumns = statusFilter === "all";
  const hasProducers = rows.length > 0;

  const monthGroups = useMemo(
    () => (showMonthBars ? buildMatrixMonthGroups(columns) : []),
    [columns, showMonthBars]
  );

  const producerRows = useMemo<ProducerRow[]>(() => {
    return rows.map((row) => ({
      row,
      availableCount: row.cells.filter(
        (cell) => !cell.filteredOut && cell.status === "available"
      ).length,
      bookingCount: row.cells.filter(
        (cell) =>
          !cell.filteredOut &&
          (cell.status === "mix" || cell.status === "capacity")
      ).length,
      offCount: row.cells.filter(
        (cell) => !cell.filteredOut && cell.status === "off"
      ).length,
      nonworkCount: row.cells.filter(
        (cell) => !cell.filteredOut && cell.status === "nonwork"
      ).length,
      entries: columns.map((column) => ({
        column,
        cell:
          row.cells.find((cell) => cell.key === column.key) ??
          row.cells[columns.indexOf(column)],
      })),
    }));
  }, [columns, rows]);

  const producerCount = rows.length;
  const shouldStretchRows = producerCount > 2;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !shouldStretchRows) {
      setContainerHeight(null);
      return;
    }

    const updateHeight = () => setContainerHeight(el.clientHeight);
    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(el);
    window.addEventListener("resize", updateHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, [shouldStretchRows, producerCount, columns.length, showStatColumns]);

  const dayCount = Math.max(columns.length, 1);
  const producerLabelCol = LAYOUT.dateCol;
  const statCol = LAYOUT.statCol;
  const dayCol = LAYOUT.producerCol[range];
  const monthBarH = isWeek ? 0 : LAYOUT.monthBarH[range];
  const stickyStatCount = showStatColumns ? 4 : 0;
  const dateColOffset = showStatColumns ? 5 : 1;

  const matrixWidth =
    producerLabelCol +
    statCol * stickyStatCount +
    dayCount * dayCol;

  const gridTemplateColumns = useMemo(() => {
    const statCols = showStatColumns
      ? `${statCol}px ${statCol}px ${statCol}px ${statCol}px `
      : "";
    return `${producerLabelCol}px ${statCols}repeat(${dayCount}, minmax(${dayCol}px, 1fr))`;
  }, [dayCol, dayCount, producerLabelCol, showStatColumns, statCol]);

  const gridTemplateRows = useMemo(() => {
    const parts = [`${LAYOUT.headerH[range]}px`];
    if (showMonthBars) {
      parts.push(`${monthBarH}px`);
    }
    if (producerCount > 0) {
      const minRowHeight = LAYOUT.rowH[range] as number;
      let rowHeight: number = minRowHeight;

      if (shouldStretchRows && containerHeight != null) {
        const chromeHeight = LAYOUT.headerH[range] + (showMonthBars ? monthBarH : 0);
        const available = containerHeight - chromeHeight;
        rowHeight = Math.max(minRowHeight, Math.floor(available / producerCount));
      }

      parts.push(`repeat(${producerCount}, ${rowHeight}px)`);
    }
    return parts.join(" ");
  }, [
    containerHeight,
    monthBarH,
    producerCount,
    range,
    showMonthBars,
    shouldStretchRows,
  ]);

  const producerStickyLeft = 0;
  const freeStickyLeft = producerLabelCol;
  const bookedStickyLeft = producerLabelCol + statCol;
  const offStickyLeft = producerLabelCol + statCol * 2;
  const nonworkStickyLeft = producerLabelCol + statCol * 3;
  const bodyGridRow = showMonthBars ? 3 : 2;

  const grid = (
    <div
      className="schedule-matrix-grid grid w-full min-w-0 text-[11px]"
      style={{
        minWidth: matrixWidth,
        gridTemplateColumns,
        gridTemplateRows,
        ...(shouldStretchRows && containerHeight != null
          ? { minHeight: containerHeight }
          : {}),
      }}
    >
      <div className="schedule-chrome-header sticky left-0 top-0 z-40 flex items-center justify-center border-r border-brand-line/60 px-2 py-2">
        <p className="text-center text-[9px] font-bold uppercase tracking-[0.06em] text-brand-ink-tertiary">
          Producer
        </p>
      </div>
      {showStatColumns ? (
        <>
          <div
            className="schedule-chrome-header sticky top-0 z-40 flex items-center justify-center border-r border-brand-line/60 px-1 py-2 text-center"
            style={{ left: freeStickyLeft }}
          >
            <p className="text-[9px] font-bold uppercase leading-tight tracking-[0.06em] text-brand-ink-tertiary">
              Days
              <br />
              Free
            </p>
          </div>
          <div
            className="schedule-chrome-header sticky top-0 z-40 flex items-center justify-center border-r border-brand-line/60 px-1 py-2 text-center"
            style={{ left: bookedStickyLeft }}
          >
            <p className="text-[9px] font-bold uppercase leading-tight tracking-[0.06em] text-brand-ink-tertiary">
              Days
              <br />
              Booked
            </p>
          </div>
          <div
            className="schedule-chrome-header sticky top-0 z-40 flex items-center justify-center border-r border-brand-line/60 px-1 py-2 text-center"
            style={{ left: offStickyLeft }}
          >
            <p className="text-[9px] font-bold uppercase leading-tight tracking-[0.06em] text-brand-ink-tertiary">
              Days
              <br />
              Off
            </p>
          </div>
          <div
            className="schedule-chrome-header sticky top-0 z-40 flex items-center justify-center border-r border-brand-line/60 px-1 py-2 text-center"
            style={{ left: nonworkStickyLeft }}
          >
            <p className="text-[9px] font-bold uppercase leading-tight tracking-[0.06em] text-brand-ink-tertiary">
              Non-work
              <br />
              Days
            </p>
          </div>
        </>
      ) : null}

      {columns.map((column, index) => {
        const isLast = index === columns.length - 1;
        return (
          <div
            key={column.key}
            className={clsx(
              "schedule-chrome-header sticky top-0 z-30 flex items-center justify-center border-r border-brand-line/60 px-1 py-2",
              column.isToday && "!bg-brand-blue-soft",
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
          {showStatColumns ? (
            <>
              <div
                className="sticky z-20 border-b border-r border-brand-line/60 bg-brand-bg-subtle/95"
                style={{ left: freeStickyLeft }}
              />
              <div
                className="sticky z-20 border-b border-r border-brand-line/60 bg-brand-bg-subtle/95"
                style={{ left: bookedStickyLeft }}
              />
              <div
                className="sticky z-20 border-b border-r border-brand-line/60 bg-brand-bg-subtle/95"
                style={{ left: offStickyLeft }}
              />
              <div
                className="sticky z-20 border-b border-r border-brand-line/60 bg-brand-bg-subtle/95"
                style={{ left: nonworkStickyLeft }}
              />
            </>
          ) : null}
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

      {producerRows.map(({ row, availableCount, bookingCount, offCount, nonworkCount, entries }, rowIndex) => {
        const isActive = row.producer.id === activeProducerId;
        const isLastRow = rowIndex === producerRows.length - 1;

        return (
          <Fragment key={row.producer.id}>
            <button
              type="button"
              onClick={() => onSelectProducer(row)}
              aria-label={row.producer.name}
              className={clsx(
                "sticky left-0 z-20 flex h-full min-h-0 min-w-0 w-full items-center justify-center self-stretch overflow-hidden border-b border-r border-brand-line/60 bg-white px-0.5 py-1.5 transition hover:bg-brand-blue-soft/30",
                isLastRow && "border-b-0",
                isActive && "bg-brand-orange-soft/40 hover:bg-brand-orange-soft/40"
              )}
            >
              <HoverTip
                className="flex justify-center"
                placement="right"
                label={row.producer.name}
              >
                <div
                  className={clsx(
                    "shrink-0 rounded-full ring-1 ring-inset ring-offset-0",
                    isActive ? "ring-brand-orange/60" : "ring-brand-blue/30"
                  )}
                >
                  <Avatar
                    producer={row.producer}
                    name={row.producer.name}
                    size="sm"
                  />
                </div>
              </HoverTip>
            </button>

            {showStatColumns ? (
              <>
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
                  style={{ left: bookedStickyLeft }}
                >
                  <p
                    className="w-full text-center text-[11px] tabular-nums leading-none text-brand-signature"
                    title={`${bookingCount} booked days in view`}
                  >
                    {bookingCount}
                  </p>
                </div>

                <div
                  className={clsx(
                    "sticky z-20 flex h-full min-h-0 items-center self-stretch border-b border-r border-brand-line/70 bg-white px-1 py-1.5",
                    isLastRow && "border-b-0"
                  )}
                  style={{ left: offStickyLeft }}
                >
                  <p
                    className="w-full text-center text-[11px] tabular-nums leading-none text-brand-orange-deep"
                    title={`${offCount} off days in view`}
                  >
                    {offCount}
                  </p>
                </div>

                <div
                  className={clsx(
                    "sticky z-20 flex h-full min-h-0 items-center self-stretch border-b border-r border-brand-line/70 bg-white px-1 py-1.5",
                    isLastRow && "border-b-0"
                  )}
                  style={{ left: nonworkStickyLeft }}
                >
                  <p
                    className="w-full text-center text-[11px] tabular-nums leading-none text-brand-orange"
                    title={`${nonworkCount} non-work days in view`}
                  >
                    {nonworkCount}
                  </p>
                </div>
              </>
            ) : null}

            {entries.map(({ column, cell }, entryIndex) => {
              const isLastCol = entryIndex === entries.length - 1;
              return (
                <div
                  key={`${row.producer.id}-${column.key}`}
                  className={clsx(
                    "group/cell flex h-full min-h-0 min-w-0 items-center justify-center self-stretch border-b border-r border-brand-line/35 px-0.5 py-1 transition-colors",
                    isLastRow && "border-b-0",
                    isLastCol && "border-r-0",
                    isActive
                      ? "bg-brand-orange-soft/40"
                      : column.isToday
                        ? "bg-brand-blue-soft hover:bg-brand-blue-soft/80"
                        : "bg-white hover:bg-brand-blue-soft/25"
                  )}
                >
                  <ScheduleCellButton
                    cell={cell}
                    range={range}
                    stretchRows={shouldStretchRows}
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
      <div
        ref={scrollRef}
        className={clsx(
          "relative flex min-h-0 flex-1 flex-col overflow-auto",
          shouldStretchRows && hasProducers && "overflow-x-auto"
        )}
      >
        {hasProducers ? (
          grid
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 py-12">
            <div className="max-w-md text-center">
              <p className="text-[13px] font-semibold text-brand-ink">{emptyMessage}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-brand-ink-tertiary">
                Try another team filter or add a producer with this specialty.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
