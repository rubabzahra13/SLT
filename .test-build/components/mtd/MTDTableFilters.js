"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MTD_TABLE_FILTERS = void 0;
exports.hasActiveMTDFilters = hasActiveMTDFilters;
exports.MTDTableFilterPanel = MTDTableFilterPanel;
exports.MTDActiveFilterChips = MTDActiveFilterChips;
exports.MTDFilterChipsRow = MTDFilterChipsRow;
exports.useMTDFilterChips = useMTDFilterChips;
exports.MTDTableFilters = MTDTableFilters;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const FilterMenu_1 = require("@/components/ui/FilterMenu");
const DateFilter_1 = require("@/components/ui/DateFilter");
const date_filters_1 = require("@/lib/date-filters");
const mtd_filters_1 = require("@/lib/mtd-filters");
const types_1 = require("@/types");
function hasActiveMTDFilters(filters, form) {
    const isDance = form === "school-all-star-dance";
    return (filters.packageTier !== "All" ||
        (!isDance && filters.timeLimit !== "All") ||
        (!isDance && filters.split !== "all") ||
        filters.assignedProducer !== "All" ||
        filters.requestedProducer !== "All" ||
        filters.scheduleFilter !== "all" ||
        (filters.infoFilter ?? "all") !== "all" ||
        filters.dateFilter.type !== "all");
}
function countTableFilters(filters, form) {
    const isDance = form === "school-all-star-dance";
    let count = 0;
    if (filters.packageTier !== "All")
        count += 1;
    if (!isDance && filters.timeLimit !== "All")
        count += 1;
    if (!isDance && filters.split !== "all")
        count += 1;
    if (filters.assignedProducer !== "All")
        count += 1;
    if (filters.requestedProducer !== "All")
        count += 1;
    if (filters.scheduleFilter !== "all")
        count += 1;
    if ((filters.infoFilter ?? "all") !== "all")
        count += 1;
    if (filters.dateFilter.type !== "all")
        count += 1;
    return count;
}
function MTDTableFilterPanel({ records, producers, orderById, filters, onChange, onReset, form, grouped = false, }) {
    const [open, setOpen] = (0, react_1.useState)(false);
    const rootRef = (0, react_1.useRef)(null);
    const packageOptions = (0, react_1.useMemo)(() => (0, mtd_filters_1.buildPackageTierOptions)(records), [records]);
    const timeLimitOptions = (0, react_1.useMemo)(() => (0, mtd_filters_1.buildTimeLimitOptions)(records), [records]);
    const splitOptions = (0, react_1.useMemo)(() => (0, mtd_filters_1.buildSplitOptions)(records), [records]);
    const assignedOptions = (0, react_1.useMemo)(() => (0, mtd_filters_1.buildAssignedProducerOptions)(records, types_1.EDITOR_NAMES), [records]);
    const requestedOptions = (0, react_1.useMemo)(() => (0, mtd_filters_1.buildRequestedProducerOptions)(records, types_1.EDITOR_NAMES, producers, orderById), [records, producers, orderById]);
    const scheduleOptions = (0, react_1.useMemo)(() => {
        let scheduled = 0;
        let notScheduled = 0;
        for (const rec of records) {
            if ((0, mtd_filters_1.hasMixStartDate)(rec))
                scheduled += 1;
            else
                notScheduled += 1;
        }
        return [
            { value: "all", label: "All", count: records.length },
            { value: "scheduled", label: "Scheduled", count: scheduled },
            { value: "not_scheduled", label: "Not scheduled", count: notScheduled },
        ];
    }, [records]);
    const infoOptions = (0, react_1.useMemo)(() => (0, mtd_filters_1.buildInfoOptions)(records), [records]);
    const isDance = form === "school-all-star-dance";
    const activeCount = countTableFilters(filters, form);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        const onDown = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);
    return ((0, jsx_runtime_1.jsxs)("div", { ref: rootRef, className: "relative inline-block", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setOpen((v) => !v), className: (0, clsx_1.default)("inline-flex h-8 items-center gap-1.5 text-[12px] font-medium transition", grouped
                    ? (0, clsx_1.default)("rounded-lg px-2.5", open && "bg-brand-elevated shadow-sm ring-1 ring-brand-line/35", open || activeCount > 0
                        ? "bg-brand-blue-soft/70 font-semibold text-brand-ink"
                        : "text-brand-ink-secondary hover:bg-brand-elevated/90 hover:text-brand-ink", open && activeCount === 0 && "text-brand-ink")
                    : (0, clsx_1.default)("rounded-full border px-3 shadow-sm", open || activeCount > 0
                        ? "border-brand-blue/35 bg-brand-blue-soft/45 text-brand-ink"
                        : "border-brand-line/55 bg-brand-elevated/90 text-brand-ink-secondary hover:border-brand-line-strong hover:bg-brand-elevated", open && "ring-2 ring-brand-blue/15")), children: [(0, jsx_runtime_1.jsx)(lucide_react_1.SlidersHorizontal, { className: "h-3.5 w-3.5 shrink-0", strokeWidth: 2 }), "Filters", activeCount > 0 ? ((0, jsx_runtime_1.jsx)("span", { className: "flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-blue-deep px-1 text-[10px] font-bold tabular-nums text-white", children: activeCount })) : null] }), open ? ((0, jsx_runtime_1.jsxs)("div", { className: "absolute left-0 top-[calc(100%+8px)] z-40 w-[min(92vw,560px)] rounded-2xl border border-brand-line bg-brand-surface p-4 shadow-[var(--shadow-premium)]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-3 flex items-center justify-between gap-3", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: "Table filters" }), activeCount > 0 ? ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => {
                                    onReset();
                                    setOpen(false);
                                }, className: "text-[12px] font-medium text-brand-signature hover:underline", children: "Clear all" })) : null] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid gap-3 sm:grid-cols-2", children: [(0, jsx_runtime_1.jsx)(FilterMenu_1.FilterMenu, { label: "Package", value: filters.packageTier, options: packageOptions, onChange: (value) => onChange({ packageTier: value }), accent: "blue" }), !isDance ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(FilterMenu_1.FilterMenu, { label: "Time limit", value: filters.timeLimit, options: timeLimitOptions, onChange: (value) => onChange({ timeLimit: value }) }), (0, jsx_runtime_1.jsx)(FilterMenu_1.FilterMenu, { label: "Split", value: filters.split, options: splitOptions, onChange: (value) => onChange({ split: value }) })] })) : null, (0, jsx_runtime_1.jsx)(FilterMenu_1.FilterMenu, { label: "Assigned", value: filters.assignedProducer, options: assignedOptions, onChange: (value) => onChange({ assignedProducer: value }), accent: "orange" }), (0, jsx_runtime_1.jsx)(FilterMenu_1.FilterMenu, { label: "Requested", value: filters.requestedProducer, options: requestedOptions, onChange: (value) => onChange({ requestedProducer: value }), accent: "orange" }), (0, jsx_runtime_1.jsx)(FilterMenu_1.FilterMenu, { label: "Schedule", value: filters.scheduleFilter, options: scheduleOptions, onChange: (value) => onChange({ scheduleFilter: value }) }), (0, jsx_runtime_1.jsx)(FilterMenu_1.FilterMenu, { label: "Data", value: filters.infoFilter ?? "all", options: infoOptions, onChange: (value) => onChange({ infoFilter: value }), accent: "orange" }), (0, jsx_runtime_1.jsx)(DateFilter_1.DateFilter, { value: filters.dateFilter, onChange: (dateFilter) => onChange({ dateFilter }) })] })] })) : null] }));
}
function MTDActiveFilterChips({ chips, }) {
    if (chips.length === 0)
        return null;
    return ((0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap items-center gap-1.5", children: chips.map((chip) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: chip.onClear, className: "inline-flex max-w-full items-center gap-1 rounded-full bg-brand-blue-soft/50 py-1 pl-2.5 pr-1.5 text-[11px] font-medium text-brand-signature ring-1 ring-inset ring-brand-blue/20 transition hover:bg-brand-blue-soft", children: [(0, jsx_runtime_1.jsx)("span", { className: "truncate", children: chip.label }), (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-3 w-3 shrink-0 opacity-70", strokeWidth: 2.5 })] }, chip.key))) }));
}
function MTDFilterChipsRow(props) {
    const chips = useMTDFilterChips(props);
    return (0, jsx_runtime_1.jsx)(MTDActiveFilterChips, { chips: chips });
}
function useMTDFilterChips(props) {
    const { records, producers, orderById, filters, onChange, form } = props;
    const isDance = form === "school-all-star-dance";
    const packageOptions = (0, react_1.useMemo)(() => (0, mtd_filters_1.buildPackageTierOptions)(records), [records]);
    const timeLimitOptions = (0, react_1.useMemo)(() => (0, mtd_filters_1.buildTimeLimitOptions)(records), [records]);
    const splitOptions = (0, react_1.useMemo)(() => (0, mtd_filters_1.buildSplitOptions)(records), [records]);
    const assignedOptions = (0, react_1.useMemo)(() => (0, mtd_filters_1.buildAssignedProducerOptions)(records, types_1.EDITOR_NAMES), [records]);
    const requestedOptions = (0, react_1.useMemo)(() => (0, mtd_filters_1.buildRequestedProducerOptions)(records, types_1.EDITOR_NAMES, producers, orderById), [records, producers, orderById]);
    const scheduleOptions = (0, react_1.useMemo)(() => {
        let scheduled = 0;
        let notScheduled = 0;
        for (const rec of records) {
            if ((0, mtd_filters_1.hasMixStartDate)(rec))
                scheduled += 1;
            else
                notScheduled += 1;
        }
        return [
            { value: "all", label: "All", count: records.length },
            { value: "scheduled", label: "Scheduled", count: scheduled },
            { value: "not_scheduled", label: "Not scheduled", count: notScheduled },
        ];
    }, [records]);
    const infoOptions = (0, react_1.useMemo)(() => (0, mtd_filters_1.buildInfoOptions)(records), [records]);
    return (0, react_1.useMemo)(() => {
        const items = [];
        if (filters.packageTier !== "All") {
            const label = packageOptions.find((o) => o.value === filters.packageTier)?.label ??
                filters.packageTier;
            items.push({
                key: "packageTier",
                label: `Package · ${label}`,
                onClear: () => onChange({ packageTier: "All" }),
            });
        }
        if (!isDance && filters.timeLimit !== "All") {
            const label = timeLimitOptions.find((o) => o.value === filters.timeLimit)?.label ??
                filters.timeLimit;
            items.push({
                key: "timeLimit",
                label: `Limit · ${label}`,
                onClear: () => onChange({ timeLimit: "All" }),
            });
        }
        if (!isDance && filters.split !== "all") {
            const label = splitOptions.find((o) => o.value === filters.split)?.label ??
                filters.split;
            items.push({
                key: "split",
                label: `Split · ${label}`,
                onClear: () => onChange({ split: "all" }),
            });
        }
        if (filters.assignedProducer !== "All") {
            const label = assignedOptions.find((o) => o.value === filters.assignedProducer)
                ?.label ?? filters.assignedProducer;
            items.push({
                key: "assignedProducer",
                label: `Assigned · ${label}`,
                onClear: () => onChange({ assignedProducer: "All" }),
            });
        }
        if (filters.requestedProducer !== "All") {
            const label = requestedOptions.find((o) => o.value === filters.requestedProducer)
                ?.label ?? filters.requestedProducer;
            items.push({
                key: "requestedProducer",
                label: `Requested · ${label}`,
                onClear: () => onChange({ requestedProducer: "All" }),
            });
        }
        if (filters.scheduleFilter !== "all") {
            const label = scheduleOptions.find((o) => o.value === filters.scheduleFilter)
                ?.label ?? filters.scheduleFilter;
            items.push({
                key: "scheduleFilter",
                label: `Schedule · ${label}`,
                onClear: () => onChange({ scheduleFilter: "all" }),
            });
        }
        if ((filters.infoFilter ?? "all") !== "all") {
            const label = infoOptions.find((o) => o.value === filters.infoFilter)?.label ??
                filters.infoFilter;
            items.push({
                key: "infoFilter",
                label: `Data · ${label}`,
                onClear: () => onChange({ infoFilter: "all" }),
            });
        }
        if (filters.dateFilter.type !== "all") {
            items.push({
                key: "dateFilter",
                label: (0, date_filters_1.getDateFilterLabel)(filters.dateFilter),
                onClear: () => onChange({ dateFilter: { type: "all", value: null } }),
            });
        }
        return items;
    }, [
        filters,
        packageOptions,
        timeLimitOptions,
        splitOptions,
        assignedOptions,
        requestedOptions,
        scheduleOptions,
        infoOptions,
        onChange,
    ]);
}
exports.DEFAULT_MTD_TABLE_FILTERS = {
    packageTier: "All",
    timeLimit: "All",
    split: "all",
    assignedProducer: "All",
    requestedProducer: "All",
    scheduleFilter: "all",
    infoFilter: "all",
    dateFilter: { type: "all", value: null },
};
/** @deprecated Use MTDTableFilterPanel */
function MTDTableFilters(props) {
    return (0, jsx_runtime_1.jsx)(MTDTableFilterPanel, { ...props });
}
