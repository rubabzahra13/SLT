"use client";

import clsx from "clsx";
import type { BrandAccent } from "@/lib/brand-colors";

export type TabOption = {
  value: string;
  label: string;
  count?: number;
};

type TabsProps = {
  options: TabOption[];
  value: string;
  onChange: (value: string) => void;
  accent?: BrandAccent;
  className?: string;
};

const underlineAccent: Record<BrandAccent, string> = {
  blue: "bg-brand-signature",
  orange: "bg-brand-orange",
};

const activeBadge: Record<BrandAccent, string> = {
  blue: "bg-brand-blue-soft text-brand-signature",
  orange: "bg-brand-orange-soft text-brand-orange",
};

export function Tabs({
  options,
  value,
  onChange,
  accent = "blue",
  className,
}: TabsProps) {
  return (
    <div
      className={clsx(
        "scrollbar-hide -mb-px flex items-center gap-0.5 overflow-x-auto",
        className
      )}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={clsx(
              "group relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[13px] font-medium transition-colors",
              active
                ? "text-brand-ink"
                : "text-brand-ink-tertiary hover:text-brand-ink-secondary"
            )}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined ? (
              <span
                className={clsx(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-colors",
                  active
                    ? activeBadge[accent]
                    : "bg-brand-bg-subtle text-brand-ink-tertiary group-hover:bg-brand-line/60"
                )}
              >
                {opt.count}
              </span>
            ) : null}
            <span
              className={clsx(
                "absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-colors",
                active ? underlineAccent[accent] : "bg-transparent"
              )}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
