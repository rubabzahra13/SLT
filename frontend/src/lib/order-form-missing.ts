import { getOrderDetailSections } from "@/lib/order-detail-sections";
import { rawFieldValue } from "@/lib/order-detail-fields";
import { hasMeaningfulFieldValue } from "@/lib/empty-field-tokens";
import type { Order } from "@/types";

/**
 * Form fields already represented by Orders table columns / collection pills.
 * Missing values for these show in the table (No data / red pills), not as form red.
 */
const TABLE_COVERED_FIELD_KEYS = new Set([
  "contactName",
  "customerName",
  "coachName",
  "coachContactFullName",
  "programName",
  "teamName",
  "gymName",
  "schoolName",
  "schoolProgramName",
  "package",
  "packageType",
  "timeLengthOfMix",
  "splitOrNoSplit",
  "musicAffiliate",
  "songListSuggestions",
  "musicTheme",
  "powerMusicCovers",
  "unleashTheBeatsCovers",
  "requestedEditor",
  "requestedProducer",
  "sendingEightCountSheets",
  "routineNotes",
  "haveSongs",
  "eightCountSheet",
]);

/** Always optional — empty is fine on every form (never red / never block MTD). */
const ALWAYS_OPTIONAL_FORM_FIELD_KEYS = new Set([
  "couponCode",
  "invoice",
  "invoiceNumber",
  // Marketing — Magento asks but never blocks Move to MTD.
  "howDidYouFindOut",
  // Sports Entertainment: billing contact only if different from music contact.
  "billingContactName",
  "billingContactEmail",
  // Youth Rec Magento "Email Address" aliases (form key is billingPersonEmail).
  "youthRecExtraEmailAddress",
  "emailAddress",
  // Dance Magento cover boxes — optional even when that affiliate is selected.
  "powerMusicCovers",
  "unleashTheBeatsCovers",
]);

/**
 * Optional on most forms, but required on School Anthem (Magento SoT).
 * Coupon stays always-optional — Magento does not require it.
 * Youth Rec Colors are required on Youth Rec (not in this set).
 * Team colors on All-Star / School Cheer stay required via teamColors key.
 */
const OPTIONAL_EXCEPT_SCHOOL_ANTHEM = new Set([
  // Marching Band producer notes are optional; School Anthem Song/Notes are required.
  // (Aliases of song_list_suggestions / routine_notes — Anthem form keys.)
  "instrumentationNotes",
  "instrumentalStylePreference",
  "lyricalNotes",
  "nicknames",
  "schoolProgramColors",
]);

function isSchoolAnthemOrder(
  order?: Pick<Order, "formType"> | null
): boolean {
  return String(order?.formType || "").trim() === "school-anthem";
}

function isMarchingBandOrder(
  order?: Pick<Order, "formType"> | null
): boolean {
  return String(order?.formType || "").trim() === "marching-band";
}

function cheerSubtype(
  order?: Pick<Order, "formType" | "cheerFormSubtype"> | null
): string {
  if (String(order?.formType || "").trim() !== "school-all-star-cheer") {
    return "";
  }
  return String(order?.cheerFormSubtype || "all-star-cheer").trim();
}

function isYouthRecCheerSubtype(
  order?: Pick<Order, "formType" | "cheerFormSubtype"> | null
): boolean {
  return cheerSubtype(order) === "youth-rec-cheer";
}

/** True when this form field is optional (never blocks save / MTD). */
export function isOptionalOrderFormField(
  key: string,
  order?: Pick<Order, "formType" | "cheerFormSubtype"> | null
): boolean {
  // Youth Rec Magento "Email Address" (billing_person_email) is optional.
  if (
    (key === "billingPersonEmail" || key === "billingContactEmail") &&
    isYouthRecCheerSubtype(order)
  ) {
    return true;
  }
  if (ALWAYS_OPTIONAL_FORM_FIELD_KEYS.has(key)) return true;
  // Marching Band Magento producer notes (form keys = song/routine SoT aliases).
  if (
    isMarchingBandOrder(order) &&
    (key === "songListSuggestions" ||
      key === "routineNotes" ||
      key === "instrumentationNotes" ||
      key === "instrumentalStylePreference" ||
      key === "lyricalNotes" ||
      key === "additionalNotes")
  ) {
    return true;
  }
  if (isSchoolAnthemOrder(order)) return false;
  return OPTIONAL_EXCEPT_SCHOOL_ANTHEM.has(key);
}

function orderHasMatchedMagentoForm(order: Order): boolean {
  if (order.mergedFormOrderId) return true;
  const snap = order.manualOverlapSnapshot;
  return Boolean(snap && Object.keys(snap).length > 0);
}

/** Split/No Split exists on VIROC, School Cheer, Youth Rec — not All Star Cheer. */
export const CHEER_SUBTYPES_WITH_SPLIT = new Set([
  "school-cheer-viroc-yes",
  "school-cheer-viroc-no",
  "youth-rec-cheer",
]);

