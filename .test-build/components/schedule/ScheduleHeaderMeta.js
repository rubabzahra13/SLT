"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleHeaderMeta = ScheduleHeaderMeta;
const jsx_runtime_1 = require("react/jsx-runtime");
const schedule_legend_1 = require("@/components/schedule/schedule-legend");
function MetaStat({ label, children, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex min-w-0 items-baseline gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: label }), (0, jsx_runtime_1.jsx)("div", { className: "flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0 text-[13px] font-semibold leading-none text-brand-ink", children: children })] }));
}
function ScheduleHeaderMeta({ columns, availableToday, offToday, totalProducers, isToday = false, }) {
    const busiest = columns.reduce((best, col) => {
        if (!best || col.unavailableCount > best.unavailableCount)
            return col;
        return best;
    }, null);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2", children: [(0, jsx_runtime_1.jsxs)(MetaStat, { label: "Available today", children: [(0, jsx_runtime_1.jsx)("span", { className: "tabular-nums text-brand-signature", children: availableToday }), (0, jsx_runtime_1.jsxs)("span", { className: "text-[12px] font-medium text-brand-ink-tertiary", children: ["/ ", totalProducers] })] }), isToday ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: "hidden h-3.5 w-px shrink-0 bg-brand-line/45 sm:block", "aria-hidden": true }), (0, jsx_runtime_1.jsxs)(MetaStat, { label: "Off today", children: [(0, jsx_runtime_1.jsx)("span", { className: "tabular-nums text-brand-orange-deep", children: offToday }), (0, jsx_runtime_1.jsxs)("span", { className: "text-[12px] font-medium text-brand-ink-tertiary", children: ["/ ", totalProducers] })] })] })) : null, !isToday && busiest ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: "hidden h-3.5 w-px shrink-0 bg-brand-line/45 sm:block", "aria-hidden": true }), (0, jsx_runtime_1.jsxs)(MetaStat, { label: "Busiest", children: [(0, jsx_runtime_1.jsxs)("span", { className: "truncate", children: [busiest.dayLabel, " ", busiest.label] }), (0, jsx_runtime_1.jsxs)("span", { className: "text-[12px] font-medium tabular-nums text-brand-orange", children: [busiest.unavailableCount, "/", busiest.total, " booked"] })] })] })) : null] }), (0, jsx_runtime_1.jsx)(schedule_legend_1.ScheduleLegend, {})] }));
}
