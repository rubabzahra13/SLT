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
    <header className="sticky top-0 z-30 border-b border-brand-line/50 bg-[color-mix(in_srgb,var(--color-brand-bg)_92%,transparent)] backdrop-blur-xl backdrop-saturate-150">
      <div className="px-6 pt-2.5 lg:px-8">
        <div className="flex items-end justify-between gap-4 pb-2.5">
          <div className="min-w-0">
            <h1 className="truncate text-[24px] font-semibold tracking-[-0.04em] text-brand-ink">
              {title}
            </h1>
            {subtitle && !tabs ? (
              <p className="mt-1 text-[13px] leading-snug text-brand-ink-secondary">
                {subtitle}
              </p>
            ) : null}
          </div>

          <div className="mb-0.5 flex shrink-0 items-center gap-2">
            <div className="relative hidden md:block">
              <Search
                className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-ink-tertiary"
                strokeWidth={1.75}
              />
              <input
                type="search"
                placeholder="Search"
                className="h-9 w-44 rounded-full border border-brand-line/80 bg-brand-elevated/70 pl-9 pr-3 text-[13px] text-brand-ink outline-none transition placeholder:text-brand-ink-tertiary focus:border-brand-blue/40 focus:bg-brand-elevated focus:ring-2 focus:ring-brand-blue-muted lg:w-52"
              />
            </div>

            <NotificationBell />

            {action ? (
              <button
                type="button"
                onClick={action.onClick}
                className="flex h-9 items-center gap-1.5 rounded-full bg-brand-cta px-4 text-[13px] font-semibold text-brand-cta-text shadow-sm transition hover:bg-brand-cta-hover"
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
