import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getScheduleCells } from "../schedule-view";
import {
  getNextAvailableSlot,
  suggestMixStartDate,
} from "../scheduling";
import type { Producer } from "@/types";

const monSatProducer: Producer = {
  id: "prod-casey",
  name: "Casey Marlow",
  initials: "CM",
  email: "casey@example.com",
  avatar: "",
  specialty: "Cheer",
  categories: ["All-Star Cheer"],
  status: "available",
  mixesThisWeek: 0,
  nextAvailable: "",
  workDays: ["mon", "tue", "wed", "thu", "fri", "sat"],
  timeOff: [],
  maxMixesPerDay: null,
  maxProducerCostPerDay: null,
  overtimeDays: [],
};

describe("Producer work days on schedule and booking", () => {
  it("marks Sunday as non-working for Mon–Sat producers and Saturday as available", () => {
    // Week of Sun Aug 16 – Sat Aug 22, 2026
    const anchor = new Date(2026, 7, 19); // Wed Aug 19
    const cells = getScheduleCells(monSatProducer, [], "week", anchor, []);

    const sunday = cells.find((c) => c.key === "2026-08-16");
    const monday = cells.find((c) => c.key === "2026-08-17");
    const saturday = cells.find((c) => c.key === "2026-08-22");

    assert.equal(sunday?.status, "nonwork");
    assert.equal(sunday?.unavailable, true);
    assert.equal(monday?.status, "available");
    assert.equal(saturday?.status, "available");
  });

  it("treats overtime on Sunday as a scheduled day", () => {
    const withOvertime: Producer = {
      ...monSatProducer,
      overtimeDays: ["2026-08-16"],
    };
    const anchor = new Date(2026, 7, 19);
    const cells = getScheduleCells(withOvertime, [], "week", anchor, []);
    const sunday = cells.find((c) => c.key === "2026-08-16");

    assert.equal(sunday?.status, "available");
  });

  it("marks time off on work days as off, not overtime days", () => {
    const withBoth: Producer = {
      ...monSatProducer,
      overtimeDays: ["2026-08-16"],
      timeOff: [
        {
          id: "to-1",
          startDate: "2026-08-16",
          endDate: "2026-08-17",
          type: "personal",
          reason: "Vacation",
        },
      ],
    };
    const anchor = new Date(2026, 7, 19);
    const cells = getScheduleCells(withBoth, [], "week", anchor, []);
    const sunday = cells.find((c) => c.key === "2026-08-16");
    const monday = cells.find((c) => c.key === "2026-08-17");

    // Sunday is overtime — time off does not cancel it; remove OT instead.
    assert.equal(sunday?.status, "available");
    assert.equal(monday?.status, "off");
  });

  it("returns to nonwork when overtime is removed", () => {
    const withoutOt: Producer = {
      ...monSatProducer,
      overtimeDays: [],
      timeOff: [
        {
          id: "to-1",
          startDate: "2026-08-16",
          endDate: "2026-08-16",
          type: "personal",
          reason: "Vacation",
        },
      ],
    };
    const anchor = new Date(2026, 7, 19);
    const cells = getScheduleCells(withoutOt, [], "week", anchor, []);
    const sunday = cells.find((c) => c.key === "2026-08-16");

    assert.equal(sunday?.status, "nonwork");
  });

  it("skips Sunday when finding the next available booking slot", () => {
    // From Sunday Aug 16, next Mon–Sat work day is Monday Aug 17.
    const fromSunday = new Date(2026, 7, 16);
    const slot = getNextAvailableSlot(
      "CM",
      [monSatProducer],
      [],
      [],
      fromSunday
    );

    assert.ok(slot);
    assert.equal(slot?.date, "2026-08-17");
    assert.equal(slot?.label, "Aug 17, 2026");
  });

  it("returns ISO mix start dates from suggestMixStartDate via next work day", () => {
    const fromFriday = new Date(2026, 7, 21); // Fri Aug 21
    const slot = getNextAvailableSlot(
      "Casey Marlow",
      [monSatProducer],
      [],
      [],
      fromFriday
    );
    assert.equal(slot?.date, "2026-08-21");
    assert.match(slot?.date ?? "", /^\d{4}-\d{2}-\d{2}$/);

    // suggestMixStartDate uses "today"; when today is a work day it returns ISO.
    const suggested = suggestMixStartDate("CM", [monSatProducer], [], []);
    assert.match(suggested, /^\d{4}-\d{2}-\d{2}$/);
  });
});
