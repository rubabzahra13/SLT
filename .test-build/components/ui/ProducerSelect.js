"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProducerSelect = ProducerSelect;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
function ProducerSelect({ producers, value, onChange, label = "Editor:", allLabel = "All Editors", className, }) {
    const [open, setOpen] = (0, react_1.useState)(false);
    const rootRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        const handleClickOutside = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);
    const uniqueProducers = (0, react_1.useMemo)(() => {
        const seen = new Set();
        return producers.filter((p) => {
            const key = (p.id || p.name).toLowerCase();
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }, [producers]);
    const selectedProducer = uniqueProducers.find((p) => p.name.toUpperCase() === value.toUpperCase() ||
        p.id.toUpperCase() === value.toUpperCase());
    const displayLabel = selectedProducer ? selectedProducer.name : allLabel;
    const displayColor = value === "all"
        ? null
        : selectedProducer
            ? selectedProducer.color || "#94a3b8"
            : "#94a3b8";
    return ((0, jsx_runtime_1.jsxs)("div", { ref: rootRef, className: (0, clsx_1.default)("relative inline-flex items-center gap-1.5", open && "z-[100]", className), children: [label && ((0, jsx_runtime_1.jsx)("span", { className: "text-[12px] font-semibold text-brand-ink-secondary", children: label })), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setOpen((prev) => !prev), className: "inline-flex h-8 items-center gap-2 rounded-lg border border-brand-line/80 bg-brand-elevated px-2.5 text-[12px] font-medium text-brand-ink shadow-sm transition hover:border-brand-line-strong focus:outline-none focus:ring-2 focus:ring-brand-blue/20", children: [displayColor ? ((0, jsx_runtime_1.jsx)("span", { className: "h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-black/10", style: { backgroundColor: displayColor }, "aria-hidden": "true" })) : ((0, jsx_runtime_1.jsx)("span", { className: "h-2.5 w-2.5 rounded-full shrink-0 bg-brand-ink-tertiary/40", "aria-hidden": "true" })), (0, jsx_runtime_1.jsx)("span", { className: "truncate", children: displayLabel }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { className: (0, clsx_1.default)("h-3.5 w-3.5 shrink-0 text-brand-ink-tertiary transition", open && "rotate-180") })] }), open && ((0, jsx_runtime_1.jsxs)("div", { className: "absolute left-0 top-[calc(100%+4px)] z-[100] min-w-[170px] max-h-60 overflow-y-auto rounded-xl border border-brand-line bg-brand-surface p-1 shadow-[var(--shadow-premium)]", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => {
                            onChange("all");
                            setOpen(false);
                        }, className: (0, clsx_1.default)("flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition hover:bg-brand-bg", value === "all" ? "bg-brand-accent-soft text-brand-ink font-semibold" : "text-brand-ink-secondary"), children: [(0, jsx_runtime_1.jsx)("span", { className: "h-2.5 w-2.5 rounded-full shrink-0 bg-brand-ink-tertiary/40" }), (0, jsx_runtime_1.jsx)("span", { children: allLabel })] }), uniqueProducers.map((p, idx) => {
                        const isSelected = value === p.name ||
                            value === p.id ||
                            value.toUpperCase() === p.name.toUpperCase();
                        const color = p.color || "#94a3b8"; // neutral fallback slate if unset
                        return ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => {
                                onChange(p.name);
                                setOpen(false);
                            }, className: (0, clsx_1.default)("flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition hover:bg-brand-bg", isSelected
                                ? "bg-brand-accent-soft text-brand-ink font-semibold"
                                : "text-brand-ink-secondary"), children: [(0, jsx_runtime_1.jsx)("span", { className: "h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-black/10", style: { backgroundColor: color }, "aria-hidden": "true" }), (0, jsx_runtime_1.jsx)("span", { children: p.name })] }, `${p.id}-${idx}`));
                    })] }))] }));
}
