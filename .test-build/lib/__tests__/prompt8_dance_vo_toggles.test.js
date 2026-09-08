"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const pricing_engine_1 = require("../pricing-engine");
(0, node_test_1.describe)("Prompt 8 — Traditional/Themed Voice Over Toggles (All 5 Subtypes)", () => {
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
        (0, node_test_1.it)("Traditional VO only (+25) → $475 customerFacingPrice (base), $400 payrollBasePrice", () => {
            const res = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "pom",
                packageType: "DANCE MIX",
                musicAffiliate: "Power Music",
                hasTraditionalVoiceover: true,
                hasThemedVoiceover: false,
            });
            strict_1.default.equal(res.customerFacingPrice, 475);
            strict_1.default.equal(res.payrollBasePrice, 400);
        });
        (0, node_test_1.it)("Themed VO only (+75) → $475 customerFacingPrice (base), $450 payrollBasePrice", () => {
            const res = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "pom",
                packageType: "DANCE MIX",
                musicAffiliate: "Power Music",
                hasTraditionalVoiceover: false,
                hasThemedVoiceover: true,
            });
            strict_1.default.equal(res.customerFacingPrice, 475);
            strict_1.default.equal(res.payrollBasePrice, 450);
        });
        (0, node_test_1.it)("Both toggles active (+100) → $475 customerFacingPrice (base), $475 payrollBasePrice", () => {
            const res = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "pom",
                packageType: "DANCE MIX",
                musicAffiliate: "Power Music",
                hasTraditionalVoiceover: true,
                hasThemedVoiceover: true,
            });
            strict_1.default.equal(res.customerFacingPrice, 475);
            strict_1.default.equal(res.payrollBasePrice, 475);
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
        (0, node_test_1.it)("Traditional VO only (+25) → $100 customerFacingPrice (base), $110 payrollBasePrice", () => {
            const res = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "gameday",
                packageType: "PERFORMANCE MIX",
                musicAffiliate: "Library Music",
                hasTraditionalVoiceover: true,
                hasThemedVoiceover: false,
            });
            strict_1.default.equal(res.customerFacingPrice, 100);
            strict_1.default.equal(res.payrollBasePrice, 110);
        });
        (0, node_test_1.it)("Themed VO only (+75) → $100 customerFacingPrice (base), $160 payrollBasePrice", () => {
            const res = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "gameday",
                packageType: "PERFORMANCE MIX",
                musicAffiliate: "Library Music",
                hasTraditionalVoiceover: false,
                hasThemedVoiceover: true,
            });
            strict_1.default.equal(res.customerFacingPrice, 100);
            strict_1.default.equal(res.payrollBasePrice, 160);
        });
        (0, node_test_1.it)("Both toggles active (+100) → $100 customerFacingPrice (base), $185 payrollBasePrice", () => {
            const res = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "gameday",
                packageType: "PERFORMANCE MIX",
                musicAffiliate: "Library Music",
                hasTraditionalVoiceover: true,
                hasThemedVoiceover: true,
            });
            strict_1.default.equal(res.customerFacingPrice, 100);
            strict_1.default.equal(res.payrollBasePrice, 185);
        });
    });
    (0, node_test_1.describe)("Jazz/Kick Subtype Math Verification (JAZZ SIMPLE CUT = $100 base fixed)", () => {
        (0, node_test_1.it)("Both toggles active (+100) → $100 customerFacingPrice (base), $200 payrollBasePrice (always fixed payroll)", () => {
            const res = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "jazz-kick",
                packageType: "JAZZ SIMPLE CUT",
                musicAffiliate: "Non-Compliant Song",
                hasTraditionalVoiceover: true,
                hasThemedVoiceover: true,
            });
            strict_1.default.equal(res.customerFacingPrice, 100);
            strict_1.default.equal(res.payrollBasePrice, 200);
            strict_1.default.equal(res.alwaysFixedPayroll, true);
        });
    });
});
