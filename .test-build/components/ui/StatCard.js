"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatCard = StatCard;
const jsx_runtime_1 = require("react/jsx-runtime");
function StatCard({ label, value, trend }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "surface-premium animate-fade-in rounded-2xl p-6 transition hover:shadow-[var(--shadow-premium)]", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-label", children: label }), (0, jsx_runtime_1.jsx)("p", { className: "text-display mt-2 text-[32px] leading-none tabular-nums", children: value }), trend ? ((0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-[12px] text-brand-ink-tertiary", children: trend })) : null] }));
}
