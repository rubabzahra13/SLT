import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildMatchDiffRows } from "../manual-form-merge";
import type { Order } from "@/types";

function baseOrder(overrides: Partial<Order>): Order {
  return {
    id: "x",
    formType: "school-all-star-cheer",
    cheerFormSubtype: "all-star-cheer",
    status: "new",
    programName: "hello guys",
    packageType: "TBD",
    timeLengthOfMix: "1:00",
    ...overrides,
  } as Order;
}

describe("buildMatchDiffRows for unmatched manuals", () => {
  it("lists the full Magento field set, including Magento-only fields", () => {
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      mergedFormOrderId: undefined,
      gymBillingAddress: "",
    });
    const form = baseOrder({
      id: "f1",
      isManualEntry: false,
      gymBillingAddress: "99 Match Test Lane",
      city: "Austin",
      stateProvince: "TX",
      zipPostalCode: "78701",
      songListSuggestions: "Song A",
      packageType: "Gold",
      timeLengthOfMix: "2:00",
    });

    const rows = buildMatchDiffRows(manual, form);
    const keys = rows.map((r) => r.key);

    assert.ok(keys.includes("packageType") || keys.includes("timeLengthOfMix"));
    assert.ok(keys.includes("city"), "city must appear before match");
    assert.ok(
      keys.includes("songListSuggestions"),
      "songs must appear before match"
    );

    const billing = rows.find((r) => r.key === "gymBillingAddress");
    if (billing) {
      assert.equal(billing.formValue, "99 Match Test Lane");
      assert.equal(billing.manualValue, "-");
    }

    const city = rows.find((r) => r.key === "city");
    assert.equal(city?.formValue, "Austin");
    assert.equal(city?.manualValue, "-");
  });

  it("shows full Magento field set after the manual is already matched", () => {
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      mergedFormOrderId: "f1",
    });
    const form = baseOrder({
      id: "f1",
      isManualEntry: false,
      city: "Austin",
      songListSuggestions: "Song A",
    });
    const rows = buildMatchDiffRows(manual, form);
    assert.ok(rows.some((r) => r.key === "city" || r.key === "songListSuggestions"));
  });

  it("greens only pairing-basis fields that agree (not country/ZIP)", () => {
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      country: "United States",
      gymName: "Spirit Athletics",
      coachEmail: "same@example.com",
    });
    const form = baseOrder({
      id: "f1",
      isManualEntry: false,
      country: "United States",
      gymName: "Spirit Athletics",
      coachEmail: "same@example.com",
    });
    const rows = buildMatchDiffRows(manual, form);
    assert.equal(rows.find((r) => r.key === "country")?.matches, false);
    assert.equal(rows.find((r) => r.key === "gymName")?.matches, true);
    assert.equal(rows.find((r) => r.key === "coachEmail")?.matches, true);
  });

  it("greens gym/program when only casing differs", () => {
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      gymName: "thunder elite cheer",
      programName: "thunder elite cheer",
    });
    const form = baseOrder({
      id: "f1",
      isManualEntry: false,
      gymName: "Thunder Elite Cheer",
      programName: "Thunder Elite Cheer",
    });
    const rows = buildMatchDiffRows(manual, form);
    const gym = rows.find((r) => r.key === "gymName");
    assert.equal(gym?.matches, true);
    assert.equal(gym?.differs, false);
    assert.equal(gym?.willOverwrite, false);
  });
});
