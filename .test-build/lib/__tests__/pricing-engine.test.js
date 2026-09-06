"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const pricing_engine_1 = require("../pricing-engine");
(0, node_test_1.describe)("Central Pricing Engine — Core Rules Unit Tests (Prompt 8)", () => {
    (0, node_test_1.it)("All-Star Cheer GOLD 1:30 with Power Music (compliant affiliate)", () => {
        const result = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "all-star-cheer",
            packageType: "GOLD 1:30",
            musicAffiliate: "Power Music",
        });
        strict_1.default.equal(result.customerFacingPrice, 700);
        strict_1.default.equal(result.payrollBasePrice, 600);
        strict_1.default.equal(result.complianceStatus, "compliant");
    });
    (0, node_test_1.it)("All-Star Cheer GOLD 1:30 with non-compliant music affiliate", () => {
        const result = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "all-star-cheer",
            packageType: "GOLD 1:30",
            musicAffiliate: "Some Random Song Artist",
        });
        strict_1.default.equal(result.customerFacingPrice, 700);
        strict_1.default.equal(result.payrollBasePrice, 700);
        strict_1.default.equal(result.complianceStatus, "non-compliant");
    });
    (0, node_test_1.it)("All-Star Cheer TITANIUM 2:30 — payroll base is $2800 regardless of compliance", () => {
        const compliantResult = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "all-star-cheer",
            packageType: "TITANIUM 2:30",
            musicAffiliate: "Library Music",
        });
        strict_1.default.equal(compliantResult.customerFacingPrice, 2800);
        strict_1.default.equal(compliantResult.payrollBasePrice, 2800);
        strict_1.default.equal(compliantResult.complianceStatus, "compliant");
        strict_1.default.equal(compliantResult.isTitanium, true);
        const nonCompliantResult = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "all-star-cheer",
            packageType: "TITANIUM 2:30",
            musicAffiliate: "Some Non-Compliant Artist",
        });
        strict_1.default.equal(nonCompliantResult.customerFacingPrice, 2800);
        strict_1.default.equal(nonCompliantResult.payrollBasePrice, 2800);
        strict_1.default.equal(nonCompliantResult.complianceStatus, "non-compliant");
        strict_1.default.equal(nonCompliantResult.isTitanium, true);
    });
    (0, node_test_1.it)("School Cheer VIROC Yes SILVER 1:45 with Unleash the Beats (compliant)", () => {
        const result = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "school-cheer-viroc-yes",
            packageType: "SILVER 1:45",
            musicAffiliate: "Unleash the Beats",
        });
        strict_1.default.equal(result.customerFacingPrice, 650);
        strict_1.default.equal(result.payrollBasePrice, 550);
        strict_1.default.equal(result.complianceStatus, "compliant");
    });
    (0, node_test_1.it)("School Cheer VIROC No PLATINUM 2:15 with a non-compliant affiliate", () => {
        const result = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "school-cheer-viroc-no",
            packageType: "PLATINUM 2:15",
            musicAffiliate: "Artist Cover Remix",
        });
        strict_1.default.equal(result.customerFacingPrice, 1600);
        strict_1.default.equal(result.payrollBasePrice, 1600);
        strict_1.default.equal(result.complianceStatus, "non-compliant");
    });
    (0, node_test_1.it)("Youth Rec Cheer BRONZE 1:30 with Power Music Covers (compliant affiliate)", () => {
        const result = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "youth-rec-cheer",
            packageType: "BRONZE 1:30",
            musicAffiliate: "Power Music Covers",
        });
        strict_1.default.equal(result.customerFacingPrice, 570);
        strict_1.default.equal(result.payrollBasePrice, 470);
        strict_1.default.equal(result.complianceStatus, "compliant");
    });
    (0, node_test_1.it)("Youth Rec Cheer BRONZE 2:00 with no musicAffiliate field present", () => {
        const result = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "youth-rec-cheer",
            packageType: "BRONZE 2:00",
            musicAffiliate: undefined,
        });
        strict_1.default.equal(result.customerFacingPrice, 750);
        strict_1.default.equal(result.complianceStatus, "unknown-no-affiliate-field");
        strict_1.default.notEqual(result.complianceStatus, "compliant");
        strict_1.default.notEqual(result.complianceStatus, "non-compliant");
    });
    (0, node_test_1.it)("Invalid / Unrecognized package name returns explicit invalid flag and zero price", () => {
        const result = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "all-star-cheer",
            packageType: "EMERALD 1:30",
            musicAffiliate: "Power Music",
        });
        strict_1.default.equal(result.customerFacingPrice, 0);
        strict_1.default.equal(result.payrollBasePrice, 0);
        strict_1.default.equal(result.matchedEntry, null);
    });
    (0, node_test_1.describe)("Subtype-Specific MTD Controls Add-On Rules (Prompt 10)", () => {
        (0, node_test_1.it)("School Cheer GOLD 2:00 with Rally Mix active adds $350 on top of package price for both customer and payroll", () => {
            const baseResult = (0, pricing_engine_1.calculateCheerOrderPricing)({
                cheerFormSubtype: "school-cheer-viroc-yes",
                packageType: "GOLD 2:00",
                musicAffiliate: "Power Music",
                hasRallyMix: false,
            });
            strict_1.default.equal(baseResult.customerFacingPrice, 950);
            strict_1.default.equal(baseResult.payrollBasePrice, 850);
            const rallyResult = (0, pricing_engine_1.calculateCheerOrderPricing)({
                cheerFormSubtype: "school-cheer-viroc-yes",
                packageType: "GOLD 2:00",
                musicAffiliate: "Power Music",
                hasRallyMix: true,
            });
            strict_1.default.equal(rallyResult.customerFacingPrice, 1300); // 950 + 350
            strict_1.default.equal(rallyResult.payrollBasePrice, 1200); // 850 + 350
            // Live 2-way toggle off returns to base
            const toggledOff = (0, pricing_engine_1.calculateCheerOrderPricing)({
                cheerFormSubtype: "school-cheer-viroc-yes",
                packageType: "GOLD 2:00",
                musicAffiliate: "Power Music",
                hasRallyMix: false,
            });
            strict_1.default.equal(toggledOff.customerFacingPrice, 950);
            strict_1.default.equal(toggledOff.payrollBasePrice, 850);
        });
        (0, node_test_1.it)("Rally Mix is ignored on All-Star Cheer and Youth Rec Cheer", () => {
            const allStar = (0, pricing_engine_1.calculateCheerOrderPricing)({
                cheerFormSubtype: "all-star-cheer",
                packageType: "GOLD 2:00",
                musicAffiliate: "Power Music",
                hasRallyMix: true,
            });
            strict_1.default.equal(allStar.customerFacingPrice, 950);
            const youthRec = (0, pricing_engine_1.calculateCheerOrderPricing)({
                cheerFormSubtype: "youth-rec-cheer",
                packageType: "BRONZE 2:00",
                hasRallyMix: true,
            });
            strict_1.default.equal(youthRec.customerFacingPrice, 750);
        });
        (0, node_test_1.it)("Youth Rec Cheer BRONZE 2:00 with Extend-8ct ($25) and Processing-8ct-Sheets ($50)", () => {
            const extendOnly = (0, pricing_engine_1.calculateCheerOrderPricing)({
                cheerFormSubtype: "youth-rec-cheer",
                packageType: "BRONZE 2:00",
                hasExtend8ctAddon: true,
            });
            strict_1.default.equal(extendOnly.customerFacingPrice, 775); // 750 + 25
            strict_1.default.equal(extendOnly.payrollBasePrice, 675); // 650 + 25
            const processOnly = (0, pricing_engine_1.calculateCheerOrderPricing)({
                cheerFormSubtype: "youth-rec-cheer",
                packageType: "BRONZE 2:00",
                hasProcessing8ctSheetsAddon: true,
            });
            strict_1.default.equal(processOnly.customerFacingPrice, 800); // 750 + 50
            strict_1.default.equal(processOnly.payrollBasePrice, 700); // 650 + 50
            const bothAddons = (0, pricing_engine_1.calculateCheerOrderPricing)({
                cheerFormSubtype: "youth-rec-cheer",
                packageType: "BRONZE 2:00",
                hasExtend8ctAddon: true,
                hasProcessing8ctSheetsAddon: true,
            });
            strict_1.default.equal(bothAddons.customerFacingPrice, 825); // 750 + 25 + 50
            strict_1.default.equal(bothAddons.payrollBasePrice, 725); // 650 + 25 + 50
        });
        (0, node_test_1.it)("Youth Rec Cheer add-ons are ignored on School Cheer and All-Star Cheer", () => {
            const schoolCheer = (0, pricing_engine_1.calculateCheerOrderPricing)({
                cheerFormSubtype: "school-cheer-viroc-yes",
                packageType: "GOLD 2:00",
                hasExtend8ctAddon: true,
                hasProcessing8ctSheetsAddon: true,
            });
            strict_1.default.equal(schoolCheer.customerFacingPrice, 950);
        });
    });
});
