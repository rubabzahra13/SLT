"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useAuth } from "@/context/AuthContext";
import { BrandMonogram } from "@/components/layout/BrandMonogram";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { HoverTip } from "@/components/ui/HoverTip";
import { DottedScroll } from "@/components/ui/DottedScroll";
import { subscribeBoardStream } from "@/lib/api/board-stream";
import {
  fetchDashboardPulseApi,
  readDashboardPulseCache,
  type DashboardPulseApi,
} from "@/lib/api/dashboard";
import {
  ORDERS_BOARD_PATCH_EVENT,
} from "@/lib/orders-board-cache";
import type { CheerFormSubtypeFilter, OrderFormType } from "@/types";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Brand dot — something new since last visit (not a live total). */
  hasNew?: boolean;
};

const BOARD_NAV_HREFS = ["/orders", "/mtd", "/payroll"] as const;

const NAV_SEEN_KEYS: Record<(typeof BOARD_NAV_HREFS)[number], string> = {
  "/orders": "slt_nav_seen_orders",
  "/mtd": "slt_nav_seen_mtd",
  "/payroll": "slt_nav_seen_payroll",
};

function readNavSeen(href: (typeof BOARD_NAV_HREFS)[number]): number | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(NAV_SEEN_KEYS[href]);
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function writeNavSeen(href: (typeof BOARD_NAV_HREFS)[number], count: number) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(NAV_SEEN_KEYS[href], String(count));
}

function pulseCountForNav(
  href: (typeof BOARD_NAV_HREFS)[number],
  pulse: DashboardPulseApi | null
): number {
  if (!pulse) return 0;
  if (href === "/orders") return pulse.orders_tab ?? 0;
  if (href === "/mtd") return pulse.mtd_open ?? 0;
  return pulse.payroll_open ?? 0;
}

const boardPrefetchInflight = new Set<string>();

function sessionForm(key: string, fallback: OrderFormType = "school-all-star-cheer") {
  if (typeof window === "undefined") return fallback;
  const raw = sessionStorage.getItem(key) as OrderFormType | null;
  return raw || fallback;
}

function sessionCheer(key: string): CheerFormSubtypeFilter {
  if (typeof window === "undefined") return "all-star-cheer";
  return (
    (sessionStorage.getItem(key) as CheerFormSubtypeFilter | null) ||
    "all-star-cheer"
  );
}

/**
 * Pointerdown on a board nav item: start THAT board's first page now so the
 * click overlaps the fetch. Must match the form+subtype the page will open
 * (Dance/POM miss used to warm the wrong key → second slow fetch).
 */
