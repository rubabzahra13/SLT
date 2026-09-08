"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const pricing_engine_1 = require("../pricing-engine");
(0, node_test_1.describe)("MTD Miscellaneous Payroll Items & Add-On Pricing", () => {
    const baseDanceRecord = {
        id: "rec-dance-1",
        package: "DANCE MIX",
        danceVoiceover: null,
        hasTraditionalVoiceover: false,
        hasThemedVoiceover: false,
        rushFeeOption: "none",
        extraSongsQuantity: 0,
        extraSongEditingTimeQuantity: 0,
        price: 475,
    };
    const baseCheerRecord = {
        id: "rec-cheer-1",
        package: "GOLD 1:30",
        cheerVoiceover20: false,
        cheerVoiceover40: false,
        rushFeeOption: "none",
        extraSongsQuantity: 0,
        extraSongEditingTimeQuantity: 0,
        price: 850,
    };
    (0, node_test_1.describe)("1. Dance Voiceover Pricing & State", () => {
        (0, node_test_1.it)("Default unselected voiceover has $0 payroll impact", () => {
            const res = (0, pricing_engine_1.calculateMiscellaneousPayrollAddons)(baseDanceRecord);
            strict_1.default.equal(res.totalPayrollAddOns, 0);
            strict_1.default.equal(res.items.length, 0);
        });
        (0, node_test_1.it)("Traditional (+$25) voiceover adds $25 to payroll", () => {
            const rec = { ...baseDanceRecord, danceVoiceover: "25" };
            const res = (0, pricing_engine_1.calculateMiscellaneousPayrollAddons)(rec);
            strict_1.default.equal(res.totalPayrollAddOns, 25);
            strict_1.default.equal(res.items[0].payrollAmount, 25);
            strict_1.default.equal(res.items[0].id, "dance_vo_25");
        });
        (0, node_test_1.it)("Themed (+$75) voiceover adds $75 to payroll", () => {
            const rec = { ...baseDanceRecord, danceVoiceover: "75" };
            const res = (0, pricing_engine_1.calculateMiscellaneousPayrollAddons)(rec);
            strict_1.default.equal(res.totalPayrollAddOns, 75);
            strict_1.default.equal(res.items[0].payrollAmount, 75);
            strict_1.default.equal(res.items[0].id, "dance_vo_75");
        });
        (0, node_test_1.it)("Both (+$100) voiceover adds $100 to payroll", () => {
            const rec = { ...baseDanceRecord, danceVoiceover: "100" };
            const res = (0, pricing_engine_1.calculateMiscellaneousPayrollAddons)(rec);
            strict_1.default.equal(res.totalPayrollAddOns, 100);
            strict_1.default.equal(res.items[0].payrollAmount, 100);
            strict_1.default.equal(res.items[0].id, "dance_vo_100");
        });
    });
    (0, node_test_1.describe)("2. Cheer Voiceover Pricing & Independent Selection", () => {
        (0, node_test_1.it)("No cheer voiceover selected", () => {
            const res = (0, pricing_engine_1.calculateMiscellaneousPayrollAddons)(baseCheerRecord);
            strict_1.default.equal(res.totalPayrollAddOns, 0);
        });
        (0, node_test_1.it)("$20 Cheer Voiceover option selected", () => {
            const rec = { ...baseCheerRecord, cheerVoiceover20: true };
            const res = (0, pricing_engine_1.calculateMiscellaneousPayrollAddons)(rec);
            strict_1.default.equal(res.totalPayrollAddOns, 20);
            strict_1.default.equal(res.items[0].payrollAmount, 20);
            strict_1.default.equal(res.items[0].id, "cheer_vo_20");
        });
        (0, node_test_1.it)("$40 Cheer Voiceover option selected", () => {
            const rec = { ...baseCheerRecord, cheerVoiceover40: true };
            const res = (0, pricing_engine_1.calculateMiscellaneousPayrollAddons)(rec);
            strict_1.default.equal(res.totalPayrollAddOns, 40);
            strict_1.default.equal(res.items[0].payrollAmount, 40);
            strict_1.default.equal(res.items[0].id, "cheer_vo_40");
        });
        (0, node_test_1.it)("Both $20 and $40 Cheer Voiceover options selected for $60 total", () => {
            const rec = { ...baseCheerRecord, cheerVoiceover20: true, cheerVoiceover40: true };
            const res = (0, pricing_engine_1.calculateMiscellaneousPayrollAddons)(rec);
            strict_1.default.equal(res.totalPayrollAddOns, 60);
            strict_1.default.equal(res.items.length, 2);
        });
    });
    (0, node_test_1.describe)("3. Rush Fee State & Mutually Exclusive Pricing", () => {
        (0, node_test_1.it)("None rush fee = $0", () => {
            const rec = { ...baseDanceRecord, rushFeeOption: "none" };
            const res = (0, pricing_engine_1.calculateMiscellaneousPayrollAddons)(rec);
            strict_1.default.equal(res.totalPayrollAddOns, 0);
        });
        (0, node_test_1.it)("Single Rush fee = $150", () => {
            const rec = { ...baseDanceRecord, rushFeeOption: "single" };
            const res = (0, pricing_engine_1.calculateMiscellaneousPayrollAddons)(rec);
            strict_1.default.equal(res.totalPayrollAddOns, 150);
            strict_1.default.equal(res.items[0].payrollAmount, 150);
            strict_1.default.equal(res.items[0].id, "rush_fee_single");
        });
        (0, node_test_1.it)("Double Rush fee = $300", () => {
            const rec = { ...baseDanceRecord, rushFeeOption: "double" };
            const res = (0, pricing_engine_1.calculateMiscellaneousPayrollAddons)(rec);
            strict_1.default.equal(res.totalPayrollAddOns, 300);
            strict_1.default.equal(res.items[0].payrollAmount, 300);
            strict_1.default.equal(res.items[0].id, "rush_fee_double");
        });
        (0, node_test_1.it)("Switching from Single to Double replaces $150 with $300 (no accumulation)", () => {
            const recSingle = { ...baseDanceRecord, rushFeeOption: "single" };
            strict_1.default.equal((0, pricing_engine_1.calculateMiscellaneousPayrollAddons)(recSingle).totalPayrollAddOns, 150);
            const recDouble = { ...baseDanceRecord, rushFeeOption: "double" };
            strict_1.default.equal((0, pricing_engine_1.calculateMiscellaneousPayrollAddons)(recDouble).totalPayrollAddOns, 300);
            const recNone = { ...baseDanceRecord, rushFeeOption: "none" };
            strict_1.default.equal((0, pricing_engine_1.calculateMiscellaneousPayrollAddons)(recNone).totalPayrollAddOns, 0);
        });
    });
    (0, node_test_1.describe)("4. Extra Songs & Extra Song Editing Time (Independently Controllable)", () => {
        (0, node_test_1.it)("Extra Songs quantity 3 = 3 * $15 = $45", () => {
            const rec = { ...baseDanceRecord, extraSongsQuantity: 3 };
            const res = (0, pricing_engine_1.calculateMiscellaneousPayrollAddons)(rec);
            strict_1.default.equal(res.totalPayrollAddOns, 45);
            strict_1.default.equal(res.items[0].payrollAmount, 45);
            strict_1.default.equal(res.items[0].id, "extra_songs");
        });
        (0, node_test_1.it)("Extra Song Editing Time quantity 3 = 3 * $30 = $90", () => {
            const rec = { ...baseDanceRecord, extraSongEditingTimeQuantity: 3 };
            const res = (0, pricing_engine_1.calculateMiscellaneousPayrollAddons)(rec);
            strict_1.default.equal(res.totalPayrollAddOns, 90);
            strict_1.default.equal(res.items[0].payrollAmount, 90);
            strict_1.default.equal(res.items[0].id, "extra_song_editing_time");
        });
        (0, node_test_1.it)("Extra Songs (qty 2) and Extra Song Time (qty 3) are calculated independently", () => {
            const rec = {
                ...baseDanceRecord,
                extraSongsQuantity: 2,
                extraSongEditingTimeQuantity: 3,
            };
            const res = (0, pricing_engine_1.calculateMiscellaneousPayrollAddons)(rec);
            strict_1.default.equal(res.totalPayrollAddOns, 30 + 90);
        });
    });
    (0, node_test_1.describe)("5. Combined Payroll Calculation", () => {
        (0, node_test_1.it)("Calculates correct total payroll price with all active add-ons", () => {
            const fullRecord = {
                package: "DANCE MIX",
                danceVoiceover: "75",
                rushFeeOption: "single",
                hasProcessing8ctSheetsAddon: true,
                hasExtend8ctAddon: true,
                extraSongsQuantity: 3,
                extraSongEditingTimeQuantity: 3,
            };
            const res = (0, pricing_engine_1.calculateMiscellaneousPayrollAddons)(fullRecord);
            // 75 (VO) + 150 (Rush) + 50 (8-CS) + 25 (Extend) + 45 (3 Songs) + 90 (3 Editing Time) = 435
            strict_1.default.equal(res.totalPayrollAddOns, 435);
        });
    });
    (0, node_test_1.describe)("6. NON-NEGOTIABLE INVARIANT: Package Price / Customer Price Must NEVER Change", () => {
        (0, node_test_1.it)("Dance order Package Price remains unchanged when all add-ons are applied", () => {
            const basePricing = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "pom",
                packageType: "DANCE MIX",
                musicAffiliate: "Power Music",
            });
            const addOnPricing = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "pom",
                packageType: "DANCE MIX",
                musicAffiliate: "Power Music",
                danceVoiceover: "75",
                rushFeeOption: "double",
                extraSongsQuantity: 4,
                extraSongEditingTimeQuantity: 4,
            });
            // Customer Facing Price MUST be identical!
            strict_1.default.equal(addOnPricing.customerFacingPrice, basePricing.customerFacingPrice);
            // Payroll Base Price MUST reflect add-ons!
            strict_1.default.equal(addOnPricing.payrollBasePrice, basePricing.payrollBasePrice + 75 + 300 + 60 + 120);
        });
        (0, node_test_1.it)("Cheer order Package Price remains unchanged when all add-ons are applied", () => {
            const basePricing = (0, pricing_engine_1.calculateCheerOrderPricing)({
                cheerFormSubtype: "all-star-cheer",
                packageType: "GOLD 1:30",
                musicAffiliate: "Power Music",
            });
            const addOnPricing = (0, pricing_engine_1.calculateCheerOrderPricing)({
                cheerFormSubtype: "all-star-cheer",
                packageType: "GOLD 1:30",
                musicAffiliate: "Power Music",
                cheerVoiceover20: true,
                cheerVoiceover40: true,
                rushFeeOption: "single",
                extraSongsQuantity: 2,
                extraSongEditingTimeQuantity: 2,
            });
            // Customer Facing Price MUST be identical!
            strict_1.default.equal(addOnPricing.customerFacingPrice, basePricing.customerFacingPrice);
            // Payroll Base Price MUST reflect add-ons! (20 + 40 + 150 + 30 + 60 = 300)
            strict_1.default.equal(addOnPricing.payrollBasePrice, basePricing.payrollBasePrice + 300);
        });
        (0, node_test_1.it)("Gameday PERFORMANCE MIX with Themed VO (+75), 6 Extra Songs (+90), 4 Extra Editing Time (+120) yields $370 Payroll Price and $100 Package Price", () => {
            const res = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "gameday",
                packageType: "PERFORMANCE MIX",
                musicAffiliate: "Library Music",
                danceVoiceover: "75",
                extraSongsQuantity: 6,
                extraSongEditingTimeQuantity: 4,
            });
            // Base customer price = 100
            strict_1.default.equal(res.customerFacingPrice, 100);
            // Base compliant payroll price (85) + 75 + 90 + 120 = 370
            strict_1.default.equal(res.payrollBasePrice, 370);
        });
    });
});
