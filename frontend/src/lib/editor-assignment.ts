import type { MTDRecord, Order, Producer, ScheduleEntry } from "../types";
import { EDITOR_NAMES } from "../types";
import {
  checkProducerDailyLimits,
  countProducerWorkingDays,
  dailyLimitCheckHasIssues,
  dateToIsoLocal,
  getProducerUnavailabilityReason,
  isProducerUnavailableForRecord,
  mixEndIsoForRecord,
  mixWindowForRecord,
} from "./producer-availability";
import { parseFlexibleDate, toIsoDateString } from "./dates";
import {
  normalizeProducerKey,
  producerAssignmentKey,
  producerKeysMatch,
} from "./producer-keys";
import { formatSlotForDisplay } from "./scheduling";
import { calculateProducerNextOpening } from "./producer-schedule-calc";

export {
  normalizeProducerKey,
  producerAssignmentKey,
  producerKeysMatch,
} from "./producer-keys";

export function isFirstAvailableRequest(
  value: string | null | undefined
): boolean {
  if (!value?.trim()) return true;
  const v = value.trim().toLowerCase();
  return (
    v === "fa" ||
    v === "first available" ||
    v === "editors choice" ||
    v === "editor's choice" ||
    v === "-"
  );
}

export function findLinkedOrder(
  record: MTDRecord,
  orders: Order[]
): Order | undefined {
  if (!record || !orders || orders.length === 0) return undefined;
  const targetId = record.orderId || record.id;

  if (targetId) {
    const matched = orders.find(
      (order) =>
        order.id === targetId ||
        order.legacyId === targetId ||
        order.uuid === targetId ||
        order.mtdId === record.id ||
        order.id === record.id ||
        order.legacyId === record.id
    );
    if (matched) return matched;
  }

  return orders.find(
    (order) =>
      order.mtdId === record.id ||
      (order.contactName &&
        record.contactName &&
        order.contactName.trim().toLowerCase() === record.contactName.trim().toLowerCase() &&
        order.package === record.package)
  );
}

export function resolveProducerKey(
  raw: string,
  producers: Producer[],
  category: string
): string | null {
  const normalized = normalizeProducerKey(raw);
  if (!normalized || isFirstAvailableRequest(normalized)) return null;

  const eligible = getProducersForCategory(producers, category);
  for (const producer of eligible) {
    const key = producerAssignmentKey(producer);
    if (
      key === normalized ||
      producer.name.toUpperCase() === normalized ||
      producer.initials.toUpperCase() === normalized
    ) {
      return key;
    }
  }

  for (const producer of eligible) {
    const key = producerAssignmentKey(producer);
    if (
      (key.startsWith(normalized) || normalized.startsWith(key)) &&
      Math.min(key.length, normalized.length) >= 3
    ) {
      return key;
    }
  }

  return null;
}

export function getRequestedEditorFromRecord(
  record: MTDRecord,
  producers: Producer[],
  linkedOrder?: Order | null
): string | null {
  const candidates: string[] = [];

  if (linkedOrder) {
    if (linkedOrder.requestedEditor) {
      candidates.push(linkedOrder.requestedEditor);
    }
    if (linkedOrder.requestedProducer) {
      candidates.push(linkedOrder.requestedProducer);
    }
    if (
      linkedOrder.editorRequest &&
      !isFirstAvailableRequest(linkedOrder.editorRequest)
    ) {
      candidates.push(linkedOrder.editorRequest);
    }
  }

  if (record.editorRequest && !isFirstAvailableRequest(record.editorRequest)) {
    candidates.push(record.editorRequest);
  }

  for (const raw of candidates) {
    const resolved = resolveProducerKey(raw, producers, record.category);
    if (resolved) return resolved;
  }

  return null;
}

export function formatRequestedEditorLabel(
  record: MTDRecord,
  producers: Producer[],
  linkedOrder?: Order | null
): string {
  const requested = getRequestedEditorFromRecord(record, producers, linkedOrder);
  if (requested) return requested;
  return "FA";
}

export type EditorPickReason =
  | "assigned"
  | "requested_available"
  | "requested_busy"
  | "first_available";

export type EditorPick = {
  editor: string;
  requestedEditor: string | null;
  reason: EditorPickReason;
};

function isProducerOverDailyLimitsForRecord(
  producer: Producer,
  rec: MTDRecord,
  mtdRecords: MTDRecord[]
): boolean {
  const window = mixWindowForRecord(rec);
  if (!window) return false;
  return dailyLimitCheckHasIssues(
    checkProducerDailyLimits(
      producer,
      dateToIsoLocal(window.start),
      dateToIsoLocal(window.end),
      mtdRecords,
      { excludeRecordId: rec.id }
    )
  );
}

