"use client";

import { useMemo, useRef, useState } from "react";
import { SoftSelect } from "@/components/ui/SoftSelect";
import { titleCase } from "@/lib/data";
import { parsePackage } from "@/lib/package";
import { packagesForOrderForm } from "@/lib/pricing-engine";
import {
  CHEER_FORM_SUBTABS,
  DANCE_FORM_SUBTABS,
  ORDER_FORM_TABS,
  type CheerFormSubtype,
  type DanceFormSubtype,
  type OrderFormType,
} from "@/types";

type SoftOption = { value: string; label: string };

type PackageTypeFieldProps = {
  value: string;
  originalValue?: string;
  formType: OrderFormType;
  cheerSubtype?: CheerFormSubtype | null;
  danceSubtype?: DanceFormSubtype | null;
  onChange: (value: string) => void;
};

function sameOption(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function normalizeLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Jazz Simple Cut only: Magento SoftSelect paren text is long / variable -
 * treat as a match when the first 3 words are "Jazz Simple Cut".
 */
function isJazzSimpleCutByFirstThreeWords(raw: string): boolean {
  const words = normalizeLabel(raw)
    .replace(/[()$,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 3);
  return (
    words.length === 3 &&
    words[0] === "jazz" &&
    words[1] === "simple" &&
    words[2] === "cut"
  );
}

/** Form / subcategory names that must never appear as package options. */
const FORM_CATEGORY_LABELS = new Set(
  [
    ...ORDER_FORM_TABS.map((t) => t.label),
    ...CHEER_FORM_SUBTABS.map((t) => t.label),
    ...DANCE_FORM_SUBTABS.map((t) => t.label),
    "All Star Cheer",
    "All-Star Cheer",
    "All Star Dance",
    "All-Star Dance",
    "Cheer",
    "Dance",
    "School Cheer",
    "VIROC",
    "Youth Rec Cheer",
  ].map(normalizeLabel)
);

export function isFormCategoryLabel(value: string): boolean {
  if (!value.trim()) return false;
  return FORM_CATEGORY_LABELS.has(normalizeLabel(value));
}

/** Canonical cheer tier key (strip Magento SoftSelect " Package" suffix). */
function cheerTierKey(raw: string): string {
  return raw
    .trim()
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .replace(/\s+Package$/i, "")
    .trim()
    .toUpperCase();
}

/** Sports Entertainment Magento SoftSelect OTHER → rate-card package key. */
function sportsEntertainmentOtherPackageKey(raw: string): string | null {
  const upper = raw.trim().toUpperCase();
  if (!upper) return null;
  if (
    upper === "OTHER (MIXES LONGER THAN 2:30)" ||
    upper === "OTHER (MIXES LONGER THAN 2:30" ||
    upper.startsWith("OTHER (MIXES LONGER") ||
    upper.includes("SPECIFY IN NOTES SECTION OF THE ORDER FORM") ||
    (upper.startsWith("OTHER") && upper.includes("MIXES LONGER"))
  ) {
    return "OTHER (mixes longer than 2:30)";
  }
  return null;
}

/** Strip mix length from cheer package strings → tier/package only. */
export function packageTypeDisplayValue(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || isFormCategoryLabel(trimmed)) return "";
  // Do not let parsePackage treat "2:30" inside SE OTHER SoftSelect as mix length.
  const seOther = sportsEntertainmentOtherPackageKey(trimmed);
  if (seOther) return seOther;
  const parsed = parsePackage(trimmed);
  if (parsed.tier && parsed.tier !== "-") {
    // Magento SoftSelect: "Gold Package" / "Rally Mix (…)" → catalog key.
    const stripped = parsed.tier
      .replace(/\s*\([^)]*\)\s*$/g, "")
      .replace(/\s+Package$/i, "")
      .trim();
    const key = stripped.toUpperCase();
    if (CHEER_PACKAGE_LABELS[key]) return key;
    return stripped;
  }
  return trimmed.replace(/\s+\d+:\d{2}\b/g, "").replace(/\s+TBD\b/i, "").trim();
}

