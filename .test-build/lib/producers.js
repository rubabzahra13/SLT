"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEED_PRODUCER_CATEGORY_RATES = exports.CANONICAL_PRODUCER_NAMES = exports.CANONICAL_PRODUCER_CATEGORIES = void 0;
exports.getCanonicalCategories = getCanonicalCategories;
exports.normalizeProducer = normalizeProducer;
exports.primaryCategory = primaryCategory;
exports.formatMaxMixCapacity = formatMaxMixCapacity;
exports.formatMaxCostCapacity = formatMaxCostCapacity;
exports.formatWorkDays = formatWorkDays;
exports.formatTimeOffRange = formatTimeOffRange;
exports.getProducerCategories = getProducerCategories;
exports.formatCategoryCompensationRate = formatCategoryCompensationRate;
exports.initialsFromName = initialsFromName;
exports.matchesProducerSearch = matchesProducerSearch;
const types_1 = require("@/types");
const producer_avatars_1 = require("@/lib/producer-avatars");
/**
 * Authoritative canonical specializations for all registered producers.
 * Enforced across database, API, state, and UI.
 */
exports.CANONICAL_PRODUCER_CATEGORIES = {
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
    R: ["School Cheer", "All-Star Cheer", "Youth Rec Cheer"],
};
exports.CANONICAL_PRODUCER_NAMES = {
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
function getCanonicalCategories(raw) {
    const initials = raw.initials?.toUpperCase().slice(0, 4);
    if (initials && exports.CANONICAL_PRODUCER_CATEGORIES[initials]) {
        return exports.CANONICAL_PRODUCER_CATEGORIES[initials];
    }
    if (raw.id && exports.CANONICAL_PRODUCER_CATEGORIES[raw.id.toUpperCase()]) {
        return exports.CANONICAL_PRODUCER_CATEGORIES[raw.id.toUpperCase()];
    }
    if (raw.name) {
        const firstName = raw.name.trim().split(/\s+/)[0]?.toLowerCase();
        if (firstName && exports.CANONICAL_PRODUCER_NAMES[firstName]) {
            const canonicalInitials = exports.CANONICAL_PRODUCER_NAMES[firstName];
            return exports.CANONICAL_PRODUCER_CATEGORIES[canonicalInitials];
        }
    }
    return undefined;
}
exports.SEED_PRODUCER_CATEGORY_RATES = {
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
function normalizeProducer(raw) {
    const rawAny = raw;
    const initials = (raw.initials || "XX").toUpperCase().slice(0, 4);
    // Support legacy data that has specialty but not categories
    let categories = Array.isArray(raw.categories) && raw.categories.length > 0
        ? raw.categories
        : typeof rawAny["specialty"] === "string" && rawAny["specialty"]
            ? [rawAny["specialty"]]
            : [];
    const canonical = getCanonicalCategories({
        id: raw.id,
        initials,
        name: raw.name,
    });
    if (canonical) {
        if (categories.length <= 1 ||
            categories.includes("Cheer") ||
            categories.includes("Dance") ||
            !canonical.every((c) => categories.includes(c))) {
            categories = [...canonical];
        }
    }
    const specialty = categories[0] ?? raw.specialty ?? "";
    // Resolve ratesByCategory map per producer categories
    let ratesByCategory = raw.ratesByCategory && Object.keys(raw.ratesByCategory).length > 0
        ? { ...raw.ratesByCategory }
        : null;
    if (!ratesByCategory && exports.SEED_PRODUCER_CATEGORY_RATES[initials]) {
        ratesByCategory = { ...exports.SEED_PRODUCER_CATEGORY_RATES[initials] };
    }
    else if (!ratesByCategory && categories.length > 0) {
        const fallbackRate = raw.defaultRate ?? 0.50;
        const rates = {};
        for (const cat of categories) {
            rates[cat] = fallbackRate;
        }
        ratesByCategory = rates;
    }
    return {
        id: raw.id,
        name: raw.name || "Producer",
        initials: (raw.initials || "XX").toUpperCase().slice(0, 4),
        email: raw.email || "",
        categories,
        specialty,
        avatar: raw.avatar || (0, producer_avatars_1.defaultAvatarSrc)(),
        mixesThisWeek: raw.mixesThisWeek ?? 0,
        nextAvailable: raw.nextAvailable || "TBD",
        status: raw.status || "available",
        workDays: raw.workDays && raw.workDays.length > 0
            ? raw.workDays
            : [...types_1.DEFAULT_WORK_DAYS],
        timeOff: Array.isArray(raw.timeOff) ? raw.timeOff : [],
        maxMixesPerDay: raw.maxMixesPerDay != null && raw.maxMixesPerDay > 0
            ? raw.maxMixesPerDay
            : null,
        maxProducerCostPerDay: raw.maxProducerCostPerDay != null && raw.maxProducerCostPerDay > 0
            ? raw.maxProducerCostPerDay
            : null,
        overtimeDays: Array.isArray(raw.overtimeDays)
            ? [...new Set(raw.overtimeDays.filter(Boolean))].sort()
            : [],
        compensationModel: raw.compensationModel ?? null,
        defaultRate: raw.defaultRate ?? null,
        ratesByCategory,
        rateOverrides: raw.rateOverrides ?? null,
        manualInputFields: raw.manualInputFields ?? null,
        notes: raw.notes ?? null,
    };
}
/** Returns the first category (primary display label) for a producer. */
function primaryCategory(producer) {
    return producer.categories[0] ?? producer.specialty ?? "";
}
function formatMaxMixCapacity(maxMixesPerDay) {
    if (maxMixesPerDay == null)
        return "No daily limit";
    if (maxMixesPerDay === 1)
        return "1 mix per day max";
    return `${maxMixesPerDay} mixes per day max`;
}
function formatMaxCostCapacity(maxProducerCostPerDay) {
    if (maxProducerCostPerDay == null)
        return "No daily cost limit";
    return `$${maxProducerCostPerDay.toLocaleString()} max per day`;
}
function formatWorkDays(days) {
    const order = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const labels = {
        sun: "Sun",
        mon: "Mon",
        tue: "Tue",
        wed: "Wed",
        thu: "Thu",
        fri: "Fri",
        sat: "Sat",
    };
    const sorted = [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    if (sorted.length === 0)
        return "No work days";
    if (sorted.length === 5 &&
        types_1.DEFAULT_WORK_DAYS.every((d) => sorted.includes(d))) {
        return "Mon–Fri";
    }
    return sorted.map((d) => labels[d]).join(", ");
}
function formatTimeOffRange(entry) {
    if (entry.startDate === entry.endDate)
        return entry.startDate;
    return `${entry.startDate} → ${entry.endDate}`;
}
function getProducerCategories(producer) {
    if (producer.categories?.length)
        return producer.categories;
    if (producer.specialty)
        return [producer.specialty];
    return [];
}
function formatCategoryCompensationRate(producer, category) {
    if (producer.compensationModel === "not_paid_for_mixing")
        return "0%";
    if (producer.compensationModel === "hourly_manual")
        return "Hourly";
    const rawRate = producer.ratesByCategory?.[category] ?? producer.defaultRate ?? 0.5;
    return `${rawRate <= 1 ? Math.round(rawRate * 100) : rawRate}%`;
}
function initialsFromName(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0)
        return "";
    if (parts.length === 1)
        return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function matchesProducerSearch(producer, query) {
    const q = query.trim().toLowerCase();
    if (!q)
        return true;
    const fields = [
        producer.name,
        producer.initials,
        producer.email,
        producer.specialty,
        ...producer.categories,
    ];
    return fields.some((field) => field.toLowerCase().includes(q));
}
