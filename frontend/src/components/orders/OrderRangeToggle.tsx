"use client";

import clsx from "clsx";
import type { OrderViewRangeFilter } from "@/types";

type OrderRangeToggleProps = {
  value: OrderViewRangeFilter;
  onChange: (value: OrderViewRangeFilter) => void;
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

function isOptionActive(
  value: OrderViewRangeFilter,
  optId: OrderViewRangeFilter
): boolean {
  return (
    value === optId ||
    (value === ("new_orders" as OrderViewRangeFilter) &&
      optId === "need_to_be_scheduled") ||
    ((value === "reassign_leave" || value === "reassign_rush") &&
      optId === "reassigned")
  );
}

const UNDERLINE: Record<NonNullable<RangeOption["tone"]>, string> = {
  default: "bg-brand-signature",
  warn: "bg-brand-orange",
  danger: "bg-rose-500",
};

const ACTIVE_BADGE: Record<NonNullable<RangeOption["tone"]>, string> = {
  default: "bg-brand-blue-soft text-brand-signature",
  warn: "bg-brand-orange-soft text-brand-orange",
  danger: "bg-rose-50 text-rose-600",
};

const INACTIVE_LABEL: Record<NonNullable<RangeOption["tone"]>, string> = {
  default: "text-brand-ink-tertiary hover:text-brand-ink-secondary",
  warn: "text-brand-orange/80 hover:text-brand-orange",
  danger: "text-rose-600/80 hover:text-rose-700",
};

export function OrderRangeToggle({
  value,
  onChange,
  counts,
}: OrderRangeToggleProps) {
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
      className="scrollbar-hide -mb-px flex max-w-full items-center gap-0.5 overflow-x-auto"
      role="tablist"
      aria-label="Orders view range"
    >
      {options.map((opt) => {
        const active = isOptionActive(value, opt.id);
        const tone = opt.tone ?? "default";

        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={clsx(
              "group relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[13px] font-medium transition-colors",
              active ? "text-brand-ink" : INACTIVE_LABEL[tone]
            )}
          >
            <span>{opt.label}</span>
            {typeof opt.count === "number" ? (
              <span
                className={clsx(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-colors",
                  active
                    ? ACTIVE_BADGE[tone]
                    : "bg-brand-bg-subtle text-brand-ink-tertiary group-hover:bg-brand-line/60"
                )}
              >
                {opt.count}
              </span>
            ) : null}
            <span
              className={clsx(
                "absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-colors",
                active ? UNDERLINE[tone] : "bg-transparent"
              )}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
