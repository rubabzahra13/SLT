"use client";

import clsx from "clsx";
import {
  CHEER_FORM_SUBTABS,
  DANCE_FORM_SUBTABS,
  type CheerFormSubtypeFilter,
  type DanceFormSubtypeFilter,
  type OrderFormType,
} from "@/types";

type OrderFormSubtypeTabsProps = {
  form: OrderFormType;
  cheerSubtype: CheerFormSubtypeFilter;
  danceSubtype: DanceFormSubtypeFilter;
  onCheerSubtypeChange: (subtype: CheerFormSubtypeFilter) => void;
  onDanceSubtypeChange: (subtype: DanceFormSubtypeFilter) => void;
  cheerCounts: Record<CheerFormSubtypeFilter, number>;
  danceCounts: Record<DanceFormSubtypeFilter, number>;
};

/**
 * Underline tab strip for cheer/dance subtypes: same visual language as
 * Orders view-range tabs (All / Complete data / …).
 */
export function OrderFormSubtypeTabs({
  form,
  cheerSubtype,
  danceSubtype,
  onCheerSubtypeChange,
  onDanceSubtypeChange,
  cheerCounts,
  danceCounts,
}: OrderFormSubtypeTabsProps) {
  if (form === "school-all-star-cheer") {
    return (
      <div
        className="scrollbar-hide -mb-px flex max-w-full items-center gap-0.5 overflow-x-auto"
        role="tablist"
        aria-label="Cheer subtype"
      >
        {CHEER_FORM_SUBTABS.map(({ id, label }) => {
          const active = cheerSubtype === id;
          const count = cheerCounts[id] ?? 0;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onCheerSubtypeChange(id)}
              className={clsx(
                "group relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "text-brand-ink"
                  : "text-brand-ink-tertiary hover:text-brand-ink-secondary"
              )}
            >
              <span>{label}</span>
              <span
                className={clsx(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-colors",
                  active
                    ? "bg-brand-orange-soft text-brand-orange"
                    : "bg-brand-bg-subtle text-brand-ink-tertiary group-hover:bg-brand-line/60"
                )}
              >
                {count}
              </span>
              <span
                className={clsx(
                  "absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-colors",
                  active ? "bg-brand-orange" : "bg-transparent"
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    );
  }

  if (form === "school-all-star-dance") {
    return (
      <div
        className="scrollbar-hide -mb-px flex max-w-full items-center gap-0.5 overflow-x-auto"
        role="tablist"
        aria-label="Dance subtype"
      >
        {DANCE_FORM_SUBTABS.map(({ id, label }) => {
          const active = danceSubtype === id;
          const count = danceCounts[id] ?? 0;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onDanceSubtypeChange(id)}
              className={clsx(
                "group relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "text-brand-ink"
                  : "text-brand-ink-tertiary hover:text-brand-ink-secondary"
              )}
            >
              <span>{label}</span>
              <span
                className={clsx(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-colors",
                  active
                    ? "bg-brand-orange-soft text-brand-orange"
                    : "bg-brand-bg-subtle text-brand-ink-tertiary group-hover:bg-brand-line/60"
                )}
              >
                {count}
              </span>
              <span
                className={clsx(
                  "absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-colors",
                  active ? "bg-brand-orange" : "bg-transparent"
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    );
  }

  return null;
}
