"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COMPLIANT_AFFILIATE_IDS = exports.NON_COMPLIANT_AFFILIATE_OPTIONS = exports.COMPLIANT_AFFILIATE_OPTIONS = void 0;
exports.stripAddOnFlatSuffix = stripAddOnFlatSuffix;
exports.isDanceCategory = isDanceCategory;
exports.getVisibleCompliantAffiliateOptions = getVisibleCompliantAffiliateOptions;
exports.getVisibleMusicAffiliateOptions = getVisibleMusicAffiliateOptions;
exports.resolveCompliantAffiliateLabel = resolveCompliantAffiliateLabel;
exports.normalizeCompliantAffiliateLabelOverride = normalizeCompliantAffiliateLabelOverride;
exports.affiliateIdsEqual = affiliateIdsEqual;
exports.buildDefaultCategorySnapshot = buildDefaultCategorySnapshot;
exports.getCategoryPricingSnapshot = getCategoryPricingSnapshot;
exports.loadPricingReferenceStore = loadPricingReferenceStore;
exports.savePricingReferenceStore = savePricingReferenceStore;
exports.updateCategoryPricingSnapshot = updateCategoryPricingSnapshot;
const pricing_engine_1 = require("@/lib/pricing-engine");
function stripAddOnFlatSuffix(price) {
    return price.replace(/\s*\(flat\)\s*$/i, "").trim();
}
exports.COMPLIANT_AFFILIATE_OPTIONS = [
    { id: "power-music", label: "Power Music" },
    { id: "power-music-unleash", label: "Power Music + Unleash the Beats" },
    { id: "unleash-the-beats", label: "Unleash the Beats" },
    { id: "library-music", label: "Library Music" },
    { id: "power-music-covers", label: "Power Music Covers", danceOnly: true },
    { id: "unleash-the-beats-covers", label: "Unleash the Beats Covers", danceOnly: true },
];
exports.NON_COMPLIANT_AFFILIATE_OPTIONS = [
    { id: "custom-music", label: "Custom Music / Client-Provided Track", alwaysNonCompliant: true },
    { id: "sfc-editors-choice", label: "Songs for Cheer — Editor's Choice", alwaysNonCompliant: true },
    { id: "sfc-casey-can-choose", label: "Songs for Cheer — Casey Can Choose", alwaysNonCompliant: true },
    { id: "sfc-see-notes", label: "Songs for Cheer — See Notes", alwaysNonCompliant: true },
    { id: "original-artist-track", label: "Original Artist Track (iTunes / Spotify)", alwaysNonCompliant: true },
];
exports.DEFAULT_COMPLIANT_AFFILIATE_IDS = exports.COMPLIANT_AFFILIATE_OPTIONS.map((option) => option.id);
const DANCE_CATEGORIES = new Set([
    "Pom",
    "Hip Hop",
    "Team Performance & Variety",
    "Gameday",
    "Jazz/Kick",
]);
const STORAGE_KEY = "slt-pricing-reference-v1";
function isDanceCategory(category) {
    return DANCE_CATEGORIES.has(category);
}
function findMusicAffiliateOption(id) {
    return (exports.COMPLIANT_AFFILIATE_OPTIONS.find((entry) => entry.id === id) ??
        exports.NON_COMPLIANT_AFFILIATE_OPTIONS.find((entry) => entry.id === id));
}
function getVisibleCompliantAffiliateOptions(category) {
    return exports.COMPLIANT_AFFILIATE_OPTIONS.filter((option) => !option.danceOnly || isDanceCategory(category));
}
function getVisibleMusicAffiliateOptions(category) {
    const compliant = getVisibleCompliantAffiliateOptions(category);
    return [...compliant, ...exports.NON_COMPLIANT_AFFILIATE_OPTIONS];
}
function resolveCompliantAffiliateLabel(id, labels, nonCompliantLabels) {
    const override = labels?.[id]?.trim() || nonCompliantLabels?.[id]?.trim();
    if (override)
        return override;
    const option = findMusicAffiliateOption(id);
    return option?.label ?? id;
}
function normalizeCompliantAffiliateLabelOverride(id, label) {
    const trimmed = label.trim();
    const defaultLabel = findMusicAffiliateOption(id)?.label ?? "";
    if (!trimmed || trimmed === defaultLabel)
        return undefined;
    return trimmed;
}
function affiliateIdsEqual(left, right) {
    if (left.length !== right.length)
        return false;
    const sortedLeft = [...left].sort();
    const sortedRight = [...right].sort();
    return sortedLeft.every((id, index) => id === sortedRight[index]);
}
function normalizeCompliantAffiliateIds(ids) {
    if (!ids?.length)
        return [...exports.DEFAULT_COMPLIANT_AFFILIATE_IDS];
    const valid = new Set(exports.DEFAULT_COMPLIANT_AFFILIATE_IDS);
    const filtered = ids.filter((id) => valid.has(id));
    return filtered.length > 0 ? filtered : [...exports.DEFAULT_COMPLIANT_AFFILIATE_IDS];
}
const DEFAULT_CATEGORY_ADDONS = {
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
function cloneSnapshot(snapshot) {
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
function buildDefaultCategorySnapshot(category) {
    let rows = [];
    switch (category) {
        case "All-Star Cheer":
            rows = pricing_engine_1.ALL_STAR_CHEER_RATE_CARD.map((row) => ({
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
            rows = pricing_engine_1.SCHOOL_CHEER_RATE_CARD.map((row) => ({
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
            rows = pricing_engine_1.YOUTH_REC_CHEER_RATE_CARD.map((row) => ({
                kind: "flat-package",
                package: `${row.tier} ${row.limit}`,
                customer: row.customer,
                compliant: row.compliant,
                nonCompliant: row.nonCompliant,
                alwaysFixedPayroll: false,
                isUnpriced: false,
            }));
            break;
        case "Pom":
            rows = pricing_engine_1.POM_RATE_CARD.map((row) => ({
                kind: "flat-package",
                package: row.package,
                customer: row.customer,
                compliant: row.compliant,
                nonCompliant: row.nonCompliant,
                alwaysFixedPayroll: Boolean(row.alwaysFixedPayroll),
                isUnpriced: false,
            }));
            break;
        case "Hip Hop":
            rows = pricing_engine_1.HIP_HOP_RATE_CARD.map((row) => ({
                kind: "flat-package",
                package: row.package,
                customer: row.customer,
                compliant: row.compliant,
                nonCompliant: row.nonCompliant,
                alwaysFixedPayroll: Boolean(row.alwaysFixedPayroll),
                isUnpriced: false,
            }));
            break;
        case "Team Performance & Variety":
            rows = pricing_engine_1.TEAM_PERFORMANCE_VARIETY_RATE_CARD.map((row) => ({
                kind: "flat-package",
                package: row.package,
                customer: row.customer,
                compliant: row.compliant,
                nonCompliant: row.nonCompliant,
                alwaysFixedPayroll: Boolean(row.alwaysFixedPayroll),
                isUnpriced: false,
            }));
            break;
        case "Gameday":
            rows = pricing_engine_1.GAMEDAY_RATE_CARD.map((row) => ({
                kind: "flat-package",
                package: row.package,
                customer: row.customer,
                compliant: row.compliant,
                nonCompliant: row.nonCompliant,
                alwaysFixedPayroll: Boolean(row.alwaysFixedPayroll),
                isUnpriced: false,
            }));
            break;
        case "Jazz/Kick":
            rows = pricing_engine_1.JAZZ_KICK_RATE_CARD.map((row) => ({
                kind: "flat-package",
                package: row.package,
                customer: row.customer,
                compliant: row.compliant,
                nonCompliant: row.nonCompliant,
                alwaysFixedPayroll: Boolean(row.alwaysFixedPayroll),
                isUnpriced: false,
            }));
            break;
        case "Marching Band":
            rows = pricing_engine_1.MARCHING_BAND_RATE_CARD.map((row) => ({
                kind: "flat-package",
                package: row.package,
                customer: row.customer,
                compliant: row.compliant,
                nonCompliant: row.nonCompliant,
                alwaysFixedPayroll: Boolean(row.alwaysFixedPayroll),
                isUnpriced: false,
            }));
            break;
        case "Sports Entertainment":
            rows = pricing_engine_1.SPORTS_ENTERTAINMENT_RATE_CARD.map((row) => ({
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
            rows = pricing_engine_1.SCHOOL_ANTHEM_RATE_CARD.map((row) => ({
                kind: "flat-package",
                package: row.package,
                customer: row.customer,
                compliant: row.compliant,
                nonCompliant: row.nonCompliant,
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
        compliantAffiliateIds: [...exports.DEFAULT_COMPLIANT_AFFILIATE_IDS],
        compliantAffiliateLabels: {},
        nonCompliantAffiliateLabels: {},
    };
}
function getCategoryPricingSnapshot(category, store) {
    const saved = store?.categories[category];
    if (!saved) {
        return buildDefaultCategorySnapshot(category);
    }
    const defaults = buildDefaultCategorySnapshot(category);
    const savedSnapshot = saved;
    return {
        rows: saved.rows?.length ? saved.rows.map((row) => ({ ...row })) : defaults.rows,
        addOns: saved.addOns?.length
            ? saved.addOns.map((addon) => ({ ...addon }))
            : defaults.addOns,
        compliantAffiliateIds: normalizeCompliantAffiliateIds(saved.compliantAffiliateIds ??
            (savedSnapshot.notes ? exports.DEFAULT_COMPLIANT_AFFILIATE_IDS : undefined)),
        compliantAffiliateLabels: saved.compliantAffiliateLabels
            ? { ...saved.compliantAffiliateLabels }
            : {},
        nonCompliantAffiliateLabels: saved.nonCompliantAffiliateLabels
            ? { ...saved.nonCompliantAffiliateLabels }
            : {},
    };
}
function loadPricingReferenceStore() {
    if (typeof window === "undefined")
        return { categories: {} };
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return { categories: {} };
        const parsed = JSON.parse(raw);
        return parsed?.categories ? parsed : { categories: {} };
    }
    catch {
        return { categories: {} };
    }
}
function savePricingReferenceStore(store) {
    if (typeof window === "undefined")
        return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}
function updateCategoryPricingSnapshot(store, category, patch) {
    const current = getCategoryPricingSnapshot(category, store);
    const nextSnapshot = cloneSnapshot({
        ...current,
        ...patch,
        rows: patch.rows ?? current.rows,
        addOns: patch.addOns ?? current.addOns,
        compliantAffiliateIds: patch.compliantAffiliateIds ?? current.compliantAffiliateIds,
        compliantAffiliateLabels: patch.compliantAffiliateLabels ?? current.compliantAffiliateLabels,
        nonCompliantAffiliateLabels: patch.nonCompliantAffiliateLabels ?? current.nonCompliantAffiliateLabels,
    });
    return {
        categories: {
            ...store.categories,
            [category]: nextSnapshot,
        },
    };
}
