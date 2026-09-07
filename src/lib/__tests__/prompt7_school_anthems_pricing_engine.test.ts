import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateSchoolAnthemOrderPricing,
  lookupSchoolAnthemRateCardEntry,
  SCHOOL_ANTHEM_RATE_CARD,
} from "../pricing-engine";
import { SCHOOL_ANTHEMS_DEMO_ORDERS } from "../../data/new-categories-demo-orders";

describe("Prompt 7 — School Anthems Pricing Engine Unit Tests", () => {
  it("Rate Card completeness: contains single SCHOOL ANTHEMS package at $1,250", () => {
    assert.equal(SCHOOL_ANTHEM_RATE_CARD.length, 1);
    assert.equal(SCHOOL_ANTHEM_RATE_CARD[0].package, "SCHOOL ANTHEMS");
    assert.equal(SCHOOL_ANTHEM_RATE_CARD[0].customer, 1250);
    assert.equal(SCHOOL_ANTHEM_RATE_CARD[0].compliant, 1250);
    assert.equal(SCHOOL_ANTHEM_RATE_CARD[0].nonCompliant, 1250);
  });

  it("Default calculation: returns customerFacingPrice = 1250, payrollBasePrice = 1250 unconditionally", () => {
    const res = calculateSchoolAnthemOrderPricing();

    assert.equal(res.customerFacingPrice, 1250);
    assert.equal(res.payrollBasePrice, 1250);
    assert.equal(res.compliantPayrollBasePrice, 1250);
    assert.equal(res.nonCompliantPayrollBasePrice, 1250);
    assert.equal(res.packageName, "SCHOOL ANTHEMS");
  });

  it("Lookup with arbitrary string input still returns the single SCHOOL ANTHEMS package ($1,250)", () => {
    const entry = lookupSchoolAnthemRateCardEntry("ANY RANDOM PACKAGE STRING");
    assert.equal(entry.package, "SCHOOL ANTHEMS");
    assert.equal(entry.customer, 1250);

    const res = calculateSchoolAnthemOrderPricing({
      packageType: "ANY RANDOM PACKAGE STRING",
    });
    assert.equal(res.customerFacingPrice, 1250);
    assert.equal(res.payrollBasePrice, 1250);
  });

  it("All 10 demo orders evaluate to exactly $1,250", () => {
    for (const order of SCHOOL_ANTHEMS_DEMO_ORDERS) {
      const res = calculateSchoolAnthemOrderPricing({
        packageType: order.packageType || order.package,
      });
      assert.equal(res.customerFacingPrice, 1250);
      assert.equal(res.payrollBasePrice, 1250);
    }
  });
});
