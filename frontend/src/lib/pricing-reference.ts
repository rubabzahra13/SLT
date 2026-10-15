import {
  ALL_STAR_CHEER_RATE_CARD,
  GAMEDAY_RATE_CARD,
  getDanceRateCardForSubtype,
  getMarchingBandRateCard,
  getRateCardForSubtype,
  getSchoolAnthemRateCard,
  getSportsEntertainmentRateCard,
  HIP_HOP_RATE_CARD,
  POM_RATE_CARD,
  SCHOOL_CHEER_RATE_CARD,
  setCheerRateCardFromDb,
  setDanceRateCardFromDb,
  setMarchingBandRateCardFromDb,
  setRuntimeCompliantAffiliateLabelsByCategory,
  setSchoolAnthemRateCardFromDb,
  setSportsEntertainmentRateCardFromDb,
  TEAM_PERFORMANCE_VARIETY_RATE_CARD,
} from "@/lib/pricing-engine";
import type { BackendPricingRule } from "@/lib/api/pricing-rules";
import type { DbBackedFormType } from "@/lib/api/pricing-rules";
import { parsePackage } from "@/lib/package";

export type CategoryKey =
  | "All-Star Cheer"
  | "School Cheer"
  | "Youth Rec Cheer"
  | "Pom"
  | "Hip Hop"
  | "Team Performance & Variety"
  | "Gameday"
  | "Jazz/Kick"
  | "Marching Band"
  | "Sports Entertainment"
  | "School Anthems";

export const PRICING_CATEGORY_KEYS: CategoryKey[] = [
  "All-Star Cheer",
  "School Cheer",
  "Youth Rec Cheer",
  "Pom",
  "Hip Hop",
  "Team Performance & Variety",
  "Gameday",
  "Jazz/Kick",
  "Marching Band",
  "Sports Entertainment",
  "School Anthems",
];

export type PricingReferenceAddOn = {
  name: string;
  price: string;
};

export function stripAddOnFlatSuffix(price: string): string {
  return price.replace(/\s*\(flat\)\s*$/i, "").trim();
}

export type TierTimePricingRow = {
  kind: "tier-time";
  tier: string;
  limit: string;
  customer: number;
  compliant: number;
  nonCompliant: number;
  isTitanium?: boolean;
  alwaysFixedPayroll?: boolean;
};

export type FlatPackagePricingRow = {
  kind: "flat-package";
  package: string;
  customer: number | null;
  compliant: number | null;
  nonCompliant: number | null;
  alwaysFixedPayroll?: boolean;
  isUnpriced?: boolean;
};

export type PricingReferenceRow = TierTimePricingRow | FlatPackagePricingRow;

export type CategoryPricingSnapshot = {
  rows: PricingReferenceRow[];
  addOns: PricingReferenceAddOn[];
  compliantAffiliateIds: string[];
  compliantAffiliateLabels?: Partial<Record<string, string>>;
  nonCompliantAffiliateLabels?: Partial<Record<string, string>>;
};

export type MusicAffiliateOption = {
  id: string;
  label: string;
  danceOnly?: boolean;
  alwaysNonCompliant?: boolean;
};

export type CompliantAffiliateOption = MusicAffiliateOption;

export const COMPLIANT_AFFILIATE_OPTIONS: MusicAffiliateOption[] = [
  {
    id: "power-music-unleash-covers",
    label:
      "Power Music & Unleash the Beats Covers (can not be used for a Titanium Package)",
  },
  { id: "power-music-covers", label: "Power Music Covers" },
  { id: "unleash-the-beats-covers", label: "Unleash the Beats Covers" },
  { id: "songs-for-cheer", label: "Songs for Cheer" },
  {
    id: "original-custom-music-titanium",
    label: "100% original custom music (titanium package only)",
  },
];

/** Explicit non-compliant choice — any other free text is also non-compliant. */
export const NON_COMPLIANT_AFFILIATE_OPTIONS: MusicAffiliateOption[] = [
  { id: "non-compliant", label: "Non compliant", alwaysNonCompliant: true },
];

/** All-Star Cheer form / pricing affiliate choices (order shown in UI). */
export const ALL_STAR_CHEER_MUSIC_AFFILIATE_OPTIONS = [
  "Power Music & Unleash the Beats Covers (can not be used for a Titanium Package)",
  "Power Music Covers",
  "Unleash the Beats Covers",
  "Songs for Cheer",
  "100% original custom music (titanium package only)",
  "Non compliant",
] as const;

export const DEFAULT_COMPLIANT_AFFILIATE_IDS = COMPLIANT_AFFILIATE_OPTIONS.map(
  (option) => option.id
);

