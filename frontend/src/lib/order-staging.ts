import { orderCategoryToProducerCategory } from "@/lib/producer-category";
import { isPreMTDOrderRecord } from "@/lib/mtd-filters";
import {
  applyManualFormMerges,
  isAbsorbedFormOrder,
} from "@/lib/manual-form-merge";
import { detectCompliance } from "@/lib/pricing";
import { resolveStoredOrEngineCustomerPrice } from "@/lib/order-package-price";
import type { MTDRecord, Order } from "@/types";

/** HAVE/NEED CS only — form Yes/No send-intent must not populate eightCountSheet. */
function collectionCsFromOrder(order: Order): string {
  const raw = String(order.eightCountSheet || "").trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (
    upper === "YES" ||
    upper === "Y" ||
    upper === "NO" ||
    upper === "N" ||
    upper.startsWith("YES") ||
    upper.startsWith("NO")
  ) {
    return "";
  }
  return raw;
}

function orderEligibleForStaging(order: Order): boolean {
  if (order.status === "completed") return false;
  if (order.status === "in_mtd") return false;
  return true;
}

/** True when an MTD/payroll row is the same booking as this order. */
export function mtdRecordCoversOrder(rec: MTDRecord, order: Order): boolean {
  // An order can be referenced by its legacy id, backend UUID, or plain id, and
  // an MTD record may carry any of those forms in orderId/id/legacyId/uuid.
  // Compare every combination so a linked record (order_id = order UUID) still
  // suppresses the synthetic staging row and we don't show the booking twice.
  const orderIds = [order.id, order.uuid, order.legacyId].filter(Boolean);
  const recIds = [rec.orderId, rec.id, rec.legacyId, rec.uuid].filter(Boolean);
  return recIds.some((value) => orderIds.includes(value as string));
}

