import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MARCHING_BAND_DEMO_ORDERS,
  SCHOOL_ANTHEMS_DEMO_ORDERS,
  SPORTS_ENTERTAINMENT_DEMO_ORDERS,
} from "../../data/new-categories-demo-orders";
import {
  calculateMarchingBandOrderPricing,
  calculateSportsEntertainmentOrderPricing,
  calculateSchoolAnthemOrderPricing,
} from "../pricing-engine";

describe("Prompt 8 — Connect All Three Categories' Pricing to MTD", () => {
  it("Marching Band demo orders: Customer prices match base rate card package price", () => {
    for (const order of MARCHING_BAND_DEMO_ORDERS) {
      const pricing = calculateMarchingBandOrderPricing({
        packageType: order.packageType || order.package,
        hasSheetMusicAdd: order.hasSheetMusicAdd,
        hasAddVocals: order.hasAddVocals,
      });

      assert.equal(pricing.customerFacingPrice, pricing.matchedEntry?.customer ?? order.price);
    }
  });

  it("Sports Entertainment demo orders: 9 priced orders match base rate card, 10th order returns explicit unpriced state", () => {
    for (const order of SPORTS_ENTERTAINMENT_DEMO_ORDERS) {
      const pricing = calculateSportsEntertainmentOrderPricing({
        packageType: order.packageType || order.package,
        isRushOrder: order.isRushOrder,
      });

      if (order.id === "ord-demo-se-10") {
        assert.equal(pricing.isUnpriced, true);
        assert.equal(pricing.needsManualQuote, true);
        assert.equal(pricing.customerFacingPrice, null);
      } else {
        assert.equal(pricing.isUnpriced, false);
        assert.equal(pricing.customerFacingPrice, pricing.matchedEntry?.customer);
      }
    }
  });

  it("School Anthems demo orders: All 10 orders return customerFacingPrice = 1250", () => {
    for (const order of SCHOOL_ANTHEMS_DEMO_ORDERS) {
      const pricing = calculateSchoolAnthemOrderPricing({
        packageType: order.packageType || order.package,
      });

      assert.equal(pricing.customerFacingPrice, 1250);
      assert.equal(order.price, 1250);
    }
  });

  it("Marching Band Interactive Add-on Toggles: Package Price remains $600 while Payroll Base recalculates", () => {
    const baseOrder = MARCHING_BAND_DEMO_ORDERS.find(
      (o) => o.packageType === "BAND CHANT"
    )!;

    const baseRes = calculateMarchingBandOrderPricing({
      packageType: baseOrder.packageType,
      hasSheetMusicAdd: false,
      hasAddVocals: false,
    });
    assert.equal(baseRes.customerFacingPrice, 600);
    assert.equal(baseRes.payrollBasePrice, 600);

    const sheetMusicRes = calculateMarchingBandOrderPricing({
      packageType: baseOrder.packageType,
      hasSheetMusicAdd: true,
      hasAddVocals: false,
    });
    assert.equal(sheetMusicRes.customerFacingPrice, 600);
    assert.equal(sheetMusicRes.payrollBasePrice, 650);

    const vocalsRes = calculateMarchingBandOrderPricing({
      packageType: baseOrder.packageType,
      hasSheetMusicAdd: false,
      hasAddVocals: true,
    });
    assert.equal(vocalsRes.customerFacingPrice, 600);
    assert.equal(vocalsRes.payrollBasePrice, 675);

    const bothRes = calculateMarchingBandOrderPricing({
      packageType: baseOrder.packageType,
      hasSheetMusicAdd: true,
      hasAddVocals: true,
    });
    assert.equal(bothRes.customerFacingPrice, 600);
    assert.equal(bothRes.payrollBasePrice, 725);
  });

  it("Sports Entertainment Interactive Rush Order Toggle: Package Price remains $150 while Payroll Base recalculates", () => {
    const baseOrder = SPORTS_ENTERTAINMENT_DEMO_ORDERS.find(
      (o) => o.packageType === "QUARTER BREAK / TIMEOUT REMIXED"
    )!;

    const noRushRes = calculateSportsEntertainmentOrderPricing({
      packageType: baseOrder.packageType,
      isRushOrder: "no",
    });
    assert.equal(noRushRes.customerFacingPrice, 150);
    assert.equal(noRushRes.payrollBasePrice, 150);

    const rushRes = calculateSportsEntertainmentOrderPricing({
      packageType: baseOrder.packageType,
      isRushOrder: "yes",
    });
    assert.equal(rushRes.customerFacingPrice, 150);
    assert.equal(rushRes.payrollBasePrice, 300);
  });
});
