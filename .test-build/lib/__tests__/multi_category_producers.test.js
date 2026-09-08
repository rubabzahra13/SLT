"use strict";
/**
 * Tests for multi-category producer support, capacity limits (mix count + cost),
 * and assignment eligibility.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const editor_assignment_1 = require("../editor-assignment");
const producer_availability_1 = require("../producer-availability");
// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
function makeProducer(overrides = {}) {
    return {
        id: "p1",
        name: "Test Producer",
        initials: "TP",
        email: "test@test.com",
        categories: ["All-Star Cheer"],
        specialty: "All-Star Cheer",
        avatar: "",
        mixesThisWeek: 0,
        nextAvailable: "TBD",
        status: "available",
        workDays: ["mon", "tue", "wed", "thu", "fri"],
        timeOff: [],
        maxMixesPerDay: null,
        maxProducerCostPerDay: null,
        overtimeDays: [],
        compensationModel: null,
        defaultRate: null,
        ratesByCategory: null,
        rateOverrides: null,
        manualInputFields: null,
        notes: null,
        ...overrides,
    };
}
function makeRecord(id, assignedProducer, producerPayout = 0, startDate = "2026-09-10", endDate = "2026-09-14") {
    return {
        id,
        section: "ACTIVE MIXES",
        assignedProducer,
        category: "Cheer",
        editorRequest: "FA",
        contactName: "Test",
        editorInitials: "TP",
        programName: `Mix ${id}`,
        package: "GOLD",
        musicTheme: "",
        price: 500,
        priceCompliance: "compliant",
        invoice: "",
        mixStartDate: startDate,
        mixEndDate: endDate,
        eightCountSheet: "HAVE CS",
        haveSongs: "HAVE",
        needsAttention: false,
        status: "active",
        producerPayout,
    };
}
// ---------------------------------------------------------------------------
// 1. orderCategoryToProducerCategory — form/subtype mapping
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("orderCategoryToProducerCategory", () => {
    (0, node_test_1.it)("all-star-cheer subtype → All-Star Cheer", () => {
        strict_1.default.equal((0, editor_assignment_1.orderCategoryToProducerCategory)("school-all-star-cheer", "all-star-cheer"), "All-Star Cheer");
    });
    (0, node_test_1.it)("school-cheer-viroc-yes → School Cheer", () => {
        strict_1.default.equal((0, editor_assignment_1.orderCategoryToProducerCategory)("school-all-star-cheer", "school-cheer-viroc-yes"), "School Cheer");
    });
    (0, node_test_1.it)("school-cheer-viroc-no → School Cheer", () => {
        strict_1.default.equal((0, editor_assignment_1.orderCategoryToProducerCategory)("school-all-star-cheer", "school-cheer-viroc-no"), "School Cheer");
    });
    (0, node_test_1.it)("youth-rec-cheer → Youth Rec Cheer", () => {
        strict_1.default.equal((0, editor_assignment_1.orderCategoryToProducerCategory)("school-all-star-cheer", "youth-rec-cheer"), "Youth Rec Cheer");
    });
    (0, node_test_1.it)("pom → Pom", () => {
        strict_1.default.equal((0, editor_assignment_1.orderCategoryToProducerCategory)("school-all-star-dance", "pom"), "Pom");
    });
    (0, node_test_1.it)("hip-hop → Hip Hop", () => {
        strict_1.default.equal((0, editor_assignment_1.orderCategoryToProducerCategory)("school-all-star-dance", "hip-hop"), "Hip Hop");
    });
    (0, node_test_1.it)("team-performance-variety → Team Performance / Variety", () => {
        strict_1.default.equal((0, editor_assignment_1.orderCategoryToProducerCategory)("school-all-star-dance", "team-performance-variety"), "Team Performance / Variety");
    });
    (0, node_test_1.it)("gameday → Gameday", () => {
        strict_1.default.equal((0, editor_assignment_1.orderCategoryToProducerCategory)("school-all-star-dance", "gameday"), "Gameday");
    });
    (0, node_test_1.it)("jazz-kick → Jazz / Kick", () => {
        strict_1.default.equal((0, editor_assignment_1.orderCategoryToProducerCategory)("school-all-star-dance", "jazz-kick"), "Jazz / Kick");
    });
    (0, node_test_1.it)("marching-band form → Marching Band", () => {
        strict_1.default.equal((0, editor_assignment_1.orderCategoryToProducerCategory)("marching-band", undefined), "Marching Band");
    });
    (0, node_test_1.it)("sports-entertainment form → Sports Entertainment", () => {
        strict_1.default.equal((0, editor_assignment_1.orderCategoryToProducerCategory)("sports-entertainment", undefined), "Sports Entertainment");
    });
    (0, node_test_1.it)("school-anthem form → School Anthem", () => {
        strict_1.default.equal((0, editor_assignment_1.orderCategoryToProducerCategory)("school-anthem", undefined), "School Anthem");
    });
    (0, node_test_1.it)("legacy 'Cheer' → All-Star Cheer", () => {
        strict_1.default.equal((0, editor_assignment_1.orderCategoryToProducerCategory)(undefined, undefined, "Cheer"), "All-Star Cheer");
    });
    (0, node_test_1.it)("legacy 'Dance' → Pom", () => {
        strict_1.default.equal((0, editor_assignment_1.orderCategoryToProducerCategory)(undefined, undefined, "Dance"), "Pom");
    });
});
// ---------------------------------------------------------------------------
// 2. producerSupportsCategory
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("producerSupportsCategory", () => {
    (0, node_test_1.it)("returns true when producer has the required category", () => {
        const p = makeProducer({ categories: ["All-Star Cheer", "School Cheer"] });
        strict_1.default.equal((0, editor_assignment_1.producerSupportsCategory)(p, "All-Star Cheer"), true);
        strict_1.default.equal((0, editor_assignment_1.producerSupportsCategory)(p, "School Cheer"), true);
    });
    (0, node_test_1.it)("returns false when producer does not have the required category", () => {
        const p = makeProducer({ categories: ["Pom", "Gameday"] });
        strict_1.default.equal((0, editor_assignment_1.producerSupportsCategory)(p, "Hip Hop"), false);
        strict_1.default.equal((0, editor_assignment_1.producerSupportsCategory)(p, "Marching Band"), false);
    });
    (0, node_test_1.it)("returns true when requiredCategory is empty", () => {
        const p = makeProducer({ categories: ["Pom"] });
        strict_1.default.equal((0, editor_assignment_1.producerSupportsCategory)(p, ""), true);
        strict_1.default.equal((0, editor_assignment_1.producerSupportsCategory)(p, "all"), true);
    });
    (0, node_test_1.it)("falls back to specialty when categories array is empty", () => {
        const p = makeProducer({ categories: [], specialty: "Marching Band" });
        strict_1.default.equal((0, editor_assignment_1.producerSupportsCategory)(p, "Marching Band"), true);
        strict_1.default.equal((0, editor_assignment_1.producerSupportsCategory)(p, "Pom"), false);
    });
    (0, node_test_1.it)("Hip Hop producer is not eligible for All-Star Cheer", () => {
        const p = makeProducer({ categories: ["Hip Hop", "Gameday", "Sports Entertainment"] });
        strict_1.default.equal((0, editor_assignment_1.producerSupportsCategory)(p, "All-Star Cheer"), false);
        strict_1.default.equal((0, editor_assignment_1.producerSupportsCategory)(p, "Hip Hop"), true);
        strict_1.default.equal((0, editor_assignment_1.producerSupportsCategory)(p, "Gameday"), true);
    });
});
// ---------------------------------------------------------------------------
// 3. getProducersForCategory
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("getProducersForCategory", () => {
    const producers = [
        makeProducer({ id: "p1", name: "Casey", initials: "CM", categories: ["Pom", "All-Star Cheer", "School Cheer", "Youth Rec Cheer"] }),
        makeProducer({ id: "p2", name: "Brent", initials: "BV", categories: ["Marching Band"] }),
        makeProducer({ id: "p3", name: "Max", initials: "MT", categories: ["Hip Hop", "Gameday", "Sports Entertainment"] }),
        makeProducer({ id: "p4", name: "Rory", initials: "RF", categories: ["Pom", "Jazz / Kick", "Team Performance / Variety", "Gameday", "Hip Hop"] }),
    ];
    (0, node_test_1.it)("Hip Hop returns only producers who support Hip Hop", () => {
        const result = (0, editor_assignment_1.getProducersForCategory)(producers, "Hip Hop");
        const initials = result.map((p) => p.initials).sort();
        strict_1.default.deepEqual(initials, ["MT", "RF"]);
    });
    (0, node_test_1.it)("Marching Band returns only Brent", () => {
        strict_1.default.equal((0, editor_assignment_1.getProducersForCategory)(producers, "Marching Band").length, 1);
        strict_1.default.equal((0, editor_assignment_1.getProducersForCategory)(producers, "Marching Band")[0].initials, "BV");
    });
    (0, node_test_1.it)("Pom returns Casey and Rory but not Brent", () => {
        const result = (0, editor_assignment_1.getProducersForCategory)(producers, "Pom");
        const initials = result.map((p) => p.initials);
        strict_1.default.ok(initials.includes("CM"));
        strict_1.default.ok(initials.includes("RF"));
        strict_1.default.ok(!initials.includes("BV"));
    });
    (0, node_test_1.it)("legacy 'Cheer' string maps to All-Star Cheer and returns Casey", () => {
        const result = (0, editor_assignment_1.getProducersForCategory)(producers, "Cheer");
        strict_1.default.ok(result.some((p) => p.initials === "CM"));
    });
});
// ---------------------------------------------------------------------------
// 4. Mix count capacity
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("Mix count capacity", () => {
    const today = new Date(2026, 8, 10); // Sep 10
    (0, node_test_1.it)("no limit → always under capacity", () => {
        const p = makeProducer({ initials: "TP", maxMixesPerDay: null });
        const records = [makeRecord("r1", "TP", 200)];
        strict_1.default.equal((0, producer_availability_1.isProducerUnderDailyCapacity)(p, today, records), true);
    });
    (0, node_test_1.it)("under limit → under capacity", () => {
        const p = makeProducer({ initials: "TP", maxMixesPerDay: 4 });
        const records = [makeRecord("r1", "TP", 200), makeRecord("r2", "TP", 200)];
        strict_1.default.equal((0, producer_availability_1.isProducerUnderDailyCapacity)(p, today, records), true);
    });
    (0, node_test_1.it)("at limit → over capacity", () => {
        const p = makeProducer({ initials: "TP", maxMixesPerDay: 2 });
        const records = [makeRecord("r1", "TP", 200), makeRecord("r2", "TP", 200)];
        strict_1.default.equal((0, producer_availability_1.isProducerUnderDailyCapacity)(p, today, records), false);
    });
    (0, node_test_1.it)("excludeRecordId is respected", () => {
        const p = makeProducer({ initials: "TP", maxMixesPerDay: 2 });
        const records = [makeRecord("r1", "TP", 200), makeRecord("r2", "TP", 200)];
        strict_1.default.equal((0, producer_availability_1.isProducerUnderDailyCapacity)(p, today, records, "r2"), true);
    });
});
// ---------------------------------------------------------------------------
// 5. Cost capacity
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("Cost capacity", () => {
    const today = new Date(2026, 8, 10);
    (0, node_test_1.it)("no limit → always under capacity", () => {
        const p = makeProducer({ initials: "TP", maxProducerCostPerDay: null });
        const records = [makeRecord("r1", "TP", 9999)];
        strict_1.default.equal((0, producer_availability_1.isProducerUnderDailyCostCapacity)(p, today, records), true);
    });
    (0, node_test_1.it)("countProducerDailyCost sums payout for covering records", () => {
        const p = makeProducer({ initials: "TP" });
        const records = [makeRecord("r1", "TP", 400), makeRecord("r2", "TP", 600)];
        strict_1.default.equal((0, producer_availability_1.countProducerDailyCost)(p, today, records), 1000);
    });
    (0, node_test_1.it)("under limit → under capacity", () => {
        const p = makeProducer({ initials: "TP", maxProducerCostPerDay: 2000 });
        const records = [makeRecord("r1", "TP", 500)];
        strict_1.default.equal((0, producer_availability_1.isProducerUnderDailyCostCapacity)(p, today, records), true);
    });
    (0, node_test_1.it)("at limit → over capacity", () => {
        const p = makeProducer({ initials: "TP", maxProducerCostPerDay: 1000 });
        const records = [makeRecord("r1", "TP", 500), makeRecord("r2", "TP", 500)];
        strict_1.default.equal((0, producer_availability_1.isProducerUnderDailyCostCapacity)(p, today, records), false);
    });
});
// ---------------------------------------------------------------------------
// 6. isProducerAtDailyCapacity — combined
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("isProducerAtDailyCapacity", () => {
    const today = new Date(2026, 8, 10);
    (0, node_test_1.it)("returns false when no limits configured", () => {
        const p = makeProducer({ initials: "TP", maxMixesPerDay: null, maxProducerCostPerDay: null });
        const records = [makeRecord("r1", "TP", 999)];
        strict_1.default.equal((0, producer_availability_1.isProducerAtDailyCapacity)(p, today, records), false);
    });
    (0, node_test_1.it)("returns true when mix count limit reached", () => {
        const p = makeProducer({ initials: "TP", maxMixesPerDay: 1, maxProducerCostPerDay: null });
        const records = [makeRecord("r1", "TP", 100)];
        strict_1.default.equal((0, producer_availability_1.isProducerAtDailyCapacity)(p, today, records), true);
    });
    (0, node_test_1.it)("returns true when cost limit reached", () => {
        const p = makeProducer({ initials: "TP", maxMixesPerDay: null, maxProducerCostPerDay: 500 });
        const records = [makeRecord("r1", "TP", 500)];
        strict_1.default.equal((0, producer_availability_1.isProducerAtDailyCapacity)(p, today, records), true);
    });
    (0, node_test_1.it)("returns true when cost reached before mix count limit", () => {
        const p = makeProducer({ initials: "TP", maxMixesPerDay: 6, maxProducerCostPerDay: 1000 });
        // 2 mixes but cost already $1000
        const records = [makeRecord("r1", "TP", 500), makeRecord("r2", "TP", 500)];
        strict_1.default.equal((0, producer_availability_1.isProducerAtDailyCapacity)(p, today, records), true);
    });
    (0, node_test_1.it)("returns true when mix count reached before cost limit", () => {
        const p = makeProducer({ initials: "TP", maxMixesPerDay: 2, maxProducerCostPerDay: 10000 });
        // 2 mixes = at mix limit, cost only $200
        const records = [makeRecord("r1", "TP", 100), makeRecord("r2", "TP", 100)];
        strict_1.default.equal((0, producer_availability_1.isProducerAtDailyCapacity)(p, today, records), true);
    });
    (0, node_test_1.it)("returns false when both limits set but neither reached", () => {
        const p = makeProducer({ initials: "TP", maxMixesPerDay: 4, maxProducerCostPerDay: 2000 });
        const records = [makeRecord("r1", "TP", 400)];
        strict_1.default.equal((0, producer_availability_1.isProducerAtDailyCapacity)(p, today, records), false);
    });
});
