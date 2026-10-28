import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getOrderFormFieldsBlockingMtd,
  isOptionalOrderFormField,
} from "../order-form-missing";
import { normalizeOrder } from "../order-form";
import type { Order } from "../../types";

function sportsEnt(overrides: Partial<Order> = {}): Order {
  return normalizeOrder({
    id: "se-mtd-1",
    formType: "sports-entertainment",
    status: "new",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as Order);
}

describe("Sports Entertainment Move-to-MTD form gate", () => {
  it("billing contact optional; due date, rush, songs, notes required", () => {
    const order = sportsEnt();
    assert.equal(isOptionalOrderFormField("billingContactName", order), true);
    assert.equal(isOptionalOrderFormField("billingContactEmail", order), true);
    assert.equal(isOptionalOrderFormField("clientRequestedMixDueDate", order), false);
    assert.equal(isOptionalOrderFormField("clientRequestedRushOrder", order), false);
    assert.equal(isOptionalOrderFormField("customerSongs", order), false);
    assert.equal(isOptionalOrderFormField("additionalNotes", order), false);
    assert.equal(isOptionalOrderFormField("musicContactPhone", order), false);
  });

  it("does not block on empty billing contact when other Magento fields are filled", () => {
    const gaps = getOrderFormFieldsBlockingMtd(
      sportsEnt({
        organizationName: "Austin Arena",
        organizationBillingAddress: "500 Center Court",
        city: "Austin",
        stateProvince: "TX",
        zipPostalCode: "78701",
        country: "United States",
        musicContactName: "Vince",
        musicContactPhone: "555-0100",
        musicContactEmail: "vince@arena.com",
        billingContactName: "",
        billingContactEmail: "",
        packageType: "PRE-GAME / HALFTIME REMIXED",
        clientRequestedMixDueDate: "2026-11-15",
        clientRequestedRushOrder: "No",
        timeLengthOfMix: "2:00",
        customerSongs: "Eye of the Tiger",
        additionalNotes: "Crowd hypes",
      })
    );
    assert.deepEqual(
      gaps.map((g) => g.key),
      [],
      `unexpected gaps: ${gaps.map((g) => g.key).join(", ")}`
    );
  });

  it("blocks empty rush / songs / additional notes", () => {
    const gaps = getOrderFormFieldsBlockingMtd(
      sportsEnt({
        organizationName: "Austin Arena",
        organizationBillingAddress: "500 Center Court",
        city: "Austin",
        stateProvince: "TX",
        zipPostalCode: "78701",
        country: "United States",
        musicContactName: "Vince",
        musicContactPhone: "555-0100",
        musicContactEmail: "vince@arena.com",
        packageType: "PRE-GAME / HALFTIME REMIXED",
        clientRequestedMixDueDate: "2026-11-15",
        clientRequestedRushOrder: "",
        timeLengthOfMix: "2:00",
        customerSongs: "",
        additionalNotes: "",
      })
    );
    const keys = gaps.map((g) => g.key);
    assert.ok(keys.includes("clientRequestedRushOrder"));
    assert.ok(keys.includes("customerSongs"));
    assert.ok(keys.includes("additionalNotes"));
    assert.ok(!keys.includes("billingContactName"));
  });
});
