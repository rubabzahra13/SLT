"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const export_csv_1 = require("../export-csv");
const mockProducers = [
    {
        id: "prod-1",
        name: "Casey Marlow",
        initials: "CM",
        email: "TESTcasey@soundslikethat.com",
        specialty: "Cheer",
        categories: ["Cheer"],
        avatar: "/avatars/cm.png",
        mixesThisWeek: 2,
        nextAvailable: "2026-09-12",
        status: "available",
        workDays: ["mon", "tue", "wed", "thu", "fri"],
        overtimeDays: [],
        timeOff: [],
        maxMixesPerDay: 5,
        maxProducerCostPerDay: 1000,
    },
    {
        id: "prod-2",
        name: "Matt Sturgis",
        initials: "MS",
        email: "TESTmatt@soundslikethat.com",
        specialty: "Dance",
        categories: ["Dance"],
        avatar: "/avatars/ms.png",
        mixesThisWeek: 1,
        nextAvailable: "2026-09-14",
        status: "available",
        workDays: ["mon", "tue", "wed", "thu", "fri"],
        overtimeDays: [],
        timeOff: [],
        maxMixesPerDay: 5,
        maxProducerCostPerDay: 1000,
    },
];
const mockOrders = [];
function createMockRecord(overrides) {
    return {
        id: "mtd-default",
        section: "CHEERLEADING MUSIC",
        category: "Cheer",
        programName: "Default Program",
        contactName: "Coach Default",
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
    };
}
(0, node_test_1.describe)("Producer Schedule Strict Eligibility Rules", () => {
    (0, node_test_1.it)("includes ONLY records that are Ongoing, assigned, and have valid start AND end dates", () => {
        const validOngoingRecord = createMockRecord({
            id: "rec-valid",
            programName: "Valid Ongoing Program",
            assignedProducer: "Casey Marlow",
            recordStatus: "Ongoing",
            status: "active",
            mixStartDate: "2026-09-12",
            mixEndDate: "2026-09-15",
        });
        strict_1.default.equal((0, export_csv_1.isEligibleProducerScheduleRecord)(validOngoingRecord), true);
    });
    (0, node_test_1.it)("excludes records with Waiting for Data / Needs Attention status", () => {
        const waitingForDataRecord = createMockRecord({
            id: "rec-waiting",
            programName: "Waiting Program",
            assignedProducer: "Casey Marlow",
            recordStatus: "Completed",
            needsAttention: true,
            status: "needs_attention",
            mixStartDate: "2026-09-12",
            mixEndDate: "2026-09-15",
        });
        strict_1.default.equal((0, export_csv_1.isEligibleProducerScheduleRecord)(waitingForDataRecord), false);
    });
    (0, node_test_1.it)("excludes records with Completed status or inPayroll flag", () => {
        const completedRecord = createMockRecord({
            id: "rec-completed",
            programName: "Completed Program",
            assignedProducer: "Casey Marlow",
            recordStatus: "Completed",
            status: "completed",
            inPayroll: true,
            mixStartDate: "2026-09-12",
            mixEndDate: "2026-09-15",
        });
        strict_1.default.equal((0, export_csv_1.isEligibleProducerScheduleRecord)(completedRecord), false);
    });
    (0, node_test_1.it)("excludes records with Outsourced status", () => {
        const outsourcedRecord = createMockRecord({
            id: "rec-outsourced",
            section: "OUTSOURCED MIXES",
            programName: "Outsourced Program",
            assignedProducer: "Casey Marlow",
            recordStatus: "Outsourced",
            status: "outsourced",
            mixStartDate: "2026-09-12",
            mixEndDate: "2026-09-15",
        });
        strict_1.default.equal((0, export_csv_1.isEligibleProducerScheduleRecord)(outsourcedRecord), false);
    });
    (0, node_test_1.it)("excludes unassigned records even if dates and status are valid", () => {
        const unassignedRecord = createMockRecord({
            id: "rec-unassigned",
            programName: "Unassigned Program",
            assignedProducer: "",
            recordStatus: "Ongoing",
            status: "active",
            mixStartDate: "2026-09-12",
            mixEndDate: "2026-09-15",
        });
        strict_1.default.equal((0, export_csv_1.isEligibleProducerScheduleRecord)(unassignedRecord), false);
    });
    (0, node_test_1.it)("excludes records missing Mix Start Date or Mix End Date", () => {
        const missingStart = createMockRecord({
            id: "rec-no-start",
            programName: "No Start Program",
            assignedProducer: "Casey Marlow",
            recordStatus: "Ongoing",
            status: "active",
            mixStartDate: "",
            mixEndDate: "2026-09-15",
        });
        const missingEnd = createMockRecord({
            id: "rec-no-end",
            programName: "No End Program",
            assignedProducer: "Casey Marlow",
            recordStatus: "Ongoing",
            status: "active",
            mixStartDate: "2026-09-12",
            mixEndDate: "",
        });
        strict_1.default.equal((0, export_csv_1.isEligibleProducerScheduleRecord)(missingStart), false);
        strict_1.default.equal((0, export_csv_1.isEligibleProducerScheduleRecord)(missingEnd), false);
    });
    (0, node_test_1.it)("displays status as 'Ongoing' for all eligible schedule rows in preview and CSV export", () => {
        const mixedRecords = [
            createMockRecord({
                id: "rec-1",
                programName: "Casey Standard Mix",
                assignedProducer: "Casey Marlow",
                recordStatus: "Ongoing",
                status: "active",
                mixStartDate: "2026-09-12",
                mixEndDate: "2026-09-15",
            }),
            createMockRecord({
                id: "rec-2",
                programName: "Casey Waiting Mix",
                assignedProducer: "Casey Marlow",
                recordStatus: "Completed",
                status: "needs_attention",
                mixStartDate: "2026-09-12",
                mixEndDate: "2026-09-15",
            }),
            createMockRecord({
                id: "rec-3",
                programName: "Matt Standard Mix",
                assignedProducer: "Matt Sturgis",
                recordStatus: "Ongoing",
                status: "active",
                mixStartDate: "2026-09-14",
                mixEndDate: "2026-09-18",
            }),
        ];
        const rowsAll = (0, export_csv_1.getProducerFacingScheduleRows)(mixedRecords, mockOrders, mockProducers, "all");
        strict_1.default.equal(rowsAll.length, 2);
        strict_1.default.equal(rowsAll[0].status, "Ongoing");
        strict_1.default.equal(rowsAll[1].status, "Ongoing");
        const rowsCasey = (0, export_csv_1.getProducerFacingScheduleRows)(mixedRecords, mockOrders, mockProducers, "Casey Marlow");
        strict_1.default.equal(rowsCasey.length, 1);
        strict_1.default.equal(rowsCasey[0].programName, "Casey Standard Mix");
        strict_1.default.equal(rowsCasey[0].status, "Ongoing");
        const csvCasey = (0, export_csv_1.generateScheduleCsv)(mixedRecords, mockOrders, mockProducers, "Casey Marlow");
        strict_1.default.ok(csvCasey.includes("Ongoing"));
        strict_1.default.equal(csvCasey.includes("Needs Attention"), false);
        strict_1.default.equal(csvCasey.includes("Active"), false);
    });
});
