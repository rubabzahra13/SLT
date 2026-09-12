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
        mixEndDate: "2026-09-19",
        status: "active",
        recordStatus: "Ongoing",
        producerPayout: 500,
        price: 1000,
        ...overrides,
    };
}
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
            mixEndDate: "2026-09-19",
        });
        const isUnavailable = (0, producer_availability_1.isProducerUnavailableForRecord)(producer, mondayRecord, []);
        strict_1.default.equal(isUnavailable, false, "Producer working Mon-Fri must be ELIGIBLE for Monday Sep 14 mix");
    });
    (0, node_test_1.it)("Test 3: Monday Sep 14 mix blocks producer who is at daily capacity on Sep 14", () => {
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
        const isUnavailable = (0, producer_availability_1.isProducerUnavailableForRecord)(producer, newMix, [existingMix]);
        strict_1.default.equal(isUnavailable, true, "Producer at max daily capacity must NOT be eligible");
        const reason = (0, producer_availability_1.getProducerUnavailabilityReason)(producer, newMix, [existingMix]);
        strict_1.default.ok(reason?.includes("capacity"), `Reason should mention capacity limit: ${reason}`);
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
});
