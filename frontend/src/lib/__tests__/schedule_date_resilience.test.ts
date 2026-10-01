import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseToDate,
  aggregateColumns,
  buildScheduleColumnAggregates,
  buildCalendarDays,
  rangeLabel,
  buildTeamSchedule,
} from "../schedule-view";

describe("Schedule Tab Date Resilience", () => {
  it("parseToDate returns valid Date for strings, invalid strings, numbers, null, and Date instances", () => {
    assert.ok(parseToDate(new Date()) instanceof Date);
    assert.equal(Number.isNaN(parseToDate(new Date()).getTime()), false);

    assert.ok(parseToDate("2026-09-11") instanceof Date);
    assert.equal(Number.isNaN(parseToDate("2026-09-11").getTime()), false);

    // Non-date string like "week", "month", or invalid string falls back to current Date without throwing
    const fallback = parseToDate("week");
    assert.ok(fallback instanceof Date);
    assert.equal(Number.isNaN(fallback.getTime()), false);

    assert.ok(parseToDate(null) instanceof Date);
    assert.ok(parseToDate(undefined) instanceof Date);
    assert.ok(parseToDate(1700000000000) instanceof Date);
  });

  it("aggregateColumns does not throw when passed a view string instead of Date", () => {
    const teamRows = buildTeamSchedule([], [], "week");
    assert.doesNotThrow(() => {
      const cols = aggregateColumns(teamRows, "week" as any);
      assert.ok(Array.isArray(cols));
    });
  });

  it("buildScheduleColumnAggregates does not throw when passed non-Date anchorDate", () => {
    assert.doesNotThrow(() => {
      const cols = buildScheduleColumnAggregates("week", "invalid-date" as any);
      assert.ok(Array.isArray(cols));
    });
  });

  it("buildCalendarDays and rangeLabel do not throw with string or null anchorDate", () => {
    assert.doesNotThrow(() => {
      const days = buildCalendarDays([], "week", "month" as any);
      assert.ok(Array.isArray(days));
    });

    assert.doesNotThrow(() => {
      const label = rangeLabel("week", "week" as any);
      assert.equal(typeof label, "string");
    });
  });
});
