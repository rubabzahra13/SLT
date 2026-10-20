import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getInvalidOrderEmailFields,
  isAcceptableOrderEmailValue,
  isValidEmailFormat,
} from "../email-format";
import type { Order } from "@/types";

describe("email format validation", () => {
  it("accepts any domain, not only gmail.com", () => {
    assert.equal(isValidEmailFormat("coach@gmail.com"), true);
    assert.equal(isValidEmailFormat("a.b+tag@school.edu"), true);
    assert.equal(isValidEmailFormat("billing@district.k12.tx.us"), true);
    assert.equal(isValidEmailFormat("music@sounds-like-that.com"), true);
  });

  it("rejects malformed addresses", () => {
    assert.equal(isValidEmailFormat("not-an-email"), false);
    assert.equal(isValidEmailFormat("missing@domain"), false);
    assert.equal(isValidEmailFormat("@nodomain.com"), false);
    assert.equal(isValidEmailFormat("spaces @x.com"), false);
    assert.equal(isValidEmailFormat(""), false);
  });

  it("empty is acceptable on optional Add Order emails", () => {
    assert.equal(isAcceptableOrderEmailValue(""), true);
    assert.equal(isAcceptableOrderEmailValue("  "), true);
  });

  it("allows N/A on choreographer email only", () => {
    assert.equal(isAcceptableOrderEmailValue("N/A", "choreographerEmail"), true);
    assert.equal(isAcceptableOrderEmailValue("N/A", "coachEmail"), false);
    assert.equal(
      isAcceptableOrderEmailValue("none", "choreographerEmail"),
      false
    );
  });

  it("flags invalid emails on Add Order drafts for every category form", () => {
    const dance = {
      formType: "school-all-star-dance",
      danceFormSubtype: "pom",
      coachEmail: "bad",
      billingPersonEmail: "ok@school.edu",
    } as Order;
    const gaps = getInvalidOrderEmailFields(dance);
    assert.ok(gaps.some((g) => g.key === "coachEmail"));
    assert.ok(!gaps.some((g) => g.key === "billingPersonEmail"));
  });
});
