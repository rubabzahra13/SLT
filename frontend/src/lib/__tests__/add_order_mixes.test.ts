import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addOrderDraftHasContent,
  applyMixFieldValues,
  getAddOrderMultiMixFieldKeys,
  isAddOrderPerMixFieldKey,
  MAX_ADD_ORDER_MIXES,
  orderWithoutMixFields,
  supportsAddOrderMultiMix,
} from "../add-order-mixes";
import type { Order } from "../../types";

function baseOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "o1",
    customerName: "",
    contactName: "",
    programName: "",
    category: "All Star Cheer",
    package: "",
    musicTheme: "",
    editorRequest: "FA",
    requestedProducer: "",
    price: 0,
    status: "new",
    createdAt: new Date().toISOString(),
    needsAttention: false,
    attentionReason: null,
    formType: "school-all-star-cheer",
    cheerFormSubtype: "all-star-cheer",
    isManualEntry: true,
    ...overrides,
  } as Order;
}

describe("add-order-mixes", () => {
  it("cheer and dance support multi-mix; other forms do not", () => {
    assert.equal(supportsAddOrderMultiMix(baseOrder()), true);
    assert.equal(
      supportsAddOrderMultiMix(
        baseOrder({
          formType: "school-all-star-dance",
          danceFormSubtype: "pom",
          cheerFormSubtype: undefined,
        })
      ),
      true
    );
    assert.equal(
      supportsAddOrderMultiMix(baseOrder({ formType: "school-anthem" })),
      false
    );
  });

  it("All Star cheer: editor, division, team, package, length", () => {
    assert.equal(isAddOrderPerMixFieldKey("musicAffiliate"), false);
    assert.deepEqual(getAddOrderMultiMixFieldKeys(baseOrder()), [
      "requestedEditor",
      "division",
      "teamName",
      "packageType",
      "timeLengthOfMix",
    ]);
  });

  it("VIROC omits teamName (not on Team/Mix sections)", () => {
    const viroc = baseOrder({ cheerFormSubtype: "school-cheer-viroc-yes" });
    assert.deepEqual(getAddOrderMultiMixFieldKeys(viroc), [
      "requestedEditor",
      "division",
      "packageType",
      "timeLengthOfMix",
    ]);
  });

  it("Youth Rec: Team Name is per-mix (even though Magento puts it on Program)", () => {
    const youth = baseOrder({ cheerFormSubtype: "youth-rec-cheer" });
    assert.deepEqual(getAddOrderMultiMixFieldKeys(youth), [
      "teamName",
      "packageType",
      "timeLengthOfMix",
    ]);
  });

  it("POM dance: package + editor only (no style / date on form)", () => {
    const pom = baseOrder({
      formType: "school-all-star-dance",
      danceFormSubtype: "pom",
      cheerFormSubtype: undefined,
      category: "All Star Dance",
    });
    assert.deepEqual(getAddOrderMultiMixFieldKeys(pom), [
      "packageType",
      "requestedEditor",
    ]);
  });

  it("TPV dance includes style when on form; still no invented date", () => {
    const tpv = baseOrder({
      formType: "school-all-star-dance",
      danceFormSubtype: "team-performance-variety",
      cheerFormSubtype: undefined,
      category: "All Star Dance",
    });
    const keys = getAddOrderMultiMixFieldKeys(tpv);
    assert.ok(keys.includes("style"));
    assert.ok(keys.includes("packageType"));
    assert.ok(keys.includes("requestedEditor"));
    assert.ok(!keys.includes("mixEndDate"));
  });

  it("Gameday dance uses styleOfGamedayMix, not style", () => {
    const gameday = baseOrder({
      formType: "school-all-star-dance",
      danceFormSubtype: "gameday",
      cheerFormSubtype: undefined,
      category: "All Star Dance",
    });
    const keys = getAddOrderMultiMixFieldKeys(gameday);
    assert.ok(keys.includes("styleOfGamedayMix"));
    assert.ok(!keys.includes("style"));
    assert.ok(!keys.includes("mixEndDate"));
  });

  it("caps at 10 mixes", () => {
    assert.equal(MAX_ADD_ORDER_MIXES, 10);
  });

  it("shared affiliate stays on base when applying a mix slot", () => {
    const order = baseOrder({
      musicAffiliate: "Power Music",
      routineNotes: "Shared notes",
      gymName: "Thunder",
    });
    const keys = getAddOrderMultiMixFieldKeys(order);
    const shared = orderWithoutMixFields(order, keys);
    const full = applyMixFieldValues(shared, {
      teamName: "Team A",
      packageType: "GOLD",
      timeLengthOfMix: "2:30",
    });
    assert.equal(full.musicAffiliate, "Power Music");
    assert.equal(full.routineNotes, "Shared notes");
    assert.equal(full.gymName, "Thunder");
    assert.equal(full.teamName, "Team A");
    assert.equal(full.packageType, "GOLD");
  });

  it("content rule: shared gym name unlocks save", () => {
    const order = baseOrder({ gymName: "Thunder Elite" });
    const keys = getAddOrderMultiMixFieldKeys(order);
    assert.equal(addOrderDraftHasContent(order, [{}], keys), true);
  });

  it("content rule: per-mix package unlocks save", () => {
    const order = baseOrder();
    const keys = getAddOrderMultiMixFieldKeys(order);
    assert.equal(
      addOrderDraftHasContent(order, [{ packageType: "GOLD" }], keys),
      true
    );
  });

  it("content rule: First Available alone does not unlock save", () => {
    const order = baseOrder();
    const keys = getAddOrderMultiMixFieldKeys(order);
    assert.equal(
      addOrderDraftHasContent(
        order,
        [{ requestedEditor: "First Available" }],
        keys
      ),
      false
    );
  });
});
