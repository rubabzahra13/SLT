import type { OrderViewRangeFilter } from "@/types";

/** Complete ↔ Missing — exclusive. */
export const ORDERS_DATA_RANGE_IDS = new Set<string>([
  "need_to_be_scheduled",
  "new_orders",
  "waiting_for_data",
]);

/** Assigned ↔ Not assigned ↔ Reassign — exclusive. */
export const ORDERS_ASSIGNMENT_RANGE_IDS = new Set<string>([
  "assigned",
  "not_assigned",
  "reassigned",
  "reassign_leave",
  "reassign_rush",
]);

const VALID_RANGE_TOKEN = new Set<string>([
  "all",
  "need_to_be_scheduled",
  "new_orders",
  "assigned",
  "not_assigned",
  "reassigned",
  "reassign_leave",
  "reassign_rush",
  "waiting_for_data",
  "flagged",
]);

/** Normalize leave/rush → reassigned; new_orders → complete. */
export function normalizeOrdersRangeToken(
  raw: string
): OrderViewRangeFilter | null {
  const t = raw.trim().toLowerCase();
  if (!VALID_RANGE_TOKEN.has(t)) return null;
  if (t === "reassign_leave" || t === "reassign_rush") return "reassigned";
  if (t === "new_orders") return "need_to_be_scheduled";
  if (t === "flagged") return null;
  return t as OrderViewRangeFilter;
}

/** Same chip for legacy aliases. */
export function ordersRangeTokensMatch(
  a: string,
  b: string
): boolean {
  const na = normalizeOrdersRangeToken(a);
  const nb = normalizeOrdersRangeToken(b);
  return Boolean(na && nb && na === nb);
}

export function parseOrdersRangeFilters(
  range: string | null | undefined
): OrderViewRangeFilter[] {
  if (!range || !String(range).trim()) return [];
  const out: OrderViewRangeFilter[] = [];
  const seen = new Set<string>();
  for (const part of String(range).split(",")) {
    const n = normalizeOrdersRangeToken(part);
    if (!n || n === "all") continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  // Keep at most one per exclusive group (last wins).
  let data: OrderViewRangeFilter | undefined;
  let assignment: OrderViewRangeFilter | undefined;
  for (const id of out) {
    if (ORDERS_DATA_RANGE_IDS.has(id)) data = id;
    else if (ORDERS_ASSIGNMENT_RANGE_IDS.has(id)) assignment = id;
  }
  return [data, assignment].filter(Boolean) as OrderViewRangeFilter[];
}

/** Query `range=` value — undefined means All. */
export function serializeOrdersRangeFilters(
  filters: OrderViewRangeFilter[]
): string | undefined {
  const parsed = parseOrdersRangeFilters(filters.join(","));
  if (!parsed.length) return undefined;
  return parsed.join(",");
}

export function isOrdersRangeFilterActive(
  filters: OrderViewRangeFilter[],
  id: OrderViewRangeFilter
): boolean {
  if (id === "all") return filters.length === 0;
  return filters.some((f) => ordersRangeTokensMatch(f, id));
}

/**
 * Toggle a filter chip. "All" clears.
 * Same-group chips replace each other; other group ANDs.
 */
export function toggleOrdersRangeFilter(
  current: OrderViewRangeFilter[],
  id: OrderViewRangeFilter
): OrderViewRangeFilter[] {
  if (id === "all") return [];
  const normalized = normalizeOrdersRangeToken(id);
  if (!normalized || normalized === "all") return [];

  if (isOrdersRangeFilterActive(current, normalized)) {
    return current.filter((f) => !ordersRangeTokensMatch(f, normalized));
  }

  const group = ORDERS_DATA_RANGE_IDS.has(normalized)
    ? ORDERS_DATA_RANGE_IDS
    : ORDERS_ASSIGNMENT_RANGE_IDS.has(normalized)
      ? ORDERS_ASSIGNMENT_RANGE_IDS
      : null;

  const next = group
    ? current.filter((f) => !group.has(f))
    : [...current];
  next.push(normalized);
  return parseOrdersRangeFilters(next.join(","));
}

/** Legacy single-value → selection array. */
export function coerceOrdersRangeFilters(
  value: OrderViewRangeFilter | OrderViewRangeFilter[] | string | undefined | null
): OrderViewRangeFilter[] {
  if (value == null || value === "all") return [];
  if (Array.isArray(value)) return parseOrdersRangeFilters(value.join(","));
  return parseOrdersRangeFilters(String(value));
}
