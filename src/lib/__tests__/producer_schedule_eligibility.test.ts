import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MTDRecord, Order, Producer } from "@/types";
import {
  isEligibleProducerScheduleRecord,
  getProducerFacingScheduleRows,
  generateScheduleCsv,
} from "../export-csv";

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

function createMockRecord(overrides: Partial<MTDRecord>): MTDRecord {
  return {
    id: "mtd-default",
    section: "CHEERLEADING MUSIC",
    category: "Cheer",
    programName: "Default Program",
    contactName: "Coach Default",
    assignedProducer: "Casey Marlow",
    editorInitials: "CM",
    editorRequest: "CM",
    musicTheme: "Energy",
    eightCountSheet: "Yes",
    haveSongs: "Yes",
    package: "GOLD 1:30",
    price: 700,
    priceCompliance: "compliant",
    invoice: "INV-100",
    status: "active",
    recordStatus: "Ongoing",
    mixStartDate: "2026-09-12",
    mixEndDate: "2026-09-15",
    ...overrides,
  } as MTDRecord;
}

describe("Producer Schedule Strict Eligibility Rules", () => {
  it("includes ONLY records that are Ongoing, assigned, and have valid start AND end dates", () => {
    const validOngoingRecord = createMockRecord({
      id: "rec-valid",
      programName: "Valid Ongoing Program",
      assignedProducer: "Casey Marlow",
      recordStatus: "Ongoing",
      status: "active",
      mixStartDate: "2026-09-12",
      mixEndDate: "2026-09-15",
    });

    assert.equal(isEligibleProducerScheduleRecord(validOngoingRecord), true);
  });

  it("excludes records with Waiting for Data / Needs Attention status", () => {
    const waitingForDataRecord = createMockRecord({
      id: "rec-waiting",
      programName: "Waiting Program",
      assignedProducer: "Casey Marlow",
      recordStatus: "Waiting for Data",
      needsAttention: true,
      status: "needs_attention",
      mixStartDate: "2026-09-12",
      mixEndDate: "2026-09-15",
    });

    assert.equal(isEligibleProducerScheduleRecord(waitingForDataRecord), false);
  });

  it("excludes records with Completed status or inPayroll flag", () => {
    const completedRecord = createMockRecord({
      id: "rec-completed",
      programName: "Completed Program",
      assignedProducer: "Casey Marlow",
      recordStatus: "Completed",
      status: "completed",
      inPayroll: true,
      mixStartDate: "2026-09-12",
      mixEndDate: "2026-09-15",
    });

    assert.equal(isEligibleProducerScheduleRecord(completedRecord), false);
  });

  it("excludes records with Outsourced status", () => {
    const outsourcedRecord = createMockRecord({
      id: "rec-outsourced",
      section: "OUTSOURCED MIXES",
      programName: "Outsourced Program",
      assignedProducer: "Casey Marlow",
      recordStatus: "Outsourced",
      status: "outsourced",
      mixStartDate: "2026-09-12",
      mixEndDate: "2026-09-15",
    });

    assert.equal(isEligibleProducerScheduleRecord(outsourcedRecord), false);
  });

  it("excludes unassigned records even if dates and status are valid", () => {
    const unassignedRecord = createMockRecord({
      id: "rec-unassigned",
      programName: "Unassigned Program",
      assignedProducer: "",
      recordStatus: "Ongoing",
      status: "active",
      mixStartDate: "2026-09-12",
      mixEndDate: "2026-09-15",
    });

    assert.equal(isEligibleProducerScheduleRecord(unassignedRecord), false);
  });

  it("excludes records missing Mix Start Date or Mix End Date", () => {
    const missingStart = createMockRecord({
      id: "rec-no-start",
      programName: "No Start Program",
      assignedProducer: "Casey Marlow",
      recordStatus: "Ongoing",
      status: "active",
      mixStartDate: "",
      mixEndDate: "2026-09-15",
    });

    const missingEnd = createMockRecord({
      id: "rec-no-end",
      programName: "No End Program",
      assignedProducer: "Casey Marlow",
      recordStatus: "Ongoing",
      status: "active",
      mixStartDate: "2026-09-12",
      mixEndDate: "",
    });

    assert.equal(isEligibleProducerScheduleRecord(missingStart), false);
    assert.equal(isEligibleProducerScheduleRecord(missingEnd), false);
  });

  it("displays status as 'Ongoing' for all eligible schedule rows in preview and CSV export", () => {
    const mixedRecords: MTDRecord[] = [
      createMockRecord({
        id: "rec-1",
        programName: "Casey Standard Mix",
        assignedProducer: "Casey Marlow",
        recordStatus: "Ongoing",
        status: "active",
        mixStartDate: "2026-09-12",
        mixEndDate: "2026-09-15",
      }),
      createMockRecord({
        id: "rec-2",
        programName: "Casey Waiting Mix",
        assignedProducer: "Casey Marlow",
        recordStatus: "Waiting for Data",
        status: "needs_attention",
        mixStartDate: "2026-09-12",
        mixEndDate: "2026-09-15",
      }),
      createMockRecord({
        id: "rec-3",
        programName: "Matt Standard Mix",
        assignedProducer: "Matt Sturgis",
        recordStatus: "Ongoing",
        status: "active",
        mixStartDate: "2026-09-14",
        mixEndDate: "2026-09-18",
      }),
    ];

    const rowsAll = getProducerFacingScheduleRows(mixedRecords, mockOrders, mockProducers, "all");
    assert.equal(rowsAll.length, 2);
    assert.equal(rowsAll[0].status, "Ongoing");
    assert.equal(rowsAll[1].status, "Ongoing");

    const rowsCasey = getProducerFacingScheduleRows(mixedRecords, mockOrders, mockProducers, "Casey Marlow");
    assert.equal(rowsCasey.length, 1);
    assert.equal(rowsCasey[0].programName, "Casey Standard Mix");
    assert.equal(rowsCasey[0].status, "Ongoing");

    const csvCasey = generateScheduleCsv(mixedRecords, mockOrders, mockProducers, "Casey Marlow");
    assert.ok(csvCasey.includes("Ongoing"));
    assert.equal(csvCasey.includes("Needs Attention"), false);
    assert.equal(csvCasey.includes("Active"), false);
  });
});
