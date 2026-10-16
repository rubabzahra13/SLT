import { orderCategoryToProducerCategory } from "@/lib/producer-category";
import { isPreMTDOrderRecord } from "@/lib/mtd-filters";
import {
  applyManualFormMerges,
  isAbsorbedFormOrder,
} from "@/lib/manual-form-merge";
import { getOrderIdentityName } from "@/lib/order-detail-sections";
import { resolveStoredOrEngineCustomerPrice } from "@/lib/order-package-price";
import { resolveOrderPriceCompliance } from "@/lib/pricing";
import type { MTDRecord, Order } from "@/types";

/** HAVE/NEED CS only — form Yes/No send-intent must not populate received_eight_count_sheet. */
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

/**
 * True when `rec` is a real mtd_records row (own UUID), not a client-side
 * staging stand-in that reuses the order id as `id`/`orderId`.
 * PATCH /api/mtd/{orderId} 404s — only call the MTD API for persisted rows.
 */
export function isPersistedMtdRecord(rec: MTDRecord | null | undefined): boolean {
  if (!rec) return false;
  const id = String(rec.uuid || rec.id || "").trim();
  if (!id) return false;
  const orderRef = String(rec.orderId || "").trim();
  // Synthetic staging / orderToMTDRecord: id === orderId (both the order UUID).
  if (orderRef && (id === orderRef || id === String(rec.legacyId || "").trim())) {
    return false;
  }
  // Persisted board rows have a distinct mtd UUID (with or without order_id).
  return Boolean(rec.uuid || rec.inMTD || rec.isManualScheduleEntry || orderRef);
}

export function stagingRecordFromOrder(order: Order): MTDRecord {
  const compliance = resolveOrderPriceCompliance(order);
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
    legacyId: undefined,
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
    // Person contact only — never copy school/org identity into contactName.
    contactName:
      order.musicContactName ||
      order.coachName ||
      order.coachContactFullName ||
      order.contactName ||
      "",
    editorInitials:
      order.musicContactName ||
      order.coachName ||
      order.coachContactFullName ||
      order.contactName ||
      "",
    // Match Orders board identity column (Gym Name / School Name / …).
    programName: getOrderIdentityName(order) || order.programName,
    package: order.package,
    musicTheme: order.musicTheme || "",
    price,
    priceCompliance: compliance,
    finalCustomerPrice: order.finalCustomerPrice ?? null,
    finalCustomerPriceOverridden: Boolean(order.finalCustomerPriceOverridden),
    finalPayrollPrice: order.finalPayrollPrice ?? null,
    invoice: "",
    mixStartDate: order.mixStartDate || "",
    mixEndDate: order.mixEndDate || "",
    // Collection status only — never seed from form Yes/No send-intent.
    eightCountSheet: collectionCsFromOrder(order),
    sendingEightCountSheets:
      order.sendingEightCountSheets || order.usingEightCountSheets || "",
    usingEightCountSheets:
      order.sendingEightCountSheets || order.usingEightCountSheets || "",
    haveSongs: order.haveSongs || (order as any).have_songs || "",
    needsAttention: order.needsAttention ?? true,
    status: order.needsAttention ? "needs_attention" : "active",
    inMTD: false,
    isReassigned: order.isReassigned,
    isManualScheduleEntry: Boolean(order.isManualEntry),
    // So Source · Form can classify matched manuals even if orderById misses.
    mergedFormOrderId: order.mergedFormOrderId,
    manualOverlapSnapshot: order.manualOverlapSnapshot,
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
    // School Anthem Song/Notes pills (and Marching Band instrumentation).
    instrumentationNotes: order.instrumentationNotes,
    lyricalNotes: order.lyricalNotes,
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
      record.sendingEightCountSheets || record.usingEightCountSheets,
      order.sendingEightCountSheets || order.usingEightCountSheets
    ),
    usingEightCountSheets: pickFilled(
      record.sendingEightCountSheets || record.usingEightCountSheets,
      order.sendingEightCountSheets || order.usingEightCountSheets
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
    instrumentationNotes:
      order.instrumentationNotes !== undefined &&
      order.instrumentationNotes !== null
        ? order.instrumentationNotes
        : record.instrumentationNotes,
    lyricalNotes:
      order.lyricalNotes !== undefined && order.lyricalNotes !== null
        ? order.lyricalNotes
        : record.lyricalNotes,
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
    // Prefer true from either side — MTD default false must not hide Form pill.
    isManualScheduleEntry:
      Boolean(record.isManualScheduleEntry) || Boolean(order.isManualEntry),
  } as MTDRecord;
}

