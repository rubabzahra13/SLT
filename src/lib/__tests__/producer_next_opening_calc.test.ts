import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MTDRecord, Producer } from "@/types";
import {
  calculateProducerNextOpening,
  enrichProducerWithSchedule,
} from "../producer-schedule-calc";

const caseyProducer: Producer = {
  id: "prod-1",
  name: "Casey Marlow",
  initials: "CM",
  email: "casey@soundslikethat.com",
  specialty: "Cheer",
  categories: ["Cheer"],
  avatar: "/avatars/cm.png",
  mixesThisWeek: 0,
  nextAvailable: "TBD",
  status: "available",
  workDays: ["mon", "tue", "wed", "thu", "fri"],
  overtimeDays: [],
  timeOff: [],
  maxMixesPerDay: 5,
  maxProducerCostPerDay: 1000,
};

function createMockRecord(overrides: Partial<MTDRecord>): MTDRecord {
  return {
    id: "mtd-rec-1",
    section: "CHEERLEADING MUSIC",
    category: "Cheer",
    programName: "Test Program",
    contactName: "Coach Test",
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

describe("Producer Next Opening Calculation Engine", () => {
  it("Test 1: Completely available producer on a work day returns Today and Available status", () => {
    // 2026-09-14 is a Monday
    const mondayAnchor = "2026-09-14";
    const res = calculateProducerNextOpening(caseyProducer, [], [], mondayAnchor);

    assert.equal(res.nextAvailable, "Today");
    assert.equal(res.status, "available");
  });

  it("Test 2: Producer booked today and tomorrow returns first available date", () => {
    // Today = 2026-09-14 (Monday)
    // Booked 2026-09-14 to 2026-09-15 (Mon-Tue)
    const mondayAnchor = "2026-09-14";
    const rec = createMockRecord({
      id: "rec-1",
      assignedProducer: "Casey Marlow",
      recordStatus: "Ongoing",
      status: "active",
      mixStartDate: "2026-09-14",
      mixEndDate: "2026-09-15",
    });

    const res = calculateProducerNextOpening(caseyProducer, [rec], [], mondayAnchor);
    assert.equal(res.nextAvailable, "Sep 16, 2026");
    assert.equal(res.status, "limited");
  });

  it("Test 3: Consecutive multi-day mixes skip full date ranges", () => {
    // Today = 2026-09-14 (Monday)
    // Mix 1: Sept 14-15 (Mon-Tue)
    // Mix 2: Sept 16-17 (Wed-Thu)
    // Mix 3: Sept 18 (Fri)
    const mondayAnchor = "2026-09-14";
    const recs: MTDRecord[] = [
      createMockRecord({
        id: "rec-1",
        assignedProducer: "Casey Marlow",
        recordStatus: "Ongoing",
        status: "active",
        mixStartDate: "2026-09-14",
        mixEndDate: "2026-09-15",
      }),
      createMockRecord({
        id: "rec-2",
        assignedProducer: "Casey Marlow",
        recordStatus: "Ongoing",
        status: "active",
        mixStartDate: "2026-09-16",
        mixEndDate: "2026-09-17",
      }),
      createMockRecord({
        id: "rec-3",
        assignedProducer: "Casey Marlow",
        recordStatus: "Ongoing",
        status: "active",
        mixStartDate: "2026-09-18",
        mixEndDate: "2026-09-18",
      }),
    ];

    const res = calculateProducerNextOpening(caseyProducer, recs, [], mondayAnchor);
    // Sept 19 & 20 are Sat & Sun (off). Next opening is Monday Sept 21.
    assert.equal(res.nextAvailable, "Sep 21, 2026");
    assert.equal(res.status, "unavailable");
  });

  it("Test 4: Non-scheduled record (Waiting for Data) does NOT block availability", () => {
    const mondayAnchor = "2026-09-14";
    const waitingRec = createMockRecord({
      id: "rec-waiting",
      assignedProducer: "Casey Marlow",
      recordStatus: "Waiting for Data",
      needsAttention: true,
      status: "needs_attention",
      mixStartDate: "2026-09-14",
      mixEndDate: "2026-09-20",
    });

    const res = calculateProducerNextOpening(caseyProducer, [waitingRec], [], mondayAnchor);
    assert.equal(res.nextAvailable, "Today");
    assert.equal(res.status, "available");
  });

  it("Test 5: Outsourced record does NOT block availability", () => {
    const mondayAnchor = "2026-09-14";
    const outsourcedRec = createMockRecord({
      id: "rec-outsourced",
      assignedProducer: "Casey Marlow",
      recordStatus: "Outsourced",
      status: "outsourced",
      mixStartDate: "2026-09-14",
      mixEndDate: "2026-09-20",
    });

    const res = calculateProducerNextOpening(caseyProducer, [outsourcedRec], [], mondayAnchor);
    assert.equal(res.nextAvailable, "Today");
    assert.equal(res.status, "available");
  });

  it("Test 6: Completed record does NOT block availability", () => {
    const mondayAnchor = "2026-09-14";
    const completedRec = createMockRecord({
      id: "rec-completed",
      assignedProducer: "Casey Marlow",
      recordStatus: "Completed",
      status: "completed",
      inPayroll: true,
      mixStartDate: "2026-09-14",
      mixEndDate: "2026-09-20",
    });

    const res = calculateProducerNextOpening(caseyProducer, [completedRec], [], mondayAnchor);
    assert.equal(res.nextAvailable, "Today");
    assert.equal(res.status, "available");
  });

  it("Test 7: Dynamically changing mix end date updates Next Opening immediately", () => {
    const mondayAnchor = "2026-09-14";
    let rec = createMockRecord({
      id: "rec-dynamic",
      assignedProducer: "Casey Marlow",
      recordStatus: "Ongoing",
      status: "active",
      mixStartDate: "2026-09-14",
      mixEndDate: "2026-09-15",
    });

    let res = calculateProducerNextOpening(caseyProducer, [rec], [], mondayAnchor);
    assert.equal(res.nextAvailable, "Sep 16, 2026");

    // Extend end date to Sept 17
    rec = { ...rec, mixEndDate: "2026-09-17" };
    res = calculateProducerNextOpening(caseyProducer, [rec], [], mondayAnchor);
    assert.equal(res.nextAvailable, "Sep 18, 2026");
  });

  it("enrichProducerWithSchedule correctly attaches nextAvailable and status to Producer object", () => {
    const mondayAnchor = "2026-09-14";
    const rec = createMockRecord({
      id: "rec-1",
      assignedProducer: "Casey Marlow",
      recordStatus: "Ongoing",
      status: "active",
      mixStartDate: "2026-09-14",
      mixEndDate: "2026-09-15",
    });

    const enriched = enrichProducerWithSchedule(caseyProducer, [rec], [], mondayAnchor);
    assert.equal(enriched.nextAvailable, "Sep 16, 2026");
    assert.equal(enriched.status, "limited");
  });
});
