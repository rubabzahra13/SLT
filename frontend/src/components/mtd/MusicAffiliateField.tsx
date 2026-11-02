"use client";

import { useEffect, useMemo, useState } from "react";
import { SoftSelect } from "@/components/ui/SoftSelect";
import type { CheerFormSubtype, OrderFormType } from "@/types";
import { PRICING_REFERENCE_CHANGED_EVENT } from "@/lib/order-package-price";
import {
  ALL_STAR_CHEER_MUSIC_AFFILIATE_OPTIONS,
  allStarCheerMusicAffiliateOptionsForPackage,
  COMPLIANT_AFFILIATE_OPTIONS,
  getCategoryPricingSnapshot,
  getRuntimeMusicAffiliateSoftSelect,
  loadPricingReferenceStore,
  mergeCheerMusicAffiliateSoftSelect,
  NON_COMPLIANT_AFFILIATE_OPTIONS,
  SCHOOL_CHEER_VIROC_MUSIC_AFFILIATE_OPTIONS,
  schoolCheerVirocMusicAffiliateOptionsForPackage,
  type CategoryKey,
} from "@/lib/pricing-reference";
import {
  affiliateCompactKey,
  affiliateTextSimilarity,
  affiliateTextsFuzzyMatch,
} from "@/lib/pricing-engine";
import { DANCE_MUSIC_AFFILIATE_OPTIONS } from "@/lib/dance-music-affiliate";

/** School Cheer / V!ROC SoftSelect catalog (3 Magento options: no Songs for Cheer). */
export const SCHOOL_CHEER_MUSIC_AFFILIATE_OPTIONS =
  SCHOOL_CHEER_VIROC_MUSIC_AFFILIATE_OPTIONS;

/** @deprecated Use SCHOOL_CHEER_MUSIC_AFFILIATE_OPTIONS */
export const VIROC_MUSIC_AFFILIATE_OPTIONS = SCHOOL_CHEER_MUSIC_AFFILIATE_OPTIONS;

export { ALL_STAR_CHEER_MUSIC_AFFILIATE_OPTIONS };

function defaultCheerAffiliateOptions(): string[] {
  return [
    ...COMPLIANT_AFFILIATE_OPTIONS.filter((o) => !o.danceOnly).map((o) => o.label),
    ...NON_COMPLIANT_AFFILIATE_OPTIONS.map((o) => o.label),
  ];
}

/** SoftSelect labels from DB runtime, then Pricing Reference store, else null. */
function softSelectLabelsForCategory(category: CategoryKey): string[] | null {
  const runtime = getRuntimeMusicAffiliateSoftSelect(category);
  if (runtime?.length) return runtime;
  const catalog =
    getCategoryPricingSnapshot(category, loadPricingReferenceStore())
      .musicAffiliateCatalog || [];
  if (catalog.length) return catalog.map((entry) => entry.label);
  return null;
}

function cheerCategoryForSubtype(
  cheerFormSubtype?: CheerFormSubtype | null
): CategoryKey | null {
  if (
    cheerFormSubtype === "school-cheer-viroc-yes" ||
    cheerFormSubtype === "school-cheer-viroc-no"
  ) {
    return "School Cheer";
  }
  if (
    !cheerFormSubtype ||
    cheerFormSubtype === "all-star-cheer" ||
    String(cheerFormSubtype) === "all"
  ) {
    return "All-Star Cheer";
  }
  if (cheerFormSubtype === "youth-rec-cheer") return "Youth Rec Cheer";
  return null;
}

export function musicAffiliateOptionsForOrder(order: {
  formType?: OrderFormType;
  cheerFormSubtype?: CheerFormSubtype | null;
  package?: string | null;
  packageType?: string | null;
}): string[] {
  // Youth Rec / MB / SE / Anthem have no music affiliate field.
  if (
    order.cheerFormSubtype === "youth-rec-cheer" ||
    order.formType === "marching-band" ||
    order.formType === "sports-entertainment" ||
    order.formType === "school-anthem"
  ) {
    return [];
  }
  if (order.formType === "school-all-star-cheer") {
    const category = cheerCategoryForSubtype(order.cheerFormSubtype);
    const pkg = order.packageType || order.package;
    // V!ROC + School Cheer Magento set: 3 options (no Songs for Cheer).
    if (
      order.cheerFormSubtype === "school-cheer-viroc-yes" ||
      order.cheerFormSubtype === "school-cheer-viroc-no"
    ) {
      const magento = schoolCheerVirocMusicAffiliateOptionsForPackage(pkg);
      if (category) {
        return mergeCheerMusicAffiliateSoftSelect(
          softSelectLabelsForCategory(category),
          magento
        );
      }
      return magento;
    }
    // All-Star Cheer Magento set: 4 options (includes Songs for Cheer + titanium).
    if (
      !order.cheerFormSubtype ||
      order.cheerFormSubtype === "all-star-cheer" ||
      String(order.cheerFormSubtype) === "all"
    ) {
      const magento = allStarCheerMusicAffiliateOptionsForPackage(pkg);
      if (category) {
        return mergeCheerMusicAffiliateSoftSelect(
          softSelectLabelsForCategory(category),
          magento
        );
      }
      return magento;
    }
    return [];
  }
  if (order.formType === "school-all-star-dance") {
    return [...DANCE_MUSIC_AFFILIATE_OPTIONS];
  }
  return defaultCheerAffiliateOptions();
}

