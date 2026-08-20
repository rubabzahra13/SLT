"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import { formatPrice } from "@/lib/data";
import {
  complianceLabel,
  getPriceForPackage,
  parsePriceInput,
} from "@/lib/pricing";
import type { MTDRecord, PriceCompliance } from "@/types";

type SetRecordPricingModalProps = {
  open: boolean;
  record: MTDRecord | null;
  packagePrices: Record<string, number>;
  onClose: () => void;
  onSave: (
    recordId: string,
    patch: { price: number; priceCompliance: PriceCompliance }
  ) => void;
};

export function SetRecordPricingModal({
  open,
  record,
  packagePrices,
  onClose,
  onSave,
}: SetRecordPricingModalProps) {
  const [compliance, setCompliance] = useState<PriceCompliance>("compliant");
  const [priceDraft, setPriceDraft] = useState("");

  useEffect(() => {
    if (!open || !record) return;
    setCompliance(record.priceCompliance);
    setPriceDraft(String(record.price));
  }, [open, record]);

  if (!open || !record) return null;

  function applyCatalogPrice(next: PriceCompliance) {
    setCompliance(next);
    const catalog = getPriceForPackage(
      record!.package,
      next,
      record!.price,
      packagePrices
    );
    setPriceDraft(String(catalog));
  }

  function handleSave() {
    const parsed = parsePriceInput(priceDraft);
    if (parsed === null) return;
    onSave(record!.id, { price: parsed, priceCompliance: compliance });
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
            <p className="text-label">Price (G)</p>
            <h2 className="text-display mt-1 text-[18px]">Set pricing</h2>
            <p className="mt-1 text-[13px] text-brand-ink-secondary">
              {record.programName} · {record.package}
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
          <div>
            <p className="text-label">Compliance</p>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(["compliant", "non-compliant"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => applyCatalogPrice(option)}
                  className={clsx(
                    "rounded-lg border px-3 py-2 text-[12px] font-semibold transition",
                    compliance === option
                      ? option === "compliant"
                        ? "border-brand-success/40 bg-brand-success/10 text-brand-success"
                        : "border-brand-orange/40 bg-brand-orange-soft text-brand-orange"
                      : "border-brand-line text-brand-ink-secondary hover:bg-brand-bg"
                  )}
                >
                  {complianceLabel(option)}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-label">Price</span>
            <input
              type="text"
              inputMode="decimal"
              value={priceDraft}
              onChange={(e) => setPriceDraft(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-brand-line/80 bg-brand-surface px-3 py-2 text-[13px] font-semibold tabular-nums text-brand-ink outline-none transition focus:border-brand-orange/50 focus:ring-2 focus:ring-brand-orange-muted"
            />
            <p className="mt-1.5 text-[11px] text-brand-ink-tertiary">
              Catalog{" "}
              {formatPrice(
                getPriceForPackage(
                  record.package,
                  compliance,
                  record.price,
                  packagePrices
                )
              )}{" "}
              · current {formatPrice(record.price)}
            </p>
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
            Save pricing
          </button>
        </div>
      </div>
    </div>
  );
}
