"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProducerAvailabilityModal = ProducerAvailabilityModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const ProducerCategoryAddMenu_1 = require("@/components/producers/ProducerCategoryAddMenu");
const OvertimeDayPicker_1 = require("@/components/producers/OvertimeDayPicker");
const DayCalendarPicker_1 = require("@/components/ui/DayCalendarPicker");
const SoftSelect_1 = require("@/components/ui/SoftSelect");
const AppStateContext_1 = require("@/context/AppStateContext");
const producer_availability_1 = require("@/lib/producer-availability");
const producer_time_off_1 = require("@/lib/producer-time-off");
const producer_category_groups_1 = require("@/lib/producer-category-groups");
const producers_1 = require("@/lib/producers");
const Tabs_1 = require("@/components/ui/Tabs");
const Avatar_1 = require("@/components/ui/Avatar");
const types_1 = require("@/types");
/** OT dates that would be dropped if these work days became active. */
function overtimeDatesBlockedByWorkDays(overtimeDays, nextWorkDays) {
    return overtimeDays.filter((iso) => {
        const parts = iso.split("-").map(Number);
        if (parts.length !== 3 || parts.some((n) => Number.isNaN(n)))
            return false;
        const [y, m, d] = parts;
        return !(0, producer_availability_1.isEligibleOvertimeDate)(new Date(y, m - 1, d), nextWorkDays);
    });
}
/** Leave dates that would no longer fall on a work day. */
function leaveDatesBlockedByWorkDays(entries, nextWorkDays) {
    return [
        ...new Set((0, producer_availability_1.expandTimeOffDates)(entries).filter((iso) => {
            const parts = iso.split("-").map(Number);
            if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
                return false;
            }
            const [y, m, d] = parts;
            return !(0, producer_availability_1.isEligibleTimeOffDate)(new Date(y, m - 1, d), nextWorkDays);
        })),
    ].sort((a, b) => a.localeCompare(b));
}
/** Drop blocked dates from leave ranges; split into contiguous entries. */
function stripLeaveDatesFromEntries(entries, removeIso) {
    const remove = new Set(removeIso);
    if (remove.size === 0)
        return entries;
    const next = [];
    for (const entry of entries) {
        const kept = (0, producer_availability_1.expandTimeOffDates)([entry]).filter((iso) => !remove.has(iso));
        if (kept.length === 0)
            continue;
        let rangeStart = kept[0];
        let prev = kept[0];
        for (let i = 1; i < kept.length; i += 1) {
            const iso = kept[i];
            const expected = (0, DayCalendarPicker_1.addDaysToIso)(prev, 1);
            if (iso !== expected) {
                next.push({
                    ...entry,
                    key: `${entry.key}-${rangeStart}`,
                    startDate: rangeStart,
                    endDate: prev,
                });
                rangeStart = iso;
            }
            prev = iso;
        }
        next.push({
            ...entry,
            key: `${entry.key}-${rangeStart}`,
            startDate: rangeStart,
            endDate: prev,
        });
    }
    return next;
}
function weekdayLabel(day) {
    return types_1.WEEKDAYS.find((entry) => entry.id === day)?.label ?? day;
}
const OT_CONFLICT_ROW_PX = 44;
const OT_CONFLICT_GAP_PX = 8;
const OT_CONFLICT_VISIBLE_ROWS = 3;
const OT_CONFLICT_LIST_PX = OT_CONFLICT_VISIBLE_ROWS * OT_CONFLICT_ROW_PX +
    (OT_CONFLICT_VISIBLE_ROWS - 1) * OT_CONFLICT_GAP_PX;
const CATEGORY_RATE_LIST_PX = 224;
function CustomScrollRail({ children, maxHeight, className, listClassName, fadeFromClassName = "from-brand-elevated", syncKey, }) {
    const listRef = (0, react_1.useRef)(null);
    const [thumb, setThumb] = (0, react_1.useState)({ top: 0, height: 0, show: false });
    const [atBottom, setAtBottom] = (0, react_1.useState)(false);
    function syncThumb() {
        const el = listRef.current;
        if (!el)
            return;
        const { scrollTop, scrollHeight, clientHeight } = el;
        if (scrollHeight <= clientHeight + 1) {
            setAtBottom(true);
            setThumb((current) => current.show ? { top: 0, height: 0, show: false } : current);
            return;
        }
        const height = Math.max(28, (clientHeight / scrollHeight) * clientHeight);
        const maxTop = clientHeight - height;
        const scrollable = scrollHeight - clientHeight;
        const top = (scrollable <= 0 ? 0 : scrollTop / scrollable) * maxTop;
        setThumb({ top, height, show: true });
        setAtBottom(scrollTop >= scrollable - 1);
    }
    (0, react_1.useEffect)(() => {
        syncThumb();
        const el = listRef.current;
        if (!el || typeof ResizeObserver === "undefined")
            return;
        const observer = new ResizeObserver(() => syncThumb());
        observer.observe(el);
        return () => observer.disconnect();
    }, [syncKey]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("relative pr-3.5", className), children: [(0, jsx_runtime_1.jsx)("div", { ref: listRef, onScroll: syncThumb, className: (0, clsx_1.default)("overflow-y-auto overscroll-contain scrollbar-hide", listClassName), style: { maxHeight }, children: children }), thumb.show ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { "aria-hidden": true, className: "pointer-events-none absolute bottom-0 right-0 top-0 w-2 rounded-full bg-black/10", children: (0, jsx_runtime_1.jsx)("div", { className: "absolute inset-x-0 rounded-full bg-brand-ink/50", style: {
                                height: thumb.height,
                                transform: `translateY(${thumb.top}px)`,
                            } }) }), (0, jsx_runtime_1.jsx)("div", { "aria-hidden": true, className: (0, clsx_1.default)("pointer-events-none absolute inset-x-3.5 bottom-0 h-8 rounded-b-2xl bg-gradient-to-t to-transparent transition-opacity", fadeFromClassName, atBottom ? "opacity-0" : "opacity-100") })] })) : null] }));
}
function WorkDayOtConflictDateList({ dates }) {
    return ((0, jsx_runtime_1.jsx)(CustomScrollRail, { className: "mt-4", maxHeight: OT_CONFLICT_LIST_PX, listClassName: "space-y-2", syncKey: dates.join("|"), children: dates.map((iso) => ((0, jsx_runtime_1.jsx)("div", { className: "flex h-11 shrink-0 items-center rounded-2xl bg-brand-bg px-4 text-[13px] font-semibold text-brand-ink ring-1 ring-inset ring-black/[0.06]", children: formatOvertimeLabel(iso) }, iso))) }));
}
function formatOvertimeLabel(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}
function createEmptyTimeOffDraft(personalReasons) {
    return {
        key: "draft",
        startDate: "",
        endDate: "",
        type: "personal",
        reason: (0, producer_time_off_1.defaultReasonForTimeOffType)("personal", undefined, personalReasons),
    };
}
function formatShortDateLabel(iso) {
    if (!iso)
        return "Select date";
    const [y, m, d] = iso.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}