const DANCE_CATEGORIES = new Set<CategoryKey>([
  "Pom",
  "Hip Hop",
  "Team Performance & Variety",
  "Gameday",
  "Jazz/Kick",
]);

export type PricingReferenceStore = {
  categories: Partial<Record<CategoryKey, CategoryPricingSnapshot>>;
};

const STORAGE_KEY = "slt-pricing-reference-v2";

export function isDanceCategory(category: CategoryKey): boolean {
  return DANCE_CATEGORIES.has(category);
}

function findMusicAffiliateOption(id: string): MusicAffiliateOption | undefined {
  return (
    COMPLIANT_AFFILIATE_OPTIONS.find((entry) => entry.id === id) ??
    NON_COMPLIANT_AFFILIATE_OPTIONS.find((entry) => entry.id === id)
  );
}

export function getVisibleCompliantAffiliateOptions(
  category: CategoryKey
): CompliantAffiliateOption[] {
  return COMPLIANT_AFFILIATE_OPTIONS.filter(
    (option) => !option.danceOnly || isDanceCategory(category)
  );
}

export function getVisibleMusicAffiliateOptions(
  category: CategoryKey
): MusicAffiliateOption[] {
  const compliant = getVisibleCompliantAffiliateOptions(category);
  return [...compliant, ...NON_COMPLIANT_AFFILIATE_OPTIONS];
}

export function resolveCompliantAffiliateLabel(
  id: string,
  labels?: Partial<Record<string, string>>,
  nonCompliantLabels?: Partial<Record<string, string>>
): string {
  const override = labels?.[id]?.trim() || nonCompliantLabels?.[id]?.trim();
  if (override) return override;
  const option = findMusicAffiliateOption(id);
  return option?.label ?? id;
}

export function normalizeCompliantAffiliateLabelOverride(
  id: string,
  label: string
): string | undefined {
  const trimmed = label.trim();
  const defaultLabel = findMusicAffiliateOption(id)?.label ?? "";
  if (!trimmed || trimmed === defaultLabel) return undefined;
  return trimmed;
}
export function affiliateIdsEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((id, index) => id === sortedRight[index]);
}

function normalizeCompliantAffiliateIds(ids?: string[]): string[] {
  if (!ids?.length) return [...DEFAULT_COMPLIANT_AFFILIATE_IDS];
  const valid = new Set(DEFAULT_COMPLIANT_AFFILIATE_IDS);
  const filtered = ids.filter((id) => valid.has(id));
  return filtered.length > 0 ? filtered : [...DEFAULT_COMPLIANT_AFFILIATE_IDS];
}

const DEFAULT_CATEGORY_ADDONS: Record<CategoryKey, PricingReferenceAddOn[]> = {
  "All-Star Cheer": [],
  "School Cheer": [],
  "Youth Rec Cheer": [
    { name: "Extend 2 8ct Phrase/Raps", price: "+$25" },
    { name: "Processing 8ct Sheets", price: "+$50" },
  ],
  Pom: [
    { name: "Traditional VO", price: "+$25" },
    { name: "Themed VO (up to 5)", price: "+$75" },
  ],
  "Hip Hop": [
    { name: "Traditional VO", price: "+$25" },
    { name: "Themed VO (up to 5)", price: "+$75" },
  ],
  "Team Performance & Variety": [
    { name: "Traditional VO", price: "+$25" },
    { name: "Themed VO (up to 5)", price: "+$75" },
  ],
  Gameday: [
    { name: "Traditional VO", price: "+$25" },
    { name: "Themed VO (up to 5)", price: "+$75" },
  ],
  "Jazz/Kick": [
    { name: "Traditional VO", price: "+$25" },
    { name: "Themed VO (up to 5)", price: "+$75" },
  ],
  "Marching Band": [
    { name: "Sheet Music Add", price: "+$50" },
    { name: "Add Vocals", price: "+$75" },
  ],
  "Sports Entertainment": [
    { name: "Rush Order (needed in under 7 days)", price: "+$100" },
  ],
  "School Anthems": [],
};

function cloneSnapshot(snapshot: CategoryPricingSnapshot): CategoryPricingSnapshot {
  return {
    compliantAffiliateIds: [...snapshot.compliantAffiliateIds],
    compliantAffiliateLabels: snapshot.compliantAffiliateLabels
      ? { ...snapshot.compliantAffiliateLabels }
      : undefined,
    nonCompliantAffiliateLabels: snapshot.nonCompliantAffiliateLabels
      ? { ...snapshot.nonCompliantAffiliateLabels }
      : undefined,
    addOns: snapshot.addOns.map((addon) => ({ ...addon })),
    rows: snapshot.rows.map((row) => ({ ...row })),
  };
}

