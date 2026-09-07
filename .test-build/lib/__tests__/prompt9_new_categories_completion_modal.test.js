"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const pricing_engine_1 = require("../pricing-engine");
const discount_codes_1 = require("../discount-codes");
const mockDiscountCodes = [
    { id: "1", code: "SAVE50", discountType: "fixed", discountValue: 50, description: "$50 Off" },
    { id: "2", code: "PROMO10", discountType: "percentage", discountValue: 10, description: "10% Off" },
];
(0, node_test_1.describe)("Prompt 9 — New Categories Completion Modal Pricing & Coupon Integration", () => {
    (0, node_test_1.describe)("Marching Band Completion Pricing Breakdown", () => {
        (0, node_test_1.it)("calculates Marching Band itemized breakdown with both add-ons active and coupon", () => {
            const result = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
                packageType: "BAND CHANT",
                musicAffiliate: "",
                hasSheetMusicAdd: true,
                hasAddVocals: true,
            });
            strict_1.default.equal(result.matchedEntry?.package, "BAND CHANT");
            strict_1.default.equal(result.matchedEntry?.customer, 600);
            strict_1.default.equal(result.customerFacingPrice, 600 + 50 + 75); // $725
            strict_1.default.equal(result.complianceStatus, "unknown-no-affiliate-field");
            // Wire coupon code
            const couponEval = (0, discount_codes_1.evaluateCouponCode)("SAVE50", mockDiscountCodes);
            strict_1.default.equal(couponEval.status, "valid");
            strict_1.default.equal(couponEval.match?.discountValue, 50);
            const discountAmount = couponEval.match?.discountValue || 0;
            const finalCustPrice = Math.max(0, result.customerFacingPrice - discountAmount);
            strict_1.default.equal(finalCustPrice, 675);
        });
        (0, node_test_1.it)("surfaces explicit unknown-no-affiliate-field state for Band Chant and Drum Cadence", () => {
            const bc = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({ packageType: "BAND CHANT" });
            strict_1.default.equal(bc.complianceStatus, "unknown-no-affiliate-field");
            const dc = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({ packageType: "DRUM CADENCE ORIGINAL" });
            strict_1.default.equal(dc.complianceStatus, "unknown-no-affiliate-field");
        });
    });
    (0, node_test_1.describe)("Sports Entertainment Completion Pricing & OTHER TBD Handling", () => {
        (0, node_test_1.it)("calculates Sports Entertainment itemized breakdown with Rush active", () => {
            const result = (0, pricing_engine_1.calculateSportsEntertainmentOrderPricing)({
                packageType: "PRE-GAME / HALFTIME REMIXED",
                isRushOrder: "yes",
            });
            strict_1.default.equal(result.matchedEntry?.customer, 250);
            strict_1.default.equal(result.hasRushFee, true);
            strict_1.default.equal(result.rushFeeAmount, 100);
            strict_1.default.equal(result.customerFacingPrice, 350);
            strict_1.default.equal(result.isUnpriced, false);
            strict_1.default.equal(result.needsManualQuote, false);
        });
        (0, node_test_1.it)("blocks automatic pricing for OTHER (mixes > 2:30) package", () => {
            const result = (0, pricing_engine_1.calculateSportsEntertainmentOrderPricing)({
                packageType: "OTHER (mixes longer than 2:30)",
                isRushOrder: "no",
            });
            strict_1.default.equal(result.isUnpriced, true);
            strict_1.default.equal(result.needsManualQuote, true);
            strict_1.default.equal(result.customerFacingPrice, null);
            strict_1.default.equal(result.payrollBasePrice, null);
        });
    });
    (0, node_test_1.describe)("School Anthems Completion Pricing & Coupon", () => {
        (0, node_test_1.it)("calculates School Anthems flat $1,250 price and applies coupon", () => {
            const result = (0, pricing_engine_1.calculateSchoolAnthemOrderPricing)({
                packageType: "SCHOOL ANTHEMS",
            });
            strict_1.default.equal(result.customerFacingPrice, 1250);
            strict_1.default.equal(result.payrollBasePrice, 1250);
            const couponEval = (0, discount_codes_1.evaluateCouponCode)("PROMO10", mockDiscountCodes);
            strict_1.default.equal(couponEval.status, "valid");
            const discountPct = couponEval.match?.discountValue || 0;
            const discountAmount = Math.round(result.payrollBasePrice * (discountPct / 100));
            strict_1.default.equal(discountAmount, 125);
            const finalPrice = result.customerFacingPrice - discountAmount;
            strict_1.default.equal(finalPrice, 1125);
        });
    });
});
