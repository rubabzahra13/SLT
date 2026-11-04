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
  tone?: "default" | "warn" | "danger";
};

const ACTIVE_CHIP: Record<NonNullable<RangeOption["tone"]>, string> = {
  default:
    "border-brand-blue/40 bg-brand-blue-soft/55 text-brand-ink shadow-sm",
  warn: "border-brand-orange/45 bg-brand-orange-soft/80 text-brand-ink shadow-sm",
  danger: "border-rose-400/45 bg-rose-50 text-rose-700 shadow-sm",
};

const INACTIVE_CHIP: Record<NonNullable<RangeOption["tone"]>, string> = {
  default:
    "border-brand-line-strong/70 bg-white text-brand-ink-secondary hover:border-brand-line hover:bg-brand-bg-subtle/80",
  warn: "border-brand-line-strong/70 bg-white text-brand-orange/90 hover:border-brand-orange/35 hover:bg-brand-orange-soft/40",
  danger:
    "border-brand-line-strong/70 bg-white text-rose-600/90 hover:border-rose-300 hover:bg-rose-50/70",
};

const ACTIVE_BADGE: Record<NonNullable<RangeOption["tone"]>, string> = {
  default: "bg-brand-blue-soft text-brand-signature",
  warn: "bg-white/70 text-brand-orange",
  danger: "bg-white/70 text-rose-600",
};

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
      tone: "warn",
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
      tone: "danger",
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
        const tone = opt.tone ?? "default";

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
              active ? ACTIVE_CHIP[tone] : INACTIVE_CHIP[tone]
            )}
          >
            <span>{opt.label}</span>
            {typeof opt.count === "number" ? (
              <span
                className={clsx(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-colors",
                  active
                    ? ACTIVE_BADGE[tone]
                    : "bg-brand-bg-subtle text-brand-ink-tertiary"
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
