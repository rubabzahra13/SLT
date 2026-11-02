import type { Order } from "@/types";
import { isHeldOnAffiliateFlag } from "@/lib/affiliate-flag";
import {
  canPairMagentoFormWithManual,
  isMagentoFormOrder,
} from "@/lib/manual-form-merge";
import {
  MANUAL_FORM_MATCH_THRESHOLD,
  matchBasisFieldLabel,
  matchIdentityContactValues,
  scoreManualFormIdentityMatch,
} from "@/lib/manual-form-match-score";

/** Same threshold historically used by automatic name-merge. */
export const MANUAL_FORM_SUGGESTION_THRESHOLD = MANUAL_FORM_MATCH_THRESHOLD;

export function isUnmatchedMagentoForm(order: Order): boolean {
  return (
    isMagentoFormOrder(order) &&
    !order.mergedIntoManualOrderId &&
    !order.suppressManualFormMerge &&
    !isHeldOnAffiliateFlag(order)
  );
}

/** Manual still eligible to appear as a Match / pre-MTD suggestion target. */
export function isManualOpenForMatching(order: Order): boolean {
  return (
    Boolean(order.isManualEntry) &&
    !order.mergedFormOrderId &&
    !order.suppressManualFormMerge &&
    order.status !== "completed"
  );
}

export function isUnmatchedManualOrder(order: Order): boolean {
  // Hide manuals already on the MTD board from the Match Orders list, but
  // isManualOpenForMatching still allows pre-MTD soft-gate scoring when status
  // is stuck at in_mtd after a reassign race.
  return isManualOpenForMatching(order) && order.status !== "in_mtd";
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
  /** All-Star / Youth Rec: team match ranks above other identity/contact hits. */
  matchKind?: "team" | "identity";
  matchedFieldKey?: string;
};

export type MagentoFormSuggestion = {
  form: Order;
  identityName: string;
  score: number;
  matchKind?: "team" | "identity";
  matchedFieldKey?: string;
};

function sortByMatchRank<T extends { matchKind?: "team" | "identity"; score: number; identityName: string }>(
  suggestions: T[]
): T[] {
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

/**
 * Manual candidates for a Magento form (Suggested for You).
 * Pairs on gym/school, billing address, coach, billing person, V!ROC
 * choreographer, and (All-Star / Youth Rec) team name — never Mix fields.
 */
export function suggestManualsForMagento(
  form: Order,
  orders: Order[],
  threshold = MANUAL_FORM_SUGGESTION_THRESHOLD
): ManualFormSuggestion[] {
  if (!isUnmatchedMagentoForm(form)) return [];
  if (matchIdentityContactValues(form).length === 0) return [];

  const suggestions: ManualFormSuggestion[] = [];
  for (const candidate of orders) {
    if (!isUnmatchedManualOrder(candidate)) continue;
    if (!canPairMagentoFormWithManual(form, candidate)) continue;
    const hit = scoreManualFormIdentityMatch(form, candidate, threshold);
    if (hit) {
      suggestions.push({
        manual: candidate,
        identityName: hit.identityName,
        score: hit.score,
        matchKind: hit.matchKind,
        matchedFieldKey: hit.matchedFieldKey,
      });
    }
  }

  return sortByMatchRank(suggestions);
}

/**
 * Magento form candidates for a manual order (pre-MTD soft gate).
 * Same identity/contact pairing as suggestManualsForMagento.
 */
export function suggestFormsForManual(
  manual: Order,
  orders: Order[],
  threshold = MANUAL_FORM_SUGGESTION_THRESHOLD
): MagentoFormSuggestion[] {
  if (!isManualOpenForMatching(manual)) return [];
  if (matchIdentityContactValues(manual).length === 0) return [];

  const suggestions: MagentoFormSuggestion[] = [];
  for (const candidate of orders) {
    if (!isUnmatchedMagentoForm(candidate)) continue;
    if (!canPairMagentoFormWithManual(candidate, manual)) continue;
    const hit = scoreManualFormIdentityMatch(candidate, manual, threshold);
    if (hit) {
      suggestions.push({
        form: candidate,
        identityName: hit.identityName,
        score: hit.score,
        matchKind: hit.matchKind,
        matchedFieldKey: hit.matchedFieldKey,
      });
    }
  }

  return sortByMatchRank(suggestions);
}

/** Unified pre-MTD soft-gate candidates (form or manual lookalikes). */
export type MatchBeforeMtdCandidate = {
  order: Order;
  identityName: string;
  score: number;
  matchKind?: "team" | "identity";
  matchedFieldKey?: string;
  role: "form" | "manual";
};

/**
 * Lookalikes for whichever side of a Magento↔manual pair this order is on.
 */
export function matchCandidatesBeforeMtd(
  order: Order,
  orders: Order[]
): MatchBeforeMtdCandidate[] {
  if (isManualOpenForMatching(order)) {
    return suggestFormsForManual(order, orders).map((s) => ({
      order: s.form,
      identityName: s.identityName,
      score: s.score,
      matchKind: s.matchKind,
      matchedFieldKey: s.matchedFieldKey,
      role: "form" as const,
    }));
  }
  if (isUnmatchedMagentoForm(order)) {
    return suggestManualsForMagento(order, orders).map((s) => ({
      order: s.manual,
      identityName: s.identityName,
      score: s.score,
      matchKind: s.matchKind,
      matchedFieldKey: s.matchedFieldKey,
      role: "manual" as const,
    }));
  }
  return [];
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

/** e.g. Matched on Gym Name: "Thunder Elite Cheer" */
export function suggestionMatchedOnLabel(
  identityName: string,
  matchedFieldKey?: string
): string {
  const name = identityName.trim() || "this order";
  const field = matchedFieldKey
    ? matchBasisFieldLabel(matchedFieldKey)
    : "Identity";
  return `Matched on ${field}: "${name}"`;
}
