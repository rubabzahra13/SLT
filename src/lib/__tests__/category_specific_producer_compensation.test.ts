import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeClientPayroll, getProducerCategoryRate } from "../pricing-display";
import { normalizeProducer } from "../producers";
import { orderCategoryToProducerCategory } from "../editor-assignment";
import type { Producer } from "../../types";

function makeProducer(overrides: Partial<Producer> = {}): Producer {
  return normalizeProducer({
    id: "prod-test",
    name: "Test Producer",
    initials: "TP",
    email: "test@soundslikethat.com",
    categories: ["Pom", "School Cheer", "Hip Hop"],
    specialty: "Pom",
    avatar: "",
    mixesThisWeek: 0,
    nextAvailable: "TBD",
    status: "available",
    workDays: ["mon", "tue", "wed", "thu", "fri"],
    timeOff: [],
    maxMixesPerDay: null,
    maxProducerCostPerDay: null,
    overtimeDays: [],
    compensationModel: "percentage_of_payroll_base",
    defaultRate: 0.50,
    ratesByCategory: {
      "Pom": 0.50,
      "School Cheer": 0.45,
      "Hip Hop": 0.60,
    },
    rateOverrides: null,
    manualInputFields: null,
    notes: null,
    ...overrides,
  });
}

describe("Category-Specific Producer Compensation Resolution", () => {
  it("Scenario A: Same producer resolves different percentages for different categories", () => {
    const Justin = makeProducer({
      id: "prod-jd",
      name: "Justin",
      initials: "JD",
      categories: ["Pom", "Hip Hop", "School Cheer"],
      ratesByCategory: {
        "Pom": 0.50,
        "Hip Hop": 0.60,
        "School Cheer": 0.45,
      },
    });

    // Order 1: Category = Pom, Payroll Price = $1,000
    const payrollPom = computeClientPayroll(Justin, 1000, null, null, null, "pom", 1000);
    assert.equal(payrollPom.rateUsed, 0.50);
    assert.equal(payrollPom.producerPayout, 500);
    assert.equal(payrollPom.sltPortion, 500);

    // Order 2: Category = Hip Hop, Payroll Price = $1,000
    const payrollHipHop = computeClientPayroll(Justin, 1000, null, null, null, "hip-hop", 1000);
    assert.equal(payrollHipHop.rateUsed, 0.60);
    assert.equal(payrollHipHop.producerPayout, 600);
    assert.equal(payrollHipHop.sltPortion, 400);

    // Order 3: Category = School Cheer, Payroll Price = $1,000
    const payrollCheer = computeClientPayroll(Justin, 1000, null, null, null, "school-cheer-viroc-yes", 1000);
    assert.equal(payrollCheer.rateUsed, 0.45);
    assert.equal(payrollCheer.producerPayout, 450);
    assert.equal(payrollCheer.sltPortion, 550);
  });

  it("Scenario B: Admin changes configuration from 50% to 55% for Pom", () => {
    const Justin = makeProducer({
      id: "prod-jd",
      name: "Justin",
      initials: "JD",
      ratesByCategory: { "Pom": 0.50 },
    });

    const initialPayroll = computeClientPayroll(Justin, 1000, null, null, null, "pom", 1000);
    assert.equal(initialPayroll.rateUsed, 0.50);
    assert.equal(initialPayroll.producerPayout, 500);

    // Admin updates settings for Pom to 55%
    const updatedJustin = normalizeProducer({
      ...Justin,
      ratesByCategory: { "Pom": 0.55 },
    });

    const updatedPayroll = computeClientPayroll(updatedJustin, 1000, null, null, null, "pom", 1000);
    assert.equal(updatedPayroll.rateUsed, 0.55);
    assert.equal(updatedPayroll.producerPayout, 550);
    assert.equal(updatedPayroll.sltPortion, 450);
  });

  it("Scenario C: Existing producer gets new category Hip Hop (60%)", () => {
    const Justin = makeProducer({
      id: "prod-jd",
      name: "Justin",
      initials: "JD",
      categories: ["Pom", "Gameday"],
      ratesByCategory: { "Pom": 0.50, "Gameday": 0.50 },
    });

    // Admin adds Hip Hop at 60%
    const updatedJustin = normalizeProducer({
      ...Justin,
      categories: ["Pom", "Gameday", "Hip Hop"],
      ratesByCategory: { "Pom": 0.50, "Gameday": 0.50, "Hip Hop": 0.60 },
    });

    const hipHopPayroll = computeClientPayroll(updatedJustin, 1000, null, null, null, "hip-hop", 1000);
    assert.equal(hipHopPayroll.rateUsed, 0.60);
    assert.equal(hipHopPayroll.producerPayout, 600);
  });

  it("Scenario D: New producer Alex (AX) created with per-category rates", () => {
    const Alex = normalizeProducer({
      id: "prod-alex",
      name: "Alex",
      initials: "AX",
      categories: ["Pom", "Hip Hop"],
      ratesByCategory: { "Pom": 0.50, "Hip Hop": 0.55 },
    });

    const pomPayroll = computeClientPayroll(Alex, 1000, null, null, null, "pom", 1000);
    assert.equal(pomPayroll.rateUsed, 0.50);
    assert.equal(pomPayroll.producerPayout, 500);

    const hipHopPayroll = computeClientPayroll(Alex, 1000, null, null, null, "hip-hop", 1000);
    assert.equal(hipHopPayroll.rateUsed, 0.55);
    assert.equal(hipHopPayroll.producerPayout, 550);
  });

  it("Category resolution: School Cheer VIROC Yes and VIROC No both map to School Cheer", () => {
    const Mark = makeProducer({
      id: "prod-mm",
      name: "Mark",
      initials: "MM",
      categories: ["School Cheer"],
      ratesByCategory: { "School Cheer": 0.60 },
    });

    const virocYes = computeClientPayroll(Mark, 1000, null, null, null, "school-cheer-viroc-yes", 1000);
    assert.equal(virocYes.rateUsed, 0.60);
    assert.equal(virocYes.producerPayout, 600);

    const virocNo = computeClientPayroll(Mark, 1000, null, null, null, "school-cheer-viroc-no", 1000);
    assert.equal(virocNo.rateUsed, 0.60);
    assert.equal(virocNo.producerPayout, 600);
  });

  it("All-Star Dance subtype mapping: Pom vs Hip Hop resolve to respective categories", () => {
    const Mark = makeProducer({
      id: "prod-mm",
      name: "Mark",
      initials: "MM",
      categories: ["Pom", "Hip Hop", "Jazz / Kick"],
      ratesByCategory: {
        "Pom": 0.72,
        "Jazz / Kick": 0.72,
        "Hip Hop": 0.65,
      },
    });

    const pomDance = computeClientPayroll(Mark, 1000, null, null, null, "pom", 1000);
    assert.equal(pomDance.rateUsed, 0.72);
    assert.equal(pomDance.producerPayout, 720);

    const hipHopDance = computeClientPayroll(Mark, 1000, null, null, null, "hip-hop", 1000);
    assert.equal(hipHopDance.rateUsed, 0.65);
    assert.equal(hipHopDance.producerPayout, 650);
  });

  it("Missing configuration: surfaces clear error when producer has no rate for category", () => {
    const ProducerNoConfig = makeProducer({
      id: "prod-nc",
      name: "NoConfigProducer",
      initials: "NC",
      defaultRate: null,
      ratesByCategory: {}, // empty rate config
    });

    const result = computeClientPayroll(ProducerNoConfig, 1000, null, null, null, "marching-band", 1000);
    assert.equal(result.status, "needs_manual_review");
    assert.equal(result.rateUsed, null);
    assert.ok(result.message.includes("Compensation percentage is not configured for NoConfigProducer on category \"Marching Band\""));
  });

  it("Payroll Price Invariant: Payout is calculated from Final Payroll Price ($1,150), NOT Customer Price ($1,350)", () => {
    const Justin = makeProducer({
      id: "prod-jd",
      name: "Justin",
      initials: "JD",
      ratesByCategory: { "Pom": 0.50 },
    });

    const customerPrice = 1350;
    const finalPayrollPrice = 1150;

    const payroll = computeClientPayroll(Justin, customerPrice, null, null, null, "pom", finalPayrollPrice);
    assert.equal(payroll.rateUsed, 0.50);
    assert.equal(payroll.producerPayout, 575); // $1,150 * 50% = $575
    assert.equal(payroll.sltPortion, 575);     // $1,150 - $575 = $575
  });

  it("Admin Manual Override in Payroll modal overrides category rate without mutating producer config", () => {
    const Justin = makeProducer({
      id: "prod-jd",
      name: "Justin",
      initials: "JD",
      ratesByCategory: { "Pom": 0.50 },
    });

    // Admin manually overrides rate to 55% (0.55) in payroll modal
    const payroll = computeClientPayroll(Justin, 1000, null, 0.55, null, "pom", 1000);
    assert.equal(payroll.rateUsed, 0.55);
    assert.equal(payroll.producerPayout, 550);
    assert.equal(payroll.sltPortion, 450);

    // Producer's base config remains 50% for future calculations
    const defaultPayroll = computeClientPayroll(Justin, 1000, null, null, null, "pom", 1000);
    assert.equal(defaultPayroll.rateUsed, 0.50);
  });
});
