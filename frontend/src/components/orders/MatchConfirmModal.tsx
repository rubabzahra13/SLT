"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link2, Loader2, X } from "lucide-react";
import { useAppState } from "@/context/AppStateContext";
import {
  getOrderIdentityName,
  getFormTypeLabel,
} from "@/lib/order-detail-sections";
import { buildMatchDiffRows } from "@/lib/manual-form-merge";
import { packageTypeDisplayValue } from "@/components/mtd/PackageTypeField";
import type { Order } from "@/types";

type MatchConfirmModalProps = {
  open: boolean;
  magento: Order | null;
  manual: Order | null;
  onClose: () => void;
  onMatched?: () => void;
};

export function MatchConfirmModal({
  open,
  magento,
  manual,
  onClose,
  onMatched,
}: MatchConfirmModalProps) {
  const { matchManualWithMagento, isViewOnly } = useAppState();
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setSaving(false);
      setError(null);
    }
  }, [open]);

  const diffRows = useMemo(() => {
    if (!magento || !manual) return [];
    return buildMatchDiffRows(manual, magento);
  }, [magento, manual]);

  if (!mounted || !open || !magento || !manual) return null;

  const magentoName =
    getOrderIdentityName(magento).trim() || magento.programName || "Magento form";
  const manualName =
    getOrderIdentityName(manual).trim() || manual.programName || "Manual order";

  const handleConfirm = async () => {
    if (isViewOnly || saving) return;
    setSaving(true);
    setError(null);
    try {
      await matchManualWithMagento(manual.id, magento.id);
      onMatched?.();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not match these orders."
      );
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-confirm-title"
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-brand-line/40 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange ring-1 ring-inset ring-brand-orange/20">
              <Link2 className="h-4 w-4" strokeWidth={2} />
            </div>
            <div>
              <h2
                id="match-confirm-title"
                className="text-[15px] font-bold text-brand-ink"
              >
                Match Magento to manual
              </h2>
              <p className="mt-0.5 text-[12px] text-brand-ink-secondary">
                Magento becomes source of truth on overlapping fields.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-brand-ink-tertiary hover:bg-brand-bg hover:text-brand-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-brand-line/50 bg-white p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-ink-tertiary">
                Magento form
              </p>
              <p className="mt-1 text-[13px] font-semibold text-brand-ink">
                {magentoName}
              </p>
              <p className="mt-0.5 text-[11px] text-brand-ink-secondary">
                {getFormTypeLabel(magento.formType)}
                {magento.packageType
                  ? ` · ${packageTypeDisplayValue(magento.packageType)}`
                  : ""}
              </p>
            </div>
            <div className="rounded-xl border border-brand-line/50 bg-white p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-ink-tertiary">
                Manual order
              </p>
              <p className="mt-1 text-[13px] font-semibold text-brand-ink">
                {manualName}
              </p>
              <p className="mt-0.5 text-[11px] text-brand-ink-secondary">
                {getFormTypeLabel(manual.formType)}
                {manual.packageType
                  ? ` · ${packageTypeDisplayValue(manual.packageType)}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-brand-line/50 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-line/40 px-3 py-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-ink-tertiary">
                  Form fields
                </p>
                <p className="text-[11px] text-brand-ink-secondary">
                  All New Order / Magento fields for this form
                  {diffRows.filter((r) => r.willOverwrite).length > 0
                    ? ` · ${diffRows.filter((r) => r.willOverwrite).length} overwrite`
                    : ""}
                </p>
              </div>
              <span className="text-[11px] font-semibold tabular-nums text-brand-ink-secondary">
                {diffRows.length}
              </span>
            </div>
            {diffRows.length === 0 ? (
              <p className="px-3 py-4 text-[12px] text-brand-ink-secondary">
                No form fields for this category.
              </p>
            ) : (
              <div className="max-h-[320px] overflow-y-auto">
                <table className="w-full text-left text-[12px]">
                  <thead className="sticky top-0 bg-brand-bg/95 text-[10px] font-bold uppercase tracking-wider text-brand-ink-tertiary">
                    <tr>
                      <th className="px-3 py-2 font-bold">Field</th>
                      <th className="px-3 py-2 font-bold">Manual</th>
                      <th className="px-3 py-2 font-bold">Magento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffRows.map((row) => (
                      <tr
                        key={row.key}
                        className={
                          row.differs
                            ? "border-t border-brand-line/30 align-top bg-brand-orange/5"
                            : "border-t border-brand-line/30 align-top"
                        }
                      >
                        <td className="px-3 py-2 font-medium text-brand-ink">
                          {row.label}
                        </td>
                        <td
                          className={
                            row.differs
                              ? "px-3 py-2 text-amber-900"
                              : "px-3 py-2 text-brand-ink-secondary"
                          }
                        >
                          {row.manualValue}
                        </td>
                        <td
                          className={
                            row.differs
                              ? "px-3 py-2 text-sky-800"
                              : "px-3 py-2 text-brand-ink-secondary"
                          }
                        >
                          {row.formValue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="rounded-lg border border-brand-line/50 bg-brand-bg/70 px-3 py-2.5 text-[12px] leading-relaxed text-brand-ink-secondary">
            <span className="font-semibold text-brand-ink">Confirm match</span>{" "}
            overwrites the manual order with Magento values wherever Magento is
            filled. Fields Magento left blank keep the manual values. If you{" "}
            <span className="font-semibold text-brand-ink">Split</span> later on
            Orders, the manual order’s original data comes back as its own row
            again (while the order is still on Orders).
          </p>

          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-brand-line/40 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-9 rounded-xl border border-brand-line/70 bg-white px-3.5 text-[13px] font-semibold text-brand-ink hover:bg-brand-bg/60 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={saving || isViewOnly}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-cta px-3.5 text-[13px] font-semibold text-brand-cta-text shadow-sm hover:bg-brand-cta-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            {saving ? "Matching…" : "Confirm match"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
