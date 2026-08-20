"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import { DottedScroll } from "@/components/ui/DottedScroll";
import { formatPrice } from "@/lib/data";
import {
  PACKAGE_CATALOG,
  parsePriceInput,
  type PackagePriceEntry,
} from "@/lib/pricing";

type SetPricingModalProps = {
  open: boolean;
  prices: Record<string, number>;
  onClose: () => void;
  onSave: (prices: Record<string, number>) => void;
};

const inputClass =
  "w-28 rounded-lg border border-brand-line/80 bg-brand-surface px-3 py-1.5 text-right text-[13px] font-semibold tabular-nums outline-none focus:border-brand-info/60 focus:ring-2 focus:ring-brand-info/15";

export function SetPricingModal({
  open,
  prices,
  onClose,
  onSave,
}: SetPricingModalProps) {
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    for (const entry of PACKAGE_CATALOG) {
      const price = prices[entry.key];
      next[entry.key] = price !== undefined ? String(price) : "";
    }
    setDraft(next);
  }, [open, prices]);

  const grouped = useMemo(() => {
    const groups = new Map<string, PackagePriceEntry[]>();
    for (const entry of PACKAGE_CATALOG) {
      const list = groups.get(entry.category) ?? [];
      list.push(entry);
      groups.set(entry.category, list);
    }
    return groups;
  }, []);

  if (!open) return null;

  function handleSave() {
    const updated: Record<string, number> = { ...prices };
    for (const entry of PACKAGE_CATALOG) {
      const parsed = parsePriceInput(draft[entry.key] ?? "");
      if (parsed !== null) updated[entry.key] = parsed;
    }
    onSave(updated);
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
            <p className="text-label">Package pricing</p>
            <h2 className="text-display mt-1 text-[18px]">Set pricing</h2>
            <p className="mt-1 text-[13px] text-brand-ink-secondary">
              Prices auto-populate into MTD and orders. Non-compliant music adds
              15% surcharge.
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
          contentClassName="space-y-6"
        >
            {[...grouped.entries()].map(([category, entries]) => (
              <section key={category}>
                <h3 className="text-label mb-3">{category}</h3>
                <div className="overflow-hidden rounded-xl border border-brand-line/70">
                  {entries.map((entry, index) => (
                    <div
                      key={entry.key}
                      className={clsx(
                        "flex items-center justify-between gap-4 px-4 py-3",
                        index > 0 && "border-t border-brand-line/60"
                      )}
                    >
                      <div>
                        <p className="text-[13px] font-semibold">{entry.name}</p>
                        <p className="text-[11px] text-brand-ink-tertiary">
                          Compliant base · {formatPrice(prices[entry.key] ?? 0)}
                        </p>
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={draft[entry.key] ?? ""}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            [entry.key]: e.target.value,
                          }))
                        }
                        className={inputClass}
                        aria-label={`Price for ${entry.name}`}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}

          <div className="rounded-xl border border-brand-warning/30 bg-brand-warning/8 p-4">
            <p className="text-[13px] font-semibold text-brand-warning">
              Non-compliant music
            </p>
            <p className="mt-1 text-[12px] text-brand-ink-secondary">
              Non-compliant themes use these base prices plus a 15% surcharge.
            </p>
          </div>
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
            Save pricing
          </button>
        </div>
      </div>
    </div>
  );
}
