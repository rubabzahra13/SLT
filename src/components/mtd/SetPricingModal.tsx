"use client";

import { useEffect, useMemo, useState } from "react";
import { DollarSign, Plus, Sparkles, Tag, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { DottedScroll } from "@/components/ui/DottedScroll";
import { formatPrice } from "@/lib/data";
import {
  PACKAGE_CATALOG,
  parseIntegerInput,
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

const TAB_OPTIONS: { value: PricingTab; label: string; icon: typeof Tag }[] = [
  { value: "packages", label: "Packages", icon: Tag },
  { value: "secret-menu", label: "Secret menu", icon: Sparkles },
];

const PACKAGE_CATEGORIES: PackagePriceEntry["category"][] = [
  "Cheer",
  "Dance",
  "School",
  "Marching Band",
  "Other",
];

type CustomPackageDraft = {
  id: string;
  name: string;
  category: PackagePriceEntry["category"];
  price: string;
};

type SecretMenuTierDraft = {
  extraSongs: string;
  extraCost: string;
  editingMinutes: string;
};

type SecretMenuDraft = {
  basePrice: string;
  tiers: SecretMenuTierDraft[];
};

function catalogKeys(): Set<string> {
  return new Set(PACKAGE_CATALOG.map((entry) => entry.key));
}

function secretMenuDraftFromPricing(pricing: SecretMenuPricing): SecretMenuDraft {
  return {
    basePrice: String(pricing.basePrice),
    tiers: pricing.extraSongTiers.map((tier) => ({
      extraSongs: String(tier.extraSongs),
      extraCost: String(tier.extraCost),
      editingMinutes: String(tier.editingMinutes),
    })),
  };
}

function parseSecretMenuDraft(
  draft: SecretMenuDraft,
  source: SecretMenuPricing
): SecretMenuPricing {
  const basePrice = parsePriceInput(draft.basePrice) ?? source.basePrice;

  const extraSongTiers = draft.tiers
    .map((row) => ({
      extraSongs: parseIntegerInput(row.extraSongs) ?? 0,
      extraCost: parsePriceInput(row.extraCost) ?? 0,
      editingMinutes: parseIntegerInput(row.editingMinutes) ?? 0,
    }))
    .filter((tier) => tier.extraSongs > 0);

  return {
    ...source,
    basePrice,
    extraSongTiers:
      extraSongTiers.length > 0 ? extraSongTiers : source.extraSongTiers,
  };
}

function buildCustomPackagesFromPrices(
  prices: Record<string, number>
): CustomPackageDraft[] {
  const known = catalogKeys();
  return Object.entries(prices)
    .filter(([key]) => !known.has(key))
    .map(([key, price]) => ({
      id: `saved-${key}`,
      name: key,
      category: "Other",
      price: String(price),
    }));
}

const inputClass =
  "w-full rounded-lg border border-brand-line/60 bg-white px-2.5 py-2 text-[13px] font-semibold tabular-nums text-brand-ink shadow-[0_1px_1px_rgba(15,30,45,0.04)] outline-none transition hover:border-brand-line-strong focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15";

function PriceField({
  value,
  onChange,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div className={clsx("relative w-[7.5rem] shrink-0", className)}>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] font-medium text-brand-ink-tertiary">
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(inputClass, "pl-6 text-right")}
        aria-label={ariaLabel}
      />
    </div>
  );
}

type PendingRemoval =
  | { kind: "catalog"; key: string; label: string }
  | { kind: "custom"; id: string; label: string }
  | { kind: "tier"; index: number; label: string };

function removalDescription(pending: PendingRemoval): string {
  switch (pending.kind) {
    case "catalog":
      return `${pending.label} will be removed from the catalog. You can add it again later if needed.`;
    case "custom":
      return `${pending.label} will be removed. You can add a custom package again if needed.`;
    case "tier":
      return `The ${pending.label} tier will be removed from the secret menu.`;
  }
}

