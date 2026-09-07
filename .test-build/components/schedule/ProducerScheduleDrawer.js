"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProducerScheduleDrawer = ProducerScheduleDrawer;
const jsx_runtime_1 = require("react/jsx-runtime");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const Avatar_1 = require("@/components/ui/Avatar");
const DottedScroll_1 = require("@/components/ui/DottedScroll");
const schedule_view_1 = require("@/lib/schedule-view");
function ProducerScheduleDrawer({ open, producer, cells, range, focusCell, onClose, }) {
    if (!open || !producer)
        return null;
    const unavailable = (0, schedule_view_1.countUnavailable)(cells);
    const available = cells.length - unavailable;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex justify-end", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-brand-scrim backdrop-blur-sm", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("aside", { className: "relative flex h-full w-full max-w-md flex-col border-l border-brand-line bg-brand-surface shadow-[var(--shadow-premium)]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-4 border-b border-brand-line/70 p-5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { src: producer.avatar, alt: producer.name, size: "md" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-display text-[17px]", children: producer.name }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-0.5 text-[12px] text-brand-ink-secondary", children: [producer.specialty, " \u00B7 Next ", producer.nextAvailable] })] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4" }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-3 gap-3 border-b border-brand-line/70 p-5", children: [(0, jsx_runtime_1.jsx)(Stat, { label: "Available", value: available, tone: "success" }), (0, jsx_runtime_1.jsx)(Stat, { label: "Unavailable", value: unavailable, tone: "neutral" }), (0, jsx_runtime_1.jsx)(Stat, { label: "Status", value: producer.status, tone: producer.status === "available" ? "success" : "warning", text: true })] }), focusCell ? ((0, jsx_runtime_1.jsxs)("div", { className: "border-b border-brand-line/70 bg-brand-blue-soft/60 px-5 py-4", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-label", children: "Selected day" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-[15px] font-semibold", children: [focusCell.dayLabel, ", ", focusCell.dateLabel] }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-[13px] text-brand-ink-secondary", children: [(0, schedule_view_1.statusLabel)(focusCell.status), focusCell.unavailable
                                        ? " — not available for new assignments"
                                        : " — available for booking"] })] })) : null, (0, jsx_runtime_1.jsxs)(DottedScroll_1.DottedScroll, { className: "min-h-0 flex-1", scrollClassName: "h-full overflow-y-scroll scrollbar-hide p-5", indicatorPlacement: "gutter", contentClassName: "flex flex-col gap-1.5", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-label mb-3", children: range === "week" ? "This week" : range === "month" ? "Last 30 days" : "Last 90 days" }), cells.map((cell) => ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("flex items-center justify-between rounded-xl px-3 py-2.5", focusCell?.key === cell.key
                                    ? "bg-brand-blue-soft ring-1 ring-brand-blue/25"
                                    : "bg-brand-surface"), children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("p", { className: "text-[13px] font-medium", children: [cell.dayLabel, ", ", cell.dateLabel] }), (0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-brand-ink-tertiary", children: (0, schedule_view_1.statusLabel)(cell.status) })] }), (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("h-3 w-3 rounded-[3px]", cell.unavailable
                                            ? "bg-brand-signature"
                                            : "bg-brand-surface ring-1 ring-inset ring-brand-line/80") })] }, cell.key)))] })] })] }));
}
function Stat({ label, value, tone, text, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl bg-brand-bg/60 px-3 py-2.5", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[10px] font-medium uppercase tracking-wide text-brand-ink-tertiary", children: label }), (0, jsx_runtime_1.jsx)("p", { className: (0, clsx_1.default)("mt-1 font-semibold capitalize", text ? "text-[12px]" : "text-[18px] tabular-nums", tone === "success" && "text-brand-success", tone === "warning" && "text-brand-warning", tone === "neutral" && "text-brand-ink"), children: value })] }));
}
