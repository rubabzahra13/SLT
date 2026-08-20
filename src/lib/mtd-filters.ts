import {
  calculateDateBounds,
  isDateInBounds,
  type DateFilterValue,
} from "@/lib/date-filters";
import {
  inferCheerFormSubtype,
  inferDanceFormSubtype,
  inferFormType,
} from "@/lib/order-form";
import type {
  CheerFormSubtype,
  DanceFormSubtype,
  MTDRecord,
  Order,
  OrderFormType,
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

export function isInProgressRecord(rec: MTDRecord): boolean {
  if (!rec.assignedProducer) return false;

  return (
    rec.status === "active" ||
    rec.status === "outsourced" ||
    rec.section === "OUTSOURCED MIXES"
  );
}

export function getInProgressRecords(records: MTDRecord[]): MTDRecord[] {
  return records.filter(isInProgressRecord);
}

export function getInProgressCount(records: MTDRecord[]): number {
  return getInProgressRecords(records).length;
}

export function matchesProducerFilter(
  rec: MTDRecord,
  producer: string
): boolean {
  if (producer === "All") return true;
  if (producer === "Unassigned") return !rec.assignedProducer;
  const assigned = rec.assignedProducer?.toUpperCase() ?? "";
  const request =
    rec.editorRequest !== "FA" && rec.editorRequest !== "NA"
      ? String(rec.editorRequest).toUpperCase()
      : "";
  return assigned === producer.toUpperCase() || request === producer.toUpperCase();
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
  const mixDate = rec.mixStartDate?.trim();
  const bookedUntil = rec.bookedUntil?.trim();

  if (mixDate && isDateInBounds(mixDate, bounds)) return true;
  if (bookedUntil && isDateInBounds(bookedUntil, bounds)) return true;

  return false;
}

export function filterMTDRecords(
  records: MTDRecord[],
  options: {
    category?: string;
    producer?: string;
    dateFilter?: DateFilterValue;
    form?: OrderFormType;
    cheerSubtype?: CheerFormSubtype;
    danceSubtype?: DanceFormSubtype;
    orderById?: Map<string, Order>;
  }
): MTDRecord[] {
  const {
    category = "All",
    producer = "All",
    dateFilter = { type: "all", value: null },
    form,
    cheerSubtype = DEFAULT_CHEER_SUBTYPE,
    danceSubtype = DEFAULT_DANCE_SUBTYPE,
    orderById,
  } = options;

  return records.filter((rec) => {
    if (!matchesCategoryFilter(rec, category)) return false;
    if (!matchesProducerFilter(rec, producer)) return false;
    if (!matchesDateFilter(rec, dateFilter)) return false;
    if (form && orderById) {
      if (!matchesFormFilter(rec, orderById, form, cheerSubtype, danceSubtype)) {
        return false;
      }
    }
    return true;
  });
}
