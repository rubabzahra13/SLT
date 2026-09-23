"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DottedScroll } from "@/components/ui/DottedScroll";

export type Column<T> = {
  key: string;
  header: string;
  width?: string;
  align?: "left" | "right" | "center";
  nowrap?: boolean;
  sticky?: "left" | "right";
  cellClassName?: string;
  headerClassName?: string;
  render: (row: T, index: number) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  href?: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  variant?: "default" | "muted";
  pageSize?: number;
  embedded?: boolean;
  compact?: boolean;
  showScrollIndicator?: boolean;
  /** When true and row count meets the threshold, rows share the table body height equally. */
  stretchRows?: boolean;
  /** Minimum rows required before stretching (default 3 = more than 2 entries). */
  stretchRowsMinCount?: number;
  className?: string;
  /** rowKey of a row to visually highlight (e.g. a record just moved between tabs). */
  highlightRowKey?: string | null;
  /** Called when the highlight should be dismissed (any click inside the table). */
  onClearHighlight?: () => void;
};

const MIN_STRETCH_ROW_HEIGHT = 44;

export function DataTable<T>({
  columns,
  data,
  rowKey,
  href,
  onRowClick,
  emptyMessage = "No results found.",
  variant = "default",
  pageSize,
  embedded = false,
  compact = false,
  showScrollIndicator = true,
  stretchRows = false,
  stretchRowsMinCount = 3,
  className,
  highlightRowKey,
  onClearHighlight,
}: DataTableProps<T>) {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightRowRef = useRef<HTMLTableRowElement | null>(null);
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const [layoutHeight, setLayoutHeight] = useState<number | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [data.length, pageSize]);

  // Jump to the page that contains the highlighted row so it is actually shown.
  useEffect(() => {
    if (!highlightRowKey || !pageSize || pageSize <= 0) return;
    const index = data.findIndex((row) => rowKey(row) === highlightRowKey);
    if (index >= 0) setPage(Math.floor(index / pageSize));
    // rowKey is a stable accessor; intentionally excluded from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightRowKey, data, pageSize]);

  // Bring the highlighted row into view once it renders.
  useEffect(() => {
    if (highlightRowKey && highlightRowRef.current) {
      highlightRowRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [highlightRowKey, page]);

  const totalPages =
    pageSize && pageSize > 0 ? Math.max(1, Math.ceil(data.length / pageSize)) : 1;
  const safePage = Math.min(page, totalPages - 1);

  const visibleData = useMemo(() => {
    if (!pageSize || pageSize <= 0) return data;
    const start = safePage * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, pageSize, safePage]);

  const rangeStart = pageSize && pageSize > 0 ? safePage * pageSize + 1 : 1;
  const rangeEnd =
    pageSize && pageSize > 0
      ? Math.min(data.length, (safePage + 1) * pageSize)
      : data.length;

  const cellClass = compact ? "px-3 py-2" : "px-4 py-3";
  const headerCellClass = compact ? "px-3 py-2.5" : "px-4 py-3";
  const textSize = compact ? "text-[12px]" : "text-[13px]";

  const alignClass = (align?: Column<T>["align"]) =>
    clsx(
      align === "right" && "text-right",
      align === "center" && "text-center",
      !align && "text-left"
    );

  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof Element &&
    Boolean(
      target.closest(
        'button, a, input, select, textarea, label, [role="button"], [role="combobox"], [role="listbox"], [data-stop-row-nav]'
      )
    );

  const handleRowClick = (row: T, event: React.MouseEvent<HTMLTableRowElement>) => {
    if (isInteractiveTarget(event.target)) return;

    const target = href?.(row);
    if (target) {
      router.push(target);
      return;
    }
    onRowClick?.(row);
  };

  const isInteractive = Boolean(href || onRowClick);

  const shouldStretchRows =
    stretchRows && visibleData.length >= stretchRowsMinCount;

  useEffect(() => {
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

  const stretchRowHeight = useMemo(() => {
    if (!shouldStretchRows || layoutHeight == null || visibleData.length === 0) {
      return undefined;
    }
    const available = layoutHeight - headerHeight;
    return Math.max(
      MIN_STRETCH_ROW_HEIGHT,
      Math.floor(available / visibleData.length)
    );
  }, [shouldStretchRows, layoutHeight, headerHeight, visibleData.length]);

  const tableHeight = useMemo(() => {
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

  const stickyClass = (sticky?: Column<T>["sticky"], header = false) =>
    sticky === "right"
      ? clsx(
          "sticky right-0 z-10 shadow-[-6px_0_10px_-8px_rgba(15,30,45,0.18)]",
          header ? "bg-[inherit]" : "bg-brand-elevated",
          variant === "muted" && !header && "bg-brand-surface"
        )
      : sticky === "left"
        ? clsx(
            "sticky left-0 z-10 shadow-[6px_0_10px_-8px_rgba(15,30,45,0.18)]",
            header ? "bg-[inherit]" : "bg-brand-elevated",
            variant === "muted" && !header && "bg-brand-surface"
          )
        : undefined;

  return (
    <div
      ref={containerRef}
      className={clsx(
        "w-full min-w-0",
        embedded ? "" : "surface-premium overflow-hidden rounded-2xl",
        shouldStretchRows && "flex h-full min-h-0 flex-col",
        className
      )}
    >
      <DottedScroll
        orientation="horizontal"
        scrollClassName={
          shouldStretchRows
            ? "min-h-0 w-full flex-1 overflow-x-auto overflow-y-auto"
            : "w-full overflow-x-auto"
        }
        indicatorPlacement="below"
        contentClassName={
          shouldStretchRows ? "block min-h-full min-w-full" : "block w-max min-w-full"
        }
        className={shouldStretchRows ? "min-h-0 flex-1" : undefined}
        showIndicator={showScrollIndicator}
      >
        <table
          className="w-full min-w-max border-collapse"
          style={
            tableHeight != null
              ? { minHeight: tableHeight, height: tableHeight }
              : undefined
          }
        >
          <colgroup>
            {columns.map((col) => (
              <col key={col.key} style={{ width: col.width ?? "auto" }} />
            ))}
          </colgroup>
          <thead ref={theadRef}>
            <tr className="table-header-row">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={clsx(
                    headerCellClass,
                    "table-header-label table-header-cell border-r last:border-r-0",
                    alignClass(col.align),
                    stickyClass(col.sticky, true),
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-16 text-center text-[13px] font-medium text-brand-ink-tertiary"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              visibleData.map((row, rowOffset) => {
                const rowIndex = rangeStart - 1 + rowOffset;
                const isHighlighted =
                  highlightRowKey != null && rowKey(row) === highlightRowKey;
                return (
                  <tr
                    key={rowKey(row)}
                    ref={isHighlighted ? highlightRowRef : undefined}
                    style={{
                      ...(stretchRowHeight != null
                        ? { height: stretchRowHeight }
                        : {}),
                      // Inline so the tint/accent survive CSS hot-reload; the
                      // globals.css keyframe layers a brief flash on top.
                      ...(isHighlighted
                        ? {
                            backgroundColor: "rgba(82, 200, 238, 0.2)",
                            boxShadow:
                              "inset 3px 0 0 0 var(--color-brand-blue)",
                          }
                        : {}),
                    }}
                    className={clsx(
                      "border-b border-brand-line-strong transition-colors last:border-b-0",
                      embedded
                        ? "dashboard-table-row"
                        : clsx(
                            "bg-brand-elevated",
                            variant === "muted" && "bg-brand-surface"
                          ),
                      isInteractive && "cursor-pointer hover:bg-brand-blue-soft/25",
                      isHighlighted && "data-row-highlight"
                    )}
                    onClickCapture={
                      onClearHighlight ? () => onClearHighlight() : undefined
                    }
                    onClick={
                      isInteractive ? (event) => handleRowClick(row, event) : undefined
                    }
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={clsx(
                          cellClass,
                          textSize,
                          alignClass(col.align),
                          "border-r border-brand-line-strong align-middle last:border-r-0",
                          col.nowrap !== false && "max-w-0 truncate whitespace-nowrap",
                          stickyClass(col.sticky),
                          col.cellClassName
                        )}
                      >
                        {col.render(row, rowIndex)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </DottedScroll>

      {pageSize && pageSize > 0 && data.length > pageSize ? (
        <div
          className={clsx(
            "flex items-center justify-between gap-3 border-t border-brand-line-strong px-4 py-3",
            embedded ? "dashboard-table-footer" : "bg-brand-elevated/50"
          )}
        >
          <p className="text-[12px] font-medium text-brand-ink-tertiary">
            {rangeStart}–{rangeEnd} of {data.length}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-ink-secondary transition hover:bg-brand-bg hover:text-brand-ink disabled:opacity-30"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <span className="min-w-[4.5rem] text-center text-[12px] font-semibold tabular-nums text-brand-ink-secondary">
              {safePage + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              aria-label="Next page"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-ink-secondary transition hover:bg-brand-bg hover:text-brand-ink disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