export function buildDefaultCategorySnapshot(
  category: CategoryKey
): CategoryPricingSnapshot {
  let rows: PricingReferenceRow[] = [];

  switch (category) {
    case "All-Star Cheer":
      rows = ALL_STAR_CHEER_RATE_CARD.map((row) => ({
        kind: "tier-time",
        tier: row.tier,
        limit: row.limit,
        customer: row.customer,
        compliant: row.compliant,
        nonCompliant: row.nonCompliant,
        isTitanium: row.isTitanium,
      }));
      break;
    case "School Cheer":
      rows = SCHOOL_CHEER_RATE_CARD.map((row) => ({
        kind: "tier-time",
        tier: row.tier,
        limit: row.limit,
        customer: row.customer,
        compliant: row.compliant,
        nonCompliant: row.nonCompliant,
        isTitanium: row.isTitanium,
      }));
      break;
    case "Youth Rec Cheer":
      // Flat package price (no music affiliate) — compliant === nonCompliant.
      rows = getRateCardForSubtype("youth-rec-cheer").map((row) => ({
        kind: "tier-time" as const,
        tier: row.tier,
        limit: row.limit,
        customer: row.customer,
        compliant: row.customer,
        nonCompliant: row.customer,
        isTitanium: row.isTitanium,
        alwaysFixedPayroll: true,
      }));
      break;
    case "Pom":
      rows = POM_RATE_CARD.map((row) => ({
        kind: "flat-package",
        package: row.package,
        customer: row.customer as number | null,
        compliant: row.compliant as number | null,
        nonCompliant: row.nonCompliant as number | null,
        alwaysFixedPayroll: Boolean(row.alwaysFixedPayroll),
        isUnpriced: false,
      }));
      break;
    case "Hip Hop":
      rows = HIP_HOP_RATE_CARD.map((row) => ({
        kind: "flat-package",
        package: row.package,
        customer: row.customer as number | null,
        compliant: row.compliant as number | null,
        nonCompliant: row.nonCompliant as number | null,
        alwaysFixedPayroll: Boolean(row.alwaysFixedPayroll),
        isUnpriced: false,
      }));
      break;
    case "Team Performance & Variety":
      rows = TEAM_PERFORMANCE_VARIETY_RATE_CARD.map((row) => ({
        kind: "flat-package",
        package: row.package,
        customer: row.customer as number | null,
        compliant: row.compliant as number | null,
        nonCompliant: row.nonCompliant as number | null,
        alwaysFixedPayroll: Boolean(row.alwaysFixedPayroll),
        isUnpriced: false,
      }));
      break;
    case "Gameday":
      rows = GAMEDAY_RATE_CARD.map((row) => ({
        kind: "flat-package",
        package: row.package,
        customer: row.customer as number | null,
        compliant: row.compliant as number | null,
        nonCompliant: row.nonCompliant as number | null,
        alwaysFixedPayroll: Boolean(row.alwaysFixedPayroll),
        isUnpriced: false,
      }));
      break;
    case "Jazz/Kick":
      rows = getDanceRateCardForSubtype("jazz-kick").map((row) => ({
        kind: "flat-package",
        package: row.package,
        customer: row.isUnpriced ? null : (row.customer as number | null),
        compliant: row.isUnpriced ? null : (row.compliant as number | null),
        nonCompliant: row.isUnpriced
          ? null
          : (row.nonCompliant as number | null),
        alwaysFixedPayroll: Boolean(row.alwaysFixedPayroll),
        isUnpriced: Boolean(row.isUnpriced),
      }));
      break;
    case "Marching Band":
      rows = getMarchingBandRateCard().map((row) => ({
        kind: "flat-package",
        package: row.package,
        customer: row.customer as number | null,
        compliant: row.compliant as number | null,
        nonCompliant: row.nonCompliant as number | null,
        alwaysFixedPayroll: Boolean(row.alwaysFixedPayroll),
        isUnpriced: false,
      }));
      break;
    case "Sports Entertainment":
      rows = getSportsEntertainmentRateCard().map((row) => ({
        kind: "flat-package",
        package: row.package,
        customer: row.customer,
        compliant: row.compliant,
        nonCompliant: row.nonCompliant,
        alwaysFixedPayroll: false,
        isUnpriced: Boolean(row.isUnpriced || row.customer === null),
      }));
      break;
    case "School Anthems":
      rows = getSchoolAnthemRateCard().map((row) => ({
        kind: "flat-package",
        package: row.package,
        customer: row.customer as number | null,
        compliant: row.compliant as number | null,
        nonCompliant: row.nonCompliant as number | null,
        alwaysFixedPayroll: true,
        isUnpriced: false,
      }));
      break;
    default:
      rows = [];
  }

  return {
    rows,
    addOns: DEFAULT_CATEGORY_ADDONS[category].map((addon) => ({ ...addon })),
    compliantAffiliateIds: [...DEFAULT_COMPLIANT_AFFILIATE_IDS],
    compliantAffiliateLabels: {},
    nonCompliantAffiliateLabels: {},
  };
}

