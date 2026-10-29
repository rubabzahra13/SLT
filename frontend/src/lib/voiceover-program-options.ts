import type { MTDRecord, Order } from "@/types";
import { getOrderIdentityName } from "@/lib/order-detail-sections";

/**
 * School / program names for Add voiceover.
 *
 * Every category stores the identity in orders.school_gym_name. The form
 * label differs (Gym Name, School Name, Program Name, School/Program Name,
 * Organization Name, School/Organization Name). getOrderIdentityName reads
 * that column through the field for the order's category.
 *
 * The list is the whole system: Orders, MTD, and Payroll. It is not limited
 * to the Payroll tab or to the form selected in the modal.
 */
function remember(seen: Map<string, string>, raw: string | null | undefined) {
  const name = String(raw || "").trim();
  if (!name) return;
  const key = name.toUpperCase();
  if (!seen.has(key)) seen.set(key, name);
}

function ordersByKey(orders: Order[]): Map<string, Order> {
  const map = new Map<string, Order>();
  for (const order of orders) {
    if (order.id) map.set(order.id, order);
    if (order.legacyId) map.set(order.legacyId, order);
    if (order.uuid) map.set(order.uuid, order);
  }
  return map;
}

function linkedOrder(rec: MTDRecord, byKey: Map<string, Order>): Order | null {
  if (rec.orderId && byKey.has(rec.orderId)) return byKey.get(rec.orderId) ?? null;
  if (byKey.has(rec.id)) return byKey.get(rec.id) ?? null;
  return null;
}

export function voiceoverProgramNames(
  orders: Order[],
  records: MTDRecord[] = []
): string[] {
  const seen = new Map<string, string>();
  const byKey = ordersByKey(orders);
  for (const order of orders) {
    remember(seen, getOrderIdentityName(order));
  }
  for (const rec of records) {
    const linked = linkedOrder(rec, byKey);
    if (linked) remember(seen, getOrderIdentityName(linked));
    else remember(seen, rec.programName);
  }
  return [...seen.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

export function findVoiceoverProgramMatch(
  programName: string,
  orders: Order[],
  records: MTDRecord[] = []
): { order: Order | null; record: MTDRecord | null } {
  const needle = programName.trim().toLowerCase();
  if (!needle) return { order: null, record: null };
  const byKey = ordersByKey(orders);
  const record =
    records.find((rec) => {
      const linked = linkedOrder(rec, byKey);
      const name = linked ? getOrderIdentityName(linked) : rec.programName || "";
      return name.trim().toLowerCase() === needle;
    }) ?? null;
  const order =
    (record ? linkedOrder(record, byKey) : null) ??
    orders.find(
      (item) => getOrderIdentityName(item).trim().toLowerCase() === needle
    ) ??
    null;
  return { order, record };
}
