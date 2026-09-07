"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterSelect = FilterSelect;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const lucide_react_1 = require("lucide-react");
const accentActive = {
    blue: "border-brand-blue/35 bg-brand-blue-soft/45 text-brand-ink",
    orange: "border-brand-orange/35 bg-brand-orange-soft/70 text-brand-ink",
};
function FilterSelect({ label, value, options, onChange, className, accent = "blue", hideLabel = false, }) {
    const selected = options.find((o) => o.value === value);
    const isActive = value !== options[0]?.value;
    return ((0, jsx_runtime_1.jsxs)("label", { className: (0, clsx_1.default)("inline-flex items-center gap-1.5 transition", hideLabel
            ? (0, clsx_1.default)("h-8 rounded-full border px-3 shadow-sm", isActive
                ? accentActive[accent]
                : "border-brand-line/55 bg-brand-elevated/90 text-brand-ink-secondary hover:border-brand-line-strong hover:bg-brand-elevated")
            : "rounded-lg border border-brand-line bg-brand-elevated px-2.5 py-1 shadow-sm", className), children: [!hideLabel ? ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary", children: label }) })) : null, (0, jsx_runtime_1.jsxs)("span", { className: "relative inline-flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)("select", { value: value, onChange: (e) => onChange(e.target.value), "aria-label": hideLabel ? label : undefined, className: (0, clsx_1.default)("appearance-none bg-transparent outline-none", hideLabel
                            ? "max-w-[148px] truncate pr-4 text-[12px] font-medium"
                            : "pr-5 text-[12px] font-medium text-brand-ink"), children: options.map((opt) => ((0, jsx_runtime_1.jsx)("option", { value: opt.value, children: hideLabel
                                ? opt.label
                                : `${opt.label}${opt.count !== undefined ? ` (${opt.count})` : ""}` }, opt.value))) }), !hideLabel && selected?.count !== undefined ? null : hideLabel ? ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: selected?.count !== undefined ? ((0, jsx_runtime_1.jsx)("span", { className: "shrink-0 text-[11px] tabular-nums text-brand-ink-tertiary", children: selected.count })) : null })) : null, (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { className: (0, clsx_1.default)("pointer-events-none h-3 w-3 shrink-0 text-brand-ink-tertiary", hideLabel ? "absolute right-0" : "absolute right-0"), strokeWidth: 2 })] })] }));
}
