"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const data_1 = require("../data");
const dates_1 = require("../dates");
const export_csv_1 = require("../export-csv");
(0, node_test_1.describe)("Prompt 9 — Producer Schedule Filtering & Individual Download Tests", () => {
    const { mtdRecords, orders: allOrders, producers } = (0, data_1.getData)();
    (0, node_test_1.it)("1. Generating schedule CSV for 'All Editors' returns records across assigned producers", () => {
        const csv = (0, export_csv_1.generateScheduleCsv)(mtdRecords, allOrders, producers, "all");
        strict_1.default.ok(csv.length > 0, "Schedule CSV should be non-empty");
        const lines = csv.trim().split("\n");
        strict_1.default.ok(lines.length > 1, "Should contain header + rows");
        strict_1.default.ok(lines[0].includes("Mix Start Date"));
        strict_1.default.ok(lines[0].includes("Producer"));
    });
    (0, node_test_1.it)("2. Generating schedule CSV for Producer 1 (Nick) contains only Nick's mixes", () => {
        const targetProducer = "Nick";
        const csv = (0, export_csv_1.generateScheduleCsv)(mtdRecords, allOrders, producers, targetProducer);
        strict_1.default.ok(csv.length > 0);
        const lines = csv.trim().split("\n");
        const header = lines[0];
        const rowLines = lines.slice(1);
        strict_1.default.ok(header.includes("Mix Start Date"));
        rowLines.forEach((row) => {
            // Producer column is column index 2
            strict_1.default.ok(row.includes("Nick"), `Row must belong to Nick: ${row}`);
            strict_1.default.strictEqual(row.includes("Andrea"), false, `Row must not contain Andrea's schedule`);
        });
    });
    (0, node_test_1.it)("3. Generating schedule CSV for Producer 2 (Andrea) contains only Andrea's mixes", () => {
        const targetProducer = "Andrea";
        const csv = (0, export_csv_1.generateScheduleCsv)(mtdRecords, allOrders, producers, targetProducer);
        strict_1.default.ok(csv.length > 0);
        const lines = csv.trim().split("\n");
        const rowLines = lines.slice(1);
        rowLines.forEach((row) => {
            strict_1.default.ok(row.includes("Andrea"), `Row must belong to Andrea: ${row}`);
            strict_1.default.strictEqual(row.includes("Nick"), false, `Row must not contain Nick's schedule`);
        });
    });
    (0, node_test_1.it)("4. Multi-day mix range overlap filtering correctly includes overlapping mixes", () => {
        // Test date window spanning Sept 10 to Sept 20, 2026
        const filterPeriod = { start: "2026-09-10", end: "2026-09-20" };
        const csv = (0, export_csv_1.generateScheduleCsv)(mtdRecords, allOrders, producers, "all", filterPeriod);
        const lines = csv.trim().split("\n");
        const rowLines = lines.slice(1);
        rowLines.forEach((row) => {
            // Verify dates in row overlap filterPeriod
            const columns = row.split(",");
            const startDate = columns[0].replace(/"/g, "");
            const endDate = columns[1].replace(/"/g, "");
            const overlaps = (0, dates_1.doDateRangesOverlap)({ start: startDate, end: endDate }, filterPeriod);
            strict_1.default.ok(overlaps, `Mix range ${startDate} - ${endDate} must overlap filter period 2026-09-10 - 2026-09-20`);
        });
    });
});
