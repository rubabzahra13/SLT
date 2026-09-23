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
    eightCountSheet: order.eightCountSheet || "NEED CS",
    haveSongs: order.haveSongs || "NEED SONGS",
    needsAttention: order.needsAttention ?? true,
    status: order.needsAttention ? "needs_attention" : "active",
    inMTD: false,
    isReassigned: order.isReassigned,
    collectionStates: order.collectionStates || (order as any).collection_states,
    orderStatus: (order as any).orderStatus || (order as any).order_status,
    musicAffiliate: order.musicAffiliate || (order as any).music_affiliate,
    routineNotes: order.routineNotes,
    timeLengthOfMix: order.timeLengthOfMix,
    songListSuggestions: order.songListSuggestions,
    customVoiceovers: order.customVoiceovers,
  };
}

/** Orders-tab rows: persisted pre-MTD mtd_records plus open orders without a row yet. */
export function listPreMtdOrderRecords(
  activeOrders: Order[],
  mtdRecords: MTDRecord[],
  packagePrices?: Record<string, number>
): MTDRecord[] {
  const fromMtd = mtdRecords.filter(isPreMTDOrderRecord);

  const synthetic: MTDRecord[] = [];
  for (const order of activeOrders) {
    if (!orderEligibleForStaging(order)) continue;
    if (mtdRecords.some((rec) => mtdRecordCoversOrder(rec, order))) continue;
    synthetic.push(stagingRecordFromOrder(order, packagePrices));
  }

  return [...fromMtd, ...synthetic];
}
