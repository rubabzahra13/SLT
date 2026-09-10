import {
  DEFAULT_WORK_DAYS,
  type Producer,
  type ProducerTimeOff,
  type Weekday,
} from "@/types";
import { defaultAvatarSrc, PRODUCER_COLORS, getProducerColor } from "@/lib/producer-avatars";

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

export function normalizeProducer(raw: Partial<Producer> & { id: string }): Producer {
  const rawAny = raw as Record<string, unknown>;
  const initials = (raw.initials || "XX").toUpperCase().slice(0, 4);

  // Support legacy data that has specialty but not categories
  let categories: string[] =
    Array.isArray(raw.categories) && (raw.categories as string[]).length > 0
      ? (raw.categories as string[])
      : typeof rawAny["specialty"] === "string" && rawAny["specialty"]
        ? [rawAny["specialty"] as string]
        : [];

  const canonical = getCanonicalCategories({
    id: raw.id,
    initials,
    name: raw.name,
  });

  if (canonical) {
    if (
      categories.length <= 1 ||
      categories.includes("Cheer") ||
      categories.includes("Dance") ||
      !canonical.every((c) => categories.includes(c))
    ) {
      categories = [...canonical];
    }
  }

  const specialty = categories[0] ?? raw.specialty ?? "";

  // Resolve ratesByCategory map per producer categories
  let ratesByCategory: Record<string, number> | null =
    raw.ratesByCategory && Object.keys(raw.ratesByCategory).length > 0
      ? { ...raw.ratesByCategory }
      : null;

  if (!ratesByCategory && SEED_PRODUCER_CATEGORY_RATES[initials]) {
    ratesByCategory = { ...SEED_PRODUCER_CATEGORY_RATES[initials] };
  } else if (!ratesByCategory && categories.length > 0) {
    const fallbackRate = raw.defaultRate ?? 0.50;
    const rates: Record<string, number> = {};
    for (const cat of categories) {
      rates[cat] = fallbackRate;
    }
    ratesByCategory = rates;
  }

  const resolvedEmail =
    raw.email && raw.email.trim() && !raw.email.includes("example.com")
      ? raw.email.trim()
      : CANONICAL_PRODUCER_EMAILS[initials] ?? raw.email ?? "";

  return {
    id: raw.id,
    name: raw.name || "Producer",
    initials: (raw.initials || "XX").toUpperCase().slice(0, 4),
    email: resolvedEmail,
    categories,
    specialty,
    avatar: raw.avatar || defaultAvatarSrc(),
    color: (raw.color as string) || (PRODUCER_COLORS[initials] ?? getProducerColor(initials)),
    mixesThisWeek: raw.mixesThisWeek ?? 0,
    nextAvailable: raw.nextAvailable || "TBD",
    status: raw.status || "available",
    workDays:
      raw.workDays && raw.workDays.length > 0
        ? raw.workDays
        : [...DEFAULT_WORK_DAYS],
    timeOff: Array.isArray(raw.timeOff) ? raw.timeOff : [],
    maxMixesPerDay:
      raw.maxMixesPerDay != null && raw.maxMixesPerDay > 0
        ? raw.maxMixesPerDay
        : null,
    maxProducerCostPerDay:
      raw.maxProducerCostPerDay != null && raw.maxProducerCostPerDay > 0
        ? raw.maxProducerCostPerDay
        : null,
    overtimeDays: Array.isArray(raw.overtimeDays)
      ? [...new Set(raw.overtimeDays.filter(Boolean))].sort()
      : [],
    compensationModel: raw.compensationModel ?? null,
    defaultRate: raw.defaultRate ?? null,
    ratesByCategory,
    danceVoiceoverRate:
      raw.danceVoiceoverRate !== undefined
        ? raw.danceVoiceoverRate
        : initials === "CM"
        ? 0.80
        : null,
    cheerVoiceoverRate:
      raw.cheerVoiceoverRate !== undefined
        ? raw.cheerVoiceoverRate
        : initials === "CM"
        ? 1.00
        : initials === "R"
        ? 0.60
        : null,
    rushFeeRate:
      raw.rushFeeRate !== undefined
        ? raw.rushFeeRate
        : initials === "CM"
        ? 1.00
        : null,
    rateOverrides: raw.rateOverrides ?? null,
    manualInputFields: raw.manualInputFields ?? null,
    notes: raw.notes ?? null,
  };
}

/** Returns the first category (primary display label) for a producer. */
export function primaryCategory(producer: Producer): string {
  return producer.categories[0] ?? producer.specialty ?? "";
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
  if (producer.categories?.length) return producer.categories;
  if (producer.specialty) return [producer.specialty];
  return [];
}

export function formatCategoryCompensationRate(
  producer: Producer,
  category: string
): string {
  if (producer.compensationModel === "not_paid_for_mixing") return "0%";
  if (producer.compensationModel === "hourly_manual") return "Hourly";

  const rawRate =
    producer.ratesByCategory?.[category] ?? producer.defaultRate ?? 0.5;
  return `${rawRate <= 1 ? Math.round(rawRate * 100) : rawRate}%`;
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

  const fields = [
    producer.name,
    producer.initials,
    producer.email,
    producer.specialty,
    ...producer.categories,
  ];

  return fields.some((field) => field.toLowerCase().includes(q));
}
