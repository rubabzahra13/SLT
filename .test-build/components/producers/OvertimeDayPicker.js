"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OvertimeDayPicker = OvertimeDayPicker;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const DayCalendarPicker_1 = require("@/components/ui/DayCalendarPicker");
const producer_availability_1 = require("@/lib/producer-availability");
const producer_time_off_1 = require("@/lib/producer-time-off");
function leaveReasonsByIso(entries) {
    const map = new Map();
    for (const entry of entries) {
        const reason = (entry.reason || "").trim() || "Leave";
        const start = entry.startDate;
        const end = entry.endDate || entry.startDate;
        if (!start)
            continue;
        let cursor = start;
        let guard = 0;
        while (cursor <= end && guard < 400) {
            const list = map.get(cursor) ?? [];
            if (!list.includes(reason))
                list.push(reason);
            map.set(cursor, list);
            cursor = (0, DayCalendarPicker_1.addDaysToIso)(cursor, 1);
            guard += 1;
        }
    }
    return map;
}
function OvertimeDayPicker({ open, onClose, workDays, selectedDays, onSelect, excludeRef, blockedTimeOffDays = [], leaveEntries = [], studioHolidays = [], }) {
    const todayIso = (0, DayCalendarPicker_1.isoFromLocalDate)(new Date());
    // Current year + next year, through December.
    const maxIso = `${Number(todayIso.slice(0, 4)) + 1}-12-31`;
    const selectedSet = (0, react_1.useMemo)(() => new Set(selectedDays), [selectedDays]);
    const timeOffSet = (0, react_1.useMemo)(() => new Set(blockedTimeOffDays), [blockedTimeOffDays]);
    const leaveReasonMap = (0, react_1.useMemo)(() => leaveReasonsByIso(leaveEntries), [leaveEntries]);
    const studioHolidaySet = (0, react_1.useMemo)(() => (0, producer_time_off_1.studioHolidayIsoSetInRange)(studioHolidays, todayIso, maxIso), [studioHolidays, todayIso, maxIso]);
    const offDayCount = 7 - workDays.length;
    function isStudioHoliday(iso) {
        return (studioHolidaySet.has(iso) || (0, producer_time_off_1.isStudioHolidayIso)(iso, studioHolidays));
    }
    /** Leave / holiday only use OT-specific tips when the day is an off day. */
    function isOffDay(iso, date) {
        return (0, producer_availability_1.isEligibleOvertimeDate)(date, workDays);
    }
    function isHolidayOnOffDay(iso, date) {
        return isStudioHoliday(iso) && isOffDay(iso, date);
    }
    function isLeaveOnOffDay(iso, date) {
        return timeOffSet.has(iso) && isOffDay(iso, date);
    }
    function isDateDisabled(iso) {
        const date = (0, DayCalendarPicker_1.parseIsoToLocalDate)(iso);
        if (!date)
            return true;
        if (iso < todayIso)
            return true;
        // Work days are never OT (leave may exist there — still just a work day).
        if (!(0, producer_availability_1.isEligibleOvertimeDate)(date, workDays))
            return true;
        // Leave shouldn't land on off days; if it does, it blocks OT.
        if (isLeaveOnOffDay(iso, date))
            return true;
        if (isHolidayOnOffDay(iso, date))
            return true;
        if (selectedSet.has(iso))
            return true;
        return false;
    }
    function dayTitle(iso, disabled) {
        if (iso < todayIso)
            return "Past day";
        if (!disabled)
            return `Add ${iso} as overtime`;
        const date = (0, DayCalendarPicker_1.parseIsoToLocalDate)(iso);
        if (date && !(0, producer_availability_1.isEligibleOvertimeDate)(date, workDays)) {
            return "Regular work day\nNot overtime";
        }
        if (date && isLeaveOnOffDay(iso, date)) {
            const reasons = leaveReasonMap.get(iso);
            const name = reasons && reasons.length > 0 ? reasons.join(", ") : "Leave";
            return `${name}\nCancel leave to mark overtime`;
        }
        if (date && isHolidayOnOffDay(iso, date)) {
            const names = (0, producer_time_off_1.studioHolidayNamesForIso)(iso, studioHolidays);
            if (names.length > 0) {
                return `${names.join(", ")}\nNot available for overtime`;
            }
            return "Studio holiday\nNot available";
        }
        if (selectedSet.has(iso))
            return "Already added";
        return undefined;
    }
    function dayTone(iso, disabled) {
        if (!disabled || iso < todayIso)
            return undefined;
        const date = (0, DayCalendarPicker_1.parseIsoToLocalDate)(iso);
        // Leave is work-day-only; never tint off days as leave on the OT calendar.
        if (date && isLeaveOnOffDay(iso, date))
            return "leave";
        if (isStudioHoliday(iso))
            return "holiday";
        return undefined;
    }
    const todayDate = (0, DayCalendarPicker_1.parseIsoToLocalDate)(todayIso);
    const todayIsWorkDay = !!todayDate && !(0, producer_availability_1.isEligibleOvertimeDate)(todayDate, workDays);
    const todayAlreadyAdded = selectedSet.has(todayIso);
    const todayDisabled = isDateDisabled(todayIso);
    return ((0, jsx_runtime_1.jsx)(DayCalendarPicker_1.DayCalendarPicker, { open: open, onClose: onClose, onSelect: onSelect, excludeRef: excludeRef, selectedDays: selectedDays, minIso: todayIso, maxIso: maxIso, isDateDisabled: isDateDisabled, dayTitle: dayTitle, dayTone: dayTone, emptyMessage: offDayCount <= 0
            ? "Every weekday is already a regular work day. Turn one off above to add overtime."
            : null, footer: todayIsWorkDay ? ((0, jsx_runtime_1.jsx)("p", { className: "px-1 text-[11px] font-medium text-brand-ink-tertiary", children: "Today is already a work day. Choose a non-working day for overtime." })) : ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => {
                if (todayDisabled)
                    return;
                onSelect(todayIso);
                onClose();
            }, disabled: todayDisabled, title: todayAlreadyAdded
                ? "Already added as overtime"
                : todayDate && !(0, producer_availability_1.isEligibleOvertimeDate)(todayDate, workDays)
                    ? "Regular work day\nNot overtime"
                    : timeOffSet.has(todayIso)
                        ? `${(leaveReasonMap.get(todayIso) ?? ["Leave"]).join(", ")}\nCancel leave to mark overtime`
                        : todayDisabled
                            ? "Not available for overtime"
                            : "Add today as overtime", className: "rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-signature transition hover:bg-white disabled:opacity-40", children: "Today" })) }));
}