function matchPackageOption(raw: string, catalog: string[]): string | null {
  const trimmed = raw.trim();
  if (!trimmed || isFormCategoryLabel(trimmed)) return null;

  const exact = catalog.find((pkg) => sameOption(pkg, trimmed));
  if (exact) return exact;

  // Jazz Simple Cut SoftSelect: match on first 3 words only (ignore paren body).
  if (isJazzSimpleCutByFirstThreeWords(trimmed)) {
    const jazzSimple = catalog.find(
      (pkg) => pkg.trim().toUpperCase() === "JAZZ SIMPLE CUT"
    );
    if (jazzSimple) return jazzSimple;
  }

  const tierOnly = packageTypeDisplayValue(trimmed);
  if (tierOnly) {
    const byTier = catalog.find((pkg) => sameOption(pkg, tierOnly));
    if (byTier) return byTier;
  }

  const upper = trimmed.toUpperCase();
  const sorted = [...catalog].sort((a, b) => b.length - a.length);
  return (
    sorted.find((pkg) => upper.includes(pkg.toUpperCase())) ?? null
  );
}

function isPreservablePackage(raw: string, catalog: string[]): boolean {
  if (!raw.trim() || isFormCategoryLabel(raw)) return false;
  if (matchPackageOption(raw, catalog)) return true;
  const tierOnly = packageTypeDisplayValue(raw);
  return Boolean(tierOnly && !isFormCategoryLabel(tierOnly));
}

/**
 * Magento SoftSelect PACKAGE TYPE labels for cheer.
 * School Cheer / All-Star: "… Package". Youth Rec Magento: tier only ("Bronze").
 * School Cheer also: Rally Mix (without 8 count sheets).
 */
const CHEER_PACKAGE_LABELS: Record<string, string> = {
  BRONZE: "Bronze Package",
  SILVER: "Silver Package",
  GOLD: "Gold Package",
  PLATINUM: "Platinum Package",
  TITANIUM: "Titanium Package",
  "RALLY MIX": "Rally Mix (without 8 count sheets)",
};

/** Youth Rec Magento SoftSelect PACKAGE: no "Package" suffix. */
const YOUTH_REC_PACKAGE_LABELS: Record<string, string> = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
  TITANIUM: "Titanium",
};

/** Magento School Cheer SoftSelect + Pricing package order. */
export const SCHOOL_CHEER_MAGENTO_PACKAGE_ORDER = [
  "SILVER",
  "GOLD",
  "PLATINUM",
  "TITANIUM",
  "RALLY MIX",
] as const;

/** Magento School Cheer / VIROC SoftSelect Length of Mix. */
export const SCHOOL_CHEER_MAGENTO_MIX_ORDER = [
  "1:00",
  "1:30",
  "1:45",
  "2:00",
  "2:15",
  "2:30",
] as const;

/** Pricing Time Limit column: same SoftSelect lengths (+ Rally Mix "-" + Other). */
const SCHOOL_CHEER_PRICING_MIX_ORDER = [
  "1:00",
  "1:30",
  "1:45",
  "2:00",
  "2:15",
  "2:30",
  "-",
  "Other - please specify the time needed in your notes section",
] as const;

/**
 * Exact Magento PACKAGE TYPE SoftSelect labels (with prices): SoftSelect +
 * board matching. Do not use dollar amounts in Pricing UI.
 * POM Magento: Dance Mix → Dance Plus (6-8) → Custom Pom → Rally Mix.
 * Hip Hop Magento: Dance Mix → Dance Plus (6 to 8) → Custom Hip-Hop (no Rally).
 */
const POM_PACKAGE_LABELS: Record<string, string> = {
  "DANCE MIX": "Dance Mix (up to 5 songs) $475",
  "DANCE PLUS": "Dance Plus (6-8 songs) $575",
  "CUSTOM POM": "Custom Pom (8 songs) $850",
  "RALLY MIX": "Rally Mix $350",
};

