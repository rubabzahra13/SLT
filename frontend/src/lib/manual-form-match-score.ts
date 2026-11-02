import type { Order } from "@/types";
import { getOrderIdentityName } from "@/lib/order-detail-sections";
import { rawFieldValue } from "@/lib/order-detail-fields";
import {
  cheerSubtypeHasTeamName,
  orderTeamName,
} from "@/lib/add-order-mixes";
import { programNameSimilarity } from "@/lib/program-similarity";

/** Same threshold historically used by automatic name-merge. */
export const MANUAL_FORM_MATCH_THRESHOLD = 0.9;

/**
 * Identity / contact fields used for Match pairing across all forms.
 * Mix Information (package, length, requested editor, choreography date,
 * division on the Add Order mix block, songs, notes, …) is intentionally
 * excluded — those values are often shared and must not drive pairing.
 */
const MATCH_IDENTITY_CONTACT_KEYS = [
  // Org / school / gym
  "gymName",
  "schoolName",
  "schoolProgramName",
  "schoolGymName",
  "programName",
  "organizationName",
  "schoolOrganizationName",
  // Billing / school-gym address (Marching Band uses schoolGymAddress)
  "gymBillingAddress",
  "schoolBillingAddress",
  "schoolGymBillingAddress",
  "schoolAddress",
  "schoolGymAddress",
  "youthRecBillingAddress",
  "organizationBillingAddress",
  // Coach / music contact
  "coachName",
  "coachContactFullName",
  "musicContactName",
  "contactName",
  "coachPhone",
  "coachEmail",
  // Billing person
  "billingPersonName",
  "billingPersonEmail",
  // V!ROC choreographer
  "choreographerName",
  "choreographerEmail",
  "virocChoreographerName",
  "virocChoreographerEmail",
] as const;

/** Keys that drive Suggested-for-You / pairing (green in Match compare). */
const MATCH_BASIS_KEYS = new Set<string>([
  ...MATCH_IDENTITY_CONTACT_KEYS,
  "teamName",
]);

/** True for fields used to suggest Magento↔manual pairs (not city/ZIP/Mix). */
export function isMatchBasisFieldKey(key: string): boolean {
  return MATCH_BASIS_KEYS.has(key);
}

const ORG_IDENTITY_KEYS = new Set<string>([
  "gymName",
  "schoolName",
  "schoolProgramName",
  "schoolGymName",
  "programName",
  "organizationName",
  "schoolOrganizationName",
]);

/** Billing address aliases — compare as one group across form types. */
const BILLING_ADDRESS_KEYS = new Set<string>([
  "gymBillingAddress",
  "schoolBillingAddress",
  "schoolGymBillingAddress",
  "schoolAddress",
  "schoolGymAddress",
  "youthRecBillingAddress",
  "organizationBillingAddress",
]);

const CONTACT_KEYS = new Set<string>([
  "coachName",
  "coachContactFullName",
  "musicContactName",
  "contactName",
  "coachPhone",
  "coachEmail",
  "billingPersonName",
  "billingPersonEmail",
  "choreographerName",
  "choreographerEmail",
  "virocChoreographerName",
  "virocChoreographerEmail",
]);

export type ManualFormMatchHit = {
  score: number;
  identityName: string;
  matchKind: "team" | "identity";
  /** Field key that won the pairing (e.g. teamName, programName, coachName). */
  matchedFieldKey: string;
};

/** Human label for the field that drove a Magento↔manual suggestion. */
export function matchBasisFieldLabel(key: string): string {
  switch (key) {
    case "teamName":
      return "Team Name";
    case "gymName":
    case "schoolGymName":
      return "Gym Name";
    case "schoolName":
    case "schoolProgramName":
    case "programName":
      return "Program Name";
    case "organizationName":
    case "schoolOrganizationName":
      return "Organization";
    case "gymBillingAddress":
    case "schoolBillingAddress":
    case "schoolGymBillingAddress":
    case "schoolAddress":
    case "schoolGymAddress":
    case "youthRecBillingAddress":
    case "organizationBillingAddress":
      return "Billing Address";
    case "coachName":
    case "coachContactFullName":
    case "musicContactName":
    case "contactName":
      return "Coach Name";
    case "coachPhone":
      return "Coach Phone";
    case "coachEmail":
      return "Coach Email";
    case "billingPersonName":
      return "Billing Contact";
    case "billingPersonEmail":
      return "Billing Email";
    case "choreographerName":
    case "virocChoreographerName":
      return "Choreographer";
    case "choreographerEmail":
    case "virocChoreographerEmail":
      return "Choreographer Email";
    default:
      return "Identity";
  }
}

/** Skip Add Order / seed placeholders that appear on every row. */
function isPlaceholderMatchValue(value: string): boolean {
  return /^(coach|contact|customer|fa|first available|n\/?a|-)$/i.test(
    value.trim()
  );
}

