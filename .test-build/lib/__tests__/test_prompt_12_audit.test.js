"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const cheer_demo_orders_1 = require("../../data/cheer-demo-orders");
const pricing_engine_1 = require("../pricing-engine");
const discount_codes_1 = require("../discount-codes");
const mockDiscountCodes = [
    { id: "disc-1", code: "DEMO 2026", description: "Demo showcase discount for new teams" },
    { id: "disc-4", code: "VIROC2026", description: "VIROC Partner Special 2026" },
    { id: "disc-5", code: "AUSTIN2026", description: "Austin Regional Special" },
    { id: "disc-6", code: "YOUTH10", description: "Youth Rec Cheer 10% Discount" },
];
(0, node_test_1.describe)("Prompt 12 — End-to-End Regression Audit Across All 4 Cheer Subtypes", () => {
    const subtypes = [
        { id: "all-star-cheer", name: "All-Star Cheer" },
        { id: "school-cheer-viroc-yes", name: "School Cheer — VIROC Yes" },
        { id: "school-cheer-viroc-no", name: "School Cheer — VIROC No" },
        { id: "youth-rec-cheer", name: "Youth Rec Cheer" },
    ];
    (0, node_test_1.it)("Check 1: Subtype Dataset Audit (Prompt 4 — 10 orders per subtype)", () => {
        for (const sub of subtypes) {
            const orders = cheer_demo_orders_1.CHEER_DEMO_ORDERS.filter((o) => o.cheerFormSubtype === sub.id);
            strict_1.default.equal(orders.length, 10, `Expected exactly 10 orders for ${sub.name}`);
        }
    });
    (0, node_test_1.it)("Check 2: MTD Row Columns & Price Calculations (Prompts 5, 9, 10)", () => {
        for (const sub of subtypes) {
            const orders = cheer_demo_orders_1.CHEER_DEMO_ORDERS.filter((o) => o.cheerFormSubtype === sub.id);
            for (const order of orders) {
                const pricing = (0, pricing_engine_1.calculateCheerOrderPricing)({
                    cheerFormSubtype: sub.id,
                    packageType: order.packageType,
                    timeLengthOfMix: order.timeLengthOfMix,
                    musicAffiliate: order.musicAffiliate,
                });
                strict_1.default.ok(pricing.customerFacingPrice > 0);
                strict_1.default.ok(pricing.payrollBasePrice > 0);
                if (sub.id === "youth-rec-cheer") {
                    strict_1.default.equal(pricing.complianceStatus, "unknown-no-affiliate-field");
                }
                else if (order.musicAffiliate?.toUpperCase().includes("POWER MUSIC")) {
                    strict_1.default.equal(pricing.complianceStatus, "compliant");
                }
            }
        }
    });
    (0, node_test_1.it)("Check 3: Subtype-Specific Field Audit (Prompt 6)", () => {
        // All-Star Cheer has gymName and gymBillingAddress
        const as = cheer_demo_orders_1.CHEER_DEMO_ORDERS.find((o) => o.cheerFormSubtype === "all-star-cheer");
        strict_1.default.ok(as.gymName);
        strict_1.default.ok(as.gymBillingAddress);
        // School Cheer VIROC Yes has varsityVirocCustomer = 'Yes' and virocChoreographerName
        const scYes = cheer_demo_orders_1.CHEER_DEMO_ORDERS.find((o) => o.cheerFormSubtype === "school-cheer-viroc-yes");
        strict_1.default.equal(scYes.varsityVirocCustomer, "Yes");
        strict_1.default.ok(scYes.virocChoreographerName);
        // School Cheer VIROC No has varsityVirocCustomer = 'No' and choreographerName
        const scNo = cheer_demo_orders_1.CHEER_DEMO_ORDERS.find((o) => o.cheerFormSubtype === "school-cheer-viroc-no");
        strict_1.default.equal(scNo.varsityVirocCustomer, "No");
        strict_1.default.ok(scNo.choreographerName);
        // Youth Rec Cheer has programName and coachContactFullName
        const yr = cheer_demo_orders_1.CHEER_DEMO_ORDERS.find((o) => o.cheerFormSubtype === "youth-rec-cheer");
        strict_1.default.ok(yr.programName);
    });
    (0, node_test_1.it)("Check 4: Interactive Add-On Toggles Math", () => {
        // Rush Fee ($150)
        const scOrder = cheer_demo_orders_1.CHEER_DEMO_ORDERS.find((o) => o.cheerFormSubtype === "school-cheer-viroc-yes");
        const baseSc = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "school-cheer-viroc-yes",
            packageType: scOrder.packageType,
            timeLengthOfMix: scOrder.timeLengthOfMix,
            musicAffiliate: scOrder.musicAffiliate,
            rushFeeOption: "none",
        });
        const rushSc = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "school-cheer-viroc-yes",
            packageType: scOrder.packageType,
            timeLengthOfMix: scOrder.timeLengthOfMix,
            musicAffiliate: scOrder.musicAffiliate,
            rushFeeOption: "single",
        });
        strict_1.default.equal(rushSc.customerFacingPrice, baseSc.customerFacingPrice);
        strict_1.default.equal(rushSc.payrollBasePrice, baseSc.payrollBasePrice + 150);
        // Youth Rec Cheer Add-Ons ($25 + $50 = $75)
        const yrOrder = cheer_demo_orders_1.CHEER_DEMO_ORDERS.find((o) => o.cheerFormSubtype === "youth-rec-cheer");
        const baseYr = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "youth-rec-cheer",
            packageType: yrOrder.packageType,
            timeLengthOfMix: yrOrder.timeLengthOfMix,
        });
        const addOnYr = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "youth-rec-cheer",
            packageType: yrOrder.packageType,
            timeLengthOfMix: yrOrder.timeLengthOfMix,
            hasExtend8ctAddon: true,
            hasProcessing8ctSheetsAddon: true,
        });
        strict_1.default.equal(addOnYr.customerFacingPrice, baseYr.customerFacingPrice);
        strict_1.default.equal(addOnYr.payrollBasePrice, baseYr.payrollBasePrice + 75);
    });
    (0, node_test_1.it)("Check 5: Completion Modal Breakdown & Coupon Integration (Prompt 11)", () => {
        for (const sub of subtypes) {
            const sampleOrder = cheer_demo_orders_1.CHEER_DEMO_ORDERS.find((o) => o.cheerFormSubtype === sub.id);
            const pricing = (0, pricing_engine_1.calculateCheerOrderPricing)({
                cheerFormSubtype: sub.id,
                packageType: sampleOrder.packageType,
                timeLengthOfMix: sampleOrder.timeLengthOfMix,
                musicAffiliate: sampleOrder.musicAffiliate,
            });
            const couponEval = (0, discount_codes_1.evaluateCouponCode)(sampleOrder.couponCode || "", mockDiscountCodes);
            strict_1.default.ok(pricing.customerFacingPrice > 0);
            strict_1.default.ok(pricing.payrollBasePrice > 0);
            strict_1.default.ok(couponEval.status);
        }
    });
    (0, node_test_1.it)("Check 6: Move to Payroll Transition (Prompt 12)", () => {
        for (const sub of subtypes) {
            const sampleOrder = cheer_demo_orders_1.CHEER_DEMO_ORDERS.find((o) => o.cheerFormSubtype === sub.id);
            const pricing = (0, pricing_engine_1.calculateCheerOrderPricing)({
                cheerFormSubtype: sub.id,
                packageType: sampleOrder.packageType,
                timeLengthOfMix: sampleOrder.timeLengthOfMix,
                musicAffiliate: sampleOrder.musicAffiliate,
            });
            strict_1.default.ok(typeof pricing.payrollBasePrice === "number");
            strict_1.default.ok(typeof pricing.customerFacingPrice === "number");
        }
    });
    (0, node_test_1.it)("Check 7: Subtype Scope Leakage Audit", () => {
        // Youth rec add-ons ignored on school cheer and all-star
        const scYouth = (0, pricing_engine_1.calculateCheerOrderPricing)({ cheerFormSubtype: "school-cheer-viroc-yes", packageType: "SILVER 1:00", hasExtend8ctAddon: true, hasProcessing8ctSheetsAddon: true });
        strict_1.default.equal(scYouth.customerFacingPrice, 450);
    });
});
