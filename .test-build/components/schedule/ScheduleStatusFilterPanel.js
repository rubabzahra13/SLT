"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleStatusFilterPanel = ScheduleStatusFilterPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const schedule_legend_1 = require("@/components/schedule/schedule-legend");
const schedule_view_1 = require("@/lib/schedule-view");
function statusSwatchClass(value) {
    if (value === "all")
        return null;
    return (0, schedule_legend_1.scheduleStatusSwatchClass)(value);
}
function computePanelPosition(trigger) {
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(window.innerWidth * 0.92, 280);
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    return {
        top: rect.bottom + 8,
        left: Math.min(Math.max(8, rect.left), maxLeft),
        width,
    };
}
function ScheduleStatusFilterPanel({ value, onChange, grouped = false, }) {
    const [open, setOpen] = (0, react_1.useState)(false);
    const [mounted, setMounted] = (0, react_1.useState)(false);
    const [position, setPosition] = (0, react_1.useState)(null);
    const rootRef = (0, react_1.useRef)(null);
    const buttonRef = (0, react_1.useRef)(null);
    const panelRef = (0, react_1.useRef)(null);
    const isActive = value !== "all";
    (0, react_1.useEffect)(() => {
        setMounted(true);
    }, []);
    (0, react_1.useEffect)(() => {
        if (!open || !buttonRef.current)
            return;
        const updatePosition = () => {
            if (!buttonRef.current)
                return;
            setPosition(computePanelPosition(buttonRef.current));
        };
        updatePosition();
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);
        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [open]);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        const onDown = (event) => {
            const target = event.target;
            if (rootRef.current?.contains(target) ||
                panelRef.current?.contains(target)) {
                return;
            }
            setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);
    const panel = mounted && open && position ? ((0, jsx_runtime_1.jsxs)("div", { ref: panelRef, className: "fixed z-[100] rounded-2xl border border-brand-line bg-brand-surface p-4 shadow-[var(--shadow-premium)]", style: {
            top: position.top,
            left: position.left,
            width: position.width,
        }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-3 flex items-center justify-between gap-3", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: "Filters" }), isActive ? ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => onChange("all"), className: "text-[12px] font-medium text-brand-signature hover:underline", children: "Clear all" })) : null] }), (0, jsx_runtime_1.jsx)("p", { className: "mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary", children: "Status" }), (0, jsx_runtime_1.jsx)("div", { className: "overflow-hidden rounded-xl border border-brand-line/70", children: schedule_view_1.SCHEDULE_STATUS_FILTERS.map(({ value: optionValue, label }) => {
                    const active = value === optionValue;
                    const swatchClass = statusSwatchClass(optionValue);
                    return ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => onChange(optionValue), className: (0, clsx_1.default)("flex w-full items-center justify-between gap-3 border-b border-brand-line/50 px-3 py-2.5 text-left text-[13px] transition last:border-b-0 hover:bg-brand-bg", active
                            ? "bg-brand-blue-soft/25 font-semibold text-brand-ink"
                            : "text-brand-ink-secondary"), children: (0, jsx_runtime_1.jsxs)("span", { className: "flex min-w-0 items-center gap-2.5", children: [active ? ((0, jsx_runtime_1.jsx)(lucide_react_1.Check, { className: "h-3.5 w-3.5 shrink-0 text-brand-signature", strokeWidth: 2.5 })) : ((0, jsx_runtime_1.jsx)("span", { className: "h-3.5 w-3.5 shrink-0", "aria-hidden": true })), swatchClass ? ((0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("h-2.5 w-4 shrink-0 rounded-[3px]", swatchClass), "aria-hidden": true })) : null, (0, jsx_runtime_1.jsx)("span", { className: "truncate", children: label })] }) }, optionValue));
                }) })] })) : null;
    return ((0, jsx_runtime_1.jsxs)("div", { ref: rootRef, className: "relative inline-block", children: [(0, jsx_runtime_1.jsxs)("button", { ref: buttonRef, type: "button", onClick: () => setOpen((current) => !current), className: (0, clsx_1.default)("inline-flex h-8 items-center gap-1.5 text-[12px] font-medium transition", grouped
                    ? (0, clsx_1.default)("rounded-lg px-2.5", open && "bg-brand-elevated shadow-sm ring-1 ring-brand-line/35", open || isActive
                        ? "bg-brand-blue-soft/70 font-semibold text-brand-ink"
                        : "text-brand-ink-secondary hover:bg-brand-elevated/90 hover:text-brand-ink", open && !isActive && "text-brand-ink")
                    : (0, clsx_1.default)("rounded-full border px-3 shadow-sm", open || isActive
                        ? "border-brand-blue/35 bg-brand-blue-soft/45 text-brand-ink"
                        : "border-brand-line/55 bg-brand-elevated/90 text-brand-ink-secondary hover:border-brand-line-strong hover:bg-brand-elevated", open && "ring-2 ring-brand-blue/15")), children: [(0, jsx_runtime_1.jsx)(lucide_react_1.SlidersHorizontal, { className: "h-3.5 w-3.5 shrink-0", strokeWidth: 2 }), "Filters", isActive ? ((0, jsx_runtime_1.jsx)("span", { className: "flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-blue-deep px-1 text-[10px] font-bold tabular-nums text-white", children: "1" })) : null] }), panel ? (0, react_dom_1.createPortal)(panel, document.body) : null] }));
}
