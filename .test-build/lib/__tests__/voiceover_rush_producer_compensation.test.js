"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const producers_1 = require("../producers");
const pricing_display_1 = require("../pricing-display");
const pricing_engine_1 = require("../pricing-engine");
(0, node_test_1.describe)("Voiceover & Rush Fee Producer Compensation End-to-End Test Suite", () => {
    // Mock Producers with custom rates
    const mockProducerCassie = (0, producers_1.normalizeProducer)({
        id: "prod-cassie",
        name: "Cassie Marlow",
        email: "cassie@slt.com",
        categories: ["dance-jazz", "dance-hip-hop", "cheer"],
        ratesByCategory: {
            "dance-jazz": 80,
            "dance-hip-hop": 80,
            cheer: 100,
        },
        danceVoiceoverRate: 80,
        cheerVoiceoverRate: 100,
        rushFeeRate: 100,
    });
    const mockProducerOther = (0, producers_1.normalizeProducer)({
        id: "prod-other",
        name: "Other Producer",
        email: "other@slt.com",
        categories: ["dance-jazz", "cheer"],
        ratesByCategory: {
            "dance-jazz": 70,
            cheer: 70,
        },
        danceVoiceoverRate: 60,
        cheerVoiceoverRate: 50,
        rushFeeRate: 60,
    });
    (0, node_test_1.describe)("Section 1 & 13: Voiceover Removed from MTD Pricing Engine", () => {
        (0, node_test_1.it)("Voiceover option on Dance order does NOT alter customer facing price or payroll base price", () => {
            const resultNoVO = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "pom",
                packageType: "CUSTOM POM",
                musicAffiliate: "Power Music",
            });
            const resultWithVO = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "pom",
                packageType: "CUSTOM POM",
                musicAffiliate: "Power Music",
                hasTraditionalVoiceover: true,
                hasThemedVoiceover: true,
            });
            strict_1.default.equal(resultWithVO.customerFacingPrice, resultNoVO.customerFacingPrice);
            strict_1.default.equal(resultWithVO.payrollBasePrice, resultNoVO.payrollBasePrice);
            strict_1.default.equal(resultWithVO.customerFacingPrice, 850);
            strict_1.default.equal(resultWithVO.payrollBasePrice, 730);
        });
        (0, node_test_1.it)("Miscellaneous MTD add-ons calculation excludes Voiceovers", () => {
            const addons = (0, pricing_engine_1.calculateMiscellaneousPayrollAddons)({
                voiceover: 40,
                voiceoverOption: "both",
                hasTraditionalVoiceover: true,
                rushFeeOption: "single",
            });
            // Only Rush Fee ($150) should be returned as a customer/payroll add-on
            strict_1.default.equal(addons.items.length, 1);
            strict_1.default.equal(addons.items[0].id, "rush_fee");
            strict_1.default.equal(addons.items[0].customerAmount, 150);
            strict_1.default.equal(addons.totalPayrollAddOns, 150);
        });
    });
    (0, node_test_1.describe)("Section 3, 4, 5, 6: Payroll Voiceover Calculation & Producer-Specific Rates", () => {
        (0, node_test_1.it)("Dance Traditional VO ($25) uses producer's danceVoiceoverRate (80% -> $20)", () => {
            const computed = (0, pricing_display_1.computeClientPayroll)(mockProducerCassie, 475, { payroll_base_price: 475, customer_facing_price: 475 }, 80, null, "dance-jazz", 475, { hasTraditionalVoiceover: true });
            strict_1.default.equal(computed.voiceoverPayout, 20); // 25 * 80% = 20
            // Category payout: 475 * 80% = 380 + VO 20 = 400
            strict_1.default.equal(computed.producerPayout, 400);
        });
        (0, node_test_1.it)("Dance Themed VO ($75) uses producer's danceVoiceoverRate (60% for mockProducerOther -> $45)", () => {
            const computed = (0, pricing_display_1.computeClientPayroll)(mockProducerOther, 475, { payroll_base_price: 475, customer_facing_price: 475 }, 70, null, "dance-hip-hop", 475, { hasThemedVoiceover: true });
            strict_1.default.equal(computed.voiceoverPayout, 45); // 75 * 60% = 45
        });
        (0, node_test_1.it)("Dance Both VO ($100) uses producer's danceVoiceoverRate (80% -> $80)", () => {
            const computed = (0, pricing_display_1.computeClientPayroll)(mockProducerCassie, 850, { payroll_base_price: 850, customer_facing_price: 850 }, 80, null, "pom", 850, { hasTraditionalVoiceover: true, hasThemedVoiceover: true });
            strict_1.default.equal(computed.voiceoverPayout, 80); // 100 * 80% = 80
        });
        (0, node_test_1.it)("Cheer Voiceover: Cheer $20 VO and Cheer $40 VO use producer's cheerVoiceoverRate (100% -> $20, $40, $60)", () => {
            let computed = (0, pricing_display_1.computeClientPayroll)(mockProducerCassie, 700, { payroll_base_price: 700, customer_facing_price: 700 }, 100, null, "cheer", 700, { cheerVoiceover20: true, cheerVoiceover40: false });
            strict_1.default.equal(computed.voiceoverPayout, 20); // 20 * 100% = 20
            computed = (0, pricing_display_1.computeClientPayroll)(mockProducerCassie, 700, { payroll_base_price: 700, customer_facing_price: 700 }, 100, null, "cheer", 700, { cheerVoiceover20: false, cheerVoiceover40: true });
            strict_1.default.equal(computed.voiceoverPayout, 40); // 40 * 100% = 40
            computed = (0, pricing_display_1.computeClientPayroll)(mockProducerCassie, 700, { payroll_base_price: 700, customer_facing_price: 700 }, 100, null, "cheer", 700, { cheerVoiceover20: true, cheerVoiceover40: true });
            strict_1.default.equal(computed.voiceoverPayout, 60); // (20 + 40) * 100% = 60
        });
        (0, node_test_1.it)("Voiceover uses specific VO rate even if general category rate is different", () => {
            // mockProducerOther has cheer general rate = 70%, but cheerVoiceoverRate = 50%
            const computed = (0, pricing_display_1.computeClientPayroll)(mockProducerOther, 700, { payroll_base_price: 700, customer_facing_price: 700 }, 70, // general rate
            null, "cheer", 700, { cheerVoiceover40: true });
            strict_1.default.equal(computed.rateUsed, 70); // General cheer rate
            strict_1.default.equal(computed.voiceoverPayout, 20); // $40 * 50% = $20 (NOT 40 * 70% = 28!)
        });
    });
    (0, node_test_1.describe)("Section 7, 8, 9, 10, 11: Rush Fee Quantity, Preselection & Megan's Override", () => {
        (0, node_test_1.it)("Rush Fee Quantity 1 ($150) with Producer Default Rate (100% -> $150 payout)", () => {
            // Package 500 + Rush 150 = 650 total payroll base
            const computed = (0, pricing_display_1.computeClientPayroll)(mockProducerCassie, 650, { payroll_base_price: 650, customer_facing_price: 650 }, 80, null, "dance-jazz", 650, { rushFeeQuantity: 1 });
            strict_1.default.equal(computed.rushFeePayout, 150); // $150 * 1 * 100% = $150
            // Base package payroll = (650 - 150) * 80% = 400 + Rush payout 150 = 550
            strict_1.default.equal(computed.producerPayout, 550);
        });
        (0, node_test_1.it)("Rush Fee Quantity 2 ($300) with Producer Default Rate (60% -> $180 payout)", () => {
            // Package 500 + Rush 300 = 800 total payroll base
            const computed = (0, pricing_display_1.computeClientPayroll)(mockProducerOther, 800, { payroll_base_price: 800, customer_facing_price: 800 }, 70, null, "dance-jazz", 800, { rushFeeQuantity: 2 });
            strict_1.default.equal(computed.rushFeePayout, 180); // $150 * 2 * 60% = $180
            // Base package payroll = (800 - 300) * 70% = 350 + Rush payout 180 = 530
            strict_1.default.equal(computed.producerPayout, 530);
        });
        (0, node_test_1.it)("Megan can override Rush Fee Compensation Rate per order without modifying global producer settings", () => {
            const computed = (0, pricing_display_1.computeClientPayroll)(mockProducerCassie, // Global rush rate = 100%
            800, { payroll_base_price: 800, customer_facing_price: 800 }, 80, null, "dance-jazz", 800, { rushFeeQuantity: 2, rushFeeCompensationRate: 72 } // Megan overrides to 72%
            );
            strict_1.default.equal(computed.rushFeePayout, 216); // $150 * 2 * 72% = $216
            // Verify Cassie's global settings remain 100%
            strict_1.default.equal(mockProducerCassie.rushFeeRate, 100);
        });
    });
    (0, node_test_1.describe)("Section 14 & 16: Data Persistence & Negative Checks", () => {
        (0, node_test_1.it)("Normalizing producer preserves all voiceover and rush fee rates", () => {
            const raw = {
                id: "prod-test",
                name: "Test",
                danceVoiceoverRate: 85,
                cheerVoiceoverRate: 95,
                rushFeeRate: 75,
            };
            const normalized = (0, producers_1.normalizeProducer)(raw);
            strict_1.default.equal(normalized.danceVoiceoverRate, 85);
            strict_1.default.equal(normalized.cheerVoiceoverRate, 95);
            strict_1.default.equal(normalized.rushFeeRate, 75);
        });
    });
});
