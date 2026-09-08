"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataTable = DataTable;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const DottedScroll_1 = require("@/components/ui/DottedScroll");
const MIN_STRETCH_ROW_HEIGHT = 44;
function DataTable({ columns, data, rowKey, href, onRowClick, emptyMessage = "No results found.", variant = "default", pageSize, embedded = false, compact = false, showScrollIndicator = true, stretchRows = false, stretchRowsMinCount = 3, className, }) {
    const router = (0, navigation_1.useRouter)();
    const [page, setPage] = (0, react_1.useState)(0);
    const containerRef = (0, react_1.useRef)(null);
    const theadRef = (0, react_1.useRef)(null);
    const [layoutHeight, setLayoutHeight] = (0, react_1.useState)(null);
    const [headerHeight, setHeaderHeight] = (0, react_1.useState)(0);
    (0, react_1.useEffect)(() => {
        setPage(0);
    }, [data.length, pageSize]);
    const totalPages = pageSize && pageSize > 0 ? Math.max(1, Math.ceil(data.length / pageSize)) : 1;
    const safePage = Math.min(page, totalPages - 1);
    const visibleData = (0, react_1.useMemo)(() => {
        if (!pageSize || pageSize <= 0)
            return data;
        const start = safePage * pageSize;
        return data.slice(start, start + pageSize);
    }, [data, pageSize, safePage]);
    const rangeStart = pageSize && pageSize > 0 ? safePage * pageSize + 1 : 1;
    const rangeEnd = pageSize && pageSize > 0
        ? Math.min(data.length, (safePage + 1) * pageSize)
        : data.length;
    const cellClass = compact ? "px-3 py-2" : "px-4 py-3";
    const headerCellClass = compact ? "px-3 py-2.5" : "px-4 py-3";
    const textSize = compact ? "text-[12px]" : "text-[13px]";
    const alignClass = (align) => (0, clsx_1.default)(align === "right" && "text-right", align === "center" && "text-center", !align && "text-left");
    const isInteractiveTarget = (target) => target instanceof Element &&
        Boolean(target.closest('button, a, input, select, textarea, label, [role="button"], [role="combobox"], [role="listbox"], [data-stop-row-nav]'));
    const handleRowClick = (row, event) => {
        if (isInteractiveTarget(event.target))
            return;
        const target = href?.(row);
        if (target) {
            router.push(target);
            return;
        }
        onRowClick?.(row);
    };
    const isInteractive = Boolean(href || onRowClick);
    const shouldStretchRows = stretchRows && visibleData.length >= stretchRowsMinCount;
    (0, react_1.useEffect)(() => {
        const container = containerRef.current;
        if (!container || !shouldStretchRows) {
            setLayoutHeight(null);
            setHeaderHeight(0);
            return;
        }
        const updateLayout = () => {
            setLayoutHeight(container.clientHeight);
            setHeaderHeight(theadRef.current?.offsetHeight ?? 0);
        };
        updateLayout();
        const resizeObserver = new ResizeObserver(updateLayout);
        resizeObserver.observe(container);
        window.addEventListener("resize", updateLayout);
        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", updateLayout);
        };
    }, [shouldStretchRows, visibleData.length, columns.length]);
    const stretchRowHeight = (0, react_1.useMemo)(() => {
        if (!shouldStretchRows || layoutHeight == null || visibleData.length === 0) {
            return undefined;
        }
        const available = layoutHeight - headerHeight;
        return Math.max(MIN_STRETCH_ROW_HEIGHT, Math.floor(available / visibleData.length));
    }, [shouldStretchRows, layoutHeight, headerHeight, visibleData.length]);
    const tableHeight = (0, react_1.useMemo)(() => {
        if (!shouldStretchRows || stretchRowHeight == null || layoutHeight == null) {
            return undefined;
        }
        const contentHeight = headerHeight + stretchRowHeight * visibleData.length;
        return Math.max(layoutHeight, contentHeight);
    }, [
        shouldStretchRows,
        stretchRowHeight,
        layoutHeight,
        headerHeight,
        visibleData.length,
    ]);
    const stickyClass = (sticky, header = false) => sticky === "right"
        ? (0, clsx_1.default)("sticky right-0 z-10 shadow-[-6px_0_10px_-8px_rgba(15,30,45,0.18)]", header ? "bg-[inherit]" : "bg-brand-elevated", variant === "muted" && !header && "bg-brand-surface")
        : sticky === "left"
            ? (0, clsx_1.default)("sticky left-0 z-10 shadow-[6px_0_10px_-8px_rgba(15,30,45,0.18)]", header ? "bg-[inherit]" : "bg-brand-elevated", variant === "muted" && !header && "bg-brand-surface")
            : undefined;
    return ((0, jsx_runtime_1.jsxs)("div", { ref: containerRef, className: (0, clsx_1.default)("w-full min-w-0", embedded ? "" : "surface-premium overflow-hidden rounded-2xl", shouldStretchRows && "flex h-full min-h-0 flex-col", className), children: [(0, jsx_runtime_1.jsx)(DottedScroll_1.DottedScroll, { orientation: "horizontal", scrollClassName: shouldStretchRows
                    ? "min-h-0 w-full flex-1 overflow-x-auto overflow-y-auto"
                    : "w-full overflow-x-auto", indicatorPlacement: "below", contentClassName: shouldStretchRows ? "block min-h-full min-w-full" : "block w-max min-w-full", className: shouldStretchRows ? "min-h-0 flex-1" : undefined, showIndicator: showScrollIndicator, children: (0, jsx_runtime_1.jsxs)("table", { className: "w-full min-w-max border-collapse", style: tableHeight != null
                        ? { minHeight: tableHeight, height: tableHeight }
                        : undefined, children: [(0, jsx_runtime_1.jsx)("colgroup", { children: columns.map((col) => ((0, jsx_runtime_1.jsx)("col", { style: { width: col.width ?? "auto" } }, col.key))) }), (0, jsx_runtime_1.jsx)("thead", { ref: theadRef, children: (0, jsx_runtime_1.jsx)("tr", { className: "table-header-row", children: columns.map((col) => ((0, jsx_runtime_1.jsx)("th", { scope: "col", className: (0, clsx_1.default)(headerCellClass, "table-header-label table-header-cell border-r last:border-r-0", alignClass(col.align), stickyClass(col.sticky, true), col.headerClassName), children: col.header }, col.key))) }) }), (0, jsx_runtime_1.jsx)("tbody", { children: data.length === 0 ? ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsx)("td", { colSpan: columns.length, className: "px-4 py-16 text-center text-[13px] font-medium text-brand-ink-tertiary", children: emptyMessage }) })) : (visibleData.map((row, rowOffset) => {
                                const rowIndex = rangeStart - 1 + rowOffset;
                                return ((0, jsx_runtime_1.jsx)("tr", { style: stretchRowHeight != null
                                        ? { height: stretchRowHeight }
                                        : undefined, className: (0, clsx_1.default)("border-b border-brand-line-strong transition-colors last:border-b-0", embedded
                                        ? "dashboard-table-row"
                                        : (0, clsx_1.default)("bg-brand-elevated", variant === "muted" && "bg-brand-surface"), isInteractive && "cursor-pointer hover:bg-brand-blue-soft/25"), onClick: isInteractive ? (event) => handleRowClick(row, event) : undefined, children: columns.map((col) => ((0, jsx_runtime_1.jsx)("td", { className: (0, clsx_1.default)(cellClass, textSize, alignClass(col.align), "border-r border-brand-line-strong align-middle last:border-r-0", col.nowrap !== false && "max-w-0 truncate whitespace-nowrap", stickyClass(col.sticky), col.cellClassName), children: col.render(row, rowIndex) }, col.key))) }, rowKey(row)));
                            })) })] }) }), pageSize && pageSize > 0 && data.length > pageSize ? ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("flex items-center justify-between gap-3 border-t border-brand-line-strong px-4 py-3", embedded ? "dashboard-table-footer" : "bg-brand-elevated/50"), children: [(0, jsx_runtime_1.jsxs)("p", { className: "text-[12px] font-medium text-brand-ink-tertiary", children: [rangeStart, "\u2013", rangeEnd, " of ", data.length] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", disabled: safePage === 0, onClick: () => setPage((p) => Math.max(0, p - 1)), className: "inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-ink-secondary transition hover:bg-brand-bg hover:text-brand-ink disabled:opacity-30", "aria-label": "Previous page", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronLeft, { className: "h-4 w-4", strokeWidth: 2 }) }), (0, jsx_runtime_1.jsxs)("span", { className: "min-w-[4.5rem] text-center text-[12px] font-semibold tabular-nums text-brand-ink-secondary", children: [safePage + 1, " / ", totalPages] }), (0, jsx_runtime_1.jsx)("button", { type: "button", disabled: safePage >= totalPages - 1, onClick: () => setPage((p) => Math.min(totalPages - 1, p + 1)), "aria-label": "Next page", className: "inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-ink-secondary transition hover:bg-brand-bg hover:text-brand-ink disabled:opacity-30", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { className: "h-4 w-4", strokeWidth: 2 }) })] })] })) : null] }));
}
