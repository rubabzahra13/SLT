"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeftCircle } from "lucide-react";
import { titleCase } from "@/lib/data";
import type { MTDRecord } from "@/types";

type ReturnToMTDModalProps = {
  open: boolean;
  record: MTDRecord | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function ReturnToMTDModal({
  open,
  record,
  onClose,
  onConfirm,
}: ReturnToMTDModalProps) {
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
        aria-labelledby="return-mtd-title"
        className="relative w-full max-w-[380px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="px-6 pb-5 pt-7 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-signature/10 text-brand-signature ring-1 ring-inset ring-brand-signature/20">
            <ArrowLeftCircle className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <h2
            id="return-mtd-title"
            className="mt-4 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
          >
            Return to MTD?
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-brand-ink-secondary">
            {titleCase(record.programName)} will move back to the MTD board as
            Ongoing. Payroll status will be cleared.
          </p>
        </div>

        <div className="flex flex-col border-t border-black/[0.08]">
          <button
            type="button"
            onClick={onConfirm}
            className="border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-signature transition hover:bg-brand-signature/8"
          >
            Return to MTD
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
