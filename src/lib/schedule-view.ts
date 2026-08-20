import type { Producer, ScheduleEntry } from "@/types";

export type ScheduleViewRange = "week" | "month" | "90days";

export type ScheduleCell = {
  key: string;
  date: Date;
  dayLabel: string;
  dateLabel: string;
  status: "available" | "mix" | "off";
  unavailable: boolean;
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

function formatLegacyDay(date: Date): string {
  return `${DAY_NAMES[date.getDay()]} ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function inferStatus(
  producer: Producer,
  date: Date,
  scheduleByDay: Map<string, ScheduleEntry>
): ScheduleCell["status"] {
  const legacy = formatLegacyDay(date);
  const entry = scheduleByDay.get(legacy);
  if (entry) return entry.status;

  const day = date.getDay();
  const seed = hashSeed(`${producer.id}-${date.toISOString().slice(0, 10)}`);

  if (day === 0 || day === 6) {
    return seed % 4 === 0 ? "mix" : "off";
  }

  if (producer.status === "unavailable") return "off";
  if (producer.status === "limited") {
    return seed % 3 === 0 ? "available" : "mix";
  }

  if (producer.mixesThisWeek > 100) {
    return seed % 5 === 0 ? "available" : "mix";
  }

  return seed % 6 === 0 ? "mix" : "available";
}

function startOfCalendarWeek(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function buildDateRange(range: ScheduleViewRange, anchor: Date): Date[] {
  const end = new Date(anchor);
  end.setHours(0, 0, 0, 0);

  if (range === "week") {
    const start = startOfCalendarWeek(end);
    const dates: Date[] = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d);
    }
    return dates;
  }

  const days = range === "month" ? 30 : 90;
  const dates: Date[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    dates.push(d);
  }
  return dates;
}

export function getScheduleCells(
  producer: Producer,
  schedule: ScheduleEntry[],
  range: ScheduleViewRange,
  anchorDate = new Date(2026, 7, 19)
): ScheduleCell[] {
  const scheduleId = producerScheduleId(producer);
  const scheduleByDay = new Map(
    schedule
      .filter((entry) => entry.producer === scheduleId)
      .map((entry) => [entry.day, entry])
  );

  return buildDateRange(range, anchorDate).map((date) => {
    const status = inferStatus(producer, date, scheduleByDay);
    return {
      key: date.toISOString().slice(0, 10),
      date,
      dayLabel: DAY_NAMES[date.getDay()],
      dateLabel: `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`,
      status,
      unavailable: status === "off" || status === "mix",
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
  anchorDate = new Date(2026, 7, 19)
): string {
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
  if (range === "month") return "Last 30 days";
  return "Last 90 days";
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
  openCount: number;
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
  anchorDate = new Date(2026, 7, 19)
): TeamScheduleRow[] {
  return producers.map((producer) => ({
    producer,
    cells: getScheduleCells(producer, schedule, range, anchorDate),
  }));
}

export function aggregateColumns(
  rows: TeamScheduleRow[],
  anchorDate = new Date(2026, 7, 19)
): ColumnAggregate[] {
  if (rows.length === 0) return [];

  const todayKey = anchorDate.toISOString().slice(0, 10);

  return rows[0].cells.map((cell, index) => {
    const unavailableCount = rows.filter((row) => row.cells[index]?.unavailable).length;
    const openCount = rows.length - unavailableCount;
    return {
      key: cell.key,
      openCount,
      unavailableCount,
      total: rows.length,
      label: cell.dateLabel,
      dayLabel: cell.dayLabel,
      isToday: cell.key === todayKey,
    };
  });
}

export function buildCalendarDays(
  rows: TeamScheduleRow[],
  range: Extract<ScheduleViewRange, "week" | "month">,
  anchorDate = new Date(2026, 7, 19)
): CalendarDay[] {
  const todayKey = anchorDate.toISOString().slice(0, 10);
  const dates =
    range === "week"
      ? buildDateRange("week", anchorDate)
      : (() => {
          const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
          const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
          const days: Date[] = [];
          for (let day = 1; day <= end.getDate(); day += 1) {
            days.push(new Date(start.getFullYear(), start.getMonth(), day));
          }
          return days;
        })();

  return dates.map((date) => {
    const key = date.toISOString().slice(0, 10);
    const unavailableProducers = rows
      .map((row) => {
        const cell = row.cells.find((entry) => entry.key === key);
        return cell?.unavailable ? { producer: row.producer, cell } : null;
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
  anchorDate = new Date(2026, 7, 19)
): CalendarDay[][] {
  return groupCalendarDaysByWeek(buildCalendarDays(rows, "month", anchorDate));
}

function createPaddedCalendarDay(baseDate: Date, offsetDays: number): CalendarDay {
  const date = new Date(baseDate);
  date.setDate(baseDate.getDate() + offsetDays);

  return {
    key: `pad-${date.toISOString().slice(0, 10)}`,
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
  if (range === "week") return "lg";
  if (range === "month") return "md";
  return "sm";
}

export function statusLabel(status: ScheduleCell["status"]): string {
  if (status === "mix") return "Booked";
  if (status === "off") return "Off";
  return "Open";
}

export type MatrixDateDisplay = {
  top: string;
  bottom: string;
  title: string;
};

export function formatMatrixDateCell(
  column: ColumnAggregate,
  range: ScheduleViewRange,
  previousKey?: string
): MatrixDateDisplay {
  const title = `${column.dayLabel}, ${column.label}`;
  const [, monthStr, dayStr] = column.key.split("-");
  const month = Number(monthStr);
  const day = Number(dayStr);
  const weekday = column.dayLabel.slice(0, 3).toUpperCase();
  const monthShort = MONTH_NAMES[month - 1];

  if (column.isToday) {
    return { top: "Today", bottom: String(day), title };
  }

  if (range === "week") {
    return { top: weekday, bottom: String(day), title };
  }

  if (range === "90days") {
    return {
      top: `${month}/${day}`,
      bottom: weekday,
      title,
    };
  }

  const prevMonth = previousKey?.split("-")[1];
  const monthChanged = !previousKey || prevMonth !== monthStr;

  if (monthChanged) {
    return {
      top: monthShort,
      bottom: `${weekday} ${day}`,
      title,
    };
  }

  return {
    top: String(day),
    bottom: weekday,
    title,
  };
}
