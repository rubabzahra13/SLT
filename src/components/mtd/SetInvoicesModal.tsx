"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { DottedScroll } from "@/components/ui/DottedScroll";
import type { MTDRecord } from "@/types";

type SetInvoicesModalProps = {
  open: boolean;
  records: MTDRecord[];
  onClose: () => void;
  onSave: (updates: Record<string, string>) => void;
};

export function SetInvoicesModal({
  open,
  records,
  onClose,
  onSave,
}: SetInvoicesModalProps) {
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    for (const rec of records) {
      next[rec.id] = rec.invoice ?? "";
    }
    setDraft(next);
  }, [open, records]);

  if (!open) return null;

  function handleSave() {
    onSave(draft);
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
      <div className="surface-premium relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl shadow-[var(--shadow-premium)]">
        <div className="flex items-start justify-between gap-4 border-b border-brand-line/70 p-6">
          <div>
            <p className="text-label">Invoice (H)</p>
            <h2 className="text-display mt-1 text-[18px]">Set invoices</h2>
            <p className="mt-1 text-[13px] text-brand-ink-secondary">
              Enter invoice numbers for the {records.length} visible MTD rows.
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

        <DottedScroll
          className="min-h-0 flex-1"
          scrollClassName="overflow-y-scroll scrollbar-hide p-6"
          indicatorPlacement="gutter"
          contentClassName="overflow-hidden rounded-xl border border-brand-line/70"
        >
          {records.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-brand-ink-secondary">
              No rows match the current filters.
            </p>
          ) : (
            records.map((rec, index) => (
              <div
                key={rec.id}
                className={
                  index > 0
                    ? "flex items-center justify-between gap-4 border-t border-brand-line/60 px-4 py-3"
                    : "flex items-center justify-between gap-4 px-4 py-3"
                }
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">
                    {rec.programName}
                  </p>
                  <p className="truncate text-[11px] text-brand-ink-tertiary">
                    {rec.contactName} · {rec.package}
                  </p>
                </div>
                <input
                  type="text"
                  value={draft[rec.id] ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      [rec.id]: e.target.value,
                    }))
                  }
                  placeholder="Invoice #"
                  className="w-36 shrink-0 rounded-lg border border-brand-line/80 bg-brand-surface px-3 py-1.5 text-[13px] tabular-nums outline-none focus:border-brand-orange/50 focus:ring-2 focus:ring-brand-orange-muted"
                  aria-label={`Invoice for ${rec.programName}`}
                />
              </div>
            ))
          )}
        </DottedScroll>

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
            Save invoices
          </button>
        </div>
      </div>
    </div>
  );
}
