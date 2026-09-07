"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevenueChart = RevenueChart;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
const data_1 = require("@/lib/data");
function RevenueChart({ stages, compact = false }) {
    const total = stages.reduce((sum, stage) => sum + stage.value, 0);
    if (total <= 0) {
        return ((0, jsx_runtime_1.jsx)("p", { className: "px-4 py-5 text-center text-[11px] text-brand-ink-tertiary", children: "No pipeline value yet" }));
    }
    const peak = Math.max(...stages.map((s) => s.value), 1);
    return ((0, jsx_runtime_1.jsxs)("div", { className: compact ? "flex h-full flex-col justify-between px-4 py-3" : "px-5 py-4", children: [(0, jsx_runtime_1.jsx)("div", { className: compact ? "flex flex-1 items-end gap-2" : "flex h-24 items-end gap-3", children: stages.map((stage) => {
                    const height = Math.max(12, (stage.value / peak) * 100);
                    return ((0, jsx_runtime_1.jsxs)(link_1.default, { href: stage.href, className: "group flex min-w-0 flex-1 flex-col items-center justify-end gap-1", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-full max-w-[40px] rounded-md transition-opacity group-hover:opacity-90", style: {
                                    height: compact ? `${Math.max(height * 0.55, 18)}%` : `${height}%`,
                                    minHeight: compact ? 28 : undefined,
                                    backgroundColor: stage.color,
                                }, title: `${stage.label}: ${(0, data_1.formatPrice)(stage.value)}` }), (0, jsx_runtime_1.jsx)("span", { className: "w-full truncate text-center text-[9px] font-semibold uppercase tracking-wide text-brand-ink-secondary", children: stage.label })] }, stage.label));
                }) }), (0, jsx_runtime_1.jsx)("p", { className: compact
                    ? "mt-2 text-center text-[11px] font-bold tabular-nums text-brand-ink"
                    : "mt-2 text-center text-[11px] font-semibold tabular-nums text-brand-ink", children: (0, data_1.formatPrice)(total) })] }));
}
