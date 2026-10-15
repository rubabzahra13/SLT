import type {
  CheerFormSubtype,
  DanceFormSubtype,
  DiscountCode,
  OrderFormType,
} from "../types";
import { parsePackage } from "./package";

export type ComplianceStatus =
  | "compliant"
  | "non-compliant"
  | "unknown-no-affiliate-field";

export type RateCardEntry = {
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "TITANIUM" | string;
  limit: string; // e.g. "1:00", "1:30", "1:45", "2:00", "2:15", "2:30"
  customer: number;
  compliant: number;
  nonCompliant: number;
  isTitanium: boolean;
};

/** All-Star Cheer Pricing Table (Customer, Compliant, Non-Compliant) */
export const ALL_STAR_CHEER_RATE_CARD: RateCardEntry[] = [
  { tier: "GOLD", limit: "1:30", customer: 700, compliant: 600, nonCompliant: 700, isTitanium: false },
  { tier: "GOLD", limit: "2:00", customer: 950, compliant: 850, nonCompliant: 950, isTitanium: false },
  { tier: "GOLD", limit: "2:30", customer: 1100, compliant: 1000, nonCompliant: 1100, isTitanium: false },
  { tier: "PLATINUM", limit: "1:30", customer: 1050, compliant: 850, nonCompliant: 1050, isTitanium: false },
  { tier: "PLATINUM", limit: "2:00", customer: 1350, compliant: 1150, nonCompliant: 1350, isTitanium: false },
  { tier: "PLATINUM", limit: "2:30", customer: 1600, compliant: 1400, nonCompliant: 1600, isTitanium: false },
  { tier: "TITANIUM", limit: "1:30", customer: 1800, compliant: 1800, nonCompliant: 1800, isTitanium: true },
  { tier: "TITANIUM", limit: "2:00", customer: 2300, compliant: 2300, nonCompliant: 2300, isTitanium: true },
  { tier: "TITANIUM", limit: "2:30", customer: 2800, compliant: 2800, nonCompliant: 2800, isTitanium: true },
];

/** School Cheer Pricing Table (identical for VIROC Yes and VIROC No) */
export const SCHOOL_CHEER_RATE_CARD: RateCardEntry[] = [
  { tier: "SILVER", limit: "1:00", customer: 450, compliant: 350, nonCompliant: 450, isTitanium: false },
  { tier: "SILVER", limit: "1:30", customer: 570, compliant: 470, nonCompliant: 570, isTitanium: false },
  { tier: "SILVER", limit: "1:45", customer: 650, compliant: 550, nonCompliant: 650, isTitanium: false },
  { tier: "SILVER", limit: "2:00", customer: 750, compliant: 650, nonCompliant: 750, isTitanium: false },
  { tier: "SILVER", limit: "2:15", customer: 900, compliant: 800, nonCompliant: 900, isTitanium: false },
  { tier: "SILVER", limit: "2:30", customer: 900, compliant: 800, nonCompliant: 900, isTitanium: false },
  { tier: "GOLD", limit: "1:00", customer: 570, compliant: 470, nonCompliant: 570, isTitanium: false },
  { tier: "GOLD", limit: "1:30", customer: 700, compliant: 600, nonCompliant: 700, isTitanium: false },
  { tier: "GOLD", limit: "1:45", customer: 800, compliant: 700, nonCompliant: 800, isTitanium: false },
  { tier: "GOLD", limit: "2:00", customer: 950, compliant: 850, nonCompliant: 950, isTitanium: false },
  { tier: "GOLD", limit: "2:15", customer: 1100, compliant: 1000, nonCompliant: 1100, isTitanium: false },
  { tier: "GOLD", limit: "2:30", customer: 1100, compliant: 1000, nonCompliant: 1100, isTitanium: false },
  { tier: "PLATINUM", limit: "1:00", customer: 800, compliant: 700, nonCompliant: 800, isTitanium: false },
  { tier: "PLATINUM", limit: "1:30", customer: 1050, compliant: 850, nonCompliant: 1050, isTitanium: false },
  { tier: "PLATINUM", limit: "1:45", customer: 1200, compliant: 1000, nonCompliant: 1200, isTitanium: false },
  { tier: "PLATINUM", limit: "2:00", customer: 1350, compliant: 1150, nonCompliant: 1350, isTitanium: false },
  { tier: "PLATINUM", limit: "2:15", customer: 1600, compliant: 1400, nonCompliant: 1600, isTitanium: false },
  { tier: "PLATINUM", limit: "2:30", customer: 1600, compliant: 1400, nonCompliant: 1600, isTitanium: false },
  { tier: "TITANIUM", limit: "1:00", customer: 1500, compliant: 1500, nonCompliant: 1500, isTitanium: true },
  { tier: "TITANIUM", limit: "1:30", customer: 1800, compliant: 1800, nonCompliant: 1800, isTitanium: true },
  { tier: "TITANIUM", limit: "1:45", customer: 2000, compliant: 2000, nonCompliant: 2000, isTitanium: true },
  { tier: "TITANIUM", limit: "2:00", customer: 2300, compliant: 2300, nonCompliant: 2300, isTitanium: true },
  { tier: "TITANIUM", limit: "2:15", customer: 2800, compliant: 2800, nonCompliant: 2800, isTitanium: true },
  { tier: "TITANIUM", limit: "2:30", customer: 2800, compliant: 2800, nonCompliant: 2800, isTitanium: true },
  { tier: "RALLY MIX", limit: "-", customer: 350, compliant: 350, nonCompliant: 350, isTitanium: false },
];

/**
 * Youth Rec Cheer Pricing Table.
 * No music-affiliate field on this form — package price is flat for customer
 * and payroll (compliant === nonCompliant === customer).
 */
export const YOUTH_REC_CHEER_RATE_CARD: RateCardEntry[] = [
  { tier: "BRONZE", limit: "1:00", customer: 450, compliant: 450, nonCompliant: 450, isTitanium: false },
  { tier: "BRONZE", limit: "1:30", customer: 570, compliant: 570, nonCompliant: 570, isTitanium: false },
  { tier: "BRONZE", limit: "1:45", customer: 650, compliant: 650, nonCompliant: 650, isTitanium: false },
  { tier: "BRONZE", limit: "2:00", customer: 750, compliant: 750, nonCompliant: 750, isTitanium: false },
  { tier: "BRONZE", limit: "2:15", customer: 900, compliant: 900, nonCompliant: 900, isTitanium: false },
  { tier: "BRONZE", limit: "2:30", customer: 900, compliant: 900, nonCompliant: 900, isTitanium: false },
];

/** In-memory rate-card overrides hydrated from pricing_rules (DB). */
const cheerRateCardOverrides = new Map<string, RateCardEntry[]>();
const danceRateCardOverrides = new Map<string, DanceRateCardEntry[]>();

