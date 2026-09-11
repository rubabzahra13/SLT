"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const schedule_view_1 = require("../schedule-view");
(0, node_test_1.describe)("Schedule Tab Date Resilience", () => {
    (0, node_test_1.it)("parseToDate returns valid Date for strings, invalid strings, numbers, null, and Date instances", () => {
        strict_1.default.ok((0, schedule_view_1.parseToDate)(new Date()) instanceof Date);
        strict_1.default.equal(Number.isNaN((0, schedule_view_1.parseToDate)(new Date()).getTime()), false);
        strict_1.default.ok((0, schedule_view_1.parseToDate)("2026-09-11") instanceof Date);
        strict_1.default.equal(Number.isNaN((0, schedule_view_1.parseToDate)("2026-09-11").getTime()), false);
        // Non-date string like "week", "month", or invalid string falls back to current Date without throwing
        const fallback = (0, schedule_view_1.parseToDate)("week");
        strict_1.default.ok(fallback instanceof Date);
        strict_1.default.equal(Number.isNaN(fallback.getTime()), false);
        strict_1.default.ok((0, schedule_view_1.parseToDate)(null) instanceof Date);
        strict_1.default.ok((0, schedule_view_1.parseToDate)(undefined) instanceof Date);
        strict_1.default.ok((0, schedule_view_1.parseToDate)(1700000000000) instanceof Date);
    });
    (0, node_test_1.it)("aggregateColumns does not throw when passed a view string instead of Date", () => {
        const teamRows = (0, schedule_view_1.buildTeamSchedule)([], [], "week");
        strict_1.default.doesNotThrow(() => {
            const cols = (0, schedule_view_1.aggregateColumns)(teamRows, "week");
            strict_1.default.ok(Array.isArray(cols));
        });
    });
    (0, node_test_1.it)("buildScheduleColumnAggregates does not throw when passed non-Date anchorDate", () => {
        strict_1.default.doesNotThrow(() => {
            const cols = (0, schedule_view_1.buildScheduleColumnAggregates)("week", "invalid-date");
            strict_1.default.ok(Array.isArray(cols));
        });
    });
    (0, node_test_1.it)("buildCalendarDays and rangeLabel do not throw with string or null anchorDate", () => {
        strict_1.default.doesNotThrow(() => {
            const days = (0, schedule_view_1.buildCalendarDays)([], "week", "month");
            strict_1.default.ok(Array.isArray(days));
        });
        strict_1.default.doesNotThrow(() => {
            const label = (0, schedule_view_1.rangeLabel)("week", "week");
            strict_1.default.equal(typeof label, "string");
        });
    });
});
