"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const producer_schedule_calc_1 = require("../producer-schedule-calc");
const producer_availability_1 = require("../producer-availability");
function makeProducer(overrides) {
    return {
        id: "prod-test",
        name: "Nabiha Shafiq",
        initials: "NS",
        email: "ns@example.com",
        categories: ["Pom", "School Cheer"],
        specialty: "Pom",
        avatar: "",
        mixesThisWeek: 0,
        nextAvailable: "Today",
        status: "available",
        workDays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], // 7 days/week for date calc testing
        timeOff: [],
        maxMixesPerDay: 2,
        maxProducerCostPerDay: 2000,
        overtimeDays: [],
        ...overrides,
    };
}
function makeRecord(id, assignedProducer, startDate, endDate, producerPayout = 500) {
    return {
        id,
        section: "Active",
        assignedProducer,
        category: "Pom",
        editorRequest: "FA",
        contactName: "Contact",
        editorInitials: assignedProducer,
        programName: "Program",
        package: "Standard",
        musicTheme: "Pop",
        price: 1000,
        priceCompliance: "compliant",
        invoice: "INV-100",
        mixStartDate: startDate,
        mixEndDate: endDate,
        eightCountSheet: "",
        haveSongs: "yes",
        needsAttention: false,
        status: "active",
        recordStatus: "Ongoing",
        producerPayout,
    };
}
(0, node_test_1.describe)("SLT Implementation 2: Producer Daily Capacity and Booking Logic", () => {
    (0, node_test_1.it)("1. Limit = 1, one existing mix -> producer unavailable for overlapping dates", () => {
        const p1 = makeProducer({ maxMixesPerDay: 1 });
        const recA = makeRecord("rec-A", "NS", "2026-09-21", "2026-09-24");
        // On 2026-09-22, count is 1. Since max = 1, adding another mix (1+1 > 1) fails.
        const date = new Date("2026-09-22T00:00:00Z");
        strict_1.default.equal((0, producer_availability_1.isProducerAvailableOnDay)(p1, date, [recA]), false);
    });
    (0, node_test_1.it)("2. Limit = 2, one existing mix -> producer still has capacity", () => {
        const p2 = makeProducer({ maxMixesPerDay: 2 });
        const recA = makeRecord("rec-A", "NS", "2026-09-21", "2026-09-24");
        const date = new Date("2026-09-22T00:00:00Z");
        strict_1.default.equal((0, producer_availability_1.countProducerMixesOnDay)(p2, date, [recA]), 1);
        strict_1.default.equal((0, producer_availability_1.isProducerAvailableOnDay)(p2, date, [recA]), true);
    });
    (0, node_test_1.it)("3. Limit = 2, two existing overlapping mixes -> producer unavailable", () => {
        const p2 = makeProducer({ maxMixesPerDay: 2 });
        const recA = makeRecord("rec-A", "NS", "2026-09-21", "2026-09-24");
        const recB = makeRecord("rec-B", "NS", "2026-09-21", "2026-09-24");
        const date = new Date("2026-09-22T00:00:00Z");
        strict_1.default.equal((0, producer_availability_1.countProducerMixesOnDay)(p2, date, [recA, recB]), 2);
        strict_1.default.equal((0, producer_availability_1.isProducerAvailableOnDay)(p2, date, [recA, recB]), false);
    });
    (0, node_test_1.it)("4. Two existing mixes with different date ranges evaluated day-by-day", () => {
        const p2 = makeProducer({ maxMixesPerDay: 2 });
        const recA = makeRecord("rec-A", "NS", "2026-09-21", "2026-09-24");
        const recB = makeRecord("rec-B", "NS", "2026-09-23", "2026-09-27");
        const records = [recA, recB];
        // Sep 21: 1 mix -> HAS capacity
        strict_1.default.equal((0, producer_availability_1.isProducerAvailableOnDay)(p2, new Date("2026-09-21T00:00:00Z"), records), true);
        // Sep 22: 1 mix -> HAS capacity
        strict_1.default.equal((0, producer_availability_1.isProducerAvailableOnDay)(p2, new Date("2026-09-22T00:00:00Z"), records), true);
        // Sep 23: 2 mixes -> AT CAPACITY
        strict_1.default.equal((0, producer_availability_1.isProducerAvailableOnDay)(p2, new Date("2026-09-23T00:00:00Z"), records), false);
        // Sep 24: 2 mixes -> AT CAPACITY
        strict_1.default.equal((0, producer_availability_1.isProducerAvailableOnDay)(p2, new Date("2026-09-24T00:00:00Z"), records), false);
        // Sep 25: 1 mix -> HAS capacity
        strict_1.default.equal((0, producer_availability_1.isProducerAvailableOnDay)(p2, new Date("2026-09-25T00:00:00Z"), records), true);
    });
    (0, node_test_1.it)("5. Existing mixes partially overlap", () => {
        const p2 = makeProducer({ maxMixesPerDay: 2 });
        const recA = makeRecord("rec-A", "NS", "2026-09-20", "2026-09-22");
        const recB = makeRecord("rec-B", "NS", "2026-09-22", "2026-09-25");
        const records = [recA, recB];
        // Sep 21: 1 mix -> available
        strict_1.default.equal((0, producer_availability_1.isProducerAvailableOnDay)(p2, new Date("2026-09-21T00:00:00Z"), records), true);
        // Sep 22: 2 mixes -> full
        strict_1.default.equal((0, producer_availability_1.isProducerAvailableOnDay)(p2, new Date("2026-09-22T00:00:00Z"), records), false);
        // Sep 23: 1 mix -> available
        strict_1.default.equal((0, producer_availability_1.isProducerAvailableOnDay)(p2, new Date("2026-09-23T00:00:00Z"), records), true);
    });
    (0, node_test_1.it)("6. New mix starts during an existing mix", () => {
        const p1 = makeProducer({ maxMixesPerDay: 1 });
        const recExisting = makeRecord("rec-1", "NS", "2026-09-20", "2026-09-25");
        // Candidate mix Sep 23 to Sep 28
        const isAvail = (0, producer_availability_1.isProducerAvailableForMixWindow)(p1, "2026-09-23", "2026-09-28", [recExisting]);
        strict_1.default.equal(isAvail, false);
    });
    (0, node_test_1.it)("7. New mix ends during an existing mix", () => {
        const p1 = makeProducer({ maxMixesPerDay: 1 });
        const recExisting = makeRecord("rec-1", "NS", "2026-09-20", "2026-09-25");
        // Candidate mix Sep 18 to Sep 22
        const isAvail = (0, producer_availability_1.isProducerAvailableForMixWindow)(p1, "2026-09-18", "2026-09-22", [recExisting]);
        strict_1.default.equal(isAvail, false);
    });
    (0, node_test_1.it)("8. New mix completely overlaps multiple existing mixes", () => {
        const p1 = makeProducer({ maxMixesPerDay: 1 });
        const rec1 = makeRecord("rec-1", "NS", "2026-09-21", "2026-09-22");
        const rec2 = makeRecord("rec-2", "NS", "2026-09-24", "2026-09-25");
        // Candidate mix Sep 20 to Sep 26 covers both existing mixes
        const isAvail = (0, producer_availability_1.isProducerAvailableForMixWindow)(p1, "2026-09-20", "2026-09-26", [rec1, rec2]);
        strict_1.default.equal(isAvail, false);
    });
    (0, node_test_1.it)("9. Max Mixes limit available but Max Cost limit reached", () => {
        const p = makeProducer({ maxMixesPerDay: 4, maxProducerCostPerDay: 2000 });
        // 3 mixes totaling $1,800 payout
        const rec1 = makeRecord("rec-1", "NS", "2026-09-23", "2026-09-23", 500);
        const rec2 = makeRecord("rec-2", "NS", "2026-09-23", "2026-09-23", 700);
        const rec3 = makeRecord("rec-3", "NS", "2026-09-23", "2026-09-23", 600);
        const records = [rec1, rec2, rec3];
        const day = new Date("2026-09-23T00:00:00Z");
        strict_1.default.equal((0, producer_availability_1.countProducerMixesOnDay)(p, day, records), 3);
        strict_1.default.equal((0, producer_availability_1.countProducerDailyCost)(p, day, records), 1800);
        // Candidate mix with $300 payout puts total at $2,100 > $2,000 max cost -> FAIL
        const canTake300 = (0, producer_availability_1.isProducerAvailableOnDay)(p, day, records, undefined, 300);
        strict_1.default.equal(canTake300, false);
        // Candidate mix with $150 payout puts total at $1,950 <= $2,000 -> PASS
        const canTake150 = (0, producer_availability_1.isProducerAvailableOnDay)(p, day, records, undefined, 150);
        strict_1.default.equal(canTake150, true);
    });
    (0, node_test_1.it)("10. Max Cost available but Max Mixes limit reached", () => {
        const p = makeProducer({ maxMixesPerDay: 2, maxProducerCostPerDay: 5000 });
        const rec1 = makeRecord("rec-1", "NS", "2026-09-23", "2026-09-23", 200);
        const rec2 = makeRecord("rec-2", "NS", "2026-09-23", "2026-09-23", 200);
        const records = [rec1, rec2];
        const day = new Date("2026-09-23T00:00:00Z");
        // Mix count = 2 = maxMixes -> mix capacity reached -> FAIL
        strict_1.default.equal((0, producer_availability_1.isProducerAvailableOnDay)(p, day, records), false);
    });
    (0, node_test_1.it)("11. Both limits reached", () => {
        const p = makeProducer({ maxMixesPerDay: 2, maxProducerCostPerDay: 1000 });
        const rec1 = makeRecord("rec-1", "NS", "2026-09-23", "2026-09-23", 500);
        const rec2 = makeRecord("rec-2", "NS", "2026-09-23", "2026-09-23", 500);
        const records = [rec1, rec2];
        const day = new Date("2026-09-23T00:00:00Z");
        strict_1.default.equal((0, producer_availability_1.isProducerAvailableOnDay)(p, day, records), false);
    });
    (0, node_test_1.it)("12. Multi-day mix where only one date is at capacity", () => {
        const p = makeProducer({ maxMixesPerDay: 2 });
        const rec1 = makeRecord("rec-1", "NS", "2026-09-21", "2026-09-24");
        const rec2 = makeRecord("rec-2", "NS", "2026-09-23", "2026-09-24");
        const records = [rec1, rec2];
        // A new 4-day mix (Sep 21 -> Sep 24):
        // Sep 21 (1 mix OK), Sep 22 (1 mix OK), Sep 23 (2 mixes FULL), Sep 24 (2 mixes FULL)
        const canTakeSep21 = (0, producer_availability_1.isProducerAvailableForMixWindow)(p, "2026-09-21", "2026-09-24", records);
        strict_1.default.equal(canTakeSep21, false);
        // Next opening for a 2-day mix starting on/after Sep 21:
        const opening = (0, producer_schedule_calc_1.calculateProducerNextOpening)(p, records, [], "2026-09-21", { durationDays: 2 });
        // Sep 21..22 is available (both have 1 mix)!
        strict_1.default.equal(opening.nextAvailable, "Today");
    });
    (0, node_test_1.it)("13. Producer becomes available again after an existing mix ends", () => {
        const p = makeProducer({ maxMixesPerDay: 1 });
        const rec1 = makeRecord("rec-1", "NS", "2026-09-21", "2026-09-24");
        // Sep 24 is busy (1/1 mix)
        strict_1.default.equal((0, producer_availability_1.isProducerAvailableOnDay)(p, new Date("2026-09-24T00:00:00Z"), [rec1]), false);
        // Sep 25 is free (0/1 mix)
        strict_1.default.equal((0, producer_availability_1.isProducerAvailableOnDay)(p, new Date("2026-09-25T00:00:00Z"), [rec1]), true);
        const opening = (0, producer_schedule_calc_1.calculateProducerNextOpening)(p, [rec1], [], "2026-09-21", { durationDays: 1 });
        strict_1.default.equal(opening.nextAvailable, "Sep 25, 2026");
    });
    (0, node_test_1.it)("14. Producer has explicit custom limits", () => {
        const customP = makeProducer({ maxMixesPerDay: 5, maxProducerCostPerDay: 10000 });
        const recs = [
            makeRecord("r1", "NS", "2026-09-21", "2026-09-21", 1000),
            makeRecord("r2", "NS", "2026-09-21", "2026-09-21", 1000),
            makeRecord("r3", "NS", "2026-09-21", "2026-09-21", 1000),
        ];
        const day = new Date("2026-09-21T00:00:00Z");
        strict_1.default.equal((0, producer_availability_1.countProducerMixesOnDay)(customP, day, recs), 3);
        strict_1.default.equal((0, producer_availability_1.countProducerDailyCost)(customP, day, recs), 3000);
        // 3 mixes <= 5, $3000 <= $10000 -> Still available
        strict_1.default.equal((0, producer_availability_1.isProducerAvailableOnDay)(customP, day, recs), true);
    });
    (0, node_test_1.it)("15. Producer has default limits (1 mix/day, $2,000/day)", () => {
        const defaultP = makeProducer({ maxMixesPerDay: 1, maxProducerCostPerDay: 2000 });
        const rec = makeRecord("r1", "NS", "2026-09-21", "2026-09-21", 500);
        const day = new Date("2026-09-21T00:00:00Z");
        strict_1.default.equal((0, producer_availability_1.isProducerAvailableOnDay)(defaultP, day, [rec]), false);
    });
    (0, node_test_1.it)("16. Multi-day duration next opening resolution", () => {
        const p = makeProducer({ maxMixesPerDay: 2 });
        // NS has 2 mixes active Sep 23 and Sep 24
        const rec1 = makeRecord("rec-1", "NS", "2026-09-21", "2026-09-24");
        const rec2 = makeRecord("rec-2", "NS", "2026-09-23", "2026-09-24");
        const records = [rec1, rec2];
        // Requested candidate mix: Sep 23 -> Sep 25 (3-day duration, Sep 23 to 25)
        const newMixRecord = makeRecord("new-mix", "NS", "2026-09-23", "2026-09-25", 500);
        // Is NS available for requested period Sep 23-25?
        strict_1.default.equal((0, producer_availability_1.isProducerUnavailableForRecord)(p, newMixRecord, records), true);
        // Calculate next opening date for a 3-day mix starting from Sep 21:
        // Sep 21-23 (Sep 23 full -> FAIL)
        // Sep 22-24 (Sep 23,24 full -> FAIL)
        // Sep 23-25 (Sep 23,24 full -> FAIL)
        // Sep 24-26 (Sep 24 full -> FAIL)
        // Sep 25-27 (Sep 25, 26, 27 have 0 mixes -> PASS!)
        const opening = (0, producer_schedule_calc_1.calculateProducerNextOpening)(p, records, [], "2026-09-21", newMixRecord);
        strict_1.default.equal(opening.nextAvailable, "Sep 25, 2026");
    });
});
