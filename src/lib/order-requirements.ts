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

export type OrderRequirementsResult = {
  collections: OrderRequirementItem[];
  songsArea: OrderRequirementItem[];
  all: OrderRequirementItem[];
  allMet: boolean;
  missingCount: number;
  status: "Waiting for Data" | "Need to be Scheduled";
  isWaitingForData: boolean;
};

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

  if (itemId === "songs" || itemId === "song") {
    const val = (order as any).haveSongs || (order as any).have_songs;
    if (val === "HAVE" || val === "YES" || val === "COLLECTED" || val === "SONGS READY") return true;
    if (val === "NEED SONGS" || val === "NO" || val === "UNCOLLECTED" || val === "NEED") return false;
  }

  if (itemId === "cs" || itemId === "eight_count") {
    const val = (order as any).eightCountSheet || (order as any).sendingEightCountSheets || (order as any).eight_count_sheet;
    if (val === "HAVE CS" || val === "CS CONFIRMED" || val === "HAVE" || val === "COLLECTED") return true;
    if (val === "NEED CS" || val === "UNCOLLECTED" || val === "NEED") return false;
  }

  return undefined;
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
    if (pkgStr.includes("TITANIUM")) {
      needNotes = true;
      needEightCount = true;
      needVideo = true;
      needSongs = false;
    } else if (pkgStr.includes("PLATINUM")) {
      needSongs = true;
      songsLabel = "Songs";
      needEightCount = true;
      needVideo = true;
    } else if (pkgStr.includes("GOLD") || pkgStr.includes("SILVER") || pkgStr.includes("BRONZE")) {
      needSongs = true;
      songsLabel = "Songs";
    } else {
      needSongs = true;
      songsLabel = "Songs";
      needEightCount = true;
    }
  } else if (isMarchingBand) {
    if (pkgStr.includes("BAND CHANT")) {
      needSongs = true;
      songsLabel = "Song";
      needTimeOfMix = true;
    } else if (pkgStr.includes("DRUM CADENCE") || pkgStr.includes("BOTH FIGHT SONG")) {
      needTimeOfMix = true;
      needNotes = true;
    } else {
      needSongs = true;
      songsLabel = "Song";
      needTimeOfMix = true;
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
    needCompliancy = true;
  }

  // --- COLLECTIONS GROUP ---

  // 1. FORM / COMPLIANCY
  {
    const override = getOverrideState(order, "form") ?? getOverrideState(order, "compliancy");
    const affiliate = (order as Order).musicAffiliate || (order as any).music_affiliate || (order as any).powerMusicCovers;
    const defaultProvided = isPresent(affiliate);
    const isApplicable = needCompliancy;
    let state: RequirementState = "white";
    if (isApplicable) {
      const isCollected = override !== undefined ? override : defaultProvided;
      state = isCollected ? "green" : "red";
    }
    requirements.push({
      id: "form",
      label: "Form",
      category: "collections",
      state,
      isApplicable,
      provided: state === "green",
      value: defaultProvided ? affiliate!.trim() : undefined,
      status: state === "green" ? "green" : state === "red" ? "red" : "white",
    });
  }

  // 2. MIX / TIME OF MIX
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

  // 3. CS / 8-COUNT SHEETS
  {
    const override = getOverrideState(order, "cs") ?? getOverrideState(order, "eight_count");
    const sheetVal =
      (order as MTDRecord).eightCountSheet ||
      (order as Order).sendingEightCountSheets ||
      (order as Order).usingEightCountSheets ||
      (order as any).eight_count_sheet;
    const sheetStr = String(sheetVal || "").toUpperCase();
    const defaultProvided =
      sheetStr.includes("YES") ||
      sheetStr.includes("HAVE") ||
      sheetStr.includes("ATTACHED") ||
      sheetStr.includes("RECEIVED") ||
      sheetStr.includes("TRUE") ||
      sheetStr === "Y";
    const isApplicable = needEightCount;
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

  // 4. VIDEO
  {
    const override = getOverrideState(order, "video");
    const notesVal =
      (order as Order).routineNotes ||
      (order as MTDRecord).musicTheme ||
      (order as any).routine_notes ||
      (order as any).video_url;
    const notesStr = String(notesVal || "").toUpperCase();
    const defaultProvided =
      isPresent(notesVal) &&
      (notesStr.includes("VIDEO") ||
        notesStr.includes("HTTP") ||
        notesStr.includes("YOUTUBE") ||
        notesStr.includes("VIMEO") ||
        notesStr.includes("ATTACHED") ||
        notesStr.includes("YES") ||
        notesStr.length > 3);
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

  // --- SONGS GROUP ---

  // 5. SONGS
  {
    const override = getOverrideState(order, "songs");
    const songsVal =
      (order as Order).songListSuggestions ||
      (order as MTDRecord).haveSongs ||
      (order as any).song_list_suggestions ||
      (order as any).have_songs;
    const songsStr = String(songsVal || "").toUpperCase();
    const defaultProvided =
      isPresent(songsVal) &&
      !songsStr.includes("NEED") &&
      !songsStr.includes("NO") &&
      (songsStr.includes("HAVE") ||
        songsStr.includes("READY") ||
        songsStr.includes("YES") ||
        songsStr.length > 3);
    const isApplicable = needSongs;
    let state: RequirementState = "white";
    if (isApplicable) {
      const isCollected = override !== undefined ? override : defaultProvided;
      state = isCollected ? "green" : "red";
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

  // 6. NOTES
  {
    const override = getOverrideState(order, "notes");
    const notesVal =
      (order as Order).routineNotes ||
      (order as Order).customVoiceovers ||
      order.musicTheme ||
      (order as any).routine_notes ||
      (order as any).custom_voiceovers ||
      (order as any).music_theme;
    const defaultProvided = isPresent(notesVal);
    const isApplicable = needNotes;
    let state: RequirementState = "white";
    if (isApplicable) {
      const isCollected = override !== undefined ? override : defaultProvided;
      state = isCollected ? "green" : "red";
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

  const collections = requirements.filter((r) => r.category === "collections");
  const songsArea = requirements.filter((r) => r.category === "songs");

  // Filter applicable items only (state is red or green)
  const applicableItems = requirements.filter((r) => r.isApplicable);
  const hasRed = applicableItems.some((r) => r.state === "red");
  const missingCount = applicableItems.filter((r) => r.state === "red").length;
  const allMet = !hasRed;

  const status = hasRed ? "Waiting for Data" : "Need to be Scheduled";

  return {
    collections,
    songsArea,
    all: requirements,
    allMet,
    missingCount,
    status,
    isWaitingForData: hasRed,
  };
}

export function getOrderStatus(order: Order | MTDRecord): {
  status: "Waiting for Data" | "Need to be Scheduled";
  isWaitingForData: boolean;
  missingCount: number;
} {
  const reqs = getOrderRequirements(order);
  return {
    status: reqs.status,
    isWaitingForData: reqs.isWaitingForData,
    missingCount: reqs.missingCount,
  };
}
