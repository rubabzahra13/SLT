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
    (0, node_test_1.it)("Marching Band demo orders: Customer prices match base rate card package price", () => {
        for (const order of new_categories_demo_orders_1.MARCHING_BAND_DEMO_ORDERS) {
            const pricing = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
                packageType: order.packageType || order.package,
                hasSheetMusicAdd: order.hasSheetMusicAdd,
                hasAddVocals: order.hasAddVocals,
            });
            strict_1.default.equal(pricing.customerFacingPrice, pricing.matchedEntry?.customer ?? order.price);
        }
    });
    (0, node_test_1.it)("Sports Entertainment demo orders: 9 priced orders match base rate card, 10th order returns explicit unpriced state", () => {
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
                strict_1.default.equal(pricing.customerFacingPrice, pricing.matchedEntry?.customer);
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
    (0, node_test_1.it)("Marching Band Interactive Add-on Toggles: Package Price remains $600 while Payroll Base recalculates", () => {
        const baseOrder = new_categories_demo_orders_1.MARCHING_BAND_DEMO_ORDERS.find((o) => o.packageType === "BAND CHANT");
        const baseRes = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
            packageType: baseOrder.packageType,
            hasSheetMusicAdd: false,
            hasAddVocals: false,
        });
        strict_1.default.equal(baseRes.customerFacingPrice, 600);
        strict_1.default.equal(baseRes.payrollBasePrice, 600);
        const sheetMusicRes = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
            packageType: baseOrder.packageType,
            hasSheetMusicAdd: true,
            hasAddVocals: false,
        });
        strict_1.default.equal(sheetMusicRes.customerFacingPrice, 600);
        strict_1.default.equal(sheetMusicRes.payrollBasePrice, 650);
        const vocalsRes = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
            packageType: baseOrder.packageType,
            hasSheetMusicAdd: false,
            hasAddVocals: true,
        });
        strict_1.default.equal(vocalsRes.customerFacingPrice, 600);
        strict_1.default.equal(vocalsRes.payrollBasePrice, 675);
        const bothRes = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
            packageType: baseOrder.packageType,
            hasSheetMusicAdd: true,
            hasAddVocals: true,
        });
        strict_1.default.equal(bothRes.customerFacingPrice, 600);
        strict_1.default.equal(bothRes.payrollBasePrice, 725);
    });
    (0, node_test_1.it)("Sports Entertainment Interactive Rush Order Toggle: Package Price remains $150 while Payroll Base recalculates", () => {
        const baseOrder = new_categories_demo_orders_1.SPORTS_ENTERTAINMENT_DEMO_ORDERS.find((o) => o.packageType === "QUARTER BREAK / TIMEOUT REMIXED");
        const noRushRes = (0, pricing_engine_1.calculateSportsEntertainmentOrderPricing)({
            packageType: baseOrder.packageType,
            isRushOrder: "no",
        });
        strict_1.default.equal(noRushRes.customerFacingPrice, 150);
        strict_1.default.equal(noRushRes.payrollBasePrice, 150);
        const rushRes = (0, pricing_engine_1.calculateSportsEntertainmentOrderPricing)({
            packageType: baseOrder.packageType,
            isRushOrder: "yes",
        });
        strict_1.default.equal(rushRes.customerFacingPrice, 150);
        strict_1.default.equal(rushRes.payrollBasePrice, 300);
    });
});
