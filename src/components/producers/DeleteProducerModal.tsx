"use client";

import type { Producer } from "@/types";

type DeleteProducerModalProps = {
  open: boolean;
  producer: Producer | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteProducerModal({
  open,
  producer,
  onClose,
  onConfirm,
}: DeleteProducerModalProps) {
  if (!open || !producer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-producer-title"
        className="relative w-full max-w-[340px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="px-6 pb-5 pt-7 text-center">
          <img
            src={producer.avatar}
            alt=""
            className="mx-auto h-16 w-16 rounded-full bg-brand-bg object-cover"
          />
          <h2
            id="delete-producer-title"
            className="mt-4 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
          >
            Delete {producer.name}?
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-brand-ink-secondary">
            This removes them from the producer roster. You can add them again
            later if needed.
          </p>
        </div>

        <div className="flex flex-col border-t border-black/[0.08]">
          <button
            type="button"
            onClick={onConfirm}
            className="border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-danger transition hover:bg-brand-orange-soft/60"
          >
            Delete
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
    </div>
  );
}
