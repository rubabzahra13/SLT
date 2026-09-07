"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderSegmentTabs = OrderSegmentTabs;
exports.OrderSegment = OrderSegment;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const segments = [
    { id: "active", label: "Active", count: (p) => p.activeCount },
    { id: "all", label: "All orders", count: (p) => p.allCount },
    { id: "past", label: "Past", count: (p) => p.pastCount },
];
function OrderSegmentTabs(props) {
    const { tab, onChange } = props;
    return ((0, jsx_runtime_1.jsx)("nav", { className: "flex gap-0.5", "aria-label": "Order views", children: segments.map(({ id, label, count }) => {
            const active = tab === id;
            const value = count(props);
            return ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onChange(id), className: (0, clsx_1.default)("relative px-3 pb-3 pt-1 text-[13px] font-medium transition-colors", active ? "text-brand-ink" : "text-brand-ink-tertiary hover:text-brand-ink-secondary"), children: [label, (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("ml-1.5 text-[11px] tabular-nums", active ? "text-brand-ink-secondary" : "text-brand-ink-tertiary"), children: value }), active ? ((0, jsx_runtime_1.jsx)("span", { className: "absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-accent" })) : null] }, id));
        }) }));
}
/** @deprecated Use OrderSegmentTabs */
function OrderSegment(props) {
    return (0, jsx_runtime_1.jsx)(OrderSegmentTabs, { ...props });
}
