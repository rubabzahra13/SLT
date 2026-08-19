"use client";

import clsx from "clsx";
import type { OrderTab } from "@/types";

type OrderSegmentTabsProps = {
  tab: OrderTab;
  onChange: (tab: OrderTab) => void;
  activeCount: number;
  allCount: number;
  pastCount: number;
};

const segments: {
  id: OrderTab;
  label: string;
  count: (props: OrderSegmentTabsProps) => number;
}[] = [
  { id: "active", label: "Active", count: (p) => p.activeCount },
  { id: "all", label: "All orders", count: (p) => p.allCount },
  { id: "past", label: "Past", count: (p) => p.pastCount },
];

export function OrderSegmentTabs(props: OrderSegmentTabsProps) {
  const { tab, onChange } = props;

  return (
    <nav className="flex gap-0.5" aria-label="Order views">
      {segments.map(({ id, label, count }) => {
        const active = tab === id;
        const value = count(props);
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={clsx(
              "relative px-3 pb-3 pt-1 text-[13px] font-medium transition-colors",
              active ? "text-brand-ink" : "text-brand-ink-tertiary hover:text-brand-ink-secondary"
            )}
          >
            {label}
            <span
              className={clsx(
                "ml-1.5 text-[11px] tabular-nums",
                active ? "text-brand-ink-secondary" : "text-brand-ink-tertiary"
              )}
            >
              {value}
            </span>
            {active ? (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-accent" />
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

/** @deprecated Use OrderSegmentTabs */
export function OrderSegment(props: OrderSegmentTabsProps) {
  return <OrderSegmentTabs {...props} />;
}
