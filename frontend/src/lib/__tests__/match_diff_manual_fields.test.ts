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

  it("treats FA and First Available as the same requested editor", () => {
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      requestedEditor: "First Available",
    });
    const form = baseOrder({
      id: "f1",
      isManualEntry: false,
      requestedEditor: "FA",
      editorRequest: "FA",
    });
    const rows = buildMatchDiffRows(manual, form);
    const editor = rows.find((r) => r.key === "requestedEditor");
    assert.ok(editor, "requestedEditor row");
    assert.equal(editor?.differs, false);
    assert.equal(editor?.willOverwrite, false);
    assert.equal(editor?.manualValue, "First Available");
    assert.equal(editor?.formValue, "First Available");
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

  it("greens all pairing fields when only spacing / case / symbols differ", () => {
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      gymName: "ThunderElite!",
      teamName: "Senior Black",
      gymBillingAddress: "100 Main St., #2",
      coachName: "O'Brien, Kim",
      coachPhone: "512-555-0100",
      coachEmail: "Kim@Example.COM",
      billingPersonName: "Pat Lee",
    });
    const form = baseOrder({
      id: "f1",
      isManualEntry: false,
      gymName: "Thunder Elite",
      teamName: "SeniorBlack",
      gymBillingAddress: "100 Main St #2",
      coachName: "obrien kim",
      coachPhone: "(512) 555 0100",
      coachEmail: "kim@example.com",
      billingPersonName: "Pat  Lee",
    });
    const rows = buildMatchDiffRows(manual, form);
    for (const key of [
      "gymName",
      "teamName",
      "gymBillingAddress",
      "coachName",
      "coachPhone",
      "coachEmail",
      "billingPersonName",
    ]) {
      const row = rows.find((r) => r.key === key);
      assert.ok(row, key);
      assert.equal(row?.matches, true, `${key} should match`);
      assert.equal(row?.differs, false, `${key} should not differ`);
      assert.equal(row?.willOverwrite, false, `${key} should not overwrite`);
    }
  });
});
