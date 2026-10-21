import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeDiscountCode,
  evaluateCouponCode,
  isValidDiscountCode,
  isDuplicateDiscountCode,
} from "../discount-codes";
import type { DiscountCode } from "../../types";

describe("Coupon code matching (case-insensitive, trim-only)", () => {
  const configured: DiscountCode[] = [
    normalizeDiscountCode({ id: "1", code: "A123" }),
    normalizeDiscountCode({ id: "2", code: "SUMMER20" }),
  ];

  it("matches identical codes", () => {
    const res = evaluateCouponCode("A123", configured);
    assert.equal(res.status, "matched");
    assert.equal(res.match?.code, "A123");
  });

  it("matches case-insensitively without rewriting the submitted value", () => {
    const submitted = "a123";
    const res = evaluateCouponCode(submitted, configured);
    assert.equal(res.status, "matched");
    assert.equal(isValidDiscountCode(submitted, configured), true);
    // Submitted casing is preserved by the caller; match returns configured code.
    assert.equal(res.match?.code, "A123");
    assert.equal(submitted, "a123");
  });

  it("trims leading and trailing whitespace before matching", () => {
    const res = evaluateCouponCode("  A123  ", configured);
    assert.equal(res.status, "matched");
  });

  it("does not match unconfigured codes", () => {
    const res = evaluateCouponCode("NOPE", configured);
    assert.equal(res.status, "unmatched");
    assert.equal(isValidDiscountCode("NOPE", configured), false);
  });

  it("returns empty when no coupon is provided", () => {
    assert.equal(evaluateCouponCode("", configured).status, "empty");
    assert.equal(evaluateCouponCode("   ", configured).status, "empty");
  });

  it("works when no coupon codes are configured", () => {
    assert.equal(evaluateCouponCode("A123", []).status, "unmatched");
    assert.equal(evaluateCouponCode("", []).status, "empty");
  });

  it("detects duplicate configured codes case-insensitively", () => {
    assert.equal(isDuplicateDiscountCode("a123", configured), true);
    assert.equal(isDuplicateDiscountCode("NEW", configured), false);
    assert.equal(isDuplicateDiscountCode("a123", configured, "1"), false);
  });
});
