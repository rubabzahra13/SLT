"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
  Calendar,
  LayoutDashboard,
  Music2,
  Settings,
  ShoppingBag,
  Users,
  Wallet,
  PanelLeftClose,
  X,
} from "lucide-react";
import clsx from "clsx";
import { LogOut } from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";
import { useAppState } from "@/context/AppStateContext";
import { useAuth } from "@/context/AuthContext";
import { getInProgressCount, isMTDRecord, isPreMTDOrderRecord } from "@/lib/mtd-filters";
import { getPayrollRecords } from "@/lib/mtd-completion";
import { BrandMonogram } from "@/components/layout/BrandMonogram";
import { HoverTip } from "@/components/ui/HoverTip";
import { DottedScroll } from "@/components/ui/DottedScroll";

import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

const baseNavItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/mtd", label: "MTD", icon: Music2 },
  { href: "/payroll", label: "Payroll", icon: Wallet },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/producers", label: "Producers", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { mtdRecords } = useAppState();
  const { user, logout } = useAuth();
  const { expanded, toggleExpanded, setExpanded, mobileOpen, setMobileOpen } =
    useSidebar();

  const currentUser = user || {
    name: "Megan",
    email: "megan@soundslikethat.com",
    access_level: "Full Access",
  };

  const ordersCount = useMemo(
    () => mtdRecords.filter(isPreMTDOrderRecord).length,
    [mtdRecords]
  );

  const mtdTabRecords = useMemo(
    () => mtdRecords.filter(isMTDRecord),
    [mtdRecords]
  );

  const inProgressCount = useMemo(
    () => getInProgressCount(mtdTabRecords),
    [mtdTabRecords]
  );

  const payrollCount = useMemo(
    () => getPayrollRecords(mtdRecords).length,
    [mtdRecords]
  );

  const navItems = useMemo(
    () =>
      baseNavItems.map((item) => {
        if (item.href === "/orders") {
          return {
            ...item,
            badge: ordersCount > 0 ? ordersCount : undefined,
          };
        }
        if (item.href === "/mtd") {
          return {
            ...item,
            badge: inProgressCount > 0 ? inProgressCount : undefined,
          };
        }
        if (item.href === "/payroll") {
          return {
            ...item,
            badge: payrollCount > 0 ? payrollCount : undefined,
          };
        }
        return item;
      }),
    [ordersCount, inProgressCount, payrollCount]
  );

  const showExpanded = expanded || mobileOpen;

  const navItemClass = (active: boolean) =>
    clsx(
      "group relative flex h-10 items-center rounded-xl transition-all duration-200",
      showExpanded ? "w-full gap-3 px-3" : "w-10 justify-center mx-auto",
      active
        ? "bg-brand-sidebar-active font-semibold text-brand-sidebar-ink"
        : "text-brand-sidebar-text hover:bg-brand-sidebar-hover hover:text-brand-sidebar-ink"
    );

  return (
    <aside
      className={clsx(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-brand-sidebar-border bg-brand-sidebar shadow-[1px_0_0_rgba(15,20,25,0.06),4px_0_24px_rgba(0,0,0,0.12)] transition-[width,transform] duration-300 ease-out md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        showExpanded
          ? "w-[min(252px,88vw)] md:w-[228px]"
          : "w-[min(252px,88vw)] md:w-[72px]"
      )}
      aria-label="Main navigation"
      data-expanded={showExpanded ? "true" : "false"}
    >
      {/* Header */}
      <div
        className={clsx(
          "relative flex h-[72px] shrink-0 items-center justify-between",
          showExpanded ? "px-4" : "justify-center px-2"
        )}
      >
        {showExpanded ? (
          <>
            <Link
              href="/"
              className="flex min-w-0 flex-1 items-center gap-2.5 pr-2"
            >
              <BrandMonogram />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold uppercase leading-tight tracking-[0.06em] text-brand-sidebar-accent">
                  Sounds Like That
                </p>
                <p className="mt-0.5 truncate text-[10px] font-semibold uppercase leading-none tracking-[0.06em] text-brand-sidebar-text-muted">
                  Admin Studio
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={toggleExpanded}
              className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg text-brand-sidebar-text transition hover:bg-brand-sidebar-hover hover:text-brand-sidebar-ink md:flex"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-brand-sidebar-text transition hover:bg-brand-sidebar-hover md:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={toggleExpanded}
            className="flex items-center justify-center rounded-xl p-1 transition hover:bg-brand-sidebar-hover"
            aria-label="Expand sidebar"
          >
            <BrandMonogram />
          </button>
        )}
      </div>

      <div
        className={clsx(
          "h-px shrink-0 bg-brand-sidebar-border",
          showExpanded ? "mx-4" : "mx-2"
        )}
      />

      {/* Navigation */}
      <DottedScroll className="min-h-0 flex-1 px-3 py-3">
        <nav className="space-y-1" aria-label="Main menu">
          {navItems.map(({ href, label, icon: Icon, badge }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname.startsWith(href);

            return (
              <HoverTip
                key={href}
                label={showExpanded ? "" : label}
                placement="right"
                className={showExpanded ? "w-full block" : "block"}
              >
                <Link
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={navItemClass(active)}
                >
                  <Icon
                    className={clsx(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      active
                        ? "text-brand-blue"
                        : "text-brand-sidebar-text group-hover:text-brand-sidebar-ink"
                    )}
                    strokeWidth={1.75}
                  />
                  {showExpanded ? (
                    <>
                      <span className="truncate text-[13px] flex-1 text-left">{label}</span>
                      {badge ? (
                        <span className="min-w-[22px] rounded-md bg-brand-sidebar-active px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums text-brand-blue">
                          {badge}
                        </span>
                      ) : null}
                    </>
                  ) : badge ? (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-brand-orange" />
                  ) : null}
                </Link>
              </HoverTip>
            );
          })}
        </nav>
      </DottedScroll>

      {/* User & Sign Out */}
      <div
        className={clsx(
          "shrink-0 border-t border-brand-sidebar-border",
          showExpanded ? "px-4 py-3" : "flex flex-col items-center p-2 gap-2"
        )}
      >
        <div
          className={clsx(
            "flex items-center rounded-xl text-left",
            showExpanded ? "w-full justify-between gap-2 py-0.5" : "justify-center"
          )}
        >
          <HoverTip
            label={showExpanded ? "" : `${currentUser.name} (${currentUser.access_level})`}
            placement="right"
            className={showExpanded ? "min-w-0 flex-1" : ""}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-brand-sidebar-elevated ring-1 ring-brand-sidebar-border">
                <img
                  src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(currentUser.name)}&backgroundColor=f5f5f3`}
                  alt={currentUser.name}
                  className="h-full w-full object-cover"
                />
              </div>
              {showExpanded ? (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-brand-sidebar-ink leading-tight">
                    {currentUser.name}
                  </p>
                  <span className={clsx(
                    "mt-0.5 inline-block truncate text-[10px] font-semibold leading-none",
                    currentUser.access_level === "View Only"
                      ? "text-brand-amber"
                      : "text-brand-blue"
                  )}>
                    {currentUser.access_level}
                  </span>
                </div>
              ) : null}
            </div>
          </HoverTip>

          {showExpanded ? (
            <button
              type="button"
              onClick={logout}
              className="shrink-0 rounded-lg p-1.5 text-brand-sidebar-text transition hover:bg-brand-sidebar-hover hover:text-brand-danger"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
            </button>
          ) : null}
        </div>

        {!showExpanded ? (
          <HoverTip label="Sign out" placement="right">
            <button
              type="button"
              onClick={logout}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-sidebar-text transition hover:bg-brand-sidebar-hover hover:text-brand-danger"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </HoverTip>
        ) : null}
      </div>
    </aside>
  );
}
