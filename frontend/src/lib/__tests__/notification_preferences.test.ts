import { describe, it } from "node:test";
import assert from "node:assert";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isNotificationTypeEnabled,
  preferenceKeyForNotificationType,
} from "../notification-preferences";

describe("notification preferences", () => {
  it("maps each bell type to its toggle", () => {
    assert.equal(preferenceKeyForNotificationType("new_order"), "new_order");
    assert.equal(
      preferenceKeyForNotificationType("flagged_order"),
      "flagged_order"
    );
    assert.equal(
      preferenceKeyForNotificationType("leave_tomorrow"),
      "leave_tomorrow"
    );
    assert.equal(preferenceKeyForNotificationType("limit_full"), "limit_full");
    assert.equal(preferenceKeyForNotificationType("assignment"), null);
    assert.equal(preferenceKeyForNotificationType("gmail_connected"), "gmail");
    assert.equal(
      preferenceKeyForNotificationType("gmail_disconnected"),
      "gmail"
    );
  });

  it("respects toggles", () => {
    assert.equal(
      isNotificationTypeEnabled("new_order", {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        new_order: false,
      }),
      false
    );
    assert.equal(
      isNotificationTypeEnabled("gmail_connected", {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        gmail: false,
      }),
      false
    );
    assert.equal(
      isNotificationTypeEnabled("assignment", DEFAULT_NOTIFICATION_PREFERENCES),
      false
    );
  });
});
