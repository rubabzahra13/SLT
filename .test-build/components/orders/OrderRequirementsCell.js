"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderRequirementPill = OrderRequirementPill;
exports.OrderRequirementsCell = OrderRequirementsCell;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const order_requirements_1 = require("@/lib/order-requirements");
function OrderRequirementPill({ item }) {
    const isGreen = item.status === "green";
    return ((0, jsx_runtime_1.jsxs)("span", { className: (0, clsx_1.default)("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none transition shadow-2xs", isGreen
            ? "bg-emerald-50 text-emerald-800 border border-emerald-300/80"
            : "bg-rose-50 text-rose-800 border border-rose-300/80"), title: `${item.label}: ${isGreen ? item.value || "Provided" : "Required / Missing"}`, children: [(0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("h-1.5 w-1.5 rounded-full shrink-0", isGreen ? "bg-emerald-500" : "bg-rose-500"), "aria-hidden": true }), (0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-[11px]", children: item.label }), isGreen && item.value ? ((0, jsx_runtime_1.jsx)("span", { className: "font-mono text-[10.5px] font-bold text-emerald-950 ml-0.5", children: item.value })) : null] }));
}
function OrderRequirementsCell({ record, category, }) {
    const reqs = (0, order_requirements_1.getOrderRequirements)(record);
    const items = category === "collections" ? reqs.collections : reqs.songsArea;
    if (!items || items.length === 0) {
        return (0, jsx_runtime_1.jsx)("span", { className: "text-[11px] text-brand-ink-tertiary", children: "\u2014" });
    }
    return ((0, jsx_runtime_1.jsx)("div", { className: "flex flex-col items-center justify-center gap-1 py-1", children: items.map((item) => ((0, jsx_runtime_1.jsx)(OrderRequirementPill, { item: item }, item.id))) }));
}