export function pickDefaultEditor(
  record: MTDRecord,
  producers: Producer[],
  mtdRecords: MTDRecord[],
  schedule: ScheduleEntry[],
  linkedOrder?: Order | null
): EditorPick {
  const category = record.category;
  const eligible = getEditorNamesForCategory(producers, category);
  const available = getSuggestedEditors(
    mtdRecords,
    producers,
    schedule,
    category,
    record.id,
    record
  ).map((suggestion) => suggestion.name);
  const requestedEditor = getRequestedEditorFromRecord(
    record,
    producers,
    linkedOrder
  );

  if (
    record.assignedProducer &&
    eligible.includes(record.assignedProducer.toUpperCase())
  ) {
    return {
      editor: record.assignedProducer.toUpperCase(),
      requestedEditor,
      reason: "assigned",
    };
  }

  if (requestedEditor) {
    const matchedKey = eligible.find((name) =>
      producerKeysMatch(name, requestedEditor)
    );
    if (matchedKey) {
      const requestedProducer = findProducerByAssignmentKey(matchedKey, producers);
      const isAvailable =
        available.some((name) => producerKeysMatch(name, requestedEditor)) &&
        !(
          requestedProducer &&
          isProducerOverDailyLimitsForRecord(requestedProducer, record, mtdRecords)
        );
      return {
        editor: matchedKey,
        requestedEditor,
        reason: isAvailable ? "requested_available" : "requested_busy",
      };
    }
  }

  return {
    editor: available[0] || "",
    requestedEditor,
    reason: "first_available",
  };
}

export function editorRequestForAssignment(
  selectedEditor: string,
  requestedEditor: string | null,
  availableNames: string[]
): string {
  if (!selectedEditor) return "NA";
  if (requestedEditor && selectedEditor === requestedEditor) {
    return requestedEditor;
  }
  if (!requestedEditor) return "FA";
  if (availableNames.includes(selectedEditor)) return "FA";
  return "FA";
}

export type EditorAssignmentMode = "fa" | "na" | "specific";

export function findProducerByAssignmentKey(
  key: string | null | undefined,
  producers: Producer[]
): Producer | undefined {
  if (!key?.trim()) return undefined;
  const normalized = normalizeProducerKey(key);
  if (!normalized || isFirstAvailableRequest(normalized)) return undefined;

  return producers.find((producer) => {
    const assignmentKey = producerAssignmentKey(producer);
    const firstName = producer.name.trim().split(/\s+/)[0].toUpperCase();
    return (
      producer.id.toUpperCase() === normalized ||
      assignmentKey === normalized ||
      producer.initials.toUpperCase() === normalized ||
      producer.name.toUpperCase() === normalized ||
      firstName === normalized
    );
  });
}

/**
 * Resolves an assigned producer key for a given order or MTD record.
 * 1. Checks if rawKey resolves to an existing registered producer in producers array (via ID, initials, name, or legacy key).
 * 2. Checks if that producer is eligible for the order's canonical category.
 * 3. Returns the producer's canonical initials/key (e.g., "CM", "JD", "MS") if valid and eligible.
 * 4. Returns null (Unassigned) if rawKey is null/FA/empty, or producer does not exist, or producer is not eligible for the category.
 */
export function resolveValidProducerAssignment(
  rawKey: string | null | undefined,
  producers: Producer[],
  category: string
): string | null {
  if (!rawKey?.trim()) return null;
  const producer = findProducerByAssignmentKey(rawKey, producers);
  if (!producer) return null;

  const canonicalCategory = orderCategoryToProducerCategory(
    undefined,
    undefined,
    category
  );
  if (!producerSupportsCategory(producer, canonicalCategory)) {
    return null;
  }

  return producerAssignmentKey(producer);
}

