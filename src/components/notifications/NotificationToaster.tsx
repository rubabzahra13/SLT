"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Bell, CalendarClock, PackageCheck, X } from "lucide-react";
import { useAppState } from "@/context/AppStateContext";
import type { AppNotification } from "@/types";

const AUTO_DISMISS_MS = 6000;

const toneByType: Record<
  AppNotification["type"],
  { icon: typeof Bell; ring: string; iconColor: string; bar: string }
> = {
  new_order: {
    icon: Bell,
    ring: "ring-brand-orange/30",
    iconColor: "text-brand-orange",
    bar: "bg-brand-orange",
  },
  mtd_move: {
    icon: PackageCheck,
    ring: "ring-brand-success/30",
    iconColor: "text-brand-success",
    bar: "bg-brand-success",
  },
  schedule: {
    icon: CalendarClock,
    ring: "ring-brand-warning/30",
    iconColor: "text-brand-warning",
    bar: "bg-brand-warning",
  },
};

export function NotificationToaster() {
  const { notifications, markNotificationRead } = useAppState();
  const router = useRouter();
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const seenRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    // First run: treat everything already present as seen (no toast on load).
    if (seenRef.current === null) {
      seenRef.current = new Set(notifications.map((n) => n.id));
      return;
    }

    const fresh = notifications.filter((n) => !seenRef.current!.has(n.id));
    if (fresh.length === 0) return;
    fresh.forEach((n) => seenRef.current!.add(n.id));
    setToasts((prev) => [...fresh, ...prev].slice(0, 4));
  }, [notifications]);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[calc(100vw-2rem)] max-w-[360px] flex-col gap-2.5">
      {toasts.map((toast) => (
        <ToastCard
          key={toast.id}
          toast={toast}
          onDismiss={() => dismiss(toast.id)}
          onOpen={() => {
            markNotificationRead(toast.id);
            dismiss(toast.id);
            if (toast.href) router.push(toast.href);
          }}
        />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
  onOpen,
}: {
  toast: AppNotification;
  onDismiss: () => void;
  onOpen: () => void;
}) {
  const tone = toneByType[toast.type];
  const Icon = tone.icon;

  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="animate-toast-in pointer-events-auto overflow-hidden rounded-2xl border border-brand-line bg-brand-elevated shadow-[var(--shadow-premium)]"
      role="status"
    >
      <div className="flex items-start gap-3 p-3.5">
        <span
          className={clsx(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-bg ring-1 ring-inset",
            tone.ring
          )}
        >
          <Icon className={clsx("h-4 w-4", tone.iconColor)} strokeWidth={2} />
        </span>

        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-[13px] font-semibold text-brand-ink">
            {toast.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-brand-ink-secondary">
            {toast.message}
          </p>
          {toast.href ? (
            <span className="mt-1 inline-block text-[11px] font-semibold text-brand-signature">
              View
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full p-1 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="h-0.5 w-full bg-brand-line/60">
        <div className={clsx("animate-toast-bar h-full", tone.bar)} />
      </div>
    </div>
  );
}
