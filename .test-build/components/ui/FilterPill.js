"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterPill = FilterPill;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const activeStyles = {
    blue: "border-brand-blue/30 bg-gradient-to-b from-brand-blue-soft to-brand-bg-subtle/90 text-brand-ink shadow-sm ring-1 ring-inset ring-brand-blue/15",
    orange: "border-brand-orange/35 bg-brand-orange-soft text-brand-orange shadow-sm ring-1 ring-inset ring-brand-orange/20",
};
const segmentedActiveStyles = {
    blue: "border-transparent bg-white text-brand-signature shadow-sm ring-1 ring-inset ring-brand-blue/15",
    orange: "border-transparent bg-white text-brand-orange shadow-sm ring-1 ring-inset ring-brand-orange/20",
};
const groupedActiveStyles = {
    blue: "bg-brand-blue-soft/70 font-semibold text-brand-ink",
    orange: "bg-brand-orange-soft/80 font-semibold text-brand-ink",
};
function FilterPill({ label, active, onClick, accent = "blue", variant = "solo", }) {
    const segmented = variant === "segmented";
    const grouped = variant === "grouped";
    return ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClick, className: (0, clsx_1.default)("shrink-0 transition-all duration-200", grouped
            ? "rounded-lg px-2.5 py-1 text-[12px] font-medium"
            : "rounded-full border px-3 py-1 text-[11px] font-semibold", active
            ? grouped
                ? groupedActiveStyles[accent]
                : segmented
                    ? segmentedActiveStyles[accent]
                    : activeStyles[accent]
            : grouped
                ? "text-brand-ink-secondary hover:bg-brand-elevated/90 hover:text-brand-ink"
                : segmented
                    ? "border-transparent text-brand-ink-tertiary hover:text-brand-ink"
                    : "border-brand-line/50 bg-white/90 text-brand-ink-secondary shadow-sm hover:border-brand-line-strong hover:bg-white hover:text-brand-ink"), children: label }));
}
