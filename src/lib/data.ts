import type { AppData, DiscountCode, MTDRecord, Order, Producer } from "@/types";
import { normalizeOrder } from "@/lib/order-form";
import { normalizeDiscountCode } from "@/lib/discount-codes";
import { normalizeProducer } from "@/lib/producers";
import { resolveValidProducerAssignment } from "@/lib/editor-assignment";
import data from "@/data/mock-data.json";
import { CHEER_DEMO_ORDERS, CHEER_DEMO_MTD_RECORDS } from "@/data/cheer-demo-orders";
import { DANCE_DEMO_ORDERS, DANCE_DEMO_MTD_RECORDS } from "@/data/dance-demo-orders";
import {
  NEW_CATEGORIES_DEMO_ORDERS,
  NEW_CATEGORIES_DEMO_MTD_RECORDS,
} from "@/data/new-categories-demo-orders";

export function getData(): AppData {
  const raw = data as unknown as AppData;
  const producers = (raw.producers as Producer[]).map((p) => normalizeProducer(p));

  const sanitizeMtdRecord = (r: MTDRecord): MTDRecord => ({
    ...r,
    assignedProducer: resolveValidProducerAssignment(r.assignedProducer, producers, r.category),
  });

  const sanitizeOrder = (o: Order): Order => {
    const norm = normalizeOrder(o);
    return {
      ...norm,
      assignedProducer: resolveValidProducerAssignment(
        norm.assignedProducer,
        producers,
        norm.category || norm.formType || ""
      ),
    };
  };

  const combinedDemoOrders = [
    ...CHEER_DEMO_ORDERS,
    ...DANCE_DEMO_ORDERS,
    ...NEW_CATEGORIES_DEMO_ORDERS,
  ];
  const demoOrdersById = new Map(combinedDemoOrders.map((o) => [o.id, sanitizeOrder(o)]));

  const existingRawOrders = raw.orders.map((o) => sanitizeOrder(o as Order));
  const existingOrderIds = new Set(existingRawOrders.map((o) => o.id));

  const mergedOrders = existingRawOrders.map((o) => demoOrdersById.get(o.id) ?? o);
  const extraDemoOrders = combinedDemoOrders
    .filter((o) => !existingOrderIds.has(o.id))
    .map((o) => sanitizeOrder(o));

  const combinedDemoMtdRecords = [
    ...CHEER_DEMO_MTD_RECORDS,
    ...DANCE_DEMO_MTD_RECORDS,
    ...NEW_CATEGORIES_DEMO_MTD_RECORDS,
  ];
  const demoMtdById = new Map(
    combinedDemoMtdRecords.map((r) => [r.id, sanitizeMtdRecord(r as MTDRecord)])
  );

  const existingRawMtd = (raw.mtdRecords || []).map((r) => sanitizeMtdRecord(r as MTDRecord));
  const existingMtdIds = new Set(existingRawMtd.map((r) => r.id));

  const mergedMtdRecords = existingRawMtd.map((r) => demoMtdById.get(r.id) ?? r);
  const extraDemoMtdRecords = combinedDemoMtdRecords
    .filter((r) => !existingMtdIds.has(r.id))
    .map((r) => sanitizeMtdRecord(r as MTDRecord));

  const allMtdRecords = [...mergedMtdRecords, ...extraDemoMtdRecords].map((r) => {
    const norm = sanitizeMtdRecord(r as MTDRecord);
    if (
      norm.inMTD === undefined &&
      ((Boolean(norm.assignedProducer) && Boolean(norm.mixStartDate) && Boolean(norm.mixEndDate)) ||
        norm.status === "outsourced" ||
        norm.section === "OUTSOURCED MIXES")
    ) {
      norm.inMTD = true;
    }
    return norm;
  });

  return {
    ...raw,
    producers,
    discountCodes: (raw.discountCodes ?? []).map((entry) =>
      normalizeDiscountCode(entry as DiscountCode)
    ),
    orders: [...mergedOrders, ...extraDemoOrders],
    pastOrders: (raw.pastOrders ?? []).map((o) => sanitizeOrder(o as Order)),
    mtdRecords: allMtdRecords,
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
