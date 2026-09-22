import type { MTDRecord, Producer, ScheduleEntry, Weekday } from "@/types";
import { DEFAULT_WORK_DAYS } from "@/types";
import { parseFlexibleDate, toIsoDateString } from "@/lib/dates";
import {
  normalizeProducerKey,
  producerAssignmentKey,
  producerKeysMatch,
} from "@/lib/producer-keys";
import { suggestMixEndDate } from "@/lib/scheduling";
import {
  isStudioHolidayIso,
  type StudioHoliday,
} from "@/lib/producer-time-off";

const JS_DAY_TO_WEEKDAY: Weekday[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

export type MixWindow = {
  start: Date;
  end: Date;
};

export function dateToWeekday(date: Date): Weekday {
  return JS_DAY_TO_WEEKDAY[date.getDay()];
}

export function dateToIsoLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toDayStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toDayEnd(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function effectiveWorkDays(producer: Producer): Weekday[] {
  if (producer.workDays?.length) return producer.workDays;
  return [...DEFAULT_WORK_DAYS];
}

export function workDaysFromWeekendOptions(
  saturday: boolean,
  sunday: boolean
): Weekday[] {
  const days: Weekday[] = [...DEFAULT_WORK_DAYS];
  if (saturday) days.push("sat");
  if (sunday) days.push("sun");
  return days;
}

export function weekendOptionsFromWorkDays(workDays: Weekday[]): {
  saturday: boolean;
  sunday: boolean;
} {
  return {
    saturday: workDays.includes("sat"),
    sunday: workDays.includes("sun"),
  };
}

export function isProducerWorkDay(producer: Producer, date: Date): boolean {
  return effectiveWorkDays(producer).includes(dateToWeekday(date));
}

/** True when this calendar date is outside the regular weekly workDays. */
export function isEligibleOvertimeDate(
  date: Date,
  workDays: Weekday[]
): boolean {
  return !workDays.includes(dateToWeekday(date));
}

/** Time off only applies to regular workDays (not overtime / non-work weekdays). */
export function isEligibleTimeOffDate(
  date: Date,
  workDays: Weekday[]
): boolean {
  return workDays.includes(dateToWeekday(date));
}

/** True when [startIso, endIso] includes at least one regular work day. */
export function timeOffRangeCoversWorkDay(
  startIso: string,
  endIso: string,
  workDays: Weekday[]
): boolean {
  const start = parseFlexibleDate(startIso);
  const end = parseFlexibleDate(endIso || startIso);
  if (!start || !end) return false;

  const cursor = toDayStart(start);
  const last = toDayStart(end);
  while (cursor <= last) {
    if (isEligibleTimeOffDate(cursor, workDays)) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
}

const WEEKDAY_LONG: Record<Weekday, string> = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};

export function formatWeekdayLong(day: Weekday): string {
  return WEEKDAY_LONG[day];
}

/** e.g. "14 Feb 2027" */
export function formatIsoDayMonthYear(iso: string): string {
  const parsed = parseFlexibleDate(iso);
  if (!parsed) return iso;
  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function firstName(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part || "This producer";
}

/**
 * Clear copy when a time-off range falls entirely outside usual work days.
 * Returns separate lines (no em dashes) for the notice modal.
 */
export function describeTimeOffOutsideWorkDaysParts(
  producerName: string,
  startIso: string,
  endIso: string,
  workDays: Weekday[]
): { dateLine: string; producerLine: string } {
  const start = parseFlexibleDate(startIso);
  const end = parseFlexibleDate(endIso || startIso);
  const name = firstName(producerName);
  if (!start) {
    return {
      dateLine: "That date isn’t on their usual schedule.",
      producerLine: `${name} usually doesn’t work that day.`,
    };
  }

  const weekday = dateToWeekday(start);
  const dayLabel = formatWeekdayLong(weekday);
  const startLabel = formatIsoDayMonthYear(startIso);
  const sameDay = !end || startIso === (endIso || startIso);

  if (sameDay) {
    return {
      dateLine: `${startLabel} is a ${dayLabel}.`,
      producerLine: `${name} usually doesn’t work on ${dayLabel}s.`,
    };
  }

  const endLabel = formatIsoDayMonthYear(endIso || startIso);
  const offDays = new Set<Weekday>();
  const cursor = toDayStart(start);
  const last = toDayStart(end ?? start);
  while (cursor <= last) {
    const day = dateToWeekday(cursor);
    if (!workDays.includes(day)) offDays.add(day);
    cursor.setDate(cursor.getDate() + 1);
  }
  const offList = [...offDays].map(formatWeekdayLong);
  if (offList.length === 1) {
    return {
      dateLine: `${startLabel} to ${endLabel} falls on ${offList[0]}.`,
      producerLine: `${name} usually doesn’t work on ${offList[0]}s.`,
    };
  }
  return {
    dateLine: `${startLabel} to ${endLabel}.`,
    producerLine: `These dates don’t include ${name}’s usual work days.`,
  };
}

/** @deprecated Prefer describeTimeOffOutsideWorkDaysParts for UI. */
export function describeTimeOffOutsideWorkDays(
  producerName: string,
  startIso: string,
  endIso: string,
  workDays: Weekday[]
): string {
  const parts = describeTimeOffOutsideWorkDaysParts(
    producerName,
    startIso,
    endIso,
    workDays
  );
  return `${parts.dateLine} ${parts.producerLine}`;
}

export function formatSkippedProducerSummary(
  names: string[],
  options?: { total?: number; previewLimit?: number }
): {
  countLabel: string;
  ratioLabel: string | null;
  shown: string[];
  extra: number;
  totalShown: number;
} {
  const previewLimit = options?.previewLimit ?? 3;
  const shown = names.slice(0, previewLimit);
  const extra = Math.max(0, names.length - shown.length);
  const countLabel =
    names.length === 1 ? "1 producer" : `${names.length} producers`;
  const ratioLabel =
    typeof options?.total === "number" && options.total > 0
      ? `${names.length}/${options.total}`
      : null;
  return { countLabel, ratioLabel, shown, extra, totalShown: names.length };
}

/** Expand time-off entries into every YYYY-MM-DD they cover (inclusive). */
export function expandTimeOffDates(
  entries: { startDate: string; endDate?: string | null }[]
): string[] {
  const dates: string[] = [];
  for (const entry of entries) {
    const start = parseFlexibleDate(entry.startDate);
    const end = parseFlexibleDate(entry.endDate || entry.startDate) ?? start;
    if (!start) continue;
    const cursor = toDayStart(start);
    const last = toDayStart(end ?? start);
    let guard = 0;
    while (cursor <= last && guard < 400) {
      dates.push(dateToIsoLocal(cursor));
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }
  }
  return dates;
}

/** Overtime ISO dates that fall inside [startIso, endIso] inclusive. */
export function overtimeDatesInRange(
  overtimeDays: string[],
  startIso: string,
  endIso: string
): string[] {
  const end = endIso || startIso;
  return overtimeDays
    .filter((iso) => iso >= startIso && iso <= end)
    .sort((a, b) => a.localeCompare(b));
}

/** Earliest overtime day on or after `iso`, if any. */
export function nextOvertimeOnOrAfter(
  overtimeDays: string[],
  iso: string
): string | null {
  const next = overtimeDays
    .filter((day) => day >= iso)
    .sort((a, b) => a.localeCompare(b))[0];
  return next ?? null;
}

/** Latest overtime day on or before `iso`, if any. */
export function prevOvertimeOnOrBefore(
  overtimeDays: string[],
  iso: string
): string | null {
  const prev = overtimeDays
    .filter((day) => day <= iso)
    .sort((a, b) => a.localeCompare(b))
    .at(-1);
  return prev ?? null;
}

/**
 * Time-off ranges cannot include overtime days.
 * - Overtime days themselves are never selectable.
 * - With an end date set, start must be after any overtime on/before that end.
 * - With a start date set, end must be before any overtime on/after that start.
 */
export function isTimeOffDateBlockedByOvertime(
  iso: string,
  field: "start" | "end",
  otherIso: string | null | undefined,
  overtimeDays: string[]
): boolean {
  if (overtimeDays.includes(iso)) return true;
  if (!otherIso) return false;
  if (field === "start") {
    const end = otherIso < iso ? iso : otherIso;
    return overtimeDatesInRange(overtimeDays, iso, end).length > 0;
  }
  if (iso < otherIso) return true;
  return overtimeDatesInRange(overtimeDays, otherIso, iso).length > 0;
}

export function isProducerOvertimeDay(producer: Producer, date: Date): boolean {
  const iso = dateToIsoLocal(date);
  return producer.overtimeDays.includes(iso);
}

/** Regular work day or a one-off overtime date. */
export function isProducerScheduledDay(producer: Producer, date: Date): boolean {
  return isProducerWorkDay(producer, date) || isProducerOvertimeDay(producer, date);
}

export function isProducerOnTimeOff(
  producer: Producer,
  date: Date,
  studioHolidays?: StudioHoliday[]
): boolean {
  const dayIso = dateToIsoLocal(date);
  if (studioHolidays?.length && isStudioHolidayIso(dayIso, studioHolidays, producer.id)) {
    return true;
  }
  return producer.timeOff.some(
    (entry) => dayIso >= entry.startDate && dayIso <= entry.endDate
  );
}

export function mixWindowForRecord(rec: MTDRecord): MixWindow | null {
  const start = parseFlexibleDate(rec.mixStartDate);
  if (!start) return null;

  const endIso =
    toIsoDateString(rec.mixEndDate ?? "") ||
    suggestMixEndDate(rec.mixStartDate, rec.package);
  const end = parseFlexibleDate(endIso);
  if (!end) return null;

  return { start: toDayStart(start), end: toDayEnd(end) };
}

export function mixEndIsoForRecord(rec: MTDRecord): string {
  return (
    toIsoDateString(rec.mixEndDate ?? "") ||
    suggestMixEndDate(rec.mixStartDate, rec.package)
  );
}

function recordCoversDay(rec: MTDRecord, day: Date): boolean {
  if (!rec.assignedProducer) return false;
  const window = mixWindowForRecord(rec);
  if (!window) return false;
  const dayStart = toDayStart(day);
  const dayEnd = toDayEnd(day);
  return dayStart <= window.end && window.start <= dayEnd;
}

export function countProducerMixesOnDay(
  producer: Producer,
  day: Date,
  mtdRecords: MTDRecord[],
  excludeRecordId?: string
): number {
  const key = normalizeProducerKey(producerAssignmentKey(producer));
  let count = 0;

  for (const rec of mtdRecords) {
    if (rec.id === excludeRecordId) continue;
    if (!rec.assignedProducer) continue;
    if (!producerKeysMatch(rec.assignedProducer, key)) continue;
    if (recordCoversDay(rec, day)) count += 1;
  }

  return count;
}

/**
 * Sum the producer payout costs for all records assigned to this producer on a given day.
 * Uses `rec.producerPayout` (the producer's cut, not the customer price).
 */
export function countProducerDailyCost(
  producer: Producer,
  day: Date,
  mtdRecords: MTDRecord[],
  excludeRecordId?: string
): number {
  const key = normalizeProducerKey(producerAssignmentKey(producer));
  let total = 0;

  for (const rec of mtdRecords) {
    if (rec.id === excludeRecordId) continue;
    if (!rec.assignedProducer) continue;
    if (!producerKeysMatch(rec.assignedProducer, key)) continue;
    if (!recordCoversDay(rec, day)) continue;
    total += rec.producerPayout ?? 0;
  }

  return total;
}

export function isProducerUnderDailyCapacity(
  producer: Producer,
  day: Date,
  mtdRecords: MTDRecord[],
  excludeRecordId?: string
): boolean {
  if (producer.maxMixesPerDay == null) return true;
  return (
    countProducerMixesOnDay(producer, day, mtdRecords, excludeRecordId) <
    producer.maxMixesPerDay
  );
}

export function isProducerUnderDailyCostCapacity(
  producer: Producer,
  day: Date,
  mtdRecords: MTDRecord[],
  excludeRecordId?: string
): boolean {
  if (producer.maxProducerCostPerDay == null) return true;
  return (
    countProducerDailyCost(producer, day, mtdRecords, excludeRecordId) <
    producer.maxProducerCostPerDay
  );
}

/**
 * Returns true when a producer has reached their daily capacity on a given date.
 * Capacity is reached when EITHER the daily mix count limit OR the daily cost limit is hit.
 */
export function isProducerAtDailyCapacity(
  producer: Producer,
  day: Date,
  mtdRecords: MTDRecord[],
  excludeRecordId?: string
): boolean {
  const mixCapacityReached = !isProducerUnderDailyCapacity(
    producer,
    day,
    mtdRecords,
    excludeRecordId
  );
  const costCapacityReached = !isProducerUnderDailyCostCapacity(
    producer,
    day,
    mtdRecords,
    excludeRecordId
  );
  return mixCapacityReached || costCapacityReached;
}

/** True on scheduled days that are not time off and still have mix AND cost capacity. */
export function isProducerAvailableOnDay(
  producer: Producer,
  day: Date,
  mtdRecords: MTDRecord[],
  excludeRecordId?: string,
  studioHolidays?: StudioHoliday[]
): boolean {
  if (!isProducerScheduledDay(producer, day)) return false;
  // Time off / studio holidays only block regular work days. Overtime is undone by removing the OT date.
  if (
    isProducerWorkDay(producer, day) &&
    isProducerOnTimeOff(producer, day, studioHolidays)
  ) {
    return false;
  }
  if (!isProducerUnderDailyCapacity(producer, day, mtdRecords, excludeRecordId)) {
    return false;
  }
  if (!isProducerUnderDailyCostCapacity(producer, day, mtdRecords, excludeRecordId)) {
    return false;
  }
  return true;
}

export function isProducerAvailableForMixWindow(
  producer: Producer,
  startIso: string,
  endIso: string,
  mtdRecords: MTDRecord[],
  excludeRecordId?: string,
  studioHolidays?: StudioHoliday[]
): boolean {
  const start = parseFlexibleDate(startIso);
  const end = parseFlexibleDate(endIso);
  if (!start || !end) return true;

  const startDay = toDayStart(start);
  const endDay = toDayStart(end);

  if (!isProducerScheduledDay(producer, startDay)) {
    return false;
  }

  const cursor = new Date(startDay);
  while (cursor <= endDay) {
    if (isProducerScheduledDay(producer, cursor)) {
      if (
        !isProducerAvailableOnDay(
          producer,
          cursor,
          mtdRecords,
          excludeRecordId,
          studioHolidays
        )
      ) {
        return false;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return true;
}

export function isProducerUnavailableForRecord(
  producer: Producer,
  rec: MTDRecord,
  mtdRecords: MTDRecord[]
): boolean {
  const window = mixWindowForRecord(rec);
  if (!window) return false;

  return !isProducerAvailableForMixWindow(
    producer,
    dateToIsoLocal(window.start),
    dateToIsoLocal(window.end),
    mtdRecords,
    rec.id
  );
}

export function getProducerUnavailabilityReason(
  producer: Producer,
  rec: MTDRecord,
  mtdRecords: MTDRecord[],
  schedule: ScheduleEntry[] = []
): string | null {
  const window = mixWindowForRecord(rec);
  const start = window ? window.start : parseFlexibleDate(rec.mixStartDate ?? "");
  if (!start) return null;

  if (!isProducerScheduledDay(producer, start)) {
    const weekdayName = start.toLocaleDateString("en-US", { weekday: "short" });
    return `Not scheduled to work on ${weekdayName}s`;
  }

  if (isProducerOnTimeOff(producer, start)) {
    return "On approved time off";
  }

  if (isProducerAtDailyCapacity(producer, start, mtdRecords, rec.id)) {
    return "Reached maximum daily mix capacity";
  }

  if (window) {
    if (
      !isProducerAvailableForMixWindow(
        producer,
        dateToIsoLocal(window.start),
        dateToIsoLocal(window.end),
        mtdRecords,
        rec.id
      )
    ) {
      return "Conflicting mix or capacity on mix dates";
    }
  }

  return null;
}
