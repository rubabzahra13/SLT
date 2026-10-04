import {
  calculateDateBounds,
  type DateFilterValue,
} from "./date-filters";
import { doDateRangesOverlap, toIsoDateString } from "./dates";
import {
  findLinkedOrder,
  findProducerByAssignmentKey,
  getRequestedEditorFromRecord,
  orderCategoryToProducerCategory,
  producerAssignmentKey,
  producerSupportsCategory,
} from "./editor-assignment";
import { producerKeysMatch } from "./producer-keys";
import { titleCase } from "./data";
import { determineComplianceStatus } from "./pricing-engine";
import {
  inferCheerFormSubtype,
  inferDanceFormSubtype,
  inferFormType,
} from "./order-form";
import { parsePackage } from "./package";
import type {
  CheerFormSubtype,
  CheerFormSubtypeFilter,
  DanceFormSubtype,
  DanceFormSubtypeFilter,
  MTDRecord,
  Order,
  OrderFormType,
  Producer,
} from "../types";
import {
  CHEER_FORM_SUBTABS,
  CHEER_FORM_SUBTABS_WITH_ALL,
  DANCE_FORM_SUBTABS,
  DANCE_FORM_SUBTABS_WITH_ALL,
  ORDER_FORM_TABS,
} from "../types";

export const DEFAULT_CHEER_SUBTYPE: CheerFormSubtypeFilter = "all-star-cheer";
export const DEFAULT_DANCE_SUBTYPE: DanceFormSubtypeFilter = "all";

export type MTDFormMeta = {
  formType: OrderFormType;
  cheerFormSubtype: CheerFormSubtype;
  danceFormSubtype: DanceFormSubtype;
  canonicalSubtypeId: string;
};

export function resolveMTDFormMeta(
  rec: MTDRecord,
  orderById: Map<string, Order>
): MTDFormMeta {
  const targetId = rec.orderId || rec.id;
  const linked = targetId
    ? orderById.get(targetId) ||
      (rec.legacyId ? orderById.get(rec.legacyId) : undefined) ||
      (rec.uuid ? orderById.get(rec.uuid) : undefined)
    : undefined;

  let formType: OrderFormType = "school-all-star-cheer";
  let cheerFormSubtype: CheerFormSubtype = "all-star-cheer";
  let danceFormSubtype: DanceFormSubtype = "pom";

  if (linked) {
    formType = linked.formType || (rec as any).formType || "school-all-star-cheer";
    cheerFormSubtype = linked.cheerFormSubtype || (rec as any).cheerFormSubtype || "all-star-cheer";
    danceFormSubtype = linked.danceFormSubtype || (rec as any).danceFormSubtype || "pom";
  } else if ((rec as any).cheerFormSubtype || (rec as any).formType) {
    formType = (rec as any).formType || "school-all-star-cheer";
    cheerFormSubtype = (rec as any).cheerFormSubtype || "all-star-cheer";
    danceFormSubtype = (rec as any).danceFormSubtype || "pom";
  } else {
    const partial: Partial<Order> = {
      category: rec.category,
      package: rec.package,
      musicTheme: rec.musicTheme,
      division: rec.section,
    };
    formType = inferFormType(partial);
    cheerFormSubtype =
      (rec as any).cheerFormSubtype ||
      inferCheerFormSubtype({ ...partial, formType }) ||
      "all-star-cheer";
    danceFormSubtype =
      (rec as any).danceFormSubtype ||
      inferDanceFormSubtype({ ...partial, formType }) ||
      "pom";
  }

  const canonicalSubtypeId =
    formType === "school-all-star-cheer"
      ? cheerFormSubtype
      : formType === "school-all-star-dance"
      ? danceFormSubtype
      : formType;

  return {
    formType,
    cheerFormSubtype,
    danceFormSubtype,
    canonicalSubtypeId,
  };
}

