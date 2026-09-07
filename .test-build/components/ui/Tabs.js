"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tabs = Tabs;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const underlineAccent = {
    blue: "bg-brand-signature",
    orange: "bg-brand-orange",
};
const activeBadge = {
    blue: "bg-brand-blue-soft text-brand-signature",
    orange: "bg-brand-orange-soft text-brand-orange",
};
function Tabs({ options, value, onChange, accent = "blue", className, }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("scrollbar-hide -mb-px flex items-center gap-0.5 overflow-x-auto", className), role: "tablist", children: options.map((opt) => {
            const active = opt.value === value;
            return ((0, jsx_runtime_1.jsxs)("button", { type: "button", role: "tab", "aria-selected": active, onClick: () => onChange(opt.value), className: (0, clsx_1.default)("group relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[13px] font-medium transition-colors", active
                    ? "text-brand-ink"
                    : "text-brand-ink-tertiary hover:text-brand-ink-secondary"), children: [(0, jsx_runtime_1.jsx)("span", { children: opt.label }), opt.count !== undefined ? ((0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-colors", active
                            ? activeBadge[accent]
                            : "bg-brand-bg-subtle text-brand-ink-tertiary group-hover:bg-brand-line/60"), children: opt.count })) : null, (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-colors", active ? underlineAccent[accent] : "bg-transparent"), "aria-hidden": true })] }, opt.value));
        }) }));
}
