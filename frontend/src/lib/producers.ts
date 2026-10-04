import {
  DEFAULT_WORK_DAYS,
  type Producer,
  type ProducerTimeOff,
  type Weekday,
} from "@/types";
import {
  defaultAvatarSrc,
  isProducerColorHex,
  PRODUCER_COLORS,
  resolveProducerColor,
} from "@/lib/producer-avatars";

/**
 * Authoritative canonical specializations for all registered producers.
 * Enforced across database, API, state, and UI.
 */
export const CANONICAL_PRODUCER_CATEGORIES: Record<string, string[]> = {
  CM: ["Pom", "School Cheer", "All-Star Cheer", "Youth Rec Cheer"],
  MS: ["School Cheer", "All-Star Cheer", "Youth Rec Cheer"],
  NC: ["School Cheer", "Youth Rec Cheer"],
  MM: ["Pom", "Team Performance / Variety", "School Cheer", "All-Star Cheer", "Youth Rec Cheer"],
  BV: ["Marching Band"],
  SS: ["Pom", "Team Performance / Variety", "Jazz / Kick", "Gameday", "Sports Entertainment", "Youth Rec Cheer"],
  AJ: ["Pom", "Jazz / Kick", "Team Performance / Variety", "Gameday"],
  LV: ["Pom", "Jazz / Kick", "Team Performance / Variety", "Gameday"],
  RF: ["Pom", "Jazz / Kick", "Team Performance / Variety", "Gameday", "Hip Hop"],
  JM: ["Pom", "Gameday"],
  JOP: ["Pom", "Gameday", "School Cheer", "Youth Rec Cheer"],
  GP: ["Pom", "Gameday"],
  G: ["Pom", "Gameday"],
  JD: ["Pom", "Gameday", "School Cheer", "Youth Rec Cheer"],
  JP: ["Pom", "Gameday", "Jazz / Kick", "Team Performance / Variety"],
  MT: ["Hip Hop", "Gameday", "Sports Entertainment"],
  CC: ["Hip Hop", "Gameday", "Sports Entertainment"],
  JB: ["Hip Hop", "Gameday", "Sports Entertainment"],
  SV: ["Pom", "Gameday"],
  R: ["School Cheer", "All-Star Cheer", "Youth Rec Cheer"],
};

export const CANONICAL_PRODUCER_EMAILS: Record<string, string> = {
  CM: "casey@soundslikethat.com",
  MS: "matt@soundslikethat.com",
  NC: "nate@soundslikethat.com",
  BV: "bvincent@powermusic.com",
  MM: "mark@soundslikethat.com",
  SS: "steve@soundslikethat.com",
  AJ: "anne@soundslikethat.com",
  LV: "lauren@soundslikethat.com",
  RF: "rory@soundslikethat.com",
  JOP: "joel@soundslikethat.com",
  JD: "justin@soundslikethat.com",
  JP: "jp@soundslikethat.com",
  MT: "max@soundslikethat.com",
  CC: "chris@soundslikethat.com",
  JB: "Joe@soundslikethat.com",
  SV: "ds_in_ovations@mac.com",
  JM: "josh@soundslikethat.com",
  GP: "griffinp@powermusic.com",
  R: "riley@soundslikethat.com",
};

export const CANONICAL_PRODUCER_NAMES: Record<string, string> = {
  casey: "CM",
  matt: "MS",
  nate: "NC",
  mark: "MM",
  brent: "BV",
  shelley: "SS",
  autumn: "AJ",
  logan: "LV",
  rory: "RF",
  jackie: "JM",
  joseph: "JOP",
  griffin: "GP",
  justin: "JD",
  jacob: "JP",
  max: "MT",
  cory: "CC",
  jared: "JB",
  riley: "R",
};