/** Convert legacy Youth Rec "BRONZE 1:00" package rows → Tier + Time Limit. */
function migrateYouthRecRowsToTierTime(
  rows: PricingReferenceRow[]
): PricingReferenceRow[] {
  if (!rows.length) return rows;
  if (rows.every((row) => row.kind === "tier-time")) return rows;

  return rows.map((row): PricingReferenceRow => {
    if (row.kind === "tier-time") return { ...row };

    const packageLabel = row.package || "";
    const parsed = parsePackage(packageLabel);
    const tier =
      parsed.tier && parsed.tier !== "-" ? parsed.tier : packageLabel || "BRONZE";
    const limit =
      parsed.limit && parsed.limit !== "-"
        ? parsed.limit
        : (packageLabel.match(/\d+:\d+/)?.[0] ?? "");
    return {
      kind: "tier-time",
      tier,
      limit,
      customer: row.customer ?? 0,
      compliant: row.compliant ?? row.customer ?? 0,
      nonCompliant: row.nonCompliant ?? row.customer ?? 0,
      isTitanium: false,
    };
  });
}

/** Normalize Marching Band rows to form labels (Original / Plus, no parentheticals). */
function migrateMarchingBandCombinedPackages(
  rows: PricingReferenceRow[]
): PricingReferenceRow[] {
  if (!rows.length) return rows;

  const renamePackage = (raw: string): string[] => {
    const pkg = raw
      .replace(/\s*\(written\s*&\s*recorded\s*lyrics\)\s*$/i, "")
      .trim()
      .toUpperCase();

    if (pkg === "FIGHT SONG / ALMA MATER PLUS") {
      return ["FIGHT SONG PLUS", "ALMA MATER PLUS"];
    }
    if (pkg === "FIGHT SONG / ALMA MATER") {
      return ["FIGHT SONG ORIGINAL", "ALMA MATER ORIGINAL"];
    }
    if (pkg === "FIGHT SONG" || pkg === "FIGHT SONG ORIGINAL") {
      return ["FIGHT SONG ORIGINAL"];
    }
    if (pkg === "ALMA MATER" || pkg === "ALMA MATER ORIGINAL") {
      return ["ALMA MATER ORIGINAL"];
    }
    if (pkg === "FIGHT SONG PLUS") return ["FIGHT SONG PLUS"];
    if (pkg === "ALMA MATER PLUS") return ["ALMA MATER PLUS"];
    // Collapse "BAND CHANT 3" / typos onto the single rate-card package.
    if (pkg.startsWith("BAND CHANT")) return ["BAND CHANT"];
    if (pkg.startsWith("DRUM CADENCE")) return ["DRUM CADENCE ORIGINAL"];
    return [raw.replace(/\s*\(written\s*&\s*recorded\s*lyrics\)\s*$/i, "").trim()];
  };

  const out: PricingReferenceRow[] = [];
  const byKey = new Map<string, PricingReferenceRow>();

  for (const row of rows) {
    if (row.kind !== "flat-package") {
      out.push(row);
      continue;
    }
    for (const nextName of renamePackage(row.package || "")) {
      const key = nextName.toUpperCase();
      const candidate: FlatPackagePricingRow = {
        ...(row as FlatPackagePricingRow),
        package: nextName,
      };
      const existing = byKey.get(key);
      if (!existing || existing.kind !== "flat-package") {
        byKey.set(key, candidate);
        continue;
      }
      // Prefer a priced row over TBD / null when collapsing duplicates.
      const existingPriced = existing.customer != null && !existing.isUnpriced;
      const candidatePriced =
        candidate.customer != null && !candidate.isUnpriced;
      if (candidatePriced && !existingPriced) {
        byKey.set(key, candidate);
      }
    }
  }
  for (const row of byKey.values()) out.push(row);
  return out;
}

