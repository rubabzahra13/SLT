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
(0, node_test_1.describe)("Prompt 11 — Completion Modal Pricing Breakdown + Coupon Integration", () => {
    const mockDiscountCodes = [
        { id: "disc-1", code: "DEMO 2026", description: "Demo showcase discount for new teams" },
        { id: "disc-2", code: "SUMMER25", description: "Summer 2025 seasonal promotion" },
        { id: "disc-3", code: "RETURN10", description: "Returning customer loyalty code" },
        { id: "disc-4", code: "VIROC2026", description: "VIROC Partner Special 2026" },
        { id: "disc-5", code: "AUSTIN2026", description: "Austin Regional Special" },
        { id: "disc-6", code: "YOUTH10", description: "Youth Rec Cheer 10% Discount" },
    ];
    (0, node_test_1.it)("Subtype 1 (All-Star Cheer): GOLD 1:30 ($700) + coupon AUSTIN2026", () => {
        const order = cheer_demo_orders_1.CHEER_DEMO_ORDERS.find((o) => o.cheerFormSubtype === "all-star-cheer");
        strict_1.default.ok(order);
        strict_1.default.equal(order.cheerFormSubtype, "all-star-cheer");
        const pricing = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: order.cheerFormSubtype,
            packageType: order.packageType,
            timeLengthOfMix: order.timeLengthOfMix,
            musicAffiliate: order.musicAffiliate,
        });
        const couponEval = (0, discount_codes_1.evaluateCouponCode)(order.couponCode || "", mockDiscountCodes);
        strict_1.default.equal(pricing.customerFacingPrice, 700);
        strict_1.default.equal(pricing.payrollBasePrice, 600);
        strict_1.default.equal(pricing.complianceStatus, "compliant");
        strict_1.default.equal(couponEval.status, "valid");
        strict_1.default.equal(couponEval.match?.code, "AUSTIN2026");
    });
    (0, node_test_1.it)("Subtype 2 (School Cheer viroc Yes): Rally Mix package = $350 customer / $350 payroll", () => {
        const pricing = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: "school-cheer-viroc-yes",
            packageType: "Rally Mix",
            musicAffiliate: "Power Music",
        });
        strict_1.default.equal(pricing.customerFacingPrice, 350);
        strict_1.default.equal(pricing.payrollBasePrice, 350);
        strict_1.default.equal(pricing.complianceStatus, "compliant");
    });
    (0, node_test_1.it)("Subtype 3 (School Cheer VIROC No): SILVER 1:00 ($450)", () => {
        const order = cheer_demo_orders_1.CHEER_DEMO_ORDERS.find((o) => o.id === "ord-demo-cheer-21");
        strict_1.default.ok(order);
        strict_1.default.equal(order.cheerFormSubtype, "school-cheer-viroc-no");
        const pricing = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: order.cheerFormSubtype,
            packageType: order.packageType,
            timeLengthOfMix: order.timeLengthOfMix,
            musicAffiliate: order.musicAffiliate,
        });
        strict_1.default.equal(pricing.customerFacingPrice, 450);
        strict_1.default.equal(pricing.payrollBasePrice, 350);
    });
    (0, node_test_1.it)("Subtype 4 (Youth Rec Cheer): BRONZE 1:00 ($450) + Extend-8ct ($25) + Process-8ct ($50) = $450 customer / $425 payroll", () => {
        const order = cheer_demo_orders_1.CHEER_DEMO_ORDERS.find((o) => o.id === "ord-demo-cheer-31");
        strict_1.default.ok(order);
        strict_1.default.equal(order.cheerFormSubtype, "youth-rec-cheer");
        const pricing = (0, pricing_engine_1.calculateCheerOrderPricing)({
            cheerFormSubtype: order.cheerFormSubtype,
            packageType: order.packageType,
            timeLengthOfMix: order.timeLengthOfMix,
            hasExtend8ctAddon: true,
            hasProcessing8ctSheetsAddon: true,
        });
        strict_1.default.equal(pricing.customerFacingPrice, 450); // 450 base (add-ons are separate)
        strict_1.default.equal(pricing.payrollBasePrice, 425); // 350 + 25 + 50
    });
});