/** Map every order identity (id / uuid / legacyId) → canonical order.id. */
export function buildCanonicalOrderAliasMap(
  orders: Order[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const order of orders) {
    const canonical = order.id;
    if (!canonical) continue;
    for (const key of [order.id, order.uuid, order.legacyId]) {
      if (key) map.set(key, canonical);
    }
  }
  return map;
}

/**
 * Stable key so one order never appears as multiple Orders-tab rows.
 * Resolves uuid/legacy/id aliases through the order map so clones that store
 * different order_id forms still collapse.
 */
export function preMtdOrderDedupeKey(
  rec: MTDRecord,
  canonicalByAlias?: Map<string, string>
): string {
  const candidates = [rec.orderId, rec.legacyId, rec.uuid, rec.id].filter(
    (v): v is string => Boolean(v)
  );
  if (canonicalByAlias) {
    for (const c of candidates) {
      const canon = canonicalByAlias.get(c);
      if (canon) return `order:${canon}`;
    }
  }
  // Shared foreign key even when the order isn't in the current list.
  if (rec.orderId) return `orderRef:${rec.orderId}`;
  if (rec.legacyId) return `legacy:${rec.legacyId}`;
  // Placeholder contact from orderToMTDRecord — collapse orphan staging clones
  // that share program + package (same booking re-created without order_id).
  const contact = String(rec.contactName || "")
    .trim()
    .toLowerCase();
  if (contact === "contact") {
    const program = String(rec.programName || "")
      .trim()
      .toLowerCase();
    const pkg = String(rec.package || "")
      .trim()
      .toLowerCase();
    if (program || pkg) return `orphan-contact:${program}|${pkg}`;
  }
  return `mtd:${rec.uuid || rec.id || ""}`;
}

function preMtdRowRichness(rec: MTDRecord): number {
  let score = 0;
  if (String(rec.songListSuggestions || "").trim()) score += 4;
  if (String(rec.musicTheme || "").trim()) score += 2;
  if (String(rec.routineNotes || "").trim()) score += 2;
  if (String(rec.haveSongs || "").trim()) score += 1;
  if (rec.collectionStates && Object.keys(rec.collectionStates).length) score += 1;
  return score;
}

/** Keep one pre-MTD row per order (extra MTD staging clones collapse). */
export function dedupePreMtdOrderRecords(
  records: MTDRecord[],
  canonicalByAlias?: Map<string, string>
): MTDRecord[] {
  const byKey = new Map<string, MTDRecord>();
  for (const rec of records) {
    const key = preMtdOrderDedupeKey(rec, canonicalByAlias);
    if (!key || key === "mtd:") continue;
    const prev = byKey.get(key);
    if (!prev || preMtdRowRichness(rec) > preMtdRowRichness(prev)) {
      byKey.set(key, rec);
    }
  }
  return Array.from(byKey.values());
}