export function matchesFormFilter(
  rec: MTDRecord,
  orderById: Map<string, Order>,
  form: OrderFormType,
  cheerSubtype: CheerFormSubtypeFilter,
  danceSubtype: DanceFormSubtypeFilter
): boolean {
  const meta = resolveMTDFormMeta(rec, orderById);
  if (meta.formType !== form) return false;

  if (form === "school-all-star-cheer") {
    if (cheerSubtype === "all") return true;
    const targetId = rec.orderId || rec.id;
    const linked = targetId ? orderById.get(targetId) : undefined;
    const viroc = linked?.varsityVirocCustomer || (rec as any).varsityVirocCustomer;

    if (cheerSubtype === "school-cheer-viroc-yes") {
      return (
        (meta.cheerFormSubtype as string).startsWith("school-cheer") &&
        (viroc === "yes" || viroc === "Yes" || viroc === true)
      );
    }
    if (cheerSubtype === "school-cheer-viroc-no") {
      return (
        (meta.cheerFormSubtype as string).startsWith("school-cheer") &&
        viroc !== "yes" &&
        viroc !== "Yes" &&
        viroc !== true
      );
    }
    return meta.cheerFormSubtype === cheerSubtype;
  }

  if (form === "school-all-star-dance") {
    if (danceSubtype === "all") return true;
    if (danceSubtype === "team-performance-variety") {
      return (
        (meta.danceFormSubtype as string).startsWith("team-performance")
      );
    }
    return meta.danceFormSubtype === danceSubtype;
  }

  return true;
}

export function countMTDByForm(
  records: MTDRecord[],
  orderById: Map<string, Order>
): Record<OrderFormType, number> {
  const counts = Object.fromEntries(
    ORDER_FORM_TABS.map(({ id }) => [id, 0])
  ) as Record<OrderFormType, number>;

  for (const rec of records) {
    const { formType } = resolveMTDFormMeta(rec, orderById);
    if (counts[formType] !== undefined) counts[formType] += 1;
  }

  return counts;
}

export function countMTDByCheerSubtype(
  records: MTDRecord[],
  orderById: Map<string, Order>
): Record<CheerFormSubtypeFilter, number> {
  const counts = {
    all: 0,
    ...Object.fromEntries(CHEER_FORM_SUBTABS.map(({ id }) => [id, 0])),
  } as Record<CheerFormSubtypeFilter, number>;

  for (const rec of records) {
    const meta = resolveMTDFormMeta(rec, orderById);
    if (meta.formType !== "school-all-star-cheer") continue;
    counts.all += 1;

    if ((meta.cheerFormSubtype as string).startsWith("school-cheer")) {
      const targetId = rec.orderId || rec.id;
      const linked = targetId ? orderById.get(targetId) : undefined;
      const viroc = linked?.varsityVirocCustomer || (rec as any).varsityVirocCustomer;
      if (viroc === "yes" || viroc === "Yes" || viroc === true) {
        counts["school-cheer-viroc-yes"] += 1;
      } else {
        counts["school-cheer-viroc-no"] += 1;
      }
    } else if (counts[meta.cheerFormSubtype as CheerFormSubtypeFilter] !== undefined) {
      counts[meta.cheerFormSubtype as CheerFormSubtypeFilter] += 1;
    }
  }

  return counts;
}

export function countMTDByDanceSubtype(
  records: MTDRecord[],
  orderById: Map<string, Order>
): Record<DanceFormSubtypeFilter, number> {
  const counts = {
    all: 0,
    ...Object.fromEntries(DANCE_FORM_SUBTABS.map(({ id }) => [id, 0])),
  } as Record<DanceFormSubtypeFilter, number>;

  for (const rec of records) {
    const meta = resolveMTDFormMeta(rec, orderById);
    if (meta.formType !== "school-all-star-dance") continue;
    counts.all += 1;

    const subKey =
      (meta.danceFormSubtype as string).startsWith("team-performance")
        ? "team-performance-variety"
        : meta.danceFormSubtype;

    if (counts[subKey as DanceFormSubtypeFilter] !== undefined) {
      counts[subKey as DanceFormSubtypeFilter] += 1;
    }
  }

  return counts;
}

export function isOngoingRecord(rec: MTDRecord): boolean {
  if (!rec.assignedProducer) return false;
  if (rec.status === "outsourced" || rec.section === "OUTSOURCED MIXES") {
    return false;
  }
  return rec.status === "active";
}

