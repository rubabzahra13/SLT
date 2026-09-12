import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MTDRecord, Producer } from "@/types";
import {
  isProducerAvailableOnDate,
  calculateProducerNextOpening,
} from "@/lib/producer-schedule-calc";
import {
  isProducerUnavailableForRecord,
  getProducerUnavailabilityReason,
} from "@/lib/producer-availability";
import { suggestMixStartDate } from "@/lib/scheduling";

function createMockProducer(overrides: Partial<Producer> = {}): Producer {
  return {
    id: "prod-1",
    name: "Casey Marlow",
    initials: "CM",
    email: "casey@example.com",
    avatar: "",
    color: "#000000",
    specialty: "All-Star Cheer",
    categories: ["All-Star Cheer"],
    status: "available",
    nextAvailable: "Today",
    mixesThisWeek: 0,
    workDays: ["mon", "tue", "wed", "thu", "fri"],
    overtimeDays: [],
    timeOff: [],
    maxMixesPerDay: 2,
    maxProducerCostPerDay: 5000,
    notes: "",
    ...overrides,
  } as Producer;
}

function createMockRecord(overrides: Partial<MTDRecord> = {}): MTDRecord {
  return {
    id: "mtd-1",
    orderId: "ord-1",
    programName: "Star Athletics",
    category: "All-Star Cheer",
    package: "Platinum",
    editorRequest: "FA",
    assignedProducer: null,
    mixStartDate: "2026-09-14",
    mixEndDate: "2026-09-19",
    status: "active",
    recordStatus: "Ongoing",
    producerPayout: 500,
    price: 1000,
    ...overrides,
  } as MTDRecord;
}

describe("Assign Producer Availability Logic", () => {
  const saturdayDate = new Date("2026-09-12T12:00:00Z"); // Saturday Sep 12, 2026

  it("Test 1: Saturday Sep 12 correctly shows 0 editors available today, soonest free is Mon Sep 14", () => {
    const producer = createMockProducer();
    
    // Saturday availability must be false
    const availableToday = isProducerAvailableOnDate(producer, saturdayDate, [], []);
    assert.equal(availableToday, false, "Producer should NOT be available on Saturday (off day)");

    // Next opening starting from Saturday anchor must be Monday Sep 14
    const nextOpening = calculateProducerNextOpening(producer, [], [], saturdayDate);
    assert.equal(nextOpening.nextAvailable, "Sep 14, 2026");
  });

  it("Test 2: Monday Sep 14 mix allows assignment for Mon-Fri scheduled producer even though Saturday has 0 available today", () => {
    const producer = createMockProducer();
    const mondayRecord = createMockRecord({
      mixStartDate: "2026-09-14",
      mixEndDate: "2026-09-19",
    });

    const isUnavailable = isProducerUnavailableForRecord(producer, mondayRecord, []);
    assert.equal(isUnavailable, false, "Producer working Mon-Fri must be ELIGIBLE for Monday Sep 14 mix");
  });

  it("Test 3: Monday Sep 14 mix blocks producer who is at daily capacity on Sep 14", () => {
    const producer = createMockProducer({ maxMixesPerDay: 1 });
    const existingMix = createMockRecord({
      id: "rec-existing",
      assignedProducer: "Casey Marlow",
      mixStartDate: "2026-09-14",
      mixEndDate: "2026-09-18",
    });

    const newMix = createMockRecord({
      id: "rec-new",
      mixStartDate: "2026-09-14",
      mixEndDate: "2026-09-18",
    });

    const isUnavailable = isProducerUnavailableForRecord(producer, newMix, [existingMix]);
    assert.equal(isUnavailable, true, "Producer at max daily capacity must NOT be eligible");

    const reason = getProducerUnavailabilityReason(producer, newMix, [existingMix]);
    assert.ok(reason?.includes("capacity"), `Reason should mention capacity limit: ${reason}`);
  });

  it("Test 4: Editor who does not work Monday is NOT eligible for Sep 14 mix", () => {
    // Producer only works Tue-Fri
    const tueFriProducer = createMockProducer({
      workDays: ["tue", "wed", "thu", "fri"],
    });

    const mondayRecord = createMockRecord({
      mixStartDate: "2026-09-14",
      mixEndDate: "2026-09-18",
    });

    const isUnavailable = isProducerUnavailableForRecord(tueFriProducer, mondayRecord, []);
    assert.equal(isUnavailable, true, "Producer not working Monday must NOT be eligible for Sep 14 mix");

    const reason = getProducerUnavailabilityReason(tueFriProducer, mondayRecord, []);
    assert.equal(reason, "Not scheduled to work on Mons");
  });

  it("Test 5: suggestMixStartDate correctly finds next scheduled working day (2026-09-14)", () => {
    const producer = createMockProducer();
    const suggested = suggestMixStartDate("CM", [producer], []);
    assert.equal(suggested, "2026-09-14");
  });

  it("Test 6: Changing mix start date from Monday (Sep 14) to Saturday (Sep 12) dynamically updates eligibility", () => {
    const producer = createMockProducer();

    const mondayRecord = createMockRecord({ mixStartDate: "2026-09-14" });
    assert.equal(isProducerUnavailableForRecord(producer, mondayRecord, []), false);

    const saturdayRecord = createMockRecord({ mixStartDate: "2026-09-12" });
    assert.equal(isProducerUnavailableForRecord(producer, saturdayRecord, []), true);

    const reason = getProducerUnavailabilityReason(producer, saturdayRecord, []);
    assert.equal(reason, "Not scheduled to work on Sats");
  });
});
