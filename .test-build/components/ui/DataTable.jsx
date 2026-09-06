"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataTable = DataTable;
const clsx_1 = __importDefault(require("clsx"));
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const DottedScroll_1 = require("@/components/ui/DottedScroll");
function DataTable({ columns, data, rowKey, href, onRowClick, emptyMessage = "No results found.", variant = "default", pageSize, embedded = false, compact = false, showScrollIndicator = true, }) {
    const router = (0, navigation_1.useRouter)();
    const [page, setPage] = (0, react_1.useState)(0);
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
    const stickyClass = (sticky, header = false) => sticky === "right"
        ? (0, clsx_1.default)("sticky right-0 z-10 shadow-[-6px_0_10px_-8px_rgba(15,30,45,0.18)]", header ? "bg-[inherit]" : "bg-brand-elevated", variant === "muted" && !header && "bg-brand-surface")
        : sticky === "left"
            ? (0, clsx_1.default)("sticky left-0 z-10 shadow-[6px_0_10px_-8px_rgba(15,30,45,0.18)]", header ? "bg-[inherit]" : "bg-brand-elevated", variant === "muted" && !header && "bg-brand-surface")
            : undefined;
    return (<div className={(0, clsx_1.default)("w-full min-w-0", embedded ? "" : "surface-premium overflow-hidden rounded-2xl")}>
      <DottedScroll_1.DottedScroll orientation="horizontal" scrollClassName="w-full overflow-x-scroll scrollbar-hide" indicatorPlacement="below" contentClassName="block w-max min-w-full" showIndicator={showScrollIndicator}>
        <table className="w-full min-w-max border-collapse">
          <colgroup>
            {columns.map((col) => (<col key={col.key} style={{ width: col.width ?? "auto" }}/>))}
          </colgroup>
          <thead>
            <tr className="table-header-row">
              {columns.map((col) => (<th key={col.key} scope="col" className={(0, clsx_1.default)(headerCellClass, "table-header-label table-header-cell border-r last:border-r-0", alignClass(col.align), stickyClass(col.sticky, true), col.headerClassName)}>
                  {col.header}
                </th>))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (<tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center text-[13px] font-medium text-brand-ink-tertiary">
                  {emptyMessage}
                </td>
              </tr>) : (visibleData.map((row, rowOffset) => {
            const rowIndex = rangeStart - 1 + rowOffset;
            return (<tr key={rowKey(row)} className={(0, clsx_1.default)("border-b border-brand-line-strong transition-colors last:border-b-0", embedded
                    ? "dashboard-table-row"
                    : (0, clsx_1.default)("bg-brand-elevated", variant === "muted" && "bg-brand-surface"), isInteractive && "cursor-pointer hover:bg-brand-blue-soft/25")} onClick={isInteractive ? (event) => handleRowClick(row, event) : undefined}>
                  {columns.map((col) => (<td key={col.key} className={(0, clsx_1.default)(cellClass, textSize, alignClass(col.align), "border-r border-brand-line-strong align-middle last:border-r-0", col.nowrap !== false &&
                        "max-w-0 truncate whitespace-nowrap", stickyClass(col.sticky), col.cellClassName)}>
                      {col.render(row, rowIndex)}
                    </td>))}
                </tr>);
        }))}
          </tbody>
        </table>
      </DottedScroll_1.DottedScroll>

      {pageSize && pageSize > 0 && data.length > pageSize ? (<div className={(0, clsx_1.default)("flex items-center justify-between gap-3 border-t border-brand-line-strong px-4 py-3", embedded ? "dashboard-table-footer" : "bg-brand-elevated/50")}>
          <p className="text-[12px] font-medium text-brand-ink-tertiary">
            {rangeStart}–{rangeEnd} of {data.length}
          </p>
          <div className="flex items-center gap-1.5">
            <button type="button" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-ink-secondary transition hover:bg-brand-bg hover:text-brand-ink disabled:opacity-30" aria-label="Previous page">
              <lucide_react_1.ChevronLeft className="h-4 w-4" strokeWidth={2}/>
            </button>
            <span className="min-w-[4.5rem] text-center text-[12px] font-semibold tabular-nums text-brand-ink-secondary">
              {safePage + 1} / {totalPages}
            </span>
            <button type="button" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-ink-secondary transition hover:bg-brand-bg hover:text-brand-ink disabled:opacity-30" aria-label="Next page">
              <lucide_react_1.ChevronRight className="h-4 w-4" strokeWidth={2}/>
            </button>
          </div>
        </div>) : null}
    </div>);
}
