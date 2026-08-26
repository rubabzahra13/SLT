"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
  Calendar,
  LayoutDashboard,
  Music2,
  Settings,
  Users,
  Wallet,
  PanelLeftClose,
  X,
} from "lucide-react";
import clsx from "clsx";
import { useSidebar } from "@/context/SidebarContext";
import { useAppState } from "@/context/AppStateContext";
import { getInProgressCount } from "@/lib/mtd-filters";
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
  { href: "/mtd", label: "MTD", icon: Music2 },
  { href: "/payroll", label: "Payroll", icon: Wallet },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/producers", label: "Producers", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { mtdRecords } = useAppState();
  const { expanded, toggleExpanded, setExpanded, mobileOpen, setMobileOpen } =
    useSidebar();

  const inProgressCount = useMemo(
    () => getInProgressCount(mtdRecords),
    [mtdRecords]
  );

  const payrollCount = useMemo(
    () => getPayrollRecords(mtdRecords).length,
    [mtdRecords]
  );

  const navItems = useMemo(
    () =>
      baseNavItems.map((item) => {
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
    [inProgressCount, payrollCount]
  );

  const showExpanded = expanded || mobileOpen;

  const navItemClass = (active: boolean) =>
    clsx(
      "group relative flex h-10 items-center rounded-xl transition-all duration-200",
      showExpanded ? "w-full gap-3 px-3" : "relative w-10 justify-center px-0",
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
          "relative flex h-[72px] shrink-0 items-center",
          showExpanded ? "px-3" : "justify-center px-2"
        )}
      >
        {showExpanded ? (
          <>
            <Link
              href="/"
              className="flex min-w-0 flex-1 items-center gap-2.5 pr-8"
            >
              <BrandMonogram />
              <div className="min-w-0">
                <p className="whitespace-nowrap text-[12px] font-semibold uppercase leading-tight tracking-[0.06em] text-brand-sidebar-accent">
                  Sounds Like That
                </p>
                <p className="mt-0.5 whitespace-nowrap text-[10px] font-semibold uppercase leading-none tracking-[0.06em] text-brand-sidebar-text-muted">
                  Admin Studio
                </p>
              </div>
            </Link>

            <HoverTip label="Close menu" placement="bottom">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-brand-sidebar-text-muted transition hover:bg-brand-sidebar-hover hover:text-brand-sidebar-ink md:hidden"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </HoverTip>

            <HoverTip label="Collapse sidebar" placement="bottom">
              <button
                type="button"
                onClick={toggleExpanded}
                className="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-brand-sidebar-text-muted transition hover:bg-brand-sidebar-hover hover:text-brand-sidebar-ink md:inline-flex"
                aria-label="Collapse sidebar"
                aria-expanded="true"
              >
                <PanelLeftClose className="h-[16px] w-[16px]" strokeWidth={1.75} />
              </button>
            </HoverTip>
          </>
        ) : (
          <HoverTip label="Expand sidebar" placement="right">
            <button
              type="button"
              onClick={toggleExpanded}
              className="transition hover:scale-[1.03]"
              aria-label="Expand sidebar"
              aria-expanded="false"
            >
              <BrandMonogram />
            </button>
          </HoverTip>
        )}
      </div>

      <div
        className={clsx(
          "h-px shrink-0 bg-brand-sidebar-border",
          showExpanded ? "mx-3" : "mx-2"
        )}
      />

      {/* Navigation */}
      <DottedScroll
        className="min-h-0 flex-1"
        scrollClassName="h-full overflow-y-scroll scrollbar-hide"
        indicatorPlacement="overlay"
        tone="dark"
        contentClassName={clsx(
          "flex flex-col gap-0.5 py-4",
          showExpanded ? "px-3" : "items-center px-2"
        )}
      >
        <nav className="flex flex-col gap-0.5">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <HoverTip
              key={href}
              label={showExpanded ? "" : label}
              placement="right"
              className={showExpanded ? "block w-full" : ""}
            >
              <Link
                href={href}
                onClick={() => setMobileOpen(false)}
                className={navItemClass(active)}
                aria-label={label}
              >
                {active && showExpanded ? (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-blue" />
                ) : null}
                <Icon
                  className={clsx(
                    "h-[19px] w-[19px] shrink-0",
                    active
                      ? "text-brand-blue"
                      : "text-brand-sidebar-text group-hover:text-brand-sidebar-ink"
                  )}
                  strokeWidth={active ? 2.25 : 1.75}
                />
                {showExpanded ? (
                  <>
                    <span
                      className={clsx(
                        "flex-1 text-[14px]",
                        active
                          ? "font-semibold text-brand-sidebar-ink"
                          : "font-medium"
                      )}
                    >
                      {label}
                    </span>
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

      {/* User */}
      <div
        className={clsx(
          "shrink-0 border-t border-brand-sidebar-border",
          showExpanded ? "px-3 py-4" : "flex justify-center p-2"
        )}
      >
        <HoverTip
          label={showExpanded ? "" : "Megan · Expand for account"}
          placement="right"
        >
          <button
            type="button"
            onClick={() => {
              if (!showExpanded) setExpanded(true);
            }}
            className={clsx(
              "flex items-center rounded-xl text-left transition hover:bg-brand-sidebar-hover",
              showExpanded ? "w-full gap-2.5 px-0 py-2" : "h-9 w-9 justify-center"
            )}
            aria-label={showExpanded ? "Account" : "Expand sidebar for account"}
          >
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-brand-sidebar-elevated ring-1 ring-brand-sidebar-border">
              <img
                src="https://api.dicebear.com/7.x/notionists/svg?seed=Megan&backgroundColor=f5f5f3"
                alt="Megan"
                className="h-full w-full object-cover"
              />
            </div>
            {showExpanded ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-brand-sidebar-ink">
                  Megan
                </p>
                <p className="truncate text-[11px] text-brand-sidebar-text-muted">
                  Administrator
                </p>
              </div>
            ) : null}
          </button>
        </HoverTip>
      </div>
    </aside>
  );
}
