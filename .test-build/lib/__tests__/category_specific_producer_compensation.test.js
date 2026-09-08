"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const pricing_display_1 = require("../pricing-display");
const producers_1 = require("../producers");
function makeProducer(overrides = {}) {
    return (0, producers_1.normalizeProducer)({
        id: "prod-test",
        name: "Test Producer",
        initials: "TP",
        email: "test@soundslikethat.com",
        categories: ["Pom", "School Cheer", "Hip Hop"],
        specialty: "Pom",
        avatar: "",
        mixesThisWeek: 0,
        nextAvailable: "TBD",
        status: "available",
        workDays: ["mon", "tue", "wed", "thu", "fri"],
        timeOff: [],
        maxMixesPerDay: null,
        maxProducerCostPerDay: null,
        overtimeDays: [],
        compensationModel: "percentage_of_payroll_base",
        defaultRate: 0.50,
        ratesByCategory: {
            "Pom": 0.50,
            "School Cheer": 0.45,
            "Hip Hop": 0.60,
        },
        rateOverrides: null,
        manualInputFields: null,
        notes: null,
        ...overrides,
    });
}
(0, node_test_1.describe)("Category-Specific Producer Compensation Resolution", () => {
    (0, node_test_1.it)("Scenario A: Same producer resolves different percentages for different categories", () => {
        const Justin = makeProducer({
            id: "prod-jd",
            name: "Justin",
            initials: "JD",
            categories: ["Pom", "Hip Hop", "School Cheer"],
            ratesByCategory: {
                "Pom": 0.50,
                "Hip Hop": 0.60,
                "School Cheer": 0.45,
            },
        });
        // Order 1: Category = Pom, Payroll Price = $1,000
        const payrollPom = (0, pricing_display_1.computeClientPayroll)(Justin, 1000, null, null, null, "pom", 1000);
        strict_1.default.equal(payrollPom.rateUsed, 0.50);
        strict_1.default.equal(payrollPom.producerPayout, 500);
        strict_1.default.equal(payrollPom.sltPortion, 500);
        // Order 2: Category = Hip Hop, Payroll Price = $1,000
        const payrollHipHop = (0, pricing_display_1.computeClientPayroll)(Justin, 1000, null, null, null, "hip-hop", 1000);
        strict_1.default.equal(payrollHipHop.rateUsed, 0.60);
        strict_1.default.equal(payrollHipHop.producerPayout, 600);
        strict_1.default.equal(payrollHipHop.sltPortion, 400);
        // Order 3: Category = School Cheer, Payroll Price = $1,000
        const payrollCheer = (0, pricing_display_1.computeClientPayroll)(Justin, 1000, null, null, null, "school-cheer-viroc-yes", 1000);
        strict_1.default.equal(payrollCheer.rateUsed, 0.45);
        strict_1.default.equal(payrollCheer.producerPayout, 450);
        strict_1.default.equal(payrollCheer.sltPortion, 550);
    });
    (0, node_test_1.it)("Scenario B: Admin changes configuration from 50% to 55% for Pom", () => {
        const Justin = makeProducer({
            id: "prod-jd",
            name: "Justin",
            initials: "JD",
            ratesByCategory: { "Pom": 0.50 },
        });
        const initialPayroll = (0, pricing_display_1.computeClientPayroll)(Justin, 1000, null, null, null, "pom", 1000);
        strict_1.default.equal(initialPayroll.rateUsed, 0.50);
        strict_1.default.equal(initialPayroll.producerPayout, 500);
        // Admin updates settings for Pom to 55%
        const updatedJustin = (0, producers_1.normalizeProducer)({
            ...Justin,
            ratesByCategory: { "Pom": 0.55 },
        });
        const updatedPayroll = (0, pricing_display_1.computeClientPayroll)(updatedJustin, 1000, null, null, null, "pom", 1000);
        strict_1.default.equal(updatedPayroll.rateUsed, 0.55);
        strict_1.default.equal(updatedPayroll.producerPayout, 550);
        strict_1.default.equal(updatedPayroll.sltPortion, 450);
    });
    (0, node_test_1.it)("Scenario C: Existing producer gets new category Hip Hop (60%)", () => {
        const Justin = makeProducer({
            id: "prod-jd",
            name: "Justin",
            initials: "JD",
            categories: ["Pom", "Gameday"],
            ratesByCategory: { "Pom": 0.50, "Gameday": 0.50 },
        });
        // Admin adds Hip Hop at 60%
        const updatedJustin = (0, producers_1.normalizeProducer)({
            ...Justin,
            categories: ["Pom", "Gameday", "Hip Hop"],
            ratesByCategory: { "Pom": 0.50, "Gameday": 0.50, "Hip Hop": 0.60 },
        });
        const hipHopPayroll = (0, pricing_display_1.computeClientPayroll)(updatedJustin, 1000, null, null, null, "hip-hop", 1000);
        strict_1.default.equal(hipHopPayroll.rateUsed, 0.60);
        strict_1.default.equal(hipHopPayroll.producerPayout, 600);
    });
    (0, node_test_1.it)("Scenario D: New producer Alex (AX) created with per-category rates", () => {
        const Alex = (0, producers_1.normalizeProducer)({
            id: "prod-alex",
            name: "Alex",
            initials: "AX",
            categories: ["Pom", "Hip Hop"],
            ratesByCategory: { "Pom": 0.50, "Hip Hop": 0.55 },
        });
        const pomPayroll = (0, pricing_display_1.computeClientPayroll)(Alex, 1000, null, null, null, "pom", 1000);
        strict_1.default.equal(pomPayroll.rateUsed, 0.50);
        strict_1.default.equal(pomPayroll.producerPayout, 500);
        const hipHopPayroll = (0, pricing_display_1.computeClientPayroll)(Alex, 1000, null, null, null, "hip-hop", 1000);
        strict_1.default.equal(hipHopPayroll.rateUsed, 0.55);
        strict_1.default.equal(hipHopPayroll.producerPayout, 550);
    });
    (0, node_test_1.it)("Category resolution: School Cheer VIROC Yes and VIROC No both map to School Cheer", () => {
        const Mark = makeProducer({
            id: "prod-mm",
            name: "Mark",
            initials: "MM",
            categories: ["School Cheer"],
            ratesByCategory: { "School Cheer": 0.60 },
        });
        const virocYes = (0, pricing_display_1.computeClientPayroll)(Mark, 1000, null, null, null, "school-cheer-viroc-yes", 1000);
        strict_1.default.equal(virocYes.rateUsed, 0.60);
        strict_1.default.equal(virocYes.producerPayout, 600);
        const virocNo = (0, pricing_display_1.computeClientPayroll)(Mark, 1000, null, null, null, "school-cheer-viroc-no", 1000);
        strict_1.default.equal(virocNo.rateUsed, 0.60);
        strict_1.default.equal(virocNo.producerPayout, 600);
    });
    (0, node_test_1.it)("All-Star Dance subtype mapping: Pom vs Hip Hop resolve to respective categories", () => {
        const Mark = makeProducer({
            id: "prod-mm",
            name: "Mark",
            initials: "MM",
            categories: ["Pom", "Hip Hop", "Jazz / Kick"],
            ratesByCategory: {
                "Pom": 0.72,
                "Jazz / Kick": 0.72,
                "Hip Hop": 0.65,
            },
        });
        const pomDance = (0, pricing_display_1.computeClientPayroll)(Mark, 1000, null, null, null, "pom", 1000);
        strict_1.default.equal(pomDance.rateUsed, 0.72);
        strict_1.default.equal(pomDance.producerPayout, 720);
        const hipHopDance = (0, pricing_display_1.computeClientPayroll)(Mark, 1000, null, null, null, "hip-hop", 1000);
        strict_1.default.equal(hipHopDance.rateUsed, 0.65);
        strict_1.default.equal(hipHopDance.producerPayout, 650);
    });
    (0, node_test_1.it)("Missing configuration: surfaces clear error when producer has no rate for category", () => {
        const ProducerNoConfig = makeProducer({
            id: "prod-nc",
            name: "NoConfigProducer",
            initials: "NC",
            defaultRate: null,
            ratesByCategory: {}, // empty rate config
        });
        const result = (0, pricing_display_1.computeClientPayroll)(ProducerNoConfig, 1000, null, null, null, "marching-band", 1000);
        strict_1.default.equal(result.status, "needs_manual_review");
        strict_1.default.equal(result.rateUsed, null);
        strict_1.default.ok(result.message.includes("Compensation percentage is not configured for NoConfigProducer on category \"Marching Band\""));
    });
    (0, node_test_1.it)("Payroll Price Invariant: Payout is calculated from Final Payroll Price ($1,150), NOT Customer Price ($1,350)", () => {
        const Justin = makeProducer({
            id: "prod-jd",
            name: "Justin",
            initials: "JD",
            ratesByCategory: { "Pom": 0.50 },
        });
        const customerPrice = 1350;
        const finalPayrollPrice = 1150;
        const payroll = (0, pricing_display_1.computeClientPayroll)(Justin, customerPrice, null, null, null, "pom", finalPayrollPrice);
        strict_1.default.equal(payroll.rateUsed, 0.50);
        strict_1.default.equal(payroll.producerPayout, 575); // $1,150 * 50% = $575
        strict_1.default.equal(payroll.sltPortion, 575); // $1,150 - $575 = $575
    });
    (0, node_test_1.it)("Admin Manual Override in Payroll modal overrides category rate without mutating producer config", () => {
        const Justin = makeProducer({
            id: "prod-jd",
            name: "Justin",
            initials: "JD",
            ratesByCategory: { "Pom": 0.50 },
        });
        // Admin manually overrides rate to 55% (0.55) in payroll modal
        const payroll = (0, pricing_display_1.computeClientPayroll)(Justin, 1000, null, 0.55, null, "pom", 1000);
        strict_1.default.equal(payroll.rateUsed, 0.55);
        strict_1.default.equal(payroll.producerPayout, 550);
        strict_1.default.equal(payroll.sltPortion, 450);
        // Producer's base config remains 50% for future calculations
        const defaultPayroll = (0, pricing_display_1.computeClientPayroll)(Justin, 1000, null, null, null, "pom", 1000);
        strict_1.default.equal(defaultPayroll.rateUsed, 0.50);
    });
});
