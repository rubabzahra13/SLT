import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { MTDRecord, Order, PayrollAddon, Producer } from "@/types";
import {
  PRODUCER_STATEMENT_COLUMNS,
  getProducerFacingPayrollRows,
  generateProducerFacingPayrollCsv,
  producerStatementColumnsForRows,
} from "../export-csv";

const mockProducers = [
  {
    id: "p1",
    name: "Casey Marlow",
    initials: "CM",
    email: "casey@example.com",
    categories: ["school-all-star-cheer"],
    avatar: "",
    color: "#ff6b6b",
    mixesThisWeek: 2,
    nextAvailable: "Tomorrow",
    status: "available",
    workDays: ["mon", "tue"],
    maxMixesPerDay: 5,
    extraDays: [],
  },
  {
    id: "p2",
    name: "Matt",
    initials: "M",
    email: "matt@example.com",
    categories: ["school-all-star-dance"],
    avatar: "",
    color: "#4ecdc4",
    mixesThisWeek: 1,
    nextAvailable: "Today",
    status: "available",
    workDays: ["wed", "thu"],
    maxMixesPerDay: 5,
    extraDays: [],
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
  it("1. getProducerFacingPayrollRows includes statement keys; Subtype hidden; Mix Length filled when applicable", () => {
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
      assert.notEqual(col.key, "subtype");
      assert.notEqual(col.label, "Subtype");
    });

    const visible = producerStatementColumnsForRows(rows);
    assert.ok(!visible.some((c) => c.key === "subtype" || c.label === "Subtype"));
    assert.ok(visible.some((c) => c.key === "timeLimit"));

    assert.equal(row.programName, "Lions Cheer");
    // Cheer: Mix Length applicable — fill from package when form field empty.
    assert.equal(row.timeLimit, "1:30");
    // Package Type uses board label (tier), same as Payroll/Orders column.
    assert.ok(visible.some((c) => c.key === "package" && c.label === "Package Type"));
    assert.ok(row.package && row.package !== "-");
    assert.match(row.package, /gold/i);
  });

  it("1b. Cheer Mix Length reads timeLengthOfMix when package is tier-only", () => {
    const tierOnlyRec = {
      ...mockMtdRecords[0],
      package: "Platinum Package",
      timeLengthOfMix: "2:30",
      formType: "school-all-star-cheer",
      category: "Cheer",
    } as unknown as MTDRecord;
    const blankLinked = {
      ...mockOrders[0],
      package: "Platinum Package",
      timeLengthOfMix: "",
      formType: "school-all-star-cheer",
    } as unknown as Order;

    const rows = getProducerFacingPayrollRows(
      [tierOnlyRec],
      [blankLinked],
      mockProducers,
      "Casey Marlow"
    );

    assert.equal(rows.length, 1);
    assert.equal(rows[0].timeLimit, "2:30");
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

    const expectedHeaders = producerStatementColumnsForRows(rows)
      .map((c) => c.label)
      .join(",");
    assert.ok(
      csv.startsWith(expectedHeaders),
      "CSV must start with visible column headers"
    );
    assert.equal(csv.includes("Subtype"), false);
    assert.ok(csv.includes("Mix Length"));
    assert.equal(row.timeLimit, "2:00");

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

  it("5. Compensation rate is percent in preview rows and CSV (not 0.53 / 1)", () => {
    const ordersWithRates = mockOrders.map((o) =>
      o.id === "ord-1"
        ? {
            ...o,
            rateUsed: 1,
            rateSource: "manual_override",
            producerPayout: 500,
          }
        : {
            ...o,
            rateUsed: 0.53,
            rateSource: "manual_override",
            producerPayout: 318,
          }
    ) as Order[];

    const caseyRows = getProducerFacingPayrollRows(
      mockMtdRecords,
      ordersWithRates,
      mockProducers,
      "Casey Marlow"
    );
    assert.equal(caseyRows[0].producerRate, "100%");

    const mattRows = getProducerFacingPayrollRows(
      mockMtdRecords,
      ordersWithRates,
      mockProducers,
      "Matt"
    );
    assert.equal(mattRows[0].producerRate, "53%");

    const caseyCsv = generateProducerFacingPayrollCsv(
      mockMtdRecords,
      ordersWithRates,
      mockProducers,
      "Casey Marlow"
    );
    const mattCsv = generateProducerFacingPayrollCsv(
      mockMtdRecords,
      ordersWithRates,
      mockProducers,
      "Matt"
    );
    assert.ok(caseyCsv.includes("100%"), "Casey CSV must include 100%");
    assert.equal(caseyCsv.includes(",1,"), false, "Casey CSV must not dump raw 1");
    assert.ok(mattCsv.includes("53%"), "Matt CSV must include 53%");
    assert.equal(mattCsv.includes("0.53"), false, "Matt CSV must not dump 0.53");
  });

  it("keeps only the selected cheer subcategory in statement rows and CSV", () => {
    const orders = [
      {
        id: "ord-asc",
        formType: "school-all-star-cheer",
        cheerFormSubtype: "all-star-cheer",
        programName: "Alpha Cheer",
        price: 700,
        status: "completed",
        needsAttention: false,
        createdAt: "2026-09-01T00:00:00Z",
      },
      {
        id: "ord-youth",
        formType: "school-all-star-cheer",
        cheerFormSubtype: "youth-rec-cheer",
        programName: "Youth Rec Program",
        price: 400,
        status: "completed",
        needsAttention: false,
        createdAt: "2026-09-01T00:00:00Z",
      },
      {
        id: "ord-school",
        formType: "school-all-star-cheer",
        cheerFormSubtype: "school-cheer-viroc-no",
        programName: "School Cheer Program",
        price: 500,
        status: "completed",
        needsAttention: false,
        createdAt: "2026-09-01T00:00:00Z",
      },
    ] as Order[];
    const records = [
      {
        id: "mtd-asc",
        orderId: "ord-asc",
        programName: "Alpha Cheer",
        package: "GOLD 1:30",
        assignedProducer: "Casey Marlow",
        status: "completed",
        inPayroll: true,
        completedAt: "2026-09-12T12:00:00Z",
        formType: "school-all-star-cheer",
        cheerFormSubtype: "all-star-cheer",
      },
      {
        id: "mtd-youth",
        orderId: "ord-youth",
        programName: "Youth Rec Program",
        package: "GOLD 1:30",
        assignedProducer: "Casey Marlow",
        status: "completed",
        inPayroll: true,
        completedAt: "2026-09-12T12:00:00Z",
        formType: "school-all-star-cheer",
        cheerFormSubtype: "youth-rec-cheer",
      },
      {
        id: "mtd-school",
        orderId: "ord-school",
        programName: "School Cheer Program",
        package: "GOLD 1:30",
        assignedProducer: "Casey Marlow",
        status: "completed",
        inPayroll: true,
        completedAt: "2026-09-12T12:00:00Z",
        formType: "school-all-star-cheer",
        cheerFormSubtype: "school-cheer-viroc-no",
      },
    ] as MTDRecord[];
    const addons = [
      {
        id: "vo-asc",
        addonType: "voiceover",
        producerId: "p1",
        producerInitials: "CM",
        amount: 40,
        formType: "school-all-star-cheer",
        cheerFormSubtype: "all-star-cheer",
        programName: "Alpha Cheer",
        mtdId: "mtd-asc",
        category: "Cheer",
        createdAt: "2026-09-12T12:00:00Z",
      },
      {
        id: "vo-school",
        addonType: "voiceover",
        producerId: "p1",
        producerInitials: "CM",
        amount: 20,
        formType: "school-all-star-cheer",
        cheerFormSubtype: "school-cheer-viroc-no",
        programName: "School Cheer Program",
        mtdId: "mtd-school",
        category: "Cheer",
        createdAt: "2026-09-12T12:00:00Z",
      },
    ] as PayrollAddon[];
    const schoolCheer = {
      form: "school-all-star-cheer" as const,
      cheerSubtype: "school-cheer-viroc-no" as const,
      danceSubtype: "all" as const,
    };

    const rows = getProducerFacingPayrollRows(
      records,
      orders,
      mockProducers,
      "Casey Marlow",
      undefined,
      addons,
      undefined,
      schoolCheer
    );
    assert.deepStrictEqual(
      rows.map((row) => row.programName),
      ["School Cheer Program", "School Cheer Program"]
    );
    assert.ok(rows.every((row) => String(row.subtype).includes("School Cheer")));
    assert.equal(
      rows.some((row) => row.programName === "Alpha Cheer"),
      false
    );
    assert.equal(
      rows.some((row) => row.programName === "Youth Rec Program"),
      false
    );

    const csv = generateProducerFacingPayrollCsv(
      records,
      orders,
      mockProducers,
      "Casey Marlow",
      undefined,
      addons,
      schoolCheer
    );
    assert.ok(csv.includes("School Cheer Program"));
    assert.equal(csv.includes("Alpha Cheer"), false);
    assert.equal(csv.includes("Youth Rec Program"), false);
    assert.equal(csv.includes("all-star-cheer"), false);
    assert.equal(csv.includes("youth-rec-cheer"), false);

    const allCheer = getProducerFacingPayrollRows(
      records,
      orders,
      mockProducers,
      "Casey Marlow",
      undefined,
      addons,
      undefined,
      {
        form: "school-all-star-cheer",
        cheerSubtype: "all",
        danceSubtype: "all",
      }
    );
    assert.equal(allCheer.filter((row) => row.voiceoverAddon === "None").length, 3);
    assert.ok(allCheer.some((row) => row.programName === "Alpha Cheer"));
    assert.ok(allCheer.some((row) => row.programName === "Youth Rec Program"));
    assert.ok(allCheer.some((row) => row.programName === "School Cheer Program"));
  });
});
