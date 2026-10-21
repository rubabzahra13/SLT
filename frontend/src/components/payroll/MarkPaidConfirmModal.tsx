"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { titleCase } from "@/lib/data";
import { getDisplayAssignedProducer } from "@/lib/editor-assignment";
import type { MTDRecord } from "@/types";

type MarkPaidConfirmModalProps = {
  open: boolean;
  record: MTDRecord | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function MarkPaidConfirmModal({
  open,
  record,
  onClose,
  onConfirm,
}: MarkPaidConfirmModalProps) {
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

  const assigned = getDisplayAssignedProducer(record);
  const invoice = record.invoice?.trim();

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
        aria-labelledby="mark-paid-title"
        className="relative w-full max-w-[400px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="px-6 pb-5 pt-7 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-success/12 text-brand-success ring-1 ring-inset ring-brand-success/25">
            <Check className="h-7 w-7" strokeWidth={2.25} />
          </div>
          <h2
            id="mark-paid-title"
            className="mt-4 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
          >
            Mark as paid?
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-brand-ink-secondary">
            {titleCase(record.programName)}
            {invoice ? (
              <>
                {" "}
                · <span className="font-semibold text-brand-ink">#{invoice}</span>
              </>
            ) : null}
            {assigned ? (
              <>
                {" "}
                ·{" "}
                <span className="font-semibold text-brand-ink">{assigned}</span>
              </>
            ) : null}{" "}
            will move to the payroll archive.
          </p>
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
            onClick={onConfirm}
            className="py-3.5 text-[15px] font-semibold text-brand-success transition hover:bg-brand-success/10"
          >
            Mark paid
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
