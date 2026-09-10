"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const pricing_engine_1 = require("../pricing-engine");
(0, node_test_1.describe)("Add-On Pricing Invariant Tests — Package Price Must Not Change", () => {
    (0, node_test_1.it)("Test 1 — No Add-On: Base Package Price is $700", () => {
        const res = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "school-cheer-viroc-yes",
            packageType: "GOLD 1:30",
            timeLengthOfMix: "1:30",
            musicAffiliate: "Power Music",
            hasRallyMix: false,
        });
        strict_1.default.equal(res.customerFacingPrice, 700);
        strict_1.default.equal(res.payrollBasePrice, 600);
    });
    (0, node_test_1.it)("Test 2 — Standalone Package Rally Mix: Package Price is $350 and Payroll Price is $350", () => {
        const res = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "school-cheer-viroc-yes",
            packageType: "Rally Mix",
            musicAffiliate: "Power Music",
        });
        strict_1.default.equal(res.customerFacingPrice, 350);
        strict_1.default.equal(res.payrollBasePrice, 350);
    });
    (0, node_test_1.it)("Test 3 — Rush Fee Add-on: Package Price remains $700 while Payroll Price includes +$150 Rush Fee", () => {
        const res = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "school-cheer-viroc-yes",
            packageType: "GOLD 1:30",
            timeLengthOfMix: "1:30",
            musicAffiliate: "Power Music",
            rushFeeOption: "single",
        });
        strict_1.default.equal(res.customerFacingPrice, 700);
        strict_1.default.equal(res.payrollBasePrice, 750); // $600 + $150
    });
    (0, node_test_1.it)("Test 4 — Toggle Rush Fee: ON -> OFF -> ON stays $700 every time", () => {
        let state = false;
        for (let i = 0; i < 5; i++) {
            state = !state;
            const res = (0, pricing_engine_1.calculateCheerOrderPricing)({
                cheerFormSubtype: "school-cheer-viroc-yes",
                packageType: "GOLD 1:30",
                timeLengthOfMix: "1:30",
                musicAffiliate: "Power Music",
                rushFeeOption: state ? "single" : "none",
            });
            strict_1.default.equal(res.customerFacingPrice, 700, `Iteration ${i + 1} state=${state} failed`);
            if (state) {
                strict_1.default.equal(res.payrollBasePrice, 750);
            }
            else {
                strict_1.default.equal(res.payrollBasePrice, 600);
            }
        }
    });
    (0, node_test_1.it)("Test 5 — Multiple Add-Ons: Base Package Price remains $450 (Youth Rec Cheer)", () => {
        const res = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "youth-rec-cheer",
            packageType: "BRONZE 1:00",
            hasExtend8ctAddon: true,
            hasProcessing8ctSheetsAddon: true,
        });
        strict_1.default.equal(res.customerFacingPrice, 450); // Base package price
        strict_1.default.equal(res.payrollBasePrice, 425); // $350 + $25 + $50
    });
    (0, node_test_1.it)("Test 6 — Dance & Marching Band Add-Ons: Base Package Prices remain immutable", () => {
        // Dance VO Add-ons
        const danceRes = (0, pricing_engine_1.calculateDanceOrderPricing)({
            danceFormSubtype: "pom",
            packageType: "CUSTOM POM",
            musicAffiliate: "Power Music Covers",
            hasTraditionalVoiceover: true,
            hasThemedVoiceover: true,
        });
        strict_1.default.equal(danceRes.customerFacingPrice, 850);
        strict_1.default.equal(danceRes.payrollBasePrice, 730); // $730 (VO is internal payroll item)
        // Marching Band Add-ons
        const mbRes = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
            packageType: "BAND CHANT",
            hasSheetMusicAdd: true,
            hasAddVocals: true,
        });
        strict_1.default.equal(mbRes.customerFacingPrice, 600);
        strict_1.default.equal(mbRes.payrollBasePrice, 725); // $600 + $125
        // Sports Entertainment Rush Fee
        const seRes = (0, pricing_engine_1.calculateSportsEntertainmentOrderPricing)({
            packageType: "PRE-GAME / HALFTIME REMIXED",
            isRushOrder: "yes",
        });
        strict_1.default.equal(seRes.customerFacingPrice, 250);
        strict_1.default.equal(seRes.payrollBasePrice, 400); // $250 + $150
    });
    (0, node_test_1.it)("Test 7 — Compliance & Non-Compliance: Compliance affects payroll base but Package Price is immutable", () => {
        const compliantRes = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "school-cheer-viroc-yes",
            packageType: "GOLD 1:30",
            timeLengthOfMix: "1:30",
            musicAffiliate: "Power Music",
            rushFeeOption: "single",
        });
        strict_1.default.equal(compliantRes.customerFacingPrice, 700);
        strict_1.default.equal(compliantRes.payrollBasePrice, 750); // $600 + $150
        const nonCompliantRes = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "school-cheer-viroc-yes",
            packageType: "GOLD 1:30",
            timeLengthOfMix: "1:30",
            musicAffiliate: "Unapproved Indie Song",
            rushFeeOption: "single",
        });
        strict_1.default.equal(nonCompliantRes.customerFacingPrice, 700);
        strict_1.default.equal(nonCompliantRes.payrollBasePrice, 850); // $700 non-compliant + $150
    });
});