const HIP_HOP_PACKAGE_LABELS: Record<string, string> = {
  "DANCE MIX": "Dance Mix (up to 5 songs) $475",
  "DANCE PLUS": "Dance Plus (6 to 8 songs) $575",
  "CUSTOM HIP-HOP": "Custom Hip-Hop (8 songs) $850",
  // Legacy key still present on some rows: show Magento Hip Hop wording.
  "CUSTOM POM": "Custom Hip-Hop (8 songs) $850",
};

/** Magento SoftSelect for Team Performance & Variety (no prices in Magento). */
const TP_PACKAGE_LABELS: Record<string, string> = {
  "TP MIX": "TP Mix (up to 5 songs)",
  "TP PLUS MIX": "TP Plus (6-8 songs)",
};

/** Magento SoftSelect for Gameday: ALL CAPS + song counts + prices. */
const GAMEDAY_PACKAGE_LABELS: Record<string, string> = {
  "PERFORMANCE MIX": "PERFORMANCE MIX (1 song) $100",
  "PERFORMANCE PLUS": "PERFORMANCE PLUS (2 songs) $150",
  "PERFORMANCE EXTREME": "PERFORMANCE EXTREME (3-4 songs) $200",
};

const DANCE_PACKAGE_LABELS: Record<string, string> = {
  ...POM_PACKAGE_LABELS,
  "CUSTOM HIP-HOP": "Custom Hip-Hop (8 songs) $850",
  ...TP_PACKAGE_LABELS,
  ...GAMEDAY_PACKAGE_LABELS,
  "JAZZ/KICK MIX": "Jazz/Kick Mix (up to 2 songs) $200",
  "JAZZ SIMPLE CUT":
    "Jazz Simple Cut (up to 2:30 of music, with the use of one iTunes song only cut for time. This song will not be altered in any way; no sound effects or backbeats added.) $100",
  "NON-COMPLIANT (FOR DTU)": "Non compliant (for DTU)",
};

const POM_PRICING_LABELS: Record<string, string> = {
  "DANCE MIX": "Dance Mix (up to 5 songs)",
  "DANCE PLUS": "Dance Plus (6-8 songs)",
  "CUSTOM POM": "Custom Pom (8 songs)",
  "RALLY MIX": "Rally Mix",
};

const HIP_HOP_PRICING_LABELS: Record<string, string> = {
  "DANCE MIX": "Dance Mix (up to 5 songs)",
  "DANCE PLUS": "Dance Plus (6 to 8 songs)",
  "CUSTOM HIP-HOP": "Custom Hip-Hop (8 songs)",
  "CUSTOM POM": "Custom Hip-Hop (8 songs)",
};

const TP_PRICING_LABELS: Record<string, string> = {
  "TP MIX": "TP Mix (up to 5 songs)",
  "TP PLUS MIX": "TP Plus (6-8 songs)",
};

const GAMEDAY_PRICING_LABELS: Record<string, string> = {
  "PERFORMANCE MIX": "PERFORMANCE MIX (1 song)",
  "PERFORMANCE PLUS": "PERFORMANCE PLUS (2 songs)",
  "PERFORMANCE EXTREME": "PERFORMANCE EXTREME (3-4 songs)",
};

/** Pricing modal names: Magento wording without dollar amounts. */
const DANCE_PRICING_LABELS: Record<string, string> = {
  ...POM_PRICING_LABELS,
  "CUSTOM HIP-HOP": "Custom Hip-Hop (8 songs)",
  ...TP_PRICING_LABELS,
  ...GAMEDAY_PRICING_LABELS,
  "JAZZ/KICK MIX": "Jazz/Kick Mix (up to 2 songs)",
  // Pricing only: SoftSelect keeps Magento paren body; Pricing shows name only.
  "JAZZ SIMPLE CUT": "Jazz Simple Cut",
  "NON-COMPLIANT (FOR DTU)": "Non compliant (for DTU)",
};

/** Magento Jazz/Kick SoftSelect + Pricing row order. */
export const JAZZ_KICK_MAGENTO_PACKAGE_ORDER = [
  "JAZZ/KICK MIX",
  "JAZZ SIMPLE CUT",
  "NON-COMPLIANT (FOR DTU)",
] as const;