export function stagingRecordFromOrder(order: Order): MTDRecord {
  const compliance =
    order.priceCompliance || detectCompliance(order.musicTheme || "");
  const price = resolveStoredOrEngineCustomerPrice(order);
  const subtype = order.danceFormSubtype || order.cheerFormSubtype;
  const producerCategory =
    orderCategoryToProducerCategory(
      order.formType,
      subtype,
      order.category || undefined
    ) ||
    order.category ||
    "Cheer";

  return {
    id: order.id,
    orderId: order.id,
    legacyId: order.legacyId || order.id,
    uuid: order.uuid,
    section:
      order.category === "Dance" || order.formType === "school-all-star-dance"
        ? "DANCE MUSIC"
        : "CHEERLEADING MUSIC",
    assignedProducer: order.assignedProducer ?? null,
    category: producerCategory,
    formType: order.formType,
    cheerFormSubtype: order.cheerFormSubtype,
    danceFormSubtype: order.danceFormSubtype,
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
    // Collection status only — never seed from form Yes/No send-intent.
    eightCountSheet: collectionCsFromOrder(order),
    sendingEightCountSheets: order.sendingEightCountSheets || "",
    usingEightCountSheets: order.usingEightCountSheets || "",
    haveSongs: order.haveSongs || (order as any).have_songs || "",
    needsAttention: order.needsAttention ?? true,
    status: order.needsAttention ? "needs_attention" : "active",
    inMTD: false,
    isReassigned: order.isReassigned,
    isManualScheduleEntry: Boolean(order.isManualEntry),
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

function pickFilled(
  primary: string | null | undefined,
  fallback: string | null | undefined
): string | undefined {
  if (typeof primary === "string" && primary.trim()) return primary;
  if (typeof fallback === "string" && fallback.trim()) return fallback;
  return primary || fallback || undefined;
}

/**
 * When an MTD board row is missing collection toggles / order content fields,
 * copy them from the linked order so Mix/CS/Video/Songs/Notes don't flip back
 * to Missing after assign creates a thin MTD row (order remains source of truth).
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
  const orderCs = collectionCsFromOrder(order);
  const orderSongs =
    order.songListSuggestions ||
    (order as { song_list_suggestions?: string }).song_list_suggestions ||
    "";
  const orderMixLen =
    order.timeLengthOfMix ||
    (order as { time_length_of_mix?: string }).time_length_of_mix ||
    "";
  const orderAffiliate =
    order.musicAffiliate ||
    (order as { music_affiliate?: string }).music_affiliate ||
    "";
  const orderNotes =
    order.routineNotes ||
    (order as { routine_notes?: string }).routine_notes ||
    "";
  const orderVoiceovers =
    order.customVoiceovers ||
    (order as { custom_voiceovers?: string }).custom_voiceovers ||
    "";
  const orderVideo =
    (order as { videoUrl?: string }).videoUrl ||
    (order as { video_url?: string }).video_url ||
    "";

  const formType = record.formType || order.formType;
  const cheerFormSubtype = record.cheerFormSubtype || order.cheerFormSubtype;
  const danceFormSubtype = record.danceFormSubtype || order.danceFormSubtype;
  const producerCategory =
    orderCategoryToProducerCategory(
      formType,
      danceFormSubtype || cheerFormSubtype,
      record.category || order.category || undefined
    ) ||
    record.category ||
    order.category;

  return {
    ...record,
    collectionStates: nextStates,
    formType,
    cheerFormSubtype,
    danceFormSubtype,
    category: producerCategory || record.category,
    haveSongs: pickFilled(record.haveSongs, orderHaveSongs) || record.haveSongs,
    eightCountSheet:
      pickFilled(record.eightCountSheet, orderCs) || record.eightCountSheet,
    sendingEightCountSheets: pickFilled(
      record.sendingEightCountSheets,
      order.sendingEightCountSheets
    ),
    usingEightCountSheets: pickFilled(
      record.usingEightCountSheets,
      order.usingEightCountSheets
    ),
    // Order form fields win, including empty string (clears MTD musicTheme leftovers).
    songListSuggestions:
      order.songListSuggestions !== undefined && order.songListSuggestions !== null
        ? order.songListSuggestions
        : pickFilled(record.songListSuggestions, orderSongs),
    timeLengthOfMix: pickFilled(record.timeLengthOfMix, orderMixLen),
    musicAffiliate: pickFilled(record.musicAffiliate, orderAffiliate),
    routineNotes:
      order.routineNotes !== undefined && order.routineNotes !== null
        ? order.routineNotes
        : pickFilled(record.routineNotes, orderNotes),
    customVoiceovers: pickFilled(record.customVoiceovers, orderVoiceovers),
    ...(pickFilled((record as { videoUrl?: string }).videoUrl, orderVideo)
      ? {
          videoUrl: pickFilled(
            (record as { videoUrl?: string }).videoUrl,
            orderVideo
          ),
        }
      : {}),
    orderStatus: record.orderStatus || (order as { orderStatus?: string }).orderStatus,
    isReassigned: record.isReassigned ?? order.isReassigned,
    isManualScheduleEntry:
      record.isManualScheduleEntry ?? Boolean(order.isManualEntry),
  } as MTDRecord;
}

/** Orders-tab rows: persisted pre-MTD mtd_records plus open orders without a row yet. */
export function listPreMtdOrderRecords(
  activeOrders: Order[],
  mtdRecords: MTDRecord[]
): MTDRecord[] {
  // Form submissions that match a manual program (90–100%) fold into the manual row.
  const mergedOrders = applyManualFormMerges(activeOrders);
  const absorbedFormIds = new Set<string>();
  for (const order of mergedOrders) {
    if (!isAbsorbedFormOrder(order)) continue;
    for (const key of [order.id, order.uuid, order.legacyId]) {
      if (key) absorbedFormIds.add(key);
    }
  }

  const orderById = new Map<string, Order>();
  for (const order of mergedOrders) {
    for (const key of [order.id, order.uuid, order.legacyId]) {
      if (key) orderById.set(key, order);
    }
  }

  const fromMtd = mtdRecords
    .filter(isPreMTDOrderRecord)
    .filter((rec) => {
      // Hide MTD staging rows that belong only to an absorbed form order.
      const ids = [rec.orderId, rec.id, rec.uuid, rec.legacyId].filter(Boolean);
      return !ids.some((id) => absorbedFormIds.has(id as string));
    })
    .map((rec) => {
      const linked =
        (rec.orderId && orderById.get(rec.orderId)) ||
        orderById.get(rec.id) ||
        (rec.uuid && orderById.get(rec.uuid)) ||
        (rec.legacyId && orderById.get(rec.legacyId)) ||
        null;
      return mergeCollectionStateFromOrder(rec, linked);
    });

  const synthetic: MTDRecord[] = [];
  for (const order of mergedOrders) {
    if (isAbsorbedFormOrder(order)) continue;
    if (!orderEligibleForStaging(order)) continue;
    if (mtdRecords.some((rec) => mtdRecordCoversOrder(rec, order))) continue;
    synthetic.push(stagingRecordFromOrder(order));
  }

  return [...fromMtd, ...synthetic];
}
