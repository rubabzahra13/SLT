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

export function OrderRangeToggle({
  value,
  onChange,
  counts,
}: OrderRangeToggleProps) {
  const options: {
    id: OrderViewRangeFilter;
    label: string;
    count?: number;
    tone?: "default" | "warn" | "danger";
  }[] = [
    { id: "all", label: "All", count: counts?.all },
    {
      id: "need_to_be_scheduled",
      label: "Complete",
      count: counts?.needToBeScheduled ?? counts?.newOrders,
    },
    { id: "assigned", label: "Assigned", count: counts?.assigned },
    { id: "not_assigned", label: "Unassigned", count: counts?.notAssigned },
    {
      id: "reassign_leave",
      label: "Reassign",
      count: counts?.reassignLeave,
      tone: "danger",
    },
    {
      id: "reassign_rush",
      label: "Reassign rush",
      count: counts?.reassignRush,
      tone: "danger",
    },
    {
      id: "waiting_for_data",
      label: "Missing",
      count: counts?.waitingForData,
      tone: "warn",
    },
  ];

  return (
    <div
      className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-2xl bg-brand-elevated p-1 ring-1 ring-inset ring-brand-line/55"
      role="group"
      aria-label="Orders view range"
    >
      {options.map((opt) => {
        const active =
          value === opt.id ||
          (value === ("new_orders" as any) &&
            opt.id === "need_to_be_scheduled") ||
          (value === ("reassigned" as any) &&
            (opt.id === "reassign_leave" || opt.id === "reassign_rush"));
        const tone = opt.tone ?? "default";

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            aria-pressed={active}
            className={clsx(
              "inline-flex min-h-[32px] shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1 text-[12px] font-medium tracking-tight transition-colors",
              active
                ? tone === "danger"
                  ? "bg-rose-600 text-white shadow-sm"
                  : tone === "warn"
                    ? "bg-brand-orange text-white shadow-sm"
                    : "bg-brand-signature text-white shadow-sm"
                : tone === "danger"
                  ? "text-rose-700 hover:bg-rose-50"
                  : tone === "warn"
                    ? "text-brand-orange hover:bg-brand-orange-soft/60"
                    : "text-brand-ink-secondary hover:bg-brand-bg hover:text-brand-ink"
            )}
          >
            <span className="whitespace-nowrap">{opt.label}</span>
            {typeof opt.count === "number" ? (
              <span
                className={clsx(
                  "inline-flex min-w-[1.25rem] items-center justify-center rounded-md px-1 py-px text-[10px] font-semibold tabular-nums",
                  active
                    ? "bg-white/20 text-white"
                    : tone === "danger"
                      ? "bg-rose-50 text-rose-700"
                      : tone === "warn"
                        ? "bg-brand-orange-soft/80 text-brand-orange"
                        : "bg-brand-bg text-brand-ink-tertiary"
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
