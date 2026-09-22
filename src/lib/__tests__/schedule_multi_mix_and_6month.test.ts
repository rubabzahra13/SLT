import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getScheduleCells,
  rangeLabel,
  cellSizeForRange,
  statusLabel,
  type ScheduleViewRange,
} from "../schedule-view";
import type { Producer, MTDRecord } from "@/types";

const mockProducer: Producer = {
  id: "prod-john",
  name: "John",
  initials: "J",
  email: "john@example.com",
  avatar: "/avatars/john.jpg",
  specialty: "Cheer",
  categories: ["All-Star Cheer"],
  status: "available",
  mixesThisWeek: 2,
  nextAvailable: "Today",
  workDays: ["mon", "tue", "wed", "thu", "fri"],
  timeOff: [],
  maxMixesPerDay: 5,
  maxProducerCostPerDay: null,
  overtimeDays: [],
};

const mockProducerMary: Producer = {
  id: "prod-mary",
  name: "Mary",
  initials: "M",
  email: "mary@example.com",
  avatar: "/avatars/mary.jpg",
  specialty: "Dance",
  categories: ["Pom", "Gameday"],
  status: "available",
  mixesThisWeek: 1,
  nextAvailable: "Tomorrow",
  workDays: ["mon", "tue", "wed", "thu", "fri"],
  timeOff: [],
  maxMixesPerDay: 5,
  maxProducerCostPerDay: null,
  overtimeDays: [],
};

const anchorDate = new Date(2026, 8, 10); // Sept 10, 2026

describe("Schedule Tab — Extended 6 Month Range and Multi-Mix Resolution", () => {
  it("supports all four date-range view options (week, month, 90days, 6months)", () => {
    const ranges: ScheduleViewRange[] = ["week", "month", "90days", "6months"];

    ranges.forEach((range) => {
      const cells = getScheduleCells(mockProducer, [], range, anchorDate, []);
      if (range === "week") assert.equal(cells.length, 7);
      if (range === "month") {
        // Full September 2026 calendar month
        assert.equal(cells.length, 30);
        assert.equal(cells[0]?.key, "2026-09-01");
        assert.equal(cells[cells.length - 1]?.key, "2026-09-30");
      }
      if (range === "90days") {
        assert.equal(cells.length, 90);
        assert.equal(cells[0]?.key, "2026-09-10");
        assert.equal(cells[cells.length - 1]?.key, "2026-12-08");
      }
      if (range === "6months") {
        // Sep 2026–Feb 2027: 30+31+30+31+31+28 = 181
        assert.equal(cells[0]?.key, "2026-09-01");
        assert.equal(cells[cells.length - 1]?.key, "2027-02-28");
        assert.equal(cells.length, 181);
      }
    });
  });

  it("calculates range labels and cell sizes correctly for 6months while preserving 90days", () => {
    assert.equal(rangeLabel("month", anchorDate), "This month");
    assert.equal(rangeLabel("90days", anchorDate), "Next 90 days");
    assert.equal(rangeLabel("6months", anchorDate), "Next 6 months");
    assert.equal(cellSizeForRange("90days"), "sm");
    assert.equal(cellSizeForRange("6months"), "sm");
  });

  it("preserves visual distinction for available, booked, and off statuses", () => {
    assert.equal(statusLabel("available"), "Available");
    assert.equal(statusLabel("mix"), "Booked");
    assert.equal(statusLabel("off"), "Off");
    assert.equal(statusLabel("nonwork"), "Non-working");
  });

  it("renders multiple mixes on the same date for the same producer as separate schedule bookings", () => {
    const mtdRecords: MTDRecord[] = [
      {
        id: "mtd-1",
        programName: "Mix A",
        assignedProducer: "John",
        mixStartDate: "2026-09-10",
        mixEndDate: "2026-09-12",
        status: "active",
      } as any,
      {
        id: "mtd-2",
        programName: "Mix B",
        assignedProducer: "John",
        mixStartDate: "2026-09-10",
        mixEndDate: "2026-09-13",
        status: "active",
      } as any,
      {
        id: "mtd-3",
        programName: "Mix C",
        assignedProducer: "John",
        mixStartDate: "2026-09-10",
        mixEndDate: "2026-09-14",
        status: "active",
      } as any,
    ];

    const cells = getScheduleCells(mockProducer, [], "week", anchorDate, mtdRecords);
    const sept10Cell = cells.find((c) => c.key === "2026-09-10");

    assert.ok(sept10Cell);
    assert.equal(sept10Cell?.status, "mix");
    assert.equal(sept10Cell?.unavailable, true);
    assert.equal(sept10Cell?.bookings?.length, 3);
    assert.deepEqual(
      sept10Cell?.bookings?.map((b) => b.work),
      ["Mix A", "Mix B", "Mix C"]
    );
  });

  it("does not merge separate date mixes for the same producer or mixes for different producers", () => {
    const mtdRecords: MTDRecord[] = [
      {
        id: "mtd-1",
        programName: "Mix A",
        assignedProducer: "John",
        mixStartDate: "2026-09-10",
        mixEndDate: "2026-09-10",
        status: "active",
      } as any,
      {
        id: "mtd-2",
        programName: "Mix D",
        assignedProducer: "John",
        mixStartDate: "2026-09-11",
        mixEndDate: "2026-09-11",
        status: "active",
      } as any,
      {
        id: "mtd-3",
        programName: "Mix E",
        assignedProducer: "Mary",
        mixStartDate: "2026-09-10",
        mixEndDate: "2026-09-10",
        status: "active",
      } as any,
    ];

    const johnCells = getScheduleCells(mockProducer, [], "week", anchorDate, mtdRecords);
    const sept10John = johnCells.find((c) => c.key === "2026-09-10");
    const sept11John = johnCells.find((c) => c.key === "2026-09-11");

    assert.equal(sept10John?.bookings?.length, 1);
    assert.equal(sept10John?.bookings?.[0].work, "Mix A");
    assert.equal(sept11John?.bookings?.length, 1);
    assert.equal(sept11John?.bookings?.[0].work, "Mix D");

    const maryCells = getScheduleCells(mockProducerMary, [], "week", anchorDate, mtdRecords);
    const sept10Mary = maryCells.find((c) => c.key === "2026-09-10");

    assert.equal(sept10Mary?.bookings?.length, 1);
    assert.equal(sept10Mary?.bookings?.[0].work, "Mix E");
  });
});
