import type { MTDRecord, Order, OrderSourceFilter } from "@/types";
import { findLinkedOrder } from "@/lib/editor-assignment";

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

/** True when the row came from admin New Order / manual schedule, not a form. */
export function isManualOrderRecord(
  record: MTDRecord,
  orders?: Order[] | Map<string, Order> | null
): boolean {
  if (record.isManualScheduleEntry) return true;

  const linked = linkedOrderForRecord(record, orders);
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
