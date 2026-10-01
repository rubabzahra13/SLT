"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { DiscountCode } from "@/types";

type DeleteDiscountCodeModalProps = {
  open: boolean;
  discountCode: DiscountCode | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteDiscountCodeModal({
  open,
  discountCode,
  onClose,
  onConfirm,
}: DeleteDiscountCodeModalProps) {
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

  if (!mounted || !open || !discountCode) return null;

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
        aria-labelledby="delete-discount-code-title"
        className="relative w-full max-w-[340px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="px-6 pb-5 pt-7 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange-soft text-[13px] font-bold tracking-[0.08em] text-brand-orange-deep">
            {discountCode.code.slice(0, 4)}
          </div>
          <h2
            id="delete-discount-code-title"
            className="mt-4 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
          >
            Delete {discountCode.code}?
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-brand-ink-secondary">
            {discountCode.description}
          </p>
          <p className="mt-3 text-[12px] leading-relaxed text-brand-ink-tertiary">
            This removes the code from your catalog. Existing orders that used
            it will keep their coupon field.
          </p>
        </div>

        <div className="flex flex-col border-t border-black/[0.08]">
          <button
            type="button"
            onClick={onConfirm}
            className="border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-danger transition hover:bg-brand-orange-soft/60"
          >
            Delete code
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
