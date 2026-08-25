"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle } from "lucide-react";
import { getCompletionRequirements } from "@/lib/mtd-completion";
import { titleCase } from "@/lib/data";
import type { MTDRecord } from "@/types";

type CompletionBlockedModalProps = {
  open: boolean;
  record: MTDRecord | null;
  onClose: () => void;
};

export function CompletionBlockedModal({
  open,
  record,
  onClose,
}: CompletionBlockedModalProps) {
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

  if (!mounted || !open || !record) return null;

  const requirements = getCompletionRequirements(record);

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
        aria-labelledby="completion-blocked-title"
        className="relative w-full max-w-[400px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="px-6 pb-5 pt-7 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-warning/12 text-brand-warning ring-1 ring-inset ring-brand-warning/20">
            <AlertCircle className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <h2
            id="completion-blocked-title"
            className="mt-4 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
          >
            Cannot mark completed yet
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-brand-ink-secondary">
            {titleCase(record.programName)} still needs a few fields before it
            can move to payroll.
          </p>
        </div>

        <ul className="space-y-2 px-6 pb-6">
          {requirements.map((item) => (
            <li
              key={item.key}
              className="flex items-center justify-between rounded-xl border border-brand-line/70 bg-brand-bg/40 px-3 py-2.5"
            >
              <span className="text-[13px] text-brand-ink">{item.label}</span>
              <span
                className={
                  item.met
                    ? "text-[11px] font-semibold uppercase tracking-wide text-brand-success"
                    : "text-[11px] font-semibold uppercase tracking-wide text-brand-warning"
                }
              >
                {item.met ? "Ready" : "Missing"}
              </span>
            </li>
          ))}
        </ul>

        <div className="border-t border-black/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
