import {
  producerAssignmentKey,
  producerKeysMatch,
} from "@/lib/editor-assignment";
import { orderCategoryToProducerCategory } from "@/lib/producer-category";
import { getPayrollRecords } from "@/lib/mtd-completion";
import { isMTDRecord } from "@/lib/mtd-filters";
import {
  listPreMtdOrderRecords,
  mergeCollectionStateFromOrder,
  mtdRecordCoversOrder,
  stagingRecordFromOrder,
} from "@/lib/order-staging";
import type { MTDRecord, Order, Producer } from "@/types";

export type AssignedMixForProducer = MTDRecord & {
  /** True when the mix is currently on the MTD board (will return to Orders). */
  onMtdBoard: boolean;
};

function isPayrollOrCompletedMix(rec: MTDRecord): boolean {
  const status = String(rec.status || "").toLowerCase();
  const recordStatus = String(
    (rec as { recordStatus?: string }).recordStatus || ""
  ).toLowerCase();
  return (
    Boolean(rec.completedAt) ||
    Boolean(rec.inPayroll) ||
    Boolean((rec as { in_payroll?: boolean }).in_payroll) ||
    status === "completed" ||
    status === "payroll" ||
    recordStatus === "completed"
  );
}

function isActiveAssignedMix(rec: MTDRecord): boolean {
  if (isPayrollOrCompletedMix(rec)) return false;
  return Boolean(rec.assignedProducer?.trim());
}

function recordDedupeKey(rec: MTDRecord): string {
  return (
    rec.orderId ||
    rec.id ||
    rec.uuid ||
    rec.legacyId ||
    rec.programName ||
    ""
  );
}

function recordLinkKeys(rec: Pick<MTDRecord, "orderId" | "id" | "uuid" | "legacyId">): string[] {
  return [rec.orderId, rec.id, rec.uuid, rec.legacyId].filter(
    (value): value is string => Boolean(value)
  );
}

function orderLinkKeys(order: Order): string[] {
  return [order.id, order.uuid, order.legacyId].filter(
    (value): value is string => Boolean(value)
  );
}

/** Canonical producer category for an Orders/MTD mix row. */
export function mixProducerCategory(rec: MTDRecord): string {
  return orderCategoryToProducerCategory(
    rec.formType,
    rec.danceFormSubtype || rec.cheerFormSubtype,
    rec.category || undefined
  );
}

export function mixMatchesProducerCategory(
  rec: MTDRecord,
  category: string
): boolean {
  const target = category.trim();
  if (!target) return false;
  if ((rec.category || "").trim() === target) return true;
  return mixProducerCategory(rec) === target;
}

/**
 * All open assigned mixes across the roster — Orders staging and MTD board.
 * Used for assign daily-limit / calendar comparison (not payroll/completed).
 */
export function collectOpenAssignedMixRecords(
  activeOrders: Order[],
  mtdRecords: MTDRecord[]
): MTDRecord[] {
  const seen = new Set<string>();
  const combined: MTDRecord[] = [];
  const orderById = new Map<string, Order>();
  for (const order of activeOrders) {
    for (const key of orderLinkKeys(order)) orderById.set(key, order);
  }

  for (const rec of mtdRecords) {
    if (!isPayrollOrCompletedMix(rec)) continue;
    for (const id of recordLinkKeys(rec)) seen.add(id);
  }

  const enrich = (rec: MTDRecord): MTDRecord => {
    const linked =
      (rec.orderId && orderById.get(rec.orderId)) ||
      orderById.get(rec.id) ||
      (rec.uuid ? orderById.get(rec.uuid) : undefined) ||
      (rec.legacyId ? orderById.get(rec.legacyId) : undefined) ||
      null;
    return linked ? mergeCollectionStateFromOrder(rec, linked) : rec;
  };

  const push = (rec: MTDRecord) => {
    const next = enrich(rec);
    if (!isActiveAssignedMix(next)) return;
    if (!next.mixStartDate?.trim()) return;
    const linkKeys = recordLinkKeys(next);
    if (linkKeys.some((id) => seen.has(id))) return;
    const dedupe = recordDedupeKey(next);
    if (!dedupe || seen.has(dedupe)) return;
    seen.add(dedupe);
    for (const id of linkKeys) seen.add(id);
    combined.push(next);
  };

  for (const rec of mtdRecords) {
    if (isMTDRecord(rec)) push(rec);
  }
  for (const rec of listPreMtdOrderRecords(activeOrders, mtdRecords)) {
    push(rec);
  }
  for (const rec of mtdRecords) {
    push(rec);
  }
  for (const order of activeOrders) {
    if (order.status === "completed") continue;
    if (!order.assignedProducer?.trim()) continue;
    if (!order.mixStartDate?.trim()) continue;
    const orderKeys = orderLinkKeys(order);
    if (orderKeys.some((id) => seen.has(id))) continue;
    if (mtdRecords.some((rec) => mtdRecordCoversOrder(rec, order))) continue;
    push(stagingRecordFromOrder(order));
  }

  return combined;
}

