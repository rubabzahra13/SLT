import type { MTDRecord, Order, Producer, ScheduleEntry } from "../types";
import { EDITOR_NAMES } from "../types";
import {
  isProducerUnavailableForRecord,
  mixEndIsoForRecord,
  mixWindowForRecord as availabilityMixWindow,
  type MixWindow,
} from "./producer-availability";
import { parseFlexibleDate } from "./dates";
import {
  normalizeProducerKey,
  producerAssignmentKey,
  producerKeysMatch,
} from "./producer-keys";
import { formatSlotForDisplay } from "./scheduling";

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
    if (available.includes(requestedEditor)) {
      return {
        editor: requestedEditor,
        requestedEditor,
        reason: "requested_available",
      };
    }
    if (eligible.includes(requestedEditor)) {
      return {
        editor: available[0] || "",
        requestedEditor,
        reason: "requested_busy",
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
    if (c === "team performance / variety" || c === "team performance") return "Team Performance / Variety";
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

  if (r === "cheer" && p.includes("cheer")) return true;
  if (
    r === "dance" &&
    (p === "pom" ||
      p === "hip hop" ||
      p.includes("jazz") ||
      p.includes("team performance") ||
      p === "gameday")
  ) {
    return true;
  }

  if (rn === "school-anthem" && pn.includes("marching-band")) return true;

  return false;
}

/**
 * Returns true when the producer supports the required category.
 * Checks producer.categories[] (multi-category) first, falls back to specialty.
 */
export function producerSupportsCategory(
  producer: Producer,
  requiredCategory: string
): boolean {
  if (!requiredCategory || requiredCategory === "all") return true;
  const cats = producer.categories?.length
    ? producer.categories
    : producer.specialty
      ? [producer.specialty]
      : [];
  return cats.some((c) => producerCategoryMatchesRequired(c, requiredCategory));
}

/**
 * @deprecated Use producerSupportsCategory instead.
 * Match order category to a producer's mastered genre (specialty).
 * Hip-Hop producers can take Dance work; School specialty maps to Cheer.
 */
export function specialtyMatchesCategory(
  specialty: string,
  category: string
): boolean {
  const s = specialty.trim().toLowerCase().replace(/\s+/g, "-");
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

function mixWindowForRecord(rec: MTDRecord): MixWindow | null {
  return availabilityMixWindow(rec);
}

function mixWindowsOverlap(a: MixWindow, b: MixWindow): boolean {
  return a.start <= b.end && b.start <= a.end;
}

/** True when the requested editor cannot take this mix (overlap, schedule, or capacity). */
export function isRequestedEditorUnavailableForMixWindow(
  rec: MTDRecord,
  requestedEditor: string,
  mtdRecords: MTDRecord[],
  producers: Producer[] = []
): boolean {
  const editorKey = normalizeProducerKey(requestedEditor);
  if (!editorKey || isFirstAvailableRequest(editorKey)) return false;

  const producer = findProducerByAssignmentKey(requestedEditor, producers);
  if (producer && isProducerUnavailableForRecord(producer, rec, mtdRecords)) {
    return true;
  }

  const window = mixWindowForRecord(rec);
  if (!window) {
    return isEditorBooked(requestedEditor, mtdRecords, rec.id);
  }

  for (const other of mtdRecords) {
    if (other.id === rec.id) continue;
    if (!other.assignedProducer) continue;
    if (normalizeProducerKey(other.assignedProducer) !== editorKey) continue;

    const otherWindow = mixWindowForRecord(other);
    if (otherWindow && mixWindowsOverlap(window, otherWindow)) {
      return true;
    }
  }

  return false;
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
      return !isProducerUnavailableForRecord(
        producer,
        targetRecord,
        mtdRecords
      );
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
  producer?: Producer;
};

export function getSuggestedEditors(
  mtdRecords: MTDRecord[],
  producers: Producer[],
  schedule: ScheduleEntry[],
  category: string,
  excludeRecordId?: string,
  record?: MTDRecord
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

  return names.map((name) => {
    const producer = findProducerByAssignmentKey(name, producers);
    return {
      name,
      slotLabel: formatSlotForDisplay(name, producers, schedule),
      producer,
    };
  });
}
