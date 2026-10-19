/**
 * Phase 1+2 pricing SoT helpers.
 *
 * Orders owns stored pricing/payout. MTD may still hold package display fields
 * (`price`, `finalCustomerPrice*`, `priceCompliance`) as a board cache.
 * Prefer Order, then fall back to MTD for orphan rows.
 */
import type { MTDRecord, Order } from "@/types";
import { findLinkedOrder } from "@/lib/editor-assignment";

export function linkedOrderForRecord(
  rec: MTDRecord,
  orders: Order[] | Map<string, Order> | null | undefined
): Order | undefined {
  if (!orders) return undefined;
  if (orders instanceof Map) {
    return (
      (rec.orderId ? orders.get(rec.orderId) : undefined) ||
      orders.get(rec.id) ||
      (rec.uuid ? orders.get(rec.uuid) : undefined) ||
      (rec.legacyId ? orders.get(rec.legacyId) : undefined)
    );
  }
  return findLinkedOrder(rec, orders);
}

export function resolveStoredCustomerPrice(
  rec: MTDRecord,
  order?: Order | null
): number {
  const fromOrder = order?.finalCustomerPrice ?? order?.systemCalculatedCustomerPrice;
  if (typeof fromOrder === "number" && Number.isFinite(fromOrder)) return fromOrder;
  if (order?.price != null && Number.isFinite(Number(order.price))) {
    return Number(order.price);
  }
  const fromRec = rec.finalCustomerPrice;
  if (typeof fromRec === "number" && Number.isFinite(fromRec)) return fromRec;
  return Number(rec.price) || 0;
}

export function resolveStoredProducerPayout(
  rec: MTDRecord,
  order?: Order | null
): number | null {
  const fromOrder = order?.producerPayout;
  if (typeof fromOrder === "number" && Number.isFinite(fromOrder)) return fromOrder;
  // Legacy MTD cache — keep reading until column is fully gone from clients.
  const fromRec = (rec as { producerPayout?: number | null }).producerPayout;
  if (typeof fromRec === "number" && Number.isFinite(fromRec)) return fromRec;
  return null;
}

export function resolveStoredRateUsed(
  rec: MTDRecord,
  order?: Order | null
): number | null {
  const fromOrder = order?.rateUsed;
  if (typeof fromOrder === "number" && Number.isFinite(fromOrder)) return fromOrder;
  const fromRec = (rec as { rateUsed?: number | null }).rateUsed;
  if (typeof fromRec === "number" && Number.isFinite(fromRec)) return fromRec;
  return null;
}

export function resolveStoredRateSource(
  rec: MTDRecord,
  order?: Order | null
): string | null {
  const fromOrder = order?.rateSource;
  if (fromOrder != null && String(fromOrder).trim()) return String(fromOrder);
  const fromRec = (rec as { rateSource?: string | null }).rateSource;
  if (fromRec != null && String(fromRec).trim()) return String(fromRec);
  return null;
}

export function resolveStoredSystemCalculatedPrice(
  rec: MTDRecord,
  order?: Order | null
): number | null {
  const fromOrder = order?.systemCalculatedCustomerPrice;
  if (typeof fromOrder === "number" && Number.isFinite(fromOrder)) return fromOrder;
  const fromRec = (rec as { systemCalculatedCustomerPrice?: number | null })
    .systemCalculatedCustomerPrice;
  if (typeof fromRec === "number" && Number.isFinite(fromRec)) return fromRec;
  return null;
}
