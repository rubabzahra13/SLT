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
    return ((0, jsx_runtime_1.jsx)("section", { className: "dashboard-kpi-strip dashboard-surface-neutral shrink-0 overflow-hidden rounded-xl", children: (0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-2 divide-y divide-brand-line/30 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:grid-cols-5", children: kpis.map((kpi) => {
                const insight = (0, dashboard_tooltips_1.kpiInsight)(kpi.label, pulse, kpi.detail);
                return ((0, jsx_runtime_1.jsx)(DashboardTip_1.DashboardTip, { title: insight.title, body: insight.body, className: "block min-w-0", placement: "bottom", children: (0, jsx_runtime_1.jsxs)(link_1.default, { href: kpi.href, className: "dashboard-kpi-cell group block min-w-0 transition-colors hover:bg-brand-blue-soft/20", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[10px] font-bold uppercase tracking-[0.06em] text-brand-ink-tertiary", children: kpi.label }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1.5 text-[22px] font-semibold leading-none tabular-nums tracking-[-0.03em] text-brand-ink", children: kpi.value }), kpi.detail ? ((0, jsx_runtime_1.jsx)("p", { className: "mt-1 truncate text-[11px] font-medium text-brand-ink-tertiary", children: kpi.detail })) : null] }) }, kpi.label));
            }) }) }));
}