export function isOutsourcedRecord(rec: MTDRecord): boolean {
  return (
    rec.status === "outsourced" || rec.section === "OUTSOURCED MIXES"
  );
}

export function isInProgressRecord(rec: MTDRecord): boolean {
  return isOngoingRecord(rec) || isOutsourcedRecord(rec);
}

export function getInProgressRecords(records: MTDRecord[]): MTDRecord[] {
  return records.filter(isInProgressRecord);
}

export function getOngoingRecords(records: MTDRecord[]): MTDRecord[] {
  return records.filter(isOngoingRecord);
}

export function getOutsourcedRecords(records: MTDRecord[]): MTDRecord[] {
  return records.filter(isOutsourcedRecord);
}

export function getInProgressCount(records: MTDRecord[]): number {
  return getInProgressRecords(records).length;
}

export function matchesAssignedProducerFilter(
  rec: MTDRecord,
  producer: string
): boolean {
  if (producer === "All") return true;
  if (producer === "Unassigned") return !rec.assignedProducer?.trim();
  if (producer === "Outsourced") return isOutsourcedRecord(rec);
  return producerKeysMatch(rec.assignedProducer || "", producer);
}

/** @deprecated Use matchesAssignedProducerFilter */
export function matchesProducerFilter(
  rec: MTDRecord,
  producer: string
): boolean {
  return matchesAssignedProducerFilter(rec, producer);
}

export function matchesRequestedProducerFilter(
  rec: MTDRecord,
  producer: string,
  producers: Producer[],
  orderById: Map<string, Order>
): boolean {
  if (producer === "All") return true;

  const linked = rec.orderId ? orderById.get(rec.orderId) : undefined;
  const requested = getRequestedEditorFromRecord(rec, producers, linked);

  if (producer === "FA") return !requested;
  if (!requested) return false;
  return producerKeysMatch(requested, producer);
}

export type SplitFilter = "all" | "split" | "no_split";

export function matchesPackageTierFilter(
  rec: MTDRecord,
  tier: string
): boolean {
  if (tier === "All") return true;
  const { tier: parsed } = parsePackage(rec.package);
  return parsed.toUpperCase() === tier.toUpperCase();
}

export function matchesTimeLimitFilter(
  rec: MTDRecord,
  limit: string
): boolean {
  if (limit === "All") return true;
  const { limit: parsed } = parsePackage(rec.package);
  return parsed === limit;
}

export function matchesSplitFilter(
  rec: MTDRecord,
  filter: SplitFilter
): boolean {
  if (filter === "all") return true;
  const { split } = parsePackage(rec.package);
  if (filter === "split") return split === "Split";
  return split === "No Split";
}

const TIER_ORDER = [
  "TITANIUM",
  "PLATINUM",
  "GOLD",
  "SILVER",
  "BRONZE",
  "HOMECOMING",
];

function sortTiers(a: string, b: string): number {
  const ai = TIER_ORDER.indexOf(a.toUpperCase());
  const bi = TIER_ORDER.indexOf(b.toUpperCase());
  if (ai !== -1 && bi !== -1) return ai - bi;
  if (ai !== -1) return -1;
  if (bi !== -1) return 1;
  return a.localeCompare(b);
}

function sortTimeLimits(a: string, b: string): number {
  if (a === "TBD") return 1;
  if (b === "TBD") return -1;
  const parse = (value: string) => {
    const [m, s] = value.split(":").map(Number);
    return (m || 0) * 60 + (s || 0);
  };
  return parse(a) - parse(b);
}

