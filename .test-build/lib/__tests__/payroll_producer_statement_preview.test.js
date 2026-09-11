"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const export_csv_1 = require("../export-csv");
const mockProducers = [
    {
        id: "p1",
        name: "Casey Marlow",
        initials: "CM",
        email: "casey@example.com",
        specialty: "Cheer",
        avatar: "",
        color: "#ff6b6b",
        mixesThisWeek: 2,
        nextAvailable: "Tomorrow",
        status: "available",
        workDays: ["mon", "tue"],
        maxMixesPerDay: 5,
        overtimeDays: [],
        categories: ["school-all-star-cheer"],
    },
    {
        id: "p2",
        name: "Matt",
        initials: "M",
        email: "matt@example.com",
        specialty: "Dance",
        avatar: "",
        color: "#4ecdc4",
        mixesThisWeek: 1,
        nextAvailable: "Today",
        status: "available",
        workDays: ["wed", "thu"],
        maxMixesPerDay: 5,
        overtimeDays: [],
        categories: ["school-all-star-dance"],
    },
];
const mockOrders = [
    {
        id: "ord-1",
        formType: "school-all-star-cheer",
        contactName: "John Doe",
        programName: "Lions Cheer",
        price: 500,
        finalCustomerPrice: 500,
        finalPayrollPrice: 500,
        status: "completed",
        needsAttention: false,
        createdAt: "2026-09-01T10:00:00Z",
    },
    {
        id: "ord-2",
        formType: "school-all-star-dance",
        contactName: "Jane Smith",
        programName: "Tigers Dance",
        price: 600,
        finalCustomerPrice: 600,
        finalPayrollPrice: 600,
        status: "completed",
        needsAttention: false,
        createdAt: "2026-09-02T10:00:00Z",
    },
];
const mockMtdRecords = [
    {
        id: "mtd-1",
        orderId: "ord-1",
        contactName: "John Doe",
        programName: "Lions Cheer",
        invoice: "INV-1001",
        package: "GOLD 1:30",
        assignedProducer: "Casey Marlow",
        price: 500,
        finalCustomerPrice: 500,
        finalPayrollPrice: 500,
        producerPayout: 400,
        status: "completed",
        completedAt: "2026-09-05T12:00:00Z",
        isRushOrder: "no",
    },
    {
        id: "mtd-2",
        orderId: "ord-2",
        contactName: "Jane Smith",
        programName: "Tigers Dance",
        invoice: "INV-1002",
        package: "POM 2:00",
        assignedProducer: "Matt",
        price: 600,
        finalCustomerPrice: 600,
        finalPayrollPrice: 600,
        producerPayout: 480,
        status: "completed",
        completedAt: "2026-09-06T12:00:00Z",
        danceVoiceover: "25",
        isRushOrder: "no",
    },
];
(0, node_test_1.describe)("Payroll Producer Statement Preview & Single Source of Truth Tests", () => {
    (0, node_test_1.it)("1. getProducerFacingPayrollRows generates exact 16-column schema matching PRODUCER_STATEMENT_COLUMNS", () => {
        const rows = (0, export_csv_1.getProducerFacingPayrollRows)(mockMtdRecords, mockOrders, mockProducers, "Casey Marlow");
        strict_1.default.equal(rows.length, 1);
        const row = rows[0];
        export_csv_1.PRODUCER_STATEMENT_COLUMNS.forEach((col) => {
            strict_1.default.ok(col.key in row, `Expected key ${col.key} to exist in producer statement row`);
        });
        strict_1.default.equal(row.programName, "Lions Cheer");
        strict_1.default.equal(row.totalPayout, "$400");
    });
    (0, node_test_1.it)("2. Parity check: generateProducerFacingPayrollCsv produces exact headers and values as getProducerFacingPayrollRows", () => {
        const rows = (0, export_csv_1.getProducerFacingPayrollRows)(mockMtdRecords, mockOrders, mockProducers, "Matt");
        const csv = (0, export_csv_1.generateProducerFacingPayrollCsv)(mockMtdRecords, mockOrders, mockProducers, "Matt");
        strict_1.default.equal(rows.length, 1);
        const row = rows[0];
        // CSV header row check
        const expectedHeaders = export_csv_1.PRODUCER_STATEMENT_COLUMNS.map((c) => c.label).join(",");
        strict_1.default.ok(csv.startsWith(expectedHeaders), "CSV must start with exact column headers");
        // CSV data row check
        strict_1.default.ok(csv.includes("Tigers Dance"), "CSV must include program name");
        strict_1.default.ok(csv.includes(row.totalPayout), "CSV must include calculated total payout string");
    });
    (0, node_test_1.it)("3. Data privacy: Producer-facing rows do NOT expose SLT gross customer price or take-home revenue", () => {
        const rows = (0, export_csv_1.getProducerFacingPayrollRows)(mockMtdRecords, mockOrders, mockProducers, "Casey Marlow");
        const rowKeys = Object.keys(rows[0]);
        strict_1.default.equal(rowKeys.includes("customerPrice"), false, "Must not include customerPrice");
        strict_1.default.equal(rowKeys.includes("sltTakeHome"), false, "Must not include sltTakeHome");
        strict_1.default.equal(rowKeys.includes("payrollBasePrice"), false, "Must not include payrollBasePrice");
    });
    (0, node_test_1.it)("4. Producer Scoping: Casey Marlow statement contains only Casey Marlow records, never Matt records", () => {
        const caseyRows = (0, export_csv_1.getProducerFacingPayrollRows)(mockMtdRecords, mockOrders, mockProducers, "Casey Marlow");
        strict_1.default.equal(caseyRows.length, 1);
        strict_1.default.equal(caseyRows[0].programName, "Lions Cheer");
        strict_1.default.equal(caseyRows[0].producerName, "Casey Marlow");
        const mattRows = (0, export_csv_1.getProducerFacingPayrollRows)(mockMtdRecords, mockOrders, mockProducers, "Matt");
        strict_1.default.equal(mattRows.length, 1);
        strict_1.default.equal(mattRows[0].programName, "Tigers Dance");
        strict_1.default.equal(mattRows[0].producerName, "Matt");
    });
});