function matchFieldRank(key: string): number {
  if (key === "teamName") return 0;
  if (ORG_IDENTITY_KEYS.has(key)) return 1;
  if (BILLING_ADDRESS_KEYS.has(key)) return 1;
  if (CONTACT_KEYS.has(key)) return 2;
  return 3;
}

/** Filled gym/school/contact (+ team when that subtype uses Team Name). */
export function matchIdentityContactValues(
  order: Order
): Array<{ key: string; value: string }> {
  const out: Array<{ key: string; value: string }> = [];
  const seen = new Set<string>();
  for (const key of MATCH_IDENTITY_CONTACT_KEYS) {
    const value = rawFieldValue(order, key).trim();
    if (!value || seen.has(key)) continue;
    if (isPlaceholderMatchValue(value)) continue;
    seen.add(key);
    out.push({ key, value });
  }
  // Team Name only for All-Star / Youth Rec (not V!ROC / Dance coincidence).
  if (cheerSubtypeHasTeamName(order)) {
    const team = orderTeamName(order);
    if (team && !seen.has("teamName") && !isPlaceholderMatchValue(team)) {
      out.push({ key: "teamName", value: team });
    }
  }
  return out;
}

function valuesForKeys(
  fields: Array<{ key: string; value: string }>,
  keys: Set<string>
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const field of fields) {
    if (!keys.has(field.key)) continue;
    const norm = field.value.trim().toLowerCase();
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(field.value);
  }
  return out;
}

/** Best pairwise similarity across two value lists (empty → 0). */
function bestCrossScore(left: string[], right: string[]): number {
  let best = 0;
  for (const a of left) {
    for (const b of right) {
      const score = programNameSimilarity(a, b);
      if (score > best) best = score;
    }
  }
  return best;
}

function considerHit(
  state: {
    bestScore: number;
    bestKey: string;
    bestManualValue: string;
    bestRank: number;
  },
  score: number,
  key: string,
  manualValue: string
): void {
  const rank = matchFieldRank(key);
  if (
    score > state.bestScore ||
    (score === state.bestScore && score > 0 && rank < state.bestRank)
  ) {
    state.bestScore = score;
    state.bestKey = key;
    state.bestManualValue = manualValue;
    state.bestRank = rank;
  }
}

/**
 * Best non-mix identity/contact similarity between Magento form and manual.
 * Gym/school/program name OR billing address is enough (either side's alias).
 * Mix package / division / length / producer are ignored.
 */
export function scoreManualFormIdentityMatch(
  form: Order,
  manual: Order,
  threshold = MANUAL_FORM_MATCH_THRESHOLD
): ManualFormMatchHit | null {
  const formFields = matchIdentityContactValues(form);
  if (formFields.length === 0) return null;
  const manualFields = matchIdentityContactValues(manual);

  const state = {
    bestScore: 0,
    bestKey: "",
    bestManualValue: "",
    bestRank: 99,
  };

  // Org name: any gym/school/program alias on form vs any on manual.
  const formNames = valuesForKeys(formFields, ORG_IDENTITY_KEYS);
  const manualNames = valuesForKeys(manualFields, ORG_IDENTITY_KEYS);
  const nameScore = bestCrossScore(formNames, manualNames);
  if (nameScore > 0 && manualNames[0]) {
    considerHit(state, nameScore, "programName", manualNames[0]);
  }

  // Billing address: either address is enough; aliases compared across keys.
  const formAddrs = valuesForKeys(formFields, BILLING_ADDRESS_KEYS);
  const manualAddrs = valuesForKeys(manualFields, BILLING_ADDRESS_KEYS);
  const addrScore = bestCrossScore(formAddrs, manualAddrs);
  if (addrScore > 0 && manualAddrs[0]) {
    considerHit(state, addrScore, "gymBillingAddress", manualAddrs[0]);
  }

  // Team + contacts: same-key only (no cross-key false friends).
  const manualByKey = new Map(manualFields.map((f) => [f.key, f.value]));
  for (const field of formFields) {
    if (ORG_IDENTITY_KEYS.has(field.key) || BILLING_ADDRESS_KEYS.has(field.key)) {
      continue;
    }
    const manualValue = manualByKey.get(field.key);
    if (!manualValue) continue;
    considerHit(
      state,
      programNameSimilarity(field.value, manualValue),
      field.key,
      manualValue
    );
  }

  if (state.bestScore < threshold || !state.bestKey) return null;

  const matchKind: "team" | "identity" =
    state.bestKey === "teamName" ? "team" : "identity";
  const identityName =
    (matchKind === "team"
      ? orderTeamName(manual)
      : getOrderIdentityName(manual).trim()) ||
    state.bestManualValue;

  return {
    score: state.bestScore,
    identityName,
    matchKind,
    matchedFieldKey: state.bestKey,
  };
}
