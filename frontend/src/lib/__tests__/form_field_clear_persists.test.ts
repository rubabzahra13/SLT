import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeOrder } from "../order-form";
import { orderPatchFromOrderField } from "../mtd-order-sync";
import { mergeFormIntoManualOrder } from "../manual-form-merge";
import type { Order } from "../../types";

function baseViroc(overrides: Partial<Order> = {}): Order {
  return normalizeOrder({
    id: "ord-clear-1",
    formType: "school-all-star-cheer",
    cheerFormSubtype: "school-cheer-viroc-yes",
    schoolName: "Monument Valley High",
    coachName: "Coach Pat",
    billingPersonName: "Alex Rivera",
    billingContactName: "Alex Rivera",
    billingPersonEmail: "alex@school.edu",
    billingContactEmail: "alex@school.edu",
    teamColors: "Navy / Gold",
    mascot: "Mustangs",
    numberOfCopies: "3",
    packageType: "GOLD",
    timeLengthOfMix: "2:30",
    status: "new",
    createdAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  } as Order);
}

describe("Form field clears persist (alias SoT)", () => {
  it("clearing Billing Person name clears every billing-name alias on patch", () => {
    const current = baseViroc();
    const patch = orderPatchFromOrderField("billingPersonName", "", current);
    assert.equal(patch.billingPersonName, "");
    assert.equal(patch.billingContactName, "");
  });

  it("normalizeOrder does not revive a cleared billing name from a stale alias", () => {
    const cleared = normalizeOrder({
      ...baseViroc(),
      billingPersonName: "",
      // Stale sibling left behind (pre-sync bug shape).
      billingContactName: "Alex Rivera",
    } as Order);
    assert.equal(cleared.billingPersonName, "");
    assert.equal(cleared.billingContactName, "");
  });

  it("normalizeOrder does not revive cleared billing email / colors / choreographer", () => {
    const cleared = normalizeOrder({
      ...baseViroc(),
      billingPersonEmail: "",
      billingContactEmail: "alex@school.edu",
      teamColors: "",
      youthRecColors: "Navy / Gold",
      choreographerName: "",
      virocChoreographerName: "Chris Choreo",
    } as Order);
    assert.equal(cleared.billingPersonEmail, "");
    assert.equal(cleared.billingContactEmail, "");
    assert.equal(cleared.teamColors, "");
    assert.equal(cleared.youthRecColors, "");
    assert.equal(cleared.choreographerName, "");
    assert.equal(cleared.virocChoreographerName, "");
  });

  it("patch + normalize round-trip keeps Billing Person cleared", () => {
    const current = baseViroc();
    const patch = orderPatchFromOrderField("billingPersonName", "", current);
    const saved = normalizeOrder({ ...current, ...patch } as Order);
    assert.equal(saved.billingPersonName, "");
    assert.equal(saved.billingContactName, "");
  });

  it("soft merge does not refill billing name after linked form was cleared", () => {
    const manual = baseViroc({
      id: "manual-1",
      isManualEntry: true,
      billingPersonName: "",
      billingContactName: "",
      mergedFormOrderId: "form-1",
      manualOverlapSnapshot: { city: "" },
    });
    const form = baseViroc({
      id: "form-1",
      isManualEntry: false,
      billingPersonName: "",
      billingContactName: "",
      mergedIntoManualOrderId: "manual-1",
    });
    const soft = mergeFormIntoManualOrder(manual, form);
    assert.equal(soft.billingPersonName, "");
    assert.equal(soft.billingContactName, "");
  });

  it("clearing coach name clears every coach-name alias on patch", () => {
    const current = baseViroc();
    const patch = orderPatchFromOrderField("coachName", "", current);
    assert.equal(patch.coachName, "");
    assert.equal(patch.coachContactFullName, "");
    assert.equal(patch.musicContactName, "");
    assert.equal(patch.contactName, "");
    assert.equal(patch.customerName, "");
  });
});
