import type { AppData, DiscountCode, Order, Producer } from "@/types";
import { normalizeOrder } from "@/lib/order-form";
import { normalizeDiscountCode } from "@/lib/discount-codes";
import { normalizeProducer } from "@/lib/producers";
import data from "@/data/mock-data.json";
import { CHEER_DEMO_ORDERS, CHEER_DEMO_MTD_RECORDS } from "@/data/cheer-demo-orders";
import { DANCE_DEMO_ORDERS, DANCE_DEMO_MTD_RECORDS } from "@/data/dance-demo-orders";
import {
  NEW_CATEGORIES_DEMO_ORDERS,
  NEW_CATEGORIES_DEMO_MTD_RECORDS,
} from "@/data/new-categories-demo-orders";

export function getData(): AppData {
  const raw = data as AppData;
  const existingOrders = raw.orders.map((o) => normalizeOrder(o as Order));
  const existingIds = new Set(existingOrders.map((o) => o.id));

  const combinedDemoOrders = [
    ...CHEER_DEMO_ORDERS,
    ...DANCE_DEMO_ORDERS,
    ...NEW_CATEGORIES_DEMO_ORDERS,
  ];
  const newDemoOrders = combinedDemoOrders
    .filter((o) => !existingIds.has(o.id))
    .map((o) => normalizeOrder(o));

  const existingMtdIds = new Set((raw.mtdRecords || []).map((r) => r.id));
  const combinedDemoMtdRecords = [
    ...CHEER_DEMO_MTD_RECORDS,
    ...DANCE_DEMO_MTD_RECORDS,
    ...NEW_CATEGORIES_DEMO_MTD_RECORDS,
  ];
  const newDemoMtdRecords = combinedDemoMtdRecords.filter((r) => !existingMtdIds.has(r.id));

  return {
    ...raw,
    producers: (raw.producers as Producer[]).map((p) => normalizeProducer(p)),
    discountCodes: (raw.discountCodes ?? []).map((entry) =>
      normalizeDiscountCode(entry as DiscountCode)
    ),
    orders: [...existingOrders, ...newDemoOrders],
    pastOrders: (raw.pastOrders ?? []).map((o) => normalizeOrder(o as Order)),
    mtdRecords: [...(raw.mtdRecords || []), ...newDemoMtdRecords],
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
