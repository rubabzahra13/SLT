"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.previewTimeOffAssignees = previewTimeOffAssignees;
exports.buildTimeOffEntry = buildTimeOffEntry;
exports.listUpcomingTimeOff = listUpcomingTimeOff;
exports.formatTimeOffRangeLabel = formatTimeOffRangeLabel;
exports.previewOvertimeAssignees = previewOvertimeAssignees;
exports.listUpcomingOvertime = listUpcomingOvertime;
exports.formatOvertimeDayLabel = formatOvertimeDayLabel;
exports.overtimeCalendarBlockReason = overtimeCalendarBlockReason;
exports.isOvertimeCalendarDateDisabled = isOvertimeCalendarDateDisabled;
exports.overtimeCalendarDayTitle = overtimeCalendarDayTitle;
const producer_availability_1 = require("@/lib/producer-availability");
const producer_time_off_1 = require("@/lib/producer-time-off");
const producer_time_off_2 = require("@/lib/producer-time-off");
function previewTimeOffAssignees(producers, options) {
    const end = options.endDate || options.startDate;
    const reason = options.reason.trim();
    const rows = [];
    for (const producer of producers) {
        if (!options.selectedIds.has(producer.id))
            continue;
        if (options.type === "holiday" && (0, producer_time_off_1.producerHasHoliday)(producer, reason)) {
            rows.push({
                id: producer.id,
                name: producer.name,
                status: "already",
                overtimeDates: [],
            });
            continue;
        }
        if (options.type === "personal" &&
            producer.timeOff.some((entry) => entry.type === "personal" &&
                entry.reason.trim().toLowerCase() === reason.toLowerCase() &&
                entry.startDate === options.startDate &&
                (entry.endDate || entry.startDate) === end)) {
            rows.push({
                id: producer.id,
                name: producer.name,
                status: "already",
                overtimeDates: [],
            });
            continue;
        }
        const otDates = (0, producer_availability_1.overtimeDatesInRange)(producer.overtimeDays, options.startDate, end);
        if (otDates.length > 0) {
            rows.push({
                id: producer.id,
                name: producer.name,
                status: "overtime",
                overtimeDates: otDates,
            });
            continue;
        }
        if (!(0, producer_availability_1.timeOffRangeCoversWorkDay)(options.startDate, end, producer.workDays)) {
            rows.push({
                id: producer.id,
                name: producer.name,
                status: "nonwork",
                overtimeDates: [],
            });
            continue;
        }
        rows.push({
            id: producer.id,
            name: producer.name,
            status: "apply",
            overtimeDates: [],
        });
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
}
function buildTimeOffEntry(options) {
    return {
        id: `to-${options.producerId}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 6)}`,
        startDate: options.startDate,
        endDate: options.endDate || options.startDate,
        type: options.type,
        reason: options.reason.trim(),
    };
}
function listUpcomingTimeOff(producers, fromIso) {
    const rows = [];
    for (const producer of producers) {
        for (const entry of producer.timeOff) {
            const end = entry.endDate || entry.startDate;
            if (end < fromIso)
                continue;
            rows.push({
                key: `${producer.id}:${entry.id}`,
                producerId: producer.id,
                producerName: producer.name,
                entry,
            });
        }
    }
    return rows.sort((a, b) => {
        const byStart = a.entry.startDate.localeCompare(b.entry.startDate);
        if (byStart !== 0)
            return byStart;
        return a.producerName.localeCompare(b.producerName);
    });
}
function formatTimeOffRangeLabel(entry) {
    if (entry.startDate === entry.endDate)
        return entry.startDate;
    return `${entry.startDate} → ${entry.endDate}`;
}
function isoToLocalDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
}
function previewOvertimeAssignees(producers, options) {
    const dateIso = options.dateIso.trim();
    const rows = [];
    for (const producer of producers) {
        if (!options.selectedIds.has(producer.id))
            continue;
        if (producer.overtimeDays.includes(dateIso)) {
            rows.push({
                id: producer.id,
                name: producer.name,
                status: "already",
            });
            continue;
        }
        const workDays = (0, producer_availability_1.effectiveWorkDays)(producer);
        const date = isoToLocalDate(dateIso);
        if (!(0, producer_availability_1.isEligibleOvertimeDate)(date, workDays)) {
            rows.push({
                id: producer.id,
                name: producer.name,
                status: "workday",
            });
            continue;
        }
        const timeOffDays = (0, producer_availability_1.expandTimeOffDates)(producer.timeOff);
        if (timeOffDays.includes(dateIso)) {
            rows.push({
                id: producer.id,
                name: producer.name,
                status: "timeoff",
            });
            continue;
        }
        rows.push({
            id: producer.id,
            name: producer.name,
            status: "apply",
        });
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
}
function listUpcomingOvertime(producers, fromIso) {
    const rows = [];
    for (const producer of producers) {
        for (const iso of producer.overtimeDays) {
            if (iso < fromIso)
                continue;
            rows.push({
                key: `${producer.id}:${iso}`,
                producerId: producer.id,
                producerName: producer.name,
                iso,
            });
        }
    }
    return rows.sort((a, b) => {
        const byDate = a.iso.localeCompare(b.iso);
        if (byDate !== 0)
            return byDate;
        return a.producerName.localeCompare(b.producerName);
    });
}
function formatOvertimeDayLabel(iso) {
    const date = isoToLocalDate(iso);
    return date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}
function overtimeCalendarBlockReason(iso, options) {
    if (iso < options.todayIso)
        return "past";
    const selected = options.producers.filter((p) => options.selectedIds.has(p.id));
    const holidayHitsSelected = selected.length === 0
        ? (0, producer_time_off_2.isStudioHolidayIso)(iso, options.studioHolidays)
        : selected.some((p) => (0, producer_time_off_2.isStudioHolidayIso)(iso, options.studioHolidays, p.id));
    if (holidayHitsSelected)
        return "studio_holiday";
    if (selected.length === 0)
        return "none";
    const someoneOnTimeOff = selected.some((p) => (0, producer_availability_1.expandTimeOffDates)(p.timeOff).includes(iso));
    if (someoneOnTimeOff)
        return "time_off";
    return "none";
}
function isOvertimeCalendarDateDisabled(iso, options) {
    const reason = overtimeCalendarBlockReason(iso, options);
    return reason === "past" || reason === "studio_holiday" || reason === "time_off";
}
function overtimeCalendarDayTitle(iso, options) {
    const reason = overtimeCalendarBlockReason(iso, options);
    if (reason === "past")
        return "Past day";
    if (reason === "studio_holiday")
        return "Studio holiday\nNot available";
    if (reason === "time_off")
        return "Holiday or personal time off";
    return undefined;
}
