"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Lock } from "lucide-react";
import { titleCase } from "@/lib/data";
import { getDisplayAssignedProducer } from "@/lib/editor-assignment";
import type { MTDRecord } from "@/types";

type MoveToMtdConfirmModalProps = {
  open: boolean;
  record: MTDRecord | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function MoveToMtdConfirmModal({
  open,
  record,
  onClose,
  onConfirm,
}: MoveToMtdConfirmModalProps) {
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
        aria-labelledby="move-to-mtd-title"
        className="relative w-full max-w-[400px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="px-6 pb-5 pt-7 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue-soft text-brand-signature ring-1 ring-inset ring-brand-blue/20">
            <ArrowRight className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <h2
            id="move-to-mtd-title"
            className="mt-4 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
          >
            Move to MTD?
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-brand-ink-secondary">
            {titleCase(record.programName)} will move to the MTD board.
          </p>
        </div>

        <div className="mx-6 mb-6 flex items-start gap-2.5 rounded-xl border border-brand-warning/25 bg-brand-warning/8 px-3.5 py-3 text-left">
          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-warning/15 text-brand-warning">
            <Lock className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          <p className="text-[12.5px] leading-relaxed text-brand-ink-secondary">
            Once on MTD, the editor
            {assigned ? (
              <>
                {" "}
                (<span className="font-semibold text-brand-ink">{assigned}</span>)
              </>
            ) : null}{" "}
            can no longer be reassigned. Assign or change the editor here on the
            Orders tab before moving.
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
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="py-3.5 text-[15px] font-semibold text-brand-signature transition hover:bg-brand-blue-soft/40"
          >
            Move to MTD
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