/** Drop extra pre-MTD staging clones that refer to the same order. */
export function collapsePreMtdClonesForOrder(
  records: MTDRecord[],
  keep: MTDRecord,
  order?: Order | null
): MTDRecord[] {
  const without = records.filter((r) => {
    if (r.id === keep.id || (keep.uuid && r.uuid === keep.uuid)) return false;
    if (!isPreMTDOrderRecord(r)) return true;
    if (order && mtdRecordCoversOrder(r, order)) return false;
    if (
      keep.orderId &&
      (r.orderId === keep.orderId ||
        r.id === keep.orderId ||
        r.legacyId === keep.orderId)
    ) {
      return false;
    }
    return true;
  });
  return [...without, keep];
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
  const canonicalByAlias = buildCanonicalOrderAliasMap(mergedOrders);

  const fromMtd = dedupePreMtdOrderRecords(
    mtdRecords
      .filter(isPreMTDOrderRecord)
      .filter((rec) => {
        // Hide MTD staging rows that belong only to an absorbed form order.
        const ids = [rec.orderId, rec.id, rec.uuid, rec.legacyId].filter(Boolean);
        return !ids.some((id) => absorbedFormIds.has(id as string));
      })
      .map((rec) => {
        let linked =
          (rec.orderId && orderById.get(rec.orderId)) ||
          orderById.get(rec.id) ||
          (rec.uuid && orderById.get(rec.uuid)) ||
          (rec.legacyId && orderById.get(rec.legacyId)) ||
          null;
        // orderToMTDRecord clones often land as contact "Contact" with no
        // order_id — soft-link when exactly one open order matches program+package.
        if (!linked) {
          const contact = String(rec.contactName || "")
            .trim()
            .toLowerCase();
          if (contact === "contact" || !contact) {
            const program = String(rec.programName || "")
              .trim()
              .toLowerCase();
            const pkg = String(rec.package || "")
              .trim()
              .toLowerCase();
            if (program || pkg) {
              const matches = mergedOrders.filter((order) => {
                if (isAbsorbedFormOrder(order)) return false;
                if (!orderEligibleForStaging(order)) return false;
                return (
                  String(order.programName || "")
                    .trim()
                    .toLowerCase() === program &&
                  String(order.package || "")
                    .trim()
                    .toLowerCase() === pkg
                );
              });
              if (matches.length === 1) linked = matches[0];
            }
          }
        }
        const withOrderRef =
          linked && !rec.orderId
            ? {
                ...rec,
                orderId: linked.id || linked.uuid,
                legacyId: rec.legacyId || linked.legacyId,
                uuid: rec.uuid || linked.uuid,
              }
            : rec;
        return mergeCollectionStateFromOrder(withOrderRef, linked);
      }),
    canonicalByAlias
  );

  const coveredKeys = new Set(
    fromMtd.map((rec) => preMtdOrderDedupeKey(rec, canonicalByAlias)).filter(Boolean)
  );
  const synthetic: MTDRecord[] = [];
  for (const order of mergedOrders) {
    if (isAbsorbedFormOrder(order)) continue;
    if (!orderEligibleForStaging(order)) continue;
    if (mtdRecords.some((rec) => mtdRecordCoversOrder(rec, order))) continue;
    const staged = stagingRecordFromOrder(order);
    const key = preMtdOrderDedupeKey(staged, canonicalByAlias);
    if (key && coveredKeys.has(key)) continue;
    synthetic.push(staged);
    if (key) coveredKeys.add(key);
  }

  const combined = [...fromMtd, ...synthetic];
  // Newest orders first so a just-added / incoming row lands at board ID 1
  // when the Orders table uses newest (default) ordering.
  return combined.sort((a, b) => {
    const orderA =
      (a.orderId && orderById.get(a.orderId)) ||
      orderById.get(a.id) ||
      (a.uuid && orderById.get(a.uuid)) ||
      (a.legacyId && orderById.get(a.legacyId)) ||
      null;
    const orderB =
      (b.orderId && orderById.get(b.orderId)) ||
      orderById.get(b.id) ||
      (b.uuid && orderById.get(b.uuid)) ||
      (b.legacyId && orderById.get(b.legacyId)) ||
      null;
    const msA = Date.parse(String(orderA?.createdAt || "")) || 0;
    const msB = Date.parse(String(orderB?.createdAt || "")) || 0;
    if (msA !== msB) return msB - msA;
    return 0;
  });
}
