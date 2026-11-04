"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Loader2 } from "lucide-react";

const EXPORT_ROW_CAP = 5000;

export type OrdersCsvExportFilterLine = {
  label: string;
  value: string;
};

type OrdersCsvExportModalProps = {
  open: boolean;
  /** Active export filters shown in the dialog. */
  filters?: OrdersCsvExportFilterLine[];
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function OrdersCsvExportModal({
  open,
  filters = [],
  busy = false,
  onClose,
  onConfirm,
}: OrdersCsvExportModalProps) {
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
        aria-label="Close"
        disabled={busy}
        onClick={() => {
          if (!busy) onClose();
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="orders-csv-export-title"
        className="relative w-full max-w-[420px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="px-6 pb-5 pt-7 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue-soft text-brand-signature ring-1 ring-inset ring-brand-blue/20">
            <Download className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <h2
            id="orders-csv-export-title"
            className="mt-4 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
          >
            Download Orders CSV?
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-brand-ink-secondary">
            Downloads every matching order for these filters, including ones not
            on this page. Limited to {EXPORT_ROW_CAP.toLocaleString()} rows.
          </p>
        </div>

        {filters.length > 0 ? (
          <div className="mx-6 mb-6 rounded-xl border border-brand-line/50 bg-brand-bg/50 px-3.5 py-3 text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-brand-ink-tertiary">
              Filters in this download
            </p>
            <dl className="mt-2 space-y-1.5">
              {filters.map((line) => (
                <div
                  key={line.label}
                  className="flex items-baseline justify-between gap-3 text-[12.5px] leading-snug"
                >
                  <dt className="shrink-0 text-brand-ink-tertiary">
                    {line.label}
                  </dt>
                  <dd className="min-w-0 text-right font-medium text-brand-ink">
                    <span className="line-clamp-2">{line.value}</span>
                  </dd>
                </div>
              ))}
            </dl>
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
            className="inline-flex items-center justify-center gap-2 py-3.5 text-[15px] font-semibold text-brand-signature transition hover:bg-brand-blue-soft/40 disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                Downloading…
              </>
            ) : (
              "Download CSV"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
