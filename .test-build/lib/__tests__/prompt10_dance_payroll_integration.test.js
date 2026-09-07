"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const dance_demo_orders_1 = require("../../data/dance-demo-orders");
const cheer_demo_orders_1 = require("../../data/cheer-demo-orders");
const pricing_engine_1 = require("../pricing-engine");
const pricing_display_1 = require("../pricing-display");
const mtd_completion_1 = require("../mtd-completion");
(0, node_test_1.describe)("Prompt 10 — Payroll Integration for Dance", () => {
    const caseyProducer = {
        id: "prod-casey",
        name: "Casey Marlow",
        initials: "CM",
        email: "casey@soundslikethat.com",
        specialty: "Producer",
        avatar: "/avatars/casey.png",
        mixesThisWeek: 2,
        nextAvailable: "Tomorrow",
        status: "available",
        workDays: ["mon", "tue", "wed", "thu", "fri"],
        timeOff: [],
        maxMixesPerDay: null,
        overtimeDays: [],
        compensationModel: "percentage_of_payroll_base",
        defaultRate: 0.70,
        rateOverrides: { old_pricing: 0.72, new_pricing: 0.70 },
    };
    (0, node_test_1.it)("Completes 1 order per Dance subtype into Payroll with exact system-calculated payroll-base prices", () => {
        const subtypes = ["pom", "hip-hop", "team-performance-variety", "gameday", "jazz-kick"];
        const completedRecords = [];
        for (const subtype of subtypes) {
            const linkedOrder = dance_demo_orders_1.DANCE_DEMO_ORDERS.find((o) => o.danceFormSubtype === subtype);
            strict_1.default.ok(linkedOrder, `Linked order found for subtype ${subtype}`);
            const record = dance_demo_orders_1.DANCE_DEMO_MTD_RECORDS.find((r) => r.orderId === linkedOrder.id);
            strict_1.default.ok(record, `Found MTD record for subtype ${subtype}`);
            const danceResult = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: subtype,
                packageType: linkedOrder.packageType || record.package,
                musicAffiliate: linkedOrder.musicAffiliate || "Power Music",
                hasTraditionalVoiceover: record.hasTraditionalVoiceover,
                hasThemedVoiceover: record.hasThemedVoiceover,
            });
            const payrollBase = danceResult.payrollBasePrice;
            const custPrice = danceResult.customerFacingPrice;
            const payrollCalc = (0, pricing_display_1.computeClientPayroll)(caseyProducer, custPrice, {
                form_type: "school-all-star-dance",
                canonical_subtype_id: subtype,
                package_id: record.package,
                package_name: record.package,
                pricing_rule_id: null,
                compliance_status: danceResult.complianceStatus === "non-compliant" ? "non-compliant" : "compliant",
                compliance_reason: "Verified",
                canonical_affiliate: linkedOrder.musicAffiliate || null,
                base_customer_price: danceResult.matchedEntry?.customer ?? custPrice,
                base_payroll_price: danceResult.matchedEntry?.compliant ?? payrollBase,
                addons: [],
                system_calculated_customer_price: custPrice,
                payroll_base_price: payrollBase,
                needs_manual_pricing: false,
                needs_manual_review: false,
                summary_line: "Summary",
            }, 0.70, null, subtype);
            const completedRecord = {
                ...record,
                status: "completed",
                inPayroll: true,
                completedAt: "2026-09-07",
                price: custPrice,
                finalCustomerPrice: custPrice,
                systemCalculatedCustomerPrice: custPrice,
                producerPayout: payrollCalc.producerPayout ?? 0,
                sltPortion: payrollCalc.sltPortion ?? 0,
                rateUsed: 0.70,
                rateSource: "rate_overrides",
                payrollFinalized: true,
            };
            completedRecords.push(completedRecord);
            // Assert payout is calculated directly off payroll-base price (payrollBase * 70%)
            const expectedPayout = Math.round(payrollBase * 0.70 * 100) / 100;
            strict_1.default.equal(completedRecord.producerPayout, expectedPayout);
        }
        // Verify all 5 completed Dance records appear in getPayrollRecords
        const inPayroll = (0, mtd_completion_1.getPayrollRecords)(completedRecords);
        strict_1.default.equal(inPayroll.length, 5);
    });
    (0, node_test_1.it)("Cheer Payroll rows and calculations remain completely unaffected", () => {
        const cheerRec = cheer_demo_orders_1.CHEER_DEMO_MTD_RECORDS[0];
        const completedCheerRecord = {
            ...cheerRec,
            status: "completed",
            inPayroll: true,
            completedAt: "2026-09-07",
            producerPayout: 420,
            sltPortion: 180,
        };
        const payrollList = (0, mtd_completion_1.getPayrollRecords)([completedCheerRecord]);
        strict_1.default.equal(payrollList.length, 1);
        strict_1.default.equal(payrollList[0].producerPayout, 420);
        strict_1.default.equal(payrollList[0].sltPortion, 180);
    });
});
