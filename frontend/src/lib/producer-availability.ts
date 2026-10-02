import type { MTDRecord, Producer, Weekday } from "@/types";
import { DEFAULT_WORK_DAYS } from "@/types";
import { parseFlexibleDate, toIsoDateString } from "@/lib/dates";
import {
  producerAssignmentKey,
  producerKeysMatch,
} from "@/lib/producer-keys";
import { parsePackage } from "@/lib/package";
import { inferMTDRecordStatus } from "@/lib/mtd-status";
import {
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
  return (producer.overtimeDays ?? []).includes(iso);
}

/** Regular work day or a one-off overtime date. */
export function isProducerScheduledDay(producer: Producer, date: Date): boolean {
  return isProducerWorkDay(producer, date) || isProducerOvertimeDay(producer, date);
}

export function isProducerOnTimeOff(
  producer: Producer,
  date: Date,
  _studioHolidays?: StudioHoliday[]
): boolean {
  // Public / calendar holidays are reference only — producers are not given
  // them automatically. Off days come from named leave on working days.
  const dayIso = dateToIsoLocal(date);
  const timeOff = producer.timeOff ?? [];
  return timeOff.some(
    (entry) => dayIso >= entry.startDate && dayIso <= entry.endDate
  );
}

export function mixWindowForRecord(
  rec: MTDRecord,
  options: MixWorkingDayOptions = {}
): MixWindow | null {
  const start = parseFlexibleDate(rec.mixStartDate);
  if (!start) return null;

  const endIso =
    toIsoDateString(rec.mixEndDate ?? "") ||
    suggestMixEndDate(rec.mixStartDate, rec.package, options);
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

/**
 * Whether a record holds its producer's time: assigned and Ongoing.
 * Completed, outsourced, and in-payroll mixes never count toward daily limits.
 */
export function isProducerBookingRecord(rec: MTDRecord): boolean {
  if (!rec.assignedProducer?.trim()) return false;
  if (rec.inPayroll || (rec as { in_payroll?: boolean }).in_payroll) return false;
  if (rec.status === "completed") return false;
  return inferMTDRecordStatus(rec) === "Ongoing";
}

/** Payout estimate for a booked record whose payout isn't settled until payroll. */
export type RecordCostEstimator = (rec: MTDRecord) => number | null;

function bookedRecordCost(
  rec: MTDRecord,
  estimateCost?: RecordCostEstimator
): number {
  return estimateCost?.(rec) ?? rec.producerPayout ?? 0;
}

/** Records may be assigned by initials, legacy code, or full name. */
function isRecordAssignedToProducer(rec: MTDRecord, producer: Producer): boolean {
  const assigned = rec.assignedProducer?.trim();
  if (!assigned) return false;
  if (producerKeysMatch(assigned, producerAssignmentKey(producer))) return true;
  return assigned.toUpperCase() === producer.name.trim().toUpperCase();
}

function isBookingForProducerOnDay(
  rec: MTDRecord,
  producer: Producer,
  day: Date,
  excludeRecordId?: string
): boolean {
  if (rec.id === excludeRecordId) return false;
  if (!isProducerBookingRecord(rec)) return false;
  if (!isRecordAssignedToProducer(rec, producer)) return false;
  return recordCoversDay(rec, day);
}

export function countProducerMixesOnDay(
  producer: Producer,
  day: Date,
  mtdRecords: MTDRecord[],
  excludeRecordId?: string
): number {
  let count = 0;

  for (const rec of mtdRecords) {
    if (isBookingForProducerOnDay(rec, producer, day, excludeRecordId)) count += 1;
  }

  return count;
}

/** Ongoing mix covering a day — shown on leave calendar (not blocked). */
export type ProducerMixDayBooking = {
  recordId: string;
  programName: string;
  mixStartDate: string;
  mixEndDate: string;
  /** True when the mix is on the MTD board (vs Orders staging). */
  inMTD: boolean;
};

function bookingFromRecord(rec: MTDRecord): ProducerMixDayBooking {
  const startIso = toIsoDateString(rec.mixStartDate ?? "") || rec.mixStartDate;
  const endIso = mixEndIsoForRecord(rec) || startIso;
  return {
    recordId: rec.id,
    programName: rec.programName?.trim() || "Untitled mix",
    mixStartDate: startIso,
    mixEndDate: endIso,
    inMTD: Boolean(rec.inMTD),
  };
}

/** Ongoing mixes assigned to this producer that cover the given day. */
export function listProducerMixBookingsOnDay(
  producer: Producer,
  dayIso: string,
  mtdRecords: MTDRecord[]
): ProducerMixDayBooking[] {
  const day = parseFlexibleDate(dayIso);
  if (!day) return [];
  const out: ProducerMixDayBooking[] = [];
  for (const rec of mtdRecords) {
    if (isBookingForProducerOnDay(rec, producer, day)) {
      out.push(bookingFromRecord(rec));
    }
  }
  return out;
}

/**
 * Leave-calendar tooltip for a day with Ongoing mixes.
 * Lists every mix covering the day through its end date.
 */
export function describeProducerMixDayForLeave(
  bookings: ProducerMixDayBooking[]
): string | null {
  if (bookings.length === 0) return null;
  const header =
    bookings.length === 1 ? "Mix on this day" : `Mixes on this day (${bookings.length})`;
  const lines = bookings.map((b) => {
    const startLabel = formatIsoDayMonthYear(b.mixStartDate);
    const endLabel = formatIsoDayMonthYear(b.mixEndDate);
    return `• ${b.programName} (${startLabel} – ${endLabel})`;
  });
  return [header, ...lines].join("\n");
}

/** ISO days in [fromIso, toIso] that have an Ongoing mix for this producer. */
export function collectProducerMixBlockedDays(
  producer: Producer,
  mtdRecords: MTDRecord[],
  fromIso: string,
  toIso: string
): string[] {
  const start = parseFlexibleDate(fromIso);
  const end = parseFlexibleDate(toIso || fromIso);
  if (!start || !end) return [];

  const days: string[] = [];
  const cursor = toDayStart(start);
  const last = toDayStart(end);
  for (let guard = 0; cursor <= last && guard < 800; guard += 1) {
    const iso = dateToIsoLocal(cursor);
    if (countProducerMixesOnDay(producer, cursor, mtdRecords) > 0) {
      days.push(iso);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/** Ongoing mixes overlapping a proposed leave range (any day in range). */
export function findLeaveMixConflicts(
  producer: Producer,
  startIso: string,
  endIso: string,
  mtdRecords: MTDRecord[]
): ProducerMixDayBooking[] {
  const start = parseFlexibleDate(startIso);
  const end = parseFlexibleDate(endIso || startIso);
  if (!start || !end) return [];

  const seen = new Set<string>();
  const out: ProducerMixDayBooking[] = [];
  const cursor = toDayStart(start);
  const last = toDayStart(end);
  for (let guard = 0; cursor <= last && guard < 800; guard += 1) {
    for (const rec of mtdRecords) {
      if (!isBookingForProducerOnDay(rec, producer, cursor)) continue;
      if (seen.has(rec.id)) continue;
      seen.add(rec.id);
      out.push(bookingFromRecord(rec));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/**
 * Sum of producer payouts for every booked mix covering this day. Each mix
 * counts its full payout on every day of its range.
 */
export function countProducerDailyCost(
  producer: Producer,
  day: Date,
  mtdRecords: MTDRecord[],
  excludeRecordId?: string,
  estimateCost?: RecordCostEstimator
): number {
  let total = 0;

  for (const rec of mtdRecords) {
    if (!isBookingForProducerOnDay(rec, producer, day, excludeRecordId)) continue;
    total += bookedRecordCost(rec, estimateCost);
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

export type DailyCostOptions = {
  estimateCost?: RecordCostEstimator;
  /** Payout of the mix being placed; when unknown, only existing bookings are checked. */
  newMixCost?: number | null;
};

export function isProducerUnderDailyCostCapacity(
  producer: Producer,
  day: Date,
  mtdRecords: MTDRecord[],
  excludeRecordId?: string,
  options: DailyCostOptions = {}
): boolean {
  if (producer.maxProducerCostPerDay == null) return true;
  const booked = countProducerDailyCost(
    producer,
    day,
    mtdRecords,
    excludeRecordId,
    options.estimateCost
  );
  if (options.newMixCost != null) {
    return booked + options.newMixCost <= producer.maxProducerCostPerDay;
  }
  return booked < producer.maxProducerCostPerDay;
}

/**
 * Returns true when a producer has reached their daily capacity on a given date.
 * Capacity is reached when EITHER the daily mix count limit OR the daily cost limit is hit.
 */
export function isProducerAtDailyCapacity(
  producer: Producer,
  day: Date,
  mtdRecords: MTDRecord[],
  excludeRecordId?: string,
  options: DailyCostOptions = {}
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
    excludeRecordId,
    options
  );
  return mixCapacityReached || costCapacityReached;
}

/** A day the producer actually works: scheduled (or overtime) and not on leave or a studio holiday. */
export function isProducerWorkableDay(
  producer: Producer,
  day: Date,
  studioHolidays?: StudioHoliday[]
): boolean {
  if (!isProducerScheduledDay(producer, day)) return false;
  // Time off / studio holidays only block regular work days. Overtime is undone by removing the OT date.
  return !(
    isProducerWorkDay(producer, day) &&
    isProducerOnTimeOff(producer, day, studioHolidays)
  );
}

/** Working days in [startIso, endIso] inclusive; weekends, leave, and studio holidays are skipped. */
export function countProducerWorkingDays(
  producer: Producer,
  startIso: string,
  endIso: string,
  studioHolidays?: StudioHoliday[]
): number {
  const start = parseFlexibleDate(startIso);
  const end = parseFlexibleDate(endIso || startIso);
  if (!start || !end) return 0;

  let count = 0;
  const cursor = toDayStart(start);
  const last = toDayStart(end);
  for (let guard = 0; cursor <= last && guard < 800; guard += 1) {
    if (isProducerWorkableDay(producer, cursor, studioHolidays)) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/** Working days a mix takes for its package tier. */
export function packageMixWorkingDays(packageStr: string): number {
  const { tier, limit } = parsePackage(packageStr);
  const t = tier.toUpperCase();
  if (t.includes("PLATINUM")) return 7;
  if (t.includes("GOLD")) return 5;
  if (t.includes("SILVER")) return 4;
  if (t.includes("HOMECOMING")) return 3;
  if (limit === "TBD") return 6;
  return 5;
}

export type MixWorkingDayOptions = {
  /** Without a producer, Mon–Fri count as working days. */
  producer?: Producer | null;
  studioHolidays?: StudioHoliday[];
};

function isMixWorkingDay(day: Date, options: MixWorkingDayOptions): boolean {
  if (options.producer) {
    return isProducerWorkableDay(options.producer, day, options.studioHolidays);
  }
  // Without a producer: Mon–Fri. Calendar holidays do not auto-close the studio.
  return DEFAULT_WORK_DAYS.includes(dateToWeekday(day));
}

/**
 * Suggested mix end: the start plus the package's working days, with the
 * start counting as day one when it is a working day.
 */
export function suggestMixEndDate(
  mixStartDate: string,
  packageStr: string,
  options: MixWorkingDayOptions = {}
): string {
  const start = parseFlexibleDate(mixStartDate);
  if (!start) return "";

  const needed = packageMixWorkingDays(packageStr);
  const cursor = toDayStart(start);
  let counted = 0;
  for (let guard = 0; guard < 400; guard += 1) {
    if (isMixWorkingDay(cursor, options)) {
      counted += 1;
      if (counted >= needed) break;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dateToIsoLocal(cursor);
}

/**
 * Whether the producer can work this mix window: the start and end are days
 * they work. Weekends, leave, and holidays in between are skipped, and daily
 * limits never make a producer unavailable — see `checkProducerDailyLimits`.
 */
export function isProducerAvailableForMixWindow(
  producer: Producer,
  startIso: string,
  endIso: string,
  studioHolidays?: StudioHoliday[]
): boolean {
  if (!parseFlexibleDate(startIso) || !parseFlexibleDate(endIso)) return true;
  return findMixWindowBlocker(producer, startIso, endIso, studioHolidays) === null;
}

export function isProducerUnavailableForRecord(
  producer: Producer,
  rec: MTDRecord,
  studioHolidays?: StudioHoliday[]
): boolean {
  const window = mixWindowForRecord(rec, { producer, studioHolidays });
  if (!window) return false;

  return !isProducerAvailableForMixWindow(
    producer,
    dateToIsoLocal(window.start),
    dateToIsoLocal(window.end),
    studioHolidays
  );
}

export type DailyLimitDay = {
  iso: string;
  bookedMixes: number;
  bookedCost: number;
};

export type DailyLimitCheck = {
  maxMixesPerDay: number | null;
  maxCostPerDay: number | null;
  /** Estimated payout of the mix being assigned; null when unknown until payroll. */
  newMixCost: number | null;
  /** Working day in the range with the most booked mixes (before this mix). */
  peakMixDay: DailyLimitDay | null;
  /** Working day in the range with the highest booked payout (before this mix). */
  peakCostDay: DailyLimitDay | null;
  /** Working days where adding this mix goes over the mixes/day limit. */
  overMixDays: string[];
  /** Working days where adding this mix goes over the cost/day cap. */
  overCostDays: string[];
};

export function dailyLimitCheckHasIssues(check: DailyLimitCheck | null): boolean {
  return Boolean(
    check && (check.overMixDays.length > 0 || check.overCostDays.length > 0)
  );
}

/**
 * Daily mix and cost load across a mix window (start and end included) with
 * the new mix added. Only days the producer works are checked.
 */
export function checkProducerDailyLimits(
  producer: Producer,
  startIso: string,
  endIso: string,
  mtdRecords: MTDRecord[],
  options: DailyCostOptions & {
    excludeRecordId?: string;
    studioHolidays?: StudioHoliday[];
  } = {}
): DailyLimitCheck {
  const maxMixesPerDay = producer.maxMixesPerDay ?? null;
  const maxCostPerDay = producer.maxProducerCostPerDay ?? null;
  const newMixCost = options.newMixCost ?? null;

  const result: DailyLimitCheck = {
    maxMixesPerDay,
    maxCostPerDay,
    newMixCost,
    peakMixDay: null,
    peakCostDay: null,
    overMixDays: [],
    overCostDays: [],
  };

  const start = parseFlexibleDate(startIso);
  const end = parseFlexibleDate(endIso || startIso);
  if (!start || !end) return result;

  const cursor = toDayStart(start);
  const last = toDayStart(end);
  for (let guard = 0; cursor <= last && guard < 400; guard += 1) {
    if (isProducerWorkableDay(producer, cursor, options.studioHolidays)) {
      const day: DailyLimitDay = {
        iso: dateToIsoLocal(cursor),
        bookedMixes: countProducerMixesOnDay(
          producer,
          cursor,
          mtdRecords,
          options.excludeRecordId
        ),
        bookedCost: countProducerDailyCost(
          producer,
          cursor,
          mtdRecords,
          options.excludeRecordId,
          options.estimateCost
        ),
      };

      if (!result.peakMixDay || day.bookedMixes > result.peakMixDay.bookedMixes) {
        result.peakMixDay = day;
      }
      if (!result.peakCostDay || day.bookedCost > result.peakCostDay.bookedCost) {
        result.peakCostDay = day;
      }
      if (maxMixesPerDay != null && day.bookedMixes + 1 > maxMixesPerDay) {
        result.overMixDays.push(day.iso);
      }
      if (
        maxCostPerDay != null &&
        (newMixCost != null
          ? day.bookedCost + newMixCost > maxCostPerDay
          : day.bookedCost >= maxCostPerDay)
      ) {
        result.overCostDays.push(day.iso);
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

export type MixWindowBlockReason = "not_working" | "holiday" | "leave";

export type MixWindowBlocker = {
  reason: MixWindowBlockReason;
  iso: string;
  edge: "start" | "end";
};

/** Why the producer can't work this day (not a work day, or leave), or null. */
export function getProducerDayBlockReason(
  producer: Producer,
  day: Date,
  studioHolidays?: StudioHoliday[]
): MixWindowBlockReason | null {
  if (!isProducerScheduledDay(producer, day)) return "not_working";
  if (isProducerWorkableDay(producer, day, studioHolidays)) return null;
  return "leave";
}

/**
 * The first mix edge (start, then end) that falls on a day the producer
 * can't work. Returns null when both edges are working days.
 */
export function findMixWindowBlocker(
  producer: Producer,
  startIso: string,
  endIso: string,
  studioHolidays?: StudioHoliday[]
): MixWindowBlocker | null {
  const start = parseFlexibleDate(startIso);
  const end = parseFlexibleDate(endIso || startIso);
  if (!start) return null;

  const edges: [MixWindowBlocker["edge"], Date][] = [["start", toDayStart(start)]];
  if (end) edges.push(["end", toDayStart(end)]);

  for (const [edge, day] of edges) {
    const reason = getProducerDayBlockReason(producer, day, studioHolidays);
    if (reason) return { reason, iso: dateToIsoLocal(day), edge };
  }
  return null;
}

/** Short human label for a mix-window blocker. */
export function describeMixWindowBlocker(
  blocker: MixWindowBlocker | null
): string | null {
  if (!blocker) return null;
  const dayLabel = formatIsoDayMonthYear(blocker.iso);
  switch (blocker.reason) {
    case "not_working":
      return `Doesn't work on the ${blocker.edge} date (${dayLabel})`;
    case "holiday":
      return `Studio holiday on the ${blocker.edge} date (${dayLabel})`;
    case "leave":
      return `On leave on the ${blocker.edge} date (${dayLabel})`;
    default:
      return null;
  }
}

export function getProducerUnavailabilityReason(
  producer: Producer,
  rec: MTDRecord,
  studioHolidays?: StudioHoliday[]
): string | null {
  const window = mixWindowForRecord(rec, { producer, studioHolidays });
  const start = window ? window.start : parseFlexibleDate(rec.mixStartDate ?? "");
  if (!start) return null;

  if (!isProducerScheduledDay(producer, start)) {
    const weekdayName = start.toLocaleDateString("en-US", { weekday: "short" });
    return `Not scheduled to work on ${weekdayName}s`;
  }

  if (!isProducerWorkableDay(producer, start, studioHolidays)) {
    return "On approved time off";
  }

  if (!window) return null;
  return describeMixWindowBlocker(
    findMixWindowBlocker(
      producer,
      dateToIsoLocal(window.start),
      dateToIsoLocal(window.end),
      studioHolidays
    )
  );
}
