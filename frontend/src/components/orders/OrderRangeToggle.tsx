"use client";

import clsx from "clsx";
import {
  isOrdersRangeFilterActive,
  toggleOrdersRangeFilter,
} from "@/lib/orders-range-filters";
import type { OrderViewRangeFilter } from "@/types";

type OrderRangeToggleProps = {
  /** Active filters (empty = All). Compatible dims can both be on. */
  value: OrderViewRangeFilter | OrderViewRangeFilter[];
  onChange: (value: OrderViewRangeFilter[]) => void;
  /** Warm that range's board cache on pointerdown (before click). */
  onRangeIntent?: (value: OrderViewRangeFilter) => void;
  counts?: {
    all?: number;
    needToBeScheduled?: number;
    newOrders?: number;
    assigned?: number;
    notAssigned?: number;
    reassignLeave?: number;
    reassignRush?: number;
    reassigned?: number;
    waitingForData?: number;
  };
};

type RangeOption = {
  id: OrderViewRangeFilter;
  label: string;
  count?: number;
};

/** One selected look for every chip so multi-select reads as the same filter set. */
const ACTIVE_CHIP =
  "border-brand-blue/40 bg-brand-blue-soft/55 text-brand-ink shadow-sm";
const INACTIVE_CHIP =
  "border-brand-line-strong/70 bg-white text-brand-ink-secondary hover:border-brand-line hover:bg-brand-bg-subtle/80";
const ACTIVE_BADGE = "bg-brand-blue-soft text-brand-signature";
const INACTIVE_BADGE = "bg-brand-bg-subtle text-brand-ink-tertiary";

function asFilters(
  value: OrderViewRangeFilter | OrderViewRangeFilter[]
): OrderViewRangeFilter[] {
  if (Array.isArray(value)) return value;
  if (!value || value === "all") return [];
  return [value];
}

export function OrderRangeToggle({
  value,
  onChange,
  onRangeIntent,
  counts,
}: OrderRangeToggleProps) {
  const filters = asFilters(value);
  const reselectCount =
    counts?.reassigned ??
    (counts?.reassignLeave ?? 0) + (counts?.reassignRush ?? 0);

  const options: RangeOption[] = [
    { id: "all", label: "All", count: counts?.all },
    {
      id: "need_to_be_scheduled",
      label: "Complete data",
      count: counts?.needToBeScheduled ?? counts?.newOrders,
    },
    {
      id: "waiting_for_data",
      label: "Missing data",
      count: counts?.waitingForData,
    },
    { id: "assigned", label: "Assigned", count: counts?.assigned },
    {
      id: "not_assigned",
      label: "Not assigned",
      count: counts?.notAssigned,
    },
    {
      id: "reassigned",
      label: "Reassign",
      count: reselectCount,
    },
  ];

  return (
    <div
      className="scrollbar-hide flex max-w-full flex-wrap items-center gap-1.5"
      role="group"
      aria-label="Orders filters"
    >
      {options.map((opt) => {
        const active = isOrdersRangeFilterActive(filters, opt.id);

        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onPointerDown={() => {
              if (opt.id !== "all" && !active) onRangeIntent?.(opt.id);
            }}
            onClick={() => {
              onChange(toggleOrdersRangeFilter(filters, opt.id));
            }}
            className={clsx(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors",
              active ? ACTIVE_CHIP : INACTIVE_CHIP
            )}
          >
            <span>{opt.label}</span>
            {typeof opt.count === "number" ? (
              <span
                className={clsx(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-colors",
                  active ? ACTIVE_BADGE : INACTIVE_BADGE
                )}
              >
                {opt.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
