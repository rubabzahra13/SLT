"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import type { Producer } from "@/types";

type ProducerGroupSectionProps = {
  index: number;
  name: string;
  producer?: Producer;
  initials: string;
  summary: string;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
};

/** Payroll producer card: numbered header, avatar, count, and collapsible rows. */
export function ProducerGroupSection({
  index,
  name,
  producer,
  initials,
  summary,
  collapsed,
  onToggle,
  children,
}: ProducerGroupSectionProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-brand-line/70 bg-brand-surface/90 shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-brand-bg/50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={clsx(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold tabular-nums tracking-tight ring-1 ring-inset transition",
              !collapsed
                ? "bg-brand-orange-soft/55 text-brand-orange ring-brand-orange/30"
                : "bg-brand-bg/90 text-brand-ink-tertiary ring-brand-line/55"
            )}
            aria-hidden
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <Avatar
            producer={producer}
            name={name}
            initials={initials}
            size="md"
          />
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-bold text-brand-ink">
              {name}
            </h3>
            <p className="text-[12px] text-brand-ink-secondary">{summary}</p>
          </div>
        </div>
        <ChevronDown
          className={clsx(
            "h-4 w-4 shrink-0 text-brand-ink-tertiary transition-transform duration-200",
            !collapsed && "rotate-180"
          )}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {!collapsed ? (
        <div className="border-t border-brand-line/60 px-3 pb-3 pt-3">
          {children}
        </div>
      ) : null}
    </section>
  );
}
