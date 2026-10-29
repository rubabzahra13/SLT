import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { MTDRecord, Order, Producer, PayrollAddon } from "@/types";
import { getProducerFacingPayrollRows } from "../export-csv";
import {
  applyMiscAdjustmentToPayout,
  dedupePayrollAddons,
  formatSignedMiscAdjustment,
  miscAdjustmentAddonForRecord,
  miscAdjustmentAmount,
} from "../misc-payroll-adjustment";

const producers = [
  {
    id: "prod-ben",
    name: "Ben",
    initials: "BEN",
    email: "ben@example.com",
    categories: ["Cheer"],
    ratesByCategory: { Cheer: 0.8 },
    compensationModel: "percentage_of_payroll_base",
  },
] as unknown as Producer[];

const orders = [
  {
    id: "ord-1",
    formType: "school-all-star-cheer",
    contactName: "Coach A",
    programName: "Alpha Gym",
    price: 500,
    finalCustomerPrice: 500,
    finalPayrollPrice: 500,
    status: "completed",
  },
  {
    id: "ord-2",
    formType: "school-all-star-cheer",
    contactName: "Coach B",
    programName: "Beta Gym",
    price: 400,
    finalCustomerPrice: 400,
    finalPayrollPrice: 400,
    status: "completed",
  },
] as unknown as Order[];

const records = [
  {
    id: "mtd-1",
    orderId: "ord-1",
    contactName: "Coach A",
    programName: "Alpha Gym",
    package: "GOLD 1:30",
    assignedProducer: "Ben",
    price: 500,
    finalCustomerPrice: 500,
    finalPayrollPrice: 500,
    producerPayout: 400,
    status: "completed",
    inPayroll: true,
    completedAt: "2026-09-10T12:00:00Z",
  },
  {
    id: "mtd-2",
    orderId: "ord-2",
    contactName: "Coach B",
    programName: "Beta Gym",
    package: "SILVER 1:00",
    assignedProducer: "Ben",
    price: 400,
    finalCustomerPrice: 400,
    finalPayrollPrice: 400,
    producerPayout: 320,
    status: "completed",
    inPayroll: true,
    completedAt: "2026-09-11T12:00:00Z",
  },
] as unknown as MTDRecord[];

describe("Miscellaneous payroll adjustment", () => {
  it("formats signed amounts for statements", () => {
    assert.equal(formatSignedMiscAdjustment(20), "+$20.00");
    assert.equal(formatSignedMiscAdjustment(-10), "-$10.00");
    assert.equal(formatSignedMiscAdjustment(0), "-");
  });

  it("applies an adjustment exactly once to the mix payout", () => {
    assert.equal(applyMiscAdjustmentToPayout(400, 20), 420);
    assert.equal(applyMiscAdjustmentToPayout(400, -10), 390);
    assert.equal(applyMiscAdjustmentToPayout(400, 0), 400);
    assert.equal(applyMiscAdjustmentToPayout(null, 20), null);
  });

  it("resolves a single misc addon per payroll row", () => {
    const addons: PayrollAddon[] = [
      {
        id: "misc-old",
        programName: "Alpha Gym",
        category: "Cheer",
        addonType: "misc_adjustment",
        amount: 5,
        rateSource: "manual",
        mtdId: "mtd-1",
        orderId: "ord-1",
        createdAt: "2026-09-10T10:00:00Z",
      },
      {
        id: "misc-new",
        programName: "Alpha Gym",
        category: "Cheer",
        addonType: "misc_adjustment",
        amount: 20,
        rateSource: "manual",
        mtdId: "mtd-1",
        orderId: "ord-1",
        createdAt: "2026-09-12T10:00:00Z",
      },
    ];
    const chosen = miscAdjustmentAddonForRecord("mtd-1", "ord-1", addons);
    assert.equal(chosen?.id, "misc-new");
    assert.equal(miscAdjustmentAmount("mtd-1", "ord-1", addons), 20);
    const deduped = dedupePayrollAddons(addons);
    assert.equal(deduped.length, 1);
    assert.equal(deduped[0].id, "misc-new");
  });

  it("shows per-order signed adjustments on Send Statements rows without double-counting", () => {
    const addons: PayrollAddon[] = [
      {
        id: "misc-1",
        programName: "Alpha Gym",
        category: "Cheer",
        addonType: "misc_adjustment",
        amount: 20,
        rateSource: "manual",
        mtdId: "mtd-1",
        orderId: "ord-1",
        producerId: "prod-ben",
        producerInitials: "BEN",
        createdAt: "2026-09-12T10:00:00Z",
      },
      {
        id: "misc-2",
        programName: "Beta Gym",
        category: "Cheer",
        addonType: "misc_adjustment",
        amount: -10,
        rateSource: "manual",
        mtdId: "mtd-2",
        orderId: "ord-2",
        producerId: "prod-ben",
        producerInitials: "BEN",
        createdAt: "2026-09-12T11:00:00Z",
      },
    ];

    const rows = getProducerFacingPayrollRows(
      records,
      orders,
      producers,
      "Ben",
      undefined,
      addons
    );

    assert.equal(rows.length, 2);
    const alpha = rows.find((r) => r.programName === "Alpha Gym");
    const beta = rows.find((r) => r.programName === "Beta Gym");
    assert.ok(alpha);
    assert.ok(beta);
    assert.equal(alpha!.miscellaneousAdjustment, "+$20.00");
    assert.equal(beta!.miscellaneousAdjustment, "-$10.00");
    // Base package payouts (80% of 500 / 400) plus adjustments once.
    assert.equal(alpha!.rawTotalPayout, 420);
    assert.equal(beta!.rawTotalPayout, 310);
    // Misc addons must not appear as separate statement lines.
    assert.equal(
      rows.filter((r) => r.subtype.includes("Miscellaneous")).length,
      0
    );
  });

  it("does not alter totals when no misc adjustment exists", () => {
    const rows = getProducerFacingPayrollRows(
      records,
      orders,
      producers,
      "Ben",
      undefined,
      []
    );
    assert.equal(rows[0].miscellaneousAdjustment, "");
    assert.equal(rows[0].rawTotalPayout, 400);
    assert.equal(rows[1].rawTotalPayout, 320);
  });
});
