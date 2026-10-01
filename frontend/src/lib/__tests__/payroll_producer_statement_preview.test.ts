import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { MTDRecord, Order, Producer } from "@/types";
import {
  PRODUCER_STATEMENT_COLUMNS,
  getProducerFacingPayrollRows,
  generateProducerFacingPayrollCsv,
} from "../export-csv";

const mockProducers = [
  {
    id: "p1",
    name: "Casey Marlow",
    initials: "CM",
    email: "casey@example.com",
    specialty: "Cheer",
    avatar: "",
    color: "#ff6b6b",
    mixesThisWeek: 2,
    nextAvailable: "Tomorrow",
    status: "available",
    workDays: ["mon", "tue"],
    maxMixesPerDay: 5,
    overtimeDays: [],
    categories: ["school-all-star-cheer"],
  },
  {
    id: "p2",
    name: "Matt",
    initials: "M",
    email: "matt@example.com",
    specialty: "Dance",
    avatar: "",
    color: "#4ecdc4",
    mixesThisWeek: 1,
    nextAvailable: "Today",
    status: "available",
    workDays: ["wed", "thu"],
    maxMixesPerDay: 5,
    overtimeDays: [],
    categories: ["school-all-star-dance"],
  },
] as unknown as Producer[];

const mockOrders = [
  {
    id: "ord-1",
    formType: "school-all-star-cheer",
    contactName: "John Doe",
    programName: "Lions Cheer",
    price: 500,
    finalCustomerPrice: 500,
    finalPayrollPrice: 500,
    status: "completed",
    needsAttention: false,
    createdAt: "2026-09-01T10:00:00Z",
  },
  {
    id: "ord-2",
    formType: "school-all-star-dance",
    contactName: "Jane Smith",
    programName: "Tigers Dance",
    price: 600,
    finalCustomerPrice: 600,
    finalPayrollPrice: 600,
    status: "completed",
    needsAttention: false,
    createdAt: "2026-09-02T10:00:00Z",
  },
] as unknown as Order[];

const mockMtdRecords = [
  {
    id: "mtd-1",
    orderId: "ord-1",
    contactName: "John Doe",
    programName: "Lions Cheer",
    invoice: "INV-1001",
    package: "GOLD 1:30",
    assignedProducer: "Casey Marlow",
    price: 500,
    finalCustomerPrice: 500,
    finalPayrollPrice: 500,
    producerPayout: 400,
    status: "completed",
    completedAt: "2026-09-05T12:00:00Z",
    isRushOrder: "no",
  },
  {
    id: "mtd-2",
    orderId: "ord-2",
    contactName: "Jane Smith",
    programName: "Tigers Dance",
    invoice: "INV-1002",
    package: "POM 2:00",
    assignedProducer: "Matt",
    price: 600,
    finalCustomerPrice: 600,
    finalPayrollPrice: 600,
    producerPayout: 480,
    status: "completed",
    completedAt: "2026-09-06T12:00:00Z",
    danceVoiceover: "25",
    isRushOrder: "no",
  },
] as unknown as MTDRecord[];

describe("Payroll Producer Statement Preview & Single Source of Truth Tests", () => {
  it("1. getProducerFacingPayrollRows generates exact 16-column schema matching PRODUCER_STATEMENT_COLUMNS", () => {
    const rows = getProducerFacingPayrollRows(
      mockMtdRecords,
      mockOrders,
      mockProducers,
      "Casey Marlow"
    );

    assert.equal(rows.length, 1);
    const row = rows[0];

    PRODUCER_STATEMENT_COLUMNS.forEach((col) => {
      assert.ok(
        col.key in row,
        `Expected key ${col.key} to exist in producer statement row`
      );
    });

    assert.equal(row.programName, "Lions Cheer");
    assert.equal(row.totalPayout, "$400");
  });

  it("2. Parity check: generateProducerFacingPayrollCsv produces exact headers and values as getProducerFacingPayrollRows", () => {
    const rows = getProducerFacingPayrollRows(
      mockMtdRecords,
      mockOrders,
      mockProducers,
      "Matt"
    );
    const csv = generateProducerFacingPayrollCsv(
      mockMtdRecords,
      mockOrders,
      mockProducers,
      "Matt"
    );

    assert.equal(rows.length, 1);
    const row = rows[0];

    // CSV header row check
    const expectedHeaders = PRODUCER_STATEMENT_COLUMNS.map((c) => c.label).join(",");
    assert.ok(csv.startsWith(expectedHeaders), "CSV must start with exact column headers");

    // CSV data row check
    assert.ok(csv.includes("Tigers Dance"), "CSV must include program name");
    assert.ok(csv.includes(row.totalPayout), "CSV must include calculated total payout string");
  });

  it("3. Data privacy: Producer-facing rows do NOT expose SLT gross customer price or take-home revenue", () => {
    const rows = getProducerFacingPayrollRows(
      mockMtdRecords,
      mockOrders,
      mockProducers,
      "Casey Marlow"
    );

    const rowKeys = Object.keys(rows[0]);
    assert.equal(rowKeys.includes("customerPrice"), false, "Must not include customerPrice");
    assert.equal(rowKeys.includes("sltTakeHome"), false, "Must not include sltTakeHome");
    assert.equal(rowKeys.includes("payrollBasePrice"), false, "Must not include payrollBasePrice");
  });

  it("4. Producer Scoping: Casey Marlow statement contains only Casey Marlow records, never Matt records", () => {
    const caseyRows = getProducerFacingPayrollRows(
      mockMtdRecords,
      mockOrders,
      mockProducers,
      "Casey Marlow"
    );

    assert.equal(caseyRows.length, 1);
    assert.equal(caseyRows[0].programName, "Lions Cheer");
    assert.equal(caseyRows[0].producerName, "Casey Marlow");

    const mattRows = getProducerFacingPayrollRows(
      mockMtdRecords,
      mockOrders,
      mockProducers,
      "Matt"
    );

    assert.equal(mattRows.length, 1);
    assert.equal(mattRows[0].programName, "Tigers Dance");
    assert.equal(mattRows[0].producerName, "Matt");
  });
});
