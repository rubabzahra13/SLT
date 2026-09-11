import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getData } from "../data";
import {
  generatePayrollCsv,
  generateProducerFacingPayrollCsv,
} from "../export-csv";
import { getPayrollRecords } from "../mtd-completion";
import { filterMTDRecords } from "../mtd-filters";
import { calculateDateBounds, type DateFilterValue } from "../date-filters";
import type { MTDRecord, Order } from "@/types";

describe("Prompt 7 — Payroll-Specific Export: Filters + Admin vs Producer-Safe Output", () => {
  const { mtdRecords, orders: allOrders, producers } = getData();
  const payrollRecords = getPayrollRecords(mtdRecords);

  it("1. Pay Period Presets (Last 2 Weeks, Last 1 Month, Last 6 Months, Last 1 Year) filter accuracy", () => {
    assert.ok(payrollRecords.length >= 10, "Expected at least 10 payroll records");

    const twoWeeksFilter: DateFilterValue = { type: "last2Weeks" };
    const monthFilter: DateFilterValue = { type: "last1Month" };
    const sixMonthsFilter: DateFilterValue = { type: "last6Months" };
    const oneYearFilter: DateFilterValue = { type: "last1Year" };

    const records2Weeks = filterMTDRecords(payrollRecords, { dateFilter: twoWeeksFilter });
    const records1Month = filterMTDRecords(payrollRecords, { dateFilter: monthFilter });
    const records6Months = filterMTDRecords(payrollRecords, { dateFilter: sixMonthsFilter });
    const records1Year = filterMTDRecords(payrollRecords, { dateFilter: oneYearFilter });

    assert.ok(records2Weeks.length > 0, "Expected records in last 2 weeks");
    assert.ok(
      records1Month.length >= records2Weeks.length,
      "Last 1 Month should contain at least as many as Last 2 Weeks"
    );
    assert.ok(
      records6Months.length >= records1Month.length,
      "Last 6 Months should contain at least as many as Last 1 Month"
    );
    assert.ok(
      records1Year.length >= records6Months.length,
      "Last 1 Year should contain at least as many as Last 6 Months"
    );
  });

  it("2. Composed Filtering: Producer filter + Pay Period preset", () => {
    const nickRecords = filterMTDRecords(payrollRecords, {
      assignedProducer: "Nick",
      dateFilter: { type: "last6Months" },
    });

    for (const rec of nickRecords) {
      assert.equal(rec.assignedProducer, "Nick");
    }
  });

  it("3. Admin Export contains full internal columns without SLT take-home", () => {
    const csv = generatePayrollCsv(payrollRecords, allOrders, producers);
    const lines = csv.trim().split("\r\n");
    const header = lines[0];

    assert.ok(header.includes("Record ID"));
    assert.ok(header.includes("Customer Price"));
    assert.ok(header.includes("Payroll Base Price"));
    assert.ok(header.includes("Producer Rate"));
    assert.ok(header.includes("Total Producer Payout"));

    // Verify SLT take-home / internal margin is NEVER present anywhere in file
    assert.equal(header.includes("SLT Take Home"), false);
    assert.equal(header.includes("SLT Portion"), false);
    assert.equal(header.includes("SLT Margin"), false);
  });

  it("4. Producer-Facing Export is a strictly narrower, producer-safe data structure", () => {
    const targetProducer = "Nick";
    const nickRecords = filterMTDRecords(payrollRecords, { assignedProducer: targetProducer });

    const adminCsv = generatePayrollCsv(payrollRecords, allOrders, producers);
    const producerCsv = generateProducerFacingPayrollCsv(
      payrollRecords,
      allOrders,
      producers,
      targetProducer
    );

    const adminHeaders = adminCsv.trim().split("\r\n")[0].split(",");
    const producerHeaders = producerCsv.trim().split("\r\n")[0].split(",");

    // 1. Must be a verifiably narrower header set
    assert.ok(
      producerHeaders.length < adminHeaders.length,
      `Producer header count (${producerHeaders.length}) must be strictly less than admin (${adminHeaders.length})`
    );

    // 2. Must contain producer-facing payout fields
    assert.ok(producerCsv.includes("My Compensation Rate"));
    assert.ok(producerCsv.includes("My Total Payout"));

    // 3. MUST NEVER CONTAIN Customer PII or SLT internal numbers
    assert.equal(producerCsv.includes("Customer Price"), false);
    assert.equal(producerCsv.includes("Coach Email"), false);
    assert.equal(producerCsv.includes("Billing Person"), false);
    assert.equal(producerCsv.includes("Gym Billing Address"), false);
    assert.equal(producerCsv.includes("SLT Portion"), false);

    // 4. Must only include Nick's records
    const producerLines = producerCsv.trim().split("\r\n");
    // Header + Nick's records
    assert.equal(producerLines.length, nickRecords.length + 1);
  });

  it("5. Rush Fee & Voiceover producer compensation rates preservation", () => {
    const producerName = producers[0]?.name || "Nick";
    const producerCsv = generateProducerFacingPayrollCsv(
      payrollRecords,
      allOrders,
      producers,
      producerName
    );

    assert.ok(producerCsv.includes("Rush Fee Compensation"));
    assert.ok(producerCsv.includes("Voiceover Compensation"));
  });
});
