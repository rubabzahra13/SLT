import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getOrderRequirements, mergeOrderFormFieldsForRequirements } from "../order-requirements";
import { mergeCollectionStateFromOrder, stagingRecordFromOrder } from "../order-staging";
import { recordIsRushOrder } from "../forward-order-mail";
import { orderPatchFromOrderField } from "../mtd-order-sync";
import type { MTDRecord, Order } from "../../types";

function seOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "se-order-1",
    formType: "sports-entertainment",
    category: "Sports Entertainment",
    packageType: "PRE-GAME / HALFTIME REMIXED",
    package: "PRE-GAME / HALFTIME REMIXED",
    timeLengthOfMix: "2:00",
    customerSongs: "Song A",
    additionalNotes: "Notes",
    clientRequestedRushOrder: "No",
    isRushOrder: "No",
    customerName: "Nabeeha",
    contactName: "Nabeeha",
    programName: "ABC Org",
    organizationName: "ABC Org",
    musicTheme: "",
    editorRequest: "FA",
    price: 250,
    status: "new",
    createdAt: "2026-10-16",
    needsAttention: false,
    isManualEntry: false,
    ...overrides,
  } as Order;
}

function mixState(order: Order | MTDRecord): string | undefined {
  return getOrderRequirements(order).collections.find((r) => r.id === "mix")?.state;
}

describe("Sports Entertainment Mix indicator", () => {
  it("is green when Time Length has data and red when cleared", () => {
    const filled = seOrder({ timeLengthOfMix: "2:00" });
    const cleared = seOrder({ timeLengthOfMix: "" });
    assert.equal(mixState(filled), "green");
    assert.equal(mixState(cleared), "red");
  });

  it("does not stay green from package time after Time Length is cleared", () => {
    const cleared = seOrder({
      timeLengthOfMix: "",
      package: "PRE-GAME / HALFTIME REMIXED 2:00",
      packageType: "PRE-GAME / HALFTIME REMIXED",
    });
    assert.equal(mixState(cleared), "red");
  });

  it("clears stale Mix collectionStates override when Time Length is edited empty", () => {
    const current = seOrder({
      timeLengthOfMix: "2:00",
      collectionStates: { mix: true },
    });
    const patch = orderPatchFromOrderField("timeLengthOfMix", "", current);
    const next = { ...current, ...patch };
    assert.equal(next.timeLengthOfMix, "");
    assert.equal(next.collectionStates?.mix, undefined);
    assert.equal(mixState(next), "red");
  });

  it("merge drops stale Mix override when linked order Time Length is empty", () => {
    const staging = stagingRecordFromOrder(
      seOrder({
        timeLengthOfMix: "2:00",
        collectionStates: { mix: true },
      })
    );
    const linked = seOrder({
      timeLengthOfMix: "",
      collectionStates: {},
    });
    const merged = mergeCollectionStateFromOrder(staging, linked);
    assert.equal(merged.timeLengthOfMix, "");
    assert.equal(merged.collectionStates?.mix, undefined);
    const forReqs = mergeOrderFormFieldsForRequirements(merged, linked);
    assert.equal(mixState(forReqs), "red");
  });

  it("turns green again when Time Length is repopulated", () => {
    const current = seOrder({ timeLengthOfMix: "" });
    const patch = orderPatchFromOrderField("timeLengthOfMix", "1:45", current);
    const next = { ...current, ...patch };
    assert.equal(mixState(next), "green");
  });
});

describe("Sports Entertainment Rush Order indicator", () => {
  it("follows clientRequestedRushOrder Yes/No over admin isRushOrder", () => {
    assert.equal(
      recordIsRushOrder(
        seOrder({
          clientRequestedRushOrder: "Yes",
          isRushOrder: "no",
        })
      ),
      true
    );
    assert.equal(
      recordIsRushOrder(
        seOrder({
          clientRequestedRushOrder: "No",
          isRushOrder: "yes",
        })
      ),
      false
    );
  });

  it("syncs isRushOrder when Magento rush field is edited", () => {
    const current = seOrder({
      clientRequestedRushOrder: "No",
      isRushOrder: "No",
    });
    const yesPatch = orderPatchFromOrderField(
      "clientRequestedRushOrder",
      "Yes",
      current
    );
    const yesNext = { ...current, ...yesPatch };
    assert.equal(yesNext.clientRequestedRushOrder, "Yes");
    assert.equal(yesNext.isRushOrder, "Yes");
    assert.equal(recordIsRushOrder(yesNext), true);

    const noPatch = orderPatchFromOrderField(
      "clientRequestedRushOrder",
      "No",
      yesNext
    );
    const noNext = { ...yesNext, ...noPatch };
    assert.equal(noNext.clientRequestedRushOrder, "No");
    assert.equal(noNext.isRushOrder, "No");
    assert.equal(recordIsRushOrder(noNext), false);
  });

  it("staging merge preserves client rush answer for board indicator", () => {
    const staging = stagingRecordFromOrder(
      seOrder({
        clientRequestedRushOrder: "No",
        isRushOrder: "No",
      })
    );
    const linked = seOrder({
      clientRequestedRushOrder: "Yes",
      isRushOrder: "Yes",
    });
    const merged = mergeCollectionStateFromOrder(staging, linked);
    const rushSource = {
      ...merged,
      ...linked,
      formType: linked.formType || merged.formType,
    };
    assert.equal(recordIsRushOrder(rushSource), true);
  });
});