function RemovePriceConfirmModal({
  open,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  pending: PendingRemoval | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open || !pending) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-brand-scrim/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="remove-price-title"
        aria-describedby="remove-price-desc"
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-brand-line/50 bg-white shadow-[var(--shadow-premium)] ring-1 ring-inset ring-brand-line/20"
      >
        <div className="px-6 pb-5 pt-6 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-orange-soft text-brand-orange ring-1 ring-inset ring-brand-orange/20">
            <Trash2 className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <h2
            id="remove-price-title"
            className="mt-4 text-[18px] font-bold tracking-[-0.02em] text-brand-ink"
          >
            Remove this price?
          </h2>
          <p
            id="remove-price-desc"
            className="mt-2 text-[13px] leading-relaxed text-brand-ink-secondary"
          >
            {removalDescription(pending)}
          </p>
        </div>
        <div className="flex gap-2.5 border-t border-brand-line/40 bg-brand-bg-subtle/40 px-4 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl px-4 py-2.5 text-[13px] font-medium text-brand-ink-secondary transition hover:bg-white hover:text-brand-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-brand-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-orange-hover"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function RemoveButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-brand-ink-tertiary transition hover:bg-brand-orange-soft hover:text-brand-orange"
      aria-label={label}
    >
      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
}

function PackageRow({
  entry,
  draftValue,
  savedPrice,
  onChange,
  onRemove,
}: {
  entry: PackagePriceEntry;
  draftValue: string;
  savedPrice: number;
  onChange: (value: string) => void;
  onRemove: () => void;
}) {
  const parsed = parsePriceInput(draftValue);
  const changed =
    parsed !== null && parsed !== savedPrice && draftValue.trim() !== "";

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-brand-blue-soft/15">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-brand-ink">
          {entry.name}
        </p>
        <p className="mt-0.5 flex items-center gap-2 text-[11px] text-brand-ink-tertiary">
          <span>Saved {formatPrice(savedPrice)}</span>
          {changed ? (
            <span className="rounded-full bg-brand-orange-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand-orange ring-1 ring-inset ring-brand-orange/20">
              Edited
            </span>
          ) : null}
        </p>
      </div>
      <PriceField
        value={draftValue}
        onChange={onChange}
        ariaLabel={`Price for ${entry.name}`}
      />
      <RemoveButton
        onClick={onRemove}
        label={`Remove price for ${entry.name}`}
      />
    </div>
  );
}

