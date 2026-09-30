"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { AlertTriangle } from "lucide-react";
import type { DailyLimitUsageLine } from "@/lib/assign-editor-calendar";

type AssignLimitWarningModalProps = {
  open: boolean;
  producerName: string;
  rangeLabel: string;
  issues: string[];
  usage: DailyLimitUsageLine[];
  onClose: () => void;
  onConfirm: () => void;
};

export function AssignLimitWarningModal({
  open,
  producerName,
  rangeLabel,
  issues,
  usage,
  onClose,
  onConfirm,
}: AssignLimitWarningModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-limit-warning-title"
        className="relative w-full max-w-[420px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="px-6 pb-5 pt-7 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-warning/10 text-brand-warning ring-1 ring-inset ring-brand-warning/25">
            <AlertTriangle className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <h2
            id="assign-limit-warning-title"
            className="mt-4 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
          >
            Assignment not recommended
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-brand-ink-secondary">
            <span className="font-semibold text-brand-ink">{producerName}</span>{" "}
            will go over their daily limits for{" "}
            <span className="tabular-nums">{rangeLabel}</span>. You can still
            assign them.
          </p>
        </div>

        <div className="mx-6 mb-6 space-y-2.5 rounded-xl border border-brand-warning/25 bg-brand-warning/8 px-3.5 py-3 text-left">
          <ul className="space-y-1">
            {issues.map((issue) => (
              <li
                key={issue}
                className="text-[12.5px] font-semibold leading-snug text-brand-warning"
              >
                {issue}
              </li>
            ))}
          </ul>
          {usage.length > 0 ? (
            <dl className="space-y-1 border-t border-brand-warning/25 pt-2">
              {usage.map((line) => (
                <div key={line.label}>
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-brand-ink-tertiary">
                    {line.label}
                  </dt>
                  <dd
                    className={clsx(
                      "text-[12px] tabular-nums",
                      line.over ? "font-semibold text-brand-warning" : "text-brand-ink"
                    )}
                  >
                    {line.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        <div className="grid grid-cols-2 border-t border-black/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="border-r border-black/[0.08] py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onConfirm();
            }}
            className="py-3.5 text-[15px] font-semibold text-brand-warning transition hover:bg-brand-warning/8"
          >
            Assign anyway
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