export type DanceRateCardEntry = {
  package: string;
  customer: number;
  compliant: number;
  nonCompliant: number;
  alwaysFixedPayroll?: boolean;
  /** Manual-quote / TBD packages (e.g. Non-Compliant for DTU). */
  isUnpriced?: boolean;
};

/** POM Rate Card */
export const POM_RATE_CARD: DanceRateCardEntry[] = [
  { package: "DANCE MIX", customer: 475, compliant: 375, nonCompliant: 475 },
  { package: "DANCE PLUS", customer: 575, compliant: 430, nonCompliant: 575 },
  { package: "CUSTOM POM", customer: 850, compliant: 730, nonCompliant: 850 },
];

/** Hip Hop Rate Card (identical to POM rate card per spec) */
export const HIP_HOP_RATE_CARD: DanceRateCardEntry[] = [
  { package: "DANCE MIX", customer: 475, compliant: 375, nonCompliant: 475 },
  { package: "DANCE PLUS", customer: 575, compliant: 430, nonCompliant: 575 },
  { package: "CUSTOM POM", customer: 850, compliant: 730, nonCompliant: 850 },
];

/** Team Performance & Variety Rate Card */
export const TEAM_PERFORMANCE_VARIETY_RATE_CARD: DanceRateCardEntry[] = [
  { package: "TP MIX", customer: 500, compliant: 400, nonCompliant: 500 },
  { package: "TP PLUS MIX", customer: 600, compliant: 475, nonCompliant: 600 },
];

/** Gameday Rate Card */
export const GAMEDAY_RATE_CARD: DanceRateCardEntry[] = [
  { package: "PERFORMANCE MIX", customer: 100, compliant: 85, nonCompliant: 100 },
  { package: "PERFORMANCE PLUS", customer: 150, compliant: 120, nonCompliant: 150 },
  { package: "PERFORMANCE EXTREME", customer: 200, compliant: 140, nonCompliant: 200 },
];

/** Jazz/Kick Rate Card */
export const JAZZ_KICK_RATE_CARD: DanceRateCardEntry[] = [
  { package: "JAZZ/KICK MIX", customer: 200, compliant: 150, nonCompliant: 200 },
  {
    package: "JAZZ SIMPLE CUT",
    customer: 100,
    compliant: 100,
    nonCompliant: 100,
    alwaysFixedPayroll: true,
  },
  {
    package: "NON-COMPLIANT (FOR DTU)",
    customer: 0,
    compliant: 0,
    nonCompliant: 0,
    isUnpriced: true,
  },
];

let jazzKickRateCardOverride: DanceRateCardEntry[] | null = null;

export function setJazzKickRateCardFromDb(entries: DanceRateCardEntry[]): void {
  jazzKickRateCardOverride = entries.map((e) => ({ ...e }));
}

export const COMPLIANT_MUSIC_AFFILIATES = [
  "POWER MUSIC & UNLEASH THE BEATS COVERS (CAN NOT BE USED FOR A TITANIUM PACKAGE)",
  "POWER MUSIC COVERS",
  "UNLEASH THE BEATS COVERS",
  "POWER MUSIC",
  "POWER MUSIC + UNLEASH THE BEATS",
  "UNLEASH THE BEATS",
  "LIBRARY MUSIC",
  "SONGS FOR CHEER",
  "100% ORIGINAL CUSTOM MUSIC (TITANIUM PACKAGE ONLY)",
] as const;

/**
 * Normalization / Alias table for Music Affiliates.
 * Combined Power+Unleash covers stays its own compliant option.
 */
export const MUSIC_AFFILIATE_ALIASES: Record<string, string> = {
  "POWER MUSIC COVERS": "POWER MUSIC COVERS",
  "UNLEASH THE BEATS COVERS": "UNLEASH THE BEATS COVERS",
  "POWER MUSIC & UNLEASH THE BEATS COVERS (CAN NOT BE USED FOR A TITANIUM PACKAGE)":
    "POWER MUSIC & UNLEASH THE BEATS COVERS (CAN NOT BE USED FOR A TITANIUM PACKAGE)",
  "SONGS FOR CHEER": "SONGS FOR CHEER",
  "100% ORIGINAL CUSTOM MUSIC (TITANIUM PACKAGE ONLY)":
    "100% ORIGINAL CUSTOM MUSIC (TITANIUM PACKAGE ONLY)",
};

