import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateCheerOrderPricing } from "../pricing-engine";
import { normalizeDiscountCode, evaluateCouponCode } from "../discount-codes";
import type { DiscountCode } from "../../types";

describe("Discount Code Engine Unit Tests (Fixed & Percentage)", () => {
  const mockDiscountCodes: DiscountCode[] = [
    normalizeDiscountCode({
      id: "disc-save200",
      code: "SAVE200",
      description: "Summer promotion",
      discountType: "fixed",
      discountValue: 200,
    }),
    normalizeDiscountCode({
      id: "disc-save10",
      code: "SAVE10",
      description: "10 percent off promotion",
      discountType: "percentage",
      discountValue: 10,
    }),
    normalizeDiscountCode({
      id: "disc-save20",
      code: "SAVE20",
      description: "20 percent off promotion",
      discountType: "percentage",
      discountValue: 20,
    }),
    normalizeDiscountCode({
      id: "disc-test10",
      code: "TEST10",
      description: "", // Blank optional description
      discountType: "percentage",
      discountValue: 10,
    }),
    normalizeDiscountCode({
      id: "disc-big500",
      code: "BIG500",
      description: "$500 off big discount",
      discountType: "fixed",
      discountValue: 500,
    }),
  ];

  it("Test 1 — Fixed Amount ($200 off $1,000)", () => {
    const matched = lookupCode("SAVE200", mockDiscountCodes);
    assert.ok(matched);

    const result = calculateCheerOrderPricing({
      cheerFormSubtype: "all-star-cheer",
      packageType: "PLATINUM 1:30", // Base customer: $1050, compliant base: $850, non-compliant base: $1050
      musicAffiliate: "Unapproved Affiliate", // Non-compliant -> pre-discount payroll base: $1050
      discountCodeObj: matched,
    });

    assert.equal(result.preDiscountPayrollBasePrice, 1050);
    assert.equal(result.discountAmount, 200);
    assert.equal(result.payrollBasePrice, 850); // $1050 - $200 = $850
  });

  it("Test 2 — Percentage (10% off $1,000)", () => {
    const matched = lookupCode("SAVE10", mockDiscountCodes);
    assert.ok(matched);

    const result = calculateCheerOrderPricing({
      cheerFormSubtype: "all-star-cheer",
      packageType: "GOLD 2:30", // Compliant payroll base: $1000
      musicAffiliate: "Power Music", // Compliant -> pre-discount payroll base: $1000
      discountCodeObj: matched,
    });

    assert.equal(result.preDiscountPayrollBasePrice, 1000);
    assert.equal(result.discountAmount, 100); // 10% of $1000 = $100
    assert.equal(result.payrollBasePrice, 900); // $1000 - $100 = $900
  });

  it("Test 3 — Percentage 20% (20% off $1,000)", () => {
    const matched = lookupCode("SAVE20", mockDiscountCodes);
    assert.ok(matched);

    const result = calculateCheerOrderPricing({
      cheerFormSubtype: "all-star-cheer",
      packageType: "GOLD 2:30", // Compliant payroll base: $1000
      musicAffiliate: "Power Music",
      discountCodeObj: matched,
    });

    assert.equal(result.preDiscountPayrollBasePrice, 1000);
    assert.equal(result.discountAmount, 200); // 20% of $1000 = $200
    assert.equal(result.payrollBasePrice, 800); // $1000 - $200 = $800
  });

  it("Test 4 — Optional Description (blank description creates & matches successfully)", () => {
    const matched = lookupCode("TEST10", mockDiscountCodes);
    assert.ok(matched);
    assert.equal(matched.description, "");

    const result = calculateCheerOrderPricing({
      cheerFormSubtype: "all-star-cheer",
      packageType: "GOLD 1:30", // Compliant payroll base: $600
      musicAffiliate: "Power Music",
      discountCodeObj: matched,
    });

    assert.equal(result.preDiscountPayrollBasePrice, 600);
    assert.equal(result.discountAmount, 60); // 10% of $600 = $60
    assert.equal(result.payrollBasePrice, 540); // $600 - $60 = $540
  });

  it("Test 5 — No Matching Code (unmatched code results in $0 discount)", () => {
    const evalRes = evaluateCouponCode("DOESNOTEXIST", mockDiscountCodes);
    assert.equal(evalRes.status, "invalid");

    const matched = (evalRes as any).match ?? null;
    assert.equal(matched, null);

    const result = calculateCheerOrderPricing({
      cheerFormSubtype: "school-cheer-viroc-yes",
      packageType: "GOLD 2:00", // Payroll base: $850
      musicAffiliate: "Power Music",
      discountCodeObj: matched,
    });

    assert.equal(result.discountAmount, 0);
    assert.equal(result.payrollBasePrice, 850);
  });

  it("Test 6 — No Coupon Code (no coupon provided)", () => {
    const result = calculateCheerOrderPricing({
      cheerFormSubtype: "school-cheer-viroc-yes",
      packageType: "GOLD 2:00",
      musicAffiliate: "Power Music",
      discountCodeObj: null,
    });

    assert.equal(result.discountAmount, 0);
    assert.equal(result.payrollBasePrice, 850);
  });

  it("Test 7 — Existing Pricing Pipeline + Coupon (Package + Add-on + Coupon)", () => {
    const matched = lookupCode("SAVE200", mockDiscountCodes);
    assert.ok(matched);

    const result = calculateCheerOrderPricing({
      cheerFormSubtype: "school-cheer-viroc-yes",
      packageType: "GOLD 2:00", // Compliant base: $850
      musicAffiliate: "Power Music",
      hasRallyMix: true, // Rally Mix add-on: +$350 -> Pre-discount payroll base: $1200
      discountCodeObj: matched, // -$200 fixed
    });

    assert.equal(result.preDiscountPayrollBasePrice, 1200); // $850 + $350
    assert.equal(result.discountAmount, 200);
    assert.equal(result.payrollBasePrice, 1000); // $1200 - $200 = $1000
  });

  it("Test 8 — Price Floor Validation (Discount cannot produce negative price)", () => {
    const matched = lookupCode("BIG500", mockDiscountCodes);
    assert.ok(matched);

    const result = calculateCheerOrderPricing({
      cheerFormSubtype: "school-cheer-viroc-yes",
      packageType: "SILVER 1:00", // Compliant base: $350
      musicAffiliate: "Power Music",
      discountCodeObj: matched, // -$500 fixed
    });

    assert.equal(result.preDiscountPayrollBasePrice, 350);
    assert.equal(result.discountAmount, 350); // Capped at pre-discount price $350
    assert.equal(result.payrollBasePrice, 0); // Minimum $0 floor
  });
});

function lookupCode(code: string, list: DiscountCode[]): DiscountCode | null {
  const res = evaluateCouponCode(code, list);
  return res.status === "valid" ? res.match ?? null : null;
}
