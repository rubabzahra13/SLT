"use client";

import clsx from "clsx";
import { Users } from "lucide-react";

export type MTDViewOrder = "sequence" | "by_producer";

type MTDViewOrderToggleProps = {
  value: MTDViewOrder;
  onChange: (value: MTDViewOrder) => void;
};

/** Toggle: off = sequence (default), on = group by assigned producer. */
export function MTDViewOrderToggle({
  value,
  onChange,
}: MTDViewOrderToggleProps) {
  const active = value === "by_producer";

  return (
    <button
      type="button"
      aria-pressed={active}
      title={
        active
          ? "Grouped by producer — click for sequence order"
          : "Group by assigned producer"
      }
      onClick={() => onChange(active ? "sequence" : "by_producer")}
      className={clsx(
        "inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-[12px] font-medium transition",
        active
          ? "bg-brand-blue-soft font-semibold text-brand-signature ring-1 ring-inset ring-brand-blue/30"
          : "border border-brand-line/60 bg-white text-brand-ink-secondary shadow-sm hover:border-brand-line hover:bg-brand-bg hover:text-brand-ink"
      )}
    >
      <Users
        className={clsx(
          "h-3.5 w-3.5 shrink-0",
          active ? "text-brand-signature" : "text-brand-ink-tertiary"
        )}
        strokeWidth={2.25}
      />
      <span>Group by producer</span>
    </button>
  );
}
