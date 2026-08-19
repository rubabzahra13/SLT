"use client";

import clsx from "clsx";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { useAppState } from "@/context/AppStateContext";
import { useState } from "react";

export function NotificationBell() {
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
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-brand-line bg-brand-surface transition hover:bg-brand-bg"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 text-brand-ink-secondary" strokeWidth={1.75} />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-accent px-1 text-[9px] font-bold text-white">
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
          <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-brand-line bg-brand-surface shadow-[var(--shadow-premium)]">
            <div className="flex items-center justify-between border-b border-brand-line px-4 py-3">
              <p className="text-[13px] font-semibold">Notifications</p>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="text-[11px] font-medium text-brand-ink-secondary hover:text-brand-ink"
                >
                  Mark all read
                </button>
              ) : null}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-[12px] text-brand-ink-tertiary">
                  No notifications yet
                </p>
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
                      "block border-b border-brand-line px-4 py-3 transition last:border-b-0 hover:bg-brand-bg/60",
                      !n.read && "bg-brand-bg/40"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={clsx(
                          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                          n.type === "new_order" && "bg-brand-info",
                          n.type === "mtd_move" && "bg-brand-success",
                          n.type === "schedule" && "bg-brand-warning"
                        )}
                      />
                      <div>
                        <p className="text-[12px] font-semibold">{n.title}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-brand-ink-secondary">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function ToastStack() {
  const { notifications, markNotificationRead } = useAppState();
  const recent = notifications.filter((n) => !n.read).slice(0, 2);

  if (recent.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {recent.map((n) => (
        <div
          key={n.id}
          className="surface-premium flex max-w-sm items-start gap-3 rounded-xl px-4 py-3 shadow-[var(--shadow-premium)]"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold">{n.title}</p>
            <p className="mt-0.5 text-[11px] text-brand-ink-secondary">{n.message}</p>
          </div>
          <button
            type="button"
            onClick={() => markNotificationRead(n.id)}
            className="shrink-0 text-brand-ink-tertiary hover:text-brand-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
