"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  useSidebar,
} from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { NotificationToaster } from "@/components/notifications/NotificationToaster";
import { Eye, Menu } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, isViewOnly } = useAuth();
  const { expanded, mobileOpen, setMobileOpen } = useSidebar();

  const isLoginPage = pathname === "/login";
  const isWelcomePage = pathname === "/welcome";
  const isAuthCanvasPage = isLoginPage || isWelcomePage;

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isAuthCanvasPage) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, isAuthCanvasPage, router]);

  if (isAuthCanvasPage) {
    return <>{children}</>;
  }

  if (isLoading || (!isAuthenticated && !isAuthCanvasPage)) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-brand-bg">
        <div className="flex flex-col items-center gap-3 text-brand-ink-tertiary">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
          <p className="text-xs font-medium">Loading Sounds Like That CRM...</p>
        </div>
      </div>
    );
  }

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
        {isViewOnly ? (
          <div className="relative z-20 flex w-full shrink-0 items-center justify-center gap-2 border-b border-amber-300/40 bg-amber-500/10 px-4 py-2 text-[12px] font-semibold text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300">
            <Eye className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" strokeWidth={2} />
            <span className="text-center">View Only Mode — All application data is read-only. Editing and modification actions are disabled.</span>
          </div>
        ) : null}

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
