"use client";

import { Search, Plus } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick?: () => void };
  tabs?: React.ReactNode;
};

export function PageHeader({ title, subtitle, action, tabs }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-brand-line bg-brand-bg/95 shadow-[var(--shadow-premium-sm)] backdrop-blur-xl backdrop-saturate-150">
      <div className="px-4 lg:px-5">
        <div className="flex items-center justify-between gap-4 py-4">
          <div className="min-w-0">
            <h1 className="text-display text-[20px] leading-none tracking-[-0.03em]">
              {title}
            </h1>
            {subtitle && !tabs ? (
              <p className="mt-1 text-[13px] text-brand-ink-secondary">{subtitle}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="relative hidden md:block">
              <Search
                className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-ink-tertiary"
                strokeWidth={1.75}
              />
              <input
                type="search"
                placeholder="Search"
                className="h-8 w-40 rounded-lg border border-brand-line bg-brand-accent-soft pl-9 pr-3 text-[13px] outline-none transition placeholder:text-brand-ink-tertiary focus:border-brand-blue/30 focus:bg-brand-surface focus:ring-2 focus:ring-brand-blue-muted lg:w-48"
              />
            </div>

            <NotificationBell />

            {action ? (
              <button
                type="button"
                onClick={action.onClick}
                className="flex items-center gap-1.5 rounded-lg bg-brand-cta px-3.5 py-2 text-[13px] font-semibold text-brand-cta-text shadow-sm transition hover:bg-brand-cta-hover"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            ) : null}
          </div>
        </div>

        {tabs ? <div className="-mb-px">{tabs}</div> : null}
      </div>
    </header>
  );
}
