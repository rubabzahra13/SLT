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
        today: 28,
        month: 28,
        "90days": 26,
        "6months": 26,
    },
    producerCol: {
        today: 58,
        week: 58,
        month: 54,
        "90days": 52,
        "6months": 48,
    },
    barMax: {
        today: 48,
        week: 48,
        month: 34,
        "90days": 34,
        "6months": 30,
    },
    headerH: {
        today: 88,
        week: 88,
        month: 86,
        "90days": 84,
        "6months": 84,
    },
    rowH: {
        today: 58,
        week: 58,
        month: 58,
        "90days": 58,
        "6months": 58,
    },
};
function scheduleStatusTooltipTone(status) {
    if (status === "off")
        return "text-brand-orange";
    if (status === "capacity")
        return "text-amber-600";
    return "text-brand-signature";
}
function BookingTooltipContent({ cell, booking, index, total, }) {
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("p", { className: (0, clsx_1.default)("text-[10px] font-semibold uppercase tracking-[0.06em]", scheduleStatusTooltipTone(cell.status)), children: [(0, schedule_view_1.statusLabel)(cell.status), total && total > 1 && index != null ? ` (#${index + 1})` : ""] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[12px] font-medium leading-snug text-brand-ink", children: booking.work }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1.5 text-[11px] text-brand-ink-secondary", children: ["Until ", booking.until] })] }));
}
function MultiBookingTooltipContent({ cell, bookings, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "min-w-[180px]", children: [(0, jsx_runtime_1.jsxs)("p", { className: (0, clsx_1.default)("text-[10px] font-semibold uppercase tracking-[0.06em]", scheduleStatusTooltipTone(cell.status)), children: [(0, schedule_view_1.statusLabel)(cell.status), " \u00B7 ", bookings.length, " mixes"] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-2 max-h-48 space-y-2 overflow-y-auto pr-1", children: bookings.map((booking, index) => ((0, jsx_runtime_1.jsx)("div", { className: "rounded-lg border border-brand-line/60 bg-brand-surface/80 px-2.5 py-2", children: (0, jsx_runtime_1.jsx)(BookingTooltipContent, { cell: cell, booking: booking, index: index, total: bookings.length }) }, booking.mixId ?? `${cell.key}-${index}`))) })] }));
}
function DateColumnCell({ column, range, }) {
    const { top, day, title, emphasizeTop } = (0, schedule_view_1.formatMatrixDateCell)(column, range);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "w-full text-center leading-none", title: title, children: [(0, jsx_runtime_1.jsx)("p", { className: (0, clsx_1.default)("truncate text-[9px] font-medium uppercase tracking-wide", emphasizeTop || column.isToday
                    ? "text-brand-signature"
                    : "text-brand-ink-tertiary"), children: top }), (0, jsx_runtime_1.jsx)("p", { className: (0, clsx_1.default)("mt-0.5 truncate text-[13px] font-semibold tabular-nums", column.isToday ? "text-brand-signature" : "text-brand-ink"), children: day })] }));
}
function scheduleCellBarHeightClass(range, stretchRows = false) {
    if (stretchRows && (range === "week" || range === "today")) {
        return "h-8 max-h-14 min-h-6";
    }
    if (range === "week" || range === "today")
        return "h-6 max-h-8 min-h-5";
    return "h-5 min-h-[18px]";
}
function scheduleCellBarClass(cell, range, stretchRows = false) {
    return (0, clsx_1.default)("mx-auto flex w-full items-center justify-center rounded-md transition-all duration-150 hover:scale-[1.04] hover:ring-1", scheduleCellBarHeightClass(range, stretchRows), cell.status === "off"
        ? "bg-brand-orange/80 shadow-[0_1px_2px_rgba(240,120,64,0.16)] hover:ring-brand-orange/30"
        : cell.status === "capacity"
            ? "bg-amber-400/85 shadow-[0_1px_2px_rgba(245,158,11,0.20)] hover:ring-amber-400/40"
            : cell.status === "mix"
                ? "bg-gradient-to-b from-brand-blue to-brand-signature shadow-[0_1px_2px_rgba(15,30,45,0.18)] hover:ring-brand-blue/40"
                : "bg-cyan-50/80 ring-1 ring-inset ring-cyan-400/60 shadow-[0_1px_2px_rgba(6,182,212,0.12)] hover:bg-cyan-100 hover:ring-cyan-500/70");
}
function scheduleCellCountClass(status, range) {
    const sizeClass = range === "week" || range === "today" ? "text-[11px]" : "text-[10px]";
    return (0, clsx_1.default)("pointer-events-none font-semibold tabular-nums leading-none", sizeClass, status === "available"
        ? "text-brand-signature"
        : status === "capacity"
            ? "text-amber-950"
            : "text-white");
}
function ScheduleCellButton({ cell, range, selected, stretchRows = false, onClick, }) {
    if (cell.filteredOut) {
        return (0, jsx_runtime_1.jsx)("span", { className: "block w-full", "aria-hidden": true });
    }
    const bookings = cell.bookings ?? (cell.booking ? [cell.booking] : []);
    const booking = bookings[0] ?? cell.booking;
    const showCount = bookings.length > 1;
    const wrapWithTooltip = (node, content) => ((0, jsx_runtime_1.jsx)(HoverTip_1.HoverTip, { className: "w-full justify-center", placement: "top", content: content, children: node }));
    const selectedRing = selected && "ring-2 ring-brand-orange ring-offset-1 ring-offset-white";
    const button = ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClick, title: booking && !showCount
            ? undefined
            : `${cell.dayLabel} ${cell.dateLabel} · ${(0, schedule_view_1.statusLabel)(cell.status)}`, className: (0, clsx_1.default)(scheduleCellBarClass(cell, range, stretchRows), selectedRing), style: {
            maxWidth: stretchRows ? Math.min(LAYOUT.barMax[range] * 1.35, 72) : LAYOUT.barMax[range],
        }, "aria-label": showCount
            ? `${(0, schedule_view_1.statusLabel)(cell.status)}: ${bookings.length} mixes on ${cell.dayLabel}, ${cell.dateLabel}`
            : booking
                ? `${(0, schedule_view_1.statusLabel)(cell.status)}: ${booking.work}, until ${booking.until}`
                : `${cell.dayLabel} ${cell.dateLabel}, ${(0, schedule_view_1.statusLabel)(cell.status)}`, children: showCount ? ((0, jsx_runtime_1.jsx)("span", { className: scheduleCellCountClass(cell.status, range), children: bookings.length })) : null }));
    if (showCount) {
        return wrapWithTooltip(button, (0, jsx_runtime_1.jsx)(MultiBookingTooltipContent, { cell: cell, bookings: bookings }));
    }
    if (!booking)
        return button;
    return wrapWithTooltip(button, (0, jsx_runtime_1.jsx)("div", { className: "min-w-[160px]", children: (0, jsx_runtime_1.jsx)(BookingTooltipContent, { cell: cell, booking: booking }) }));
}
function TeamScheduleMatrix({ rows, columns, range, statusFilter = "all", activeProducerId, onSelectProducer, emptyMessage = "No producers in this view.", className, }) {
    const isWeek = range === "week";
    const showMonthBars = !isWeek;
    const showStatColumns = statusFilter === "all";
    const hasProducers = rows.length > 0;
    const monthGroups = (0, react_1.useMemo)(() => (showMonthBars ? (0, schedule_view_1.buildMatrixMonthGroups)(columns) : []), [columns, showMonthBars]);
    const producerRows = (0, react_1.useMemo)(() => {
        return rows.map((row) => ({
            row,
            availableCount: row.cells.filter((cell) => !cell.filteredOut && cell.status === "available").length,
            bookingCount: row.cells.filter((cell) => !cell.filteredOut &&
                (cell.status === "mix" || cell.status === "capacity")).length,
            offCount: row.cells.filter((cell) => !cell.filteredOut && cell.status === "off").length,
            entries: columns.map((column) => ({
                column,
                cell: row.cells.find((cell) => cell.key === column.key) ??
                    row.cells[columns.indexOf(column)],
            })),
        }));
    }, [columns, rows]);
    const producerCount = rows.length;
    const shouldStretchRows = producerCount > 2;
    const scrollRef = (0, react_1.useRef)(null);
    const [containerHeight, setContainerHeight] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const el = scrollRef.current;
        if (!el || !shouldStretchRows) {
            setContainerHeight(null);
            return;
        }
        const updateHeight = () => setContainerHeight(el.clientHeight);
        updateHeight();
        const resizeObserver = new ResizeObserver(updateHeight);
        resizeObserver.observe(el);
        window.addEventListener("resize", updateHeight);
        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", updateHeight);
        };
    }, [shouldStretchRows, producerCount, columns.length, showStatColumns]);
    const dayCount = Math.max(columns.length, 1);
    const producerLabelCol = LAYOUT.dateCol;
    const statCol = LAYOUT.statCol;
    const dayCol = LAYOUT.producerCol[range];
    const monthBarH = isWeek ? 0 : LAYOUT.monthBarH[range];
    const stickyStatCount = showStatColumns ? 3 : 0;
    const dateColOffset = showStatColumns ? 4 : 1;
    const matrixWidth = producerLabelCol +
        statCol * stickyStatCount +
        dayCount * dayCol;
    const gridTemplateColumns = (0, react_1.useMemo)(() => {
        const statCols = showStatColumns ? `${statCol}px ${statCol}px ${statCol}px ` : "";
        return `${producerLabelCol}px ${statCols}repeat(${dayCount}, minmax(${dayCol}px, 1fr))`;
    }, [dayCol, dayCount, producerLabelCol, showStatColumns, statCol]);
    const gridTemplateRows = (0, react_1.useMemo)(() => {
        const parts = [`${LAYOUT.headerH[range]}px`];
        if (showMonthBars) {
            parts.push(`${monthBarH}px`);
        }
        if (producerCount > 0) {
            const minRowHeight = LAYOUT.rowH[range];
            let rowHeight = minRowHeight;
            if (shouldStretchRows && containerHeight != null) {
                const chromeHeight = LAYOUT.headerH[range] + (showMonthBars ? monthBarH : 0);
                const available = containerHeight - chromeHeight;
                rowHeight = Math.max(minRowHeight, Math.floor(available / producerCount));
            }
            parts.push(`repeat(${producerCount}, ${rowHeight}px)`);
        }
        return parts.join(" ");
    }, [
        containerHeight,
        monthBarH,
        producerCount,
        range,
        showMonthBars,
        shouldStretchRows,
    ]);
    const producerStickyLeft = 0;
    const freeStickyLeft = producerLabelCol;
    const bookedStickyLeft = producerLabelCol + statCol;
    const offStickyLeft = producerLabelCol + statCol * 2;
    const bodyGridRow = showMonthBars ? 3 : 2;
    const grid = ((0, jsx_runtime_1.jsxs)("div", { className: "schedule-matrix-grid grid w-full min-w-0 text-[11px]", style: {
            minWidth: matrixWidth,
            gridTemplateColumns,
            gridTemplateRows,
            ...(shouldStretchRows && containerHeight != null
                ? { minHeight: containerHeight }
                : {}),
        }, children: [(0, jsx_runtime_1.jsx)("div", { className: "schedule-chrome-header sticky left-0 top-0 z-40 flex items-center justify-center border-r border-brand-line/60 px-2 py-2", children: (0, jsx_runtime_1.jsx)("p", { className: "text-center text-[9px] font-bold uppercase tracking-[0.06em] text-brand-ink-tertiary", children: "Producer" }) }), showStatColumns ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "schedule-chrome-header sticky top-0 z-40 flex items-center justify-center border-r border-brand-line/60 px-1 py-2 text-center", style: { left: freeStickyLeft }, children: (0, jsx_runtime_1.jsx)("p", { className: "text-[9px] font-bold uppercase leading-tight tracking-[0.06em] text-brand-ink-tertiary", children: "Free" }) }), (0, jsx_runtime_1.jsx)("div", { className: "schedule-chrome-header sticky top-0 z-40 flex items-center justify-center border-r border-brand-line/60 px-1 py-2 text-center", style: { left: bookedStickyLeft }, children: (0, jsx_runtime_1.jsx)("p", { className: "text-[9px] font-bold uppercase leading-tight tracking-[0.06em] text-brand-ink-tertiary", children: "Booked" }) }), (0, jsx_runtime_1.jsx)("div", { className: "schedule-chrome-header sticky top-0 z-40 flex items-center justify-center border-r border-brand-line/60 px-1 py-2 text-center", style: { left: offStickyLeft }, children: (0, jsx_runtime_1.jsx)("p", { className: "text-[9px] font-bold uppercase leading-tight tracking-[0.06em] text-brand-ink-tertiary", children: "Off" }) })] })) : null, columns.map((column, index) => {
                const isLast = index === columns.length - 1;
                return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("schedule-chrome-header sticky top-0 z-30 flex items-center justify-center border-r border-brand-line/60 px-1 py-2", isLast && "border-r-0"), children: (0, jsx_runtime_1.jsx)(DateColumnCell, { column: column, range: range }) }, column.key));
            }), showMonthBars ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "sticky left-0 z-20 border-b border-r border-brand-line/60 bg-brand-bg-subtle/95" }), showStatColumns ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "sticky z-20 border-b border-r border-brand-line/60 bg-brand-bg-subtle/95", style: { left: freeStickyLeft } }), (0, jsx_runtime_1.jsx)("div", { className: "sticky z-20 border-b border-r border-brand-line/60 bg-brand-bg-subtle/95", style: { left: bookedStickyLeft } }), (0, jsx_runtime_1.jsx)("div", { className: "sticky z-20 border-b border-r border-brand-line/60 bg-brand-bg-subtle/95", style: { left: offStickyLeft } })] })) : null, monthGroups.map((group) => ((0, jsx_runtime_1.jsx)("div", { className: "sticky z-[25] flex items-center border-b border-r border-brand-line/60 bg-brand-bg-subtle/95 px-3", style: {
                            gridColumn: `${group.startIndex + dateColOffset + 1} / span ${group.rowCount}`,
                            top: LAYOUT.headerH[range],
                            height: monthBarH,
                            minHeight: monthBarH,
                        }, children: (0, jsx_runtime_1.jsx)("p", { className: "text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-ink-secondary", children: group.label }) }, group.key)))] })) : null, producerRows.map(({ row, availableCount, bookingCount, offCount, entries }, rowIndex) => {
                const isActive = row.producer.id === activeProducerId;
                const isLastRow = rowIndex === producerRows.length - 1;
                return ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onSelectProducer(row), title: row.producer.name, className: (0, clsx_1.default)("sticky left-0 z-20 flex h-full min-h-0 min-w-0 w-full flex-col items-center justify-center gap-1 self-stretch overflow-hidden border-b border-r border-brand-line/60 bg-white px-0.5 py-1.5 transition hover:bg-brand-blue-soft/30", isLastRow && "border-b-0", isActive && "bg-brand-orange-soft/40 hover:bg-brand-orange-soft/40"), children: [(0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("shrink-0 rounded-full ring-1 ring-inset ring-offset-0", isActive ? "ring-brand-orange/60" : "ring-brand-blue/30"), children: (0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { producer: row.producer, size: "sm" }) }), (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("max-w-full shrink-0 truncate text-[10px] font-bold leading-none", isActive ? "text-brand-orange-deep" : "text-brand-ink-secondary"), children: row.producer.initials })] }), showStatColumns ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("sticky z-20 flex h-full min-h-0 items-center self-stretch border-b border-r border-brand-line/70 bg-white px-1 py-1.5", isLastRow && "border-b-0"), style: { left: freeStickyLeft }, children: (0, jsx_runtime_1.jsx)("p", { className: (0, clsx_1.default)("w-full text-center text-[11px] font-medium tabular-nums leading-none", availableCount === columns.length
                                            ? "text-brand-signature"
                                            : availableCount === 0
                                                ? "text-brand-orange"
                                                : "text-brand-ink-secondary"), title: `${availableCount} free days in view`, children: availableCount }) }), (0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("sticky z-20 flex h-full min-h-0 items-center self-stretch border-b border-r border-brand-line/70 bg-white px-1 py-1.5", isLastRow && "border-b-0"), style: { left: bookedStickyLeft }, children: (0, jsx_runtime_1.jsx)("p", { className: (0, clsx_1.default)("w-full text-center text-[11px] tabular-nums leading-none", bookingCount === 0
                                            ? "text-brand-ink-tertiary"
                                            : "text-brand-signature"), title: `${bookingCount} booked days in view`, children: bookingCount }) }), (0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("sticky z-20 flex h-full min-h-0 items-center self-stretch border-b border-r border-brand-line/70 bg-white px-1 py-1.5", isLastRow && "border-b-0"), style: { left: offStickyLeft }, children: (0, jsx_runtime_1.jsx)("p", { className: (0, clsx_1.default)("w-full text-center text-[11px] tabular-nums leading-none", offCount === 0
                                            ? "text-brand-ink-tertiary"
                                            : "text-brand-orange-deep"), title: `${offCount} off days in view`, children: offCount }) })] })) : null, entries.map(({ column, cell }, entryIndex) => {
                            const isLastCol = entryIndex === entries.length - 1;
                            return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("group/cell flex h-full min-h-0 min-w-0 items-center justify-center self-stretch border-b border-r border-brand-line/35 bg-white px-0.5 py-1 transition-colors", isLastRow && "border-b-0", isLastCol && "border-r-0", isActive
                                    ? "bg-brand-orange-soft/40"
                                    : "hover:bg-brand-blue-soft/25"), children: (0, jsx_runtime_1.jsx)(ScheduleCellButton, { cell: cell, range: range, stretchRows: shouldStretchRows, selected: isActive && cell.key === column.key, onClick: () => onSelectProducer(row, cell) }) }, `${row.producer.id}-${column.key}`));
                        })] }, row.producer.id));
            })] }));
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("dashboard-panel dashboard-panel-framed flex h-full min-h-0 w-full flex-col overflow-hidden", className), style: {
            width: "100%",
            height: "100%",
            maxHeight: "100%",
            minHeight: 0,
        }, children: (0, jsx_runtime_1.jsx)("div", { ref: scrollRef, className: (0, clsx_1.default)("relative flex min-h-0 flex-1 flex-col overflow-auto", shouldStretchRows && hasProducers && "overflow-x-auto"), children: hasProducers ? (grid) : ((0, jsx_runtime_1.jsx)("div", { className: "flex flex-1 items-center justify-center px-6 py-12", children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-md text-center", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: emptyMessage }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[12px] leading-relaxed text-brand-ink-tertiary", children: "Try another team filter or add a producer with this specialty." })] }) })) }) }));
}
