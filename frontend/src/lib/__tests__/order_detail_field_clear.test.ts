import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  coalesceFieldAliases,
  rawFieldValue,
} from "../order-detail-fields";
import { orderPatchFromOrderField } from "../mtd-order-sync";
import type { Order } from "../../types";

describe("Add Order / form fields — clearable inputs", () => {
  it("coalesceFieldAliases treats explicit empty as intentional", () => {
    assert.equal(coalesceFieldAliases("", "fallback"), "");
    assert.equal(coalesceFieldAliases(undefined, "fallback"), "fallback");
    assert.equal(coalesceFieldAliases(null, undefined, "hi"), "hi");
  });

  it("clearing School/Organization Name does not snap back via aliases", () => {
    const typed = orderPatchFromOrderField(
      "schoolOrganizationName",
      "hi",
      { formType: "school-anthem" } as Order
    );
    const afterType = { formType: "school-anthem", ...typed } as Order;
    assert.equal(rawFieldValue(afterType, "schoolOrganizationName"), "hi");

    const cleared = orderPatchFromOrderField(
      "schoolOrganizationName",
      "",
      afterType
    );
    const afterClear = { ...afterType, ...cleared } as Order;
    assert.equal(rawFieldValue(afterClear, "schoolOrganizationName"), "");
    assert.equal(rawFieldValue(afterClear, "organizationName"), "");
    assert.equal(rawFieldValue(afterClear, "schoolName"), "");
  });

  it("clearing Music Contact Name does not fall through to coach aliases", () => {
    const typed = orderPatchFromOrderField(
      "musicContactName",
      "hi",
      { formType: "school-anthem" } as Order
    );
    const afterType = { formType: "school-anthem", ...typed } as Order;
    const cleared = orderPatchFromOrderField(
      "musicContactName",
      "",
      afterType
    );
    const afterClear = { ...afterType, ...cleared } as Order;
    assert.equal(rawFieldValue(afterClear, "musicContactName"), "");
    assert.equal(rawFieldValue(afterClear, "coachName"), "");
  });
});