export function getCanonicalCategories(raw: {
  id?: string;
  initials?: string;
  name?: string;
}): string[] | undefined {
  const initials = raw.initials?.toUpperCase().slice(0, 4);
  if (initials && CANONICAL_PRODUCER_CATEGORIES[initials]) {
    return CANONICAL_PRODUCER_CATEGORIES[initials];
  }
  if (raw.id && CANONICAL_PRODUCER_CATEGORIES[raw.id.toUpperCase()]) {
    return CANONICAL_PRODUCER_CATEGORIES[raw.id.toUpperCase()];
  }
  if (raw.name) {
    const firstName = raw.name.trim().split(/\s+/)[0]?.toLowerCase();
    if (firstName && CANONICAL_PRODUCER_NAMES[firstName]) {
      const canonicalInitials = CANONICAL_PRODUCER_NAMES[firstName];
      return CANONICAL_PRODUCER_CATEGORIES[canonicalInitials];
    }
  }
  return undefined;
}

export const SEED_PRODUCER_CATEGORY_RATES: Record<string, Record<string, number>> = {
  CM: { "Pom": 0.70, "School Cheer": 0.70, "All-Star Cheer": 0.70, "Youth Rec Cheer": 0.70 },
  MS: { "School Cheer": 0.60, "All-Star Cheer": 0.60, "Youth Rec Cheer": 0.60 },
  NC: { "School Cheer": 0.60, "Youth Rec Cheer": 0.60 },
  MM: { "Jazz / Kick": 0.72, "Pom": 0.72, "Team Performance / Variety": 0.72, "School Cheer": 0.60, "All-Star Cheer": 0.60, "Youth Rec Cheer": 0.60 },
  BV: { "Marching Band": 0.50 },
  SS: { "Pom": 0, "Team Performance / Variety": 0, "Jazz / Kick": 0, "Gameday": 0, "Sports Entertainment": 0, "Youth Rec Cheer": 0 },
  AJ: { "Pom": 0.72, "Jazz / Kick": 0.72, "Team Performance / Variety": 0.72, "Gameday": 0.72 },
  LV: { "Pom": 0.72, "Jazz / Kick": 0.72, "Team Performance / Variety": 0.72, "Gameday": 0.72 },
  RF: { "Pom": 0.72, "Jazz / Kick": 0.72, "Team Performance / Variety": 0.72, "Gameday": 0.72, "Hip Hop": 0.72 },
  JM: {},
  JOP: { "Pom": 0.50, "Gameday": 0.50, "School Cheer": 0.50, "Youth Rec Cheer": 0.50 },
  GP: {},
  G: { "Pom": 0.50, "Gameday": 0.50 },
  JD: { "Pom": 0.50, "Gameday": 0.50, "School Cheer": 0.50, "Youth Rec Cheer": 0.50 },
  JP: { "Pom": 0.72, "Gameday": 0.72, "Jazz / Kick": 0.72, "Team Performance / Variety": 0.72 },
  MT: { "Hip Hop": 0.72, "Gameday": 0.72, "Sports Entertainment": 0.72 },
  CC: { "Hip Hop": 0.72, "Gameday": 0.72, "Sports Entertainment": 0.72 },
  JB: {},
  R: { "School Cheer": 0.60, "All-Star Cheer": 0.60, "Youth Rec Cheer": 0.60 },
};

const LEGACY_GENERAL_CATEGORY = "general";
const CANONICAL_TEAM_PERF_CATEGORY = "Team Performance / Variety";

function rewriteLegacyGeneralCategory(categories: string[]): string[] {
  const next: string[] = [];
  const seen = new Set<string>();
  for (const raw of categories) {
    const value =
      raw.trim().toLowerCase() === LEGACY_GENERAL_CATEGORY
        ? CANONICAL_TEAM_PERF_CATEGORY
        : raw;
    if (seen.has(value)) continue;
    next.push(value);
    seen.add(value);
  }
  return next;
}

/**
 * Canonical producer % rates are stored as fractions (0.5 = 50%).
 * Form UI uses whole percents; coerce percent-style values on read/write.
 */
export function normalizeFractionRate(
  rate: number | null | undefined
): number | null {
  if (rate == null || Number.isNaN(rate)) return null;
  if (rate > 1) return rate / 100;
  return rate;
}

