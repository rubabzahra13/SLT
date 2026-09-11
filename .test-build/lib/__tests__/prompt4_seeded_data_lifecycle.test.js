"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const data_1 = require("../data");
const mtd_completion_1 = require("../mtd-completion");
const mtd_filters_1 = require("../mtd-filters");
(0, node_test_1.describe)("Prompt 4 — Seed Realistic Test Data Through Real Lifecycle", () => {
    (0, node_test_1.it)("verifies Payroll tab contains at least 10 varied records across categories, producers, dates, and add-ons", () => {
        const { mtdRecords } = (0, data_1.getData)();
        const payrollRecords = (0, mtd_completion_1.getPayrollRecords)(mtdRecords);
        // Requirement: at least 10 completed payroll rows
        strict_1.default.ok(payrollRecords.length >= 10, `Expected at least 10 payroll records, found ${payrollRecords.length}`);
        // Verify category diversity
        const categories = new Set(payrollRecords.map((r) => r.category));
        strict_1.default.ok(categories.has("Cheer"), "Payroll must contain Cheer records");
        strict_1.default.ok(categories.has("Dance"), "Payroll must contain Dance records");
        // Verify producer diversity
        const producers = new Set(payrollRecords
            .map((r) => r.assignedProducer)
            .filter((p) => Boolean(p)));
        strict_1.default.ok(producers.size >= 4, `Expected at least 4 distinct assigned producers in Payroll, found ${producers.size}`);
        // Verify date diversity across at least August and September 2026
        const months = new Set(payrollRecords
            .map((r) => r.completedAt?.slice(0, 7))
            .filter((d) => Boolean(d)));
        strict_1.default.ok(months.has("2026-08") && months.has("2026-09"), "Payroll completed dates must span multiple months (e.g. 2026-08 and 2026-09)");
        // Verify add-on diversity (Rush fees, Voiceovers)
        const hasRush = payrollRecords.some((r) => r.rushFeeOption || (r.rushFeeQuantity ?? 0) > 0 || r.isRushOrder);
        const hasVo = payrollRecords.some((r) => r.cheerVoiceover20 ||
            r.cheerVoiceover40 ||
            r.danceVoiceover ||
            r.hasTraditionalVoiceover ||
            r.hasThemedVoiceover);
        strict_1.default.ok(hasRush, "Payroll records should include Rush Fee add-ons");
        strict_1.default.ok(hasVo, "Payroll records should include Voiceover add-ons");
    });
    (0, node_test_1.it)("verifies Orders tab contains unassigned pre-MTD records across Cheer and Dance subtypes", () => {
        const { mtdRecords } = (0, data_1.getData)();
        const preMtd = mtdRecords.filter(mtd_filters_1.isPreMTDOrderRecord);
        strict_1.default.ok(preMtd.length >= 4, `Expected at least 4 pre-MTD orders, found ${preMtd.length}`);
        const unassignedRecords = preMtd.filter((r) => !r.assignedProducer);
        strict_1.default.ok(unassignedRecords.length >= 2, `Expected at least 2 unassigned orders in pre-MTD Orders, found ${unassignedRecords.length}`);
        for (const rec of unassignedRecords) {
            strict_1.default.equal(rec.assignedProducer, null);
            // Unassigned records stay in Orders until assigned & scheduled
            strict_1.default.equal((0, mtd_filters_1.isPreMTDOrderRecord)(rec), true);
        }
    });
});
