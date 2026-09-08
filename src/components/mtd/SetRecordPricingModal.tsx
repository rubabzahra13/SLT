"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DollarSign, ShieldAlert, ShieldCheck, X } from "lucide-react";
import clsx from "clsx";
import { formatPrice, titleCase } from "@/lib/data";
import type { RecordMusicAffiliateInfo } from "@/lib/mtd-filters";
import { complianceLabel, parsePriceInput } from "@/lib/pricing";
import type { MTDRecord, PriceCompliance } from "@/types";

type SetRecordPricingModalProps = {
  open: boolean;
  record: MTDRecord | null;
  packagePrices: Record<string, number>;
  musicAffiliateInfo?: RecordMusicAffiliateInfo | null;
  onClose: () => void;
  onSave: (
    recordId: string,
    patch: { price: number; priceCompliance: PriceCompliance }
  ) => void;
};

export function SetRecordPricingModal({
  open,
  record,
  musicAffiliateInfo = null,
  onClose,
  onSave,
}: SetRecordPricingModalProps) {
  const [mounted, setMounted] = useState(false);
  const [priceDraft, setPriceDraft] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !record) return;
    setPriceDraft(String(record.price));
  }, [open, record]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!mounted || !open || !record) return null;

  const parsedDraft = parsePriceInput(priceDraft);
  const hasValidPrice = parsedDraft !== null;
  const priceChanged = hasValidPrice && parsedDraft !== record.price;
  const compliance = musicAffiliateInfo?.compliance ?? record.priceCompliance;
  const isCompliant = compliance === "compliant";

  function handleSave() {
    if (!hasValidPrice) return;
    onSave(record!.id, {
      price: parsedDraft!,
      priceCompliance: record!.priceCompliance,
    });
    onClose();
  }

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
        aria-labelledby="record-pricing-title"
        className="relative w-full max-w-[420px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="border-b border-brand-line/60 bg-gradient-to-br from-brand-orange/10 via-brand-elevated to-brand-signature/8 px-6 pb-5 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-orange/12 text-brand-orange ring-1 ring-inset ring-brand-orange/20">
                <DollarSign className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                  MTD pricing
                </p>
                <h2
                  id="record-pricing-title"
                  className="mt-0.5 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
                >
                  Edit package price
                </h2>
                <p className="mt-1 truncate text-[13px] text-brand-ink-secondary">
                  {titleCase(record.programName)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl border border-brand-line/70 bg-brand-bg/40 px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
              Package
            </p>
            <p className="mt-1 text-[14px] font-semibold leading-snug text-brand-ink">
              {record.package}
            </p>

            {musicAffiliateInfo ? (
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-brand-line/50 pt-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                    Music affiliate
                  </p>
                  <p className="mt-0.5 truncate text-[13px] font-medium text-brand-ink">
                    {musicAffiliateInfo.affiliate}
                  </p>
                </div>
                <span
                  className={clsx(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                    isCompliant
                      ? "bg-brand-success/12 text-brand-success ring-1 ring-inset ring-brand-success/20"
                      : "bg-brand-warning/12 text-brand-warning ring-1 ring-inset ring-brand-warning/20"
                  )}
                >
                  {isCompliant ? (
                    <ShieldCheck className="h-3 w-3" strokeWidth={2.25} />
                  ) : (
                    <ShieldAlert className="h-3 w-3" strokeWidth={2.25} />
                  )}
                  {complianceLabel(compliance)}
                </span>
              </div>
            ) : null}
          </div>

          <label htmlFor="record-package-price" className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
              Package price
            </span>
            <div className="mt-1.5 flex items-center rounded-xl border border-brand-line/80 bg-brand-surface px-3 py-2.5 transition focus-within:border-brand-orange/50 focus-within:ring-2 focus-within:ring-brand-orange-muted">
              <span className="text-[15px] font-semibold tabular-nums text-brand-ink-tertiary">
                $
              </span>
              <input
                id="record-package-price"
                type="text"
                inputMode="decimal"
                value={priceDraft}
                onChange={(event) => setPriceDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSave();
                  }
                }}
                autoFocus
                className="ml-1.5 min-w-0 flex-1 border-0 bg-transparent text-[15px] font-semibold tabular-nums text-brand-ink outline-none placeholder:text-brand-ink-tertiary/50"
                placeholder="0.00"
              />
            </div>
            {priceChanged ? (
              <p className="mt-1.5 text-[12px] text-brand-ink-tertiary">
                Previously {formatPrice(record.price)}
              </p>
            ) : null}
          </label>
        </div>

        <div className="flex flex-col border-t border-black/[0.08]">
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasValidPrice}
            className="border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-orange transition hover:bg-brand-orange/8 disabled:cursor-not-allowed disabled:text-brand-ink-tertiary disabled:hover:bg-transparent"
          >
            Save pricing
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
    </div>,
    document.body
  );
}
