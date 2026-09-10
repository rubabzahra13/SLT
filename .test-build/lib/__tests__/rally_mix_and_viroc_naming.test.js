"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const pricing_engine_1 = require("../pricing-engine");
const pricing_reference_1 = require("../pricing-reference");
const types_1 = require("../../types");
const pricing_display_1 = require("../pricing-display");
(0, node_test_1.describe)("Rally Mix Package Pricing, Subtype Renaming & Add-On Matrix Tests", () => {
    (0, node_test_1.describe)("PART 1: Rally Mix Package Pricing", () => {
        (0, node_test_1.it)("1. Rally Mix package pricing is recognized based on Package Name", () => {
            const res = (0, pricing_engine_1.calculateCheerOrderPricing)({
                cheerFormSubtype: "school-cheer-viroc-yes",
                packageType: "Rally Mix",
                musicAffiliate: "Power Music",
            });
            strict_1.default.equal(res.customerFacingPrice, 350);
            strict_1.default.equal(res.payrollBasePrice, 350);
            strict_1.default.equal(res.packageName, "RALLY MIX");
            strict_1.default.equal(res.timeLengthOfMix, "-");
        });
        (0, node_test_1.it)("2. Rally Mix package pricing applies identically under School Cheer subtype", () => {
            const res = (0, pricing_engine_1.calculateCheerOrderPricing)({
                cheerFormSubtype: "school-cheer-viroc-no",
                packageType: "Rally Mix",
                musicAffiliate: "Power Music",
            });
            strict_1.default.equal(res.customerFacingPrice, 350);
            strict_1.default.equal(res.payrollBasePrice, 350);
            strict_1.default.equal(res.packageName, "RALLY MIX");
        });
        (0, node_test_1.it)("3. Rally Mix does not stack as an add-on on top of another package", () => {
            const res = (0, pricing_engine_1.calculateCheerOrderPricing)({
                cheerFormSubtype: "school-cheer-viroc-yes",
                packageType: "GOLD 2:00",
                musicAffiliate: "Power Music",
                // @ts-ignore - testing legacy prop if passed
                hasRallyMix: true,
            });
            strict_1.default.equal(res.customerFacingPrice, 950);
            strict_1.default.equal(res.payrollBasePrice, 850);
        });
        (0, node_test_1.it)("4. Pricing Reference Table includes Rally Mix as a standard package row under School Cheer", () => {
            const snapshot = (0, pricing_reference_1.buildDefaultCategorySnapshot)("School Cheer");
            const rallyRow = snapshot.rows.find((r) => r.kind === "tier-time" && r.tier === "RALLY MIX");
            strict_1.default.ok(rallyRow, "Rally Mix must exist in School Cheer pricing reference rows");
            if (rallyRow?.kind === "tier-time") {
                strict_1.default.equal(rallyRow.customer, 350);
                strict_1.default.equal(rallyRow.compliant, 350);
                strict_1.default.equal(rallyRow.nonCompliant, 350);
            }
            const rallyAddon = snapshot.addOns.find((a) => a.name.toLowerCase().includes("rally mix"));
            strict_1.default.equal(rallyAddon, undefined, "Rally Mix must NOT appear as an add-on");
        });
    });
    (0, node_test_1.describe)("PART 2: Global Subtype Renaming (VIROC & School Cheer)", () => {
        (0, node_test_1.it)("1. CHEER_FORM_SUBTABS labels display 'VIROC' and 'School Cheer'", () => {
            const virocTab = types_1.CHEER_FORM_SUBTABS.find((t) => t.id === "school-cheer-viroc-yes");
            const schoolTab = types_1.CHEER_FORM_SUBTABS.find((t) => t.id === "school-cheer-viroc-no");
            strict_1.default.ok(virocTab);
            strict_1.default.ok(schoolTab);
            strict_1.default.equal(virocTab.label, "VIROC");
            strict_1.default.equal(schoolTab.label, "School Cheer");
        });
        (0, node_test_1.it)("2. getSubtypeLabel resolves 'school-cheer-viroc-yes' to 'VIROC' and 'school-cheer-viroc-no' to 'School Cheer'", () => {
            strict_1.default.equal((0, pricing_display_1.getSubtypeLabel)("school-cheer-viroc-yes"), "VIROC");
            strict_1.default.equal((0, pricing_display_1.getSubtypeLabel)("school-cheer-viroc-no"), "School Cheer");
        });
        (0, node_test_1.it)("3. Internal data IDs remain unchanged ('school-cheer-viroc-yes' / 'school-cheer-viroc-no')", () => {
            strict_1.default.equal(types_1.CHEER_FORM_SUBTABS[1].id, "school-cheer-viroc-yes");
            strict_1.default.equal(types_1.CHEER_FORM_SUBTABS[2].id, "school-cheer-viroc-no");
        });
    });
    (0, node_test_1.describe)("PART 3 & 4 & 5: Extra Songs & Extra Song Time Availability Matrix", () => {
        (0, node_test_1.it)("1. Dance Orders include Extra Songs ($15) and Extra Song Time ($30) in payroll calculations", () => {
            const danceRes = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "pom",
                packageType: "DANCE MIX", // Base compliant: $375
                musicAffiliate: "Power Music",
                // @ts-ignore
                extraSongsQuantity: 2, // 2 * 15 = $30
                extraSongEditingTimeQuantity: 1, // 1 * 30 = $30
            });
            strict_1.default.equal(danceRes.customerFacingPrice, 475);
            strict_1.default.equal(danceRes.payrollBasePrice, 435); // $375 + $30 + $30
        });
        (0, node_test_1.it)("2. Cheer Orders ignore Extra Songs & Extra Song Time in payroll calculations", () => {
            const cheerRes = (0, pricing_engine_1.calculateCheerOrderPricing)({
                cheerFormSubtype: "school-cheer-viroc-yes",
                packageType: "GOLD 1:30", // Base compliant: $600
                musicAffiliate: "Power Music",
                extraSongsQuantity: 5,
                extraSongEditingTimeQuantity: 5,
            });
            strict_1.default.equal(cheerRes.customerFacingPrice, 700);
            strict_1.default.equal(cheerRes.payrollBasePrice, 600); // Extra songs ignored
        });
        (0, node_test_1.it)("3. Marching Band Orders ignore Extra Songs & Extra Song Time in payroll calculations", () => {
            const mbRes = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
                packageType: "BAND CHANT", // Base compliant: $300
                musicAffiliate: "Power Music",
                // @ts-ignore
                extraSongsQuantity: 5,
                extraSongEditingTimeQuantity: 5,
            });
            strict_1.default.equal(mbRes.customerFacingPrice, 600);
            strict_1.default.equal(mbRes.payrollBasePrice, 300); // Extra songs ignored
        });
    });
});
