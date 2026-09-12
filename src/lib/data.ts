import type { AppData, DiscountCode, Producer } from "@/types";
import { normalizeDiscountCode } from "@/lib/discount-codes";
import { normalizeProducer } from "@/lib/producers";
import data from "@/data/mock-data.json";

/**
 * Returns app configuration data (producers, discount codes, schedule entries).
 * Transactional data (orders, MTD records) is intentionally empty here —
 * the AppStateContext loads those exclusively from the backend API (Supabase).
 */
export function getData(): AppData {
  const raw = data as unknown as AppData;
  const producers = (raw.producers as Producer[]).map((p) => normalizeProducer(p));

  return {
    ...raw,
    producers,
    // Discount codes: always empty — loaded exclusively from backend API (Supabase).
    discountCodes: [],
    // Transactional data: always empty — loaded from backend API only.
    orders: [],
    pastOrders: [],
    mtdRecords: [],
    // Schedule entries: always empty. Schedule is derived from live MTD records
    // (Ongoing status + assigned producer + valid mix start/end dates).
    // The static mock-data.json "schedule" array contained hardcoded day-level
    // producer status entries (Aug 2026 dates) that caused phantom bookings.
    schedule: [],
  };
}



export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(price);
}

const TITLE_CASE_ACRONYMS = new Set([
  "TBD",
  "FA",
  "NA",
  "HS",
  "LRG",
  "VAR",
  "SM",
  "NT",
  "D2",
  "COED",
  "COLLECTIONS",
  "CM",
  "YT",
  "YTH",
]);

/** Capitalize the first letter of each word; preserve known acronyms and times like 2:30. */
export function titleCase(text: string): string {
  if (!text?.trim()) return text;

  const formatWord = (word: string) => {
    const upper = word.toUpperCase();
    if (TITLE_CASE_ACRONYMS.has(upper)) return upper;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  };

  return text
    .split(/([/\s]+)/)
    .map((segment) =>
      /[a-zA-Z]/.test(segment)
        ? segment.replace(/\b[A-Za-z]+\b/g, formatWord)
        : segment
    )
    .join("");
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "new":
      return "bg-brand-blue-soft text-brand-signature ring-brand-blue-muted";
    case "active":
      return "bg-brand-accent-soft text-brand-ink-secondary ring-brand-line";
    case "needs_attention":
      return "bg-brand-orange-soft text-brand-orange ring-brand-orange-muted";
    case "outsourced":
      return "bg-brand-orange-soft/70 text-brand-orange ring-brand-orange-muted";
    case "completed":
      return "bg-brand-accent-soft text-brand-ink-tertiary ring-brand-line";
    case "in_mtd":
      return "bg-brand-blue-soft text-brand-signature ring-brand-blue-muted";
    default:
      return "bg-brand-accent-soft text-brand-neutral ring-brand-line";
  }
}

export function getStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getHaveStatus(value: string): "have" | "need" | "partial" {
  const upper = value.toUpperCase();
  if (upper.includes("NEED")) return "need";
  if (upper.includes("HAVE")) return "have";
  return "partial";
}
