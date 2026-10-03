import { isPreMTDOrderRecord } from "@/lib/mtd-filters";
import {
  detectCompliance,
  getPriceForPackage,
} from "@/lib/pricing";
import type { MTDRecord, Order } from "@/types";

function orderEligibleForStaging(order: Order): boolean {
  if (order.status === "completed") return false;
  if (order.status === "in_mtd") return false;
  return true;
}

function mtdRecordCoversOrder(rec: MTDRecord, order: Order): boolean {
  // An order can be referenced by its legacy id, backend UUID, or plain id, and
  // an MTD record may carry any of those forms in orderId/id/legacyId/uuid.
  // Compare every combination so a linked record (order_id = order UUID) still
  // suppresses the synthetic staging row and we don't show the booking twice.
  const orderIds = [order.id, order.uuid, order.legacyId].filter(Boolean);
  const recIds = [rec.orderId, rec.id, rec.legacyId, rec.uuid].filter(Boolean);
  return recIds.some((value) => orderIds.includes(value as string));
}

export function stagingRecordFromOrder(
  order: Order,
  packagePrices?: Record<string, number>
): MTDRecord {
  const compliance =
    order.priceCompliance || detectCompliance(order.musicTheme || "");
  const price =
    order.price ||
    getPriceForPackage(
      order.package,
      compliance,
      order.price,
      packagePrices
    );

  return {
    id: order.id,
    orderId: order.id,
    legacyId: order.legacyId || order.id,
    uuid: order.uuid,
    section:
      order.category === "Dance" ? "DANCE MUSIC" : "CHEERLEADING MUSIC",
    assignedProducer: order.assignedProducer ?? null,
    category: order.category || "Cheer",
    editorRequest: order.editorRequest || "FA",
    contactName: order.contactName || order.customerName || "",
    editorInitials: order.contactName || order.customerName || "",
    programName: order.programName,
    package: order.package,
    musicTheme: order.musicTheme || "",
    price,
    priceCompliance: compliance,
    invoice: "",
    mixStartDate: order.mixStartDate || "",
    mixEndDate: order.mixEndDate || "",
    // Do not default to NEED * — that forces Missing data even when songs /
    // CS are present on the order via songListSuggestions / sheets fields.
    eightCountSheet:
      order.eightCountSheet ||
      order.sendingEightCountSheets ||
      order.usingEightCountSheets ||
      "",
    haveSongs: order.haveSongs || (order as any).have_songs || "",
    needsAttention: order.needsAttention ?? true,
    status: order.needsAttention ? "needs_attention" : "active",
    inMTD: false,
    isReassigned: order.isReassigned,
    missingDataEmailSentAt: order.missingDataEmailSentAt,
    producerEmailSentAt: order.producerEmailSentAt,
    producerEmailSentTo: order.producerEmailSentTo,
    collectionStates: order.collectionStates || (order as any).collection_states,
    orderStatus: (order as any).orderStatus || (order as any).order_status,
    musicAffiliate: order.musicAffiliate || (order as any).music_affiliate,
    routineNotes: order.routineNotes,
    timeLengthOfMix: order.timeLengthOfMix,
    songListSuggestions: order.songListSuggestions,
    customVoiceovers: order.customVoiceovers,
  };
}

function hasCollectionStates(
  states: Record<string, boolean> | null | undefined
): boolean {
  return Boolean(states && Object.keys(states).length > 0);
}

/**
 * When an MTD board row is missing collection toggles, copy them from the
 * linked order so Mix/CS/Video/Songs don't flip back to Missing after
 * assign/unassign creates a thin MTD row.
 */
export function mergeCollectionStateFromOrder(
  record: MTDRecord,
  order: Order | null | undefined
): MTDRecord {
  if (!order) return record;
  const orderStates =
    order.collectionStates || (order as { collection_states?: Record<string, boolean> }).collection_states;
  const recordStates = record.collectionStates;
  const nextStates = hasCollectionStates(recordStates)
    ? recordStates
    : hasCollectionStates(orderStates)
      ? orderStates
      : recordStates;

  const orderHaveSongs = order.haveSongs || (order as { have_songs?: string }).have_songs || "";
  const orderCs =
    order.eightCountSheet ||
    order.sendingEightCountSheets ||
    order.usingEightCountSheets ||
    "";

  return {
    ...record,
    collectionStates: nextStates,
    haveSongs: record.haveSongs || orderHaveSongs || record.haveSongs,
    eightCountSheet: record.eightCountSheet || orderCs || record.eightCountSheet,
    orderStatus: record.orderStatus || (order as { orderStatus?: string }).orderStatus,
    isReassigned: record.isReassigned ?? order.isReassigned,
  };
}

/** Orders-tab rows: persisted pre-MTD mtd_records plus open orders without a row yet. */
export function listPreMtdOrderRecords(
  activeOrders: Order[],
  mtdRecords: MTDRecord[],
  packagePrices?: Record<string, number>
): MTDRecord[] {
  const orderById = new Map<string, Order>();
  for (const order of activeOrders) {
    for (const key of [order.id, order.uuid, order.legacyId]) {
      if (key) orderById.set(key, order);
    }
  }

  const fromMtd = mtdRecords.filter(isPreMTDOrderRecord).map((rec) => {
    const linked =
      (rec.orderId && orderById.get(rec.orderId)) ||
      orderById.get(rec.id) ||
      (rec.uuid && orderById.get(rec.uuid)) ||
      (rec.legacyId && orderById.get(rec.legacyId)) ||
      null;
    return mergeCollectionStateFromOrder(rec, linked);
  });

  const synthetic: MTDRecord[] = [];
  for (const order of activeOrders) {
    if (!orderEligibleForStaging(order)) continue;
    if (mtdRecords.some((rec) => mtdRecordCoversOrder(rec, order))) continue;
    synthetic.push(stagingRecordFromOrder(order, packagePrices));
  }

  return [...fromMtd, ...synthetic];
}