function formatHolidayListDate(startIso, endIso) {
    const fmt = (iso) => {
        const [y, m, d] = iso.split("-").map(Number);
        return new Date(y, m - 1, d).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
        });
    };
    if (!startIso)
        return "—";
    if (startIso === endIso)
        return fmt(startIso);
    return `${fmt(startIso)} – ${fmt(endIso)}`;
}
const MIN_MAX_COST_PER_DAY = 100;
const MAX_MAX_COST_PER_DAY = 20000;
const MAX_COST_STEP = 100;
function clampMaxCostPerDay(value) {
    return Math.min(MAX_MAX_COST_PER_DAY, Math.max(MIN_MAX_COST_PER_DAY, Math.round(value)));
}
function categoriesFromProducer(producer) {
    const norm = (0, producers_1.normalizeProducer)(producer);
    const categories = norm.categories?.length
        ? [...norm.categories]
        : norm.specialty
            ? [norm.specialty]
            : [];
    const categoryRates = {};
    for (const cat of categories) {
        const raw = norm.ratesByCategory?.[cat] ?? norm.defaultRate ?? 0.5;
        categoryRates[cat] = raw <= 1 ? Math.round(raw * 100) : raw;
    }
    return { categories, categoryRates };
}
function formatTimeOffDateLabel(entry) {
    if (entry.startDate === entry.endDate) {
        return formatOvertimeLabel(entry.startDate);
    }
    return `${formatOvertimeLabel(entry.startDate)} → ${formatOvertimeLabel(entry.endDate)}`;
}
function NoticeProducerList({ label, names, total, expanded, onToggleExpand, }) {
    if (names.length === 0)
        return null;
    const summary = (0, producer_availability_1.formatSkippedProducerSummary)(names, {
        total,
        previewLimit: expanded ? names.length : 3,
    });
    const heading = summary.ratioLabel
        ? `${label} ${summary.ratioLabel}`
        : `${label} ${summary.countLabel}`;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "mt-4", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary", children: heading }), (0, jsx_runtime_1.jsx)("ul", { className: "mt-2 space-y-1.5", children: summary.shown.map((name) => ((0, jsx_runtime_1.jsx)("li", { className: "rounded-xl bg-brand-bg px-3 py-2 text-[13px] font-medium text-brand-ink ring-1 ring-inset ring-black/[0.05]", children: name }, name))) }), summary.extra > 0 ? ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: onToggleExpand, className: "mt-2 w-full text-center text-[12px] font-semibold text-brand-blue transition hover:text-brand-signature", children: ["View all ", names.length] })) : expanded && names.length > 3 ? ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onToggleExpand, className: "mt-2 w-full text-center text-[12px] font-semibold text-brand-ink-tertiary transition hover:text-brand-ink", children: "Show less" })) : null] }));
}
function ProducerAvailabilityModal({ open, onClose, producer, onSave, readOnly = false, }) {
    const { holidays, personalReasons } = (0, AppStateContext_1.useAppState)();
    const [workDays, setWorkDays] = (0, react_1.useState)([...types_1.DEFAULT_WORK_DAYS]);
    const [timeOff, setTimeOff] = (0, react_1.useState)([]);
    const [timeOffDraft, setTimeOffDraft] = (0, react_1.useState)(() => createEmptyTimeOffDraft());
    const [showTimeOffForm, setShowTimeOffForm] = (0, react_1.useState)(false);
    const [timeOffNotice, setTimeOffNotice] = (0, react_1.useState)(null);
    const [noticeListExpand, setNoticeListExpand] = (0, react_1.useState)(null);
    const [hasMaxCapacity, setHasMaxCapacity] = (0, react_1.useState)(false);
    const [maxMixesPerDay, setMaxMixesPerDay] = (0, react_1.useState)(6);
    const [maxProducerCostPerDay, setMaxProducerCostPerDay] = (0, react_1.useState)(2000);
    const [maxCostInput, setMaxCostInput] = (0, react_1.useState)("2000");
    const [overtimeDays, setOvertimeDays] = (0, react_1.useState)([]);
    const [workDayOtConflict, setWorkDayOtConflict] = (0, react_1.useState)(null);
    const [workDayLeaveConflict, setWorkDayLeaveConflict] = (0, react_1.useState)(null);
    const [overtimePickerOpen, setOvertimePickerOpen] = (0, react_1.useState)(false);
    const [timeOffDateField, setTimeOffDateField] = (0, react_1.useState)(null);
    const [reasonSelectOpen, setReasonSelectOpen] = (0, react_1.useState)(false);
    const [otherReasonName, setOtherReasonName] = (0, react_1.useState)("");
    const [timeOffMultiDay, setTimeOffMultiDay] = (0, react_1.useState)(false);
    const [activeTab, setActiveTab] = (0, react_1.useState)("schedule");
    const [showAllHolidays, setShowAllHolidays] = (0, react_1.useState)(false);
    const [categories, setCategories] = (0, react_1.useState)([]);
    const [categoryRates, setCategoryRates] = (0, react_1.useState)({});
    const overtimeButtonRef = (0, react_1.useRef)(null);
    const timeOffStartRef = (0, react_1.useRef)(null);
    const timeOffEndRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!open || !producer)
            return;
        setActiveTab("schedule");
        setWorkDays([...producer.workDays]);
        setTimeOff(producer.timeOff
            .filter((entry) => entry.type === "personal")
            .map((entry) => ({
            key: entry.id,
            startDate: entry.startDate,
            endDate: entry.endDate,
            type: entry.type,
            reason: entry.reason,
        })));
        setHasMaxCapacity(producer.maxMixesPerDay != null || producer.maxProducerCostPerDay != null);
        setMaxMixesPerDay(producer.maxMixesPerDay ?? 6);
        setMaxProducerCostPerDay(producer.maxProducerCostPerDay ?? 2000);
        setMaxCostInput(String(producer.maxProducerCostPerDay ?? 2000));
        setOvertimeDays([...producer.overtimeDays]);
        setWorkDayOtConflict(null);
        setWorkDayLeaveConflict(null);
        setOvertimePickerOpen(false);
        setShowAllHolidays(false);
        setTimeOffDraft(createEmptyTimeOffDraft(personalReasons));
        setShowTimeOffForm(false);
        const { categories: nextCategories, categoryRates: nextCategoryRates } = categoriesFromProducer(producer);
        setCategories(nextCategories);
        setCategoryRates(nextCategoryRates);
    }, [open, producer, personalReasons]);
    (0, react_1.useEffect)(() => {
        if (activeTab !== "schedule")
            setOvertimePickerOpen(false);
        if (activeTab !== "leave") {
            setShowTimeOffForm(false);
            setTimeOffDateField(null);
            setReasonSelectOpen(false);
            setOtherReasonName("");
            setTimeOffMultiDay(false);
        }
        if (activeTab !== "holidays")
            setShowAllHolidays(false);
    }, [activeTab]);
    if (!open || !producer)
        return null;
    // Nested helpers don't keep the null narrowing from the guard above.
    const producerId = producer.id;
    const usesPercentageCompensation = producer.compensationModel !== "not_paid_for_mixing" &&
        producer.compensationModel !== "hourly_manual";
    function applyWorkDayChange(nextWorkDays) {
        setWorkDays(nextWorkDays);
        // Drop overtime dates that now fall on regular work weekdays.
        setOvertimeDays((days) => days.filter((iso) => {
            const date = (0, DayCalendarPicker_1.parseIsoToLocalDate)(iso);
            return !!date && (0, producer_availability_1.isEligibleOvertimeDate)(date, nextWorkDays);
        }));
    }
    function toggleDay(day) {
        if (workDays.includes(day)) {
            const nextWorkDays = workDays.filter((d) => d !== day);
            const conflicting = leaveDatesBlockedByWorkDays(timeOff, nextWorkDays);
            if (conflicting.length > 0) {
                setWorkDayLeaveConflict({ day, leaveDates: conflicting });
                return;
            }
            applyWorkDayChange(nextWorkDays);
            return;
        }
        const nextWorkDays = [...workDays, day];
        const conflicting = overtimeDatesBlockedByWorkDays(overtimeDays, nextWorkDays);
        if (conflicting.length > 0) {
            setWorkDayOtConflict({ day, overtimeDates: conflicting });
            return;
        }
        applyWorkDayChange(nextWorkDays);
    }
    function clearWorkDayOtConflict() {
        setWorkDayOtConflict(null);
    }
    function confirmWorkDayOtRemoval() {
        if (!workDayOtConflict)
            return;
        const { day } = workDayOtConflict;
        const next = workDays.includes(day) ? workDays : [...workDays, day];
        applyWorkDayChange(next);
        setWorkDayOtConflict(null);
    }
    function clearWorkDayLeaveConflict() {
        setWorkDayLeaveConflict(null);
    }
    function confirmWorkDayLeaveRemoval() {
        if (!workDayLeaveConflict)
            return;
        const { day, leaveDates } = workDayLeaveConflict;
        const next = workDays.filter((d) => d !== day);
        setTimeOff((entries) => stripLeaveDatesFromEntries(entries, leaveDates));
        applyWorkDayChange(next);
        setWorkDayLeaveConflict(null);
    }
    function closeTimeOffForm() {
        setTimeOffDraft(createEmptyTimeOffDraft(personalReasons));
        setOtherReasonName("");
        setTimeOffMultiDay(false);
        setTimeOffDateField(null);
        setReasonSelectOpen(false);
        setShowTimeOffForm(false);
    }
    function clearTimeOffNotice() {
        setTimeOffNotice(null);
        setNoticeListExpand(null);
    }
    function showTimeOffNotice(notice) {
        setNoticeListExpand(null);
        setTimeOffNotice(notice);
    }
    function updateTimeOffDraft(patch) {
        clearTimeOffNotice();
        setTimeOffDraft((current) => ({ ...current, ...patch }));
    }
    function getBlockedTimeOffDays() {
        return [
            ...new Set([...overtimeDays, ...(0, producer_availability_1.expandTimeOffDates)(timeOff)]),
        ];
    }
    function snapOffBlockedTimeOffDay(iso) {
        let next = iso;
        for (let i = 0; i < 60; i += 1) {
            if (!isBlockedTimeOffCalendarDay(next))
                return next;
            next = (0, DayCalendarPicker_1.addDaysToIso)(next, 1);
        }
        return iso;
    }
    function isNonWorkTimeOffDay(iso) {
        const date = (0, DayCalendarPicker_1.parseIsoToLocalDate)(iso);
        if (!date)
            return true;
        return !(0, producer_availability_1.isEligibleTimeOffDate)(date, workDays);
    }
    function isBlockedTimeOffCalendarDay(iso) {
        if (getBlockedTimeOffDays().includes(iso))
            return true;
        if ((0, producer_time_off_1.isStudioHolidayIso)(iso, holidays, producerId))
            return true;
        if (isNonWorkTimeOffDay(iso))
            return true;
        return false;
    }
    function clampEndAroundBlockedDays(startIso, endIso) {
        const end = endIso < startIso ? startIso : endIso;
        let cursor = (0, DayCalendarPicker_1.addDaysToIso)(startIso, 1);
        for (let i = 0; i < 800 && cursor <= end; i += 1) {
            if (isBlockedTimeOffCalendarDay(cursor)) {
                const before = (0, DayCalendarPicker_1.addDaysToIso)(cursor, -1);
                return before < startIso ? startIso : before;
            }
            cursor = (0, DayCalendarPicker_1.addDaysToIso)(cursor, 1);
        }
        return end;
    }
    function clampStartAroundBlockedDays(startIso, endIso) {
        let start = startIso > endIso ? endIso : startIso;
        const minIso = (0, DayCalendarPicker_1.isoFromLocalDate)(new Date());
        if (start < minIso)
            start = minIso;
        let cursor = (0, DayCalendarPicker_1.addDaysToIso)(endIso, -1);
        for (let i = 0; i < 800 && cursor >= minIso; i += 1) {
            if (isBlockedTimeOffCalendarDay(cursor)) {
                const after = (0, DayCalendarPicker_1.addDaysToIso)(cursor, 1);
                if (after > start)
                    start = after;
                break;
            }
            cursor = (0, DayCalendarPicker_1.addDaysToIso)(cursor, -1);
        }
        if (start > endIso)
            start = endIso;
        return start;
    }
    function openTimeOffForm() {
        clearTimeOffNotice();
        setTimeOffDateField(null);
        setReasonSelectOpen(false);
        setOtherReasonName("");
        setTimeOffMultiDay(false);
        setTimeOffDraft(createEmptyTimeOffDraft(personalReasons));
        setShowTimeOffForm(true);
    }
    function commitTimeOffDraft() {
        const reasonLabel = (0, producer_time_off_1.isOtherPersonalReason)(timeOffDraft.reason)
            ? otherReasonName.trim()
            : timeOffDraft.reason.trim();
        if (!timeOffDraft.startDate || !reasonLabel || !producer) {
            return;
        }
        const endDate = timeOffMultiDay
            ? timeOffDraft.endDate
            : timeOffDraft.startDate;
        if (!endDate ||
            (timeOffMultiDay && endDate <= timeOffDraft.startDate)) {
            return;
        }
        const pendingEntry = {
            ...timeOffDraft,
            type: "personal",
            reason: reasonLabel,
            key: `to-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            endDate,
        };
        const currentOt = (0, producer_availability_1.overtimeDatesInRange)(overtimeDays, pendingEntry.startDate, endDate);
        if (currentOt.length > 0) {
            showTimeOffNotice({
                kind: "ot-conflict",
                title: "Overtime on these dates",
                dateLine: `${(0, producer_availability_1.formatIsoDayMonthYear)(pendingEntry.startDate)}${pendingEntry.startDate !== endDate
                    ? ` to ${(0, producer_availability_1.formatIsoDayMonthYear)(endDate)}`
                    : ""} overlaps overtime.`,
                pendingEntry,
                conflicts: [
                    {
                        id: producer.id,
                        name: producer.name,
                        overtimeDates: currentOt,
                        cancelOvertime: false,
                    },
                ],
            });
            return;
        }
        if (!(0, producer_availability_1.timeOffRangeCoversWorkDay)(pendingEntry.startDate, endDate, workDays)) {
            const parts = (0, producer_availability_1.describeTimeOffOutsideWorkDaysParts)(producer.name, pendingEntry.startDate, endDate, workDays);
            showTimeOffNotice({
                kind: "info",
                title: "Not a usual work day",
                dateLine: parts.dateLine,
                producerLine: parts.producerLine,
            });
            return;
        }
        setTimeOff((prev) => [...prev, pendingEntry]);
        closeTimeOffForm();
    }
    function toggleConflictCancel(producerId) {
        setTimeOffNotice((current) => {
            if (!current || current.kind !== "ot-conflict")
                return current;
            return {
                ...current,
                conflicts: current.conflicts.map((row) => row.id === producerId
                    ? { ...row, cancelOvertime: !row.cancelOvertime }
                    : row),
            };
        });
    }
    function confirmOtConflictAssignment() {
        if (!timeOffNotice || timeOffNotice.kind !== "ot-conflict" || !producer) {
            return;
        }
        const { pendingEntry, conflicts } = timeOffNotice;
        const row = conflicts.find((c) => c.id === producer.id);
        if (!row?.cancelOvertime)
            return;
        const removeOt = (0, producer_availability_1.overtimeDatesInRange)(overtimeDays, pendingEntry.startDate, pendingEntry.endDate);
        setOvertimeDays((prev) => prev.filter((day) => !removeOt.includes(day)));
        setTimeOff((prev) => [...prev, pendingEntry]);
        closeTimeOffForm();
        clearTimeOffNotice();
    }
    function removeTimeOff(key) {
        setTimeOff((prev) => prev.filter((entry) => entry.key !== key));
    }
    function addOvertimeDay(iso) {
        const value = iso.trim();
        if (!value)
            return;
        const today = new Date();
        const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        if (value < todayIso)
            return;
        if (existingTimeOffDays.includes(value))
            return;
        const [y, m, d] = value.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        if (!(0, producer_availability_1.isEligibleOvertimeDate)(date, workDays))
            return;
        // Holidays only block OT on off days; work-day holidays already fail above.
        if ((0, producer_time_off_1.isStudioHolidayIso)(value, holidays, producerId))
            return;
        setOvertimeDays((prev) => [...new Set([...prev, value])].sort((a, b) => a.localeCompare(b)));
        setOvertimePickerOpen(false);
    }
    function removeOvertimeDay(iso) {
        setOvertimeDays((prev) => prev.filter((day) => day !== iso));
    }
    function syncMaxCostInput(value) {
        const clamped = clampMaxCostPerDay(value);
        setMaxProducerCostPerDay(clamped);
        setMaxCostInput(String(clamped));
    }
    function commitMaxCostInput() {
        const parsed = parseInt(maxCostInput, 10);
        syncMaxCostInput(Number.isNaN(parsed) ? maxProducerCostPerDay : parsed);
    }
    function addCategory(category) {
        setCategories((prev) => prev.includes(category) ? prev : [...prev, category]);
        setCategoryRates((prev) => ({
            ...prev,
            [category]: prev[category] ?? 50,
        }));
    }
    function removeCategory(category) {
        setCategories((prev) => prev.filter((item) => item !== category));
        setCategoryRates((prev) => {
            const next = { ...prev };
            delete next[category];
            return next;
        });
    }
    function updateCategoryRate(category, value) {
        if (readOnly)
            return;
        setCategoryRates((prev) => ({
            ...prev,
            [category]: value,
        }));
    }
    function handleDone() {
        if (readOnly) {
            onClose();
            return;
        }
        const parsed = parseInt(maxCostInput, 10);
        const committedMaxCost = hasMaxCapacity
            ? clampMaxCostPerDay(Number.isNaN(parsed) ? maxProducerCostPerDay : parsed)
            : null;
        const ratesByCategory = {};
        for (const category of categories) {
            const value = categoryRates[category] ?? 50;
            ratesByCategory[category] = value > 1 ? value / 100 : value;
        }
        onSave({
            workDays,
            timeOff: timeOff
                .filter((entry) => entry.type === "personal" &&
                entry.startDate &&
                entry.reason.trim())
                .map((entry) => ({
                id: entry.key,
                startDate: entry.startDate,
                endDate: entry.endDate || entry.startDate,
                type: "personal",
                reason: entry.reason.trim(),
            })),
            maxMixesPerDay: hasMaxCapacity ? Math.max(1, maxMixesPerDay) : null,
            maxProducerCostPerDay: hasMaxCapacity
                ? Math.max(1, committedMaxCost ?? maxProducerCostPerDay)
                : null,
            overtimeDays,
            categories,
            specialty: categories[0] ?? producer?.specialty ?? "",
            ratesByCategory,
        });
        onClose();
    }
    const todayIso = (0, DayCalendarPicker_1.isoFromLocalDate)(new Date());
    const timeOffMinIso = todayIso;
    const timeOffMaxIso = `${Number(todayIso.slice(0, 4)) + 1}-12-31`;
    // Overtime and already-added time off block new ranges: start can't land
    // on/before a blocked day inside the chosen end, and end can't land on/after
    // a blocked day after start.
    const existingTimeOffDays = (0, producer_availability_1.expandTimeOffDates)(timeOff);
    const blockedTimeOffDays = [
        ...new Set([...overtimeDays, ...existingTimeOffDays]),
    ];
    const producerHolidays = (0, producer_time_off_1.holidaysForProducer)(holidays, producer.id);
    const upcomingStudioHolidays = producerHolidays
        .map((holiday) => {
        const range = (0, producer_time_off_1.resolveHolidayDatesForToday)(holiday, todayIso);
        return { holiday, ...range };
    })
        .sort((a, b) => a.startDate.localeCompare(b.startDate));
    // Contiguous leave ranges can't cross any unavailable day (overtime, existing
    // leave, holidays, or non-work weekdays). Start stays after the previous
    // blocked day; end stops before the next blocked day.
    const rangeBlockedDays = [];
    {
        let cursor = timeOffMinIso;
        for (let i = 0; i < 800 && cursor <= timeOffMaxIso; i += 1) {
            if (isBlockedTimeOffCalendarDay(cursor))
                rangeBlockedDays.push(cursor);
            cursor = (0, DayCalendarPicker_1.addDaysToIso)(cursor, 1);
        }
    }
    let timeOffStartMinIso = timeOffMinIso;
    let timeOffStartMaxIso = timeOffDraft.endDate && timeOffDraft.endDate > timeOffMinIso
        ? (0, DayCalendarPicker_1.addDaysToIso)(timeOffDraft.endDate, -1)
        : timeOffMaxIso;
    if (timeOffStartMaxIso > timeOffMaxIso)
        timeOffStartMaxIso = timeOffMaxIso;
    let timeOffEndMinIso = timeOffDraft.startDate && timeOffDraft.startDate >= timeOffMinIso
        ? (0, DayCalendarPicker_1.addDaysToIso)(timeOffDraft.startDate, 1)
        : timeOffMinIso;
    let timeOffEndMaxIso = timeOffMaxIso;
    if (timeOffDraft.endDate) {
        const prevBlocked = (0, producer_availability_1.prevOvertimeOnOrBefore)(rangeBlockedDays, (0, DayCalendarPicker_1.addDaysToIso)(timeOffDraft.endDate, -1));
        if (prevBlocked) {
            const afterBlocked = (0, DayCalendarPicker_1.addDaysToIso)(prevBlocked, 1);
            if (afterBlocked > timeOffStartMinIso)
                timeOffStartMinIso = afterBlocked;
        }
    }
    if (timeOffDraft.startDate) {
        const nextBlocked = (0, producer_availability_1.nextOvertimeOnOrAfter)(rangeBlockedDays, (0, DayCalendarPicker_1.addDaysToIso)(timeOffDraft.startDate, 1));
        if (nextBlocked) {
            const beforeBlocked = (0, DayCalendarPicker_1.addDaysToIso)(nextBlocked, -1);
            if (beforeBlocked < timeOffEndMaxIso)
                timeOffEndMaxIso = beforeBlocked;
        }
    }
    if (timeOffStartMaxIso < timeOffStartMinIso) {
        // No valid start on this side of a blocked day — keep min so the grid opens.
    }
    if (timeOffEndMaxIso < timeOffEndMinIso) {
        timeOffEndMaxIso = timeOffEndMinIso;
    }
    const todayInTimeOffStartRange = todayIso >= timeOffStartMinIso &&
        todayIso <= timeOffStartMaxIso &&
        !isBlockedTimeOffCalendarDay(todayIso);
    const todayInTimeOffEndRange = todayIso >= timeOffEndMinIso &&
        todayIso <= timeOffEndMaxIso &&
        !isBlockedTimeOffCalendarDay(todayIso);
    function isOutsideTimeOffFieldRange(iso) {
        if (timeOffDateField === "end") {
            return iso < timeOffEndMinIso || iso > timeOffEndMaxIso;
        }
        return iso < timeOffStartMinIso || iso > timeOffStartMaxIso;
    }
    function timeOffDayTitle(iso, disabled) {
        if (iso < todayIso) {
            return "Past day";
        }
        const outsideRange = disabled && isOutsideTimeOffFieldRange(iso);
        const holidayNames = (0, producer_time_off_1.studioHolidayNamesForIso)(iso, holidays, producerId);
        if (holidayNames.length > 0) {
            const name = holidayNames.length === 1
                ? holidayNames[0]
                : holidayNames.join(", ");
            if (outsideRange) {
                return `${name}\nRange can’t include holidays or non-working days`;
            }
            return `${name}\nLeave can’t be added on holidays`;
        }
        // Off days can't take leave — OT on an off day doesn't change that.
        if (isNonWorkTimeOffDay(iso)) {
            if (outsideRange) {
                return "Not a working day\nRange can’t include holidays or non-working days";
            }
            return "Not a working day";
        }
        if (overtimeDays.includes(iso)) {
            return "Overtime Day\nCancel overtime to mark leave";
        }
        if (existingTimeOffDays.includes(iso)) {
            return "Already added as time off";
        }
        if (disabled &&
            (isOutsideTimeOffFieldRange(iso) ||
                (0, producer_availability_1.isTimeOffDateBlockedByOvertime)(iso, timeOffDateField === "end" ? "end" : "start", timeOffDateField === "end"
                    ? timeOffDraft.startDate
                    : timeOffDraft.endDate, rangeBlockedDays))) {
            return "Range can’t include holidays or non-working days";
        }
        if (iso === todayIso)
            return "Today";
        return undefined;
    }
    function timeOffStartDayTitle(iso, disabled) {
        if (iso < todayIso)
            return "Past day";
        if (timeOffDraft.endDate && iso === timeOffDraft.endDate) {
            return "Start date can’t be the same as end date";
        }
        if (timeOffDraft.endDate && iso > timeOffDraft.endDate) {
            return "Start date can’t be after end date";
        }
        return timeOffDayTitle(iso, disabled);
    }
    function timeOffEndDayTitle(iso, disabled) {
        if (iso < todayIso)
            return "Past day";
        if (timeOffDraft.startDate && iso === timeOffDraft.startDate) {
            return "End date can’t be the same as start date";
        }
        if (timeOffDraft.startDate && iso < timeOffDraft.startDate) {
            return "End date can’t be before start date";
        }
        return timeOffDayTitle(iso, disabled);
    }
    function timeOffDayTone(iso, _disabled) {
        if (iso < todayIso)
            return undefined;
        if ((0, producer_time_off_1.isStudioHolidayIso)(iso, holidays, producerId))
            return "holiday";
        // OT blue only when the day is otherwise a work day (leave could apply).
        if (overtimeDays.includes(iso) && !isNonWorkTimeOffDay(iso)) {
            return "overtime";
        }
        return undefined;
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-black/45 backdrop-blur-[2px]", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative flex max-h-[min(92dvh,720px)] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[28px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:rounded-[28px]", children: [(0, jsx_runtime_1.jsxs)("header", { className: "relative flex shrink-0 items-center justify-between border-b border-black/[0.08] px-4 py-3.5", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "min-w-[64px] text-left text-[15px] text-brand-ink-secondary transition hover:text-brand-ink", children: readOnly ? "Close" : "Cancel" }), (0, jsx_runtime_1.jsx)("h2", { className: "absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold tracking-[-0.01em] text-brand-ink", children: readOnly ? "Availability" : "Producer settings" }), !readOnly ? ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: handleDone, className: "min-w-[64px] text-right text-[15px] font-semibold text-brand-blue transition hover:text-brand-blue-hover", children: "Done" })) : ((0, jsx_runtime_1.jsx)("span", { className: "min-w-[64px]" }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-6 flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { producer: producer, size: "md" }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("p", { className: "truncate text-[15px] font-semibold text-brand-ink", children: producer.name }), (0, jsx_runtime_1.jsx)("p", { className: "text-[12px] text-brand-ink-tertiary", children: categories.length
                                                    ? categories.slice(0, 3).join(", ") +
                                                        (categories.length > 3 ? ` +${categories.length - 3}` : "")
                                                    : producer.specialty })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "mb-6 border-b border-black/[0.08]", children: (0, jsx_runtime_1.jsx)(Tabs_1.Tabs, { options: [
                                        { value: "schedule", label: "Schedule" },
                                        { value: "leave", label: "Leaves" },
                                        { value: "holidays", label: "Holidays" },
                                        { value: "limit", label: "Limit" },
                                        {
                                            value: "category",
                                            label: "Category",
                                            count: categories.length || undefined,
                                        },
                                    ], value: activeTab, onChange: (value) => setActiveTab(value), accent: "blue" }) }), activeTab === "category" ? ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-2xl bg-brand-bg px-4 py-3 ring-1 ring-inset ring-black/[0.06]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: "Compensation rates" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-brand-ink-tertiary", children: "Payroll percentage by category." })] }), (0, jsx_runtime_1.jsx)(ProducerCategoryAddMenu_1.ProducerCategoryAddMenu, { assignedCategories: categories, onAdd: addCategory })] }), categories.length > 0 ? ((() => {
                                        const rows = ((0, jsx_runtime_1.jsx)("ul", { className: "divide-y divide-black/[0.06]", children: categories.map((category) => {
                                                const group = (0, producer_category_groups_1.findProducerCategoryGroup)(category);
                                                return ((0, jsx_runtime_1.jsxs)("li", { className: "flex items-center gap-2 py-2.5 text-[13px] first:pt-0 last:pb-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "truncate font-medium text-brand-ink-secondary", children: category }), group ? ((0, jsx_runtime_1.jsx)("p", { className: "truncate text-[11px] text-brand-ink-tertiary", children: group.label })) : null] }), usesPercentageCompensation ? ((0, jsx_runtime_1.jsxs)("div", { className: "inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-elevated px-2 py-1 ring-1 ring-inset ring-black/[0.06] focus-within:ring-brand-blue/30", children: [(0, jsx_runtime_1.jsx)("input", { type: "number", min: 0, max: 100, step: 1, value: categoryRates[category] ?? 50, onChange: (e) => {
                                                                        const value = parseFloat(e.target.value);
                                                                        updateCategoryRate(category, Number.isNaN(value) ? 0 : value);
                                                                    }, className: "w-10 bg-transparent text-right text-[13px] font-semibold tabular-nums text-brand-ink outline-none", "aria-label": `Compensation percentage for ${category}` }), (0, jsx_runtime_1.jsx)("span", { className: "text-[12px] font-semibold text-brand-ink-tertiary", children: "%" })] })) : ((0, jsx_runtime_1.jsx)("span", { className: "shrink-0 font-semibold tabular-nums text-brand-blue", children: (0, producers_1.formatCategoryCompensationRate)(producer, category) })), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => removeCategory(category), className: "shrink-0 rounded-full p-1.5 text-brand-ink-tertiary transition hover:bg-brand-elevated hover:text-brand-danger", "aria-label": `Remove ${category}`, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { className: "h-3.5 w-3.5", strokeWidth: 1.75 }) })] }, category));
                                            }) }));
                                        return categories.length >= 4 ? ((0, jsx_runtime_1.jsx)(CustomScrollRail, { className: "mt-3", maxHeight: CATEGORY_RATE_LIST_PX, fadeFromClassName: "from-brand-bg", syncKey: categories.join("|"), children: rows })) : ((0, jsx_runtime_1.jsx)("div", { className: "mt-3", children: rows }));
                                    })()) : ((0, jsx_runtime_1.jsx)("p", { className: "mt-3 text-[12px] text-brand-ink-tertiary", children: "No categories assigned. Click Add to pick a category and subcategory." }))] })) : null, activeTab === "schedule" ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: "Days they work" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-brand-ink-tertiary", children: "Regular weekly schedule. Mon\u2013Fri by default." }), (0, jsx_runtime_1.jsx)("div", { className: "mt-4 flex justify-between gap-1", children: types_1.WEEKDAYS.map((day) => {
                                            const active = workDays.includes(day.id);
                                            const pill = day.id === "sun"
                                                ? "Su"
                                                : day.id === "sat"
                                                    ? "Sa"
                                                    : day.id === "tue"
                                                        ? "Tu"
                                                        : day.id === "thu"
                                                            ? "Th"
                                                            : day.short.charAt(0);
                                            return ((0, jsx_runtime_1.jsx)("button", { type: "button", "aria-label": day.label, "aria-pressed": active, onClick: () => toggleDay(day.id), className: (0, clsx_1.default)("flex h-11 w-11 flex-col items-center justify-center rounded-full text-[11px] font-semibold transition", active
                                                    ? "bg-brand-ink text-white shadow-sm"
                                                    : "bg-brand-bg text-brand-ink-secondary ring-1 ring-inset ring-black/[0.06] hover:bg-brand-bg-subtle"), children: pill }, day.id));
                                        }) }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-8", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: "Overtime" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-brand-ink-tertiary", children: "Work days outside the regular schedule. Cross a date to cancel it." })] }), (0, jsx_runtime_1.jsxs)("button", { ref: overtimeButtonRef, type: "button", onClick: () => setOvertimePickerOpen((open) => !open), onMouseDown: (e) => e.stopPropagation(), className: (0, clsx_1.default)("inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-semibold ring-1 ring-inset transition", overtimePickerOpen
                                                            ? "bg-brand-blue text-white ring-brand-blue"
                                                            : "bg-brand-bg text-brand-blue ring-black/[0.06] hover:bg-brand-bg-subtle"), children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CalendarPlus, { className: "h-3.5 w-3.5", strokeWidth: 2.5 }), "Add day"] }), (0, jsx_runtime_1.jsx)(OvertimeDayPicker_1.OvertimeDayPicker, { open: overtimePickerOpen, onClose: () => setOvertimePickerOpen(false), workDays: workDays, selectedDays: overtimeDays, onSelect: addOvertimeDay, excludeRef: overtimeButtonRef, studioHolidays: holidays, producerId: producer.id, blockedTimeOffDays: existingTimeOffDays, leaveEntries: timeOff })] }), overtimeDays.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "mt-4 text-center text-[13px] text-brand-ink-tertiary", children: "No overtime days added." })) : ((0, jsx_runtime_1.jsx)("ul", { className: "mt-4 flex flex-wrap gap-2", children: overtimeDays.map((iso) => ((0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1.5 rounded-full bg-brand-blue-soft py-1.5 pl-3 pr-1.5 text-[12px] font-semibold text-brand-blue-deep ring-1 ring-inset ring-brand-blue-muted", children: [formatOvertimeLabel(iso), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => removeOvertimeDay(iso), className: "rounded-full p-1 text-brand-blue-deep/70 transition hover:bg-brand-blue-muted hover:text-brand-blue-deep", "aria-label": `Remove ${iso}`, children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-3 w-3", strokeWidth: 2.5 }) })] }) }, iso))) }))] })] })) : null, activeTab === "leave" ? ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: "Personal leave" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-brand-ink-tertiary", children: "Block regular work days when this producer won't be available. Holidays and non-working days can't be selected." })] }), !showTimeOffForm ? ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: openTimeOffForm, className: "inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-brand-bg px-3 text-[13px] font-semibold text-brand-blue ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "h-3.5 w-3.5", strokeWidth: 2.5 }), "Add"] })) : null] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-4", children: timeOff.filter((entry) => entry.type === "personal").length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "text-center text-[13px] text-brand-ink-tertiary", children: "No personal leave scheduled yet." })) : ((0, jsx_runtime_1.jsx)("ul", { className: "flex flex-wrap gap-2", children: timeOff
                                                    .filter((entry) => entry.type === "personal")
                                                    .map((entry) => ((0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsxs)("span", { className: "inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand-blue-soft py-1.5 pl-3 pr-1.5 text-[12px] font-semibold text-brand-blue-deep ring-1 ring-inset ring-brand-blue-muted", children: [(0, jsx_runtime_1.jsxs)("span", { className: "min-w-0 truncate", children: [formatTimeOffDateLabel(entry), entry.reason.trim() ? ((0, jsx_runtime_1.jsxs)("span", { className: "font-medium text-brand-blue-deep/75", children: [" · ", entry.reason.trim()] })) : null] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => removeTimeOff(entry.key), className: "shrink-0 rounded-full p-1 text-brand-blue-deep/70 transition hover:bg-brand-blue-muted hover:text-brand-blue-deep", "aria-label": `Remove ${formatTimeOffDateLabel(entry)} (${entry.reason})`, children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-3 w-3", strokeWidth: 2.5 }) })] }) }, entry.key))) })) }), showTimeOffForm ? ((0, jsx_runtime_1.jsxs)("div", { className: "mt-3 overflow-visible rounded-2xl border border-dashed border-brand-blue/35 bg-brand-blue-soft/20", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between px-3 py-2", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-bold uppercase tracking-[0.06em] text-brand-blue-deep", children: "Add personal leave" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: closeTimeOffForm, className: "rounded-full p-1 text-brand-blue-deep/70 transition hover:bg-brand-blue-muted hover:text-brand-blue-deep", "aria-label": "Cancel add time off", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-3.5 w-3.5", strokeWidth: 2.5 }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-2 px-3 pb-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex gap-1 rounded-full bg-brand-elevated p-1 ring-1 ring-inset ring-black/[0.06]", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => {
                                                                        setTimeOffMultiDay(false);
                                                                        setTimeOffDateField(null);
                                                                        if (timeOffDraft.startDate) {
                                                                            updateTimeOffDraft({
                                                                                endDate: timeOffDraft.startDate,
                                                                            });
                                                                        }
                                                                    }, className: (0, clsx_1.default)("flex-1 rounded-full py-1.5 text-[12px] font-semibold transition", !timeOffMultiDay
                                                                        ? "bg-brand-ink text-white shadow-sm"
                                                                        : "text-brand-ink-secondary hover:text-brand-ink"), children: "Single day" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => {
                                                                        setTimeOffMultiDay(true);
                                                                        setTimeOffDateField(null);
                                                                        updateTimeOffDraft({ endDate: "" });
                                                                    }, className: (0, clsx_1.default)("flex-1 rounded-full py-1.5 text-[12px] font-semibold transition", timeOffMultiDay
                                                                        ? "bg-brand-ink text-white shadow-sm"
                                                                        : "text-brand-ink-secondary hover:text-brand-ink"), children: "Date range" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "overflow-visible rounded-xl bg-brand-elevated ring-1 ring-inset ring-black/[0.06]", children: [timeOffMultiDay ? ((0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 divide-x divide-black/[0.06]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "px-2.5 py-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[9px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary", children: "From" }), (0, jsx_runtime_1.jsx)("button", { ref: timeOffStartRef, type: "button", onClick: () => {
                                                                                        setReasonSelectOpen(false);
                                                                                        setTimeOffDateField((current) => current === "start" ? null : "start");
                                                                                    }, className: (0, clsx_1.default)("mt-0.5 flex w-full items-center justify-between gap-1 rounded-lg py-0.5 text-left text-[12px] font-semibold outline-none transition", timeOffDateField === "start"
                                                                                        ? "text-brand-signature"
                                                                                        : "text-brand-ink hover:text-brand-signature"), children: (0, jsx_runtime_1.jsx)("span", { className: "min-w-0 truncate", children: formatShortDateLabel(timeOffDraft.startDate) }) }), (0, jsx_runtime_1.jsx)(DayCalendarPicker_1.DayCalendarPicker, { open: timeOffDateField === "start", onClose: () => setTimeOffDateField(null), excludeRef: timeOffStartRef, value: timeOffDraft.startDate || null, minIso: timeOffStartMinIso, maxIso: timeOffDraft.endDate
                                                                                        ? timeOffMaxIso
                                                                                        : timeOffStartMaxIso, isDateDisabled: (iso) => (!!timeOffDraft.endDate &&
                                                                                        iso >= timeOffDraft.endDate) ||
                                                                                        isBlockedTimeOffCalendarDay(iso) ||
                                                                                        (0, producer_availability_1.isTimeOffDateBlockedByOvertime)(iso, "start", timeOffDraft.endDate || null, rangeBlockedDays), dayTitle: timeOffStartDayTitle, dayTone: timeOffDayTone, ariaLabel: "Leave start date", onSelect: (iso) => {
                                                                                        if (isBlockedTimeOffCalendarDay(iso))
                                                                                            return;
                                                                                        if (timeOffDraft.endDate &&
                                                                                            iso >= timeOffDraft.endDate) {
                                                                                            return;
                                                                                        }
                                                                                        const startDate = iso;
                                                                                        if (!timeOffDraft.endDate) {
                                                                                            updateTimeOffDraft({ startDate });
                                                                                            return;
                                                                                        }
                                                                                        const nextEnd = clampEndAroundBlockedDays(startDate, timeOffDraft.endDate);
                                                                                        updateTimeOffDraft({
                                                                                            startDate,
                                                                                            endDate: nextEnd,
                                                                                        });
                                                                                    }, footer: todayInTimeOffStartRange ? ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => {
                                                                                            if (isBlockedTimeOffCalendarDay(todayIso))
                                                                                                return;
                                                                                            if (timeOffDraft.endDate &&
                                                                                                todayIso >= timeOffDraft.endDate) {
                                                                                                return;
                                                                                            }
                                                                                            if (!timeOffDraft.endDate) {
                                                                                                updateTimeOffDraft({ startDate: todayIso });
                                                                                                setTimeOffDateField(null);
                                                                                                return;
                                                                                            }
                                                                                            const nextEnd = clampEndAroundBlockedDays(todayIso, timeOffDraft.endDate);
                                                                                            updateTimeOffDraft({
                                                                                                startDate: todayIso,
                                                                                                endDate: nextEnd,
                                                                                            });
                                                                                            setTimeOffDateField(null);
                                                                                        }, className: "rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-signature transition hover:bg-white", children: "Today" })) : ((0, jsx_runtime_1.jsx)("p", { className: "px-1 text-[11px] font-medium text-brand-ink-tertiary", children: rangeBlockedDays.length > 0
                                                                                            ? "Range can’t include holidays or non-working days"
                                                                                            : "Through December next year" })) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "px-2.5 py-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[9px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary", children: "To" }), (0, jsx_runtime_1.jsx)("button", { ref: timeOffEndRef, type: "button", onClick: () => {
                                                                                        setReasonSelectOpen(false);
                                                                                        setTimeOffDateField((current) => current === "end" ? null : "end");
                                                                                    }, className: (0, clsx_1.default)("mt-0.5 flex w-full items-center justify-between gap-1 rounded-lg py-0.5 text-left text-[12px] font-semibold outline-none transition", timeOffDateField === "end"
                                                                                        ? "text-brand-signature"
                                                                                        : "text-brand-ink hover:text-brand-signature"), children: (0, jsx_runtime_1.jsx)("span", { className: "min-w-0 truncate", children: formatShortDateLabel(timeOffDraft.endDate) }) }), (0, jsx_runtime_1.jsx)(DayCalendarPicker_1.DayCalendarPicker, { open: timeOffDateField === "end", onClose: () => setTimeOffDateField(null), excludeRef: timeOffEndRef, value: timeOffDraft.endDate || null, minIso: timeOffMinIso, maxIso: timeOffEndMaxIso, isDateDisabled: (iso) => (!!timeOffDraft.startDate &&
                                                                                        iso <= timeOffDraft.startDate) ||
                                                                                        isBlockedTimeOffCalendarDay(iso) ||
                                                                                        (0, producer_availability_1.isTimeOffDateBlockedByOvertime)(iso, "end", timeOffDraft.startDate || null, rangeBlockedDays), dayTitle: timeOffEndDayTitle, dayTone: timeOffDayTone, ariaLabel: "Leave end date", onSelect: (iso) => {
                                                                                        if (isBlockedTimeOffCalendarDay(iso))
                                                                                            return;
                                                                                        if (timeOffDraft.startDate &&
                                                                                            iso <= timeOffDraft.startDate) {
                                                                                            return;
                                                                                        }
                                                                                        const endDate = iso;
                                                                                        if (!timeOffDraft.startDate) {
                                                                                            updateTimeOffDraft({ endDate });
                                                                                            return;
                                                                                        }
                                                                                        const startDate = clampStartAroundBlockedDays(timeOffDraft.startDate, endDate);
                                                                                        if (startDate >= endDate)
                                                                                            return;
                                                                                        updateTimeOffDraft({ startDate, endDate });
                                                                                    }, footer: todayInTimeOffEndRange ? ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => {
                                                                                            if (isBlockedTimeOffCalendarDay(todayIso))
                                                                                                return;
                                                                                            if (timeOffDraft.startDate &&
                                                                                                todayIso <= timeOffDraft.startDate) {
                                                                                                return;
                                                                                            }
                                                                                            const endDate = todayIso;
                                                                                            if (!timeOffDraft.startDate) {
                                                                                                updateTimeOffDraft({ endDate });
                                                                                                setTimeOffDateField(null);
                                                                                                return;
                                                                                            }
                                                                                            const startDate = clampStartAroundBlockedDays(timeOffDraft.startDate, endDate);
                                                                                            if (startDate >= endDate)
                                                                                                return;
                                                                                            updateTimeOffDraft({ startDate, endDate });
                                                                                            setTimeOffDateField(null);
                                                                                        }, className: "rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-signature transition hover:bg-white", children: "Today" })) : ((0, jsx_runtime_1.jsx)("p", { className: "px-1 text-[11px] font-medium text-brand-ink-tertiary", children: rangeBlockedDays.length > 0
                                                                                            ? "Range can’t include holidays or non-working days"
                                                                                            : "Through December next year" })) })] })] })) : ((0, jsx_runtime_1.jsxs)("div", { className: "px-2.5 py-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[9px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary", children: "Date" }), (0, jsx_runtime_1.jsx)("button", { ref: timeOffStartRef, type: "button", onClick: () => {
                                                                                setReasonSelectOpen(false);
                                                                                setTimeOffDateField((current) => current === "start" ? null : "start");
                                                                            }, className: (0, clsx_1.default)("mt-0.5 flex w-full items-center justify-between gap-1 rounded-lg py-0.5 text-left text-[12px] font-semibold outline-none transition", timeOffDateField === "start"
                                                                                ? "text-brand-signature"
                                                                                : "text-brand-ink hover:text-brand-signature"), children: (0, jsx_runtime_1.jsx)("span", { className: "min-w-0 truncate", children: formatShortDateLabel(timeOffDraft.startDate) }) }), (0, jsx_runtime_1.jsx)(DayCalendarPicker_1.DayCalendarPicker, { open: timeOffDateField === "start", onClose: () => setTimeOffDateField(null), excludeRef: timeOffStartRef, value: timeOffDraft.startDate || null, minIso: timeOffStartMinIso, maxIso: timeOffStartMaxIso, isDateDisabled: (iso) => isBlockedTimeOffCalendarDay(iso) ||
                                                                                (0, producer_availability_1.isTimeOffDateBlockedByOvertime)(iso, "start", iso, blockedTimeOffDays), dayTitle: timeOffDayTitle, dayTone: timeOffDayTone, ariaLabel: "Leave date", onSelect: (iso) => {
                                                                                if (isBlockedTimeOffCalendarDay(iso))
                                                                                    return;
                                                                                updateTimeOffDraft({
                                                                                    startDate: iso,
                                                                                    endDate: iso,
                                                                                });
                                                                            }, footer: todayInTimeOffStartRange ? ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => {
                                                                                    if (isBlockedTimeOffCalendarDay(todayIso))
                                                                                        return;
                                                                                    updateTimeOffDraft({
                                                                                        startDate: todayIso,
                                                                                        endDate: todayIso,
                                                                                    });
                                                                                    setTimeOffDateField(null);
                                                                                }, className: "rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-signature transition hover:bg-white", children: "Today" })) : ((0, jsx_runtime_1.jsx)("p", { className: "px-1 text-[11px] font-medium text-brand-ink-tertiary", children: "Work days only \u00B7 through December next year" })) })] })), (0, jsx_runtime_1.jsxs)("div", { className: "relative z-20 border-t border-black/[0.06] px-2.5 py-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[9px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary", children: "Why" }), (0, jsx_runtime_1.jsx)(SoftSelect_1.SoftSelect, { "aria-label": "Leave reason", className: "mt-1", placement: "above", value: (0, producer_time_off_1.reasonsForTimeOffType)("personal", holidays, personalReasons).includes(timeOffDraft.reason)
                                                                                ? timeOffDraft.reason
                                                                                : (0, producer_time_off_1.isOtherPersonalReason)(timeOffDraft.reason)
                                                                                    ? producer_time_off_1.OTHER_PERSONAL_REASON_NAME
                                                                                    : (0, producer_time_off_1.defaultReasonForTimeOffType)("personal", holidays, personalReasons), options: (0, producer_time_off_1.reasonsForTimeOffType)("personal", holidays, personalReasons).map((reason) => ({ value: reason, label: reason })), onChange: (reason) => {
                                                                                updateTimeOffDraft({ reason });
                                                                                if (!(0, producer_time_off_1.isOtherPersonalReason)(reason)) {
                                                                                    setOtherReasonName("");
                                                                                }
                                                                            }, open: reasonSelectOpen, onOpenChange: (next) => {
                                                                                if (next)
                                                                                    setTimeOffDateField(null);
                                                                                setReasonSelectOpen(next);
                                                                            } }), (0, producer_time_off_1.isOtherPersonalReason)(timeOffDraft.reason) ? ((0, jsx_runtime_1.jsxs)("label", { className: "mt-2 block", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[9px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary", children: "Name this leave" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: otherReasonName, onChange: (e) => setOtherReasonName(e.target.value), placeholder: "e.g. Sabbatical", className: "mt-1 h-8 w-full rounded-full bg-brand-bg px-3 text-[13px] font-medium text-brand-ink outline-none ring-1 ring-inset ring-black/[0.06] transition placeholder:text-brand-ink-tertiary focus:ring-brand-blue/30", "aria-label": "Custom leave name" })] })) : null] })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: commitTimeOffDraft, disabled: !timeOffDraft.startDate ||
                                                                (timeOffMultiDay &&
                                                                    (!timeOffDraft.endDate ||
                                                                        timeOffDraft.endDate <= timeOffDraft.startDate)) ||
                                                                ((0, producer_time_off_1.isOtherPersonalReason)(timeOffDraft.reason) &&
                                                                    !otherReasonName.trim()), className: "inline-flex w-full items-center justify-center gap-1 rounded-full bg-brand-blue px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-brand-blue-hover disabled:opacity-40", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "h-3 w-3", strokeWidth: 2.5 }), "Add to schedule"] })] })] })) : null] }) })) : null, activeTab === "holidays" ? ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: "Public holidays" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-brand-ink-tertiary", children: "Holidays that apply to this producer. Managed in Settings." })] }), !readOnly ? ((0, jsx_runtime_1.jsxs)(link_1.default, { href: "/settings/holidays", onClick: onClose, className: "inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-brand-bg px-3 text-[13px] font-semibold text-brand-blue ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Pencil, { className: "h-3.5 w-3.5", strokeWidth: 2.5 }), "Edit"] })) : null] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-4", children: upcomingStudioHolidays.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "text-center text-[13px] text-brand-ink-tertiary", children: "No public holidays set yet." })) : ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-2xl ring-1 ring-inset ring-black/[0.06]", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setShowAllHolidays((open) => !open), className: "flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-brand-bg/60", "aria-expanded": showAllHolidays, children: [(0, jsx_runtime_1.jsxs)("div", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "truncate text-[13px] font-semibold text-brand-ink", children: upcomingStudioHolidays[0].holiday.name }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-0.5 text-[11px] text-brand-ink-tertiary", children: ["Next \u00B7", " ", formatHolidayListDate(upcomingStudioHolidays[0].startDate, upcomingStudioHolidays[0].endDate), upcomingStudioHolidays.length > 1
                                                                                ? ` · ${upcomingStudioHolidays.length} total`
                                                                                : null] })] }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { className: (0, clsx_1.default)("h-4 w-4 shrink-0 text-brand-ink-tertiary transition", showAllHolidays && "rotate-180"), strokeWidth: 2.25, "aria-hidden": true })] }), showAllHolidays ? ((0, jsx_runtime_1.jsx)("div", { className: "border-t border-black/[0.06] overflow-y-auto overscroll-contain", style: { maxHeight: 128 }, children: (0, jsx_runtime_1.jsx)("ul", { children: upcomingStudioHolidays.map(({ holiday, startDate, endDate }) => ((0, jsx_runtime_1.jsxs)("li", { className: "flex items-center justify-between gap-3 px-3 py-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "min-w-0 truncate text-[11px] font-medium text-brand-ink", children: holiday.name }), (0, jsx_runtime_1.jsx)("span", { className: "shrink-0 text-[10px] tabular-nums text-brand-ink-tertiary", children: formatHolidayListDate(startDate, endDate) })] }, holiday.id))) }) })) : null] })) })] }) })) : null, activeTab === "limit" ? ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: "Daily mix limit" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-brand-ink-tertiary", children: "How many mixes they can take on a scheduled day." }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-4 flex gap-1 rounded-full bg-brand-bg p-1 ring-1 ring-inset ring-black/[0.06]", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setHasMaxCapacity(false), className: (0, clsx_1.default)("flex-1 rounded-full py-2 text-[13px] font-semibold transition", !hasMaxCapacity
                                                        ? "bg-brand-ink text-white shadow-sm"
                                                        : "text-brand-ink-secondary hover:text-brand-ink"), children: "No limit" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setHasMaxCapacity(true), className: (0, clsx_1.default)("flex-1 rounded-full py-2 text-[13px] font-semibold transition", hasMaxCapacity
                                                        ? "bg-brand-ink text-white shadow-sm"
                                                        : "text-brand-ink-secondary hover:text-brand-ink"), children: "Set limit" })] }), hasMaxCapacity ? ((0, jsx_runtime_1.jsxs)("div", { className: "mt-4 space-y-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-[minmax(0,1fr)_9.5rem] items-center gap-x-3 rounded-2xl bg-brand-bg px-4 py-3 ring-1 ring-inset ring-black/[0.06]", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[13px] font-medium text-brand-ink", children: "Max mixes per day" }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-[2rem_1fr_2rem] items-center gap-2", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setMaxMixesPerDay((value) => Math.max(1, value - 1)), disabled: maxMixesPerDay <= 1, className: "flex h-8 w-8 items-center justify-center rounded-full bg-brand-elevated text-brand-ink ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle disabled:opacity-40", "aria-label": "Decrease limit", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Minus, { className: "h-3.5 w-3.5", strokeWidth: 2.5 }) }), (0, jsx_runtime_1.jsx)("span", { className: "w-full text-center text-[18px] font-semibold tabular-nums text-brand-ink", children: maxMixesPerDay }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setMaxMixesPerDay((value) => Math.min(10, value + 1)), disabled: maxMixesPerDay >= 10, className: "flex h-8 w-8 items-center justify-center rounded-full bg-brand-elevated text-brand-ink ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle disabled:opacity-40", "aria-label": "Increase limit", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "h-3.5 w-3.5", strokeWidth: 2.5 }) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-[minmax(0,1fr)_9.5rem] items-center gap-x-3 rounded-2xl bg-brand-bg px-4 py-3 ring-1 ring-inset ring-black/[0.06]", children: [(0, jsx_runtime_1.jsxs)("span", { className: "text-[13px] font-medium text-brand-ink", children: [(0, jsx_runtime_1.jsx)("span", { className: "mr-1 text-[15px] font-semibold text-brand-ink-secondary", children: "$" }), "Max cost per day"] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-[2rem_1fr_2rem] items-center gap-2", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => syncMaxCostInput(maxProducerCostPerDay - MAX_COST_STEP), disabled: maxProducerCostPerDay <= MIN_MAX_COST_PER_DAY, className: "flex h-8 w-8 items-center justify-center rounded-full bg-brand-elevated text-brand-ink ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle disabled:opacity-40", "aria-label": "Decrease max cost per day", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Minus, { className: "h-3.5 w-3.5", strokeWidth: 2.5 }) }), (0, jsx_runtime_1.jsx)("input", { type: "text", inputMode: "numeric", value: maxCostInput, onChange: (e) => setMaxCostInput(e.target.value.replace(/[^\d]/g, "")), onBlur: commitMaxCostInput, onKeyDown: (e) => {
                                                                        if (e.key === "Enter") {
                                                                            e.currentTarget.blur();
                                                                        }
                                                                    }, className: "w-full min-w-0 rounded-md bg-brand-elevated/50 px-1 text-center text-[18px] font-semibold tabular-nums text-brand-ink outline-none ring-1 ring-inset ring-black/[0.06] focus:bg-brand-elevated focus:ring-brand-blue/30", "aria-label": "Max cost per day amount" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => syncMaxCostInput(maxProducerCostPerDay + MAX_COST_STEP), disabled: maxProducerCostPerDay >= MAX_MAX_COST_PER_DAY, className: "flex h-8 w-8 items-center justify-center rounded-full bg-brand-elevated text-brand-ink ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle disabled:opacity-40", "aria-label": "Increase max cost per day", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "h-3.5 w-3.5", strokeWidth: 2.5 }) })] })] })] })) : null] }) })) : null] })] }), timeOffNotice ? ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-[70] flex items-center justify-center p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-brand-scrim/80", "aria-label": "Close", onClick: clearTimeOffNotice }), (0, jsx_runtime_1.jsxs)("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "time-off-notice-title", className: "relative flex max-h-[min(92dvh,640px)] w-full max-w-[360px] flex-col overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-7", children: [(0, jsx_runtime_1.jsx)("h2", { id: "time-off-notice-title", className: "text-center text-[17px] font-semibold tracking-[-0.02em] text-brand-ink", children: timeOffNotice.title }), timeOffNotice.dateLine ||
                                        (timeOffNotice.kind === "info" && timeOffNotice.producerLine) ? ((0, jsx_runtime_1.jsxs)("div", { className: "mt-4 rounded-2xl bg-brand-bg px-4 py-3 ring-1 ring-inset ring-black/[0.06]", children: [timeOffNotice.dateLine ? ((0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: timeOffNotice.dateLine })) : null, timeOffNotice.kind === "info" && timeOffNotice.producerLine ? ((0, jsx_runtime_1.jsx)("p", { className: (0, clsx_1.default)("text-[13px] leading-snug text-brand-ink-secondary", timeOffNotice.dateLine && "mt-1"), children: timeOffNotice.producerLine })) : null] })) : null, timeOffNotice.kind === "ot-conflict" ? ((0, jsx_runtime_1.jsxs)("div", { className: "mt-4", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[12px] leading-relaxed text-brand-ink-secondary", children: "Cancel overtime to apply this leave, or keep overtime and skip. You can also remove overtime from the chips above." }), (0, jsx_runtime_1.jsx)("ul", { className: "mt-3 space-y-2", children: timeOffNotice.conflicts.map((row) => ((0, jsx_runtime_1.jsxs)("li", { className: "rounded-2xl bg-brand-bg px-3 py-3 ring-1 ring-inset ring-black/[0.06]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("p", { className: "truncate text-[13px] font-semibold text-brand-ink", children: row.name }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-0.5 text-[11px] text-brand-ink-tertiary", children: ["Overtime", " ", row.overtimeDates
                                                                                    .map((iso) => (0, producer_availability_1.formatIsoDayMonthYear)(iso))
                                                                                    .join(", ")] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => toggleConflictCancel(row.id), className: (0, clsx_1.default)("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition", row.cancelOvertime
                                                                        ? "bg-brand-blue text-white"
                                                                        : "bg-brand-elevated text-brand-blue ring-1 ring-inset ring-brand-blue/30"), children: row.cancelOvertime
                                                                        ? "OT canceled"
                                                                        : "Cancel OT" })] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-[11px] text-brand-ink-tertiary", children: row.cancelOvertime
                                                                ? "Leave will be assigned."
                                                                : "Leave will be skipped. Overtime stays." })] }, row.id))) })] })) : null, timeOffNotice.kind === "info" &&
                                        ((timeOffNotice.skippedNames?.length ?? 0) > 0 ||
                                            (timeOffNotice.applyNames?.length ?? 0) > 0)
                                        ? (() => {
                                            const skippedNames = timeOffNotice.skippedNames ?? [];
                                            const applyNames = timeOffNotice.applyNames ?? [];
                                            const total = timeOffNotice.totalProducers ??
                                                skippedNames.length + applyNames.length;
                                            return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(NoticeProducerList, { label: "Doesn\u2019t apply to", names: skippedNames, total: total, expanded: noticeListExpand === "skipped", onToggleExpand: () => setNoticeListExpand((current) => current === "skipped" ? null : "skipped") }), (0, jsx_runtime_1.jsx)(NoticeProducerList, { label: "Applies to", names: applyNames, total: total, expanded: noticeListExpand === "apply", onToggleExpand: () => setNoticeListExpand((current) => current === "apply" ? null : "apply") })] }));
                                        })()
                                        : null] }), (0, jsx_runtime_1.jsx)("div", { className: "shrink-0 border-t border-black/[0.08]", children: timeOffNotice.kind === "ot-conflict" ? ((() => {
                                    const applyCount = timeOffNotice.conflicts.filter((row) => row.cancelOvertime).length;
                                    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: confirmOtConflictAssignment, disabled: applyCount === 0, className: "border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-blue transition hover:bg-brand-blue-soft/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent", children: applyCount === 0
                                                    ? "Cancel OT to apply"
                                                    : "Apply leave" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: clearTimeOffNotice, className: "py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg", children: "Cancel" })] }));
                                })()) : ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: clearTimeOffNotice, className: "w-full py-3.5 text-[15px] font-semibold text-brand-blue transition hover:bg-brand-blue-soft/40", children: "Got it" })) })] })] })) : null, workDayOtConflict
                ? (0, react_dom_1.createPortal)((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-[100] flex items-center justify-center p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-brand-scrim/80", "aria-label": "Close", onClick: clearWorkDayOtConflict }), (0, jsx_runtime_1.jsxs)("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "work-day-ot-conflict-title", className: "relative flex max-h-[min(92dvh,640px)] w-full max-w-[360px] flex-col overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "shrink-0 px-6 pb-4 pt-7", children: [(0, jsx_runtime_1.jsx)("h2", { id: "work-day-ot-conflict-title", className: "text-center text-[17px] font-semibold tracking-[-0.02em] text-brand-ink", children: "Remove overtime?" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-3 text-center text-[13px] leading-relaxed text-brand-ink-secondary", children: ["Making ", weekdayLabel(workDayOtConflict.day), " a regular work day will remove overtime on", " ", workDayOtConflict.overtimeDates.length === 1
                                                    ? "this date."
                                                    : "these dates."] }), (0, jsx_runtime_1.jsx)(WorkDayOtConflictDateList, { dates: workDayOtConflict.overtimeDates })] }), (0, jsx_runtime_1.jsx)("div", { className: "shrink-0 border-t border-black/[0.08]", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: confirmWorkDayOtRemoval, className: "border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-blue transition hover:bg-brand-blue-soft/40", children: "Remove overtime" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: clearWorkDayOtConflict, className: "py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg", children: "Cancel" })] }) })] })] }), document.body)
                : null, workDayLeaveConflict
                ? (0, react_dom_1.createPortal)((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-[100] flex items-center justify-center p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-brand-scrim/80", "aria-label": "Close", onClick: clearWorkDayLeaveConflict }), (0, jsx_runtime_1.jsxs)("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "work-day-leave-conflict-title", className: "relative flex max-h-[min(92dvh,640px)] w-full max-w-[360px] flex-col overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "shrink-0 px-6 pb-4 pt-7", children: [(0, jsx_runtime_1.jsx)("h2", { id: "work-day-leave-conflict-title", className: "text-center text-[17px] font-semibold tracking-[-0.02em] text-brand-ink", children: "Cancel leave?" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-3 text-center text-[13px] leading-relaxed text-brand-ink-secondary", children: ["Making ", weekdayLabel(workDayLeaveConflict.day), " a non-working day will cancel leave on", " ", workDayLeaveConflict.leaveDates.length === 1
                                                    ? "this date."
                                                    : "these dates."] }), (0, jsx_runtime_1.jsx)(WorkDayOtConflictDateList, { dates: workDayLeaveConflict.leaveDates })] }), (0, jsx_runtime_1.jsx)("div", { className: "shrink-0 border-t border-black/[0.08]", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: confirmWorkDayLeaveRemoval, className: "border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-blue transition hover:bg-brand-blue-soft/40", children: "Cancel leave" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: clearWorkDayLeaveConflict, className: "py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg", children: "Cancel" })] }) })] })] }), document.body)
                : null] }));
}
