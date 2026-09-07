"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatTile = StatTile;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
const clsx_1 = __importDefault(require("clsx"));
const accentDot = {
    blue: "bg-brand-blue",
    orange: "bg-brand-orange",
    green: "bg-brand-success",
    purple: "bg-brand-grey",
};
const actionLinkClass = {
    blue: "text-brand-blue group-hover:text-brand-blue-hover",
    orange: "text-brand-orange group-hover:text-brand-orange-hover",
};
function StatTile({ href, label, value, action, accent = "blue", }) {
    return ((0, jsx_runtime_1.jsxs)(link_1.default, { href: href, className: "group surface-premium rounded-xl p-4 transition hover:shadow-[var(--shadow-premium)]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("h-2 w-2 rounded-full", accentDot[accent]) }), (0, jsx_runtime_1.jsx)("span", { className: "text-[13px] text-brand-ink-secondary", children: label })] }), (0, jsx_runtime_1.jsx)("p", { className: "text-display mt-2 text-2xl tabular-nums", children: value }), (0, jsx_runtime_1.jsx)("p", { className: (0, clsx_1.default)("mt-1 text-[13px] font-medium transition", accent === "orange" || accent === "blue"
                    ? actionLinkClass[accent]
                    : "text-brand-blue group-hover:text-brand-blue-hover"), children: action })] }));
}
