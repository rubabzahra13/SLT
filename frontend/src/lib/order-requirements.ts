import type { MTDRecord, Order, OrderFormType } from "@/types";
import { parsePackage } from "@/lib/package";
import { hasMeaningfulFieldValue } from "@/lib/empty-field-tokens";
import {
  packDanceSongCovers,
  parseDanceSongCovers,
} from "@/lib/dance-song-covers";
import { getOrderDetailSections } from "@/lib/order-detail-sections";
export type RequirementCategory = "collections" | "songs";
export type RequirementState = "green" | "red" | "white";

export type OrderRequirementItem = {
  id: "form" | "mix" | "cs" | "video" | "songs" | "notes" | "time_of_mix" | "compliancy" | "eight_count";
  label: string;
  category: RequirementCategory;
  state: RequirementState;
  isApplicable: boolean;
  provided: boolean;
  value?: string;
  status: "green" | "red" | "white";
};

export type OrderDataStatus = "Missing Data" | "Complete data";

/** Read-only assignment column states on the Orders tab. */
export type OrderAssignmentStatus =
  | "not_assigned"
  | "assigned"
  | "reassign_leave"
  | "reassign_rush";

export type OrderReassignReason =
  | "leave"
  | "rush_order"
  | "producer_deletion"
  | "category_removed"
  | "extra_day_removed";

export const ORDER_ASSIGNMENT_STATUS_LABEL: Record<
  OrderAssignmentStatus,
  string
> = {
  not_assigned: "Not assigned",
  assigned: "Assigned",
  reassign_leave: "Reassign",
  reassign_rush: "Reassign rush",
};

export const ORDER_REASSIGN_STATUS: Record<OrderReassignReason, string> = {
  leave: "Reassign: Off day",
  rush_order: "Reassign: rush order",
  producer_deletion: "Reassign: Producer deleted",
  category_removed: "Reassign: Category removed",
  extra_day_removed: "Reassign: Extra day removed",
};

export const ORDER_RESELECTION_REASON_LABEL: Record<
  OrderReassignReason,
  string
> = {
  leave: "Off day",
  rush_order: "Rush order",
  producer_deletion: "Producer deleted",
  category_removed: "Category removed",
  extra_day_removed: "Extra day removed",
};

export type OrderRequirementsResult = {
  collections: OrderRequirementItem[];
  songsArea: OrderRequirementItem[];
  all: OrderRequirementItem[];
  allMet: boolean;
  missingCount: number;
  /** Data completeness only: independent of reassignment. */
  status: OrderDataStatus;
  needsReassign: boolean;
  reassignReason: OrderReassignReason | null;
  isWaitingForData: boolean;
  /** True when compliancy is applicable AND the affiliate/compliancy field is empty */
  compliancyMet: boolean;
};

function parseReassignReason(
  rawManual: string | null | undefined,
  isReassignedFlag: boolean
): OrderReassignReason | null {
  // Once reassignment is completed (producer assigned), isReassigned is cleared.
  // Ignore stale leave/rush labels left in orderStatus.
  if (!isReassignedFlag) return null;
  const raw = String(rawManual || "").trim().toLowerCase();
  if (
    raw === "reassign: leave" ||
    raw === "reassign leave" ||
    raw === "reassign: off day" ||
    raw === "reassign off day"
  ) {
    return "leave";
  }
  if (
    raw.startsWith("reassign: delete producer") ||
    raw.startsWith("reassign: producer deleted") ||
    raw === "reassign: producer deletion" ||
    raw === "reassign producer deletion" ||
    raw === "reassign producer deleted" ||
    raw === "producer deletion" ||
    raw === "delete producer" ||
    raw === "deleted producer" ||
    raw === "producer deleted"
  ) {
    return "producer_deletion";
  }
  if (
    raw.startsWith("reassign: category removed") ||
    raw.includes("category removed")
  ) {
    return "category_removed";
  }
  if (
    raw.startsWith("reassign: extra day removed") ||
    raw.includes("extra day removed")
  ) {
    return "extra_day_removed";
  }
  if (
    raw === "reassign: rush order" ||
    raw === "reassign rush order" ||
    raw === "reassign rush" ||
    raw === "reassigned" ||
    raw === "reassign"
  ) {
    return "rush_order";
  }
  // Data-status labels used to be written into orderStatus and wiped leave/rush.
  // With the flag set and no explicit leave label, default to rush.
  return "rush_order";
}

/**
 * Determines whether a string value is present and non-empty.
 * Placeholder sentinels (none, N/A, TBD, null, …) count as missing -
 * see EMPTY_FIELD_TOKENS in empty-field-tokens.ts.
 */
function isPresent(val: string | null | undefined): boolean {
  return hasMeaningfulFieldValue(val);
}

