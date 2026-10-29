import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildPayoutCalculationView } from "../payout-calculation-view";
import type { MTDRecord, Order, PayrollAddon, Producer } from "@/types";

const producer = {
  id: "p1",
  name: "Alex Producer",
  initials: "AP",
  email: "a@example.com",
  categories: ["Cheer"],
  avatar: "",
  color: "#000",
  mixesThisWeek: 0,
  nextAvailable: "Today",
  status: "available",
  workDays: ["mon"],
  extraDays: [],
  compensationModel: "percentage_of_payroll_base",
  rushFeeRate: 0.4,
  ratesByCategory: { "all-star-cheer": 0.53 },
} as unknown as Producer;

function line(view: ReturnType<typeof buildPayoutCalculationView>, label: string) {
  return view.lines.find((row) => row.label === label);
}

describe("payout calculation view", () => {
  it("shows cheer package, music compliancy reduction, and saved rate", () => {
    const order = {
      id: "ord-1",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      finalCustomerPrice: 1000,
      finalPayrollPrice: 800,
      price: 1000,
      rateUsed: 0.53,
      rateSource: "manual_override",
      producerPayout: 424,
      pricingBreakdown: {
        base_customer_price: 1000,
        base_payroll_price: 800,
        payroll_base_price: 800,
      },
    } as unknown as Order;
    const rec = {
      id: "mtd-1",
      orderId: "ord-1",
      programName: "NABS QA",
      assignedProducer: "Alex Producer",
      price: 1000,
      isRushOrder: "no",
    } as unknown as MTDRecord;

    const view = buildPayoutCalculationView({
      record: rec,
      allOrders: [order],
      producers: [producer],
      payrollAddons: [],
    });

    assert.equal(line(view, "Package price")?.amount, 1000);
    assert.equal(line(view, "Music compliancy")?.kind, "reduction");
    assert.equal(line(view, "Music compliancy")?.amount, 200);
    assert.equal(line(view, "Compensation 53%")?.amount, 424);
    assert.equal(view.total, 424);
    assert.equal(line(view, "Rush fee"), undefined);
    assert.equal(line(view, "Miscellaneous adjustment"), undefined);
  });

  it("shows dance extras as additions and omits unset payroll add-ons", () => {
    const order = {
      id: "ord-d",
      formType: "school-all-star-dance",
      danceFormSubtype: "pom",
      finalCustomerPrice: 850,
      finalPayrollPrice: 790,
      price: 850,
      rateUsed: 1,
      rateSource: "manual_override",
      producerPayout: 790,
      pricingBreakdown: {
        base_payroll_price: 730,
        payroll_base_price: 790,
      },
    } as unknown as Order;
    const rec = {
      id: "mtd-d",
      orderId: "ord-d",
      programName: "NABS QA",
      assignedProducer: "Alex Producer",
      extraSongsQuantity: 2,
      extraSongEditingTimeQuantity: 1,
      price: 850,
      isRushOrder: "no",
    } as unknown as MTDRecord;

    const view = buildPayoutCalculationView({
      record: rec,
      allOrders: [order],
      producers: [producer],
      payrollAddons: [],
    });

    assert.equal(line(view, "Music compliancy")?.amount, 120);
    assert.equal(line(view, "Extra songs")?.amount, 30);
    assert.equal(line(view, "Extra songs")?.detail, "2 × $15");
    assert.equal(line(view, "Extra song time")?.amount, 30);
    assert.equal(line(view, "Compensation 100%")?.amount, 790);
    assert.equal(view.total, 790);
  });

  it("splits sports entertainment rush from the category rate", () => {
    const order = {
      id: "ord-se",
      formType: "sports-entertainment",
      finalCustomerPrice: 150,
      finalPayrollPrice: 250,
      price: 150,
      rateUsed: 0.5,
      rateSource: "manual_override",
      producerPayout: 115,
      isRushOrder: "yes",
    } as unknown as Order;
    const rec = {
      id: "mtd-se",
      orderId: "ord-se",
      programName: "NABS QA",
      assignedProducer: "Alex Producer",
      price: 150,
      isRushOrder: "yes",
    } as unknown as MTDRecord;

    const view = buildPayoutCalculationView({
      record: rec,
      allOrders: [order],
      producers: [producer],
      payrollAddons: [],
    });

    assert.equal(line(view, "Package price")?.amount, 150);
    assert.equal(line(view, "Music compliancy"), undefined);
    assert.equal(line(view, "Rush order")?.kind, "addition");
    assert.equal(line(view, "Rush order")?.amount, 100);
    assert.equal(line(view, "Compensation 50%")?.amount, 115);
    assert.equal(view.total, 115);
  });

  it("shows SE rush as +$100 when package and payroll are both the combined total", () => {
    const order = {
      id: "ord-se2",
      formType: "sports-entertainment",
      finalCustomerPrice: 250,
      finalPayrollPrice: 250,
      price: 250,
      rateUsed: 0.5,
      rateSource: "manual_override",
      producerPayout: 125,
      isRushOrder: "yes",
    } as unknown as Order;
    const rec = {
      id: "mtd-se2",
      orderId: "ord-se2",
      programName: "NABS QA",
      assignedProducer: "Alex Producer",
      price: 250,
      isRushOrder: "yes",
    } as unknown as MTDRecord;

    const view = buildPayoutCalculationView({
      record: rec,
      allOrders: [order],
      producers: [producer],
      payrollAddons: [],
    });

    assert.equal(line(view, "Package price")?.amount, 250);
    assert.equal(line(view, "Music compliancy"), undefined);
    assert.equal(line(view, "Rush order")?.amount, 100);
    assert.match(
      line(view, "Rush order")?.detail ?? "",
      /not in the saved payroll base/
    );
    assert.match(line(view, "Compensation 50%")?.detail ?? "", /of \$250\.00/);
    assert.equal(line(view, "Compensation 50%")?.amount, 125);
    assert.equal(view.total, 125);
  });

  it("keeps Pre-Game at $250 and adds rush on top when payroll includes it", () => {
    const order = {
      id: "ord-se-pregame",
      formType: "sports-entertainment",
      finalCustomerPrice: 250,
      finalPayrollPrice: 350,
      price: 250,
      rateUsed: 0.5,
      rateSource: "manual_override",
      producerPayout: 175,
      isRushOrder: "yes",
    } as unknown as Order;
    const rec = {
      id: "mtd-se-pregame",
      orderId: "ord-se-pregame",
      programName: "NABS QA",
      assignedProducer: "Alex Producer",
      price: 250,
      isRushOrder: "yes",
    } as unknown as MTDRecord;

    const view = buildPayoutCalculationView({
      record: rec,
      allOrders: [order],
      producers: [producer],
      payrollAddons: [],
    });

    assert.equal(line(view, "Package price")?.amount, 250);
    assert.equal(line(view, "Music compliancy"), undefined);
    assert.equal(line(view, "Rush order")?.amount, 100);
    assert.equal(line(view, "Rush order")?.detail, "Sports Entertainment rush");
    assert.match(line(view, "Compensation 50%")?.detail ?? "", /of \$350\.00/);
    assert.equal(line(view, "Compensation 50%")?.amount, 175);
    assert.equal(view.total, 175);
  });

  it("adds a Sports Entertainment Rush Fee column add-on on top of the automatic rush", () => {
    const order = {
      id: "ord-se3",
      formType: "sports-entertainment",
      finalCustomerPrice: 250,
      finalPayrollPrice: 250,
      price: 250,
      rateUsed: 0.5,
      rateSource: "manual_override",
      producerPayout: 125,
      isRushOrder: "yes",
    } as unknown as Order;
    const rec = {
      id: "mtd-se3",
      orderId: "ord-se3",
      programName: "NABS QA",
      assignedProducer: "Alex Producer",
      price: 250,
      isRushOrder: "yes",
    } as unknown as MTDRecord;
    const addons = [
      {
        id: "rush-se",
        programName: "NABS QA",
        category: "Sports Entertainment",
        addonType: "rush_fee",
        amount: 150,
        quantity: 1,
        unitAmount: 150,
        rateSource: "predefined",
        producerId: "p1",
        mtdId: "mtd-se3",
        orderId: "ord-se3",
        createdAt: "2026-10-01T00:00:00Z",
      },
    ] as PayrollAddon[];

    const view = buildPayoutCalculationView({
      record: rec,
      allOrders: [order],
      producers: [producer],
      payrollAddons: addons,
    });

    assert.equal(line(view, "Rush order")?.amount, 100);
    assert.equal(line(view, "Rush fee")?.amount, 60);
    assert.equal(view.total, 185);
  });

  it("includes rush fee and misc only when payroll add-ons exist", () => {
    const order = {
      id: "ord-r",
      formType: "marching-band",
      finalCustomerPrice: 600,
      finalPayrollPrice: 600,
      price: 600,
      rateUsed: 0.5,
      rateSource: "manual_override",
      producerPayout: 300,
    } as unknown as Order;
    const rec = {
      id: "mtd-r",
      orderId: "ord-r",
      programName: "NABS QA",
      assignedProducer: "Alex Producer",
      price: 600,
      isRushOrder: "yes",
    } as unknown as MTDRecord;
    const addons = [
      {
        id: "rush-1",
        programName: "NABS QA",
        category: "Marching Band",
        addonType: "rush_fee",
        amount: 150,
        quantity: 1,
        unitAmount: 150,
        rateSource: "predefined",
        producerId: "p1",
        mtdId: "mtd-r",
        orderId: "ord-r",
        createdAt: "2026-10-01T00:00:00Z",
      },
      {
        id: "misc-1",
        programName: "NABS QA",
        category: "Marching Band",
        addonType: "misc_adjustment",
        amount: -10,
        rateSource: "manual",
        mtdId: "mtd-r",
        orderId: "ord-r",
        createdAt: "2026-10-02T00:00:00Z",
      },
    ] as PayrollAddon[];

    const view = buildPayoutCalculationView({
      record: rec,
      allOrders: [order],
      producers: [producer],
      payrollAddons: addons,
    });

    assert.equal(line(view, "Music compliancy"), undefined);
    assert.equal(line(view, "Compensation 50%")?.amount, 300);
    assert.equal(line(view, "Rush fee")?.amount, 60);
    assert.equal(line(view, "Miscellaneous adjustment")?.kind, "reduction");
    assert.equal(line(view, "Miscellaneous adjustment")?.amount, 10);
    assert.equal(view.total, 350);
  });
});
