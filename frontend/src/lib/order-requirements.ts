import type { MTDRecord, Order, OrderFormType } from "@/types";
import { parsePackage } from "@/lib/package";
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
  | "category_removed";

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
  producer_deletion: "Reassign: Delete producer",
  category_removed: "Reassign: Category removed",
};

export const ORDER_RESELECTION_REASON_LABEL: Record<
  OrderReassignReason,
  string
> = {
  leave: "Off day",
  rush_order: "Rush order",
  producer_deletion: "Delete producer",
  category_removed: "Category removed",
};

export type OrderRequirementsResult = {
  collections: OrderRequirementItem[];
  songsArea: OrderRequirementItem[];
  all: OrderRequirementItem[];
  allMet: boolean;
  missingCount: number;
  /** Data completeness only — independent of reassignment. */
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
    raw === "reassign: producer deletion" ||
    raw === "reassign producer deletion" ||
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
 */
function isPresent(val: string | null | undefined): boolean {
  if (!val) return false;
  const cleaned = val.trim().toUpperCase();
  return (
    cleaned !== "" &&
    cleaned !== "NONE" &&
    cleaned !== "-" &&
    cleaned !== "TBD" &&
    cleaned !== "EMPTY" &&
    cleaned !== "N/A"
  );
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
 * Song-list text for the Songs pill — must match the edit-form field:
 * Cheer / All Star → Song list/suggestions
 * Dance → Power Music Covers (then song list)
 * Sports / Anthem → customer songs / song list
 * Marching Band → Notes to Producer Regarding Instrumentation
 * Never use musicTheme (often affiliate labels).
 */
export function getFormSongListText(order: Order | MTDRecord): string {
  const o = order as Order & MTDRecord & Record<string, unknown>;
  const formType = String(o.formType || o.form_type || "").toLowerCase();
  const category = String(o.category || "").toLowerCase();
  const pkg = String(o.package || o.packageType || o.package_type || "").toUpperCase();
  const isDance =
    formType.includes("dance") ||
    category.includes("dance") ||
    category.includes("pom") ||
    category.includes("hip");
  const isSportsOrAnthem =
    formType.includes("sports") ||
    formType.includes("anthem") ||
    category.includes("sports") ||
    category.includes("anthem");
  const isMarchingBand =
    formType.includes("band") ||
    category.includes("band") ||
    category.includes("marching") ||
    pkg.includes("CHANT") ||
    pkg.includes("CADENCE");

  const pick = (...vals: unknown[]) => {
    for (const raw of vals) {
      const text = String(raw ?? "").trim();
      if (!isPresent(text)) continue;
      if (isAffiliateOnlySongText(text)) continue;
      return text;
    }
    return "";
  };

  if (isDance) {
    return pick(o.powerMusicCovers, o.power_music_covers, o.songListSuggestions, o.song_list_suggestions);
  }
  if (isSportsOrAnthem) {
    return pick(
      o.customerSongs,
      o.customer_songs,
      o.songListSuggestions,
      o.song_list_suggestions
    );
  }
  if (isMarchingBand) {
    // Band Chant Songs pill — instrumentation notes only (never lyrics notes).
    return pick(o.instrumentationNotes, o.instrumentation_notes);
  }
  // Cheer / All Star Cheer / default → Song list/suggestions only.
  return pick(o.songListSuggestions, o.song_list_suggestions);
}

/**
 * Strip trailing affiliate labels from legacy musicTheme text.
 * e.g. "Song A · (Power Music Covers)" → "Song A"
 */
function stripAffiliateLabelsFromTheme(val: string): string {
  let cleaned = val.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  // Peel " · (Affiliate)" / "(Affiliate)" suffixes repeatedly.
  let changed = true;
  while (changed && cleaned) {
    changed = false;
    const peeled = cleaned
      .replace(/\s*[·|]\s*\([^)]*\)\s*$/g, "")
      .replace(/\s*\([^)]*\)\s*$/g, "")
      .trim();
    if (peeled !== cleaned) {
      cleaned = peeled;
      changed = true;
    }
  }
  // If what remains is only an affiliate name, treat as empty.
  if (isAffiliateOnlySongText(cleaned) || isAffiliateOnlySongText(val)) {
    return "";
  }
  return cleaned;
}

