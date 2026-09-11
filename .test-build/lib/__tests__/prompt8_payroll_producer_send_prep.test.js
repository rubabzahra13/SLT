"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const data_1 = require("../data");
const date_filters_1 = require("../date-filters");
const dates_1 = require("../dates");
const export_csv_1 = require("../export-csv");
const mtd_completion_1 = require("../mtd-completion");
const editor_assignment_1 = require("../editor-assignment");
(0, node_test_1.describe)("Prompt 8 — Payroll Producer Send-Preparation Workflow Tests", () => {
    const { mtdRecords, orders: allOrders, producers } = (0, data_1.getData)();
    const payrollRecords = (0, mtd_completion_1.getPayrollRecords)(mtdRecords);
    (0, node_test_1.it)("1. Default Send-Prep state targeting All Editors and Last 2 Weeks resolves bounds", () => {
        const bounds = (0, date_filters_1.calculateDateBounds)("last2Weeks");
        strict_1.default.ok(bounds.start !== null);
        strict_1.default.ok(bounds.end !== null);
        const filterPeriod = {
            start: (0, dates_1.toCanonicalIsoDate)(bounds.start),
            end: (0, dates_1.toCanonicalIsoDate)(bounds.end),
        };
        strict_1.default.ok(filterPeriod.start.length > 0);
        strict_1.default.ok(filterPeriod.end.length > 0);
    });
    (0, node_test_1.it)("2. Send to All generates separate, strictly scoped files per producer with records in period", () => {
        const bounds = (0, date_filters_1.calculateDateBounds)("last1Year");
        const filterPeriod = {
            start: (0, dates_1.toCanonicalIsoDate)(bounds.start),
            end: (0, dates_1.toCanonicalIsoDate)(bounds.end),
        };
        const dateMatching = payrollRecords.filter((rec) => {
            const recStart = rec.completedAt || rec.mixStartDate || "";
            const recEnd = rec.completedAt || rec.mixEndDate || rec.mixStartDate || "";
            return (0, dates_1.doDateRangesOverlap)({ start: recStart, end: recEnd }, filterPeriod);
        });
        strict_1.default.ok(dateMatching.length > 0, "Should match completed records within the 1 year span");
        const distinctProducers = Array.from(new Set(dateMatching
            .map((r) => {
            if (!r.assignedProducer)
                return null;
            const p = (0, editor_assignment_1.findProducerByAssignmentKey)(r.assignedProducer, producers);
            return p?.name || r.assignedProducer;
        })
            .filter(Boolean)));
        strict_1.default.ok(distinctProducers.length >= 2, "Multiple producers should have completed records");
        const generatedFiles = {};
        distinctProducers.forEach((targetName) => {
            const prodRecords = dateMatching.filter((r) => {
                const p = (0, editor_assignment_1.findProducerByAssignmentKey)(r.assignedProducer, producers);
                return p?.name === targetName || r.assignedProducer === targetName;
            });
            const csv = (0, export_csv_1.generateProducerFacingPayrollCsv)(prodRecords, allOrders, producers, targetName);
            generatedFiles[targetName] = csv;
        });
        distinctProducers.forEach((prodName) => {
            const fileCsv = generatedFiles[prodName];
            strict_1.default.ok(fileCsv, `File should be generated for ${prodName}`);
            const otherProducers = distinctProducers.filter((p) => p !== prodName);
            otherProducers.forEach((otherName) => {
                const otherProducerObj = producers.find((p) => p.name === otherName);
                if (otherProducerObj) {
                    strict_1.default.strictEqual(fileCsv.includes(otherProducerObj.email || "never-match-placeholder"), false, `File for ${prodName} must not contain ${otherName}'s email`);
                }
            });
            strict_1.default.strictEqual(fileCsv.includes("Email"), false);
            strict_1.default.strictEqual(fileCsv.includes("Phone"), false);
            strict_1.default.strictEqual(fileCsv.includes("Billing Address"), false);
            strict_1.default.strictEqual(fileCsv.includes("SLT Take-Home"), false);
            strict_1.default.strictEqual(fileCsv.includes("SLT Gross"), false);
        });
    });
    (0, node_test_1.it)("3. Send to [Specific Producer] downloads only that target producer's file", () => {
        const bounds = (0, date_filters_1.calculateDateBounds)("last1Year");
        const filterPeriod = {
            start: (0, dates_1.toCanonicalIsoDate)(bounds.start),
            end: (0, dates_1.toCanonicalIsoDate)(bounds.end),
        };
        const dateMatching = payrollRecords.filter((rec) => {
            const recStart = rec.completedAt || rec.mixStartDate || "";
            const recEnd = rec.completedAt || rec.mixEndDate || rec.mixStartDate || "";
            return (0, dates_1.doDateRangesOverlap)({ start: recStart, end: recEnd }, filterPeriod);
        });
        const distinctProducers = Array.from(new Set(dateMatching
            .map((r) => {
            if (!r.assignedProducer)
                return null;
            const p = (0, editor_assignment_1.findProducerByAssignmentKey)(r.assignedProducer, producers);
            return p?.name || r.assignedProducer;
        })
            .filter(Boolean)));
        const targetProducer = distinctProducers[0];
        strict_1.default.ok(targetProducer, "Target producer should be resolved");
        const targetRecords = dateMatching.filter((r) => {
            const p = (0, editor_assignment_1.findProducerByAssignmentKey)(r.assignedProducer, producers);
            return p?.name === targetProducer || r.assignedProducer === targetProducer;
        });
        strict_1.default.ok(targetRecords.length > 0, `${targetProducer} should have records in the period`);
        const csv = (0, export_csv_1.generateProducerFacingPayrollCsv)(targetRecords, allOrders, producers, targetProducer);
        const lines = csv.trim().split("\n");
        strict_1.default.strictEqual(lines.length, targetRecords.length + 1, "CSV header + exact target records count");
        const otherProducers = distinctProducers.filter((p) => p !== targetProducer);
        otherProducers.forEach((otherName) => {
            strict_1.default.strictEqual(csv.includes(`"assignedProducer":"${otherName}"`), false, `File for ${targetProducer} must not contain ${otherName}'s records`);
        });
    });
    (0, node_test_1.it)("4. Custom Date Range narrows output correctly", () => {
        const customFilter = { start: "2026-09-01", end: "2026-09-15" };
        const matching = payrollRecords.filter((rec) => {
            const recStart = rec.completedAt || rec.mixStartDate || "";
            const recEnd = rec.completedAt || rec.mixEndDate || rec.mixStartDate || "";
            return (0, dates_1.doDateRangesOverlap)({ start: recStart, end: recEnd }, customFilter);
        });
        strict_1.default.ok(matching.length > 0, "Records in Sept 2026 should match custom date filter");
        matching.forEach((rec) => {
            const recDate = rec.completedAt || rec.mixEndDate || rec.mixStartDate || "";
            strict_1.default.ok(recDate >= "2026-09-01" && recDate <= "2026-09-15", `Record date ${recDate} must fall within custom range 2026-09-01 to 2026-09-15`);
        });
    });
});
