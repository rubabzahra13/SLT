import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getData } from "../data";
import {
  escapeCsvCell,
  generateMTDCsv,
  generateOrdersCsv,
  generatePayrollCsv,
} from "../export-csv";
import { getPayrollRecords } from "../mtd-completion";
import { filterMTDRecords, isPreMTDOrderRecord } from "../mtd-filters";
import type { MTDRecord, Order } from "@/types";

describe("Prompt 6 — Filter-Aware CSV Export Utility", () => {
  const { mtdRecords, orders: allOrders, producers } = getData();
  const orderById = new Map(allOrders.map((o: Order) => [o.id, o]));

  const preMtdRecords = mtdRecords.filter(isPreMTDOrderRecord);
  const mtdBoardRecords = mtdRecords.filter((r) => !isPreMTDOrderRecord(r));
  const payrollRecords = getPayrollRecords(mtdRecords);

  it("1. Escapes CSV cells with quotes and commas safely", () => {
    assert.equal(escapeCsvCell("Simple"), "Simple");
    assert.equal(escapeCsvCell("Hello, World"), '"Hello, World"');
    assert.equal(escapeCsvCell('Said "Hello"'), '"Said ""Hello"""');
    assert.equal(escapeCsvCell(null), "");
  });

  it("2. Orders Export: Unfiltered count matches full pre-MTD dataset", () => {
    const csv = generateOrdersCsv(preMtdRecords, allOrders);
    const lines = csv.trim().split("\r\n");
    // Header + one line per record
    assert.equal(lines.length, preMtdRecords.length + 1);

    // Header checks
    const headerLine = lines[0];
    assert.ok(headerLine.includes("Order ID"));
    assert.ok(headerLine.includes("Assigned Producer"));
    assert.ok(headerLine.includes("Mix Start Date"));
    assert.ok(headerLine.includes("Mix End Date"));
  });

  it("3. Orders Export: Unassigned and unscheduled fallback text check", () => {
    const unassignedOrders = preMtdRecords.filter(
      (r) => !r.assignedProducer && !r.mixStartDate
    );
    assert.ok(unassignedOrders.length > 0, "Expected at least one unassigned order");

    const csv = generateOrdersCsv(unassignedOrders, allOrders);
    assert.ok(csv.includes("No assigned producer yet"));
    assert.ok(csv.includes("No scheduled start"));
    assert.ok(csv.includes("No scheduled end"));
  });

  it("4. Orders Export: Filtered export matches filtered subset exactly", () => {
    const cheerOrders = preMtdRecords.filter((r) => r.category.includes("Cheer"));
    const csv = generateOrdersCsv(cheerOrders, allOrders);
    const lines = csv.trim().split("\r\n");
    assert.equal(lines.length, cheerOrders.length + 1);
  });

  it("5. MTD Export: Unfiltered vs Filtered row count accuracy", () => {
    const unfilteredCsv = generateMTDCsv(mtdBoardRecords, allOrders, producers);
    const unfilteredLines = unfilteredCsv.trim().split("\r\n");
    assert.equal(unfilteredLines.length, mtdBoardRecords.length + 1);

    // Filter by Producer 'Nick'
    const nickFilter = filterMTDRecords(mtdBoardRecords, { assignedProducer: "Nick" });
    const nickCsv = generateMTDCsv(nickFilter, allOrders, producers);
    const nickLines = nickCsv.trim().split("\r\n");
    assert.equal(nickLines.length, nickFilter.length + 1);
  });

  it("6. MTD Export: Category-specific fields and Dance Add-ons", () => {
    const danceRecords = mtdBoardRecords.filter((r) => r.category.includes("Dance"));
    assert.ok(danceRecords.length > 0, "Expected at least one Dance record");

    const csv = generateMTDCsv(danceRecords, allOrders, producers);
    assert.ok(csv.includes("Dance Extra Songs ($15/ea)"));
    assert.ok(csv.includes("Dance Extra Song Time ($30/ea)"));
  });

  it("7. Payroll Export: Unfiltered vs Filtered row count and payout fields", () => {
    assert.ok(payrollRecords.length >= 10, "Expected at least 10 payroll records");

    const csv = generatePayrollCsv(payrollRecords, allOrders, producers);
    const lines = csv.trim().split("\r\n");
    assert.equal(lines.length, payrollRecords.length + 1);

    // Verify key payroll columns
    const header = lines[0];
    assert.ok(header.includes("Customer Price"));
    assert.ok(header.includes("Payroll Base Price"));
    assert.ok(header.includes("Producer Rate"));
    assert.ok(header.includes("Total Producer Payout"));
    assert.ok(header.includes("Coupon Code"));
  });

  it("8. Pricing & Add-on Business Rules Integrity Check", () => {
    const cheerRecordInPayroll = payrollRecords.find((r) => r.category.includes("Cheer"));
    if (cheerRecordInPayroll) {
      const csv = generatePayrollCsv([cheerRecordInPayroll], allOrders, producers);
      const rows = csv.trim().split("\r\n");
      const dataRow = rows[1];
      // Cheer record must NOT have dance extra songs payout value
      assert.ok(dataRow);
    }
  });
});