export function getCategoryPricingSnapshot(
  category: CategoryKey,
  store?: PricingReferenceStore
): CategoryPricingSnapshot {
  const saved = store?.categories[category];
  if (!saved) {
    return buildDefaultCategorySnapshot(category);
  }

  const defaults = buildDefaultCategorySnapshot(category);
  const savedSnapshot = saved as CategoryPricingSnapshot & { notes?: string };
  const rawRows = saved.rows?.length
    ? saved.rows.map((row) => ({ ...row }))
    : defaults.rows;
  const rows =
    category === "Youth Rec Cheer"
      ? migrateYouthRecRowsToTierTime(rawRows)
      : category === "Marching Band"
        ? migrateMarchingBandCombinedPackages(rawRows)
        : rawRows;
  return {
    rows,
    addOns: saved.addOns?.length
      ? saved.addOns.map((addon) => ({ ...addon }))
      : defaults.addOns,
    compliantAffiliateIds: normalizeCompliantAffiliateIds(
      saved.compliantAffiliateIds ??
        (savedSnapshot.notes ? DEFAULT_COMPLIANT_AFFILIATE_IDS : undefined)
    ),
    compliantAffiliateLabels: saved.compliantAffiliateLabels
      ? { ...saved.compliantAffiliateLabels }
      : {},
    nonCompliantAffiliateLabels: saved.nonCompliantAffiliateLabels
      ? { ...saved.nonCompliantAffiliateLabels }
      : {},
  };
}

export function loadPricingReferenceStore(): PricingReferenceStore {
  if (typeof window === "undefined") {
    return { categories: {} };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const empty: PricingReferenceStore = { categories: {} };
      syncRuntimeCompliantAffiliateLabels(empty);
      return empty;
    }
    const parsed = JSON.parse(raw) as PricingReferenceStore;
    if (!parsed?.categories) {
      const empty: PricingReferenceStore = { categories: {} };
      syncRuntimeCompliantAffiliateLabels(empty);
      return empty;
    }

    let categories = parsed.categories;
    let changed = false;

    // Persist Tier + Time Limit shape so Youth Rec matches other cheer tables.
    const youth = categories["Youth Rec Cheer"];
    if (
      youth?.rows?.length &&
      youth.rows.some((row) => row.kind !== "tier-time")
    ) {
      categories = {
        ...categories,
        "Youth Rec Cheer": {
          ...youth,
          rows: migrateYouthRecRowsToTierTime(youth.rows),
        },
      };
      changed = true;
    }

    // Persist Fight Song + Alma Mater as separate Marching Band rows.
    const marching = categories["Marching Band"];
    if (marching?.rows?.length) {
      const nextRows = migrateMarchingBandCombinedPackages(marching.rows);
      const didSplit = nextRows.length !== marching.rows.length ||
        nextRows.some((row, i) => {
          const prev = marching.rows[i];
          return (
            row.kind !== prev?.kind ||
            (row.kind === "flat-package" &&
              prev.kind === "flat-package" &&
              row.package !== prev.package)
          );
        });
      if (didSplit) {
        categories = {
          ...categories,
          "Marching Band": { ...marching, rows: nextRows },
        };
        changed = true;
      }
    }

    if (changed) {
      const migrated: PricingReferenceStore = { categories };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      syncRuntimeCompliantAffiliateLabels(migrated);
      return migrated;
    }

    syncRuntimeCompliantAffiliateLabels({ categories });
    return { categories };
  } catch {
    const empty: PricingReferenceStore = { categories: {} };
    syncRuntimeCompliantAffiliateLabels(empty);
    return empty;
  }
}

/**
 * Resolved compliant affiliate labels for a category (Edit Affiliates checked IDs
 * + optional label overrides). Used when matching incoming Magento free text.
 */
export function getCompliantAffiliateLabelsForCategory(
  category: CategoryKey,
  store?: PricingReferenceStore
): string[] {
  const snapshot = getCategoryPricingSnapshot(category, store);
  const labels: string[] = [];
  for (const id of snapshot.compliantAffiliateIds) {
    labels.push(
      resolveCompliantAffiliateLabel(
        id,
        snapshot.compliantAffiliateLabels,
        snapshot.nonCompliantAffiliateLabels
      )
    );
  }
  // Magento short forms that map to the Power / Unleash family.
  if (
    snapshot.compliantAffiliateIds.includes("power-music-covers") ||
    snapshot.compliantAffiliateIds.includes("power-music-unleash-covers")
  ) {
    labels.push("Power Music", "Power Music + Unleash the Beats");
  }
  if (
    snapshot.compliantAffiliateIds.includes("unleash-the-beats-covers") ||
    snapshot.compliantAffiliateIds.includes("power-music-unleash-covers")
  ) {
    labels.push("Unleash the Beats", "Library Music");
  }
  return labels;
}

