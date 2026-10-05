import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRecordPriceSavePatch,
  resolveLiveOrderPricing,
} from "../order-package-price";
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
});
