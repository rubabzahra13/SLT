"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderFormTabs = OrderFormTabs;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const DottedScroll_1 = require("@/components/ui/DottedScroll");
const types_1 = require("@/types");
function OrderFormTabs({ form, onChange, counts }) {
    return ((0, jsx_runtime_1.jsx)(DottedScroll_1.DottedScroll, { orientation: "horizontal", className: "border-b border-brand-line bg-brand-bg/40", scrollClassName: "overflow-x-scroll scrollbar-hide", indicatorPlacement: "below", contentClassName: "flex w-max min-w-full gap-1 px-4 py-2", children: (0, jsx_runtime_1.jsx)("nav", { className: "flex gap-1", "aria-label": "Order form types", children: types_1.ORDER_FORM_TABS.map(({ id, label }) => {
                const active = form === id;
                const count = counts[id] ?? 0;
                return ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onChange(id), className: (0, clsx_1.default)("shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors", active
                        ? "bg-brand-accent text-white shadow-sm"
                        : "text-brand-ink-secondary hover:bg-brand-surface hover:text-brand-ink"), children: [label, (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("ml-1.5 tabular-nums", active ? "text-white/80" : "text-brand-ink-tertiary"), children: count })] }, id));
            }) }) }));
}
