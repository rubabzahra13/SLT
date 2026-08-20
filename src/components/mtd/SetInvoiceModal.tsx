"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { MTDRecord } from "@/types";

type SetInvoiceModalProps = {
  open: boolean;
  record: MTDRecord | null;
  onClose: () => void;
  onSave: (recordId: string, invoice: string) => void;
};

export function SetInvoiceModal({
  open,
  record,
  onClose,
  onSave,
}: SetInvoiceModalProps) {
  const [invoice, setInvoice] = useState("");

  useEffect(() => {
    if (!open || !record) return;
    setInvoice(record.invoice ?? "");
  }, [open, record]);

  if (!open || !record) return null;

  function handleSave() {
    onSave(record!.id, invoice.trim());
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-brand-scrim backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="surface-premium relative w-full max-w-md rounded-2xl shadow-[var(--shadow-premium)]">
        <div className="flex items-start justify-between gap-4 border-b border-brand-line/70 p-6">
          <div>
            <p className="text-label">Invoice (H)</p>
            <h2 className="text-display mt-1 text-[18px]">
              {record.invoice ? "Edit invoice" : "Set invoice"}
            </h2>
            <p className="mt-1 text-[13px] text-brand-ink-secondary">
              {record.programName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <label className="block">
            <span className="text-label">Invoice number</span>
            <input
              type="text"
              value={invoice}
              onChange={(e) => setInvoice(e.target.value)}
              placeholder="e.g. INV-1042"
              className="mt-1.5 w-full rounded-lg border border-brand-line/80 bg-brand-surface px-3 py-2 text-[13px] text-brand-ink outline-none transition focus:border-brand-orange/50 focus:ring-2 focus:ring-brand-orange-muted"
              autoFocus
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-brand-line/70 p-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-[13px] font-medium text-brand-ink-secondary transition hover:bg-brand-bg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-brand-cta px-4 py-2 text-[13px] font-medium text-brand-cta-text transition hover:bg-brand-cta-hover"
          >
            Save invoice
          </button>
        </div>
      </div>
    </div>
  );
}
