"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulePageToolbar = SchedulePageToolbar;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const FilterPill_1 = require("@/components/ui/FilterPill");
const ScheduleHeaderMeta_1 = require("@/components/schedule/ScheduleHeaderMeta");
const specialtyFilters = ["All", "Cheer", "Dance", "Marching Band"];
const presentationFilters = ["Matrix", "Calendar"];
function FilterGroup({ label, children, className, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("flex min-w-0 flex-col gap-1.5", className), children: [(0, jsx_runtime_1.jsx)("p", { className: "px-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: label }), (0, jsx_runtime_1.jsx)("div", { className: "inline-flex flex-wrap items-center gap-0.5 rounded-xl bg-white p-1 shadow-sm ring-1 ring-inset ring-brand-line/45", role: "group", "aria-label": label, children: children })] }));
}
function SchedulePageToolbar({ specialty, presentation, view, columns, availableToday, totalProducers, onSpecialtyChange, onPresentationChange, onViewChange, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-3.5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_auto_minmax(0,1fr)] xl:items-end", role: "toolbar", "aria-label": "Schedule filters", children: [(0, jsx_runtime_1.jsx)(FilterGroup, { label: "Team", children: specialtyFilters.map((filter) => ((0, jsx_runtime_1.jsx)(FilterPill_1.FilterPill, { label: filter, active: specialty === filter, variant: "grouped", onClick: () => onSpecialtyChange(filter) }, filter))) }), (0, jsx_runtime_1.jsx)(FilterGroup, { label: "View", className: "sm:justify-self-start xl:justify-self-center", children: presentationFilters.map((label) => {
                            const next = label.toLowerCase();
                            return ((0, jsx_runtime_1.jsx)(FilterPill_1.FilterPill, { label: label, active: presentation === next, accent: "orange", variant: "grouped", onClick: () => onPresentationChange(next) }, label));
                        }) }), (0, jsx_runtime_1.jsxs)(FilterGroup, { label: "Range", className: "sm:col-span-2 xl:col-span-1 xl:justify-self-end", children: [(0, jsx_runtime_1.jsx)(FilterPill_1.FilterPill, { label: "This week", active: view === "week", variant: "grouped", onClick: () => onViewChange("week") }), (0, jsx_runtime_1.jsx)(FilterPill_1.FilterPill, { label: "This month", active: view === "month", variant: "grouped", onClick: () => onViewChange("month") }), presentation === "matrix" ? ((0, jsx_runtime_1.jsx)(FilterPill_1.FilterPill, { label: "90 days", active: view === "90days", variant: "grouped", onClick: () => onViewChange("90days") })) : null] })] }), (0, jsx_runtime_1.jsx)("div", { className: "border-t border-brand-line/30 px-1 pt-3.5", children: (0, jsx_runtime_1.jsx)(ScheduleHeaderMeta_1.ScheduleHeaderMeta, { columns: columns, availableToday: availableToday, totalProducers: totalProducers }) })] }));
}
