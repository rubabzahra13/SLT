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
(0, node_test_1.describe)("Prompt 7 — Payroll-Specific Export: Filters + Admin vs Producer-Safe Output", () => {
    const { mtdRecords, orders: allOrders, producers } = (0, data_1.getData)();
    const payrollRecords = (0, mtd_completion_1.getPayrollRecords)(mtdRecords);
    (0, node_test_1.it)("1. Pay Period Presets (Last 2 Weeks, Last 1 Month, Last 6 Months, Last 1 Year) filter accuracy", () => {
        strict_1.default.ok(payrollRecords.length >= 10, "Expected at least 10 payroll records");
        const twoWeeksFilter = { type: "last2Weeks" };
        const monthFilter = { type: "last1Month" };
        const sixMonthsFilter = { type: "last6Months" };
        const oneYearFilter = { type: "last1Year" };
        const records2Weeks = (0, mtd_filters_1.filterMTDRecords)(payrollRecords, { dateFilter: twoWeeksFilter });
        const records1Month = (0, mtd_filters_1.filterMTDRecords)(payrollRecords, { dateFilter: monthFilter });
        const records6Months = (0, mtd_filters_1.filterMTDRecords)(payrollRecords, { dateFilter: sixMonthsFilter });
        const records1Year = (0, mtd_filters_1.filterMTDRecords)(payrollRecords, { dateFilter: oneYearFilter });
        strict_1.default.ok(records2Weeks.length > 0, "Expected records in last 2 weeks");
        strict_1.default.ok(records1Month.length >= records2Weeks.length, "Last 1 Month should contain at least as many as Last 2 Weeks");
        strict_1.default.ok(records6Months.length >= records1Month.length, "Last 6 Months should contain at least as many as Last 1 Month");
        strict_1.default.ok(records1Year.length >= records6Months.length, "Last 1 Year should contain at least as many as Last 6 Months");
    });
    (0, node_test_1.it)("2. Composed Filtering: Producer filter + Pay Period preset", () => {
        const nickRecords = (0, mtd_filters_1.filterMTDRecords)(payrollRecords, {
            assignedProducer: "Nick",
            dateFilter: { type: "last6Months" },
        });
        for (const rec of nickRecords) {
            strict_1.default.equal(rec.assignedProducer, "Nick");
        }
    });
    (0, node_test_1.it)("3. Admin Export contains full internal columns without SLT take-home", () => {
        const csv = (0, export_csv_1.generatePayrollCsv)(payrollRecords, allOrders, producers);
        const lines = csv.trim().split("\r\n");
        const header = lines[0];
        strict_1.default.ok(header.includes("Record ID"));
        strict_1.default.ok(header.includes("Customer Price"));
        strict_1.default.ok(header.includes("Payroll Base Price"));
        strict_1.default.ok(header.includes("Producer Rate"));
        strict_1.default.ok(header.includes("Total Producer Payout"));
        // Verify SLT take-home / internal margin is NEVER present anywhere in file
        strict_1.default.equal(header.includes("SLT Take Home"), false);
        strict_1.default.equal(header.includes("SLT Portion"), false);
        strict_1.default.equal(header.includes("SLT Margin"), false);
    });
    (0, node_test_1.it)("4. Producer-Facing Export is a strictly narrower, producer-safe data structure", () => {
        const targetProducer = "Nick";
        const nickRecords = (0, mtd_filters_1.filterMTDRecords)(payrollRecords, { assignedProducer: targetProducer });
        const adminCsv = (0, export_csv_1.generatePayrollCsv)(payrollRecords, allOrders, producers);
        const producerCsv = (0, export_csv_1.generateProducerFacingPayrollCsv)(payrollRecords, allOrders, producers, targetProducer);
        const adminHeaders = adminCsv.trim().split("\r\n")[0].split(",");
        const producerHeaders = producerCsv.trim().split("\r\n")[0].split(",");
        // 1. Must be a verifiably narrower header set
        strict_1.default.ok(producerHeaders.length < adminHeaders.length, `Producer header count (${producerHeaders.length}) must be strictly less than admin (${adminHeaders.length})`);
        // 2. Must contain producer-facing payout fields
        strict_1.default.ok(producerCsv.includes("My Compensation Rate"));
        strict_1.default.ok(producerCsv.includes("My Total Payout"));
        // 3. MUST NEVER CONTAIN Customer PII or SLT internal numbers
        strict_1.default.equal(producerCsv.includes("Customer Price"), false);
        strict_1.default.equal(producerCsv.includes("Coach Email"), false);
        strict_1.default.equal(producerCsv.includes("Billing Person"), false);
        strict_1.default.equal(producerCsv.includes("Gym Billing Address"), false);
        strict_1.default.equal(producerCsv.includes("SLT Portion"), false);
        // 4. Must only include Nick's records
        const producerLines = producerCsv.trim().split("\r\n");
        // Header + Nick's records
        strict_1.default.equal(producerLines.length, nickRecords.length + 1);
    });
    (0, node_test_1.it)("5. Rush Fee & Voiceover producer compensation rates preservation", () => {
        const producerName = producers[0]?.name || "Nick";
        const producerCsv = (0, export_csv_1.generateProducerFacingPayrollCsv)(payrollRecords, allOrders, producers, producerName);
        strict_1.default.ok(producerCsv.includes("Rush Fee Compensation"));
        strict_1.default.ok(producerCsv.includes("Voiceover Compensation"));
    });
});
