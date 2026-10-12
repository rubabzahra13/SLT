"use client";

import clsx from "clsx";
import { Flag } from "lucide-react";

type OrderFlaggedToggleProps = {
  active: boolean;
  count: number;
  onClick: () => void;
  grouped?: boolean;
};

/** Standalone Flagged entry — not part of All / Missing / Assigned range tabs. */
export function OrderFlaggedToggle({
  active,
  count,
  onClick,
  grouped = false,
}: OrderFlaggedToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={
        count > 0
          ? `Flagged orders, ${count}`
          : "Flagged orders"
      }
      className={clsx(
        "inline-flex h-8 items-center gap-1.5 text-[12px] font-medium transition",
        grouped ? "rounded-lg px-2.5" : "rounded-xl px-3",
        active
          ? "bg-rose-500/15 font-semibold text-rose-700 ring-1 ring-inset ring-rose-500/30"
          : "text-brand-ink-secondary hover:bg-brand-bg hover:text-brand-ink"
      )}
    >
      <Flag
        className={clsx(
          "h-3.5 w-3.5 shrink-0",
          active ? "text-rose-600" : "text-brand-ink-tertiary"
        )}
        strokeWidth={2.25}
      />
      <span className={clsx(active ? "text-rose-700" : "text-brand-ink")}>
        Flagged
      </span>
      <span
        className={clsx(
          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
          active
            ? "bg-rose-500/20 text-rose-700"
            : count > 0
              ? "bg-rose-50 text-rose-600"
              : "bg-brand-bg-subtle text-brand-ink-tertiary"
        )}
      >
        {count}
      </span>
    </button>
  );
}
