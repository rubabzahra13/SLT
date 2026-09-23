"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dateToWeekday = dateToWeekday;
exports.dateToIsoLocal = dateToIsoLocal;
exports.toDayStart = toDayStart;
exports.toDayEnd = toDayEnd;
exports.effectiveWorkDays = effectiveWorkDays;
exports.workDaysFromWeekendOptions = workDaysFromWeekendOptions;
exports.weekendOptionsFromWorkDays = weekendOptionsFromWorkDays;
exports.isProducerWorkDay = isProducerWorkDay;
exports.isEligibleOvertimeDate = isEligibleOvertimeDate;
exports.isEligibleTimeOffDate = isEligibleTimeOffDate;
exports.timeOffRangeCoversWorkDay = timeOffRangeCoversWorkDay;
exports.formatWeekdayLong = formatWeekdayLong;
exports.formatIsoDayMonthYear = formatIsoDayMonthYear;
exports.describeTimeOffOutsideWorkDaysParts = describeTimeOffOutsideWorkDaysParts;
exports.describeTimeOffOutsideWorkDays = describeTimeOffOutsideWorkDays;
exports.formatSkippedProducerSummary = formatSkippedProducerSummary;
exports.expandTimeOffDates = expandTimeOffDates;
exports.overtimeDatesInRange = overtimeDatesInRange;
exports.nextOvertimeOnOrAfter = nextOvertimeOnOrAfter;
exports.prevOvertimeOnOrBefore = prevOvertimeOnOrBefore;
exports.isTimeOffDateBlockedByOvertime = isTimeOffDateBlockedByOvertime;
exports.isProducerOvertimeDay = isProducerOvertimeDay;
exports.isProducerScheduledDay = isProducerScheduledDay;
exports.isProducerOnTimeOff = isProducerOnTimeOff;
exports.mixWindowForRecord = mixWindowForRecord;
exports.mixEndIsoForRecord = mixEndIsoForRecord;
exports.countProducerMixesOnDay = countProducerMixesOnDay;
exports.countProducerDailyCost = countProducerDailyCost;
exports.isProducerUnderDailyCapacity = isProducerUnderDailyCapacity;
exports.isProducerUnderDailyCostCapacity = isProducerUnderDailyCostCapacity;
exports.isProducerAtDailyCapacity = isProducerAtDailyCapacity;
exports.isProducerAvailableOnDay = isProducerAvailableOnDay;
exports.isProducerAvailableForMixWindow = isProducerAvailableForMixWindow;
exports.isProducerUnavailableForRecord = isProducerUnavailableForRecord;
exports.getProducerUnavailabilityReason = getProducerUnavailabilityReason;
const types_1 = require("@/types");
const dates_1 = require("@/lib/dates");
const producer_keys_1 = require("@/lib/producer-keys");
const scheduling_1 = require("@/lib/scheduling");
const producer_time_off_1 = require("@/lib/producer-time-off");
const JS_DAY_TO_WEEKDAY = [
    "sun",
    "mon",
    "tue",
    "wed",
    "thu",
    "fri",
    "sat",
];
function dateToWeekday(date) {
    return JS_DAY_TO_WEEKDAY[date.getDay()];
}
function dateToIsoLocal(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
function toDayStart(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
function toDayEnd(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}
function effectiveWorkDays(producer) {
    if (producer.workDays?.length)
        return producer.workDays;
    return [...types_1.DEFAULT_WORK_DAYS];
}
function workDaysFromWeekendOptions(saturday, sunday) {
    const days = [...types_1.DEFAULT_WORK_DAYS];
    if (saturday)
        days.push("sat");
    if (sunday)
        days.push("sun");
    return days;
}
function weekendOptionsFromWorkDays(workDays) {
    return {
        saturday: workDays.includes("sat"),
        sunday: workDays.includes("sun"),
    };
}
function isProducerWorkDay(producer, date) {
    return effectiveWorkDays(producer).includes(dateToWeekday(date));
}
/** True when this calendar date is outside the regular weekly workDays. */
function isEligibleOvertimeDate(date, workDays) {
    return !workDays.includes(dateToWeekday(date));
}
/** Time off only applies to regular workDays (not overtime / non-work weekdays). */
function isEligibleTimeOffDate(date, workDays) {
    return workDays.includes(dateToWeekday(date));
}
/** True when [startIso, endIso] includes at least one regular work day. */
function timeOffRangeCoversWorkDay(startIso, endIso, workDays) {
    const start = (0, dates_1.parseFlexibleDate)(startIso);
    const end = (0, dates_1.parseFlexibleDate)(endIso || startIso);
    if (!start || !end)
        return false;
    const cursor = toDayStart(start);
    const last = toDayStart(end);
    while (cursor <= last) {
        if (isEligibleTimeOffDate(cursor, workDays))
            return true;
        cursor.setDate(cursor.getDate() + 1);
    }
    return false;
}
const WEEKDAY_LONG = {
    sun: "Sunday",
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
};
function formatWeekdayLong(day) {
    return WEEKDAY_LONG[day];
}
/** e.g. "14 Feb 2027" */
function formatIsoDayMonthYear(iso) {
    const parsed = (0, dates_1.parseFlexibleDate)(iso);
    if (!parsed)
        return iso;
    return parsed.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}
function firstName(fullName) {
    const part = fullName.trim().split(/\s+/)[0];
    return part || "This producer";
}
/**
 * Clear copy when a time-off range falls entirely outside usual work days.
 * Returns separate lines (no em dashes) for the notice modal.
 */
function describeTimeOffOutsideWorkDaysParts(producerName, startIso, endIso, workDays) {
    const start = (0, dates_1.parseFlexibleDate)(startIso);
    const end = (0, dates_1.parseFlexibleDate)(endIso || startIso);
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
    const offDays = new Set();
    const cursor = toDayStart(start);
    const last = toDayStart(end ?? start);
    while (cursor <= last) {
        const day = dateToWeekday(cursor);
        if (!workDays.includes(day))
            offDays.add(day);
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
function describeTimeOffOutsideWorkDays(producerName, startIso, endIso, workDays) {
    const parts = describeTimeOffOutsideWorkDaysParts(producerName, startIso, endIso, workDays);
    return `${parts.dateLine} ${parts.producerLine}`;
}
function formatSkippedProducerSummary(names, options) {
    const previewLimit = options?.previewLimit ?? 3;
    const shown = names.slice(0, previewLimit);
    const extra = Math.max(0, names.length - shown.length);
    const countLabel = names.length === 1 ? "1 producer" : `${names.length} producers`;
    const ratioLabel = typeof options?.total === "number" && options.total > 0
        ? `${names.length}/${options.total}`
        : null;
    return { countLabel, ratioLabel, shown, extra, totalShown: names.length };
}
/** Expand time-off entries into every YYYY-MM-DD they cover (inclusive). */
function expandTimeOffDates(entries) {
    const dates = [];
    for (const entry of entries) {
        const start = (0, dates_1.parseFlexibleDate)(entry.startDate);
        const end = (0, dates_1.parseFlexibleDate)(entry.endDate || entry.startDate) ?? start;
        if (!start)
            continue;
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
function overtimeDatesInRange(overtimeDays, startIso, endIso) {
    const end = endIso || startIso;
    return overtimeDays
        .filter((iso) => iso >= startIso && iso <= end)
        .sort((a, b) => a.localeCompare(b));
}
/** Earliest overtime day on or after `iso`, if any. */
function nextOvertimeOnOrAfter(overtimeDays, iso) {
    const next = overtimeDays
        .filter((day) => day >= iso)
        .sort((a, b) => a.localeCompare(b))[0];
    return next ?? null;
}
/** Latest overtime day on or before `iso`, if any. */
function prevOvertimeOnOrBefore(overtimeDays, iso) {
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
function isTimeOffDateBlockedByOvertime(iso, field, otherIso, overtimeDays) {
    if (overtimeDays.includes(iso))
        return true;
    if (!otherIso)
        return false;
    if (field === "start") {
        const end = otherIso < iso ? iso : otherIso;
        return overtimeDatesInRange(overtimeDays, iso, end).length > 0;
    }
    if (iso < otherIso)
        return true;
    return overtimeDatesInRange(overtimeDays, otherIso, iso).length > 0;
}
function isProducerOvertimeDay(producer, date) {
    const iso = dateToIsoLocal(date);
    return producer.overtimeDays.includes(iso);
}
/** Regular work day or a one-off overtime date. */
function isProducerScheduledDay(producer, date) {
    return isProducerWorkDay(producer, date) || isProducerOvertimeDay(producer, date);
}
function isProducerOnTimeOff(producer, date, studioHolidays) {
    const dayIso = dateToIsoLocal(date);
    if (studioHolidays?.length && (0, producer_time_off_1.isStudioHolidayIso)(dayIso, studioHolidays, producer.id)) {
        return true;
    }
    return producer.timeOff.some((entry) => dayIso >= entry.startDate && dayIso <= entry.endDate);
}
function mixWindowForRecord(rec) {
    const start = (0, dates_1.parseFlexibleDate)(rec.mixStartDate);
    if (!start)
        return null;
    const endIso = (0, dates_1.toIsoDateString)(rec.mixEndDate ?? "") ||
        (0, scheduling_1.suggestMixEndDate)(rec.mixStartDate, rec.package);
    const end = (0, dates_1.parseFlexibleDate)(endIso);
    if (!end)
        return null;
    return { start: toDayStart(start), end: toDayEnd(end) };
}
function mixEndIsoForRecord(rec) {
    return ((0, dates_1.toIsoDateString)(rec.mixEndDate ?? "") ||
        (0, scheduling_1.suggestMixEndDate)(rec.mixStartDate, rec.package));
}
function recordCoversDay(rec, day) {
    if (!rec.assignedProducer)
        return false;
    const window = mixWindowForRecord(rec);
    if (!window)
        return false;
    const dayStart = toDayStart(day);
    const dayEnd = toDayEnd(day);
    return dayStart <= window.end && window.start <= dayEnd;
}
function countProducerMixesOnDay(producer, day, mtdRecords, excludeRecordId) {
    const key = (0, producer_keys_1.normalizeProducerKey)((0, producer_keys_1.producerAssignmentKey)(producer));
    let count = 0;
    for (const rec of mtdRecords) {
        if (rec.id === excludeRecordId)
            continue;
        if (!rec.assignedProducer)
            continue;
        if (!(0, producer_keys_1.producerKeysMatch)(rec.assignedProducer, key))
            continue;
        if (recordCoversDay(rec, day))
            count += 1;
    }
    return count;
}
/**
 * Sum the producer payout costs for all records assigned to this producer on a given day.
 * Uses `rec.producerPayout` (the producer's cut, not the customer price).
 */
function countProducerDailyCost(producer, day, mtdRecords, excludeRecordId) {
    const key = (0, producer_keys_1.normalizeProducerKey)((0, producer_keys_1.producerAssignmentKey)(producer));
    let total = 0;
    for (const rec of mtdRecords) {
        if (rec.id === excludeRecordId)
            continue;
        if (!rec.assignedProducer)
            continue;
        if (!(0, producer_keys_1.producerKeysMatch)(rec.assignedProducer, key))
            continue;
        if (!recordCoversDay(rec, day))
            continue;
        total += rec.producerPayout ?? 0;
    }
    return total;
}
function isProducerUnderDailyCapacity(producer, day, mtdRecords, excludeRecordId) {
    if (producer.maxMixesPerDay == null)
        return true;
    return (countProducerMixesOnDay(producer, day, mtdRecords, excludeRecordId) <
        producer.maxMixesPerDay);
}
function isProducerUnderDailyCostCapacity(producer, day, mtdRecords, excludeRecordId) {
    if (producer.maxProducerCostPerDay == null)
        return true;
    return (countProducerDailyCost(producer, day, mtdRecords, excludeRecordId) <
        producer.maxProducerCostPerDay);
}
/**
 * Returns true when a producer has reached their daily capacity on a given date.
 * Capacity is reached when EITHER the daily mix count limit OR the daily cost limit is hit.
 */
function isProducerAtDailyCapacity(producer, day, mtdRecords, excludeRecordId) {
    const mixCapacityReached = !isProducerUnderDailyCapacity(producer, day, mtdRecords, excludeRecordId);
    const costCapacityReached = !isProducerUnderDailyCostCapacity(producer, day, mtdRecords, excludeRecordId);
    return mixCapacityReached || costCapacityReached;
}
/** True on scheduled days that are not time off and still have mix AND cost capacity. */
function isProducerAvailableOnDay(producer, day, mtdRecords, excludeRecordId, studioHolidays) {
    if (!isProducerScheduledDay(producer, day))
        return false;
    // Time off / studio holidays only block regular work days. Overtime is undone by removing the OT date.
    if (isProducerWorkDay(producer, day) &&
        isProducerOnTimeOff(producer, day, studioHolidays)) {
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
function isProducerAvailableForMixWindow(producer, startIso, endIso, mtdRecords, excludeRecordId, studioHolidays) {
    const start = (0, dates_1.parseFlexibleDate)(startIso);
    const end = (0, dates_1.parseFlexibleDate)(endIso);
    if (!start || !end)
        return true;
    const startDay = toDayStart(start);
    const endDay = toDayStart(end);
    if (!isProducerScheduledDay(producer, startDay)) {
        return false;
    }
    const cursor = new Date(startDay);
    while (cursor <= endDay) {
        if (isProducerScheduledDay(producer, cursor)) {
            if (!isProducerAvailableOnDay(producer, cursor, mtdRecords, excludeRecordId, studioHolidays)) {
                return false;
            }
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return true;
}
function isProducerUnavailableForRecord(producer, rec, mtdRecords) {
    const window = mixWindowForRecord(rec);
    if (!window)
        return false;
    return !isProducerAvailableForMixWindow(producer, dateToIsoLocal(window.start), dateToIsoLocal(window.end), mtdRecords, rec.id);
}
function getProducerUnavailabilityReason(producer, rec, mtdRecords, schedule = []) {
    const window = mixWindowForRecord(rec);
    const start = window ? window.start : (0, dates_1.parseFlexibleDate)(rec.mixStartDate ?? "");
    if (!start)
        return null;
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
        if (!isProducerAvailableForMixWindow(producer, dateToIsoLocal(window.start), dateToIsoLocal(window.end), mtdRecords, rec.id)) {
            return "Conflicting mix or capacity on mix dates";
        }
    }
    return null;
}
