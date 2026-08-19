"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Music2,
  Calendar,
  Clock,
  Users,
  DollarSign,
  Settings,
  PanelLeftClose,
  X,
} from "lucide-react";
import clsx from "clsx";
import { useSidebar } from "@/context/SidebarContext";
import { HoverTip } from "@/components/ui/HoverTip";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ShoppingBag, badge: 5 },
  { href: "/mtd", label: "MTD", icon: Music2 },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/outsourced", label: "In Progress", icon: Clock, badge: 12 },
  { href: "/producers", label: "Producers", icon: Users },
  { href: "/pricing", label: "Pricing", icon: DollarSign },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { expanded, toggleExpanded, setExpanded, mobileOpen, setMobileOpen } =
    useSidebar();

  const showExpanded = expanded || mobileOpen;

  const navItemClass = (active: boolean) =>
    clsx(
      "group relative flex h-9 items-center rounded-xl transition-all duration-200",
      showExpanded ? "w-full gap-2.5 px-2.5" : "relative w-9 justify-center px-0",
      active
        ? "bg-brand-accent-soft text-brand-ink"
        : "text-brand-ink-secondary hover:bg-brand-bg hover:text-brand-ink"
    );

  return (
    <aside
      className={clsx(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-brand-line bg-brand-surface transition-[width,transform] duration-300 ease-out md:translate-x-0",
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
          "flex h-[72px] shrink-0 items-center",
          showExpanded ? "gap-2 px-3" : "justify-center px-2"
        )}
      >
        {showExpanded ? (
          <>
            <Link href="/" className="flex min-w-0 flex-1 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-accent">
                <span className="text-[10px] font-bold tracking-wider text-white">
                  SLT
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-display truncate text-[14px] leading-tight">
                  Sounds Like That
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-ink-tertiary">
                  Admin Studio
                </p>
              </div>
            </Link>

            <HoverTip label="Close menu" placement="bottom">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink md:hidden"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </HoverTip>

            <HoverTip label="Collapse sidebar" placement="bottom">
              <button
                type="button"
                onClick={toggleExpanded}
                className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink md:inline-flex"
                aria-label="Collapse sidebar"
                aria-expanded="true"
              >
                <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </HoverTip>
          </>
        ) : (
          <HoverTip label="Expand sidebar" placement="right">
            <button
              type="button"
              onClick={toggleExpanded}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-accent transition hover:opacity-90"
              aria-label="Expand sidebar"
              aria-expanded="false"
            >
              <span className="text-[11px] font-bold tracking-wider text-white">
                SLT
              </span>
            </button>
          </HoverTip>
        )}
      </div>

      <div className={clsx("h-px shrink-0 bg-brand-line", showExpanded ? "mx-3" : "mx-2")} />

      {/* Navigation */}
      <nav
        className={clsx(
          "flex flex-1 flex-col gap-0.5 overflow-y-auto py-4",
          showExpanded ? "px-3" : "items-center px-2"
        )}
      >
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
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-accent" />
                ) : null}
                <Icon
                  className={clsx(
                    "h-[18px] w-[18px] shrink-0",
                    active ? "text-brand-ink" : "text-brand-ink-tertiary"
                  )}
                  strokeWidth={active ? 2.25 : 1.75}
                />
                {showExpanded ? (
                  <>
                    <span
                      className={clsx(
                        "flex-1 text-[13px]",
                        active ? "font-semibold" : "font-medium"
                      )}
                    >
                      {label}
                    </span>
                    {badge ? (
                      <span className="min-w-[20px] rounded-md bg-brand-accent px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                        {badge}
                      </span>
                    ) : null}
                  </>
                ) : badge ? (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-brand-accent" />
                ) : null}
              </Link>
            </HoverTip>
          );
        })}
      </nav>

      {/* User */}
      <div
        className={clsx(
          "shrink-0 border-t border-brand-line",
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
              "flex items-center rounded-xl text-left transition hover:bg-brand-bg",
              showExpanded ? "w-full gap-2.5 px-0 py-2" : "h-9 w-9 justify-center"
            )}
            aria-label={showExpanded ? "Account" : "Expand sidebar for account"}
          >
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-brand-bg ring-1 ring-brand-line">
              <img
                src="https://api.dicebear.com/7.x/notionists/svg?seed=Megan&backgroundColor=f5f5f3"
                alt="Megan"
                className="h-full w-full object-cover"
              />
            </div>
            {showExpanded ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">Megan</p>
                <p className="truncate text-[11px] text-brand-ink-tertiary">
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
