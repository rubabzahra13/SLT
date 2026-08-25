"use client";

import {
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  useSidebar,
} from "@/context/SidebarContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { NotificationToaster } from "@/components/notifications/NotificationToaster";
import { Menu } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { expanded, mobileOpen, setMobileOpen } = useSidebar();

  const desktopMargin = expanded
    ? SIDEBAR_WIDTH_EXPANDED
    : SIDEBAR_WIDTH_COLLAPSED;

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-brand-scrim backdrop-blur-[1px] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <Sidebar />
      <NotificationToaster />

      <div
        className="app-canvas flex min-h-screen min-w-0 flex-col transition-[margin] duration-300 ease-out md:ml-[var(--sidebar-margin)]"
        style={{ "--sidebar-margin": `${desktopMargin}px` } as React.CSSProperties}
      >
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-brand-line bg-brand-surface px-4 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-brand-ink transition hover:bg-brand-bg"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Sounds Like That</p>
            <p className="truncate text-[11px] text-brand-ink-tertiary">Admin Studio</p>
          </div>
        </header>

        <main className="app-canvas flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </>
  );
}