/** Magento Team Performance SoftSelect + Pricing row order. */
export const TP_MAGENTO_PACKAGE_ORDER = ["TP MIX", "TP PLUS MIX"] as const;

/** Magento Gameday SoftSelect + Pricing row order. */
export const GAMEDAY_MAGENTO_PACKAGE_ORDER = [
  "PERFORMANCE MIX",
  "PERFORMANCE PLUS",
  "PERFORMANCE EXTREME",
] as const;

/** Magento POM SoftSelect + Pricing row order. */
export const POM_MAGENTO_PACKAGE_ORDER = [
  "DANCE MIX",
  "DANCE PLUS",
  "CUSTOM POM",
  "RALLY MIX",
] as const;

/** Magento Hip Hop SoftSelect + Pricing row order (no Rally Mix). */
export const HIP_HOP_MAGENTO_PACKAGE_ORDER = [
  "DANCE MIX",
  "DANCE PLUS",
  "CUSTOM HIP-HOP",
] as const;

/**
 * Magento PACKAGE TYPE labels (with prices) for Marching Band SoftSelect.
 * Order of SoftSelect options follows packagesForOrderForm / rate card.
 */
const MARCHING_BAND_PACKAGE_LABELS: Record<string, string> = {
  "DRUM CADENCE ORIGINAL": "Drum Cadence ($350.00)",
  "BAND CHANT": "Band Chant ($600.00)",
  "FIGHT SONG ORIGINAL": "Fight Song Original ($1,100.00)",
  "FIGHT SONG PLUS": "Fight Song Plus ($2,250.00)",
  "ALMA MATER ORIGINAL": "Alma Mater Original ($1,100.00)",
  "ALMA MATER PLUS": "Alma Mater Plus ($2,250.00)",
};

/** Short Magento names for Orders/MTD package column (no price). */
const MARCHING_BAND_BOARD_LABELS: Record<string, string> = {
  "DRUM CADENCE ORIGINAL": "Drum Cadence",
  "DRUM CADENCE": "Drum Cadence",
  "BAND CHANT": "Band Chant",
  "FIGHT SONG ORIGINAL": "Fight Song Original",
  "FIGHT SONG PLUS": "Fight Song Plus",
  "ALMA MATER ORIGINAL": "Alma Mater Original",
  "ALMA MATER PLUS": "Alma Mater Plus",
};

/**
 * Magento PACKAGE TYPE labels for Sports Entertainment SoftSelect / Pricing.
 * Magento order: Quarter Break → Pre-Game/Halftime → Other.
 */
const SPORTS_ENTERTAINMENT_PACKAGE_LABELS: Record<string, string> = {
  "QUARTER BREAK / TIMEOUT REMIXED":
    "Quarter Break/Timeout Remixed Package",
  "PRE-GAME / HALFTIME REMIXED": "Pre-Game/Halftime Remixed Package",
  "OTHER (MIXES LONGER THAN 2:30)":
    "Other - specify in notes section of the order form",
  // Legacy / truncated / wrong demo labels → Magento options
  "HALFTIME SHOW": "Pre-Game/Halftime Remixed Package",
  "PRE-GAME / HALFTIME": "Pre-Game/Halftime Remixed Package",
  "TIMEOUT REMIX": "Quarter Break/Timeout Remixed Package",
  "TIMEOUT REMIXED": "Quarter Break/Timeout Remixed Package",
  "ARENA HYPE SUITE": "Pre-Game/Halftime Remixed Package",
  "OTHER (MIXES LONGER THAN 2:30":
    "Other - specify in notes section of the order form",
};