export function normalizeRatesByCategory(
  rates: Record<string, number> | null | undefined
): Record<string, number> | null {
  if (!rates || Object.keys(rates).length === 0) return null;
  const next: Record<string, number> = {};
  for (const [key, value] of Object.entries(rates)) {
    const normalized = normalizeFractionRate(value);
    if (normalized != null) next[key] = normalized;
  }
  return Object.keys(next).length > 0 ? next : null;
}

function rewriteLegacyGeneralRates(
  rates: Record<string, number> | null
): Record<string, number> | null {
  if (!rates) return rates;
  const entries = Object.entries(rates);
  const general = entries.find(
    ([key]) => key.trim().toLowerCase() === LEGACY_GENERAL_CATEGORY
  );
  if (!general) return rates;
  const next: Record<string, number> = {};
  for (const [key, value] of entries) {
    if (key.trim().toLowerCase() === LEGACY_GENERAL_CATEGORY) continue;
    next[key] = value;
  }
  if (next[CANONICAL_TEAM_PERF_CATEGORY] == null) {
    next[CANONICAL_TEAM_PERF_CATEGORY] = general[1];
  }
  return next;
}

export function normalizeProducer(raw: Partial<Producer> & { id: string }): Producer {
  const rawAny = raw as Record<string, unknown>;
  const initials = (raw.initials || "XX").toUpperCase().slice(0, 4);

  const categoriesExplicit = Array.isArray(raw.categories);
  let categories: string[] = categoriesExplicit
    ? [...(raw.categories as string[])]
    : typeof rawAny["specialty"] === "string" && rawAny["specialty"]
      ? [rawAny["specialty"] as string]
      : [];

  categories = rewriteLegacyGeneralCategory(categories);

  const canonical = getCanonicalCategories({
    id: raw.id,
    initials,
    name: raw.name,
  });

  // Seed / migrate only — never force canonical back over an explicit user edit
  // (add/remove category in the producer form must stick across tabs).
  if (canonical) {
    const hasLegacyGenre =
      categories.includes("Cheer") || categories.includes("Dance");
    if (hasLegacyGenre || (!categoriesExplicit && categories.length === 0)) {
      categories = rewriteLegacyGeneralCategory([...canonical]);
    }
  }

  // Resolve ratesByCategory map per producer categories
  let ratesByCategory: Record<string, number> | null =
    raw.ratesByCategory && Object.keys(raw.ratesByCategory).length > 0
      ? { ...raw.ratesByCategory }
      : null;
  ratesByCategory = rewriteLegacyGeneralRates(ratesByCategory);
  ratesByCategory = normalizeRatesByCategory(ratesByCategory);

  const resolvedEmail =
    raw.email && raw.email.trim() && !raw.email.includes("example.com")
      ? raw.email.trim()
      : CANONICAL_PRODUCER_EMAILS[initials] ??
        (raw.email?.trim() || `${initials.toLowerCase()}@soundslikethat.com`);

  return {
    id: raw.id,
    name: raw.name || "Producer",
    initials: (raw.initials || "XX").toUpperCase().slice(0, 4),
    email: resolvedEmail,
    categories,
    avatar: raw.avatar || defaultAvatarSrc(),
    color: resolveProducerColor(
      initials,
      (raw.color as string) ||
        (isProducerColorHex(raw.avatar) ? raw.avatar : null) ||
        PRODUCER_COLORS[initials]
    ),
    mixesThisWeek: raw.mixesThisWeek ?? 0,
    nextAvailable: raw.nextAvailable,
    status: raw.status,
    workDays:
      raw.workDays && raw.workDays.length > 0
        ? raw.workDays
        : [...DEFAULT_WORK_DAYS],
    timeOff: Array.isArray(raw.timeOff)
      ? raw.timeOff.map((entry) => ({
          ...entry,
          endDate: entry.endDate || entry.startDate,
        }))
      : [],
    maxMixesPerDay:
      raw.maxMixesPerDay != null && raw.maxMixesPerDay > 0
        ? raw.maxMixesPerDay
        : null,
    maxProducerCostPerDay:
      raw.maxProducerCostPerDay != null && raw.maxProducerCostPerDay > 0
        ? raw.maxProducerCostPerDay
        : null,
    extraDays: Array.isArray(raw.extraDays)
      ? [...new Set(raw.extraDays.filter(Boolean))].sort()
      : Array.isArray((raw as { overtimeDays?: string[] }).overtimeDays)
        ? [
            ...new Set(
              ((raw as { overtimeDays?: string[] }).overtimeDays || []).filter(
                Boolean
              )
            ),
          ].sort()
        : [],
    compensationModel: raw.compensationModel ?? null,
    defaultRate: normalizeFractionRate(raw.defaultRate),
    ratesByCategory,
    danceVoiceoverRate:
      raw.danceVoiceoverRate !== undefined
        ? normalizeFractionRate(raw.danceVoiceoverRate)
        : initials === "CM"
        ? 0.8
        : null,
    cheerVoiceoverRate:
      raw.cheerVoiceoverRate !== undefined
        ? normalizeFractionRate(raw.cheerVoiceoverRate)
        : initials === "CM"
        ? 1.0
        : initials === "R"
        ? 0.6
        : null,
    rushFeeRate:
      raw.rushFeeRate !== undefined
        ? normalizeFractionRate(raw.rushFeeRate)
        : initials === "CM"
        ? 1.0
        : null,
    rateOverrides: raw.rateOverrides ?? null,
    manualInputFields: raw.manualInputFields ?? null,
    notes: raw.notes ?? null,
    updatedAt: raw.updatedAt ?? null,
  };
}

