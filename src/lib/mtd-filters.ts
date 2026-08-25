import {
  calculateDateBounds,
  isDateInBounds,
  type DateFilterValue,
} from "@/lib/date-filters";
import { toIsoDateString } from "@/lib/dates";
import { getRequestedEditorFromRecord } from "@/lib/editor-assignment";
import {
  inferCheerFormSubtype,
  inferDanceFormSubtype,
  inferFormType,
} from "@/lib/order-form";
import { parsePackage } from "@/lib/package";
import type {
  CheerFormSubtype,
  DanceFormSubtype,
  MTDRecord,
  Order,
  OrderFormType,
  Producer,
} from "@/types";
import {
  CHEER_FORM_SUBTABS,
  DANCE_FORM_SUBTABS,
  ORDER_FORM_TABS,
} from "@/types";

const DEFAULT_CHEER_SUBTYPE: CheerFormSubtype = "all-star-cheer";
const DEFAULT_DANCE_SUBTYPE: DanceFormSubtype = "pom";

export type MTDFormMeta = {
  formType: OrderFormType;
  cheerFormSubtype: CheerFormSubtype;
  danceFormSubtype: DanceFormSubtype;
};

export function resolveMTDFormMeta(
  rec: MTDRecord,
  orderById: Map<string, Order>
): MTDFormMeta {
  const linked = rec.orderId ? orderById.get(rec.orderId) : undefined;

  if (linked) {
    return {
      formType: linked.formType,
      cheerFormSubtype: linked.cheerFormSubtype || DEFAULT_CHEER_SUBTYPE,
      danceFormSubtype: linked.danceFormSubtype || DEFAULT_DANCE_SUBTYPE,
    };
  }

  const partial: Partial<Order> = {
    category: rec.category,
    package: rec.package,
    musicTheme: rec.musicTheme,
    division: rec.section,
  };
  const formType = inferFormType(partial);

  return {
    formType,
    cheerFormSubtype:
      inferCheerFormSubtype({ ...partial, formType }) || DEFAULT_CHEER_SUBTYPE,
    danceFormSubtype:
      inferDanceFormSubtype({ ...partial, formType }) || DEFAULT_DANCE_SUBTYPE,
  };
}

export function matchesFormFilter(
  rec: MTDRecord,
  orderById: Map<string, Order>,
  form: OrderFormType,
  cheerSubtype: CheerFormSubtype,
  danceSubtype: DanceFormSubtype
): boolean {
  const meta = resolveMTDFormMeta(rec, orderById);
  if (meta.formType !== form) return false;
  if (form === "school-all-star-cheer") {
    return meta.cheerFormSubtype === cheerSubtype;
  }
  if (form === "school-all-star-dance") {
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
): Record<CheerFormSubtype, number> {
  const counts = Object.fromEntries(
    CHEER_FORM_SUBTABS.map(({ id }) => [id, 0])
  ) as Record<CheerFormSubtype, number>;

  for (const rec of records) {
    const meta = resolveMTDFormMeta(rec, orderById);
    if (meta.formType !== "school-all-star-cheer") continue;
    counts[meta.cheerFormSubtype] += 1;
  }

  return counts;
}

export function countMTDByDanceSubtype(
  records: MTDRecord[],
  orderById: Map<string, Order>
): Record<DanceFormSubtype, number> {
  const counts = Object.fromEntries(
    DANCE_FORM_SUBTABS.map(({ id }) => [id, 0])
  ) as Record<DanceFormSubtype, number>;

  for (const rec of records) {
    const meta = resolveMTDFormMeta(rec, orderById);
    if (meta.formType !== "school-all-star-dance") continue;
    counts[meta.danceFormSubtype] += 1;
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
  if (producer === "Unassigned") return !rec.assignedProducer;
  return (
    rec.assignedProducer?.toUpperCase() === producer.toUpperCase()
  );
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
  return requested?.toUpperCase() === producer.toUpperCase();
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

export function buildAssignedProducerOptions(
  records: MTDRecord[],
  producerNames: readonly string[]
) {
  const counts = new Map<string, number>();
  let unassigned = 0;

  for (const rec of records) {
    if (!rec.assignedProducer) {
      unassigned += 1;
    } else {
      counts.set(
        rec.assignedProducer,
        (counts.get(rec.assignedProducer) ?? 0) + 1
      );
    }
  }

  return [
    { value: "All", label: "All assigned", count: records.length },
    { value: "Unassigned", label: "Unassigned", count: unassigned },
    ...producerNames.map((name) => ({
      value: name,
      label: name,
      count: counts.get(name) ?? 0,
    })),
  ];
}

export function buildRequestedProducerOptions(
  records: MTDRecord[],
  producerNames: readonly string[],
  producers: Producer[],
  orderById: Map<string, Order>
) {
  const counts = new Map<string, number>();
  let fa = 0;

  for (const rec of records) {
    const linked = rec.orderId ? orderById.get(rec.orderId) : undefined;
    const requested = getRequestedEditorFromRecord(rec, producers, linked);
    if (!requested) {
      fa += 1;
    } else {
      counts.set(requested, (counts.get(requested) ?? 0) + 1);
    }
  }

  return [
    { value: "All", label: "All requests", count: records.length },
    { value: "FA", label: "First available", count: fa },
    ...producerNames.map((name) => ({
      value: name,
      label: name,
      count: counts.get(name) ?? 0,
    })),
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
  const mixDate = toIsoDateString(rec.mixStartDate);
  const mixEnd = toIsoDateString(rec.mixEndDate);

  if (mixDate && isDateInBounds(mixDate, bounds)) return true;
  if (mixEnd && isDateInBounds(mixEnd, bounds)) return true;

  return false;
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
    cheerSubtype?: CheerFormSubtype;
    danceSubtype?: DanceFormSubtype;
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
