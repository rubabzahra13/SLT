import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateCouponCode } from "../discount-codes";
import {
  calculateCheerOrderPricing,
  calculateDanceOrderPricing,
  calculateMarchingBandOrderPricing,
  calculateSportsEntertainmentOrderPricing,
  calculateSchoolAnthemOrderPricing,
  calculateMiscellaneousPayrollAddons,
} from "../pricing-engine";
import { computeClientPayroll } from "../pricing-display";
import { normalizeProducer } from "../producers";
import type { DiscountCode, MTDRecord, Producer } from "../../types";

describe("Coupon Code as Display-Only Customer Pricing Information Test Suite", () => {
  const discountCodes: DiscountCode[] = [
    {
      id: "code-austin",
      code: "AUSTIN2026",
      discountType: "percentage",
      discountValue: 10,
      description: "10% off for Austin event",
    },
    {
      id: "code-save50",
      code: "SAVE50",
      discountType: "fixed",
      discountValue: 50,
      description: "$50 off total",
    },
  ];

  const mockProducer: Producer = normalizeProducer({
    id: "prod-1",
    name: "Casey Marlow",
    email: "casey@slt.com",
    categories: ["dance-jazz", "cheer"],
    ratesByCategory: {
      "dance-jazz": 80,
      cheer: 100,
    },
    danceVoiceoverRate: 80,
    cheerVoiceoverRate: 100,
    rushFeeRate: 100,
  });

  describe("Requirement 1: Coupon Code Settings & Evaluation Preserved", () => {
    it("evaluates valid percentage and fixed discount codes accurately for display", () => {
      const evalPct = evaluateCouponCode("AUSTIN2026", discountCodes);
      assert.equal(evalPct.status, "valid");
      assert.equal(evalPct.match?.discountValue, 10);

      const evalFixed = evaluateCouponCode("SAVE50", discountCodes);
      assert.equal(evalFixed.status, "valid");
      assert.equal(evalFixed.match?.discountValue, 50);
    });
  });

  describe("Requirement 3: Coupon Code Must NOT Modify Pricing Engine Package Price or Payroll Base", () => {
    it("Cheer order: Package Price ($1,100) and Payroll Base ($1,000) remain unchanged with coupon", () => {
      const noCoupon = calculateCheerOrderPricing({
        cheerFormSubtype: "all-star-cheer",
        packageType: "GOLD 2:30",
        musicAffiliate: "Power Music",
      });

      const withCoupon = calculateCheerOrderPricing({
        cheerFormSubtype: "all-star-cheer",
        packageType: "GOLD 2:30",
        musicAffiliate: "Power Music",
        discountCodeObj: discountCodes[0], // 10%
      });

      assert.equal(withCoupon.customerFacingPrice, noCoupon.customerFacingPrice);
      assert.equal(withCoupon.payrollBasePrice, noCoupon.payrollBasePrice);
      assert.equal(withCoupon.customerFacingPrice, 1100);
      assert.equal(withCoupon.payrollBasePrice, 1000);
      assert.equal(withCoupon.discountAmount, 100); // Display-only discount amount
    });

    it("Dance order: Package Price ($850) and Payroll Base ($730) remain unchanged with coupon", () => {
      const result = calculateDanceOrderPricing({
        danceFormSubtype: "pom",
        packageType: "CUSTOM POM",
        musicAffiliate: "Power Music Covers",
      });

      assert.equal(result.customerFacingPrice, 850);
      assert.equal(result.payrollBasePrice, 730);
    });
  });

  describe("Requirement 6: Payroll Must Ignore Coupon Codes ($0 Impact)", () => {
    it("Producer Payout is strictly calculated from base package payroll amount and is unaffected by coupon", () => {
      const packagePrice = 1000;
      const payrollBasePrice = 1000;

      // Without coupon
      const payNoCoupon = computeClientPayroll(
        mockProducer,
        packagePrice,
        { payroll_base_price: payrollBasePrice, customer_facing_price: packagePrice } as any,
        80,
        null,
        "dance-jazz",
        payrollBasePrice
      );

      // With 10% coupon (display customer price = 900)
      const displayCustomerPrice = 900;
      const payWithCoupon = computeClientPayroll(
        mockProducer,
        displayCustomerPrice,
        { payroll_base_price: payrollBasePrice, customer_facing_price: packagePrice } as any,
        80,
        null,
        "dance-jazz",
        payrollBasePrice // Payroll base MUST stay 1000
      );

      assert.equal(payNoCoupon.producerPayout, 800); // $1000 * 80% = $800
      assert.equal(payWithCoupon.producerPayout, 800); // $1000 * 80% = $800 ($0 coupon impact!)
    });
  });

  describe("Requirement 8: Combined End-to-End Test (Coupon + Voiceover + Rush Fee)", () => {
    it("Coupon does NOT alter Rush fee payout ($150) or Voiceover payout ($20)", () => {
      // Order with Package Price = 500, Rush Qty = 1 ($150), Dance Trad VO = $25 (80% -> $20 payout)
      // Total Payroll Base = 650
      const computed = computeClientPayroll(
        mockProducer,
        650,
        { payroll_base_price: 650, customer_facing_price: 650 } as any,
        80,
        null,
        "dance-jazz",
        650,
        {
          rushFeeQuantity: 1,
          hasTraditionalVoiceover: true,
        }
      );

      assert.equal(computed.voiceoverPayout, 20); // $25 * 80% = $20
      assert.equal(computed.rushFeePayout, 150); // $150 * 1 * 100% = $150
      // Base package payout: (650 - 150) * 80% = 400. Total payout = 400 + 150 + 20 = 570
      assert.equal(computed.producerPayout, 570);
    });
  });
});
