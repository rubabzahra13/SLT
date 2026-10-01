import type { MTDRecord, Producer, ScheduleEntry } from "@/types";
import { parseFlexibleDate } from "@/lib/dates";
import {
  isProducerAtDailyCapacity,
  isProducerOnTimeOff,
  isProducerOvertimeDay,
  isProducerWorkDay,
} from "@/lib/producer-availability";
import { isEligibleProducerScheduleRecord } from "@/lib/export-csv";
import type { StudioHoliday } from "@/lib/producer-time-off";
import { studioHolidayNamesForIso } from "@/lib/producer-time-off";

export type ScheduleViewRange = "today" | "week" | "month" | "90days" | "6months";

/** Send Schedule period: complete = all ongoing mixes (no date window). */
export type ScheduleSendPeriod =
  | "complete"
  | Exclude<ScheduleViewRange, "today">;

export type CellBooking = {
  work: string;
  until: string;
  mixId?: string;
  status?: string;
};

export type ScheduleCell = {
  key: string;
  date: Date;
  dayLabel: string;
  dateLabel: string;
  /** "capacity" = producer has reached their daily mix or cost limit.
   *  "nonwork" = outside regular workDays and not an overtime date.
   *  "off" = time off on a regular work day. */
  status: "available" | "mix" | "off" | "capacity" | "nonwork";
  unavailable: boolean;
  booking?: CellBooking | null;
  bookings?: CellBooking[];
  /** Leave reason and/or holiday name when status is "off". */
  offDetail?: string;
  /** True when this day is an overtime date (not a regular work weekday). */
  isOvertime?: boolean;
  /** Hidden when a status filter is active and this day does not match. */
  filteredOut?: boolean;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function producerScheduleId(producer: Producer): string {
  return producer.name.toUpperCase();
}

export function parseToDate(date: any): Date {
  if (!date) return new Date();
  if (date instanceof Date) {
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }
  if (typeof date === "string") {
    const flex = parseFlexibleDate(date);
    if (flex && !Number.isNaN(flex.getTime())) return flex;
  }
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function formatLegacyDay(date: any): string {
  const d = parseToDate(date);
  return `${DAY_NAMES[d.getDay()]} ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

/** Leave reason and/or public holiday name for an Off day. */
export function describeScheduleOffDetail(
  producer: Producer,
  date: Date,
  studioHolidays?: StudioHoliday[]
): string | undefined {
  const dayIso = toLocalIsoDate(date);
  const parts: string[] = [];

  for (const name of studioHolidayNamesForIso(
    dayIso,
    studioHolidays ?? [],
    producer.id
  )) {
    if (!parts.includes(name)) parts.push(name);
  }

  for (const entry of producer.timeOff ?? []) {
    if (dayIso < entry.startDate || dayIso > entry.endDate) continue;
    const reason = (entry.reason || "").trim() || "Personal leave";
    if (!parts.includes(reason)) parts.push(reason);
  }

  if (parts.length > 0) return parts.join(", ");
  if (producer.status === "unavailable") return "Unavailable";
  return undefined;
}

/**
 * Determines a producer's cell status for a given date.
 *
 * Priority:
 * 1. Legacy `schedule` entry (explicit day-level override, e.g. from a future
 *    db-backed producer availability table).
 * 2. Producer record status: "unavailable" → "off".
 * 3. Weekends: "off" (producers generally don't work weekends by default).
 * 4. All other cases: "available".
 *
 * NOTE: We deliberately do NOT randomly generate "mix" statuses here.
 * A cell is marked "mix" only when `coveringAssignments()` finds a real
 * eligible MTD record (Ongoing + assigned + valid dates) covering that date.
 * Random/hash-based "mix" generation was removed because it produced phantom
 * bookings that had no backing database record.
 */
function inferStatus(
  producer: Producer,
  date: Date,
  scheduleByDay: Map<string, ScheduleEntry>,
  studioHolidays?: StudioHoliday[]
): ScheduleCell["status"] {
  const legacy = formatLegacyDay(date);
  const entry = scheduleByDay.get(legacy);
  // Only honour explicit "off" or "available" overrides from the legacy table.
  // Ignore legacy "mix" entries — those referred to old demo mixes that no
  // longer exist in the database.
  if (entry && (entry.status === "off" || entry.status === "available")) {
    return entry.status;
  }

  // Time off / studio holidays only apply on regular work days. Overtime days are cancelled
  // via removing the overtime date — not by adding time off.
  if (
    isProducerWorkDay(producer, date) &&
    isProducerOnTimeOff(producer, date, studioHolidays)
  ) {
    return "off";
  }

  if (isProducerWorkDay(producer, date) || isProducerOvertimeDay(producer, date)) {
    if (producer.status === "unavailable") return "off";
    return "available";
  }

  return "nonwork";
}

function addDays(date: any, days: number): Date {
  const next = new Date(parseToDate(date));
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + days);
  return next;
}

function toLocalIsoDate(date: any): string {
  const d = parseToDate(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(date: any): string {
  const d = parseToDate(date);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function producerMatchesAssignment(producer: Producer, assigned: string): boolean {
  const key = assigned.trim().toUpperCase();
  return (
    key === producer.name.toUpperCase() ||
    key === producer.initials.toUpperCase() ||
    key === producerScheduleId(producer)
  );
}

/**
 * Returns all MTD records assigned to this producer that are eligible to
 * appear in the Schedule view.
 *
 * Eligibility (mirrors isEligibleProducerScheduleRecord):
 *   - Has an assigned producer matching this producer
 *   - Status is Ongoing (not Waiting for Data, Outsourced, Completed)
 *   - Has a valid Mix Start Date
 *   - Has a valid Mix End Date
 *   - Not in payroll / completed
 */
function producerAssignments(
  producer: Producer,
  mtdRecords: MTDRecord[]
): MTDRecord[] {
  return mtdRecords.filter(
    (rec) =>
      rec.assignedProducer &&
      producerMatchesAssignment(producer, rec.assignedProducer) &&
      isEligibleProducerScheduleRecord(rec)
  );
}

function coveringAssignments(date: Date, assignments: MTDRecord[]): MTDRecord[] {
  return assignments.filter((rec) => {
    const start = parseFlexibleDate(rec.mixStartDate);
    const end = parseFlexibleDate(rec.mixEndDate);
    if (!start) return false;
    const day = new Date(date);
    day.setHours(12, 0, 0, 0);
    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);
    if (day < startDay) return false;
    if (end) {
      const endDay = new Date(end);
      endDay.setHours(23, 59, 59, 999);
      return day <= endDay;
    }
    return day.getTime() - startDay.getTime() <= 7 * 86400000;
  });
}

function bookingsFromAssignments(date: Date, records: MTDRecord[]): CellBooking[] {
  return records.map((pick) => {
    const untilDate =
      parseFlexibleDate(pick.mixEndDate) ??
      addDays(parseFlexibleDate(pick.mixStartDate) ?? date, 3);
    return {
      work: pick.programName,
      until: formatDisplayDate(untilDate),
      mixId: pick.id,
      status: pick.status,
    };
  });
}

function resolveBookings(
  producer: Producer,
  date: Date,
  status: ScheduleCell["status"],
  assignments: MTDRecord[]
): CellBooking[] {
  const covering = coveringAssignments(date, assignments);

  if (status === "available") return [];

  if (status === "off") {
    return [
      {
        work: "Time off",
        until: formatDisplayDate(date),
      },
    ];
  }

  if (status === "nonwork") {
    return [
      {
        work: "Not working",
        until: formatDisplayDate(date),
      },
    ];
  }

  if (covering.length > 0) {
    return bookingsFromAssignments(date, covering);
  }

  // No real assignments cover this date — return empty (no phantom bookings).
  return [];
}

function resolveBooking(
  producer: Producer,
  date: Date,
  status: ScheduleCell["status"],
  assignments: MTDRecord[]
): CellBooking | null {
  const bookings = resolveBookings(producer, date, status, assignments);
  return bookings[0] ?? null;
}

function startOfCalendarWeek(date: any): Date {
  const start = new Date(parseToDate(date));
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function buildDateRange(range: ScheduleViewRange, anchor: any): Date[] {
  const today = new Date(parseToDate(anchor));
  today.setHours(0, 0, 0, 0);

  if (range === "today") {
    return [today];
  }

  if (range === "week") {
    const start = startOfCalendarWeek(today);
    const dates: Date[] = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d);
    }
    return dates;
  }

  if (range === "month") {
    return enumerateCalendarMonth(today.getFullYear(), today.getMonth());
  }

  if (range === "90days") {
    const end = new Date(today);
    end.setDate(today.getDate() + 89);
    return enumerateDays(today, end);
  }

  // Six full calendar months starting with the current month (28–31 days each).
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const endMonth = new Date(today.getFullYear(), today.getMonth() + 6, 0);
  return enumerateDays(start, endMonth);
}

function enumerateCalendarMonth(year: number, monthIndex: number): Date[] {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  return enumerateDays(start, end);
}

function enumerateDays(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= last.getTime()) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function getScheduleCells(
  producer: Producer,
  schedule: ScheduleEntry[],
  range: ScheduleViewRange,
  anchorDate = new Date(),
  mtdRecords: MTDRecord[] = [],
  studioHolidays?: StudioHoliday[]
): ScheduleCell[] {
  const scheduleId = producerScheduleId(producer);
  const scheduleByDay = new Map(
    schedule
      .filter((entry) => entry.producer === scheduleId)
      .map((entry) => [entry.day, entry])
  );
  const assignments = producerAssignments(producer, mtdRecords);

  return buildDateRange(range, anchorDate).map((date) => {
    let status = inferStatus(producer, date, scheduleByDay, studioHolidays);
    const coveringBookings = bookingsFromAssignments(
      date,
      coveringAssignments(date, assignments)
    );

    if (coveringBookings.length > 0 && status === "available") {
      status = isProducerAtDailyCapacity(producer, date, mtdRecords)
        ? "capacity"
        : "mix";
    } else if (
      status === "available" &&
      isProducerAtDailyCapacity(producer, date, mtdRecords)
    ) {
      status = "capacity";
    }

    const bookings =
      status === "mix" || status === "capacity"
        ? coveringBookings.length > 0
          ? coveringBookings
          : resolveBookings(producer, date, status, assignments)
        : resolveBookings(producer, date, status, assignments);

    const unavailable =
      status === "off" ||
      status === "nonwork" ||
      status === "mix" ||
      status === "capacity" ||
      bookings.length > 0;
    const isOvertime =
      isProducerOvertimeDay(producer, date) && !isProducerWorkDay(producer, date);
    return {
      key: toLocalIsoDate(date),
      date,
      dayLabel: DAY_NAMES[date.getDay()],
      dateLabel: `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`,
      status,
      unavailable,
      booking: bookings[0] ?? null,
      bookings,
      offDetail:
        status === "off"
          ? describeScheduleOffDetail(producer, date, studioHolidays)
          : undefined,
      isOvertime: isOvertime || undefined,
    };
  });
}

export function groupCellsByWeek(cells: ScheduleCell[]): ScheduleCell[][] {
  if (cells.length === 0) return [];

  const weeks: ScheduleCell[][] = [];
  let current: ScheduleCell[] = [];

  const first = cells[0].date.getDay();
  for (let i = 0; i < first; i += 1) {
    current.push({
      key: `pad-start-${i}`,
      date: new Date(0),
      dayLabel: "",
      dateLabel: "",
      status: "available",
      unavailable: false,
    });
  }

  for (const cell of cells) {
    current.push(cell);
    if (current.length === 7) {
      weeks.push(current);
      current = [];
    }
  }

  if (current.length > 0) {
    while (current.length < 7) {
      current.push({
        key: `pad-end-${current.length}`,
        date: new Date(0),
        dayLabel: "",
        dateLabel: "",
        status: "available",
        unavailable: false,
      });
    }
    weeks.push(current);
  }

  return weeks;
}

export function countUnavailable(cells: ScheduleCell[]): number {
  return cells.filter((cell) => cell.unavailable && cell.key && !cell.key.startsWith("pad")).length;
}

export function rangeLabel(
  range: ScheduleViewRange,
  anchorDate = new Date()
): string {
  if (range === "today") return "Today";
  if (range === "week") {
    const dates = buildDateRange("week", anchorDate);
    const start = dates[0];
    const end = dates[dates.length - 1];
    const sameMonth = start.getMonth() === end.getMonth();
    if (sameMonth) {
      return `Week of ${MONTH_NAMES[start.getMonth()]} ${start.getDate()}–${end.getDate()}`;
    }
    return `Week of ${MONTH_NAMES[start.getMonth()]} ${start.getDate()}–${MONTH_NAMES[end.getMonth()]} ${end.getDate()}`;
  }
  if (range === "month") return "This month";
  if (range === "90days") return "Next 90 days";
  return "Next 6 months";
}

/** Inclusive ISO start/end for filtering mixes that overlap a schedule view range. */
export function scheduleViewFilterPeriod(
  range: ScheduleViewRange,
  anchorDate = new Date()
): { start: string; end: string } {
  const dates = buildDateRange(range, anchorDate);
  if (dates.length === 0) {
    const today = toLocalIsoDate(anchorDate);
    return { start: today, end: today };
  }
  return {
    start: toLocalIsoDate(dates[0]),
    end: toLocalIsoDate(dates[dates.length - 1]),
  };
}

export function sendPeriodLabel(period: ScheduleSendPeriod): string {
  if (period === "complete") return "Complete schedule";
  return rangeLabel(period);
}

/** Date window for Send Schedule, or undefined for the full ongoing schedule. */
export function scheduleSendFilterPeriod(
  period: ScheduleSendPeriod,
  anchorDate = new Date()
): { start: string; end: string } | undefined {
  if (period === "complete") return undefined;
  return scheduleViewFilterPeriod(period, anchorDate);
}

export type TeamScheduleRow = {
  producer: Producer;
  cells: ScheduleCell[];
};

export type CalendarDayProducer = {
  producer: Producer;
  cell: ScheduleCell;
};

export type CalendarDay = {
  key: string;
  date: Date;
  dayLabel: string;
  dateLabel: string;
  unavailableCount: number;
  unavailableProducers: CalendarDayProducer[];
  isToday: boolean;
  isCurrentMonth: boolean;
};

export type ColumnAggregate = {
  key: string;
  availableCount: number;
  unavailableCount: number;
  total: number;
  label: string;
  dayLabel: string;
  isToday: boolean;
};

export function buildTeamSchedule(
  producers: Producer[],
  schedule: ScheduleEntry[],
  range: ScheduleViewRange,
  anchorDate = new Date(),
  mtdRecords: MTDRecord[] = [],
  studioHolidays?: StudioHoliday[]
): TeamScheduleRow[] {
  return producers.map((producer) => ({
    producer,
    cells: getScheduleCells(
      producer,
      schedule,
      range,
      anchorDate,
      mtdRecords,
      studioHolidays
    ),
  }));
}

export function aggregateColumns(
  rows: TeamScheduleRow[],
  anchorDate = new Date()
): ColumnAggregate[] {
  if (rows.length === 0) return [];

  const todayKey = toLocalIsoDate(anchorDate);

  return rows[0].cells.map((cell, index) => {
    const visibleRows = rows.filter((row) => !row.cells[index]?.filteredOut);
    const unavailableCount = visibleRows.filter(
      (row) => row.cells[index]?.unavailable
    ).length;
    const availableCount = visibleRows.length - unavailableCount;
    return {
      key: cell.key,
      availableCount,
      unavailableCount,
      total: visibleRows.length,
      label: cell.dateLabel,
      dayLabel: cell.dayLabel,
      isToday: cell.key === todayKey,
    };
  });
}

export function buildScheduleColumnAggregates(
  range: ScheduleViewRange,
  anchorDate = new Date()
): ColumnAggregate[] {
  const todayKey = toLocalIsoDate(anchorDate);

  return buildDateRange(range, anchorDate).map((date) => {
    const key = toLocalIsoDate(date);
    return {
      key,
      availableCount: 0,
      unavailableCount: 0,
      total: 0,
      label: `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`,
      dayLabel: DAY_NAMES[date.getDay()],
      isToday: key === todayKey,
    };
  });
}

export function buildCalendarDays(
  rows: TeamScheduleRow[],
  range: Extract<ScheduleViewRange, "week" | "month">,
  anchorDate: any = new Date()
): CalendarDay[] {
  const parsedAnchor = parseToDate(anchorDate);
  const todayKey = toLocalIsoDate(parsedAnchor);
  const dates =
    range === "week"
      ? buildDateRange("week", parsedAnchor)
      : enumerateCalendarMonth(
          parsedAnchor.getFullYear(),
          parsedAnchor.getMonth()
        );

  return dates.map((date) => {
    const key = toLocalIsoDate(date);
    const unavailableProducers = rows
      .map((row) => {
        const cell = row.cells.find((entry) => entry.key === key);
        return cell?.unavailable && !cell.filteredOut
          ? { producer: row.producer, cell }
          : null;
      })
      .filter((entry): entry is CalendarDayProducer => Boolean(entry));

    return {
      key,
      date,
      dayLabel: DAY_NAMES[date.getDay()],
      dateLabel: `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`,
      unavailableCount: unavailableProducers.length,
      unavailableProducers,
      isToday: key === todayKey,
      isCurrentMonth: true,
    };
  });
}

export function groupCalendarDaysByWeek(days: CalendarDay[]): CalendarDay[][] {
  if (days.length === 0) return [];

  const weeks: CalendarDay[][] = [];
  let current: CalendarDay[] = [];
  const firstDay = days[0].date.getDay();

  for (let i = 0; i < firstDay; i += 1) {
    current.push(createPaddedCalendarDay(days[0].date, -(firstDay - i)));
  }

  for (const day of days) {
    current.push(day);
    if (current.length === 7) {
      weeks.push(current);
      current = [];
    }
  }

  if (current.length > 0) {
    const padCount = 7 - current.length;
    for (let i = 1; i <= padCount; i += 1) {
      current.push(createPaddedCalendarDay(days[days.length - 1].date, i));
    }
    weeks.push(current);
  }

  return weeks;
}

export function buildMonthGrid(
  rows: TeamScheduleRow[],
  anchorDate = new Date()
): CalendarDay[][] {
  return groupCalendarDaysByWeek(buildCalendarDays(rows, "month", anchorDate));
}

function createPaddedCalendarDay(baseDate: Date, offsetDays: number): CalendarDay {
  const date = new Date(baseDate);
  date.setDate(baseDate.getDate() + offsetDays);

  return {
    key: `pad-${toLocalIsoDate(date)}`,
    date,
    dayLabel: DAY_NAMES[date.getDay()],
    dateLabel: `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`,
    unavailableCount: 0,
    unavailableProducers: [],
    isToday: false,
    isCurrentMonth: date.getMonth() === baseDate.getMonth(),
  };
}

export function cellSizeForRange(range: ScheduleViewRange): "sm" | "md" | "lg" {
  if (range === "today" || range === "week") return "lg";
  if (range === "month") return "md";
  return "sm";
}

export function statusLabel(status: ScheduleCell["status"]): string {
  if (status === "mix") return "Booked";
  if (status === "off") return "Off";
  if (status === "nonwork") return "Non-working";
  if (status === "capacity") return "Capacity Reached";
  return "Available";
}

export type ScheduleStatusFilter = "all" | ScheduleCell["status"];

export const SCHEDULE_STATUS_FILTERS: {
  value: ScheduleStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "mix", label: "Booked" },
  { value: "capacity", label: "Capacity Reached" },
  { value: "off", label: "Off" },
  { value: "nonwork", label: "Non-working" },
  { value: "available", label: "Available" },
];

function maskCellForStatusFilter(cell: ScheduleCell): ScheduleCell {
  return {
    ...cell,
    status: "available",
    unavailable: false,
    booking: null,
    bookings: [],
    filteredOut: true,
  };
}

export function filterTeamScheduleByStatus(
  rows: TeamScheduleRow[],
  filter: ScheduleStatusFilter,
  range: ScheduleViewRange
): TeamScheduleRow[] {
  if (filter === "all") return rows;

  if (range === "today") {
    return rows.filter((row) => row.cells[0]?.status === filter);
  }

  const matchingRows = rows.filter((row) =>
    row.cells.some((cell) => cell.status === filter)
  );

  if (matchingRows.length === 0) return [];

  const columnCount = matchingRows[0].cells.length;
  const visibleColumnIndices: number[] = [];
  for (let index = 0; index < columnCount; index += 1) {
    const columnHasMatch = matchingRows.some(
      (row) => row.cells[index]?.status === filter
    );
    if (columnHasMatch) visibleColumnIndices.push(index);
  }

  return matchingRows.map((row) => ({
    ...row,
    cells: visibleColumnIndices.map((index) => {
      const cell = row.cells[index];
      return cell.status === filter ? cell : maskCellForStatusFilter(cell);
    }),
  }));
}

export type MatrixDateDisplay = {
  top: string;
  day: string;
  title: string;
  emphasizeTop?: boolean;
  weekday?: string;
};

export type MatrixMonthGroup = {
  key: string;
  label: string;
  startIndex: number;
  rowCount: number;
};

export function formatMatrixDateCell(
  column: ColumnAggregate,
  _range: ScheduleViewRange,
  _previousKey?: string
): MatrixDateDisplay {
  const title = `${column.dayLabel}, ${column.label}`;
  const dayStr = column.key.split("-")[2];
  const day = String(Number(dayStr));
  const weekday = column.dayLabel.slice(0, 3).toUpperCase();

  if (column.isToday) {
    return {
      top: "Today",
      day: column.label,
      title,
      emphasizeTop: true,
      weekday,
    };
  }

  return { top: weekday, day, title };
}

/** Group matrix day columns by calendar month for longer ranges. */
export function buildMatrixMonthGroups(
  columns: ColumnAggregate[]
): MatrixMonthGroup[] {
  const groups: MatrixMonthGroup[] = [];

  for (let i = 0; i < columns.length; i += 1) {
    const monthKey = columns[i].key.slice(0, 7); // YYYY-MM
    const last = groups[groups.length - 1];
    if (last && last.key === monthKey) {
      last.rowCount += 1;
      continue;
    }
    const month = Number(monthKey.split("-")[1]);
    groups.push({
      key: monthKey,
      label: MONTH_NAMES[month - 1],
      startIndex: i,
      rowCount: 1,
    });
  }

  return groups;
}
