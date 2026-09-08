"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const new_categories_demo_orders_1 = require("../../data/new-categories-demo-orders");
const pricing_engine_1 = require("../pricing-engine");
const discount_codes_1 = require("../discount-codes");
const mtd_filters_1 = require("../mtd-filters");
const mtd_completion_1 = require("../mtd-completion");
const mockDiscountCodes = [
    { id: "1", code: "SAVE50", discountType: "fixed", discountValue: 50, description: "$50 Off" },
    { id: "2", code: "PROMO10", discountType: "percentage", discountValue: 10, description: "10% Off" },
];
(0, node_test_1.describe)("Prompt 11 — Full End-to-End QA and Regression Audit", () => {
    const orderMap = new Map();
    for (const o of new_categories_demo_orders_1.NEW_CATEGORIES_DEMO_ORDERS) {
        if (o.id)
            orderMap.set(o.id, o);
    }
    (0, node_test_1.describe)("Part 1: End-to-End QA for Marching Band", () => {
        (0, node_test_1.it)("1.1 Filtering: returns only Marching Band orders when form = marching-band", () => {
            const mbRecords = (0, mtd_filters_1.filterMTDRecords)(new_categories_demo_orders_1.NEW_CATEGORIES_DEMO_MTD_RECORDS, {
                form: "marching-band",
                orderById: orderMap,
            });
            strict_1.default.equal(mbRecords.length, 10);
            for (const rec of mbRecords) {
                strict_1.default.equal(rec.category, "Marching Band");
            }
        });
        (0, node_test_1.it)("1.2 MTD Pricing & Add-on Math: BAND CHANT ($600) + Sheet Music ($50) + Vocals ($75) = $600 Package Price / $725 Payroll Base", () => {
            const result = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
                packageType: "BAND CHANT",
                hasSheetMusicAdd: true,
                hasAddVocals: true,
            });
            strict_1.default.equal(result.customerFacingPrice, 600);
            strict_1.default.equal(result.payrollBasePrice, 725); // $600 non-compliant base (no affiliate) + $125 add-ons
        });
        (0, node_test_1.it)("1.3 Compliance: Surfaces unknown-no-affiliate-field state plainly for Band Chant & Drum Cadence", () => {
            const bc = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({ packageType: "BAND CHANT" });
            strict_1.default.equal(bc.complianceStatus, "unknown-no-affiliate-field");
            const dc = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({ packageType: "DRUM CADENCE ORIGINAL" });
            strict_1.default.equal(dc.complianceStatus, "unknown-no-affiliate-field");
        });
        (0, node_test_1.it)("1.4 Completion Modal & Coupon: Applies SAVE50 ($50 off) to $600 -> $550 final customer price", () => {
            const result = (0, pricing_engine_1.calculateMarchingBandOrderPricing)({
                packageType: "BAND CHANT",
                hasSheetMusicAdd: true,
                hasAddVocals: true,
            });
            const couponEval = (0, discount_codes_1.evaluateCouponCode)("SAVE50", mockDiscountCodes);
            strict_1.default.equal(couponEval.status, "valid");
            const discount = couponEval.match?.discountValue || 0;
            const finalPrice = result.customerFacingPrice - discount;
            strict_1.default.equal(finalPrice, 550);
        });
        (0, node_test_1.it)("1.5 Payroll Transition: Moves to Payroll with $550 customer price", () => {
            const completedRec = {
                ...new_categories_demo_orders_1.NEW_CATEGORIES_DEMO_MTD_RECORDS[0],
                inPayroll: true,
                status: "completed",
                finalCustomerPrice: 550,
                producerPayout: 270,
            };
            const payrollRecords = (0, mtd_completion_1.getPayrollRecords)([completedRec]);
            strict_1.default.equal(payrollRecords.length, 1);
            strict_1.default.equal(payrollRecords[0].finalCustomerPrice, 550);
        });
    });
    (0, node_test_1.describe)("Part 2: End-to-End QA for Sports Entertainment", () => {
        (0, node_test_1.it)("2.1 Filtering: returns only Sports Entertainment orders when form = sports-entertainment", () => {
            const seRecords = (0, mtd_filters_1.filterMTDRecords)(new_categories_demo_orders_1.NEW_CATEGORIES_DEMO_MTD_RECORDS, {
                form: "sports-entertainment",
                orderById: orderMap,
            });
            strict_1.default.equal(seRecords.length, 10);
            for (const rec of seRecords) {
                strict_1.default.equal(rec.category, "Sports Entertainment");
            }
        });
        (0, node_test_1.it)("2.2 MTD Pricing & Rush Toggle: PRE-GAME / HALFTIME REMIXED ($250) + Rush ($100) = $250 Package Price / $350 Payroll Base", () => {
            const result = (0, pricing_engine_1.calculateSportsEntertainmentOrderPricing)({
                packageType: "PRE-GAME / HALFTIME REMIXED",
                isRushOrder: "yes",
            });
            strict_1.default.equal(result.customerFacingPrice, 250);
            strict_1.default.equal(result.payrollBasePrice, 350);
            strict_1.default.equal(result.hasRushFee, true);
        });
        (0, node_test_1.it)("2.3 OTHER TBD Package: blocks automatic pricing, returns isUnpriced = true and null customer price", () => {
            const result = (0, pricing_engine_1.calculateSportsEntertainmentOrderPricing)({
                packageType: "OTHER (mixes longer than 2:30)",
            });
            strict_1.default.equal(result.isUnpriced, true);
            strict_1.default.equal(result.needsManualQuote, true);
            strict_1.default.equal(result.customerFacingPrice, null);
            strict_1.default.equal(result.payrollBasePrice, null);
        });
        (0, node_test_1.it)("2.4 OTHER Manual Quote Completion & Payroll Move: quoted at $450 -> moves to Payroll showing $450", () => {
            const manualQuote = 450;
            const completedRec = {
                ...new_categories_demo_orders_1.NEW_CATEGORIES_DEMO_MTD_RECORDS[9], // OTHER order
                inPayroll: true,
                status: "completed",
                finalCustomerPrice: manualQuote,
                producerPayout: 315,
            };
            const payrollRecords = (0, mtd_completion_1.getPayrollRecords)([completedRec]);
            strict_1.default.equal(payrollRecords.length, 1);
            strict_1.default.equal(payrollRecords[0].finalCustomerPrice, 450);
            strict_1.default.notEqual(payrollRecords[0].finalCustomerPrice, 0);
        });
    });
    (0, node_test_1.describe)("Part 3: End-to-End QA for School Anthems", () => {
        (0, node_test_1.it)("3.1 Filtering: returns only School Anthems orders when form = school-anthem", () => {
            const saRecords = (0, mtd_filters_1.filterMTDRecords)(new_categories_demo_orders_1.NEW_CATEGORIES_DEMO_MTD_RECORDS, {
                form: "school-anthem",
                orderById: orderMap,
            });
            strict_1.default.equal(saRecords.length, 10);
            for (const rec of saRecords) {
                strict_1.default.equal(rec.category, "School Anthem");
            }
        });
        (0, node_test_1.it)("3.2 Flat Price: returns $1,250 unconditionally across all packages", () => {
            const result = (0, pricing_engine_1.calculateSchoolAnthemOrderPricing)({
                packageType: "SCHOOL ANTHEMS",
            });
            strict_1.default.equal(result.customerFacingPrice, 1250);
            strict_1.default.equal(result.payrollBasePrice, 1250);
        });
        (0, node_test_1.it)("3.3 Coupon Integration: applies PROMO10 (10% off $1,250) -> $1,125 final customer price", () => {
            const result = (0, pricing_engine_1.calculateSchoolAnthemOrderPricing)({
                packageType: "SCHOOL ANTHEMS",
            });
            const couponEval = (0, discount_codes_1.evaluateCouponCode)("PROMO10", mockDiscountCodes);
            strict_1.default.equal(couponEval.status, "valid");
            const discountPct = couponEval.match?.discountValue || 0;
            const discount = Math.round(result.payrollBasePrice * (discountPct / 100));
            strict_1.default.equal(discount, 125);
            strict_1.default.equal(result.customerFacingPrice - discount, 1125);
        });
    });
    (0, node_test_1.describe)("Part 4: Cheer and Dance Regression Pass", () => {
        (0, node_test_1.it)("4.1 Cheer Pricing Engine: GOLD 1:30 ($700) and Rally Mix Add-on ($350) keeps $700 Package Price, $950 Payroll Base", () => {
            const cheerResult = (0, pricing_engine_1.calculateCheerOrderPricing)({
                cheerFormSubtype: "school-cheer-viroc-yes",
                packageType: "GOLD 1:30",
                timeLengthOfMix: "1:30",
                musicAffiliate: "Power Music",
                hasRallyMix: true,
            });
            strict_1.default.equal(cheerResult.customerFacingPrice, 700); // $700 base package price
            strict_1.default.equal(cheerResult.payrollBasePrice, 950); // $600 compliant + $350 Rally Mix
            strict_1.default.equal(cheerResult.complianceStatus, "compliant");
        });
        (0, node_test_1.it)("4.2 Dance Pricing Engine: POM CUSTOM ($850) + Traditional VO ($25) + Themed VO ($75) = $850 Package Price, $830 Payroll Base", () => {
            const danceResult = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "pom",
                packageType: "CUSTOM POM",
                musicAffiliate: "Power Music Covers",
                hasTraditionalVoiceover: true,
                hasThemedVoiceover: true,
            });
            strict_1.default.equal(danceResult.customerFacingPrice, 850); // $850 base package price
            strict_1.default.equal(danceResult.payrollBasePrice, 830); // $730 + $100 VO
            strict_1.default.equal(danceResult.complianceStatus, "compliant");
        });
        (0, node_test_1.it)("4.3 Form Counts: counts records by formType without cross-category interference", () => {
            const counts = (0, mtd_filters_1.countMTDByForm)(new_categories_demo_orders_1.NEW_CATEGORIES_DEMO_MTD_RECORDS, orderMap);
            strict_1.default.equal(counts["marching-band"], 10);
            strict_1.default.equal(counts["sports-entertainment"], 10);
            strict_1.default.equal(counts["school-anthem"], 10);
            strict_1.default.equal(counts["school-all-star-cheer"], 0);
            strict_1.default.equal(counts["school-all-star-dance"], 0);
        });
    });
});
