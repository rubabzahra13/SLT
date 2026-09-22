"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const editor_assignment_1 = require("../editor-assignment");
const producer_schedule_calc_1 = require("../producer-schedule-calc");
function createMockProducer(overrides = {}) {
    return {
        id: "prod-ns",
        name: "Nabiha Shafiq",
        initials: "NS",
        email: "ns@example.com",
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
        maxMixesPerDay: 1,
        maxProducerCostPerDay: 5000,
        notes: "",
        ...overrides,
    };
}
function createMockTodayProducer(initials, name) {
    return createMockProducer({
        id: `prod-${initials.toLowerCase()}`,
        name,
        initials,
        maxMixesPerDay: 5,
    });
}
(0, node_test_1.describe)("Assign Producer Modal Date Grouping & Availability", () => {
    const today = new Date("2026-09-21T12:00:00Z"); // Monday Sep 21, 2026
    (0, node_test_1.it)("Producer booked until Sep 22 is NOT available today and calculates next opening on Sep 23, 2026", () => {
        const nsProducer = createMockProducer({
            initials: "NS",
            name: "Nabiha Shafiq",
            maxMixesPerDay: 1,
        });
        const activeMixes = [
            {
                id: "rec-ns-1",
                orderId: "ord-ns-1",
                section: "CHEERLEADING MUSIC",
                editorRequest: "NS",
                musicTheme: "Pop",
                programName: "Cheer Athletics",
                category: "All-Star Cheer",
                package: "Platinum",
                assignedProducer: "Nabiha Shafiq",
                mixStartDate: "2026-09-21",
                mixEndDate: "2026-09-22",
                status: "active",
                recordStatus: "Ongoing",
                eightCountSheet: "CS REC",
                haveSongs: "SONGS REC",
                needsAttention: false,
                price: 1000,
                priceCompliance: "compliant",
                invoice: "INV-1",
                editorInitials: "NS",
                contactName: "Coach",
            },
        ];
        // On Sep 21, 2026: NS is covered by active mix
        const availableToday = (0, producer_schedule_calc_1.isProducerAvailableOnDate)(nsProducer, today, activeMixes, []);
        strict_1.default.equal(availableToday, false, "NS must NOT be available today when max capacity is reached");
        // Next opening for NS starting from Sep 21 must be Sep 23, 2026
        const calc = (0, producer_schedule_calc_1.calculateProducerNextOpening)(nsProducer, activeMixes, [], today);
        strict_1.default.equal(calc.nextAvailable, "Sep 23, 2026");
    });
    (0, node_test_1.it)("getSuggestedEditors calculates nextAvailableDate correctly for today vs future available producers", () => {
        const cm = createMockTodayProducer("CM", "Casey Marlow");
        const ms = createMockTodayProducer("MS", "Mason Scott");
        const mm = createMockTodayProducer("MM", "Morgan Miller");
        const r = createMockTodayProducer("R", "Riley Reed");
        const ns = createMockProducer({ initials: "NS", name: "Nabiha Shafiq", maxMixesPerDay: 1 });
        const producers = [cm, ms, mm, r, ns];
        const activeMixes = [
            {
                id: "rec-ns-1",
                orderId: "ord-ns-1",
                section: "CHEERLEADING MUSIC",
                editorRequest: "NS",
                musicTheme: "Pop",
                programName: "Cheer Athletics",
                category: "All-Star Cheer",
                package: "Platinum",
                assignedProducer: "Nabiha Shafiq",
                mixStartDate: "2026-09-21",
                mixEndDate: "2026-09-22",
                status: "active",
                recordStatus: "Ongoing",
                eightCountSheet: "CS REC",
                haveSongs: "SONGS REC",
                needsAttention: false,
                price: 1000,
                priceCompliance: "compliant",
                invoice: "INV-1",
                editorInitials: "NS",
                contactName: "Coach",
            },
        ];
        const suggestions = (0, editor_assignment_1.getSuggestedEditors)(activeMixes, producers, [], "All-Star Cheer", undefined, undefined, today);
        const cmSug = suggestions.find((s) => s.name === "CM");
        const nsSug = suggestions.find((s) => s.name === "NS");
        strict_1.default.ok(cmSug);
        strict_1.default.ok(nsSug);
        strict_1.default.equal(cmSug.nextAvailableDate.toISOString().slice(0, 10), "2026-09-21");
        strict_1.default.equal(nsSug.nextAvailableDate.toISOString().slice(0, 10), "2026-09-23");
    });
    (0, node_test_1.it)("Producer booked through Sep 23 calculates next opening on September 24, 2026", () => {
        const nsProducer = createMockProducer({
            initials: "NS",
            name: "Nabiha Shafiq",
            maxMixesPerDay: 1,
        });
        const activeMixes = [
            {
                id: "rec-ns-1",
                orderId: "ord-ns-1",
                section: "CHEERLEADING MUSIC",
                editorRequest: "NS",
                musicTheme: "Pop",
                programName: "Cheer Athletics",
                category: "All-Star Cheer",
                package: "Platinum",
                assignedProducer: "Nabiha Shafiq",
                mixStartDate: "2026-09-21",
                mixEndDate: "2026-09-23",
                status: "active",
                recordStatus: "Ongoing",
                eightCountSheet: "CS REC",
                haveSongs: "SONGS REC",
                needsAttention: false,
                price: 1000,
                priceCompliance: "compliant",
                invoice: "INV-1",
                editorInitials: "NS",
                contactName: "Coach",
            },
        ];
        const calc = (0, producer_schedule_calc_1.calculateProducerNextOpening)(nsProducer, activeMixes, [], today);
        strict_1.default.equal(calc.nextAvailable, "Sep 24, 2026");
        strict_1.default.equal(calc.nextAvailableDate.toISOString().slice(0, 10), "2026-09-24");
    });
});
