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
const schedule_legend_1 = require("@/components/schedule/schedule-legend");
const schedule_view_1 = require("@/lib/schedule-view");
function rangeListLabel(range) {
    if (range === "today")
        return "Today";
    if (range === "week")
        return "This week";
    if (range === "month")
        return "Last 30 days";
    if (range === "90days")
        return "Last 90 days";
    return "Last 6 months";
}
function TodayBookingsPanel({ cell }) {
    const bookings = (0, schedule_legend_1.getCellBookings)(cell);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex min-h-0 flex-1 flex-col bg-brand-blue-soft/60 px-5 py-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "shrink-0", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-label", children: "Booked today" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-[15px] font-semibold text-brand-ink", children: [cell.dayLabel, ", ", cell.dateLabel] })] }), bookings.length > 0 ? ((0, jsx_runtime_1.jsx)(DottedScroll_1.DottedScroll, { className: "mt-4 min-h-0 flex-1", scrollClassName: "h-full overflow-y-auto pr-1 scrollbar-hide", indicatorPlacement: "gutter", contentClassName: "flex flex-col gap-2 pb-2", children: bookings.map((booking, index) => ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-brand-line/70 bg-brand-surface/90 px-3 py-3", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold leading-snug text-brand-ink", children: booking.work }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1.5 text-[12px] text-brand-ink-secondary", children: ["Until ", booking.until] })] }, booking.mixId ?? `${cell.key}-${index}`))) })) : ((0, jsx_runtime_1.jsxs)("div", { className: "mt-4 rounded-xl border border-brand-line/70 bg-brand-surface/90 px-3 py-3", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-signature", children: (0, schedule_view_1.statusLabel)(cell.status) }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[12px] text-brand-ink-secondary", children: cell.unavailable
                            ? "Not available for new assignments today."
                            : "Available for booking today." })] }))] }));
}
function ProducerScheduleDrawer({ open, producer, cells, range, focusCell, onClose, }) {
    if (!open || !producer)
        return null;
    const isTodayView = range === "today";
    const todayCell = focusCell ?? cells[0] ?? null;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex justify-end", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-brand-scrim backdrop-blur-sm", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("aside", { className: "relative flex h-full w-full max-w-md flex-col border-l border-brand-line bg-brand-surface shadow-[var(--shadow-premium)]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-4 border-b border-brand-line/70 p-5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { src: producer.avatar, alt: producer.name, size: "md" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-display text-[17px]", children: producer.name }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-0.5 text-[12px] text-brand-ink-secondary", children: [producer.specialty, " \u00B7 Next ", producer.nextAvailable] })] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4" }) })] }), isTodayView && todayCell ? (0, jsx_runtime_1.jsx)(TodayBookingsPanel, { cell: todayCell }) : null, !isTodayView && focusCell ? ((0, jsx_runtime_1.jsxs)("div", { className: "border-b border-brand-line/70 bg-brand-blue-soft/60 px-5 py-4", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-label", children: "Selected day" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-[15px] font-semibold", children: [focusCell.dayLabel, ", ", focusCell.dateLabel] }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-[13px] text-brand-ink-secondary", children: [(0, schedule_view_1.statusLabel)(focusCell.status), focusCell.unavailable
                                        ? " — not available for new assignments"
                                        : " — available for booking"] })] })) : null, !isTodayView ? ((0, jsx_runtime_1.jsxs)(DottedScroll_1.DottedScroll, { className: "min-h-0 flex-1", scrollClassName: "h-full overflow-y-scroll scrollbar-hide p-5", indicatorPlacement: "gutter", contentClassName: "flex flex-col gap-1.5", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-label mb-3", children: rangeListLabel(range) }), cells.map((cell) => {
                                const bookings = (0, schedule_legend_1.getCellBookings)(cell);
                                return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("flex items-center justify-between rounded-xl px-3 py-2.5", focusCell?.key === cell.key
                                        ? "bg-brand-blue-soft ring-1 ring-brand-blue/25"
                                        : "bg-brand-surface"), children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("p", { className: "text-[13px] font-medium", children: [cell.dayLabel, ", ", cell.dateLabel] }), (0, jsx_runtime_1.jsxs)("p", { className: "text-[11px] text-brand-ink-tertiary", children: [(0, schedule_view_1.statusLabel)(cell.status), bookings.length > 0 && bookings[0].work
                                                            ? ` · ${bookings.map((b) => b.work).join(", ")}`
                                                            : ""] })] }), (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("h-3 w-3 rounded-[3px]", cell.status === "off"
                                                ? "bg-brand-orange"
                                                : cell.unavailable
                                                    ? "bg-brand-signature"
                                                    : "bg-emerald-500 ring-1 ring-emerald-600/30") })] }, cell.key));
                            })] })) : null] })] }));
}
