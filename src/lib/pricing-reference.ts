import {
  ALL_STAR_CHEER_RATE_CARD,
  GAMEDAY_RATE_CARD,
  HIP_HOP_RATE_CARD,
  JAZZ_KICK_RATE_CARD,
  MARCHING_BAND_RATE_CARD,
  POM_RATE_CARD,
  SCHOOL_ANTHEM_RATE_CARD,
  SCHOOL_CHEER_RATE_CARD,
  SPORTS_ENTERTAINMENT_RATE_CARD,
  TEAM_PERFORMANCE_VARIETY_RATE_CARD,
  YOUTH_REC_CHEER_RATE_CARD,
} from "@/lib/pricing-engine";

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
  { id: "power-music", label: "Power Music" },
  { id: "power-music-unleash", label: "Power Music + Unleash the Beats" },
  { id: "unleash-the-beats", label: "Unleash the Beats" },
  { id: "library-music", label: "Library Music" },
  { id: "power-music-covers", label: "Power Music Covers", danceOnly: true },
  { id: "unleash-the-beats-covers", label: "Unleash the Beats Covers", danceOnly: true },
];

export const NON_COMPLIANT_AFFILIATE_OPTIONS: MusicAffiliateOption[] = [
  { id: "custom-music", label: "Custom Music / Client-Provided Track", alwaysNonCompliant: true },
  { id: "sfc-editors-choice", label: "Songs for Cheer — Editor's Choice", alwaysNonCompliant: true },
  { id: "sfc-casey-can-choose", label: "Songs for Cheer — Casey Can Choose", alwaysNonCompliant: true },
  { id: "sfc-see-notes", label: "Songs for Cheer — See Notes", alwaysNonCompliant: true },
  { id: "original-artist-track", label: "Original Artist Track (iTunes / Spotify)", alwaysNonCompliant: true },
];

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

const STORAGE_KEY = "slt-pricing-reference-v1";

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
  "School Cheer": [
    { name: "Rally Mix", price: "+$350" },
  ],
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
      rows = YOUTH_REC_CHEER_RATE_CARD.map((row) => ({
        kind: "flat-package",
        package: `${row.tier} ${row.limit}`,
        customer: row.customer as number | null,
        compliant: row.compliant as number | null,
        nonCompliant: row.nonCompliant as number | null,
        alwaysFixedPayroll: false,
        isUnpriced: false,
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
      rows = JAZZ_KICK_RATE_CARD.map((row) => ({
        kind: "flat-package",
        package: row.package,
        customer: row.customer as number | null,
        compliant: row.compliant as number | null,
        nonCompliant: row.nonCompliant as number | null,
        alwaysFixedPayroll: Boolean(row.alwaysFixedPayroll),
        isUnpriced: false,
      }));
      break;
    case "Marching Band":
      rows = MARCHING_BAND_RATE_CARD.map((row) => ({
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
      rows = SPORTS_ENTERTAINMENT_RATE_CARD.map((row) => ({
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
      rows = SCHOOL_ANTHEM_RATE_CARD.map((row) => ({
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
  return {
    rows: saved.rows?.length ? saved.rows.map((row) => ({ ...row })) : defaults.rows,
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
  if (typeof window === "undefined") return { categories: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { categories: {} };
    const parsed = JSON.parse(raw) as PricingReferenceStore;
    return parsed?.categories ? parsed : { categories: {} };
  } catch {
    return { categories: {} };
  }
}

export function savePricingReferenceStore(store: PricingReferenceStore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
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