const SPORTS_ENTERTAINMENT_BOARD_LABELS: Record<string, string> = {
  "QUARTER BREAK / TIMEOUT REMIXED":
    "Quarter Break/Timeout Remixed Package",
  "PRE-GAME / HALFTIME REMIXED": "Pre-Game/Halftime Remixed Package",
  "OTHER (MIXES LONGER THAN 2:30)":
    "Other - specify in notes section of the order form",
  "OTHER (mixes longer than 2:30)":
    "Other - specify in notes section of the order form",
  "HALFTIME SHOW": "Pre-Game/Halftime Remixed Package",
  "TIMEOUT REMIX": "Quarter Break/Timeout Remixed Package",
  "TIMEOUT REMIXED": "Quarter Break/Timeout Remixed Package",
  "ARENA HYPE SUITE": "Pre-Game/Halftime Remixed Package",
};

function dancePackageLabel(
  pkg: string,
  danceSubtype?: DanceFormSubtype | string | null
): string {
  // Jazz Simple Cut: Magento paren body is long: key off first 3 words only.
  const key = isJazzSimpleCutByFirstThreeWords(pkg)
    ? "JAZZ SIMPLE CUT"
    : pkg.trim().toUpperCase();
  const sub = String(danceSubtype || "").toLowerCase();
  if (sub === "hip-hop") {
    return HIP_HOP_PACKAGE_LABELS[key] || DANCE_PACKAGE_LABELS[key] || pkg;
  }
  if (sub === "pom") {
    return POM_PACKAGE_LABELS[key] || DANCE_PACKAGE_LABELS[key] || pkg;
  }
  if (sub.includes("team-performance") || sub === "tp") {
    return TP_PACKAGE_LABELS[key] || DANCE_PACKAGE_LABELS[key] || pkg;
  }
  if (sub === "gameday") {
    return GAMEDAY_PACKAGE_LABELS[key] || DANCE_PACKAGE_LABELS[key] || pkg;
  }
  return DANCE_PACKAGE_LABELS[key] || pkg;
}

function dancePricingLabel(
  pkg: string,
  categoryOrSubtype?: string | null
): string {
  const key = isJazzSimpleCutByFirstThreeWords(pkg)
    ? "JAZZ SIMPLE CUT"
    : pkg.trim().toUpperCase();
  const cat = String(categoryOrSubtype || "").toLowerCase();
  if (cat.includes("hip")) {
    if (HIP_HOP_PRICING_LABELS[key]) return HIP_HOP_PRICING_LABELS[key];
  }
  if (cat.includes("pom") && !cat.includes("team")) {
    if (POM_PRICING_LABELS[key]) return POM_PRICING_LABELS[key];
  }
  if (cat.includes("team") || cat.includes("tp ")) {
    if (TP_PRICING_LABELS[key]) return TP_PRICING_LABELS[key];
  }
  if (cat.includes("gameday")) {
    if (GAMEDAY_PRICING_LABELS[key]) return GAMEDAY_PRICING_LABELS[key];
  }
  if (DANCE_PRICING_LABELS[key]) return DANCE_PRICING_LABELS[key];
  // Strip trailing $price from Magento SoftSelect wording if present.
  return dancePackageLabel(pkg).replace(/\s*\$[\d,]+(?:\.\d{2})?\s*$/u, "").trim();
}

function marchingBandPackageLabel(pkg: string): string {
  const key = pkg.trim().toUpperCase();
  return MARCHING_BAND_PACKAGE_LABELS[key] || pkg;
}

function sportsEntertainmentPackageLabel(pkg: string): string {
  const canonical = sportsEntertainmentOtherPackageKey(pkg) || pkg;
  const key = canonical.trim().toUpperCase();
  return (
    SPORTS_ENTERTAINMENT_PACKAGE_LABELS[key] ||
    SPORTS_ENTERTAINMENT_BOARD_LABELS[key] ||
    SPORTS_ENTERTAINMENT_BOARD_LABELS[canonical] ||
    pkg
  );
}

function cheerPackageLabel(
  pkg: string,
  cheerSubtype?: CheerFormSubtype | string | null
): string {
  const key = cheerTierKey(pkg);
  if (cheerSubtype === "youth-rec-cheer") {
    return YOUTH_REC_PACKAGE_LABELS[key] || titleCasePackage(key || pkg);
  }
  return CHEER_PACKAGE_LABELS[key] || titleCasePackage(pkg);
}

