"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHOOL_ANTHEM_RATE_CARD = exports.SPORTS_ENTERTAINMENT_RATE_CARD = exports.MARCHING_BAND_RATE_CARD = exports.MUSIC_AFFILIATE_ALIASES = exports.COMPLIANT_MUSIC_AFFILIATES = exports.JAZZ_KICK_RATE_CARD = exports.GAMEDAY_RATE_CARD = exports.TEAM_PERFORMANCE_VARIETY_RATE_CARD = exports.HIP_HOP_RATE_CARD = exports.POM_RATE_CARD = exports.YOUTH_REC_CHEER_RATE_CARD = exports.SCHOOL_CHEER_RATE_CARD = exports.ALL_STAR_CHEER_RATE_CARD = void 0;
exports.normalizeMusicAffiliate = normalizeMusicAffiliate;
exports.getRateCardForSubtype = getRateCardForSubtype;
exports.getDanceRateCardForSubtype = getDanceRateCardForSubtype;
exports.determineComplianceStatus = determineComplianceStatus;
exports.lookupRateCardEntry = lookupRateCardEntry;
exports.lookupDanceRateCardEntry = lookupDanceRateCardEntry;
exports.calculateCheerOrderPricing = calculateCheerOrderPricing;
exports.calculateDanceOrderPricing = calculateDanceOrderPricing;
exports.lookupMarchingBandRateCardEntry = lookupMarchingBandRateCardEntry;
exports.calculateMarchingBandOrderPricing = calculateMarchingBandOrderPricing;
exports.lookupSportsEntertainmentRateCardEntry = lookupSportsEntertainmentRateCardEntry;
exports.calculateSportsEntertainmentOrderPricing = calculateSportsEntertainmentOrderPricing;
exports.lookupSchoolAnthemRateCardEntry = lookupSchoolAnthemRateCardEntry;
exports.calculateSchoolAnthemOrderPricing = calculateSchoolAnthemOrderPricing;
const package_1 = require("./package");
/** All-Star Cheer Pricing Table (Customer, Compliant, Non-Compliant) */
exports.ALL_STAR_CHEER_RATE_CARD = [
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
exports.SCHOOL_CHEER_RATE_CARD = [
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
];
/** Youth Rec Cheer Pricing Table */
exports.YOUTH_REC_CHEER_RATE_CARD = [
    { tier: "BRONZE", limit: "1:00", customer: 450, compliant: 350, nonCompliant: 450, isTitanium: false },
    { tier: "BRONZE", limit: "1:30", customer: 570, compliant: 470, nonCompliant: 570, isTitanium: false },
    { tier: "BRONZE", limit: "1:45", customer: 650, compliant: 550, nonCompliant: 650, isTitanium: false },
    { tier: "BRONZE", limit: "2:00", customer: 750, compliant: 650, nonCompliant: 750, isTitanium: false },
    { tier: "BRONZE", limit: "2:15", customer: 900, compliant: 800, nonCompliant: 900, isTitanium: false },
    { tier: "BRONZE", limit: "2:30", customer: 900, compliant: 800, nonCompliant: 900, isTitanium: false },
];
/** POM Rate Card */
exports.POM_RATE_CARD = [
    { package: "DANCE MIX", customer: 475, compliant: 375, nonCompliant: 475 },
    { package: "DANCE PLUS", customer: 575, compliant: 430, nonCompliant: 575 },
    { package: "CUSTOM POM", customer: 850, compliant: 730, nonCompliant: 850 },
];
/** Hip Hop Rate Card (identical to POM rate card per spec) */
exports.HIP_HOP_RATE_CARD = [
    { package: "DANCE MIX", customer: 475, compliant: 375, nonCompliant: 475 },
    { package: "DANCE PLUS", customer: 575, compliant: 430, nonCompliant: 575 },
    { package: "CUSTOM POM", customer: 850, compliant: 730, nonCompliant: 850 },
];
/** Team Performance & Variety Rate Card */
exports.TEAM_PERFORMANCE_VARIETY_RATE_CARD = [
    { package: "TP MIX", customer: 500, compliant: 400, nonCompliant: 500 },
    { package: "TP PLUS MIX", customer: 600, compliant: 475, nonCompliant: 600 },
];
/** Gameday Rate Card */
exports.GAMEDAY_RATE_CARD = [
    { package: "PERFORMANCE MIX", customer: 100, compliant: 85, nonCompliant: 100 },
    { package: "PERFORMANCE PLUS", customer: 150, compliant: 120, nonCompliant: 150 },
    { package: "PERFORMANCE EXTREME", customer: 200, compliant: 140, nonCompliant: 200 },
];
/** Jazz/Kick Rate Card */
exports.JAZZ_KICK_RATE_CARD = [
    { package: "JAZZ/KICK MIX", customer: 200, compliant: 150, nonCompliant: 200 },
    {
        package: "JAZZ SIMPLE CUT",
        customer: 100,
        compliant: 100,
        nonCompliant: 100,
        alwaysFixedPayroll: true,
    },
];
exports.COMPLIANT_MUSIC_AFFILIATES = [
    "POWER MUSIC",
    "POWER MUSIC + UNLEASH THE BEATS",
    "UNLEASH THE BEATS",
    "LIBRARY MUSIC",
];
/**
 * Normalization / Alias table for Music Affiliates.
 * INFERRED MAPPING pending confirmation from Megan:
 * treating "* Covers" variants as aliases for core compliant music affiliates.
 */
exports.MUSIC_AFFILIATE_ALIASES = {
    "POWER MUSIC COVERS": "POWER MUSIC",
    "UNLEASH THE BEATS COVERS": "UNLEASH THE BEATS",
};
/**
 * Normalizes a raw music affiliate string by applying alias lookups
 * before checking compliance status.
 */
function normalizeMusicAffiliate(musicAffiliate) {
    if (musicAffiliate === undefined || musicAffiliate === null)
        return undefined;
    const trimmed = musicAffiliate.trim();
    if (!trimmed)
        return undefined;
    const upper = trimmed.toUpperCase();
    if (exports.MUSIC_AFFILIATE_ALIASES[upper]) {
        return exports.MUSIC_AFFILIATE_ALIASES[upper];
    }
    return trimmed;
}
function getRateCardForSubtype(cheerFormSubtype) {
    switch (cheerFormSubtype) {
        case "all-star-cheer":
            return exports.ALL_STAR_CHEER_RATE_CARD;
        case "school-cheer-viroc-yes":
        case "school-cheer-viroc-no":
            return exports.SCHOOL_CHEER_RATE_CARD;
        case "youth-rec-cheer":
            return exports.YOUTH_REC_CHEER_RATE_CARD;
        default:
            return exports.ALL_STAR_CHEER_RATE_CARD;
    }
}
function getDanceRateCardForSubtype(danceFormSubtype) {
    switch (danceFormSubtype) {
        case "pom":
            return exports.POM_RATE_CARD;
        case "hip-hop":
            return exports.HIP_HOP_RATE_CARD;
        case "team-performance-variety":
            return exports.TEAM_PERFORMANCE_VARIETY_RATE_CARD;
        case "gameday":
            return exports.GAMEDAY_RATE_CARD;
        case "jazz-kick":
            return exports.JAZZ_KICK_RATE_CARD;
        default:
            return exports.POM_RATE_CARD;
    }
}
function determineComplianceStatus(subType, musicAffiliate) {
    if (musicAffiliate === undefined ||
        musicAffiliate === null) {
        return "unknown-no-affiliate-field";
    }
    const normalized = normalizeMusicAffiliate(musicAffiliate);
    if (!normalized) {
        return "unknown-no-affiliate-field";
    }
    const upper = normalized.toUpperCase();
    const isCompliant = upper.includes("POWER MUSIC") ||
        upper.includes("UNLEASH THE BEATS") ||
        upper.includes("UNLEASH") ||
        upper.includes("LIBRARY MUSIC");
    return isCompliant ? "compliant" : "non-compliant";
}
function lookupRateCardEntry(cheerFormSubtype, packageType, timeLengthOfMix) {
    const rateCard = getRateCardForSubtype(cheerFormSubtype);
    const fullPkg = [packageType, timeLengthOfMix].filter(Boolean).join(" ");
    const parsed = (0, package_1.parsePackage)(fullPkg);
    let targetTier = parsed.tier.toUpperCase().replace(/\s+PACKAGE$/i, "").trim();
    let targetLimit = parsed.limit.trim();
    if (targetLimit === "-" && timeLengthOfMix?.trim()) {
        targetLimit = timeLengthOfMix.trim();
    }
    // Find exact match first
    let matched = rateCard.find((entry) => entry.tier.toUpperCase() === targetTier && entry.limit === targetLimit);
    if (matched)
        return matched;
    // Fallback: match by tier if limit isn't matched
    matched = rateCard.find((entry) => entry.tier.toUpperCase() === targetTier);
    if (matched)
        return matched;
    // Fallback 2: substring match on raw packageType
    const upperPkg = fullPkg.toUpperCase();
    matched = rateCard.find((entry) => upperPkg.includes(entry.tier) && upperPkg.includes(entry.limit));
    return matched ?? null;
}
function lookupDanceRateCardEntry(danceFormSubtype, packageType) {
    const rateCard = getDanceRateCardForSubtype(danceFormSubtype);
    const target = packageType.toUpperCase().trim();
    let matched = rateCard.find((entry) => entry.package.toUpperCase() === target);
    if (matched)
        return matched;
    matched = rateCard.find((entry) => target.includes(entry.package.toUpperCase()) ||
        entry.package.toUpperCase().includes(target));
    return matched ?? null;
}
function calculateCheerOrderPricing(input) {
    const matchedEntry = lookupRateCardEntry(input.cheerFormSubtype, input.packageType, input.timeLengthOfMix);
    const complianceStatus = determineComplianceStatus(input.cheerFormSubtype, input.musicAffiliate);
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
    let addOnTotal = 0;
    if ((input.cheerFormSubtype === "school-cheer-viroc-yes" ||
        input.cheerFormSubtype === "school-cheer-viroc-no") &&
        input.hasRallyMix) {
        addOnTotal += 350;
    }
    if (input.cheerFormSubtype === "youth-rec-cheer") {
        if (input.hasExtend8ctAddon)
            addOnTotal += 25;
        if (input.hasProcessing8ctSheetsAddon)
            addOnTotal += 50;
    }
    const preDiscountCustomerFacingPrice = matchedEntry.customer + addOnTotal;
    const compliantPayrollBasePrice = matchedEntry.compliant + addOnTotal;
    const nonCompliantPayrollBasePrice = matchedEntry.nonCompliant + addOnTotal;
    let preDiscountPayrollBasePrice = compliantPayrollBasePrice;
    if (matchedEntry.isTitanium) {
        preDiscountPayrollBasePrice = compliantPayrollBasePrice;
    }
    else if (complianceStatus === "non-compliant") {
        preDiscountPayrollBasePrice = nonCompliantPayrollBasePrice;
    }
    else if (complianceStatus === "compliant" || complianceStatus === "unknown-no-affiliate-field") {
        preDiscountPayrollBasePrice = compliantPayrollBasePrice;
    }
    // Calculate discount based on discountCodeObj
    let discountAmount = 0;
    const discObj = input.discountCodeObj;
    if (discObj && discObj.discountType && typeof discObj.discountValue === "number" && discObj.discountValue > 0) {
        if (discObj.discountType === "fixed") {
            discountAmount = Math.min(preDiscountPayrollBasePrice, Math.max(0, discObj.discountValue));
        }
        else if (discObj.discountType === "percentage") {
            const percentage = Math.max(0, Math.min(100, discObj.discountValue));
            discountAmount = Math.min(preDiscountPayrollBasePrice, Math.round(preDiscountPayrollBasePrice * (percentage / 100)));
        }
    }
    const payrollBasePrice = Math.max(0, preDiscountPayrollBasePrice - discountAmount);
    const customerFacingPrice = Math.max(0, preDiscountCustomerFacingPrice - discountAmount);
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
function calculateDanceOrderPricing(input) {
    const matchedEntry = lookupDanceRateCardEntry(input.danceFormSubtype, input.packageType);
    const complianceStatus = determineComplianceStatus(input.danceFormSubtype, input.musicAffiliate);
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
    const voAddonTotal = (input.hasTraditionalVoiceover ? 25 : 0) +
        (input.hasThemedVoiceover ? 75 : 0);
    const customerFacingPrice = matchedEntry.customer + voAddonTotal;
    const compliantPayrollBasePrice = matchedEntry.compliant + voAddonTotal;
    const nonCompliantPayrollBasePrice = matchedEntry.nonCompliant + voAddonTotal;
    const alwaysFixedPayroll = Boolean(matchedEntry.alwaysFixedPayroll);
    let payrollBasePrice = compliantPayrollBasePrice;
    if (alwaysFixedPayroll) {
        // Jazz Simple Cut: payroll-base is always $100 + VO add-ons regardless of compliance input
        payrollBasePrice = matchedEntry.compliant + voAddonTotal;
    }
    else if (complianceStatus === "non-compliant") {
        payrollBasePrice = nonCompliantPayrollBasePrice;
    }
    else {
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
/** Marching Band Pricing Table */
exports.MARCHING_BAND_RATE_CARD = [
    { package: "BAND CHANT", customer: 600, compliant: 300, nonCompliant: 600 },
    { package: "DRUM CADENCE ORIGINAL", customer: 350, compliant: 150, nonCompliant: 350 },
    {
        package: "FIGHT SONG / ALMA MATER",
        customer: 1100,
        compliant: 1100,
        nonCompliant: 1100,
        alwaysFixedPayroll: true,
    },
    {
        package: "FIGHT SONG / ALMA MATER PLUS (Written & Recorded Lyrics)",
        customer: 2250,
        compliant: 2250,
        nonCompliant: 2250,
        alwaysFixedPayroll: true,
    },
];
function lookupMarchingBandRateCardEntry(packageType) {
    if (!packageType || !packageType.trim())
        return null;
    const target = packageType.toUpperCase().trim();
    // Direct exact match first
    let matched = exports.MARCHING_BAND_RATE_CARD.find((entry) => entry.package.toUpperCase() === target);
    if (matched)
        return matched;
    // Substring or prefix match - sort by length descending to match more specific variants first
    const sorted = [...exports.MARCHING_BAND_RATE_CARD].sort((a, b) => b.package.length - a.package.length);
    matched = sorted.find((entry) => {
        const pkgUpper = entry.package.toUpperCase();
        const pkgCore = pkgUpper.split("(")[0]?.trim() || pkgUpper;
        return (target.includes(pkgUpper) ||
            pkgUpper.includes(target) ||
            target.includes(pkgCore) ||
            pkgCore.includes(target));
    });
    return matched ?? null;
}
function calculateMarchingBandOrderPricing(input) {
    const matchedEntry = lookupMarchingBandRateCardEntry(input?.packageType ?? "");
    const complianceStatus = determineComplianceStatus("marching-band", input?.musicAffiliate);
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
    const addOnTotal = (input.hasSheetMusicAdd ? 50 : 0) +
        (input.hasAddVocals ? 75 : 0);
    const customerFacingPrice = matchedEntry.customer + addOnTotal;
    const compliantPayrollBasePrice = matchedEntry.compliant + addOnTotal;
    const nonCompliantPayrollBasePrice = matchedEntry.nonCompliant + addOnTotal;
    const alwaysFixedPayroll = Boolean(matchedEntry.alwaysFixedPayroll);
    let payrollBasePrice = compliantPayrollBasePrice;
    if (alwaysFixedPayroll) {
        // Fight Song / Alma Mater (both variants): "pull full amount", compliance-insensitive
        payrollBasePrice = customerFacingPrice;
    }
    else if (complianceStatus === "non-compliant") {
        payrollBasePrice = nonCompliantPayrollBasePrice;
    }
    else if (complianceStatus === "unknown-no-affiliate-field") {
        // Per Conflict #1: no affiliate on file, return unknown-no-affiliate-field status
        // payrollBasePrice defaults to non-compliant / full package amount ($600 / $350 + add-ons)
        payrollBasePrice = nonCompliantPayrollBasePrice;
    }
    else {
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
/** Sports Entertainment Pricing Table */
exports.SPORTS_ENTERTAINMENT_RATE_CARD = [
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
function lookupSportsEntertainmentRateCardEntry(packageType) {
    if (!packageType || !packageType.trim())
        return null;
    const target = packageType.toUpperCase().trim();
    // Direct exact match first
    let matched = exports.SPORTS_ENTERTAINMENT_RATE_CARD.find((entry) => entry.package.toUpperCase() === target);
    if (matched)
        return matched;
    // Substring or prefix match
    const sorted = [...exports.SPORTS_ENTERTAINMENT_RATE_CARD].sort((a, b) => b.package.length - a.package.length);
    matched = sorted.find((entry) => {
        const pkgUpper = entry.package.toUpperCase();
        return (target.includes(pkgUpper) ||
            pkgUpper.includes(target) ||
            (entry.isUnpriced && (target.includes("OTHER") || target.includes("2:30"))));
    });
    return matched ?? null;
}
function calculateSportsEntertainmentOrderPricing(input) {
    const matchedEntry = lookupSportsEntertainmentRateCardEntry(input?.packageType ?? "");
    const isRush = input?.isRushOrder === "yes" ||
        input?.isRushOrder === true ||
        String(input?.isRushOrder).toLowerCase() === "yes";
    const rushFeeAmount = isRush ? 100 : 0;
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
    const customerFacingPrice = matchedEntry.customer + rushFeeAmount;
    const payrollBasePrice = customerFacingPrice;
    return {
        customerFacingPrice,
        payrollBasePrice,
        compliantPayrollBasePrice: customerFacingPrice,
        nonCompliantPayrollBasePrice: customerFacingPrice,
        complianceStatus: "unknown-no-affiliate-field",
        isUnpriced: false,
        needsManualQuote: false,
        matchedEntry,
        packageName: matchedEntry.package,
        hasRushFee: isRush,
        rushFeeAmount,
    };
}
/** School Anthems Pricing Table (Single package: $1,250 flat) */
exports.SCHOOL_ANTHEM_RATE_CARD = [
    { package: "SCHOOL ANTHEMS", customer: 1250, compliant: 1250, nonCompliant: 1250 },
];
function lookupSchoolAnthemRateCardEntry(_packageType) {
    // Always returns the single SCHOOL ANTHEMS package ($1,250)
    return exports.SCHOOL_ANTHEM_RATE_CARD[0];
}
function calculateSchoolAnthemOrderPricing(input) {
    const matchedEntry = lookupSchoolAnthemRateCardEntry(input?.packageType);
    return {
        customerFacingPrice: matchedEntry.customer,
        payrollBasePrice: matchedEntry.compliant,
        compliantPayrollBasePrice: matchedEntry.customer,
        nonCompliantPayrollBasePrice: matchedEntry.customer,
        complianceStatus: "unknown-no-affiliate-field",
        matchedEntry,
        packageName: matchedEntry.package,
    };
}
