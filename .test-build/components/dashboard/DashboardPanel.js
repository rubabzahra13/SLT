"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardPanel = DashboardPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
const clsx_1 = __importDefault(require("clsx"));
const lucide_react_1 = require("lucide-react");
const DashboardTip_1 = require("@/components/dashboard/DashboardTip");
function DashboardPanel({ title, subtitle, count, href, linkLabel, tip, children, className, fill = false, }) {
    const showCount = count != null && (typeof count === "string" || count !== 0);
    const titleBlock = ((0, jsx_runtime_1.jsxs)("div", { className: "flex min-w-0 items-center gap-2.5", children: [(0, jsx_runtime_1.jsx)("h2", { className: "dashboard-panel-title truncate", children: title }), showCount ? ((0, jsx_runtime_1.jsx)("span", { className: "dashboard-panel-count shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold tabular-nums", children: count })) : null, subtitle ? ((0, jsx_runtime_1.jsx)("span", { className: "dashboard-panel-subtitle hidden truncate lg:inline", children: subtitle })) : null] }));
    return ((0, jsx_runtime_1.jsxs)("section", { className: (0, clsx_1.default)("dashboard-panel flex min-h-0 flex-col", fill && "h-full min-h-0", className), children: [(0, jsx_runtime_1.jsxs)("div", { className: "dashboard-panel-head flex shrink-0 items-center justify-between gap-3 px-4 py-3", children: [tip ? ((0, jsx_runtime_1.jsx)(DashboardTip_1.DashboardTip, { title: tip.title, body: tip.body, className: "min-w-0 flex-1", children: titleBlock })) : (titleBlock), href && linkLabel ? ((0, jsx_runtime_1.jsxs)(link_1.default, { href: href, className: "dashboard-panel-link inline-flex shrink-0 items-center gap-0.5", children: [linkLabel, (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowUpRight, { className: "h-3 w-3", strokeWidth: 2.5 })] })) : null] }), (0, jsx_runtime_1.jsx)("div", { className: "dashboard-panel-body flex min-h-0 flex-1 flex-col", children: children })] }));
}
