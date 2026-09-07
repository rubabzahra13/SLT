"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const pricing_engine_1 = require("../pricing-engine");
const discount_codes_1 = require("../discount-codes");
(0, node_test_1.describe)("Prompt 9 — Completion Modal Pricing Breakdown + Coupon Integration for Dance", () => {
    const discountCodes = [
        {
            id: "code-austin",
            code: "AUSTIN2026",
            discountType: "percentage",
            discountValue: 10,
            description: "10% off for Austin event",
        },
        {
            id: "code-save50",
            code: "SAVE50",
            discountType: "fixed",
            discountValue: 50,
            description: "$50 off total",
        },
    ];
    (0, node_test_1.it)("Subtype 1 (POM): CUSTOM POM ($850) + Power Music Covers (compliant) + Both VO (+100) + Coupon AUSTIN2026 (10%)", () => {
        const rawCoupon = "AUSTIN2026";
        const couponEval = (0, discount_codes_1.evaluateCouponCode)(rawCoupon, discountCodes);
        strict_1.default.equal(couponEval.status, "valid");
        const matchedDiscount = couponEval.match;
        const danceResult = (0, pricing_engine_1.calculateDanceOrderPricing)({
            danceFormSubtype: "pom",
            packageType: "CUSTOM POM",
            musicAffiliate: "Power Music Covers",
            hasTraditionalVoiceover: true,
            hasThemedVoiceover: true,
        });
        strict_1.default.equal(danceResult.customerFacingPrice, 950); // 850 + 100
        strict_1.default.equal(danceResult.payrollBasePrice, 830); // 730 + 100 (compliant)
        // Calculate coupon discount against pre-discount payroll base
        const preDiscountPay = danceResult.payrollBasePrice;
        const discountAmount = Math.round(preDiscountPay * (matchedDiscount.discountValue / 100)); // 830 * 10% = 83
        strict_1.default.equal(discountAmount, 83);
        const finalCustomerPrice = danceResult.customerFacingPrice - discountAmount; // 950 - 83 = 867
        const finalPayrollPrice = danceResult.payrollBasePrice - discountAmount; // 830 - 83 = 747
        strict_1.default.equal(finalCustomerPrice, 867);
        strict_1.default.equal(finalPayrollPrice, 747);
    });
    (0, node_test_1.it)("Subtype 2 (Hip Hop): DANCE PLUS ($575) + Unleash the Beats Covers (compliant) + No VO + No Coupon", () => {
        const danceResult = (0, pricing_engine_1.calculateDanceOrderPricing)({
            danceFormSubtype: "hip-hop",
            packageType: "DANCE PLUS",
            musicAffiliate: "Unleash the Beats Covers",
        });
        strict_1.default.equal(danceResult.customerFacingPrice, 575);
        strict_1.default.equal(danceResult.payrollBasePrice, 430);
        strict_1.default.equal(danceResult.complianceStatus, "compliant");
    });
    (0, node_test_1.it)("Subtype 3 (Team Performance & Variety): TP MIX ($500) + Non-Compliant Affiliate + Traditional VO (+25)", () => {
        const danceResult = (0, pricing_engine_1.calculateDanceOrderPricing)({
            danceFormSubtype: "team-performance-variety",
            packageType: "TP MIX",
            musicAffiliate: "Unapproved Indie Track",
            hasTraditionalVoiceover: true,
            hasThemedVoiceover: false,
        });
        strict_1.default.equal(danceResult.customerFacingPrice, 525); // 500 + 25
        strict_1.default.equal(danceResult.payrollBasePrice, 525); // 500 (non-compliant) + 25
        strict_1.default.equal(danceResult.complianceStatus, "non-compliant");
    });
    (0, node_test_1.it)("Subtype 4 (Gameday): PERFORMANCE EXTREME ($200) + Power Music (compliant) + Themed VO (+75) + Coupon SAVE50 ($50 off)", () => {
        const rawCoupon = "SAVE50";
        const couponEval = (0, discount_codes_1.evaluateCouponCode)(rawCoupon, discountCodes);
        strict_1.default.equal(couponEval.status, "valid");
        const matchedDiscount = couponEval.match;
        const danceResult = (0, pricing_engine_1.calculateDanceOrderPricing)({
            danceFormSubtype: "gameday",
            packageType: "PERFORMANCE EXTREME",
            musicAffiliate: "Power Music",
            hasTraditionalVoiceover: false,
            hasThemedVoiceover: true,
        });
        strict_1.default.equal(danceResult.customerFacingPrice, 275); // 200 + 75
        strict_1.default.equal(danceResult.payrollBasePrice, 215); // 140 + 75
        const discountAmount = Math.min(danceResult.payrollBasePrice, matchedDiscount.discountValue); // 50
        strict_1.default.equal(discountAmount, 50);
        const finalCustomerPrice = danceResult.customerFacingPrice - discountAmount; // 275 - 50 = 225
        const finalPayrollPrice = danceResult.payrollBasePrice - discountAmount; // 215 - 50 = 165
        strict_1.default.equal(finalCustomerPrice, 225);
        strict_1.default.equal(finalPayrollPrice, 165);
    });
    (0, node_test_1.it)("Subtype 5 (Jazz/Kick): JAZZ SIMPLE CUT ($100) + Non-Compliant Affiliate + Both VO (+100)", () => {
        const danceResult = (0, pricing_engine_1.calculateDanceOrderPricing)({
            danceFormSubtype: "jazz-kick",
            packageType: "JAZZ SIMPLE CUT",
            musicAffiliate: "Bootleg Cut Track",
            hasTraditionalVoiceover: true,
            hasThemedVoiceover: true,
        });
        strict_1.default.equal(danceResult.customerFacingPrice, 200); // 100 + 100
        strict_1.default.equal(danceResult.payrollBasePrice, 200); // 100 (always fixed) + 100
        strict_1.default.equal(danceResult.alwaysFixedPayroll, true);
    });
});
