"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProducerAvailableOnDate = isProducerAvailableOnDate;
exports.calculateProducerNextOpening = calculateProducerNextOpening;
exports.enrichProducerWithSchedule = enrichProducerWithSchedule;
exports.enrichProducersWithSchedule = enrichProducersWithSchedule;
const dates_1 = require("@/lib/dates");
const export_csv_1 = require("@/lib/export-csv");
const producer_availability_1 = require("@/lib/producer-availability");
const schedule_view_1 = require("@/lib/schedule-view");
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
function formatDisplayDate(date) {
    return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
function isSameCalendarDay(d1, d2) {
    return (d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate());
}
function formatLegacyDay(date) {
    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${DAY_NAMES[date.getDay()]} ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}
function isRecordCoveringDate(rec, date, producer) {
    if (!rec.assignedProducer)
        return false;
    const key = producer.name.toUpperCase();
    const initials = producer.initials.toUpperCase();
    const assigned = rec.assignedProducer.toUpperCase();
    if (assigned !== key && assigned !== initials)
        return false;
    const start = (0, dates_1.parseFlexibleDate)(rec.mixStartDate);
    const end = (0, dates_1.parseFlexibleDate)(rec.mixEndDate);
    if (!start || !end)
        return false;
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
function isProducerAvailableOnDate(producer, date, mtdRecords, schedule = []) {
    // 1. Must be a scheduled work day (or overtime day) for the producer
    if (!(0, producer_availability_1.isProducerScheduledDay)(producer, date)) {
        return false;
    }
    // 2. Must not be on approved time off
    if ((0, producer_availability_1.isProducerOnTimeOff)(producer, date)) {
        return false;
    }
    // 3. Must not have an explicit legacy schedule "off" override
    if (schedule.length > 0) {
        const legacyDay = formatLegacyDay(date);
        const sId = (0, schedule_view_1.producerScheduleId)(producer);
        const legacyEntry = schedule.find((s) => s.producer === sId && s.day === legacyDay);
        if (legacyEntry && legacyEntry.status === "off") {
            return false;
        }
    }
    // 4. Must not have an active eligible mix covering this date
    const eligibleRecords = mtdRecords.filter(export_csv_1.isEligibleProducerScheduleRecord);
    const isCoveredByMix = eligibleRecords.some((rec) => isRecordCoveringDate(rec, date, producer));
    if (isCoveredByMix) {
        return false;
    }
    // 5. Must not have reached daily mix count capacity or daily cost capacity
    if ((0, producer_availability_1.isProducerAtDailyCapacity)(producer, date, eligibleRecords)) {
        return false;
    }
    return true;
}
/**
 * Calculates a producer's next opening date and availability status starting from anchorDate.
 */
function calculateProducerNextOpening(producer, mtdRecords = [], schedule = [], anchorDateInput = new Date()) {
    const anchorDate = typeof anchorDateInput === "string"
        ? (0, dates_1.parseFlexibleDate)(anchorDateInput) ?? new Date()
        : (0, schedule_view_1.parseToDate)(anchorDateInput);
    anchorDate.setHours(0, 0, 0, 0);
    // Search ahead up to 180 days for the first available work day
    let foundDate = null;
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
        }
        else {
            nextAvailable = formatDisplayDate(foundDate);
        }
    }
    // Evaluate status over a 7-day week window starting from anchorDate
    const eligibleRecords = mtdRecords.filter(export_csv_1.isEligibleProducerScheduleRecord);
    const weekDates = [];
    for (let i = 0; i < 7; i += 1) {
        const d = new Date(anchorDate);
        d.setDate(d.getDate() + i);
        weekDates.push(d);
    }
    const workDaysInWeek = weekDates.filter((d) => (0, producer_availability_1.isProducerScheduledDay)(producer, d));
    const availableWorkDaysInWeek = workDaysInWeek.filter((d) => isProducerAvailableOnDate(producer, d, mtdRecords, schedule));
    // Check if producer has active eligible mixes covering any day in the week
    const hasBookedMixesInWeek = weekDates.some((d) => eligibleRecords.some((rec) => isRecordCoveringDate(rec, d, producer)));
    let status;
    if (foundDate && isSameCalendarDay(foundDate, anchorDate)) {
        status = "available";
    }
    else if (availableWorkDaysInWeek.length === 0 || !foundDate) {
        status = "unavailable";
    }
    else if (hasBookedMixesInWeek) {
        status = "limited";
    }
    else {
        // If today is a weekend / off day, but next work day (Monday) is open and no mixes in week
        status = "available";
    }
    return {
        nextAvailable,
        nextAvailableDate,
        status,
    };
}
function enrichProducerWithSchedule(producer, mtdRecords = [], schedule = [], anchorDate = new Date()) {
    const calc = calculateProducerNextOpening(producer, mtdRecords, schedule, anchorDate);
    return {
        ...producer,
        nextAvailable: calc.nextAvailable,
        status: calc.status,
    };
}
function enrichProducersWithSchedule(producers, mtdRecords = [], schedule = [], anchorDate = new Date()) {
    return producers.map((p) => enrichProducerWithSchedule(p, mtdRecords, schedule, anchorDate));
}
