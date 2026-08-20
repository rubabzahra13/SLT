"use client";

import clsx from "clsx";
import { DottedScroll } from "@/components/ui/DottedScroll";
import { ORDER_FORM_TABS, type OrderFormType } from "@/types";

type OrderFormTabsProps = {
  form: OrderFormType;
  onChange: (form: OrderFormType) => void;
  counts: Record<OrderFormType, number>;
};

export function OrderFormTabs({ form, onChange, counts }: OrderFormTabsProps) {
  return (
    <DottedScroll
      orientation="horizontal"
      className="border-b border-brand-line bg-brand-bg/40"
      scrollClassName="overflow-x-scroll scrollbar-hide"
      indicatorPlacement="below"
      contentClassName="flex w-max min-w-full gap-1 px-4 py-2"
    >
      <nav className="flex gap-1" aria-label="Order form types">
        {ORDER_FORM_TABS.map(({ id, label }) => {
          const active = form === id;
          const count = counts[id] ?? 0;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={clsx(
                "shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
                active
                  ? "bg-brand-accent text-white shadow-sm"
                  : "text-brand-ink-secondary hover:bg-brand-surface hover:text-brand-ink"
              )}
            >
              {label}
              <span
                className={clsx(
                  "ml-1.5 tabular-nums",
                  active ? "text-white/80" : "text-brand-ink-tertiary"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </nav>
    </DottedScroll>
  );
}
