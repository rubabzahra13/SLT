"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SplitSquareVertical } from "lucide-react";
import { getOrderIdentityName } from "@/lib/order-detail-sections";
import type { Order } from "@/types";

type SplitManualFormConfirmModalProps = {
  open: boolean;
  manual: Order;
  form: Order;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function SplitManualFormConfirmModal({
  open,
  manual,
  form,
  onClose,
  onConfirm,
}: SplitManualFormConfirmModalProps) {
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setBusy(false);
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!mounted || !open) return null;

  const identity =
    getOrderIdentityName(manual) ||
    getOrderIdentityName(form) ||
    "this order";

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={busy ? undefined : onClose}
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="split-manual-form-title"
        className="relative flex w-full max-w-[560px] flex-col overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="px-6 pb-5 pt-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-bg text-brand-ink-secondary ring-1 ring-inset ring-brand-line/60">
            <SplitSquareVertical className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <h2
            id="split-manual-form-title"
            className="mt-3 text-center text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
          >
            Undo Magento match?
          </h2>
          <p className="mt-2 text-center text-[13px] leading-relaxed text-brand-ink-secondary">
            <span className="font-medium text-brand-ink">{identity}</span> will
            become two separate board rows again: one Manual, one Form. They
            will not auto-match later.
          </p>
        </div>

        <div className="grid shrink-0 grid-cols-2 border-t border-black/[0.08]">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="border-r border-black/[0.08] py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleConfirm()}
            className="py-3.5 text-[15px] font-semibold text-brand-signature transition hover:bg-brand-blue-soft/40 disabled:opacity-50"
          >
            {busy ? "Splitting…" : "Split"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
