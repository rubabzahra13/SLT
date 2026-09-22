"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const producer_schedule_calc_1 = require("../producer-schedule-calc");
const producer_availability_1 = require("../producer-availability");
const editor_assignment_1 = require("../editor-assignment");
function makeProducer(overrides) {
    return {
        id: "prod-1",
        name: "Nabiha Shafiq",
        initials: "NS",
        email: "ns@example.com",
        categories: ["Pom", "School Cheer"],
        specialty: "Pom",
        avatar: "",
        mixesThisWeek: 0,
        nextAvailable: "Today",
        status: "available",
        workDays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
        timeOff: [],
        maxMixesPerDay: 2,
        maxProducerCostPerDay: 2000,
        overtimeDays: [],
        ...overrides,
    };
}
function makeRecord(id, assignedProducer, startDate, endDate, editorRequest = "FA", producerPayout = 500) {
    return {
        id,
        section: "Active",
        assignedProducer,
        category: "Pom",
        editorRequest,
        contactName: "Customer",
        editorInitials: assignedProducer || "FA",
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
(0, node_test_1.describe)("SLT Implementation 3: Assign Producer Modal Daily Capacity UI Logic", () => {
    (0, node_test_1.it)("Case A: One mix/day limit -> unavailable for overlapping dates", () => {
        const p1 = makeProducer({ initials: "P1", maxMixesPerDay: 1 });
        const existing = makeRecord("existing", "P1", "2026-09-21", "2026-09-24");
        const candidate = makeRecord("candidate", null, "2026-09-21", "2026-09-24");
        const avail = (0, producer_availability_1.isProducerAvailableForMixWindow)(p1, "2026-09-21", "2026-09-24", [existing]);
        strict_1.default.equal(avail, false);
        const reason = (0, producer_availability_1.getProducerUnavailabilityReason)(p1, candidate, [existing]);
        strict_1.default.equal(reason, "At daily mix limit");
    });
    (0, node_test_1.it)("Case B: Two mixes/day limit -> one existing mix -> remains eligible", () => {
        const p2 = makeProducer({ initials: "NS", maxMixesPerDay: 2 });
        const existing = makeRecord("existing", "NS", "2026-09-21", "2026-09-24");
        const avail = (0, producer_availability_1.isProducerAvailableForMixWindow)(p2, "2026-09-21", "2026-09-24", [existing]);
        strict_1.default.equal(avail, true);
    });
    (0, node_test_1.it)("Case C: Partial overlap exceeding capacity -> rejected for mix dates", () => {
        const p2 = makeProducer({ initials: "NS", maxMixesPerDay: 2 });
        const recA = makeRecord("recA", "NS", "2026-09-21", "2026-09-24");
        const recB = makeRecord("recB", "NS", "2026-09-23", "2026-09-27");
        const candidate = makeRecord("candidate", null, "2026-09-21", "2026-09-27");
        const avail = (0, producer_availability_1.isProducerAvailableForMixWindow)(p2, "2026-09-21", "2026-09-27", [recA, recB]);
        strict_1.default.equal(avail, false);
    });
    (0, node_test_1.it)("Case D: Cost limit hit -> unavailable with payout limit reason", () => {
        const pCost = makeProducer({ initials: "NS", maxMixesPerDay: 4, maxProducerCostPerDay: 2000 });
        const rec1 = makeRecord("rec1", "NS", "2026-09-23", "2026-09-23", "FA", 1800);
        const candidate = makeRecord("candidate", null, "2026-09-23", "2026-09-23", "FA", 300);
        const avail = (0, producer_availability_1.isProducerAvailableForMixWindow)(pCost, "2026-09-23", "2026-09-23", [rec1], candidate.id, 300);
        strict_1.default.equal(avail, false);
        const reason = (0, producer_availability_1.getProducerUnavailabilityReason)(pCost, candidate, [rec1]);
        strict_1.default.equal(reason, "At daily payout limit");
    });
    (0, node_test_1.it)("Case E: Future availability -> Shows Available from Sep 25", () => {
        const p = makeProducer({ initials: "NS", maxMixesPerDay: 2 });
        const recA = makeRecord("recA", "NS", "2026-09-21", "2026-09-24");
        const recB = makeRecord("recB", "NS", "2026-09-23", "2026-09-24");
        const candidate = makeRecord("candidate", null, "2026-09-23", "2026-09-25");
        const opening = (0, producer_schedule_calc_1.calculateProducerNextOpening)(p, [recA, recB], [], "2026-09-21", candidate);
        strict_1.default.equal(opening.nextAvailable, "Sep 25, 2026");
    });
    (0, node_test_1.it)("Case F: Requested editor NS preselected by default even when future date", () => {
        const nsProducer = makeProducer({ initials: "NS", name: "Nabiha Shafiq" });
        const cmProducer = makeProducer({ initials: "CM", name: "Casey Marshall" });
        const recA = makeRecord("recA", "NS", "2026-09-21", "2026-09-24");
        const recB = makeRecord("recB", "NS", "2026-09-23", "2026-09-24");
        const candidate = makeRecord("cand", null, "2026-09-23", "2026-09-25", "NS");
        const pick = (0, editor_assignment_1.pickDefaultEditor)(candidate, [cmProducer, nsProducer], [recA, recB], []);
        // NS requested -> NS preselected!
        strict_1.default.equal(pick.editor, "NS");
        strict_1.default.equal(pick.requestedEditor, "NS");
    });
    (0, node_test_1.it)("Case G: First Available (FA) preselects top available producer", () => {
        const cmProducer = makeProducer({ initials: "CM", name: "Casey Marshall" });
        const nsProducer = makeProducer({ initials: "NS", name: "Nabiha Shafiq" });
        const candidate = makeRecord("cand", null, "2026-09-21", "2026-09-24", "FA");
        const pick = (0, editor_assignment_1.pickDefaultEditor)(candidate, [cmProducer, nsProducer], [], []);
        strict_1.default.equal(pick.editor, "CM");
    });
});
