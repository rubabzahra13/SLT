"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const pricing_engine_1 = require("../pricing-engine");
const new_categories_demo_orders_1 = require("../../data/new-categories-demo-orders");
(0, node_test_1.describe)("Prompt 7 — School Anthems Pricing Engine Unit Tests", () => {
    (0, node_test_1.it)("Rate Card completeness: contains single SCHOOL ANTHEMS package at $1,250", () => {
        strict_1.default.equal(pricing_engine_1.SCHOOL_ANTHEM_RATE_CARD.length, 1);
        strict_1.default.equal(pricing_engine_1.SCHOOL_ANTHEM_RATE_CARD[0].package, "SCHOOL ANTHEMS");
        strict_1.default.equal(pricing_engine_1.SCHOOL_ANTHEM_RATE_CARD[0].customer, 1250);
        strict_1.default.equal(pricing_engine_1.SCHOOL_ANTHEM_RATE_CARD[0].compliant, 1250);
        strict_1.default.equal(pricing_engine_1.SCHOOL_ANTHEM_RATE_CARD[0].nonCompliant, 1250);
    });
    (0, node_test_1.it)("Default calculation: returns customerFacingPrice = 1250, payrollBasePrice = 1250 unconditionally", () => {
        const res = (0, pricing_engine_1.calculateSchoolAnthemOrderPricing)();
        strict_1.default.equal(res.customerFacingPrice, 1250);
        strict_1.default.equal(res.payrollBasePrice, 1250);
        strict_1.default.equal(res.compliantPayrollBasePrice, 1250);
        strict_1.default.equal(res.nonCompliantPayrollBasePrice, 1250);
        strict_1.default.equal(res.packageName, "SCHOOL ANTHEMS");
    });
    (0, node_test_1.it)("Lookup with arbitrary string input still returns the single SCHOOL ANTHEMS package ($1,250)", () => {
        const entry = (0, pricing_engine_1.lookupSchoolAnthemRateCardEntry)("ANY RANDOM PACKAGE STRING");
        strict_1.default.equal(entry.package, "SCHOOL ANTHEMS");
        strict_1.default.equal(entry.customer, 1250);
        const res = (0, pricing_engine_1.calculateSchoolAnthemOrderPricing)({
            packageType: "ANY RANDOM PACKAGE STRING",
        });
        strict_1.default.equal(res.customerFacingPrice, 1250);
        strict_1.default.equal(res.payrollBasePrice, 1250);
    });
    (0, node_test_1.it)("All 10 demo orders evaluate to exactly $1,250", () => {
        for (const order of new_categories_demo_orders_1.SCHOOL_ANTHEMS_DEMO_ORDERS) {
            const res = (0, pricing_engine_1.calculateSchoolAnthemOrderPricing)({
                packageType: order.packageType || order.package,
            });
            strict_1.default.equal(res.customerFacingPrice, 1250);
            strict_1.default.equal(res.payrollBasePrice, 1250);
        }
    });
});
