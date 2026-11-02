import { getOrderDetailSections } from "@/lib/order-detail-sections";
import { rawFieldValue } from "@/lib/order-detail-fields";
import { hasMeaningfulFieldValue } from "@/lib/empty-field-tokens";
import {
  overlayMergedFormForDisplay,
  resolveManualFormPair,
} from "@/lib/manual-form-merge";
import { getFormSongListColumnText } from "@/lib/order-requirements";
import type { Order } from "@/types";

const SONG_FORM_FIELD_KEYS = new Set([
  "songListSuggestions",
  "powerMusicCovers",
  "unleashTheBeatsCovers",
  "customerSongs",
]);

function songFieldRaw(order: Order, key: string): string {
  if (SONG_FORM_FIELD_KEYS.has(key)) {
    return getFormSongListColumnText(order) || rawFieldValue(order, key);
  }
  return rawFieldValue(order, key);
}

/** Keep in sync with ADD_ORDER_MANUAL_FIELD_KEYS in add-order-mixes.ts. */
const MANUAL_SLIM_MTD_FIELD_KEYS = new Set<string>([
  "gymName",
  "schoolName",
  "schoolProgramName",
  "organizationName",
  "schoolOrganizationName",
  "programName",
  "schoolGymAddress",
  "gymBillingAddress",
  "schoolBillingAddress",
  "youthRecBillingAddress",
  "organizationBillingAddress",
  "schoolAddress",
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
  "choreographyCompletionDate",
]);

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

/** Always optional: empty is fine on every form (never red / never block MTD). */
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
  // Dance Magento cover boxes: optional even when that affiliate is selected.
  "powerMusicCovers",
  "unleashTheBeatsCovers",
  // Manual Mix Information date — display/CRUD only; never blocks MTD.
  "choreographyCompletionDate",
]);

/**
 * Optional on most forms, but required on School Anthem (Magento SoT).
 * Coupon stays always-optional: Magento does not require it.
 * Youth Rec Colors are required on Youth Rec (not in this set).
 * Team colors on All-Star / School Cheer stay required via teamColors key.
 */
