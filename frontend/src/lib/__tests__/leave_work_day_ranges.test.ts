import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  leaveDatesOnWeekday,
  splitTimeOffToWorkDayRanges,
} from "../producer-availability";
import type { Weekday } from "../../types";

const WEEKDAYS_MON_FRI: Weekday[] = ["mon", "tue", "wed", "thu", "fri"];

describe("splitTimeOffToWorkDayRanges", () => {
  it("drops non-work days inside a selected leave span", () => {
    // Thu 22 – Tue 27 Oct 2026 spans a weekend (24–25).
    const split = splitTimeOffToWorkDayRanges(
      [
        {
          startDate: "2026-10-22",
          endDate: "2026-10-27",
          reason: "Off work for n",
        },
      ],
      WEEKDAYS_MON_FRI
    );

    assert.deepEqual(
      split.map((e) => [e.startDate, e.endDate]),
      [
        ["2026-10-22", "2026-10-23"],
        ["2026-10-26", "2026-10-27"],
      ]
    );
  });

  it("keeps a contiguous work-day leave as one range", () => {
    const split = splitTimeOffToWorkDayRanges(
      [{ startDate: "2026-10-20", endDate: "2026-10-22" }],
      WEEKDAYS_MON_FRI
    );
    assert.equal(split.length, 1);
    assert.equal(split[0].startDate, "2026-10-20");
    assert.equal(split[0].endDate, "2026-10-22");
  });
});

describe("leaveDatesOnWeekday", () => {
  it("lists leave dates that fall on a weekday inside a span", () => {
    const dates = leaveDatesOnWeekday(
      [{ startDate: "2026-10-22", endDate: "2026-10-27" }],
      "sat"
    );
    assert.deepEqual(dates, ["2026-10-24"]);
  });
});
