"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import { titleCase } from "@/lib/data";
import type { MTDRecord } from "@/types";

type DeleteForeverConfirmModalProps = {
  open: boolean;
  record: MTDRecord | null;
  deleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteForeverConfirmModal({
  open,
  record,
  deleting = false,
  onClose,
  onConfirm,
}: DeleteForeverConfirmModalProps) {
  const [mounted, setMounted] = useState(false);
  // Arm after open so the row-button click cannot land on Confirm.
  const [confirmReady, setConfirmReady] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setConfirmReady(false);
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const arm = window.setTimeout(() => setConfirmReady(true), 250);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(arm);
    };
  }, [open]);

  if (!mounted || !open || !record) return null;

  const invoice = record.invoice?.trim();

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-brand-scrim backdrop-blur-sm"
        aria-label="Dismiss"
        disabled={deleting}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-forever-title"
        className="relative w-full max-w-[400px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="px-6 pb-5 pt-7 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-danger/12 text-brand-danger ring-1 ring-inset ring-brand-danger/25">
            <Trash2 className="h-7 w-7" strokeWidth={2.25} />
          </div>
          <h2
            id="delete-forever-title"
            className="mt-4 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
          >
            Delete forever?
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-brand-ink-secondary">
            {titleCase(record.programName)}
            {invoice ? (
              <>
                {" "}
                · <span className="font-semibold text-brand-ink">#{invoice}</span>
              </>
            ) : null}{" "}
            will be permanently removed from the payroll archive. This cannot be
            undone.
          </p>
        </div>

        <div className="grid grid-cols-2 border-t border-black/[0.08]">
          <button
            type="button"
            disabled={deleting}
            onClick={onClose}
            className="border-r border-black/[0.08] py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting || !confirmReady}
            onClick={onConfirm}
            className="py-3.5 text-[15px] font-semibold text-brand-danger transition hover:bg-brand-danger/10 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete forever"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
