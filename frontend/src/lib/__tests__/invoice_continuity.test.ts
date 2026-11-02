import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pickInvoice } from "../invoice";
import { orderPatchFromMTD } from "../mtd-order-sync";
import { mergeCollectionStateFromOrder, stagingRecordFromOrder } from "../order-staging";
import type { MTDRecord, Order } from "@/types";

describe("invoice continuity", () => {
  it("pickInvoice keeps the first non-empty value", () => {
    assert.equal(pickInvoice("", "  ", "INV-100", "INV-200"), "INV-100");
    assert.equal(pickInvoice(undefined, null, ""), "");
    assert.equal(pickInvoice("  INV-9  "), "INV-9");
  });

  it("orderPatchFromMTD mirrors invoice onto the Order locally", () => {
    const patch = orderPatchFromMTD({ invoice: "INV-55" });
    assert.equal(patch.invoice, "INV-55");
  });

  it("staging and merge never let empty wipe a set invoice", () => {
    const order = {
      id: "ord-1",
      uuid: "ord-1",
      formType: "school-all-star-cheer",
      category: "Cheer",
      package: "GOLD",
      programName: "Gym A",
      contactName: "Coach",
      invoice: "INV-42",
      status: "active",
    } as Order;

    const staged = stagingRecordFromOrder(order);
    assert.equal(staged.invoice, "INV-42");

    const thinMtd = {
      ...staged,
      invoice: "",
      id: "mtd-1",
      uuid: "mtd-1",
      orderId: "ord-1",
    } as MTDRecord;

    const merged = mergeCollectionStateFromOrder(thinMtd, order);
    assert.equal(merged.invoice, "INV-42");

    const boardHasIt = {
      ...thinMtd,
      invoice: "INV-42",
    } as MTDRecord;
    const orderEmpty = { ...order, invoice: "" } as Order;
    assert.equal(
      mergeCollectionStateFromOrder(boardHasIt, orderEmpty).invoice,
      "INV-42"
    );
  });

  it("MTD invoice edit wins over a stale Order mirror", () => {
    const order = {
      id: "ord-2",
      uuid: "ord-2",
      formType: "school-all-star-cheer",
      category: "Cheer",
      package: "GOLD",
      programName: "Gym B",
      contactName: "Coach",
      invoice: "123456",
      status: "in_mtd",
    } as Order;

    const boardEdited = {
      ...stagingRecordFromOrder(order),
      id: "mtd-2",
      uuid: "mtd-2",
      orderId: "ord-2",
      invoice: "999999",
      inMTD: true,
    } as MTDRecord;

    assert.equal(
      mergeCollectionStateFromOrder(boardEdited, order).invoice,
      "999999"
    );
  });
});
