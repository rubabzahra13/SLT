"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, UserX } from "lucide-react";
import { titleCase } from "@/lib/data";
import { getDisplayAssignedProducer } from "@/lib/editor-assignment";
import { getOrderIdentityName } from "@/lib/order-detail-sections";
import type { MTDRecord, Order } from "@/types";

type DeleteOrderConfirmModalProps = {
  open: boolean;
  record: MTDRecord | null;
  linkedOrder?: Order | null;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

export function DeleteOrderConfirmModal({
  open,
  record,
  linkedOrder,
  onClose,
  onConfirm,
  busy = false,
}: DeleteOrderConfirmModalProps) {
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

  const label =
    (linkedOrder ? getOrderIdentityName(linkedOrder).trim() : "") ||
    record.programName?.trim() ||
    "This order";
  const assigned =
    getDisplayAssignedProducer(record) ||
    linkedOrder?.assignedProducer?.trim() ||
    record.assignedProducer?.trim() ||
    null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={busy ? undefined : onClose}
        aria-label="Close"
        disabled={busy}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-order-title"
        className="relative w-full max-w-[400px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="px-6 pb-5 pt-7 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange-soft text-brand-orange-deep ring-1 ring-inset ring-brand-orange/25">
            <Trash2 className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <h2
            id="delete-order-title"
            className="mt-4 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
          >
            Delete {titleCase(label)}?
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-brand-ink-secondary">
            This permanently removes the order from Orders. This cannot be
            undone.
          </p>
        </div>

        {assigned ? (
          <div className="mx-6 mb-6 flex items-start gap-2.5 rounded-xl border border-brand-warning/25 bg-brand-warning/8 px-3.5 py-3 text-left">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-warning/15 text-brand-warning">
              <UserX className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
            <p className="text-[12.5px] leading-relaxed text-brand-ink-secondary">
              <span className="font-semibold text-brand-ink">{assigned}</span>{" "}
              is assigned to this order and will be unassigned when you delete
              it.
            </p>
          </div>
        ) : (
          <div className="mb-2" />
        )}

        <div className="grid grid-cols-2 border-t border-black/[0.08]">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="border-r border-black/[0.08] py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="py-3.5 text-[15px] font-semibold text-brand-danger transition hover:bg-brand-orange-soft/60 disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