/** Persist user-selected producer keys even when strict category validation fails. */
export function resolveAssignedProducerForPatch(
  rawKey: string | null | undefined,
  producers: Producer[],
  category: string
): string | null {
  const validated = resolveValidProducerAssignment(rawKey, producers, category);
  if (validated) return validated;

  const producer = findProducerByAssignmentKey(rawKey, producers);
  if (producer) return producerAssignmentKey(producer);

  const trimmed = rawKey?.trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

/** Assigned producer shown in MTD / Orders tables. */
export function getDisplayAssignedProducer(
  rec: MTDRecord | null | undefined
): string | null {
  if (!rec) return null;
  const assigned = rec.assignedProducer?.trim();
  if (assigned) return assigned;

  const request = rec.editorRequest?.trim();
  if (request && request !== "FA" && request !== "NA") return request;

  return null;
}

/**
 * Working days in a record's mix range for its producer (their days off
 * and leave skipped). Null without both dates or a producer.
 */
export function mixWorkDaysForRecord(
  rec: MTDRecord,
  producers: Producer[]
): number | null {
  const startIso = toIsoDateString(rec.mixStartDate ?? "");
  const endIso = toIsoDateString(rec.mixEndDate ?? "");
  if (!startIso || !endIso || endIso < startIso) return null;
  const producer = findProducerByAssignmentKey(
    getDisplayAssignedProducer(rec),
    producers
  );
  if (!producer) return null;
  return countProducerWorkingDays(producer, startIso, endIso);
}

/**
 * Seeder assignment rule helper.
 * Selects an eligible producer from registered producers for a given category.
 * If rawRequested is provided, validates and returns producer key if valid & category-eligible.
 * Returns null if no valid eligible producer found. Never invents arbitrary names or initials.
 */
export function resolveSeederAssignment(
  rawRequested: string | null | undefined,
  producers: Producer[],
  category: string
): string | null {
  return resolveValidProducerAssignment(rawRequested, producers, category);
}

/**
 * Seeder assignment rule helper.
 * Picks a realistic, category-aware assigned producer for demo seeding.
 * If rawRequested resolves to a valid, category-eligible registered producer, returns that producer.
 * Otherwise, deterministically selects from eligible registered producers for that category,
 * leaving ~20% of orders unassigned for realistic board state.
 * Never creates fake producers or assigns ineligible producers.
 */
export function seedAssignedProducerForOrder(
  orderId: string,
  rawRequested: string | null | undefined,
  category: string,
  producers: Producer[]
): string | null {
  const requestedValid = resolveValidProducerAssignment(
    rawRequested,
    producers,
    category
  );
  if (requestedValid) {
    return requestedValid;
  }

  const canonicalCat = orderCategoryToProducerCategory(
    undefined,
    undefined,
    category
  );
  const eligible = getProducersForCategory(producers, canonicalCat);

  if (eligible.length === 0) return null;

  let hash = 0;
  for (let i = 0; i < orderId.length; i++) {
    hash = (hash << 5) - hash + orderId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash);

  if (index % 5 === 0) {
    return null;
  }

  const selected = eligible[index % eligible.length];
  return producerAssignmentKey(selected);
}

/**
 * Maps an order's form type and subtype to the canonical producer category.
 * This is the authoritative mapping used for all producer assignment eligibility.
 */
export function orderCategoryToProducerCategory(
  formType: string | undefined,
  subtype: string | undefined,
  legacyCategory?: string | undefined
): string {
  // Use subtype-specific mapping first
  if (subtype) {
    const s = subtype.trim().toLowerCase();
    if (s === "all-star-cheer") return "All-Star Cheer";
    if (s === "school-cheer-viroc-yes" || s === "school-cheer-viroc-no") return "School Cheer";
    if (s === "youth-rec-cheer") return "Youth Rec Cheer";
    if (s === "pom") return "Pom";
    if (s === "hip-hop" || s === "hiphop") return "Hip Hop";
    if (s === "team-performance-variety" || s === "team-performance") return "Team Performance / Variety";
    if (s === "gameday") return "Gameday";
    if (s === "jazz-kick" || s === "jazz/kick") return "Jazz / Kick";
  }
  // Use form type mapping
  if (formType) {
    const f = formType.trim().toLowerCase();
    if (f === "marching-band") return "Marching Band";
    if (f === "sports-entertainment") return "Sports Entertainment";
    if (f === "school-anthem") return "School Anthem";
  }
  // Legacy category string fallback (used by MTD records which store plain strings)
  if (legacyCategory) {
    const c = legacyCategory.trim().toLowerCase();
    if (c === "cheer") return "All-Star Cheer";
    if (c === "dance") return "Pom";
    if (c === "marching band" || c === "marching-band") return "Marching Band";
    if (c === "hip-hop" || c === "hip hop") return "Hip Hop";
    if (c === "sports entertainment" || c === "sports-entertainment") return "Sports Entertainment";
    if (c === "school anthem" || c === "school-anthem") return "School Anthem";
    if (c === "school cheer" || c === "school-cheer") return "School Cheer";
    if (c === "all-star cheer" || c === "all star cheer") return "All-Star Cheer";
    if (c === "youth rec cheer" || c === "youth-rec-cheer") return "Youth Rec Cheer";
    if (c === "pom") return "Pom";
    if (c === "gameday") return "Gameday";
    if (c === "jazz / kick" || c === "jazz/kick" || c === "jazz-kick") return "Jazz / Kick";
    if (
      c === "team performance / variety" ||
      c === "team performance" ||
      c === "general"
    ) {
      return "Team Performance / Variety";
    }
    // Return the category as-is if no mapping found
    return legacyCategory;
  }
  return "";
}

/**
 * Checks whether a single producer category string matches the required category.
 * Handles spelling variations and legacy mappings.
 */
function producerCategoryMatchesRequired(
  producerCategory: string,
  requiredCategory: string
): boolean {
  const p = producerCategory.trim().toLowerCase();
  const r = requiredCategory.trim().toLowerCase();
  if (p === r) return true;
  // Normalize slash/hyphen variants
  const pn = p.replace(/[/\-\s]+/g, "-");
  const rn = r.replace(/[/\-\s]+/g, "-");
  if (pn === rn) return true;

  // Coarse legacy labels only — specific subtypes (All-Star Cheer, Pom, …)
  // must match the producer's Category tab exactly (after normalization).
  const pIsDance =
    p.includes("dance") ||
    p === "pom" ||
    p === "hip hop" ||
    p.includes("jazz") ||
    p.includes("team performance") ||
    p === "gameday" ||
    p === "general";
  if (r === "dance" && pIsDance) return true;

  const pIsCheer = p.includes("cheer") || p === "school";
  if (r === "cheer" && pIsCheer) return true;

  const rIsBand = r.includes("band") || r.includes("marching");
  const pIsBand = p.includes("band") || p.includes("marching");
  if (rIsBand && pIsBand) return true;

  const rIsSports = r.includes("sports");
  const pIsSports = p.includes("sports");
  if (rIsSports && pIsSports) return true;

  const rIsAnthem = r.includes("anthem");
  const pIsAnthem = p.includes("anthem") || p.includes("marching");
  if (rIsAnthem && pIsAnthem) return true;

  return false;
}

/**
 * Returns true when the producer supports the required category.
 * Uses producer.categories[] only.
 */
export function producerSupportsCategory(
  producer: Producer,
  requiredCategory: string
): boolean {
  if (!requiredCategory || requiredCategory === "all") return true;
  const cats = producer.categories ?? [];
  return cats.some((c) => producerCategoryMatchesRequired(c, requiredCategory));
}

/**
 * @deprecated Use producerSupportsCategory instead.
 * Match a category string to a required order category.
 */
export function specialtyMatchesCategory(
  producerCategory: string,
  category: string
): boolean {
  const s = producerCategory.trim().toLowerCase().replace(/\s+/g, "-");
  const c = category.trim().toLowerCase().replace(/\s+/g, "-");
  if (!c || c === "all") return true;
  if (s === c) return true;
  if (c === "dance" && (s === "hip-hop" || s === "hiphop")) return true;
  if (c === "cheer" && s === "school") return true;
  if (c === "marching-band" && (s === "marching-band" || s === "band")) {
    return true;
  }
  return false;
}

export function getProducersForCategory(
  producers: Producer[],
  category: string
): Producer[] {
  if (!category || category === "all") return producers;
  // Map the requested category string to a canonical producer category
  const canonicalCategory = orderCategoryToProducerCategory(undefined, undefined, category);
  return producers.filter((p) => producerSupportsCategory(p, canonicalCategory));
}

export function getEditorNamesForCategory(
  producers: Producer[],
  category: string
): string[] {
  const keys = getProducersForCategory(producers, category).map(
    producerAssignmentKey
  );
  // Prefer stable EDITOR_NAMES order when present, then any extra roster keys.
  const fromRoster = new Set(keys);
  const ordered: string[] = [];
  for (const name of EDITOR_NAMES) {
    if (fromRoster.has(name)) {
      ordered.push(name);
      fromRoster.delete(name);
    }
  }
  for (const key of keys) {
    if (fromRoster.has(key)) {
      ordered.push(key);
      fromRoster.delete(key);
    }
  }
  return ordered;
}

export function getEditorWorkload(
  mtdRecords: MTDRecord[],
  excludeRecordId?: string
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const rec of mtdRecords) {
    if (rec.id === excludeRecordId) continue;
    if (!rec.assignedProducer) continue;
    const key = normalizeProducerKey(rec.assignedProducer);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Latest mix end date across an editor's assigned MTD records. */
export function getEditorBookedUntilIso(
  editor: string,
  mtdRecords: MTDRecord[],
  excludeRecordId?: string
): string {
  const editorKey = normalizeProducerKey(editor);
  let latestEnd: Date | null = null;
  let latestIso = "";

  for (const rec of mtdRecords) {
    if (rec.id === excludeRecordId) continue;
    if (!rec.assignedProducer) continue;
    if (!producerKeysMatch(rec.assignedProducer, editorKey)) continue;

    const endIso = mixEndIsoForRecord(rec);
    if (!endIso) continue;
    const end = parseFlexibleDate(endIso);
    if (!end) continue;
    if (!latestEnd || end > latestEnd) {
      latestEnd = end;
      latestIso = endIso;
    }
  }

  return latestIso;
}

export function isEditorBooked(
  editor: string,
  mtdRecords: MTDRecord[],
  excludeRecordId?: string
): boolean {
  return getEditorWorkload(mtdRecords, excludeRecordId).has(
    normalizeProducerKey(editor)
  );
}

/**
 * Why the requested editor can't work this mix's dates (not a work day or
 * leave), or null when they can. Other bookings and daily limits
 * never make an editor unavailable.
 */
export function getRequestedEditorUnavailableReason(
  rec: MTDRecord,
  requestedEditor: string,
  producers: Producer[] = []
): string | null {
  const editorKey = normalizeProducerKey(requestedEditor);
  if (!editorKey || isFirstAvailableRequest(editorKey)) return null;

  const producer = findProducerByAssignmentKey(requestedEditor, producers);
  if (!producer) return null;
  return getProducerUnavailabilityReason(producer, rec);
}

export function getAssignedEditors(
  mtdRecords: MTDRecord[],
  excludeRecordId?: string
): Set<string> {
  return new Set(getEditorWorkload(mtdRecords, excludeRecordId).keys());
}

export function getUnassignedEditors(
  mtdRecords: MTDRecord[],
  producers: Producer[],
  category: string,
  excludeRecordId?: string,
  record?: MTDRecord
): string[] {
  const targetRecord =
    record ||
    (excludeRecordId
      ? mtdRecords.find((r) => r.id === excludeRecordId)
      : undefined);

  const categoryEditors = getEditorNamesForCategory(producers, category);

  if (targetRecord && targetRecord.mixStartDate) {
    const available = categoryEditors.filter((name) => {
      const producer = findProducerByAssignmentKey(name, producers);
      if (!producer) return false;
      return !isProducerUnavailableForRecord(producer, targetRecord);
    });
    if (available.length > 0) return available;
  }

  return categoryEditors;
}

export function inferAssignmentMode(record: MTDRecord): EditorAssignmentMode {
  if (record.editorRequest === "NA") return "na";
  if (record.editorRequest === "FA") return "fa";
  return "specific";
}

export type SuggestedEditor = {
  name: string;
  slotLabel: string;
  nextAvailableDate: Date;
  producer?: Producer;
};

export function getSuggestedEditors(
  mtdRecords: MTDRecord[],
  producers: Producer[],
  schedule: ScheduleEntry[],
  category: string,
  excludeRecordId?: string,
  record?: MTDRecord,
  anchorDateInput?: Date | string
): SuggestedEditor[] {
  const targetRecord =
    record ||
    (excludeRecordId
      ? mtdRecords.find((r) => r.id === excludeRecordId)
      : undefined);

  const names = getUnassignedEditors(
    mtdRecords,
    producers,
    category,
    excludeRecordId,
    targetRecord
  );

  const anchorDate = anchorDateInput
    ? typeof anchorDateInput === "string"
      ? parseFlexibleDate(anchorDateInput) ?? new Date()
      : anchorDateInput
    : targetRecord?.mixStartDate
      ? parseFlexibleDate(targetRecord.mixStartDate) ?? new Date()
      : new Date();

  return names.map((name) => {
    const producer = findProducerByAssignmentKey(name, producers);
    const calc = producer
      ? calculateProducerNextOpening(producer, mtdRecords, schedule, anchorDate)
      : null;

    const nextAvailableDate = calc?.nextAvailableDate ?? anchorDate;
    const slotLabel = calc?.nextAvailable ?? formatSlotForDisplay(name, producers, schedule, mtdRecords);

    return {
      name,
      slotLabel,
      nextAvailableDate,
      producer,
    };
  });
}
