"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleWeekChart = ScheduleWeekChart;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
const dashboard_tooltips_1 = require("@/lib/dashboard-tooltips");
const DashboardTip_1 = require("@/components/dashboard/DashboardTip");
const BOOKED_BAR_CLASS = "bg-brand-signature";
const AVAILABLE_BAR_CLASS = "bg-brand-orange";
const BOOKED_LEGEND_CLASS = "bg-brand-signature";
const AVAILABLE_LEGEND_CLASS = "bg-brand-orange";
function ScheduleWeekChart({ days, href = "/schedule", compact = false, }) {
    if (days.length === 0) {
        return ((0, jsx_runtime_1.jsx)("p", { className: "px-4 py-5 text-center text-[11px] text-brand-ink-tertiary", children: "No schedule data" }));
    }
    const maxTotal = Math.max(...days.map((d) => d.total), 1);
    const dayBar = (day) => {
        const bookedPct = (day.booked / maxTotal) * 100;
        const availablePct = (day.available / maxTotal) * 100;
        const insight = (0, dashboard_tooltips_1.weekDayInsight)(day);
        return ((0, jsx_runtime_1.jsx)(DashboardTip_1.DashboardTip, { title: insight.title, body: insight.body, className: "group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2", placement: "top", children: (0, jsx_runtime_1.jsxs)(link_1.default, { href: href, className: "flex h-full min-w-0 w-full flex-col items-center justify-end gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex w-full max-w-[34px] flex-1 flex-col justify-end gap-1 overflow-hidden rounded-lg border border-brand-line/15 bg-brand-line/8 p-1", children: [day.available > 0 ? ((0, jsx_runtime_1.jsx)("div", { className: `w-full rounded-sm ${AVAILABLE_BAR_CLASS}`, style: { height: `${availablePct}%`, minHeight: 3 } })) : null, day.booked > 0 ? ((0, jsx_runtime_1.jsx)("div", { className: `w-full rounded-sm ${BOOKED_BAR_CLASS}`, style: { height: `${bookedPct}%`, minHeight: 3 } })) : null] }), (0, jsx_runtime_1.jsx)("span", { className: day.isToday
                            ? "text-[10px] font-bold text-brand-ink"
                            : "text-[10px] font-semibold text-brand-ink-tertiary", children: day.dayLabel })] }) }, `${day.dayLabel}-${day.label}`));
    };
    if (compact) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full min-h-0 flex-col px-3 py-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex min-h-0 flex-1 items-end justify-between gap-2.5", children: days.map(dayBar) }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-2.5 flex shrink-0 items-center justify-center gap-4 text-[9px] font-semibold uppercase tracking-wide text-brand-ink-tertiary", children: [(0, jsx_runtime_1.jsx)(DashboardTip_1.DashboardTip, { title: "Booked", body: "Producers marked unavailable \u2014 mixes or time off scheduled.", placement: "top", children: (0, jsx_runtime_1.jsxs)("span", { className: "flex cursor-default items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: `h-2 w-2 rounded-sm ${BOOKED_LEGEND_CLASS}` }), "Booked"] }) }), (0, jsx_runtime_1.jsx)(DashboardTip_1.DashboardTip, { title: "Available", body: "Producers still open for new assignments that day.", placement: "top", children: (0, jsx_runtime_1.jsxs)("span", { className: "flex cursor-default items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: `h-2 w-2 rounded-sm ${AVAILABLE_LEGEND_CLASS}` }), "Available"] }) })] })] }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "px-5 py-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex items-end justify-between gap-1.5", children: days.map(dayBar) }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-3 flex items-center justify-center gap-4 text-[10px] text-brand-ink-tertiary", children: [(0, jsx_runtime_1.jsx)(DashboardTip_1.DashboardTip, { title: "Booked", body: "Producers marked unavailable that day.", placement: "top", children: (0, jsx_runtime_1.jsxs)("span", { className: "flex cursor-default items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: `h-2 w-2 rounded-sm ${BOOKED_LEGEND_CLASS}` }), "Booked"] }) }), (0, jsx_runtime_1.jsx)(DashboardTip_1.DashboardTip, { title: "Available", body: "Open producer capacity that day.", placement: "top", children: (0, jsx_runtime_1.jsxs)("span", { className: "flex cursor-default items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: `h-2 w-2 rounded-sm ${AVAILABLE_LEGEND_CLASS}` }), "Available"] }) })] })] }));
}
