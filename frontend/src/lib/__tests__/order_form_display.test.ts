import { describe, it } from "node:test";
import assert from "node:assert";
import { resolveOrderFormDisplay } from "../order-form-display";
import { getOrderDetailSections } from "../order-detail-sections";
import type { Order } from "../../types";

function base(overrides: Partial<Order>): Order {
  return {
    id: "o1",
    customerName: "",
    contactName: "",
    programName: "Monument Valley",
    category: "School Anthem",
    package: "SCHOOL ANTHEMS",
    musicTheme: "",
    editorRequest: "FA",
    requestedProducer: "",
    price: 1250,
    status: "new",
    createdAt: "2026-10-01",
    needsAttention: true,
    attentionReason: null,
    formType: "school-anthem",
    ...overrides,
  };
}

describe("resolveOrderFormDisplay", () => {
  it("keeps School Anthem sections even when MTD row has stale dance subtype", () => {
    const order = base({
      formType: "school-anthem",
      schoolOrganizationName: "Monument Valley High",
    });
    const display = resolveOrderFormDisplay(order, {
      cheerFormSubtype: "all-star-cheer",
      danceFormSubtype: "pom",
    });
    assert.equal(display.formType, "school-anthem");
    const keys = getOrderDetailSections(display).flatMap((s) =>
      s.fields.map((f) => f.key)
    );
    assert.ok(keys.includes("schoolOrganizationName"));
    assert.ok(keys.includes("vocalsPreference"));
    assert.ok(!keys.includes("packageType"));
    assert.ok(!keys.includes("requestedEditor"));
    assert.ok(!keys.includes("timeLengthOfMix"));
  });

  it("does not let viroc record subtype rewrite School Anthem into Cheer", () => {
    const display = resolveOrderFormDisplay(base({}), {
      cheerFormSubtype: "school-cheer-viroc-yes",
      danceFormSubtype: "pom",
    });
    assert.equal(display.formType, "school-anthem");
    assert.equal(display.cheerFormSubtype, undefined);
  });
});
