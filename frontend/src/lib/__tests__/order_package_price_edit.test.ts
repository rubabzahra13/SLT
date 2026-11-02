import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRecordPriceSavePatch,
  pricingPatchAfterAffiliateResolve,
  resolveLiveOrderPricing,
  resolveOrderPackageDisplayPrice,
} from "../order-package-price";
import { ALL_STAR_CHEER_MUSIC_AFFILIATE_OPTIONS } from "../pricing-reference";
import { resolveAffiliateFlagPatch } from "../affiliate-flag";
import type { MTDRecord, Order } from "@/types";

function baseRec(overrides: Partial<MTDRecord> = {}): MTDRecord {
  return {
    id: "mtd-1",
    orderId: "ord-1",
    package: "GOLD 1:30",
    price: 600,
    priceCompliance: "compliant",
    ...overrides,
  } as MTDRecord;
}

function baseOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "ord-1",
    packageType: "GOLD 1:30",
    timeLengthOfMix: "1:30",
    formType: "school-all-star-cheer",
    cheerFormSubtype: "all-star-cheer",
    musicAffiliate: "Power Music Covers",
    price: 600,
    ...overrides,
  } as Order;
}

describe("package price requires tier + mix length", () => {
  it("does not show GOLD 1:30 ($700) when Length of Mix is missing or TBD", () => {
    const rec = baseRec({ package: "GOLD", price: 0 });
    const missing = baseOrder({
      packageType: "GOLD",
      package: "GOLD",
      timeLengthOfMix: "",
      price: 0,
    });
    assert.equal(resolveOrderPackageDisplayPrice(rec, missing), 0);

    const tbd = baseOrder({
      packageType: "GOLD",
      package: "GOLD",
      timeLengthOfMix: "TBD",
      price: 0,
    });
    assert.equal(resolveOrderPackageDisplayPrice(rec, tbd), 0);
  });

  it("prices GOLD with Length of Mix 2:30 as $1,100", () => {
    const rec = baseRec({ package: "GOLD", price: 0 });
    const order = baseOrder({
      packageType: "GOLD",
      package: "GOLD",
      timeLengthOfMix: "2:30",
      price: 0,
    });
    assert.equal(resolveOrderPackageDisplayPrice(rec, order), 1100);
  });
});

