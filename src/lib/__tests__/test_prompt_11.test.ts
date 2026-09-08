import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CHEER_DEMO_ORDERS } from "../../data/cheer-demo-orders";
import { calculateCheerOrderPricing } from "../pricing-engine";
import { evaluateCouponCode } from "../discount-codes";
import type { DiscountCode } from "../../types";

describe("Prompt 11 — Completion Modal Pricing Breakdown + Coupon Integration", () => {
  const mockDiscountCodes: DiscountCode[] = [
    { id: "disc-1", code: "DEMO 2026", description: "Demo showcase discount for new teams" },
    { id: "disc-2", code: "SUMMER25", description: "Summer 2025 seasonal promotion" },
    { id: "disc-3", code: "RETURN10", description: "Returning customer loyalty code" },
    { id: "disc-4", code: "VIROC2026", description: "VIROC Partner Special 2026" },
    { id: "disc-5", code: "AUSTIN2026", description: "Austin Regional Special" },
    { id: "disc-6", code: "YOUTH10", description: "Youth Rec Cheer 10% Discount" },
  ];

  it("Subtype 1 (All-Star Cheer): GOLD 1:30 ($700) + coupon AUSTIN2026", () => {
    const order = CHEER_DEMO_ORDERS.find((o) => o.cheerFormSubtype === "all-star-cheer")!;
    assert.ok(order);
    assert.equal(order.cheerFormSubtype, "all-star-cheer");

    const pricing = calculateCheerOrderPricing({
      cheerFormSubtype: order.cheerFormSubtype!,
      packageType: order.packageType!,
      timeLengthOfMix: order.timeLengthOfMix,
      musicAffiliate: order.musicAffiliate,
    });

    const couponEval = evaluateCouponCode(order.couponCode || "", mockDiscountCodes);

    assert.equal(pricing.customerFacingPrice, 700);
    assert.equal(pricing.payrollBasePrice, 600);
    assert.equal(pricing.complianceStatus, "compliant");
    assert.equal(couponEval.status, "valid");
    assert.equal(couponEval.match?.code, "AUSTIN2026");
  });

  it("Subtype 2 (School Cheer VIROC Yes): GOLD 2:00 ($950) + Rally Mix ($350) = $950 customer / $1,200 payroll", () => {
    const order = CHEER_DEMO_ORDERS.find((o) => o.id === "ord-demo-cheer-14")!;
    assert.ok(order);
    assert.equal(order.cheerFormSubtype, "school-cheer-viroc-yes");

    const pricing = calculateCheerOrderPricing({
      cheerFormSubtype: order.cheerFormSubtype!,
      packageType: order.packageType!,
      timeLengthOfMix: order.timeLengthOfMix,
      musicAffiliate: order.musicAffiliate,
      hasRallyMix: true,
    });

    assert.equal(pricing.customerFacingPrice, 950); // 950 base (add-ons are separate)
    assert.equal(pricing.payrollBasePrice, 1200); // 850 + 350
    assert.equal(pricing.complianceStatus, "compliant");
  });

  it("Subtype 3 (School Cheer VIROC No): SILVER 1:00 ($450)", () => {
    const order = CHEER_DEMO_ORDERS.find((o) => o.id === "ord-demo-cheer-21")!;
    assert.ok(order);
    assert.equal(order.cheerFormSubtype, "school-cheer-viroc-no");

    const pricing = calculateCheerOrderPricing({
      cheerFormSubtype: order.cheerFormSubtype!,
      packageType: order.packageType!,
      timeLengthOfMix: order.timeLengthOfMix,
      musicAffiliate: order.musicAffiliate,
    });

    assert.equal(pricing.customerFacingPrice, 450);
    assert.equal(pricing.payrollBasePrice, 350);
  });

  it("Subtype 4 (Youth Rec Cheer): BRONZE 1:00 ($450) + Extend-8ct ($25) + Process-8ct ($50) = $450 customer / $425 payroll", () => {
    const order = CHEER_DEMO_ORDERS.find((o) => o.id === "ord-demo-cheer-31")!;
    assert.ok(order);
    assert.equal(order.cheerFormSubtype, "youth-rec-cheer");

    const pricing = calculateCheerOrderPricing({
      cheerFormSubtype: order.cheerFormSubtype!,
      packageType: order.packageType!,
      timeLengthOfMix: order.timeLengthOfMix,
      hasExtend8ctAddon: true,
      hasProcessing8ctSheetsAddon: true,
    });

    assert.equal(pricing.customerFacingPrice, 450); // 450 base (add-ons are separate)
    assert.equal(pricing.payrollBasePrice, 425); // 350 + 25 + 50
  });
});
