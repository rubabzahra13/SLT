import type { MTDRecord, Producer, Weekday } from "@/types";
import { DEFAULT_WORK_DAYS } from "@/types";
import { parseFlexibleDate, toIsoDateString } from "@/lib/dates";
import {
  producerAssignmentKey,
  producerKeysMatch,
} from "@/lib/producer-keys";
import { parsePackage } from "@/lib/package";
import { inferMTDRecordStatus } from "@/lib/mtd-status";

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
export function isEligibleExtraDate(
  date: Date,
  workDays: Weekday[]
): boolean {
  return !workDays.includes(dateToWeekday(date));
}

/** Time off only applies to regular workDays (not extra days / non-work weekdays). */
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

/** Work days in [startIso, endIso] where leave actually applies. */
export function leaveApplicableDaysInRange(
  startIso: string,
  endIso: string,
  workDays: Weekday[]
): string[] {
  const start = parseFlexibleDate(startIso);
  const end = parseFlexibleDate(endIso || startIso);
  if (!start || !end) return [];
  const out: string[] = [];
  const cursor = toDayStart(start);
  const last = toDayStart(end);
  for (let guard = 0; cursor <= last && guard < 800; guard += 1) {
    if (isEligibleTimeOffDate(cursor, workDays)) {
      out.push(dateToIsoLocal(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function monthShort(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short" });
}

/**
 * Compact leave-day list when a range skips non-work days.
 * e.g. "14-18,21-24 Dec 2027" or "28-30 Sep, 1-3 Oct 2027".
 */
export function formatCompactLeaveDaySpans(isos: string[]): string {
  if (isos.length === 0) return "";
  if (isos.length === 1) {
    const [y, m, d] = isos[0].split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  type Run = { start: string; end: string };
  const runs: Run[] = [];
  for (const iso of isos) {
    const last = runs[runs.length - 1];
    if (!last) {
      runs.push({ start: iso, end: iso });
      continue;
    }
    const [y, m, d] = last.end.split("-").map(Number);
    const next = new Date(y, m - 1, d);
    next.setDate(next.getDate() + 1);
    if (dateToIsoLocal(next) === iso) {
      last.end = iso;
    } else {
      runs.push({ start: iso, end: iso });
    }
  }

  const firstDate = (() => {
    const [y, m, d] = isos[0].split("-").map(Number);
    return new Date(y, m - 1, d);
  })();
  const lastDate = (() => {
    const [y, m, d] = isos[isos.length - 1].split("-").map(Number);
    return new Date(y, m - 1, d);
  })();
  const sameMonth =
    firstDate.getFullYear() === lastDate.getFullYear() &&
    firstDate.getMonth() === lastDate.getMonth();
  const year = lastDate.getFullYear();

  function dayNum(iso: string): number {
    return Number(iso.slice(8, 10));
  }

  function formatRun(run: Run, withMonth: boolean): string {
    const days =
      run.start === run.end
        ? String(dayNum(run.start))
        : `${dayNum(run.start)}-${dayNum(run.end)}`;
    if (!withMonth) return days;
    const [y, m, d] = run.end.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return `${days} ${monthShort(date)}`;
  }

  if (sameMonth) {
    const body = runs.map((run) => formatRun(run, false)).join(", ");
    return `${body} ${monthShort(firstDate)} ${year}`;
  }

  return `${runs.map((run) => formatRun(run, true)).join(", ")} ${year}`;
}

/**
 * Leave chip / list label. Lists leave-applicable days compactly with commas
 * and dashes (e.g. "14-18, 21-24 Dec 2027"), never the long weekday arrow form.
 */
export function formatLeaveDateLabel(
  startIso: string,
  endIso: string,
  workDays: Weekday[]
): string {
  const end = endIso || startIso;
  const formatFull = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (startIso === end) return formatFull(startIso);

  const leaveDays = leaveApplicableDaysInRange(startIso, end, workDays);
  if (leaveDays.length === 0) return formatFull(startIso);
  return formatCompactLeaveDaySpans(leaveDays);
}

/** Extra-day ISO dates that fall inside [startIso, endIso] inclusive. */
export function extraDatesInRange(
  extraDays: string[],
  startIso: string,
  endIso: string
): string[] {
  const end = endIso || startIso;
  return extraDays
    .filter((iso) => iso >= startIso && iso <= end)
    .sort((a, b) => a.localeCompare(b));
}

/** Earliest extra day on or after `iso`, if any. */
export function nextExtraDayOnOrAfter(
  extraDays: string[],
  iso: string
): string | null {
  const next = extraDays
    .filter((day) => day >= iso)
    .sort((a, b) => a.localeCompare(b))[0];
  return next ?? null;
}

/** Latest extra day on or before `iso`, if any. */
export function prevExtraDayOnOrBefore(
  extraDays: string[],
  iso: string
): string | null {
  const prev = extraDays
    .filter((day) => day <= iso)
    .sort((a, b) => a.localeCompare(b))
    .at(-1);
  return prev ?? null;
}

/**
 * Time-off ranges cannot include extra days.
 * - Extra days themselves are never selectable.
 * - With an end date set, start must be after any extra day on/before that end.
 * - With a start date set, end must be before any extra day on/after that start.
 */
export function isTimeOffDateBlockedByExtraDay(
  iso: string,
  field: "start" | "end",
  otherIso: string | null | undefined,
  extraDays: string[]
): boolean {
  if (extraDays.includes(iso)) return true;
  if (!otherIso) return false;
  if (field === "start") {
    const end = otherIso < iso ? iso : otherIso;
    return extraDatesInRange(extraDays, iso, end).length > 0;
  }
  if (iso < otherIso) return true;
  return extraDatesInRange(extraDays, otherIso, iso).length > 0;
}

export function isProducerExtraDay(producer: Producer, date: Date): boolean {
  const iso = dateToIsoLocal(date);
  return (producer.extraDays ?? []).includes(iso);
}

/** Regular work day or a one-off extra day. */
export function isProducerScheduledDay(producer: Producer, date: Date): boolean {
  return isProducerWorkDay(producer, date) || isProducerExtraDay(producer, date);
}

export function isProducerOnTimeOff(
  producer: Producer,
  date: Date
): boolean {
  // Off days come from named leave on working days.
  const dayIso = dateToIsoLocal(date);
  const timeOff = producer.timeOff ?? [];
  return timeOff.some((entry) => {
    const start = entry.startDate;
    const end = entry.endDate || entry.startDate;
    if (!start) return false;
    return dayIso >= start && dayIso <= end;
  });
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
 * Whether a record holds its producer's open workload for daily limits.
 * Only assigned Ongoing mixes count — not Completed / payroll / outsourced.
 * (Payroll tab mixes are finished work; limits cover what they are working on.)
 */
export function isProducerBookingRecord(rec: MTDRecord): boolean {
  if (!rec.assignedProducer?.trim()) return false;
  if (rec.inPayroll || (rec as { in_payroll?: boolean }).in_payroll) return false;
  if (rec.status === "completed") return false;
  if ((rec as { recordStatus?: string }).recordStatus === "Completed") {
    return false;
  }
  const status = inferMTDRecordStatus(rec);
  return status === "Ongoing";
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
  const lines = bookings.flatMap((b) => {
    const startLabel = formatIsoDayMonthYear(b.mixStartDate);
    const endLabel = formatIsoDayMonthYear(b.mixEndDate);
    return [`• ${b.programName}`, `  ${startLabel} – ${endLabel}`];
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
 * Daily share of a mix's payout: total ÷ workable days in that mix's range.
 */
export function dailyShareOfRecordCost(
  producer: Producer,
  rec: MTDRecord,
  estimateCost?: RecordCostEstimator
): number {
  const total = bookedRecordCost(rec, estimateCost);
  if (total <= 0) return 0;
  const startIso = toIsoDateString(rec.mixStartDate ?? "") || rec.mixStartDate;
  const endIso = mixEndIsoForRecord(rec) || startIso;
  if (!startIso) return total;
  const days = countProducerWorkingDays(producer, startIso, endIso);
  if (days <= 0) return total;
  return Math.round((total / days) * 100) / 100;
}

/**
 * Sum of per-day payout shares for every booked mix covering this day.
 * Each mix's cost is divided across its own workable days (not repeated in full).
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
    total += dailyShareOfRecordCost(producer, rec, estimateCost);
  }

  return Math.round(total * 100) / 100;
}

export type DailyCostContributor = {
  recordId: string;
  programName: string;
  /** This mix's share counted on this day. */
  dayShare: number;
  /** Full base payout for the mix before dividing across its work days. */
  mixTotal: number;
  /** Producer work days in this mix's range used to divide mixTotal. */
  workDays: number;
  mixStartDate: string;
  mixEndDate: string;
};

function contributorFromRecord(
  producer: Producer,
  rec: MTDRecord,
  estimateCost?: RecordCostEstimator
): DailyCostContributor | null {
  const startIso = toIsoDateString(rec.mixStartDate ?? "") || rec.mixStartDate;
  const endIso = mixEndIsoForRecord(rec) || startIso;
  if (!startIso || !endIso) return null;
  const dayShare = dailyShareOfRecordCost(producer, rec, estimateCost);
  const mixTotal = bookedRecordCost(rec, estimateCost);
  const workDays = countProducerWorkingDays(producer, startIso, endIso);
  // Keep $0 mixes too — they still fill a mix slot on the chart.
  return {
    recordId: rec.id,
    programName: rec.programName?.trim() || "Untitled mix",
    dayShare,
    mixTotal,
    workDays: Math.max(workDays, 0),
    mixStartDate: startIso,
    mixEndDate: endIso,
  };
}

/** Mixes whose per-day payout share makes up a day's booked cost. */
export function listProducerDailyCostContributors(
  producer: Producer,
  day: Date,
  mtdRecords: MTDRecord[],
  excludeRecordId?: string,
  estimateCost?: RecordCostEstimator
): DailyCostContributor[] {
  const out: DailyCostContributor[] = [];
  for (const rec of mtdRecords) {
    if (!isBookingForProducerOnDay(rec, producer, day, excludeRecordId)) continue;
    const row = contributorFromRecord(producer, rec, estimateCost);
    if (!row || row.dayShare <= 0) continue;
    out.push(row);
  }
  return out.sort((a, b) => b.dayShare - a.dayShare);
}

/**
 * Unique booked mixes overlapping [startIso, endIso] inclusive
 * (start and end dates included).
 */
export function listProducerCostContributorsInRange(
  producer: Producer,
  startIso: string,
  endIso: string,
  mtdRecords: MTDRecord[],
  excludeRecordId?: string,
  estimateCost?: RecordCostEstimator
): DailyCostContributor[] {
  const start = parseFlexibleDate(startIso);
  const end = parseFlexibleDate(endIso || startIso);
  if (!start || !end) return [];

  const seen = new Set<string>();
  const out: DailyCostContributor[] = [];
  const cursor = toDayStart(start);
  const last = toDayStart(end);
  for (let guard = 0; cursor <= last && guard < 800; guard += 1) {
    for (const rec of mtdRecords) {
      if (!isBookingForProducerOnDay(rec, producer, cursor, excludeRecordId)) {
        continue;
      }
      if (seen.has(rec.id)) continue;
      seen.add(rec.id);
      const row = contributorFromRecord(producer, rec, estimateCost);
      if (!row) continue;
      out.push(row);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return out.sort((a, b) => {
    const byStart = a.mixStartDate.localeCompare(b.mixStartDate);
    if (byStart !== 0) return byStart;
    return a.programName.localeCompare(b.programName);
  });
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
  /**
   * Per-day payout share of the mix being placed (full payout ÷ its work days).
   * When unknown, only existing bookings are checked.
   */
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

/** A day the producer actually works: scheduled (or extra day) and not on leave. */
export function isProducerWorkableDay(
  producer: Producer,
  day: Date
): boolean {
  if (!isProducerScheduledDay(producer, day)) return false;
  // Leave only blocks regular work days. Extra day is undone by removing the OT date.
  return !(
    isProducerWorkDay(producer, day) &&
    isProducerOnTimeOff(producer, day)
  );
}

/**
 * Next day the producer can work from `fromDate` (inclusive).
 * Skips non-work / leave only — ignores already-scheduled mixes.
 */
export function nextProducerWorkableDayIso(
  producer: Producer,
  fromDate: Date = new Date()
): string {
  const cursor = toDayStart(fromDate);
  for (let i = 0; i < 366; i += 1) {
    if (isProducerWorkableDay(producer, cursor)) {
      return dateToIsoLocal(cursor);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return "";
}

/** Working days in [startIso, endIso] inclusive; weekends and leave are skipped. */
export function countProducerWorkingDays(
  producer: Producer,
  startIso: string,
  endIso: string
): number {
  const start = parseFlexibleDate(startIso);
  const end = parseFlexibleDate(endIso || startIso);
  if (!start || !end) return 0;

  let count = 0;
  const cursor = toDayStart(start);
  const last = toDayStart(end);
  for (let guard = 0; cursor <= last && guard < 800; guard += 1) {
    if (isProducerWorkableDay(producer, cursor)) count += 1;
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
};

function isMixWorkingDay(day: Date, options: MixWorkingDayOptions): boolean {
  if (options.producer) {
    return isProducerWorkableDay(options.producer, day);
  }
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
 * they work. Weekends and leave in between are skipped, and daily
 * limits never make a producer unavailable — see `checkProducerDailyLimits`.
 */
export function isProducerAvailableForMixWindow(
  producer: Producer,
  startIso: string,
  endIso: string
): boolean {
  if (!parseFlexibleDate(startIso) || !parseFlexibleDate(endIso)) return true;
  return findMixWindowBlocker(producer, startIso, endIso) === null;
}

export function isProducerUnavailableForRecord(
  producer: Producer,
  rec: MTDRecord
): boolean {
  const window = mixWindowForRecord(rec, { producer });
  if (!window) return false;

  return !isProducerAvailableForMixWindow(
    producer,
    dateToIsoLocal(window.start),
    dateToIsoLocal(window.end)
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
  /** Full estimated base payout of the mix being assigned; null when unknown. */
  newMixCost: number | null;
  /** Per-day share of newMixCost across workable days in this window. */
  newMixDailyCost: number | null;
  /** Working day in the range with the most booked mixes (before this mix). */
  peakMixDay: DailyLimitDay | null;
  /** Working day in the range with the highest booked payout (before this mix). */
  peakCostDay: DailyLimitDay | null;
  /** Every workable day in the range with current booked load (before this mix). */
  workDays: DailyLimitDay[];
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
  } = {}
): DailyLimitCheck {
  const maxMixesPerDay = producer.maxMixesPerDay ?? null;
  const maxCostPerDay = producer.maxProducerCostPerDay ?? null;
  // options.newMixCost is the FULL base payout; we divide across work days below.
  const newMixCost = options.newMixCost ?? null;

  const result: DailyLimitCheck = {
    maxMixesPerDay,
    maxCostPerDay,
    newMixCost,
    newMixDailyCost: null,
    peakMixDay: null,
    peakCostDay: null,
    workDays: [],
    overMixDays: [],
    overCostDays: [],
  };

  const start = parseFlexibleDate(startIso);
  const end = parseFlexibleDate(endIso || startIso);
  if (!start || !end) return result;

  const cursor = toDayStart(start);
  const last = toDayStart(end);
  for (let guard = 0; cursor <= last && guard < 400; guard += 1) {
    if (isProducerWorkableDay(producer, cursor)) {
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

      result.workDays.push(day);
      if (!result.peakMixDay || day.bookedMixes > result.peakMixDay.bookedMixes) {
        result.peakMixDay = day;
      }
      if (!result.peakCostDay || day.bookedCost > result.peakCostDay.bookedCost) {
        result.peakCostDay = day;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const newMixDailyCost =
    newMixCost != null && result.workDays.length > 0
      ? Math.round((newMixCost / result.workDays.length) * 100) / 100
      : null;
  result.newMixDailyCost = newMixDailyCost;

  for (const day of result.workDays) {
    if (maxMixesPerDay != null && day.bookedMixes + 1 > maxMixesPerDay) {
      result.overMixDays.push(day.iso);
    }
    if (
      maxCostPerDay != null &&
      (newMixDailyCost != null
        ? day.bookedCost + newMixDailyCost > maxCostPerDay
        : day.bookedCost >= maxCostPerDay)
    ) {
      result.overCostDays.push(day.iso);
    }
  }

  return result;
}

export type MixWindowBlockReason = "not_working" | "leave";

export type MixWindowBlocker = {
  reason: MixWindowBlockReason;
  iso: string;
  edge: "start" | "end";
};

/** Why the producer can't work this day (not a work day, or leave), or null. */
export function getProducerDayBlockReason(
  producer: Producer,
  day: Date
): MixWindowBlockReason | null {
  if (!isProducerScheduledDay(producer, day)) return "not_working";
  if (isProducerWorkableDay(producer, day)) return null;
  return "leave";
}

/**
 * The first mix edge (start, then end) that falls on a day the producer
 * can't work. Returns null when both edges are working days.
 */
export function findMixWindowBlocker(
  producer: Producer,
  startIso: string,
  endIso: string
): MixWindowBlocker | null {
  const start = parseFlexibleDate(startIso);
  const end = parseFlexibleDate(endIso || startIso);
  if (!start) return null;

  const edges: [MixWindowBlocker["edge"], Date][] = [["start", toDayStart(start)]];
  if (end) edges.push(["end", toDayStart(end)]);

  for (const [edge, day] of edges) {
    const reason = getProducerDayBlockReason(producer, day);
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
    case "leave":
      return `Off day on the ${blocker.edge} date (${dayLabel})`;
    default:
      return null;
  }
}

export function getProducerUnavailabilityReason(
  producer: Producer,
  rec: MTDRecord
): string | null {
  const window = mixWindowForRecord(rec, { producer });
  const start = window ? window.start : parseFlexibleDate(rec.mixStartDate ?? "");
  if (!start) return null;

  if (!isProducerScheduledDay(producer, start)) {
    const weekdayName = start.toLocaleDateString("en-US", { weekday: "short" });
    return `Not scheduled to work on ${weekdayName}s`;
  }

  if (!isProducerWorkableDay(producer, start)) {
    return "On an approved off day";
  }

  if (!window) return null;
  return describeMixWindowBlocker(
    findMixWindowBlocker(
      producer,
      dateToIsoLocal(window.start),
      dateToIsoLocal(window.end)
    )
  );
}
