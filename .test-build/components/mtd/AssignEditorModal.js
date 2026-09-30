"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignEditorModal = AssignEditorModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const lucide_react_1 = require("lucide-react");
const PageHeader_1 = require("@/components/layout/PageHeader");
const clsx_1 = __importDefault(require("clsx"));
const Avatar_1 = require("@/components/ui/Avatar");
const InlineFields_1 = require("@/components/mtd/InlineFields");
const AssignLimitWarningModal_1 = require("@/components/mtd/AssignLimitWarningModal");
const editor_assignment_1 = require("@/lib/editor-assignment");
const mtd_filters_1 = require("@/lib/mtd-filters");
const producer_keys_1 = require("@/lib/producer-keys");
const dates_1 = require("@/lib/dates");
const scheduling_1 = require("@/lib/scheduling");
const producer_availability_1 = require("@/lib/producer-availability");
const producer_schedule_calc_1 = require("@/lib/producer-schedule-calc");
const producer_payout_estimate_1 = require("@/lib/producer-payout-estimate");
const assign_editor_calendar_1 = require("@/lib/assign-editor-calendar");
const types_1 = require("@/types");
function startOfLocalDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
/** The picked mix end, else the start plus the package's working days for this producer. */
function mixWindowEndFor(window, packageStr, producer, studioHolidays) {
    return (window.endIso ||
        (0, scheduling_1.suggestMixEndDate)(window.startIso, packageStr, { producer, studioHolidays }) ||
        window.startIso);
}
const MONTH_LABELS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];
function AssignEditorModal({ open, record, mtdRecords, allOrders, producers, schedule, studioHolidays = [], readOnly = false, variant = "modal", returnHref, onClose, onAssign, }) {
    const isPage = variant === "page";
    const router = (0, navigation_1.useRouter)();
    const orderById = (0, react_1.useMemo)(() => {
        const map = new Map();
        for (const order of allOrders) {
            map.set(order.id, order);
            if (order.legacyId)
                map.set(order.legacyId, order);
            if (order.uuid)
                map.set(order.uuid, order);
        }
        return map;
    }, [allOrders]);
    /** Form + subtype from the linked order (same chips as the board header). */
    const formMeta = (0, react_1.useMemo)(() => (record ? (0, mtd_filters_1.resolveMTDFormMeta)(record, orderById) : null), [record, orderById]);
    const requiredProducerCategory = (0, react_1.useMemo)(() => {
        if (!formMeta)
            return "";
        return (0, editor_assignment_1.orderCategoryToProducerCategory)(formMeta.formType, formMeta.canonicalSubtypeId);
    }, [formMeta]);
    /** Label matching Form / Cheer·Dance subtype chips on the order header. */
    const orderCategoryLabel = (0, react_1.useMemo)(() => {
        if (!formMeta)
            return "";
        if (formMeta.formType === "school-all-star-cheer") {
            return (types_1.CHEER_FORM_SUBTABS.find((t) => t.id === formMeta.cheerFormSubtype)
                ?.label || "Cheer");
        }
        if (formMeta.formType === "school-all-star-dance") {
            return (types_1.DANCE_FORM_SUBTABS.find((t) => t.id === formMeta.danceFormSubtype)
                ?.label || "Dance");
        }
        return (types_1.ORDER_FORM_TABS.find((t) => t.id === formMeta.formType)?.label ||
            requiredProducerCategory);
    }, [formMeta, requiredProducerCategory]);
    const categoryEditors = (0, react_1.useMemo)(() => requiredProducerCategory
        ? (0, editor_assignment_1.getEditorNamesForCategory)(producers, requiredProducerCategory)
        : [], [producers, requiredProducerCategory]);
    const [selectedEditor, setSelectedEditor] = (0, react_1.useState)("");
    const [draftMixStartDate, setDraftMixStartDate] = (0, react_1.useState)("");
    const [draftMixEndDate, setDraftMixEndDate] = (0, react_1.useState)("");
    const [limitConfirmOpen, setLimitConfirmOpen] = (0, react_1.useState)(false);
    const displayAssigned = record ? (0, editor_assignment_1.getDisplayAssignedProducer)(record) : null;
    const formalAssigned = record?.assignedProducer?.trim() || null;
    const isAssignmentLocked = Boolean(formalAssigned);
    const today = (0, react_1.useMemo)(() => startOfLocalDay(new Date()), []);
    const draftStartIso = (0, dates_1.toIsoDateString)(draftMixStartDate);
    const draftEndIso = (0, dates_1.toIsoDateString)(draftMixEndDate);
    const linkedOrder = (0, react_1.useMemo)(() => (record ? (0, editor_assignment_1.findLinkedOrder)(record, allOrders) : undefined), [record, allOrders]);
    const requestedEditor = (0, react_1.useMemo)(() => record ? (0, editor_assignment_1.getRequestedEditorFromRecord)(record, producers, linkedOrder) : null, [record, producers, linkedOrder]);
    const editorWorkload = (0, react_1.useMemo)(() => (0, editor_assignment_1.getEditorWorkload)(mtdRecords, record?.id), [mtdRecords, record?.id]);
    const editorBookedUntil = (0, react_1.useMemo)(() => {
        const map = new Map();
        for (const name of categoryEditors) {
            const until = (0, editor_assignment_1.getEditorBookedUntilIso)(name, mtdRecords, record?.id);
            if (until)
                map.set((0, producer_keys_1.normalizeProducerKey)(name), until);
        }
        return map;
    }, [categoryEditors, mtdRecords, record?.id]);
    const assignedProducer = (0, react_1.useMemo)(() => isAssignmentLocked && formalAssigned
        ? (0, editor_assignment_1.findProducerByAssignmentKey)(formalAssigned, producers)
        : undefined, [isAssignmentLocked, formalAssigned, producers]);
    /**
     * The window every availability check keys off. When the user has picked a
     * start (and optionally end) we honour those exact dates; without an end,
     * each producer is evaluated to their own package-estimated end.
     */
    const evalWindow = (0, react_1.useMemo)(() => {
        if (!record || !draftStartIso)
            return null;
        return { startIso: draftStartIso, endIso: draftEndIso };
    }, [record, draftStartIso, draftEndIso]);
    const windowMode = Boolean(evalWindow);
    /** Strip only switches to “free for window” once both mix dates are set. */
    const stripWindowMode = Boolean(draftStartIso && draftEndIso);
    /** Payout per booked mix, counted in full on every day of its range. */
    const estimateBookedCost = (0, react_1.useMemo)(() => (0, producer_payout_estimate_1.createBookedCostEstimator)(producers, orderById), [producers, orderById]);
    const producerRows = (0, react_1.useMemo)(() => {
        if (readOnly || !record)
            return [];
        return categoryEditors.map((name) => {
            const key = (0, producer_keys_1.normalizeProducerKey)(name);
            const producer = (0, editor_assignment_1.findProducerByAssignmentKey)(name, producers);
            const mixCount = editorWorkload.get(key) ?? 0;
            const bookedUntil = editorBookedUntil.get(key);
            let nextOpeningDate = null;
            let isAvailableToday = false;
            let canWorkToday = false;
            let availableForWindow = false;
            let blocker = null;
            let limitCheck = null;
            if (producer) {
                const openingOptions = {
                    excludeRecordId: record.id,
                    estimateCost: estimateBookedCost,
                    newMixCost: (0, producer_payout_estimate_1.estimateRecordProducerPayout)(record, producer, orderById),
                };
                canWorkToday = (0, producer_availability_1.isProducerWorkableDay)(producer, today, studioHolidays);
                isAvailableToday = (0, producer_schedule_calc_1.isProducerAvailableOnDate)(producer, today, mtdRecords, schedule, studioHolidays, openingOptions);
                const calc = (0, producer_schedule_calc_1.calculateProducerNextOpening)(producer, mtdRecords, schedule, today, studioHolidays, openingOptions);
                if (calc.nextAvailable !== "TBD") {
                    nextOpeningDate = startOfLocalDay(calc.nextAvailableDate);
                }
                if (evalWindow) {
                    const endIso = mixWindowEndFor(evalWindow, record.package, producer, studioHolidays);
                    availableForWindow = (0, producer_availability_1.isProducerAvailableForMixWindow)(producer, evalWindow.startIso, endIso, studioHolidays);
                    if (!availableForWindow) {
                        blocker = (0, producer_availability_1.findMixWindowBlocker)(producer, evalWindow.startIso, endIso, studioHolidays);
                    }
                    limitCheck = (0, producer_availability_1.checkProducerDailyLimits)(producer, evalWindow.startIso, endIso, mtdRecords, { ...openingOptions, studioHolidays });
                }
            }
            return {
                name,
                key,
                producer,
                mixCount,
                bookedUntil,
                nextOpeningDate,
                nextOpeningIso: nextOpeningDate
                    ? (0, dates_1.toCanonicalIsoDate)(nextOpeningDate)
                    : "",
                isAvailableToday,
                canWorkToday,
                availableForWindow,
                blocker,
                blockerLabel: (0, producer_availability_1.describeMixWindowBlocker)(blocker),
                limitCheck,
                overLimit: (0, producer_availability_1.dailyLimitCheckHasIssues)(limitCheck),
                workDaysShort: producer ? (0, assign_editor_calendar_1.formatProducerWorkDaysShort)(producer) : "",
                dailyLimitsLabel: producer ? (0, assign_editor_calendar_1.formatDailyLimits)(producer) : "",
            };
        });
    }, [
        readOnly,
        record,
        categoryEditors,
        producers,
        mtdRecords,
        schedule,
        studioHolidays,
        editorWorkload,
        editorBookedUntil,
        evalWindow,
        today,
        orderById,
        estimateBookedCost,
    ]);
    const rowsByKey = (0, react_1.useMemo)(() => {
        const map = new Map();
        for (const row of producerRows)
            map.set(row.key, row);
        return map;
    }, [producerRows]);
    /** A producer counts as a candidate if they can work the window (window mode) or has any opening (browse). */
    function isRowCandidate(row) {
        return windowMode ? row.availableForWindow : Boolean(row.nextOpeningDate);
    }
    /**
     * Best alternative producer given all factors: within daily limits first,
     * then soonest opening, then lightest workload.
     */
    const bestCandidateRow = (0, react_1.useMemo)(() => {
        const candidates = producerRows.filter((row) => windowMode ? row.availableForWindow : Boolean(row.nextOpeningDate));
        if (candidates.length === 0)
            return null;
        return [...candidates].sort((a, b) => {
            const la = windowMode && a.overLimit ? 1 : 0;
            const lb = windowMode && b.overLimit ? 1 : 0;
            if (la !== lb)
                return la - lb;
            const ta = a.nextOpeningDate ? a.nextOpeningDate.getTime() : Infinity;
            const tb = b.nextOpeningDate ? b.nextOpeningDate.getTime() : Infinity;
            if (ta !== tb)
                return ta - tb;
            return a.mixCount - b.mixCount;
        })[0];
    }, [producerRows, windowMode]);
    const requestedRow = (0, react_1.useMemo)(() => requestedEditor
        ? rowsByKey.get((0, producer_keys_1.normalizeProducerKey)(requestedEditor)) ?? null
        : null, [requestedEditor, rowsByKey]);
    /** Live status of the requested producer against the current context. */
    const requestedInfo = (0, react_1.useMemo)(() => {
        if (!requestedEditor) {
            return { kind: "first_available" };
        }
        if (!requestedRow) {
            return { kind: "unknown", name: requestedEditor };
        }
        const available = windowMode
            ? requestedRow.availableForWindow
            : requestedRow.canWorkToday;
        const caution = windowMode
            ? requestedRow.overLimit
            : !requestedRow.isAvailableToday;
        const nextOpenLabel = requestedRow.nextOpeningIso
            ? (0, dates_1.formatDisplayDate)(requestedRow.nextOpeningIso)
            : null;
        let statusLabel = "";
        if (available && !caution) {
            statusLabel = "Available";
        }
        else if (available && windowMode) {
            statusLabel = "Available · not recommended (daily limit)";
        }
        else if (available) {
            statusLabel = nextOpenLabel
                ? `Available · at daily limit today, recommended ${nextOpenLabel}`
                : "Available · at daily limit today";
        }
        else if (nextOpenLabel) {
            statusLabel = `Unavailable till ${nextOpenLabel}`;
        }
        else if (windowMode && requestedRow.blockerLabel) {
            statusLabel = `Unavailable · ${requestedRow.blockerLabel}`;
        }
        else {
            statusLabel = "Unavailable · no date yet";
        }
        return {
            kind: "specific",
            name: requestedEditor,
            row: requestedRow,
            available,
            caution: available && caution,
            statusLabel,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestedEditor, requestedRow, windowMode]);
    /** The single best recommendation, honouring the request when possible. */
    const suggestion = (0, react_1.useMemo)(() => {
        if (!record)
            return null;
        // 1. Honour the requested producer when they can take it within their limits.
        if (requestedRow &&
            isRowCandidate(requestedRow) &&
            !(windowMode && requestedRow.overLimit)) {
            return {
                name: requestedRow.name,
                row: requestedRow,
                tone: "good",
                reason: "requested_available",
                reasonTitle: "Requested producer available",
            };
        }
        const best = bestCandidateRow;
        if (!best)
            return null;
        const bestOverLimit = windowMode && best.overLimit;
        return {
            name: best.name,
            row: best,
            tone: requestedRow || bestOverLimit ? "swap" : "good",
            reason: "first_available",
            reasonTitle: bestOverLimit
                ? "First available · everyone goes over a daily limit on these dates"
                : "First available",
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [record, requestedRow, bestCandidateRow, windowMode]);
    const availableNames = (0, react_1.useMemo)(() => producerRows.filter(isRowCandidate).map((row) => row.name), 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [producerRows, windowMode]);
    (0, react_1.useEffect)(() => {
        if (!record)
            return;
        if (!isPage && !open)
            return;
        const assignedKey = record.assignedProducer?.trim();
        if (assignedKey) {
            const match = categoryEditors.find((name) => (0, producer_keys_1.producerKeysMatch)(name, assignedKey));
            setSelectedEditor(match ?? assignedKey.toUpperCase());
            setDraftMixStartDate((0, dates_1.toIsoDateString)(record.mixStartDate) || "");
            setDraftMixEndDate((0, dates_1.toIsoDateString)(record.mixEndDate) || "");
            return;
        }
        // No producer yet — leave everything empty until the user chooses.
        setSelectedEditor("");
        setDraftMixStartDate("");
        setDraftMixEndDate("");
    }, [open, record, categoryEditors, isPage]);
    const selectedProducer = (0, react_1.useMemo)(() => selectedEditor
        ? (0, editor_assignment_1.findProducerByAssignmentKey)(selectedEditor, producers)
        : undefined, [selectedEditor, producers]);
    const calendarRange = (0, react_1.useMemo)(() => {
        if (!evalWindow || !record)
            return null;
        return {
            startIso: evalWindow.startIso,
            endIso: mixWindowEndFor(evalWindow, record.package, selectedProducer, studioHolidays),
        };
    }, [evalWindow, record, selectedProducer, studioHolidays]);
    const calendarWorkDays = (0, react_1.useMemo)(() => calendarRange && selectedProducer
        ? (0, producer_availability_1.countProducerWorkingDays)(selectedProducer, calendarRange.startIso, calendarRange.endIso, studioHolidays)
        : null, [calendarRange, selectedProducer, studioHolidays]);
    /** Suggested end shown in the end calendar; never auto-filled. */
    const suggestedEndIso = (0, react_1.useMemo)(() => draftStartIso && record
        ? (0, scheduling_1.suggestMixEndDate)(draftStartIso, record.package, {
            producer: selectedProducer,
            studioHolidays,
        })
        : "", [draftStartIso, record, selectedProducer, studioHolidays]);
    const mixDateRules = (0, react_1.useMemo)(() => (0, assign_editor_calendar_1.buildMixDateCalendarRules)({
        producer: selectedProducer,
        studioHolidays,
        mtdRecords,
        excludeRecordId: record?.id,
        estimateCost: estimateBookedCost,
        newMixCost: record && selectedProducer
            ? (0, producer_payout_estimate_1.estimateRecordProducerPayout)(record, selectedProducer, orderById)
            : null,
        todayIso: (0, dates_1.toCanonicalIsoDate)(today),
    }), [
        selectedProducer,
        studioHolidays,
        mtdRecords,
        record,
        estimateBookedCost,
        orderById,
        today,
    ]);
    const calendarEvents = (0, react_1.useMemo)(() => {
        if (!calendarRange)
            return [];
        return (0, assign_editor_calendar_1.collectAssignCalendarEvents)(calendarRange.startIso, calendarRange.endIso, studioHolidays, selectedProducer ?? null);
    }, [calendarRange, studioHolidays, selectedProducer]);
    const selectedRow = selectedEditor
        ? rowsByKey.get((0, producer_keys_1.normalizeProducerKey)(selectedEditor))
        : undefined;
    const selectedWindowConflict = Boolean(selectedProducer && evalWindow && selectedRow && !selectedRow.availableForWindow);
    const selectedLimitCheck = selectedProducer
        ? selectedRow?.limitCheck ?? null
        : null;
    const selectedOverLimit = !selectedWindowConflict && (0, producer_availability_1.dailyLimitCheckHasIssues)(selectedLimitCheck);
    const mixStartIso = (0, dates_1.toIsoDateString)(draftMixStartDate || (isAssignmentLocked ? record?.mixStartDate : "") || "");
    const mixEndIso = (0, dates_1.toIsoDateString)(draftMixEndDate || (isAssignmentLocked ? record?.mixEndDate : "") || "");
    const showProducerBooking = Boolean(mixStartIso || mixEndIso);
    if (!record)
        return null;
    if (!isPage && !open)
        return null;
    const activeRecord = record;
    const isViewOnly = readOnly;
    const showCompactAssigned = isViewOnly || isAssignmentLocked;
    const genreLabel = orderCategoryLabel ||
        requiredProducerCategory ||
        activeRecord.category ||
        "this";
    const windowStartLabel = evalWindow
        ? (0, dates_1.formatDisplayDate)(evalWindow.startIso)
        : "";
    const windowEndLabel = draftEndIso ? (0, dates_1.formatDisplayDate)(draftEndIso) : "";
    const canSubmit = Boolean(selectedEditor) &&
        categoryEditors.some((name) => (0, producer_keys_1.producerKeysMatch)(name, selectedEditor)) &&
        Boolean(draftStartIso) &&
        Boolean(draftEndIso) &&
        draftEndIso >= draftStartIso &&
        !selectedWindowConflict &&
        !showCompactAssigned &&
        !isAssignmentLocked;
    function handleUnassign() {
        onAssign(activeRecord.id, {
            editorRequest: "FA",
            assignedProducer: null,
            mixStartDate: "",
            mixEndDate: "",
        });
        setDraftMixStartDate("");
        setDraftMixEndDate("");
        setSelectedEditor("");
    }
    /**
     * Pick an editor. When no start date is set yet, fill it from the producer's
     * availability. When the user already chose dates, keep them untouched.
     */
    function applyEditorSelection(name, startIso) {
        setSelectedEditor(name);
        if ((0, dates_1.toIsoDateString)(draftMixStartDate))
            return;
        const nextStart = startIso || (0, scheduling_1.suggestMixStartDate)(name, producers, schedule, mtdRecords) || "";
        setDraftMixStartDate(nextStart);
        // Mix end is never auto-filled — the user sets it explicitly.
    }
    function clearDates() {
        setDraftMixStartDate("");
        setDraftMixEndDate("");
    }
    function handleMixStartChange(next) {
        setDraftMixStartDate(next);
        const nextIso = (0, dates_1.toIsoDateString)(next);
        if (draftEndIso && nextIso && draftEndIso < nextIso)
            setDraftMixEndDate("");
    }
    function handleSubmit(e) {
        e.preventDefault();
        if (!canSubmit) {
            if (selectedWindowConflict) {
                alert(selectedRow?.blockerLabel ||
                    "This editor is not available for the selected mix dates.");
            }
            return;
        }
        if (selectedOverLimit) {
            setLimitConfirmOpen(true);
            return;
        }
        commitAssignment();
    }
    function commitAssignment() {
        onAssign(activeRecord.id, {
            editorRequest: (0, editor_assignment_1.editorRequestForAssignment)(selectedEditor, requestedEditor, availableNames),
            assignedProducer: selectedEditor,
            mixStartDate: draftStartIso,
            mixEndDate: draftEndIso,
        });
        if (isPage && returnHref) {
            router.push(returnHref);
        }
        else {
            onClose();
        }
    }
    const limitConfirmModal = ((0, jsx_runtime_1.jsx)(AssignLimitWarningModal_1.AssignLimitWarningModal, { open: limitConfirmOpen && selectedOverLimit, producerName: selectedProducer?.name?.trim() || selectedEditor, rangeLabel: draftStartIso && draftEndIso
            ? `${(0, dates_1.formatDisplayDate)(draftStartIso)} – ${(0, dates_1.formatDisplayDate)(draftEndIso)}`
            : windowStartLabel, issues: selectedLimitCheck ? (0, assign_editor_calendar_1.describeDailyLimitIssues)(selectedLimitCheck) : [], usage: selectedLimitCheck ? (0, assign_editor_calendar_1.describeDailyLimitUsage)(selectedLimitCheck) : [], onClose: () => setLimitConfirmOpen(false), onConfirm: commitAssignment }));
    const assignmentForm = ((0, jsx_runtime_1.jsx)("form", { onSubmit: handleSubmit, className: "flex h-0 min-h-0 flex-1 flex-col overflow-hidden", children: showCompactAssigned ? ((0, jsx_runtime_1.jsx)("div", { className: "flex min-h-0 flex-col px-6 py-5", children: (0, jsx_runtime_1.jsxs)("div", { className: "space-y-5", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-label", children: "Editor" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-0.5 text-[11px] text-brand-ink-tertiary", children: ["Requested:", " ", (0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-brand-ink", children: requestedEditor || "First available" })] }), displayAssigned ? ((0, jsx_runtime_1.jsx)("div", { className: "mt-1.5 rounded-xl border border-brand-line/70 bg-brand-bg/50 px-3 py-2.5", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2.5", children: [(0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { producer: assignedProducer, initials: displayAssigned, size: "sm" }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: displayAssigned }), (0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-brand-ink-tertiary", children: isViewOnly ? "Assigned on MTD" : "Currently assigned" })] }), isViewOnly ? ((0, jsx_runtime_1.jsx)("span", { className: "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-bg text-brand-ink-tertiary", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Lock, { className: "h-3.5 w-3.5", strokeWidth: 2 }) })) : ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: handleUnassign, title: "Unassign editor", "aria-label": "Unassign editor", className: "inline-flex h-7 shrink-0 items-center justify-center rounded-lg border border-brand-line/70 bg-brand-elevated px-2.5 text-[11px] font-semibold text-brand-ink-secondary transition hover:border-brand-warning/40 hover:bg-brand-warning/10 hover:text-brand-warning", children: "Unassign" }))] }) })) : ((0, jsx_runtime_1.jsxs)("div", { className: "mt-1.5 rounded-xl border border-brand-line/70 bg-brand-bg/50 px-3 py-2.5", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-medium text-brand-ink-tertiary", children: "No editor assigned" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[11px] text-brand-ink-tertiary", children: "Assign an editor on the Orders tab before moving to MTD." })] }))] }), showProducerBooking ? ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-brand-line/70 bg-brand-bg/40 px-3 py-2.5", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-label", children: "Producer booking" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[11px] leading-snug text-brand-ink-tertiary", children: "Mix dates from assignment. Reassign to change them." }), (0, jsx_runtime_1.jsxs)("dl", { className: "mt-2.5 space-y-1.5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-baseline justify-between gap-3 text-[12px]", children: [(0, jsx_runtime_1.jsx)("dt", { className: "text-brand-ink-tertiary", children: "From" }), (0, jsx_runtime_1.jsx)("dd", { className: "font-medium tabular-nums text-brand-ink", children: mixStartIso ? (0, dates_1.formatDisplayDate)(mixStartIso) : "Not set" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-baseline justify-between gap-3 text-[12px]", children: [(0, jsx_runtime_1.jsx)("dt", { className: "text-brand-ink-tertiary", children: "Until" }), (0, jsx_runtime_1.jsx)("dd", { className: "font-medium tabular-nums text-brand-ink", children: mixEndIso ? (0, dates_1.formatDisplayDate)(mixEndIso) : "Not set" })] })] })] })) : null] }) })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("h-0 min-h-0 flex-1 overflow-y-auto overscroll-contain", isPage
                        ? "px-6 py-6 pb-24 lg:px-8"
                        : "px-5 py-4 scrollbar-hide sm:px-6"), children: [(0, jsx_runtime_1.jsx)("style", { children: `
                  .assign-editor-layout {
                    display: grid;
                    gap: 1rem;
                  }
                  @media (min-width: 1024px) {
                    .assign-editor-layout {
                      grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.85fr);
                      align-items: start;
                      gap: 1.25rem 1.75rem;
                    }
                  }
                ` }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-4 lg:space-y-5", children: (0, jsx_runtime_1.jsxs)("div", { className: "assign-editor-layout", children: [(0, jsx_runtime_1.jsx)("div", { className: "min-w-0 space-y-4", children: categoryEditors.length === 0 ? ((0, jsx_runtime_1.jsxs)("p", { className: "rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3 py-2 text-[13px] text-brand-warning", children: ["No producers specialize in ", genreLabel, "."] })) : ((0, jsx_runtime_1.jsx)(AvailabilityProducerStrip, { rows: producerRows, windowMode: stripWindowMode, selectedEditor: selectedEditor, genreLabel: genreLabel, windowLabel: stripWindowMode
                                                ? `${windowStartLabel}${windowEndLabel ? ` – ${windowEndLabel}` : ""}`
                                                : null, onSelect: applyEditorSelection })) }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0 space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "rounded-2xl border border-brand-line/60 bg-white p-4", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[10px] font-bold uppercase tracking-[0.06em] text-brand-ink-tertiary", children: "Requested on form" }), (0, jsx_runtime_1.jsx)("div", { className: "mt-2", children: (0, jsx_runtime_1.jsx)(RequestedCard, { variant: "compact", info: requestedInfo, producers: producers, readOnly: true }) }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-4 border-t border-brand-line/40 pt-3", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-medium text-brand-ink-tertiary", children: "Assigned editor" }), (0, jsx_runtime_1.jsx)("div", { className: "mt-1.5", children: selectedEditor ? ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("flex w-full items-center gap-2 rounded-lg border px-2 py-1.5", selectedWindowConflict || selectedOverLimit
                                                                        ? "border-brand-warning/35 bg-brand-warning/8"
                                                                        : "border-brand-line/50 bg-brand-bg/40"), children: [(0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { producer: selectedProducer, initials: selectedEditor, size: "xs" }), (0, jsx_runtime_1.jsxs)("span", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "block truncate text-[12px] font-semibold text-brand-ink", children: selectedEditor }), (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("block truncate text-[10px]", selectedWindowConflict || selectedOverLimit
                                                                                        ? "text-brand-warning"
                                                                                        : "text-brand-success"), children: selectedWindowConflict
                                                                                        ? selectedRow?.blockerLabel ||
                                                                                            "Not free for selected dates"
                                                                                        : selectedOverLimit
                                                                                            ? "Available · not recommended (daily limit)"
                                                                                            : selectedRow?.isAvailableToday
                                                                                                ? "Available today"
                                                                                                : selectedRow?.nextOpeningIso
                                                                                                    ? `Available from ${(0, dates_1.formatDisplayDate)(selectedRow.nextOpeningIso)}`
                                                                                                    : "Selected" })] })] })) : ((0, jsx_runtime_1.jsx)("p", { className: "rounded-lg border border-dashed border-brand-line/70 bg-brand-bg/30 px-3 py-2.5 text-[12px] text-brand-ink-tertiary", children: "Pick someone from first available dates" })) }), selectedWindowConflict ? ((0, jsx_runtime_1.jsxs)("p", { className: "mt-2 rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3 py-2 text-[12px] text-brand-warning", children: [selectedEditor, " can't take these dates", selectedRow?.blockerLabel
                                                                        ? ` — ${selectedRow.blockerLabel.toLowerCase()}`
                                                                        : "", "."] })) : null] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-2xl border border-brand-line/60 bg-white p-4", children: [(0, jsx_runtime_1.jsx)(SectionHeading, { title: "Booking dates" }), (0, jsx_runtime_1.jsxs)("div", { className: "grid gap-3 sm:grid-cols-2", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[11px] font-medium text-brand-ink-tertiary", children: "Mix start" }), (0, jsx_runtime_1.jsx)("div", { className: "mt-1", children: (0, jsx_runtime_1.jsx)(InlineFields_1.InlineDateInput, { value: draftMixStartDate, placeholder: "Required", min: (0, dates_1.toCanonicalIsoDate)(today), menuZIndex: 80, onChange: handleMixStartChange, isDateDisabled: mixDateRules.isDateDisabled, dayTitle: mixDateRules.dayTitle, dayTone: mixDateRules.dayTone }) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[11px] font-medium text-brand-ink-tertiary", children: "Mix end" }), (0, jsx_runtime_1.jsx)("div", { className: "mt-1", children: (0, jsx_runtime_1.jsx)(InlineFields_1.InlineDateInput, { value: draftMixEndDate, placeholder: "Required", template: suggestedEndIso || undefined, min: draftStartIso || (0, dates_1.toCanonicalIsoDate)(today), menuZIndex: 80, onChange: setDraftMixEndDate, isDateDisabled: mixDateRules.isDateDisabled, dayTitle: mixDateRules.dayTitle, dayTone: mixDateRules.dayTone }) })] })] }), windowMode ? ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: clearDates, className: "mt-3 text-[11px] font-semibold text-brand-info transition hover:text-brand-ink", children: "Clear dates \u00B7 browse by soonest opening" })) : null, calendarRange ? ((0, jsx_runtime_1.jsx)("div", { className: "mt-4", children: (0, jsx_runtime_1.jsx)(CalendarTransparencyPanel, { calendarRange: calendarRange, events: calendarEvents, selectedProducer: selectedProducer, selectedEditor: selectedEditor, limitCheck: selectedLimitCheck, workDays: calendarWorkDays, endIsSuggested: !draftEndIso }) })) : null] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-2xl border border-brand-line/60 bg-white p-4", children: [(0, jsx_runtime_1.jsx)(SectionHeading, { title: "Suggested pick", subtitle: "Best match from request, dates, and workload" }), suggestion ? ((0, jsx_runtime_1.jsx)(SuggestionDetailCard, { suggestion: suggestion, producers: producers, selectedEditor: selectedEditor, windowMode: windowMode, onSelect: () => applyEditorSelection(suggestion.name) })) : ((0, jsx_runtime_1.jsx)("p", { className: "rounded-xl border border-brand-line/70 bg-brand-bg/40 px-3 py-2.5 text-[13px] text-brand-ink-tertiary", children: windowMode
                                                            ? "No editor is free for the selected dates."
                                                            : "No suggestion available yet." }))] })] })] }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-brand-line/60 bg-brand-elevated/95 px-4 py-3 backdrop-blur-sm sm:px-6", isPage && "fixed bottom-0 left-0 right-0 z-30"), style: isPage
                        ? {
                            left: "var(--sidebar-margin, 0px)",
                        }
                        : undefined, children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-brand-ink-tertiary", children: selectedEditor ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: ["Selected", " ", (0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-brand-ink", children: selectedEditor }), draftStartIso && draftEndIso
                                        ? ` · ${(0, dates_1.formatDisplayDate)(draftStartIso)} – ${(0, dates_1.formatDisplayDate)(draftEndIso)}`
                                        : " · set mix dates to assign", selectedOverLimit ? ((0, jsx_runtime_1.jsxs)("span", { className: "font-semibold text-brand-warning", children: [" ", "\u00B7 Not recommended (daily limit)"] })) : null] })) : ("Select an editor and mix dates to assign") }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [isPage && returnHref ? ((0, jsx_runtime_1.jsx)(link_1.default, { href: returnHref, className: "rounded-lg border border-brand-line/70 px-3 py-2 text-[13px] font-medium text-brand-ink-secondary transition hover:bg-brand-bg", children: "Cancel" })) : null, (0, jsx_runtime_1.jsx)("button", { type: "submit", disabled: !canSubmit, className: "rounded-lg bg-brand-cta px-4 py-2 text-[13px] font-medium text-brand-cta-text transition hover:bg-brand-cta-hover disabled:cursor-not-allowed disabled:opacity-45", children: "Assign" })] })] })] })) }));
    if (isPage) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-0 min-h-0 flex-1 flex-col overflow-hidden", children: [(0, jsx_runtime_1.jsx)(PageHeader_1.PageHeader, { title: showCompactAssigned ? "View assignment" : "Assign producer", subtitle: `${activeRecord.programName} · ${genreLabel} specialists`, headerActions: returnHref ? ((0, jsx_runtime_1.jsx)(link_1.default, { href: returnHref, className: "inline-flex h-8 items-center gap-1 rounded-lg border border-brand-line bg-brand-elevated/90 px-3 text-[12px] font-semibold text-brand-ink-secondary transition hover:bg-brand-elevated hover:text-brand-ink", children: "\u2190 Back" })) : null }), (0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("flex h-0 min-h-0 flex-1 flex-col overflow-hidden", showCompactAssigned && "mx-6 max-w-lg lg:mx-8"), children: assignmentForm }), limitConfirmModal] }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-brand-scrim backdrop-blur-sm", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("surface-premium relative z-10 flex w-full flex-col overflow-hidden rounded-2xl shadow-[var(--shadow-premium)]", showCompactAssigned
                    ? "max-h-[90dvh] max-w-lg"
                    : "flex h-[min(90dvh,820px)] max-h-[90dvh] max-w-4xl flex-col"), children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex shrink-0 items-start justify-between gap-4 border-b border-brand-line/60 px-5 py-4 sm:px-6", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-label", children: "Editor assignment" }), (0, jsx_runtime_1.jsx)("h2", { className: "text-display mt-1 text-[18px]", children: showCompactAssigned ? "View assignment" : "Assign producer" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-[13px] text-brand-ink-secondary", children: [activeRecord.programName, (0, jsx_runtime_1.jsxs)("span", { className: "text-brand-ink-tertiary", children: [" ", "\u00B7 ", genreLabel, " specialists"] })] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4" }) })] }), assignmentForm] }), limitConfirmModal] }));
}
function RequestedCard({ variant = "default", info, producers, selectedEditor = "", onSelect, readOnly = false, }) {
    const compact = variant === "compact";
    if (info.kind === "first_available") {
        return ((0, jsx_runtime_1.jsxs)("div", { className: compact ? "mt-1.5" : "rounded-xl border border-brand-line/70 bg-brand-bg/40 px-3 py-2.5", children: [!compact ? ((0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-medium text-brand-ink-tertiary", children: "Requested" })) : null, (0, jsx_runtime_1.jsx)("p", { className: (0, clsx_1.default)("font-semibold text-brand-ink", compact ? "text-[13px]" : "mt-0.5 text-[13px]"), children: "First available" }), !compact ? ((0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[11px] leading-snug text-brand-ink-tertiary", children: "No specific editor was requested on the form." })) : null] }));
    }
    if (info.kind === "unknown") {
        return ((0, jsx_runtime_1.jsxs)("div", { className: compact ? "mt-1.5" : "rounded-xl border border-brand-line/70 bg-brand-bg/40 px-3 py-2.5", children: [!compact ? ((0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-medium text-brand-ink-tertiary", children: "Requested" })) : null, (0, jsx_runtime_1.jsx)("p", { className: (0, clsx_1.default)("font-semibold text-brand-ink", compact ? "text-[13px]" : "mt-0.5 text-[13px]"), children: info.name }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[11px] leading-snug text-brand-ink-tertiary", children: compact
                        ? "Not on this genre roster."
                        : "Not on this genre's roster." })] }));
    }
    const isSelected = Boolean(selectedEditor) && (0, producer_keys_1.producerKeysMatch)(selectedEditor, info.name);
    const warn = !info.available || info.caution;
    if (compact) {
        if (readOnly || !onSelect) {
            return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("mt-1.5 flex w-full items-center gap-2 rounded-lg border px-2 py-1.5", warn
                    ? "border-brand-warning/35 bg-brand-warning/8"
                    : "border-brand-line/50 bg-brand-bg/40"), title: info.statusLabel, children: [(0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { producer: (0, editor_assignment_1.findProducerByAssignmentKey)(info.name, producers), initials: info.name, size: "xs" }), (0, jsx_runtime_1.jsxs)("span", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "block truncate text-[12px] font-semibold text-brand-ink", children: info.name }), (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("block truncate text-[10px]", warn ? "text-brand-warning" : "text-brand-success"), children: info.statusLabel })] })] }));
        }
        return ((0, jsx_runtime_1.jsxs)("button", { type: "button", disabled: !info.available, onClick: () => onSelect(info.name, info.row.nextOpeningIso || undefined), className: (0, clsx_1.default)("mt-1.5 flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition", !info.available && "cursor-not-allowed opacity-90", isSelected
                ? "border-brand-signature bg-brand-signature-soft/80"
                : info.available
                    ? "border-brand-line/50 bg-brand-bg/40 hover:border-brand-line hover:bg-brand-bg/70"
                    : "border-brand-warning/35 bg-brand-warning/8"), children: [(0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { producer: (0, editor_assignment_1.findProducerByAssignmentKey)(info.name, producers), initials: info.name, size: "xs" }), (0, jsx_runtime_1.jsxs)("span", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "block truncate text-[12px] font-semibold text-brand-ink", children: info.name }), (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("block truncate text-[10px]", info.available ? "text-brand-success" : "text-brand-warning"), children: info.statusLabel })] })] }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("rounded-xl border px-3 py-2.5", info.available
            ? "border-brand-line/70 bg-brand-bg/40"
            : "border-brand-warning/30 bg-brand-warning/8"), children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-medium text-brand-ink-tertiary", children: "Requested" }), (0, jsx_runtime_1.jsxs)("button", { type: "button", disabled: !info.available || !onSelect, onClick: () => {
                    if (!onSelect)
                        return;
                    onSelect(info.name, info.row.nextOpeningIso || undefined);
                }, className: (0, clsx_1.default)("mt-1.5 flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition", (!info.available || !onSelect) && "cursor-not-allowed", isSelected
                    ? "border-brand-signature bg-brand-signature-soft shadow-sm"
                    : info.available
                        ? "border-brand-line/70 bg-brand-elevated hover:border-brand-line hover:bg-brand-bg"
                        : "border-brand-warning/30 bg-brand-elevated/60"), children: [(0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { producer: (0, editor_assignment_1.findProducerByAssignmentKey)(info.name, producers), initials: info.name, size: "xs" }), (0, jsx_runtime_1.jsxs)("span", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[13px] font-semibold text-brand-ink", children: info.name }), (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("block text-[11px]", info.available ? "text-brand-success" : "text-brand-warning"), children: info.statusLabel }), (0, jsx_runtime_1.jsxs)("span", { className: "mt-1 block text-[10px] text-brand-ink-tertiary", children: [info.row.dailyLimitsLabel, " \u00B7 ", info.row.workDaysShort] })] })] })] }));
}
function SectionHeading({ title, subtitle, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "mb-3", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-[14px] font-semibold text-brand-ink", children: title }), subtitle ? ((0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-brand-ink-tertiary", children: subtitle })) : null] }));
}
const CALENDAR_KIND_META = {
    studio_holiday: { dot: "bg-brand-warning", label: "Studio holiday" },
    leave: { dot: "bg-brand-orange", label: "Leave" },
    overtime: { dot: "bg-brand-info", label: "Overtime" },
    non_work: { dot: "bg-brand-line-strong", label: "Non-work day" },
};
function DailyLimitsSummary({ check }) {
    const usage = (0, assign_editor_calendar_1.describeDailyLimitUsage)(check);
    if (usage.length === 0)
        return null;
    const issues = (0, assign_editor_calendar_1.describeDailyLimitIssues)(check);
    const notRecommended = issues.length > 0;
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("mt-3 rounded-lg border px-2.5 py-2", notRecommended
            ? "border-brand-warning/30 bg-brand-warning/8"
            : "border-brand-success/25 bg-brand-success/8"), children: [(0, jsx_runtime_1.jsx)("p", { className: (0, clsx_1.default)("text-[11px] font-semibold", notRecommended ? "text-brand-warning" : "text-brand-success"), children: notRecommended
                    ? "Not recommended · goes over daily limits"
                    : "Within daily limits" }), notRecommended ? ((0, jsx_runtime_1.jsx)("ul", { className: "mt-1 space-y-0.5", children: issues.map((issue) => ((0, jsx_runtime_1.jsx)("li", { className: "text-[11px] leading-snug text-brand-warning", children: issue }, issue))) })) : null, (0, jsx_runtime_1.jsx)("dl", { className: "mt-1.5 space-y-1", children: usage.map((line) => ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { className: "text-[10px] font-medium uppercase tracking-wide text-brand-ink-tertiary", children: line.label }), (0, jsx_runtime_1.jsx)("dd", { className: (0, clsx_1.default)("text-[11px] tabular-nums", line.over ? "font-semibold text-brand-warning" : "text-brand-ink"), children: line.value })] }, line.label))) }), notRecommended ? ((0, jsx_runtime_1.jsx)("p", { className: "mt-1.5 text-[10px] leading-snug text-brand-ink-tertiary", children: "You can still assign \u2014 you'll be asked to confirm." })) : null] }));
}
function CalendarTransparencyPanel({ calendarRange, events, selectedProducer, selectedEditor, limitCheck, workDays, endIsSuggested, }) {
    if (!calendarRange) {
        return null;
    }
    const rangeLabel = `${(0, dates_1.formatDisplayDate)(calendarRange.startIso)} – ${(0, dates_1.formatDisplayDate)(calendarRange.endIso)}`;
    const skippedCount = events.filter((event) => event.kind !== "overtime").length;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-2xl border border-brand-line/70 bg-brand-bg/40 p-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[12px] font-semibold text-brand-ink", children: "Calendar context" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-0.5 text-[11px] text-brand-ink-tertiary tabular-nums", children: [rangeLabel, endIsSuggested ? " (suggested end)" : ""] }), workDays != null ? ((0, jsx_runtime_1.jsxs)("p", { className: "mt-0.5 text-[11px] font-medium text-brand-ink-secondary tabular-nums", children: [workDays, " work ", workDays === 1 ? "day" : "days", skippedCount > 0
                                        ? " · days off, leave and holidays skipped"
                                        : ""] })) : null] }), (0, jsx_runtime_1.jsx)("span", { className: "rounded-full bg-brand-elevated px-2 py-0.5 text-[10px] font-semibold text-brand-ink-secondary ring-1 ring-brand-line/60", children: selectedProducer
                            ? selectedEditor || "Producer"
                            : "Studio-wide" })] }), events.length === 0 ? ((0, jsx_runtime_1.jsxs)("p", { className: "mt-3 rounded-lg border border-brand-success/25 bg-brand-success/8 px-2.5 py-2 text-[11px] text-brand-success", children: ["No holidays or leave in this range", selectedProducer ? " for this producer" : " (studio-wide)", "."] })) : ((0, jsx_runtime_1.jsx)("ul", { className: "mt-3 max-h-[220px] space-y-1.5 overflow-y-auto scrollbar-hide", children: events.map((event) => {
                    const meta = CALENDAR_KIND_META[event.kind];
                    return ((0, jsx_runtime_1.jsxs)("li", { className: "flex items-start gap-2 rounded-lg border border-brand-line/50 bg-brand-elevated/70 px-2.5 py-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", meta.dot) }), (0, jsx_runtime_1.jsxs)("span", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[11px] font-semibold tabular-nums text-brand-ink", children: (0, dates_1.formatDisplayDate)(event.iso) }), (0, jsx_runtime_1.jsxs)("span", { className: "block text-[10px] text-brand-ink-tertiary", children: [meta.label, " \u00B7 ", event.label] })] })] }, `${event.iso}-${event.kind}-${event.label}`));
                }) })), selectedProducer && limitCheck ? ((0, jsx_runtime_1.jsx)(DailyLimitsSummary, { check: limitCheck })) : null, selectedProducer ? ((0, jsx_runtime_1.jsxs)("p", { className: "mt-3 text-[10px] leading-snug text-brand-ink-tertiary", children: ["Work days: ", (0, assign_editor_calendar_1.formatProducerWorkDaysShort)(selectedProducer), " \u00B7", " ", (0, assign_editor_calendar_1.formatDailyLimits)(selectedProducer)] })) : ((0, jsx_runtime_1.jsx)("p", { className: "mt-3 text-[10px] leading-snug text-brand-ink-tertiary", children: "Showing studio holidays that apply to all producers. Select someone to see personal leave and schedule." }))] }));
}
function sortProducerRowsByOpening(a, b) {
    const ta = a.nextOpeningDate?.getTime() ?? Infinity;
    const tb = b.nextOpeningDate?.getTime() ?? Infinity;
    return ta - tb || a.mixCount - b.mixCount;
}
function isProducerRowOpen(row, windowMode) {
    return windowMode ? row.availableForWindow : Boolean(row.nextOpeningDate);
}
function producerStatusLabel(row, windowMode) {
    if (windowMode)
        return "Free";
    if (!row.nextOpeningDate)
        return "TBD";
    if (row.isAvailableToday)
        return "Today";
    return `${MONTH_LABELS[row.nextOpeningDate.getMonth()].slice(0, 3)} ${row.nextOpeningDate.getDate()}`;
}
function ProducerAvailChip({ row, windowMode, selectedEditor, onSelect, }) {
    const open = isProducerRowOpen(row, windowMode);
    const selected = Boolean(selectedEditor) && (0, producer_keys_1.producerKeysMatch)(selectedEditor, row.name);
    const displayName = row.producer?.name?.trim() || row.name;
    const statusLabel = producerStatusLabel(row, windowMode);
    const fullStatus = windowMode
        ? row.overLimit
            ? "Free · not recommended (daily limit)"
            : "Free"
        : row.isAvailableToday
            ? "Today"
            : row.nextOpeningIso
                ? (0, dates_1.formatDisplayDate)(row.nextOpeningIso)
                : "TBD";
    return ((0, jsx_runtime_1.jsxs)("button", { type: "button", disabled: !open, title: `${displayName} · ${fullStatus}`, onClick: () => {
            if (!open)
                return;
            onSelect(row.name, row.nextOpeningIso || undefined);
        }, className: (0, clsx_1.default)("inline-flex w-11 shrink-0 flex-col items-center gap-1 rounded-lg px-0.5 py-1 transition", selected
            ? "bg-brand-signature-soft ring-1 ring-brand-signature/30"
            : "hover:bg-brand-bg/70"), children: [(0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("w-full truncate text-center text-[9px] font-semibold leading-tight tabular-nums", open ? "text-brand-success" : "text-brand-ink-tertiary"), children: statusLabel }), (0, jsx_runtime_1.jsxs)("span", { className: "relative", children: [(0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { producer: row.producer, initials: row.name, size: "sm" }), selected ? ((0, jsx_runtime_1.jsx)("span", { className: "absolute -bottom-0.5 -right-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-signature text-white shadow-sm", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Check, { className: "h-2 w-2", strokeWidth: 3 }) })) : null] })] }));
}
function AvailabilityProducerStrip({ rows, windowMode, selectedEditor, genreLabel, windowLabel, onSelect, }) {
    const monthSections = (0, react_1.useMemo)(() => {
        if (windowMode) {
            const free = rows
                .filter((row) => isProducerRowOpen(row, true))
                .sort(sortProducerRowsByOpening);
            return free.length
                ? [
                    {
                        key: "window",
                        title: windowLabel || "Selected dates",
                        rows: free,
                    },
                ]
                : [];
        }
        // Every category producer appears once, grouped by their first available date.
        const byMonth = new Map();
        const noDateYet = [];
        for (const row of rows) {
            if (!row.nextOpeningDate) {
                noDateYet.push(row);
                continue;
            }
            const y = row.nextOpeningDate.getFullYear();
            const m = row.nextOpeningDate.getMonth();
            const key = `${y}-${m}`;
            const existing = byMonth.get(key);
            if (existing) {
                existing.rows.push(row);
            }
            else {
                byMonth.set(key, {
                    sortKey: y * 12 + m,
                    title: `${MONTH_LABELS[m]} ${y}`,
                    rows: [row],
                });
            }
        }
        const sections = [...byMonth.values()]
            .sort((a, b) => a.sortKey - b.sortKey)
            .map((section) => ({
            key: `${section.sortKey}`,
            title: section.title,
            rows: [...section.rows].sort(sortProducerRowsByOpening),
        }));
        if (noDateYet.length > 0) {
            sections.push({
                key: "no-date",
                title: "No date yet",
                rows: [...noDateYet].sort((a, b) => a.name.localeCompare(b.name)),
            });
        }
        return sections;
    }, [rows, windowMode, windowLabel]);
    if (rows.length === 0) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "rounded-2xl border border-brand-line/60 bg-white p-4", children: (0, jsx_runtime_1.jsx)("p", { className: "rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3 py-2 text-[13px] text-brand-warning", children: windowMode
                    ? "No editors match this mix window."
                    : `No producers specialize in ${genreLabel}.` }) }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "overflow-hidden rounded-2xl border border-brand-line/60 bg-white", children: [(0, jsx_runtime_1.jsxs)("div", { className: "border-b border-brand-line/50 px-4 py-3.5 sm:px-5", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-[14px] font-semibold text-brand-ink", children: "Producer's first available dates" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-brand-ink-tertiary", children: windowLabel
                            ? `${genreLabel} · ${windowLabel}`
                            : `${genreLabel} · choose a producer below` })] }), (0, jsx_runtime_1.jsx)("div", { className: "divide-y divide-brand-line/40", children: monthSections.map((section) => ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-2 bg-brand-bg/30 px-4 py-2 sm:px-5", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[12px] font-semibold tabular-nums text-brand-ink", children: section.title }), (0, jsx_runtime_1.jsxs)("p", { className: "text-[11px] text-brand-ink-tertiary", children: [section.rows.length, " producer", section.rows.length === 1 ? "" : "s"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-nowrap gap-1 overflow-x-auto overscroll-x-contain px-3 py-2 scrollbar-hide sm:px-4", children: section.rows.map((row) => ((0, jsx_runtime_1.jsx)(ProducerAvailChip, { row: row, windowMode: windowMode, selectedEditor: selectedEditor, onSelect: onSelect }, row.key))) })] }, section.key))) })] }));
}
function SuggestionDetailCard({ suggestion, producers, selectedEditor, windowMode, onSelect, }) {
    const isSelected = Boolean(selectedEditor) &&
        (0, producer_keys_1.producerKeysMatch)(selectedEditor, suggestion.name);
    return ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: onSelect, className: (0, clsx_1.default)("flex w-full items-start gap-3 rounded-xl border p-3 text-left transition", isSelected
            ? "border-brand-signature bg-brand-signature-soft shadow-sm ring-1 ring-brand-signature/25"
            : "border-brand-line/70 bg-brand-bg/40 hover:border-brand-line hover:bg-brand-bg/70"), children: [(0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { producer: (0, editor_assignment_1.findProducerByAssignmentKey)(suggestion.name, producers), initials: suggestion.name, size: "sm" }), (0, jsx_runtime_1.jsxs)("span", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsxs)("span", { className: "flex flex-wrap items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[13px] font-semibold text-brand-ink", children: suggestion.name }), (0, jsx_runtime_1.jsx)("span", { className: "rounded-full bg-brand-info/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand-info", children: "Recommended" })] }), (0, jsx_runtime_1.jsx)("p", { className: (0, clsx_1.default)("mt-1 text-[12px] font-medium leading-snug", suggestion.tone === "swap"
                            ? "text-brand-warning"
                            : "text-brand-ink-secondary"), children: suggestion.reasonTitle }), (0, jsx_runtime_1.jsxs)("dl", { className: "mt-2 grid gap-1.5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "rounded-lg bg-white/80 px-2.5 py-1.5", children: [(0, jsx_runtime_1.jsx)("dt", { className: "text-[10px] font-medium uppercase tracking-wide text-brand-ink-tertiary", children: "Daily limits" }), (0, jsx_runtime_1.jsx)("dd", { className: "text-[12px] font-medium text-brand-ink", children: suggestion.row.dailyLimitsLabel })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-lg bg-white/80 px-2.5 py-1.5", children: [(0, jsx_runtime_1.jsx)("dt", { className: "text-[10px] font-medium uppercase tracking-wide text-brand-ink-tertiary", children: windowMode ? "Mix window" : "Schedule" }), (0, jsx_runtime_1.jsx)("dd", { className: "text-[12px] text-brand-ink", children: windowMode
                                            ? suggestion.row.availableForWindow
                                                ? suggestion.row.overLimit
                                                    ? "Can take these dates · goes over daily limits"
                                                    : "Can take the full selected mix window"
                                                : suggestion.row.blockerLabel ?? "Cannot take selected dates"
                                            : suggestion.row.workDaysShort })] })] })] })] }));
}
