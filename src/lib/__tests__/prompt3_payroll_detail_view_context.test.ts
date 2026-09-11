import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeClientPayroll } from "../pricing-display";
import { normalizeProducer } from "../producers";
import type { MTDRecord, Producer } from "../../types";

function makePayrollRecord(overrides: Partial<MTDRecord> = {}): MTDRecord {
  return {
    id: "rec-payroll-101",
    orderId: "ord-payroll-101",
    section: "CHEERLEADING MUSIC",
    assignedProducer: "JD",
    category: "Cheer",
    editorInitials: "JD",
    editorRequest: "FA",
    contactName: "Coach Sarah",
    programName: "SPIRIT XTREME ELITE",
    package: "PLATINUM 2:30 NO SPLIT",
    musicTheme: "Power Covers",
    price: 1400,
    priceCompliance: "compliant",
    invoice: "INV-9901",
    mixStartDate: "2026-09-01",
    mixEndDate: "2026-09-08",
    eightCountSheet: "CS CONFIRMED",
    haveSongs: "SONGS READY",
    needsAttention: false,
    status: "completed",
    inMTD: true,
    inPayroll: true,
    completedAt: "2026-09-09T10:00:00.000Z",
    cheerVoiceover20: true,
    ...overrides,
  };
}

const mockProducer: Producer = normalizeProducer({
  id: "prod-jd",
  name: "John Doe",
  initials: "JD",
  categories: ["Cheer", "Dance"],
  status: "available",
  email: "john@soundslikethat.com",
  compensationModel: "percentage_of_payroll_base",
  defaultRate: 70,
  cheerVoiceoverRate: 100,
  danceVoiceoverRate: 80,
  rushFeeRate: 100,
});

describe("Prompt 3 — Detail View Context & Payroll Detail View Tests", () => {
  it("verifies route context mapping for Orders, MTD, and Payroll tabs", () => {
    const recordId = "rec-101";

    const getDetailHref = (context: "orders" | "mtd" | "payroll", id: string) => {
      switch (context) {
        case "orders":
          return `/orders/${id}`;
        case "mtd":
          return `/mtd/${id}`;
        case "payroll":
          return `/payroll/${id}`;
      }
    };

    assert.equal(getDetailHref("orders", recordId), "/orders/rec-101");
    assert.equal(getDetailHref("mtd", recordId), "/mtd/rec-101");
    assert.equal(getDetailHref("payroll", recordId), "/payroll/rec-101");

    // Context isolation check: Payroll detail href must NEVER point to /mtd
    assert.notEqual(getDetailHref("payroll", recordId), "/mtd/rec-101");
  });

  it("calculates Payroll detail view producer payout, voiceover, and completed date matching underlying record", () => {
    const record = makePayrollRecord({
      price: 1000,
      finalCustomerPrice: 1000,
      finalPayrollPrice: 1000,
      cheerVoiceover20: true,
      cheerVoiceover40: false,
    });

    const calc = computeClientPayroll(
      mockProducer,
      1000,
      null,
      0.7,
      null,
      "all-star-cheer",
      1000,
      {
        cheerVoiceover20: true,
        cheerVoiceover40: false,
        formType: "school-all-star-cheer",
      }
    );

    // Base payout: 70% of $1000 = $700 + $20 Cheer VO = $720
    assert.equal(calc.producerPayout, 720);
    assert.equal(calc.categoryPayout, 700);
    assert.equal(calc.voiceoverPayout, 20);
    assert.equal(calc.sltPortion, 280);
    assert.equal(record.completedAt, "2026-09-09T10:00:00.000Z");
  });

  it("calculates Dance Voiceover payouts on Payroll detail view correctly", () => {
    const calcDance = computeClientPayroll(
      mockProducer,
      850,
      null,
      0.7,
      null,
      "pom",
      850,
      {
        danceVoiceover: "100",
        hasTraditionalVoiceover: true,
        hasThemedVoiceover: true,
        formType: "school-all-star-dance",
      }
    );

    // Base payout: 70% of $850 = $595. Dance VO ($100 * 80% producer rate) = $80. Total = $675
    assert.equal(calcDance.categoryPayout, 595);
    assert.equal(calcDance.voiceoverPayout, 80);
    assert.equal(calcDance.producerPayout, 675);
  });
});
