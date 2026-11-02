import type { Order } from "@/types";
import { getOrderIdentityName } from "@/lib/order-detail-sections";
import {
  cheerSubtypeHasTeamName,
  orderTeamName,
} from "@/lib/add-order-mixes";
import { isHeldOnAffiliateFlag } from "@/lib/affiliate-flag";
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
    !order.suppressManualFormMerge &&
    !isHeldOnAffiliateFlag(order)
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

function uniqueOrdersById(orders: Order[]): Order[] {
  const seen = new Set<string>();
  const out: Order[] = [];
  for (const o of orders) {
    const key = String(o.id || o.uuid || "").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(o);
  }
  return out;
}

export function listUnmatchedMagentoForms(orders: Order[]): Order[] {
  return uniqueOrdersById(orders.filter(isUnmatchedMagentoForm));
}

export function listUnmatchedManualOrders(orders: Order[]): Order[] {
  return uniqueOrdersById(orders.filter(isUnmatchedManualOrder));
}

export type ManualFormSuggestion = {
  manual: Order;
  identityName: string;
  score: number;
  /** All-Star / Youth Rec: team match ranks above gym/program match. */
  matchKind?: "team" | "identity";
};

function cheerSuggestionForPair(
  form: Order,
  manual: Order,
  threshold: number
): ManualFormSuggestion | null {
  const formIdentity = getOrderIdentityName(form).trim();
  const manualIdentity = getOrderIdentityName(manual).trim();
  const formTeam = orderTeamName(form);
  const manualTeam = orderTeamName(manual);

  const teamScore =
    formTeam && manualTeam
      ? programNameSimilarity(formTeam, manualTeam)
      : 0;
  const identityScore =
    formIdentity && manualIdentity
      ? programNameSimilarity(formIdentity, manualIdentity)
      : 0;

  // Team name on both sides: prefer team; still suggest if gym/program also matches.
  if (teamScore >= threshold) {
    return {
      manual,
      identityName: manualTeam,
      score: teamScore,
      matchKind: "team",
    };
  }
  if (identityScore >= threshold) {
    return {
      manual,
      identityName: manualIdentity,
      score: identityScore,
      matchKind: "identity",
    };
  }
  return null;
}

/**
 * Manual candidates for a Magento form (Suggested for You).
 * Default: first identity field on both sides (empty either side → no suggest).
 * All-Star Cheer / Youth Rec: team name on both sides wins; else gym/program.
 */
export function suggestManualsForMagento(
  form: Order,
  orders: Order[],
  threshold = MANUAL_FORM_SUGGESTION_THRESHOLD
): ManualFormSuggestion[] {
  if (!isUnmatchedMagentoForm(form)) return [];
  const teamMatch = cheerSubtypeHasTeamName(form);
  const formIdentity = getOrderIdentityName(form).trim();
  const formTeam = orderTeamName(form);
  if (!formIdentity && !(teamMatch && formTeam)) return [];

  const suggestions: ManualFormSuggestion[] = [];
  for (const candidate of orders) {
    if (!isUnmatchedManualOrder(candidate)) continue;
    if (!canMergeMagentoFormIntoManual(form, candidate)) continue;
    if (teamMatch) {
      const hit = cheerSuggestionForPair(form, candidate, threshold);
      if (hit) suggestions.push(hit);
      continue;
    }
    const manualIdentity = getOrderIdentityName(candidate).trim();
    if (!formIdentity || !manualIdentity) continue;
    const score = programNameSimilarity(formIdentity, manualIdentity);
    if (score >= threshold) {
      suggestions.push({
        manual: candidate,
        identityName: manualIdentity,
        score,
        matchKind: "identity",
      });
    }
  }

  suggestions.sort((a, b) => {
    const kindRank = (k?: "team" | "identity") => (k === "team" ? 0 : 1);
    return (
      kindRank(a.matchKind) - kindRank(b.matchKind) ||
      b.score - a.score ||
      a.identityName.localeCompare(b.identityName)
    );
  });
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
