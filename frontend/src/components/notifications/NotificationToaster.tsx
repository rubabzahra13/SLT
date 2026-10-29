"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";
import { useAppState } from "@/context/AppStateContext";
import type { AppAlert, AppAlertTone } from "@/types";

const AUTO_DISMISS_MS = 4500;

const toneByAlert: Record<
  AppAlertTone,
  {
    icon: typeof Info;
    accent: string;
    soft: string;
  }
> = {
  info: {
    icon: Info,
    accent: "text-sky-700",
    soft: "bg-sky-50",
  },
  success: {
    icon: CheckCircle2,
    accent: "text-emerald-700",
    soft: "bg-emerald-50",
  },
  warning: {
    icon: AlertTriangle,
    accent: "text-amber-700",
    soft: "bg-amber-50",
  },
  error: {
    icon: AlertTriangle,
    accent: "text-rose-700",
    soft: "bg-rose-50",
  },
};

export function NotificationToaster() {
  const { alerts } = useAppState();
  const router = useRouter();
  const [toasts, setToasts] = useState<AppAlert[]>([]);
  const [mounted, setMounted] = useState(false);
  const seenRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // First run: treat everything already present as seen (no toast on load).
    if (seenRef.current === null) {
      seenRef.current = new Set(alerts.map((a) => a.id));
      return;
    }

    const fresh = alerts.filter((a) => !seenRef.current!.has(a.id));
    if (fresh.length === 0) return;
    fresh.forEach((a) => seenRef.current!.add(a.id));
    setToasts((prev) => [...fresh, ...prev].slice(0, 3));
  }, [alerts]);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (!mounted || toasts.length === 0) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex justify-end px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6"
      aria-live="polite"
    >
      <div className="flex w-full max-w-[380px] flex-col-reverse gap-2">
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onDismiss={() => dismiss(toast.id)}
            onOpen={() => {
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
  toast: AppAlert;
  onDismiss: () => void;
  onOpen: () => void;
}) {
  const tone = toneByAlert[toast.tone] ?? toneByAlert.info;
  const Icon = tone.icon;

  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="pointer-events-auto rounded-xl border border-brand-line/70 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.1)]"
      role="status"
    >
      <div className="flex items-start gap-2.5 px-3 py-2.5">
        <span
          className={clsx(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            tone.soft,
            tone.accent
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2.1} />
        </span>

        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
        >
          <p className="text-[13px] font-semibold tracking-[-0.01em] text-brand-ink">
            {toast.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-brand-ink-secondary">
            {toast.message}
          </p>
          {toast.href ? (
            <span className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-brand-ink">
              Open
              <ArrowUpRight className="h-3 w-3" strokeWidth={2.25} />
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-1 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink"
          aria-label="Dismiss alert"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
