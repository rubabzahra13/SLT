"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const producer_schedule_calc_1 = require("@/lib/producer-schedule-calc");
const producer_availability_1 = require("@/lib/producer-availability");
const scheduling_1 = require("@/lib/scheduling");
function createMockProducer(overrides = {}) {
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
    };
}
function createMockRecord(overrides = {}) {
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
    };
}
const dentistLeave = {
    id: "off-1",
    startDate: "2026-09-16",
    endDate: "2026-09-16",
    type: "personal",
    reason: "Dentist",
};
(0, node_test_1.describe)("Assign Producer Availability Logic", () => {
    const saturdayDate = new Date("2026-09-12T12:00:00Z"); // Saturday Sep 12, 2026
    (0, node_test_1.it)("Test 1: Saturday Sep 12 correctly shows 0 editors available today, soonest free is Mon Sep 14", () => {
        const producer = createMockProducer();
        // Saturday availability must be false
        const availableToday = (0, producer_schedule_calc_1.isProducerAvailableOnDate)(producer, saturdayDate, [], []);
        strict_1.default.equal(availableToday, false, "Producer should NOT be available on Saturday (off day)");
        // Next opening starting from Saturday anchor must be Monday Sep 14
        const nextOpening = (0, producer_schedule_calc_1.calculateProducerNextOpening)(producer, [], [], saturdayDate);
        strict_1.default.equal(nextOpening.nextAvailable, "Sep 14, 2026");
    });
    (0, node_test_1.it)("Test 2: Monday Sep 14 mix allows assignment for Mon-Fri scheduled producer even though Saturday has 0 available today", () => {
        const producer = createMockProducer();
        const mondayRecord = createMockRecord({
            mixStartDate: "2026-09-14",
            mixEndDate: "2026-09-18",
        });
        const isUnavailable = (0, producer_availability_1.isProducerUnavailableForRecord)(producer, mondayRecord, []);
        strict_1.default.equal(isUnavailable, false, "Producer working Mon-Fri must be ELIGIBLE for Monday Sep 14 mix");
    });
    (0, node_test_1.it)("Test 2b: A range may cross weekends and leave; only the start and end must be workable", () => {
        const producer = createMockProducer({
            timeOff: [dentistLeave],
        });
        strict_1.default.equal((0, producer_availability_1.isProducerAvailableForMixWindow)(producer, "2026-09-14", "2026-09-22"), true, "Weekend and leave inside the range are skipped, not blocking");
        strict_1.default.deepEqual((0, producer_availability_1.findMixWindowBlocker)(producer, "2026-09-14", "2026-09-19"), { reason: "not_working", iso: "2026-09-19", edge: "end" });
        strict_1.default.deepEqual((0, producer_availability_1.findMixWindowBlocker)(producer, "2026-09-16", "2026-09-18"), { reason: "leave", iso: "2026-09-16", edge: "start" });
    });
    (0, node_test_1.it)("Test 3: Daily mix limit never makes a producer unavailable, only flags the over days", () => {
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
        strict_1.default.equal((0, producer_availability_1.isProducerUnavailableForRecord)(producer, newMix), false);
        strict_1.default.equal((0, producer_availability_1.getProducerUnavailabilityReason)(producer, newMix), null);
        const check = (0, producer_availability_1.checkProducerDailyLimits)(producer, "2026-09-14", "2026-09-18", [existingMix, newMix], { excludeRecordId: newMix.id });
        strict_1.default.deepEqual(check.overMixDays, [
            "2026-09-14",
            "2026-09-15",
            "2026-09-16",
            "2026-09-17",
            "2026-09-18",
        ]);
        strict_1.default.equal(check.peakMixDay?.bookedMixes, 1);
        strict_1.default.equal((0, producer_availability_1.dailyLimitCheckHasIssues)(check), true);
    });
    (0, node_test_1.it)("Test 3b: Cost cap counts the new mix's payout on every day of each booked range", () => {
        const producer = createMockProducer({ maxMixesPerDay: null, maxProducerCostPerDay: 1000 });
        const existingMix = createMockRecord({
            id: "rec-existing",
            assignedProducer: "Casey Marlow",
            mixStartDate: "2026-09-14",
            mixEndDate: "2026-09-15",
            producerPayout: 500,
        });
        const within = (0, producer_availability_1.checkProducerDailyLimits)(producer, "2026-09-15", "2026-09-16", [existingMix], {
            newMixCost: 500,
        });
        strict_1.default.deepEqual(within.overCostDays, []);
        strict_1.default.equal(within.peakCostDay?.bookedCost, 500);
        const over = (0, producer_availability_1.checkProducerDailyLimits)(producer, "2026-09-15", "2026-09-16", [existingMix], {
            newMixCost: 600,
        });
        strict_1.default.deepEqual(over.overCostDays, ["2026-09-15"]);
    });
    (0, node_test_1.it)("Test 3c: Completed, outsourced, and in-payroll mixes don't count toward limits", () => {
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
        const check = (0, producer_availability_1.checkProducerDailyLimits)(producer, "2026-09-14", "2026-09-18", records);
        strict_1.default.deepEqual(check.overMixDays, []);
        strict_1.default.equal(check.peakMixDay?.bookedMixes, 0);
    });
    (0, node_test_1.it)("Test 4: Editor who does not work Monday is NOT eligible for Sep 14 mix", () => {
        // Producer only works Tue-Fri
        const tueFriProducer = createMockProducer({
            workDays: ["tue", "wed", "thu", "fri"],
        });
        const mondayRecord = createMockRecord({
            mixStartDate: "2026-09-14",
            mixEndDate: "2026-09-18",
        });
        const isUnavailable = (0, producer_availability_1.isProducerUnavailableForRecord)(tueFriProducer, mondayRecord, []);
        strict_1.default.equal(isUnavailable, true, "Producer not working Monday must NOT be eligible for Sep 14 mix");
        const reason = (0, producer_availability_1.getProducerUnavailabilityReason)(tueFriProducer, mondayRecord, []);
        strict_1.default.equal(reason, "Not scheduled to work on Mons");
    });
    (0, node_test_1.it)("Test 5: suggestMixStartDate correctly finds next scheduled working day (2026-09-14)", () => {
        const producer = createMockProducer();
        const suggested = (0, scheduling_1.suggestMixStartDate)("CM", [producer], []);
        strict_1.default.equal(suggested, "2026-09-14");
    });
    (0, node_test_1.it)("Test 6: Changing mix start date from Monday (Sep 14) to Saturday (Sep 12) dynamically updates eligibility", () => {
        const producer = createMockProducer();
        const mondayRecord = createMockRecord({ mixStartDate: "2026-09-14" });
        strict_1.default.equal((0, producer_availability_1.isProducerUnavailableForRecord)(producer, mondayRecord, []), false);
        const saturdayRecord = createMockRecord({ mixStartDate: "2026-09-12" });
        strict_1.default.equal((0, producer_availability_1.isProducerUnavailableForRecord)(producer, saturdayRecord, []), true);
        const reason = (0, producer_availability_1.getProducerUnavailabilityReason)(producer, saturdayRecord, []);
        strict_1.default.equal(reason, "Not scheduled to work on Sats");
    });
    (0, node_test_1.it)("Test 7: Suggested mix end counts package working days, start included", () => {
        const producer = createMockProducer();
        strict_1.default.equal((0, producer_availability_1.suggestMixEndDate)("2026-09-14", "Gold", { producer }), "2026-09-18");
        strict_1.default.equal((0, producer_availability_1.suggestMixEndDate)("2026-09-14", "Platinum", { producer }), "2026-09-22");
        // Without a producer the studio week (Mon–Fri) is used.
        strict_1.default.equal((0, producer_availability_1.suggestMixEndDate)("2026-09-14", "Platinum"), "2026-09-22");
    });
    (0, node_test_1.it)("Test 7b: Suggested mix end skips the producer's leave and studio holidays", () => {
        const holiday = {
            id: "h-1",
            name: "Studio Day",
            startDate: "09-17",
            endDate: "09-17",
            appliesToAll: true,
            producerIds: [],
        };
        const onLeave = createMockProducer({
            timeOff: [dentistLeave],
        });
        strict_1.default.equal((0, producer_availability_1.suggestMixEndDate)("2026-09-14", "Gold", { producer: onLeave }), "2026-09-21");
        strict_1.default.equal((0, producer_availability_1.suggestMixEndDate)("2026-09-14", "Gold", {
            producer: onLeave,
            studioHolidays: [holiday],
        }), "2026-09-22");
        // A start on a day off doesn't count as day one.
        strict_1.default.equal((0, producer_availability_1.suggestMixEndDate)("2026-09-12", "Gold", { producer: onLeave }), "2026-09-21");
    });
    (0, node_test_1.it)("Test 8: countProducerWorkingDays skips days off, leave and holidays", () => {
        const holiday = {
            id: "h-1",
            name: "Studio Day",
            startDate: "09-17",
            endDate: "09-17",
            appliesToAll: true,
            producerIds: [],
        };
        const producer = createMockProducer({
            timeOff: [dentistLeave],
        });
        strict_1.default.equal((0, producer_availability_1.countProducerWorkingDays)(producer, "2026-09-14", "2026-09-22"), 6);
        strict_1.default.equal((0, producer_availability_1.countProducerWorkingDays)(producer, "2026-09-14", "2026-09-22", [holiday]), 5);
        strict_1.default.equal((0, producer_availability_1.countProducerWorkingDays)(producer, "2026-09-19", "2026-09-20"), 0);
    });
    (0, node_test_1.it)("Test 9: Leave calendar blocks Ongoing mix days and describes them for the tooltip", () => {
        const producer = createMockProducer({ name: "Casey Marlow", initials: "CM" });
        const ongoing = createMockRecord({
            id: "mix-1",
            assignedProducer: "Casey Marlow",
            programName: "Star Athletics Shine",
            mixStartDate: "2026-09-14",
            mixEndDate: "2026-09-18",
            recordStatus: "Ongoing",
            status: "active",
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
        const onDay = (0, producer_availability_1.listProducerMixBookingsOnDay)(producer, "2026-09-15", [
            ongoing,
            completed,
        ]);
        strict_1.default.equal(onDay.length, 1);
        strict_1.default.equal(onDay[0].programName, "Star Athletics Shine");
        strict_1.default.equal(onDay[0].mixEndDate, "2026-09-18");
        const tip = (0, producer_availability_1.describeProducerMixDayForLeave)(onDay);
        strict_1.default.match(tip ?? "", /Mix scheduled · Star Athletics Shine · ends/);
        strict_1.default.match(tip ?? "", /Sep/);
        strict_1.default.deepEqual((0, producer_availability_1.collectProducerMixBlockedDays)(producer, [ongoing, completed], "2026-09-14", "2026-09-22"), [
            "2026-09-14",
            "2026-09-15",
            "2026-09-16",
            "2026-09-17",
            "2026-09-18",
        ]);
        const conflicts = (0, producer_availability_1.findLeaveMixConflicts)(producer, "2026-09-17", "2026-09-22", [ongoing, completed]);
        strict_1.default.equal(conflicts.length, 1);
        strict_1.default.equal(conflicts[0].recordId, "mix-1");
        strict_1.default.deepEqual((0, producer_availability_1.findLeaveMixConflicts)(producer, "2026-09-21", "2026-09-22", [
            ongoing,
            completed,
        ]), []);
    });
});
