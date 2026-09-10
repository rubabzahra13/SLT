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
const ProducerCategoryAddMenu_1 = require("@/components/producers/ProducerCategoryAddMenu");
const producer_time_off_1 = require("@/lib/producer-time-off");
const producer_category_groups_1 = require("@/lib/producer-category-groups");
const producers_1 = require("@/lib/producers");
const Tabs_1 = require("@/components/ui/Tabs");
const Avatar_1 = require("@/components/ui/Avatar");
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
function createEmptyTimeOffDraft() {
    const today = new Date().toISOString().slice(0, 10);
    return {
        key: "draft",
        startDate: today,
        endDate: today,
        type: "personal",
        reason: (0, producer_time_off_1.defaultReasonForTimeOffType)("personal"),
    };
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
function ProducerAvailabilityModal({ open, onClose, producer, onSave, readOnly = false, }) {
    const [workDays, setWorkDays] = (0, react_1.useState)([...types_1.DEFAULT_WORK_DAYS]);
    const [timeOff, setTimeOff] = (0, react_1.useState)([]);
    const [timeOffDraft, setTimeOffDraft] = (0, react_1.useState)(() => createEmptyTimeOffDraft());
    const [showTimeOffForm, setShowTimeOffForm] = (0, react_1.useState)(false);
    const [hasMaxCapacity, setHasMaxCapacity] = (0, react_1.useState)(false);
    const [maxMixesPerDay, setMaxMixesPerDay] = (0, react_1.useState)(6);
    const [maxProducerCostPerDay, setMaxProducerCostPerDay] = (0, react_1.useState)(2000);
    const [maxCostInput, setMaxCostInput] = (0, react_1.useState)("2000");
    const [overtimeDays, setOvertimeDays] = (0, react_1.useState)([]);
    const [overtimeDraft, setOvertimeDraft] = (0, react_1.useState)("");
    const [activeTab, setActiveTab] = (0, react_1.useState)("schedule");
    const [categories, setCategories] = (0, react_1.useState)([]);
    const [categoryRates, setCategoryRates] = (0, react_1.useState)({});
    const overtimeInputRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!open || !producer)
            return;
        setActiveTab("schedule");
        setWorkDays([...producer.workDays]);
        setTimeOff(producer.timeOff.map((entry) => ({
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
        setOvertimeDraft("");
        setTimeOffDraft(createEmptyTimeOffDraft());
        setShowTimeOffForm(false);
        const { categories: nextCategories, categoryRates: nextCategoryRates } = categoriesFromProducer(producer);
        setCategories(nextCategories);
        setCategoryRates(nextCategoryRates);
    }, [open, producer]);
    if (!open || !producer)
        return null;
    const usesPercentageCompensation = producer.compensationModel !== "not_paid_for_mixing" &&
        producer.compensationModel !== "hourly_manual";
    function toggleDay(day) {
        setWorkDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
    }
    function openTimeOffForm() {
        setTimeOffDraft(createEmptyTimeOffDraft());
        setShowTimeOffForm(true);
    }
    function closeTimeOffForm() {
        setTimeOffDraft(createEmptyTimeOffDraft());
        setShowTimeOffForm(false);
    }
    function updateTimeOffDraft(patch) {
        setTimeOffDraft((current) => ({ ...current, ...patch }));
    }
    function commitTimeOffDraft() {
        if (!timeOffDraft.startDate || !timeOffDraft.reason.trim())
            return;
        setTimeOff((prev) => [
            ...prev,
            {
                ...timeOffDraft,
                key: `to-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                endDate: timeOffDraft.endDate || timeOffDraft.startDate,
            },
        ]);
        closeTimeOffForm();
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
                .filter((entry) => entry.startDate && entry.reason.trim())
                .map((entry) => ({
                id: entry.key,
                startDate: entry.startDate,
                endDate: entry.endDate || entry.startDate,
                type: entry.type,
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
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-black/45 backdrop-blur-[2px]", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative flex max-h-[min(94dvh,820px)] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[28px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:rounded-[28px]", children: [(0, jsx_runtime_1.jsxs)("header", { className: "relative flex shrink-0 items-center justify-between border-b border-black/[0.08] px-4 py-3.5", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "min-w-[64px] text-left text-[15px] text-brand-ink-secondary transition hover:text-brand-ink", children: readOnly ? "Close" : "Cancel" }), (0, jsx_runtime_1.jsx)("h2", { className: "absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold tracking-[-0.01em] text-brand-ink", children: readOnly ? "Availability" : "Producer settings" }), !readOnly ? ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: handleDone, className: "min-w-[64px] text-right text-[15px] font-semibold text-brand-blue transition hover:text-brand-blue-hover", children: "Done" })) : ((0, jsx_runtime_1.jsx)("span", { className: "min-w-[64px]" }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-6 flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { producer: producer, size: "md" }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("p", { className: "truncate text-[15px] font-semibold text-brand-ink", children: producer.name }), (0, jsx_runtime_1.jsx)("p", { className: "text-[12px] text-brand-ink-tertiary", children: categories.length
                                                    ? categories.slice(0, 3).join(", ") +
                                                        (categories.length > 3 ? ` +${categories.length - 3}` : "")
                                                    : producer.specialty })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "mb-6 border-b border-black/[0.08]", children: (0, jsx_runtime_1.jsx)(Tabs_1.Tabs, { options: [
                                        { value: "schedule", label: "Schedule" },
                                        { value: "limit", label: "Limit" },
                                        {
                                            value: "category",
                                            label: "Category",
                                            count: categories.length || undefined,
                                        },
                                    ], value: activeTab, onChange: (value) => setActiveTab(value), accent: "blue" }) }), activeTab === "category" ? ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-2xl bg-brand-bg px-4 py-3 ring-1 ring-inset ring-black/[0.06]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: "Compensation rates" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-brand-ink-tertiary", children: "Payroll percentage by category." })] }), (0, jsx_runtime_1.jsx)(ProducerCategoryAddMenu_1.ProducerCategoryAddMenu, { assignedCategories: categories, onAdd: addCategory })] }), categories.length > 0 ? ((0, jsx_runtime_1.jsx)("ul", { className: "mt-3 divide-y divide-black/[0.06]", children: categories.map((category) => {
                                            const group = (0, producer_category_groups_1.findProducerCategoryGroup)(category);
                                            return ((0, jsx_runtime_1.jsxs)("li", { className: "flex items-center gap-2 py-2.5 text-[13px] first:pt-0 last:pb-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "truncate font-medium text-brand-ink-secondary", children: category }), group ? ((0, jsx_runtime_1.jsx)("p", { className: "truncate text-[11px] text-brand-ink-tertiary", children: group.label })) : null] }), usesPercentageCompensation ? ((0, jsx_runtime_1.jsxs)("div", { className: "inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-elevated px-2 py-1 ring-1 ring-inset ring-black/[0.06] focus-within:ring-brand-blue/30", children: [(0, jsx_runtime_1.jsx)("input", { type: "number", min: 0, max: 100, step: 1, value: categoryRates[category] ?? 50, onChange: (e) => {
                                                                    const value = parseFloat(e.target.value);
                                                                    updateCategoryRate(category, Number.isNaN(value) ? 0 : value);
                                                                }, className: "w-10 bg-transparent text-right text-[13px] font-semibold tabular-nums text-brand-ink outline-none", "aria-label": `Compensation percentage for ${category}` }), (0, jsx_runtime_1.jsx)("span", { className: "text-[12px] font-semibold text-brand-ink-tertiary", children: "%" })] })) : ((0, jsx_runtime_1.jsx)("span", { className: "shrink-0 font-semibold tabular-nums text-brand-blue", children: (0, producers_1.formatCategoryCompensationRate)(producer, category) })), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => removeCategory(category), className: "shrink-0 rounded-full p-1.5 text-brand-ink-tertiary transition hover:bg-brand-elevated hover:text-brand-danger", "aria-label": `Remove ${category}`, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { className: "h-3.5 w-3.5", strokeWidth: 1.75 }) })] }, category));
                                        }) })) : ((0, jsx_runtime_1.jsx)("p", { className: "mt-3 text-[12px] text-brand-ink-tertiary", children: "No categories assigned. Click Add to pick a category and subcategory." }))] })) : null, activeTab === "schedule" ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: "Days they work" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-brand-ink-tertiary", children: "Regular weekly schedule. Mon\u2013Fri by default." }), (0, jsx_runtime_1.jsx)("div", { className: "mt-4 flex justify-between gap-1", children: types_1.WEEKDAYS.map((day) => {
                                            const active = workDays.includes(day.id);
                                            return ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => toggleDay(day.id), className: (0, clsx_1.default)("flex h-11 w-11 flex-col items-center justify-center rounded-full text-[12px] font-semibold transition", active
                                                    ? "bg-brand-ink text-white shadow-sm"
                                                    : "bg-brand-bg text-brand-ink-secondary ring-1 ring-inset ring-black/[0.06] hover:bg-brand-bg-subtle"), children: day.short.charAt(0) }, day.id));
                                        }) }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-8", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: "Overtime" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-brand-ink-tertiary", children: "Extra days they will work outside their regular schedule." })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => overtimeInputRef.current?.showPicker?.(), className: "inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-brand-bg px-3 text-[13px] font-semibold text-brand-blue ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CalendarPlus, { className: "h-3.5 w-3.5", strokeWidth: 2.5 }), "Add day"] })] }), (0, jsx_runtime_1.jsx)("input", { ref: overtimeInputRef, type: "date", value: overtimeDraft, onChange: (e) => {
                                                    const value = e.target.value;
                                                    setOvertimeDraft(value);
                                                    if (value)
                                                        addOvertimeDay(value);
                                                }, className: "pointer-events-none absolute h-0 w-0 opacity-0", tabIndex: -1, "aria-hidden": true }), overtimeDays.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "mt-4 text-center text-[13px] text-brand-ink-tertiary", children: "No overtime days added." })) : ((0, jsx_runtime_1.jsx)("ul", { className: "mt-4 flex flex-wrap gap-2", children: overtimeDays.map((iso) => ((0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1.5 rounded-full bg-brand-blue-soft py-1.5 pl-3 pr-1.5 text-[12px] font-semibold text-brand-blue-deep ring-1 ring-inset ring-brand-blue-muted", children: [formatOvertimeLabel(iso), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => removeOvertimeDay(iso), className: "rounded-full p-1 text-brand-blue-deep/70 transition hover:bg-brand-blue-muted hover:text-brand-blue-deep", "aria-label": `Remove ${iso}`, children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-3 w-3", strokeWidth: 2.5 }) })] }) }, iso))) }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-8", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: "Time off" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-brand-ink-tertiary", children: "Block out days when this producer won't be available." })] }), !showTimeOffForm ? ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: openTimeOffForm, className: "inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-brand-bg px-3 text-[13px] font-semibold text-brand-blue ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "h-3.5 w-3.5", strokeWidth: 2.5 }), "Add"] })) : null] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-4", children: timeOff.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "text-center text-[13px] text-brand-ink-tertiary", children: "Nothing scheduled yet." })) : ((0, jsx_runtime_1.jsx)("ul", { className: "flex flex-wrap gap-2", children: timeOff.map((entry) => ((0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1.5 rounded-full bg-brand-blue-soft py-1.5 pl-3 pr-1.5 text-[12px] font-semibold text-brand-blue-deep ring-1 ring-inset ring-brand-blue-muted", title: `${entry.type} · ${entry.reason}`, children: [formatTimeOffDateLabel(entry), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => removeTimeOff(entry.key), className: "rounded-full p-1 text-brand-blue-deep/70 transition hover:bg-brand-blue-muted hover:text-brand-blue-deep", "aria-label": `Remove ${formatTimeOffDateLabel(entry)} (${entry.type}, ${entry.reason})`, children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-3 w-3", strokeWidth: 2.5 }) })] }) }, entry.key))) })) }), showTimeOffForm ? ((0, jsx_runtime_1.jsxs)("div", { className: "mt-3 overflow-hidden rounded-2xl border border-dashed border-brand-blue/35 bg-brand-blue-soft/20", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between px-3 py-2", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-bold uppercase tracking-[0.06em] text-brand-blue-deep", children: "Add new" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: closeTimeOffForm, className: "rounded-full p-1 text-brand-blue-deep/70 transition hover:bg-brand-blue-muted hover:text-brand-blue-deep", "aria-label": "Cancel add time off", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-3.5 w-3.5", strokeWidth: 2.5 }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-2 px-3 pb-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "overflow-hidden rounded-xl bg-brand-elevated ring-1 ring-inset ring-black/[0.06]", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex gap-1 border-b border-black/[0.06] p-1", children: ["holiday", "personal"].map((type) => ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => {
                                                                                const options = (0, producer_time_off_1.reasonsForTimeOffType)(type);
                                                                                updateTimeOffDraft({
                                                                                    type,
                                                                                    reason: options.includes(timeOffDraft.reason)
                                                                                        ? timeOffDraft.reason
                                                                                        : (0, producer_time_off_1.defaultReasonForTimeOffType)(type),
                                                                                });
                                                                            }, className: (0, clsx_1.default)("flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold capitalize transition", timeOffDraft.type === type
                                                                                ? "bg-brand-ink text-white"
                                                                                : "text-brand-ink-secondary hover:bg-brand-bg-subtle"), children: type }, type))) }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 divide-x divide-black/[0.06]", children: [(0, jsx_runtime_1.jsxs)("label", { className: "px-2.5 py-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[9px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary", children: "From" }), (0, jsx_runtime_1.jsx)("input", { type: "date", required: true, value: timeOffDraft.startDate, onChange: (e) => updateTimeOffDraft({
                                                                                            startDate: e.target.value,
                                                                                            endDate: timeOffDraft.endDate < e.target.value
                                                                                                ? e.target.value
                                                                                                : timeOffDraft.endDate,
                                                                                        }), className: "mt-0.5 w-full bg-transparent text-[12px] text-brand-ink outline-none" })] }), (0, jsx_runtime_1.jsxs)("label", { className: "px-2.5 py-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[9px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary", children: "To" }), (0, jsx_runtime_1.jsx)("input", { type: "date", required: true, min: timeOffDraft.startDate, value: timeOffDraft.endDate, onChange: (e) => updateTimeOffDraft({ endDate: e.target.value }), className: "mt-0.5 w-full bg-transparent text-[12px] text-brand-ink outline-none" })] })] }), (0, jsx_runtime_1.jsxs)("label", { className: "block border-t border-black/[0.06] px-2.5 py-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[9px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary", children: timeOffDraft.type === "holiday" ? "Holiday" : "Why" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative mt-0.5", children: [(0, jsx_runtime_1.jsx)("select", { required: true, value: (0, producer_time_off_1.reasonsForTimeOffType)(timeOffDraft.type).includes(timeOffDraft.reason)
                                                                                            ? timeOffDraft.reason
                                                                                            : (0, producer_time_off_1.defaultReasonForTimeOffType)(timeOffDraft.type), onChange: (e) => updateTimeOffDraft({ reason: e.target.value }), className: "w-full appearance-none bg-transparent pr-4 text-[13px] text-brand-ink outline-none", children: (0, producer_time_off_1.reasonsForTimeOffType)(timeOffDraft.type).map((reason) => ((0, jsx_runtime_1.jsx)("option", { value: reason, children: reason }, reason))) }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { className: "pointer-events-none absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 text-brand-ink-tertiary", strokeWidth: 2 })] })] })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: commitTimeOffDraft, className: "inline-flex w-full items-center justify-center gap-1 rounded-full bg-brand-blue px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-brand-blue-hover", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "h-3 w-3", strokeWidth: 2.5 }), "Add to schedule"] })] })] })) : null] })] })) : null, activeTab === "limit" ? ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: "Daily mix limit" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-brand-ink-tertiary", children: "How many mixes they can take on a scheduled day." }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-4 flex gap-1 rounded-full bg-brand-bg p-1 ring-1 ring-inset ring-black/[0.06]", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setHasMaxCapacity(false), className: (0, clsx_1.default)("flex-1 rounded-full py-2 text-[13px] font-semibold transition", !hasMaxCapacity
                                                        ? "bg-brand-ink text-white shadow-sm"
                                                        : "text-brand-ink-secondary hover:text-brand-ink"), children: "No limit" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setHasMaxCapacity(true), className: (0, clsx_1.default)("flex-1 rounded-full py-2 text-[13px] font-semibold transition", hasMaxCapacity
                                                        ? "bg-brand-ink text-white shadow-sm"
                                                        : "text-brand-ink-secondary hover:text-brand-ink"), children: "Set limit" })] }), hasMaxCapacity ? ((0, jsx_runtime_1.jsxs)("div", { className: "mt-4 space-y-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-[minmax(0,1fr)_9.5rem] items-center gap-x-3 rounded-2xl bg-brand-bg px-4 py-3 ring-1 ring-inset ring-black/[0.06]", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[13px] font-medium text-brand-ink", children: "Max mixes per day" }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-[2rem_1fr_2rem] items-center gap-2", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setMaxMixesPerDay((value) => Math.max(1, value - 1)), disabled: maxMixesPerDay <= 1, className: "flex h-8 w-8 items-center justify-center rounded-full bg-brand-elevated text-brand-ink ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle disabled:opacity-40", "aria-label": "Decrease limit", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Minus, { className: "h-3.5 w-3.5", strokeWidth: 2.5 }) }), (0, jsx_runtime_1.jsx)("span", { className: "w-full text-center text-[18px] font-semibold tabular-nums text-brand-ink", children: maxMixesPerDay }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setMaxMixesPerDay((value) => Math.min(10, value + 1)), disabled: maxMixesPerDay >= 10, className: "flex h-8 w-8 items-center justify-center rounded-full bg-brand-elevated text-brand-ink ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle disabled:opacity-40", "aria-label": "Increase limit", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "h-3.5 w-3.5", strokeWidth: 2.5 }) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-[minmax(0,1fr)_9.5rem] items-center gap-x-3 rounded-2xl bg-brand-bg px-4 py-3 ring-1 ring-inset ring-black/[0.06]", children: [(0, jsx_runtime_1.jsxs)("span", { className: "text-[13px] font-medium text-brand-ink", children: [(0, jsx_runtime_1.jsx)("span", { className: "mr-1 text-[15px] font-semibold text-brand-ink-secondary", children: "$" }), "Max cost per day"] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-[2rem_1fr_2rem] items-center gap-2", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => syncMaxCostInput(maxProducerCostPerDay - MAX_COST_STEP), disabled: maxProducerCostPerDay <= MIN_MAX_COST_PER_DAY, className: "flex h-8 w-8 items-center justify-center rounded-full bg-brand-elevated text-brand-ink ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle disabled:opacity-40", "aria-label": "Decrease max cost per day", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Minus, { className: "h-3.5 w-3.5", strokeWidth: 2.5 }) }), (0, jsx_runtime_1.jsx)("input", { type: "text", inputMode: "numeric", value: maxCostInput, onChange: (e) => setMaxCostInput(e.target.value.replace(/[^\d]/g, "")), onBlur: commitMaxCostInput, onKeyDown: (e) => {
                                                                        if (e.key === "Enter") {
                                                                            e.currentTarget.blur();
                                                                        }
                                                                    }, className: "w-full min-w-0 rounded-md bg-brand-elevated/50 px-1 text-center text-[18px] font-semibold tabular-nums text-brand-ink outline-none ring-1 ring-inset ring-black/[0.06] focus:bg-brand-elevated focus:ring-brand-blue/30", "aria-label": "Max cost per day amount" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => syncMaxCostInput(maxProducerCostPerDay + MAX_COST_STEP), disabled: maxProducerCostPerDay >= MAX_MAX_COST_PER_DAY, className: "flex h-8 w-8 items-center justify-center rounded-full bg-brand-elevated text-brand-ink ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle disabled:opacity-40", "aria-label": "Increase max cost per day", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "h-3.5 w-3.5", strokeWidth: 2.5 }) })] })] })] })) : null] }) })) : null] })] })] }));
}
