"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardTip = DashboardTip;
const jsx_runtime_1 = require("react/jsx-runtime");
const HoverTip_1 = require("@/components/ui/HoverTip");
function DashboardTip({ title, body, children, className, placement = "top", }) {
    return ((0, jsx_runtime_1.jsx)(HoverTip_1.HoverTip, { placement: placement, className: className, content: (0, jsx_runtime_1.jsxs)("div", { className: "min-w-[160px]", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary", children: title }), (0, jsx_runtime_1.jsx)("div", { className: "mt-1.5 text-[12px] leading-snug text-brand-ink-secondary", children: body })] }), children: children }));
}
