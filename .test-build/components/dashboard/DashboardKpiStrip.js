"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardKpiStrip = DashboardKpiStrip;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
const DashboardTip_1 = require("@/components/dashboard/DashboardTip");
const dashboard_tooltips_1 = require("@/lib/dashboard-tooltips");
function DashboardKpiStrip({ kpis, pulse }) {
    return ((0, jsx_runtime_1.jsx)("section", { className: "dashboard-kpi-strip shrink-0 w-full", children: (0, jsx_runtime_1.jsx)("div", { className: "flex w-full items-stretch gap-2 sm:gap-2.5", children: kpis.map((kpi) => {
                const insight = (0, dashboard_tooltips_1.kpiInsight)(kpi.label, pulse, kpi.detail);
                return ((0, jsx_runtime_1.jsx)("div", { className: "flex-1 min-w-0 flex flex-col", children: (0, jsx_runtime_1.jsx)(DashboardTip_1.DashboardTip, { title: insight.title, body: insight.body, className: "flex w-full h-full min-w-0 flex-col", placement: "bottom", children: (0, jsx_runtime_1.jsxs)(link_1.default, { href: kpi.href, className: "dashboard-surface-neutral group flex flex-col justify-between w-full h-full rounded-xl border border-brand-line/60 p-3 sm:p-3.5 shadow-sm transition-all hover:border-brand-line-strong hover:bg-brand-blue-soft/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30 cursor-pointer min-w-0", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[10px] font-bold uppercase tracking-[0.06em] text-brand-ink-tertiary group-hover:text-brand-ink-secondary transition-colors truncate", children: kpi.label }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1.5 text-[20px] sm:text-[22px] font-semibold leading-none tabular-nums tracking-[-0.03em] text-brand-ink", children: kpi.value })] }), kpi.detail ? ((0, jsx_runtime_1.jsx)("p", { className: "mt-1 truncate text-[11px] font-medium text-brand-ink-tertiary", children: kpi.detail })) : null] }) }) }, kpi.label));
            }) }) }));
}
