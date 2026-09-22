"use client";

import type { Producer } from "@/types";
import { Avatar } from "@/components/ui/Avatar";

type DeleteProducerModalProps = {
  open: boolean;
  producer: Producer | null;
  assignedMixesCount?: number;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteProducerModal({
  open,
  producer,
  assignedMixesCount = 0,
  onClose,
  onConfirm,
}: DeleteProducerModalProps) {
  if (!open || !producer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-brand-scrim backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-producer-title"
        className="relative w-full max-w-[360px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="px-6 pb-5 pt-7 text-center">
          <div className="flex justify-center">
            <Avatar producer={producer} size="xl" />
          </div>
          <h2
            id="delete-producer-title"
            className="mt-4 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
          >
            Delete {producer.name}?
          </h2>

          {assignedMixesCount > 0 ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-left">
              <p className="text-[13px] font-medium leading-relaxed text-amber-900">
                This producer already has{" "}
                <span className="font-bold text-amber-950">
                  {assignedMixesCount} mix{assignedMixesCount === 1 ? "" : "es"}
                </span>{" "}
                assigned to them. Are you sure you want to delete them?
              </p>
              <p className="mt-1.5 text-[11px] leading-snug text-amber-800/90">
                Existing assignments will keep {producer.name}&apos;s name as read-only historical records, but {producer.name} will be removed from the producer roster and future scheduling.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-[13px] leading-relaxed text-brand-ink-secondary">
              This removes them from the producer roster and future assignments. You can add them again later if needed.
            </p>
          )}
        </div>

        <div className="flex flex-col border-t border-black/[0.08]">
          <button
            type="button"
            onClick={onConfirm}
            className="border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-danger transition hover:bg-brand-orange-soft/60"
          >
            Delete Producer
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
