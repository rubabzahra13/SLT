import type { AppData, Order } from "@/types";
import { normalizeOrder } from "@/lib/order-form";
import data from "@/data/mock-data.json";

export function getData(): AppData {
  const raw = data as AppData;
  return {
    ...raw,
    orders: raw.orders.map((o) => normalizeOrder(o as Order)),
    pastOrders: (raw.pastOrders ?? []).map((o) => normalizeOrder(o as Order)),
  };
}

export function findOrder(id: string): Order | undefined {
  const { orders, pastOrders } = getData();
  return orders.find((o) => o.id === id) ?? pastOrders.find((o) => o.id === id);
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
  "8CS",
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
      return "bg-[#eff6ff] text-brand-info ring-[#bfdbfe]";
    case "active":
      return "bg-[#ecfdf5] text-brand-success ring-[#a7f3d0]";
    case "needs_attention":
      return "bg-[#fffbeb] text-brand-warning ring-[#fde68a]";
    case "outsourced":
      return "bg-[#f5f3ff] text-[#6d28d9] ring-[#ddd6fe]";
    case "completed":
      return "bg-brand-bg text-brand-neutral ring-brand-line";
    case "in_mtd":
      return "bg-[#f0fdf4] text-brand-success ring-[#bbf7d0]";
    default:
      return "bg-brand-bg text-brand-neutral ring-brand-line";
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
