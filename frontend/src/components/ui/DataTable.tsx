"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
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
  render: (row: T, index: number) => ReactNode;
};

/** Parse `56px` / `120px` column widths for stacked sticky-left offsets. */
function parseColumnWidthPx(width?: string): number {
  if (!width) return 0;
  const match = /^(\d+(?:\.\d+)?)px$/i.exec(width.trim());
  return match ? Number(match[1]) : 0;
}

export type DataTableSelection = {
  selectedKeys: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
  /** Disable checkboxes (e.g. view-only / deleting). */
  disabled?: boolean;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  href?: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  /** Cold load with no rows yet — show table-shaped skeleton instead of empty copy. */
  loading?: boolean;
  variant?: "default" | "muted";
  pageSize?: number;
  /** Server-known total (e.g. counts.all). Footer shows this instead of loaded length. */
  totalCount?: number;
  /** More server pages available — next page auto-fetches instead of a Load more button. */
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  /** Reset pager when this changes (filters), not when data.length grows from load-more. */
  resetKey?: string | number;
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
  /** Gmail-style row checkboxes (current page select-all in header). */
  selection?: DataTableSelection;
};

const MIN_STRETCH_ROW_HEIGHT = 44;

export function DataTable<T>({
  columns,
  data,
  rowKey,
  href,
  onRowClick,
  emptyMessage = "No results found.",
  loading = false,
  variant = "default",
  pageSize,
  totalCount,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  resetKey,
  embedded = false,
  compact = false,
  showScrollIndicator = true,
  stretchRows = false,
  stretchRowsMinCount = 3,
  className,
  highlightRowKey,
  onClearHighlight,
  selection,
}: DataTableProps<T>) {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightRowRef = useRef<HTMLTableRowElement | null>(null);
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const [layoutHeight, setLayoutHeight] = useState<number | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const loadMoreRequestedRef = useRef(false);
  const prevLenRef = useRef(data.length);

  // Render-phase reset so a filter change never paints one frame of the old page.
  const [pageResetKey, setPageResetKey] = useState(`${pageSize}|${resetKey}`);
  if (pageResetKey !== `${pageSize}|${resetKey}`) {
    setPageResetKey(`${pageSize}|${resetKey}`);
    setPage(0);
  }

  useEffect(() => {
    loadMoreRequestedRef.current = false;
  }, [pageSize, resetKey]);

  // After an auto load-more, advance onto the newly fetched page.
  useEffect(() => {
    if (!pageSize || pageSize <= 0) return;
    if (data.length > prevLenRef.current && loadMoreRequestedRef.current) {
      loadMoreRequestedRef.current = false;
      setPage(Math.floor(prevLenRef.current / pageSize));
    }
    prevLenRef.current = data.length;
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

  const displayTotal =
    typeof totalCount === "number" && totalCount >= 0
      ? Math.max(totalCount, data.length)
      : data.length;

  const loadedPages =
    pageSize && pageSize > 0 ? Math.max(1, Math.ceil(data.length / pageSize)) : 1;
  const knownTotalPages =
    pageSize && pageSize > 0
      ? Math.max(1, Math.ceil(displayTotal / pageSize))
      : 1;
  // Until the next server page arrives, don't let pager jump past loaded rows.
  const totalPages = hasMore
    ? Math.max(loadedPages, Math.min(knownTotalPages, loadedPages + 1))
    : Math.min(knownTotalPages, loadedPages);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));

  const visibleData = useMemo(() => {
    if (!pageSize || pageSize <= 0) return data;
    const start = safePage * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, pageSize, safePage]);

  const visibleKeys = useMemo(
    () => visibleData.map((row) => rowKey(row)),
    // rowKey is a stable accessor from the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleData]
  );

  const selectionEnabled = Boolean(selection);
  const selectedKeys = selection?.selectedKeys;
  const selectionDisabled = Boolean(selection?.disabled);
  const visibleSelectedCount = selectionEnabled
    ? visibleKeys.filter((key) => selectedKeys?.has(key)).length
    : 0;
  const allVisibleSelected =
    selectionEnabled &&
    visibleKeys.length > 0 &&
    visibleSelectedCount === visibleKeys.length;
  const someVisibleSelected =
    visibleSelectedCount > 0 && !allVisibleSelected;

  const toggleVisibleSelection = () => {
    if (!selection || selectionDisabled) return;
    const next = new Set(selection.selectedKeys);
    if (allVisibleSelected) {
      for (const key of visibleKeys) next.delete(key);
    } else {
      for (const key of visibleKeys) next.add(key);
    }
    selection.onChange(next);
  };

  const toggleRowSelection = (key: string) => {
    if (!selection || selectionDisabled) return;
    const next = new Set(selection.selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    selection.onChange(next);
  };

  const displayColumns = useMemo(() => {
    if (!selectionEnabled) return columns;
    const selectCol: Column<T> = {
      key: "__select",
      header: "",
      width: "44px",
      align: "center",
      nowrap: true,
      sticky: "left",
      cellClassName: "!px-1.5 !py-1.5",
      headerClassName: "!px-1.5 !py-2",
      render: (row) => {
        const key = rowKey(row);
        const checked = Boolean(selectedKeys?.has(key));
        return (
          <input
            type="checkbox"
            checked={checked}
            disabled={selectionDisabled}
            aria-label="Select row"
            onChange={() => toggleRowSelection(key)}
            onClick={(e) => e.stopPropagation()}
            className="h-3.5 w-3.5 cursor-pointer rounded border-brand-line accent-brand-orange disabled:cursor-not-allowed"
          />
        );
      },
    };
    return [selectCol, ...columns];
    // Intentionally omit toggleRowSelection — closes over latest selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    columns,
    selectionEnabled,
    selectionDisabled,
    selectedKeys,
    rowKey,
  ]);

  const rangeStart =
    data.length === 0
      ? 0
      : pageSize && pageSize > 0
        ? safePage * pageSize + 1
        : 1;
  const rangeEnd =
    pageSize && pageSize > 0
      ? Math.min(data.length, (safePage + 1) * pageSize)
      : data.length;

  // Prefetch next server page one client page early so Next rarely waits on the network.
  useEffect(() => {
    if (!hasMore || !onLoadMore || loadingMore) return;
    if (!pageSize || pageSize <= 0) return;
    if (safePage < loadedPages - 2) return;
    onLoadMore();
  }, [hasMore, onLoadMore, loadingMore, pageSize, safePage, loadedPages]);

  const goNext = () => {
    if (!pageSize || pageSize <= 0) return;
    if (safePage < loadedPages - 1) {
      setPage((p) => p + 1);
      return;
    }
    if (hasMore && onLoadMore && !loadingMore) {
      loadMoreRequestedRef.current = true;
      onLoadMore();
      return;
    }
    if (safePage < totalPages - 1) setPage((p) => p + 1);
  };

  const showPager =
    Boolean(pageSize && pageSize > 0) &&
    (displayTotal > pageSize! || hasMore || data.length > pageSize!);

  const canGoNext =
    safePage < loadedPages - 1 ||
    (hasMore && !loadingMore) ||
    safePage < totalPages - 1;

  const cellClass = compact ? "px-3 py-2" : "px-4 py-3";
  const headerCellClass = compact ? "px-3 py-2.5" : "px-4 py-3";
  const textSize = compact ? "text-[12px]" : "text-[13px]";
  const showSkeleton = loading && data.length === 0;
  const skeletonRows = Math.min(
    12,
    Math.max(6, pageSize && pageSize > 0 ? Math.min(pageSize, 12) : 8)
  );
  // Varied widths so the skeleton reads like real columns, not a flat grid.
  const skeletonBoneWidth = (colIndex: number, rowIndex: number) => {
    const pattern = [42, 68, 54, 76, 62, 48, 58, 72, 50, 64];
    return `${pattern[(colIndex + rowIndex) % pattern.length]}%`;
  };

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

  const handleRowClick = (row: T, event: MouseEvent<HTMLTableRowElement>) => {
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
  }, [shouldStretchRows, visibleData.length, displayColumns.length]);

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

  type StickyMeta = { left: number; edge: boolean; first: boolean; z: number };
  const stickyHeaderEls = useRef(new Map<string, HTMLTableCellElement>());
  const [stickyLeftMeta, setStickyLeftMeta] = useState(
    () => new Map<string, StickyMeta>()
  );
  const [scrolledX, setScrolledX] = useState(false);
  const hasStickyColumns = displayColumns.some(
    (col) => col.sticky === "left" || col.sticky === "right"
  );

  // Measure real header widths so sticky left offsets stay flush (no white seams).
  useEffect(() => {
    if (!hasStickyColumns) {
      setStickyLeftMeta(new Map());
      return;
    }
    const leftCols = displayColumns.filter((col) => col.sticky === "left");
    const thead = theadRef.current;
    const measure = () => {
      const meta = new Map<string, StickyMeta>();
      let left = 0;
      leftCols.forEach((col, index) => {
        meta.set(col.key, {
          left,
          edge: index === leftCols.length - 1,
          first: index === 0,
          z: 10 + index,
        });
        const el = stickyHeaderEls.current.get(col.key);
        const width = el?.offsetWidth || parseColumnWidthPx(col.width);
        // Overlap the next sticky by 1px so border-collapse hairlines can't show through.
        left += Math.max(width - 1, 0);
      });
      setStickyLeftMeta((prev) => {
        if (prev.size !== meta.size) return meta;
        for (const [key, value] of meta) {
          const old = prev.get(key);
          if (
            !old ||
            old.left !== value.left ||
            old.edge !== value.edge ||
            old.first !== value.first
          ) {
            return meta;
          }
        }
        return prev;
      });
    };
    const raf = window.requestAnimationFrame(measure);
    const ro = thead ? new ResizeObserver(measure) : null;
    if (thead && ro) ro.observe(thead);
    return () => {
      window.cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [displayColumns, hasStickyColumns, visibleData.length]);

  const stickyClass = (col: Column<T>) => {
    if (!col.sticky) return undefined;
    const meta =
      col.sticky === "left" ? stickyLeftMeta.get(col.key) : undefined;
    const edge = col.sticky === "left" ? meta?.edge ?? true : true;
    const first = col.sticky === "left" ? meta?.first ?? false : false;
    return clsx(
      "data-table-sticky sticky overflow-hidden",
      first && "data-table-sticky-first",
      edge && "data-table-sticky-edge"
    );
  };

  const stickyStyle = (
    col: Column<T>,
    header = false
  ): CSSProperties | undefined => {
    if (!col.sticky) return undefined;
    // Position only — fills/hover live in CSS so row blue hover reaches sticky cells.
    if (col.sticky === "left") {
      const meta = stickyLeftMeta.get(col.key);
      return {
        left: meta?.left ?? 0,
        zIndex: (meta?.z ?? 10) + (header ? 20 : 0),
      };
    }
    return {
      right: 0,
      zIndex: header ? 30 : 10,
    };
  };

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
            ? "min-h-0 w-full flex-1 overflow-x-auto overflow-y-auto scrollbar-hide"
            : "w-full overflow-x-auto scrollbar-hide"
        }
        indicatorPlacement="below"
        contentClassName={
          shouldStretchRows ? "block min-h-full min-w-full" : "block w-max min-w-full"
        }
        className={shouldStretchRows ? "min-h-0 flex-1" : undefined}
        showIndicator={showScrollIndicator}
        onScrollLeftChange={(left) => {
          const next = left > 2;
          setScrolledX((prev) => (prev === next ? prev : next));
        }}
      >
        <table
          className="w-full min-w-max border-collapse"
          data-scrolled-x={scrolledX ? "true" : undefined}
          style={
            tableHeight != null
              ? { minHeight: tableHeight, height: tableHeight }
              : undefined
          }
        >
          <colgroup>
            {displayColumns.map((col) => (
              <col key={col.key} style={{ width: col.width ?? "auto" }} />
            ))}
          </colgroup>
          <thead ref={theadRef}>
            <tr className="table-header-row">
              {displayColumns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  ref={(node) => {
                    if (col.sticky === "left") {
                      if (node) stickyHeaderEls.current.set(col.key, node);
                      else stickyHeaderEls.current.delete(col.key);
                    }
                  }}
                  style={stickyStyle(col, true)}
                  className={clsx(
                    headerCellClass,
                    "table-header-label table-header-cell border-r last:border-r-0",
                    alignClass(col.align),
                    stickyClass(col),
                    col.headerClassName
                  )}
                >
                  {col.key === "__select" ? (
                    <input
                      ref={(node) => {
                        if (node) node.indeterminate = someVisibleSelected;
                      }}
                      type="checkbox"
                      checked={allVisibleSelected}
                      disabled={
                        selectionDisabled || visibleKeys.length === 0
                      }
                      aria-label="Select all on this page"
                      onChange={toggleVisibleSelection}
                      className="h-3.5 w-3.5 cursor-pointer rounded border-brand-line accent-brand-orange disabled:cursor-not-allowed"
                    />
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {showSkeleton ? (
              Array.from({ length: skeletonRows }, (_, rowIndex) => (
                <tr
                  key={`skeleton-${rowIndex}`}
                  className={clsx(
                    "border-b border-brand-line-strong last:border-b-0",
                    embedded ? "dashboard-table-row" : "bg-brand-elevated"
                  )}
                  aria-hidden
                >
                  {displayColumns.map((col, colIndex) => (
                    <td
                      key={col.key}
                      style={stickyStyle(col)}
                      className={clsx(
                        cellClass,
                        "border-r border-brand-line-strong align-middle last:border-r-0",
                        stickyClass(col)
                      )}
                    >
                      <span
                        className="block h-3.5 max-w-full animate-pulse rounded-md bg-brand-line/70"
                        style={{ width: skeletonBoneWidth(colIndex, rowIndex) }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={displayColumns.length}
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
                    {displayColumns.map((col) => (
                      <td
                        key={col.key}
                        style={stickyStyle(col)}
                        className={clsx(
                          cellClass,
                          textSize,
                          alignClass(col.align),
                          "border-r border-brand-line-strong align-middle last:border-r-0",
                          col.nowrap !== false && "max-w-0 truncate whitespace-nowrap",
                          stickyClass(col),
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

      {showPager ? (
        <div
          className={clsx(
            "flex items-center justify-between gap-3 border-t border-brand-line-strong px-4 py-3",
            embedded ? "dashboard-table-footer" : "bg-brand-elevated/50"
          )}
        >
          <p className="text-[12px] font-medium text-brand-ink-tertiary">
            {showSkeleton
              ? "Loading…"
              : data.length === 0
                ? `0 of ${displayTotal}`
                : `${rangeStart}-${rangeEnd} of ${displayTotal}`}
            {loadingMore ? " · loading…" : null}
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
              {safePage + 1} / {knownTotalPages}
            </span>
            <button
              type="button"
              disabled={!canGoNext}
              onClick={goNext}
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
