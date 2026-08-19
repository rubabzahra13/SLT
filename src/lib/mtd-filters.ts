import {
  calculateDateBounds,
  isDateInBounds,
  type DateFilterValue,
} from "@/lib/date-filters";
import type { MTDRecord } from "@/types";

export function isInProgressRecord(rec: MTDRecord): boolean {
  if (!rec.assignedProducer) return false;

  return (
    rec.status === "active" ||
    rec.status === "outsourced" ||
    rec.section === "OUTSOURCED MIXES"
  );
}

export function getInProgressRecords(records: MTDRecord[]): MTDRecord[] {
  return records.filter(isInProgressRecord);
}

export function getInProgressCount(records: MTDRecord[]): number {
  return getInProgressRecords(records).length;
}

export function matchesProducerFilter(
  rec: MTDRecord,
  producer: string
): boolean {
  if (producer === "All") return true;
  if (producer === "Unassigned") return !rec.assignedProducer;
  const assigned = rec.assignedProducer?.toUpperCase() ?? "";
  const request =
    rec.editorRequest !== "FA" && rec.editorRequest !== "NA"
      ? String(rec.editorRequest).toUpperCase()
      : "";
  return assigned === producer.toUpperCase() || request === producer.toUpperCase();
}

export function matchesCategoryFilter(
  rec: MTDRecord,
  category: string
): boolean {
  if (category === "All") return true;
  if (category === "Outsourced") return rec.status === "outsourced";
  return rec.category === category;
}

export function matchesDateFilter(
  rec: MTDRecord,
  dateFilter: DateFilterValue
): boolean {
  if (dateFilter.type === "all") return true;

  const bounds = calculateDateBounds(dateFilter.type, dateFilter.value);
  const mixDate = rec.mixStartDate?.trim();
  const bookedUntil = rec.bookedUntil?.trim();

  if (mixDate && isDateInBounds(mixDate, bounds)) return true;
  if (bookedUntil && isDateInBounds(bookedUntil, bounds)) return true;

  return false;
}

export function filterMTDRecords(
  records: MTDRecord[],
  options: {
    category?: string;
    producer?: string;
    dateFilter?: DateFilterValue;
  }
): MTDRecord[] {
  const {
    category = "All",
    producer = "All",
    dateFilter = { type: "all", value: null },
  } = options;

  return records.filter(
    (rec) =>
      matchesCategoryFilter(rec, category) &&
      matchesProducerFilter(rec, producer) &&
      matchesDateFilter(rec, dateFilter)
  );
}
