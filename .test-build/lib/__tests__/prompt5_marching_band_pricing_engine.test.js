"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const pricing_engine_1 = require("../pricing-engine");
(0, node_test_1.describe)("Prompt 5 — Marching Band Pricing Engine Unit Tests", () => {
    (0, node_test_1.it)("Rate Card completeness: contains all 4 Marching Band packages", () => {
        strict_1.default.equal(pricing_engine_1.MARCHING_BAND_RATE_CARD.length, 4);
        strict_1.default.deepEqual(pricing_engine_1.MARCHING_BAND_RATE_CARD.map((e) => e.package), [
            "BAND CHANT",
            "DRUM CADENCE ORIGINAL",
            "FIGHT SONG / ALMA MATER",
            "FIGHT SONG / ALMA MATER PLUS (Written & Recorded Lyrics)",
        ]);
    });
    (0, node_test_1.it)("BAND CHANT alone: customerFacingPrice = 600, compliance = unknown-no-affiliate-field", () => {
        const res = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
            packageType: "BAND CHANT",
        });
        strict_1.default.notEqual(res.matchedEntry, null);
        strict_1.default.equal(res.customerFacingPrice, 600);
        strict_1.default.equal(res.complianceStatus, "unknown-no-affiliate-field");
        strict_1.default.equal(res.payrollBasePrice, 600);
    });
    (0, node_test_1.it)("BAND CHANT + Sheet Music Add + Add Vocals: customerFacingPrice = 725 ($600 + $50 + $75)", () => {
        const res = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
            packageType: "BAND CHANT",
            hasSheetMusicAdd: true,
            hasAddVocals: true,
        });
        strict_1.default.equal(res.customerFacingPrice, 725);
        strict_1.default.equal(res.payrollBasePrice, 725);
        strict_1.default.equal(res.complianceStatus, "unknown-no-affiliate-field");
    });
    (0, node_test_1.it)("DRUM CADENCE ORIGINAL alone: customerFacingPrice = 350, compliance = unknown-no-affiliate-field", () => {
        const res = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
            packageType: "DRUM CADENCE ORIGINAL",
        });
        strict_1.default.equal(res.customerFacingPrice, 350);
        strict_1.default.equal(res.payrollBasePrice, 350);
        strict_1.default.equal(res.complianceStatus, "unknown-no-affiliate-field");
    });
    (0, node_test_1.it)("FIGHT SONG / ALMA MATER alone: customerFacingPrice = 1100, payrollBasePrice = 1100 unconditionally", () => {
        const res = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
            packageType: "FIGHT SONG / ALMA MATER",
        });
        strict_1.default.equal(res.customerFacingPrice, 1100);
        strict_1.default.equal(res.payrollBasePrice, 1100);
        strict_1.default.equal(res.alwaysFixedPayroll, true);
    });
    (0, node_test_1.it)("FIGHT SONG / ALMA MATER PLUS alone: customerFacingPrice = 2250, payrollBasePrice = 2250 unconditionally", () => {
        const res = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
            packageType: "FIGHT SONG / ALMA MATER PLUS (Written & Recorded Lyrics)",
        });
        strict_1.default.equal(res.customerFacingPrice, 2250);
        strict_1.default.equal(res.payrollBasePrice, 2250);
        strict_1.default.equal(res.alwaysFixedPayroll, true);
    });
    (0, node_test_1.it)("FIGHT SONG / ALMA MATER PLUS with short name lookup & both add-ons: customerFacingPrice = 2375 ($2250 + $50 + $75)", () => {
        const res = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
            packageType: "FIGHT SONG / ALMA MATER PLUS",
            hasSheetMusicAdd: true,
            hasAddVocals: true,
        });
        strict_1.default.equal(res.customerFacingPrice, 2375);
        strict_1.default.equal(res.payrollBasePrice, 2375);
        strict_1.default.equal(res.alwaysFixedPayroll, true);
    });
    (0, node_test_1.it)("Invalid package name: engine flags / returns null matchedEntry and 0 price", () => {
        const res = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
            packageType: "INVALID MARCHING BAND PACKAGE",
        });
        strict_1.default.equal(res.matchedEntry, null);
        strict_1.default.equal(res.customerFacingPrice, 0);
        strict_1.default.equal(res.payrollBasePrice, 0);
    });
});
