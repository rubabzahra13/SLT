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
    categories: ["Cheer"],
    avatar: "/avatars/cm.png",
    mixesThisWeek: 2,
    nextAvailable: "2026-09-12",
    status: "available",
    workDays: ["mon", "tue", "wed", "thu", "fri"],
    extraDays: [],
    timeOff: [],
    maxMixesPerDay: 5,
    maxProducerCostPerDay: 1000,
  },
  {
    id: "prod-2",
    name: "Matt Sturgis",
    initials: "MS",
    email: "TESTmatt@soundslikethat.com",
    categories: ["Dance"],
    avatar: "/avatars/ms.png",
    mixesThisWeek: 1,
    nextAvailable: "2026-09-14",
    status: "available",
    workDays: ["mon", "tue", "wed", "thu", "fri"],
    extraDays: [],
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
  it("includes MTD Ongoing records that are assigned with valid start AND end dates", () => {
    const validOngoingRecord = createMockRecord({
      id: "rec-valid",
      programName: "Valid Ongoing Program",
      assignedProducer: "Casey Marlow",
      recordStatus: "Ongoing",
      status: "active",
      inMTD: true,
      mixStartDate: "2026-09-12",
      mixEndDate: "2026-09-15",
    });

    assert.equal(isEligibleProducerScheduleRecord(validOngoingRecord), true);
  });

  it("includes Orders-tab Assigned records (pre-MTD) with producer and dates", () => {
    const assignedOrdersRecord = createMockRecord({
      id: "rec-orders-assigned",
      programName: "Orders Assigned Program",
      assignedProducer: "Casey Marlow",
      inMTD: false,
      status: "active",
      recordStatus: undefined,
      mixStartDate: "2026-09-12",
      mixEndDate: "2026-09-15",
    });

    assert.equal(isEligibleProducerScheduleRecord(assignedOrdersRecord), true);
  });

  it("excludes Completed / Payroll records from the schedule", () => {
    const completedRecord = createMockRecord({
      id: "rec-completed",
      programName: "Completed Program",
      assignedProducer: "Casey Marlow",
      recordStatus: "Completed",
      status: "completed",
      inPayroll: true,
      inMTD: true,
      mixStartDate: "2026-09-12",
      mixEndDate: "2026-09-15",
    });

    assert.equal(isEligibleProducerScheduleRecord(completedRecord), false);
  });

  it("includes MTD Outsourced records that are assigned with dates", () => {
    const outsourcedRecord = createMockRecord({
      id: "rec-outsourced",
      section: "OUTSOURCED MIXES",
      programName: "Outsourced Program",
      assignedProducer: "Casey Marlow",
      recordStatus: "Outsourced",
      status: "outsourced",
      inMTD: true,
      mixStartDate: "2026-09-12",
      mixEndDate: "2026-09-15",
    });

    assert.equal(isEligibleProducerScheduleRecord(outsourcedRecord), true);
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

  it("displays Assigned / Ongoing / Outsourced statuses in preview and CSV export", () => {
    const mixedRecords: MTDRecord[] = [
      createMockRecord({
        id: "rec-1",
        programName: "Casey Standard Mix",
        assignedProducer: "Casey Marlow",
        recordStatus: "Ongoing",
        status: "active",
        inMTD: true,
        mixStartDate: "2026-09-12",
        mixEndDate: "2026-09-15",
      }),
      createMockRecord({
        id: "rec-2",
        programName: "Casey Payroll Mix",
        assignedProducer: "Casey Marlow",
        recordStatus: "Completed",
        status: "completed",
        inPayroll: true,
        mixStartDate: "2026-09-12",
        mixEndDate: "2026-09-15",
      }),
      createMockRecord({
        id: "rec-3",
        programName: "Matt Standard Mix",
        assignedProducer: "Matt Sturgis",
        recordStatus: "Ongoing",
        status: "active",
        inMTD: true,
        mixStartDate: "2026-09-14",
        mixEndDate: "2026-09-18",
      }),
      createMockRecord({
        id: "rec-4",
        programName: "Casey Outsourced Mix",
        assignedProducer: "Casey Marlow",
        recordStatus: "Outsourced",
        status: "outsourced",
        inMTD: true,
        mixStartDate: "2026-09-12",
        mixEndDate: "2026-09-16",
      }),
      createMockRecord({
        id: "rec-5",
        programName: "Casey Orders Assigned",
        assignedProducer: "Casey Marlow",
        inMTD: false,
        status: "active",
        mixStartDate: "2026-09-13",
        mixEndDate: "2026-09-17",
      }),
    ];

    const rowsAll = getProducerFacingScheduleRows(mixedRecords, mockOrders, mockProducers, "all");
    assert.equal(rowsAll.length, 4);

    const rowsCasey = getProducerFacingScheduleRows(mixedRecords, mockOrders, mockProducers, "Casey Marlow");
    assert.equal(rowsCasey.length, 3);
    const byName = Object.fromEntries(rowsCasey.map((r) => [r.programName, r.status]));
    assert.equal(byName["Casey Standard Mix"], "Ongoing");
    assert.equal(byName["Casey Outsourced Mix"], "Outsourced");
    assert.equal(byName["Casey Orders Assigned"], "Assigned");

    const csvCasey = generateScheduleCsv(mixedRecords, mockOrders, mockProducers, "Casey Marlow");
    assert.ok(csvCasey.includes("Ongoing"));
    assert.ok(csvCasey.includes("Outsourced"));
    assert.ok(csvCasey.includes("Assigned"));
    assert.equal(csvCasey.includes("Casey Payroll Mix"), false);
  });
});