/** True when text is only an affiliate label like "(Power Music Covers)", not a song list. */
function isAffiliateOnlySongText(val: string): boolean {
  let cleaned = val
    .replace(/[()]/g, " ")
    .replace(/\s*[·|]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!cleaned) return true;
  const affiliates = [
    "power music & unleash the beats covers (can not be used for a titanium package)",
    "power music & unleash the beats covers",
    "100% original custom music (titanium package only)",
    "power music + unleash the beats",
    "unleash the beats covers",
    "power music covers",
    "songs for cheer",
    "unleash the beats",
    "power music",
    "non-compliant",
    "non compliant",
  ].sort((a, b) => b.length - a.length);
  // Peel off repeated affiliate labels until nothing remains.
  let changed = true;
  while (changed && cleaned) {
    changed = false;
    for (const a of affiliates) {
      if (cleaned === a) return true;
      if (cleaned.startsWith(`${a} `)) {
        cleaned = cleaned.slice(a.length).trim();
        changed = true;
        break;
      }
    }
  }
  return cleaned === "";
}

/**
 * All-Star Dance (every subcategory: POM / Hip Hop / Team Performance /
 * Gameday / Jazz-Kick). Shared Songs SoT = Power Music OR Unleash covers;
 * collections = Songs + Mix Time (Jazz Simple Cut also Notes).
 */
export function isAllStarDanceOrder(order: Order | MTDRecord): boolean {
  const o = order as Order & MTDRecord & Record<string, unknown>;
  const formType = String(o.formType || o.form_type || "").toLowerCase();
  if (formType.includes("dance")) return true;
  if (String(o.danceFormSubtype || o.dance_form_subtype || "").trim()) {
    return true;
  }
  const category = String(o.category || "").toLowerCase();
  if (
    category.includes("dance") ||
    category.includes("pom") ||
    category.includes("hip") ||
    category.includes("gameday") ||
    category.includes("jazz") ||
    category.includes("team performance")
  ) {
    return true;
  }
  const pkg = String(
    o.package || o.packageType || o.package_type || ""
  ).toUpperCase();
  // Dance-only Magento packages (do not use bare RALLY MIX: Cheer shares it).
  return (
    pkg.includes("DANCE MIX") ||
    pkg.includes("DANCE PLUS") ||
    pkg.includes("CUSTOM POM") ||
    pkg.includes("CUSTOM HIP") ||
    pkg.includes("TP MIX") ||
    pkg.includes("TP PLUS") ||
    pkg.includes("PERFORMANCE MIX") ||
    pkg.includes("PERFORMANCE PLUS") ||
    pkg.includes("PERFORMANCE EXTREME") ||
    pkg.includes("JAZZ SIMPLE CUT") ||
    pkg.includes("JAZZ/KICK") ||
    pkg.includes("JAZZ KICK") ||
    pkg.includes("NON-COMPLIANT (FOR DTU)")
  );
}

/**
 * Song-list text for the Songs pill: must match the edit-form field:
 * Cheer / All Star → Song list/suggestions
 * Dance → Power Music Covers / Unleash the Beats Covers
 * Sports → customer songs / song list
 * School Anthem → Instrumental Style Preference (instrumentation_notes)
 * Marching Band → Notes to Producer Regarding Instrumentation
 * Never use musicTheme (often affiliate labels).
 *
 * @param opts.includePlaceholders When true, return sentinel tokens (none, N/A, …)
 *   so the red→green collection modal can show the amber “placeholder on file” UI.
 *   Default false: placeholders do not count as collected for the Songs pill.
 */
