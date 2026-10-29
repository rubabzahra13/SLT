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
 * are used — never invent fields.
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
 * are used — never invent fields (e.g. no Date if the form has none;
 * Style only when `style` / `styleOfGamedayMix` exists).
 *
 * Style of Dance · Package Name · Date You Need Music By · Requested Editor
 */
export const DANCE_PER_MIX_FIELD_CANDIDATES = [
  "style",
  "styleOfGamedayMix",
  "packageType",
  "mixEndDate",
  "requestedEditor",
] as const;

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

/**
 * Keys that vary per mix for this form/subtype.
 * Intersection of the category candidate list with fields actually on the form.
 */
export function getAddOrderMultiMixFieldKeys(order: Order): string[] {
  if (!supportsAddOrderMultiMix(order)) return [];
  const present = formFieldKeySet(order);
  return perMixCandidatesForOrder(order).filter((key) => present.has(key));
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
    mixEndDate: "",
  };
}

/** @deprecated Use blankAddOrderPerMixValues. */
export function blankCheerPerMixValues(): Partial<Order> {
  return blankAddOrderPerMixValues();
}

/** Shared draft — per-mix keys cleared so each mix can overlay cleanly. */
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