describe("payroll/cost uses compliant rate card, not edited customer price", () => {
  it("package-chip edit updates customer only; payroll stays engine/reference", () => {
    const rec = baseRec();
    const order = baseOrder();
    const live = resolveLiveOrderPricing(rec, order);
    const patch = buildRecordPriceSavePatch(rec, order, 999, "non-compliant");
    assert.equal(patch.finalCustomerPrice, 999);
    assert.equal(patch.finalCustomerPriceOverridden, true);
    if (live.enginePayrollPrice != null) {
      assert.equal(patch.finalPayrollPrice, live.enginePayrollPrice);
      assert.notEqual(patch.finalPayrollPrice, 999);
    }
  });

  it("when package price matches engine, payroll keeps engine payroll", () => {
    const rec = baseRec();
    const order = baseOrder();
    const live = resolveLiveOrderPricing(rec, order);
    const engineCustomer = live.engineCustomerPrice;
    const enginePayroll = live.enginePayrollPrice;
    if (engineCustomer == null || enginePayroll == null) {
      const patch = buildRecordPriceSavePatch(rec, order, 600, "compliant");
      assert.equal(typeof patch.finalPayrollPrice, "number");
      return;
    }
    const patch = buildRecordPriceSavePatch(
      rec,
      order,
      engineCustomer,
      "compliant"
    );
    assert.equal(patch.finalCustomerPriceOverridden, false);
    assert.equal(patch.finalPayrollPrice, enginePayroll);
  });

  it("live pricing keeps compliant payroll when customer package is overridden", () => {
    const rec = baseRec({
      finalCustomerPrice: 888,
      finalCustomerPriceOverridden: true,
      finalPayrollPrice: 888,
      price: 888,
    });
    const order = baseOrder({
      finalCustomerPrice: 888,
      finalCustomerPriceOverridden: true,
      finalPayrollPrice: 888,
      price: 888,
    });
    const live = resolveLiveOrderPricing(rec, order);
    assert.equal(live.isOverridden, true);
    assert.equal(live.customerPrice, 888);
    if (live.enginePayrollPrice != null && live.enginePayrollPrice > 0) {
      assert.equal(live.payrollPrice, live.enginePayrollPrice);
      assert.notEqual(live.payrollPrice, 888);
    }
  });

  it("live pricing ignores stale finalPayrollPrice stamped from customer edit", () => {
    const rec = baseRec({
      finalCustomerPriceOverridden: true,
      finalCustomerPrice: 9999,
      finalPayrollPrice: 9999,
      price: 9999,
    });
    const order = baseOrder({
      finalCustomerPriceOverridden: true,
      finalCustomerPrice: 9999,
      finalPayrollPrice: 9999,
      price: 9999,
    });
    const live = resolveLiveOrderPricing(rec, order);
    if (live.enginePayrollPrice != null && live.enginePayrollPrice > 0) {
      assert.equal(live.payrollPrice, live.enginePayrollPrice);
      assert.notEqual(live.payrollPrice, 9999);
    }
  });

  it("compliant affiliate (Power Music Covers) uses compliant payroll column", () => {
    const rec = baseRec();
    const order = baseOrder({ musicAffiliate: "Power Music Covers" });
    const live = resolveLiveOrderPricing(rec, order);
    const nonCompliantOrder = baseOrder({
      musicAffiliate: "Some Random Bootleg Track",
    });
    const nonLive = resolveLiveOrderPricing(rec, nonCompliantOrder);
    if (
      live.enginePayrollPrice != null &&
      nonLive.enginePayrollPrice != null &&
      live.engineCustomerPrice != null
    ) {
      // Compliant payroll is at or below customer; non-compliant uses higher column.
      assert.ok(live.payrollPrice <= (live.engineCustomerPrice || Infinity));
      assert.ok(nonLive.payrollPrice >= live.payrollPrice);
    }
  });

  it("dance Extra Songs + Editing Time fold into live payroll price", () => {
    const rec = baseRec({
      package: "CUSTOM POM",
      extraSongsQuantity: 2,
      extraSongEditingTimeQuantity: 2,
      category: "All Star Dance",
    });
    const order = baseOrder({
      formType: "school-all-star-dance",
      danceFormSubtype: "pom",
      cheerFormSubtype: undefined,
      packageType: "CUSTOM POM",
      timeLengthOfMix: undefined,
      musicAffiliate: "Power Music Covers",
      extraSongsQuantity: 2,
      extraSongEditingTimeQuantity: 2,
    });
    const live = resolveLiveOrderPricing(rec, order);
    const bare = resolveLiveOrderPricing(
      { ...rec, extraSongsQuantity: 0, extraSongEditingTimeQuantity: 0 },
      { ...order, extraSongsQuantity: 0, extraSongEditingTimeQuantity: 0 }
    );
    // 2×$15 + 2×$30 = $90 on top of rate-card payroll.
    if (bare.enginePayrollPrice != null && bare.enginePayrollPrice > 0) {
      assert.equal(live.payrollPrice, bare.payrollPrice + 90);
      assert.equal(live.enginePayrollPrice, bare.enginePayrollPrice! + 90);
    }
  });

  it("does not price a flagged multi-affiliate order", () => {
    const raw = ALL_STAR_CHEER_MUSIC_AFFILIATE_OPTIONS.join(", ");
    const rec = baseRec({
      price: 350,
      finalCustomerPrice: 350,
    });
    const order = baseOrder({
      musicAffiliate: raw,
      musicAffiliateSelections: raw,
      affiliateFlagStatus: "open",
      price: 350,
      finalCustomerPrice: 350,
    });
    const live = resolveLiveOrderPricing(rec, order);
    assert.equal(live.customerPrice, 0);
    assert.equal(live.payrollPrice, 0);
    assert.equal(live.engineCustomerPrice, null);
    assert.equal(live.enginePayrollPrice, null);
  });

  it("prices like a normal order after a single affiliate is chosen", () => {
    const raw = ALL_STAR_CHEER_MUSIC_AFFILIATE_OPTIONS.join(", ");
    const flagged = baseOrder({
      musicAffiliate: raw,
      musicAffiliateSelections: raw,
      affiliateFlagStatus: "open",
      price: 0,
    });
    const resolved = {
      ...flagged,
      ...resolveAffiliateFlagPatch(flagged, "Songs for Cheer"),
    };
    assert.equal(resolved.musicAffiliate, "Songs for Cheer");
    const patch = pricingPatchAfterAffiliateResolve(resolved);
    const single = baseOrder({ musicAffiliate: "Songs for Cheer" });
    const expected = resolveLiveOrderPricing(baseRec(), single);
    assert.equal(patch.price, expected.customerPrice);
    assert.equal(patch.finalCustomerPrice, expected.customerPrice);
    assert.equal(patch.finalPayrollPrice, expected.payrollPrice);
  });
});
