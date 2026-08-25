"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import { DottedScroll } from "@/components/ui/DottedScroll";
import { Tabs } from "@/components/ui/Tabs";
import { formatPrice } from "@/lib/data";
import {
  PACKAGE_CATALOG,
  parsePriceInput,
  type PackagePriceEntry,
  type SecretMenuPricing,
} from "@/lib/pricing";

type SetPricingModalProps = {
  open: boolean;
  prices: Record<string, number>;
  secretMenuPrices: SecretMenuPricing;
  onClose: () => void;
  onSave: (
    prices: Record<string, number>,
    secretMenuPrices: SecretMenuPricing
  ) => void;
};

type PricingTab = "packages" | "secret-menu";

const inputClass =
  "w-28 rounded-lg border border-brand-line/80 bg-brand-surface px-3 py-1.5 text-right text-[13px] font-semibold tabular-nums outline-none focus:border-brand-info/60 focus:ring-2 focus:ring-brand-info/15";

const narrowInputClass =
  "w-20 rounded-lg border border-brand-line/80 bg-brand-surface px-2.5 py-1.5 text-right text-[13px] font-semibold tabular-nums outline-none focus:border-brand-info/60 focus:ring-2 focus:ring-brand-info/15";

type SecretMenuDraft = {
  basePrice: string;
  tiers: Array<{
    extraCost: string;
    editingCost: string;
  }>;
};

function secretMenuDraftFromPricing(pricing: SecretMenuPricing): SecretMenuDraft {
  return {
    basePrice: String(pricing.basePrice),
    tiers: pricing.extraSongTiers.map((tier) => ({
      extraCost: String(tier.extraCost),
      editingCost: String(tier.editingCost),
    })),
  };
}

function parseSecretMenuDraft(
  draft: SecretMenuDraft,
  source: SecretMenuPricing
): SecretMenuPricing {
  const basePrice = parsePriceInput(draft.basePrice) ?? source.basePrice;

  return {
    ...source,
    basePrice,
    extraSongTiers: source.extraSongTiers.map((tier, index) => {
      const row = draft.tiers[index];
      return {
        extraSongs: tier.extraSongs,
        extraCost: parsePriceInput(row?.extraCost ?? "") ?? tier.extraCost,
        editingCost: parsePriceInput(row?.editingCost ?? "") ?? tier.editingCost,
      };
    }),
  };
}

export function SetPricingModal({
  open,
  prices,
  secretMenuPrices,
  onClose,
  onSave,
}: SetPricingModalProps) {
  const [activeTab, setActiveTab] = useState<PricingTab>("packages");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [secretDraft, setSecretDraft] = useState<SecretMenuDraft>(() =>
    secretMenuDraftFromPricing(secretMenuPrices)
  );

  useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    for (const entry of PACKAGE_CATALOG) {
      const price = prices[entry.key];
      next[entry.key] = price !== undefined ? String(price) : "";
    }
    setDraft(next);
    setSecretDraft(secretMenuDraftFromPricing(secretMenuPrices));
    setActiveTab("packages");
  }, [open, prices, secretMenuPrices]);

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
    onSave(updated, parseSecretMenuDraft(secretDraft, secretMenuPrices));
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
        <div className="flex items-start justify-between gap-4 border-b border-brand-line/70 p-6 pb-0">
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

        <div className="border-b border-brand-line/70 px-6">
          <Tabs
            options={[
              { value: "packages", label: "Packages" },
              { value: "secret-menu", label: "Secret menu" },
            ]}
            value={activeTab}
            onChange={(value) => setActiveTab(value as PricingTab)}
          />
        </div>

        <DottedScroll
          className="min-h-0 flex-1"
          scrollClassName="overflow-y-scroll scrollbar-hide p-6"
          indicatorPlacement="gutter"
          contentClassName="space-y-6"
        >
          {activeTab === "packages" ? (
            <>
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
            </>
          ) : (
            <>
              <section>
                <h3 className="text-label mb-1">Secret menu prices</h3>
                <p className="text-[13px] text-brand-ink-secondary">
                  {secretMenuPrices.menuTitle}
                </p>
              </section>

              <section>
                <div className="overflow-hidden rounded-xl border border-brand-line/70">
                  <div className="flex items-center justify-between gap-4 border-b border-brand-line/60 bg-brand-bg/50 px-4 py-3">
                    <div>
                      <p className="text-[13px] font-semibold">
                        {secretMenuPrices.packageName}
                      </p>
                      <p className="text-[11px] text-brand-ink-tertiary">
                        Base package price
                      </p>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={secretDraft.basePrice}
                      onChange={(e) =>
                        setSecretDraft((prev) => ({
                          ...prev,
                          basePrice: e.target.value,
                        }))
                      }
                      className={inputClass}
                      aria-label={`Base price for ${secretMenuPrices.packageName}`}
                    />
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 border-b border-brand-line/60 bg-brand-bg/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-brand-ink-tertiary">
                    <span>Extra songs</span>
                    <span className="text-right">Extra cost</span>
                    <span className="text-right">Time of editing</span>
                  </div>

                  {secretMenuPrices.extraSongTiers.map((tier, index) => (
                    <div
                      key={tier.extraSongs}
                      className={clsx(
                        "grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3",
                        index > 0 && "border-t border-brand-line/60"
                      )}
                    >
                      <p className="text-[13px] font-semibold tabular-nums">
                        {tier.extraSongs}
                      </p>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={secretDraft.tiers[index]?.extraCost ?? ""}
                        onChange={(e) =>
                          setSecretDraft((prev) => ({
                            ...prev,
                            tiers: prev.tiers.map((row, rowIndex) =>
                              rowIndex === index
                                ? { ...row, extraCost: e.target.value }
                                : row
                            ),
                          }))
                        }
                        className={narrowInputClass}
                        aria-label={`Extra songs cost for ${tier.extraSongs} songs`}
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        value={secretDraft.tiers[index]?.editingCost ?? ""}
                        onChange={(e) =>
                          setSecretDraft((prev) => ({
                            ...prev,
                            tiers: prev.tiers.map((row, rowIndex) =>
                              rowIndex === index
                                ? { ...row, editingCost: e.target.value }
                                : row
                            ),
                          }))
                        }
                        className={narrowInputClass}
                        aria-label={`Time of editing cost for ${tier.extraSongs} extra songs`}
                      />
                    </div>
                  ))}
                </div>
              </section>

              <div className="rounded-xl border border-brand-line/70 bg-brand-bg/40 p-4">
                <p className="text-[13px] font-semibold text-brand-ink">
                  How this works
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-brand-ink-secondary">
                  Use the secret menu for semi-custom hip hop and custom pom
                  packages. Start with the base price, then add extra song cost
                  and time-of-editing cost for each tier.
                </p>
              </div>
            </>
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
            Save pricing
          </button>
        </div>
      </div>
    </div>
  );
}