/**
 * Resolve free text (manual Add Order) to a catalog option.
 * Matches ignoring spacing / capitalization / near-identical wording.
 */
export function normalizeMusicAffiliateOption(
  value: string,
  options: readonly string[]
): string {
  const raw = value?.trim() || "";
  if (!raw) return "";
  const exact = options.find((opt) => opt === raw);
  if (exact) return exact;
  const lower = raw.toLowerCase();
  const loose = options.find((opt) => opt.toLowerCase() === lower);
  if (loose) return loose;

  const compact = affiliateCompactKey(raw);
  const compactHit = options.find(
    (opt) => affiliateCompactKey(opt) === compact
  );
  if (compactHit) return compactHit;

  // Magento multi-select ("a, b, c"): do not pick one substring option.
  let multiHits = 0;
  let remaining = compact;
  for (const opt of [...options].sort((a, b) => b.length - a.length)) {
    const key = affiliateCompactKey(opt);
    if (!key || key.length < 4 || !remaining.includes(key)) continue;
    multiHits += 1;
    remaining = remaining.replace(key, "");
  }
  if (multiHits >= 2) return raw;

  const compactContains = options.find((opt) => {
    const key = affiliateCompactKey(opt);
    if (!key || !compact) return false;
    return (
      compact === key ||
      (compact.length >= 6 && (compact.includes(key) || key.includes(compact)))
    );
  });
  if (compactContains) return compactContains;

  let best: string | null = null;
  let bestScore = 0;
  for (const opt of options) {
    const score = affiliateTextSimilarity(raw, opt);
    if (score > bestScore) {
      bestScore = score;
      best = opt;
    }
  }
  if (best && bestScore >= 0.82) return best;
  return raw;
}

/** SoftSelect search: spacing/caps-insensitive + near-word fuzzy. */
export function musicAffiliateOptionMatchesQuery(
  optionLabel: string,
  query: string
): boolean {
  const q = query.trim();
  if (!q) return true;
  if (optionLabel.toLowerCase().includes(q.toLowerCase())) return true;
  if (affiliateCompactKey(optionLabel).includes(affiliateCompactKey(q))) {
    return true;
  }
  return affiliateTextsFuzzyMatch(optionLabel, q, 0.55);
}

type MusicAffiliateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  formType?: OrderFormType;
  cheerSubtype?: CheerFormSubtype | null;
  /** Package name/type: used to enforce Titanium affiliate rules. */
  packageType?: string | null;
  "aria-label"?: string;
};

export function MusicAffiliateField({
  value,
  onChange,
  formType,
  cheerSubtype,
  packageType,
  "aria-label": ariaLabel = "Music Affiliate",
}: MusicAffiliateFieldProps) {
  const [open, setOpen] = useState(false);
  // Re-read SoftSelect when Pricing Reference / DB affiliate catalog hydrates.
  const [catalogRevision, setCatalogRevision] = useState(0);
  useEffect(() => {
    // Ensure local store defaults sync SoftSelect before/without DB hydrate.
    loadPricingReferenceStore();
    if (typeof window === "undefined") return;
    const onChangeCatalog = () => setCatalogRevision((n) => n + 1);
    window.addEventListener(PRICING_REFERENCE_CHANGED_EVENT, onChangeCatalog);
    return () =>
      window.removeEventListener(
        PRICING_REFERENCE_CHANGED_EVENT,
        onChangeCatalog
      );
  }, []);
  const catalog = useMemo(
    () =>
      musicAffiliateOptionsForOrder({
        formType,
        cheerFormSubtype: cheerSubtype,
        packageType,
        package: packageType,
      }),
    [formType, cheerSubtype, packageType, catalogRevision]
  );
  const normalized = normalizeMusicAffiliateOption(value, catalog);
  const options = useMemo(() => {
    const base = catalog.map((opt) => ({ value: opt, label: opt }));
    if (normalized && !catalog.some((opt) => opt === normalized)) {
      return [{ value: normalized, label: normalized }, ...base];
    }
    return base;
  }, [catalog, normalized]);

  return (
    <SoftSelect
      aria-label={ariaLabel}
      size="md"
      placeholder="Select…"
      placement="below"
      searchable={false}
      allowCustomValue={false}
      value={normalized || value}
      options={options}
      open={open}
      onOpenChange={setOpen}
      onChange={(next) => {
        onChange(normalizeMusicAffiliateOption(next, catalog) || next);
        setOpen(false);
      }}
      className="w-full"
    />
  );
}
