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
    isRed?: boolean;
  }[] = [
    { id: "all", label: "All", count: counts?.all },
    {
      id: "need_to_be_scheduled",
      label: "Need to be Scheduled",
      count: counts?.needToBeScheduled ?? counts?.newOrders,
    },
    { id: "reassigned", label: "Reassigned", count: counts?.reassigned, isRed: true },
    { id: "waiting_for_data", label: "Waiting for Data", count: counts?.waitingForData },
  ];

  return (
    <div
      className="inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-xl bg-white p-1 shadow-sm ring-1 ring-inset ring-brand-line/45"
      role="group"
      aria-label="Orders view range"
    >
      {options.map((opt) => {
        const active =
          value === opt.id ||
          (value === ("new_orders" as any) && opt.id === "need_to_be_scheduled");
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={clsx(
              "shrink-0 rounded-lg px-2.5 py-1 text-[12px] transition-all duration-200 text-center leading-tight flex items-center justify-center min-h-[30px]",
              active
                ? opt.isRed
                  ? "bg-rose-50 font-semibold text-rose-800 ring-1 ring-inset ring-rose-300/70"
                  : "bg-brand-blue-soft/70 font-semibold text-brand-ink"
                : opt.isRed
                ? "font-medium text-rose-700/80 hover:bg-rose-50/50 hover:text-rose-900"
                : "font-medium text-brand-ink-secondary hover:bg-brand-elevated/90 hover:text-brand-ink"
            )}
          >
            <span className="inline-block max-w-[125px] whitespace-normal text-center leading-tight">
              {opt.label}
              {typeof opt.count === "number" ? (
                <span className="ml-1 text-[10.5px] opacity-75 font-medium">({opt.count})</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