/** Every active mix assigned to this producer — Orders and MTD board. */
export function collectAssignedMixesForProducer(
  producer: Producer,
  activeOrders: Order[],
  mtdRecords: MTDRecord[]
): AssignedMixForProducer[] {
  const key = producerAssignmentKey(producer);
  const seen = new Set<string>();
  const combined: AssignedMixForProducer[] = [];

  // Payroll / completed rows still leave the source order "assigned". Block
  // those order ids so they don't reappear as Orders → Assigned in delete UI.
  for (const rec of mtdRecords) {
    if (!isPayrollOrCompletedMix(rec)) continue;
    for (const id of recordLinkKeys(rec)) {
      seen.add(id);
    }
  }

  const push = (rec: MTDRecord) => {
    if (!isActiveAssignedMix(rec)) return;
    if (!producerKeysMatch(rec.assignedProducer || "", key)) return;
    const linkKeys = recordLinkKeys(rec);
    if (linkKeys.some((id) => seen.has(id))) return;
    const dedupe = recordDedupeKey(rec);
    if (!dedupe || seen.has(dedupe)) return;
    seen.add(dedupe);
    for (const id of linkKeys) seen.add(id);
    combined.push({ ...rec, onMtdBoard: isMTDRecord(rec) });
  };

  for (const rec of mtdRecords) {
    if (isMTDRecord(rec)) push(rec);
  }
  for (const rec of listPreMtdOrderRecords(activeOrders, mtdRecords)) {
    push(rec);
  }
  for (const rec of mtdRecords) {
    push(rec);
  }
  for (const order of activeOrders) {
    if (order.status === "completed") continue;
    if (!order.assignedProducer?.trim()) continue;
    if (!producerKeysMatch(order.assignedProducer, key)) continue;
    const orderKeys = orderLinkKeys(order);
    if (orderKeys.some((id) => seen.has(id))) continue;
    // Any linked MTD/payroll row already owns this booking.
    if (mtdRecords.some((rec) => mtdRecordCoversOrder(rec, order))) continue;
    push(stagingRecordFromOrder(order));
  }

  return combined;
}

export function collectUnpaidPayrollMixesForProducer(
  producer: Producer,
  mtdRecords: MTDRecord[]
): MTDRecord[] {
  const key = producerAssignmentKey(producer);
  const seen = new Set<string>();
  const rows: MTDRecord[] = [];
  for (const rec of getPayrollRecords(mtdRecords)) {
    if (!producerKeysMatch(rec.assignedProducer || "", key)) continue;
    const dedupe = recordDedupeKey(rec);
    if (!dedupe || seen.has(dedupe)) continue;
    seen.add(dedupe);
    rows.push(rec);
  }
  return rows;
}

export function collectAssignedMixesForProducerCategory(
  producer: Producer,
  category: string,
  activeOrders: Order[],
  mtdRecords: MTDRecord[]
): AssignedMixForProducer[] {
  return collectAssignedMixesForProducer(
    producer,
    activeOrders,
    mtdRecords
  ).filter((rec) => mixMatchesProducerCategory(rec, category));
}

export function collectUnpaidPayrollMixesForProducerCategory(
  producer: Producer,
  category: string,
  mtdRecords: MTDRecord[]
): MTDRecord[] {
  return collectUnpaidPayrollMixesForProducer(producer, mtdRecords).filter(
    (rec) => mixMatchesProducerCategory(rec, category)
  );
}

export type ProducerAddonRateKind =
  | "dance_voiceover"
  | "cheer_voiceover"
  | "rush_fee";

export function recordHasDanceVoiceover(rec: MTDRecord): boolean {
  return Boolean(
    rec.danceVoiceover ||
      rec.hasTraditionalVoiceover ||
      rec.hasThemedVoiceover
  );
}

export function recordHasCheerVoiceover(rec: MTDRecord): boolean {
  return Boolean(rec.cheerVoiceover20 || rec.cheerVoiceover40);
}

export function recordHasRushFee(rec: MTDRecord): boolean {
  if (typeof rec.rushFeeQuantity === "number" && rec.rushFeeQuantity > 0) {
    return true;
  }
  const option = String(rec.rushFeeOption || "").toLowerCase();
  if (option === "single" || option === "double") return true;
  if (rec.isRushOrder === "yes" || rec.isRushOrder === true) return true;
  return false;
}

export function recordHasProducerAddonRate(
  rec: MTDRecord,
  kind: ProducerAddonRateKind
): boolean {
  if (kind === "dance_voiceover") return recordHasDanceVoiceover(rec);
  if (kind === "cheer_voiceover") return recordHasCheerVoiceover(rec);
  return recordHasRushFee(rec);
}

/**
 * Mixes for this producer that still use the given voiceover / rush fee —
 * open Orders/MTD assignments plus unpaid Payroll rows.
 */
export function collectMixesUsingProducerAddonRate(
  producer: Producer,
  kind: ProducerAddonRateKind,
  activeOrders: Order[],
  mtdRecords: MTDRecord[]
): AssignedMixForProducer[] {
  const assigned = collectAssignedMixesForProducer(
    producer,
    activeOrders,
    mtdRecords
  ).filter((rec) => recordHasProducerAddonRate(rec, kind));

  const seen = new Set(assigned.map((rec) => recordDedupeKey(rec)));
  const unpaid = collectUnpaidPayrollMixesForProducer(
    producer,
    mtdRecords
  ).filter((rec) => {
    if (!recordHasProducerAddonRate(rec, kind)) return false;
    const dedupe = recordDedupeKey(rec);
    if (!dedupe || seen.has(dedupe)) return false;
    seen.add(dedupe);
    return true;
  });

  return [
    ...assigned,
    ...unpaid.map((rec) => ({
      ...rec,
      // Keep payroll rows off the MTD badge; modal routes them via inPayroll.
      onMtdBoard: false,
      inPayroll: true,
    })),
  ];
}
