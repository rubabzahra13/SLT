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

function mtdRecordCoversOrder(rec: MTDRecord, orderId: string): boolean {
  if (rec.orderId === orderId) return true;
  if (rec.id === orderId) return true;
  if (rec.legacyId === orderId) return true;
  return false;
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
    mixStartDate: "",
    mixEndDate: "",
    eightCountSheet: "NEED CS",
    haveSongs: "NEED SONGS",
    needsAttention: order.needsAttention ?? true,
    status: order.needsAttention ? "needs_attention" : "active",
    inMTD: false,
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
    if (mtdRecords.some((rec) => mtdRecordCoversOrder(rec, order.id))) continue;
    synthetic.push(stagingRecordFromOrder(order, packagePrices));
  }

  return [...fromMtd, ...synthetic];
}
