"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ConfirmDeleteProducerAssignModalProps = {
  open: boolean;
  deletedProducerName: string;
  newProducerName: string;
  programName: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteProducerAssignModal({
  open,
  deletedProducerName,
  newProducerName,
  programName,
  onClose,
  onConfirm,
}: ConfirmDeleteProducerAssignModalProps) {
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
        aria-labelledby="confirm-delete-producer-assign-title"
        className="relative w-full max-w-[400px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="px-6 pb-5 pt-7 text-center">
          <h2
            id="confirm-delete-producer-assign-title"
            className="text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
          >
            Confirm producer deletion
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-brand-ink-secondary">
            Assigning{" "}
            <span className="font-semibold text-brand-ink">{newProducerName}</span>{" "}
            to{" "}
            <span className="font-semibold text-brand-ink">{programName}</span>{" "}
            will delete{" "}
            <span className="font-semibold text-brand-ink">
              {deletedProducerName}
            </span>{" "}
            from the roster.
          </p>
        </div>

        <div className="flex flex-col border-t border-black/[0.08]">
          <button
            type="button"
            onClick={onConfirm}
            className="border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-danger transition hover:bg-brand-orange-soft/60"
          >
            Delete & assign
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
