"use client";

import { useMemo, useRef, useState } from "react";
import { SoftSelect } from "@/components/ui/SoftSelect";
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

/** Strip mix length from cheer package strings → tier/package only. */
export function packageTypeDisplayValue(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || isFormCategoryLabel(trimmed)) return "";
  const parsed = parsePackage(trimmed);
  if (parsed.tier && parsed.tier !== "-") return parsed.tier;
  return trimmed.replace(/\s+\d+:\d{2}\b/g, "").replace(/\s+TBD\b/i, "").trim();
}

function matchPackageOption(raw: string, catalog: string[]): string | null {
  const trimmed = raw.trim();
  if (!trimmed || isFormCategoryLabel(trimmed)) return null;

  const exact = catalog.find((pkg) => sameOption(pkg, trimmed));
  if (exact) return exact;

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

/** Customer-facing SoftSelect labels for dance rate-card packages. */
const DANCE_PACKAGE_LABELS: Record<string, string> = {
  "DANCE MIX": "Dance Mix (up to 5 songs) $475",
  "DANCE PLUS": "Dance Plus (up to 8 songs) $575",
  "CUSTOM POM": "Custom Pom $850",
  "TP MIX": "TP Mix (up to 5 songs)",
  "TP PLUS MIX": "TP Plus Mix (up to 8 songs)",
  "PERFORMANCE MIX": "PERFORMANCE MIX (1 song) $100",
  "PERFORMANCE PLUS": "PERFORMANCE PLUS $150",
  "PERFORMANCE EXTREME": "PERFORMANCE EXTREME $200",
  "JAZZ/KICK MIX": "Jazz/Kick Mix (up to 2 songs) $200",
  "JAZZ SIMPLE CUT": "Jazz Simple Cut $100",
};

/** Customer-facing SoftSelect labels for Marching Band packages. */
const MARCHING_BAND_PACKAGE_LABELS: Record<string, string> = {
  "BAND CHANT": "Band Chant ($600.00)",
  "DRUM CADENCE ORIGINAL": "Drum Cadence ($350.00)",
  "FIGHT SONG ORIGINAL": "Fight Song Original ($1,100.00)",
  "ALMA MATER ORIGINAL": "Alma Mater Original ($1,100.00)",
  "FIGHT SONG PLUS": "Fight Song Plus ($2,250.00)",
  "ALMA MATER PLUS": "Alma Mater Plus ($2,250.00)",
};

/** Customer-facing SoftSelect labels for Sports Entertainment packages. */
const SPORTS_ENTERTAINMENT_PACKAGE_LABELS: Record<string, string> = {
  "QUARTER BREAK / TIMEOUT REMIXED": "Quarter Break/Timeout Remixed Package",
  "PRE-GAME / HALFTIME REMIXED": "Pre-Game/Halftime Remixed Package",
  "OTHER (MIXES LONGER THAN 2:30)": "Other (mixes longer than 2:30)",
};

function dancePackageLabel(pkg: string): string {
  const key = pkg.trim().toUpperCase();
  return DANCE_PACKAGE_LABELS[key] || pkg;
}

function marchingBandPackageLabel(pkg: string): string {
  const key = pkg.trim().toUpperCase();
  return MARCHING_BAND_PACKAGE_LABELS[key] || pkg;
}

function sportsEntertainmentPackageLabel(pkg: string): string {
  const key = pkg.trim().toUpperCase();
  return SPORTS_ENTERTAINMENT_PACKAGE_LABELS[key] || pkg;
}

function packageOptionLabel(formType: OrderFormType, pkg: string): string {
  if (formType === "school-all-star-dance") return dancePackageLabel(pkg);
  if (formType === "marching-band") return marchingBandPackageLabel(pkg);
  if (formType === "sports-entertainment") {
    return sportsEntertainmentPackageLabel(pkg);
  }
  return pkg;
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
        label: packageOptionLabel(formType, pkg),
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
  }, [catalog, originalTier, value, formType]);

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
        // Always persist tier/package only — length lives in Mix Length.
        onChange(packageTypeDisplayValue(next) || next);
        setOpen(false);
      }}
      className="w-full"
    />
  );
}
