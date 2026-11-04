import type { MTDTableFilterState } from "@/components/mtd/MTDTableFilters";
import { DEFAULT_MTD_TABLE_FILTERS } from "@/components/mtd/MTDTableFilters";
import {
  coerceOrdersRangeFilters,
  serializeOrdersRangeFilters,
} from "@/lib/orders-range-filters";
import type {
  CheerFormSubtypeFilter,
  DanceFormSubtypeFilter,
  OrderFormType,
  OrderSourceFilter,
  OrderViewRangeFilter,
} from "@/types";

const STORAGE_KEY = "slt_orders_view_state";

export type OrdersViewState = {
  form?: OrderFormType;
  cheerSubtype?: CheerFormSubtypeFilter;
  danceSubtype?: DanceFormSubtypeFilter;
  /** Active range filters (empty / omitted = All). Legacy single value still accepted. */
  rangeFilters?: OrderViewRangeFilter[];
  /** @deprecated Prefer rangeFilters — kept for older sessionStorage. */
  rangeFilter?: OrderViewRangeFilter;
  sourceFilter?: OrderSourceFilter;
  searchQuery?: string;
  tableFilters?: Partial<MTDTableFilterState>;
};

const VALID_FORMS: OrderFormType[] = [
  "school-all-star-cheer",
  "school-all-star-dance",
  "marching-band",
  "sports-entertainment",
  "school-anthem",
];

const VALID_CHEER: CheerFormSubtypeFilter[] = [
  "all-star-cheer",
  "school-cheer-viroc-yes",
  "school-cheer-viroc-no",
  "youth-rec-cheer",
  "all",
];

const VALID_DANCE: DanceFormSubtypeFilter[] = [
  "pom",
  "hip-hop",
  "team-performance-variety",
  "gameday",
  "jazz-kick",
  "all",
];

const VALID_RANGE: OrderViewRangeFilter[] = [
  "all",
  "need_to_be_scheduled",
  "assigned",
  "not_assigned",
  "reassigned",
  "reassign_leave",
  "reassign_rush",
  "waiting_for_data",
  "flagged",
];

export function saveOrdersViewState(state: OrdersViewState): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}

export function loadOrdersViewState(): OrdersViewState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OrdersViewState;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Soft return from Match/Flagged/Assign: All range, no search — same board key
 * Orders will request on first paint (must match Back warm).
 */
export function ordersReturnViewState(
  state?: OrdersViewState | null
): OrdersViewState {
  const stored = state ?? loadOrdersViewState() ?? {};
  let form = stored.form;
  let cheerSubtype = stored.cheerSubtype;
  let danceSubtype = stored.danceSubtype;
  if (typeof window !== "undefined") {
    const formRaw = sessionStorage.getItem("slt_orders_form") as OrderFormType | null;
    if (formRaw && VALID_FORMS.includes(formRaw)) form = formRaw;
    const cheerRaw = sessionStorage.getItem(
      "slt_orders_cheer_subtype"
    ) as CheerFormSubtypeFilter | null;
    if (cheerRaw && VALID_CHEER.includes(cheerRaw)) cheerSubtype = cheerRaw;
    const danceRaw = sessionStorage.getItem(
      "slt_orders_dance_subtype"
    ) as DanceFormSubtypeFilter | null;
    if (danceRaw && VALID_DANCE.includes(danceRaw)) danceSubtype = danceRaw;
  }
  return {
    ...stored,
    form: form && VALID_FORMS.includes(form) ? form : undefined,
    cheerSubtype,
    danceSubtype,
    rangeFilters: [],
    rangeFilter: "all",
    searchQuery: "",
  };
}

/** Board query for Back-to-Orders warm — keep in lockstep with Orders page. */
export function ordersBoardQueryForReturn(state?: OrdersViewState | null): {
  formType?: OrderFormType;
  cheerFormSubtype?: string;
  danceFormSubtype?: string;
  source?: OrderSourceFilter;
  range?: undefined;
  sortBy: string;
  excludeFlagged: true;
} {
  const view = ordersReturnViewState(state);
  const form = view.form;
  return {
    formType: form,
    cheerFormSubtype:
      form === "school-all-star-cheer" ? view.cheerSubtype : undefined,
    danceFormSubtype:
      form === "school-all-star-dance" ? view.danceSubtype : undefined,
    source:
      view.sourceFilter && view.sourceFilter !== "both"
        ? view.sourceFilter
        : undefined,
    range: undefined,
    sortBy: view.tableFilters?.sortBy ?? "newest",
    excludeFlagged: true,
  };
}

