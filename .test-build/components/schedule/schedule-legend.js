"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHEDULE_LEGEND_ITEMS = void 0;
exports.scheduleStatusSwatchClass = scheduleStatusSwatchClass;
exports.scheduleStatusTextClass = scheduleStatusTextClass;
exports.getCellBookings = getCellBookings;
exports.ScheduleLegend = ScheduleLegend;
exports.ScheduleStatusIndicator = ScheduleStatusIndicator;
exports.ScheduleStatusTile = ScheduleStatusTile;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const HoverTip_1 = require("@/components/ui/HoverTip");
const schedule_view_1 = require("@/lib/schedule-view");
exports.SCHEDULE_LEGEND_ITEMS = [
    {
        key: "booked",
        label: "Booked",
        tip: "Has one or more mixes assigned",
        swatchClass: "bg-brand-signature",
    },
    {
        key: "capacity",
        label: "Capacity Reached",
        tip: "Daily mix or cost limit reached",
        swatchClass: "bg-amber-400/85",
    },
    {
        key: "off",
        label: "Off",
        tip: "Personal leave or public holiday",
        swatchClass: "bg-brand-orange/80",
    },
    {
        key: "nonwork",
        label: "Non-working",
        tip: "Outside regular work days, with no overtime",
        swatchClass: "ring-1 ring-inset ring-brand-orange shadow-[0_1px_2px_rgba(240,120,64,0.12)]",
    },
    {
        key: "available",
        label: "Available",
        tip: "Open for booking, including overtime days",
        swatchClass: "bg-cyan-50/80 ring-1 ring-inset ring-cyan-400/60 shadow-[0_1px_2px_rgba(6,182,212,0.12)]",
    },
];
function scheduleStatusSwatchClass(status) {
    if (status === "mix")
        return "bg-brand-signature";
    if (status === "off")
        return "bg-brand-orange/80";
    if (status === "nonwork")
        return "ring-1 ring-inset ring-brand-orange shadow-[0_1px_2px_rgba(240,120,64,0.12)]";
    if (status === "capacity")
        return "bg-amber-400/85";
    return "bg-cyan-50/80 ring-1 ring-inset ring-cyan-400/60 shadow-[0_1px_2px_rgba(6,182,212,0.12)]";
}
function scheduleStatusTextClass(status) {
    if (status === "available")
        return "text-brand-signature";
    if (status === "mix")
        return "text-brand-signature";
    if (status === "off")
        return "text-brand-orange-deep";
    if (status === "nonwork")
        return "text-brand-orange-deep";
    return "text-amber-700";
}
function getCellBookings(cell) {
    return cell.bookings ?? (cell.booking ? [cell.booking] : []);
}
function ScheduleLegend({ className }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("inline-flex flex-wrap items-center gap-x-3 gap-y-1.5", className), children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: "Legend" }), (0, jsx_runtime_1.jsx)("div", { className: "inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-brand-ink-secondary", children: exports.SCHEDULE_LEGEND_ITEMS.map((item) => ((0, jsx_runtime_1.jsxs)(HoverTip_1.HoverTip, { label: item.tip, placement: "top", className: "inline-flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("h-2.5 w-4 shrink-0 rounded-[3px]", item.swatchClass), style: item.key === "nonwork" ? { backgroundColor: "#fff1e8" } : undefined, "aria-hidden": true }), item.label] }, item.key))) })] }));
}
function ScheduleStatusIndicator({ status, showLabel = true, className, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("inline-flex items-center gap-2", className), children: [(0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("h-2.5 w-4 shrink-0 rounded-[3px]", scheduleStatusSwatchClass(status)), "aria-hidden": true }), showLabel ? ((0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("text-[12px] font-semibold", scheduleStatusTextClass(status)), children: (0, schedule_view_1.statusLabel)(status) })) : null] }));
}
function scheduleStatusTooltipTone(status) {
    if (status === "off")
        return "text-brand-orange";
    if (status === "nonwork")
        return "text-brand-orange";
    if (status === "capacity")
        return "text-amber-600";
    return "text-brand-signature";
}
function ScheduleStatusTooltip({ status, cell, }) {
    const bookings = cell ? getCellBookings(cell) : [];
    const booking = bookings[0];
    return ((0, jsx_runtime_1.jsxs)("div", { className: "min-w-[160px]", children: [(0, jsx_runtime_1.jsx)("p", { className: (0, clsx_1.default)("text-[10px] font-semibold uppercase tracking-[0.06em]", scheduleStatusTooltipTone(status)), children: (0, schedule_view_1.statusLabel)(status) }), booking ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[12px] font-medium leading-snug text-brand-ink", children: booking.work }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1.5 text-[11px] text-brand-ink-secondary", children: ["Until ", booking.until] }), bookings.length > 1 ? ((0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-[11px] text-brand-ink-tertiary", children: ["+", bookings.length - 1, " more mix", bookings.length - 1 === 1 ? "" : "es"] })) : null] })) : cell ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [cell.status === "off" && cell.offDetail ? ((0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[12px] font-medium leading-snug text-brand-ink", children: cell.offDetail })) : null, cell.status === "available" && cell.isOvertime ? ((0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[12px] font-medium leading-snug text-brand-ink", children: "Overtime day" })) : null, (0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-[11px] text-brand-ink-secondary", children: [cell.dayLabel, ", ", cell.dateLabel] })] })) : null] }));
}
function ScheduleStatusTile({ status, cell, className }) {
    const isOff = status === "off";
    const isNonwork = status === "nonwork";
    const isCapacity = status === "capacity";
    const isBooked = status === "mix";
    const tile = ((0, jsx_runtime_1.jsx)("span", { role: "img", "aria-label": (0, schedule_view_1.statusLabel)(status), className: (0, clsx_1.default)("mx-auto block h-6 w-12 max-w-[48px] rounded-md", isOff && "bg-brand-orange/80 shadow-[0_1px_2px_rgba(240,120,64,0.16)]", isNonwork &&
            "ring-1 ring-inset ring-brand-orange shadow-[0_1px_2px_rgba(240,120,64,0.12)]", isCapacity && "bg-amber-400/85 shadow-[0_1px_2px_rgba(245,158,11,0.20)]", isBooked &&
            "bg-gradient-to-b from-brand-blue to-brand-signature shadow-[0_1px_2px_rgba(15,30,45,0.18)]", status === "available" &&
            "bg-cyan-50/80 ring-1 ring-inset ring-cyan-400/60 shadow-[0_1px_2px_rgba(6,182,212,0.12)]", className), style: isNonwork ? { backgroundColor: "#fff1e8" } : undefined }));
    return ((0, jsx_runtime_1.jsx)(HoverTip_1.HoverTip, { className: "mx-auto w-full justify-center", placement: "top", content: (0, jsx_runtime_1.jsx)(ScheduleStatusTooltip, { status: status, cell: cell }), children: tile }));
}
