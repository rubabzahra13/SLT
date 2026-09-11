"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const dates_1 = require("../dates");
const mtd_filters_1 = require("../mtd-filters");
(0, node_test_1.describe)("Prompt 5 — Shared Date-Range Overlap Filtering Utility", () => {
    const dec15to17Record = {
        mixStartDate: "2026-12-15",
        mixEndDate: "2026-12-17",
    };
    (0, node_test_1.it)("1. Exact match: record Dec 15–17 vs filter Dec 15–17", () => {
        const filter = { start: "2026-12-15", end: "2026-12-17" };
        strict_1.default.equal((0, dates_1.doDateRangesOverlap)(dec15to17Record, filter), true);
        strict_1.default.equal((0, dates_1.isRecordDateRangeOverlapping)("2026-12-15", "2026-12-17", filter), true);
    });
    (0, node_test_1.it)("2. Partial overlap on left side: record Dec 15–17 vs filter Dec 14–16", () => {
        const filter = { start: "2026-12-14", end: "2026-12-16" };
        strict_1.default.equal((0, dates_1.doDateRangesOverlap)(dec15to17Record, filter), true);
    });
    (0, node_test_1.it)("3. Partial overlap on right side: record Dec 15–17 vs filter Dec 17–20", () => {
        const filter = { start: "2026-12-17", end: "2026-12-20" };
        strict_1.default.equal((0, dates_1.doDateRangesOverlap)(dec15to17Record, filter), true);
    });
    (0, node_test_1.it)("4. Single day filter inside range: record Dec 15–17 vs filter Dec 16 alone", () => {
        strict_1.default.equal((0, dates_1.doDateRangesOverlap)(dec15to17Record, "2026-12-16"), true);
        strict_1.default.equal((0, dates_1.doDateRangesOverlap)(dec15to17Record, {
            start: "2026-12-16",
            end: "2026-12-16",
        }), true);
    });
    (0, node_test_1.it)("5. Fully-contained-within: record Dec 15–17 vs filter Dec 10–25", () => {
        const filter = { start: "2026-12-10", end: "2026-12-25" };
        strict_1.default.equal((0, dates_1.doDateRangesOverlap)(dec15to17Record, filter), true);
    });
    (0, node_test_1.it)("6. Filter fully contained within record range: record Dec 10–25 vs filter Dec 15–17", () => {
        const wideRecord = { start: "2026-12-10", end: "2026-12-25" };
        const filter = { start: "2026-12-15", end: "2026-12-17" };
        strict_1.default.equal((0, dates_1.doDateRangesOverlap)(wideRecord, filter), true);
    });
    (0, node_test_1.it)("7. No overlap (after): record Dec 15–17 vs filter Dec 20–25", () => {
        const filter = { start: "2026-12-20", end: "2026-12-25" };
        strict_1.default.equal((0, dates_1.doDateRangesOverlap)(dec15to17Record, filter), false);
    });
    (0, node_test_1.it)("8. No overlap (before): record Dec 15–17 vs filter Dec 01–10", () => {
        const filter = { start: "2026-12-01", end: "2026-12-10" };
        strict_1.default.equal((0, dates_1.doDateRangesOverlap)(dec15to17Record, filter), false);
    });
    (0, node_test_1.it)("9. Single-day record (start date only) inside multi-day filter", () => {
        const singleDayRecord = { mixStartDate: "2026-12-16", mixEndDate: null };
        strict_1.default.equal((0, dates_1.doDateRangesOverlap)(singleDayRecord, {
            start: "2026-12-15",
            end: "2026-12-17",
        }), true);
        strict_1.default.equal((0, dates_1.doDateRangesOverlap)(singleDayRecord, {
            start: "2026-12-17",
            end: "2026-12-20",
        }), false);
    });
    (0, node_test_1.it)("10. Unscheduled record (no dates) vs filters", () => {
        const unscheduledRecord = { mixStartDate: null, mixEndDate: null };
        strict_1.default.equal((0, dates_1.doDateRangesOverlap)(unscheduledRecord, {
            start: "2026-12-15",
            end: "2026-12-17",
        }), false);
        // Unbounded filter (e.g. "All time")
        strict_1.default.equal((0, dates_1.doDateRangesOverlap)(unscheduledRecord, null), true);
    });
    (0, node_test_1.it)("11. Integration with MTD matchesDateFilter utility", () => {
        const mockRec = {
            id: "REC-TEST-OVERLAP",
            programName: "Overlap Cheer Team",
            mixStartDate: "2026-12-15",
            mixEndDate: "2026-12-17",
            assignedProducer: "Nick",
            status: "active",
            needsAttention: false,
        };
        // Filter period for Dec 16 alone (custom date filter)
        const singleDayFilter = {
            type: "custom",
            value: { start: "2026-12-16", end: "2026-12-16" },
        };
        strict_1.default.equal((0, mtd_filters_1.matchesDateFilter)(mockRec, singleDayFilter), true);
        // Filter period for Dec 20–25
        const nonOverlappingFilter = {
            type: "custom",
            value: { start: "2026-12-20", end: "2026-12-25" },
        };
        strict_1.default.equal((0, mtd_filters_1.matchesDateFilter)(mockRec, nonOverlappingFilter), false);
    });
    (0, node_test_1.it)("12. Helper extractDateRange normalizes flexible inputs", () => {
        strict_1.default.deepEqual((0, dates_1.extractDateRange)("2026-12-16"), {
            start: "2026-12-16",
            end: "2026-12-16",
        });
        strict_1.default.deepEqual((0, dates_1.extractDateRange)({ start: "2026-12-15", end: "2026-12-17" }), {
            start: "2026-12-15",
            end: "2026-12-17",
        });
        strict_1.default.deepEqual((0, dates_1.extractDateRange)({ mixStartDate: "2026-12-15", mixEndDate: null }), {
            start: "2026-12-15",
            end: "2026-12-15",
        });
    });
});