/** Build /orders?... that restores filters/tabs/search/sort after Assign Back. */
export function buildOrdersReturnHref(state: OrdersViewState): string {
  const params = new URLSearchParams();
  if (state.form && VALID_FORMS.includes(state.form)) {
    params.set("form", state.form);
  }
  if (state.cheerSubtype && state.cheerSubtype !== "all") {
    params.set("cheer", state.cheerSubtype);
  }
  if (state.danceSubtype && state.danceSubtype !== "all") {
    params.set("dance", state.danceSubtype);
  }
  {
    const ranges =
      state.rangeFilters ??
      coerceOrdersRangeFilters(state.rangeFilter);
    const serialized = serializeOrdersRangeFilters(ranges);
    if (serialized) params.set("range", serialized);
  }
  if (state.sourceFilter && state.sourceFilter !== "both") {
    params.set("source", state.sourceFilter);
  }
  if (state.searchQuery?.trim()) {
    params.set("q", state.searchQuery.trim());
  }
  const sort = state.tableFilters?.sortBy;
  if (sort && sort !== "newest") params.set("sort", sort);
  if (
    state.tableFilters?.assignedProducer &&
    state.tableFilters.assignedProducer !== "All"
  ) {
    params.set("assigned", state.tableFilters.assignedProducer);
  }
  if (
    state.tableFilters?.scheduleFilter &&
    state.tableFilters.scheduleFilter !== "all"
  ) {
    params.set("schedule", state.tableFilters.scheduleFilter);
  }
  if (
    state.tableFilters?.packageTier &&
    state.tableFilters.packageTier !== "All"
  ) {
    params.set("pkg", state.tableFilters.packageTier);
  }
  if (
    state.tableFilters?.timeLimit &&
    state.tableFilters.timeLimit !== "All"
  ) {
    params.set("time", state.tableFilters.timeLimit);
  }
  if (state.tableFilters?.split && state.tableFilters.split !== "all") {
    params.set("split", state.tableFilters.split);
  }
  if (
    state.tableFilters?.requestedProducer &&
    state.tableFilters.requestedProducer !== "All"
  ) {
    params.set("requested", state.tableFilters.requestedProducer);
  }
  const qs = params.toString();
  return qs ? `/orders?${qs}` : "/orders";
}

export function parseOrdersViewFromSearchParams(
  searchParams: URLSearchParams
): OrdersViewState {
  const state: OrdersViewState = {};
  const form = searchParams.get("form");
  if (form && VALID_FORMS.includes(form as OrderFormType)) {
    state.form = form as OrderFormType;
  }
  const cheer = searchParams.get("cheer");
  if (cheer && VALID_CHEER.includes(cheer as CheerFormSubtypeFilter)) {
    state.cheerSubtype = cheer as CheerFormSubtypeFilter;
  }
  const dance = searchParams.get("dance");
  if (dance && VALID_DANCE.includes(dance as DanceFormSubtypeFilter)) {
    state.danceSubtype = dance as DanceFormSubtypeFilter;
  }
  const range = searchParams.get("range");
  if (range) {
    const parsed = coerceOrdersRangeFilters(range);
    if (parsed.length) {
      state.rangeFilters = parsed;
      state.rangeFilter = parsed[0];
    } else if (VALID_RANGE.includes(range as OrderViewRangeFilter)) {
      const single =
        range === "reassign_leave" || range === "reassign_rush"
          ? "reassigned"
          : (range as OrderViewRangeFilter);
      if (single !== "flagged" && single !== "all") {
        state.rangeFilters = [single];
        state.rangeFilter = single;
      }
    }
  }
  const source = searchParams.get("source");
  if (source === "manual" || source === "form" || source === "both") {
    state.sourceFilter = source;
  }
  const q = searchParams.get("q");
  if (q) state.searchQuery = q;

  const tableFilters: Partial<MTDTableFilterState> = {};
  const sort = searchParams.get("sort");
  if (sort) tableFilters.sortBy = sort as MTDTableFilterState["sortBy"];
  const assigned = searchParams.get("assigned");
  if (assigned) tableFilters.assignedProducer = assigned;
  const schedule = searchParams.get("schedule");
  if (schedule) {
    tableFilters.scheduleFilter =
      schedule as MTDTableFilterState["scheduleFilter"];
  }
  const pkg = searchParams.get("pkg");
  if (pkg) tableFilters.packageTier = pkg;
  const time = searchParams.get("time");
  if (time) tableFilters.timeLimit = time;
  const split = searchParams.get("split");
  if (split) tableFilters.split = split as MTDTableFilterState["split"];
  const requested = searchParams.get("requested");
  if (requested) tableFilters.requestedProducer = requested;
  if (Object.keys(tableFilters).length > 0) {
    state.tableFilters = tableFilters;
  }
  return state;
}

export function mergeOrdersViewState(
  ...parts: Array<OrdersViewState | null | undefined>
): OrdersViewState {
  const out: OrdersViewState = {};
  for (const part of parts) {
    if (!part) continue;
    if (part.form) out.form = part.form;
    if (part.cheerSubtype) out.cheerSubtype = part.cheerSubtype;
    if (part.danceSubtype) out.danceSubtype = part.danceSubtype;
    if (part.rangeFilters?.length) {
      out.rangeFilters = part.rangeFilters;
      out.rangeFilter = part.rangeFilters[0];
    } else if (part.rangeFilter) {
      out.rangeFilter = part.rangeFilter;
      out.rangeFilters = coerceOrdersRangeFilters(part.rangeFilter);
    }
    if (part.sourceFilter) out.sourceFilter = part.sourceFilter;
    if (part.searchQuery !== undefined) out.searchQuery = part.searchQuery;
    if (part.tableFilters) {
      out.tableFilters = { ...(out.tableFilters || {}), ...part.tableFilters };
    }
  }
  return out;
}

export function applyTableFilterDefaults(
  partial?: Partial<MTDTableFilterState>
): MTDTableFilterState {
  return { ...DEFAULT_MTD_TABLE_FILTERS, ...(partial || {}) };
}
