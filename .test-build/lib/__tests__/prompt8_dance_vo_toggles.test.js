"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const pricing_engine_1 = require("../pricing-engine");
(0, node_test_1.describe)("Voiceover Isolation Verification (All 5 Subtypes)", () => {
    (0, node_test_1.describe)("POM Subtype Math Verification (DANCE MIX = $475 base)", () => {
        (0, node_test_1.it)("Neither toggle active → $475 customerFacingPrice, $375 payrollBasePrice (compliant)", () => {
            const res = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "pom",
                packageType: "DANCE MIX",
                musicAffiliate: "Power Music",
                hasTraditionalVoiceover: false,
                hasThemedVoiceover: false,
            });
            strict_1.default.equal(res.customerFacingPrice, 475);
            strict_1.default.equal(res.payrollBasePrice, 375);
        });
        (0, node_test_1.it)("Traditional VO active → $475 customerFacingPrice, $375 payrollBasePrice (Voiceover is separate internal payroll item)", () => {
            const res = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "pom",
                packageType: "DANCE MIX",
                musicAffiliate: "Power Music",
                hasTraditionalVoiceover: true,
                hasThemedVoiceover: false,
            });
            strict_1.default.equal(res.customerFacingPrice, 475);
            strict_1.default.equal(res.payrollBasePrice, 375);
        });
        (0, node_test_1.it)("Themed VO active → $475 customerFacingPrice, $375 payrollBasePrice (Voiceover is separate internal payroll item)", () => {
            const res = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "pom",
                packageType: "DANCE MIX",
                musicAffiliate: "Power Music",
                hasTraditionalVoiceover: false,
                hasThemedVoiceover: true,
            });
            strict_1.default.equal(res.customerFacingPrice, 475);
            strict_1.default.equal(res.payrollBasePrice, 375);
        });
        (0, node_test_1.it)("Both toggles active → $475 customerFacingPrice, $375 payrollBasePrice (Voiceover is separate internal payroll item)", () => {
            const res = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "pom",
                packageType: "DANCE MIX",
                musicAffiliate: "Power Music",
                hasTraditionalVoiceover: true,
                hasThemedVoiceover: true,
            });
            strict_1.default.equal(res.customerFacingPrice, 475);
            strict_1.default.equal(res.payrollBasePrice, 375);
        });
    });
    (0, node_test_1.describe)("Gameday Subtype Math Verification (PERFORMANCE MIX = $100 base)", () => {
        (0, node_test_1.it)("Neither toggle active → $100 customerFacingPrice, $85 payrollBasePrice", () => {
            const res = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "gameday",
                packageType: "PERFORMANCE MIX",
                musicAffiliate: "Library Music",
                hasTraditionalVoiceover: false,
                hasThemedVoiceover: false,
            });
            strict_1.default.equal(res.customerFacingPrice, 100);
            strict_1.default.equal(res.payrollBasePrice, 85);
        });
        (0, node_test_1.it)("Both toggles active → $100 customerFacingPrice, $85 payrollBasePrice", () => {
            const res = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "gameday",
                packageType: "PERFORMANCE MIX",
                musicAffiliate: "Library Music",
                hasTraditionalVoiceover: true,
                hasThemedVoiceover: true,
            });
            strict_1.default.equal(res.customerFacingPrice, 100);
            strict_1.default.equal(res.payrollBasePrice, 85);
        });
    });
    (0, node_test_1.describe)("Jazz/Kick Subtype Math Verification (JAZZ SIMPLE CUT = $100 base fixed)", () => {
        (0, node_test_1.it)("Both toggles active → $100 customerFacingPrice, $100 payrollBasePrice (always fixed payroll)", () => {
            const res = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "jazz-kick",
                packageType: "JAZZ SIMPLE CUT",
                musicAffiliate: "Non-Compliant Song",
                hasTraditionalVoiceover: true,
                hasThemedVoiceover: true,
            });
            strict_1.default.equal(res.customerFacingPrice, 100);
            strict_1.default.equal(res.payrollBasePrice, 100);
            strict_1.default.equal(res.alwaysFixedPayroll, true);
        });
    });
});