function scheduleBoardPrefetch(href: string) {
  if (!BOARD_NAV_HREFS.includes(href as (typeof BOARD_NAV_HREFS)[number])) {
    return;
  }
  if (boardPrefetchInflight.has(href)) return;
  const run = () => {
    if (boardPrefetchInflight.has(href)) return;
    boardPrefetchInflight.add(href);
    void (async () => {
      try {
        if (href === "/orders") {
          // Same key Back-to-Orders uses (source/sort + session form).
          const { warmOrdersReturnBoard } = await import(
            "@/lib/board-nav-prefetch"
          );
          warmOrdersReturnBoard();
          return;
        }
        const { prefetchMtdBoard } = await import("@/hooks/useMtdBoard");
        if (href === "/mtd") {
          const form = sessionForm("slt_mtd_form");
          const cheer = sessionCheer("slt_mtd_cheer_subtype");
          // Key matches useMtdBoard on /mtd (cheer only; dance not in cache key).
          await prefetchMtdBoard({
            scope: "board",
            formType: form,
            cheerFormSubtype:
              form === "school-all-star-cheer" ? cheer : undefined,
          });
          return;
        }
        const form = sessionForm("slt_payroll_form");
        const cheer = sessionCheer("slt_payroll_cheer_subtype");
        await prefetchMtdBoard({
          scope: "payroll",
          formType: form,
          cheerFormSubtype:
            form === "school-all-star-cheer" ? cheer : undefined,
          search:
            sessionStorage.getItem("slt_payroll_search")?.trim() || undefined,
        });
      } catch {
        /* best-effort */
      } finally {
        boardPrefetchInflight.delete(href);
      }
    })();
  };
  // Start now — idle loses the race to navigation/mount.
  run();
}

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
  const router = useRouter();
  const { user, logout } = useAuth();
  const { expanded, toggleExpanded, setExpanded, mobileOpen, setMobileOpen } =
    useSidebar();
  const routesPrefetched = useRef(false);
  const [pulse, setPulse] = useState<DashboardPulseApi | null>(() =>
    readDashboardPulseCache()
  );
  /** SSE/patch hint before the next pulse reconcile — show dot without recounting. */
  const [navDirty, setNavDirty] = useState<
    Record<(typeof BOARD_NAV_HREFS)[number], boolean>
  >({
    "/orders": false,
    "/mtd": false,
    "/payroll": false,
  });

  // Prefetch every sidebar route chunk once (cheap JS — not data).
  useEffect(() => {
    if (routesPrefetched.current) return;
    routesPrefetched.current = true;
    for (const item of baseNavItems) {
      try {
        router.prefetch(item.href);
      } catch {
        /* ignore */
      }
    }
  }, [router]);

  // One pulse read (shared cache with Dashboard). SSE only flips dirty dots —
  // no invalidate/recount storm just for sidebar badges.
  useEffect(() => {
    let cancelled = false;

    const hit = readDashboardPulseCache();
    if (hit) setPulse(hit);
    void fetchDashboardPulseApi()
      .then((next) => {
        if (cancelled) return;
        setPulse(next);
        // First paint: seed "seen" so existing backlog (e.g. 1744) isn't "new".
        for (const href of BOARD_NAV_HREFS) {
          if (readNavSeen(href) == null) {
            writeNavSeen(href, pulseCountForNav(href, next));
          }
        }
      })
      .catch(() => {
        /* keep last */
      });

    const markDirty = (href: (typeof BOARD_NAV_HREFS)[number]) => {
      setNavDirty((prev) => (prev[href] ? prev : { ...prev, [href]: true }));
    };

    const onPatch = (event: Event) => {
      const detail = (event as CustomEvent<{ countsChanged?: boolean }>).detail;
      if (!detail?.countsChanged) return;
      markDirty("/orders");
    };
    window.addEventListener(ORDERS_BOARD_PATCH_EVENT, onPatch);

    const ac = new AbortController();
    void subscribeBoardStream((event) => {
      if (cancelled) return;
      if (event.type === "order.deleted" || event.type === "order.updated") {
        markDirty("/orders");
      }
      if (event.type === "mtd.updated") {
        markDirty("/mtd");
        markDirty("/payroll");
      }
    }, ac.signal);

    return () => {
      cancelled = true;
      window.removeEventListener(ORDERS_BOARD_PATCH_EVENT, onPatch);
      ac.abort();
    };
  }, []);

  // Visiting a board clears its "new" dot and remembers the current total.
  // Orders Match / Flagged / [id] are separate workspaces — do not clear the
  // Orders novelty dot just because the path starts with /orders/.
  useEffect(() => {
    const board = BOARD_NAV_HREFS.find((href) => {
      if (pathname === href) return true;
      if (href === "/orders") return false;
      return pathname.startsWith(`${href}/`);
    });
    if (!board) return;

    const applySeen = (p: DashboardPulseApi | null) => {
      writeNavSeen(board, pulseCountForNav(board, p));
      setNavDirty((prev) =>
        prev[board] ? { ...prev, [board]: false } : prev
      );
    };

    const cached = readDashboardPulseCache();
    applySeen(cached ?? pulse);

    // Any pulse in the GC window is enough for dots — don't re-hit /pulse
    // on every Orders/MTD/Payroll visit (that made sidebar hops feel stuck).
    if (cached) {
      setPulse(cached);
      return;
    }

    void fetchDashboardPulseApi()
      .then((next) => {
        setPulse(next);
        applySeen(next);
      })
      .catch(() => {
        /* keep dirty/seen */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- visit reconcile only
  }, [pathname]);

  const currentUser = user || {
    name: "Megan",
    email: "megan@soundslikethat.com",
    access_level: "Full Access",
  };

  const navItems = useMemo(
    () =>
      baseNavItems.map((item) => {
        if (!BOARD_NAV_HREFS.includes(item.href as (typeof BOARD_NAV_HREFS)[number])) {
          return item;
        }
        const href = item.href as (typeof BOARD_NAV_HREFS)[number];
        const count = pulseCountForNav(href, pulse);
        const seen = readNavSeen(href);
        const grew = seen != null && count > seen;
        return {
          ...item,
          hasNew: Boolean(navDirty[href] || grew),
        };
      }),
    [pulse, navDirty]
  );

  const showExpanded = expanded || mobileOpen;

  const onNavIntent = useCallback(
    (href: string) => {
      try {
        router.prefetch(href);
      } catch {
        /* ignore */
      }
      if (href === "/") {
        void import("@/lib/api/dashboard").then(({ warmDashboardPulse }) => {
          warmDashboardPulse();
        });
        return;
      }
      scheduleBoardPrefetch(href);
    },
    [router]
  );

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
          {navItems.map(({ href, label, icon: Icon, hasNew }) => {
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
                  prefetch
                  onClick={() => setMobileOpen(false)}
                  onMouseEnter={() => onNavIntent(href)}
                  onPointerDown={() => onNavIntent(href)}
                  className={navItemClass(active)}
                  aria-label={hasNew ? `${label} (new activity)` : label}
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
                      {hasNew ? (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-brand-blue"
                          title="New since last visit"
                          aria-hidden
                        />
                      ) : null}
                    </>
                  ) : hasNew ? (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-brand-blue" />
                  ) : null}
                </Link>
              </HoverTip>
            );
          })}
        </nav>
      </DottedScroll>

      {/* User & Sign Out: bell above avatar only when collapsed */}
      <div
        className={clsx(
          "shrink-0 border-t border-brand-sidebar-border",
          showExpanded ? "px-4 py-3" : "flex flex-col items-center gap-2 p-2"
        )}
      >
        {!showExpanded ? (
          <HoverTip label="Notifications" placement="right">
            <NotificationBell tone="dark" placement="sidebar" />
          </HoverTip>
        ) : null}

        <div
          className={clsx(
            "flex items-center rounded-xl text-left",
            showExpanded ? "w-full justify-between gap-2 py-0.5" : "justify-center"
          )}
        >
          <HoverTip
            label={
              showExpanded
                ? ""
                : `${currentUser.name} (${currentUser.access_level})`
            }
            placement="right"
            className={showExpanded ? "min-w-0 flex-1" : ""}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-brand-sidebar-elevated ring-1 ring-brand-sidebar-border">
                <img
                  src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(currentUser.name)}&backgroundColor=f5f5f3`}
                  alt={currentUser.name}
                  className="h-full w-full object-cover"
                />
              </div>
              {showExpanded ? (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold leading-tight text-brand-sidebar-ink">
                    {currentUser.name}
                  </p>
                  <span
                    className={clsx(
                      "mt-0.5 inline-block truncate text-[10px] font-semibold leading-none",
                      currentUser.access_level === "View Only"
                        ? "text-brand-amber"
                        : "text-brand-blue"
                    )}
                  >
                    {currentUser.access_level}
                  </span>
                </div>
              ) : null}
            </div>
          </HoverTip>

          {showExpanded ? (
            <div className="flex shrink-0 items-center gap-1">
              <NotificationBell tone="dark" placement="sidebar" />
              <button
                type="button"
                onClick={logout}
                className="shrink-0 rounded-lg p-1.5 text-brand-sidebar-text transition hover:bg-brand-sidebar-hover hover:text-brand-danger"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
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
