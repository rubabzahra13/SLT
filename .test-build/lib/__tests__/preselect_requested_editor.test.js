"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const editor_assignment_1 = require("../editor-assignment");
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
(0, node_test_1.describe)("Preselect Requested Editor (BUG 3)", () => {
    const cm = createMockTodayProducer("CM", "Casey Marlow");
    const ns = createMockProducer({ initials: "NS", name: "Nabiha Shafiq", maxMixesPerDay: 1 });
    const producers = [cm, ns];
    (0, node_test_1.it)("Default selection prioritizes specific requested editor NS even if NS is booked until a future date", () => {
        // NS is booked on an active mix from Sep 21 to Sep 24
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
                assignedProducer: "NS",
                mixStartDate: "2026-09-21",
                mixEndDate: "2026-09-24",
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
        // New unassigned record with requested editor NS
        const newRecord = {
            id: "rec-new-1",
            orderId: "ord-new-1",
            section: "CHEERLEADING MUSIC",
            editorRequest: "NS",
            musicTheme: "Pop",
            programName: "Varsity Spirit",
            category: "All-Star Cheer",
            package: "Platinum",
            assignedProducer: null,
            mixStartDate: "2026-09-21",
            mixEndDate: "2026-09-28",
            status: "active",
            recordStatus: "Ongoing",
            eightCountSheet: "CS REC",
            haveSongs: "SONGS REC",
            needsAttention: false,
            price: 1000,
            priceCompliance: "compliant",
            invoice: "INV-2",
            editorInitials: "Coach",
            contactName: "Coach",
        };
        const pick = (0, editor_assignment_1.pickDefaultEditor)(newRecord, producers, activeMixes, []);
        strict_1.default.equal(pick.editor, "NS", "pickDefaultEditor must select requested editor NS by default");
        strict_1.default.equal(pick.reason, "requested_busy");
    });
    (0, node_test_1.it)("Default selection uses first available editor (CM) when editorRequest is FA", () => {
        const faRecord = {
            id: "rec-fa-1",
            orderId: "ord-fa-1",
            section: "CHEERLEADING MUSIC",
            editorRequest: "FA",
            musicTheme: "Pop",
            programName: "Varsity Spirit",
            category: "All-Star Cheer",
            package: "Platinum",
            assignedProducer: null,
            mixStartDate: "2026-09-21",
            mixEndDate: "2026-09-28",
            status: "active",
            recordStatus: "Ongoing",
            eightCountSheet: "CS REC",
            haveSongs: "SONGS REC",
            needsAttention: false,
            price: 1000,
            priceCompliance: "compliant",
            invoice: "INV-3",
            editorInitials: "Coach",
            contactName: "Coach",
        };
        const pick = (0, editor_assignment_1.pickDefaultEditor)(faRecord, producers, [], []);
        strict_1.default.equal(pick.editor, "CM", "pickDefaultEditor must return first available editor CM for FA request");
        strict_1.default.equal(pick.reason, "first_available");
    });
});
