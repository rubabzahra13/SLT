"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const discount_codes_1 = require("../discount-codes");
const pricing_engine_1 = require("../pricing-engine");
const pricing_display_1 = require("../pricing-display");
const producers_1 = require("../producers");
(0, node_test_1.describe)("Coupon Code as Display-Only Customer Pricing Information Test Suite", () => {
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
    const mockProducer = (0, producers_1.normalizeProducer)({
        id: "prod-1",
        name: "Casey Marlow",
        email: "casey@slt.com",
        categories: ["dance-jazz", "cheer"],
        ratesByCategory: {
            "dance-jazz": 80,
            cheer: 100,
        },
        danceVoiceoverRate: 80,
        cheerVoiceoverRate: 100,
        rushFeeRate: 100,
    });
    (0, node_test_1.describe)("Requirement 1: Coupon Code Settings & Evaluation Preserved", () => {
        (0, node_test_1.it)("evaluates valid percentage and fixed discount codes accurately for display", () => {
            const evalPct = (0, discount_codes_1.evaluateCouponCode)("AUSTIN2026", discountCodes);
            strict_1.default.equal(evalPct.status, "valid");
            strict_1.default.equal(evalPct.match?.discountValue, 10);
            const evalFixed = (0, discount_codes_1.evaluateCouponCode)("SAVE50", discountCodes);
            strict_1.default.equal(evalFixed.status, "valid");
            strict_1.default.equal(evalFixed.match?.discountValue, 50);
        });
    });
    (0, node_test_1.describe)("Requirement 3: Coupon Code Must NOT Modify Pricing Engine Package Price or Payroll Base", () => {
        (0, node_test_1.it)("Cheer order: Package Price ($1,100) and Payroll Base ($1,000) remain unchanged with coupon", () => {
            const noCoupon = (0, pricing_engine_1.calculateCheerOrderPricing)({
                cheerFormSubtype: "all-star-cheer",
                packageType: "GOLD 2:30",
                musicAffiliate: "Power Music",
            });
            const withCoupon = (0, pricing_engine_1.calculateCheerOrderPricing)({
                cheerFormSubtype: "all-star-cheer",
                packageType: "GOLD 2:30",
                musicAffiliate: "Power Music",
                discountCodeObj: discountCodes[0], // 10%
            });
            strict_1.default.equal(withCoupon.customerFacingPrice, noCoupon.customerFacingPrice);
            strict_1.default.equal(withCoupon.payrollBasePrice, noCoupon.payrollBasePrice);
            strict_1.default.equal(withCoupon.customerFacingPrice, 1100);
            strict_1.default.equal(withCoupon.payrollBasePrice, 1000);
            strict_1.default.equal(withCoupon.discountAmount, 100); // Display-only discount amount
        });
        (0, node_test_1.it)("Dance order: Package Price ($850) and Payroll Base ($730) remain unchanged with coupon", () => {
            const result = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "pom",
                packageType: "CUSTOM POM",
                musicAffiliate: "Power Music Covers",
            });
            strict_1.default.equal(result.customerFacingPrice, 850);
            strict_1.default.equal(result.payrollBasePrice, 730);
        });
    });
    (0, node_test_1.describe)("Requirement 6: Payroll Must Ignore Coupon Codes ($0 Impact)", () => {
        (0, node_test_1.it)("Producer Payout is strictly calculated from base package payroll amount and is unaffected by coupon", () => {
            const packagePrice = 1000;
            const payrollBasePrice = 1000;
            // Without coupon
            const payNoCoupon = (0, pricing_display_1.computeClientPayroll)(mockProducer, packagePrice, { payroll_base_price: payrollBasePrice, customer_facing_price: packagePrice }, 80, null, "dance-jazz", payrollBasePrice);
            // With 10% coupon (display customer price = 900)
            const displayCustomerPrice = 900;
            const payWithCoupon = (0, pricing_display_1.computeClientPayroll)(mockProducer, displayCustomerPrice, { payroll_base_price: payrollBasePrice, customer_facing_price: packagePrice }, 80, null, "dance-jazz", payrollBasePrice // Payroll base MUST stay 1000
            );
            strict_1.default.equal(payNoCoupon.producerPayout, 800); // $1000 * 80% = $800
            strict_1.default.equal(payWithCoupon.producerPayout, 800); // $1000 * 80% = $800 ($0 coupon impact!)
        });
    });
    (0, node_test_1.describe)("Requirement 8: Combined End-to-End Test (Coupon + Voiceover + Rush Fee)", () => {
        (0, node_test_1.it)("Coupon does NOT alter Rush fee payout ($150) or Voiceover payout ($20)", () => {
            // Order with Package Price = 500, Rush Qty = 1 ($150), Dance Trad VO = $25 (80% -> $20 payout)
            // Total Payroll Base = 650
            const computed = (0, pricing_display_1.computeClientPayroll)(mockProducer, 650, { payroll_base_price: 650, customer_facing_price: 650 }, 80, null, "dance-jazz", 650, {
                rushFeeQuantity: 1,
                hasTraditionalVoiceover: true,
            });
            strict_1.default.equal(computed.voiceoverPayout, 20); // $25 * 80% = $20
            strict_1.default.equal(computed.rushFeePayout, 150); // $150 * 1 * 100% = $150
            // Base package payout: (650 - 150) * 80% = 400. Total payout = 400 + 150 + 20 = 570
            strict_1.default.equal(computed.producerPayout, 570);
        });
    });
});
