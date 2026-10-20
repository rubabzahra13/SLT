import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  finalizeMixPayout,
  formatCompensationPercent,
  normalizeCompensationFraction,
  resolveRushFeeSelection,
  rushCompensationChoices,
  rushCustomerTotal,
  rushFeeAddonForRecord,
  rushFeeCompensation,
  sportsEntertainmentIncludedRushCompensation,
  sportsEntertainmentIncludedRushFeeAmount,
} from "../rush-fee";
import { SPORTS_ENTERTAINMENT_CUSTOMER_RUSH_FEE } from "../pricing-engine";
import type { PayrollAddon } from "@/types";

describe("Payroll rush fee compensation", () => {
  it("keeps the package payout and adds unit × quantity × producer rate once", () => {
    assert.equal(rushCustomerTotal(150, 1), 150);
    assert.equal(rushCustomerTotal(150, 2), 300);
    assert.equal(rushCustomerTotal(150, 3), 450);
    assert.equal(rushFeeCompensation(150, 2, 0.93), 279);

    const selection = resolveRushFeeSelection({
      isRush: true,
      producerRate: 0.93,
      producerId: "jir",
      addon: { amount: 300, quantity: 2, unitAmount: 150, producerId: "jir" },
    });
    assert.equal(selection.rateSource, "producer");
    assert.equal(formatCompensationPercent(selection.rate!), "93%");
    assert.equal(selection.compensation, 279);
    // Existing base payout $1,023 + $279 = $1,302. Package price is not an input.
    assert.equal(finalizeMixPayout(1023, "computed", selection), 1302);
  });

  it("displays a stored fraction as a percent without scaling it twice", () => {
    assert.equal(normalizeCompensationFraction(0.93), 0.93);
    assert.equal(normalizeCompensationFraction(93), 0.93);
    assert.equal(formatCompensationPercent(0.93), "93%");
    assert.equal(rushFeeCompensation(150, 2, 93), 279);
    assert.equal(rushFeeCompensation(150, 2, 0.93), 279);
  });

  it("does not invent a Rushby fee when Rush Order is Yes but no addon is saved", () => {
    const selection = resolveRushFeeSelection({
      isRush: true,
      producerRate: 1,
      producerId: "p1",
      addon: null,
    });
    assert.equal(selection.quantity, 0);
    assert.equal(selection.total, 0);
    assert.equal(selection.rate, null);
    assert.equal(selection.rateSource, "unset");
    assert.equal(selection.compensation, 0);
    assert.equal(finalizeMixPayout(1023, "computed", selection), 1023);
  });

  it("does not invent 100% compensation before an amount is chosen", () => {
    const selection = resolveRushFeeSelection({
      isRush: true,
      producerRate: null,
      producerId: "p1",
      addon: null,
    });
    assert.equal(selection.quantity, 0);
    assert.equal(selection.rate, null);
    assert.equal(selection.rateSource, "unset");
    assert.equal(selection.compensation, 0);
  });

  it("keeps an order override without changing the producer default", () => {
    const producerRate = 0.93;
    const selection = resolveRushFeeSelection({
      isRush: true,
      producerRate,
      producerId: "jir",
      addon: {
        amount: 300,
        quantity: 2,
        unitAmount: 150,
        compensationRate: 0.72,
        compensationOverridden: true,
        producerId: "jir",
      },
    });
    assert.equal(selection.rateSource, "override");
    assert.equal(formatCompensationPercent(selection.rate!), "72%");
    assert.equal(selection.compensation, 216);
    assert.equal(producerRate, 0.93);
  });

  it("drops the previous producer's override when the assignee changes", () => {
    const selection = resolveRushFeeSelection({
      isRush: true,
      producerRate: 0.65,
      producerId: "next",
      addon: {
        amount: 150,
        quantity: 1,
        unitAmount: 150,
        compensationRate: 0.72,
        compensationOverridden: true,
        producerId: "previous",
      },
    });
    assert.equal(selection.overridden, false);
    assert.equal(selection.rateSource, "producer");
    assert.equal(formatCompensationPercent(selection.rate!), "65%");
    assert.equal(selection.compensation, 97.5);
  });

  it("includes a producer rate that is not one of the standard choices", () => {
    assert.deepEqual(
      rushCompensationChoices(0.93, 0.93).map(formatCompensationPercent),
      ["100%", "93%", "72%", "60%", "50%"]
    );
    assert.deepEqual(
      rushCompensationChoices(0.65, 0.65).map(formatCompensationPercent),
      ["100%", "72%", "65%", "60%", "50%"]
    );
  });

  it("does not pay rush compensation on a non-rush order", () => {
    const selection = resolveRushFeeSelection({
      isRush: false,
      producerRate: 0.93,
      producerId: "jir",
      addon: { amount: 300, quantity: 2, unitAmount: 150, producerId: "jir" },
    });
    assert.equal(selection.quantity, 0);
    assert.equal(selection.compensation, 0);
    assert.equal(finalizeMixPayout(1023, "computed", selection), 1023);
  });

  it("reads older amount-only rows without replacing a custom unit", () => {
    const doubled = resolveRushFeeSelection({
      isRush: true,
      producerRate: 1,
      producerId: "p",
      addon: { amount: 300, producerId: "p" },
    });
    assert.equal(doubled.quantity, 2);
    assert.equal(doubled.unitAmount, 150);
    assert.equal(doubled.compensation, 300);

    const custom = resolveRushFeeSelection({
      isRush: true,
      producerRate: 0.5,
      producerId: "p",
      addon: { amount: 200, producerId: "p" },
    });
    assert.equal(custom.quantity, 1);
    assert.equal(custom.unitAmount, 200);
    assert.equal(custom.total, 200);
    assert.equal(custom.compensation, 100);
  });

  it("keeps a manually saved Rushby addon when Rush Order is Yes", () => {
    const selection = resolveRushFeeSelection({
      isRush: true,
      producerRate: 1,
      producerId: "p1",
      addon: {
        amount: 150,
        quantity: 1,
        unitAmount: 150,
        producerId: "p1",
      },
    });
    assert.equal(selection.quantity, 1);
    assert.equal(selection.total, 150);
    assert.equal(selection.rateSource, "producer");
    assert.equal(selection.compensation, 150);
  });

  it("keeps the saved override when a newer default rush row also exists", () => {
    const base = {
      programName: "Program",
      category: "Cheer",
      addonType: "rush_fee" as const,
      rateSource: "predefined" as const,
      producerId: "ch",
      mtdId: "mtd-1",
      orderId: "order-1",
    };
    const saved: PayrollAddon = {
      ...base,
      id: "saved",
      amount: 300,
      quantity: 2,
      unitAmount: 150,
      compensationRate: 0.72,
      compensationOverridden: true,
      createdAt: "2026-10-13T10:16:00.000Z",
    };
    const raced: PayrollAddon = {
      ...base,
      id: "raced",
      amount: 150,
      quantity: 1,
      unitAmount: 150,
      compensationRate: null,
      compensationOverridden: false,
      createdAt: "2026-10-13T11:57:00.000Z",
    };
    const chosen = rushFeeAddonForRecord("mtd-1", "order-1", [raced, saved]);
    assert.equal(chosen?.id, "saved");
  });
});

