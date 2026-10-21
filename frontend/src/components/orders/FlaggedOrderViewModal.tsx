"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, Flag, X } from "lucide-react";
import { MTDOrderDetails } from "@/components/mtd/MTDOrderDetails";
import { useAppState } from "@/context/AppStateContext";
import { findLinkedOrder } from "@/lib/editor-assignment";
import { orderFromMTDRecord } from "@/lib/order-detail-fields";
import { resolveOrderFormDisplay } from "@/lib/order-form-display";
import { formatDisplayDateTime } from "@/lib/dates";
import type { MTDRecord, Order } from "@/types";

type FlaggedOrderViewModalProps = {
  open: boolean;
  record: MTDRecord | null;
  allOrders: Order[];
  onClose: () => void;
  onResolve?: (record: MTDRecord) => void;
};

/**
 * Read-only Magento order snapshot for Flagged (multi-affiliate) rows.
 * Editing / using as a normal order requires resolving the affiliate first.
 */
export function FlaggedOrderViewModal({
  open,
  record,
  allOrders,
  onClose,
  onResolve,
}: FlaggedOrderViewModalProps) {
  const { discountCodes, producers } = useAppState();
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

  const displayOrder = useMemo(() => {
    if (!record) return null;
    const linked =
      findLinkedOrder(record, allOrders) ?? orderFromMTDRecord(record);
    return resolveOrderFormDisplay(linked, record);
  }, [record, allOrders]);

  if (!mounted || !open || !record || !displayOrder) return null;

  const title =
    displayOrder.programName ||
    displayOrder.teamName ||
    record.programName ||
    "Order form";
  const subtitle =
    displayOrder.contactName ||
    displayOrder.customerName ||
    record.contactName ||
    "Customer";
  const createdLabel = formatDisplayDateTime(displayOrder.createdAt);

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
        aria-labelledby="flagged-order-view-title"
        className="relative flex max-h-[90vh] w-full max-w-[920px] flex-col overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-brand-line/60 bg-gradient-to-br from-rose-500/10 via-brand-elevated to-brand-signature/8 px-6 pb-5 pt-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/12 text-rose-700 ring-1 ring-inset ring-rose-500/20">
              <Eye className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                Magento order · read only
              </p>
              <h2
                id="flagged-order-view-title"
                className="mt-0.5 truncate text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
              >
                {title}
              </h2>
              <p className="mt-0.5 truncate text-[13px] text-brand-ink-secondary">
                {subtitle}
              </p>
              {createdLabel !== "—" ? (
                <p className="mt-1 text-[12px] tabular-nums text-brand-ink-tertiary">
                  Timestamp {createdLabel}
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-line/60 bg-white text-brand-ink-secondary shadow-sm transition hover:border-brand-line hover:bg-brand-bg hover:text-brand-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>

        <div className="shrink-0 border-b border-rose-500/20 bg-rose-500/8 px-6 py-3">
          <p className="text-[12px] leading-snug text-rose-900/90">
            <span className="font-semibold">Read only</span> — this view is for
            music affiliate resolution only. Resolve the affiliate to edit the
            form, use it as a real order on Orders, or match it with a manual
            order.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          <MTDOrderDetails
            order={displayOrder}
            originalOrder={displayOrder}
            discountCodes={discountCodes}
            producers={producers}
            editable={false}
            highlightMissing={false}
          />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-brand-line/60 bg-brand-bg/40 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-brand-line/70 bg-white px-4 py-2 text-[13px] font-semibold text-brand-ink-secondary shadow-sm transition hover:bg-brand-bg"
          >
            Close
          </button>
          {onResolve ? (
            <button
              type="button"
              onClick={() => {
                onResolve(record);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-orange px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-orange-hover"
            >
              <Flag className="h-3.5 w-3.5" strokeWidth={2.25} />
              Resolve affiliate
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