function packageOptionLabel(
  formType: OrderFormType,
  pkg: string,
  danceSubtype?: DanceFormSubtype | null,
  cheerSubtype?: CheerFormSubtype | null
): string {
  if (formType === "school-all-star-cheer") {
    return cheerPackageLabel(pkg, cheerSubtype);
  }
  if (formType === "school-all-star-dance") {
    return dancePackageLabel(pkg, danceSubtype);
  }
  if (formType === "marching-band") return marchingBandPackageLabel(pkg);
  if (formType === "sports-entertainment") {
    return sportsEntertainmentPackageLabel(pkg);
  }
  return pkg;
}

/**
 * Magento-facing package name for Orders/MTD Package type column.
 * Prefer Magento SoftSelect wording; fall back to title-cased tier.
 */
export function magentoPackageBoardLabel(
  formType: OrderFormType | string | null | undefined,
  rawPackage: string,
  danceSubtype?: DanceFormSubtype | string | null,
  cheerSubtype?: CheerFormSubtype | string | null
): string {
  const tier = packageTypeDisplayValue(rawPackage);
  if (!tier) return "";
  const key = tier.trim().toUpperCase();
  const form = String(formType || "").toLowerCase();

  if (form === "marching-band" || form.includes("band")) {
    return MARCHING_BAND_BOARD_LABELS[key] || titleCasePackage(tier);
  }
  if (form === "sports-entertainment" || form.includes("sports")) {
    return (
      sportsEntertainmentPackageLabel(rawPackage) ||
      sportsEntertainmentPackageLabel(tier) ||
      titleCasePackage(tier)
    );
  }
  if (form === "school-all-star-dance" || form.includes("dance")) {
    // SoftSelect keeps Magento paren body; board/tooltip drops it for Jazz Simple Cut.
    if (isJazzSimpleCutByFirstThreeWords(tier)) {
      return "Jazz Simple Cut $100";
    }
    return dancePackageLabel(tier, danceSubtype);
  }
  if (form === "school-all-star-cheer" || form.includes("cheer")) {
    return cheerPackageLabel(tier, cheerSubtype);
  }
  return titleCasePackage(tier);
}

/** Magento display name for Pricing modal / rate-card package column. */
export function magentoPricingPackageLabel(
  category: string | null | undefined,
  rawPackage: string
): string {
  const key = String(rawPackage || "")
    .trim()
    .toUpperCase();
  if (!key) return rawPackage;
  const cat = String(category || "").toLowerCase();
  if (cat.includes("marching") || cat === "marching band") {
    return MARCHING_BAND_BOARD_LABELS[key] || titleCasePackage(rawPackage);
  }
  if (cat.includes("sports")) {
    return (
      sportsEntertainmentPackageLabel(rawPackage) ||
      sportsEntertainmentPackageLabel(key) ||
      titleCasePackage(rawPackage)
    );
  }
  if (
    cat.includes("dance") ||
    cat.includes("pom") ||
    cat.includes("hip hop") ||
    cat.includes("hip-hop") ||
    cat.includes("team performance") ||
    cat.includes("gameday") ||
    cat.includes("jazz")
  ) {
    return dancePricingLabel(key, cat);
  }
  if (
    cat.includes("cheer") ||
    cat.includes("all-star") ||
    cat.includes("all star") ||
    cat.includes("youth rec") ||
    cat.includes("viroc")
  ) {
    // SoftSelect keeps Magento "Silver Package" / etc. Pricing drops
    // "Package" (Silver / Gold / …). Rally Mix keeps full SoftSelect text.
    const tier = cheerTierKey(key);
    if (tier === "ANY PACKAGE" || key === "ANY PACKAGE") {
      return "Any";
    }
    if (tier === "RALLY MIX") {
      return CHEER_PACKAGE_LABELS["RALLY MIX"];
    }
    if (CHEER_PACKAGE_LABELS[tier]) {
      return titleCasePackage(tier);
    }
    return titleCasePackage(cheerTierKey(rawPackage) || rawPackage);
  }
  return rawPackage;
}

