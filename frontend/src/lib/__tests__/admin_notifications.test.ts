import { describe, it } from "node:test";
import assert from "node:assert";
import {
  findLeavesStartingTomorrow,
  findProducersAtLimitFull,
  isBellNotificationType,
} from "../admin-notifications";
import type { MTDRecord, Producer } from "../../types";

function producer(overrides: Partial<Producer> = {}): Producer {
  return {
    id: "p1",
    name: "Alex",
    initials: "AL",
    email: "a@example.com",
    categories: ["All-Star Cheer"],
    avatar: "",
    mixesThisWeek: 0,
    workDays: ["mon", "tue", "wed", "thu", "fri"],
    timeOff: [],
    maxMixesPerDay: 2,
    maxProducerCostPerDay: null,
    extraDays: [],
    ...overrides,
  };
}

describe("admin notifications", () => {
  it("bell types are only the four admin events", () => {
    assert.equal(isBellNotificationType("new_order"), true);
    assert.equal(isBellNotificationType("flagged_order"), true);
    assert.equal(isBellNotificationType("leave_tomorrow"), true);
    assert.equal(isBellNotificationType("limit_full"), true);
    assert.equal(isBellNotificationType("assignment"), true);
    assert.equal(isBellNotificationType("gmail_connected"), true);
    assert.equal(isBellNotificationType("gmail_disconnected"), true);
    assert.equal(isBellNotificationType("mtd_move"), false);
    assert.equal(isBellNotificationType("error"), false);
  });

  it("detects leave that starts tomorrow", () => {
    const hits = findLeavesStartingTomorrow(
      [
        producer({
          timeOff: [
            {
              id: "t1",
              startDate: "2026-10-22",
              endDate: "2026-10-24",
              type: "personal",
              reason: "Vacation",
            },
          ],
        }),
      ],
      "2026-10-21"
    );
    assert.equal(hits.length, 1);
    assert.match(hits[0].title, /Alex has off tomorrow/);
    assert.match(hits[0].message, /Vacation/);
  });

  it("ignores leave already in progress", () => {
    const hits = findLeavesStartingTomorrow(
      [
        producer({
          timeOff: [
            {
              id: "t1",
              startDate: "2026-10-20",
              endDate: "2026-10-24",
              type: "personal",
              reason: "Vacation",
            },
          ],
        }),
      ],
      "2026-10-21"
    );
    assert.equal(hits.length, 0);
  });

  it("detects limit full for today", () => {
    const p = producer({ maxMixesPerDay: 1 });
    const records = [
      {
        id: "m1",
        orderId: "o1",
        assignedProducer: "Alex",
        mixStartDate: "2026-10-21",
        mixEndDate: "2026-10-21",
        programName: "Spirit",
        package: "GOLD 2:00",
        status: "in_progress",
      } as unknown as MTDRecord,
    ];
    const hits = findProducersAtLimitFull([p], records, "2026-10-21");
    assert.ok(hits.length >= 1);
    assert.match(hits[0].title, /Limit full/);
  });
});
