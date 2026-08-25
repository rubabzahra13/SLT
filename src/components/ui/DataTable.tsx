"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DottedScroll } from "@/components/ui/DottedScroll";

export type Column<T> = {
  key: string;
  header: string;
  width?: string;
  align?: "left" | "right" | "center";
  nowrap?: boolean;
  sticky?: "left" | "right";
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
};

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
}: DataTableProps<T>) {
  const router = useRouter();
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [data.length, pageSize]);

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
  const textSize = compact ? "text-[12px]" : "text-[13px]";

  const alignClass = (align?: Column<T>["align"]) =>
    clsx(
      align === "right" && "text-right",
      align === "center" && "text-center",
      !align && "text-left"
    );

  const handleRowClick = (row: T) => {
    const target = href?.(row);
    if (target) {
      router.push(target);
      return;
    }
    onRowClick?.(row);
  };

  const isInteractive = Boolean(href || onRowClick);

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
      className={clsx(
        "w-full min-w-0",
        embedded ? "" : "surface-premium overflow-hidden rounded-2xl"
      )}
    >
      <DottedScroll
        orientation="horizontal"
        scrollClassName="w-full overflow-x-scroll scrollbar-hide"
        indicatorPlacement="below"
        contentClassName="block w-max min-w-full"
      >
        <table className="w-full min-w-max border-collapse">
          <colgroup>
            {columns.map((col) => (
              <col key={col.key} style={{ width: col.width ?? "auto" }} />
            ))}
          </colgroup>
          <thead>
            <tr className="table-header-row">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={clsx(
                    cellClass,
                    "text-label table-header-cell border-r font-semibold last:border-r-0",
                    alignClass(col.align),
                    stickyClass(col.sticky, true)
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
                  className="px-4 py-12 text-center text-[13px] text-brand-ink-tertiary"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              visibleData.map((row, rowOffset) => {
                const rowIndex = rangeStart - 1 + rowOffset;
                return (
                <tr
                  key={rowKey(row)}
                  className={clsx(
                    "border-b border-brand-line/70 bg-brand-elevated transition-colors last:border-b-0",
                    variant === "muted" && "bg-brand-surface",
                    isInteractive && "cursor-pointer hover:bg-brand-blue-soft/40"
                  )}
                  onClick={isInteractive ? () => handleRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={clsx(
                        cellClass,
                        textSize,
                        alignClass(col.align),
                        "border-r border-brand-line/50 align-middle last:border-r-0",
                        col.nowrap !== false && "max-w-0 truncate whitespace-nowrap",
                        stickyClass(col.sticky)
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
        <div className="flex items-center justify-between gap-3 border-t border-brand-line px-4 py-2.5">
          <p className="text-[12px] text-brand-ink-tertiary">
            {rangeStart}–{rangeEnd} of {data.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-ink-secondary transition hover:bg-brand-bg disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[4.5rem] text-center text-[12px] font-medium tabular-nums text-brand-ink-secondary">
              {safePage + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-ink-secondary transition hover:bg-brand-bg disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
