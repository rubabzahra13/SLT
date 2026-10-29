import { rawFieldValue } from "@/lib/order-detail-fields";
import {
  getOrderDetailSections,
  type OrderDetailField,
} from "@/lib/order-detail-sections";
import { hasMeaningfulFieldValue } from "@/lib/empty-field-tokens";
import { isAddOrderPrefillValue } from "@/lib/order-form-missing";
import type { Order } from "@/types";

/** Admin Add New Order: up to this many mixes in one Mix Information section. */
export const MAX_ADD_ORDER_MIXES = 10;

const ADD_ORDER_NON_CONTENT_KEYS = new Set([
  "couponCode",
  "howDidYouFindOut",
]);

/**
 * Cheer multi-mix (display order). Only keys present on the active subtype
 * are used: never invent fields.
 *
 * Requested Editor · Division · Team Name · Package · Length of Mix
 */
export const CHEER_PER_MIX_FIELD_CANDIDATES = [
  "requestedEditor",
  "division",
  "teamName",
  "packageType",
  "timeLengthOfMix",
] as const;

/**
 * Dance multi-mix (display order). Only keys present on the active subtype
 * are used: never invent fields (Style only when `style` / `styleOfGamedayMix`
 * exists on that subtype).
 *
 * Admin New Order is slim: Magento fills the rest after Match.
 * Style · Package · Requested Editor
 */
export const DANCE_PER_MIX_FIELD_CANDIDATES = [
  "style",
  "styleOfGamedayMix",
  "packageType",
  "requestedEditor",
] as const;

/**
 * Unmatched manual orders use the same slim field set as Add New Order
 * (edit/view modals included). Magento Match fills the rest.
 */
export function isManualSlimFormOrder(
  order: Pick<Order, "isManualEntry" | "mergedFormOrderId"> | null | undefined
): boolean {
  return Boolean(order?.isManualEntry && !order?.mergedFormOrderId);
}

/**
 * Fields admins can fill on Add New Order. Everything else (city/state/zip,
 * affiliate, songs, voiceovers, coupon, …) arrives from Magento after Match.
 */
export const ADD_ORDER_MANUAL_FIELD_KEYS = new Set<string>([
  // Identity
  "gymName",
  "schoolName",
  "schoolProgramName",
  "organizationName",
  "schoolOrganizationName",
  "programName",
  // Address (single block: Magento city/state/zip/country come later)
  "schoolGymAddress",
  "gymBillingAddress",
  "schoolBillingAddress",
  "youthRecBillingAddress",
  "organizationBillingAddress",
  "schoolAddress",
  "schoolGymAddress",
  // Contacts
  "coachName",
  "coachContactFullName",
  "coachPhone",
  "coachEmail",
  "coachEmailAddress",
  "musicContactName",
  "musicContactPhone",
  "musicContactEmail",
  "billingPersonName",
  "billingContactName",
  "billingPersonEmail",
  "billingContactEmail",
  "youthRecExtraEmailAddress",
  "emailAddress",
  "choreographerName",
  "choreographerEmail",
  "virocChoreographerName",
  "virocChoreographerEmail",
  // Per-mix / mix essentials (cheer + dance)
  "packageType",
  "package",
  "requestedEditor",
  "requestedProducer",
  "editorRequest",
  "division",
  "divisionOfTeam",
  "teamName",
  "timeLengthOfMix",
  "style",
  "styleOfGamedayMix",
]);

function isSchoolProgramSectionTitle(title: string): boolean {
  return /school\/program|program information|^gym$|school information/i.test(
    String(title || "").trim()
  );
}

export function filterSectionsForManualAddOrder<
  T extends { title: string; fields: Array<{ key: string; label?: string }> },
