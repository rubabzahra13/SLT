"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressRing = ProgressRing;
const jsx_runtime_1 = require("react/jsx-runtime");
const brand_colors_1 = require("@/lib/brand-colors");
function ProgressRing({ value, max, color, size = 72, stroke = 7, id, children, }) {
    const [from, to] = (0, brand_colors_1.chartGradientStops)(color);
    const radius = (size - stroke) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;
    const fraction = max > 0 ? Math.min(1, value / max) : 0;
    const dash = fraction * circumference;
    const gradientId = `ring-${id}`;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "relative", style: { width: size, height: size }, children: [(0, jsx_runtime_1.jsxs)("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}`, children: [(0, jsx_runtime_1.jsx)("defs", { children: (0, jsx_runtime_1.jsxs)("linearGradient", { id: gradientId, x1: "0%", y1: "0%", x2: "100%", y2: "100%", children: [(0, jsx_runtime_1.jsx)("stop", { offset: "0%", stopColor: from }), (0, jsx_runtime_1.jsx)("stop", { offset: "100%", stopColor: to })] }) }), (0, jsx_runtime_1.jsx)("circle", { cx: center, cy: center, r: radius, fill: "none", stroke: "rgba(15,30,45,0.08)", strokeWidth: stroke }), (0, jsx_runtime_1.jsx)("circle", { cx: center, cy: center, r: radius, fill: "none", stroke: `url(#${gradientId})`, strokeWidth: stroke, strokeLinecap: "round", strokeDasharray: `${dash} ${circumference}`, transform: `rotate(-90 ${center} ${center})`, style: { transition: "stroke-dasharray 0.6s cubic-bezier(0.16,1,0.3,1)" } })] }), (0, jsx_runtime_1.jsx)("div", { className: "pointer-events-none absolute inset-0 flex flex-col items-center justify-center", children: children })] }));
}