/** Push current Edit Affiliates selections into pricing-engine compliance checks. */
export function syncRuntimeCompliantAffiliateLabels(
  store: PricingReferenceStore = { categories: {} }
): void {
  const map: Record<string, string[]> = {};
  for (const category of PRICING_CATEGORY_KEYS) {
    map[category] = getCompliantAffiliateLabelsForCategory(category, store);
  }
  setRuntimeCompliantAffiliateLabelsByCategory(map);
}

export function savePricingReferenceStore(store: PricingReferenceStore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  syncRuntimeCompliantAffiliateLabels(store);
  // Assign daily-cost / Orders chips re-read reference prices on this event.
  window.dispatchEvent(new CustomEvent("slt-pricing-reference-changed"));
}

export function updateCategoryPricingSnapshot(
  store: PricingReferenceStore,
  category: CategoryKey,
  patch: Partial<CategoryPricingSnapshot>
): PricingReferenceStore {
  const current = getCategoryPricingSnapshot(category, store);
  const nextSnapshot = cloneSnapshot({
    ...current,
    ...patch,
    rows: patch.rows ?? current.rows,
    addOns: patch.addOns ?? current.addOns,
    compliantAffiliateIds:
      patch.compliantAffiliateIds ?? current.compliantAffiliateIds,
    compliantAffiliateLabels:
      patch.compliantAffiliateLabels ?? current.compliantAffiliateLabels,
    nonCompliantAffiliateLabels:
      patch.nonCompliantAffiliateLabels ?? current.nonCompliantAffiliateLabels,
  });

  return {
    categories: {
      ...store.categories,
      [category]: nextSnapshot,
    },
  };
}

/** Every Pricing Reference category persists to pricing_rules (DB). */
export const DB_BACKED_PRICING_CATEGORIES = new Set<CategoryKey>([
  "All-Star Cheer",
  "School Cheer",
  "Youth Rec Cheer",
  "Pom",
  "Hip Hop",
  "Team Performance & Variety",
  "Gameday",
  "Jazz/Kick",
  "Marching Band",
  "Sports Entertainment",
  "School Anthems",
]);

export type DbPricingTarget = {
  formType: DbBackedFormType;
  subtypeId?: string | null;
};

export function categoryKeyToFormType(
  category: CategoryKey
): DbBackedFormType | null {
  return categoryKeyToDbPricingTarget(category)?.formType ?? null;
}

export function categoryKeyToDbPricingTarget(
  category: CategoryKey
): DbPricingTarget | null {
  switch (category) {
    case "All-Star Cheer":
      return { formType: "school-all-star-cheer", subtypeId: "all-star-cheer" };
    case "School Cheer":
      return { formType: "school-all-star-cheer", subtypeId: "school-cheer" };
    case "Youth Rec Cheer":
      return { formType: "school-all-star-cheer", subtypeId: "youth-rec-cheer" };
    case "Pom":
      return { formType: "school-all-star-dance", subtypeId: "pom" };
    case "Hip Hop":
      return { formType: "school-all-star-dance", subtypeId: "hip-hop" };
    case "Team Performance & Variety":
      return {
        formType: "school-all-star-dance",
        subtypeId: "team-performance-variety",
      };
    case "Gameday":
      return { formType: "school-all-star-dance", subtypeId: "gameday" };
    case "Jazz/Kick":
      return { formType: "school-all-star-dance", subtypeId: "jazz-kick" };
    case "Marching Band":
      return { formType: "marching-band" };
    case "Sports Entertainment":
      return { formType: "sports-entertainment" };
    case "School Anthems":
      return { formType: "school-anthem" };
    default:
      return null;
  }
}

export function formTypeToCategoryKey(
  formType: string,
  subtypeId?: string | null
): CategoryKey | null {
  if (formType === "marching-band") return "Marching Band";
  if (formType === "sports-entertainment") return "Sports Entertainment";
  if (formType === "school-anthem") return "School Anthems";
  if (formType === "school-all-star-cheer") {
    if (subtypeId === "all-star-cheer") return "All-Star Cheer";
    if (subtypeId === "school-cheer") return "School Cheer";
    if (subtypeId === "youth-rec-cheer") return "Youth Rec Cheer";
  }
  if (formType === "school-all-star-dance") {
    if (subtypeId === "pom") return "Pom";
    if (subtypeId === "hip-hop") return "Hip Hop";
    if (subtypeId === "team-performance-variety") {
      return "Team Performance & Variety";
    }
    if (subtypeId === "gameday") return "Gameday";
    if (subtypeId === "jazz-kick") return "Jazz/Kick";
  }
  return null;
}

