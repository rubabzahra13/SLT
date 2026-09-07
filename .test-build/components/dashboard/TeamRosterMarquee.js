"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamRosterMarquee = TeamRosterMarquee;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
const Avatar_1 = require("@/components/ui/Avatar");
const DashboardTip_1 = require("@/components/dashboard/DashboardTip");
const dashboard_tooltips_1 = require("@/lib/dashboard-tooltips");
const statusLabel = {
    available: "Available",
    limited: "Limited",
    unavailable: "Booked",
};
function TeamRosterMarquee({ team }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: "dashboard-team-track relative flex min-h-[180px] flex-1 overflow-x-auto", children: (0, jsx_runtime_1.jsx)("div", { className: "flex min-h-[180px] flex-1 items-center gap-4 px-2 py-2", children: team.map((producer) => {
                const insight = (0, dashboard_tooltips_1.producerInsight)(producer);
                return ((0, jsx_runtime_1.jsx)(DashboardTip_1.DashboardTip, { title: insight.title, body: insight.body, className: "shrink-0", placement: "top", children: (0, jsx_runtime_1.jsxs)(link_1.default, { href: `/schedule?producer=${producer.initials}`, className: "dashboard-team-card group flex w-[140px] shrink-0 flex-col items-center gap-2.5 rounded-xl px-3 py-4 text-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "rounded-full ring-2 ring-brand-line/35 ring-offset-2 ring-offset-white", children: (0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { src: producer.avatar, alt: producer.name, size: "xl" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0 w-full", children: [(0, jsx_runtime_1.jsx)("p", { className: "truncate text-[15px] font-bold tracking-[-0.03em] text-brand-ink", children: producer.initials }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 truncate text-[11px] font-medium text-brand-ink-secondary", children: producer.name }), (0, jsx_runtime_1.jsx)("span", { className: "mt-2.5 inline-flex rounded-full border border-brand-line/45 bg-white px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.06em] text-brand-ink-secondary", children: statusLabel[producer.status] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2 truncate text-[10px] font-semibold text-brand-ink-tertiary", children: producer.nextAvailable })] })] }) }, producer.id));
            }) }) }));
}
