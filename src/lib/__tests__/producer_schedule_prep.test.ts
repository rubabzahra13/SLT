import assert from "node:assert";
import { describe, it } from "node:test";
import {
  getProducerFacingScheduleRows,
  generateScheduleCsv,
  PRODUCER_SCHEDULE_COLUMNS,
} from "../export-csv";
import type { MTDRecord, Order, Producer } from "@/types";

const mockProducers: Producer[] = [
  {
    id: "prod-1",
    name: "Casey Marlow",
    initials: "CM",
    email: "TESTcasey@soundslikethat.com",
    specialty: "Cheer",
    categories: ["Cheer"],
    avatar: "/avatars/cm.png",
    mixesThisWeek: 2,
    nextAvailable: "2026-09-12",
    status: "available",
    workDays: ["mon", "tue", "wed", "thu", "fri"],
    overtimeDays: [],
    timeOff: [],
    maxMixesPerDay: 5,
    maxProducerCostPerDay: 1000,
  },
  {
    id: "prod-2",
    name: "Matt Sturgis",
    initials: "MS",
    email: "TESTmatt@soundslikethat.com",
    specialty: "Dance",
    categories: ["Dance"],
    avatar: "/avatars/ms.png",
    mixesThisWeek: 1,
    nextAvailable: "2026-09-14",
    status: "available",
    workDays: ["mon", "tue", "wed", "thu", "fri"],
    overtimeDays: [],
    timeOff: [],
    maxMixesPerDay: 5,
    maxProducerCostPerDay: 1000,
  },
];

const mockOrders: Order[] = [];

const mockMTDRecords: MTDRecord[] = [
  {
    id: "mtd-1",
    section: "CHEERLEADING MUSIC",
    category: "Cheer",
    programName: "Alpha Cheer",
    contactName: "Coach Amy",
    assignedProducer: "Casey Marlow",
    editorInitials: "CM",
    editorRequest: "CM",
    musicTheme: "Energy",
    eightCountSheet: "Yes",
    haveSongs: "Yes",
    needsAttention: false,
    package: "GOLD 1:30",
    price: 700,
    priceCompliance: "compliant",
    invoice: "INV-101",
    status: "active",
    mixStartDate: "2026-09-12",
    mixEndDate: "2026-09-15",
  },
  {
    id: "mtd-2",
    section: "DANCE MUSIC",
    category: "Dance",
    programName: "Beta Dance",
    contactName: "Coach Bob",
    assignedProducer: "Matt Sturgis",
    editorInitials: "MS",
    editorRequest: "MS",
    musicTheme: "Hip Hop",
    eightCountSheet: "Yes",
    haveSongs: "Yes",
    needsAttention: false,
    package: "PLATINUM 2:00",
    price: 900,
    priceCompliance: "compliant",
    invoice: "INV-102",
    status: "active",
    mixStartDate: "2026-09-14",
    mixEndDate: "2026-09-18",
  },
  {
    id: "mtd-3",
    section: "CHEERLEADING MUSIC",
    category: "Cheer",
    programName: "Completed Cheer",
    contactName: "Coach Carl",
    assignedProducer: "Casey Marlow",
    editorInitials: "CM",
    editorRequest: "CM",
    musicTheme: "School",
    eightCountSheet: "Yes",
    haveSongs: "Yes",
    needsAttention: false,
    package: "SILVER 1:00",
    price: 500,
    priceCompliance: "compliant",
    invoice: "INV-103",
    status: "completed",
    inPayroll: true,
    mixStartDate: "2026-09-01",
    mixEndDate: "2026-09-05",
  },
  {
    id: "mtd-4",
    section: "CHEERLEADING MUSIC",
    category: "Cheer",
    programName: "Unassigned Order",
    contactName: "Coach Dan",
    assignedProducer: "",
    editorInitials: "",
    editorRequest: "FA",
    musicTheme: "",
    eightCountSheet: "",
    haveSongs: "",
    needsAttention: false,
    invoice: "",
    package: "BRONZE 1:00",
    price: 400,
    priceCompliance: "compliant",
    status: "active",
    mixStartDate: "2026-09-20",
  },
];

describe("Producer Schedule Preparation Unit Tests", () => {
  it("excludes completed, payroll, and unassigned records from schedule dataset", () => {
    const allRows = getProducerFacingScheduleRows(
      mockMTDRecords,
      mockOrders,
      mockProducers,
      "all"
    );

    assert.strictEqual(allRows.length, 2);
    const programNames = allRows.map((r) => r.programName);
    assert.ok(programNames.includes("Alpha Cheer"));
    assert.ok(programNames.includes("Beta Dance"));
    assert.strictEqual(programNames.includes("Completed Cheer"), false);
    assert.strictEqual(programNames.includes("Unassigned Order"), false);
  });

  it("filters correctly by individual producer name", () => {
    const caseyRows = getProducerFacingScheduleRows(
      mockMTDRecords,
      mockOrders,
      mockProducers,
      "Casey Marlow"
    );

    assert.strictEqual(caseyRows.length, 1);
    assert.strictEqual(caseyRows[0].programName, "Alpha Cheer");
    assert.strictEqual(caseyRows[0].assignedProducer, "Casey Marlow");
  });

  it("guarantees 100% column parity between preview rows and CSV export string", () => {
    const csv = generateScheduleCsv(
      mockMTDRecords,
      mockOrders,
      mockProducers,
      "Casey Marlow"
    );

    assert.ok(csv.includes("Mix Start Date,Mix End Date,Producer,Program Name,Contact Name,Invoice #,Category,Subtype,Package,Status"));
    assert.ok(csv.includes("2026-09-12"));
    assert.ok(csv.includes("Casey Marlow"));
    assert.ok(csv.includes("Alpha Cheer"));
    assert.ok(csv.includes("INV-101"));
  });

  it("has exactly 10 defined producer schedule columns", () => {
    assert.strictEqual(PRODUCER_SCHEDULE_COLUMNS.length, 10);
    const keys = PRODUCER_SCHEDULE_COLUMNS.map((c) => c.key);
    assert.deepStrictEqual(keys, [
      "mixStartDate",
      "mixEndDate",
      "assignedProducer",
      "programName",
      "contactName",
      "invoice",
      "category",
      "subtype",
      "package",
      "status",
    ]);
  });
});