/** Skip addon rows stored historically as pricing_rules for marching-band. */
const MARCHING_BAND_ADDON_PACKAGE_IDS = new Set([
  "sheet_music_add",
  "add_vocals",
]);

function isMarchingBandAddonRule(rule: BackendPricingRule): boolean {
  const id = (rule.package_id || "").toLowerCase();
  const name = (rule.package_name || "").toUpperCase();
  if (MARCHING_BAND_ADDON_PACKAGE_IDS.has(id)) return true;
  if (name.includes("SHEET MUSIC") || name === "ADD VOCALS") return true;
  return false;
}

function rulesToFlatRows(
  rules: BackendPricingRule[],
  formType: string,
  subtypeId?: string | null
): FlatPackagePricingRow[] {
  const flatAlways =
    formType === "school-anthem" || formType === "marching-band";
  return rules.map((rule) => {
    const customer = rule.customer_facing_price;
    const isUnpriced =
      customer === null ||
      customer === undefined ||
      (formType === "school-all-star-dance" &&
        subtypeId === "jazz-kick" &&
        /DTU/i.test(rule.package_name || ""));
    const alwaysFixed =
      flatAlways ||
      (formType === "school-all-star-dance" &&
        subtypeId === "jazz-kick" &&
        /SIMPLE CUT/i.test(rule.package_name || ""));
    return {
      kind: "flat-package" as const,
      package: rule.package_name,
      customer: customer ?? null,
      compliant: rule.payroll_base_compliant ?? customer ?? null,
      nonCompliant: rule.payroll_base_non_compliant ?? customer ?? null,
      alwaysFixedPayroll: alwaysFixed,
      isUnpriced,
    };
  });
}

/**
 * Expand legacy combined Marching Band DB names into the UI rate-card packages.
 */
function expandMarchingBandDbRows(
  rows: FlatPackagePricingRow[]
): FlatPackagePricingRow[] {
  const expanded = migrateMarchingBandCombinedPackages(rows).filter(
    (row): row is FlatPackagePricingRow => row.kind === "flat-package"
  );
  // No music-affiliate split — one payroll amount (always), but do not overwrite
  // DB payroll with customer price (that wiped edits after Save).
  return expanded.map((row) => {
    const price = row.customer;
    const payroll = row.compliant ?? row.nonCompliant ?? price;
    return {
      ...row,
      compliant: payroll,
      nonCompliant: row.nonCompliant ?? payroll,
      alwaysFixedPayroll: true,
      isUnpriced: price === null || price === undefined,
    };
  });
}

function rulesToTierTimeRows(
  rules: BackendPricingRule[],
  subtypeId?: string | null
): TierTimePricingRow[] {
  const youthFlat = subtypeId === "youth-rec-cheer";
  return rules.map((rule) => {
    const parsed = parsePackage(rule.package_name || "");
    const tier =
      parsed.tier && parsed.tier !== "-"
        ? parsed.tier
        : (rule.package_name || "").trim();
    const limit =
      parsed.limit && parsed.limit !== "-"
        ? parsed.limit
        : /:\d{2}/.test(rule.package_name || "")
          ? parsed.limit
          : "-";
    const customer = rule.customer_facing_price ?? 0;
    const compliant = youthFlat
      ? customer
      : (rule.payroll_base_compliant ?? customer);
    const nonCompliant = youthFlat
      ? customer
      : (rule.payroll_base_non_compliant ?? customer);
    return {
      kind: "tier-time" as const,
      tier,
      limit,
      customer,
      compliant,
      nonCompliant,
      isTitanium: tier.toUpperCase() === "TITANIUM",
      alwaysFixedPayroll:
        youthFlat ||
        (compliant === nonCompliant && compliant === customer),
    };
  });
}

/**
 * Apply pricing_rules rows onto in-memory rate cards + reference store
 * for every Pricing Reference category.
 */
