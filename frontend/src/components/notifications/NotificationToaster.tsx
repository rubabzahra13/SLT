"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CalendarClock,
  PackageCheck,
  Wallet,
  X,
} from "lucide-react";
import { useAppState } from "@/context/AppStateContext";
import type { AppNotification } from "@/types";

const AUTO_DISMISS_MS = 5600;

const toneByType: Record<
  AppNotification["type"],
  {
    icon: typeof Bell;
    accent: string;
    soft: string;
    bar: string;
  }
> = {
  new_order: {
    icon: Bell,
    accent: "text-[#d97706]",
    soft: "bg-[#fff7ed]",
    bar: "bg-[#f07840]",
  },
  mtd_move: {
    icon: PackageCheck,
    accent: "text-emerald-600",
    soft: "bg-emerald-50",
    bar: "bg-emerald-500",
  },
  schedule: {
    icon: CalendarClock,
    accent: "text-amber-700",
    soft: "bg-amber-50",
    bar: "bg-amber-500",
  },
  payroll: {
    icon: Wallet,
    accent: "text-sky-700",
    soft: "bg-sky-50",
    bar: "bg-sky-500",
  },
  error: {
    icon: AlertTriangle,
    accent: "text-rose-700",
    soft: "bg-rose-50",
    bar: "bg-rose-500",
  },
};

export function NotificationToaster() {
  const { notifications, markNotificationRead } = useAppState();
  const router = useRouter();
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [mounted, setMounted] = useState(false);
  const seenRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // First run: treat everything already present as seen (no toast on load).
    if (seenRef.current === null) {
      seenRef.current = new Set(notifications.map((n) => n.id));
      return;
    }

    const fresh = notifications.filter((n) => !seenRef.current!.has(n.id));
    if (fresh.length === 0) return;
    fresh.forEach((n) => seenRef.current!.add(n.id));
    setToasts((prev) => [...fresh, ...prev].slice(0, 3));
  }, [notifications]);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (!mounted || toasts.length === 0) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex justify-center px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6"
      aria-live="polite"
    >
      <div className="flex w-full max-w-[420px] flex-col-reverse gap-2.5">
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
    </div>,
    document.body
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
  const tone = toneByType[toast.type] ?? toneByType.schedule;
  const Icon = tone.icon;

  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="animate-toast-in pointer-events-auto overflow-hidden rounded-[22px] border border-white/70 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.16),0_2px_8px_rgba(15,23,42,0.06)] backdrop-blur-xl"
      role="status"
    >
      <div className="flex items-start gap-3 px-3.5 pb-3 pt-3.5">
        <span
          className={clsx(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
            tone.soft,
            tone.accent
          )}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
        </span>

        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
        >
          <p className="text-[13px] font-semibold tracking-[-0.01em] text-slate-900">
            {toast.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-slate-500">
            {toast.message}
          </p>
          {toast.href ? (
            <span className="mt-1.5 inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-800">
              Open
              <ArrowUpRight className="h-3 w-3" strokeWidth={2.25} />
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      </div>

      <div className="h-[3px] w-full bg-slate-100/90">
        <div className={clsx("animate-toast-bar h-full rounded-full", tone.bar)} />
      </div>
    </div>
  );
}
