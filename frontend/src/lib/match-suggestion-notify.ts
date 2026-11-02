import type { AppNotification, Order } from "@/types";
import { isHeldOnAffiliateFlag } from "@/lib/affiliate-flag";
import { getOrderIdentityName } from "@/lib/order-detail-sections";
import {
  suggestManualsForMagento,
  type ManualFormSuggestion,
} from "@/lib/manual-form-suggestions";

const UNSEEN_MATCH_STORAGE_KEY = "slt_unseen_match_form_ids";

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
      notification: Omit<AppNotification, "id" | "read" | "createdAt">;
    }
  | { kind: "none" };

let matchOrdersPageOpen = false;

export function setMatchOrdersPageOpen(open: boolean): void {
  matchOrdersPageOpen = open;
}

export function isMatchOrdersPageOpen(): boolean {
  return matchOrdersPageOpen;
}

function sessionStore(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readUnseenMatchFormIds(): string[] {
  const store = sessionStore();
  if (!store) return [];
  try {
    const raw = store.getItem(UNSEEN_MATCH_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((id) => String(id || "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function writeUnseenMatchFormIds(ids: string[]): void {
  const store = sessionStore();
  if (!store) return;
  try {
    store.setItem(UNSEEN_MATCH_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota / private mode */
  }
}

export function addUnseenMatchFormId(
  id: string,
  prev: string[] = readUnseenMatchFormIds()
): string[] {
  const key = String(id || "").trim();
  if (!key || prev.includes(key)) return prev;
  const next = [...prev, key];
  writeUnseenMatchFormIds(next);
  return next;
}

export function clearUnseenMatchFormIds(): string[] {
  writeUnseenMatchFormIds([]);
  return [];
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
  return {
    type: "match_suggestion",
    title: "Suggested match found",
    message: `${formName} · ${matchName}${extra}`,
    href: "/orders/match",
    dedupeKey: `match_suggestion:${form.id}`,
  };
}

/**
 * Incoming Magento/manual bell: Flagged first, then Suggested for You.
 * Magento forms without a suggested manual do not create a bell item.
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
  if (suggestions.length === 0) return { kind: "none" };
  return {
    kind: "match_suggestion",
    formId: stamped.id,
    notification: matchSuggestionNotificationPayload(stamped, suggestions),
  };
}