export function getFormSongListText(
  order: Order | MTDRecord,
  opts?: { includePlaceholders?: boolean }
): string {
  const o = order as Order & MTDRecord & Record<string, unknown>;
  const formType = String(o.formType || o.form_type || "").toLowerCase();
  const category = String(o.category || "").toLowerCase();
  const pkg = String(o.package || o.packageType || o.package_type || "").toUpperCase();
  const isDance = isAllStarDanceOrder(order);
  const isAnthem =
    formType.includes("anthem") || category.includes("anthem");
  const isSports =
    formType.includes("sports") || category.includes("sports");
  const isMarchingBand =
    formType.includes("band") ||
    category.includes("band") ||
    category.includes("marching") ||
    pkg.includes("BAND CHANT") ||
    pkg.includes("CADENCE") ||
    pkg.includes("FIGHT SONG") ||
    pkg.includes("ALMA MATER");
  const includePlaceholders = Boolean(opts?.includePlaceholders);

  const pick = (...vals: unknown[]) => {
    for (const raw of vals) {
      const text = String(raw ?? "").trim();
      if (!text) continue;
      if (!includePlaceholders && !isPresent(text)) continue;
      if (isAffiliateOnlySongText(text)) continue;
      return text;
    }
    return "";
  };

  if (isDance) {
    // Dance covers are packed in song_list_suggestions (Magento labels).
    return pick(
      o.powerMusicCovers,
      o.power_music_covers,
      o.unleashTheBeatsCovers,
      o.unleash_the_beats_covers,
      o.songListSuggestions,
      o.song_list_suggestions
    );
  }
  if (isAnthem) {
    // Magento "Instrumental Style Preference" → song_list_suggestions.
    return pick(
      o.songListSuggestions,
      o.song_list_suggestions,
      o.instrumentationNotes,
      o.instrumentation_notes,
      o.instrumentalStylePreference
    );
  }
  if (isSports) {
    return pick(
      o.customerSongs,
      o.customer_songs,
      o.songListSuggestions,
      o.song_list_suggestions
    );
  }
  if (isMarchingBand) {
    // Band Chant Songs pill: instrumentation → song_list_suggestions.
    return pick(
      o.songListSuggestions,
      o.song_list_suggestions,
      o.instrumentationNotes,
      o.instrumentation_notes
    );
  }
  // Cheer / All Star Cheer / default → Song list/suggestions only.
  return pick(o.songListSuggestions, o.song_list_suggestions);
}

/**
 * Songs SoT including placeholder tokens: for collection toggle confirm UI only.
 * Does not green the Songs pill (use getFormSongListColumnText / isPresent for that).
 */
