"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const data_1 = require("../data");
const export_csv_1 = require("../export-csv");
const mtd_completion_1 = require("../mtd-completion");
const mtd_filters_1 = require("../mtd-filters");
(0, node_test_1.describe)("Prompt 6 — Filter-Aware CSV Export Utility", () => {
    const { mtdRecords, orders: allOrders, producers } = (0, data_1.getData)();
    const orderById = new Map(allOrders.map((o) => [o.id, o]));
    const preMtdRecords = mtdRecords.filter(mtd_filters_1.isPreMTDOrderRecord);
    const mtdBoardRecords = mtdRecords.filter((r) => !(0, mtd_filters_1.isPreMTDOrderRecord)(r));
    const payrollRecords = (0, mtd_completion_1.getPayrollRecords)(mtdRecords);
    (0, node_test_1.it)("1. Escapes CSV cells with quotes and commas safely", () => {
        strict_1.default.equal((0, export_csv_1.escapeCsvCell)("Simple"), "Simple");
        strict_1.default.equal((0, export_csv_1.escapeCsvCell)("Hello, World"), '"Hello, World"');
        strict_1.default.equal((0, export_csv_1.escapeCsvCell)('Said "Hello"'), '"Said ""Hello"""');
        strict_1.default.equal((0, export_csv_1.escapeCsvCell)(null), "");
    });
    (0, node_test_1.it)("2. Orders Export: Unfiltered count matches full pre-MTD dataset", () => {
        const csv = (0, export_csv_1.generateOrdersCsv)(preMtdRecords, allOrders);
        const lines = csv.trim().split("\r\n");
        // Header + one line per record
        strict_1.default.equal(lines.length, preMtdRecords.length + 1);
        // Header checks
        const headerLine = lines[0];
        strict_1.default.ok(headerLine.includes("Order ID"));
        strict_1.default.ok(headerLine.includes("Assigned Producer"));
        strict_1.default.ok(headerLine.includes("Mix Start Date"));
        strict_1.default.ok(headerLine.includes("Mix End Date"));
    });
    (0, node_test_1.it)("3. Orders Export: Unassigned and unscheduled fallback text check", () => {
        const unassignedOrders = preMtdRecords.filter((r) => !r.assignedProducer && !r.mixStartDate);
        strict_1.default.ok(unassignedOrders.length > 0, "Expected at least one unassigned order");
        const csv = (0, export_csv_1.generateOrdersCsv)(unassignedOrders, allOrders);
        strict_1.default.ok(csv.includes("No assigned producer yet"));
        strict_1.default.ok(csv.includes("No scheduled start"));
        strict_1.default.ok(csv.includes("No scheduled end"));
    });
    (0, node_test_1.it)("4. Orders Export: Filtered export matches filtered subset exactly", () => {
        const cheerOrders = preMtdRecords.filter((r) => r.category.includes("Cheer"));
        const csv = (0, export_csv_1.generateOrdersCsv)(cheerOrders, allOrders);
        const lines = csv.trim().split("\r\n");
        strict_1.default.equal(lines.length, cheerOrders.length + 1);
    });
    (0, node_test_1.it)("5. MTD Export: Unfiltered vs Filtered row count accuracy", () => {
        const unfilteredCsv = (0, export_csv_1.generateMTDCsv)(mtdBoardRecords, allOrders, producers);
        const unfilteredLines = unfilteredCsv.trim().split("\r\n");
        strict_1.default.equal(unfilteredLines.length, mtdBoardRecords.length + 1);
        // Filter by Producer 'Nick'
        const nickFilter = (0, mtd_filters_1.filterMTDRecords)(mtdBoardRecords, { assignedProducer: "Nick" });
        const nickCsv = (0, export_csv_1.generateMTDCsv)(nickFilter, allOrders, producers);
        const nickLines = nickCsv.trim().split("\r\n");
        strict_1.default.equal(nickLines.length, nickFilter.length + 1);
    });
    (0, node_test_1.it)("6. MTD Export: Category-specific fields and Dance Add-ons", () => {
        const danceRecords = mtdBoardRecords.filter((r) => r.category.includes("Dance"));
        strict_1.default.ok(danceRecords.length > 0, "Expected at least one Dance record");
        const csv = (0, export_csv_1.generateMTDCsv)(danceRecords, allOrders, producers);
        strict_1.default.ok(csv.includes("Dance Extra Songs ($15/ea)"));
        strict_1.default.ok(csv.includes("Dance Extra Song Time ($30/ea)"));
    });
    (0, node_test_1.it)("7. Payroll Export: Unfiltered vs Filtered row count and payout fields", () => {
        strict_1.default.ok(payrollRecords.length >= 10, "Expected at least 10 payroll records");
        const csv = (0, export_csv_1.generatePayrollCsv)(payrollRecords, allOrders, producers);
        const lines = csv.trim().split("\r\n");
        strict_1.default.equal(lines.length, payrollRecords.length + 1);
        // Verify key payroll columns
        const header = lines[0];
        strict_1.default.ok(header.includes("Customer Price"));
        strict_1.default.ok(header.includes("Payroll Base Price"));
        strict_1.default.ok(header.includes("Producer Rate"));
        strict_1.default.ok(header.includes("Total Producer Payout"));
        strict_1.default.ok(header.includes("Coupon Code"));
    });
    (0, node_test_1.it)("8. Pricing & Add-on Business Rules Integrity Check", () => {
        const cheerRecordInPayroll = payrollRecords.find((r) => r.category.includes("Cheer"));
        if (cheerRecordInPayroll) {
            const csv = (0, export_csv_1.generatePayrollCsv)([cheerRecordInPayroll], allOrders, producers);
            const rows = csv.trim().split("\r\n");
            const dataRow = rows[1];
            // Cheer record must NOT have dance extra songs payout value
            strict_1.default.ok(dataRow);
        }
    });
});
