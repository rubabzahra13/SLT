import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateDanceOrderPricing } from "../pricing-engine";
import { evaluateCouponCode } from "../discount-codes";
import type { DiscountCode } from "../../types";

describe("Prompt 9 — Completion Modal Pricing Breakdown + Coupon Integration for Dance", () => {
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

  it("Subtype 1 (POM): CUSTOM POM ($850) + Power Music Covers (compliant) + Both VO (+100) + Coupon AUSTIN2026 (10%)", () => {
    const rawCoupon = "AUSTIN2026";
    const couponEval = evaluateCouponCode(rawCoupon, discountCodes);
    assert.equal(couponEval.status, "valid");

    const matchedDiscount = couponEval.match!;
    const danceResult = calculateDanceOrderPricing({
      danceFormSubtype: "pom",
      packageType: "CUSTOM POM",
      musicAffiliate: "Power Music Covers",
      hasTraditionalVoiceover: true,
      hasThemedVoiceover: true,
    });

    assert.equal(danceResult.customerFacingPrice, 850); // 850 base
    assert.equal(danceResult.payrollBasePrice, 730); // 730 (compliant)

    // Calculate display-only customer discount
    const preDiscountPay = danceResult.payrollBasePrice;
    const discountAmount = Math.round(preDiscountPay * (matchedDiscount.discountValue! / 100)); // 730 * 10% = 73
    assert.equal(discountAmount, 73);

    // Coupon is display-only customer info. Package Price and Payroll Base remain untouched.
    const displayOnlyCustomerDiscountedPrice = danceResult.customerFacingPrice - discountAmount; // 850 - 73 = 777
    assert.equal(displayOnlyCustomerDiscountedPrice, 777);
    assert.equal(danceResult.customerFacingPrice, 850);
    assert.equal(danceResult.payrollBasePrice, 730);
  });

  it("Subtype 2 (Hip Hop): DANCE PLUS ($575) + Unleash the Beats Covers (compliant) + No VO + No Coupon", () => {
    const danceResult = calculateDanceOrderPricing({
      danceFormSubtype: "hip-hop",
      packageType: "DANCE PLUS",
      musicAffiliate: "Unleash the Beats Covers",
    });

    assert.equal(danceResult.customerFacingPrice, 575);
    assert.equal(danceResult.payrollBasePrice, 430);
    assert.equal(danceResult.complianceStatus, "compliant");
  });

  it("Subtype 3 (Team Performance & Variety): TP MIX ($500) + Non-Compliant Affiliate + Traditional VO (+25)", () => {
    const danceResult = calculateDanceOrderPricing({
      danceFormSubtype: "team-performance-variety",
      packageType: "TP MIX",
      musicAffiliate: "Unapproved Indie Track",
      hasTraditionalVoiceover: true,
      hasThemedVoiceover: false,
    });

    assert.equal(danceResult.customerFacingPrice, 500); // 500 base
    assert.equal(danceResult.payrollBasePrice, 500); // 500 (non-compliant)
    assert.equal(danceResult.complianceStatus, "non-compliant");
  });

  it("Subtype 4 (Gameday): PERFORMANCE EXTREME ($200) + Power Music (compliant) + Themed VO (+75) + Coupon SAVE50 ($50 off)", () => {
    const rawCoupon = "SAVE50";
    const couponEval = evaluateCouponCode(rawCoupon, discountCodes);
    assert.equal(couponEval.status, "valid");

    const matchedDiscount = couponEval.match!;
    const danceResult = calculateDanceOrderPricing({
      danceFormSubtype: "gameday",
      packageType: "PERFORMANCE EXTREME",
      musicAffiliate: "Power Music",
      hasTraditionalVoiceover: false,
      hasThemedVoiceover: true,
    });

    assert.equal(danceResult.customerFacingPrice, 200); // 200 base
    assert.equal(danceResult.payrollBasePrice, 140); // 140 base

    const discountAmount = Math.min(danceResult.payrollBasePrice, matchedDiscount.discountValue!); // 50
    assert.equal(discountAmount, 50);

    // Display-only customer discounted price = 150. Actual Package Price & Payroll Base remain 200 & 140.
    const displayOnlyCustomerDiscountedPrice = danceResult.customerFacingPrice - discountAmount; // 200 - 50 = 150
    assert.equal(displayOnlyCustomerDiscountedPrice, 150);
    assert.equal(danceResult.customerFacingPrice, 200);
    assert.equal(danceResult.payrollBasePrice, 140);
  });

  it("Subtype 5 (Jazz/Kick): JAZZ SIMPLE CUT ($100) + Non-Compliant Affiliate + Both VO (+100)", () => {
    const danceResult = calculateDanceOrderPricing({
      danceFormSubtype: "jazz-kick",
      packageType: "JAZZ SIMPLE CUT",
      musicAffiliate: "Bootleg Cut Track",
      hasTraditionalVoiceover: true,
      hasThemedVoiceover: true,
    });

    assert.equal(danceResult.customerFacingPrice, 100); // 100 base
    assert.equal(danceResult.payrollBasePrice, 100); // 100 (always fixed)
    assert.equal(danceResult.alwaysFixedPayroll, true);
  });
});
