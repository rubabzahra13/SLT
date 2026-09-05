import type { MTDRecord, Order, Producer, ScheduleEntry } from "@/types";
import { EDITOR_NAMES } from "@/types";
import {
  isProducerUnavailableForRecord,
  mixEndIsoForRecord,
  mixWindowForRecord as availabilityMixWindow,
  type MixWindow,
} from "@/lib/producer-availability";
import { parseFlexibleDate } from "@/lib/dates";
import {
  normalizeProducerKey,
  producerAssignmentKey,
  producerKeysMatch,
} from "@/lib/producer-keys";
import { formatSlotForDisplay } from "@/lib/scheduling";

export {
  normalizeProducerKey,
  producerAssignmentKey,
  producerKeysMatch,
} from "@/lib/producer-keys";

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
  if (record.orderId) {
    const byId = orders.find((order) => order.id === record.orderId);
    if (byId) return byId;
  }
  return orders.find((order) => order.mtdId === record.id);
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
  if (!key) return undefined;
  const normalized = normalizeProducerKey(key);
  if (!normalized) return undefined;

  return producers.find((producer) => {
    const assignmentKey = producerAssignmentKey(producer);
    return (
      assignmentKey === normalized ||
      producer.initials.toUpperCase() === normalized ||
      producer.name.toUpperCase() === normalized
    );
  });
}

/**
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
  return producers.filter((p) =>
    specialtyMatchesCategory(p.specialty, category)
  );
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
  excludeRecordId?: string
): string[] {
  const assigned = getAssignedEditors(mtdRecords, excludeRecordId);
  return getEditorNamesForCategory(producers, category).filter(
    (name) => !assigned.has(normalizeProducerKey(name))
  );
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
  return getUnassignedEditors(
    mtdRecords,
    producers,
    category,
    excludeRecordId
  )
    .map((name) => {
      const producer = producers.find(
        (p) =>
          producerAssignmentKey(p) === name.toUpperCase() ||
          p.name.toUpperCase() === name.toUpperCase()
      );
      return {
        name,
        slotLabel: formatSlotForDisplay(name, producers, schedule),
        producer,
      };
    })
    .filter((suggestion) => {
      if (!record?.mixStartDate || !suggestion.producer) return true;
      return !isProducerUnavailableForRecord(
        suggestion.producer,
        record,
        mtdRecords
      );
    });
}
