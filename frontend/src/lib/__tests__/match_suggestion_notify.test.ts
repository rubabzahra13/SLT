import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addUnseenMatchFormId,
  clearUnseenMatchFormIds,
  incomingOrderBellEvent,
  isMatchOrdersPageOpen,
  matchSuggestionNotificationPayload,
  setMatchOrdersPageOpen,
} from "../match-suggestion-notify";
import type { Order } from "../../types";

function baseOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "o1",
    formType: "school-all-star-cheer",
    cheerFormSubtype: "all-star-cheer",
    isManualEntry: false,
    programName: "",
    gymName: "",
    status: "new",
    ...overrides,
  } as Order;
}

describe("incoming Magento match suggestion notify", () => {
  it("notifies flagged first and skips suggested match", () => {
    const form = baseOrder({
      id: "f1",
      gymName: "Thunder Gym",
      programName: "Thunder Gym",
      affiliateFlagStatus: "open",
      musicAffiliateSelections: "BMI, SESAC",
    });
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      gymName: "Thunder Gym",
      programName: "Thunder Gym",
    });
    const event = incomingOrderBellEvent(form, [form, manual]);
    assert.equal(event.kind, "flagged");
    if (event.kind !== "flagged") return;
    assert.equal(event.notification.type, "flagged_order");
    assert.equal(event.notification.href, "/orders/flagged");
  });

  it("notifies only when Suggested for You finds a manual", () => {
    const form = baseOrder({
      id: "f1",
      gymName: "Thunder Gym",
      programName: "Thunder Gym",
    });
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      gymName: "Thunder Gym",
      programName: "Thunder Gym",
    });
    const event = incomingOrderBellEvent(form, [form, manual]);
    assert.equal(event.kind, "match_suggestion");
    if (event.kind !== "match_suggestion") return;
    assert.equal(event.formId, "f1");
    assert.equal(event.notification.type, "match_suggestion");
    assert.equal(event.notification.href, "/orders/match");
    assert.match(event.notification.message, /Thunder Gym/);
    assert.equal(event.notification.dedupeKey, "match_suggestion:f1");
  });

  it("does not notify for a Magento form with no suggested manual", () => {
    const form = baseOrder({
      id: "f1",
      gymName: "Alpha Gym",
      programName: "Alpha Gym",
    });
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      gymName: "Beta Gym",
      programName: "Beta Gym",
    });
    assert.equal(incomingOrderBellEvent(form, [form, manual]).kind, "none");
  });

  it("still notifies new_order for a manual booking", () => {
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      gymName: "Thunder Gym",
      programName: "Thunder Gym",
    });
    const event = incomingOrderBellEvent(manual, [manual]);
    assert.equal(event.kind, "new_order");
    if (event.kind !== "new_order") return;
    assert.equal(event.notification.href, "/orders");
  });

  it("payload names the suggested identity", () => {
    const form = baseOrder({
      id: "f1",
      gymName: "Spirit Elite",
      programName: "Spirit Elite",
    });
    const payload = matchSuggestionNotificationPayload(form, [
      {
        manual: baseOrder({ id: "m1", isManualEntry: true }),
        identityName: "Spirit Elite",
        score: 1,
        matchKind: "identity",
      },
    ]);
    assert.equal(payload.title, "Suggested match found");
    assert.equal(payload.message, "Spirit Elite · Spirit Elite");
  });

  it("tracks unseen form ids until cleared", () => {
    const once = addUnseenMatchFormId("f1", []);
    assert.deepEqual(once, ["f1"]);
    const twice = addUnseenMatchFormId("f1", once);
    assert.deepEqual(twice, ["f1"]);
    const two = addUnseenMatchFormId("f2", once);
    assert.deepEqual(two, ["f1", "f2"]);
    assert.deepEqual(clearUnseenMatchFormIds(), []);
  });

  it("match page open flag can be toggled", () => {
    setMatchOrdersPageOpen(true);
    assert.equal(isMatchOrdersPageOpen(), true);
    setMatchOrdersPageOpen(false);
    assert.equal(isMatchOrdersPageOpen(), false);
  });
});
