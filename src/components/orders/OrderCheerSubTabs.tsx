"use client";

import clsx from "clsx";
import { DottedScroll } from "@/components/ui/DottedScroll";
import type { CheerFormSubtype } from "@/types";

export type CheerMainCategory = "all-star-cheer" | "school-cheer" | "youth-rec-cheer";

type OrderCheerSubTabsProps = {
  subtype: CheerFormSubtype;
  onChange: (subtype: CheerFormSubtype) => void;
  counts: Record<CheerFormSubtype, number>;
};

function getCategory(subtype: CheerFormSubtype): CheerMainCategory {
  if (subtype === "school-cheer-viroc-yes" || subtype === "school-cheer-viroc-no") {
    return "school-cheer";
  }
  if (subtype === "youth-rec-cheer") return "youth-rec-cheer";
  return "all-star-cheer";
}

const MAIN_CATEGORIES: { id: CheerMainCategory; label: string }[] = [
  { id: "all-star-cheer", label: "All Star Cheer" },
  { id: "school-cheer", label: "School Cheer" },
  { id: "youth-rec-cheer", label: "Youth Rec Cheer" },
];

export function OrderCheerSubTabs({ subtype, onChange, counts }: OrderCheerSubTabsProps) {
  const category = getCategory(subtype);
  const schoolCheerTotal =
    (counts["school-cheer-viroc-yes"] ?? 0) + (counts["school-cheer-viroc-no"] ?? 0);

  function mainCount(id: CheerMainCategory): number {
    if (id === "school-cheer") return schoolCheerTotal;
    if (id === "youth-rec-cheer") return counts["youth-rec-cheer"] ?? 0;
    return counts["all-star-cheer"] ?? 0;
  }

  function selectCategory(id: CheerMainCategory) {
    if (id === "school-cheer") {
      onChange(
        subtype === "school-cheer-viroc-no" ? "school-cheer-viroc-no" : "school-cheer-viroc-yes"
      );
      return;
    }
    if (id === "youth-rec-cheer") {
      onChange("youth-rec-cheer");
      return;
    }
    onChange("all-star-cheer");
  }

  return (
    <div className="border-b border-brand-line bg-brand-bg/20">
      <DottedScroll
        orientation="horizontal"
        scrollClassName="overflow-x-scroll scrollbar-hide"
        indicatorPlacement="below"
        contentClassName="flex w-max min-w-full px-4 py-2"
      >
        <nav className="flex gap-1" aria-label="Cheer form categories">
        {MAIN_CATEGORIES.map(({ id, label }) => {
          const active = category === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectCategory(id)}
              className={clsx(
                "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                active
                  ? "bg-brand-accent-soft text-brand-ink ring-1 ring-brand-line-strong"
                  : "text-brand-ink-secondary hover:bg-brand-surface hover:text-brand-ink"
              )}
            >
              {label}
              <span className="ml-1 tabular-nums text-brand-ink-tertiary">{mainCount(id)}</span>
            </button>
          );
        })}
        </nav>
      </DottedScroll>

      {category === "school-cheer" ? (
        <DottedScroll
          orientation="horizontal"
          scrollClassName="overflow-x-scroll scrollbar-hide"
          indicatorPlacement="below"
          contentClassName="flex w-max min-w-full border-t border-brand-line/60 px-4 py-2 pl-6"
        >
          <nav className="flex gap-1" aria-label="School Cheer form types">
          <button
            type="button"
            onClick={() => onChange("school-cheer-viroc-yes")}
            className={clsx(
              "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
              subtype === "school-cheer-viroc-yes"
                ? "bg-brand-accent text-white shadow-sm"
                : "text-brand-ink-secondary hover:bg-brand-surface hover:text-brand-ink"
            )}
          >
            VIROC Yes
            <span
              className={clsx(
                "ml-1 tabular-nums",
                subtype === "school-cheer-viroc-yes" ? "text-white/80" : "text-brand-ink-tertiary"
              )}
            >
              {counts["school-cheer-viroc-yes"] ?? 0}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onChange("school-cheer-viroc-no")}
            className={clsx(
              "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
              subtype === "school-cheer-viroc-no"
                ? "bg-brand-accent text-white shadow-sm"
                : "text-brand-ink-secondary hover:bg-brand-surface hover:text-brand-ink"
            )}
          >
            VIROC No
            <span
              className={clsx(
                "ml-1 tabular-nums",
                subtype === "school-cheer-viroc-no" ? "text-white/80" : "text-brand-ink-tertiary"
              )}
            >
              {counts["school-cheer-viroc-no"] ?? 0}
            </span>
          </button>
          </nav>
        </DottedScroll>
      ) : null}
    </div>
  );
}
