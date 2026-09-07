"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProducerAvailabilityModal = ProducerAvailabilityModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const producer_time_off_1 = require("@/lib/producer-time-off");
const types_1 = require("@/types");
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
function ProducerAvailabilityModal({ open, onClose, producer, onSave, }) {
    const [workDays, setWorkDays] = (0, react_1.useState)([...types_1.DEFAULT_WORK_DAYS]);
    const [timeOff, setTimeOff] = (0, react_1.useState)([]);
    const [hasMaxCapacity, setHasMaxCapacity] = (0, react_1.useState)(false);
    const [maxMixesPerDay, setMaxMixesPerDay] = (0, react_1.useState)(6);
    const [overtimeDays, setOvertimeDays] = (0, react_1.useState)([]);
    const [overtimeDraft, setOvertimeDraft] = (0, react_1.useState)("");
    const overtimeInputRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!open || !producer)
            return;
        setWorkDays([...producer.workDays]);
        setTimeOff(producer.timeOff.map((entry) => ({
            key: entry.id,
            startDate: entry.startDate,
            endDate: entry.endDate,
            type: entry.type,
            reason: entry.reason,
        })));
        setHasMaxCapacity(producer.maxMixesPerDay != null);
        setMaxMixesPerDay(producer.maxMixesPerDay ?? 6);
        setOvertimeDays([...producer.overtimeDays]);
        setOvertimeDraft("");
    }, [open, producer]);
    if (!open || !producer)
        return null;
    function toggleDay(day) {
        setWorkDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
    }
    function addTimeOff() {
        const today = new Date().toISOString().slice(0, 10);
        setTimeOff((prev) => [
            ...prev,
            {
                key: `to-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                startDate: today,
                endDate: today,
                type: "personal",
                reason: (0, producer_time_off_1.defaultReasonForTimeOffType)("personal"),
            },
        ]);
    }
    function updateTimeOff(key, patch) {
        setTimeOff((prev) => prev.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)));
    }
    function removeTimeOff(key) {
        setTimeOff((prev) => prev.filter((entry) => entry.key !== key));
    }
    function addOvertimeDay(iso) {
        const value = (iso ?? overtimeDraft).trim();
        if (!value)
            return;
        setOvertimeDays((prev) => [...new Set([...prev, value])].sort((a, b) => a.localeCompare(b)));
        setOvertimeDraft("");
    }
    function removeOvertimeDay(iso) {
        setOvertimeDays((prev) => prev.filter((day) => day !== iso));
    }
    function handleDone() {
        onSave({
            workDays,
            timeOff: timeOff
                .filter((entry) => entry.startDate && entry.reason.trim())
                .map((entry) => ({
                id: entry.key,
                startDate: entry.startDate,
                endDate: entry.endDate || entry.startDate,
                type: entry.type,
                reason: entry.reason.trim(),
            })),
            maxMixesPerDay: hasMaxCapacity ? Math.max(1, maxMixesPerDay) : null,
            overtimeDays,
        });
        onClose();
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-black/45 backdrop-blur-[2px]", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative flex max-h-[min(94dvh,820px)] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[28px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:rounded-[28px]", children: [(0, jsx_runtime_1.jsxs)("header", { className: "relative flex shrink-0 items-center justify-between border-b border-black/[0.08] px-4 py-3.5", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "min-w-[64px] text-left text-[15px] text-brand-ink-secondary transition hover:text-brand-ink", children: "Cancel" }), (0, jsx_runtime_1.jsx)("h2", { className: "absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold tracking-[-0.01em] text-brand-ink", children: "Schedule & capacity" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: handleDone, className: "min-w-[64px] text-right text-[15px] font-semibold text-brand-blue transition hover:text-brand-blue-hover", children: "Done" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-6 flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)("img", { src: producer.avatar, alt: "", className: "h-11 w-11 rounded-full bg-brand-bg object-cover" }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("p", { className: "truncate text-[15px] font-semibold text-brand-ink", children: producer.name }), (0, jsx_runtime_1.jsx)("p", { className: "text-[12px] text-brand-ink-tertiary", children: producer.specialty })] })] }), (0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: "Days they work" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-brand-ink-tertiary", children: "Regular weekly schedule. Mon\u2013Fri by default." }), (0, jsx_runtime_1.jsx)("div", { className: "mt-4 flex justify-between gap-1", children: types_1.WEEKDAYS.map((day) => {
                                    const active = workDays.includes(day.id);
                                    return ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => toggleDay(day.id), className: (0, clsx_1.default)("flex h-11 w-11 flex-col items-center justify-center rounded-full text-[12px] font-semibold transition", active
                                            ? "bg-brand-ink text-white shadow-sm"
                                            : "bg-brand-bg text-brand-ink-secondary ring-1 ring-inset ring-black/[0.06] hover:bg-brand-bg-subtle"), children: day.short.charAt(0) }, day.id));
                                }) }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-8", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: "Overtime" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-brand-ink-tertiary", children: "Extra days they will work outside their regular schedule." })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => overtimeInputRef.current?.showPicker?.(), className: "inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-brand-bg px-3 text-[13px] font-semibold text-brand-blue ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CalendarPlus, { className: "h-3.5 w-3.5", strokeWidth: 2.5 }), "Add day"] })] }), (0, jsx_runtime_1.jsx)("input", { ref: overtimeInputRef, type: "date", value: overtimeDraft, onChange: (e) => {
                                            const value = e.target.value;
                                            setOvertimeDraft(value);
                                            if (value)
                                                addOvertimeDay(value);
                                        }, className: "pointer-events-none absolute h-0 w-0 opacity-0", tabIndex: -1, "aria-hidden": true }), overtimeDays.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "mt-4 text-center text-[13px] text-brand-ink-tertiary", children: "No overtime days added." })) : ((0, jsx_runtime_1.jsx)("ul", { className: "mt-4 flex flex-wrap gap-2", children: overtimeDays.map((iso) => ((0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1.5 rounded-full bg-brand-blue-soft py-1.5 pl-3 pr-1.5 text-[12px] font-semibold text-brand-blue-deep ring-1 ring-inset ring-brand-blue-muted", children: [formatOvertimeLabel(iso), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => removeOvertimeDay(iso), className: "rounded-full p-1 text-brand-blue-deep/70 transition hover:bg-brand-blue-muted hover:text-brand-blue-deep", "aria-label": `Remove ${iso}`, children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-3 w-3", strokeWidth: 2.5 }) })] }) }, iso))) }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-8", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: "Daily mix limit" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-brand-ink-tertiary", children: "How many mixes they can take on a scheduled day." }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-4 flex gap-1 rounded-full bg-brand-bg p-1 ring-1 ring-inset ring-black/[0.06]", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setHasMaxCapacity(false), className: (0, clsx_1.default)("flex-1 rounded-full py-2 text-[13px] font-semibold transition", !hasMaxCapacity
                                                    ? "bg-brand-ink text-white shadow-sm"
                                                    : "text-brand-ink-secondary hover:text-brand-ink"), children: "No limit" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setHasMaxCapacity(true), className: (0, clsx_1.default)("flex-1 rounded-full py-2 text-[13px] font-semibold transition", hasMaxCapacity
                                                    ? "bg-brand-ink text-white shadow-sm"
                                                    : "text-brand-ink-secondary hover:text-brand-ink"), children: "Set limit" })] }), hasMaxCapacity ? ((0, jsx_runtime_1.jsxs)("div", { className: "mt-4 flex items-center justify-between rounded-2xl bg-brand-bg px-4 py-3 ring-1 ring-inset ring-black/[0.06]", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[13px] font-medium text-brand-ink", children: "Max mixes per day" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setMaxMixesPerDay((value) => Math.max(1, value - 1)), disabled: maxMixesPerDay <= 1, className: "flex h-8 w-8 items-center justify-center rounded-full bg-brand-elevated text-brand-ink ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle disabled:opacity-40", "aria-label": "Decrease limit", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Minus, { className: "h-3.5 w-3.5", strokeWidth: 2.5 }) }), (0, jsx_runtime_1.jsx)("span", { className: "min-w-[2ch] text-center text-[18px] font-semibold tabular-nums text-brand-ink", children: maxMixesPerDay }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setMaxMixesPerDay((value) => Math.min(10, value + 1)), disabled: maxMixesPerDay >= 10, className: "flex h-8 w-8 items-center justify-center rounded-full bg-brand-elevated text-brand-ink ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle disabled:opacity-40", "aria-label": "Increase limit", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "h-3.5 w-3.5", strokeWidth: 2.5 }) })] })] })) : null] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-8 flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: "Time off" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-brand-ink-tertiary", children: "Holidays or personal days, and why." })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: addTimeOff, className: "inline-flex h-8 items-center gap-1 rounded-full bg-brand-bg px-3 text-[13px] font-semibold text-brand-blue ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "h-3.5 w-3.5", strokeWidth: 2.5 }), "Add"] })] }), timeOff.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "mt-4 text-center text-[13px] text-brand-ink-tertiary", children: "No time off added yet." })) : ((0, jsx_runtime_1.jsx)("ul", { className: "mt-4 space-y-3", children: timeOff.map((entry) => ((0, jsx_runtime_1.jsxs)("li", { className: "overflow-hidden rounded-2xl bg-brand-bg ring-1 ring-inset ring-black/[0.06]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between border-b border-black/[0.06] px-3.5 py-2.5", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex gap-1 rounded-full bg-brand-elevated p-0.5 ring-1 ring-inset ring-black/[0.06]", children: ["holiday", "personal"].map((type) => ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => {
                                                            const options = (0, producer_time_off_1.reasonsForTimeOffType)(type);
                                                            updateTimeOff(entry.key, {
                                                                type,
                                                                reason: options.includes(entry.reason)
                                                                    ? entry.reason
                                                                    : (0, producer_time_off_1.defaultReasonForTimeOffType)(type),
                                                            });
                                                        }, className: (0, clsx_1.default)("rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize transition", entry.type === type
                                                            ? "bg-brand-ink text-white"
                                                            : "text-brand-ink-secondary"), children: type }, type))) }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => removeTimeOff(entry.key), className: "rounded-full p-1.5 text-brand-ink-tertiary transition hover:bg-brand-elevated hover:text-brand-danger", "aria-label": "Remove", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { className: "h-3.5 w-3.5", strokeWidth: 1.75 }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 divide-x divide-black/[0.06] border-b border-black/[0.06]", children: [(0, jsx_runtime_1.jsxs)("label", { className: "px-3.5 py-2.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[10px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary", children: "From" }), (0, jsx_runtime_1.jsx)("input", { type: "date", required: true, value: entry.startDate, onChange: (e) => updateTimeOff(entry.key, {
                                                                startDate: e.target.value,
                                                                endDate: entry.endDate < e.target.value
                                                                    ? e.target.value
                                                                    : entry.endDate,
                                                            }), className: "mt-0.5 w-full bg-transparent text-[13px] text-brand-ink outline-none" })] }), (0, jsx_runtime_1.jsxs)("label", { className: "px-3.5 py-2.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[10px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary", children: "To" }), (0, jsx_runtime_1.jsx)("input", { type: "date", required: true, min: entry.startDate, value: entry.endDate, onChange: (e) => updateTimeOff(entry.key, {
                                                                endDate: e.target.value,
                                                            }), className: "mt-0.5 w-full bg-transparent text-[13px] text-brand-ink outline-none" })] })] }), (0, jsx_runtime_1.jsxs)("label", { className: "block px-3.5 py-2.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[10px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary", children: entry.type === "holiday" ? "Holiday" : "Why" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative mt-0.5", children: [(0, jsx_runtime_1.jsx)("select", { required: true, value: (0, producer_time_off_1.reasonsForTimeOffType)(entry.type).includes(entry.reason)
                                                                ? entry.reason
                                                                : (0, producer_time_off_1.defaultReasonForTimeOffType)(entry.type), onChange: (e) => updateTimeOff(entry.key, {
                                                                reason: e.target.value,
                                                            }), className: "w-full appearance-none bg-transparent pr-5 text-[14px] text-brand-ink outline-none", children: (0, producer_time_off_1.reasonsForTimeOffType)(entry.type).map((reason) => ((0, jsx_runtime_1.jsx)("option", { value: reason, children: reason }, reason))) }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { className: "pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-ink-tertiary", strokeWidth: 2 })] })] })] }, entry.key))) }))] })] })] }));
}
