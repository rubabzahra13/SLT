import type { MTDRecord, Order, OrderSourceFilter } from "@/types";
import { findLinkedOrder } from "@/lib/editor-assignment";
import { resolveManualFormPair } from "@/lib/manual-form-merge";

function linkedOrderForRecord(
  record: MTDRecord,
  orders?: Order[] | Map<string, Order> | null
): Order | null {
  if (orders instanceof Map) {
    const linked =
      (record.orderId ? orders.get(record.orderId) : undefined) ??
      orders.get(record.id) ??
      (record.uuid ? orders.get(record.uuid) : undefined) ??
      (record.legacyId ? orders.get(record.legacyId) : undefined);
    return linked ?? null;
  }
  if (orders?.length) return findLinkedOrder(record, orders) ?? null;
  return null;
}

function ordersListFrom(
  orders?: Order[] | Map<string, Order> | null
): Order[] {
  if (!orders) return [];
  if (orders instanceof Map) {
    const byId = new Map<string, Order>();
    for (const order of orders.values()) {
      const key = order.id || order.uuid || order.legacyId;
      if (key) byId.set(key, order);
    }
    return [...byId.values()];
  }
  return orders;
}

/** Magento form matched this slot: treat as Form order (client SoT). */
export function orderHasMatchedMagentoForm(
  order:
    | Pick<Order, "mergedFormOrderId" | "manualOverlapSnapshot">
    | null
    | undefined
): boolean {
  if (!order) return false;
  if (order.mergedFormOrderId) return true;
  const snap = order.manualOverlapSnapshot;
  return Boolean(snap && Object.keys(snap).length > 0);
}

/** True when the row is still an unmatched admin New Order / manual schedule. */
export function isManualOrderRecord(
  record: MTDRecord,
  orders?: Order[] | Map<string, Order> | null
): boolean {
  const linked = linkedOrderForRecord(record, orders);
  // Once a Magento form matches, it is a Form order in filters / counts.
  if (orderHasMatchedMagentoForm(linked)) return false;
  if (
    orderHasMatchedMagentoForm(
      record as MTDRecord &
        Pick<Order, "mergedFormOrderId" | "manualOverlapSnapshot">
    )
  ) {
    return false;
  }

  const list = ordersListFrom(orders);
  if (linked?.isManualEntry && list.length > 0) {
    if (resolveManualFormPair(linked, list)) return false;
  }

  if (record.isManualScheduleEntry) return true;
  if (linked?.isManualEntry) return true;

  // Legacy pure-manual MTD rows explicitly have orderId = null.
  if (record.orderId === null) return true;

  return false;
}

/** Package / packageType present and not a placeholder TBD. */
export function orderPackageIsFilled(
  record: MTDRecord,
  orders?: Order[] | Map<string, Order> | null
): boolean {
  const linked = linkedOrderForRecord(record, orders);
  const raw = (
    linked?.package ||
    linked?.packageType ||
    record.package ||
    (record as MTDRecord & { packageType?: string }).packageType ||
    ""
  ).trim();
  if (!raw) return false;
  return raw.toUpperCase() !== "TBD";
}

/**
 * Manual New Order / schedule rows may Assign once package is set,
 * even if Mix/CS/Songs collection pills are still red.
 */
export function canAssignManualDespiteMissingData(
  record: MTDRecord,
  orders?: Order[] | Map<string, Order> | null
): boolean {
  return isManualOrderRecord(record, orders) && orderPackageIsFilled(record, orders);
}

export function filterRecordsByOrderSource(
  records: MTDRecord[],
  source: OrderSourceFilter,
  orders?: Order[] | Map<string, Order> | null
): MTDRecord[] {
  if (source === "both") return records;
  return records.filter((rec) => {
    const manual = isManualOrderRecord(rec, orders);
    return source === "manual" ? manual : !manual;
  });
}

export const ORDER_SOURCE_OPTIONS: {
  id: OrderSourceFilter;
  label: string;
}[] = [
  { id: "both", label: "All orders" },
  { id: "form", label: "Form orders" },
  { id: "manual", label: "Manual orders" },
];
