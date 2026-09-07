"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersIncomingChart = OrdersIncomingChart;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
const dashboard_tooltips_1 = require("@/lib/dashboard-tooltips");
const brand_colors_1 = require("@/lib/brand-colors");
const DashboardTip_1 = require("@/components/dashboard/DashboardTip");
function buildSmoothLinePath(plotPoints) {
    if (plotPoints.length === 0)
        return "";
    if (plotPoints.length === 1) {
        const p = plotPoints[0];
        return `M ${p.x} ${p.y}`;
    }
    let path = `M ${plotPoints[0].x} ${plotPoints[0].y}`;
    for (let i = 0; i < plotPoints.length - 1; i++) {
        const current = plotPoints[i];
        const next = plotPoints[i + 1];
        const midX = (current.x + next.x) / 2;
        path += ` C ${midX} ${current.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
    }
    return path;
}
function buildAreaPath(plotPoints, baseline) {
    if (plotPoints.length === 0)
        return "";
    const line = buildSmoothLinePath(plotPoints);
    const last = plotPoints[plotPoints.length - 1];
    const first = plotPoints[0];
    return `${line} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
}
function OrdersIncomingChart({ points, href = "/orders", compact = false, }) {
    const total = points.reduce((sum, point) => sum + point.count, 0);
    const todayCount = points.find((point) => point.isToday)?.count ?? 0;
    if (total <= 0) {
        return ((0, jsx_runtime_1.jsx)("p", { className: "px-4 py-5 text-center text-[11px] text-brand-ink-tertiary", children: "No orders in this period" }));
    }
    const width = 320;
    const height = compact ? 88 : 132;
    const pad = { top: 10, right: 10, bottom: 24, left: 6 };
    const plotWidth = width - pad.left - pad.right;
    const plotHeight = height - pad.top - pad.bottom;
    const baseline = pad.top + plotHeight;
    const max = Math.max(...points.map((point) => point.count), 1);
    const [lineFrom, lineTo] = (0, brand_colors_1.chartGradientStops)(brand_colors_1.BRAND_SIGNATURE);
    const [areaFrom] = (0, brand_colors_1.chartGradientStops)(brand_colors_1.BRAND_BLUE);
    const plotPoints = points.map((point, index) => ({
        ...point,
        x: pad.left +
            (points.length <= 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth),
        y: pad.top + plotHeight - (point.count / max) * plotHeight,
    }));
    const linePath = buildSmoothLinePath(plotPoints);
    const areaPath = buildAreaPath(plotPoints, baseline);
    const labelStride = compact ? 3 : 2;
    const peak = points.reduce((best, point) => {
        if (!best || point.count > best.count) {
            return { label: point.isToday ? "Today" : point.label, count: point.count };
        }
        return best;
    }, null);
    const chartInsight = (0, dashboard_tooltips_1.ordersChartInsight)(total, todayCount, peak);
    return ((0, jsx_runtime_1.jsxs)("div", { className: compact ? "flex h-full min-h-0 flex-col px-3 py-2" : "px-5 py-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-1.5 flex shrink-0 items-end justify-between gap-3", children: [(0, jsx_runtime_1.jsx)(DashboardTip_1.DashboardTip, { title: chartInsight.title, body: chartInsight.body, placement: "top", children: (0, jsx_runtime_1.jsxs)("div", { className: "cursor-default", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[18px] font-bold leading-none tabular-nums tracking-[-0.04em] text-brand-ink", children: total }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary", children: "last 14 days" })] }) }), (0, jsx_runtime_1.jsx)(DashboardTip_1.DashboardTip, { title: "Today", body: todayCount > 0
                            ? `${todayCount} new order${todayCount === 1 ? "" : "s"} logged today — check Orders for details.`
                            : "No new orders logged yet today.", placement: "left", children: (0, jsx_runtime_1.jsxs)("div", { className: "cursor-default text-right", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[16px] font-bold leading-none tabular-nums tracking-[-0.03em] text-brand-ink", children: todayCount }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary", children: "today" })] }) })] }), (0, jsx_runtime_1.jsx)(DashboardTip_1.DashboardTip, { title: "Daily volume", body: "Hover chart points for day-by-day order counts.", className: "block min-h-0 flex-1", placement: "top", children: (0, jsx_runtime_1.jsx)(link_1.default, { href: href, className: "group block min-h-0 flex-1 overflow-hidden transition-opacity hover:opacity-95", "aria-label": `${total} orders in the last 14 days`, children: (0, jsx_runtime_1.jsxs)("svg", { viewBox: `0 0 ${width} ${height}`, className: "h-full w-full", role: "img", "aria-hidden": true, preserveAspectRatio: "none", children: [(0, jsx_runtime_1.jsxs)("defs", { children: [(0, jsx_runtime_1.jsxs)("linearGradient", { id: "orders-line-gradient", x1: "0%", y1: "0%", x2: "100%", y2: "0%", children: [(0, jsx_runtime_1.jsx)("stop", { offset: "0%", stopColor: lineFrom }), (0, jsx_runtime_1.jsx)("stop", { offset: "100%", stopColor: lineTo })] }), (0, jsx_runtime_1.jsxs)("linearGradient", { id: "orders-area-gradient", x1: "0%", y1: "0%", x2: "0%", y2: "100%", children: [(0, jsx_runtime_1.jsx)("stop", { offset: "0%", stopColor: areaFrom, stopOpacity: 0.2 }), (0, jsx_runtime_1.jsx)("stop", { offset: "100%", stopColor: areaFrom, stopOpacity: 0.01 })] })] }), [0.25, 0.5, 0.75].map((fraction) => {
                                const y = pad.top + plotHeight * (1 - fraction);
                                return ((0, jsx_runtime_1.jsx)("line", { x1: pad.left, y1: y, x2: width - pad.right, y2: y, stroke: "rgba(15, 30, 45, 0.06)", strokeWidth: 1 }, fraction));
                            }), (0, jsx_runtime_1.jsx)("path", { d: areaPath, fill: "url(#orders-area-gradient)" }), (0, jsx_runtime_1.jsx)("path", { d: linePath, fill: "none", stroke: "url(#orders-line-gradient)", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }), plotPoints.map((point) => ((0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("title", { children: `${point.label}: ${point.count} order${point.count === 1 ? "" : "s"}` }), point.isToday ? ((0, jsx_runtime_1.jsx)("circle", { cx: point.x, cy: point.y, r: 6, fill: "rgba(240, 120, 64, 0.1)" })) : null, (0, jsx_runtime_1.jsx)("circle", { cx: point.x, cy: point.y, r: point.isToday ? 3.5 : 2.5, fill: point.isToday ? brand_colors_1.BRAND_ORANGE : brand_colors_1.BRAND_SIGNATURE, stroke: "#ffffff", strokeWidth: 1.5 })] }, point.iso))), plotPoints.map((point, index) => index % labelStride === 0 || point.isToday ? ((0, jsx_runtime_1.jsx)("text", { x: point.x, y: height - 6, textAnchor: "middle", className: "fill-brand-ink-tertiary text-[9px] font-semibold", children: point.isToday ? "Today" : point.shortLabel }, `${point.iso}-label`)) : null)] }) }) })] }));
}
