import type {
  CheerFormSubtypeFilter,
  DanceFormSubtypeFilter,
  MTDRecord,
  Order,
  OrderFormType,
} from "@/types";
import { getOrderIdentityName } from "@/lib/order-detail-sections";
import { collectOrdersBoardCachedOrders } from "@/lib/orders-board-cache";
import { collectMtdBoardCachedRecords } from "@/lib/mtd-board-cache";
import { matchesFormFilter } from "@/lib/mtd-filters";

type VoiceoverFormScope = {
  formType?: OrderFormType;
  cheerSubtype?: CheerFormSubtypeFilter;
  danceSubtype?: DanceFormSubtypeFilter;
};

/**
 * School / program names for Add voiceover.
 *
 * Built from live AppState orders + Orders/MTD board caches. Names whose
 * linked order was deleted are dropped (no dangling orderId ghosts).
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

function mergeOrders(primary: Order[], secondary: Order[]): Order[] {
  const byId = new Map<string, Order>();
  for (const order of [...secondary, ...primary]) {
    if (!order?.id) continue;
    byId.set(order.id, order);
  }
  return [...byId.values()];
}

function mergeRecords(primary: MTDRecord[], secondary: MTDRecord[]): MTDRecord[] {
  const byId = new Map<string, MTDRecord>();
  for (const rec of [...secondary, ...primary]) {
    if (!rec?.id) continue;
    byId.set(rec.id, rec);
  }
  return [...byId.values()];
}

/** Live orders: AppState + whatever the Orders board cache still holds. */
export function liveOrdersForVoiceover(appOrders: Order[]): Order[] {
  return mergeOrders(appOrders, collectOrdersBoardCachedOrders());
}

/** Live MTD/payroll rows: props + board caches. */
export function liveRecordsForVoiceover(appRecords: MTDRecord[]): MTDRecord[] {
  return mergeRecords(appRecords, collectMtdBoardCachedRecords());
}

export function voiceoverProgramNames(
  orders: Order[],
  records: MTDRecord[] = []
): string[] {
  const liveOrders = liveOrdersForVoiceover(orders);
  const liveRecords = liveRecordsForVoiceover(records);
  const seen = new Map<string, string>();
  const byKey = ordersByKey(liveOrders);

  for (const order of liveOrders) {
    remember(seen, getOrderIdentityName(order));
  }

  for (const rec of liveRecords) {
    const linked = linkedOrder(rec, byKey);
    if (linked) {
      remember(seen, getOrderIdentityName(linked));
      continue;
    }
    // Linked order gone from every cache → skip (deleted/stale).
    // Standalone payroll-only names (no orderId) can still appear.
    if (rec.orderId) continue;
    remember(seen, rec.programName);
  }

  return [...seen.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

export function findVoiceoverProgramMatch(
  programName: string,
  orders: Order[],
  records: MTDRecord[] = [],
  scope?: VoiceoverFormScope
): { order: Order | null; record: MTDRecord | null } {
  const needle = programName.trim().toLowerCase();
  if (!needle) return { order: null, record: null };

  const liveOrders = liveOrdersForVoiceover(orders);
  const liveRecords = liveRecordsForVoiceover(records);
  const byKey = ordersByKey(liveOrders);
  const orderById = new Map(liveOrders.map((o) => [o.id, o]));

  const nameMatches = (rec: MTDRecord) => {
    const linked = linkedOrder(rec, byKey);
    if (!linked && rec.orderId) return false;
    const name = linked ? getOrderIdentityName(linked) : rec.programName || "";
    return name.trim().toLowerCase() === needle;
  };

  const formMatches = (rec: MTDRecord) => {
    if (!scope?.formType) return true;
    return matchesFormFilter(
      rec,
      orderById,
      scope.formType,
      scope.cheerSubtype ?? "all",
      scope.danceSubtype ?? "all"
    );
  };

  // Prefer a mix that matches the selected form/subtype so the VO does not
  // attach to another subcategory of the same program.
  const record =
    liveRecords.find((rec) => nameMatches(rec) && formMatches(rec)) ??
    (scope?.formType
      ? null
      : liveRecords.find((rec) => nameMatches(rec)) ?? null);

  const order =
    (record ? linkedOrder(record, byKey) : null) ??
    liveOrders.find((item) => {
      if (getOrderIdentityName(item).trim().toLowerCase() !== needle) {
        return false;
      }
      if (!scope?.formType) return true;
      if (item.formType !== scope.formType) return false;
      if (
        scope.formType === "school-all-star-cheer" &&
        scope.cheerSubtype &&
        scope.cheerSubtype !== "all"
      ) {
        return item.cheerFormSubtype === scope.cheerSubtype;
      }
      if (
        scope.formType === "school-all-star-dance" &&
        scope.danceSubtype &&
        scope.danceSubtype !== "all"
      ) {
        return item.danceFormSubtype === scope.danceSubtype;
      }
      return true;
    }) ??
    null;

  return { order, record };
}