export function getFormSongListStoredText(order: Order | MTDRecord): string {
  return getFormSongListText(order, { includePlaceholders: true })
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Board "Form song list" column + Songs pill.
 *
 * Prefer real form Song list / Power Music / Unleash / customer songs.
 * Fall back to legacy `musicTheme` for Cheer historical board text only.
 * Dance / School Anthem / Marching Band / Sports Entertainment: no musicTheme
 * fallback: Dance Songs must be Power Music OR Unleash covers only; other
 * forms pack notes into musicTheme and would wrongly green Songs.
 */
export function getFormSongListColumnText(order: Order | MTDRecord): string {
  const fromForm = getFormSongListText(order).replace(/\s+/g, " ").trim();
  if (fromForm) return fromForm;
  const o = order as Order & MTDRecord & Record<string, unknown>;
  const formType = String(o.formType || o.form_type || "").toLowerCase();
  const category = String(o.category || "").toLowerCase();
  if (
    isAllStarDanceOrder(order) ||
    formType.includes("anthem") ||
    category.includes("anthem") ||
    formType.includes("band") ||
    category.includes("band") ||
    category.includes("marching") ||
    formType.includes("sports") ||
    category.includes("sports")
  ) {
    return "";
  }
  return String(o.musicTheme || o.music_theme || "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Dance Songs confirm preview: show both cover boxes when either is filled
 * (Songs is green if Power Music OR Unleash has text).
 */
export function getDanceSongsConfirmText(order: Order | MTDRecord): string {
  const o = order as Order & MTDRecord & Record<string, unknown>;
  let power = String(o.powerMusicCovers || o.power_music_covers || "").trim();
  let unleash = String(
    o.unleashTheBeatsCovers || o.unleash_the_beats_covers || ""
  ).trim();
  if (!power && !unleash) {
    const parsed = parseDanceSongCovers(
      String(o.songListSuggestions || o.song_list_suggestions || "")
    );
    power = parsed.power;
    unleash = parsed.unleash;
  }
  return packDanceSongCovers(power, unleash) || power || unleash;
}

/**
 * Marching Band package family for Songs/Notes SoT.
 * - band_chant → Song from song_list_suggestions (was instrumentation notes)
 * - drum_cadence → Notes from song_list_suggestions (was instrumentation notes)
 * - fight_alma → Notes from routine_notes (was lyrical notes)
 */
export type MarchingBandPackageKind =
  | "band_chant"
  | "drum_cadence"
  | "fight_alma"
  | "other";

export function resolveMarchingBandPackageKind(
  order: Order | MTDRecord | null | undefined
): MarchingBandPackageKind {
  const pkg = String(
    (order as Order)?.package ||
      (order as Order)?.packageType ||
      (order as { package_type?: string })?.package_type ||
      ""
  ).toUpperCase();
  if (pkg.includes("BAND CHANT")) return "band_chant";
  if (pkg.includes("DRUM CADENCE") || pkg.includes("CADENCE")) {
    return "drum_cadence";
  }
  if (pkg.includes("FIGHT SONG") || pkg.includes("ALMA MATER")) {
    return "fight_alma";
  }
  return "other";
}

export function isMarchingBandOrder(
  order: Order | MTDRecord | null | undefined
): boolean {
  if (!order) return false;
  const formType = String(
    (order as Order).formType ||
      (order as { form_type?: string }).form_type ||
      ""
  ).toLowerCase();
  const category = String(order.category || "").toLowerCase();
  const kind = resolveMarchingBandPackageKind(order);
  return (
    formType.includes("band") ||
    category.includes("band") ||
    category.includes("marching") ||
    kind !== "other"
  );
}

/** Notes pill text: Magento Notes field (routine_notes SoT). */
export function getFormNotesText(order: Order | MTDRecord): string {
  const o = order as Order & MTDRecord & Record<string, unknown>;
  return String(
    o.routineNotes ||
      o.additionalNotes ||
      o.lyricalNotes ||
      o.routine_notes ||
      o.additional_notes ||
      o.lyrical_notes ||
      ""
  ).trim();
}

/** Magento form keys present on this order's category form (not package). */
function magentoFormFieldKeys(order: Order | MTDRecord): Set<string> {
  const o = order as Order;
  const formType = (o.formType ||
    (order as { form_type?: string }).form_type ||
    "") as OrderFormType | "";
  if (!formType) return new Set();
  try {
    const sections = getOrderDetailSections({
      ...o,
      formType: formType as OrderFormType,
      cheerFormSubtype: o.cheerFormSubtype || "all-star-cheer",
      danceFormSubtype: o.danceFormSubtype || "pom",
    } as Order);
    return new Set(sections.flatMap((s) => s.fields.map((f) => f.key)));
  } catch {
    return new Set();
  }
}

/**
 * Board Collections / Songs pills follow Magento form fields for this
 * category: never package tier (Platinum/Titanium/Jazz Simple Cut, etc.).
 */
function magentoBoardPillFlags(order: Order | MTDRecord): {
  needMix: boolean;
  needCsField: boolean;
  needSongs: boolean;
  needNotes: boolean;
  songsLabel: string;
} {
  const keys = magentoFormFieldKeys(order);
  // Fallback when formType missing: infer from category helpers.
  if (keys.size === 0) {
    const isDance = isAllStarDanceOrder(order);
    const isMB = isMarchingBandOrder(order);
    const formType = String(
      (order as Order).formType ||
        (order as { form_type?: string }).form_type ||
        ""
    ).toLowerCase();
    const category = String(order.category || "").toLowerCase();
    const isAnthem =
      formType.includes("anthem") || category.includes("anthem");
    const isSports =
      formType.includes("sports") || category.includes("sports");
    const isCheer =
      formType.includes("cheer") ||
      category.includes("cheer") ||
      (!isDance && !isMB && !isAnthem && !isSports);
    return {
      needMix: !isAnthem,
      needCsField: isCheer,
      needSongs: true,
      needNotes: true,
      songsLabel: isAnthem || isMB ? "Song" : "Songs",
    };
  }

  const needMix = keys.has("timeLengthOfMix");
  const needCsField =
    keys.has("sendingEightCountSheets") || keys.has("usingEightCountSheets");
  const needSongs =
    keys.has("songListSuggestions") ||
    keys.has("powerMusicCovers") ||
    keys.has("unleashTheBeatsCovers") ||
    keys.has("customerSongs");
  const needNotes =
    keys.has("routineNotes") ||
    keys.has("additionalNotes") ||
    keys.has("lyricalNotes");

  const formType = String(
    (order as Order).formType ||
      (order as { form_type?: string }).form_type ||
      ""
  ).toLowerCase();
  const songsLabel =
    formType.includes("anthem") || formType.includes("band")
      ? "Song"
      : "Songs";

  return { needMix, needCsField, needSongs, needNotes, songsLabel };
}

/** True when Form song list column has display text (Songs pill = green). */
export function hasFormSongListData(order: Order | MTDRecord): boolean {
  return isPresent(getFormSongListColumnText(order));
}

/**
 * Reads explicit manual toggle override from record if present.
 */
function getOverrideState(order: Order | MTDRecord, itemId: string): boolean | undefined {
  const overrides = (order as any).collectionStates || (order as any).collection_states;
  if (overrides && typeof overrides === "object") {
    if (typeof overrides[itemId] === "boolean") return overrides[itemId];
    if (itemId === "form" && typeof overrides["compliancy"] === "boolean") return overrides["compliancy"];
    if (itemId === "compliancy" && typeof overrides["form"] === "boolean") return overrides["form"];
    if (itemId === "mix" && typeof overrides["time_of_mix"] === "boolean") return overrides["time_of_mix"];
    if (itemId === "time_of_mix" && typeof overrides["mix"] === "boolean") return overrides["mix"];
    if (itemId === "cs" && typeof overrides["eight_count"] === "boolean") return overrides["eight_count"];
    if (itemId === "eight_count" && typeof overrides["cs"] === "boolean") return overrides["cs"];
  }

  // Songs green/red defaults from form song-list content (see hasFormSongListData).
  // Do not let stale haveSongs NEED/HAVE override that: only collectionStates.songs.

  if (itemId === "cs" || itemId === "eight_count") {
    // Collection status only: not the form Yes/No "will you send" intent.
    const val =
      (order as any).eightCountSheet ||
      (order as any).received_eight_count_sheet;
    const upper = String(val || "").trim().toUpperCase();
    if (
      upper === "HAVE CS" ||
      upper === "CS CONFIRMED" ||
      upper === "HAVE" ||
      upper === "COLLECTED"
    ) {
      return true;
    }
    if (
      upper === "NEED CS" ||
      upper === "UNCOLLECTED" ||
      upper === "NEED"
    ) {
      return false;
    }
  }

  return undefined;
}

/** Form answer: will the customer send 8-count sheets? (Yes → CS applicable/red until received). */
export function resolveSendingEightCountIntent(
  order: Order | MTDRecord
): "yes" | "no" | null {
  const candidates = [
    (order as Order).sendingEightCountSheets,
    (order as Order).usingEightCountSheets,
    (order as any).sending_eight_count_sheets,
    (order as any).using_eight_count_sheets,
  ];
  for (const raw of candidates) {
    const s = String(raw || "").trim().toUpperCase();
    if (!s) continue;
    if (s === "YES" || s === "Y" || s.startsWith("YES")) return "yes";
    if (s === "NO" || s === "N" || s.startsWith("NO")) return "no";
  }
  // Legacy: received CS field sometimes held the form Yes/No directly.
  const sheet = String(
    (order as MTDRecord).eightCountSheet ||
      (order as any).received_eight_count_sheet ||
      ""
  )
    .trim()
    .toUpperCase();
  if (sheet === "YES" || sheet === "Y") return "yes";
  if (sheet === "NO" || sheet === "N") return "no";
  return null;
}

function isEightCountCollected(sheetVal: unknown): boolean {
  const sheetStr = String(sheetVal || "").trim().toUpperCase();
  if (!sheetStr) return false;
  // Yes/No is send-intent, not collection.
  if (
    sheetStr === "YES" ||
    sheetStr === "Y" ||
    sheetStr === "NO" ||
    sheetStr === "N" ||
    sheetStr.startsWith("YES") ||
    sheetStr.startsWith("NO")
  ) {
    return false;
  }
  return (
    sheetStr.includes("HAVE CS") ||
    sheetStr.includes("CS CONFIRMED") ||
    sheetStr.includes("ATTACHED") ||
    sheetStr.includes("RECEIVED") ||
    sheetStr === "HAVE" ||
    sheetStr === "COLLECTED" ||
    (sheetStr.includes("HAVE") && !sheetStr.includes("NEED"))
  );
}

/**
 * Canonical 3-State Requirements Engine:
 * Collections / Songs pills follow Magento form fields for the order's
 * category (not package tier). Manual unmatched rows also get Form.
 *
 * Requirements evaluate to 3 distinct states:
 * - GREEN: Required + Collected
 * - RED: Required + Missing
 * - WHITE: Not Applicable (Ignored for status progression)
 */
export function getOrderRequirements(order: Order | MTDRecord): OrderRequirementsResult {
  const requirements: OrderRequirementItem[] = [];

  const category = (order.category || "").trim().toLowerCase();
  const rawFormType = ((order as any).formType || "").trim().toLowerCase();
  const parsedPkg = parsePackage(order.package || (order as any).packageType || "");

  const isCheer =
    category.includes("cheer") ||
    rawFormType.includes("cheer") ||
    (!isAllStarDanceOrder(order) &&
      !isMarchingBandOrder(order) &&
      !category.includes("anthem") &&
      !rawFormType.includes("anthem") &&
      !category.includes("sports") &&
      !rawFormType.includes("sports"));
  const isSports = category.includes("sports") || rawFormType.includes("sports");
  const isDance = isAllStarDanceOrder(order);
  const isMarchingBand = isMarchingBandOrder(order);
  const isAnthem =
    category.includes("anthem") || rawFormType.includes("anthem");

  const pills = magentoBoardPillFlags(order);
  const needSongs = pills.needSongs;
  const songsLabel = pills.songsLabel;
  const needNotes = pills.needNotes;
  const needTimeOfMix = pills.needMix;
  // CS only when Magento has the 8-count question; Yes/No still gates display.
  const needEightCount = pills.needCsField;
  // No Magento Video field on any current form: never a board pill.
  const needVideo = false;
  const needCompliancy = false;

  // --- COLLECTIONS GROUP ---
  // Form pill: unmatched Manual / New Order rows only. Once Magento matches,
  // the row is treated as a Form order (no Form pill).
  const hasMatchedMagentoForm = Boolean(
    (order as Order).mergedFormOrderId ||
      ((order as Order).manualOverlapSnapshot &&
        Object.keys((order as Order).manualOverlapSnapshot || {}).length > 0) ||
      (order as { merged_form_order_id?: string }).merged_form_order_id
  );
  const isManualOrder =
    !hasMatchedMagentoForm &&
    (Boolean((order as MTDRecord).isManualScheduleEntry) ||
      Boolean((order as Order).isManualEntry) ||
      (order as MTDRecord).orderId === null);

  // 1. MIX / TIME OF MIX
  // SoT = Time Length of Mix field only (every category). Empty → red, filled →
  // green. Never stay green from collectionStates.mix / package label leftovers.
  {
    const rawFieldTime = String(
      (order as Order).timeLengthOfMix ??
        (order as { time_length_of_mix?: string }).time_length_of_mix ??
        ""
    ).trim();
    // Cheer Magento often encodes length in package (GOLD 2:00) when the SoftSelect
    // column was never written: use that only if the dedicated field is absent.
    const cheerPackageTime =
      isCheer && !isSports && !isDance && !isMarchingBand && !isAnthem
        ? String(parsedPkg.limit || "").trim()
        : "";
    const rawTime =
      rawFieldTime ||
      (cheerPackageTime && cheerPackageTime !== "-" ? cheerPackageTime : "");
    const defaultProvided = isPresent(rawTime) && rawTime !== "-";
    const isApplicable = needTimeOfMix;
    let state: RequirementState = "white";
    if (isApplicable) {
      state = defaultProvided ? "green" : "red";
    }
    requirements.push({
      id: "mix",
      label: "Mix Time",
      category: "collections",
      state,
      isApplicable,
      provided: state === "green",
      value: defaultProvided ? rawTime : undefined,
      status: state === "green" ? "green" : state === "red" ? "red" : "white",
    });
  }

  // 2. CS / 8-COUNT SHEETS
  // Form Yes = customer will email sheets → CS applicable + RED until admin marks green.
  // Form No = not applicable (white). Package rules are the fallback when form is blank.
  {
    const override =
      getOverrideState(order, "cs") ?? getOverrideState(order, "eight_count");
    const sendIntent = resolveSendingEightCountIntent(order);
    const sheetVal =
      (order as MTDRecord).eightCountSheet ||
      (order as any).received_eight_count_sheet;
    const defaultProvided = isEightCountCollected(sheetVal);
    const isApplicable =
      sendIntent === "yes"
        ? true
        : sendIntent === "no"
          ? false
          : needEightCount;
    let state: RequirementState = "white";
    if (isApplicable) {
      const isCollected = override !== undefined ? override : defaultProvided;
      state = isCollected ? "green" : "red";
    }
    requirements.push({
      id: "cs",
      label: "CS",
      category: "collections",
      state,
      isApplicable,
      provided: state === "green",
      status: state === "green" ? "green" : state === "red" ? "red" : "white",
    });
  }

  // 3. VIDEO
  {
    const override = getOverrideState(order, "video");
    // There is no free-text "video" field on an order, so collection is driven
    // by the explicit toggle (collectionStates.video) or a genuine video link.
    // Do NOT infer from routineNotes/musicTheme: those almost always have
    // content and would wrongly mark the video as received (hiding it from the
    // missing-data email).
    const videoVal = (order as any).video_url || (order as any).videoUrl;
    const videoStr = String(videoVal || "").toUpperCase();
    const defaultProvided =
      isPresent(videoStr) &&
      (videoStr.includes("HTTP") ||
        videoStr.includes("YOUTUBE") ||
        videoStr.includes("VIMEO") ||
        videoStr.includes("VIDEO") ||
        videoStr.includes("ATTACHED") ||
        videoStr.includes("YES"));
    const isApplicable = needVideo;
    let state: RequirementState = "white";
    if (isApplicable) {
      const isCollected = override !== undefined ? override : defaultProvided;
      state = isCollected ? "green" : "red";
    }
    requirements.push({
      id: "video",
      label: "Video",
      category: "collections",
      state,
      isApplicable,
      provided: state === "green",
      status: state === "green" ? "green" : state === "red" ? "red" : "white",
    });
  }

  if (isManualOrder) {
    // Form pill: automatic red until Magento matches (then row becomes Form order).
    requirements.push({
      id: "form",
      label: "Form",
      category: "collections",
      state: "red",
      isApplicable: true,
      provided: false,
      status: "red",
    });
  }

  // --- SONGS GROUP ---

  // 4. SONGS: green/red matches Form song list column (form field or musicTheme).
  {
    const defaultProvided = hasFormSongListData(order);
    const isApplicable = needSongs;
    let state: RequirementState = "white";
    if (isApplicable) {
      state = defaultProvided ? "green" : "red";
    }
    requirements.push({
      id: "songs",
      label: songsLabel,
      category: "songs",
      state,
      isApplicable,
      provided: state === "green",
      status: state === "green" ? "green" : state === "red" ? "red" : "white",
    });
  }

  // 5. NOTES: green iff Magento Notes field has content (routine_notes SoT).
  // Ignore collectionStates: pill must match the form field exactly.
  {
    const notesVal = getFormNotesText(order);
    const defaultProvided = isPresent(String(notesVal));
    const isApplicable = needNotes;
    let state: RequirementState = "white";
    if (isApplicable) {
      state = defaultProvided ? "green" : "red";
    }
    requirements.push({
      id: "notes",
      label: "Notes",
      category: "songs",
      state,
      isApplicable,
      provided: state === "green",
      status: state === "green" ? "green" : state === "red" ? "red" : "white",
    });
  }

  // Background Compliancy check for status calculation if required
  let compliancyMet = true;
  if (needCompliancy) {
    const override = getOverrideState(order, "compliancy") ?? getOverrideState(order, "form");
    const affiliate = (order as Order).musicAffiliate || (order as any).music_affiliate || (order as any).powerMusicCovers;
    const defaultProvided = typeof affiliate === "string" && affiliate.trim().length > 0;
    compliancyMet = override !== undefined ? override : defaultProvided;
  }

  const collections = requirements.filter((r) => r.category === "collections");
  const songsArea = requirements.filter((r) => r.category === "songs");

  const rawManual = (order as any).orderStatus || (order as any).order_status;
  // Normalize legacy labels. "Reassign" / "Reassigned" are not data statuses.
  // Also ignore data labels that used to be incorrectly stored in orderStatus -
  // those must not override pill-derived completeness for reassigned rows.
  const isDataStatusLabel =
    rawManual === "Need to be Scheduled" ||
    rawManual === "Reschedule" ||
    rawManual === "Unscheduled" ||
    rawManual === "Unassigned" ||
    rawManual === "Complete" ||
    rawManual === "Complete data" ||
    rawManual === "Waiting for Data" ||
    rawManual === "Incomplete Data" ||
    rawManual === "Missing Data";
  const manualDataStatus: OrderDataStatus | null =
    rawManual === "Need to be Scheduled" ||
    rawManual === "Reschedule" ||
    rawManual === "Unscheduled" ||
    rawManual === "Unassigned" ||
    rawManual === "Complete" ||
    rawManual === "Complete data"
      ? "Complete data"
      : rawManual === "Waiting for Data" ||
          rawManual === "Incomplete Data" ||
          rawManual === "Missing Data"
        ? "Missing Data"
        : null;
  const isReassignedFlag = Boolean(
    (order as any).isReassigned ?? (order as any).is_reassigned
  );
  // When orderStatus was overwritten with a data label, parse leave/rush from
  // the flag only (rush default). Prefer calculated data status for those rows.
  const reassignReason = parseReassignReason(
    isDataStatusLabel ? null : rawManual,
    isReassignedFlag
  );
  const needsReassign = reassignReason !== null;

  // Reassign leave/rush always land on Orders as Complete data: force
  // applicable pills green so Data badge and collection UI stay aligned.
  if (needsReassign) {
    for (const item of requirements) {
      if (!item.isApplicable) continue;
      item.state = "green";
      item.provided = true;
      item.status = "green";
    }
  }

  const applicableItems = requirements.filter((r) => r.isApplicable);
  const effectiveCompliancyMet = needsReassign ? true : compliancyMet;
  const hasRed =
    applicableItems.some((r) => r.state === "red") || !effectiveCompliancyMet;
  const missingCount = needsReassign
    ? 0
    : applicableItems.filter((r) => r.state === "red").length +
      (!compliancyMet ? 1 : 0);
  const allMet = !hasRed;

  const calculatedStatus: OrderDataStatus = needsReassign
    ? "Complete data"
    : hasRed
      ? "Missing Data"
      : "Complete data";

  const status: OrderDataStatus = needsReassign
    ? "Complete data"
    : isDataStatusLabel
      ? calculatedStatus
      : (manualDataStatus ?? calculatedStatus);
  const isWaitingForData = status === "Missing Data";

  return {
    collections,
    songsArea,
    all: requirements,
    allMet,
    missingCount,
    status,
    needsReassign,
    reassignReason,
    isWaitingForData,
    compliancyMet: effectiveCompliancyMet,
  };
}

/** Merge linked order form fields (e.g. sending 8-count Yes/No) onto an MTD row. */
export function mergeOrderFormFieldsForRequirements(
  record: Order | MTDRecord,
  linkedOrder?: Order | null
): Order | MTDRecord {
  if (!linkedOrder) return record;
  const rec = record as Order & MTDRecord;
  return {
    ...record,
    formType: linkedOrder.formType || (rec as Order).formType,
    cheerFormSubtype:
      linkedOrder.cheerFormSubtype || (rec as Order).cheerFormSubtype,
    danceFormSubtype:
      linkedOrder.danceFormSubtype || (rec as Order).danceFormSubtype,
    // Package column already prefers linked order: requirements must too
    // (stale MTD "HALFTIME SHOW" must not override Band Chant → Song).
    package: linkedOrder.package || rec.package,
    packageType:
      linkedOrder.packageType ||
      linkedOrder.package ||
      (rec as Order).packageType ||
      rec.package,
    sendingEightCountSheets:
      linkedOrder.sendingEightCountSheets ||
      linkedOrder.usingEightCountSheets ||
      rec.sendingEightCountSheets ||
      rec.usingEightCountSheets,
    usingEightCountSheets:
      linkedOrder.sendingEightCountSheets ||
      linkedOrder.usingEightCountSheets ||
      rec.sendingEightCountSheets ||
      rec.usingEightCountSheets,
    // Prefer linked order form fields; empty string must win over MTD leftovers
    // (e.g. musicTheme copied into songListSuggestions).
    songListSuggestions:
      linkedOrder.songListSuggestions ?? rec.songListSuggestions,
    powerMusicCovers: linkedOrder.powerMusicCovers ?? rec.powerMusicCovers,
    unleashTheBeatsCovers:
      linkedOrder.unleashTheBeatsCovers ??
      (rec as Order).unleashTheBeatsCovers,
    customerSongs: linkedOrder.customerSongs ?? (rec as Order).customerSongs,
    instrumentationNotes:
      linkedOrder.instrumentationNotes ?? (rec as Order).instrumentationNotes,
    lyricalNotes: linkedOrder.lyricalNotes ?? (rec as Order).lyricalNotes,
    // Prefer linked order musicTheme, including explicit "" after Songs remove.
    // Do not use ||: empty string must win over stale MTD theme text.
    musicTheme: linkedOrder.musicTheme ?? rec.musicTheme,
    routineNotes: linkedOrder.routineNotes ?? (rec as Order).routineNotes,
    // Cleared Time Length must turn Mix red: do not keep stale staging values.
    timeLengthOfMix:
      linkedOrder.timeLengthOfMix ?? (rec as Order).timeLengthOfMix,
    clientRequestedRushOrder:
      linkedOrder.clientRequestedRushOrder ??
      (rec as Order).clientRequestedRushOrder,
    isRushOrder: linkedOrder.isRushOrder ?? (rec as Order).isRushOrder,
    isManualEntry:
      Boolean(rec.isManualEntry) || Boolean(linkedOrder.isManualEntry),
    isManualScheduleEntry:
      Boolean(rec.isManualScheduleEntry) || Boolean(linkedOrder.isManualEntry),
    mergedFormOrderId:
      linkedOrder.mergedFormOrderId ||
      (rec as Order).mergedFormOrderId ||
      undefined,
    // Drop stale Mix green overrides when Time Length is empty on the order.
    collectionStates: (() => {
      const linkedTime = String(linkedOrder.timeLengthOfMix ?? "").trim();
      const states =
        (rec.collectionStates as Record<string, unknown> | null | undefined) ||
        {};
      if (linkedTime) return rec.collectionStates;
      if (
        typeof states.mix !== "boolean" &&
        typeof states.time_of_mix !== "boolean"
      ) {
        return rec.collectionStates;
      }
      const next = { ...states };
      delete next.mix;
      delete next.time_of_mix;
      return next as Order["collectionStates"];
    })(),
  };
}

export function getOrderStatus(order: Order | MTDRecord): {
  status: OrderDataStatus;
  needsReassign: boolean;
  reassignReason: OrderReassignReason | null;
  isWaitingForData: boolean;
  missingCount: number;
} {
  const reqs = getOrderRequirements(order);
  return {
    status: reqs.status,
    needsReassign: reqs.needsReassign,
    reassignReason: reqs.reassignReason,
    isWaitingForData: reqs.isWaitingForData,
    missingCount: reqs.missingCount,
  };
}

export function getOrderAssignmentStatus(
  order: Order | MTDRecord
): OrderAssignmentStatus {
  // Only a real assignedProducer counts: requested producer / FA do not.
  const assigned = Boolean((order as MTDRecord).assignedProducer?.trim());
  const { needsReassign, reassignReason } = getOrderStatus(order);
  // Reassign rows stay in Leave/Rush until a producer is assigned again.
  if (needsReassign && !assigned) {
    return reassignReason === "leave" ? "reassign_leave" : "reassign_rush";
  }
  return assigned ? "assigned" : "not_assigned";
}