describe("Sports Entertainment included Magento rush (Payroll display)", () => {
  it("uses the flat $100 Magento fee when Rush Order is Yes", () => {
    assert.equal(
      sportsEntertainmentIncludedRushFeeAmount({
        isRush: true,
        formType: "sports-entertainment",
      }),
      SPORTS_ENTERTAINMENT_CUSTOMER_RUSH_FEE
    );
  });

  it("derives fee from finalized payroll − customer when both exist", () => {
    assert.equal(
      sportsEntertainmentIncludedRushFeeAmount({
        isRush: true,
        formType: "sports-entertainment",
        finalCustomerPrice: 250,
        finalPayrollPrice: 350,
      }),
      100
    );
  });

  it("shows $40 when fee is $100 and rush fee rate is 40% (not category %)", () => {
    const shown = sportsEntertainmentIncludedRushCompensation({
      isRush: true,
      formType: "sports-entertainment",
      finalCustomerPrice: 150,
      finalPayrollPrice: 250,
      rushFeeRate: 0.4,
    });
    assert.deepEqual(shown, { feeAmount: 100, rate: 0.4, compensation: 40 });
  });

  it("returns null when Rush Order is No or form is not Sports Entertainment", () => {
    assert.equal(
      sportsEntertainmentIncludedRushCompensation({
        isRush: false,
        formType: "sports-entertainment",
        rushFeeRate: 0.4,
      }),
      null
    );
    assert.equal(
      sportsEntertainmentIncludedRushCompensation({
        isRush: true,
        formType: "school-all-star-cheer",
        rushFeeRate: 0.4,
      }),
      null
    );
  });

  it("returns null when rush fee rate is unset (avoids fake $0 from missing rate)", () => {
    assert.equal(
      sportsEntertainmentIncludedRushCompensation({
        isRush: true,
        formType: "sports-entertainment",
        rushFeeRate: null,
      }),
      null
    );
  });

  it("does not invent Rushby compensation — finalizeMixPayout stays package-only without addon", () => {
    const selection = resolveRushFeeSelection({
      isRush: true,
      producerRate: 1,
      producerId: "p",
      addon: null,
    });
    assert.equal(selection.quantity, 0);
    assert.equal(selection.compensation, 0);
    assert.equal(finalizeMixPayout(137.5, "computed", selection), 137.5);
  });
});
