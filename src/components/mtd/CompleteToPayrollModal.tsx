"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Wallet } from "lucide-react";
import { formatPrice, titleCase } from "@/lib/data";
import { formatDisplayDate, toIsoDateString } from "@/lib/dates";
import type { MTDRecord } from "@/types";

type CompleteToPayrollModalProps = {
  open: boolean;
  record: MTDRecord | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function CompleteToPayrollModal({
  open,
  record,
  onClose,
  onConfirm,
}: CompleteToPayrollModalProps) {
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
        aria-labelledby="complete-payroll-title"
        className="relative w-full max-w-[420px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="border-b border-brand-line/60 bg-gradient-to-br from-brand-success/10 via-brand-elevated to-brand-signature/8 px-6 pb-5 pt-7">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-success/12 text-brand-success ring-1 ring-inset ring-brand-success/20">
            <Wallet className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <h2
            id="complete-payroll-title"
            className="mt-4 text-center text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
          >
            Move to payroll?
          </h2>
          <p className="mt-2 text-center text-[13px] leading-relaxed text-brand-ink-secondary">
            This mix is ready to complete. It will leave MTD and appear on the
            Payroll board.
          </p>
        </div>

        <div className="space-y-3 px-6 py-5">
          <div className="rounded-xl border border-brand-line/70 bg-brand-bg/50 p-4">
            <p className="text-[13px] font-semibold text-brand-ink">
              {titleCase(record.programName)}
            </p>
            <p className="mt-1 text-[12px] text-brand-ink-secondary">
              {titleCase(record.contactName)} · {titleCase(record.assignedProducer ?? "")}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-brand-elevated px-2.5 py-2">
                <p className="text-brand-ink-tertiary">Invoice</p>
                <p className="mt-0.5 font-semibold tabular-nums text-brand-ink">
                  {record.invoice}
                </p>
              </div>
              <div className="rounded-lg bg-brand-elevated px-2.5 py-2">
                <p className="text-brand-ink-tertiary">Price</p>
                <p className="mt-0.5 font-semibold tabular-nums text-brand-ink">
                  {formatPrice(record.price)}
                </p>
              </div>
              <div className="rounded-lg bg-brand-elevated px-2.5 py-2">
                <p className="text-brand-ink-tertiary">Mix start</p>
                <p className="mt-0.5 font-semibold text-brand-ink">
                  {formatDisplayDate(toIsoDateString(record.mixStartDate))}
                </p>
              </div>
              <div className="rounded-lg bg-brand-elevated px-2.5 py-2">
                <p className="text-brand-ink-tertiary">Mix end</p>
                <p className="mt-0.5 font-semibold text-brand-ink">
                  {formatDisplayDate(toIsoDateString(record.mixEndDate ?? ""))}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-brand-success/20 bg-brand-success/8 px-3 py-2.5">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-brand-success"
              strokeWidth={2}
            />
            <p className="text-[12px] leading-snug text-brand-ink-secondary">
              Editor, invoice, and mix dates are all set. You can return this
              record to MTD from Payroll anytime.
            </p>
          </div>
        </div>

        <div className="flex flex-col border-t border-black/[0.08]">
          <button
            type="button"
            onClick={onConfirm}
            className="border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-success transition hover:bg-brand-success/8"
          >
            Confirm & move to payroll
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