const OPTIONAL_EXCEPT_SCHOOL_ANTHEM = new Set([
  // Marching Band producer notes are optional; School Anthem Song/Notes are required.
  // (Aliases of song_list_suggestions / routine_notes: Anthem form keys.)
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

/** Split/No Split exists on VIROC, School Cheer, Youth Rec: not All Star Cheer. */
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
  // All Star Cheer (and non-cheer forms) have no Split field: never block MTD.
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
  // Song list SoT matches the Songs pill: Cheer often stores the typed list in
  // musicTheme (e.g. "m · (BMI)") while songListSuggestions stays "".
  // rawFieldValue short-circuits on explicit "" and misses that fallback.
  if (
    key === "songListSuggestions" ||
    key === "powerMusicCovers" ||
    key === "unleashTheBeatsCovers" ||
    key === "customerSongs"
  ) {
    return !hasMeaningfulFieldValue(getFormSongListColumnText(order), {
      fieldKey: key,
    });
  }
  const raw = rawFieldValue(order, key);
  // Shared sentinel dictionary (none, N/A, TBD, null, select…, …).
  // Choreographer fields may use N/A when Magento says "put N/A".
  return !hasMeaningfulFieldValue(raw, { fieldKey: key });
}

/** Red (missing) in the order form editor: skips table-covered columns. */
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
 * Final order values after Match for MTD / Form UI.
 * Magento wins on filled form fields; blank Magento keeps manual.
 * Booking-row assignment, invoice, dates, and the manual overlap snapshot
 * stay on the manual slot so Split can restore pre-match manual values.
 */
export function resolveFinalMatchedOrder(
  order: Order,
  allOrders: Order[]
): Order {
  const pair = resolveManualFormPair(order, allOrders);
  if (!pair) {
    return overlayMergedFormForDisplay(order, allOrders);
  }

  const preview = previewMatchFormWinsOrder(pair.manual, pair.form);
  return {
    ...preview,
    id: pair.manual.id,
    uuid: pair.manual.uuid,
    legacyId: pair.manual.legacyId,
    isManualEntry: true,
    mergedFormOrderId:
      pair.manual.mergedFormOrderId ||
      pair.form.id ||
      pair.form.uuid ||
      pair.form.legacyId,
    manualOverlapSnapshot: pair.manual.manualOverlapSnapshot ?? null,
    assignedProducer: pair.manual.assignedProducer,
    invoice: pair.manual.invoice,
    mixStartDate: pair.manual.mixStartDate,
    mixEndDate: pair.manual.mixEndDate,
    isReassigned: pair.manual.isReassigned,
    eightCountSheet: pair.manual.eightCountSheet || preview.eightCountSheet,
    haveSongs: pair.manual.haveSongs || preview.haveSongs,
    collectionStates: {
      ...(preview.collectionStates || {}),
      ...(pair.manual.collectionStates || {}),
    },
    missingDataEmailSentAt: pair.manual.missingDataEmailSentAt,
    producerEmailSentAt: pair.manual.producerEmailSentAt,
    producerEmailSentTo: pair.manual.producerEmailSentTo,
  };
}

/**
 * Empty form / table fields that should block Move to MTD.
 * Coupon, invoice, howDidYouFindOut, and dance Power/Unleash cover boxes
 * may stay empty. Youth Rec "Email Address" is optional.
 * Voiceover script/pronunciation required only when custom voiceovers is Yes.
 * Manual School Anthem stays blocked until a Magento form is matched.
 */
export function getOrderFormFieldsBlockingMtd(
  order: Order,
  allOrders?: Order[]
): OrderFormMtdGap[] {
  // After Match, gate against finalized Magento-wins values (manual snapshot
  // kept for Split only — not what Move to MTD should re-ask for).
  const source =
    allOrders && allOrders.length > 0
      ? resolveFinalMatchedOrder(order, allOrders)
      : order;

  const gaps: OrderFormMtdGap[] = [];
  const seen = new Set<string>();

  // Manual School Anthem: wait for Magento match before MTD (form is SoT).
  if (
    isSchoolAnthemOrder(source) &&
    source.isManualEntry &&
    !orderHasMatchedMagentoForm(source)
  ) {
    gaps.push({
      key: "mergedFormOrderId",
      label: "Magento form match",
    });
    return gaps;
  }

  // Unmatched manuals: only slim Add Order fields can block MTD. Magento fills
  // city/zip/affiliate/songs after Match (old full-form gate was wrong here).
  const unmatchedManual = Boolean(
    source.isManualEntry && !source.mergedFormOrderId
  );
  const sections = getOrderDetailSections(source);

  for (const section of sections) {
    for (const field of section.fields) {
      if (seen.has(field.key)) continue;
      seen.add(field.key);
      if (unmatchedManual && !MANUAL_SLIM_MTD_FIELD_KEYS.has(field.key)) {
        continue;
      }
      if (!isEmptyFormValue(source, field.key)) continue;
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

/**
 * Post-match preview: Magento wins when filled; blank Magento keeps manual.
 * Used to decide which required fields would still be empty after Confirm match,
 * and as the finalized value set Move to MTD / Form read after Match.
 */
export function previewMatchFormWinsOrder(manual: Order, form: Order): Order {
  const sections = getOrderDetailSections(form);
  const preview: Order = {
    ...manual,
    ...form,
    isManualEntry: false,
    mergedFormOrderId: form.id || form.uuid || form.legacyId || "match-preview",
  };

  for (const section of sections) {
    for (const field of section.fields) {
      const formRaw = songFieldRaw(form, field.key);
      const manualRaw = songFieldRaw(manual, field.key);
      const formHas = hasMeaningfulFieldValue(formRaw, {
        fieldKey: field.key,
      });
      const manualHas = hasMeaningfulFieldValue(manualRaw, {
        fieldKey: field.key,
      });
      const next = formHas ? formRaw : manualHas ? manualRaw : "";
      (preview as Record<string, unknown>)[field.key] = next;
    }
  }

  return preview;
}

/**
 * Required Magento form fields that are empty on both Manual and Magento
 * (so Confirm match would leave them blank). Coupon / how-found stay optional.
 */
export function getMatchBlockingMissingFields(
  manual: Order,
  form: Order
): OrderFormMtdGap[] {
  return getOrderFormFieldsBlockingMtd(
    previewMatchFormWinsOrder(manual, form)
  );
}

export function formatMatchMissingFieldsReason(
  gaps: OrderFormMtdGap[]
): string {
  if (gaps.length === 0) return "";
  return "Fill the highlighted fields before matching. They are mandatory on the Magento form but missing here.";
}

/** Marketing-only Magento fields: alone they do not unlock Add New Order save. */
const ADD_ORDER_NON_CONTENT_KEYS = new Set([
  "couponCode",
  "howDidYouFindOut",
]);

/**
 * Values the blank Add New Order draft pre-fills in dropdowns / selects.
 * These alone must not satisfy the “fill at least one field” rule.
 */
export function isAddOrderPrefillValue(
  key: string,
  raw: string,
  order: Pick<Order, "formType">
): boolean {
  const v = String(raw ?? "").trim();
  if (!v) return false;
  const lower = v.toLowerCase();
  if (key === "country" && lower === "united states") return true;
  if (key === "numberOfCopies" && v === "1") return true;
  if (
    key === "requestedEditor" &&
    (lower === "first available" || lower === "fa")
  ) {
    return true;
  }
  if (
    key === "editorRequest" &&
    (lower === "fa" || lower === "first available")
  ) {
    return true;
  }
  // Subtype-driven Yes/No on school cheer: not user-entered content.
  if (key === "varsityVirocCustomer" && (lower === "yes" || lower === "no")) {
    return true;
  }
  if (
    order.formType === "school-anthem" &&
    (key === "packageType" || key === "package") &&
    lower === "school anthems"
  ) {
    return true;
  }
  return false;
}

/**
 * Add New Order (admin): any meaningful user-entered field unlocks save.
 * Coupon / how-found, and blank-draft dropdown defaults, do not count alone.
 * Identity name is not required: Match suggestions need it later if empty.
 */
export function orderHasAddOrderContent(order: Order): boolean {
  const sections = getOrderDetailSections(order);
  for (const section of sections) {
    for (const field of section.fields) {
      if (ADD_ORDER_NON_CONTENT_KEYS.has(field.key)) continue;
      const raw = rawFieldValue(order, field.key);
      if (isAddOrderPrefillValue(field.key, raw, order)) continue;
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
  return "Add at least one order detail to save. Defaults, coupon codes, and “how did you find us?” don’t count on their own.";
}
