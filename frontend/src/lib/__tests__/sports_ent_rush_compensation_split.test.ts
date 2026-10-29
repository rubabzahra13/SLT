import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeClientPayroll } from "../pricing-display";
import type { Producer } from "../../types";

const seProducer = {
  id: "p-se",
  name: "SE Producer",
  initials: "SP",
  email: "se@example.com",
  categories: ["Sports Entertainment"],
  avatar: "",
  mixesThisWeek: 0,
  workDays: [],
  timeOff: [],
  maxMixesPerDay: null,
  maxProducerCostPerDay: null,
  extraDays: [],
  ratesByCategory: { "Sports Entertainment": 0.55 },
  rushFeeRate: 0.4,
  compensationModel: "percentage_of_payroll_base",
} as Producer;

describe("Sports Entertainment rush compensation split", () => {
  it("applies category % to package only and rushFeeRate to $100 Magento rush", () => {
    // Package $200 + rush $100 = payroll $300
    // Correct: 200×55% + 100×40% = 110 + 40 = 150
    // Wrong (old): 300×55% = 165
    const calc = computeClientPayroll(
      seProducer,
      200,
      null,
      null,
      null,
      "sports-entertainment",
      300,
      {
        formType: "sports-entertainment",
        sportsEntertainmentRushFee: 100,
        rushFeeCompensationRate: 0.4,
        includeRushFeeInPayout: false,
        rushFeeQuantity: 0,
      }
    );
    assert.equal(calc.status, "computed");
    assert.equal(calc.categoryPayout, 110);
    assert.equal(calc.rushFeePayout, 40);
    assert.equal(calc.producerPayout, 150);
  });

  it("Rush Order No: category % on full payroll, no SE rush payout", () => {
    const calc = computeClientPayroll(
      seProducer,
      200,
      null,
      null,
      null,
      "sports-entertainment",
      200,
      {
        formType: "sports-entertainment",
        sportsEntertainmentRushFee: 0,
        rushFeeCompensationRate: 0.4,
        includeRushFeeInPayout: false,
        rushFeeQuantity: 0,
      }
    );
    assert.equal(calc.categoryPayout, 110);
    assert.equal(calc.rushFeePayout, 0);
    assert.equal(calc.producerPayout, 110);
  });

  it("admin-raised payroll keeps $100 rush at rushFeeRate; category % on remainder", () => {
    // Customer $200, payroll overridden to $350 → package base $250, rush $100
    // 250×55% + 100×40% = 137.5 + 40 = 177.5
    const calc = computeClientPayroll(
      seProducer,
      200,
      null,
      null,
      null,
      "sports-entertainment",
      350,
      {
        formType: "sports-entertainment",
        sportsEntertainmentRushFee: 100,
        rushFeeCompensationRate: 0.4,
        includeRushFeeInPayout: false,
        rushFeeQuantity: 0,
      }
    );
    assert.equal(calc.categoryPayout, 137.5);
    assert.equal(calc.rushFeePayout, 40);
    assert.equal(calc.producerPayout, 177.5);
  });

  it("other categories keep Cheer $150 Rushby math unchanged", () => {
    const cheerProducer: Producer = {
      ...seProducer,
      id: "p-cheer",
      categories: ["All-Star Cheer"],
      ratesByCategory: { "All-Star Cheer": 0.5 },
      rushFeeRate: 1,
    };
    const calc = computeClientPayroll(
      cheerProducer,
      500,
      null,
      0.5,
      null,
      "all-star-cheer",
      500,
      {
        formType: "school-all-star-cheer",
        rushFeeQuantity: 1,
        rushFeeCompensationRate: 1,
        includeRushFeeInPayout: true,
        sportsEntertainmentRushFee: 100, // ignored unless formType is SE
      }
    );
    // Package base 500 - 150 = 350 × 50% = 175; rush 150 × 100% = 150; total 325
    assert.equal(calc.categoryPayout, 175);
    assert.equal(calc.rushFeePayout, 150);
    assert.equal(calc.producerPayout, 325);
  });
});
