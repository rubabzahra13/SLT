import type { Order } from "@/types";
import { getOrderIdentityName } from "@/lib/order-detail-sections";
import {
  canMergeMagentoFormIntoManual,
  isMagentoFormOrder,
} from "@/lib/manual-form-merge";
import { programNameSimilarity } from "@/lib/program-similarity";

/** Same threshold historically used by automatic name-merge. */
export const MANUAL_FORM_SUGGESTION_THRESHOLD = 0.9;

export function isUnmatchedMagentoForm(order: Order): boolean {
  return (
    isMagentoFormOrder(order) &&
    !order.mergedIntoManualOrderId &&
    !order.suppressManualFormMerge
  );
}

export function isUnmatchedManualOrder(order: Order): boolean {
  return (
    Boolean(order.isManualEntry) &&
    !order.mergedFormOrderId &&
    !order.suppressManualFormMerge &&
    order.status !== "completed" &&
    order.status !== "in_mtd"
  );
}

export function listUnmatchedMagentoForms(orders: Order[]): Order[] {
  return orders.filter(isUnmatchedMagentoForm);
}

export function listUnmatchedManualOrders(orders: Order[]): Order[] {
  return orders.filter(isUnmatchedManualOrder);
}

export type ManualFormSuggestion = {
  manual: Order;
  identityName: string;
  score: number;
};

/**
 * Manual candidates for a Magento form — only when both identity names are
 * filled and similarity ≥ threshold, same category/subtype rules as merge.
 */
export function suggestManualsForMagento(
  form: Order,
  orders: Order[],
  threshold = MANUAL_FORM_SUGGESTION_THRESHOLD
): ManualFormSuggestion[] {
  if (!isUnmatchedMagentoForm(form)) return [];
  const formIdentity = getOrderIdentityName(form).trim();
  if (!formIdentity) return [];

  const suggestions: ManualFormSuggestion[] = [];
  for (const candidate of orders) {
    if (!isUnmatchedManualOrder(candidate)) continue;
    if (!canMergeMagentoFormIntoManual(form, candidate)) continue;
    const manualIdentity = getOrderIdentityName(candidate).trim();
    if (!manualIdentity) continue;
    const score = programNameSimilarity(formIdentity, manualIdentity);
    if (score >= threshold) {
      suggestions.push({
        manual: candidate,
        identityName: manualIdentity,
        score,
      });
    }
  }

  suggestions.sort((a, b) => b.score - a.score || a.identityName.localeCompare(b.identityName));
  return suggestions;
}

/** Magento forms that have at least one identity-similar unmatched manual. */
export function countMagentoFormsWithSuggestions(orders: Order[]): number {
  let count = 0;
  for (const form of listUnmatchedMagentoForms(orders)) {
    if (suggestManualsForMagento(form, orders).length > 0) count += 1;
  }
  return count;
}

export function suggestionLinkLabel(identityName: string): string {
  const name = identityName.trim() || "this order";
  return `matches "${name}"`;
}
