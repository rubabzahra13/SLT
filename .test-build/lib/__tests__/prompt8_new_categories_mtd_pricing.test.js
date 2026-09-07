"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const new_categories_demo_orders_1 = require("../../data/new-categories-demo-orders");
const pricing_engine_1 = require("../pricing-engine");
(0, node_test_1.describe)("Prompt 8 — Connect All Three Categories' Pricing to MTD", () => {
    (0, node_test_1.it)("Marching Band demo orders: Customer prices match engine calculations", () => {
        for (const order of new_categories_demo_orders_1.MARCHING_BAND_DEMO_ORDERS) {
            const pricing = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
                packageType: order.packageType || order.package,
                hasSheetMusicAdd: order.hasSheetMusicAdd,
                hasAddVocals: order.hasAddVocals,
            });
            strict_1.default.equal(pricing.customerFacingPrice, order.price);
        }
    });
    (0, node_test_1.it)("Sports Entertainment demo orders: 9 priced orders match rate card + rush fee, 10th order returns explicit unpriced state", () => {
        for (const order of new_categories_demo_orders_1.SPORTS_ENTERTAINMENT_DEMO_ORDERS) {
            const pricing = (0, pricing_engine_1.calculateSportsEntertainmentOrderPricing)({
                packageType: order.packageType || order.package,
                isRushOrder: order.isRushOrder,
            });
            if (order.id === "ord-demo-se-10") {
                strict_1.default.equal(pricing.isUnpriced, true);
                strict_1.default.equal(pricing.needsManualQuote, true);
                strict_1.default.equal(pricing.customerFacingPrice, null);
            }
            else {
                strict_1.default.equal(pricing.isUnpriced, false);
                strict_1.default.equal(pricing.customerFacingPrice, order.price);
            }
        }
    });
    (0, node_test_1.it)("School Anthems demo orders: All 10 orders return customerFacingPrice = 1250", () => {
        for (const order of new_categories_demo_orders_1.SCHOOL_ANTHEMS_DEMO_ORDERS) {
            const pricing = (0, pricing_engine_1.calculateSchoolAnthemOrderPricing)({
                packageType: order.packageType || order.package,
            });
            strict_1.default.equal(pricing.customerFacingPrice, 1250);
            strict_1.default.equal(order.price, 1250);
        }
    });
    (0, node_test_1.it)("Marching Band Interactive Add-on Toggles: live price recalculation", () => {
        const baseOrder = new_categories_demo_orders_1.MARCHING_BAND_DEMO_ORDERS.find((o) => o.packageType === "BAND CHANT");
        const basePrice = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
            packageType: baseOrder.packageType,
            hasSheetMusicAdd: false,
            hasAddVocals: false,
        }).customerFacingPrice;
        strict_1.default.equal(basePrice, 600);
        const sheetMusicPrice = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
            packageType: baseOrder.packageType,
            hasSheetMusicAdd: true,
            hasAddVocals: false,
        }).customerFacingPrice;
        strict_1.default.equal(sheetMusicPrice, 650);
        const vocalsPrice = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
            packageType: baseOrder.packageType,
            hasSheetMusicAdd: false,
            hasAddVocals: true,
        }).customerFacingPrice;
        strict_1.default.equal(vocalsPrice, 675);
        const bothPrice = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
            packageType: baseOrder.packageType,
            hasSheetMusicAdd: true,
            hasAddVocals: true,
        }).customerFacingPrice;
        strict_1.default.equal(bothPrice, 725);
    });
    (0, node_test_1.it)("Sports Entertainment Interactive Rush Order Toggle: live price recalculation", () => {
        const baseOrder = new_categories_demo_orders_1.SPORTS_ENTERTAINMENT_DEMO_ORDERS.find((o) => o.packageType === "QUARTER BREAK / TIMEOUT REMIXED");
        const noRushPrice = (0, pricing_engine_1.calculateSportsEntertainmentOrderPricing)({
            packageType: baseOrder.packageType,
            isRushOrder: "no",
        }).customerFacingPrice;
        strict_1.default.equal(noRushPrice, 150);
        const rushPrice = (0, pricing_engine_1.calculateSportsEntertainmentOrderPricing)({
            packageType: baseOrder.packageType,
            isRushOrder: "yes",
        }).customerFacingPrice;
        strict_1.default.equal(rushPrice, 250);
    });
});
