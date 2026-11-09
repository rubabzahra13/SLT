import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  incomingOrderBellEvent,
  isMatchOrdersPageOpen,
  listMatchSuggestionBellEvents,
  matchOrdersConfirmHref,
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
    assert.equal(event.manualId, "m1");
    assert.equal(event.notification.type, "match_suggestion");
    assert.equal(
      event.notification.href,
      "/orders/match?form=f1&manual=m1&confirm=1"
    );
    assert.match(event.notification.message, /Thunder Gym/);
    assert.equal(event.notification.dedupeKey, "match_suggestion:f1");
    assert.equal(
      matchOrdersConfirmHref(event.formId, event.manualId),
      "/orders/match?form=f1&manual=m1&confirm=1"
    );
  });

  it("notifies for gym/program identity match when teams differ", () => {
    const form = baseOrder({
      id: "f1",
      gymName: "Spirit Elite",
      programName: "Spirit Elite",
      teamName: "Open",
    });
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      gymName: "Spirit Elite",
      programName: "Spirit Elite",
      teamName: "Elite",
    });
    const event = incomingOrderBellEvent(form, [form, manual]);
    assert.equal(event.kind, "match_suggestion");
    if (event.kind !== "match_suggestion") return;
    assert.match(event.notification.message, /Matched on Gym Name/);
    assert.match(event.notification.message, /Spirit Elite/);
  });

  it("notifies for coach email match when gym names differ", () => {
    const form = baseOrder({
      id: "f1",
      gymName: "Alpha Gym",
      programName: "Alpha Gym",
      coachEmail: "coach@wowza.test",
    });
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      gymName: "Beta Gym",
      programName: "Beta Gym",
      coachEmail: "coach@wowza.test",
    });
    const event = incomingOrderBellEvent(form, [form, manual]);
    assert.equal(event.kind, "match_suggestion");
    if (event.kind !== "match_suggestion") return;
    assert.match(event.notification.message, /Matched on Coach Email/);
  });

  it("notifies for team-only match", () => {
    const form = baseOrder({
      id: "f1",
      gymName: "",
      programName: "",
      teamName: "Nabeeha Test Manual 7AM 9 NOV 2",
    });
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      gymName: "",
      programName: "",
      teamName: "Nabeeha Test Manual 7AM 9 NOV 2",
    });
    const event = incomingOrderBellEvent(form, [form, manual]);
    assert.equal(event.kind, "match_suggestion");
    if (event.kind !== "match_suggestion") return;
    assert.match(event.notification.message, /Matched on Team Name/);
  });

  it("lists match bells for reconcile after bootstrap / SSE race", () => {
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
    const other = baseOrder({
      id: "f2",
      gymName: "No Match Gym",
      programName: "No Match Gym",
    });
    const events = listMatchSuggestionBellEvents([form, manual, other]);
    assert.equal(events.length, 1);
    assert.equal(events[0].formId, "f1");
    assert.equal(events[0].manualId, "m1");
    assert.equal(events[0].notification.type, "match_suggestion");
  });

  it("after Flagged release, suggests match like a single-affiliate form", () => {
    const form = baseOrder({
      id: "f1",
      gymName: "Thunder Gym",
      programName: "Thunder Gym",
      affiliateFlagStatus: "released",
      musicAffiliate: "Power Music Covers",
      musicAffiliateSelections: "Power Music Covers, Unleash the Beats Covers",
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
    assert.equal(event.manualId, "m1");
  });

  it("notifies new_order for a Magento form with no suggested manual", () => {
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
    const event = incomingOrderBellEvent(form, [form, manual]);
    assert.equal(event.kind, "new_order");
    if (event.kind !== "new_order") return;
    assert.equal(event.notification.type, "new_order");
    assert.equal(event.notification.href, "/orders");
    assert.equal(event.notification.dedupeKey, "new_order:f1");
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

  it("payload names the suggested identity and matched field", () => {
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
        matchedFieldKey: "gymName",
      },
    ]);
    assert.equal(payload.title, "New form matches a manual");
    assert.match(payload.message, /Spirit Elite/);
    assert.match(payload.message, /Matched on Gym Name/);
    assert.equal(
      payload.href,
      "/orders/match?form=f1&manual=m1&confirm=1"
    );
  });

  it("match page open flag can be toggled", () => {
    setMatchOrdersPageOpen(true);
    assert.equal(isMatchOrdersPageOpen(), true);
    setMatchOrdersPageOpen(false);
    assert.equal(isMatchOrdersPageOpen(), false);
  });
});
