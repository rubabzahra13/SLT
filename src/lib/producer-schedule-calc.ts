import type { MTDRecord, Producer, ScheduleEntry } from "@/types";
import { parseFlexibleDate } from "@/lib/dates";
import { isEligibleProducerScheduleRecord } from "@/lib/export-csv";
import {
  isProducerAtDailyCapacity,
  isProducerOnTimeOff,
  isProducerScheduledDay,
} from "@/lib/producer-availability";
import { parseToDate, producerScheduleId } from "@/lib/schedule-view";

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

function formatDisplayDate(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function isSameCalendarDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function formatLegacyDay(date: Date): string {
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${DAY_NAMES[date.getDay()]} ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

function isRecordCoveringDate(rec: MTDRecord, date: Date, producer: Producer): boolean {
  if (!rec.assignedProducer) return false;
  const key = producer.name.toUpperCase();
  const initials = producer.initials.toUpperCase();
  const assigned = rec.assignedProducer.toUpperCase();
  if (assigned !== key && assigned !== initials) return false;

  const start = parseFlexibleDate(rec.mixStartDate);
  const end = parseFlexibleDate(rec.mixEndDate);
  if (!start || !end) return false;

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const startDay = new Date(start);
  startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(23, 59, 59, 999);

  return dayStart <= endDay && startDay <= dayStart;
}

/**
 * Returns whether a producer is open/available to take a mix on a specific date.
 */
export function isProducerAvailableOnDate(
  producer: Producer,
  date: Date,
  mtdRecords: MTDRecord[],
  schedule: ScheduleEntry[] = []
): boolean {
  // 1. Must be a scheduled work day (or overtime day) for the producer
  if (!isProducerScheduledDay(producer, date)) {
    return false;
  }

  // 2. Must not be on approved time off
  if (isProducerOnTimeOff(producer, date)) {
    return false;
  }

  // 3. Must not have an explicit legacy schedule "off" override
  if (schedule.length > 0) {
    const legacyDay = formatLegacyDay(date);
    const sId = producerScheduleId(producer);
    const legacyEntry = schedule.find(
      (s) => s.producer === sId && s.day === legacyDay
    );
    if (legacyEntry && legacyEntry.status === "off") {
      return false;
    }
  }

  // 4. Must not have an active eligible mix covering this date
  const eligibleRecords = mtdRecords.filter(isEligibleProducerScheduleRecord);
  const isCoveredByMix = eligibleRecords.some((rec) =>
    isRecordCoveringDate(rec, date, producer)
  );

  if (isCoveredByMix) {
    return false;
  }

  // 5. Must not have reached daily mix count capacity or daily cost capacity
  if (isProducerAtDailyCapacity(producer, date, eligibleRecords)) {
    return false;
  }

  return true;
}

export type ProducerScheduleCalcResult = {
  nextAvailable: string;
  nextAvailableDate: Date;
  status: "available" | "limited" | "unavailable";
};

/**
 * Calculates a producer's next opening date and availability status starting from anchorDate.
 */
export function calculateProducerNextOpening(
  producer: Producer,
  mtdRecords: MTDRecord[] = [],
  schedule: ScheduleEntry[] = [],
  anchorDateInput: Date | string = new Date()
): ProducerScheduleCalcResult {
  const anchorDate =
    typeof anchorDateInput === "string"
      ? parseFlexibleDate(anchorDateInput) ?? new Date()
      : parseToDate(anchorDateInput);
  anchorDate.setHours(0, 0, 0, 0);

  // Search ahead up to 180 days for the first available work day
  let foundDate: Date | null = null;
  const cursor = new Date(anchorDate);

  for (let i = 0; i < 180; i += 1) {
    if (isProducerAvailableOnDate(producer, cursor, mtdRecords, schedule)) {
      foundDate = new Date(cursor);
      break;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const nextAvailableDate = foundDate ?? new Date(anchorDate);
  let nextAvailable = "TBD";

  if (foundDate) {
    if (isSameCalendarDay(foundDate, anchorDate)) {
      nextAvailable = "Today";
    } else {
      nextAvailable = formatDisplayDate(foundDate);
    }
  }

  // Evaluate status over a 7-day week window starting from anchorDate
  const eligibleRecords = mtdRecords.filter(isEligibleProducerScheduleRecord);
  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() + i);
    weekDates.push(d);
  }

  const workDaysInWeek = weekDates.filter((d) => isProducerScheduledDay(producer, d));
  const availableWorkDaysInWeek = workDaysInWeek.filter((d) =>
    isProducerAvailableOnDate(producer, d, mtdRecords, schedule)
  );

  // Check if producer has active eligible mixes covering any day in the week
  const hasBookedMixesInWeek = weekDates.some((d) =>
    eligibleRecords.some((rec) => isRecordCoveringDate(rec, d, producer))
  );

  let status: "available" | "limited" | "unavailable";

  if (foundDate && isSameCalendarDay(foundDate, anchorDate)) {
    status = "available";
  } else if (availableWorkDaysInWeek.length === 0 || !foundDate) {
    status = "unavailable";
  } else if (hasBookedMixesInWeek) {
    status = "limited";
  } else {
    // If today is a weekend / off day, but next work day (Monday) is open and no mixes in week
    status = "available";
  }

  return {
    nextAvailable,
    nextAvailableDate,
    status,
  };
}

export function enrichProducerWithSchedule(
  producer: Producer,
  mtdRecords: MTDRecord[] = [],
  schedule: ScheduleEntry[] = [],
  anchorDate: Date | string = new Date()
): Producer {
  const calc = calculateProducerNextOpening(
    producer,
    mtdRecords,
    schedule,
    anchorDate
  );
  return {
    ...producer,
    nextAvailable: calc.nextAvailable,
    status: calc.status,
  };
}

export function enrichProducersWithSchedule(
  producers: Producer[],
  mtdRecords: MTDRecord[] = [],
  schedule: ScheduleEntry[] = [],
  anchorDate: Date | string = new Date()
): Producer[] {
  return producers.map((p) =>
    enrichProducerWithSchedule(p, mtdRecords, schedule, anchorDate)
  );
}
