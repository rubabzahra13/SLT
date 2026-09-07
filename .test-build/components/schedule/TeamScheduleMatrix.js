"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamScheduleMatrix = TeamScheduleMatrix;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const clsx_1 = __importDefault(require("clsx"));
const Avatar_1 = require("@/components/ui/Avatar");
const HoverTip_1 = require("@/components/ui/HoverTip");
const schedule_view_1 = require("@/lib/schedule-view");
const LAYOUT = {
    dateCol: 88,
    statCol: 56,
    monthBarH: {
        month: 28,
        "90days": 26,
        "6months": 26,
    },
    producerCol: {
        week: 58,
        month: 52,
        "90days": 48,
        "6months": 44,
    },
    barMax: {
        week: 48,
        month: 28,
        "90days": 24,
        "6months": 20,
    },
    headerH: {
        week: 88,
        month: 86,
        "90days": 84,
        "6months": 84,
    },
    rowH: {
        week: 34,
        month: 32,
        "90days": 30,
        "6months": 30,
    },
};
function DateColumnCell({ column, range, }) {
    const { top, day, title, emphasizeTop } = (0, schedule_view_1.formatMatrixDateCell)(column, range);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "w-full text-center leading-none", title: title, children: [(0, jsx_runtime_1.jsx)("p", { className: (0, clsx_1.default)("truncate text-[9px] font-medium uppercase tracking-wide", emphasizeTop || column.isToday
                    ? "text-brand-signature"
                    : "text-brand-ink-tertiary"), children: top }), (0, jsx_runtime_1.jsx)("p", { className: (0, clsx_1.default)("mt-0.5 truncate text-[13px] font-semibold tabular-nums", column.isToday ? "text-brand-signature" : "text-brand-ink"), children: day })] }));
}
function ScheduleCellButton({ cell, range, selected, onClick, }) {
    const isWeek = range === "week";
    const isOff = cell.status === "off";
    const bookings = cell.bookings ?? (cell.booking ? [cell.booking] : []);
    if (bookings.length > 1) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "flex w-full flex-col gap-0.5 items-center justify-center", children: bookings.map((b, idx) => ((0, jsx_runtime_1.jsx)(HoverTip_1.HoverTip, { className: "w-full justify-center", placement: "top", content: (0, jsx_runtime_1.jsxs)("div", { className: "min-w-[160px]", children: [(0, jsx_runtime_1.jsxs)("p", { className: "text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-signature", children: [(0, schedule_view_1.statusLabel)(cell.status), " ", bookings.length > 1 ? `(#${idx + 1})` : ""] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[12px] font-medium leading-snug text-brand-ink", children: b.work }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1.5 text-[11px] text-brand-ink-secondary", children: ["Until ", b.until] })] }), children: (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClick, className: (0, clsx_1.default)("mx-auto w-full rounded-md transition-all duration-150 hover:scale-[1.04] hover:ring-1", isWeek ? "h-2.5 max-h-3" : "h-2", "bg-gradient-to-b from-brand-blue to-brand-signature shadow-[0_1px_2px_rgba(15,30,45,0.18)] hover:ring-brand-blue/40", selected && "ring-2 ring-brand-orange ring-offset-1 ring-offset-white"), style: { maxWidth: LAYOUT.barMax[range] }, "aria-label": `${(0, schedule_view_1.statusLabel)(cell.status)}: ${b.work}, until ${b.until}` }) }, b.mixId ?? `${cell.key}-${idx}`))) }));
    }
    const booking = bookings[0] ?? cell.booking;
    const button = ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClick, title: booking
            ? undefined
            : `${cell.dayLabel} ${cell.dateLabel} · ${(0, schedule_view_1.statusLabel)(cell.status)}`, className: (0, clsx_1.default)("mx-auto w-full rounded-md transition-all duration-150 hover:scale-[1.04] hover:ring-1", isWeek ? "h-6 max-h-8 min-h-5" : "h-3.5", isOff
            ? "bg-brand-orange/80 shadow-[0_1px_2px_rgba(240,120,64,0.16)] hover:ring-brand-orange/30"
            : cell.unavailable
                ? "bg-gradient-to-b from-brand-blue to-brand-signature shadow-[0_1px_2px_rgba(15,30,45,0.18)] hover:ring-brand-blue/40"
                : "bg-emerald-50/80 ring-1 ring-inset ring-emerald-400/60 shadow-[0_1px_2px_rgba(16,185,129,0.12)] hover:bg-emerald-100 hover:ring-emerald-500/70", selected &&
            "ring-2 ring-brand-orange ring-offset-1 ring-offset-white"), style: { maxWidth: LAYOUT.barMax[range] }, "aria-label": booking
            ? `${(0, schedule_view_1.statusLabel)(cell.status)}: ${booking.work}, until ${booking.until}`
            : `${cell.dayLabel} ${cell.dateLabel}, ${(0, schedule_view_1.statusLabel)(cell.status)}` }));
    if (!booking)
        return button;
    return ((0, jsx_runtime_1.jsx)(HoverTip_1.HoverTip, { className: "w-full justify-center", placement: "top", content: (0, jsx_runtime_1.jsxs)("div", { className: "min-w-[160px]", children: [(0, jsx_runtime_1.jsx)("p", { className: (0, clsx_1.default)("text-[10px] font-semibold uppercase tracking-[0.06em]", isOff ? "text-brand-orange" : "text-brand-signature"), children: (0, schedule_view_1.statusLabel)(cell.status) }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[12px] font-medium leading-snug text-brand-ink", children: booking.work }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1.5 text-[11px] text-brand-ink-secondary", children: ["Until ", booking.until] })] }), children: button }));
}
function TeamScheduleMatrix({ rows, columns, range, activeProducerId, onSelectProducer, emptyMessage = "No producers in this view.", className, }) {
    const isWeek = range === "week";
    const showMonthBars = !isWeek;
    const hasProducers = rows.length > 0;
    const monthGroups = (0, react_1.useMemo)(() => (showMonthBars ? (0, schedule_view_1.buildMatrixMonthGroups)(columns) : []), [columns, showMonthBars]);
    const producerRows = (0, react_1.useMemo)(() => {
        return rows.map((row) => ({
            row,
            availableCount: row.cells.filter((cell) => !cell.unavailable).length,
            bookingCount: row.cells.reduce((acc, cell) => acc + (cell.bookings?.length ?? (cell.unavailable ? 1 : 0)), 0),
            entries: columns.map((column, dayIndex) => ({
                column,
                cell: row.cells[dayIndex],
            })),
        }));
    }, [columns, rows]);
    const producerCount = hasProducers ? rows.length : 1;
    const dayCount = Math.max(columns.length, 1);
    const producerLabelCol = LAYOUT.dateCol;
    const statCol = LAYOUT.statCol;
    const dayCol = LAYOUT.producerCol[range];
    const monthBarH = isWeek ? 0 : LAYOUT.monthBarH[range];
    const stickyStatCount = 2;
    const matrixWidth = producerLabelCol + statCol * stickyStatCount + dayCount * dayCol;
    const gridTemplateColumns = (0, react_1.useMemo)(() => {
        return `${producerLabelCol}px ${statCol}px ${statCol}px repeat(${dayCount}, minmax(${dayCol}px, 1fr))`;
    }, [dayCol, dayCount, producerLabelCol, statCol]);
    const gridTemplateRows = (0, react_1.useMemo)(() => {
        const parts = [`${LAYOUT.headerH[range]}px`];
        if (showMonthBars) {
            parts.push(`${monthBarH}px`);
        }
        parts.push(`repeat(${producerCount}, minmax(0, 1fr))`);
        return parts.join(" ");
    }, [monthBarH, producerCount, range, showMonthBars]);
    const producerStickyLeft = 0;
    const freeStickyLeft = producerLabelCol;
    const bookingsStickyLeft = producerLabelCol + statCol;
    const dateColOffset = 3;
    const bodyGridRow = showMonthBars ? 3 : 2;
    const emptyBodyTop = LAYOUT.headerH[range] + (showMonthBars ? monthBarH : 0);
    const emptyStateOverlay = !hasProducers ? ((0, jsx_runtime_1.jsx)("div", { className: "pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-center justify-center px-6", style: { top: emptyBodyTop }, children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-md text-center", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: emptyMessage }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[12px] leading-relaxed text-brand-ink-tertiary", children: "Try another team filter or add a producer with this specialty." })] }) })) : null;
    const grid = ((0, jsx_runtime_1.jsxs)("div", { className: "schedule-matrix-grid grid min-h-0 w-full min-w-0 flex-1 text-[11px]", style: {
            minWidth: matrixWidth,
            minHeight: "100%",
            height: "100%",
            gridTemplateColumns,
            gridTemplateRows,
        }, children: [(0, jsx_runtime_1.jsx)("div", { className: "schedule-chrome-header sticky left-0 top-0 z-40 flex items-center justify-center border-r border-brand-line/60 px-2 py-2", children: (0, jsx_runtime_1.jsx)("p", { className: "text-center text-[9px] font-bold uppercase tracking-[0.06em] text-brand-ink-tertiary", children: "Producer" }) }), (0, jsx_runtime_1.jsx)("div", { className: "schedule-chrome-header sticky top-0 z-40 flex items-center justify-center border-r border-brand-line/60 px-1 py-2 text-center", style: { left: freeStickyLeft }, children: (0, jsx_runtime_1.jsx)("p", { className: "text-[9px] font-bold uppercase leading-tight tracking-[0.06em] text-brand-ink-tertiary", children: "Free" }) }), (0, jsx_runtime_1.jsx)("div", { className: "schedule-chrome-header sticky top-0 z-40 flex items-center justify-center border-r border-brand-line/60 px-1 py-2 text-center", style: { left: bookingsStickyLeft }, children: (0, jsx_runtime_1.jsx)("p", { className: "text-[9px] font-bold uppercase leading-tight tracking-[0.06em] text-brand-ink-tertiary", children: "Booked" }) }), columns.map((column, index) => {
                const isLast = index === columns.length - 1;
                return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("schedule-chrome-header sticky top-0 z-30 flex items-center justify-center border-r border-brand-line/60 px-1 py-2", isLast && "border-r-0"), children: (0, jsx_runtime_1.jsx)(DateColumnCell, { column: column, range: range }) }, column.key));
            }), showMonthBars ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "sticky left-0 z-20 border-b border-r border-brand-line/60 bg-brand-bg-subtle/95" }), (0, jsx_runtime_1.jsx)("div", { className: "sticky z-20 border-b border-r border-brand-line/60 bg-brand-bg-subtle/95", style: { left: freeStickyLeft } }), (0, jsx_runtime_1.jsx)("div", { className: "sticky z-20 border-b border-r border-brand-line/60 bg-brand-bg-subtle/95", style: { left: bookingsStickyLeft } }), monthGroups.map((group) => ((0, jsx_runtime_1.jsx)("div", { className: "sticky z-[25] flex items-center border-b border-r border-brand-line/60 bg-brand-bg-subtle/95 px-3", style: {
                            gridColumn: `${group.startIndex + dateColOffset + 1} / span ${group.rowCount}`,
                            top: LAYOUT.headerH[range],
                            height: monthBarH,
                            minHeight: monthBarH,
                        }, children: (0, jsx_runtime_1.jsx)("p", { className: "text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-ink-secondary", children: group.label }) }, group.key)))] })) : null, !hasProducers ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "sticky left-0 z-20 h-full min-h-0 self-stretch border-b border-r border-brand-line/60 bg-white", style: { gridRow: bodyGridRow } }), (0, jsx_runtime_1.jsx)("div", { className: "sticky z-20 h-full min-h-0 self-stretch border-b border-r border-brand-line/60 bg-white", style: { left: freeStickyLeft, gridRow: bodyGridRow } }), (0, jsx_runtime_1.jsx)("div", { className: "sticky z-20 h-full min-h-0 self-stretch border-b border-r border-brand-line/60 bg-white", style: { left: bookingsStickyLeft, gridRow: bodyGridRow } }), columns.map((column, index) => {
                        const isLast = index === columns.length - 1;
                        return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("h-full min-h-0 self-stretch border-b border-r border-brand-line/20 bg-white", isLast && "border-r-0"), style: { gridRow: bodyGridRow } }, column.key));
                    })] })) : null, hasProducers
                ? producerRows.map(({ row, availableCount, bookingCount, entries }, rowIndex) => {
                    const isActive = row.producer.id === activeProducerId;
                    const isLastRow = rowIndex === producerRows.length - 1;
                    return ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onSelectProducer(row), title: row.producer.name, className: (0, clsx_1.default)("sticky left-0 z-20 flex h-full min-h-0 min-w-0 w-full flex-col items-center justify-center gap-1 self-stretch overflow-visible border-b border-r border-brand-line/60 bg-white px-0.5 py-1.5 transition hover:bg-brand-blue-soft/30", isLastRow && "border-b-0", isActive && "bg-brand-orange-soft/40 hover:bg-brand-orange-soft/40"), children: [(0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("shrink-0 rounded-full ring-1 ring-offset-1 ring-offset-white", isActive ? "ring-brand-orange/60" : "ring-brand-blue/30"), children: (0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { src: row.producer.avatar, alt: row.producer.name, size: "sm" }) }), (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("max-w-full shrink-0 truncate text-[10px] font-bold leading-none", isActive ? "text-brand-orange-deep" : "text-brand-ink-secondary"), children: row.producer.initials })] }), (0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("sticky z-20 flex h-full min-h-0 items-center self-stretch border-b border-r border-brand-line/70 bg-white px-1 py-1.5", isLastRow && "border-b-0"), style: { left: freeStickyLeft }, children: (0, jsx_runtime_1.jsx)("p", { className: (0, clsx_1.default)("w-full text-center text-[11px] font-medium tabular-nums leading-none", availableCount === columns.length
                                        ? "text-brand-signature"
                                        : availableCount === 0
                                            ? "text-brand-orange"
                                            : "text-brand-ink-secondary"), title: `${availableCount} free days in view`, children: availableCount }) }), (0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("sticky z-20 flex h-full min-h-0 items-center self-stretch border-b border-r border-brand-line/70 bg-white px-1 py-1.5", isLastRow && "border-b-0"), style: { left: bookingsStickyLeft }, children: (0, jsx_runtime_1.jsx)("p", { className: (0, clsx_1.default)("w-full text-center text-[11px] tabular-nums leading-none", bookingCount === 0
                                        ? "text-brand-ink-tertiary"
                                        : "text-brand-orange"), title: `${bookingCount} bookings in view`, children: bookingCount }) }), entries.map(({ column, cell }, entryIndex) => {
                                const isLastCol = entryIndex === entries.length - 1;
                                return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("group/cell flex h-full min-h-0 min-w-0 items-center justify-center self-stretch border-b border-r border-brand-line/20 bg-white px-0.5 py-1 transition-colors", isLastRow && "border-b-0", isLastCol && "border-r-0", isActive
                                        ? "bg-brand-orange-soft/40"
                                        : "hover:bg-brand-blue-soft/25"), children: (0, jsx_runtime_1.jsx)(ScheduleCellButton, { cell: cell, range: range, selected: isActive && cell.key === column.key, onClick: () => onSelectProducer(row, cell) }) }, `${row.producer.id}-${column.key}`));
                            })] }, row.producer.id));
                })
                : null] }));
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("dashboard-panel dashboard-panel-framed flex h-full min-h-0 w-full flex-col overflow-hidden", className), style: {
            width: "100%",
            height: "100%",
            maxHeight: "100%",
            minHeight: 0,
        }, children: (0, jsx_runtime_1.jsxs)("div", { className: "relative flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-hidden", children: [grid, emptyStateOverlay] }) }));
}
