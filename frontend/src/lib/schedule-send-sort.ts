import type { ProducerFacingScheduleRow } from "@/lib/export-csv";
import type { MTDSortBy } from "@/lib/mtd-filters";

export type ScheduleSendProducerSortEntry = {
  name: string;
  mixCount: number;
  rows: ProducerFacingScheduleRow[];
};

function maxDate(
  rows: ProducerFacingScheduleRow[],
  key: "mixStartDate" | "mixEndDate"
): string {
  let max = "";
  for (const row of rows) {
    const date = String(row[key] || "").trim();
    if (date && date > max) max = date;
  }
  return max;
}

function minDate(
  rows: ProducerFacingScheduleRow[],
  key: "mixStartDate" | "mixEndDate"
): string {
  let min = "";
  for (const row of rows) {
    const date = String(row[key] || "").trim();
    if (!date) continue;
    if (!min || date < min) min = date;
  }
  return min;
}

function compareNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

/** Order producer schedule cards / Send-all targets to match Sort. */
export function sortScheduleSendProducerEntries<
  T extends ScheduleSendProducerSortEntry,
>(entries: T[], sortBy: MTDSortBy | string | undefined): T[] {
  const mode = (sortBy || "newest") as MTDSortBy;
  const sorted = [...entries];

  sorted.sort((a, b) => {
    switch (mode) {
      case "name_az":
        return compareNames(a.name, b.name);
      case "name_za":
        return compareNames(b.name, a.name);
      case "price_high":
      case "days_more":
        return b.mixCount - a.mixCount || compareNames(a.name, b.name);
      case "price_low":
      case "days_less":
        return a.mixCount - b.mixCount || compareNames(a.name, b.name);
      case "oldest":
      case "start_earliest":
        return (
          compareNames(
            minDate(a.rows, "mixStartDate"),
            minDate(b.rows, "mixStartDate")
          ) || compareNames(a.name, b.name)
        );
      case "end_earliest":
        return (
          compareNames(
            minDate(a.rows, "mixEndDate"),
            minDate(b.rows, "mixEndDate")
          ) || compareNames(a.name, b.name)
        );
      case "start_oldest":
        return (
          compareNames(
            maxDate(b.rows, "mixStartDate"),
            maxDate(a.rows, "mixStartDate")
          ) || compareNames(a.name, b.name)
        );
      case "end_oldest":
        return (
          compareNames(
            maxDate(b.rows, "mixEndDate"),
            maxDate(a.rows, "mixEndDate")
          ) || compareNames(a.name, b.name)
        );
      case "newest":
      case "none":
      default:
        return (
          compareNames(
            maxDate(b.rows, "mixStartDate"),
            maxDate(a.rows, "mixStartDate")
          ) || compareNames(a.name, b.name)
        );
    }
  });

  return sorted;
}

export function sortScheduleSendProducerNames(
  names: string[],
  rowsByProducer: Map<string, ProducerFacingScheduleRow[]>,
  sortBy: MTDSortBy | string | undefined
): string[] {
  const entries = names.map((name) => {
    const rows = rowsByProducer.get(name) ?? [];
    return { name, rows, mixCount: rows.length };
  });
  return sortScheduleSendProducerEntries(entries, sortBy).map(
    (entry) => entry.name
  );
}
