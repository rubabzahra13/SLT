"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const pricing_engine_1 = require("../pricing-engine");
const discount_codes_1 = require("../discount-codes");
(0, node_test_1.describe)("Discount Code Engine Unit Tests (Fixed & Percentage)", () => {
    const mockDiscountCodes = [
        (0, discount_codes_1.normalizeDiscountCode)({
            id: "disc-save200",
            code: "SAVE200",
            description: "Summer promotion",
            discountType: "fixed",
            discountValue: 200,
        }),
        (0, discount_codes_1.normalizeDiscountCode)({
            id: "disc-save10",
            code: "SAVE10",
            description: "10 percent off promotion",
            discountType: "percentage",
            discountValue: 10,
        }),
        (0, discount_codes_1.normalizeDiscountCode)({
            id: "disc-save20",
            code: "SAVE20",
            description: "20 percent off promotion",
            discountType: "percentage",
            discountValue: 20,
        }),
        (0, discount_codes_1.normalizeDiscountCode)({
            id: "disc-test10",
            code: "TEST10",
            description: "", // Blank optional description
            discountType: "percentage",
            discountValue: 10,
        }),
        (0, discount_codes_1.normalizeDiscountCode)({
            id: "disc-big500",
            code: "BIG500",
            description: "$500 off big discount",
            discountType: "fixed",
            discountValue: 500,
        }),
    ];
    (0, node_test_1.it)("Test 1 — Fixed Amount ($200 off $1,000)", () => {
        const matched = lookupCode("SAVE200", mockDiscountCodes);
        strict_1.default.ok(matched);
        const result = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "all-star-cheer",
            packageType: "PLATINUM 1:30", // Base customer: $1050, compliant base: $850, non-compliant base: $1050
            musicAffiliate: "Unapproved Affiliate", // Non-compliant -> pre-discount payroll base: $1050
            discountCodeObj: matched,
        });
        strict_1.default.equal(result.preDiscountPayrollBasePrice, 1050);
        strict_1.default.equal(result.discountAmount, 200);
        strict_1.default.equal(result.payrollBasePrice, 850); // $1050 - $200 = $850
    });
    (0, node_test_1.it)("Test 2 — Percentage (10% off $1,000)", () => {
        const matched = lookupCode("SAVE10", mockDiscountCodes);
        strict_1.default.ok(matched);
        const result = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "all-star-cheer",
            packageType: "GOLD 2:30", // Compliant payroll base: $1000
            musicAffiliate: "Power Music", // Compliant -> pre-discount payroll base: $1000
            discountCodeObj: matched,
        });
        strict_1.default.equal(result.preDiscountPayrollBasePrice, 1000);
        strict_1.default.equal(result.discountAmount, 100); // 10% of $1000 = $100
        strict_1.default.equal(result.payrollBasePrice, 900); // $1000 - $100 = $900
    });
    (0, node_test_1.it)("Test 3 — Percentage 20% (20% off $1,000)", () => {
        const matched = lookupCode("SAVE20", mockDiscountCodes);
        strict_1.default.ok(matched);
        const result = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "all-star-cheer",
            packageType: "GOLD 2:30", // Compliant payroll base: $1000
            musicAffiliate: "Power Music",
            discountCodeObj: matched,
        });
        strict_1.default.equal(result.preDiscountPayrollBasePrice, 1000);
        strict_1.default.equal(result.discountAmount, 200); // 20% of $1000 = $200
        strict_1.default.equal(result.payrollBasePrice, 800); // $1000 - $200 = $800
    });
    (0, node_test_1.it)("Test 4 — Optional Description (blank description creates & matches successfully)", () => {
        const matched = lookupCode("TEST10", mockDiscountCodes);
        strict_1.default.ok(matched);
        strict_1.default.equal(matched.description, "");
        const result = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "all-star-cheer",
            packageType: "GOLD 1:30", // Compliant payroll base: $600
            musicAffiliate: "Power Music",
            discountCodeObj: matched,
        });
        strict_1.default.equal(result.preDiscountPayrollBasePrice, 600);
        strict_1.default.equal(result.discountAmount, 60); // 10% of $600 = $60
        strict_1.default.equal(result.payrollBasePrice, 540); // $600 - $60 = $540
    });
    (0, node_test_1.it)("Test 5 — No Matching Code (unmatched code results in $0 discount)", () => {
        const evalRes = (0, discount_codes_1.evaluateCouponCode)("DOESNOTEXIST", mockDiscountCodes);
        strict_1.default.equal(evalRes.status, "invalid");
        const matched = evalRes.match ?? null;
        strict_1.default.equal(matched, null);
        const result = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "school-cheer-viroc-yes",
            packageType: "GOLD 2:00", // Payroll base: $850
            musicAffiliate: "Power Music",
            discountCodeObj: matched,
        });
        strict_1.default.equal(result.discountAmount, 0);
        strict_1.default.equal(result.payrollBasePrice, 850);
    });
    (0, node_test_1.it)("Test 6 — No Coupon Code (no coupon provided)", () => {
        const result = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "school-cheer-viroc-yes",
            packageType: "GOLD 2:00",
            musicAffiliate: "Power Music",
            discountCodeObj: null,
        });
        strict_1.default.equal(result.discountAmount, 0);
        strict_1.default.equal(result.payrollBasePrice, 850);
    });
    (0, node_test_1.it)("Test 7 — Existing Pricing Pipeline + Coupon (Package + Add-on + Coupon)", () => {
        const matched = lookupCode("SAVE200", mockDiscountCodes);
        strict_1.default.ok(matched);
        const result = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "school-cheer-viroc-yes",
            packageType: "GOLD 2:00", // Compliant base: $850
            musicAffiliate: "Power Music",
            hasRallyMix: true, // Rally Mix add-on: +$350 -> Pre-discount payroll base: $1200
            discountCodeObj: matched, // -$200 fixed
        });
        strict_1.default.equal(result.preDiscountPayrollBasePrice, 1200); // $850 + $350
        strict_1.default.equal(result.discountAmount, 200);
        strict_1.default.equal(result.payrollBasePrice, 1000); // $1200 - $200 = $1000
    });
    (0, node_test_1.it)("Test 8 — Price Floor Validation (Discount cannot produce negative price)", () => {
        const matched = lookupCode("BIG500", mockDiscountCodes);
        strict_1.default.ok(matched);
        const result = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "school-cheer-viroc-yes",
            packageType: "SILVER 1:00", // Compliant base: $350
            musicAffiliate: "Power Music",
            discountCodeObj: matched, // -$500 fixed
        });
        strict_1.default.equal(result.preDiscountPayrollBasePrice, 350);
        strict_1.default.equal(result.discountAmount, 350); // Capped at pre-discount price $350
        strict_1.default.equal(result.payrollBasePrice, 0); // Minimum $0 floor
    });
});
function lookupCode(code, list) {
    const res = (0, discount_codes_1.evaluateCouponCode)(code, list);
    return res.status === "valid" ? res.match ?? null : null;
}
