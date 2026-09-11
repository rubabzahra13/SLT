import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  doDateRangesOverlap,
  extractDateRange,
  isRecordDateRangeOverlapping,
} from "../dates";
import { matchesDateFilter } from "../mtd-filters";
import type { MTDRecord } from "../../types";

describe("Prompt 5 — Shared Date-Range Overlap Filtering Utility", () => {
  const dec15to17Record = {
    mixStartDate: "2026-12-15",
    mixEndDate: "2026-12-17",
  };

  it("1. Exact match: record Dec 15–17 vs filter Dec 15–17", () => {
    const filter = { start: "2026-12-15", end: "2026-12-17" };
    assert.equal(doDateRangesOverlap(dec15to17Record, filter), true);
    assert.equal(
      isRecordDateRangeOverlapping("2026-12-15", "2026-12-17", filter),
      true
    );
  });

  it("2. Partial overlap on left side: record Dec 15–17 vs filter Dec 14–16", () => {
    const filter = { start: "2026-12-14", end: "2026-12-16" };
    assert.equal(doDateRangesOverlap(dec15to17Record, filter), true);
  });

  it("3. Partial overlap on right side: record Dec 15–17 vs filter Dec 17–20", () => {
    const filter = { start: "2026-12-17", end: "2026-12-20" };
    assert.equal(doDateRangesOverlap(dec15to17Record, filter), true);
  });

  it("4. Single day filter inside range: record Dec 15–17 vs filter Dec 16 alone", () => {
    assert.equal(doDateRangesOverlap(dec15to17Record, "2026-12-16"), true);
    assert.equal(
      doDateRangesOverlap(dec15to17Record, {
        start: "2026-12-16",
        end: "2026-12-16",
      }),
      true
    );
  });

  it("5. Fully-contained-within: record Dec 15–17 vs filter Dec 10–25", () => {
    const filter = { start: "2026-12-10", end: "2026-12-25" };
    assert.equal(doDateRangesOverlap(dec15to17Record, filter), true);
  });

  it("6. Filter fully contained within record range: record Dec 10–25 vs filter Dec 15–17", () => {
    const wideRecord = { start: "2026-12-10", end: "2026-12-25" };
    const filter = { start: "2026-12-15", end: "2026-12-17" };
    assert.equal(doDateRangesOverlap(wideRecord, filter), true);
  });

  it("7. No overlap (after): record Dec 15–17 vs filter Dec 20–25", () => {
    const filter = { start: "2026-12-20", end: "2026-12-25" };
    assert.equal(doDateRangesOverlap(dec15to17Record, filter), false);
  });

  it("8. No overlap (before): record Dec 15–17 vs filter Dec 01–10", () => {
    const filter = { start: "2026-12-01", end: "2026-12-10" };
    assert.equal(doDateRangesOverlap(dec15to17Record, filter), false);
  });

  it("9. Single-day record (start date only) inside multi-day filter", () => {
    const singleDayRecord = { mixStartDate: "2026-12-16", mixEndDate: null };
    assert.equal(
      doDateRangesOverlap(singleDayRecord, {
        start: "2026-12-15",
        end: "2026-12-17",
      }),
      true
    );

    assert.equal(
      doDateRangesOverlap(singleDayRecord, {
        start: "2026-12-17",
        end: "2026-12-20",
      }),
      false
    );
  });

  it("10. Unscheduled record (no dates) vs filters", () => {
    const unscheduledRecord = { mixStartDate: null, mixEndDate: null };
    assert.equal(
      doDateRangesOverlap(unscheduledRecord, {
        start: "2026-12-15",
        end: "2026-12-17",
      }),
      false
    );

    // Unbounded filter (e.g. "All time")
    assert.equal(doDateRangesOverlap(unscheduledRecord, null), true);
  });

  it("11. Integration with MTD matchesDateFilter utility", () => {
    const mockRec: MTDRecord = {
      id: "REC-TEST-OVERLAP",
      programName: "Overlap Cheer Team",
      mixStartDate: "2026-12-15",
      mixEndDate: "2026-12-17",
      assignedProducer: "Nick",
      status: "active",
      needsAttention: false,
    } as any;

    // Filter period for Dec 16 alone (custom date filter)
    const singleDayFilter = {
      type: "custom" as const,
      value: { start: "2026-12-16", end: "2026-12-16" },
    };

    assert.equal(matchesDateFilter(mockRec, singleDayFilter), true);

    // Filter period for Dec 20–25
    const nonOverlappingFilter = {
      type: "custom" as const,
      value: { start: "2026-12-20", end: "2026-12-25" },
    };

    assert.equal(matchesDateFilter(mockRec, nonOverlappingFilter), false);
  });

  it("12. Helper extractDateRange normalizes flexible inputs", () => {
    assert.deepEqual(extractDateRange("2026-12-16"), {
      start: "2026-12-16",
      end: "2026-12-16",
    });

    assert.deepEqual(
      extractDateRange({ start: "2026-12-15", end: "2026-12-17" }),
      {
        start: "2026-12-15",
        end: "2026-12-17",
      }
    );

    assert.deepEqual(
      extractDateRange({ mixStartDate: "2026-12-15", mixEndDate: null }),
      {
        start: "2026-12-15",
        end: "2026-12-15",
      }
    );
  });
});
