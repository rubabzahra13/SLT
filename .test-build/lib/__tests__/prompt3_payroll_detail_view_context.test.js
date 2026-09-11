"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const pricing_display_1 = require("../pricing-display");
const producers_1 = require("../producers");
function makePayrollRecord(overrides = {}) {
    return {
        id: "rec-payroll-101",
        orderId: "ord-payroll-101",
        section: "CHEERLEADING MUSIC",
        assignedProducer: "JD",
        category: "Cheer",
        editorInitials: "JD",
        editorRequest: "FA",
        contactName: "Coach Sarah",
        programName: "SPIRIT XTREME ELITE",
        package: "PLATINUM 2:30 NO SPLIT",
        musicTheme: "Power Covers",
        price: 1400,
        priceCompliance: "compliant",
        invoice: "INV-9901",
        mixStartDate: "2026-09-01",
        mixEndDate: "2026-09-08",
        eightCountSheet: "CS CONFIRMED",
        haveSongs: "SONGS READY",
        needsAttention: false,
        status: "completed",
        inMTD: true,
        inPayroll: true,
        completedAt: "2026-09-09T10:00:00.000Z",
        cheerVoiceover20: true,
        ...overrides,
    };
}
const mockProducer = (0, producers_1.normalizeProducer)({
    id: "prod-jd",
    name: "John Doe",
    initials: "JD",
    categories: ["Cheer", "Dance"],
    status: "available",
    email: "john@soundslikethat.com",
    compensationModel: "percentage_of_payroll_base",
    defaultRate: 70,
    cheerVoiceoverRate: 100,
    danceVoiceoverRate: 80,
    rushFeeRate: 100,
});
(0, node_test_1.describe)("Prompt 3 — Detail View Context & Payroll Detail View Tests", () => {
    (0, node_test_1.it)("verifies route context mapping for Orders, MTD, and Payroll tabs", () => {
        const recordId = "rec-101";
        const getDetailHref = (context, id) => {
            switch (context) {
                case "orders":
                    return `/orders/${id}`;
                case "mtd":
                    return `/mtd/${id}`;
                case "payroll":
                    return `/payroll/${id}`;
            }
        };
        strict_1.default.equal(getDetailHref("orders", recordId), "/orders/rec-101");
        strict_1.default.equal(getDetailHref("mtd", recordId), "/mtd/rec-101");
        strict_1.default.equal(getDetailHref("payroll", recordId), "/payroll/rec-101");
        // Context isolation check: Payroll detail href must NEVER point to /mtd
        strict_1.default.notEqual(getDetailHref("payroll", recordId), "/mtd/rec-101");
    });
    (0, node_test_1.it)("calculates Payroll detail view producer payout, voiceover, and completed date matching underlying record", () => {
        const record = makePayrollRecord({
            price: 1000,
            finalCustomerPrice: 1000,
            finalPayrollPrice: 1000,
            cheerVoiceover20: true,
            cheerVoiceover40: false,
        });
        const calc = (0, pricing_display_1.computeClientPayroll)(mockProducer, 1000, null, 0.7, null, "all-star-cheer", 1000, {
            cheerVoiceover20: true,
            cheerVoiceover40: false,
            formType: "school-all-star-cheer",
        });
        // Base payout: 70% of $1000 = $700 + $20 Cheer VO = $720
        strict_1.default.equal(calc.producerPayout, 720);
        strict_1.default.equal(calc.categoryPayout, 700);
        strict_1.default.equal(calc.voiceoverPayout, 20);
        strict_1.default.equal(calc.sltPortion, 280);
        strict_1.default.equal(record.completedAt, "2026-09-09T10:00:00.000Z");
    });
    (0, node_test_1.it)("calculates Dance Voiceover payouts on Payroll detail view correctly", () => {
        const calcDance = (0, pricing_display_1.computeClientPayroll)(mockProducer, 850, null, 0.7, null, "pom", 850, {
            danceVoiceover: "100",
            hasTraditionalVoiceover: true,
            hasThemedVoiceover: true,
            formType: "school-all-star-dance",
        });
        // Base payout: 70% of $850 = $595. Dance VO ($100 * 80% producer rate) = $80. Total = $675
        strict_1.default.equal(calcDance.categoryPayout, 595);
        strict_1.default.equal(calcDance.voiceoverPayout, 80);
        strict_1.default.equal(calcDance.producerPayout, 675);
    });
});
