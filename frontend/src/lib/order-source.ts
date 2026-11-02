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
    | Pick<
        Order,
        | "mergedFormOrderId"
        | "manualOverlapSnapshot"
        | "mergedIntoManualOrderId"
        | "isManualEntry"
      >
    | null
    | undefined
): boolean {
  if (!order) return false;
  if (order.mergedFormOrderId) return true;
  if (order.mergedIntoManualOrderId) return true;
  const snap = order.manualOverlapSnapshot;
  return Boolean(snap && Object.keys(snap).length > 0);
}

function orderIdentityKeys(
  order: Pick<Order, "id" | "uuid" | "legacyId"> | null | undefined
): string[] {
  if (!order) return [];
  return [order.id, order.uuid, order.legacyId].filter(
    (value): value is string => Boolean(value)
  );
}

/** Absorbed Magento form still points at this booking (even if manual lost its link). */
function hasAbsorbedMagentoPeer(
  order: Order | null | undefined,
  record: MTDRecord,
  list: Order[]
): boolean {
  if (!list.length) return false;
  const keys = new Set([
    ...orderIdentityKeys(order),
    record.orderId,
    record.id,
    record.uuid,
    record.legacyId,
  ].filter((value): value is string => Boolean(value)));
  if (keys.size === 0) return false;
  return list.some((peer) => {
    if (peer.isManualEntry) return false;
    const into = peer.mergedIntoManualOrderId;
    return Boolean(into && keys.has(String(into)));
  });
}

/** True when the row is still an unmatched admin New Order / manual schedule. */
export function isManualOrderRecord(
  record: MTDRecord,
  orders?: Order[] | Map<string, Order> | null
): boolean {
  const linked = linkedOrderForRecord(record, orders);
  const list = ordersListFrom(orders);

  // Magento / matched bookings are Form — never Manual from a stale schedule flag.
  if (linked && linked.isManualEntry === false) return false;
  if (orderHasMatchedMagentoForm(linked)) return false;
  if (
    orderHasMatchedMagentoForm(
      record as MTDRecord &
        Pick<
          Order,
          | "mergedFormOrderId"
          | "manualOverlapSnapshot"
          | "mergedIntoManualOrderId"
          | "isManualEntry"
        >
    )
  ) {
    return false;
  }
  if (hasAbsorbedMagentoPeer(linked, record, list)) return false;

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
 * Unmatched Manual / New Order rows may always Assign, even when Mix/CS/Songs
 * (or package) collection pills are still red / empty.
 */
export function canAssignManualDespiteMissingData(
  record: MTDRecord,
  orders?: Order[] | Map<string, Order> | null
): boolean {
  return isManualOrderRecord(record, orders);
}

/**
 * Invoice on Assign (Orders tab): unmatched manuals + matched booking slots
 * that already carry an invoice from before Match.
 * Pure Magento form-only rows invoice on MTD instead — never here.
 */
export function canSetInvoiceOnAssign(
  record: MTDRecord,
  orders?: Order[] | Map<string, Order> | null
): boolean {
  if (isManualOrderRecord(record, orders)) return true;
  const linked = linkedOrderForRecord(record, orders);
  // Booking row after Match (Source may be Form; invoice still lives here).
  if (linked?.mergedFormOrderId) return true;
  if (linked?.isManualEntry) return true;
  const boardMerged = (
    record as MTDRecord & { mergedFormOrderId?: string | null }
  ).mergedFormOrderId;
  if (boardMerged) return true;
  if (record.isManualScheduleEntry && !linked) return true;
  if (record.orderId === null) return true;
  return false;
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
