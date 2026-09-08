"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const pricing_display_1 = require("../pricing-display");
(0, node_test_1.describe)("Producer Compensation — Final Payroll Price Basis Unit Tests", () => {
    const sampleProducer = {
        id: "prod-test",
        name: "Test Producer",
        initials: "TP",
        email: "test@example.com",
        specialty: "Producer",
        avatar: "/avatars/test.png",
        mixesThisWeek: 1,
        nextAvailable: "Today",
        status: "available",
        workDays: ["mon", "tue", "wed", "thu", "fri"],
        timeOff: [],
        maxMixesPerDay: null,
        maxProducerCostPerDay: null,
        categories: ["All-Star Cheer"],
        overtimeDays: [],
        compensationModel: "percentage_of_payroll_base",
        defaultRate: 0.50,
    };
    (0, node_test_1.it)("Test 1 — Customer Price differs from Payroll Price ($1,000 Customer / $800 Payroll / 50% -> $400 Payout)", () => {
        const custPrice = 1000;
        const payrollPrice = 800;
        const breakdown = {
            form_type: "school-all-star-cheer",
            canonical_subtype_id: "all-star-cheer",
            package_id: "pkg-1",
            package_name: "GOLD 1:30",
            pricing_rule_id: null,
            compliance_status: "compliant",
            compliance_reason: "Verified",
            canonical_affiliate: "Power Music",
            base_customer_price: 1000,
            base_payroll_price: 800,
            addons: [],
            system_calculated_customer_price: 1000,
            payroll_base_price: 800,
            needs_manual_pricing: false,
            needs_manual_review: false,
            summary_line: "Test 1",
        };
        const res = (0, pricing_display_1.computeClientPayroll)(sampleProducer, custPrice, breakdown, 0.50, null, "all-star-cheer", payrollPrice);
        strict_1.default.equal(res.producerPayout, 400);
        strict_1.default.notEqual(res.producerPayout, 500);
        strict_1.default.equal(res.sltPortion, 400); // $800 - $400 = $400
    });
    (0, node_test_1.it)("Test 2 — Add-on affects payroll ($1,000 Customer / $900 Payroll / 50% -> $450 Payout)", () => {
        const custPrice = 1000;
        const payrollPrice = 900;
        const res = (0, pricing_display_1.computeClientPayroll)(sampleProducer, custPrice, null, 0.50, null, "all-star-cheer", payrollPrice);
        strict_1.default.equal(res.producerPayout, 450);
        strict_1.default.equal(res.sltPortion, 450); // $900 - $450 = $450
    });
    (0, node_test_1.it)("Test 3 — Deduction affects payroll ($1,000 Customer / $800 Payroll / 50% -> $400 Payout)", () => {
        const custPrice = 1000;
        const payrollPrice = 800;
        const res = (0, pricing_display_1.computeClientPayroll)(sampleProducer, custPrice, null, 0.50, null, "all-star-cheer", payrollPrice);
        strict_1.default.equal(res.producerPayout, 400);
        strict_1.default.equal(res.sltPortion, 400); // $800 - $400 = $400
    });
    (0, node_test_1.it)("Test 4 — Coupon affects payroll ($1,000 Customer / $800 Payroll after coupon / 50% -> $400 Payout)", () => {
        const custPrice = 1000;
        const payrollPrice = 800;
        const res = (0, pricing_display_1.computeClientPayroll)(sampleProducer, custPrice, null, 0.50, null, "all-star-cheer", payrollPrice);
        strict_1.default.equal(res.producerPayout, 400);
        strict_1.default.equal(res.sltPortion, 400); // $800 - $400 = $400
    });
    (0, node_test_1.it)("Test 5 — Customer Price must remain unchanged ($1,000 Customer Price is not mutated)", () => {
        const custPrice = 1000;
        const payrollPrice = 800;
        const res = (0, pricing_display_1.computeClientPayroll)(sampleProducer, custPrice, null, 0.50, null, "all-star-cheer", payrollPrice);
        strict_1.default.equal(custPrice, 1000);
        strict_1.default.equal(res.producerPayout, 400);
    });
    (0, node_test_1.it)("Test 6 — No adjustments ($1,000 Customer / $1,000 Payroll / 50% -> $500 Payout)", () => {
        const custPrice = 1000;
        const payrollPrice = 1000;
        const res = (0, pricing_display_1.computeClientPayroll)(sampleProducer, custPrice, null, 0.50, null, "all-star-cheer", payrollPrice);
        strict_1.default.equal(res.producerPayout, 500);
        strict_1.default.equal(res.sltPortion, 500);
    });
    (0, node_test_1.it)("Test 7 — Casey dual rate calculation uses Final Payroll Price ($850 Payroll -> Old $612 / New $595)", () => {
        const casey = {
            ...sampleProducer,
            initials: "CM",
            defaultRate: 0.70,
            rateOverrides: { old_pricing: 0.72, new_pricing: 0.70 },
        };
        const custPrice = 1000;
        const payrollPrice = 850;
        const res = (0, pricing_display_1.computeClientPayroll)(casey, custPrice, null, null, null, "all-star-cheer", payrollPrice);
        strict_1.default.equal(res.isCaseyAmbiguous, true);
        strict_1.default.equal(res.oldPricingPayout, 612); // $850 * 72% = $612
        strict_1.default.equal(res.newPricingPayout, 595); // $850 * 70% = $595
    });
    (0, node_test_1.it)("Test 8 — Steve not_paid_for_mixing ($100 Customer / $370 Payroll -> Payout $0 / SLT Portion $370)", () => {
        const steve = {
            ...sampleProducer,
            name: "Steve",
            compensationModel: "not_paid_for_mixing",
        };
        const custPrice = 100;
        const payrollPrice = 370;
        const res = (0, pricing_display_1.computeClientPayroll)(steve, custPrice, null, null, null, "pom", payrollPrice);
        strict_1.default.equal(res.producerPayout, 0);
        strict_1.default.equal(res.sltPortion, 370); // SLT portion is full Payroll Price ($370)
    });
    (0, node_test_1.it)("Test 9 — Rory Fowler 78% rate ($100 Customer / $160 Payroll / 78% -> Payout $124.80 / SLT Portion $35.20)", () => {
        const rory = {
            ...sampleProducer,
            name: "Rory Fowler",
            defaultRate: 0.78,
        };
        const custPrice = 100;
        const payrollPrice = 160;
        const res = (0, pricing_display_1.computeClientPayroll)(rory, custPrice, null, 0.78, null, "pom", payrollPrice);
        strict_1.default.equal(res.producerPayout, 124.8); // $160 * 78% = $124.80
        strict_1.default.equal(res.sltPortion, 35.2); // $160 - $124.80 = $35.20 (22% of $160, positive!)
        strict_1.default.notEqual(res.sltPortion, -24.8); // NO LONGER NEGATIVE!
    });
});