/** Returns the first category (primary display label) for a producer. */
export function primaryCategory(producer: Producer): string {
  return producer.categories[0] ?? "";
}

/** Compact label for producer category lists in UI. */
export function formatProducerCategories(producer: Producer): string {
  const cats = getProducerCategories(producer);
  if (cats.length === 0) return "No categories";
  if (cats.length === 1) return cats[0];
  if (cats.length === 2) return `${cats[0]} · ${cats[1]}`;
  return `${cats.length} categories`;
}

export function formatMaxMixCapacity(maxMixesPerDay: number | null): string {
  if (maxMixesPerDay == null) return "No daily limit";
  if (maxMixesPerDay === 1) return "1 mix per day max";
  return `${maxMixesPerDay} mixes per day max`;
}

export function formatMaxCostCapacity(maxProducerCostPerDay: number | null): string {
  if (maxProducerCostPerDay == null) return "No daily cost limit";
  return `$${maxProducerCostPerDay.toLocaleString()} max per day`;
}

export function formatWorkDays(days: Weekday[]): string {
  const order: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const labels: Record<Weekday, string> = {
    sun: "Sun",
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
  };
  const sorted = [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  if (sorted.length === 0) return "No work days";
  if (
    sorted.length === 5 &&
    DEFAULT_WORK_DAYS.every((d) => sorted.includes(d))
  ) {
    return "Mon–Fri";
  }
  return sorted.map((d) => labels[d]).join(", ");
}

export function formatTimeOffRange(entry: ProducerTimeOff): string {
  if (entry.startDate === entry.endDate) return entry.startDate;
  return `${entry.startDate} → ${entry.endDate}`;
}

export function getProducerCategories(producer: Producer): string[] {
  return producer.categories?.length ? producer.categories : [];
}

export function formatCompensationPercent(
  rate: number | null | undefined
): string | null {
  if (rate == null || Number.isNaN(rate)) return null;
  const pct = rate <= 1 ? Math.round(rate * 100) : Math.round(rate);
  return `${pct}%`;
}

export function formatCategoryCompensationRate(
  producer: Producer,
  category: string
): string {
  if (producer.compensationModel === "not_paid_for_mixing") return "0%";
  if (producer.compensationModel === "hourly_manual") return "Hourly";

  const rawRate =
    producer.ratesByCategory?.[category] ?? producer.defaultRate ?? 0.5;
  return formatCompensationPercent(rawRate) ?? "0%";
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function matchesProducerSearch(producer: Producer, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const nameParts = producer.name
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (nameParts.length === 0) return false;

  const fullName = nameParts.join(" ");

  return (
    fullName.includes(q) ||
    nameParts.some((part) => part.startsWith(q))
  );
}

export function producerSearchScore(producer: Producer, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const nameParts = producer.name.toLowerCase().split(/\s+/).filter(Boolean);
  const fullName = nameParts.join(" ");
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts[nameParts.length - 1] ?? "";

  if (fullName === q) return 100;
  if (firstName === q || lastName === q) return 90;
  if (firstName.startsWith(q) || lastName.startsWith(q)) return 80;
  if (fullName.startsWith(q)) return 70;
  if (fullName.includes(q)) return 40;

  return 0;
}

export function deduplicateProducers(producers: Producer[]): Producer[] {
  // Prefer newer / non-temp rows when the same person appears twice
  // (optimistic create + SSE/BroadcastChannel echo).
  const ranked = [...producers].sort((a, b) => {
    const aMs = a.updatedAt ? Date.parse(a.updatedAt) : 0;
    const bMs = b.updatedAt ? Date.parse(b.updatedAt) : 0;
    if (aMs !== bMs) return bMs - aMs;
    const aTemp = /^(prod-|temp)/i.test(a.id);
    const bTemp = /^(prod-|temp)/i.test(b.id);
    if (aTemp !== bTemp) return aTemp ? 1 : -1;
    return 0;
  });

  const seenIds = new Set<string>();
  const seenInitials = new Set<string>();
  const out: Producer[] = [];

  for (const p of ranked) {
    const idKeys = [p.uuid, p.id]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    const initialsKey = (p.initials || "").toUpperCase();

    if (idKeys.some((key) => seenIds.has(key))) continue;
    if (initialsKey && seenInitials.has(initialsKey)) continue;

    for (const key of idKeys) seenIds.add(key);
    if (initialsKey) seenInitials.add(initialsKey);
    out.push(p);
  }

  return out;
}

/** Match the same roster person across temp ids / uuid / initials. */
export function producersReferToSamePerson(
  a: Pick<Producer, "id" | "uuid" | "initials">,
  b: Pick<Producer, "id" | "uuid" | "initials">
): boolean {
  if (a.id && (a.id === b.id || a.id === b.uuid)) return true;
  if (a.uuid && (a.uuid === b.id || a.uuid === b.uuid)) return true;
  if (
    a.initials &&
    b.initials &&
    a.initials.toUpperCase() === b.initials.toUpperCase()
  ) {
    return true;
  }
  return false;
}

/** Stable roster order — always match DB / bootstrap (name, then id). */
export function sortProducersByName(producers: Producer[]): Producer[] {
  return [...producers].sort((a, b) => {
    const byName = a.name.localeCompare(b.name, undefined, {
      sensitivity: "base",
    });
    if (byName !== 0) return byName;
    return (a.uuid || a.id).localeCompare(b.uuid || b.id);
  });
}

export function normalizeProducerList(producers: Producer[]): Producer[] {
  return sortProducersByName(deduplicateProducers(producers));
}

/** True when both lists contain the same values (order ignored). */
export function sameStringSet(
  a: readonly string[] | null | undefined,
  b: readonly string[] | null | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  const left = new Set(a);
  for (const value of b) {
    if (!left.has(value)) return false;
  }
  return true;
}

/** Compare leave rows by dates/type/reason (ids may differ after replace-sync). */
export function sameTimeOffList(
  a: Producer["timeOff"] | null | undefined,
  b: Producer["timeOff"] | null | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b) return (a?.length ?? 0) === 0 && (b?.length ?? 0) === 0;
  if (a.length !== b.length) return false;
  const norm = (list: Producer["timeOff"]) =>
    list
      .map(
        (entry) =>
          `${entry.startDate}|${entry.endDate || entry.startDate}|${entry.type}|${(entry.reason || "").trim()}`
      )
      .sort()
      .join(";");
  return norm(a) === norm(b);
}
