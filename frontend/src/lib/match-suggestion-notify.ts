import type { AppNotification, Order } from "@/types";
import { isHeldOnAffiliateFlag } from "@/lib/affiliate-flag";
import { getOrderIdentityName } from "@/lib/order-detail-sections";
import {
  suggestManualsForMagento,
  suggestionMatchedOnLabel,
  type ManualFormSuggestion,
} from "@/lib/manual-form-suggestions";
export type IncomingOrderBell =
  | {
      kind: "flagged";
      notification: Omit<AppNotification, "id" | "read" | "createdAt">;
    }
  | {
      kind: "new_order";
      notification: Omit<AppNotification, "id" | "read" | "createdAt">;
    }
  | {
      kind: "match_suggestion";
      formId: string;
      /** Top Suggested-for-You manual (open Match Confirm with this pair). */
      manualId: string;
      notification: Omit<AppNotification, "id" | "read" | "createdAt">;
    }
  | { kind: "none" };

export type MatchSuggestionPair = {
  formId: string;
  manualId: string;
};

/** Deep-link Match Orders and open Confirm for a Magento↔manual pair. */
export function matchOrdersConfirmHref(
  formId: string,
  manualId: string
): string {
  const params = new URLSearchParams({
    form: String(formId || "").trim(),
    manual: String(manualId || "").trim(),
    confirm: "1",
  });
  return `/orders/match?${params.toString()}`;
}

let matchOrdersPageOpen = false;

export function setMatchOrdersPageOpen(open: boolean): void {
  matchOrdersPageOpen = open;
}

export function isMatchOrdersPageOpen(): boolean {
  return matchOrdersPageOpen;
}

function orderNotifyLabel(order: Order): string {
  return (
    getOrderIdentityName(order).trim() ||
    order.programName ||
    order.gymName ||
    "Order"
  );
}

function orderCustomerLabel(order: Order): string {
  return order.contactName || order.customerName || "Customer";
}

export function matchSuggestionNotificationPayload(
  form: Order,
  suggestions: ManualFormSuggestion[]
): Omit<AppNotification, "id" | "read" | "createdAt"> {
  const formName = orderNotifyLabel(form);
  const top = suggestions[0];
  const extra =
    suggestions.length > 1 ? ` (+${suggestions.length - 1} more)` : "";
  const matchName = top?.identityName?.trim() || "a manual order";
  const matchedOn = suggestionMatchedOnLabel(
    matchName,
    top?.matchedFieldKey
  );
  const manualId = top?.manual?.id || "";
  return {
    type: "match_suggestion",
    title: "New form matches a manual",
    message: `${formName} · ${matchedOn}${extra}`,
    href: manualId
      ? matchOrdersConfirmHref(form.id, manualId)
      : "/orders/match",
    dedupeKey: `match_suggestion:${form.id}`,
  };
}

export type MatchSuggestionBellEvent = {
  formId: string;
  manualId: string;
  notification: Omit<AppNotification, "id" | "read" | "createdAt">;
};

/**
 * Every unmatched Magento form that currently has a Suggested-for-You manual.
 * Used to catch match bells after bootstrap / SSE races (empty catalog on first paint).
 */
export function listMatchSuggestionBellEvents(
  orders: Order[]
): MatchSuggestionBellEvent[] {
  const events: MatchSuggestionBellEvent[] = [];
  const seen = new Set<string>();
  for (const form of orders) {
    const formId = String(form.id || "").trim();
    if (!formId || seen.has(formId)) continue;
    if (form.isManualEntry) continue;
    const suggestions = suggestManualsForMagento(form, orders);
    if (suggestions.length === 0) continue;
    seen.add(formId);
    const top = suggestions[0];
    events.push({
      formId,
      manualId: top.manual.id,
      notification: matchSuggestionNotificationPayload(form, suggestions),
    });
  }
  return events;
}

/**
 * Incoming Magento/manual bell: Flagged first, then Suggested for You,
 * then a plain new-order bell for Magento forms with no suggested match
 * (including poll-imported WebForms submissions).
 */
export function incomingOrderBellEvent(
  stamped: Order,
  catalog: Order[]
): IncomingOrderBell {
  if (isHeldOnAffiliateFlag(stamped)) {
    return {
      kind: "flagged",
      notification: {
        type: "flagged_order",
        title: "Order flagged - multiple affiliates",
        message: `${orderNotifyLabel(stamped)} · ${orderCustomerLabel(stamped)}`,
        href: "/orders/flagged",
        dedupeKey: `flagged_order:${stamped.id}`,
      },
    };
  }
  if (stamped.isManualEntry) {
    return {
      kind: "new_order",
      notification: {
        type: "new_order",
        title: "New order received",
        message: `${orderNotifyLabel(stamped)} · ${orderCustomerLabel(stamped)}`,
        href: "/orders",
      },
    };
  }
  const suggestions = suggestManualsForMagento(stamped, catalog);
  if (suggestions.length > 0) {
    return {
      kind: "match_suggestion",
      formId: stamped.id,
      manualId: suggestions[0].manual.id,
      notification: matchSuggestionNotificationPayload(stamped, suggestions),
    };
  }
  return {
    kind: "new_order",
    notification: {
      type: "new_order",
      title: "New Magento form received",
      message: `${orderNotifyLabel(stamped)} · ${orderCustomerLabel(stamped)}`,
      href: "/orders",
      dedupeKey: `new_order:${stamped.id}`,
    },
  };
}
