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
  it("Marching Band demo orders: Customer prices match engine calculations", () => {
    for (const order of MARCHING_BAND_DEMO_ORDERS) {
      const pricing = calculateMarchingBandOrderPricing({
        packageType: order.packageType || order.package,
        hasSheetMusicAdd: order.hasSheetMusicAdd,
        hasAddVocals: order.hasAddVocals,
      });

      assert.equal(pricing.customerFacingPrice, order.price);
    }
  });

  it("Sports Entertainment demo orders: 9 priced orders match rate card + rush fee, 10th order returns explicit unpriced state", () => {
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
        assert.equal(pricing.customerFacingPrice, order.price);
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

  it("Marching Band Interactive Add-on Toggles: live price recalculation", () => {
    const baseOrder = MARCHING_BAND_DEMO_ORDERS.find(
      (o) => o.packageType === "BAND CHANT"
    )!;

    const basePrice = calculateMarchingBandOrderPricing({
      packageType: baseOrder.packageType,
      hasSheetMusicAdd: false,
      hasAddVocals: false,
    }).customerFacingPrice;
    assert.equal(basePrice, 600);

    const sheetMusicPrice = calculateMarchingBandOrderPricing({
      packageType: baseOrder.packageType,
      hasSheetMusicAdd: true,
      hasAddVocals: false,
    }).customerFacingPrice;
    assert.equal(sheetMusicPrice, 650);

    const vocalsPrice = calculateMarchingBandOrderPricing({
      packageType: baseOrder.packageType,
      hasSheetMusicAdd: false,
      hasAddVocals: true,
    }).customerFacingPrice;
    assert.equal(vocalsPrice, 675);

    const bothPrice = calculateMarchingBandOrderPricing({
      packageType: baseOrder.packageType,
      hasSheetMusicAdd: true,
      hasAddVocals: true,
    }).customerFacingPrice;
    assert.equal(bothPrice, 725);
  });

  it("Sports Entertainment Interactive Rush Order Toggle: live price recalculation", () => {
    const baseOrder = SPORTS_ENTERTAINMENT_DEMO_ORDERS.find(
      (o) => o.packageType === "QUARTER BREAK / TIMEOUT REMIXED"
    )!;

    const noRushPrice = calculateSportsEntertainmentOrderPricing({
      packageType: baseOrder.packageType,
      isRushOrder: "no",
    }).customerFacingPrice;
    assert.equal(noRushPrice, 150);

    const rushPrice = calculateSportsEntertainmentOrderPricing({
      packageType: baseOrder.packageType,
      isRushOrder: "yes",
    }).customerFacingPrice;
    assert.equal(rushPrice, 250);
  });
});
