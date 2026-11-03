import { packageTypeDisplayValue } from "@/components/mtd/PackageTypeField";
import { rawFieldValue } from "@/lib/order-detail-fields";
import {
  getOrderDetailSections,
  getOrderIdentityName,
  type OrderDetailField,
} from "@/lib/order-detail-sections";
import { hasMeaningfulFieldValue } from "@/lib/empty-field-tokens";
import {
  ADD_ORDER_NON_UNLOCK_FIELD_KEYS,
  isAddOrderPrefillValue,
} from "@/lib/order-form-missing";
import { parsePackage } from "@/lib/package";
import type {
  CheerFormSubtype,
  DanceFormSubtype,
  Order,
  OrderFormType,
} from "@/types";

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
 * Magento-aligned per mix (unique on Save N Orders):
 * - All-Star: requestedEditor, division, teamName, packageType, timeLengthOfMix
 * - VIROC / School Cheer: requestedEditor, division, packageType, timeLengthOfMix
 * - Youth Rec: teamName, packageType, timeLengthOfMix
 *
 * Shared across mixes: gym/school/program identity, billing, contacts.
 * Team Name never becomes school_gym_name.
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
 * Magento-aligned per mix (unique on Save N Orders):
 * - POM / Hip Hop: packageType, requestedEditor (no Style on Magento form)
 * - TPV / Jazz-Kick: style, packageType, requestedEditor
 * - Gameday: styleOfGamedayMix, packageType, requestedEditor
 *
 * Shared across mixes: school/program identity, billing, contacts
 * (choreographer when present). Style is never shared identity.
 */
export const DANCE_PER_MIX_FIELD_CANDIDATES = [
  "style",
  "styleOfGamedayMix",
  "packageType",
  "requestedEditor",
] as const;

/**
 * Marching Band multi-mix (display order). Magento Mix Information essentials
 * that New Order collects: package + mix length.
 *
 * Shared across mixes: school/program identity, billing address, coach/billing
 * contacts. Instrumentation / lyric notes arrive from Magento after Match.
 */