>(sections: T[]): T[] {
  // Prefer the form's own Division of Team field (label may vary by subtype).
  let divisionOfTeamField: T["fields"][number] | null = null;
  for (const section of sections) {
    const hit = section.fields.find((f) => f.key === "divisionOfTeam");
    if (hit) {
      divisionOfTeamField = hit;
      break;
    }
  }

  const mapped = sections.map((section) => {
    const fields = section.fields.filter((f) => {
      if (!ADD_ORDER_MANUAL_FIELD_KEYS.has(f.key)) return false;
      // Never under Mix "Shared for all mixes" — surface on School/Program instead.
      if (
        f.key === "divisionOfTeam" &&
        isMixInformationSectionTitle(section.title)
      ) {
        return false;
      }
      return true;
    });

    // TPV / Jazz / etc. only define Division on Mix — move it to School/Program
    // for admin New Order so it sits with name + address.
    if (
      divisionOfTeamField &&
      isSchoolProgramSectionTitle(section.title) &&
      !fields.some((f) => f.key === "divisionOfTeam")
    ) {
      fields.push({ ...divisionOfTeamField });
    }

    return { ...section, fields };
  });

  return mapped.filter((section) => {
    if (isMixInformationSectionTitle(section.title)) return true;
    return section.fields.length > 0;
  }) as T[];
}

/** @deprecated Prefer getAddOrderMultiMixFieldKeys(order). */
export const CHEER_PER_MIX_FIELD_KEYS = CHEER_PER_MIX_FIELD_CANDIDATES;

const ALL_PER_MIX_CANDIDATES = new Set<string>([
  ...CHEER_PER_MIX_FIELD_CANDIDATES,
  ...DANCE_PER_MIX_FIELD_CANDIDATES,
]);

export function isMixInformationSectionTitle(title: string): boolean {
  return /^mix information$/i.test(String(title || "").trim());
}

/** True when this key may be slotted per mix (hide from shared Team/Mix grids). */
export function isAddOrderPerMixFieldKey(key: string): boolean {
  return ALL_PER_MIX_CANDIDATES.has(key);
}

/** @deprecated Use isAddOrderPerMixFieldKey. */
export function isCheerPerMixFieldKey(key: string): boolean {
  return isAddOrderPerMixFieldKey(key);
}

function formFieldKeySet(order: Order): Set<string> {
  const present = new Set<string>();
  for (const section of getOrderDetailSections(order)) {
    for (const field of section.fields) present.add(field.key);
  }
  return present;
}

/** Field keys in the Mix Information section for this form/subtype. */
export function getMixInformationFieldKeys(order: Order): string[] {
  const section = getOrderDetailSections(order).find((s) =>
    isMixInformationSectionTitle(s.title)
  );
  if (!section) return [];
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const field of section.fields) {
    if (seen.has(field.key)) continue;
    seen.add(field.key);
    keys.push(field.key);
  }
  return keys;
}

/** Cheer or Dance Add Order: multi-mix slots in one Mix Information section. */
export function supportsAddOrderMultiMix(order: Order): boolean {
  return (
    order.formType === "school-all-star-cheer" ||
    order.formType === "school-all-star-dance"
  );
}

function perMixCandidatesForOrder(order: Order): readonly string[] {
  if (order.formType === "school-all-star-cheer") {
    return CHEER_PER_MIX_FIELD_CANDIDATES;
  }
  if (order.formType === "school-all-star-dance") {
    return DANCE_PER_MIX_FIELD_CANDIDATES;
  }
  return [];
}

function isTeamInformationSectionTitle(title: string): boolean {
  return /^team information$/i.test(String(title || "").trim());
}

/**
 * Keys that vary per mix for this form/subtype.
 * Candidates must appear on Mix or Team Information — except cheer Team Name /
 * Division, which count from anywhere on the form (Youth Rec puts Team Name
 * under Program Information; admins still fill it per mix).
 */