export function buildPackageTierOptions(records: MTDRecord[]) {
  const counts = new Map<string, number>();
  for (const rec of records) {
    const { tier } = parsePackage(rec.package);
    if (!tier || tier === "-") continue;
    const key = tier.toUpperCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [
    { value: "All", label: "All packages", count: records.length },
    ...Array.from(counts.entries())
      .sort(([a], [b]) => sortTiers(a, b))
      .map(([value, count]) => ({
        value,
        label: value.charAt(0) + value.slice(1).toLowerCase(),
        count,
      })),
  ];
}

export function buildTimeLimitOptions(records: MTDRecord[]) {
  const counts = new Map<string, number>();
  for (const rec of records) {
    const { limit } = parsePackage(rec.package);
    if (!limit || limit === "-") continue;
    counts.set(limit, (counts.get(limit) ?? 0) + 1);
  }

  return [
    { value: "All", label: "All limits", count: records.length },
    ...Array.from(counts.entries())
      .sort(([a], [b]) => sortTimeLimits(a, b))
      .map(([value, count]) => ({
        value,
        label: value,
        count,
      })),
  ];
}

export function buildSplitOptions(records: MTDRecord[]) {
  let split = 0;
  let noSplit = 0;
  for (const rec of records) {
    const { split: parsed } = parsePackage(rec.package);
    if (parsed === "Split") split += 1;
    else if (parsed === "No Split") noSplit += 1;
  }

  return [
    { value: "all", label: "All", count: records.length },
    { value: "split", label: "Split", count: split },
    { value: "no_split", label: "No split", count: noSplit },
  ];
}

const CHEER_PRODUCER_CATEGORIES = [
  "All-Star Cheer",
  "School Cheer",
  "Youth Rec Cheer",
] as const;

const DANCE_PRODUCER_CATEGORIES = [
  "Pom",
  "Hip Hop",
  "Team Performance / Variety",
  "Gameday",
  "Jazz / Kick",
] as const;

/** Producers who can take work for the active Orders/MTD form + subtype. */
export function producersForFormCategory(
  producers: Producer[],
  form?: OrderFormType,
  cheerSubtype?: CheerFormSubtypeFilter,
  danceSubtype?: DanceFormSubtypeFilter
): Producer[] {
  if (!form) return producers;

  if (form === "school-all-star-cheer") {
    const subtype =
      cheerSubtype && cheerSubtype !== "all" ? cheerSubtype : undefined;
    if (!subtype) {
      return producers.filter((producer) =>
        CHEER_PRODUCER_CATEGORIES.some((category) =>
          producerSupportsCategory(producer, category)
        )
      );
    }
    const category = orderCategoryToProducerCategory(form, subtype);
    return category
      ? producers.filter((producer) =>
          producerSupportsCategory(producer, category)
        )
      : producers;
  }

  if (form === "school-all-star-dance") {
    const subtype =
      danceSubtype && danceSubtype !== "all" ? danceSubtype : undefined;
    if (!subtype) {
      return producers.filter((producer) =>
        DANCE_PRODUCER_CATEGORIES.some((category) =>
          producerSupportsCategory(producer, category)
        )
      );
    }
    const category = orderCategoryToProducerCategory(form, subtype);
    return category
      ? producers.filter((producer) =>
          producerSupportsCategory(producer, category)
        )
      : producers;
  }

  const category = orderCategoryToProducerCategory(form, undefined);
  return category
    ? producers.filter((producer) =>
        producerSupportsCategory(producer, category)
      )
    : producers;
}

export function buildAssignedProducerOptions(
  records: MTDRecord[],
  producerNames: readonly string[] = [],
  producers: Producer[] = []
) {
  const counts = new Map<string, number>();

  for (const rec of records) {
    const assigned = rec.assignedProducer?.trim();
    if (!assigned) continue;
    const matched = findProducerByAssignmentKey(assigned, producers);
    const key = matched
      ? producerAssignmentKey(matched)
      : assigned.toUpperCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const seen = new Set<string>();
  const editorOptions: Array<{ value: string; label: string; count: number }> =
    [];

  // Live roster only — do not pad with legacy mock EDITOR_NAMES.
  for (const producer of producers) {
    const key = producerAssignmentKey(producer);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    editorOptions.push({
      value: key,
      label: producer.name?.trim() || key,
      count: counts.get(key) ?? 0,
    });
  }

  for (const name of producerNames) {
    const key = name.trim().toUpperCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    editorOptions.push({
      value: key,
      label: name,
      count: counts.get(key) ?? 0,
    });
  }

  for (const [key, count] of counts) {
    if (seen.has(key)) continue;
    seen.add(key);
    editorOptions.push({ value: key, label: key, count });
  }

  editorOptions.sort((a, b) => a.label.localeCompare(b.label));

  return [
    { value: "All", label: "All", count: records.length },
    ...editorOptions,
  ];
}

export function buildRequestedProducerOptions(
  records: MTDRecord[],
  producerNames: readonly string[] = [],
  producers: Producer[] = [],
  orderById: Map<string, Order> = new Map()
) {
  const counts = new Map<string, number>();
  let fa = 0;

  for (const rec of records) {
    const linked = rec.orderId ? orderById.get(rec.orderId) : undefined;
    const requested = getRequestedEditorFromRecord(rec, producers, linked);
    if (!requested) {
      fa += 1;
    } else {
      const matched = findProducerByAssignmentKey(requested, producers);
      const key = matched
        ? producerAssignmentKey(matched)
        : requested.trim().toUpperCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const seen = new Set<string>();
  const editorOptions: Array<{ value: string; label: string; count: number }> =
    [];

  for (const producer of producers) {
    const key = producerAssignmentKey(producer);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    editorOptions.push({
      value: key,
      label: producer.name?.trim() || key,
      count: counts.get(key) ?? 0,
    });
  }

  for (const name of producerNames) {
    const key = name.trim().toUpperCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    editorOptions.push({
      value: key,
      label: name,
      count: counts.get(key) ?? 0,
    });
  }

  for (const [key, count] of counts) {
    // "FA" may be a real producer (initials) — only skip duplicates already added.
    if (seen.has(key)) continue;
    seen.add(key);
    editorOptions.push({ value: key, label: key, count });
  }

  editorOptions.sort((a, b) => a.label.localeCompare(b.label));

  return [
    { value: "All", label: "All requests", count: records.length },
    { value: "FA", label: "First available", count: fa },
    ...editorOptions,
  ];
}

export function matchesCategoryFilter(
  rec: MTDRecord,
  category: string
): boolean {
  if (category === "All") return true;
  if (category === "Outsourced") return rec.status === "outsourced";
  return rec.category === category;
}

export function matchesDateFilter(
  rec: MTDRecord,
  dateFilter: DateFilterValue
): boolean {
  if (dateFilter.type === "all") return true;

  const bounds = calculateDateBounds(dateFilter.type, dateFilter.value);
  return doDateRangesOverlap(
    { start: rec.mixStartDate, end: rec.mixEndDate },
    bounds
  );
}

export type MixScheduleFilter = "all" | "scheduled" | "not_scheduled";

export type InfoFilter = "all" | "missing" | "complete";

export function hasMixStartDate(rec: MTDRecord): boolean {
  return Boolean(toIsoDateString(rec.mixStartDate));
}

export function matchesMixScheduleFilter(
  rec: MTDRecord,
  filter: MixScheduleFilter
): boolean {
  if (filter === "all") return true;
  const scheduled = hasMixStartDate(rec);
  if (filter === "scheduled") return scheduled;
  return !scheduled;
}

export function matchesInfoFilter(
  rec: MTDRecord,
  filter: InfoFilter
): boolean {
  if (filter === "all") return true;
  if (filter === "missing") return rec.needsAttention;
  return !rec.needsAttention;
}

export function buildInfoOptions(records: MTDRecord[]) {
  let missing = 0;
  let complete = 0;
  for (const rec of records) {
    if (rec.needsAttention) missing += 1;
    else complete += 1;
  }

  return [
    { value: "all", label: "All", count: records.length },
    { value: "missing", label: "Missing info", count: missing },
    { value: "complete", label: "Complete", count: complete },
  ];
}

export function filterMTDRecords(
  records: MTDRecord[],
  options: {
    category?: string;
    producer?: string;
    assignedProducer?: string;
    requestedProducer?: string;
    packageTier?: string;
    timeLimit?: string;
    split?: SplitFilter;
    producers?: Producer[];
    dateFilter?: DateFilterValue;
    scheduleFilter?: MixScheduleFilter;
    infoFilter?: InfoFilter;
    form?: OrderFormType;
    cheerSubtype?: CheerFormSubtypeFilter;
    danceSubtype?: DanceFormSubtypeFilter;
    orderById?: Map<string, Order>;
  }
): MTDRecord[] {
  const {
    category = "All",
    producer = "All",
    assignedProducer = producer,
    requestedProducer = "All",
    packageTier = "All",
    timeLimit = "All",
    split = "all",
    producers = [],
    dateFilter = { type: "all", value: null },
    scheduleFilter = "all",
    infoFilter = "all",
    form,
    cheerSubtype = DEFAULT_CHEER_SUBTYPE,
    danceSubtype = DEFAULT_DANCE_SUBTYPE,
    orderById,
  } = options;

  const orderMap = orderById ?? new Map<string, Order>();

  return records.filter((rec) => {
    if (!matchesCategoryFilter(rec, category)) return false;
    if (!matchesAssignedProducerFilter(rec, assignedProducer)) return false;
    if (
      !matchesRequestedProducerFilter(
        rec,
        requestedProducer,
        producers,
        orderMap
      )
    ) {
      return false;
    }
    if (!matchesPackageTierFilter(rec, packageTier)) return false;
    if (!matchesTimeLimitFilter(rec, timeLimit)) return false;
    if (!matchesSplitFilter(rec, split)) return false;
    if (!matchesDateFilter(rec, dateFilter)) return false;
    if (!matchesMixScheduleFilter(rec, scheduleFilter)) return false;
    if (!matchesInfoFilter(rec, infoFilter)) return false;
    if (form && orderById) {
      if (!matchesFormFilter(rec, orderById, form, cheerSubtype, danceSubtype)) {
        return false;
      }
    }
    return true;
  });
}

export function matchesMTDSearch(rec: MTDRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const contact = (rec.contactName || rec.editorInitials || "").toLowerCase();
  const invoice = (rec.invoice || "").toLowerCase();
  const program = (rec.programName || "").toLowerCase();
  const id = (rec.id || "").toLowerCase();

  return contact.includes(q) || invoice.includes(q) || program.includes(q) || id.includes(q);
}

export function isOrderScheduledAndAssigned(rec: MTDRecord): boolean {
  return Boolean(
    rec.assignedProducer &&
    toIsoDateString(rec.mixStartDate) &&
    toIsoDateString(rec.mixEndDate)
  );
}

export function isMTDRecord(rec: MTDRecord): boolean {
  // An explicit "Move to Orders" flags the row reassigned and clears the board
  // flag. That intent must win even for OUTSOURCED-section rows — otherwise the
  // outsourced heuristic below drags the row straight back onto the MTD board
  // and "Move to Orders" appears to do nothing.
  if (rec.isReassigned && rec.inMTD === false) return false;
  // Outsourced mixes otherwise live on the MTD board by default.
  if (isOutsourcedRecord(rec)) return true;
  if (rec.inMTD === true) return true;
  if (rec.inMTD === false) return false;
  return Boolean(
    rec.assignedProducer &&
      toIsoDateString(rec.mixStartDate) &&
      toIsoDateString(rec.mixEndDate)
  );
}

export function isPreMTDOrderRecord(rec: MTDRecord): boolean {
  return !isMTDRecord(rec);
}

export type RecordMusicAffiliateInfo = {
  affiliate: string;
  compliance: "compliant" | "non-compliant";
};

export function getRecordMusicAffiliateInfo(
  rec: MTDRecord,
  orderById: Map<string, Order>,
  allOrders: Order[]
): RecordMusicAffiliateInfo | null {
  const linked = findLinkedOrder(rec, allOrders);
  const affiliate =
    linked?.musicAffiliate ??
    (rec as MTDRecord & { musicAffiliate?: string }).musicAffiliate;
  if (!affiliate?.trim()) return null;

  const meta = resolveMTDFormMeta(rec, orderById);
  const compliance = determineComplianceStatus(
    meta.formType === "school-all-star-dance"
      ? meta.danceFormSubtype
      : meta.cheerFormSubtype,
    affiliate
  );
  if (compliance === "unknown-no-affiliate-field") return null;

  return { affiliate: titleCase(affiliate), compliance };
}
