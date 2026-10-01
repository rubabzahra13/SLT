import type { MTDRecord, Producer, ScheduleEntry } from "@/types";
import { parseFlexibleDate } from "@/lib/dates";
import {
  isProducerAtDailyCapacity,
  isProducerBookingRecord,
  isProducerOnTimeOff,
  isProducerScheduledDay,
  isProducerWorkDay,
  type DailyCostOptions,
} from "@/lib/producer-availability";
import type { StudioHoliday } from "@/lib/producer-time-off";
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

export type ProducerOpeningOptions = DailyCostOptions & {
  /** The order being assigned; its own booking never counts against the producer. */
  excludeRecordId?: string;
};

/**
 * Whether this is a producer's recommended day to start a new mix: a working
 * day that stays within their daily mix and cost limits once the new mix is
 * added. Without limits, bookings never push the date.
 */
export function isProducerAvailableOnDate(
  producer: Producer,
  date: Date,
  mtdRecords: MTDRecord[],
  schedule: ScheduleEntry[] = [],
  studioHolidays: StudioHoliday[] = [],
  options: ProducerOpeningOptions = {}
): boolean {
  // 1. Must be a scheduled work day (or overtime day) for the producer
  if (!isProducerScheduledDay(producer, date)) {
    return false;
  }

  // 2. Leave / studio holidays block regular work days only.
  //    Overtime days are managed by adding/removing OT (UI blocks OT on holidays).
  if (
    isProducerWorkDay(producer, date) &&
    isProducerOnTimeOff(producer, date, studioHolidays)
  ) {
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

  // 4. Daily mix / cost limits (only when set on the producer)
  if (
    isProducerAtDailyCapacity(
      producer,
      date,
      mtdRecords,
      options.excludeRecordId,
      options
    )
  ) {
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
  anchorDateInput: Date | string = new Date(),
  studioHolidays: StudioHoliday[] = [],
  options: ProducerOpeningOptions = {}
): ProducerScheduleCalcResult {
  const anchorDate =
    typeof anchorDateInput === "string"
      ? parseFlexibleDate(anchorDateInput) ?? new Date()
      : parseToDate(anchorDateInput);
  anchorDate.setHours(0, 0, 0, 0);

  // Walk forward day-by-day until the next open day (cap avoids infinite loops).
  let foundDate: Date | null = null;
  const cursor = new Date(anchorDate);

  for (let i = 0; i < 366; i += 1) {
    if (
      isProducerAvailableOnDate(
        producer,
        cursor,
        mtdRecords,
        schedule,
        studioHolidays,
        options
      )
    ) {
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
  const bookedRecords = mtdRecords.filter(
    (rec) => rec.id !== options.excludeRecordId && isProducerBookingRecord(rec)
  );
  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() + i);
    weekDates.push(d);
  }

  const workDaysInWeek = weekDates.filter((d) => isProducerScheduledDay(producer, d));
  const availableWorkDaysInWeek = workDaysInWeek.filter((d) =>
    isProducerAvailableOnDate(
      producer,
      d,
      mtdRecords,
      schedule,
      studioHolidays,
      options
    )
  );

  // Check if producer has booked mixes covering any day in the week
  const hasBookedMixesInWeek = weekDates.some((d) =>
    bookedRecords.some((rec) => isRecordCoveringDate(rec, d, producer))
  );

  let status: "available" | "limited" | "unavailable";

  if (availableWorkDaysInWeek.length === 0) {
    status = "unavailable";
  } else if (
    availableWorkDaysInWeek.length < workDaysInWeek.length ||
    hasBookedMixesInWeek
  ) {
    status = "limited";
  } else {
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
  anchorDate: Date | string = new Date(),
  studioHolidays: StudioHoliday[] = []
): Producer {
  const calc = calculateProducerNextOpening(
    producer,
    mtdRecords,
    schedule,
    anchorDate,
    studioHolidays
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
  anchorDate: Date | string = new Date(),
  studioHolidays: StudioHoliday[] = []
): Producer[] {
  return producers.map((p) =>
    enrichProducerWithSchedule(p, mtdRecords, schedule, anchorDate, studioHolidays)
  );
}