export function applyDbPricingRules(
  rules: BackendPricingRule[],
  store?: PricingReferenceStore
): PricingReferenceStore {
  const next = store ?? loadPricingReferenceStore();
  const byKey = new Map<string, BackendPricingRule[]>();
  for (const rule of rules) {
    const key = `${rule.form_type}::${rule.subtype_id || ""}`;
    const list = byKey.get(key) || [];
    list.push(rule);
    byKey.set(key, list);
  }

  let updated = next;
  for (const [key, formRules] of byKey) {
    const [formType, subtypeIdRaw] = key.split("::");
    const subtypeId = subtypeIdRaw || null;
    const category = formTypeToCategoryKey(formType, subtypeId);
    if (!category) continue;

    const packageRules =
      formType === "marching-band"
        ? formRules.filter((r) => !isMarchingBandAddonRule(r))
        : formRules;

    let rows: PricingReferenceRow[];

    if (formType === "school-all-star-cheer" && subtypeId) {
      rows = rulesToTierTimeRows(packageRules, subtypeId);
      setCheerRateCardFromDb(
        subtypeId,
        rows
          .filter((r): r is TierTimePricingRow => r.kind === "tier-time")
          .map((r) => ({
            tier: r.tier,
            limit: r.limit,
            customer: Number(r.customer ?? 0),
            compliant: Number(r.compliant ?? r.customer ?? 0),
            nonCompliant: Number(r.nonCompliant ?? r.customer ?? 0),
            isTitanium: Boolean(r.isTitanium),
          }))
      );
    } else {
      let flatRows = rulesToFlatRows(packageRules, formType, subtypeId);
      if (formType === "marching-band") {
        flatRows = expandMarchingBandDbRows(flatRows);
        setMarchingBandRateCardFromDb(
          flatRows.map((r) => ({
            package: r.package,
            customer: Number(r.customer ?? 0),
            compliant: Number(r.compliant ?? r.customer ?? 0),
            nonCompliant: Number(r.nonCompliant ?? r.customer ?? 0),
            alwaysFixedPayroll: true,
          }))
        );
      }
      if (formType === "sports-entertainment") {
        setSportsEntertainmentRateCardFromDb(
          flatRows.map((r) => ({
            package: r.package,
            customer: r.customer,
            compliant: r.compliant,
            nonCompliant: r.nonCompliant,
            isUnpriced: r.isUnpriced,
          }))
        );
      }
      if (formType === "school-anthem") {
        setSchoolAnthemRateCardFromDb(
          flatRows.map((r) => ({
            package: r.package,
            customer: (r.customer ?? 1250) as number,
            compliant: (r.compliant ?? r.customer ?? 1250) as number,
            nonCompliant: (r.nonCompliant ?? r.customer ?? 1250) as number,
          }))
        );
      }
      if (formType === "school-all-star-dance" && subtypeId) {
        setDanceRateCardFromDb(
          subtypeId,
          flatRows.map((r) => ({
            package: r.package,
            customer: Number(r.customer ?? 0),
            compliant: Number(r.compliant ?? r.customer ?? 0),
            nonCompliant: Number(r.nonCompliant ?? r.customer ?? 0),
            alwaysFixedPayroll: Boolean(r.alwaysFixedPayroll),
            isUnpriced: Boolean(r.isUnpriced),
          }))
        );
      }
      rows = flatRows;
    }

    updated = updateCategoryPricingSnapshot(updated, category, { rows });
  }

  savePricingReferenceStore(updated);
  return updated;
}

/** Build PUT payload packages from flat or tier-time snapshot rows. */
export function flatRowsToPricingRulePackages(
  rows: PricingReferenceRow[]
): {
  package_name: string;
  customer_facing_price: number | null;
  payroll_base_compliant: number | null;
  payroll_base_non_compliant: number | null;
}[] {
  const out: {
    package_name: string;
    customer_facing_price: number | null;
    payroll_base_compliant: number | null;
    payroll_base_non_compliant: number | null;
  }[] = [];

  for (const row of rows) {
    if (row.kind === "flat-package") {
      out.push({
        package_name: row.package,
        customer_facing_price: row.isUnpriced ? null : row.customer,
        payroll_base_compliant: row.isUnpriced ? null : row.compliant,
        payroll_base_non_compliant: row.isUnpriced ? null : row.nonCompliant,
      });
      continue;
    }
    if (row.kind === "tier-time") {
      const name =
        !row.limit || row.limit === "-"
          ? row.tier
          : `${row.tier} ${row.limit}`;
      // Flat / always rows: keep customer + payroll columns aligned.
      const flat =
        row.alwaysFixedPayroll ||
        (row.compliant === row.nonCompliant &&
          row.compliant === row.customer);
      const price = flat
        ? Number(row.customer ?? row.compliant ?? 0)
        : null;
      out.push({
        package_name: name,
        customer_facing_price: flat ? price : row.customer,
        payroll_base_compliant: flat ? price : row.compliant,
        payroll_base_non_compliant: flat ? price : row.nonCompliant,
      });
    }
  }
  return out;
}
