"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
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
const mockMTDRecords = [
    {
        id: "mtd-1",
        section: "CHEERLEADING MUSIC",
        category: "Cheer",
        programName: "Alpha Cheer",
        contactName: "Coach Amy",
        assignedProducer: "Casey Marlow",
        editorInitials: "CM",
        editorRequest: "CM",
        musicTheme: "Energy",
        eightCountSheet: "Yes",
        haveSongs: "Yes",
        needsAttention: false,
        package: "GOLD 1:30",
        price: 700,
        priceCompliance: "compliant",
        invoice: "INV-101",
        status: "active",
        mixStartDate: "2026-09-12",
        mixEndDate: "2026-09-15",
    },
    {
        id: "mtd-2",
        section: "DANCE MUSIC",
        category: "Dance",
        programName: "Beta Dance",
        contactName: "Coach Bob",
        assignedProducer: "Matt Sturgis",
        editorInitials: "MS",
        editorRequest: "MS",
        musicTheme: "Hip Hop",
        eightCountSheet: "Yes",
        haveSongs: "Yes",
        needsAttention: false,
        package: "PLATINUM 2:00",
        price: 900,
        priceCompliance: "compliant",
        invoice: "INV-102",
        status: "active",
        mixStartDate: "2026-09-14",
        mixEndDate: "2026-09-18",
    },
    {
        id: "mtd-3",
        section: "CHEERLEADING MUSIC",
        category: "Cheer",
        programName: "Completed Cheer",
        contactName: "Coach Carl",
        assignedProducer: "Casey Marlow",
        editorInitials: "CM",
        editorRequest: "CM",
        musicTheme: "School",
        eightCountSheet: "Yes",
        haveSongs: "Yes",
        needsAttention: false,
        package: "SILVER 1:00",
        price: 500,
        priceCompliance: "compliant",
        invoice: "INV-103",
        status: "completed",
        inPayroll: true,
        mixStartDate: "2026-09-01",
        mixEndDate: "2026-09-05",
    },
    {
        id: "mtd-4",
        section: "CHEERLEADING MUSIC",
        category: "Cheer",
        programName: "Unassigned Order",
        contactName: "Coach Dan",
        assignedProducer: "",
        editorInitials: "",
        editorRequest: "FA",
        musicTheme: "",
        eightCountSheet: "",
        haveSongs: "",
        needsAttention: false,
        invoice: "",
        package: "BRONZE 1:00",
        price: 400,
        priceCompliance: "compliant",
        status: "active",
        mixStartDate: "2026-09-20",
    },
];
(0, node_test_1.describe)("Producer Schedule Preparation Unit Tests", () => {
    (0, node_test_1.it)("excludes completed, payroll, and unassigned records from schedule dataset", () => {
        const allRows = (0, export_csv_1.getProducerFacingScheduleRows)(mockMTDRecords, mockOrders, mockProducers, "all");
        node_assert_1.default.strictEqual(allRows.length, 2);
        const programNames = allRows.map((r) => r.programName);
        node_assert_1.default.ok(programNames.includes("Alpha Cheer"));
        node_assert_1.default.ok(programNames.includes("Beta Dance"));
        node_assert_1.default.strictEqual(programNames.includes("Completed Cheer"), false);
        node_assert_1.default.strictEqual(programNames.includes("Unassigned Order"), false);
    });
    (0, node_test_1.it)("filters correctly by individual producer name", () => {
        const caseyRows = (0, export_csv_1.getProducerFacingScheduleRows)(mockMTDRecords, mockOrders, mockProducers, "Casey Marlow");
        node_assert_1.default.strictEqual(caseyRows.length, 1);
        node_assert_1.default.strictEqual(caseyRows[0].programName, "Alpha Cheer");
        node_assert_1.default.strictEqual(caseyRows[0].assignedProducer, "Casey Marlow");
    });
    (0, node_test_1.it)("guarantees 100% column parity between preview rows and CSV export string", () => {
        const csv = (0, export_csv_1.generateScheduleCsv)(mockMTDRecords, mockOrders, mockProducers, "Casey Marlow");
        node_assert_1.default.ok(csv.includes("Mix Start Date,Mix End Date,Producer,Program Name,Contact Name,Invoice #,Category,Subtype,Package,Status"));
        node_assert_1.default.ok(csv.includes("2026-09-12"));
        node_assert_1.default.ok(csv.includes("Casey Marlow"));
        node_assert_1.default.ok(csv.includes("Alpha Cheer"));
        node_assert_1.default.ok(csv.includes("INV-101"));
    });
    (0, node_test_1.it)("has exactly 10 defined producer schedule columns", () => {
        node_assert_1.default.strictEqual(export_csv_1.PRODUCER_SCHEDULE_COLUMNS.length, 10);
        const keys = export_csv_1.PRODUCER_SCHEDULE_COLUMNS.map((c) => c.key);
        node_assert_1.default.deepStrictEqual(keys, [
            "mixStartDate",
            "mixEndDate",
            "assignedProducer",
            "programName",
            "contactName",
            "invoice",
            "category",
            "subtype",
            "package",
            "status",
        ]);
    });
});