function normalizeSongCompare(val: string): string {
  return val
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Board "Form song list" column + Songs pill — MUST match edit-form
 * Song list/suggestions (not Routine notes, not affiliate-only musicTheme).
 *
 * Legacy musicTheme is used only when it contains real song text that is not
 * the same as Routine notes (old boards stored songs there).
 */
export function getFormSongListColumnText(order: Order | MTDRecord): string {
  const fromForm = getFormSongListText(order).replace(/\s+/g, " ").trim();
  if (fromForm) return fromForm;

  const o = order as Order & MTDRecord & Record<string, unknown>;
  const themeRaw = String(o.musicTheme || o.music_theme || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!themeRaw) return "";

  const themeSongs = stripAffiliateLabelsFromTheme(themeRaw);
  if (!themeSongs) return "";

  const notes = String(
    o.routineNotes || o.routine_notes || o.additionalNotes || o.additional_notes || ""
  )
    .replace(/\s+/g, " ")
    .trim();
  // musicTheme often = routine notes + " · (Power Music Covers)" — that is Notes, not Songs.
  if (notes && normalizeSongCompare(themeSongs) === normalizeSongCompare(notes)) {
    return "";
  }
  return themeSongs;
}

/** True when Song list/suggestions (board Form song list) has real song text. */
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
  // Do not let stale haveSongs NEED/HAVE override that — only collectionStates.songs.

  if (itemId === "cs" || itemId === "eight_count") {
    // Collection status only — not the form Yes/No "will you send" intent.
    const val = (order as any).eightCountSheet || (order as any).eight_count_sheet;
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
  // Legacy: MTD eightCountSheet sometimes held the form Yes/No directly.
  const sheet = String(
    (order as MTDRecord).eightCountSheet || (order as any).eight_count_sheet || ""
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
 * Derives exact package-specific requirements based on Main Category -> Subcategory -> Package.
 *
 * Requirements evaluate to 3 distinct states:
 * - GREEN: Required + Collected
 * - RED: Required + Missing
 * - WHITE: Not Applicable (Ignored for status progression)
 */
export function getOrderRequirements(order: Order | MTDRecord): OrderRequirementsResult {
  // Manual / New Order rows use the same Mix·CS·Video / Songs·Notes pills as
  // form orders (package rules). Do not invent Time of Mix / Compliancy pills.

  const requirements: OrderRequirementItem[] = [];

  const category = (order.category || "").trim().toLowerCase();
  const rawFormType = ((order as any).formType || "").trim().toLowerCase();
  const pkgStr = (order.package || (order as any).packageType || "").trim().toUpperCase();
  const parsedPkg = parsePackage(order.package || (order as any).packageType || "");

  const isMarchingBand = category.includes("band") || rawFormType.includes("band") || pkgStr.includes("CHANT") || pkgStr.includes("CADENCE");
  const isDance = category.includes("dance") || rawFormType.includes("dance") || pkgStr.includes("POM") || pkgStr.includes("GAMEDAY PERFORMANCE");
  const isCheer = category.includes("cheer") || rawFormType.includes("cheer") || pkgStr.includes("BRONZE") || pkgStr.includes("SILVER") || pkgStr.includes("GOLD") || pkgStr.includes("PLATINUM") || pkgStr.includes("TITANIUM");
  const isAnthem = category.includes("anthem") || rawFormType.includes("anthem");
  const isSports = category.includes("sports") || rawFormType.includes("sports");

  let needSongs = false;
  let songsLabel = "Songs";
  let needNotes = false;
  let needTimeOfMix = false;
  let needCompliancy = false;
  let needEightCount = false;
  let needVideo = false;

  if (isDance) {
    if (pkgStr.includes("JAZZ SIMPLE CUT")) {
      needSongs = true;
      songsLabel = "Song";
      needTimeOfMix = true;
      needNotes = true;
      needCompliancy = false;
    } else {
      needSongs = true;
      songsLabel = pkgStr.includes("JAZZ/KICK") ? "Song(s)" : "Songs";
      needTimeOfMix = true;
      needCompliancy = true;
    }
  } else if (isCheer) {
    const cheerSubtype = String(
      (order as Order).cheerFormSubtype ||
        (order as { cheer_form_subtype?: string }).cheer_form_subtype ||
        ""
    ).toLowerCase();
    // All Star Cheer form always has Song list + Routine notes → both pills.
    const isAllStarCheer =
      cheerSubtype === "all-star-cheer" ||
      (!cheerSubtype && rawFormType.includes("school-all-star-cheer"));

    if (pkgStr.includes("TITANIUM")) {
      needNotes = true;
      needEightCount = true;
      needVideo = true;
      // Form still has Song list/suggestions — keep Songs for All Star Cheer.
      needSongs = isAllStarCheer;
      songsLabel = "Songs";
      needTimeOfMix = false;
    } else if (pkgStr.includes("PLATINUM")) {
      needSongs = true;
      songsLabel = "Songs";
      needNotes = isAllStarCheer;
      needEightCount = true;
      needVideo = true;
      needTimeOfMix = false;
    } else if (pkgStr.includes("GOLD") || pkgStr.includes("SILVER") || pkgStr.includes("BRONZE")) {
      needSongs = true;
      songsLabel = "Songs";
      needNotes = isAllStarCheer;
      needEightCount = false;
      needVideo = false;
      needTimeOfMix = false;
    } else {
      needSongs = true;
      songsLabel = "Songs";
      needNotes = isAllStarCheer;
      needEightCount = true;
    }
  } else if (isMarchingBand) {
    // Instrumentation notes drive Song (Band Chant) or Notes (other packages).
    // Lyrics / Mix notes are optional and never drive collection pills.
    // Band Chant: Song + Mix. Notes N/A.
    // Drum Cadence / Fight Song* / Alma Mater*: Mix + Notes. Songs N/A.
    if (pkgStr.includes("BAND CHANT")) {
      needSongs = true;
      songsLabel = "Song";
      needTimeOfMix = true;
      needNotes = false;
    } else {
      needSongs = false;
      needTimeOfMix = true;
      needNotes = true;
    }
  } else if (isSports) {
    needSongs = true;
    songsLabel = "Songs";
    needNotes = true;
    needTimeOfMix = true;
  } else if (isAnthem) {
    needSongs = true;
    songsLabel = "Song";
    needNotes = true;
    needTimeOfMix = true;
  } else {
    needSongs = true;
    needTimeOfMix = true;
  }

  // --- COLLECTIONS GROUP ---
  // Form pill: form-submitted orders already have a customer form (hidden).
  // Manual / New Order rows need an explicit Form collection toggle (appended
  // after Mix/CS/Video so the existing package pills stay in place).
  const isManualOrder =
    Boolean((order as MTDRecord).isManualScheduleEntry) ||
    Boolean((order as Order).isManualEntry) ||
    (order as MTDRecord).orderId === null;

  // 1. MIX / TIME OF MIX
  {
    const override = getOverrideState(order, "mix") ?? getOverrideState(order, "time_of_mix");
    const hasOrderTimeProp =
      (order as Order).timeLengthOfMix !== undefined ||
      (order as any).time_length_of_mix !== undefined;
    const rawTime = hasOrderTimeProp
      ? (order as Order).timeLengthOfMix || (order as any).time_length_of_mix
      : parsedPkg.limit;
    const defaultProvided = isPresent(rawTime) && rawTime !== "-";
    const isApplicable = needTimeOfMix;
    let state: RequirementState = "white";
    if (isApplicable) {
      const isCollected = override !== undefined ? override : defaultProvided;
      state = isCollected ? "green" : "red";
    }
    requirements.push({
      id: "mix",
      label: "Mix",
      category: "collections",
      state,
      isApplicable,
      provided: state === "green",
      value: defaultProvided ? rawTime!.trim() : undefined,
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
      (order as any).eight_count_sheet;
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
    // Do NOT infer from routineNotes/musicTheme — those almost always have
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
    const override = getOverrideState(order, "form");
    const isApplicable = true;
    const isCollected = override === true;
    const state: RequirementState = isCollected ? "green" : "red";
    requirements.push({
      id: "form",
      label: "Form",
      category: "collections",
      state,
      isApplicable,
      provided: state === "green",
      status: state === "green" ? "green" : "red",
    });
  }

  // --- SONGS GROUP ---

  // 4. SONGS — green/red matches Form song list column (form field or musicTheme).
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

  // 5. NOTES — green iff the form Notes field has content.
  // Marching Band → instrumentationNotes (same source as Band Chant Songs).
  // Other forms → routineNotes / additionalNotes.
  // Ignore collectionStates — pill must match the form field exactly.
  {
    const notesVal = isMarchingBand
      ? (order as Order).instrumentationNotes ||
        (order as any).instrumentation_notes ||
        ""
      : (order as Order).routineNotes ||
        (order as Order).additionalNotes ||
        (order as any).routine_notes ||
        (order as any).additional_notes ||
        "";
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
  // Also ignore data labels that used to be incorrectly stored in orderStatus —
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

  // Reassign leave/rush always land on Orders as Complete data — force
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
    sendingEightCountSheets:
      linkedOrder.sendingEightCountSheets || rec.sendingEightCountSheets,
    usingEightCountSheets:
      linkedOrder.usingEightCountSheets || rec.usingEightCountSheets,
    // Prefer linked order form fields; empty string must win over MTD leftovers
    // (e.g. musicTheme copied into songListSuggestions).
    songListSuggestions:
      linkedOrder.songListSuggestions ?? rec.songListSuggestions,
    powerMusicCovers: linkedOrder.powerMusicCovers ?? rec.powerMusicCovers,
    customerSongs: linkedOrder.customerSongs ?? (rec as Order).customerSongs,
    // Legacy board column: keep whichever side still has musicTheme text.
    musicTheme:
      String(linkedOrder.musicTheme || "").trim() ||
      String(rec.musicTheme || "").trim() ||
      linkedOrder.musicTheme ||
      rec.musicTheme,
    routineNotes: linkedOrder.routineNotes ?? (rec as Order).routineNotes,
    isManualEntry:
      Boolean(rec.isManualEntry) || Boolean(linkedOrder.isManualEntry),
    isManualScheduleEntry:
      Boolean(rec.isManualScheduleEntry) || Boolean(linkedOrder.isManualEntry),
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
  // Only a real assignedProducer counts — requested producer / FA do not.
  const assigned = Boolean((order as MTDRecord).assignedProducer?.trim());
  const { needsReassign, reassignReason } = getOrderStatus(order);
  // Reassign rows stay in Leave/Rush until a producer is assigned again.
  if (needsReassign && !assigned) {
    return reassignReason === "leave" ? "reassign_leave" : "reassign_rush";
  }
  return assigned ? "assigned" : "not_assigned";
}
