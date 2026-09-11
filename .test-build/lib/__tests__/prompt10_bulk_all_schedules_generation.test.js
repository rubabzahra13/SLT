"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const data_1 = require("../data");
const export_csv_1 = require("../export-csv");
const editor_assignment_1 = require("../editor-assignment");
(0, node_test_1.describe)("Prompt 10 — Bulk All Schedules Generation Tests", () => {
    const { mtdRecords, orders: allOrders, producers } = (0, data_1.getData)();
    (0, node_test_1.it)("1. Bulk generation produces one distinct schedule file per producer with scheduled mixes", () => {
        const distinctProducers = Array.from(new Set(mtdRecords
            .map((r) => {
            if (!r.assignedProducer)
                return null;
            const p = (0, editor_assignment_1.findProducerByAssignmentKey)(r.assignedProducer, producers);
            return p?.name || r.assignedProducer;
        })
            .filter(Boolean)));
        strict_1.default.ok(distinctProducers.length >= 3, "Expected at least 3 producers with scheduled mixes in seed data");
        const generatedFiles = {};
        // Simulate bulk generation loop (reusing Prompt 9's generateScheduleCsv)
        distinctProducers.forEach((targetName) => {
            const csv = (0, export_csv_1.generateScheduleCsv)(mtdRecords, allOrders, producers, targetName);
            generatedFiles[targetName] = csv;
        });
        // Verify each generated file count and content
        strict_1.default.strictEqual(Object.keys(generatedFiles).length, distinctProducers.length, "One file generated per producer");
        distinctProducers.forEach((prodName) => {
            const fileCsv = generatedFiles[prodName];
            strict_1.default.ok(fileCsv, `File for ${prodName} must exist`);
            const lines = fileCsv.trim().split("\n");
            strict_1.default.ok(lines.length > 1, `File for ${prodName} must contain header and rows`);
            // Verify zero cross-producer contamination in rows
            const otherProducers = distinctProducers.filter((p) => p !== prodName);
            const rowLines = lines.slice(1);
            rowLines.forEach((row) => {
                // Must belong to target producer
                strict_1.default.ok(row.includes(prodName), `Row in ${prodName}'s file must belong to ${prodName}: ${row}`);
                // Must not contain any other producer's name
                otherProducers.forEach((otherName) => {
                    strict_1.default.strictEqual(row.includes(`"${otherName}"`), false, `File for ${prodName} must not contain ${otherName}'s schedule row`);
                });
            });
        });
    });
    (0, node_test_1.it)("2. Verifies at least 3 specific generated producer files for strict isolation", () => {
        const testProducers = ["Nick", "Andrea", "Megan"];
        const generatedFiles = {};
        testProducers.forEach((producerName) => {
            const csv = (0, export_csv_1.generateScheduleCsv)(mtdRecords, allOrders, producers, producerName);
            generatedFiles[producerName] = csv;
        });
        testProducers.forEach((targetName) => {
            const csv = generatedFiles[targetName];
            strict_1.default.ok(csv.length > 0, `CSV for ${targetName} must not be empty`);
            const otherNames = testProducers.filter((name) => name !== targetName);
            const rows = csv.trim().split("\n").slice(1);
            rows.forEach((row) => {
                otherNames.forEach((otherName) => {
                    strict_1.default.strictEqual(row.includes(otherName), false, `Schedule file for ${targetName} contains unexpected data from ${otherName}`);
                });
            });
        });
    });
});
