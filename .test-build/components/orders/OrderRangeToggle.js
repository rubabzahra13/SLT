"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderRangeToggle = OrderRangeToggle;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
function OrderRangeToggle({ value, onChange, counts, }) {
    const options = [
        { id: "all", label: "All", count: counts?.all },
        {
            id: "need_to_be_scheduled",
            label: "Need to be Scheduled",
            count: counts?.needToBeScheduled ?? counts?.newOrders,
        },
        { id: "reassigned", label: "Reassigned", count: counts?.reassigned, isRed: true },
        { id: "waiting_for_data", label: "Waiting for Data", count: counts?.waitingForData },
    ];
    return ((0, jsx_runtime_1.jsx)("div", { className: "inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-xl bg-white p-1 shadow-sm ring-1 ring-inset ring-brand-line/45", role: "group", "aria-label": "Orders view range", children: options.map((opt) => {
            const active = value === opt.id ||
                (value === "new_orders" && opt.id === "need_to_be_scheduled");
            return ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => onChange(opt.id), className: (0, clsx_1.default)("shrink-0 rounded-lg px-2.5 py-1 text-[12px] transition-all duration-200 text-center leading-tight flex items-center justify-center min-h-[30px]", active
                    ? opt.isRed
                        ? "bg-rose-50 font-semibold text-rose-800 ring-1 ring-inset ring-rose-300/70"
                        : "bg-brand-blue-soft/70 font-semibold text-brand-ink"
                    : opt.isRed
                        ? "font-medium text-rose-700/80 hover:bg-rose-50/50 hover:text-rose-900"
                        : "font-medium text-brand-ink-secondary hover:bg-brand-elevated/90 hover:text-brand-ink"), children: (0, jsx_runtime_1.jsxs)("span", { className: "inline-block max-w-[125px] whitespace-normal text-center leading-tight", children: [opt.label, typeof opt.count === "number" ? ((0, jsx_runtime_1.jsxs)("span", { className: "ml-1 text-[10.5px] opacity-75 font-medium", children: ["(", opt.count, ")"] })) : null] }) }, opt.id));
        }) }));
}
