"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterMenu = FilterMenu;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const accentActive = {
    blue: "border-brand-blue/35 bg-brand-blue-soft/45 text-brand-ink",
    orange: "border-brand-orange/35 bg-brand-orange-soft/70 text-brand-ink",
};
function FilterMenu({ label, value, options, onChange, accent = "blue", className, hideLabel = false, grouped = false, }) {
    const [open, setOpen] = (0, react_1.useState)(false);
    const rootRef = (0, react_1.useRef)(null);
    const selected = options.find((o) => o.value === value);
    const isActive = value !== options[0]?.value;
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        const onDown = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);
    return ((0, jsx_runtime_1.jsxs)("div", { ref: rootRef, className: (0, clsx_1.default)("relative", className), children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", "aria-label": hideLabel ? label : undefined, onClick: () => setOpen((v) => !v), className: (0, clsx_1.default)("inline-flex h-8 items-center gap-1.5 text-[12px] font-medium transition", hideLabel
                    ? grouped
                        ? (0, clsx_1.default)("rounded-lg px-2.5", open && "bg-brand-elevated shadow-sm ring-1 ring-brand-line/35", isActive
                            ? accent === "orange"
                                ? "bg-brand-orange-soft/80 font-semibold text-brand-ink"
                                : "bg-brand-blue-soft/70 font-semibold text-brand-ink"
                            : "text-brand-ink-secondary hover:bg-brand-elevated/90 hover:text-brand-ink", open && !isActive && "bg-brand-elevated text-brand-ink")
                        : (0, clsx_1.default)("rounded-full border px-3 shadow-sm", open && "ring-2 ring-brand-blue/15", isActive
                            ? accentActive[accent]
                            : "border-brand-line/55 bg-brand-elevated/90 text-brand-ink-secondary hover:border-brand-line-strong hover:bg-brand-elevated", open &&
                            !isActive &&
                            "border-brand-line-strong bg-brand-elevated text-brand-ink")
                    : (0, clsx_1.default)("rounded-lg border px-3 shadow-sm", open
                        ? "border-brand-line-strong bg-brand-bg text-brand-ink"
                        : "border-brand-line bg-brand-elevated text-brand-ink-secondary hover:border-brand-line-strong hover:bg-brand-accent-soft hover:text-brand-ink")), children: [!hideLabel ? ((0, jsx_runtime_1.jsx)("span", { className: "text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary", children: label })) : null, (0, jsx_runtime_1.jsx)("span", { className: "max-w-[148px] truncate text-brand-ink", children: selected?.label ?? "—" }), !hideLabel && selected?.count !== undefined ? ((0, jsx_runtime_1.jsxs)("span", { className: "text-brand-ink-tertiary", children: ["(", selected.count, ")"] })) : null, (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { className: (0, clsx_1.default)("h-3.5 w-3.5 shrink-0 text-brand-ink-tertiary transition", open && "rotate-180"), strokeWidth: 2 })] }), open ? ((0, jsx_runtime_1.jsx)("div", { className: "absolute left-0 top-[calc(100%+6px)] z-30 max-h-[300px] w-[248px] overflow-y-auto rounded-xl border border-brand-line bg-brand-surface py-1 shadow-[var(--shadow-premium)]", children: options.map((opt) => {
                    const active = opt.value === value;
                    return ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => {
                            onChange(opt.value);
                            setOpen(false);
                        }, className: (0, clsx_1.default)("flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] transition hover:bg-brand-bg", active
                            ? "font-semibold text-brand-ink"
                            : "text-brand-ink-secondary"), children: [(0, jsx_runtime_1.jsxs)("span", { className: "flex min-w-0 items-center gap-2", children: [active ? ((0, jsx_runtime_1.jsx)(lucide_react_1.Check, { className: "h-3.5 w-3.5 shrink-0 text-brand-signature", strokeWidth: 2.5 })) : ((0, jsx_runtime_1.jsx)("span", { className: "h-3.5 w-3.5 shrink-0", "aria-hidden": true })), (0, jsx_runtime_1.jsx)("span", { className: "truncate", children: opt.label })] }), opt.count !== undefined ? ((0, jsx_runtime_1.jsx)("span", { className: "shrink-0 text-[12px] tabular-nums text-brand-ink-tertiary", children: opt.count })) : null] }, opt.value));
                }) })) : null] }));
}
