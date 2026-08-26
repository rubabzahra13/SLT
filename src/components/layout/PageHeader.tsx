"use client";

import { Search, Plus } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  compact?: boolean;
  action?: { label: string; onClick?: () => void };
  tabs?: React.ReactNode;
  toolbar?: React.ReactNode;
};

export function PageHeader({
  title,
  subtitle,
  badge,
  compact = false,
  action,
  tabs,
  toolbar,
}: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-brand-line/35 bg-[color-mix(in_srgb,var(--color-brand-bg)_97%,transparent)] shadow-[0_1px_0_rgba(15,30,45,0.04)] backdrop-blur-xl backdrop-saturate-150">
      <div className={compact ? "px-6 py-3 lg:px-8" : "px-6 py-4 lg:px-8"}>
        <div className="flex items-center justify-between gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span
              className="hidden h-8 w-1 shrink-0 rounded-full bg-gradient-to-b from-brand-signature to-brand-blue/40 sm:block"
              aria-hidden
            />
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <h1
                  className={
                    compact
                      ? "truncate text-[22px] font-bold tracking-[-0.04em] text-brand-ink"
                      : "truncate text-[26px] font-bold tracking-[-0.04em] text-brand-ink"
                  }
                >
                  {title}
                </h1>
                {badge ? (
                  <span className="shrink-0 rounded-lg bg-brand-blue-soft/55 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-brand-signature ring-1 ring-inset ring-brand-blue/20">
                    {badge}
                  </span>
                ) : null}
                {compact && subtitle ? (
                  <span className="hidden text-[12px] text-brand-ink-tertiary lg:inline">
                    {subtitle}
                  </span>
                ) : null}
              </div>
              {!compact && subtitle ? (
                <p className="mt-1 text-[13px] leading-relaxed text-brand-ink-tertiary">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <div className="relative hidden md:block">
              <Search
                className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-ink-tertiary"
                strokeWidth={2}
              />
              <input
                type="search"
                placeholder="Search..."
                className="h-9 w-48 rounded-xl border border-brand-line/50 bg-white/80 pl-9 pr-3 text-[13px] text-brand-ink outline-none ring-0 transition placeholder:text-brand-ink-tertiary focus:border-brand-blue/45 focus:bg-white focus:ring-2 focus:ring-brand-blue/15 lg:w-56"
              />
            </div>

            <NotificationBell />

            {action ? <span className="hidden h-6 w-px bg-brand-line/50 sm:block" aria-hidden /> : null}

            {action ? (
              <button
                type="button"
                onClick={action.onClick}
                className="flex h-9 items-center gap-1.5 rounded-xl bg-brand-orange px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-orange-hover hover:shadow-md"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            ) : null}
          </div>
        </div>

        {tabs ? <div className="mt-4 -mb-px">{tabs}</div> : null}

        {toolbar ? (
          <div className="mt-5">{toolbar}</div>
        ) : (
          <div className="h-0" aria-hidden />
        )}
      </div>
    </header>
  );
}
