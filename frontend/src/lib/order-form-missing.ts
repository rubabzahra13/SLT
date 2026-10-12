import { rawFieldValue } from "@/lib/order-detail-fields";
import type { Order } from "@/types";

/**
 * Form fields already represented by Orders table columns / collection pills.
 * Missing values for these show in the table (— / red pills), not as form red.
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

/** Optional — empty is fine, never mark red. */
const OPTIONAL_FORM_FIELD_KEYS = new Set([
  "couponCode",
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

export function isOrderFormFieldMissing(order: Order, key: string): boolean {
  if (OPTIONAL_FORM_FIELD_KEYS.has(key)) return false;
  if (TABLE_COVERED_FIELD_KEYS.has(key)) return false;

  // Dance song boxes are optional unless that affiliate is selected.
  if (key === "powerMusicCovers") {
    const affiliate = rawFieldValue(order, "musicAffiliate").toLowerCase();
    if (!affiliate.includes("power music")) return false;
  }
  if (
    key === "songListSuggestions" &&
    order.formType === "school-all-star-dance"
  ) {
    const affiliate = rawFieldValue(order, "musicAffiliate").toLowerCase();
    if (!affiliate.includes("unleash")) return false;
  }

  // Voiceover follow-ups only required when a Yes voiceover is selected.
  if (key === "voiceoverScript" || key === "pronunciationGuidance") {
    const vo = rawFieldValue(order, "customVoiceovers").toLowerCase();
    if (!vo || vo.startsWith("no") || vo.includes("none")) return false;
  }

  const raw = rawFieldValue(order, key).trim();
  return !raw;
}
