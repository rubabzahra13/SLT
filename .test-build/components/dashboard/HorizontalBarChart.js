"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HorizontalBarChart = HorizontalBarChart;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
const brand_colors_1 = require("@/lib/brand-colors");
function HorizontalBarChart({ rows, max, href, valueSuffix = "", barHeight = 6, }) {
    if (rows.length === 0) {
        return ((0, jsx_runtime_1.jsx)("p", { className: "py-4 text-center text-[11px] text-brand-ink-tertiary", children: "No data" }));
    }
    const peak = max ?? Math.max(...rows.map((row) => row.value), 1);
    return ((0, jsx_runtime_1.jsx)("ul", { className: "space-y-2", children: rows.map((row) => {
            const width = peak > 0 ? (row.value / peak) * 100 : 0;
            const content = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-1 flex items-center justify-between gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "min-w-0 truncate text-[11px] font-medium text-brand-ink-secondary", children: row.label }), (0, jsx_runtime_1.jsxs)("span", { className: "shrink-0 text-[11px] font-semibold tabular-nums text-brand-ink", children: [row.value, valueSuffix] })] }), (0, jsx_runtime_1.jsx)("div", { className: "overflow-hidden rounded-full bg-brand-line/15", style: { height: barHeight }, children: (0, jsx_runtime_1.jsx)("div", { className: "h-full rounded-full transition-[width] duration-500", style: {
                                width: `${Math.max(width, row.value > 0 ? 6 : 0)}%`,
                                backgroundImage: (0, brand_colors_1.chartGradient)(row.color ?? "#1f8fb3"),
                            } }) })] }));
            return ((0, jsx_runtime_1.jsx)("li", { children: href ? ((0, jsx_runtime_1.jsx)(link_1.default, { href: href, className: "block rounded-md px-0.5 py-0.5 transition-colors hover:bg-brand-blue-soft/10", children: content })) : (content) }, row.label));
        }) }));
}
