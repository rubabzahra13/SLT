import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formSupportsCouponCode,
  getOrderDetailSections,
} from "../order-detail-sections";
import type { Order } from "../../types";

function baseOrder(overrides: Partial<Order>): Order {
  return {
    id: "ord-1",
    programName: "Test Program",
    contactName: "Test Contact",
    status: "new",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as Order;
}

describe("formSupportsCouponCode", () => {
  it("returns true for Cheer, Dance, and School Anthem", () => {
    assert.equal(formSupportsCouponCode("school-all-star-cheer"), true);
    assert.equal(formSupportsCouponCode("school-all-star-dance"), true);
    assert.equal(formSupportsCouponCode("school-anthem"), true);
  });

  it("returns false for Marching Band and Sports Entertainment", () => {
    assert.equal(formSupportsCouponCode("marching-band"), false);
    assert.equal(formSupportsCouponCode("sports-entertainment"), false);
  });

  it("detail sections include couponCode only for applicable forms", () => {
    const withCoupon = [
      baseOrder({ formType: "school-all-star-cheer", cheerFormSubtype: "all-star-cheer" }),
      baseOrder({ formType: "school-all-star-dance", danceFormSubtype: "pom" }),
      baseOrder({ formType: "school-anthem" }),
    ];
    for (const order of withCoupon) {
      const keys = getOrderDetailSections(order)
        .flatMap((s) => s.fields)
        .map((f) => f.key);
      assert.ok(
        keys.includes("couponCode"),
        `${order.formType} should expose couponCode in detail sections`
      );
    }

    const withoutCoupon = [
      baseOrder({ formType: "marching-band" }),
      baseOrder({ formType: "sports-entertainment" }),
    ];
    for (const order of withoutCoupon) {
      const keys = getOrderDetailSections(order)
        .flatMap((s) => s.fields)
        .map((f) => f.key);
      assert.ok(
        !keys.includes("couponCode"),
        `${order.formType} must not expose couponCode in detail sections`
      );
    }
  });
});