function CustomPackageRow({
  pkg,
  onChange,
  onRemove,
}: {
  pkg: CustomPackageDraft;
  onChange: (patch: Partial<CustomPackageDraft>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-brand-blue-soft/15 sm:flex-nowrap">
      <input
        type="text"
        value={pkg.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Package name"
        className={clsx(inputClass, "min-w-[10rem] flex-1 font-medium")}
        aria-label="Custom package name"
      />
      <select
        value={pkg.category}
        onChange={(e) =>
          onChange({
            category: e.target.value as PackagePriceEntry["category"],
          })
        }
        className={clsx(inputClass, "w-auto min-w-[7.5rem] cursor-pointer font-medium")}
        aria-label="Custom package category"
      >
        {PACKAGE_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
      <PriceField
        value={pkg.price}
        onChange={(value) => onChange({ price: value })}
        ariaLabel="Custom package price"
      />
      <RemoveButton onClick={onRemove} label="Remove custom package" />
    </div>
  );
}

function PackagesPanel({
  grouped,
  draft,
  prices,
  customPackages,
  onDraftChange,
  onRemoveCatalog,
  onCustomChange,
  onCustomRemove,
  onAddCustom,
}: {
  grouped: Map<string, PackagePriceEntry[]>;
  draft: Record<string, string>;
  prices: Record<string, number>;
  customPackages: CustomPackageDraft[];
  onDraftChange: (key: string, value: string) => void;
  onRemoveCatalog: (key: string) => void;
  onCustomChange: (id: string, patch: Partial<CustomPackageDraft>) => void;
  onCustomRemove: (id: string) => void;
  onAddCustom: () => void;
}) {
  const customByCategory = useMemo(() => {
    const map = new Map<string, CustomPackageDraft[]>();
    for (const pkg of customPackages) {
      const list = map.get(pkg.category) ?? [];
      list.push(pkg);
      map.set(pkg.category, list);
    }
    return map;
  }, [customPackages]);

  const categories = [
    ...new Set([
      ...grouped.keys(),
      ...customByCategory.keys(),
    ]),
  ];

  return (
    <div className="space-y-6 pb-8">
      {categories.map((category) => {
        const entries = grouped.get(category) ?? [];
        const customs = customByCategory.get(category) ?? [];
        if (entries.length === 0 && customs.length === 0) return null;

        return (
          <section key={category}>
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                {category}
              </h3>
              <span className="rounded-lg bg-brand-blue-soft/50 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-brand-signature ring-1 ring-inset ring-brand-blue/15">
                {entries.length + customs.length} packages
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-brand-line/50 bg-white ring-1 ring-inset ring-brand-line/15">
              <div className="divide-y divide-brand-line/30">
                {entries.map((entry) => (
                  <PackageRow
                    key={entry.key}
                    entry={entry}
                    draftValue={draft[entry.key] ?? ""}
                    savedPrice={prices[entry.key] ?? 0}
                    onChange={(value) => onDraftChange(entry.key, value)}
                    onRemove={() => onRemoveCatalog(entry.key)}
                  />
                ))}
                {customs.map((pkg) => (
                  <CustomPackageRow
                    key={pkg.id}
                    pkg={pkg}
                    onChange={(patch) => onCustomChange(pkg.id, patch)}
                    onRemove={() => onCustomRemove(pkg.id)}
                  />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <button
        type="button"
        onClick={onAddCustom}
        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-brand-line/70 bg-white px-3.5 py-2 text-[12px] font-semibold text-brand-signature transition hover:border-brand-blue/40 hover:bg-brand-blue-soft/25"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        Add package price
      </button>

      <div className="mt-2 flex gap-3 rounded-xl border border-brand-orange/25 bg-gradient-to-r from-brand-orange-soft/40 to-white px-4 py-3.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-orange-soft text-brand-orange ring-1 ring-inset ring-brand-orange/20">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
        <p className="text-[12px] leading-relaxed text-brand-ink-secondary">
          <span className="font-semibold text-brand-orange">
            Non-compliant music
          </span>{" "}
          uses these base prices plus a 15% surcharge on MTD and orders.
        </p>
      </div>
    </div>
  );
}

function SecretMenuPanel({
  secretMenuPrices,
  secretDraft,
  onSecretDraftChange,
  onRequestRemoveTier,
}: {
  secretMenuPrices: SecretMenuPricing;
  secretDraft: SecretMenuDraft;
  onSecretDraftChange: (
    updater: (prev: SecretMenuDraft) => SecretMenuDraft
  ) => void;
  onRequestRemoveTier: (index: number, label: string) => void;
}) {
  return (
    <div className="space-y-5 pb-8">
      <div className="overflow-hidden rounded-xl border border-brand-line/50 bg-gradient-to-br from-brand-blue-soft/50 via-white to-white p-5 ring-1 ring-inset ring-brand-line/15">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
          {secretMenuPrices.menuTitle}
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[16px] font-bold text-brand-ink">
              {secretMenuPrices.packageName}
            </p>
            <p className="mt-1 text-[12px] text-brand-ink-secondary">
              Base package price before extra song tiers
            </p>
          </div>
          <PriceField
            value={secretDraft.basePrice}
            onChange={(value) =>
              onSecretDraftChange((prev) => ({ ...prev, basePrice: value }))
            }
            ariaLabel={`Base price for ${secretMenuPrices.packageName}`}
            className="w-[8.5rem]"
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
              Extra song tiers
            </h3>
            <p className="mt-1 text-[12px] text-brand-ink-secondary">
              Additional cost and editing time per extra song count
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onSecretDraftChange((prev) => ({
                ...prev,
                tiers: [
                  ...prev.tiers,
                  {
                    extraSongs: String(prev.tiers.length + 1),
                    extraCost: "",
                    editingMinutes: "",
                  },
                ],
              }))
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-line/60 bg-white px-3 py-1.5 text-[11px] font-semibold text-brand-signature transition hover:border-brand-blue/40 hover:bg-brand-blue-soft/25"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Add tier
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-brand-line/50 bg-white ring-1 ring-inset ring-brand-line/15">
          <div className="grid grid-cols-[3.5rem_1fr_1fr_auto] gap-3 border-b border-brand-line/40 bg-brand-bg-subtle/80 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-brand-ink-tertiary sm:grid-cols-[4rem_1fr_1fr_auto]">
            <span>Songs</span>
            <span className="text-right">Extra cost</span>
            <span className="text-right">Editing</span>
            <span className="sr-only">Remove</span>
          </div>

          <div className="divide-y divide-brand-line/30">
            {secretDraft.tiers.map((tier, index) => (
              <div
                key={`tier-${index}`}
                className="grid grid-cols-[3.5rem_1fr_1fr_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[4rem_1fr_1fr_auto]"
              >
                <input
                  type="text"
                  inputMode="numeric"
                  value={tier.extraSongs}
                  onChange={(e) =>
                    onSecretDraftChange((prev) => ({
                      ...prev,
                      tiers: prev.tiers.map((row, rowIndex) =>
                        rowIndex === index
                          ? { ...row, extraSongs: e.target.value }
                          : row
                      ),
                    }))
                  }
                  className={clsx(inputClass, "w-12 px-2 text-center")}
                  aria-label={`Extra song count for tier ${index + 1}`}
                />

                <div className="relative min-w-0">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-brand-ink-tertiary">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={tier.extraCost}
                    onChange={(e) =>
                      onSecretDraftChange((prev) => ({
                        ...prev,
                        tiers: prev.tiers.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, extraCost: e.target.value }
                            : row
                        ),
                      }))
                    }
                    className={clsx(inputClass, "pl-6 text-right")}
                    aria-label={`Extra cost for tier ${index + 1}`}
                  />
                </div>

                <div className="relative min-w-0">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={tier.editingMinutes}
                    onChange={(e) =>
                      onSecretDraftChange((prev) => ({
                        ...prev,
                        tiers: prev.tiers.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, editingMinutes: e.target.value }
                            : row
                        ),
                      }))
                    }
                    className={clsx(inputClass, "pr-9 text-right")}
                    aria-label={`Editing time for tier ${index + 1}`}
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wide text-brand-ink-tertiary">
                    min
                  </span>
                </div>

                <RemoveButton
                  onClick={() =>
                    onRequestRemoveTier(
                      index,
                      `${tier.extraSongs || secretDraft.tiers[index]?.extraSongs || index + 1} extra songs`
                    )
                  }
                  label={`Remove tier ${index + 1}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
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
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(() => new Set());
  const [customPackages, setCustomPackages] = useState<CustomPackageDraft[]>([]);
  const [secretDraft, setSecretDraft] = useState<SecretMenuDraft>(() =>
    secretMenuDraftFromPricing(secretMenuPrices)
  );
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(
    null
  );

  useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    for (const entry of PACKAGE_CATALOG) {
      const price = prices[entry.key];
      next[entry.key] = price !== undefined ? String(price) : "";
    }
    setDraft(next);
    setRemovedKeys(new Set());
    setCustomPackages(buildCustomPackagesFromPrices(prices));
    setSecretDraft(secretMenuDraftFromPricing(secretMenuPrices));
    setActiveTab("packages");
    setPendingRemoval(null);
  }, [open, prices, secretMenuPrices]);

  const grouped = useMemo(() => {
    const groups = new Map<string, PackagePriceEntry[]>();
    for (const entry of PACKAGE_CATALOG) {
      if (removedKeys.has(entry.key)) continue;
      const list = groups.get(entry.category) ?? [];
      list.push(entry);
      groups.set(entry.category, list);
    }
    return groups;
  }, [removedKeys]);

  const visiblePackageCount =
    PACKAGE_CATALOG.length -
    removedKeys.size +
    customPackages.length;
  const tierCount = secretDraft.tiers.length;

  if (!open) return null;

  function confirmRemoval() {
    if (!pendingRemoval) return;
    if (pendingRemoval.kind === "catalog") {
      setRemovedKeys((prev) => new Set(prev).add(pendingRemoval.key));
    } else if (pendingRemoval.kind === "custom") {
      setCustomPackages((prev) =>
        prev.filter((pkg) => pkg.id !== pendingRemoval.id)
      );
    } else {
      setSecretDraft((prev) => ({
        ...prev,
        tiers: prev.tiers.filter((_, index) => index !== pendingRemoval.index),
      }));
    }
    setPendingRemoval(null);
  }

  function handleSave() {
    const updated: Record<string, number> = { ...prices };

    for (const key of removedKeys) {
      delete updated[key];
    }

    for (const entry of PACKAGE_CATALOG) {
      if (removedKeys.has(entry.key)) continue;
      const parsed = parsePriceInput(draft[entry.key] ?? "");
      if (parsed !== null) updated[entry.key] = parsed;
    }

    for (const pkg of customPackages) {
      const key = pkg.name.trim().toUpperCase();
      const parsed = parsePriceInput(pkg.price);
      if (!key || parsed === null) continue;
      updated[key] = parsed;
    }

    onSave(updated, parseSecretMenuDraft(secretDraft, secretMenuPrices));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-brand-scrim/90 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="set-pricing-title"
        className="relative flex max-h-[min(90vh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-brand-line/50 bg-white shadow-[var(--shadow-premium)] ring-1 ring-inset ring-brand-line/20"
      >
        <div className="shrink-0 border-b border-brand-line/40 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-orange-soft to-brand-orange-soft/40 text-brand-orange shadow-sm ring-1 ring-inset ring-brand-orange/20">
                <DollarSign className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <h2
                  id="set-pricing-title"
                  className="text-[22px] font-bold tracking-[-0.03em] text-brand-ink"
                >
                  Set pricing
                </h2>
                <p className="mt-1 text-[13px] text-brand-ink-secondary">
                  Catalog prices flow into MTD records and new orders
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-brand-ink-tertiary transition hover:bg-brand-bg-subtle hover:text-brand-ink"
              aria-label="Close"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div
              className="inline-flex rounded-xl bg-brand-bg-subtle/80 p-0.5 ring-1 ring-inset ring-brand-line/40"
              role="tablist"
              aria-label="Pricing sections"
            >
              {TAB_OPTIONS.map(({ value, label, icon: Icon }) => {
                const active = activeTab === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(value)}
                    className={clsx(
                      "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-semibold transition",
                      active
                        ? "bg-white text-brand-ink shadow-sm ring-1 ring-inset ring-brand-line/30"
                        : "text-brand-ink-secondary hover:bg-white/70 hover:text-brand-ink"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                    {label}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] font-medium tabular-nums text-brand-ink-tertiary">
              {activeTab === "packages"
                ? `${visiblePackageCount} packages`
                : `${tierCount} tiers`}
            </p>
          </div>
        </div>

        <DottedScroll
          className="min-h-0 flex-1"
          scrollClassName="h-full max-h-[calc(min(90vh,820px)-11.5rem)] overflow-y-scroll scrollbar-hide px-6 py-5 pr-4"
          indicatorPlacement="gutter"
          indicatorDistribution="even"
        >
          {activeTab === "packages" ? (
            <PackagesPanel
              grouped={grouped}
              draft={draft}
              prices={prices}
              customPackages={customPackages}
              onDraftChange={(key, value) =>
                setDraft((prev) => ({ ...prev, [key]: value }))
              }
              onRemoveCatalog={(key) => {
                const entry = PACKAGE_CATALOG.find((item) => item.key === key);
                setPendingRemoval({
                  kind: "catalog",
                  key,
                  label: entry?.name ?? key,
                });
              }}
              onCustomChange={(id, patch) =>
                setCustomPackages((prev) =>
                  prev.map((pkg) => (pkg.id === id ? { ...pkg, ...patch } : pkg))
                )
              }
              onCustomRemove={(id) => {
                const pkg = customPackages.find((item) => item.id === id);
                setPendingRemoval({
                  kind: "custom",
                  id,
                  label: pkg?.name.trim() || "Custom package",
                });
              }}
              onAddCustom={() =>
                setCustomPackages((prev) => [
                  ...prev,
                  {
                    id: `custom-${Date.now()}`,
                    name: "",
                    category: "Other",
                    price: "",
                  },
                ])
              }
            />
          ) : (
            <SecretMenuPanel
              secretMenuPrices={secretMenuPrices}
              secretDraft={secretDraft}
              onSecretDraftChange={setSecretDraft}
              onRequestRemoveTier={(index, label) =>
                setPendingRemoval({ kind: "tier", index, label })
              }
            />
          )}
        </DottedScroll>

        <RemovePriceConfirmModal
          open={pendingRemoval !== null}
          pending={pendingRemoval}
          onClose={() => setPendingRemoval(null)}
          onConfirm={confirmRemoval}
        />

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-brand-line/40 bg-white/95 px-6 py-4 backdrop-blur-sm">
          <p className="hidden text-[12px] text-brand-ink-tertiary sm:block">
            Changes apply to MTD and order pricing immediately after save
          </p>
          <div className="ml-auto flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-[13px] font-medium text-brand-ink-secondary transition hover:bg-brand-bg-subtle hover:text-brand-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-brand-orange px-5 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-orange-hover hover:shadow-md"
            >
              Save pricing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