/** Magento PACKAGE TYPE sort order for Marching Band rate-card rows. */
export const MARCHING_BAND_MAGENTO_PACKAGE_ORDER = [
  "DRUM CADENCE ORIGINAL",
  "BAND CHANT",
  "FIGHT SONG ORIGINAL",
  "FIGHT SONG PLUS",
  "ALMA MATER ORIGINAL",
  "ALMA MATER PLUS",
] as const;

/** Magento PACKAGE TYPE sort order for Sports Entertainment. */
export const SPORTS_ENTERTAINMENT_MAGENTO_PACKAGE_ORDER = [
  "QUARTER BREAK / TIMEOUT REMIXED",
  "PRE-GAME / HALFTIME REMIXED",
  "OTHER (mixes longer than 2:30)",
] as const;

function sortFlatPackageRowsByOrder<T extends { kind?: string; package?: string }>(
  rows: T[],
  order: readonly string[]
): T[] {
  const rank = new Map(order.map((pkg, i) => [pkg.toUpperCase(), i]));
  return [...rows].sort((a, b) => {
    if (a.kind && a.kind !== "flat-package") return 0;
    if (b.kind && b.kind !== "flat-package") return 0;
    const aKey = String(a.package || "")
      .trim()
      .toUpperCase();
    const bKey = String(b.package || "")
      .trim()
      .toUpperCase();
    const aRank = rank.get(aKey);
    const bRank = rank.get(bKey);
    if (aRank == null && bRank == null) return 0;
    if (aRank == null) return 1;
    if (bRank == null) return -1;
    return aRank - bRank;
  });
}

export function sortMarchingBandPricingRows<
  T extends { kind?: string; package?: string }
>(rows: T[]): T[] {
  return sortFlatPackageRowsByOrder(rows, MARCHING_BAND_MAGENTO_PACKAGE_ORDER);
}

export function sortSportsEntertainmentPricingRows<
  T extends { kind?: string; package?: string }
>(rows: T[]): T[] {
  return sortFlatPackageRowsByOrder(
    rows,
    SPORTS_ENTERTAINMENT_MAGENTO_PACKAGE_ORDER
  );
}

export function sortPomDancePricingRows<
  T extends { kind?: string; package?: string }
>(rows: T[]): T[] {
  return sortFlatPackageRowsByOrder(rows, POM_MAGENTO_PACKAGE_ORDER);
}

export function sortHipHopDancePricingRows<
  T extends { kind?: string; package?: string }
>(rows: T[]): T[] {
  return sortFlatPackageRowsByOrder(rows, HIP_HOP_MAGENTO_PACKAGE_ORDER);
}

export function sortTpDancePricingRows<
  T extends { kind?: string; package?: string }
>(rows: T[]): T[] {
  return sortFlatPackageRowsByOrder(rows, TP_MAGENTO_PACKAGE_ORDER);
}

export function sortGamedayDancePricingRows<
  T extends { kind?: string; package?: string }
>(rows: T[]): T[] {
  return sortFlatPackageRowsByOrder(rows, GAMEDAY_MAGENTO_PACKAGE_ORDER);
}

export function sortJazzKickDancePricingRows<
  T extends { kind?: string; package?: string }
>(rows: T[]): T[] {
  return sortFlatPackageRowsByOrder(rows, JAZZ_KICK_MAGENTO_PACKAGE_ORDER);
}

/** Magento School Cheer SoftSelect order: Silver → Gold → Platinum → Titanium → Rally Mix. */
export function sortSchoolCheerPricingRows<
  T extends {
    kind?: string;
    tier?: string;
    limit?: string;
    package?: string;
    isUnpriced?: boolean;
  }
