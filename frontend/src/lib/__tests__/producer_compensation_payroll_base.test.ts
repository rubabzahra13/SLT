import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeClientPayroll } from "../pricing-display";
import type { Producer } from "../../types";
import type { PricingBreakdown } from "../api/pricing";

describe("Producer Compensation — Final Payroll Price Basis Unit Tests", () => {
  const sampleProducer: Producer = {
    id: "prod-test",
    name: "Test Producer",
    initials: "TP",
    email: "test@example.com",
    specialty: "Producer",
    avatar: "/avatars/test.png",
    mixesThisWeek: 1,
    nextAvailable: "Today",
    status: "available",
    workDays: ["mon", "tue", "wed", "thu", "fri"],
    timeOff: [],
    maxMixesPerDay: null,
    maxProducerCostPerDay: null,
    categories: ["All-Star Cheer"],
    overtimeDays: [],
    compensationModel: "percentage_of_payroll_base",
    defaultRate: 0.50,
  };

  it("Test 1 — Customer Price differs from Payroll Price ($1,000 Customer / $800 Payroll / 50% -> $400 Payout)", () => {
    const custPrice = 1000;
    const payrollPrice = 800;

    const breakdown: PricingBreakdown = {
      form_type: "school-all-star-cheer",
      canonical_subtype_id: "all-star-cheer",
      package_id: "pkg-1",
      package_name: "GOLD 1:30",
      pricing_rule_id: null,
      compliance_status: "compliant",
      compliance_reason: "Verified",
      canonical_affiliate: "Power Music",
      base_customer_price: 1000,
      base_payroll_price: 800,
      addons: [],
      system_calculated_customer_price: 1000,
      payroll_base_price: 800,
      needs_manual_pricing: false,
      needs_manual_review: false,
      summary_line: "Test 1",
    };

    const res = computeClientPayroll(
      sampleProducer,
      custPrice,
      breakdown,
      0.50,
      null,
      "all-star-cheer",
      payrollPrice
    );

    assert.equal(res.producerPayout, 400);
    assert.notEqual(res.producerPayout, 500);
    assert.equal(res.sltPortion, 400); // $800 - $400 = $400
  });

  it("Test 2 — Add-on affects payroll ($1,000 Customer / $900 Payroll / 50% -> $450 Payout)", () => {
    const custPrice = 1000;
    const payrollPrice = 900;

    const res = computeClientPayroll(
      sampleProducer,
      custPrice,
      null,
      0.50,
      null,
      "all-star-cheer",
      payrollPrice
    );

    assert.equal(res.producerPayout, 450);
    assert.equal(res.sltPortion, 450); // $900 - $450 = $450
  });

  it("Test 3 — Deduction affects payroll ($1,000 Customer / $800 Payroll / 50% -> $400 Payout)", () => {
    const custPrice = 1000;
    const payrollPrice = 800;

    const res = computeClientPayroll(
      sampleProducer,
      custPrice,
      null,
      0.50,
      null,
      "all-star-cheer",
      payrollPrice
    );

    assert.equal(res.producerPayout, 400);
    assert.equal(res.sltPortion, 400); // $800 - $400 = $400
  });

  it("Test 4 — Coupon affects payroll ($1,000 Customer / $800 Payroll after coupon / 50% -> $400 Payout)", () => {
    const custPrice = 1000;
    const payrollPrice = 800;

    const res = computeClientPayroll(
      sampleProducer,
      custPrice,
      null,
      0.50,
      null,
      "all-star-cheer",
      payrollPrice
    );

    assert.equal(res.producerPayout, 400);
    assert.equal(res.sltPortion, 400); // $800 - $400 = $400
  });

  it("Test 5 — Customer Price must remain unchanged ($1,000 Customer Price is not mutated)", () => {
    const custPrice = 1000;
    const payrollPrice = 800;

    const res = computeClientPayroll(
      sampleProducer,
      custPrice,
      null,
      0.50,
      null,
      "all-star-cheer",
      payrollPrice
    );

    assert.equal(custPrice, 1000);
    assert.equal(res.producerPayout, 400);
  });

  it("Test 6 — No adjustments ($1,000 Customer / $1,000 Payroll / 50% -> $500 Payout)", () => {
    const custPrice = 1000;
    const payrollPrice = 1000;

    const res = computeClientPayroll(
      sampleProducer,
      custPrice,
      null,
      0.50,
      null,
      "all-star-cheer",
      payrollPrice
    );

    assert.equal(res.producerPayout, 500);
    assert.equal(res.sltPortion, 500);
  });

  it("Test 7 — Casey dual rate calculation uses Final Payroll Price ($850 Payroll -> Old $612 / New $595)", () => {
    const casey: Producer = {
      ...sampleProducer,
      initials: "CM",
      defaultRate: 0.70,
      rateOverrides: { old_pricing: 0.72, new_pricing: 0.70 },
    };

    const custPrice = 1000;
    const payrollPrice = 850;

    const res = computeClientPayroll(
      casey,
      custPrice,
      null,
      null,
      null,
      "all-star-cheer",
      payrollPrice
    );

    assert.equal(res.isCaseyAmbiguous, true);
    assert.equal(res.oldPricingPayout, 612); // $850 * 72% = $612
    assert.equal(res.newPricingPayout, 595); // $850 * 70% = $595
  });

  it("Test 8 — Steve not_paid_for_mixing ($100 Customer / $370 Payroll -> Payout $0 / SLT Portion $370)", () => {
    const steve: Producer = {
      ...sampleProducer,
      name: "Steve",
      compensationModel: "not_paid_for_mixing",
    };

    const custPrice = 100;
    const payrollPrice = 370;

    const res = computeClientPayroll(
      steve,
      custPrice,
      null,
      null,
      null,
      "pom",
      payrollPrice
    );

    assert.equal(res.producerPayout, 0);
    assert.equal(res.sltPortion, 370); // SLT portion is full Payroll Price ($370)
  });

  it("Test 9 — Rory Fowler 78% rate ($100 Customer / $160 Payroll / 78% -> Payout $124.80 / SLT Portion $35.20)", () => {
    const rory: Producer = {
      ...sampleProducer,
      name: "Rory Fowler",
      defaultRate: 0.78,
    };

    const custPrice = 100;
    const payrollPrice = 160;

    const res = computeClientPayroll(
      rory,
      custPrice,
      null,
      0.78,
      null,
      "pom",
      payrollPrice
    );

    assert.equal(res.producerPayout, 124.8); // $160 * 78% = $124.80
    assert.equal(res.sltPortion, 35.2); // $160 - $124.80 = $35.20 (22% of $160, positive!)
    assert.notEqual(res.sltPortion, -24.8); // NO LONGER NEGATIVE!
  });
});
