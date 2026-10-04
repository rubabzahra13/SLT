"use client";

import clsx from "clsx";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useAppState } from "@/context/AppStateContext";
import { DottedScroll } from "@/components/ui/DottedScroll";
import { useState } from "react";

export function NotificationBell({
  tone = "light",
}: {
  tone?: "light" | "dark" | "glass";
}) {
  const {
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useAppState();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={clsx(
          "relative flex h-8 w-8 items-center justify-center rounded-xl border transition",
          tone === "glass" &&
            "border-white/[0.1] bg-white/[0.06] hover:bg-white/[0.12]",
          tone === "dark" &&
            "border-brand-sidebar-border bg-brand-sidebar-elevated hover:bg-brand-sidebar-hover",
          tone === "light" &&
            "border-brand-line bg-brand-elevated/90 hover:bg-brand-elevated"
        )}
        aria-label="Notifications"
      >
        <Bell
          className={clsx(
            "h-4 w-4",
            tone === "light"
              ? "text-brand-ink-secondary"
              : "text-brand-sidebar-text"
          )}
          strokeWidth={1.75}
        />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f07840] px-1 text-[9px] font-bold text-white shadow-[0_2px_6px_rgba(240,120,64,0.45)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-label="Close notifications"
          />
          <div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[22px] border border-brand-line/80 bg-white/95 shadow-[0_24px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-brand-line/70 px-4 py-3.5">
              <div>
                <p className="text-[13px] font-semibold tracking-[-0.01em] text-brand-ink">
                  Notifications
                </p>
                {unreadCount > 0 ? (
                  <p className="mt-0.5 text-[11px] text-brand-ink-tertiary">
                    {unreadCount} unread
                  </p>
                ) : null}
              </div>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="rounded-full bg-brand-bg px-2.5 py-1 text-[11px] font-semibold text-brand-ink-secondary transition hover:bg-brand-line/50 hover:text-brand-ink"
                >
                  Mark all read
                </button>
              ) : null}
            </div>
            <DottedScroll
              className="max-h-80"
              scrollClassName="max-h-80 overflow-y-scroll scrollbar-hide"
              indicatorPlacement="gutter"
            >
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center px-4 py-10 text-center">
                  <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-bg text-brand-ink-tertiary">
                    <Bell className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <p className="text-[13px] font-medium text-brand-ink">
                    You&apos;re all caught up
                  </p>
                  <p className="mt-1 text-[12px] text-brand-ink-tertiary">
                    New schedule and assignment updates show up here.
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={n.href || "#"}
                    onClick={() => {
                      markNotificationRead(n.id);
                      setOpen(false);
                    }}
                    className={clsx(
                      "block border-b border-brand-line/60 px-4 py-3.5 transition last:border-b-0 hover:bg-brand-bg/70",
                      !n.read && "bg-brand-signature-soft/40"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={clsx(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          n.type === "new_order" && "bg-brand-orange",
                          n.type === "mtd_move" && "bg-brand-success",
                          n.type === "schedule" && "bg-brand-warning",
                          n.type === "payroll" && "bg-brand-blue",
                          n.type === "error" && "bg-red-500",
                          n.read && "opacity-35"
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-brand-ink">
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-brand-ink-secondary">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </DottedScroll>
          </div>
        </>
      ) : null}
    </div>
  );
}
