import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateMarchingBandOrderPricing,
  calculateSportsEntertainmentOrderPricing,
  calculateSchoolAnthemOrderPricing,
} from "../pricing-engine";
import { evaluateCouponCode } from "../discount-codes";
import type { DiscountCode } from "../../types";

const mockDiscountCodes: DiscountCode[] = [
  { id: "1", code: "SAVE50", discountType: "fixed", discountValue: 50, description: "$50 Off" },
  { id: "2", code: "PROMO10", discountType: "percentage", discountValue: 10, description: "10% Off" },
];

describe("Prompt 9 — New Categories Completion Modal Pricing & Coupon Integration", () => {
  describe("Marching Band Completion Pricing Breakdown", () => {
    it("calculates Marching Band itemized breakdown with both add-ons active and coupon", () => {
      const result = calculateMarchingBandOrderPricing({
        packageType: "BAND CHANT",
        musicAffiliate: "",
        hasSheetMusicAdd: true,
        hasAddVocals: true,
      });

      assert.equal(result.matchedEntry?.package, "BAND CHANT");
      assert.equal(result.matchedEntry?.customer, 600);
      assert.equal(result.customerFacingPrice, 600); // Base package price $600 (add-ons are separate)
      assert.equal(result.complianceStatus, "unknown-no-affiliate-field");

      // Wire coupon code
      const couponEval = evaluateCouponCode("SAVE50", mockDiscountCodes);
      assert.equal(couponEval.status, "valid");
      assert.equal(couponEval.match?.discountValue, 50);

      const discountAmount = couponEval.match?.discountValue || 0;
      const finalCustPrice = Math.max(0, result.customerFacingPrice - discountAmount);
      assert.equal(finalCustPrice, 550);
    });

    it("surfaces explicit unknown-no-affiliate-field state for Band Chant and Drum Cadence", () => {
      const bc = calculateMarchingBandOrderPricing({ packageType: "BAND CHANT" });
      assert.equal(bc.complianceStatus, "unknown-no-affiliate-field");

      const dc = calculateMarchingBandOrderPricing({ packageType: "DRUM CADENCE ORIGINAL" });
      assert.equal(dc.complianceStatus, "unknown-no-affiliate-field");
    });
  });

  describe("Sports Entertainment Completion Pricing & OTHER TBD Handling", () => {
    it("calculates Sports Entertainment itemized breakdown with Rush active", () => {
      const result = calculateSportsEntertainmentOrderPricing({
        packageType: "PRE-GAME / HALFTIME REMIXED",
        isRushOrder: "yes",
      });

      assert.equal(result.matchedEntry?.customer, 250);
      assert.equal(result.hasRushFee, true);
      assert.equal(result.rushFeeAmount, 100);
      assert.equal(result.customerFacingPrice, 250); // Base package price $250
      assert.equal(result.isUnpriced, false);
      assert.equal(result.needsManualQuote, false);
    });

    it("blocks automatic pricing for OTHER (mixes > 2:30) package", () => {
      const result = calculateSportsEntertainmentOrderPricing({
        packageType: "OTHER (mixes longer than 2:30)",
        isRushOrder: "no",
      });

      assert.equal(result.isUnpriced, true);
      assert.equal(result.needsManualQuote, true);
      assert.equal(result.customerFacingPrice, null);
      assert.equal(result.payrollBasePrice, null);
    });
  });

  describe("School Anthems Completion Pricing & Coupon", () => {
    it("calculates School Anthems flat $1,250 price and applies coupon", () => {
      const result = calculateSchoolAnthemOrderPricing({
        packageType: "SCHOOL ANTHEMS",
      });

      assert.equal(result.customerFacingPrice, 1250);
      assert.equal(result.payrollBasePrice, 1250);

      const couponEval = evaluateCouponCode("PROMO10", mockDiscountCodes);
      assert.equal(couponEval.status, "valid");

      const discountPct = couponEval.match?.discountValue || 0;
      const discountAmount = Math.round(result.payrollBasePrice * (discountPct / 100));
      assert.equal(discountAmount, 125);

      const finalPrice = result.customerFacingPrice - discountAmount;
      assert.equal(finalPrice, 1125);
    });
  });
});
