import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { MTDRecord, Order, Producer, PayrollAddon } from "@/types";
import { getProducerFacingPayrollRows } from "../export-csv";

const mockProducers = [
  {
    id: "prod-1",
    name: "Casey Marlow",
    initials: "CM",
    email: "casey@example.com",
    specialty: "Cheer",
  },
  {
    id: "prod-2",
    name: "Matt",
    initials: "M",
    email: "matt@example.com",
    specialty: "Dance",
  },
] as unknown as Producer[];

const mockOrders = [
  {
    id: "ord-101",
    formType: "school-all-star-cheer",
    contactName: "Coach Sarah",
    programName: "Apex Athletics",
    teamName: "Junior Coed",
    schoolProgramName: "Apex Athletics",
    price: 500,
    finalCustomerPrice: 500,
    finalPayrollPrice: 500,
    status: "completed",
  },
  {
    id: "ord-102",
    formType: "school-all-star-dance",
    contactName: "Coach Emily",
    programName: "Starlet Dance",
    teamName: "Varsity Pom",
    schoolProgramName: "Starlet Dance",
    price: 600,
    finalCustomerPrice: 600,
    finalPayrollPrice: 600,
    status: "completed",
  },
] as unknown as Order[];

const mockMtdRecords = [
  {
    id: "mtd-101",
    orderId: "ord-101",
    contactName: "Coach Sarah",
    programName: "Apex Athletics",
    invoice: "INV-2001",
    package: "GOLD 1:30",
    assignedProducer: "Casey Marlow",
    price: 500,
    finalCustomerPrice: 500,
    finalPayrollPrice: 500,
    producerPayout: 400,
    status: "completed",
    completedAt: "2026-09-10T12:00:00Z",
  },
  {
    id: "mtd-102",
    orderId: "ord-102",
    contactName: "Coach Emily",
    programName: "Starlet Dance",
    invoice: "INV-2002",
    package: "POM 2:00",
    assignedProducer: "Matt",
    price: 600,
    finalCustomerPrice: 600,
    finalPayrollPrice: 600,
    producerPayout: 480,
    status: "completed",
    completedAt: "2026-09-11T12:00:00Z",
  },
] as unknown as MTDRecord[];

describe("Row-Level Payroll Add-ons Workflow Tests", () => {
  it("1. Row-level Voiceover add-on binds to specific payroll row, order ID, and producer", () => {
    const voAddon: PayrollAddon = {
      id: "addon-1",
      orderId: "ord-101",
      mtdId: "mtd-101",
      programName: "Apex Athletics",
      teamName: "Junior Coed",
      contactName: "Coach Sarah",
      category: "Cheer",
      addonType: "voiceover",
      amount: 20,
      rateSource: "predefined",
      producerId: "prod-1",
      producerInitials: "CM",
      createdAt: "2026-09-12T10:00:00Z",
    };

    const caseyRows = getProducerFacingPayrollRows(
      mockMtdRecords,
      mockOrders,
      mockProducers,
      "Casey Marlow",
      undefined,
      [voAddon]
    );

    assert.equal(caseyRows.length, 1);
    const row = caseyRows[0];
    assert.equal(row.programName, "Apex Athletics");
    assert.equal(row.voiceoverPayout, "$20");
    assert.equal(row.voiceoverAddon, "$20");
    assert.equal(row.rawTotalPayout, 420); // 400 base + 20 voiceover
    assert.equal(row.totalPayout, "$420");
  });

  it("2. Row-level Rush Fee add-on binds to specific payroll row and assigned producer", () => {
    const rushAddon: PayrollAddon = {
      id: "addon-2",
      orderId: "ord-102",
      mtdId: "mtd-102",
      programName: "Starlet Dance",
      teamName: "Varsity Pom",
      contactName: "Coach Emily",
      category: "Dance",
      addonType: "rush_fee",
      amount: 150,
      rateSource: "predefined",
      producerId: "prod-2",
      producerInitials: "M",
      createdAt: "2026-09-12T11:00:00Z",
    };

    const mattRows = getProducerFacingPayrollRows(
      mockMtdRecords,
      mockOrders,
      mockProducers,
      "Matt",
      undefined,
      [rushAddon]
    );

    assert.equal(mattRows.length, 1);
    const row = mattRows[0];
    assert.equal(row.programName, "Starlet Dance");
    assert.equal(row.rushPayout, "$150");
    assert.equal(row.rushFee, "$150");
    assert.equal(row.rawTotalPayout, 630); // 480 base + 150 rush fee
    assert.equal(row.totalPayout, "$630");
  });

  it("3. Scoping isolation: Producer A add-ons never leak into Producer B statement", () => {
    const voAddon: PayrollAddon = {
      id: "addon-1",
      orderId: "ord-101",
      mtdId: "mtd-101",
      programName: "Apex Athletics",
      category: "Cheer",
      addonType: "voiceover",
      amount: 40,
      rateSource: "predefined",
      producerId: "prod-1",
      producerInitials: "CM",
      createdAt: "2026-09-12T10:00:00Z",
    };

    const mattRows = getProducerFacingPayrollRows(
      mockMtdRecords,
      mockOrders,
      mockProducers,
      "Matt",
      undefined,
      [voAddon]
    );

    // Matt statement should NOT include Casey's add-on
    assert.equal(mattRows.length, 1);
    assert.equal(mattRows[0].recId, "mtd-102");
  });
});
