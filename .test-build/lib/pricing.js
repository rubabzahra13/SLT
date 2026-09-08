"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PACKAGE_CATALOG = void 0;
exports.getDefaultSecretMenuPricing = getDefaultSecretMenuPricing;
exports.getSecretMenuPerSongRates = getSecretMenuPerSongRates;
exports.applySecretMenuPerSongRates = applySecretMenuPerSongRates;
exports.detectCompliance = detectCompliance;
exports.getPriceForPackage = getPriceForPackage;
exports.complianceLabel = complianceLabel;
exports.getDefaultPackagePrices = getDefaultPackagePrices;
exports.parseIntegerInput = parseIntegerInput;
exports.parsePriceInput = parsePriceInput;
exports.PACKAGE_CATALOG = [
    { key: "BRONZE 1:30 NO SPLIT", name: "Bronze 1:30 No Split", category: "Cheer" },
    { key: "SILVER 1:30 NO SPLIT", name: "Silver 1:30 No Split", category: "Cheer" },
    { key: "GOLD 1:30 NO SPLIT", name: "Gold 1:30 No Split", category: "Cheer" },
    { key: "GOLD 1:30 TBD", name: "Gold 1:30 TBD", category: "Cheer" },
    { key: "GOLD 1:45 NO SPLIT", name: "Gold 1:45 No Split", category: "Cheer" },
    { key: "GOLD 1:45 SPLIT", name: "Gold 1:45 Split", category: "Cheer" },
    { key: "GOLD 2:00 NO SPLIT", name: "Gold 2:00 No Split", category: "Cheer" },
    { key: "GOLD 2:30 NO SPLIT", name: "Gold 2:30 No Split", category: "Cheer" },
    { key: "PLATINUM 1:30 NO SPLIT", name: "Platinum 1:30 No Split", category: "Cheer" },
    { key: "PLATINUM 1:30 TBD", name: "Platinum 1:30 TBD", category: "Cheer" },
    { key: "PLATINUM 1:45 NO SPLIT", name: "Platinum 1:45 No Split", category: "Cheer" },
    { key: "PLATINUM 1:45 SPLIT", name: "Platinum 1:45 Split", category: "Cheer" },
    { key: "PLATINUM 1:45 TBD", name: "Platinum 1:45 TBD", category: "Cheer" },
    { key: "PLATINUM 2:00 NO SPLIT", name: "Platinum 2:00 No Split", category: "Cheer" },
    { key: "PLATINUM 2:30 NO SPLIT", name: "Platinum 2:30 No Split", category: "Cheer" },
    { key: "TITANIUM 2:30 NO SPLIT", name: "Titanium 2:30 No Split", category: "Cheer" },
    { key: "HOMECOMING MIX TBD", name: "Homecoming Mix TBD", category: "School" },
    { key: "BAND CHANT :30", name: "Band Chant :30", category: "Marching Band" },
];
const DEFAULT_PACKAGE_PRICES = {
    "BRONZE 1:30 NO SPLIT": 350,
    "SILVER 1:30 NO SPLIT": 470,
    "GOLD 1:30 NO SPLIT": 600,
    "GOLD 1:30 TBD": 600,
    "GOLD 1:45 NO SPLIT": 750,
    "GOLD 1:45 SPLIT": 800,
    "GOLD 2:00 NO SPLIT": 850,
    "GOLD 2:30 NO SPLIT": 1000,
    "PLATINUM 1:30 NO SPLIT": 850,
    "PLATINUM 1:30 TBD": 850,
    "PLATINUM 1:45 NO SPLIT": 1000,
    "PLATINUM 1:45 SPLIT": 1000,
    "PLATINUM 1:45 TBD": 1000,
    "PLATINUM 2:00 NO SPLIT": 1150,
    "PLATINUM 2:30 NO SPLIT": 1400,
    "TITANIUM 2:30 NO SPLIT": 1400,
    "HOMECOMING MIX TBD": 450,
    "BAND CHANT :30": 200,
};
const NON_COMPLIANT_SURCHARGE = 0.15;
const DEFAULT_SECRET_MENU_PRICING = {
    packageName: "Semi-Custom Plus Package",
    menuTitle: "Semi-Custom Hip Hop & Custom POM Package Secret Menu",
    basePrice: 850,
    extraSongTiers: [
        { extraSongs: 1, extraCost: 15, editingMinutes: 30 },
        { extraSongs: 2, extraCost: 30, editingMinutes: 60 },
        { extraSongs: 3, extraCost: 45, editingMinutes: 90 },
        { extraSongs: 4, extraCost: 60, editingMinutes: 120 },
        { extraSongs: 5, extraCost: 75, editingMinutes: 150 },
        { extraSongs: 6, extraCost: 90, editingMinutes: 180 },
    ],
};
function getDefaultSecretMenuPricing() {
    return {
        ...DEFAULT_SECRET_MENU_PRICING,
        extraSongTiers: DEFAULT_SECRET_MENU_PRICING.extraSongTiers.map((tier) => ({
            ...tier,
        })),
    };
}
function getSecretMenuPerSongRates(pricing) {
    const first = pricing.extraSongTiers.find((tier) => tier.extraSongs === 1) ??
        pricing.extraSongTiers[0];
    if (!first || first.extraSongs <= 0) {
        return { costPerSong: 0, minutesPerSong: 0 };
    }
    return {
        costPerSong: Math.round((first.extraCost / first.extraSongs) * 100) / 100,
        minutesPerSong: Math.round(first.editingMinutes / first.extraSongs),
    };
}
function applySecretMenuPerSongRates(pricing, patch) {
    const current = getSecretMenuPerSongRates(pricing);
    const costPerSong = patch.costPerSong ?? current.costPerSong;
    const minutesPerSong = patch.minutesPerSong ?? current.minutesPerSong;
    const basePrice = patch.basePrice ?? pricing.basePrice;
    const extraSongTiers = pricing.extraSongTiers.length > 0
        ? pricing.extraSongTiers.map((tier) => ({
            extraSongs: tier.extraSongs,
            extraCost: Math.round(costPerSong * tier.extraSongs),
            editingMinutes: Math.round(minutesPerSong * tier.extraSongs),
        }))
        : [{ extraSongs: 1, extraCost: costPerSong, editingMinutes: minutesPerSong }];
    return {
        ...pricing,
        basePrice,
        extraSongTiers,
    };
}
function detectCompliance(musicTheme) {
    const upper = musicTheme.toUpperCase();
    if (upper.includes("NON COMPLIANT") || upper.includes("NON-COMPLIANT")) {
        return "non-compliant";
    }
    return "compliant";
}
function getPriceForPackage(packageName, compliance, fallback = 0, prices = DEFAULT_PACKAGE_PRICES) {
    const key = packageName.toUpperCase().trim();
    let base = prices[key] ?? fallback;
    if (base === 0) {
        for (const [pkg, price] of Object.entries(prices)) {
            if (key.includes(pkg.split(" ")[0]) && key.includes(":")) {
                base = price;
                break;
            }
        }
    }
    if (base === 0)
        base = fallback || 1000;
    if (compliance === "non-compliant") {
        return Math.round(base * (1 + NON_COMPLIANT_SURCHARGE));
    }
    return base;
}
function complianceLabel(compliance) {
    return compliance === "compliant" ? "Compliant" : "Non-compliant";
}
function getDefaultPackagePrices() {
    return { ...DEFAULT_PACKAGE_PRICES };
}
function parseIntegerInput(value) {
    const cleaned = value.replace(/[^0-9]/g, "");
    if (!cleaned)
        return null;
    const num = Number(cleaned);
    return Number.isFinite(num) && num >= 0 ? Math.round(num) : null;
}
function parsePriceInput(value) {
    const cleaned = value.replace(/[^0-9.]/g, "");
    if (!cleaned)
        return null;
    const num = Number(cleaned);
    return Number.isFinite(num) && num >= 0 ? Math.round(num) : null;
}
