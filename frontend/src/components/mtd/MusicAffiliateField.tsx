"use client";

import { useMemo, useState } from "react";
import { SoftSelect } from "@/components/ui/SoftSelect";
import type { CheerFormSubtype, OrderFormType } from "@/types";
import {
  ALL_STAR_CHEER_MUSIC_AFFILIATE_OPTIONS,
  COMPLIANT_AFFILIATE_OPTIONS,
  NON_COMPLIANT_AFFILIATE_OPTIONS,
} from "@/lib/pricing-reference";
import {
  affiliateCompactKey,
  affiliateTextSimilarity,
  affiliateTextsFuzzyMatch,
} from "@/lib/pricing-engine";

/**
 * School Cheer / VIROC customer-form affiliate choices
 * (checkbox source on the public form — multi-select can flag).
 */
export const SCHOOL_CHEER_MUSIC_AFFILIATE_OPTIONS = [
  "Power Music",
  "Unleash the Beats",
  "Power Music + Unleash the Beats",
  "Power Music & Unleash the Beats Covers (can not be used for a Titanium Package)",
  "Library Music",
  "Custom Music / Client-Provided Track",
  "Songs for Cheer — Editor's Choice",
  "Songs for Cheer — Casey Can Choose",
  "Songs for Cheer — See Notes",
  "Original Artist Track (iTunes / Spotify)",
] as const;

/** @deprecated Use SCHOOL_CHEER_MUSIC_AFFILIATE_OPTIONS */
export const VIROC_MUSIC_AFFILIATE_OPTIONS = SCHOOL_CHEER_MUSIC_AFFILIATE_OPTIONS;

export { ALL_STAR_CHEER_MUSIC_AFFILIATE_OPTIONS };

function defaultCheerAffiliateOptions(): string[] {
  return [
    ...COMPLIANT_AFFILIATE_OPTIONS.filter((o) => !o.danceOnly).map((o) => o.label),
    ...NON_COMPLIANT_AFFILIATE_OPTIONS.map((o) => o.label),
  ];
}

export function musicAffiliateOptionsForOrder(order: {
  formType?: OrderFormType;
  cheerFormSubtype?: CheerFormSubtype | null;
}): string[] {
  if (order.formType === "school-all-star-cheer") {
    if (
      order.cheerFormSubtype === "school-cheer-viroc-yes" ||
      order.cheerFormSubtype === "school-cheer-viroc-no"
    ) {
      return [...SCHOOL_CHEER_MUSIC_AFFILIATE_OPTIONS];
    }
    // All Star Cheer (and cheer "all" / default) — real affiliate list.
    if (
      !order.cheerFormSubtype ||
      order.cheerFormSubtype === "all-star-cheer" ||
      String(order.cheerFormSubtype) === "all"
    ) {
      return [...ALL_STAR_CHEER_MUSIC_AFFILIATE_OPTIONS];
    }
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
  "aria-label"?: string;
};

export function MusicAffiliateField({
  value,
  onChange,
  formType,
  cheerSubtype,
  "aria-label": ariaLabel = "Music Affiliate",
}: MusicAffiliateFieldProps) {
  const [open, setOpen] = useState(false);
  const catalog = useMemo(
    () =>
      musicAffiliateOptionsForOrder({
        formType,
        cheerFormSubtype: cheerSubtype,
      }),
    [formType, cheerSubtype]
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
      searchable
      searchPlaceholder="Search affiliates…"
      filterOption={(opt, query) =>
        musicAffiliateOptionMatchesQuery(opt.label, query)
      }
      allowCustomValue
      resolveCustomValue={(typed) =>
        normalizeMusicAffiliateOption(typed, catalog) || typed.trim()
      }
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
