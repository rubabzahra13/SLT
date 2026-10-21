"use client";

import clsx from "clsx";
import { ORDER_FORM_TABS, type OrderFormType } from "@/types";

/** Short labels so every form fits on one row. */
const FORM_TAB_LABELS: Record<OrderFormType, string> = {
  "school-all-star-cheer": "Cheer",
  "school-all-star-dance": "Dance",
  "marching-band": "Band",
  "sports-entertainment": "Sports Ent.",
  "school-anthem": "Anthem",
};

type OrderFormTabsProps = {
  form: OrderFormType;
  onFormChange: (form: OrderFormType) => void;
  formCounts: Record<OrderFormType, number>;
};

/**
 * Inline form pills with counts — distinct from subtype underline tabs.
 */
export function OrderFormTabs({
  form,
  onFormChange,
  formCounts,
}: OrderFormTabsProps) {
  return (
    <div
      className="inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-xl bg-brand-elevated/80 p-0.5 ring-1 ring-inset ring-brand-line/40"
      role="tablist"
      aria-label="Form"
    >
      {ORDER_FORM_TABS.map(({ id, label }) => {
        const active = form === id;
        const count = formCounts[id] ?? 0;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            title={label}
            onClick={() => onFormChange(id)}
            className={clsx(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium transition",
              active
                ? "bg-brand-blue-soft/70 font-semibold text-brand-ink ring-1 ring-inset ring-brand-blue/30"
                : "text-brand-ink-secondary hover:bg-brand-bg hover:text-brand-ink"
            )}
          >
            <span>{FORM_TAB_LABELS[id]}</span>
            <span
              className={clsx(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                active
                  ? "bg-brand-blue-soft text-brand-signature"
                  : count > 0
                    ? "bg-brand-bg-subtle text-brand-ink-secondary"
                    : "bg-brand-bg-subtle text-brand-ink-tertiary"
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