export function getAddOrderMultiMixFieldKeys(order: Order): string[] {
  if (!supportsAddOrderMultiMix(order)) return [];
  const presentAnywhere = formFieldKeySet(order);
  const perMixSectionKeys = new Set<string>();
  for (const section of getOrderDetailSections(order)) {
    if (
      isMixInformationSectionTitle(section.title) ||
      isTeamInformationSectionTitle(section.title)
    ) {
      for (const field of section.fields) perMixSectionKeys.add(field.key);
    }
  }
  return perMixCandidatesForOrder(order).filter((key) => {
    if (key === "teamName" || key === "division") {
      return presentAnywhere.has(key);
    }
    return perMixSectionKeys.has(key);
  });
}

/** Field defs for one mix slot (labels from form sections). */
export function getAddOrderMultiMixFields(order: Order): OrderDetailField[] {
  const keys = getAddOrderMultiMixFieldKeys(order);
  if (keys.length === 0) return [];
  const byKey = new Map<string, OrderDetailField>();
  for (const section of getOrderDetailSections(order)) {
    for (const field of section.fields) {
      if (!byKey.has(field.key)) byKey.set(field.key, field);
    }
  }
  return keys
    .map((key) => byKey.get(key))
    .filter((f): f is OrderDetailField => Boolean(f));
}

export function pickMixFieldValues(
  order: Order,
  mixKeys: string[]
): Partial<Order> {
  const out: Record<string, unknown> = {};
  for (const key of mixKeys) {
    out[key] = (order as Record<string, unknown>)[key];
  }
  return out as Partial<Order>;
}

export function blankAddOrderPerMixValues(): Partial<Order> {
  return {
    requestedEditor: "First Available",
    division: "",
    teamName: "",
    packageType: "",
    timeLengthOfMix: "",
    style: "",
    styleOfGamedayMix: "",
  };
}

/** @deprecated Use blankAddOrderPerMixValues. */
export function blankCheerPerMixValues(): Partial<Order> {
  return blankAddOrderPerMixValues();
}

/** Shared draft: per-mix keys cleared so each mix can overlay cleanly. */
export function orderWithoutMixFields(
  order: Order,
  mixKeys: string[]
): Order {
  if (mixKeys.length === 0) return order;
  const out: Order = { ...order };
  for (const key of mixKeys) {
    (out as Record<string, unknown>)[key] =
      key === "requestedEditor" ? "First Available" : "";
  }
  return out;
}

export function applyMixFieldValues(
  order: Order,
  mix: Partial<Order>
): Order {
  return { ...order, ...mix };
}

function mixHasMeaningfulContent(
  mix: Partial<Order>,
  mixKeys: string[],
  order: Order
): boolean {
  for (const key of mixKeys) {
    if (ADD_ORDER_NON_CONTENT_KEYS.has(key)) continue;
    const raw = String((mix as Record<string, unknown>)[key] ?? "").trim();
    if (isAddOrderPrefillValue(key, raw, order)) continue;
    if (hasMeaningfulFieldValue(raw, { fieldKey: key })) return true;
  }
  return false;
}

/**
 * Add New Order content rule across shared fields + any mix slot:
 * at least one user-entered field (not coupon / how-found / draft dropdown defaults).
 */
export function addOrderDraftHasContent(
  order: Order,
  mixes: Partial<Order>[],
  mixKeys: string[]
): boolean {
  const shared = orderWithoutMixFields(order, mixKeys);
  const mixKeySet = new Set(mixKeys);
  for (const section of getOrderDetailSections(order)) {
    for (const field of section.fields) {
      if (mixKeySet.has(field.key)) continue;
      if (ADD_ORDER_NON_CONTENT_KEYS.has(field.key)) continue;
      const raw = rawFieldValue(shared, field.key);
      if (isAddOrderPrefillValue(field.key, raw, order)) continue;
      if (hasMeaningfulFieldValue(raw, { fieldKey: field.key })) return true;
    }
  }
  for (const mix of mixes) {
    if (mixHasMeaningfulContent(mix, mixKeys, order)) return true;
  }
  return false;
}
