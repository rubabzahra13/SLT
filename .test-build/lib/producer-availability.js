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
exports.isProducerBookingRecord = isProducerBookingRecord;
exports.countProducerMixesOnDay = countProducerMixesOnDay;
exports.listProducerMixBookingsOnDay = listProducerMixBookingsOnDay;
exports.describeProducerMixDayForLeave = describeProducerMixDayForLeave;
exports.collectProducerMixBlockedDays = collectProducerMixBlockedDays;
exports.findLeaveMixConflicts = findLeaveMixConflicts;
exports.countProducerDailyCost = countProducerDailyCost;
exports.isProducerUnderDailyCapacity = isProducerUnderDailyCapacity;
exports.isProducerUnderDailyCostCapacity = isProducerUnderDailyCostCapacity;
exports.isProducerAtDailyCapacity = isProducerAtDailyCapacity;
exports.isProducerWorkableDay = isProducerWorkableDay;
exports.countProducerWorkingDays = countProducerWorkingDays;
exports.packageMixWorkingDays = packageMixWorkingDays;
exports.suggestMixEndDate = suggestMixEndDate;
exports.isProducerAvailableForMixWindow = isProducerAvailableForMixWindow;
exports.isProducerUnavailableForRecord = isProducerUnavailableForRecord;
exports.dailyLimitCheckHasIssues = dailyLimitCheckHasIssues;
exports.checkProducerDailyLimits = checkProducerDailyLimits;
exports.getProducerDayBlockReason = getProducerDayBlockReason;
exports.findMixWindowBlocker = findMixWindowBlocker;
exports.describeMixWindowBlocker = describeMixWindowBlocker;
exports.getProducerUnavailabilityReason = getProducerUnavailabilityReason;
const types_1 = require("@/types");
const dates_1 = require("@/lib/dates");
const producer_keys_1 = require("@/lib/producer-keys");
const package_1 = require("@/lib/package");
const mtd_status_1 = require("@/lib/mtd-status");
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
    return (producer.overtimeDays ?? []).includes(iso);
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
    const timeOff = producer.timeOff ?? [];
    return timeOff.some((entry) => dayIso >= entry.startDate && dayIso <= entry.endDate);
}
function mixWindowForRecord(rec, options = {}) {
    const start = (0, dates_1.parseFlexibleDate)(rec.mixStartDate);
    if (!start)
        return null;
    const endIso = (0, dates_1.toIsoDateString)(rec.mixEndDate ?? "") ||
        suggestMixEndDate(rec.mixStartDate, rec.package, options);
    const end = (0, dates_1.parseFlexibleDate)(endIso);
    if (!end)
        return null;
    return { start: toDayStart(start), end: toDayEnd(end) };
}
function mixEndIsoForRecord(rec) {
    return ((0, dates_1.toIsoDateString)(rec.mixEndDate ?? "") ||
        suggestMixEndDate(rec.mixStartDate, rec.package));
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
/**
 * Whether a record holds its producer's time: assigned and Ongoing.
 * Completed, outsourced, and in-payroll mixes never count toward daily limits.
 */
function isProducerBookingRecord(rec) {
    if (!rec.assignedProducer?.trim())
        return false;
    if (rec.inPayroll || rec.in_payroll)
        return false;
    if (rec.status === "completed")
        return false;
    return (0, mtd_status_1.inferMTDRecordStatus)(rec) === "Ongoing";
}
function bookedRecordCost(rec, estimateCost) {
    return estimateCost?.(rec) ?? rec.producerPayout ?? 0;
}
/** Records may be assigned by initials, legacy code, or full name. */
function isRecordAssignedToProducer(rec, producer) {
    const assigned = rec.assignedProducer?.trim();
    if (!assigned)
        return false;
    if ((0, producer_keys_1.producerKeysMatch)(assigned, (0, producer_keys_1.producerAssignmentKey)(producer)))
        return true;
    return assigned.toUpperCase() === producer.name.trim().toUpperCase();
}
function isBookingForProducerOnDay(rec, producer, day, excludeRecordId) {
    if (rec.id === excludeRecordId)
        return false;
    if (!isProducerBookingRecord(rec))
        return false;
    if (!isRecordAssignedToProducer(rec, producer))
        return false;
    return recordCoversDay(rec, day);
}
function countProducerMixesOnDay(producer, day, mtdRecords, excludeRecordId) {
    let count = 0;
    for (const rec of mtdRecords) {
        if (isBookingForProducerOnDay(rec, producer, day, excludeRecordId))
            count += 1;
    }
    return count;
}
function bookingFromRecord(rec) {
    const startIso = (0, dates_1.toIsoDateString)(rec.mixStartDate ?? "") || rec.mixStartDate;
    const endIso = mixEndIsoForRecord(rec) || startIso;
    return {
        recordId: rec.id,
        programName: rec.programName?.trim() || "Untitled mix",
        mixStartDate: startIso,
        mixEndDate: endIso,
    };
}
/** Ongoing mixes assigned to this producer that cover the given day. */
function listProducerMixBookingsOnDay(producer, dayIso, mtdRecords) {
    const day = (0, dates_1.parseFlexibleDate)(dayIso);
    if (!day)
        return [];
    const out = [];
    for (const rec of mtdRecords) {
        if (isBookingForProducerOnDay(rec, producer, day)) {
            out.push(bookingFromRecord(rec));
        }
    }
    return out;
}
/**
 * Leave-calendar tooltip for a day with Ongoing mixes.
 * e.g. "Mix scheduled · SPIRIT XTREME · ends Oct 15, 2026"
 */
function describeProducerMixDayForLeave(bookings) {
    if (bookings.length === 0)
        return null;
    const lines = bookings.map((b) => {
        const endLabel = formatIsoDayMonthYear(b.mixEndDate);
        return `Mix scheduled · ${b.programName} · ends ${endLabel}`;
    });
    return lines.join("\n");
}
/** ISO days in [fromIso, toIso] that have an Ongoing mix for this producer. */
function collectProducerMixBlockedDays(producer, mtdRecords, fromIso, toIso) {
    const start = (0, dates_1.parseFlexibleDate)(fromIso);
    const end = (0, dates_1.parseFlexibleDate)(toIso || fromIso);
    if (!start || !end)
        return [];
    const days = [];
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
function findLeaveMixConflicts(producer, startIso, endIso, mtdRecords) {
    const start = (0, dates_1.parseFlexibleDate)(startIso);
    const end = (0, dates_1.parseFlexibleDate)(endIso || startIso);
    if (!start || !end)
        return [];
    const seen = new Set();
    const out = [];
    const cursor = toDayStart(start);
    const last = toDayStart(end);
    for (let guard = 0; cursor <= last && guard < 800; guard += 1) {
        for (const rec of mtdRecords) {
            if (!isBookingForProducerOnDay(rec, producer, cursor))
                continue;
            if (seen.has(rec.id))
                continue;
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
function countProducerDailyCost(producer, day, mtdRecords, excludeRecordId, estimateCost) {
    let total = 0;
    for (const rec of mtdRecords) {
        if (!isBookingForProducerOnDay(rec, producer, day, excludeRecordId))
            continue;
        total += bookedRecordCost(rec, estimateCost);
    }
    return total;
}
function isProducerUnderDailyCapacity(producer, day, mtdRecords, excludeRecordId) {
    if (producer.maxMixesPerDay == null)
        return true;
    return (countProducerMixesOnDay(producer, day, mtdRecords, excludeRecordId) <
        producer.maxMixesPerDay);
}
function isProducerUnderDailyCostCapacity(producer, day, mtdRecords, excludeRecordId, options = {}) {
    if (producer.maxProducerCostPerDay == null)
        return true;
    const booked = countProducerDailyCost(producer, day, mtdRecords, excludeRecordId, options.estimateCost);
    if (options.newMixCost != null) {
        return booked + options.newMixCost <= producer.maxProducerCostPerDay;
    }
    return booked < producer.maxProducerCostPerDay;
}
/**
 * Returns true when a producer has reached their daily capacity on a given date.
 * Capacity is reached when EITHER the daily mix count limit OR the daily cost limit is hit.
 */
function isProducerAtDailyCapacity(producer, day, mtdRecords, excludeRecordId, options = {}) {
    const mixCapacityReached = !isProducerUnderDailyCapacity(producer, day, mtdRecords, excludeRecordId);
    const costCapacityReached = !isProducerUnderDailyCostCapacity(producer, day, mtdRecords, excludeRecordId, options);
    return mixCapacityReached || costCapacityReached;
}
/** A day the producer actually works: scheduled (or overtime) and not on leave or a studio holiday. */
function isProducerWorkableDay(producer, day, studioHolidays) {
    if (!isProducerScheduledDay(producer, day))
        return false;
    // Time off / studio holidays only block regular work days. Overtime is undone by removing the OT date.
    return !(isProducerWorkDay(producer, day) &&
        isProducerOnTimeOff(producer, day, studioHolidays));
}
/** Working days in [startIso, endIso] inclusive; weekends, leave, and studio holidays are skipped. */
function countProducerWorkingDays(producer, startIso, endIso, studioHolidays) {
    const start = (0, dates_1.parseFlexibleDate)(startIso);
    const end = (0, dates_1.parseFlexibleDate)(endIso || startIso);
    if (!start || !end)
        return 0;
    let count = 0;
    const cursor = toDayStart(start);
    const last = toDayStart(end);
    for (let guard = 0; cursor <= last && guard < 800; guard += 1) {
        if (isProducerWorkableDay(producer, cursor, studioHolidays))
            count += 1;
        cursor.setDate(cursor.getDate() + 1);
    }
    return count;
}
/** Working days a mix takes for its package tier. */
function packageMixWorkingDays(packageStr) {
    const { tier, limit } = (0, package_1.parsePackage)(packageStr);
    const t = tier.toUpperCase();
    if (t.includes("PLATINUM"))
        return 7;
    if (t.includes("GOLD"))
        return 5;
    if (t.includes("SILVER"))
        return 4;
    if (t.includes("HOMECOMING"))
        return 3;
    if (limit === "TBD")
        return 6;
    return 5;
}
function isMixWorkingDay(day, options) {
    if (options.producer) {
        return isProducerWorkableDay(options.producer, day, options.studioHolidays);
    }
    if (!types_1.DEFAULT_WORK_DAYS.includes(dateToWeekday(day)))
        return false;
    const studioWide = (options.studioHolidays ?? []).filter((holiday) => holiday.appliesToAll !== false);
    return !(0, producer_time_off_1.isStudioHolidayIso)(dateToIsoLocal(day), studioWide);
}
/**
 * Suggested mix end: the start plus the package's working days, with the
 * start counting as day one when it is a working day.
 */
function suggestMixEndDate(mixStartDate, packageStr, options = {}) {
    const start = (0, dates_1.parseFlexibleDate)(mixStartDate);
    if (!start)
        return "";
    const needed = packageMixWorkingDays(packageStr);
    const cursor = toDayStart(start);
    let counted = 0;
    for (let guard = 0; guard < 400; guard += 1) {
        if (isMixWorkingDay(cursor, options)) {
            counted += 1;
            if (counted >= needed)
                break;
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
function isProducerAvailableForMixWindow(producer, startIso, endIso, studioHolidays) {
    if (!(0, dates_1.parseFlexibleDate)(startIso) || !(0, dates_1.parseFlexibleDate)(endIso))
        return true;
    return findMixWindowBlocker(producer, startIso, endIso, studioHolidays) === null;
}
function isProducerUnavailableForRecord(producer, rec, studioHolidays) {
    const window = mixWindowForRecord(rec, { producer, studioHolidays });
    if (!window)
        return false;
    return !isProducerAvailableForMixWindow(producer, dateToIsoLocal(window.start), dateToIsoLocal(window.end), studioHolidays);
}
function dailyLimitCheckHasIssues(check) {
    return Boolean(check && (check.overMixDays.length > 0 || check.overCostDays.length > 0));
}
/**
 * Daily mix and cost load across a mix window (start and end included) with
 * the new mix added. Only days the producer works are checked.
 */
function checkProducerDailyLimits(producer, startIso, endIso, mtdRecords, options = {}) {
    const maxMixesPerDay = producer.maxMixesPerDay ?? null;
    const maxCostPerDay = producer.maxProducerCostPerDay ?? null;
    const newMixCost = options.newMixCost ?? null;
    const result = {
        maxMixesPerDay,
        maxCostPerDay,
        newMixCost,
        peakMixDay: null,
        peakCostDay: null,
        overMixDays: [],
        overCostDays: [],
    };
    const start = (0, dates_1.parseFlexibleDate)(startIso);
    const end = (0, dates_1.parseFlexibleDate)(endIso || startIso);
    if (!start || !end)
        return result;
    const cursor = toDayStart(start);
    const last = toDayStart(end);
    for (let guard = 0; cursor <= last && guard < 400; guard += 1) {
        if (isProducerWorkableDay(producer, cursor, options.studioHolidays)) {
            const day = {
                iso: dateToIsoLocal(cursor),
                bookedMixes: countProducerMixesOnDay(producer, cursor, mtdRecords, options.excludeRecordId),
                bookedCost: countProducerDailyCost(producer, cursor, mtdRecords, options.excludeRecordId, options.estimateCost),
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
            if (maxCostPerDay != null &&
                (newMixCost != null
                    ? day.bookedCost + newMixCost > maxCostPerDay
                    : day.bookedCost >= maxCostPerDay)) {
                result.overCostDays.push(day.iso);
            }
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return result;
}
/** Why the producer can't work this day (not a work day, studio holiday, or leave), or null. */
function getProducerDayBlockReason(producer, day, studioHolidays) {
    if (!isProducerScheduledDay(producer, day))
        return "not_working";
    if (isProducerWorkableDay(producer, day, studioHolidays))
        return null;
    const isHoliday = Boolean(studioHolidays?.length) &&
        (0, producer_time_off_1.isStudioHolidayIso)(dateToIsoLocal(day), studioHolidays, producer.id);
    return isHoliday ? "holiday" : "leave";
}
/**
 * The first mix edge (start, then end) that falls on a day the producer
 * can't work. Returns null when both edges are working days.
 */
function findMixWindowBlocker(producer, startIso, endIso, studioHolidays) {
    const start = (0, dates_1.parseFlexibleDate)(startIso);
    const end = (0, dates_1.parseFlexibleDate)(endIso || startIso);
    if (!start)
        return null;
    const edges = [["start", toDayStart(start)]];
    if (end)
        edges.push(["end", toDayStart(end)]);
    for (const [edge, day] of edges) {
        const reason = getProducerDayBlockReason(producer, day, studioHolidays);
        if (reason)
            return { reason, iso: dateToIsoLocal(day), edge };
    }
    return null;
}
/** Short human label for a mix-window blocker. */
function describeMixWindowBlocker(blocker) {
    if (!blocker)
        return null;
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
function getProducerUnavailabilityReason(producer, rec, studioHolidays) {
    const window = mixWindowForRecord(rec, { producer, studioHolidays });
    const start = window ? window.start : (0, dates_1.parseFlexibleDate)(rec.mixStartDate ?? "");
    if (!start)
        return null;
    if (!isProducerScheduledDay(producer, start)) {
        const weekdayName = start.toLocaleDateString("en-US", { weekday: "short" });
        return `Not scheduled to work on ${weekdayName}s`;
    }
    if (!isProducerWorkableDay(producer, start, studioHolidays)) {
        return "On approved time off";
    }
    if (!window)
        return null;
    return describeMixWindowBlocker(findMixWindowBlocker(producer, dateToIsoLocal(window.start), dateToIsoLocal(window.end), studioHolidays));
}
