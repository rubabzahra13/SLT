import type { MTDRecord, Producer, Weekday } from "@/types";
import { DEFAULT_WORK_DAYS } from "@/types";
import { parseFlexibleDate, toIsoDateString } from "@/lib/dates";
import {
  normalizeProducerKey,
  producerAssignmentKey,
  producerKeysMatch,
} from "@/lib/producer-keys";
import { suggestMixEndDate } from "@/lib/scheduling";

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

export function isProducerOvertimeDay(producer: Producer, date: Date): boolean {
  const iso = dateToIsoLocal(date);
  return producer.overtimeDays.includes(iso);
}

/** Regular work day or a one-off overtime date. */
export function isProducerScheduledDay(producer: Producer, date: Date): boolean {
  return isProducerWorkDay(producer, date) || isProducerOvertimeDay(producer, date);
}

export function isProducerOnTimeOff(producer: Producer, date: Date): boolean {
  const dayIso = dateToIsoLocal(date);
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

/** True on scheduled days that are not time off and still have mix capacity. */
export function isProducerAvailableOnDay(
  producer: Producer,
  day: Date,
  mtdRecords: MTDRecord[],
  excludeRecordId?: string
): boolean {
  if (!isProducerScheduledDay(producer, day)) return false;
  if (isProducerOnTimeOff(producer, day)) return false;
  if (
    !isProducerUnderDailyCapacity(producer, day, mtdRecords, excludeRecordId)
  ) {
    return false;
  }
  return true;
}

export function isProducerAvailableForMixWindow(
  producer: Producer,
  startIso: string,
  endIso: string,
  mtdRecords: MTDRecord[],
  excludeRecordId?: string
): boolean {
  const start = parseFlexibleDate(startIso);
  const end = parseFlexibleDate(endIso);
  if (!start || !end) return true;

  const cursor = toDayStart(start);
  const endDay = toDayStart(end);
  let hasScheduledDay = false;

  while (cursor <= endDay) {
    if (isProducerScheduledDay(producer, cursor)) {
      hasScheduledDay = true;
      if (
        !isProducerAvailableOnDay(
          producer,
          cursor,
          mtdRecords,
          excludeRecordId
        )
      ) {
        return false;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return hasScheduledDay;
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