/** Ignore case, spacing, and punctuation for free-text affiliate matching. */
export function affiliateCompactKey(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Word tokens for near-match ("almost same words"). */
export function affiliateWordTokens(value: string): string[] {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

/**
 * Similarity in [0, 1] ignoring case / spacing / punctuation.
 * Used for manual Add Order free text vs catalog / Edit Affiliates labels.
 */
export function affiliateTextSimilarity(a: string, b: string): number {
  const left = affiliateCompactKey(a);
  const right = affiliateCompactKey(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) {
    const shorter = Math.min(left.length, right.length);
    const longer = Math.max(left.length, right.length);
    return shorter / longer;
  }
  const maxLen = Math.max(left.length, right.length);
  const compactScore = 1 - levenshteinDistance(left, right) / maxLen;

  // Token path: "power musik covers" ≈ "Power Music Covers"
  const leftTokens = affiliateWordTokens(a);
  const rightTokens = affiliateWordTokens(b);
  if (leftTokens.length && rightTokens.length) {
    const [shorter, longer] =
      leftTokens.length <= rightTokens.length
        ? [leftTokens, rightTokens]
        : [rightTokens, leftTokens];
    let matched = 0;
    const used = new Set<number>();
    for (const token of shorter) {
      let best = -1;
      let bestScore = 0;
      for (let i = 0; i < longer.length; i++) {
        if (used.has(i)) continue;
        const other = longer[i];
        if (token === other) {
          best = i;
          bestScore = 1;
          break;
        }
        const len = Math.max(token.length, other.length);
        if (len === 0) continue;
        const score = 1 - levenshteinDistance(token, other) / len;
        if (score > bestScore) {
          bestScore = score;
          best = i;
        }
      }
      if (best >= 0 && bestScore >= 0.75) {
        used.add(best);
        matched += bestScore;
      }
    }
    const tokenScore = matched / Math.max(longer.length, shorter.length);
    return Math.max(compactScore, tokenScore);
  }
  return compactScore;
}

/** True when free text is the same affiliate ignoring spacing/caps/near typos. */
export function affiliateTextsFuzzyMatch(
  a: string,
  b: string,
  threshold = 0.82
): boolean {
  return affiliateTextSimilarity(a, b) >= threshold;
}

/** Canonical compliant names as compact keys (text-field tolerant). */
const COMPLIANT_AFFILIATE_COMPACT_KEYS = [
  affiliateCompactKey(
    "POWER MUSIC & UNLEASH THE BEATS COVERS (CAN NOT BE USED FOR A TITANIUM PACKAGE)"
  ),
  affiliateCompactKey("POWER MUSIC & UNLEASH THE BEATS COVERS"),
  affiliateCompactKey("POWER MUSIC COVERS"),
  affiliateCompactKey("UNLEASH THE BEATS COVERS"),
  affiliateCompactKey("POWER MUSIC"),
  affiliateCompactKey("POWER MUSIC + UNLEASH THE BEATS"),
  affiliateCompactKey("UNLEASH THE BEATS"),
  affiliateCompactKey("LIBRARY MUSIC"),
  affiliateCompactKey("SONGS FOR CHEER"),
  affiliateCompactKey("100% ORIGINAL CUSTOM MUSIC (TITANIUM PACKAGE ONLY)"),
  affiliateCompactKey("100% ORIGINAL CUSTOM MUSIC"),
] as const;

/**
 * Runtime compliant labels by pricing category (from Edit Affiliates / local store).
 * When empty for a category, falls back to COMPLIANT_AFFILIATE_COMPACT_KEYS.
 */
let runtimeCompliantLabelsByCategory: Record<string, string[]> = {};

/** Push Edit Affiliates selections into the compliance matcher (avoids circular imports). */
export function setRuntimeCompliantAffiliateLabelsByCategory(
  map: Record<string, string[]>
): void {
  runtimeCompliantLabelsByCategory = { ...map };
}

export function getRuntimeCompliantAffiliateLabels(
  categoryKey: string
): string[] {
  return runtimeCompliantLabelsByCategory[categoryKey] || [];
}

/** Map cheer / dance subtype (or form slug) → pricing CategoryKey string. */
export function complianceCategoryKeyForSubtype(
  subType: string | null | undefined
): string {
  const s = String(subType || "").toLowerCase();
  if (s === "all-star-cheer") return "All-Star Cheer";
  if (s === "school-cheer-viroc-yes" || s === "school-cheer-viroc-no") {
    return "School Cheer";
  }
  if (s === "youth-rec-cheer") return "Youth Rec Cheer";
  if (s === "pom") return "Pom";
  if (s === "hip-hop") return "Hip Hop";
  if (s === "team-performance-variety") return "Team Performance & Variety";
  if (s === "gameday") return "Gameday";
  if (s === "jazz-kick") return "Jazz/Kick";
  if (s === "marching-band" || s.includes("band")) return "Marching Band";
  if (s === "sports-entertainment" || s.includes("sports")) {
    return "Sports Entertainment";
  }
  if (s === "school-anthem" || s.includes("anthem")) return "School Anthems";
  return "All-Star Cheer";
}

function compliantCompactKeysForLabels(labels: string[]): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const label of labels) {
    const key = affiliateCompactKey(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  return keys;
}

function matchAffiliateAgainstCompactKeys(
  compact: string,
  keys: readonly string[],
  rawText?: string
): boolean {
  return keys.some((key) => {
    if (compact === key || compact.includes(key) || key.includes(compact)) {
      return true;
    }
    if (compact.length >= 6 && key.startsWith(compact)) return true;
    // Almost-same wording (manual Add Order typos / spacing variants).
    if (rawText && affiliateTextsFuzzyMatch(rawText, key, 0.82)) {
      return true;
    }
    if (affiliateTextsFuzzyMatch(compact, key, 0.88)) {
      return true;
    }
    return false;
  });
}

/**
 * True when free-text affiliate matches a compliant name closely enough
 * (case / spacing / punctuation ignored).
 * Prefers Edit Affiliates labels for `categoryKey` when synced; otherwise defaults.
 * Unknown free text (and unchecked options) are non-compliant.
 */
export function isCompliantMusicAffiliateText(
  musicAffiliate: string,
  categoryKeyOrLabels?: string | string[] | null
): boolean {
  const compact = affiliateCompactKey(musicAffiliate);
  if (!compact) return false;

  let keys: readonly string[] = COMPLIANT_AFFILIATE_COMPACT_KEYS;
  if (Array.isArray(categoryKeyOrLabels)) {
    if (categoryKeyOrLabels.length > 0) {
      keys = compliantCompactKeysForLabels(categoryKeyOrLabels);
    }
  } else if (categoryKeyOrLabels) {
    const runtime = runtimeCompliantLabelsByCategory[categoryKeyOrLabels];
    if (runtime?.length) {
      keys = compliantCompactKeysForLabels(runtime);
    }
  }

  // "Non compliant" is never compliant unless explicitly present in Edit Affiliates.
  if (
    (compact === "NONCOMPLIANT" ||
      affiliateTextsFuzzyMatch(musicAffiliate, "Non compliant", 0.9)) &&
    !keys.some((key) => affiliateCompactKey(key) === "NONCOMPLIANT")
  ) {
    return false;
  }

  return matchAffiliateAgainstCompactKeys(compact, keys, musicAffiliate);
}

/**
 * Normalizes a raw music affiliate string by applying alias lookups
 * before checking compliance status.
 */
export function normalizeMusicAffiliate(musicAffiliate?: string): string | undefined {
  if (musicAffiliate === undefined || musicAffiliate === null) return undefined;
  const trimmed = musicAffiliate.trim();
  if (!trimmed) return undefined;

  const compact = affiliateCompactKey(trimmed);
  if (!compact) return undefined;

  if (compact === "POWERMUSICCOVERS") return "POWER MUSIC COVERS";
  if (compact === "UNLEASHTHEBEATSCOVERS") return "UNLEASH THE BEATS COVERS";
  if (compact === "SONGSFORCHEER") return "SONGS FOR CHEER";
  if (
    compact.startsWith("100ORIGINALCUSTOMMUSIC") ||
    compact.includes("TITANIUMPACKAGEONLY")
  ) {
    return "100% ORIGINAL CUSTOM MUSIC (TITANIUM PACKAGE ONLY)";
  }

  const upper = trimmed.toUpperCase().replace(/\s+/g, " ").trim();
  if (MUSIC_AFFILIATE_ALIASES[upper]) {
    return MUSIC_AFFILIATE_ALIASES[upper];
  }
  return trimmed;
}

function cheerOverrideKey(cheerFormSubtype: CheerFormSubtype): string {
  if (
    cheerFormSubtype === "school-cheer-viroc-yes" ||
    cheerFormSubtype === "school-cheer-viroc-no"
  ) {
    return "school-cheer";
  }
  return cheerFormSubtype;
}

export function getRateCardForSubtype(cheerFormSubtype: CheerFormSubtype): RateCardEntry[] {
  const key = cheerOverrideKey(cheerFormSubtype);
  const override = cheerRateCardOverrides.get(key);
  if (override) return override;

  switch (cheerFormSubtype) {
    case "all-star-cheer":
      return ALL_STAR_CHEER_RATE_CARD;
    case "school-cheer-viroc-yes":
    case "school-cheer-viroc-no":
      return SCHOOL_CHEER_RATE_CARD;
    case "youth-rec-cheer":
      return YOUTH_REC_CHEER_RATE_CARD;
    default:
      return ALL_STAR_CHEER_RATE_CARD;
  }
}

export function setCheerRateCardFromDb(
  subtypeId: string,
  entries: RateCardEntry[]
): void {
  cheerRateCardOverrides.set(
    subtypeId,
    entries.map((e) => ({ ...e }))
  );
}

export function getDanceRateCardForSubtype(
  danceFormSubtype: DanceFormSubtype
): DanceRateCardEntry[] {
  const override = danceRateCardOverrides.get(danceFormSubtype);
  if (override) return override;

  switch (danceFormSubtype) {
    case "pom":
      return POM_RATE_CARD;
    case "hip-hop":
      return HIP_HOP_RATE_CARD;
    case "team-performance-variety":
      return TEAM_PERFORMANCE_VARIETY_RATE_CARD;
    case "gameday":
      return GAMEDAY_RATE_CARD;
    case "jazz-kick":
      return jazzKickRateCardOverride ?? JAZZ_KICK_RATE_CARD;
    default:
      return POM_RATE_CARD;
  }
}

export function setDanceRateCardFromDb(
  subtypeId: string,
  entries: DanceRateCardEntry[]
): void {
  danceRateCardOverrides.set(
    subtypeId,
    entries.map((e) => ({ ...e }))
  );
  if (subtypeId === "jazz-kick") {
    setJazzKickRateCardFromDb(entries);
  }
}

/** Canonical package labels for a form + subcategory (from rate cards). */
export function packagesForOrderForm(
  formType: OrderFormType,
  cheerSubtype?: CheerFormSubtype | null,
  danceSubtype?: DanceFormSubtype | null
): string[] {
  if (formType === "school-all-star-cheer") {
    // Tier only — mix length is a separate field.
    const seen = new Set<string>();
    const tiers: string[] = [];
    for (const row of getRateCardForSubtype(cheerSubtype || "all-star-cheer")) {
      const tier = row.tier?.trim();
      if (!tier) continue;
      const key = tier.toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      tiers.push(tier);
    }
    return tiers;
  }
  if (formType === "school-all-star-dance") {
    return getDanceRateCardForSubtype(danceSubtype || "pom").map(
      (row) => row.package
    );
  }
  if (formType === "marching-band") {
    return getMarchingBandRateCard().map((row) => row.package);
  }
  if (formType === "sports-entertainment") {
    return getSportsEntertainmentRateCard().map((row) => row.package);
  }
  if (formType === "school-anthem") {
    return getSchoolAnthemRateCard().map((row) => row.package);
  }
  return [];
}

/** Mix length options for a form + subcategory (from rate-card time limits). */
export function mixLengthsForOrderForm(
  formType: OrderFormType,
  cheerSubtype?: CheerFormSubtype | null,
  _danceSubtype?: DanceFormSubtype | null
): string[] {
  if (formType === "school-all-star-cheer") {
    const seen = new Set<string>();
    const lengths: string[] = [];
    for (const row of getRateCardForSubtype(cheerSubtype || "all-star-cheer")) {
      const limit = row.limit?.trim();
      if (!limit || limit === "-") continue;
      if (seen.has(limit)) continue;
      seen.add(limit);
      lengths.push(limit);
    }
    // Youth Rec customer form offers "Other" when length isn't listed.
    if (cheerSubtype === "youth-rec-cheer") {
      lengths.push("Other");
    }
    return lengths;
  }
  // Cheer forms are the primary mix-length dropdown; fall back to common lengths.
  return ["1:30", "2:00", "2:30"];
}

export function determineComplianceStatus(
  subType: CheerFormSubtype | DanceFormSubtype | string,
  musicAffiliate?: string
): ComplianceStatus {
  if (musicAffiliate === undefined || musicAffiliate === null) {
    return "unknown-no-affiliate-field";
  }

  const normalized = normalizeMusicAffiliate(musicAffiliate);
  if (!normalized) {
    return "unknown-no-affiliate-field";
  }

  const categoryKey = complianceCategoryKeyForSubtype(subType);
  // Compliant = matches Edit Affiliates checked options for this category
  // (or built-in defaults when the store has not been synced yet).
  return isCompliantMusicAffiliateText(normalized, categoryKey)
    ? "compliant"
    : "non-compliant";
}

export function lookupRateCardEntry(
  cheerFormSubtype: CheerFormSubtype,
  packageType: string,
  timeLengthOfMix?: string
): RateCardEntry | null {
  const rateCard = getRateCardForSubtype(cheerFormSubtype);
  const fullPkg = [packageType, timeLengthOfMix].filter(Boolean).join(" ");
  const parsed = parsePackage(fullPkg);

  let targetTier = parsed.tier.toUpperCase().replace(/\s+PACKAGE$/i, "").trim();
  let targetLimit = parsed.limit.trim();

  if (targetLimit === "-" && timeLengthOfMix?.trim()) {
    targetLimit = timeLengthOfMix.trim();
  }

  // Find exact match first
  let matched = rateCard.find(
    (entry) =>
      entry.tier.toUpperCase() === targetTier && entry.limit === targetLimit
  );

  if (matched) return matched;

  // Fallback: match by tier if limit isn't matched
  matched = rateCard.find((entry) => entry.tier.toUpperCase() === targetTier);
  if (matched) return matched;

  // Fallback 2: substring match on raw packageType
  const upperPkg = fullPkg.toUpperCase();
  matched = rateCard.find(
    (entry) => upperPkg.includes(entry.tier) && upperPkg.includes(entry.limit)
  );

  return matched ?? null;
}

export function lookupDanceRateCardEntry(
  danceFormSubtype: DanceFormSubtype,
  packageType: string
): DanceRateCardEntry | null {
  const rateCard = getDanceRateCardForSubtype(danceFormSubtype);
  const target = packageType.toUpperCase().trim();

  let matched = rateCard.find(
    (entry) => entry.package.toUpperCase() === target
  );
  if (matched) return matched;

  matched = rateCard.find(
    (entry) =>
      target.includes(entry.package.toUpperCase()) ||
      entry.package.toUpperCase().includes(target)
  );

  return matched ?? null;
}

export type MiscellaneousAddOnItem = {
  id: string;
  label: string;
  customerAmount: number;
  payrollAmount: number;
  quantity: number;
  note?: string;
};

export type MiscellaneousAddOnsResult = {
  items: MiscellaneousAddOnItem[];
  totalPayrollAddOns: number;
};

export function calculateMiscellaneousPayrollAddons(
  item: Record<string, any> | null | undefined
): MiscellaneousAddOnsResult {
  if (!item) {
    return { items: [], totalPayrollAddOns: 0 };
  }

  const items: MiscellaneousAddOnItem[] = [];
  let totalPayrollAddOns = 0;

  // 1. Rush Fee (Voiceover is strictly an internal Payroll item, not an MTD add-on)
  const rushQty =
    typeof item.rushFeeQuantity === "number"
      ? item.rushFeeQuantity
      : item.rushFeeOption === "double"
      ? 2
      : item.rushFeeOption === "single" || item.isRushOrder === "yes" || item.isRushOrder === true || String(item?.isRushOrder).toLowerCase() === "yes"
      ? 1
      : 0;

  if (rushQty > 0) {
    const rushCost = rushQty * 150;
    items.push({
      id: "rush_fee",
      label: rushQty === 2 ? "Rush Fee (Double)" : "Rush Fee (Single)",
      customerAmount: rushCost,
      payrollAmount: rushCost,
      quantity: rushQty,
      note: `$150 × ${rushQty} Rush Fee`,
    });
    totalPayrollAddOns += rushCost;
  }

  // 4. Extra Songs & Extra Song Editing Time (strictly available for Dance categories only)
  const isDanceCategory = Boolean(
    item.danceFormSubtype ||
      item.isDance ||
      item.formType === "school-all-star-dance" ||
      String(item.category || "").toLowerCase().includes("dance") ||
      String(item.package || "").toUpperCase().includes("DANCE") ||
      String(item.package || "").toUpperCase().includes("POM") ||
      String(item.package || "").toUpperCase().includes("HIP HOP") ||
      String(item.package || "").toUpperCase().includes("GAMEDAY") ||
      String(item.package || "").toUpperCase().includes("JAZZ") ||
      String(item.package || "").toUpperCase().startsWith("TP ")
  );

  if (isDanceCategory) {
    const extraSongsQty = Math.max(0, parseInt(item.extraSongsQuantity, 10) || 0);
    if (extraSongsQty > 0) {
      const extraSongsCost = extraSongsQty * 15;
      items.push({
        id: "extra_songs",
        label: `Extra Songs (${extraSongsQty})`,
        customerAmount: 0,
        payrollAmount: extraSongsCost,
        quantity: extraSongsQty,
        note: `$15 × ${extraSongsQty} extra song${extraSongsQty > 1 ? "s" : ""}`,
      });
      totalPayrollAddOns += extraSongsCost;
    }

    const extraSongTimeQty = Math.max(0, parseInt(item.extraSongEditingTimeQuantity, 10) || 0);
    if (extraSongTimeQty > 0) {
      const extraSongTimeCost = extraSongTimeQty * 30;
      items.push({
        id: "extra_song_editing_time",
        label: `Extra Song Editing Time (${extraSongTimeQty})`,
        customerAmount: 0,
        payrollAmount: extraSongTimeCost,
        quantity: extraSongTimeQty,
        note: `$30 × ${extraSongTimeQty} editing time unit${extraSongTimeQty > 1 ? "s" : ""}`,
      });
      totalPayrollAddOns += extraSongTimeCost;
    }
  }

  // 6. Existing Cheer / School Addons

  if (Boolean(item.hasExtend8ctAddon)) {
    items.push({
      id: "extend_8ct",
      label: "Extend 2 8cs Phrase / Raps",
      customerAmount: 0,
      payrollAmount: 25,
      quantity: 1,
      note: "Add-on (Youth Rec)",
    });
    totalPayrollAddOns += 25;
  }

  if (Boolean(item.hasProcessing8ctSheetsAddon)) {
    items.push({
      id: "process_8ct",
      label: "Processing 8cs Sheets",
      customerAmount: 0,
      payrollAmount: 50,
      quantity: 1,
      note: "Add-on (Youth Rec)",
    });
    totalPayrollAddOns += 50;
  }

  if (Boolean(item.hasSheetMusicAdd)) {
    items.push({
      id: "sheet_music_add",
      label: "Sheet Music Add",
      customerAmount: 0,
      payrollAmount: 50,
      quantity: 1,
      note: "Add-on (Marching Band)",
    });
    totalPayrollAddOns += 50;
  }

  if (Boolean(item.hasAddVocals)) {
    items.push({
      id: "add_vocals",
      label: "Add Vocals",
      customerAmount: 0,
      payrollAmount: 75,
      quantity: 1,
      note: "Add-on (Marching Band)",
    });
    totalPayrollAddOns += 75;
  }

  return { items, totalPayrollAddOns };
}

export type PricingEngineInput = {
  cheerFormSubtype: CheerFormSubtype;
  packageType: string;
  timeLengthOfMix?: string;
  musicAffiliate?: string;
  hasRallyMix?: boolean;
  hasExtend8ctAddon?: boolean;
  hasProcessing8ctSheetsAddon?: boolean;
  danceVoiceover?: "25" | "75" | "100" | null;
  cheerVoiceover20?: boolean;
  cheerVoiceover40?: boolean;
  rushFeeOption?: "none" | "single" | "double" | string | null;
  isRushOrder?: "yes" | "no" | boolean | string;
  extraSongsQuantity?: number;
  extraSongEditingTimeQuantity?: number;
  couponCode?: string;
  discountCodeObj?: DiscountCode | null;
};

export type PricingEngineResult = {
  customerFacingPrice: number;
  payrollBasePrice: number;
  compliantPayrollBasePrice: number;
  nonCompliantPayrollBasePrice: number;
  complianceStatus: ComplianceStatus;
  isTitanium: boolean;
  matchedEntry: RateCardEntry | null;
  packageName: string;
  timeLengthOfMix: string;
  discountAmount: number;
  discountType?: "fixed" | "percentage";
  discountValue?: number;
  preDiscountPayrollBasePrice: number;
  preDiscountCustomerFacingPrice: number;
};

export function calculateCheerOrderPricing(
  input: PricingEngineInput
): PricingEngineResult {
  const matchedEntry = lookupRateCardEntry(
    input.cheerFormSubtype,
    input.packageType,
    input.timeLengthOfMix
  );

  const complianceStatus = determineComplianceStatus(
    input.cheerFormSubtype,
    input.musicAffiliate
  );

  if (!matchedEntry) {
    return {
      customerFacingPrice: 0,
      payrollBasePrice: 0,
      compliantPayrollBasePrice: 0,
      nonCompliantPayrollBasePrice: 0,
      complianceStatus,
      isTitanium: false,
      matchedEntry: null,
      packageName: input.packageType,
      timeLengthOfMix: input.timeLengthOfMix ?? "",
      discountAmount: 0,
      preDiscountPayrollBasePrice: 0,
      preDiscountCustomerFacingPrice: 0,
    };
  }

  const miscAddons = calculateMiscellaneousPayrollAddons(input);
  const addOnTotal = miscAddons.totalPayrollAddOns;

  const preDiscountCustomerFacingPrice = matchedEntry.customer;
  const compliantPayrollBasePrice = matchedEntry.compliant + addOnTotal;
  const nonCompliantPayrollBasePrice = matchedEntry.nonCompliant + addOnTotal;

  // Youth Rec has no music-affiliate field — always pull the flat package price.
  const youthRecFlat = input.cheerFormSubtype === "youth-rec-cheer";

  let preDiscountPayrollBasePrice = compliantPayrollBasePrice;
  if (youthRecFlat || matchedEntry.isTitanium) {
    // Flat / titanium: payroll follows package price (+ add-ons).
    preDiscountPayrollBasePrice =
      (youthRecFlat ? matchedEntry.customer : matchedEntry.compliant) +
      addOnTotal;
  } else if (complianceStatus === "non-compliant") {
    preDiscountPayrollBasePrice = nonCompliantPayrollBasePrice;
  } else if (
    complianceStatus === "compliant" ||
    complianceStatus === "unknown-no-affiliate-field"
  ) {
    preDiscountPayrollBasePrice = compliantPayrollBasePrice;
  }

  // Calculate discount based on discountCodeObj
  let discountAmount = 0;
  const discObj = input.discountCodeObj;
  if (discObj && discObj.discountType && typeof discObj.discountValue === "number" && discObj.discountValue > 0) {
    if (discObj.discountType === "fixed") {
      discountAmount = Math.min(preDiscountPayrollBasePrice, Math.max(0, discObj.discountValue));
    } else if (discObj.discountType === "percentage") {
      const percentage = Math.max(0, Math.min(100, discObj.discountValue));
      discountAmount = Math.min(preDiscountPayrollBasePrice, Math.round(preDiscountPayrollBasePrice * (percentage / 100)));
    }
  }

  const payrollBasePrice = preDiscountPayrollBasePrice;
  const customerFacingPrice = preDiscountCustomerFacingPrice;

  return {
    customerFacingPrice,
    payrollBasePrice,
    compliantPayrollBasePrice,
    nonCompliantPayrollBasePrice,
    complianceStatus,
    isTitanium: matchedEntry.isTitanium,
    matchedEntry,
    packageName: matchedEntry.tier,
    timeLengthOfMix: matchedEntry.limit,
    discountAmount,
    discountType: discObj?.discountType,
    discountValue: discObj?.discountValue,
    preDiscountPayrollBasePrice,
    preDiscountCustomerFacingPrice,
  };
}

export type DancePricingEngineInput = {
  danceFormSubtype: DanceFormSubtype;
  packageType: string;
  musicAffiliate?: string;
  danceVoiceover?: "25" | "75" | "100" | null;
  hasTraditionalVoiceover?: boolean;
  hasThemedVoiceover?: boolean;
  rushFeeOption?: "none" | "single" | "double" | string | null;
  isRushOrder?: "yes" | "no" | boolean | string;
  extraSongsQuantity?: number;
  extraSongEditingTimeQuantity?: number;
};

export type DancePricingEngineResult = {
  customerFacingPrice: number;
  payrollBasePrice: number;
  compliantPayrollBasePrice: number;
  nonCompliantPayrollBasePrice: number;
  complianceStatus: ComplianceStatus;
  alwaysFixedPayroll: boolean;
  matchedEntry: DanceRateCardEntry | null;
  packageName: string;
};

export function calculateDanceOrderPricing(
  input: DancePricingEngineInput
): DancePricingEngineResult {
  const matchedEntry = lookupDanceRateCardEntry(
    input.danceFormSubtype,
    input.packageType
  );

  const complianceStatus = determineComplianceStatus(
    input.danceFormSubtype,
    input.musicAffiliate
  );

  if (!matchedEntry) {
    return {
      customerFacingPrice: 0,
      payrollBasePrice: 0,
      compliantPayrollBasePrice: 0,
      nonCompliantPayrollBasePrice: 0,
      complianceStatus,
      alwaysFixedPayroll: false,
      matchedEntry: null,
      packageName: input.packageType,
    };
  }

  if (matchedEntry.isUnpriced) {
    return {
      customerFacingPrice: 0,
      payrollBasePrice: 0,
      compliantPayrollBasePrice: 0,
      nonCompliantPayrollBasePrice: 0,
      complianceStatus,
      alwaysFixedPayroll: Boolean(matchedEntry.alwaysFixedPayroll),
      matchedEntry,
      packageName: matchedEntry.package,
    };
  }

  const miscAddons = calculateMiscellaneousPayrollAddons(input);
  const voAddonTotal = miscAddons.totalPayrollAddOns;

  const customerFacingPrice = matchedEntry.customer;
  const compliantPayrollBasePrice = matchedEntry.compliant + voAddonTotal;
  const nonCompliantPayrollBasePrice = matchedEntry.nonCompliant + voAddonTotal;
  const alwaysFixedPayroll = Boolean(matchedEntry.alwaysFixedPayroll);

  let payrollBasePrice = compliantPayrollBasePrice;
  if (alwaysFixedPayroll) {
    // Jazz Simple Cut: payroll-base is always $100 + VO add-ons regardless of compliance input
    payrollBasePrice = matchedEntry.compliant + voAddonTotal;
  } else if (complianceStatus === "non-compliant") {
    payrollBasePrice = nonCompliantPayrollBasePrice;
  } else {
    payrollBasePrice = compliantPayrollBasePrice;
  }

  return {
    customerFacingPrice,
    payrollBasePrice,
    compliantPayrollBasePrice,
    nonCompliantPayrollBasePrice,
    complianceStatus,
    alwaysFixedPayroll,
    matchedEntry,
    packageName: matchedEntry.package,
  };
}

export type MarchingBandRateCardEntry = {
  package: string;
  customer: number;
  compliant: number;
  nonCompliant: number;
  alwaysFixedPayroll?: boolean;
};

/**
 * Marching Band Pricing Table.
 * No customer music-affiliate field on this form — compliant / non-compliant
 * match package price (flat). Overridable from pricing_rules DB.
 */
export const MARCHING_BAND_RATE_CARD: MarchingBandRateCardEntry[] = [
  {
    package: "BAND CHANT",
    customer: 600,
    compliant: 600,
    nonCompliant: 600,
    alwaysFixedPayroll: true,
  },
  {
    package: "DRUM CADENCE ORIGINAL",
    customer: 350,
    compliant: 350,
    nonCompliant: 350,
    alwaysFixedPayroll: true,
  },
  {
    package: "FIGHT SONG ORIGINAL",
    customer: 1100,
    compliant: 1100,
    nonCompliant: 1100,
    alwaysFixedPayroll: true,
  },
  {
    package: "ALMA MATER ORIGINAL",
    customer: 1100,
    compliant: 1100,
    nonCompliant: 1100,
    alwaysFixedPayroll: true,
  },
  {
    package: "FIGHT SONG PLUS",
    customer: 2250,
    compliant: 2250,
    nonCompliant: 2250,
    alwaysFixedPayroll: true,
  },
  {
    package: "ALMA MATER PLUS",
    customer: 2250,
    compliant: 2250,
    nonCompliant: 2250,
    alwaysFixedPayroll: true,
  },
];

let marchingBandRateCardOverride: MarchingBandRateCardEntry[] | null = null;

export function getMarchingBandRateCard(): MarchingBandRateCardEntry[] {
  return marchingBandRateCardOverride ?? MARCHING_BAND_RATE_CARD;
}

export function setMarchingBandRateCardFromDb(
  entries: MarchingBandRateCardEntry[]
): void {
  marchingBandRateCardOverride = entries.map((e) => ({ ...e }));
}

/** Normalize dropdown / legacy labels for exact Marching Band matching. */
function normalizeMarchingBandPackageLabel(packageType: string): string {
  return packageType
    .toUpperCase()
    .replace(/\$[\d,]+(?:\.\d+)?/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Legacy / order-form labels → canonical rate-card package name. */
const MARCHING_BAND_PACKAGE_ALIASES: Record<string, string> = {
  "FIGHT SONG": "FIGHT SONG ORIGINAL",
  "FIGHT SONG / ALMA MATER": "FIGHT SONG ORIGINAL",
  "BOTH FIGHT SONG & ALMA MATER": "FIGHT SONG ORIGINAL",
  "BOTH FIGHT SONG AND ALMA MATER": "FIGHT SONG ORIGINAL",
  "ALMA MATER": "ALMA MATER ORIGINAL",
  "FIGHT SONG / ALMA MATER PLUS": "FIGHT SONG PLUS",
  "FIGHT SONG / ALMA MATER PLUS (WRITTEN & RECORDED LYRICS)": "FIGHT SONG PLUS",
  "FIGHT SONG PLUS (WRITTEN & RECORDED LYRICS)": "FIGHT SONG PLUS",
  "ALMA MATER PLUS (WRITTEN & RECORDED LYRICS)": "ALMA MATER PLUS",
  "DRUM CADENCE": "DRUM CADENCE ORIGINAL",
};

export function lookupMarchingBandRateCardEntry(
  packageType: string
): MarchingBandRateCardEntry | null {
  if (!packageType || !packageType.trim()) return null;

  // Dropdown names are fixed — exact match only (after normalize + aliases).
  // Never substring-match PLUS onto ORIGINAL (cheaper row).
  let target = normalizeMarchingBandPackageLabel(packageType);
  target = MARCHING_BAND_PACKAGE_ALIASES[target] ?? target;

  return (
    getMarchingBandRateCard().find(
      (entry) => entry.package.toUpperCase() === target
    ) ?? null
  );
}

export type MarchingBandPricingEngineInput = {
  packageType?: string;
  musicAffiliate?: string;
  hasSheetMusicAdd?: boolean;
  hasAddVocals?: boolean;
};

export type MarchingBandPricingEngineResult = {
  customerFacingPrice: number;
  payrollBasePrice: number;
  compliantPayrollBasePrice: number;
  nonCompliantPayrollBasePrice: number;
  complianceStatus: ComplianceStatus;
  alwaysFixedPayroll: boolean;
  matchedEntry: MarchingBandRateCardEntry | null;
  packageName: string;
};

export function calculateMarchingBandOrderPricing(
  input: MarchingBandPricingEngineInput
): MarchingBandPricingEngineResult {
  const matchedEntry = lookupMarchingBandRateCardEntry(input?.packageType ?? "");

  const complianceStatus = determineComplianceStatus(
    "marching-band" as any,
    input?.musicAffiliate
  );

  if (!matchedEntry) {
    return {
      customerFacingPrice: 0,
      payrollBasePrice: 0,
      compliantPayrollBasePrice: 0,
      nonCompliantPayrollBasePrice: 0,
      complianceStatus,
      alwaysFixedPayroll: false,
      matchedEntry: null,
      packageName: input?.packageType ?? "",
    };
  }

  const miscAddons = calculateMiscellaneousPayrollAddons(input);
  const addOnTotal = miscAddons.totalPayrollAddOns;

  const customerFacingPrice = matchedEntry.customer;
  const compliantPayrollBasePrice = matchedEntry.compliant + addOnTotal;
  const nonCompliantPayrollBasePrice = matchedEntry.nonCompliant + addOnTotal;
  const alwaysFixedPayroll = Boolean(matchedEntry.alwaysFixedPayroll);

  // No music-affiliate field on the Marching Band customer form — payroll
  // follows the flat package / compliant column (compliant === nonCompliant).
  let payrollBasePrice = compliantPayrollBasePrice;
  if (!alwaysFixedPayroll && complianceStatus === "non-compliant") {
    payrollBasePrice = nonCompliantPayrollBasePrice;
  }

  return {
    customerFacingPrice,
    payrollBasePrice,
    compliantPayrollBasePrice,
    nonCompliantPayrollBasePrice,
    complianceStatus,
    alwaysFixedPayroll,
    matchedEntry,
    packageName: matchedEntry.package,
  };
}

export type SportsEntertainmentRateCardEntry = {
  package: string;
  customer: number | null;
  compliant: number | null;
  nonCompliant: number | null;
  isUnpriced?: boolean;
};

/** Sports Entertainment Pricing Table (defaults; overridable from pricing_rules DB). */
export const SPORTS_ENTERTAINMENT_RATE_CARD: SportsEntertainmentRateCardEntry[] = [
  { package: "QUARTER BREAK / TIMEOUT REMIXED", customer: 150, compliant: 150, nonCompliant: 150 },
  { package: "PRE-GAME / HALFTIME REMIXED", customer: 250, compliant: 250, nonCompliant: 250 },
  {
    package: "OTHER (mixes longer than 2:30)",
    customer: null,
    compliant: null,
    nonCompliant: null,
    isUnpriced: true,
  },
];

let sportsEntertainmentRateCardOverride: SportsEntertainmentRateCardEntry[] | null =
  null;

export function getSportsEntertainmentRateCard(): SportsEntertainmentRateCardEntry[] {
  return sportsEntertainmentRateCardOverride ?? SPORTS_ENTERTAINMENT_RATE_CARD;
}

export function setSportsEntertainmentRateCardFromDb(
  entries: SportsEntertainmentRateCardEntry[]
): void {
  sportsEntertainmentRateCardOverride = entries.map((e) => ({ ...e }));
}

export function lookupSportsEntertainmentRateCardEntry(
  packageType?: string
): SportsEntertainmentRateCardEntry | null {
  if (!packageType || !packageType.trim()) return null;
  const target = packageType.toUpperCase().trim();
  const card = getSportsEntertainmentRateCard();

  // Direct exact match first
  let matched = card.find(
    (entry) => entry.package.toUpperCase() === target
  );
  if (matched) return matched;

  // Substring or prefix match
  const sorted = [...card].sort(
    (a, b) => b.package.length - a.package.length
  );

  matched = sorted.find((entry) => {
    const pkgUpper = entry.package.toUpperCase();
    return (
      target.includes(pkgUpper) ||
      pkgUpper.includes(target) ||
      (entry.isUnpriced && (target.includes("OTHER") || target.includes("2:30")))
    );
  });

  return matched ?? null;
}

export type SportsEntertainmentPricingEngineInput = {
  packageType?: string;
  isRushOrder?: "yes" | "no" | boolean | string;
  rushFeeOption?: "none" | "single" | "double" | string | null;
  extraSongsQuantity?: number;
  extraSongEditingTimeQuantity?: number;
  [key: string]: any;
};

export type SportsEntertainmentPricingEngineResult = {
  customerFacingPrice: number | null;
  payrollBasePrice: number | null;
  compliantPayrollBasePrice: number | null;
  nonCompliantPayrollBasePrice: number | null;
  complianceStatus: ComplianceStatus;
  isUnpriced: boolean;
  needsManualQuote: boolean;
  matchedEntry: SportsEntertainmentRateCardEntry | null;
  packageName: string;
  hasRushFee: boolean;
  rushFeeAmount: number;
};

export function calculateSportsEntertainmentOrderPricing(
  input: SportsEntertainmentPricingEngineInput
): SportsEntertainmentPricingEngineResult {
  const matchedEntry = lookupSportsEntertainmentRateCardEntry(input?.packageType ?? "");

  const miscAddons = calculateMiscellaneousPayrollAddons(input);
  const rushItem = miscAddons.items.find((i) => i.id === "rush_fee");
  const rushFeeAmount = rushItem ? rushItem.payrollAmount : 0;
  const isRush =
    input?.isRushOrder === "yes" ||
    input?.isRushOrder === true ||
    String(input?.isRushOrder).toLowerCase() === "yes" ||
    rushFeeAmount > 0;

  if (!matchedEntry) {
    return {
      customerFacingPrice: 0,
      payrollBasePrice: 0,
      compliantPayrollBasePrice: 0,
      nonCompliantPayrollBasePrice: 0,
      complianceStatus: "unknown-no-affiliate-field",
      isUnpriced: false,
      needsManualQuote: false,
      matchedEntry: null,
      packageName: input?.packageType ?? "",
      hasRushFee: isRush,
      rushFeeAmount,
    };
  }

  if (matchedEntry.isUnpriced || matchedEntry.customer === null) {
    return {
      customerFacingPrice: null,
      payrollBasePrice: null,
      compliantPayrollBasePrice: null,
      nonCompliantPayrollBasePrice: null,
      complianceStatus: "unknown-no-affiliate-field",
      isUnpriced: true,
      needsManualQuote: true,
      matchedEntry,
      packageName: matchedEntry.package,
      hasRushFee: isRush,
      rushFeeAmount,
    };
  }

  const customerFacingPrice = matchedEntry.customer ?? 0;
  const payrollBasePrice = customerFacingPrice + rushFeeAmount;

  return {
    customerFacingPrice,
    payrollBasePrice,
    compliantPayrollBasePrice: payrollBasePrice,
    nonCompliantPayrollBasePrice: payrollBasePrice,
    complianceStatus: "unknown-no-affiliate-field",
    isUnpriced: false,
    needsManualQuote: false,
    matchedEntry,
    packageName: matchedEntry.package,
    hasRushFee: isRush,
    rushFeeAmount,
  };
}

export type SchoolAnthemRateCardEntry = {
  package: string;
  customer: number;
  compliant: number;
  nonCompliant: number;
};

/** School Anthems Pricing Table (defaults; overridable from pricing_rules DB). */
export const SCHOOL_ANTHEM_RATE_CARD: SchoolAnthemRateCardEntry[] = [
  { package: "SCHOOL ANTHEMS", customer: 1250, compliant: 1250, nonCompliant: 1250 },
];

let schoolAnthemRateCardOverride: SchoolAnthemRateCardEntry[] | null = null;

export function getSchoolAnthemRateCard(): SchoolAnthemRateCardEntry[] {
  return schoolAnthemRateCardOverride ?? SCHOOL_ANTHEM_RATE_CARD;
}

export function setSchoolAnthemRateCardFromDb(
  entries: SchoolAnthemRateCardEntry[]
): void {
  schoolAnthemRateCardOverride = entries.map((e) => ({ ...e }));
}

export function lookupSchoolAnthemRateCardEntry(
  _packageType?: string
): SchoolAnthemRateCardEntry {
  const card = getSchoolAnthemRateCard();
  return card[0] ?? SCHOOL_ANTHEM_RATE_CARD[0];
}

export type SchoolAnthemPricingEngineInput = {
  packageType?: string;
  couponCode?: string;
  [key: string]: any;
};

export type SchoolAnthemPricingEngineResult = {
  customerFacingPrice: number;
  payrollBasePrice: number;
  compliantPayrollBasePrice: number;
  nonCompliantPayrollBasePrice: number;
  complianceStatus: ComplianceStatus;
  matchedEntry: SchoolAnthemRateCardEntry;
  packageName: string;
};

export function calculateSchoolAnthemOrderPricing(
  input?: SchoolAnthemPricingEngineInput
): SchoolAnthemPricingEngineResult {
  const matchedEntry = lookupSchoolAnthemRateCardEntry(input?.packageType);
  const miscAddons = calculateMiscellaneousPayrollAddons(input);

  return {
    customerFacingPrice: matchedEntry.customer,
    payrollBasePrice: matchedEntry.compliant + miscAddons.totalPayrollAddOns,
    compliantPayrollBasePrice: matchedEntry.customer + miscAddons.totalPayrollAddOns,
    nonCompliantPayrollBasePrice: matchedEntry.customer + miscAddons.totalPayrollAddOns,
    complianceStatus: "unknown-no-affiliate-field",
    matchedEntry,
    packageName: matchedEntry.package,
  };
}