>(rows: T[]): T[] {
  const tierRank = new Map(
    SCHOOL_CHEER_MAGENTO_PACKAGE_ORDER.map((pkg, i) => [pkg, i])
  );
  const mixRank = new Map(
    SCHOOL_CHEER_PRICING_MIX_ORDER.map((limit, i) => [limit, i])
  );
  return [...rows].sort((a, b) => {
    if (a.kind && a.kind !== "tier-time") return 0;
    if (b.kind && b.kind !== "tier-time") return 0;
    // SoftSelect "Other" (any package → needs quote) always last after Rally Mix.
    const aOther =
      Boolean(a.isUnpriced) ||
      cheerTierKey(String(a.tier || "")) === "ANY PACKAGE" ||
      /^other\b/i.test(String(a.limit || "").trim());
    const bOther =
      Boolean(b.isUnpriced) ||
      cheerTierKey(String(b.tier || "")) === "ANY PACKAGE" ||
      /^other\b/i.test(String(b.limit || "").trim());
    if (aOther !== bOther) return aOther ? 1 : -1;
    const aTier = cheerTierKey(String(a.tier || a.package || ""));
    const bTier = cheerTierKey(String(b.tier || b.package || ""));
    const aT = tierRank.get(aTier as (typeof SCHOOL_CHEER_MAGENTO_PACKAGE_ORDER)[number]);
    const bT = tierRank.get(bTier as (typeof SCHOOL_CHEER_MAGENTO_PACKAGE_ORDER)[number]);
    if (aT != null || bT != null) {
      if (aT == null) return 1;
      if (bT == null) return -1;
      if (aT !== bT) return aT - bT;
    }
    const aL = mixRank.get(
      String(a.limit || "-").trim() as (typeof SCHOOL_CHEER_PRICING_MIX_ORDER)[number]
    );
    const bL = mixRank.get(
      String(b.limit || "-").trim() as (typeof SCHOOL_CHEER_PRICING_MIX_ORDER)[number]
    );
    if (aL == null && bL == null) return 0;
    if (aL == null) return 1;
    if (bL == null) return -1;
    return aL - bL;
  });
}

function titleCasePackage(value: string): string {
  // Use shared titleCase so acronyms like TBD stay "TBD", not "Tbd".
  return titleCase(value.trim());
}

export function PackageTypeField({
  value,
  originalValue,
  formType,
  cheerSubtype,
  danceSubtype,
  onChange,
}: PackageTypeFieldProps) {
  const [open, setOpen] = useState(false);

  const originalRawRef = useRef<string | null>(null);
  if (originalRawRef.current === null) {
    originalRawRef.current = (originalValue ?? value).trim();
  }
  const originalRaw = originalRawRef.current;
  const originalTier = packageTypeDisplayValue(originalRaw);

  const catalog = useMemo(
    () => packagesForOrderForm(formType, cheerSubtype, danceSubtype),
    [formType, cheerSubtype, danceSubtype]
  );

  const options = useMemo(() => {
    const seen = new Set<string>();
    const list: SoftOption[] = [];

    const push = (pkg: string) => {
      const key = pkg.trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      list.push({
        value: pkg,
        label: packageOptionLabel(formType, pkg, danceSubtype, cheerSubtype),
      });
    };

    for (const pkg of catalog) push(pkg);

    // Keep original tier if it isn't in the rate card (never re-add "GOLD 1:30").
    if (originalTier && !matchPackageOption(originalTier, catalog)) {
      push(originalTier);
    }

    const currentTier = packageTypeDisplayValue(value);
    if (currentTier && !matchPackageOption(currentTier, catalog)) {
      push(currentTier);
    }

    return list;
  }, [catalog, originalTier, value, formType, danceSubtype, cheerSubtype]);

  const selectValue = (() => {
    const matched = matchPackageOption(value, catalog);
    if (matched) return matched;
    const tier = packageTypeDisplayValue(value);
    if (tier) return tier;
    return "";
  })();

  return (
    <SoftSelect
      aria-label="Package type"
      size="md"
      searchable
      searchPlaceholder="Search packages…"
      placeholder="Select package…"
      placement="below"
      value={selectValue}
      options={options}
      open={open}
      onOpenChange={setOpen}
      onChange={(next) => {
        // Always persist tier/package only: length lives in Mix Length.
        onChange(packageTypeDisplayValue(next) || next);
        setOpen(false);
      }}
      className="w-full"
    />
  );
}
