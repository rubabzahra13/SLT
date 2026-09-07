"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MixOpsChart = MixOpsChart;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
const clsx_1 = __importDefault(require("clsx"));
const dashboard_tooltips_1 = require("@/lib/dashboard-tooltips");
const DashboardTip_1 = require("@/components/dashboard/DashboardTip");
function isOverdue(label) {
    return label === "Overdue";
}
function MixOpsChart({ slices, compact = false, summary, }) {
    const total = slices.reduce((sum, slice) => sum + slice.count, 0);
    const urgent = slices.find((slice) => isOverdue(slice.label))?.count ?? 0;
    if (slices.length === 0) {
        return ((0, jsx_runtime_1.jsx)("p", { className: "flex h-full items-center justify-center px-4 text-[11px] text-brand-ink-tertiary", children: "No timeline data" }));
    }
    const summaryBody = summary
        ? `${summary.dueThisWeek} due this week · ${summary.overdue} overdue · ${summary.startingToday} starting today.`
        : "Active mixes grouped by schedule milestone.";
    return ((0, jsx_runtime_1.jsxs)("div", { className: compact
            ? "flex h-full min-h-0 flex-col justify-center px-3 py-2"
            : "flex flex-col px-5 py-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("flex shrink-0 items-baseline justify-between gap-3", compact ? "mb-1.5" : "mb-4"), children: [(0, jsx_runtime_1.jsx)(DashboardTip_1.DashboardTip, { title: "On timeline", body: summaryBody, placement: "top", children: (0, jsx_runtime_1.jsxs)("div", { className: "cursor-default", children: [(0, jsx_runtime_1.jsx)("p", { className: compact
                                        ? "text-[18px] font-bold leading-none tabular-nums tracking-[-0.04em] text-brand-ink"
                                        : "text-[22px] font-bold leading-none tabular-nums tracking-[-0.04em] text-brand-ink", children: total }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary", children: "on timeline" })] }) }), urgent > 0 ? ((0, jsx_runtime_1.jsx)(DashboardTip_1.DashboardTip, { title: "Overdue", body: `${urgent} mix${urgent === 1 ? "" : "es"} past end date — review MTD priorities.`, placement: "left", children: (0, jsx_runtime_1.jsxs)("p", { className: "cursor-default text-right text-[9px] font-semibold uppercase tracking-[0.05em] text-brand-orange", children: [urgent, " overdue"] }) })) : null] }), (0, jsx_runtime_1.jsx)("ol", { className: (0, clsx_1.default)(compact ? "shrink-0" : "min-h-0 flex-1", compact
                    ? "grid grid-cols-2 content-start gap-x-2 gap-y-1"
                    : "relative space-y-1"), children: slices.map((slice, index) => {
                    const overdue = isOverdue(slice.label);
                    const isLast = index === slices.length - 1;
                    const insight = (0, dashboard_tooltips_1.mixOpsInsight)(slice);
                    return ((0, jsx_runtime_1.jsxs)("li", { className: compact ? "" : "relative", children: [!compact && !isLast ? ((0, jsx_runtime_1.jsx)("span", { className: "absolute left-[6px] top-[26px] bottom-0 w-px bg-brand-line/35", "aria-hidden": true })) : null, (0, jsx_runtime_1.jsx)(DashboardTip_1.DashboardTip, { title: insight.title, body: insight.body, className: "block w-full", placement: "left", children: (0, jsx_runtime_1.jsxs)(link_1.default, { href: slice.href, className: (0, clsx_1.default)("group relative flex items-center gap-2 rounded-lg py-1 pl-0 pr-1 transition-colors hover:bg-[#f6f8fa]", !compact && "gap-3 py-2.5"), children: [(0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("relative z-[1] h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white", !compact && "h-3 w-3", overdue ? "bg-brand-orange" : "bg-brand-line-strong/55"), "aria-hidden": true }), (0, jsx_runtime_1.jsx)("span", { className: "min-w-0 flex-1 truncate text-[10px] font-semibold text-brand-ink-secondary group-hover:text-brand-ink", children: slice.label }), (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("shrink-0 text-[12px] font-bold tabular-nums tracking-[-0.03em]", !compact && "text-[14px]", overdue
                                                ? "text-brand-orange"
                                                : "text-brand-ink group-hover:text-brand-ink"), children: slice.count })] }) })] }, slice.label));
                }) })] }));
}
