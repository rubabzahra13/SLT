import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MTDRecord, Producer, ProducerTimeOff } from "@/types";
import {
  isProducerAvailableOnDate,
  calculateProducerNextOpening,
} from "@/lib/producer-schedule-calc";
import {
  checkProducerDailyLimits,
  collectProducerMixBlockedDays,
  countProducerWorkingDays,
  dailyLimitCheckHasIssues,
  describeProducerMixDayForLeave,
  findLeaveMixConflicts,
  findMixWindowBlocker,
  isProducerAvailableForMixWindow,
  isProducerUnavailableForRecord,
  getProducerUnavailabilityReason,
  listProducerMixBookingsOnDay,
  suggestMixEndDate,
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
    mixEndDate: "2026-09-18",
    status: "active",
    recordStatus: "Ongoing",
    producerPayout: 500,
    price: 1000,
    ...overrides,
  } as MTDRecord;
}

const dentistLeave: ProducerTimeOff = {
  id: "off-1",
  startDate: "2026-09-16",
  endDate: "2026-09-16",
  type: "personal",
  reason: "Dentist",
};

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
      mixEndDate: "2026-09-18",
    });

    const isUnavailable = isProducerUnavailableForRecord(producer, mondayRecord);
    assert.equal(isUnavailable, false, "Producer working Mon-Fri must be ELIGIBLE for Monday Sep 14 mix");
  });

  it("Test 2b: A range may cross weekends and leave; only the start and end must be workable", () => {
    const producer = createMockProducer({
      timeOff: [dentistLeave],
    });

    assert.equal(
      isProducerAvailableForMixWindow(producer, "2026-09-14", "2026-09-22"),
      true,
      "Weekend and leave inside the range are skipped, not blocking"
    );

    assert.deepEqual(
      findMixWindowBlocker(producer, "2026-09-14", "2026-09-19"),
      { reason: "not_working", iso: "2026-09-19", edge: "end" }
    );
    assert.deepEqual(
      findMixWindowBlocker(producer, "2026-09-16", "2026-09-18"),
      { reason: "leave", iso: "2026-09-16", edge: "start" }
    );
  });

  it("Test 3: Daily mix limit never makes a producer unavailable, only flags the over days", () => {
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

    assert.equal(isProducerUnavailableForRecord(producer, newMix), false);
    assert.equal(getProducerUnavailabilityReason(producer, newMix), null);

    const check = checkProducerDailyLimits(
      producer,
      "2026-09-14",
      "2026-09-18",
      [existingMix, newMix],
      { excludeRecordId: newMix.id }
    );
    assert.deepEqual(check.overMixDays, [
      "2026-09-14",
      "2026-09-15",
      "2026-09-16",
      "2026-09-17",
      "2026-09-18",
    ]);
    assert.equal(check.peakMixDay?.bookedMixes, 1);
    assert.equal(dailyLimitCheckHasIssues(check), true);
  });

  it("Test 3b: Cost cap divides each mix payout across its workable days", () => {
    const producer = createMockProducer({ maxMixesPerDay: null, maxProducerCostPerDay: 1000 });
    const existingMix = createMockRecord({
      id: "rec-existing",
      assignedProducer: "Casey Marlow",
      mixStartDate: "2026-09-14",
      mixEndDate: "2026-09-15",
      producerPayout: 500,
    });

    // 500 across Mon–Tue = $250/day booked on Sep 15
    const within = checkProducerDailyLimits(producer, "2026-09-15", "2026-09-16", [existingMix], {
      newMixCost: 500, // full payout → $250/day over 2 work days
    });
    assert.deepEqual(within.overCostDays, []);
    assert.equal(within.peakCostDay?.bookedCost, 250);
    assert.equal(within.newMixDailyCost, 250);

    // 1600 → $800/day; 250 + 800 > 1000 on Sep 15
    const over = checkProducerDailyLimits(producer, "2026-09-15", "2026-09-16", [existingMix], {
      newMixCost: 1600,
    });
    assert.deepEqual(over.overCostDays, ["2026-09-15"]);
  });

  it("Test 3c: Completed, outsourced, and in-payroll mixes don't count toward limits", () => {
    const producer = createMockProducer({ maxMixesPerDay: 1 });
    const base = {
      assignedProducer: "Casey Marlow",
      mixStartDate: "2026-09-14",
      mixEndDate: "2026-09-18",
    };
    const records = [
      createMockRecord({ ...base, id: "done", recordStatus: "Completed", status: "completed" }),
      createMockRecord({ ...base, id: "out", recordStatus: "Outsourced", status: "outsourced" }),
      createMockRecord({ ...base, id: "pay", inPayroll: true }),
    ];

    const check = checkProducerDailyLimits(producer, "2026-09-14", "2026-09-18", records);
    assert.deepEqual(check.overMixDays, []);
    assert.equal(check.peakMixDay?.bookedMixes, 0);
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

    const isUnavailable = isProducerUnavailableForRecord(tueFriProducer, mondayRecord);
    assert.equal(isUnavailable, true, "Producer not working Monday must NOT be eligible for Sep 14 mix");

    const reason = getProducerUnavailabilityReason(tueFriProducer, mondayRecord);
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
    assert.equal(isProducerUnavailableForRecord(producer, mondayRecord), false);

    const saturdayRecord = createMockRecord({ mixStartDate: "2026-09-12" });
    assert.equal(isProducerUnavailableForRecord(producer, saturdayRecord), true);

    const reason = getProducerUnavailabilityReason(producer, saturdayRecord);
    assert.equal(reason, "Not scheduled to work on Sats");
  });

  it("Test 7: Suggested mix end counts package working days, start included", () => {
    const producer = createMockProducer();
    assert.equal(suggestMixEndDate("2026-09-14", "Gold", { producer }), "2026-09-18");
    assert.equal(suggestMixEndDate("2026-09-14", "Platinum", { producer }), "2026-09-22");
    // Without a producer the studio week (Mon–Fri) is used.
    assert.equal(suggestMixEndDate("2026-09-14", "Platinum"), "2026-09-22");
  });

  it("Test 7b: Suggested mix end skips the producer's leave", () => {
    const onLeave = createMockProducer({
      timeOff: [dentistLeave],
    });

    assert.equal(
      suggestMixEndDate("2026-09-14", "Gold", { producer: onLeave }),
      "2026-09-21"
    );
    // A start on a day off doesn't count as day one.
    assert.equal(
      suggestMixEndDate("2026-09-12", "Gold", { producer: onLeave }),
      "2026-09-21"
    );
  });

  it("Test 8: countProducerWorkingDays skips days off and leave", () => {
    const producer = createMockProducer({
      timeOff: [dentistLeave],
    });

    assert.equal(countProducerWorkingDays(producer, "2026-09-14", "2026-09-22"), 6);
    assert.equal(countProducerWorkingDays(producer, "2026-09-19", "2026-09-20"), 0);
  });

  it("Test 9: Leave calendar lists Ongoing mix days for the tooltip (not hard-blocked)", () => {
    const producer = createMockProducer({ name: "Casey Marlow", initials: "CM" });
    const ongoing = createMockRecord({
      id: "mix-1",
      assignedProducer: "Casey Marlow",
      programName: "Star Athletics Shine",
      mixStartDate: "2026-09-14",
      mixEndDate: "2026-09-18",
      recordStatus: "Ongoing",
      status: "active",
      inMTD: true,
    });
    const completed = createMockRecord({
      id: "mix-done",
      assignedProducer: "Casey Marlow",
      programName: "Done Mix",
      mixStartDate: "2026-09-21",
      mixEndDate: "2026-09-22",
      recordStatus: "Completed",
      status: "completed",
    });

    const onDay = listProducerMixBookingsOnDay(producer, "2026-09-15", [
      ongoing,
      completed,
    ]);
    assert.equal(onDay.length, 1);
    assert.equal(onDay[0].programName, "Star Athletics Shine");
    assert.equal(onDay[0].mixEndDate, "2026-09-18");
    assert.equal(onDay[0].inMTD, true);

    const tip = describeProducerMixDayForLeave(onDay);
    assert.match(tip ?? "", /Mix on this day/);
    assert.match(tip ?? "", /Star Athletics Shine/);
    assert.match(tip ?? "", /Sep/);

    assert.deepEqual(
      collectProducerMixBlockedDays(
        producer,
        [ongoing, completed],
        "2026-09-14",
        "2026-09-22"
      ),
      [
        "2026-09-14",
        "2026-09-15",
        "2026-09-16",
        "2026-09-17",
        "2026-09-18",
      ]
    );

    const conflicts = findLeaveMixConflicts(
      producer,
      "2026-09-17",
      "2026-09-22",
      [ongoing, completed]
    );
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].recordId, "mix-1");

    assert.deepEqual(
      findLeaveMixConflicts(producer, "2026-09-21", "2026-09-22", [
        ongoing,
        completed,
      ]),
      []
    );
  });
});
