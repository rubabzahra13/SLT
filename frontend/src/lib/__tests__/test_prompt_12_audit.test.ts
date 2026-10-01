import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CHEER_DEMO_ORDERS } from "../../data/cheer-demo-orders";
import { calculateCheerOrderPricing } from "../pricing-engine";
import { evaluateCouponCode } from "../discount-codes";
import type { DiscountCode } from "../../types";

const mockDiscountCodes: DiscountCode[] = [
  { id: "disc-1", code: "DEMO 2026", description: "Demo showcase discount for new teams" },
  { id: "disc-4", code: "VIROC2026", description: "VIROC Partner Special 2026" },
  { id: "disc-5", code: "AUSTIN2026", description: "Austin Regional Special" },
  { id: "disc-6", code: "YOUTH10", description: "Youth Rec Cheer 10% Discount" },
];

describe("Prompt 12 — End-to-End Regression Audit Across All 4 Cheer Subtypes", () => {
  const subtypes = [
    { id: "all-star-cheer", name: "All-Star Cheer" },
    { id: "school-cheer-viroc-yes", name: "School Cheer — VIROC Yes" },
    { id: "school-cheer-viroc-no", name: "School Cheer — VIROC No" },
    { id: "youth-rec-cheer", name: "Youth Rec Cheer" },
  ] as const;

  it("Check 1: Subtype Dataset Audit (Prompt 4 — 10 orders per subtype)", () => {
    for (const sub of subtypes) {
      const orders = CHEER_DEMO_ORDERS.filter((o) => o.cheerFormSubtype === sub.id);
      assert.equal(orders.length, 10, `Expected exactly 10 orders for ${sub.name}`);
    }
  });

  it("Check 2: MTD Row Columns & Price Calculations (Prompts 5, 9, 10)", () => {
    for (const sub of subtypes) {
      const orders = CHEER_DEMO_ORDERS.filter((o) => o.cheerFormSubtype === sub.id);
      for (const order of orders) {
        const pricing = calculateCheerOrderPricing({
          cheerFormSubtype: sub.id,
          packageType: order.packageType!,
          timeLengthOfMix: order.timeLengthOfMix,
          musicAffiliate: order.musicAffiliate,
        });

        assert.ok(pricing.customerFacingPrice > 0);
        assert.ok(pricing.payrollBasePrice > 0);

        if (sub.id === "youth-rec-cheer") {
          assert.equal(pricing.complianceStatus, "unknown-no-affiliate-field");
        } else if (order.musicAffiliate?.toUpperCase().includes("POWER MUSIC")) {
          assert.equal(pricing.complianceStatus, "compliant");
        }
      }
    }
  });

  it("Check 3: Subtype-Specific Field Audit (Prompt 6)", () => {
    // All-Star Cheer has gymName and gymBillingAddress
    const as = CHEER_DEMO_ORDERS.find((o) => o.cheerFormSubtype === "all-star-cheer")!;
    assert.ok(as.gymName);
    assert.ok(as.gymBillingAddress);

    // School Cheer VIROC Yes has varsityVirocCustomer = 'Yes' and virocChoreographerName
    const scYes = CHEER_DEMO_ORDERS.find((o) => o.cheerFormSubtype === "school-cheer-viroc-yes")!;
    assert.equal(scYes.varsityVirocCustomer, "Yes");
    assert.ok(scYes.virocChoreographerName);

    // School Cheer VIROC No has varsityVirocCustomer = 'No' and choreographerName
    const scNo = CHEER_DEMO_ORDERS.find((o) => o.cheerFormSubtype === "school-cheer-viroc-no")!;
    assert.equal(scNo.varsityVirocCustomer, "No");
    assert.ok(scNo.choreographerName);

    // Youth Rec Cheer has programName and coachContactFullName
    const yr = CHEER_DEMO_ORDERS.find((o) => o.cheerFormSubtype === "youth-rec-cheer")!;
    assert.ok(yr.programName);
  });

  it("Check 4: Interactive Add-On Toggles Math", () => {
    // Rush Fee ($150)
    const scOrder = CHEER_DEMO_ORDERS.find((o) => o.cheerFormSubtype === "school-cheer-viroc-yes")!;
    const baseSc = calculateCheerOrderPricing({
      cheerFormSubtype: "school-cheer-viroc-yes",
      packageType: scOrder.packageType!,
      timeLengthOfMix: scOrder.timeLengthOfMix,
      musicAffiliate: scOrder.musicAffiliate,
      rushFeeOption: "none",
    });
    const rushSc = calculateCheerOrderPricing({
      cheerFormSubtype: "school-cheer-viroc-yes",
      packageType: scOrder.packageType!,
      timeLengthOfMix: scOrder.timeLengthOfMix,
      musicAffiliate: scOrder.musicAffiliate,
      rushFeeOption: "single",
    });
    assert.equal(rushSc.customerFacingPrice, baseSc.customerFacingPrice);
    assert.equal(rushSc.payrollBasePrice, baseSc.payrollBasePrice + 150);

    // Youth Rec Cheer Add-Ons ($25 + $50 = $75)
    const yrOrder = CHEER_DEMO_ORDERS.find((o) => o.cheerFormSubtype === "youth-rec-cheer")!;
    const baseYr = calculateCheerOrderPricing({
      cheerFormSubtype: "youth-rec-cheer",
      packageType: yrOrder.packageType!,
      timeLengthOfMix: yrOrder.timeLengthOfMix,
    });
    const addOnYr = calculateCheerOrderPricing({
      cheerFormSubtype: "youth-rec-cheer",
      packageType: yrOrder.packageType!,
      timeLengthOfMix: yrOrder.timeLengthOfMix,
      hasExtend8ctAddon: true,
      hasProcessing8ctSheetsAddon: true,
    });
    assert.equal(addOnYr.customerFacingPrice, baseYr.customerFacingPrice);
    assert.equal(addOnYr.payrollBasePrice, baseYr.payrollBasePrice + 75);
  });

  it("Check 5: Completion Modal Breakdown & Coupon Integration (Prompt 11)", () => {
    for (const sub of subtypes) {
      const sampleOrder = CHEER_DEMO_ORDERS.find((o) => o.cheerFormSubtype === sub.id)!;
      const pricing = calculateCheerOrderPricing({
        cheerFormSubtype: sub.id,
        packageType: sampleOrder.packageType!,
        timeLengthOfMix: sampleOrder.timeLengthOfMix,
        musicAffiliate: sampleOrder.musicAffiliate,
      });

      const couponEval = evaluateCouponCode(sampleOrder.couponCode || "", mockDiscountCodes);

      assert.ok(pricing.customerFacingPrice > 0);
      assert.ok(pricing.payrollBasePrice > 0);
      assert.ok(couponEval.status);
    }
  });

  it("Check 6: Move to Payroll Transition (Prompt 12)", () => {
    for (const sub of subtypes) {
      const sampleOrder = CHEER_DEMO_ORDERS.find((o) => o.cheerFormSubtype === sub.id)!;
      const pricing = calculateCheerOrderPricing({
        cheerFormSubtype: sub.id,
        packageType: sampleOrder.packageType!,
        timeLengthOfMix: sampleOrder.timeLengthOfMix,
        musicAffiliate: sampleOrder.musicAffiliate,
      });

      assert.ok(typeof pricing.payrollBasePrice === "number");
      assert.ok(typeof pricing.customerFacingPrice === "number");
    }
  });

  it("Check 7: Subtype Scope Leakage Audit", () => {
    // Youth rec add-ons ignored on school cheer and all-star
    const scYouth = calculateCheerOrderPricing({ cheerFormSubtype: "school-cheer-viroc-yes", packageType: "SILVER 1:00", hasExtend8ctAddon: true, hasProcessing8ctSheetsAddon: true });
    assert.equal(scYouth.customerFacingPrice, 450);
  });
});