export function orderHasSplitField(order: {
  cheerFormSubtype?: string | null;
}): boolean {
  return CHEER_SUBTYPES_WITH_SPLIT.has(order.cheerFormSubtype || "");
}

function fieldHasConditionalPass(order: Order, key: string): boolean {
  // All Star Cheer (and non-cheer forms) have no Split field — never block MTD.
  if (key === "splitOrNoSplit") {
    const subtype = order.cheerFormSubtype || "all-star-cheer";
    if (!CHEER_SUBTYPES_WITH_SPLIT.has(subtype)) return true;
  }

  // Voiceover follow-ups only required when a Yes voiceover is selected.
  // (Cover boxes are always-optional via ALWAYS_OPTIONAL_FORM_FIELD_KEYS.)
  if (key === "voiceoverScript" || key === "pronunciationGuidance") {
    const vo = rawFieldValue(order, "customVoiceovers").toLowerCase();
    if (!vo || vo.startsWith("no") || vo.includes("none")) return true;
  }

  return false;
}

function isEmptyFormValue(order: Order, key: string): boolean {
  if (isOptionalOrderFormField(key, order)) return false;
  if (fieldHasConditionalPass(order, key)) return false;
  const raw = rawFieldValue(order, key);
  // Shared sentinel dictionary (none, N/A, TBD, null, select…, …).
  // Choreographer fields may use N/A when Magento says "put N/A".
  return !hasMeaningfulFieldValue(raw, { fieldKey: key });
}

/** Red (missing) in the order form editor — skips table-covered columns. */
export function isOrderFormFieldMissing(order: Order, key: string): boolean {
  if (isOptionalOrderFormField(key, order)) return false;
  if (TABLE_COVERED_FIELD_KEYS.has(key)) return false;
  return isEmptyFormValue(order, key);
}

export type OrderFormMtdGap = {
  key: string;
  label: string;
};

/**
 * Empty form / table fields that should block Move to MTD.
 * Coupon, invoice, howDidYouFindOut, and dance Power/Unleash cover boxes
 * may stay empty. Youth Rec "Email Address" is optional.
 * Voiceover script/pronunciation required only when custom voiceovers is Yes.
 * Manual School Anthem stays blocked until a Magento form is matched.
 */
export function getOrderFormFieldsBlockingMtd(
  order: Order
): OrderFormMtdGap[] {
  const gaps: OrderFormMtdGap[] = [];
  const seen = new Set<string>();

  // Manual School Anthem: wait for Magento match before MTD (form is SoT).
  if (
    isSchoolAnthemOrder(order) &&
    order.isManualEntry &&
    !orderHasMatchedMagentoForm(order)
  ) {
    gaps.push({
      key: "mergedFormOrderId",
      label: "Magento form match",
    });
    return gaps;
  }

  const sections = getOrderDetailSections(order);

  for (const section of sections) {
    for (const field of section.fields) {
      if (seen.has(field.key)) continue;
      seen.add(field.key);
      if (!isEmptyFormValue(order, field.key)) continue;
      gaps.push({ key: field.key, label: field.label });
    }
  }

  return gaps;
}

export function formatOrderFormMtdBlockReason(gaps: OrderFormMtdGap[]): string {
  if (gaps.length === 0) return "";
  if (gaps.length === 1 && gaps[0]?.key === "mergedFormOrderId") {
    return "Wait for Magento form\nmatch before MTD";
  }
  const labels = gaps.map((g) => g.label);
  const shown = labels.slice(0, 6);
  const extra = labels.length - shown.length;
  return [
    "Fill missing data before moving to MTD:",
    shown.join(", ") + (extra > 0 ? ` (+${extra} more)` : ""),
  ].join("\n");
}

/** Marketing-only Magento fields — alone they do not unlock Add New Order save. */
const ADD_ORDER_NON_CONTENT_KEYS = new Set([
  "couponCode",
  "howDidYouFindOut",
]);

/**
 * Add New Order (admin): any meaningful form field unlocks save, except
 * coupon / how-did-you-find-out alone (same as Magento non-mandatory).
 * Identity name is no longer strictly required — without it Match suggestions
 * simply will not appear until a name is filled later.
 */
export function orderHasAddOrderContent(order: Order): boolean {
  const sections = getOrderDetailSections(order);
  for (const section of sections) {
    for (const field of section.fields) {
      if (ADD_ORDER_NON_CONTENT_KEYS.has(field.key)) continue;
      const raw = rawFieldValue(order, field.key);
      if (hasMeaningfulFieldValue(raw, { fieldKey: field.key })) return true;
    }
  }
  return false;
}

export function getAddOrderRequiredGaps(order: Order): OrderFormMtdGap[] {
  if (orderHasAddOrderContent(order)) return [];
  return [{ key: "_anyField", label: "at least one field" }];
}

export function formatAddOrderSaveBlockReason(gaps: OrderFormMtdGap[]): string {
  if (gaps.length === 0) return "";
  return "Fill at least one field to save (coupon and how-you-found-us alone don’t count).";
}
