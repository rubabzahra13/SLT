"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const pricing_engine_1 = require("../pricing-engine");
(0, node_test_1.describe)("Prompt 6 — Dance Pricing Engine Unit Tests", () => {
    (0, node_test_1.it)("1. POM DANCE MIX with musicAffiliate = 'Power Music Covers' → customerFacingPrice = 475, payrollBasePrice = 375, compliant", () => {
        const res = (0, pricing_engine_1.calculateDanceOrderPricing)({
            danceFormSubtype: "pom",
            packageType: "DANCE MIX",
            musicAffiliate: "Power Music Covers",
        });
        strict_1.default.equal(res.customerFacingPrice, 475);
        strict_1.default.equal(res.payrollBasePrice, 375);
        strict_1.default.equal(res.complianceStatus, "compliant");
    });
    (0, node_test_1.it)("2. Hip Hop CUSTOM POM with a non-compliant affiliate → customerFacingPrice = 850, payrollBasePrice = 850", () => {
        const res = (0, pricing_engine_1.calculateDanceOrderPricing)({
            danceFormSubtype: "hip-hop",
            packageType: "CUSTOM POM",
            musicAffiliate: "Some Random Unapproved Artist",
        });
        strict_1.default.equal(res.customerFacingPrice, 850);
        strict_1.default.equal(res.payrollBasePrice, 850);
        strict_1.default.equal(res.complianceStatus, "non-compliant");
    });
    (0, node_test_1.it)("3. Team Performance & Variety TP PLUS MIX with musicAffiliate = 'Unleash the Beats Covers' → customerFacingPrice = 600, payrollBasePrice = 475, compliant", () => {
        const res = (0, pricing_engine_1.calculateDanceOrderPricing)({
            danceFormSubtype: "team-performance-variety",
            packageType: "TP PLUS MIX",
            musicAffiliate: "Unleash the Beats Covers",
        });
        strict_1.default.equal(res.customerFacingPrice, 600);
        strict_1.default.equal(res.payrollBasePrice, 475);
        strict_1.default.equal(res.complianceStatus, "compliant");
    });
    (0, node_test_1.it)("4. Gameday PERFORMANCE EXTREME with a non-compliant affiliate → customerFacingPrice = 200, payrollBasePrice = 200", () => {
        const res = (0, pricing_engine_1.calculateDanceOrderPricing)({
            danceFormSubtype: "gameday",
            packageType: "PERFORMANCE EXTREME",
            musicAffiliate: "Non-Compliant Track",
        });
        strict_1.default.equal(res.customerFacingPrice, 200);
        strict_1.default.equal(res.payrollBasePrice, 200);
        strict_1.default.equal(res.complianceStatus, "non-compliant");
    });
    (0, node_test_1.it)("5. Jazz/Kick JAZZ SIMPLE CUT: payrollBasePrice = 100 for compliant AND non-compliant affiliates", () => {
        const compliantRes = (0, pricing_engine_1.calculateDanceOrderPricing)({
            danceFormSubtype: "jazz-kick",
            packageType: "JAZZ SIMPLE CUT",
            musicAffiliate: "Power Music",
        });
        strict_1.default.equal(compliantRes.customerFacingPrice, 100);
        strict_1.default.equal(compliantRes.payrollBasePrice, 100);
        strict_1.default.equal(compliantRes.alwaysFixedPayroll, true);
        const nonCompliantRes = (0, pricing_engine_1.calculateDanceOrderPricing)({
            danceFormSubtype: "jazz-kick",
            packageType: "JAZZ SIMPLE CUT",
            musicAffiliate: "Non-Compliant Bootleg Audio",
        });
        strict_1.default.equal(nonCompliantRes.customerFacingPrice, 100);
        strict_1.default.equal(nonCompliantRes.payrollBasePrice, 100);
        strict_1.default.equal(nonCompliantRes.alwaysFixedPayroll, true);
    });
    (0, node_test_1.it)("6. Jazz/Kick JAZZ/KICK MIX: compliant → payrollBasePrice = 150; non-compliant → payrollBasePrice = 200", () => {
        const compliantRes = (0, pricing_engine_1.calculateDanceOrderPricing)({
            danceFormSubtype: "jazz-kick",
            packageType: "JAZZ/KICK MIX",
            musicAffiliate: "Power Music",
        });
        strict_1.default.equal(compliantRes.customerFacingPrice, 200);
        strict_1.default.equal(compliantRes.payrollBasePrice, 150);
        strict_1.default.equal(compliantRes.complianceStatus, "compliant");
        const nonCompliantRes = (0, pricing_engine_1.calculateDanceOrderPricing)({
            danceFormSubtype: "jazz-kick",
            packageType: "JAZZ/KICK MIX",
            musicAffiliate: "Unlicensed Artist Track",
        });
        strict_1.default.equal(nonCompliantRes.customerFacingPrice, 200);
        strict_1.default.equal(nonCompliantRes.payrollBasePrice, 200);
        strict_1.default.equal(nonCompliantRes.complianceStatus, "non-compliant");
    });
    (0, node_test_1.it)("7. Invalid / Unrecognized package name (e.g. 'DANCE SUPREME' for POM) → returns 0 price and null entry", () => {
        const res = (0, pricing_engine_1.calculateDanceOrderPricing)({
            danceFormSubtype: "pom",
            packageType: "DANCE SUPREME",
            musicAffiliate: "Power Music",
        });
        strict_1.default.equal(res.customerFacingPrice, 0);
        strict_1.default.equal(res.payrollBasePrice, 0);
        strict_1.default.equal(res.matchedEntry, null);
    });
});
