import {
  isVoiceoverStatementRow,
  type ProducerFacingPayrollRow,
} from "@/lib/export-csv";
import type { MTDSortBy } from "@/lib/mtd-filters";

export type PayrollSendProducerSortEntry = {
  name: string;
  total: number;
  mixCount: number;
  rows: ProducerFacingPayrollRow[];
};

function maxCompletedDate(rows: ProducerFacingPayrollRow[]): string {
  let max = "";
  for (const row of rows) {
    const date = String(row.completedDate || "").trim();
    if (date && date > max) max = date;
  }
  return max;
}

function minCompletedDate(rows: ProducerFacingPayrollRow[]): string {
  let min = "";
  for (const row of rows) {
    const date = String(row.completedDate || "").trim();
    if (!date) continue;
    if (!min || date < min) min = date;
  }
  return min;
}

function compareNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

/** Order producer statement cards / Send-all targets to match Sort. */
export function sortPayrollSendProducerEntries<
  T extends PayrollSendProducerSortEntry,
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
        return b.total - a.total || compareNames(a.name, b.name);
      case "price_low":
        return a.total - b.total || compareNames(a.name, b.name);
      case "oldest":
      case "start_earliest":
      case "end_earliest":
        return (
          compareNames(minCompletedDate(a.rows), minCompletedDate(b.rows)) ||
          compareNames(a.name, b.name)
        );
      case "days_more":
        return b.mixCount - a.mixCount || compareNames(a.name, b.name);
      case "days_less":
        return a.mixCount - b.mixCount || compareNames(a.name, b.name);
      case "newest":
      case "start_oldest":
      case "end_oldest":
      case "none":
      default:
        return (
          compareNames(maxCompletedDate(b.rows), maxCompletedDate(a.rows)) ||
          compareNames(a.name, b.name)
        );
    }
  });

  return sorted;
}

export function sortPayrollSendProducerNames(
  names: string[],
  rowsByProducer: Map<string, ProducerFacingPayrollRow[]>,
  sortBy: MTDSortBy | string | undefined
): string[] {
  const entries = names.map((name) => {
    const rows = rowsByProducer.get(name) ?? [];
    const mixCount = rows.filter((row) => !isVoiceoverStatementRow(row)).length;
    const total = rows.reduce((sum, row) => sum + (row.rawTotalPayout || 0), 0);
    return { name, rows, mixCount, total };
  });
  return sortPayrollSendProducerEntries(entries, sortBy).map(
    (entry) => entry.name
  );
}

/**
 * Name-only sort for large periods where we deliberately avoid building every
 * producer’s statement rows up front (memory / Active CPU).
 */
export function sortPayrollSendProducerNamesLean(
  names: string[],
  sortBy: MTDSortBy | string | undefined
): string[] {
  const mode = (sortBy || "newest") as MTDSortBy;
  const sorted = [...names];
  if (mode === "name_za") {
    sorted.sort((a, b) => compareNames(b, a));
  } else {
    sorted.sort(compareNames);
  }
  return sorted;
}
