import { getOrderDetailSections } from "@/lib/order-detail-sections";
import { rawFieldValue } from "@/lib/order-detail-fields";
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
  "requestedEditor",
  "requestedProducer",
  "sendingEightCountSheets",
  "usingEightCountSheets",
  "routineNotes",
  "haveSongs",
  "eightCountSheet",
]);

/** Optional — empty is fine, never mark red / never block Move to MTD. */
const OPTIONAL_FORM_FIELD_KEYS = new Set([
  "couponCode",
  "howDidYouFindOut",
  "invoice",
  "invoiceNumber",
  "numberOfCopies",
  // Youth Rec form: secondary contact email is not required.
  "emailAddress",
  // Marching Band producer notes are optional on the customer form.
  "instrumentationNotes",
  "lyricalNotes",
  // Sports Entertainment: billing contact only if different from music contact.
  "billingContactName",
  "billingContactEmail",
]);

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

  // Dance song boxes are optional unless that affiliate is selected.
  if (key === "powerMusicCovers") {
    const affiliate = rawFieldValue(order, "musicAffiliate").toLowerCase();
    if (!affiliate.includes("power music")) return true;
  }
  if (
    key === "songListSuggestions" &&
    order.formType === "school-all-star-dance"
  ) {
    const affiliate = rawFieldValue(order, "musicAffiliate").toLowerCase();
    if (!affiliate.includes("unleash")) return true;
  }

  // Voiceover follow-ups only required when a Yes voiceover is selected.
  if (key === "voiceoverScript" || key === "pronunciationGuidance") {
    const vo = rawFieldValue(order, "customVoiceovers").toLowerCase();
    if (!vo || vo.startsWith("no") || vo.includes("none")) return true;
  }

  return false;
}

function isEmptyFormValue(order: Order, key: string): boolean {
  if (OPTIONAL_FORM_FIELD_KEYS.has(key)) return false;
  if (fieldHasConditionalPass(order, key)) return false;
  const raw = rawFieldValue(order, key).trim();
  if (!raw) return true;
  // Placeholder selects in the edit UI
  const lower = raw.toLowerCase();
  if (lower === "select…" || lower === "select..." || lower === "select") {
    return true;
  }
  return false;
}

/** Red (missing) in the order form editor — skips table-covered columns. */
export function isOrderFormFieldMissing(order: Order, key: string): boolean {
  if (OPTIONAL_FORM_FIELD_KEYS.has(key)) return false;
  if (TABLE_COVERED_FIELD_KEYS.has(key)) return false;
  return isEmptyFormValue(order, key);
}

export type OrderFormMtdGap = {
  key: string;
  label: string;
};

/**
 * Empty form / table fields that should block Move to MTD.
 * Coupon, how-did-you-find-out, and invoice may stay empty.
 */
export function getOrderFormFieldsBlockingMtd(
  order: Order
): OrderFormMtdGap[] {
  const sections = getOrderDetailSections(order);
  const gaps: OrderFormMtdGap[] = [];
  const seen = new Set<string>();

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
  const labels = gaps.map((g) => g.label);
  const shown = labels.slice(0, 6);
  const extra = labels.length - shown.length;
  return [
    "Fill missing data before moving to MTD:",
    shown.join(", ") + (extra > 0 ? ` (+${extra} more)` : ""),
  ].join("\n");
}
