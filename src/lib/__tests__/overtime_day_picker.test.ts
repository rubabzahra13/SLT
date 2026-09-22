import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isEligibleOvertimeDate } from "../producer-availability";
import type { Weekday } from "@/types";

describe("Overtime day eligibility", () => {
  it("only allows non-work weekdays (Mon–Sat workers → Sundays only)", () => {
    const workDays: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat"];
    assert.equal(
      isEligibleOvertimeDate(new Date(2026, 7, 16), workDays),
      true
    );
    assert.equal(
      isEligibleOvertimeDate(new Date(2026, 7, 17), workDays),
      false
    );
    assert.equal(
      isEligibleOvertimeDate(new Date(2026, 7, 22), workDays),
      false
    );
  });

  it("allows Saturday when work days are Mon–Fri", () => {
    const workDays: Weekday[] = ["mon", "tue", "wed", "thu", "fri"];
    assert.equal(
      isEligibleOvertimeDate(new Date(2026, 7, 22), workDays),
      true
    );
    assert.equal(
      isEligibleOvertimeDate(new Date(2026, 7, 16), workDays),
      true
    );
    assert.equal(
      isEligibleOvertimeDate(new Date(2026, 7, 19), workDays),
      false
    );
  });
});
