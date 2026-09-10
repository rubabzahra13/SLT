"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const pricing_engine_1 = require("../pricing-engine");
(0, node_test_1.describe)("Prompt 6 — Sports Entertainment Pricing Engine Unit Tests", () => {
    (0, node_test_1.it)("Rate Card completeness: contains all 3 Sports Entertainment packages", () => {
        strict_1.default.equal(pricing_engine_1.SPORTS_ENTERTAINMENT_RATE_CARD.length, 3);
        strict_1.default.deepEqual(pricing_engine_1.SPORTS_ENTERTAINMENT_RATE_CARD.map((e) => e.package), [
            "QUARTER BREAK / TIMEOUT REMIXED",
            "PRE-GAME / HALFTIME REMIXED",
            "OTHER (mixes longer than 2:30)",
        ]);
    });
    (0, node_test_1.it)("QUARTER BREAK / TIMEOUT REMIXED with rush = no: customerFacingPrice = 150, payrollBasePrice = 150", () => {
        const res = (0, pricing_engine_1.calculateSportsEntertainmentOrderPricing)({
            packageType: "QUARTER BREAK / TIMEOUT REMIXED",
            isRushOrder: "no",
        });
        strict_1.default.equal(res.isUnpriced, false);
        strict_1.default.equal(res.needsManualQuote, false);
        strict_1.default.equal(res.customerFacingPrice, 150);
        strict_1.default.equal(res.payrollBasePrice, 150);
        strict_1.default.equal(res.hasRushFee, false);
        strict_1.default.equal(res.rushFeeAmount, 0);
    });
    (0, node_test_1.it)("QUARTER BREAK / TIMEOUT REMIXED with rush = yes: customerFacingPrice = 150 (base), payrollBasePrice = 300 ($150 + $150)", () => {
        const res = (0, pricing_engine_1.calculateSportsEntertainmentOrderPricing)({
            packageType: "QUARTER BREAK / TIMEOUT REMIXED",
            isRushOrder: "yes",
        });
        strict_1.default.equal(res.customerFacingPrice, 150);
        strict_1.default.equal(res.payrollBasePrice, 300);
        strict_1.default.equal(res.hasRushFee, true);
        strict_1.default.equal(res.rushFeeAmount, 150);
    });
    (0, node_test_1.it)("PRE-GAME / HALFTIME REMIXED with rush = no: customerFacingPrice = 250", () => {
        const res = (0, pricing_engine_1.calculateSportsEntertainmentOrderPricing)({
            packageType: "PRE-GAME / HALFTIME REMIXED",
            isRushOrder: "no",
        });
        strict_1.default.equal(res.customerFacingPrice, 250);
        strict_1.default.equal(res.payrollBasePrice, 250);
        strict_1.default.equal(res.hasRushFee, false);
    });
    (0, node_test_1.it)("PRE-GAME / HALFTIME REMIXED with rush = yes: customerFacingPrice = 250 (base), payrollBasePrice = 400 ($250 + $150)", () => {
        const res = (0, pricing_engine_1.calculateSportsEntertainmentOrderPricing)({
            packageType: "PRE-GAME / HALFTIME REMIXED",
            isRushOrder: "yes",
        });
        strict_1.default.equal(res.customerFacingPrice, 250);
        strict_1.default.equal(res.payrollBasePrice, 400);
        strict_1.default.equal(res.hasRushFee, true);
        strict_1.default.equal(res.rushFeeAmount, 150);
    });
    (0, node_test_1.it)("OTHER (mixes longer than 2:30): returns explicit unpriced state (customerFacingPrice = null)", () => {
        const res = (0, pricing_engine_1.calculateSportsEntertainmentOrderPricing)({
            packageType: "OTHER (mixes longer than 2:30)",
            isRushOrder: "no",
        });
        strict_1.default.equal(res.isUnpriced, true);
        strict_1.default.equal(res.needsManualQuote, true);
        strict_1.default.equal(res.customerFacingPrice, null);
        strict_1.default.equal(res.payrollBasePrice, null);
        strict_1.default.notEqual(res.matchedEntry, null);
        // Verify calling code trying to format or check numeric price safe-guards
        const priceDisplay = res.isUnpriced ? "TBD (Manual Quote)" : `$${res.customerFacingPrice}`;
        strict_1.default.equal(priceDisplay, "TBD (Manual Quote)");
    });
    (0, node_test_1.it)("Rush fee handles string 'yes', boolean true, and uppercase 'YES'", () => {
        const resBool = (0, pricing_engine_1.calculateSportsEntertainmentOrderPricing)({
            packageType: "PRE-GAME / HALFTIME REMIXED",
            isRushOrder: true,
        });
        strict_1.default.equal(resBool.customerFacingPrice, 250);
        strict_1.default.equal(resBool.payrollBasePrice, 400);
        const resUpper = (0, pricing_engine_1.calculateSportsEntertainmentOrderPricing)({
            packageType: "PRE-GAME / HALFTIME REMIXED",
            isRushOrder: "YES",
        });
        strict_1.default.equal(resUpper.customerFacingPrice, 250);
        strict_1.default.equal(resUpper.payrollBasePrice, 400);
    });
});