export const MARCHING_BAND_PER_MIX_FIELD_CANDIDATES = [
  "packageType",
  "timeLengthOfMix",
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
  "gymBillingAddressLine2",
  "organizationBillingAddress",
  "schoolAddress",
  "schoolGymAddress",
  // Contacts
  "coachName",
  "coachContactFullName",
  "coachPhone",
  "contactPhoneForYouthRecCheer",
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
  // Per-mix / mix essentials (cheer + dance + marching band)
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
>(
  sections: T[],
  _order?: Pick<Order, "formType"> | null
): T[] {
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
  ...MARCHING_BAND_PER_MIX_FIELD_CANDIDATES,
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

/** Cheer, Dance, or Marching Band Add Order: multi-mix slots in Mix Information. */
export function supportsAddOrderMultiMix(order: Order): boolean {
  return (
    order.formType === "school-all-star-cheer" ||
    order.formType === "school-all-star-dance" ||
    order.formType === "marching-band"
  );
}

function perMixCandidatesForOrder(order: Order): readonly string[] {
  if (order.formType === "school-all-star-cheer") {
    return CHEER_PER_MIX_FIELD_CANDIDATES;
  }
  if (order.formType === "school-all-star-dance") {
    return DANCE_PER_MIX_FIELD_CANDIDATES;
  }
  if (order.formType === "marching-band") {
    return MARCHING_BAND_PER_MIX_FIELD_CANDIDATES;
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
 * Dance Style / Gameday Style only when present on the active subtype.
 * Marching Band: packageType + timeLengthOfMix only.
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

/** Default Package on Add New Order (and empty save fallback). */
export function defaultAddOrderPackageType(
  formType?: OrderFormType | null,
  _cheerSubtype?: CheerFormSubtype | null,
  _danceSubtype?: DanceFormSubtype | null
): string {
  if (formType === "school-anthem") return "SCHOOL ANTHEMS";
  return "TBD";
}

/** Default Length of Mix on Add New Order (and empty save fallback). */
export function defaultAddOrderMixLength(
  formType?: OrderFormType | null
): string {
  // School Anthem has no mix-length SoftSelect on Add Order.
  if (formType === "school-anthem") return "";
  return "TBD";
}

export function blankAddOrderPerMixValues(
  formType?: OrderFormType | null
): Partial<Order> {
  return {
    requestedEditor: "First Available",
    division: "",
    teamName: "",
    packageType: defaultAddOrderPackageType(formType),
    timeLengthOfMix: defaultAddOrderMixLength(formType),
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

function composeCheerPackageLabel(
  tierOrPackage: string,
  mixLength?: string
): string {
  const raw = tierOrPackage.trim();
  if (!raw) return mixLength?.trim() || "";
  const parsed = parsePackage(raw);
  const tier =
    parsed.tier && parsed.tier !== "-"
      ? parsed.tier
      : raw.replace(/\s+\d+:\d{2}\b/g, "").replace(/\s+TBD\b/i, "").trim();
  const length = (mixLength || "").trim();
  if (tier && length && length !== "-") return `${tier} ${length}`;
  return tier || raw;
}

/**
 * Gym / school / program identity only — never Team Name.
 * Magento keeps team_name separate from school_gym_name.
 */
export function manualOrderIdentityName(order: Order): string {
  return getOrderIdentityName(order).trim();
}

export function orderTeamName(
  order: Pick<Order, "teamName"> | Partial<Order> | null | undefined
): string {
  return String(order?.teamName || "").trim();
}

/** Team Name exists on Magento for All-Star Cheer and Youth Rec only. */
export function cheerSubtypeHasTeamName(
  order: Pick<Order, "formType" | "cheerFormSubtype"> | null | undefined
): boolean {
  if (order?.formType !== "school-all-star-cheer") return false;
  const sub = String(order.cheerFormSubtype || "all-star-cheer");
  return sub === "all-star-cheer" || sub === "youth-rec-cheer";
}

function mixHasTeamName(mix: Partial<Order>): boolean {
  return Boolean(orderTeamName(mix));
}

export type BuildManualOrdersFromMixesArgs = {
  orderDraft: Order;
  mixes: Partial<Order>[];
  formType: OrderFormType;
  cheerSubtype: CheerFormSubtype;
  danceSubtype: DanceFormSubtype;
  category: string;
};

/**
 * Build one Partial<Order> per mix for Add New Order save.
 * Shared identity/contacts come from the draft; mix overlays supply unique
 * team / package / length / producer / dance style fields.
 */
export function buildManualOrdersFromMixes(
  args: BuildManualOrdersFromMixesArgs
): Partial<Order>[] {
  const {
    orderDraft,
    mixes,
    formType,
    cheerSubtype,
    danceSubtype,
    category,
  } = args;
  const mixKeys = getAddOrderMultiMixFieldKeys(orderDraft);
  let mixList =
    mixes.length > 0
      ? mixes
      : mixKeys.length > 0
        ? [pickMixFieldValues(orderDraft, mixKeys)]
        : [{}];
  // All-Star / Youth Rec with no gym/program: only mixes with a team name.
  if (
    cheerSubtypeHasTeamName(orderDraft) &&
    !manualOrderIdentityName(orderDraft)
  ) {
    mixList = mixList.filter(mixHasTeamName);
    if (mixList.length === 0) mixList = [{}];
  }
  const sharedBase = orderWithoutMixFields(orderDraft, mixKeys);

  return mixList.map((mix) => {
    const draft = applyMixFieldValues(sharedBase, mix);
    const tier =
      packageTypeDisplayValue(draft.packageType || "") ||
      packageTypeDisplayValue(draft.package || "");
    const fallbackLength = defaultAddOrderMixLength(formType);
    const mixLength =
      (draft.timeLengthOfMix || "").trim() || fallbackLength;
    const fallbackPkg = defaultAddOrderPackageType(formType);
    const selectedPkg =
      formType === "school-all-star-cheer"
        ? composeCheerPackageLabel(tier || fallbackPkg, mixLength) ||
          fallbackPkg
        : tier ||
          (draft.packageType || draft.package || "").trim() ||
          fallbackPkg;

    const contact =
      draft.coachName ||
      draft.coachContactFullName ||
      draft.musicContactName ||
      draft.contactName ||
      draft.customerName ||
      "";

    // Identity SoT only — never fall back to teamName or dance style.
    const identity = manualOrderIdentityName(draft);
    const gym = (draft.gymName || "").trim() || identity;
    const school = (draft.schoolName || "").trim() || identity;
    const schoolProgram = (draft.schoolProgramName || "").trim() || identity;

    // Dance: keep style unique per mix; Gameday also mirrors onto `style` SoT.
    const styleOfGameday = (draft.styleOfGamedayMix || "").trim();
    const style =
      (draft.style || "").trim() ||
      (danceSubtype === "gameday" ? styleOfGameday : "");

    return {
      ...draft,
      isManualEntry: true,
      category,
      package: formType === "school-anthem" ? "SCHOOL ANTHEMS" : selectedPkg,
      packageType:
        formType === "school-anthem"
          ? "SCHOOL ANTHEMS"
          : tier || draft.packageType || fallbackPkg,
      price: formType === "school-anthem" ? 1250 : draft.price,
      timeLengthOfMix: mixLength,
      contactName: contact,
      customerName: contact,
      programName: identity,
      gymName: gym,
      schoolName: school,
      schoolProgramName: schoolProgram,
      // Per-mix team stays on team_name only.
      teamName: draft.teamName || "",
      style,
      styleOfGamedayMix: styleOfGameday,
      formType,
      cheerFormSubtype:
        formType === "school-all-star-cheer" ? cheerSubtype : undefined,
      danceFormSubtype:
        formType === "school-all-star-dance" ? danceSubtype : undefined,
      editorRequest:
        draft.requestedEditor === "First Available" || !draft.requestedEditor
          ? "FA"
          : draft.requestedEditor,
      requestedProducer: draft.requestedEditor || "",
      musicTheme:
        draft.songListSuggestions ||
        draft.routineNotes ||
        draft.musicTheme ||
        "",
      mixStartDate: "",
      mixEndDate: "",
      assignedProducer: "",
    };
  });
}

function mixHasMeaningfulContent(
  mix: Partial<Order>,
  mixKeys: string[],
  order: Order
): boolean {
  for (const key of mixKeys) {
    if (!ADD_ORDER_MANUAL_FIELD_KEYS.has(key)) continue;
    if (ADD_ORDER_NON_CONTENT_KEYS.has(key)) continue;
    // Package / FA / Division / Team Name / mix length never unlock save.
    if (ADD_ORDER_NON_UNLOCK_FIELD_KEYS.has(key)) continue;
    const raw = String((mix as Record<string, unknown>)[key] ?? "").trim();
    if (isAddOrderPrefillValue(key, raw, order)) continue;
    if (hasMeaningfulFieldValue(raw, { fieldKey: key })) return true;
  }
  return false;
}

/**
 * Add New Order save gate: any one Gym / address / coach / billing field.
 * Team Name (even on every duplicated mix), Division, package, and mix
 * length never unlock save.
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
      if (!ADD_ORDER_MANUAL_FIELD_KEYS.has(field.key)) continue;
      if (ADD_ORDER_NON_CONTENT_KEYS.has(field.key)) continue;
      if (ADD_ORDER_NON_UNLOCK_FIELD_KEYS.has(field.key)) continue;
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

export function addOrderSaveBlockReason(
  order: Order,
  mixes: Partial<Order>[],
  mixKeys: string[]
): string {
  if (addOrderDraftHasContent(order, mixes, mixKeys)) return "";
  return "Add at least 1 field from Gym or Coach / Billing. Division and Team Name do not count.";
}
