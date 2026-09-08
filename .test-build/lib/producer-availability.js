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
const types_1 = require("@/types");
const dates_1 = require("@/lib/dates");
const producer_keys_1 = require("@/lib/producer-keys");
const scheduling_1 = require("@/lib/scheduling");
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
function isProducerOvertimeDay(producer, date) {
    const iso = dateToIsoLocal(date);
    return producer.overtimeDays.includes(iso);
}
/** Regular work day or a one-off overtime date. */
function isProducerScheduledDay(producer, date) {
    return isProducerWorkDay(producer, date) || isProducerOvertimeDay(producer, date);
}
function isProducerOnTimeOff(producer, date) {
    const dayIso = dateToIsoLocal(date);
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
function isProducerAvailableOnDay(producer, day, mtdRecords, excludeRecordId) {
    if (!isProducerScheduledDay(producer, day))
        return false;
    if (isProducerOnTimeOff(producer, day))
        return false;
    if (!isProducerUnderDailyCapacity(producer, day, mtdRecords, excludeRecordId)) {
        return false;
    }
    if (!isProducerUnderDailyCostCapacity(producer, day, mtdRecords, excludeRecordId)) {
        return false;
    }
    return true;
}
function isProducerAvailableForMixWindow(producer, startIso, endIso, mtdRecords, excludeRecordId) {
    const start = (0, dates_1.parseFlexibleDate)(startIso);
    const end = (0, dates_1.parseFlexibleDate)(endIso);
    if (!start || !end)
        return true;
    const cursor = toDayStart(start);
    const endDay = toDayStart(end);
    let hasScheduledDay = false;
    while (cursor <= endDay) {
        if (isProducerScheduledDay(producer, cursor)) {
            hasScheduledDay = true;
            if (!isProducerAvailableOnDay(producer, cursor, mtdRecords, excludeRecordId)) {
                return false;
            }
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return hasScheduledDay;
}
function isProducerUnavailableForRecord(producer, rec, mtdRecords) {
    const window = mixWindowForRecord(rec);
    if (!window)
        return false;
    return !isProducerAvailableForMixWindow(producer, dateToIsoLocal(window.start), dateToIsoLocal(window.end), mtdRecords, rec.id);
}
