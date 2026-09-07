"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttentionFlag = AttentionFlag;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const lucide_react_1 = require("lucide-react");
function AttentionFlag({ reason, compact }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("flex items-start gap-3 rounded-xl border border-brand-line bg-brand-surface transition hover:border-brand-line-strong hover:shadow-[var(--shadow-premium-sm)]", compact ? "p-3" : "p-4"), children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { className: "mt-0.5 h-4 w-4 shrink-0 text-brand-orange", strokeWidth: 1.75 }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-wide text-brand-ink-secondary", children: "Needs attention" }), !compact ? ((0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[13px] leading-snug text-brand-ink-secondary", children: reason })) : null] })] }));
}
