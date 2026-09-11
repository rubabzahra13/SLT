"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateFilter = DateFilter;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const date_filters_1 = require("@/lib/date-filters");
const date_filters_2 = require("@/lib/date-filters");
const VIEW_MAIN = "main";
const VIEW_MONTH = "month";
const VIEW_YEAR = "year";
const VIEW_CUSTOM = "custom";
function DateFilter({ value, onChange, className }) {
    const [open, setOpen] = (0, react_1.useState)(false);
    const [view, setView] = (0, react_1.useState)(VIEW_MAIN);
    const [navDate, setNavDate] = (0, react_1.useState)(() => new Date());
    const [customStart, setCustomStart] = (0, react_1.useState)("");
    const [customEnd, setCustomEnd] = (0, react_1.useState)("");
    const rootRef = (0, react_1.useRef)(null);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        const onClickOutside = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
                setView(VIEW_MAIN);
            }
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, [open]);
    const currentLabel = (0, react_1.useMemo)(() => (0, date_filters_2.getDateFilterLabel)(value), [value]);
    const hasFilter = value.type !== "all";
    function handleSelectType(type, val = null) {
        setOpen(false);
        setView(VIEW_MAIN);
        onChange({ type, value: val });
    }
    function renderMainMenu() {
        const presets = [
            { label: "All time", type: "all" },
            { label: "Last 2 weeks", type: "last2Weeks" },
            { label: "Last 1 month", type: "last1Month" },
            { label: "Last 6 months", type: "last6Months" },
            { label: "Last 1 year", type: "last1Year" },
            { label: "This week", type: "thisWeek" },
            { label: "Last 30 days", type: "last30Days" },
            { label: "This month", type: "thisMonth" },
        ];
        return ((0, jsx_runtime_1.jsxs)("div", { className: "min-w-[200px] py-1", children: [presets.map((opt) => ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => handleSelectType(opt.type), className: (0, clsx_1.default)("block w-full px-4 py-2 text-left text-[13px] font-medium transition hover:bg-brand-bg", value.type === opt.type
                        ? "bg-brand-accent-soft text-brand-ink"
                        : "text-brand-ink-secondary"), children: opt.label }, opt.type))), (0, jsx_runtime_1.jsx)("div", { className: "my-1 border-t border-brand-line/70" }), [
                    { label: "Month", nextView: VIEW_MONTH },
                    { label: "Year", nextView: VIEW_YEAR },
                    { label: "Custom date range", nextView: VIEW_CUSTOM },
                ].map((opt) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setView(opt.nextView), className: "flex w-full items-center justify-between px-4 py-2 text-left text-[13px] font-medium text-brand-ink-secondary transition hover:bg-brand-bg", children: [(0, jsx_runtime_1.jsx)("span", { children: opt.label }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { className: "h-4 w-4 text-brand-ink-tertiary" })] }, opt.nextView)))] }));
    }
    function renderMonthMenu() {
        const navYear = navDate.getFullYear();
        return ((0, jsx_runtime_1.jsxs)("div", { className: "min-w-[240px] p-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-2 flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setView(VIEW_MAIN), className: "rounded p-1 text-brand-ink-tertiary hover:bg-brand-bg hover:text-brand-ink", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronLeft, { className: "h-4 w-4" }) }), (0, jsx_runtime_1.jsx)("span", { className: "text-[13px] font-semibold", children: navYear }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setNavDate(new Date(navYear - 1, navDate.getMonth(), 1)), className: "rounded p-1 text-brand-ink-tertiary hover:bg-brand-bg", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronLeft, { className: "h-4 w-4" }) }), (0, jsx_runtime_1.jsx)("button", { type: "button", disabled: navYear >= currentYear, onClick: () => setNavDate(new Date(navYear + 1, navDate.getMonth(), 1)), className: "rounded p-1 text-brand-ink-tertiary hover:bg-brand-bg disabled:opacity-30", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { className: "h-4 w-4" }) })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-3 gap-1", children: date_filters_1.MONTHS.map((label, i) => {
                        const key = `${navYear}-${String(i + 1).padStart(2, "0")}`;
                        const disabled = navYear === currentYear && i > currentMonth;
                        return ((0, jsx_runtime_1.jsx)("button", { type: "button", disabled: disabled, onClick: () => handleSelectType("month", key), className: (0, clsx_1.default)("rounded-md px-2 py-1.5 text-[12px] font-medium transition", disabled && "cursor-not-allowed text-brand-ink-tertiary/40", !disabled &&
                                value.type === "month" &&
                                value.value === key &&
                                "bg-brand-accent text-white", !disabled &&
                                !(value.type === "month" && value.value === key) &&
                                "text-brand-ink-secondary hover:bg-brand-bg"), children: label.slice(0, 3) }, key));
                    }) })] }));
    }
    function renderYearMenu() {
        const startDecade = Math.floor(navDate.getFullYear() / 10) * 10;
        const years = Array.from({ length: 12 }, (_, i) => startDecade - 1 + i);
        return ((0, jsx_runtime_1.jsxs)("div", { className: "min-w-[240px] p-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-2 flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setView(VIEW_MAIN), className: "rounded p-1 text-brand-ink-tertiary hover:bg-brand-bg", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronLeft, { className: "h-4 w-4" }) }), (0, jsx_runtime_1.jsxs)("span", { className: "text-[13px] font-semibold", children: [years[1], " - ", years[10]] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setNavDate(new Date(startDecade - 10, 0, 1)), className: "rounded p-1 text-brand-ink-tertiary hover:bg-brand-bg", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronLeft, { className: "h-4 w-4" }) }), (0, jsx_runtime_1.jsx)("button", { type: "button", disabled: startDecade + 10 > currentYear, onClick: () => setNavDate(new Date(startDecade + 10, 0, 1)), className: "rounded p-1 text-brand-ink-tertiary hover:bg-brand-bg disabled:opacity-30", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { className: "h-4 w-4" }) })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-3 gap-1", children: years.map((y) => ((0, jsx_runtime_1.jsx)("button", { type: "button", disabled: y > currentYear, onClick: () => handleSelectType("year", String(y)), className: (0, clsx_1.default)("rounded-md px-2 py-1.5 text-[12px] font-medium transition", y > currentYear && "cursor-not-allowed text-brand-ink-tertiary/40", y <= currentYear &&
                            value.type === "year" &&
                            value.value === String(y) &&
                            "bg-brand-accent text-white", y <= currentYear &&
                            !(value.type === "year" && value.value === String(y)) &&
                            "text-brand-ink-secondary hover:bg-brand-bg"), children: y }, y))) })] }));
    }
    function renderCustomMenu() {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "min-w-[260px] p-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-4 flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setView(VIEW_MAIN), className: "-ml-1 rounded p-1 text-brand-ink-tertiary hover:bg-brand-bg", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronLeft, { className: "h-4 w-4" }) }), (0, jsx_runtime_1.jsx)("span", { className: "text-[13px] font-semibold", children: "Custom range" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mb-4 space-y-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-brand-ink-tertiary", children: "Start date" }), (0, jsx_runtime_1.jsx)("input", { type: "date", max: (0, date_filters_1.todayIso)(), value: customStart, onChange: (e) => setCustomStart(e.target.value), className: "w-full rounded-lg border border-brand-line/80 bg-brand-surface px-3 py-2 text-[13px] outline-none focus:border-brand-info/60 focus:ring-2 focus:ring-brand-info/15" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-brand-ink-tertiary", children: "End date" }), (0, jsx_runtime_1.jsx)("input", { type: "date", max: (0, date_filters_1.todayIso)(), min: customStart, value: customEnd, onChange: (e) => setCustomEnd(e.target.value), className: "w-full rounded-lg border border-brand-line/80 bg-brand-surface px-3 py-2 text-[13px] outline-none focus:border-brand-info/60 focus:ring-2 focus:ring-brand-info/15" })] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", disabled: !customStart || !customEnd || customStart > customEnd, onClick: () => handleSelectType("custom", { start: customStart, end: customEnd }), className: "w-full rounded-lg bg-brand-cta py-2 text-[13px] font-semibold text-brand-cta-text transition hover:bg-brand-cta-hover disabled:cursor-not-allowed disabled:opacity-45", children: "Apply range" })] }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { ref: rootRef, className: (0, clsx_1.default)("relative", className), children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setOpen((prev) => !prev), className: (0, clsx_1.default)("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium shadow-sm transition", hasFilter
                    ? "border-brand-blue/35 bg-brand-blue-soft/45 text-brand-signature"
                    : "border-brand-line/55 bg-brand-elevated/90 text-brand-ink-secondary hover:border-brand-line-strong hover:bg-brand-elevated", open && "ring-2 ring-brand-blue/15"), children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Calendar, { className: (0, clsx_1.default)("h-3.5 w-3.5 shrink-0", hasFilter ? "text-brand-info" : "text-brand-ink-tertiary") }), (0, jsx_runtime_1.jsx)("span", { className: "max-w-[180px] truncate", children: currentLabel }), hasFilter ? ((0, jsx_runtime_1.jsx)("span", { role: "button", tabIndex: 0, onClick: (e) => {
                            e.stopPropagation();
                            handleSelectType("all");
                        }, onKeyDown: (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.stopPropagation();
                                handleSelectType("all");
                            }
                        }, className: "rounded p-0.5 text-brand-ink-tertiary hover:text-brand-warning", "aria-label": "Clear date filter", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-3.5 w-3.5" }) })) : null, (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { className: (0, clsx_1.default)("h-3.5 w-3.5 shrink-0 text-brand-ink-tertiary transition", open && "rotate-180") })] }), open ? ((0, jsx_runtime_1.jsxs)("div", { className: "absolute left-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-brand-line bg-brand-surface shadow-[var(--shadow-premium)]", children: [view === VIEW_MAIN && renderMainMenu(), view === VIEW_MONTH && renderMonthMenu(), view === VIEW_YEAR && renderYearMenu(), view === VIEW_CUSTOM && renderCustomMenu()] })) : null] }));
}
