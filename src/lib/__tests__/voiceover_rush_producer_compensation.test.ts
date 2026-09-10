import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeProducer } from "../producers";
import { computeClientPayroll } from "../pricing-display";
import { calculateDanceOrderPricing, calculateMiscellaneousPayrollAddons } from "../pricing-engine";
import type { Producer } from "../../types";

describe("Voiceover & Rush Fee Producer Compensation End-to-End Test Suite", () => {
  // Mock Producers with custom rates
  const mockProducerCassie: Producer = normalizeProducer({
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

  const mockProducerOther: Producer = normalizeProducer({
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

  describe("Section 1 & 13: Voiceover Removed from MTD Pricing Engine", () => {
    it("Voiceover option on Dance order does NOT alter customer facing price or payroll base price", () => {
      const resultNoVO = calculateDanceOrderPricing({
        danceFormSubtype: "pom",
        packageType: "CUSTOM POM",
        musicAffiliate: "Power Music",
      });

      const resultWithVO = calculateDanceOrderPricing({
        danceFormSubtype: "pom",
        packageType: "CUSTOM POM",
        musicAffiliate: "Power Music",
        hasTraditionalVoiceover: true,
        hasThemedVoiceover: true,
      });

      assert.equal(resultWithVO.customerFacingPrice, resultNoVO.customerFacingPrice);
      assert.equal(resultWithVO.payrollBasePrice, resultNoVO.payrollBasePrice);
      assert.equal(resultWithVO.customerFacingPrice, 850);
      assert.equal(resultWithVO.payrollBasePrice, 730);
    });

    it("Miscellaneous MTD add-ons calculation excludes Voiceovers", () => {
      const addons = calculateMiscellaneousPayrollAddons({
        voiceover: 40,
        voiceoverOption: "both",
        hasTraditionalVoiceover: true,
        rushFeeOption: "single",
      });

      // Only Rush Fee ($150) should be returned as a customer/payroll add-on
      assert.equal(addons.items.length, 1);
      assert.equal(addons.items[0].id, "rush_fee");
      assert.equal(addons.items[0].customerAmount, 150);
      assert.equal(addons.totalPayrollAddOns, 150);
    });
  });

  describe("Section 3, 4, 5, 6: Payroll Voiceover Calculation & Producer-Specific Rates", () => {
    it("Dance Traditional VO ($25) uses producer's danceVoiceoverRate (80% -> $20)", () => {
      const computed = computeClientPayroll(
        mockProducerCassie,
        475,
        { payroll_base_price: 475, customer_facing_price: 475 } as any,
        80,
        null,
        "dance-jazz",
        475,
        { hasTraditionalVoiceover: true }
      );

      assert.equal(computed.voiceoverPayout, 20); // 25 * 80% = 20
      // Category payout: 475 * 80% = 380 + VO 20 = 400
      assert.equal(computed.producerPayout, 400);
    });

    it("Dance Themed VO ($75) uses producer's danceVoiceoverRate (60% for mockProducerOther -> $45)", () => {
      const computed = computeClientPayroll(
        mockProducerOther,
        475,
        { payroll_base_price: 475, customer_facing_price: 475 } as any,
        70,
        null,
        "dance-hip-hop",
        475,
        { hasThemedVoiceover: true }
      );

      assert.equal(computed.voiceoverPayout, 45); // 75 * 60% = 45
    });

    it("Dance Both VO ($100) uses producer's danceVoiceoverRate (80% -> $80)", () => {
      const computed = computeClientPayroll(
        mockProducerCassie,
        850,
        { payroll_base_price: 850, customer_facing_price: 850 } as any,
        80,
        null,
        "pom",
        850,
        { hasTraditionalVoiceover: true, hasThemedVoiceover: true }
      );

      assert.equal(computed.voiceoverPayout, 80); // 100 * 80% = 80
    });

    it("Cheer Voiceover: Cheer $20 VO and Cheer $40 VO use producer's cheerVoiceoverRate (100% -> $20, $40, $60)", () => {
      let computed = computeClientPayroll(
        mockProducerCassie,
        700,
        { payroll_base_price: 700, customer_facing_price: 700 } as any,
        100,
        null,
        "cheer",
        700,
        { cheerVoiceover20: true, cheerVoiceover40: false }
      );
      assert.equal(computed.voiceoverPayout, 20); // 20 * 100% = 20

      computed = computeClientPayroll(
        mockProducerCassie,
        700,
        { payroll_base_price: 700, customer_facing_price: 700 } as any,
        100,
        null,
        "cheer",
        700,
        { cheerVoiceover20: false, cheerVoiceover40: true }
      );
      assert.equal(computed.voiceoverPayout, 40); // 40 * 100% = 40

      computed = computeClientPayroll(
        mockProducerCassie,
        700,
        { payroll_base_price: 700, customer_facing_price: 700 } as any,
        100,
        null,
        "cheer",
        700,
        { cheerVoiceover20: true, cheerVoiceover40: true }
      );
      assert.equal(computed.voiceoverPayout, 60); // (20 + 40) * 100% = 60
    });

    it("Voiceover uses specific VO rate even if general category rate is different", () => {
      // mockProducerOther has cheer general rate = 70%, but cheerVoiceoverRate = 50%
      const computed = computeClientPayroll(
        mockProducerOther,
        700,
        { payroll_base_price: 700, customer_facing_price: 700 } as any,
        70, // general rate
        null,
        "cheer",
        700,
        { cheerVoiceover40: true }
      );

      assert.equal(computed.rateUsed, 70); // General cheer rate
      assert.equal(computed.voiceoverPayout, 20); // $40 * 50% = $20 (NOT 40 * 70% = 28!)
    });
  });

  describe("Section 7, 8, 9, 10, 11: Rush Fee Quantity, Preselection & Megan's Override", () => {
    it("Rush Fee Quantity 1 ($150) with Producer Default Rate (100% -> $150 payout)", () => {
      // Package 500 + Rush 150 = 650 total payroll base
      const computed = computeClientPayroll(
        mockProducerCassie,
        650,
        { payroll_base_price: 650, customer_facing_price: 650 } as any,
        80,
        null,
        "dance-jazz",
        650,
        { rushFeeQuantity: 1 }
      );

      assert.equal(computed.rushFeePayout, 150); // $150 * 1 * 100% = $150
      // Base package payroll = (650 - 150) * 80% = 400 + Rush payout 150 = 550
      assert.equal(computed.producerPayout, 550);
    });

    it("Rush Fee Quantity 2 ($300) with Producer Default Rate (60% -> $180 payout)", () => {
      // Package 500 + Rush 300 = 800 total payroll base
      const computed = computeClientPayroll(
        mockProducerOther,
        800,
        { payroll_base_price: 800, customer_facing_price: 800 } as any,
        70,
        null,
        "dance-jazz",
        800,
        { rushFeeQuantity: 2 }
      );

      assert.equal(computed.rushFeePayout, 180); // $150 * 2 * 60% = $180
      // Base package payroll = (800 - 300) * 70% = 350 + Rush payout 180 = 530
      assert.equal(computed.producerPayout, 530);
    });

    it("Megan can override Rush Fee Compensation Rate per order without modifying global producer settings", () => {
      const computed = computeClientPayroll(
        mockProducerCassie, // Global rush rate = 100%
        800,
        { payroll_base_price: 800, customer_facing_price: 800 } as any,
        80,
        null,
        "dance-jazz",
        800,
        { rushFeeQuantity: 2, rushFeeCompensationRate: 72 } // Megan overrides to 72%
      );

      assert.equal(computed.rushFeePayout, 216); // $150 * 2 * 72% = $216

      // Verify Cassie's global settings remain 100%
      assert.equal(mockProducerCassie.rushFeeRate, 100);
    });
  });

  describe("Section 14 & 16: Data Persistence & Negative Checks", () => {
    it("Normalizing producer preserves all voiceover and rush fee rates", () => {
      const raw = {
        id: "prod-test",
        name: "Test",
        danceVoiceoverRate: 85,
        cheerVoiceoverRate: 95,
        rushFeeRate: 75,
      };
      const normalized = normalizeProducer(raw);
      assert.equal(normalized.danceVoiceoverRate, 85);
      assert.equal(normalized.cheerVoiceoverRate, 95);
      assert.equal(normalized.rushFeeRate, 75);
    });
  });
});
