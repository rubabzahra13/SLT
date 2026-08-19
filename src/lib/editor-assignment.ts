import type { MTDRecord, Producer, ScheduleEntry } from "@/types";
import { EDITOR_NAMES } from "@/types";
import { formatSlotForDisplay } from "@/lib/scheduling";

export type EditorAssignmentMode = "fa" | "na" | "specific";

export function getAssignedEditors(
  mtdRecords: MTDRecord[],
  excludeRecordId?: string
): Set<string> {
  const assigned = new Set<string>();
  for (const rec of mtdRecords) {
    if (rec.id === excludeRecordId) continue;
    if (rec.assignedProducer) {
      assigned.add(rec.assignedProducer.toUpperCase());
    }
  }
  return assigned;
}

export function getUnassignedEditors(
  mtdRecords: MTDRecord[],
  excludeRecordId?: string
): (typeof EDITOR_NAMES)[number][] {
  const assigned = getAssignedEditors(mtdRecords, excludeRecordId);
  return EDITOR_NAMES.filter((name) => !assigned.has(name));
}

export function inferAssignmentMode(record: MTDRecord): EditorAssignmentMode {
  if (record.editorRequest === "NA") return "na";
  if (record.editorRequest === "FA") return "fa";
  return "specific";
}

export function defaultBookedUntil(days = 14): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export type SuggestedEditor = {
  name: (typeof EDITOR_NAMES)[number];
  slotLabel: string;
  producer?: Producer;
};

export function getSuggestedEditors(
  mtdRecords: MTDRecord[],
  producers: Producer[],
  schedule: ScheduleEntry[],
  excludeRecordId?: string
): SuggestedEditor[] {
  return getUnassignedEditors(mtdRecords, excludeRecordId).map((name) => {
    const producer = producers.find(
      (p) => p.name.toUpperCase() === name || p.initials === name
    );
    return {
      name,
      slotLabel: formatSlotForDisplay(name, producers, schedule),
      producer,
    };
  });
}
