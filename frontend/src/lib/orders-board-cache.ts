import type {
  OrdersBoardCounts,
  OrdersMatchCounts,
} from "@/lib/api/orders-board";
import {
  ORDERS_ASSIGNMENT_RANGE_IDS,
  ORDERS_DATA_RANGE_IDS,
  parseOrdersRangeFilters,
} from "@/lib/orders-range-filters";
import { orderMatchesOrdersRangeFilter } from "@/lib/order-requirements";
import type { Order } from "@/types";

/**
 * Fresh window for daily all-day use (TanStack-style staleTime).
 * Live updates come from SSE; this window only gates remount catch-up.
 */
export const ORDERS_BOARD_STALE_MS = 90_000;
/** Keep entries after unmount so navigating back is instant. */
export const ORDERS_BOARD_GC_MS = 5 * 60_000;
/** Match counts / pool chips — same window as the board. */
export const MATCH_COUNTS_STALE_MS = 90_000;

export type OrdersBoardCacheEntry = {
  orders: Order[];
  nextPageToken: string | null;
  counts: OrdersBoardCounts;
  updatedAt: number;
  /** Full query key — rejects sessionStorage hash collisions on read. */
  queryKey?: string;
};

const boardCache = new Map<string, OrdersBoardCacheEntry>();

/** Survive hard refresh so Orders paints like MTD/Payroll after a revisit. */
// v3: full-key fingerprint (v2 omitted source → Form filter overwrote All → skeleton).
const BOARD_SS_PREFIX = "slt_orders_board_v3:";
const COUNTS_SS_PREFIX = "slt_orders_counts_v1:";
/** Keep a few real pages; empty sibling prefetches must not evict them. */
const SS_MAX_ENTRIES = 8;

type SsIndexEntry = { key: string; n: number; at: number };

function ssKey(prefix: string, key: string): string {
  // Short stable id — full JSON query keys blow past sessionStorage quotas.
  // Dual hash of the full queryKey so range/source/form never share a slot.
  let h1 = 2166136261;
  let h2 = 0;
  for (let i = 0; i < key.length; i++) {
    const c = key.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 16777619);
    h2 = (h2 * 31 + c) | 0;
  }
  return `${prefix}${(h1 >>> 0).toString(36)}_${(h2 >>> 0).toString(36)}`;
}

function readSessionJson<T>(storageKey: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function touchBoardSessionIndex(storageKey: string, orderCount: number): void {
  const indexKey = `${BOARD_SS_PREFIX}index`;
  const raw = readSessionJson<SsIndexEntry[] | string[]>(indexKey) || [];
  // Migrate legacy string[] index.
  const prev: SsIndexEntry[] = raw.map((item) =>
    typeof item === "string"
      ? { key: item, n: 0, at: 0 }
      : item
  );
  const next: SsIndexEntry[] = [
    { key: storageKey, n: orderCount, at: Date.now() },
    ...prev.filter((e) => e.key !== storageKey),
  ];
  // Drop empties/small pages first so a 50-row Cheer board is never evicted by
  // Assigned(0) / Not assigned sibling prefetches.
  while (next.length > SS_MAX_ENTRIES) {
    let dropAt = next.length - 1;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let i = 1; i < next.length; i++) {
      const e = next[i]!;
      const score = e.n * 1_000_000 + e.at;
      if (score < bestScore) {
        bestScore = score;
        dropAt = i;
      }
    }
    const dropped = next.splice(dropAt, 1)[0];
    if (dropped) sessionStorage.removeItem(dropped.key);
  }
  sessionStorage.setItem(indexKey, JSON.stringify(next));
}

function touchCountsSessionIndex(storageKey: string): void {
  const indexKey = `${COUNTS_SS_PREFIX}index`;
  const prev = readSessionJson<string[]>(indexKey) || [];
  const next = [storageKey, ...prev.filter((k) => k !== storageKey)].slice(
    0,
    SS_MAX_ENTRIES
  );
  for (const stale of prev) {
    if (!next.includes(stale)) sessionStorage.removeItem(stale);
  }
  sessionStorage.setItem(indexKey, JSON.stringify(next));
}

function writeBoardSession(storageKey: string, entry: OrdersBoardCacheEntry): void {
  if (typeof window === "undefined") return;
  // Never persist empty pages — they only thrash the slot list.
  if (!entry.orders.length) return;
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(entry));
    touchBoardSessionIndex(storageKey, entry.orders.length);
  } catch {
    /* quota / private mode — memory cache still works */
  }
}

/**
 * Pages saved before a reload must take this tab's writes too: a write skips
 * its own SSE echo, so an unpatched saved page would paint pre-write rows as
 * fresh (e.g. reload Match, match, open Orders within the stale window).
 */
function hydrateSessionBoards(): void {
  if (typeof window === "undefined") return;
  const index = readSessionJson<Array<SsIndexEntry | string>>(
    `${BOARD_SS_PREFIX}index`
  );
  const now = Date.now();
  for (const item of index || []) {
    const storageKey = typeof item === "string" ? item : item?.key;
    if (!storageKey) continue;
    const entry = readSessionJson<OrdersBoardCacheEntry>(storageKey);
    const key = entry?.queryKey;
    if (!entry || !key || !Array.isArray(entry.orders) || boardCache.has(key)) {
      continue;
    }
    if (now - (entry.updatedAt || 0) > ORDERS_BOARD_GC_MS) continue;
    if (ssKey(BOARD_SS_PREFIX, key) !== storageKey) continue;
    boardCache.set(key, entry);
  }
}
hydrateSessionBoards();

function writeCountsSession(
  storageKey: string,
  value: { counts: OrdersBoardCounts; updatedAt: number }
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(value));
    touchCountsSessionIndex(storageKey);
  } catch {
    /* ignore */
  }
}

function gc(now = Date.now()) {
  for (const [key, entry] of boardCache) {
    if (now - entry.updatedAt > ORDERS_BOARD_GC_MS) boardCache.delete(key);
  }
}

export function readOrdersBoardCache(
  key: string
): { entry: OrdersBoardCacheEntry; fresh: boolean } | null {
  gc();
  let entry = boardCache.get(key);
  if (!entry) {
    const persisted = readSessionJson<OrdersBoardCacheEntry>(
      ssKey(BOARD_SS_PREFIX, key)
    );
    // Require queryKey match. On mismatch do NOT delete — under a hash
    // collision that slot belongs to another query (wiping it caused All
    // to cold-load after visiting Reassign).
    if (
      persisted?.orders &&
      Array.isArray(persisted.orders) &&
      Date.now() - (persisted.updatedAt || 0) <= ORDERS_BOARD_GC_MS &&
      persisted.queryKey === key
    ) {
      boardCache.set(key, persisted);
      entry = persisted;
    }
  }
  if (!entry) return null;
  return {
    entry,
    fresh: Date.now() - entry.updatedAt < ORDERS_BOARD_STALE_MS,
  };
}

export function writeOrdersBoardCache(
  key: string,
  patch: Partial<OrdersBoardCacheEntry> &
    Pick<OrdersBoardCacheEntry, "orders" | "nextPageToken">,
  opts?: { persist?: boolean }
) {
  const prev = boardCache.get(key);
  const entry: OrdersBoardCacheEntry = {
    orders: patch.orders,
    nextPageToken: patch.nextPageToken,
    counts: patch.counts ?? prev?.counts ?? {
      all: 0,
      complete_data: 0,
      missing_data: 0,
      assigned: 0,
      not_assigned: 0,
      reassigned: 0,
      flagged: 0,
      form: 0,
      manual: 0,
      by_form_type: {},
      by_cheer_form_subtype: {},
      by_dance_form_subtype: {},
    },
    updatedAt: Date.now(),
    queryKey: key,
  };
  boardCache.set(key, entry);
  // Prefetch/siblings stay memory-only so they cannot evict the painted page.
  if (opts?.persist !== false) {
    writeBoardSession(ssKey(BOARD_SS_PREFIX, key), entry);
  }
}

export function writeOrdersBoardCountsCache(
  key: string,
  counts: OrdersBoardCounts
) {
  const prev = boardCache.get(key);
  if (prev) {
    boardCache.set(key, { ...prev, counts, updatedAt: Date.now() });
  }
}

/** Badge counts ignore range/sort — same totals for All vs Assigned tabs. */
const countsCache = new Map<
  string,
  { counts: OrdersBoardCounts; updatedAt: number }
>();

export function readOrdersBoardCountsCache(
  key: string
): { counts: OrdersBoardCounts; fresh: boolean } | null {
  let entry = countsCache.get(key);
  if (!entry) {
    const persisted = readSessionJson<{
      counts: OrdersBoardCounts;
      updatedAt: number;
    }>(ssKey(COUNTS_SS_PREFIX, key));
    if (
      persisted?.counts &&
      Date.now() - (persisted.updatedAt || 0) <= ORDERS_BOARD_GC_MS
    ) {
      countsCache.set(key, persisted);
      entry = persisted;
    }
  }
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > ORDERS_BOARD_GC_MS) {
    countsCache.delete(key);
    return null;
  }
  return {
    counts: entry.counts,
    fresh: Date.now() - entry.updatedAt < ORDERS_BOARD_STALE_MS,
  };
}

export function writeOrdersBoardCountsOnlyCache(
  key: string,
  counts: OrdersBoardCounts
) {
  const entry = { counts, updatedAt: Date.now() };
  countsCache.set(key, entry);
  writeCountsSession(ssKey(COUNTS_SS_PREFIX, key), entry);
}

/**
 * Form / Cheer / Dance menu chip totals — same for every form tab (server
 * computes them without form_type). Sticky across Cheer↔Dance so the Form
 * dropdown does not flash 0 while the new tab's counts load.
 */
export type OrdersBoardChipCounts = {
  by_form_type: Record<string, number>;
  by_cheer_form_subtype: Record<string, number>;
  by_dance_form_subtype: Record<string, number>;
};

const chipCountsCache = new Map<
  string,
  { chips: OrdersBoardChipCounts; updatedAt: number }
>();

export function ordersBoardChipCountsQueryKey(query: {
  category?: string;
  source?: string;
  search?: string;
  excludeFlagged?: boolean;
  flaggedOnly?: boolean;
}): string {
  return JSON.stringify({
    category: query.category ?? "",
    source: query.source ?? "",
    search: query.search ?? "",
    excludeFlagged: query.excludeFlagged !== false,
    flaggedOnly: Boolean(query.flaggedOnly),
  });
}

/**
 * Counts ignore form/subtype — one /orders/counts per source/search/flag scope.
 * Same key as chips so Cheer↔Dance does not re-hit /orders/counts.
 */
export function ordersBoardCountsQueryKey(query: {
  category?: string;
  source?: string;
  search?: string;
  excludeFlagged?: boolean;
  flaggedOnly?: boolean;
}): string {
  return ordersBoardChipCountsQueryKey(query);
}

/** Active form/subtype "All" total from server chips (range badges stay board-scoped). */
export function ordersActiveFormTotal(
  counts: OrdersBoardCounts,
  opts: {
    formType?: string;
    cheerFormSubtype?: string;
    danceFormSubtype?: string;
  }
): number {
  const form = opts.formType;
  const cheer = opts.cheerFormSubtype;
  const dance = opts.danceFormSubtype;
  if (
    form === "school-all-star-cheer" &&
    cheer &&
    cheer !== "all" &&
    cheer !== "All"
  ) {
    return counts.by_cheer_form_subtype?.[cheer] ?? 0;
  }
  if (
    form === "school-all-star-dance" &&
    dance &&
    dance !== "all" &&
    dance !== "All"
  ) {
    return counts.by_dance_form_subtype?.[dance] ?? 0;
  }
  if (form) return counts.by_form_type?.[form] ?? 0;
  return counts.all;
}

function isConcreteSubtype(subtype?: string): boolean {
  return Boolean(subtype && subtype !== "all" && subtype !== "All");
}

/**
 * Range-tab badge total for the active board query.
 * Prefer per-subtype maps when a Cheer/Dance subtype is selected — form-wide
 * Not assigned capped at subtype All was stuck at 190 after assigns.
 */
export function ordersRangeTabTotal(
  counts: OrdersBoardCounts,
  range: string | undefined,
  opts: {
    formType?: string;
    cheerFormSubtype?: string;
    danceFormSubtype?: string;
  }
): number {
  const form = opts.formType || undefined;
  const cheer = opts.cheerFormSubtype;
  const dance = opts.danceFormSubtype;
  const cheerSub =
    form === "school-all-star-cheer" && isConcreteSubtype(cheer) ? cheer : undefined;
  const danceSub =
    form === "school-all-star-dance" && isConcreteSubtype(dance) ? dance : undefined;

  const subtypeMap = (
    cheerMaps: Record<string, number> | undefined,
    danceMaps: Record<string, number> | undefined
  ): number | null => {
    if (cheerSub && cheerMaps && typeof cheerMaps[cheerSub] === "number") {
      return cheerMaps[cheerSub]!;
    }
    if (danceSub && danceMaps && typeof danceMaps[danceSub] === "number") {
      return danceMaps[danceSub]!;
    }
    return null;
  };

  switch (range || "all") {
    case "waiting_for_data": {
      const sub = subtypeMap(
        counts.missing_data_by_cheer_form_subtype,
        counts.missing_data_by_dance_form_subtype
      );
      if (sub !== null) return sub;
      return form
        ? counts.missing_data_by_form_type?.[form] ?? counts.missing_data
        : counts.missing_data;
    }
    case "need_to_be_scheduled":
    case "new_orders": {
      const sub = subtypeMap(
        counts.complete_data_by_cheer_form_subtype,
        counts.complete_data_by_dance_form_subtype
      );
      if (sub !== null) return sub;
      return form
        ? counts.complete_data_by_form_type?.[form] ?? counts.complete_data
        : counts.complete_data;
    }
    case "assigned": {
      const sub = subtypeMap(
        counts.assigned_by_cheer_form_subtype,
        counts.assigned_by_dance_form_subtype
      );
      if (sub !== null) return sub;
      return form
        ? counts.assigned_by_form_type?.[form] ?? counts.assigned
        : counts.assigned;
    }
    case "not_assigned": {
      const sub = subtypeMap(
        counts.not_assigned_by_cheer_form_subtype,
        counts.not_assigned_by_dance_form_subtype
      );
      if (sub !== null) return sub;
      return form
        ? counts.not_assigned_by_form_type?.[form] ?? counts.not_assigned
        : counts.not_assigned;
    }
    case "reassigned":
    case "reassign_leave":
    case "reassign_rush": {
      const sub = subtypeMap(
        counts.reassigned_by_cheer_form_subtype,
        counts.reassigned_by_dance_form_subtype
      );
      if (sub !== null) return sub;
      return form
        ? counts.reassigned_by_form_type?.[form] ?? counts.reassigned
        : counts.reassigned;
    }
    case "flagged":
      return counts.flagged;
    case "all":
    default:
      return ordersActiveFormTotal(counts, opts);
  }
}

type RangeScopeOpts = {
  formType?: string;
  cheerFormSubtype?: string;
  danceFormSubtype?: string;
};

type CompleteCrossMaps = {
  global?: number;
  byForm?: Record<string, number>;
  byCheer?: Record<string, number>;
  byDance?: Record<string, number>;
};

function completeCrossMaps(
  counts: OrdersBoardCounts,
  assignment: string
): CompleteCrossMaps | null {
  switch (assignment) {
    case "assigned":
      return {
        global: counts.complete_assigned,
        byForm: counts.complete_assigned_by_form_type,
        byCheer: counts.complete_assigned_by_cheer_form_subtype,
        byDance: counts.complete_assigned_by_dance_form_subtype,
      };
    case "not_assigned":
      return {
        global: counts.complete_not_assigned,
        byForm: counts.complete_not_assigned_by_form_type,
        byCheer: counts.complete_not_assigned_by_cheer_form_subtype,
        byDance: counts.complete_not_assigned_by_dance_form_subtype,
      };
    case "reassigned":
    case "reassign_leave":
    case "reassign_rush":
      return {
        global: counts.complete_reassigned,
        byForm: counts.complete_reassigned_by_form_type,
        byCheer: counts.complete_reassigned_by_cheer_form_subtype,
        byDance: counts.complete_reassigned_by_dance_form_subtype,
      };
    default:
      return null;
  }
}

/** Complete ∩ assignment for the active form/subtype; null = older payload. */
function completeCrossTotal(
  counts: OrdersBoardCounts,
  assignment: string,
  opts: RangeScopeOpts
): number | null {
  const maps = completeCrossMaps(counts, assignment);
  if (!maps || typeof maps.global !== "number") return null;
  const form = opts.formType || undefined;
  if (form === "school-all-star-cheer" && isConcreteSubtype(opts.cheerFormSubtype)) {
    return maps.byCheer?.[opts.cheerFormSubtype!] ?? 0;
  }
  if (form === "school-all-star-dance" && isConcreteSubtype(opts.danceFormSubtype)) {
    return maps.byDance?.[opts.danceFormSubtype!] ?? 0;
  }
  if (form) return maps.byForm?.[form] ?? 0;
  return maps.global;
}

/**
 * Total for a status-chip selection (`range=` value, comma = AND).
 * Null when a combined selection can't be resolved from this payload.
 */
export function ordersRangeFilterTotal(
  counts: OrdersBoardCounts,
  range: string | undefined,
  opts: RangeScopeOpts
): number | null {
  const parts = parseOrdersRangeFilters(range);
  if (parts.length <= 1) return ordersRangeTabTotal(counts, parts[0], opts);
  const data = parts.find((p) => ORDERS_DATA_RANGE_IDS.has(p));
  const assignment = parts.find((p) => ORDERS_ASSIGNMENT_RANGE_IDS.has(p));
  if (!data || !assignment) return null;
  const complete = completeCrossTotal(counts, assignment, opts);
  if (complete === null) return null;
  if (data !== "waiting_for_data") return complete;
  return Math.max(0, ordersRangeTabTotal(counts, assignment, opts) - complete);
}

/** Source menu Form/Manual totals for the selected form (+ subtype when set). */
export function ordersSourceMenuCounts(
  counts: OrdersBoardCounts,
  opts: {
    formType?: string;
    cheerFormSubtype?: string;
    danceFormSubtype?: string;
  }
): { both: number; form: number; manual: number } {
  const form = opts.formType;
  const cheer = opts.cheerFormSubtype;
  const dance = opts.danceFormSubtype;
  let formN: number | undefined;
  let manualN: number | undefined;
  if (
    form === "school-all-star-cheer" &&
    isConcreteSubtype(cheer)
  ) {
    formN = counts.form_by_cheer_form_subtype?.[cheer!];
    manualN = counts.manual_by_cheer_form_subtype?.[cheer!];
  } else if (
    form === "school-all-star-dance" &&
    isConcreteSubtype(dance)
  ) {
    formN = counts.form_by_dance_form_subtype?.[dance!];
    manualN = counts.manual_by_dance_form_subtype?.[dance!];
  } else if (form) {
    formN = counts.form_by_form_type?.[form];
    manualN = counts.manual_by_form_type?.[form];
  }
  // Maps missing (old payload) → fall back to board-wide form/manual.
  if (typeof formN !== "number" || typeof manualN !== "number") {
    const f = typeof counts.form === "number" ? counts.form : 0;
    const m = typeof counts.manual === "number" ? counts.manual : 0;
    return { both: f + m, form: f, manual: m };
  }
  return { both: formN + manualN, form: formN, manual: manualN };
}

function chipCountsFromBoard(
  counts: OrdersBoardCounts
): OrdersBoardChipCounts | null {
  const byForm = counts.by_form_type || {};
  if (Object.keys(byForm).length === 0) return null;
  return {
    by_form_type: { ...byForm },
    by_cheer_form_subtype: { ...(counts.by_cheer_form_subtype || {}) },
    by_dance_form_subtype: { ...(counts.by_dance_form_subtype || {}) },
  };
}

export function writeOrdersBoardChipCountsCache(
  chipKey: string,
  counts: OrdersBoardCounts
) {
  const chips = chipCountsFromBoard(counts);
  if (!chips) return;
  chipCountsCache.set(chipKey, { chips, updatedAt: Date.now() });
}

export function readOrdersBoardChipCountsCache(
  chipKey: string
): OrdersBoardChipCounts | null {
  const entry = chipCountsCache.get(chipKey);
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > ORDERS_BOARD_GC_MS) {
    chipCountsCache.delete(chipKey);
    return null;
  }
  return entry.chips;
}

/** Overlay sticky Form-menu chips when the active tab's counts lack them. */
export function mergeStickyChipCounts(
  counts: OrdersBoardCounts,
  chipKey: string
): OrdersBoardCounts {
  const chips = readOrdersBoardChipCountsCache(chipKey);
  if (!chips) return counts;
  const hasFormChips = Object.keys(counts.by_form_type || {}).length > 0;
  if (hasFormChips) return counts;
  return {
    ...counts,
    by_form_type: chips.by_form_type,
    by_cheer_form_subtype: chips.by_cheer_form_subtype,
    by_dance_form_subtype: chips.by_dance_form_subtype,
  };
}

export function invalidateOrdersBoardCache(key?: string) {
  if (key) boardCache.delete(key);
  else boardCache.clear();
  if (!key) countsCache.clear();
}

function orderMatchesId(order: Order, id: string): boolean {
  return order.id === id || order.uuid === id || order.legacyId === id;
}

/** Shift a scoped badge map by `d` (missing key = 0). */
function bumpCountMap(
  map: Record<string, number> | undefined,
  key: string | undefined,
  d: number
): Record<string, number> | undefined {
  if (!key) return map;
  const next = { ...(map || {}) };
  next[key] = Math.max(0, (next[key] || 0) + d);
  return next;
}

/** Backend `_blank_text_expr` tokens. */
const BLANK_TEXT_TOKENS = new Set([
  "", "TBD", "TBA", "N/A", "NA", "NONE", "NULL", "-", "--", "---",
  ".", "..", "...", "0:00", "SELECT", "PENDING", "UNKNOWN",
]);

function isBlankText(v: unknown): boolean {
  return BLANK_TEXT_TOKENS.has(String(v ?? "").trim().toUpperCase());
}

const upperTrim = (v: unknown) => String(v ?? "").trim().toUpperCase();

/**
 * Field SoT for Missing/Complete (matches board pills + `_missing_data_expr`
 * without stale `needs_attention`). Used for optimistic badge shifts.
 */
function deriveMissingDataFields(o: Order): boolean {
  const sheet = upperTrim(o.eightCountSheet);
  const sending = upperTrim(o.sendingEightCountSheets);
  const csOutstanding =
    (sending === "Y" || sending.startsWith("YES")) && !sheet.includes("HAVE");
  return (
    sheet.includes("NEED") ||
    upperTrim(o.haveSongs).includes("NEED") ||
    ["", "TBD"].includes(upperTrim(o.packageType)) ||
    isBlankText(o.timeLengthOfMix) ||
    (isBlankText(o.songListSuggestions) && isBlankText(o.musicTheme)) ||
    isBlankText(o.routineNotes) ||
    csOutstanding
  );
}

/** Optimistic `needs_attention` after a collection / Songs / Notes patch. */
function serverNeedsAttention(o: Order): boolean {
  return deriveMissingDataFields(o);
}

/** PATCH keys that recompute optimistic needs_attention + Complete/Missing. */
const NEEDS_ATTENTION_KEYS: (keyof Order)[] = [
  "eightCountSheet",
  "haveSongs",
  "collectionStates",
  "packageType",
  "timeLengthOfMix",
  "routineNotes",
  "additionalNotes",
  "lyricalNotes",
  "songListSuggestions",
  "musicTheme",
  "powerMusicCovers",
  "unleashTheBeatsCovers",
  "customerSongs",
  "instrumentationNotes",
  "sendingEightCountSheets",
];

/**
 * Backend `_missing_data_expr` field checks — badge counts are server SQL, so
 * local shifts must match. Do not OR stale needsAttention (Notes fills often
 * leave it true while pills are green).
 */
function isCompleteDataOrder(o: Order): boolean {
  return !deriveMissingDataFields(o);
}

type OrderBadgeState = {
  complete: boolean;
  assignment: "assigned" | "not_assigned" | "reassigned";
};

/** Backend `_assigned_expr` / `_not_assigned_expr` / `_reassigned_expr`. */
function orderBadgeState(order: Order): OrderBadgeState {
  const producer = String(order.assignedProducer ?? "");
  const assigned =
    (producer !== "" && producer !== "NA") ||
    Boolean((order as { assignedProducerId?: string | null }).assignedProducerId);
  return {
    complete: isCompleteDataOrder(order),
    assignment: order.isReassigned
      ? "reassigned"
      : assigned
        ? "assigned"
        : "not_assigned",
  };
}

/** Count fields one row adds to (each also has _by_form_type / _by_*_subtype maps). */
function badgeBuckets(s: OrderBadgeState): string[] {
  return [
    s.complete ? "complete_data" : "missing_data",
    s.assignment,
    ...(s.complete ? [`complete_${s.assignment}`] : []),
  ];
}

const BADGE_SCOPE_SUFFIXES = [
  ["_by_form_type", "form"],
  ["_by_cheer_form_subtype", "cheer"],
  ["_by_dance_form_subtype", "dance"],
] as const;

function shiftBadgeBuckets(
  c: OrdersBoardCounts,
  from: OrderBadgeState,
  to: OrderBadgeState,
  scope: { form?: string; cheer?: string; dance?: string }
): OrdersBoardCounts {
  const delta = new Map<string, number>();
  for (const b of badgeBuckets(from)) delta.set(b, (delta.get(b) ?? 0) - 1);
  for (const b of badgeBuckets(to)) delta.set(b, (delta.get(b) ?? 0) + 1);
  const crossOn = typeof c.complete_assigned === "number";
  const next = { ...c } as unknown as Record<string, unknown>;
  for (const [base, d] of delta) {
    if (!d) continue;
    if (base !== "complete_data" && base.startsWith("complete_") && !crossOn) {
      continue;
    }
    next[base] = Math.max(0, Number(next[base] ?? 0) + d);
    for (const [suffix, scopeKey] of BADGE_SCOPE_SUFFIXES) {
      const key = scope[scopeKey];
      if (!key) continue;
      next[base + suffix] = bumpCountMap(
        next[base + suffix] as Record<string, number> | undefined,
        key,
        d
      );
    }
  }
  return next as unknown as OrdersBoardCounts;
}

/** Backend board counts skip in_mtd rows (matched Magento forms still count). */
function onBoardCounts(o: Order): boolean {
  return o.status !== "in_mtd";
}

/** Bucket shifts only hold while the row stays in the same counts scopes. */
function sameCountsScopes(a: Order, b: Order): boolean {
  return (
    onBoardCounts(a) &&
    onBoardCounts(b) &&
    (a.affiliateFlagStatus === "open") === (b.affiliateFlagStatus === "open") &&
    Boolean(a.isManualEntry) === Boolean(b.isManualEntry) &&
    (a.formType || "") === (b.formType || "") &&
    (a.cheerFormSubtype || "") === (b.cheerFormSubtype || "") &&
    (a.danceFormSubtype || "") === (b.danceFormSubtype || "")
  );
}

/** A search's results include the row only if a cached page for it does. */
function searchResultsInclude(search: string, orderId: string): boolean {
  for (const [key, entry] of boardCache) {
    try {
      if ((JSON.parse(key) as { search?: string }).search !== search) continue;
    } catch {
      continue;
    }
    if (entry.orders.some((o) => orderMatchesId(o, orderId))) return true;
  }
  return false;
}

/** Counts scopes this row is part of (flagged-only badges aren't shifted). */
function countsScopeIncludesOrder(countsKey: string, order: Order): boolean {
  try {
    const q = JSON.parse(countsKey) as {
      source?: string;
      search?: string;
      excludeFlagged?: boolean;
      flaggedOnly?: boolean;
    };
    if (q.flaggedOnly) return false;
    if (q.source === "manual" && !order.isManualEntry) return false;
    if (q.source === "form" && order.isManualEntry) return false;
    if (q.excludeFlagged !== false && order.affiliateFlagStatus === "open") {
      return false;
    }
    if ((q.search || "").trim() && !searchResultsInclude(q.search || "", order.id)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * A row moved between badge buckets (Complete↔Missing, Assigned↔Not
 * assigned↔Reassign): shift cached badge counts now, with no /counts refetch.
 * `dataOnly` for local writes whose assignment move is bumped separately
 * (syncOrdersBoardAfterAssignment / AfterReassign).
 */
export function shiftOrdersBoardBadgeCounts(
  prev: Order,
  next: Order,
  opts?: { dataOnly?: boolean }
): boolean {
  if (!sameCountsScopes(prev, next)) return false;
  const from = orderBadgeState(prev);
  const to = orderBadgeState(next);
  if (opts?.dataOnly) from.assignment = to.assignment;
  if (from.complete === to.complete && from.assignment === to.assignment) {
    return false;
  }
  const form = next.formType || undefined;
  const cheer = next.cheerFormSubtype;
  const dance = next.danceFormSubtype;
  const scope = {
    form,
    cheer:
      form === "school-all-star-cheer" && isConcreteSubtype(cheer) ? cheer : undefined,
    dance:
      form === "school-all-star-dance" && isConcreteSubtype(dance) ? dance : undefined,
  };
  let changed = false;
  for (const [key, entry] of countsCache) {
    if (!countsScopeIncludesOrder(key, next)) continue;
    const shifted = {
      counts: shiftBadgeBuckets(entry.counts, from, to, scope),
      updatedAt: entry.updatedAt,
    };
    countsCache.set(key, shifted);
    try {
      writeCountsSession(ssKey(COUNTS_SS_PREFIX, key), shifted);
    } catch {
      /* ignore */
    }
    changed = true;
  }
  return changed;
}

function bumpAssignmentCounts(
  c: OrdersBoardCounts,
  opts: {
    formType?: string | null;
    cheerFormSubtype?: string | null;
    danceFormSubtype?: string | null;
    delta: 1 | -1;
    /** Complete-data row: also shift Complete ∩ Assigned / Not assigned. */
    complete?: boolean;
  }
): OrdersBoardCounts {
  const form = opts.formType || undefined;
  const cheer =
    form === "school-all-star-cheer" &&
    isConcreteSubtype(opts.cheerFormSubtype || undefined)
      ? opts.cheerFormSubtype!
      : undefined;
  const dance =
    form === "school-all-star-dance" &&
    isConcreteSubtype(opts.danceFormSubtype || undefined)
      ? opts.danceFormSubtype!
      : undefined;
  const d = opts.delta;
  const assignedBy = { ...(c.assigned_by_form_type || {}) };
  const notAssignedBy = { ...(c.not_assigned_by_form_type || {}) };
  const assignedCheer = { ...(c.assigned_by_cheer_form_subtype || {}) };
  const notAssignedCheer = { ...(c.not_assigned_by_cheer_form_subtype || {}) };
  const assignedDance = { ...(c.assigned_by_dance_form_subtype || {}) };
  const notAssignedDance = { ...(c.not_assigned_by_dance_form_subtype || {}) };
  if (form) {
    assignedBy[form] = Math.max(0, (assignedBy[form] || 0) + d);
    notAssignedBy[form] = Math.max(0, (notAssignedBy[form] || 0) - d);
  }
  if (cheer) {
    assignedCheer[cheer] = Math.max(0, (assignedCheer[cheer] || 0) + d);
    notAssignedCheer[cheer] = Math.max(0, (notAssignedCheer[cheer] || 0) - d);
  }
  if (dance) {
    assignedDance[dance] = Math.max(0, (assignedDance[dance] || 0) + d);
    notAssignedDance[dance] = Math.max(0, (notAssignedDance[dance] || 0) - d);
  }
  const next: OrdersBoardCounts = {
    ...c,
    assigned: Math.max(0, (c.assigned || 0) + d),
    not_assigned: Math.max(0, (c.not_assigned || 0) - d),
    assigned_by_form_type: assignedBy,
    not_assigned_by_form_type: notAssignedBy,
    assigned_by_cheer_form_subtype: assignedCheer,
    not_assigned_by_cheer_form_subtype: notAssignedCheer,
    assigned_by_dance_form_subtype: assignedDance,
    not_assigned_by_dance_form_subtype: notAssignedDance,
  };
  if (!opts.complete || typeof c.complete_assigned !== "number") return next;
  return {
    ...next,
    complete_assigned: Math.max(0, c.complete_assigned + d),
    complete_not_assigned: Math.max(0, (c.complete_not_assigned || 0) - d),
    complete_assigned_by_form_type: bumpCountMap(
      c.complete_assigned_by_form_type,
      form,
      d
    ),
    complete_not_assigned_by_form_type: bumpCountMap(
      c.complete_not_assigned_by_form_type,
      form,
      -d
    ),
    complete_assigned_by_cheer_form_subtype: bumpCountMap(
      c.complete_assigned_by_cheer_form_subtype,
      cheer,
      d
    ),
    complete_not_assigned_by_cheer_form_subtype: bumpCountMap(
      c.complete_not_assigned_by_cheer_form_subtype,
      cheer,
      -d
    ),
    complete_assigned_by_dance_form_subtype: bumpCountMap(
      c.complete_assigned_by_dance_form_subtype,
      dance,
      d
    ),
    complete_not_assigned_by_dance_form_subtype: bumpCountMap(
      c.complete_not_assigned_by_dance_form_subtype,
      dance,
      -d
    ),
  };
}

/** CustomEvent name for live Orders board rows patched outside SSE. */
export const ORDERS_BOARD_PATCH_EVENT = "slt-orders-board-patch";

/**
 * Patch an order across every cached Orders board page + notify live hooks
 * so collection pills (CS, etc.) flip before SSE round-trips.
 */
/** Ids this tab just wrote: their SSE echo needs no board/count catch-up. */
const localOrderWriteAt = new Map<string, number>();
/** Songs/Notes (etc.) keys from the optimistic patch — keep over empty SSE/paint. */
const localOrderWriteKeys = new Map<string, Set<string>>();
const LOCAL_WRITE_ECHO_MS = 15_000;

/** Fields admin Songs/Notes/Mix edits touch; Magento-empty must not wipe them mid-echo. */
const LOCAL_PRESERVE_FIELD_KEYS = new Set([
  "routineNotes",
  "additionalNotes",
  "lyricalNotes",
  "songListSuggestions",
  "powerMusicCovers",
  "unleashTheBeatsCovers",
  "customerSongs",
  "instrumentationNotes",
  "instrumentalStylePreference",
  "musicTheme",
  "haveSongs",
  "collectionStates",
  "timeLengthOfMix",
]);

function noteLocalOrderWrite(
  ...args: Array<string | null | undefined | Partial<Order>>
) {
  const now = Date.now();
  const ids: string[] = [];
  let patch: Partial<Order> | undefined;
  for (const arg of args) {
    if (arg == null) continue;
    if (typeof arg === "string") ids.push(arg);
    else patch = arg;
  }
  const preserveKeys = patch
    ? Object.keys(patch).filter((k) => LOCAL_PRESERVE_FIELD_KEYS.has(k))
    : [];
  for (const id of ids) {
    localOrderWriteAt.set(id, now);
    if (preserveKeys.length === 0) continue;
    const prev = localOrderWriteKeys.get(id) ?? new Set<string>();
    for (const k of preserveKeys) prev.add(k);
    localOrderWriteKeys.set(id, prev);
  }
}

export function isRecentLocalOrderWrite(
  order: Pick<Order, "id" | "uuid" | "legacyId">
): boolean {
  const now = Date.now();
  for (const id of [order.id, order.uuid, order.legacyId]) {
    const at = id ? localOrderWriteAt.get(id) : undefined;
    if (at && now - at < LOCAL_WRITE_ECHO_MS) return true;
  }
  return false;
}

function recentLocalPreserveKeys(
  order: Pick<Order, "id" | "uuid" | "legacyId">
): Set<string> | null {
  if (!isRecentLocalOrderWrite(order)) return null;
  const keys = new Set<string>();
  const now = Date.now();
  for (const id of [order.id, order.uuid, order.legacyId]) {
    if (!id) continue;
    const at = localOrderWriteAt.get(id);
    if (!at || now - at >= LOCAL_WRITE_ECHO_MS) continue;
    const set = localOrderWriteKeys.get(id);
    if (set) for (const k of set) keys.add(k);
  }
  return keys.size > 0 ? keys : null;
}

/**
 * After a local Songs/Notes save, SSE / board paint can briefly echo Magento
 * with empty routine_notes. Keep the optimistic field values for those keys.
 */
export function mergeIncomingOrderPreservingRecentLocalFields(
  local: Order,
  incoming: Order
): Order {
  const merged: Order = { ...local, ...incoming };
  const keys =
    recentLocalPreserveKeys(local) || recentLocalPreserveKeys(incoming);
  if (!keys) return merged;
  for (const key of keys) {
    const locVal = (local as Record<string, unknown>)[key];
    if (locVal === undefined) continue;
    (merged as Record<string, unknown>)[key] = locVal;
  }
  return merged;
}

export function readOrdersBoardOrder(orderId: string): Order | null {
  for (const entry of boardCache.values()) {
    const hit = entry.orders.find((o) => orderMatchesId(o, orderId));
    if (hit) return hit;
  }
  return null;
}

/** Deduped orders currently held in board/session caches (for VO program lists). */
export function collectOrdersBoardCachedOrders(): Order[] {
  const byId = new Map<string, Order>();
  for (const entry of boardCache.values()) {
    for (const order of entry.orders) {
      if (!order?.id || byId.has(order.id)) continue;
      byId.set(order.id, order);
    }
  }
  return [...byId.values()];
}

/**
 * Hard-delete an order from every Orders board page + badge counts + match pool.
 * Call from AppState.deleteOrder so VO/program pickers cannot keep a ghost row.
 */
export function removeOrdersBoardOrderFromCaches(orderId: string): void {
  if (!orderId) return;
  const before = readOrdersBoardOrder(orderId);
  let anyChanged = false;
  for (const [key, entry] of boardCache) {
    const nextOrders = entry.orders.filter((o) => !orderMatchesId(o, orderId));
    if (nextOrders.length === entry.orders.length) continue;
    anyChanged = true;
    const next = {
      ...entry,
      orders: nextOrders,
      updatedAt: Date.now(),
    };
    boardCache.set(key, next);
    try {
      writeBoardSession(ssKey(BOARD_SS_PREFIX, key), next);
    } catch {
      /* ignore */
    }
  }

  let countsChanged = false;
  if (before) {
    for (const [key, entry] of countsCache) {
      let flaggedOnly = false;
      try {
        flaggedOnly = Boolean(
          (JSON.parse(key) as { flaggedOnly?: boolean }).flaggedOnly
        );
      } catch {
        /* keep */
      }
      if (flaggedOnly) continue;
      const next = {
        counts: bumpNormalBoardPresence(entry.counts, before, -1),
        updatedAt: Date.now(),
      };
      countsCache.set(key, next);
      try {
        writeCountsSession(ssKey(COUNTS_SS_PREFIX, key), next);
      } catch {
        /* ignore */
      }
      countsChanged = true;
    }
  }

  noteLocalOrderWrite(
    orderId,
    before?.uuid ?? undefined,
    before?.legacyId ?? undefined
  );
  applyMatchPoolLiveDelete(orderId);

  if (typeof window !== "undefined" && (anyChanged || before)) {
    window.dispatchEvent(
      new CustomEvent(ORDERS_BOARD_PATCH_EVENT, {
        detail: {
          orderId,
          patch: { id: orderId } as Partial<Order>,
          removed: true,
          countsChanged,
        },
      })
    );
  }
}

/**
 * Another tab / user saved a cached row (SSE): patch it in every cached page
 * and move badges by its bucket change. "recount" when the row entered or
 * left a counts scope (Move to MTD, flagged, form type) — needs /counts.
 */
export function applyPeerOrderUpdate(order: Order): "shifted" | "recount" | null {
  const before = readOrdersBoardOrder(order.id);
  if (!before) return null;
  // Absorbed Magento forms are not a board row. Match already moved badges.
  if (before.mergedIntoManualOrderId || order.mergedIntoManualOrderId) {
    return null;
  }
  for (const [key, entry] of boardCache) {
    if (!entry.orders.some((o) => orderMatchesId(o, order.id))) continue;
    const next = {
      ...entry,
      orders: entry.orders.map((o) =>
        orderMatchesId(o, order.id)
          ? mergeIncomingOrderPreservingRecentLocalFields(o, order)
          : o
      ),
    };
    boardCache.set(key, next);
    try {
      writeBoardSession(ssKey(BOARD_SS_PREFIX, key), next);
    } catch {
      /* ignore */
    }
  }
  const next = mergeIncomingOrderPreservingRecentLocalFields(before, order);
  if (!sameCountsScopes(before, next)) {
    return onBoardCounts(before) || onBoardCounts(next) ? "recount" : null;
  }
  return shiftOrdersBoardBadgeCounts(before, next) ? "shifted" : null;
}

function isFlaggedOpen(o: Order): boolean {
  return o.affiliateFlagStatus === "open";
}

/** Newest-first slot; -1 when the row belongs on an unloaded older page. */
function boardInsertIndex(entry: OrdersBoardCacheEntry, o: Order): number {
  const at = entry.orders.findIndex(
    (row) => (Date.parse(row.createdAt || "") || 0) < (Date.parse(o.createdAt || "") || 0)
  );
  if (at >= 0) return at;
  return entry.nextPageToken ? -1 : entry.orders.length;
}

function bumpFlaggedFormMaps(
  c: OrdersBoardCounts,
  o: Order,
  d: 1 | -1
): OrdersBoardCounts {
  const form = o.formType || undefined;
  const cheer =
    form === "school-all-star-cheer" && isConcreteSubtype(o.cheerFormSubtype)
      ? o.cheerFormSubtype!
      : undefined;
  const dance =
    form === "school-all-star-dance" && isConcreteSubtype(o.danceFormSubtype)
      ? o.danceFormSubtype!
      : undefined;
  return {
    ...c,
    by_form_type: bumpCountMap(c.by_form_type, form, d) || {},
    by_cheer_form_subtype:
      bumpCountMap(c.by_cheer_form_subtype, cheer, d) ||
      c.by_cheer_form_subtype ||
      {},
    by_dance_form_subtype:
      bumpCountMap(c.by_dance_form_subtype, dance, d) ||
      c.by_dance_form_subtype ||
      {},
  };
}

/** ±1 on one badge base (+ its form/cheer/dance maps). */
function bumpBadgeBase(
  c: OrdersBoardCounts,
  base: string,
  scope: { form?: string; cheer?: string; dance?: string },
  d: number
): OrdersBoardCounts {
  const next = { ...c } as unknown as Record<string, unknown>;
  const crossOn = typeof c.complete_assigned === "number";
  if (base !== "complete_data" && base.startsWith("complete_") && !crossOn) {
    return c;
  }
  next[base] = Math.max(0, Number(next[base] ?? 0) + d);
  for (const [suffix, scopeKey] of BADGE_SCOPE_SUFFIXES) {
    const key = scope[scopeKey];
    if (!key) continue;
    next[base + suffix] = bumpCountMap(
      next[base + suffix] as Record<string, number> | undefined,
      key,
      d
    );
  }
  return next as unknown as OrdersBoardCounts;
}

/** Row enters (d=+1) or leaves (d=-1) the normal (not-flagged) Orders board. */
function bumpNormalBoardPresence(
  c: OrdersBoardCounts,
  o: Order,
  d: 1 | -1
): OrdersBoardCounts {
  const form = o.formType || undefined;
  const cheer =
    form === "school-all-star-cheer" && isConcreteSubtype(o.cheerFormSubtype)
      ? o.cheerFormSubtype!
      : undefined;
  const dance =
    form === "school-all-star-dance" && isConcreteSubtype(o.danceFormSubtype)
      ? o.danceFormSubtype!
      : undefined;
  const scope = { form, cheer, dance };
  let next: OrdersBoardCounts = {
    ...c,
    all: Math.max(0, (c.all || 0) + d),
    by_form_type: bumpCountMap(c.by_form_type, form, d) || {},
    by_cheer_form_subtype:
      bumpCountMap(c.by_cheer_form_subtype, cheer, d) || {},
    by_dance_form_subtype:
      bumpCountMap(c.by_dance_form_subtype, dance, d) || {},
    form: Math.max(0, (c.form || 0) + (o.isManualEntry ? 0 : d)),
    manual: Math.max(0, (c.manual || 0) + (o.isManualEntry ? d : 0)),
  };
  if (!o.isManualEntry) {
    next.form_by_form_type = bumpCountMap(c.form_by_form_type, form, d);
  } else {
    next.manual_by_form_type = bumpCountMap(c.manual_by_form_type, form, d);
  }
  for (const base of badgeBuckets(orderBadgeState(o))) {
    next = bumpBadgeBase(next, base, scope, d);
  }
  return next;
}

/** Does this cached board page's query include `o` (form / subtype / range / source)? */
function boardQueryIncludesOrder(key: string, o: Order): boolean {
  try {
    const q = JSON.parse(key) as {
      formType?: string;
      cheerFormSubtype?: string;
      danceFormSubtype?: string;
      source?: string;
      search?: string;
      range?: string;
      excludeFlagged?: boolean;
    };
    // Never inject into a typed search page — wrong result set.
    if ((q.search || "").trim()) return false;
    if (q.source === "manual" && !o.isManualEntry) return false;
    if (q.source === "form" && o.isManualEntry) return false;
    if (
      isConcreteSubtype(q.formType) &&
      (o.formType || "") !== q.formType
    ) {
      return false;
    }
    if (
      isConcreteSubtype(q.cheerFormSubtype) &&
      (o.cheerFormSubtype || "") !== q.cheerFormSubtype
    ) {
      return false;
    }
    if (
      isConcreteSubtype(q.danceFormSubtype) &&
      (o.danceFormSubtype || "") !== q.danceFormSubtype
    ) {
      return false;
    }
    const range = (q.range || "").trim().toLowerCase();
    if (range === "flagged") return isFlaggedOpen(o);
    if (q.excludeFlagged !== false && isFlaggedOpen(o)) return false;
    if (!range || range === "all") return true;
    const parts = parseOrdersRangeFilters(range);
    if (!parts.length) return true;
    return parts.every((rf) => orderMatchesOrdersRangeFilter(o, rf));
  } catch {
    return false;
  }
}

/**
 * Affiliate flag opened or cleared: move the Flagged badge and board pages
 * locally (Resolve must not wait on /counts — SSE echo is skipped for our write).
 */
function syncOrdersBoardFlagTransition(before: Order, after: Order): boolean {
  const was = isFlaggedOpen(before);
  const now = isFlaggedOpen(after);
  if (was === now) return false;
  if (!onBoardCounts(before) && !onBoardCounts(after)) return false;

  const flagDelta: 1 | -1 = now ? 1 : -1;
  const boardDelta = (-flagDelta) as 1 | -1;
  // Flagged chips use the open-side form; normal board ± uses the side that joins/leaves.
  const flaggedRow = now ? after : before;
  const boardRow = now ? before : after;

  for (const [key, entry] of countsCache) {
    let flaggedOnly = false;
    try {
      flaggedOnly = Boolean(
        (JSON.parse(key) as { flaggedOnly?: boolean }).flaggedOnly
      );
    } catch {
      /* keep */
    }
    let counts: OrdersBoardCounts = {
      ...entry.counts,
      flagged: Math.max(0, (entry.counts.flagged || 0) + flagDelta),
    };
    if (flaggedOnly) {
      counts = bumpFlaggedFormMaps(counts, flaggedRow, flagDelta);
    } else if (onBoardCounts(boardRow)) {
      counts = bumpNormalBoardPresence(counts, boardRow, boardDelta);
      counts.flagged = Math.max(0, (entry.counts.flagged || 0) + flagDelta);
    }
    // Force remounts to re-read: empty board pages must not stay "fresh" at 0.
    const next = { counts, updatedAt: Date.now() };
    countsCache.set(key, next);
    try {
      writeCountsSession(ssKey(COUNTS_SS_PREFIX, key), next);
    } catch {
      /* ignore */
    }
  }

  for (const [key, entry] of boardCache) {
    let range = "";
    try {
      range = (
        (JSON.parse(key) as { range?: string }).range || ""
      ).trim().toLowerCase();
    } catch {
      continue;
    }

    let orders = entry.orders;
    const onPage = orders.some((o) => orderMatchesId(o, after.id));
    const belongsFlagged = range === "flagged" && boardQueryIncludesOrder(key, after);
    const belongsNormal =
      range !== "flagged" && boardQueryIncludesOrder(key, after);

    if (range === "flagged") {
      if (now && belongsFlagged && !onPage) {
        const at = boardInsertIndex(entry, after);
        if (at >= 0) {
          orders = [...orders];
          orders.splice(at, 0, after);
        } else {
          // Unloaded older page: drop this empty/wrong cache so the next open refetches.
          boardCache.delete(key);
          continue;
        }
      } else if (!now && onPage) {
        orders = orders.filter((o) => !orderMatchesId(o, after.id));
      }
    } else if (now && onPage) {
      // Entering Flagged: leave every normal board page that still has it.
      orders = orders.filter((o) => !orderMatchesId(o, after.id));
    } else if (!now && belongsNormal && !onPage && onBoardCounts(after)) {
      const at = boardInsertIndex(entry, after);
      if (at >= 0) {
        orders = [...orders];
        orders.splice(at, 0, after);
      } else if (entry.orders.length === 0) {
        // Badge will say >0; an empty "fresh" page would paint blank forever.
        boardCache.delete(key);
        continue;
      }
    } else if (
      !now &&
      belongsNormal &&
      entry.orders.length === 0 &&
      !entry.nextPageToken
    ) {
      // Was seeded empty at 0; counts just moved — refetch on next paint.
      boardCache.delete(key);
      continue;
    }

    const counts = entry.counts
      ? {
          ...entry.counts,
          flagged: Math.max(0, (entry.counts.flagged || 0) + flagDelta),
        }
      : entry.counts;
    if (orders === entry.orders && counts === entry.counts) continue;
    const next = { ...entry, orders, counts, updatedAt: Date.now() };
    boardCache.set(key, next);
    try {
      writeBoardSession(ssKey(BOARD_SS_PREFIX, key), next);
    } catch {
      /* ignore */
    }
  }

  return true;
}

/**
 * Paint a save on every cached board row before the PATCH returns.
 * Returns an undo for failed saves.
 */
export function patchOrdersBoardRowOptimistic(
  orderId: string,
  patch: Partial<Order>,
  opts?: { shiftAssignment?: boolean }
): () => void {
  if (!orderId || !patch || Object.keys(patch).length === 0) {
    return () => undefined;
  }
  const prev = readOrdersBoardOrder(orderId);
  syncOrdersBoardOrderPatch(orderId, patch, {
    inPlaceOnly: true,
    shiftAssignment: opts?.shiftAssignment,
  });
  if (!prev) return () => undefined;
  const revert: Record<string, unknown> = {};
  for (const key of Object.keys(patch)) {
    revert[key] = (prev as Record<string, unknown>)[key];
  }
  if (NEEDS_ATTENTION_KEYS.some((k) => k in patch)) {
    revert.needsAttention = prev.needsAttention;
  }
  return () =>
    syncOrdersBoardOrderPatch(orderId, revert as Partial<Order>, {
      inPlaceOnly: true,
      shiftAssignment: opts?.shiftAssignment,
    });
}

export function syncOrdersBoardOrderPatch(
  orderId: string,
  patch: Partial<Order>,
  opts?: {
    /** Only patch rows already on a page; never insert partial rows. */
    inPlaceOnly?: boolean;
    /** Producer change isn't bumped elsewhere (match) — move Assigned badges too. */
    shiftAssignment?: boolean;
  }
): void {
  if (!orderId || !patch || Object.keys(patch).length === 0) return;
  const before = readOrdersBoardOrder(orderId);
  // The PATCH recomputes needs_attention server-side and our own SSE echo is
  // skipped, so store that value on the row now.
  const rowPatch: Partial<Order> =
    before &&
    patch.needsAttention === undefined &&
    NEEDS_ATTENTION_KEYS.some((k) => k in patch)
      ? { ...patch, needsAttention: serverNeedsAttention({ ...before, ...patch }) }
      : patch;
  noteLocalOrderWrite(orderId, before?.uuid, before?.legacyId, rowPatch);

  // Move to MTD: drop the row from every Orders page (same ghost class as
  // Move-to-Orders leaving MTD). Keep a patched copy for match-pool sync.
  const leftForMtd = rowPatch.status === "in_mtd";

  for (const [key, entry] of boardCache) {
    const idx = entry.orders.findIndex((o) => orderMatchesId(o, orderId));
    if (idx < 0) continue;
    const row = entry.orders[idx];
    noteLocalOrderWrite(row.id, row.uuid, row.legacyId, rowPatch);
    const nextOrders = leftForMtd
      ? entry.orders.filter((o) => !orderMatchesId(o, orderId))
      : entry.orders.map((o) =>
          orderMatchesId(o, orderId) ? { ...o, ...rowPatch } : o
        );
    const next = {
      ...entry,
      orders: nextOrders,
      updatedAt: Date.now(),
    };
    boardCache.set(key, next);
    try {
      writeBoardSession(ssKey(BOARD_SS_PREFIX, key), next);
    } catch {
      /* ignore */
    }
  }

  const after = before ? ({ ...before, ...rowPatch } as Order) : null;
  // Collections / Songs / Notes edits flip Complete↔Missing — badges follow
  // (and follow back on undo) without a recount.
  let countsChanged = before && after
    ? shiftOrdersBoardBadgeCounts(before, after, {
        dataOnly: !opts?.shiftAssignment,
      })
    : false;
  // Move to MTD leaves the Orders counts scope — bump badges down locally.
  if (before && leftForMtd && before.status !== "in_mtd") {
    for (const [key, entry] of countsCache) {
      let flaggedOnly = false;
      try {
        flaggedOnly = Boolean(
          (JSON.parse(key) as { flaggedOnly?: boolean }).flaggedOnly
        );
      } catch {
        /* keep */
      }
      if (flaggedOnly) continue;
      const next = {
        counts: bumpNormalBoardPresence(entry.counts, before, -1),
        updatedAt: Date.now(),
      };
      countsCache.set(key, next);
      try {
        writeCountsSession(ssKey(COUNTS_SS_PREFIX, key), next);
      } catch {
        /* ignore */
      }
    }
    countsChanged = true;
  }
  // Resolve / open affiliate flag: Flagged badge + board pages move locally
  // (our SSE echo is skipped, so there is no /counts catch-up otherwise).
  if (before && after && syncOrdersBoardFlagTransition(before, after)) {
    countsChanged = true;
  }

  syncMatchPoolOrderPatch(orderId, rowPatch, before);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(ORDERS_BOARD_PATCH_EVENT, {
        detail: {
          orderId,
          patch: rowPatch,
          inPlaceOnly: Boolean(opts?.inPlaceOnly),
          countsChanged,
        },
      })
    );
  }
}

function bumpReassignCounts(
  c: OrdersBoardCounts,
  opts: {
    formType?: string | null;
    cheerFormSubtype?: string | null;
    danceFormSubtype?: string | null;
    /** +1 entering Reassign; -1 leaving */
    delta: 1 | -1;
    /** Complete-data row: also shift Complete ∩ Reassign. */
    complete?: boolean;
  }
): OrdersBoardCounts {
  const d = opts.delta;
  const form = opts.formType || undefined;
  const cheer =
    form === "school-all-star-cheer" &&
    opts.cheerFormSubtype &&
    opts.cheerFormSubtype !== "all" &&
    opts.cheerFormSubtype !== "All"
      ? opts.cheerFormSubtype
      : undefined;
  const dance =
    form === "school-all-star-dance" &&
    opts.danceFormSubtype &&
    opts.danceFormSubtype !== "all" &&
    opts.danceFormSubtype !== "All"
      ? opts.danceFormSubtype
      : undefined;

  const bumpMap = (
    map: Record<string, number> | undefined,
    key: string | undefined
  ) => bumpCountMap(map, key, d);
  const crossOn = Boolean(opts.complete) && typeof c.complete_reassigned === "number";

  return {
    ...c,
    ...(crossOn
      ? {
          complete_reassigned: Math.max(0, (c.complete_reassigned || 0) + d),
          complete_reassigned_by_form_type: bumpMap(
            c.complete_reassigned_by_form_type,
            form
          ),
          complete_reassigned_by_cheer_form_subtype: bumpMap(
            c.complete_reassigned_by_cheer_form_subtype,
            cheer
          ),
          complete_reassigned_by_dance_form_subtype: bumpMap(
            c.complete_reassigned_by_dance_form_subtype,
            dance
          ),
        }
      : {}),
    reassigned: Math.max(0, (c.reassigned || 0) + d),
    // Left MTD → back on the pre-MTD board.
    all: Math.max(0, (c.all || 0) + d),
    reassigned_by_form_type: bumpMap(c.reassigned_by_form_type, form),
    reassigned_by_cheer_form_subtype: bumpMap(
      c.reassigned_by_cheer_form_subtype,
      cheer
    ),
    reassigned_by_dance_form_subtype: bumpMap(
      c.reassigned_by_dance_form_subtype,
      dance
    ),
    by_form_type: bumpMap(c.by_form_type, form) ?? {},
    by_cheer_form_subtype: bumpMap(c.by_cheer_form_subtype, cheer),
    by_dance_form_subtype: bumpMap(c.by_dance_form_subtype, dance),
  };
}

/**
 * After Move-to-Orders / reassign: put the row on Reassign caches and bump
 * badges so sticky empty Reassign (trustEmptyZero) cannot hide a fresh return.
 */
export function syncOrdersBoardAfterReassign(
  order: Order,
  opts?: {
    formType?: string | null;
    cheerFormSubtype?: string | null;
    danceFormSubtype?: string | null;
  }
): void {
  const id = order.id;
  // Prefer any prior board stamp so Timestamp doesn't blank for a frame.
  const prior =
    readOrdersBoardOrder(id) ||
    (order.uuid ? readOrdersBoardOrder(order.uuid) : null) ||
    (order.legacyId ? readOrdersBoardOrder(order.legacyId) : null);
  const createdAt =
    String(order.createdAt || "").trim() ||
    String(prior?.createdAt || "").trim() ||
    "";
  const nextOrder: Order = {
    ...prior,
    ...order,
    id,
    isReassigned: true,
    status: "active",
    assignedProducer: null,
    ...(createdAt ? { createdAt } : {}),
  };
  const formType = opts?.formType ?? order.formType ?? null;
  const cheerFormSubtype =
    opts?.cheerFormSubtype ?? order.cheerFormSubtype ?? null;
  const danceFormSubtype =
    opts?.danceFormSubtype ?? order.danceFormSubtype ?? null;
  const complete = isCompleteDataOrder(nextOrder);

  const emptyCounts = (): OrdersBoardCounts => ({
    all: 0,
    complete_data: 0,
    missing_data: 0,
    assigned: 0,
    not_assigned: 0,
    reassigned: 0,
    flagged: 0,
    form: 0,
    manual: 0,
    by_form_type: {},
    by_cheer_form_subtype: {},
    by_dance_form_subtype: {},
  });

  let insertedIntoReassign = false;

  const writeEntry = (
    key: string,
    entry: {
      orders: Order[];
      nextPageToken: string | null;
      counts?: OrdersBoardCounts;
    },
    nextOrders: Order[],
    opts?: { bump?: boolean }
  ) => {
    const bump = opts?.bump !== false;
    const next: OrdersBoardCacheEntry = {
      orders: nextOrders,
      nextPageToken: entry.nextPageToken,
      counts: bump
        ? bumpReassignCounts(entry.counts ?? emptyCounts(), {
            formType,
            cheerFormSubtype,
            danceFormSubtype,
            delta: 1,
            complete,
          })
        : entry.counts ?? emptyCounts(),
      updatedAt: Date.now(),
      queryKey: key,
    };
    boardCache.set(key, next);
    try {
      writeBoardSession(ssKey(BOARD_SS_PREFIX, key), next);
    } catch {
      /* ignore */
    }
  };

  for (const [key, entry] of [...boardCache.entries()]) {
    let range = "all";
    try {
      const q = JSON.parse(key) as { range?: string };
      range = q.range || "all";
    } catch {
      continue;
    }
    const idx = entry.orders.findIndex((o) => orderMatchesId(o, id));
    let nextOrders = entry.orders;
    let bump = true;

    if (
      range === "reassigned" ||
      range === "reassign_leave" ||
      range === "reassign_rush"
    ) {
      // Only keep real reassign rows — never inherit All/Assigned keepPrevious.
      const scoped = entry.orders.filter((o) => Boolean(o.isReassigned));
      if (idx >= 0) {
        const wasReassigned = Boolean(entry.orders[idx]?.isReassigned);
        nextOrders = scoped.map((o) =>
          orderMatchesId(o, id)
            ? {
                ...o,
                ...nextOrder,
                createdAt: nextOrder.createdAt || o.createdAt,
              }
            : o
        );
        bump = !wasReassigned;
        if (!wasReassigned) insertedIntoReassign = true;
      } else {
        nextOrders = [
          nextOrder,
          ...scoped.filter((o) => !orderMatchesId(o, id)),
        ];
        insertedIntoReassign = true;
      }
    } else if (range === "assigned" || range === "not_assigned") {
      if (idx < 0) continue;
      nextOrders = entry.orders.filter((o) => !orderMatchesId(o, id));
      bump = false;
    } else if (idx >= 0) {
      const wasReassigned = Boolean(entry.orders[idx]?.isReassigned);
      nextOrders = entry.orders.map((o) =>
        orderMatchesId(o, id)
          ? {
              ...o,
              ...nextOrder,
              createdAt: nextOrder.createdAt || o.createdAt,
            }
          : o
      );
      bump = !wasReassigned;
      if (!wasReassigned) insertedIntoReassign = true;
    } else if (range === "all") {
      // Was hidden while status=in_mtd — surface it again on All.
      nextOrders = [nextOrder, ...entry.orders];
      insertedIntoReassign = true;
    } else {
      continue;
    }

    writeEntry(key, entry, nextOrders, { bump });
  }

  // Always seed the form's Reassign (+ All) keys so Move-to-Orders →
  // ?range=reassigned paints without waiting on /orders/board.
  const preferredKeys = [
    ordersBoardQueryKey({
      formType: formType || undefined,
      cheerFormSubtype: cheerFormSubtype || undefined,
      danceFormSubtype: danceFormSubtype || undefined,
      range: "reassigned",
      excludeFlagged: true,
    }),
    ordersBoardQueryKey({
      formType: formType || undefined,
      cheerFormSubtype: cheerFormSubtype || undefined,
      danceFormSubtype: danceFormSubtype || undefined,
      range: "all",
      excludeFlagged: true,
    }),
  ];
  for (const key of preferredKeys) {
    const prev = boardCache.get(key);
    if (prev?.orders.some((o) => orderMatchesId(o, id))) continue;
    const scoped =
      (JSON.parse(key) as { range?: string }).range === "reassigned"
        ? (prev?.orders || []).filter((o) => Boolean(o.isReassigned))
        : prev?.orders || [];
    insertedIntoReassign = true;
    writeEntry(
      key,
      {
        orders: scoped,
        nextPageToken: prev?.nextPageToken ?? null,
        counts: prev?.counts,
      },
      [nextOrder, ...scoped.filter((o) => !orderMatchesId(o, id))],
      { bump: true }
    );
  }

  if (insertedIntoReassign) {
    for (const [key, entry] of countsCache) {
      const next = {
        counts: bumpReassignCounts(entry.counts, {
          formType,
          cheerFormSubtype,
          danceFormSubtype,
          delta: 1,
          complete,
        }),
        updatedAt: Date.now(),
      };
      countsCache.set(key, next);
      try {
        writeCountsSession(ssKey(COUNTS_SS_PREFIX, key), next);
      } catch {
        /* ignore */
      }
    }
  }

  noteLocalOrderWrite(id, order.uuid, order.legacyId);
  syncMatchPoolOrder(nextOrder);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(ORDERS_BOARD_PATCH_EVENT, {
        detail: { orderId: id, patch: nextOrder, countsChanged: true },
      })
    );
  }
}

/**
 * After a successful assign/unassign: move the row across cached range pages
 * and bump badges immediately so Back → Orders doesn't show stale Not assigned.
 */
export function syncOrdersBoardAfterAssignment(
  order: Order,
  opts: {
    formType?: string | null;
    cheerFormSubtype?: string | null;
    danceFormSubtype?: string | null;
    /** true = newly assigned; false = unassigned */
    assigned: boolean;
  }
): void {
  const id = order.id;
  const delta: 1 | -1 = opts.assigned ? 1 : -1;
  const complete = isCompleteDataOrder(order);

  for (const [key, entry] of [...boardCache.entries()]) {
    let range = "all";
    try {
      const q = JSON.parse(key) as { range?: string };
      range = q.range || "all";
    } catch {
      continue;
    }
    const idx = entry.orders.findIndex((o) => orderMatchesId(o, id));
    let nextOrders = entry.orders;

    if (opts.assigned) {
      if (
        range === "not_assigned" ||
        range === "reassigned" ||
        range === "reassign_leave" ||
        range === "reassign_rush"
      ) {
        if (idx < 0) continue;
        nextOrders = entry.orders.filter((o) => !orderMatchesId(o, id));
      } else if (idx >= 0) {
        nextOrders = entry.orders.map((o) =>
          orderMatchesId(o, id) ? { ...o, ...order } : o
        );
      } else if (range === "assigned") {
        nextOrders = [order, ...entry.orders];
      } else {
        continue;
      }
    } else {
      if (range === "assigned") {
        if (idx < 0) continue;
        nextOrders = entry.orders.filter((o) => !orderMatchesId(o, id));
      } else if (idx >= 0) {
        nextOrders = entry.orders.map((o) =>
          orderMatchesId(o, id) ? { ...o, ...order } : o
        );
      } else if (range === "not_assigned") {
        nextOrders = [order, ...entry.orders];
      } else {
        continue;
      }
    }

    const next = {
      ...entry,
      orders: nextOrders,
      counts: bumpAssignmentCounts(entry.counts, { ...opts, delta, complete }),
      updatedAt: Date.now(),
    };
    boardCache.set(key, next);
    try {
      writeBoardSession(ssKey(BOARD_SS_PREFIX, key), next);
    } catch {
      /* ignore */
    }
  }

  for (const [key, entry] of countsCache) {
    const next = {
      counts: bumpAssignmentCounts(entry.counts, { ...opts, delta, complete }),
      updatedAt: Date.now(),
    };
    countsCache.set(key, next);
    try {
      writeCountsSession(ssKey(COUNTS_SS_PREFIX, key), next);
    } catch {
      /* ignore */
    }
  }

  noteLocalOrderWrite(id, order.uuid, order.legacyId);
  syncMatchPoolOrder(order);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(ORDERS_BOARD_PATCH_EVENT, {
        detail: { orderId: id, patch: order, countsChanged: true },
      })
    );
  }
}

/**
 * Mark range-tab counts stale after assignment / status moves.
 * Keeps last paint but forces the next reload to re-fetch counts (and clears
 * empty sibling boards so Assigned can refill after a false 0).
 */
export function invalidateOrdersBoardCountsCache(): void {
  const staleAt = Date.now() - ORDERS_BOARD_STALE_MS - 1;
  for (const [key, entry] of countsCache) {
    const next = { counts: entry.counts, updatedAt: staleAt };
    countsCache.set(key, next);
    try {
      writeCountsSession(ssKey(COUNTS_SS_PREFIX, key), next);
    } catch {
      /* ignore */
    }
  }
  for (const [key, entry] of chipCountsCache) {
    chipCountsCache.set(key, { chips: entry.chips, updatedAt: staleAt });
  }
  for (const [key, entry] of boardCache) {
    if (entry.orders.length === 0) {
      boardCache.delete(key);
      continue;
    }
    boardCache.set(key, { ...entry, updatedAt: staleAt });
  }
}

export function ordersBoardQueryKey(
  query: {
    formType?: string;
    cheerFormSubtype?: string;
    danceFormSubtype?: string;
    category?: string;
    source?: string;
    search?: string;
    range?: string;
    sortBy?: string;
    excludeFlagged?: boolean;
    createdAfter?: string;
    createdBefore?: string;
  }
): string {
  return JSON.stringify({
    formType: query.formType ?? "",
    cheerFormSubtype: query.cheerFormSubtype ?? "",
    danceFormSubtype: query.danceFormSubtype ?? "",
    category: query.category ?? "",
    source: query.source ?? "",
    search: query.search ?? "",
    range: query.range ?? "all",
    sortBy: query.sortBy ?? "newest",
    excludeFlagged: query.excludeFlagged !== false,
    createdAfter: query.createdAfter ?? "",
    createdBefore: query.createdBefore ?? "",
  });
}

/** Match-pool cache keyed by form/subtype (same stale/GC window as board). */
const MATCH_POOL_STALE_MS = ORDERS_BOARD_STALE_MS;
const MATCH_POOL_GC_MS = ORDERS_BOARD_GC_MS;
const MATCH_POOL_SS_PREFIX = "slt_match_pool_v1:";
const MATCH_COUNTS_SS_KEY = "slt_match_counts_v1";
/** Few form/subtype tabs — keep last visits for instant first paint. */
const MATCH_POOL_SS_MAX = 4;
type MatchPoolCacheEntry = {
  orders: Order[];
  nextPageToken: string | null;
  updatedAt: number;
  /** Full query key — rejects sessionStorage hash collisions on read. */
  queryKey?: string;
  /** Live updates may have been missed (stream dropped): revalidate on next read. */
  stale?: boolean;
};
const matchPoolCache = new Map<string, MatchPoolCacheEntry>();
/** Keys a mounted Match list paints from: live updates keep them current, so no GC. */
const matchPoolKeysInUse = new Map<string, number>();

function touchMatchPoolSessionIndex(storageKey: string, orderCount: number): void {
  const indexKey = `${MATCH_POOL_SS_PREFIX}index`;
  const raw = readSessionJson<SsIndexEntry[]>(indexKey) || [];
  const next: SsIndexEntry[] = [
    { key: storageKey, n: orderCount, at: Date.now() },
    ...raw.filter((e) => e.key !== storageKey),
  ];
  while (next.length > MATCH_POOL_SS_MAX) {
    const dropped = next.pop();
    if (dropped) sessionStorage.removeItem(dropped.key);
  }
  sessionStorage.setItem(indexKey, JSON.stringify(next));
}

function writeMatchPoolSession(storageKey: string, entry: MatchPoolCacheEntry): void {
  if (typeof window === "undefined") return;
  if (!entry.orders.length) return;
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(entry));
    touchMatchPoolSessionIndex(storageKey, entry.orders.length);
  } catch {
    /* quota — memory cache still works */
  }
}

export function retainMatchPoolKey(key: string): () => void {
  matchPoolKeysInUse.set(key, (matchPoolKeysInUse.get(key) ?? 0) + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const left = (matchPoolKeysInUse.get(key) ?? 1) - 1;
    if (left > 0) matchPoolKeysInUse.set(key, left);
    else matchPoolKeysInUse.delete(key);
  };
}

function gcMatchPool(now = Date.now()) {
  for (const [key, entry] of matchPoolCache) {
    if (matchPoolKeysInUse.has(key)) continue;
    if (now - entry.updatedAt > MATCH_POOL_GC_MS) matchPoolCache.delete(key);
  }
}

type MatchCountsCacheEntry = {
  counts: OrdersMatchCounts;
  updatedAt: number;
  stale?: boolean;
};
let matchCountsCache: MatchCountsCacheEntry | null = null;
/** Bumped by every local badge move, so a slower /match-counts can't undo one. */
let matchCountsVersion = 0;

export function readMatchCountsVersion(): number {
  return matchCountsVersion;
}

/** Keep painting these badges, but refetch them before trusting them again. */
export function markMatchCountsStale() {
  if (matchCountsCache) matchCountsCache = { ...matchCountsCache, stale: true };
}

export function readMatchCountsCache(): {
  counts: OrdersMatchCounts;
  fresh: boolean;
} | null {
  if (!matchCountsCache) {
    const persisted = readSessionJson<MatchCountsCacheEntry>(MATCH_COUNTS_SS_KEY);
    if (
      persisted?.counts &&
      Date.now() - (persisted.updatedAt || 0) <= ORDERS_BOARD_GC_MS
    ) {
      matchCountsCache = {
        counts: persisted.counts,
        updatedAt: persisted.updatedAt,
        stale: true, // session is a first-paint hint — soft-refresh on open
      };
    }
  }
  if (!matchCountsCache) return null;
  if (Date.now() - matchCountsCache.updatedAt > ORDERS_BOARD_GC_MS) {
    matchCountsCache = null;
    return null;
  }
  return {
    counts: matchCountsCache.counts,
    fresh:
      !matchCountsCache.stale &&
      Date.now() - matchCountsCache.updatedAt < MATCH_COUNTS_STALE_MS,
  };
}

export function writeMatchCountsCache(counts: OrdersMatchCounts) {
  matchCountsCache = { counts, updatedAt: Date.now() };
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      MATCH_COUNTS_SS_KEY,
      JSON.stringify(matchCountsCache)
    );
  } catch {
    /* quota */
  }
}

export function invalidateMatchCountsCache() {
  matchCountsCache = null;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(MATCH_COUNTS_SS_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function matchPoolQueryKey(query: {
  formType?: string;
  cheerFormSubtype?: string;
  danceFormSubtype?: string;
}): string {
  return JSON.stringify({
    formType: query.formType ?? "",
    cheerFormSubtype: query.cheerFormSubtype ?? "",
    danceFormSubtype: query.danceFormSubtype ?? "",
  });
}

export function readMatchPoolCache(
  key = matchPoolQueryKey({})
): { entry: MatchPoolCacheEntry; fresh: boolean } | null {
  gcMatchPool();
  let entry = matchPoolCache.get(key);
  if (!entry) {
    const persisted = readSessionJson<MatchPoolCacheEntry>(
      ssKey(MATCH_POOL_SS_PREFIX, key)
    );
    if (
      persisted?.orders &&
      Array.isArray(persisted.orders) &&
      Date.now() - (persisted.updatedAt || 0) <= MATCH_POOL_GC_MS &&
      persisted.queryKey === key
    ) {
      // Session is last-visit paint: mark stale so open soft-refreshes.
      entry = { ...persisted, stale: true };
      matchPoolCache.set(key, entry);
    }
  }
  if (!entry) return null;
  return {
    entry,
    fresh: !entry.stale && Date.now() - entry.updatedAt < MATCH_POOL_STALE_MS,
  };
}

export function writeMatchPoolCache(
  orders: Order[],
  nextPageToken: string | null = null,
  key = matchPoolQueryKey({}),
  opts?: { persist?: boolean }
) {
  const entry: MatchPoolCacheEntry = {
    orders,
    nextPageToken,
    updatedAt: Date.now(),
    queryKey: key,
  };
  matchPoolCache.set(key, entry);
  // Prefetch may skip persist; live Match page writes persist for revisit paint.
  if (opts?.persist !== false) {
    writeMatchPoolSession(ssKey(MATCH_POOL_SS_PREFIX, key), entry);
  }
}

/** Match pool rows left (`removeIds`) or came back (undo): re-sync live lists. */
export const MATCH_POOL_SYNC_EVENT = "slt-match-pool-sync";

/**
 * Just-matched ids. Another API instance can serve a pool page cached before
 * the match (45s TTL), so fetched pages drop these until that has expired.
 */
const recentlyMatchedAt = new Map<string, number>();
const RECENT_MATCH_MS = 60_000;

function orderIdsOf(o: Pick<Order, "id" | "uuid" | "legacyId">): string[] {
  return [o.id, o.uuid, o.legacyId].filter((id): id is string => Boolean(id));
}

export function dropRecentlyMatched(orders: Order[]): Order[] {
  const now = Date.now();
  for (const [id, at] of recentlyMatchedAt) {
    if (now - at > RECENT_MATCH_MS) recentlyMatchedAt.delete(id);
  }
  if (recentlyMatchedAt.size === 0) return orders;
  const kept = orders.filter(
    (o) => !orderIdsOf(o).some((id) => recentlyMatchedAt.has(id))
  );
  return kept.length === orders.length ? orders : kept;
}

function shiftMatchCount(
  map: Record<string, number> | undefined,
  key: string | null | undefined,
  d: number
): Record<string, number> {
  if (!map || !key || !(key in map)) return map || {};
  return { ...map, [key]: Math.max(0, map[key] + d) };
}

/** Backend `_match_pool_base_query`: the rows `/orders/match-pool` can return. */
export function inMatchPoolScope(o: Order): boolean {
  return (
    !o.isPastOrder &&
    o.status !== "completed" &&
    o.status !== "in_mtd" &&
    !o.mergedIntoManualOrderId &&
    !o.mergedFormOrderId
  );
}

/**
 * Backend `_unmatched_magento_expr` / `_unmatched_manual_expr`: the badges a
 * row counts under ("kind|form|cheer|dance"), or null when none do.
 */
function matchBadgeBucket(o: Order): string | null {
  if (o.suppressManualFormMerge) return null;
  if (o.isManualEntry ? o.status === "completed" : o.affiliateFlagStatus === "open") {
    return null;
  }
  const form = o.formType || "";
  return [
    o.isManualEntry ? "manual" : "magento",
    form,
    form === "school-all-star-cheer" ? o.cheerFormSubtype || "" : "",
    form === "school-all-star-dance" ? o.danceFormSubtype || "" : "",
  ].join("|");
}

function matchCountBucket(o: Order | null | undefined): string | null {
  return o && inMatchPoolScope(o) ? matchBadgeBucket(o) : null;
}

function shiftMatchBucket(
  c: OrdersMatchCounts,
  bucket: string,
  d: 1 | -1
): OrdersMatchCounts {
  const [kind, form, cheer, dance] = bucket.split("|");
  if (kind === "manual") {
    return {
      ...c,
      manual: Math.max(0, c.manual + d),
      manual_by_form_type: shiftMatchCount(c.manual_by_form_type, form, d),
      manual_by_cheer_form_subtype: shiftMatchCount(
        c.manual_by_cheer_form_subtype,
        cheer,
        d
      ),
      manual_by_dance_form_subtype: shiftMatchCount(
        c.manual_by_dance_form_subtype,
        dance,
        d
      ),
    };
  }
  return {
    ...c,
    magento: Math.max(0, c.magento + d),
    by_form_type: shiftMatchCount(c.by_form_type, form, d),
    by_cheer_form_subtype: shiftMatchCount(c.by_cheer_form_subtype, cheer, d),
    by_dance_form_subtype: shiftMatchCount(c.by_dance_form_subtype, dance, d),
  };
}

/** Match badges ± one row. */
function shiftMatchCounts(
  c: OrdersMatchCounts,
  o: Order,
  d: 1 | -1
): OrdersMatchCounts {
  const bucket = matchBadgeBucket(o);
  return bucket ? shiftMatchBucket(c, bucket, d) : c;
}

/** Backend match-pool form / subtype filter for one cache key. */
function matchPoolKeyIncludes(key: string, o: Order): boolean {
  try {
    const q = JSON.parse(key) as {
      formType?: string;
      cheerFormSubtype?: string;
      danceFormSubtype?: string;
    };
    if (isConcreteSubtype(q.cheerFormSubtype)) {
      return (
        o.formType === "school-all-star-cheer" &&
        o.cheerFormSubtype === q.cheerFormSubtype
      );
    }
    if (isConcreteSubtype(q.danceFormSubtype)) {
      return (
        o.formType === "school-all-star-dance" &&
        o.danceFormSubtype === q.danceFormSubtype
      );
    }
    return !isConcreteSubtype(q.formType) || o.formType === q.formType;
  } catch {
    return false;
  }
}

const createdMs = (o: Order) => Date.parse(o.createdAt || "") || 0;

/** Newest-first slot inside the loaded pages; -1 = belongs to an unloaded page. */
function poolInsertIndex(entry: MatchPoolCacheEntry, o: Order): number {
  const at = entry.orders.findIndex((row) => createdMs(row) < createdMs(o));
  if (at >= 0) return at;
  return entry.nextPageToken ? -1 : entry.orders.length;
}

/**
 * Match lists / badges changed in the cache. `stale` = live updates may have
 * been missed, so mounted lists revalidate in the background.
 */
export function notifyMatchPoolSync(
  removeIds?: string[],
  opts?: { stale?: boolean }
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(MATCH_POOL_SYNC_EVENT, {
      detail: { removeIds, stale: Boolean(opts?.stale) },
    })
  );
}

function restoreFormSourceTotals(
  next: OrdersBoardCounts,
  prev: OrdersBoardCounts
): OrdersBoardCounts {
  return {
    ...next,
    form: prev.form,
    form_by_form_type: prev.form_by_form_type,
    form_by_cheer_form_subtype: prev.form_by_cheer_form_subtype,
    form_by_dance_form_subtype: prev.form_by_dance_form_subtype,
  };
}

/** Manual menu −1. Form menu stays (absorbed form leaves, matched manual enters). */
function decrementManualSourceTotals(
  counts: OrdersBoardCounts,
  manual: Order
): OrdersBoardCounts {
  const form = manual.formType || undefined;
  const cheer =
    form === "school-all-star-cheer" && isConcreteSubtype(manual.cheerFormSubtype)
      ? manual.cheerFormSubtype
      : undefined;
  const dance =
    form === "school-all-star-dance" && isConcreteSubtype(manual.danceFormSubtype)
      ? manual.danceFormSubtype
      : undefined;
  return {
    ...counts,
    ...(typeof counts.manual === "number"
      ? { manual: Math.max(0, counts.manual - 1) }
      : {}),
    ...(counts.manual_by_form_type
      ? {
          manual_by_form_type: bumpCountMap(counts.manual_by_form_type, form, -1),
        }
      : {}),
    ...(counts.manual_by_cheer_form_subtype
      ? {
          manual_by_cheer_form_subtype: bumpCountMap(
            counts.manual_by_cheer_form_subtype,
            cheer,
            -1
          ),
        }
      : {}),
    ...(counts.manual_by_dance_form_subtype
      ? {
          manual_by_dance_form_subtype: bumpCountMap(
            counts.manual_by_dance_form_subtype,
            dance,
            -1
          ),
        }
      : {}),
  };
}

/**
 * Confirm match: Manual count −1, Form count unchanged, absorbed form leaves
 * All/Complete/Missing, matched manual leaves the Manual filter.
 * No /orders/counts refetch.
 */
function shiftOrdersBoardCountsAfterMatch(
  manualBefore: Order,
  formBefore: Order,
  manualAfter: Order
): () => void {
  if (manualBefore.mergedFormOrderId) return () => undefined;
  const snapshots = new Map<string, { counts: OrdersBoardCounts; updatedAt: number }>();
  const asForm = { ...manualAfter, isManualEntry: false } as Order;

  for (const [key, entry] of countsCache) {
    let source = "";
    let search = "";
    let flaggedOnly = false;
    let excludeFlagged = true;
    try {
      const q = JSON.parse(key) as {
        source?: string;
        search?: string;
        flaggedOnly?: boolean;
        excludeFlagged?: boolean;
      };
      source = q.source || "";
      search = (q.search || "").trim();
      flaggedOnly = Boolean(q.flaggedOnly);
      excludeFlagged = q.excludeFlagged !== false;
    } catch {
      continue;
    }
    if (flaggedOnly) continue;
    if (
      excludeFlagged &&
      (manualBefore.affiliateFlagStatus === "open" ||
        formBefore.affiliateFlagStatus === "open")
    ) {
      continue;
    }
    if (
      search &&
      (!searchResultsInclude(search, manualBefore.id) ||
        !searchResultsInclude(search, formBefore.id))
    ) {
      continue;
    }

    snapshots.set(key, entry);
    let next = entry.counts;
    if (source === "manual") {
      // Row leaves this filter (All / Complete / Missing / Assigned).
      next = bumpNormalBoardPresence(next, manualAfter, -1);
    } else if (source === "form") {
      // Absorbed form out, matched manual in as a Form order. Net form total 0.
      next = bumpNormalBoardPresence(next, formBefore, -1);
      next = bumpNormalBoardPresence(next, asForm, 1);
      next = decrementManualSourceTotals(next, manualBefore);
    } else {
      // Both: hide the absorbed form (All −1) without changing the Form total.
      const beforeHide = next;
      next = bumpNormalBoardPresence(next, formBefore, -1);
      next = restoreFormSourceTotals(next, beforeHide);
      next = decrementManualSourceTotals(next, manualBefore);
    }
    const shifted = { counts: next, updatedAt: entry.updatedAt };
    countsCache.set(key, shifted);
    try {
      writeCountsSession(ssKey(COUNTS_SS_PREFIX, key), shifted);
    } catch {
      /* ignore */
    }
  }

  notifyOrdersBoardCountsChanged();

  return () => {
    for (const [key, entry] of snapshots) {
      countsCache.set(key, entry);
      try {
        writeCountsSession(ssKey(COUNTS_SS_PREFIX, key), entry);
      } catch {
        /* ignore */
      }
    }
    notifyOrdersBoardCountsChanged();
  };
}

/** Badge shifts dispatch before the source totals move. Re-read after both. */
function notifyOrdersBoardCountsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ORDERS_BOARD_PATCH_EVENT, {
      detail: { countsChanged: true },
    })
  );
}

/**
 * Confirm match: the pair leaves every cached Match pool page and badge, and
 * both Orders board rows take their merged values, before the PATCHes return
 * (no pool / counts refetch). Returns an undo for a failed save.
 */
export function syncOrdersAfterMatch(args: {
  manual: Order;
  form: Order;
  manualPatch: Partial<Order>;
  formPatch: Partial<Order>;
}): () => void {
  const { manual, form } = args;
  const ids = new Set([...orderIdsOf(manual), ...orderIdsOf(form)]);
  const isPair = (o: Order) => orderIdsOf(o).some((id) => ids.has(id));
  const now = Date.now();
  for (const id of ids) recentlyMatchedAt.set(id, now);
  claimMatchPoolRows([manual, form], () => null);

  const removed = new Map<string, Array<{ index: number; order: Order }>>();
  for (const [key, entry] of matchPoolCache) {
    const gone: Array<{ index: number; order: Order }> = [];
    const kept = entry.orders.filter((order, index) => {
      if (!isPair(order)) return true;
      gone.push({ index, order });
      return false;
    });
    if (gone.length === 0) continue;
    removed.set(key, gone);
    matchPoolCache.set(key, { ...entry, orders: kept });
  }

  const countsBefore = matchCountsCache;
  const countsAfter = countsBefore
    ? {
        counts: shiftMatchCounts(
          shiftMatchCounts(countsBefore.counts, manual, -1),
          form,
          -1
        ),
        updatedAt: countsBefore.updatedAt,
      }
    : null;
  if (countsAfter) {
    matchCountsCache = countsAfter;
    matchCountsVersion += 1;
  }

  // Match can carry the form's producer onto the manual — nothing else bumps it.
  const undoManual = patchOrdersBoardRowOptimistic(manual.id, args.manualPatch, {
    shiftAssignment: true,
  });
  const undoForm = patchOrdersBoardRowOptimistic(form.id, args.formPatch);
  const manualAfter = { ...manual, ...args.manualPatch } as Order;
  const undoSourceCounts = shiftOrdersBoardCountsAfterMatch(
    manual,
    form,
    manualAfter
  );
  notifyMatchPoolSync([...ids]);

  return () => {
    undoSourceCounts();
    undoForm();
    undoManual();
    for (const id of ids) recentlyMatchedAt.delete(id);
    claimMatchPoolRows([manual, form], matchCountBucket);
    for (const [key, gone] of removed) {
      const entry = matchPoolCache.get(key);
      if (!entry) continue;
      const orders = [...entry.orders];
      for (const { index, order } of gone) {
        if (orders.some((o) => orderMatchesId(o, order.id))) continue;
        orders.splice(Math.min(index, orders.length), 0, order);
      }
      matchPoolCache.set(key, { ...entry, orders });
    }
    if (countsBefore && matchCountsCache === countsAfter) {
      matchCountsCache = countsBefore;
      matchCountsVersion += 1;
    }
    notifyMatchPoolSync();
  };
}

/**
 * Split: both rows are unmatched again — put them back in every cached Match
 * pool page they belong to and raise the badges (no pool / counts refetch).
 * Runs before the PATCHes; the returned undo puts the pair back if they fail.
 */
export function syncOrdersAfterSplit(args: {
  manual: Order;
  form: Order;
}): () => void {
  const rows = [args.manual, args.form];
  const ids = rows.flatMap(orderIdsOf);
  for (const id of ids) recentlyMatchedAt.delete(id);
  claimMatchPoolRows(rows, matchCountBucket);

  const inserted = new Map<string, Order[]>();
  for (const [key, entry] of matchPoolCache) {
    let next = entry;
    const added: Order[] = [];
    for (const row of rows) {
      if (!matchPoolKeyIncludes(key, row)) continue;
      const orders = next.orders.filter((o) => !orderMatchesId(o, row.id));
      const at = poolInsertIndex({ ...next, orders }, row);
      if (at < 0) continue;
      orders.splice(at, 0, row);
      next = { ...next, orders };
      added.push(row);
    }
    if (added.length === 0) continue;
    inserted.set(key, added);
    matchPoolCache.set(key, next);
  }

  const countsBefore = matchCountsCache;
  const countsAfter = countsBefore
    ? {
        counts: shiftMatchCounts(
          shiftMatchCounts(countsBefore.counts, args.manual, 1),
          args.form,
          1
        ),
        updatedAt: countsBefore.updatedAt,
      }
    : null;
  if (countsAfter) {
    matchCountsCache = countsAfter;
    matchCountsVersion += 1;
  }
  notifyMatchPoolSync();

  return () => {
    const now = Date.now();
    for (const id of ids) recentlyMatchedAt.set(id, now);
    claimMatchPoolRows(rows, () => null);
    for (const [key, added] of inserted) {
      const entry = matchPoolCache.get(key);
      if (!entry) continue;
      const orders = entry.orders.filter(
        (o) => !added.some((row) => orderMatchesId(o, row.id))
      );
      matchPoolCache.set(key, { ...entry, orders });
    }
    if (countsBefore && matchCountsCache === countsAfter) {
      matchCountsCache = countsBefore;
      matchCountsVersion += 1;
    }
    notifyMatchPoolSync();
  };
}

/**
 * Badge bucket ("" = counts nowhere) each order had when this tab last saw it.
 * Only valid while live updates flow — cleared when the stream drops.
 */
const matchBucketSeen = new Map<string, string>();
const MATCH_BUCKET_SEEN_MAX = 5_000;

function noteMatchBucket(id: string, bucket: string | null) {
  matchBucketSeen.delete(id);
  if (matchBucketSeen.size >= MATCH_BUCKET_SEEN_MAX) {
    const oldest = matchBucketSeen.keys().next().value;
    if (oldest !== undefined) matchBucketSeen.delete(oldest);
  }
  matchBucketSeen.set(id, bucket ?? "");
}

/** Confirm match / Split own these rows' lists + badges while their PATCHes run. */
const matchPoolClaimedAt = new Map<string, number>();
const MATCH_POOL_CLAIM_MS = 10_000;

function claimMatchPoolRows(
  rows: Order[],
  bucketOf: (o: Order) => string | null
) {
  const now = Date.now();
  for (const row of rows) {
    noteMatchBucket(row.id, bucketOf(row));
    for (const id of orderIdsOf(row)) matchPoolClaimedAt.set(id, now);
  }
}

function isMatchPoolClaimed(orderId: string): boolean {
  const at = matchPoolClaimedAt.get(orderId);
  if (at === undefined) return false;
  if (Date.now() - at < MATCH_POOL_CLAIM_MS) return true;
  matchPoolClaimedAt.delete(orderId);
  return false;
}

function readMatchPoolRow(orderId: string): Order | null {
  for (const entry of matchPoolCache.values()) {
    const hit = entry.orders.find((o) => orderMatchesId(o, orderId));
    if (hit) return hit;
  }
  return null;
}

/** Move the Match badges from one bucket to another (null = counted nowhere). */
function moveMatchBuckets(from: string | null, to: string | null): boolean {
  if (from === to || !matchCountsCache) return false;
  let counts = matchCountsCache.counts;
  if (from) counts = shiftMatchBucket(counts, from, -1);
  if (to) counts = shiftMatchBucket(counts, to, 1);
  matchCountsCache = { ...matchCountsCache, counts };
  matchCountsVersion += 1;
  return true;
}

/**
 * Put the latest copy of one order in every cached Match pool page: replace it
 * where it is, drop it where it no longer belongs, insert it (newest first)
 * where it now does. `covered` = some loaded page would hold it if it had been
 * in the pool, so not finding it there means it wasn't.
 */
function placeMatchPoolRow(next: Order): { changed: boolean; covered: boolean } {
  const inScope = inMatchPoolScope(next);
  let changed = false;
  let covered = false;
  for (const [key, entry] of matchPoolCache) {
    const idx = entry.orders.findIndex((o) => orderMatchesId(o, next.id));
    const includes = matchPoolKeyIncludes(key, next);
    let orders: Order[];
    if (idx >= 0) {
      orders =
        inScope && includes
          ? entry.orders.map((o, i) => (i === idx ? next : o))
          : entry.orders.filter((_, i) => i !== idx);
    } else {
      if (!includes) continue;
      const at = poolInsertIndex(entry, next);
      if (at < 0) continue;
      covered = true;
      if (!inScope) continue;
      orders = [...entry.orders];
      orders.splice(at, 0, next);
    }
    matchPoolCache.set(key, { ...entry, orders });
    changed = true;
  }
  return { changed, covered };
}

function patchMatchPoolRowsInPlace(orderId: string, patch: Partial<Order>): boolean {
  let changed = false;
  for (const [key, entry] of matchPoolCache) {
    if (!entry.orders.some((o) => orderMatchesId(o, orderId))) continue;
    matchPoolCache.set(key, {
      ...entry,
      orders: entry.orders.map((o) =>
        orderMatchesId(o, orderId) ? { ...o, ...patch } : o
      ),
    });
    changed = true;
  }
  return changed;
}

/**
 * This tab saved an order (or undid a save): the row follows the edit in every
 * cached Match list — entering / leaving lists and moving badges when the edit
 * changes whether or where it counts. No refetch.
 */
export function syncMatchPoolOrderPatch(
  orderId: string,
  patch: Partial<Order>,
  boardBefore: Order | null = null
): void {
  if (!orderId || Object.keys(patch).length === 0) return;
  if (isMatchPoolClaimed(orderId)) {
    if (patchMatchPoolRowsInPlace(orderId, patch)) notifyMatchPoolSync();
    return;
  }
  const poolBefore = readMatchPoolRow(orderId);
  const before = poolBefore ?? boardBefore;
  if (!before) return;
  const next = { ...before, ...patch, id: before.id } as Order;
  const { changed } = placeMatchPoolRow(next);
  const to = matchCountBucket(next);
  const moved = moveMatchBuckets(matchCountBucket(before), to);
  noteMatchBucket(next.id, to);
  if (changed || moved) notifyMatchPoolSync();
}

/**
 * A brand-new row: Postgres stamps created_at and updated_at in one
 * transaction. The age bound only has to tolerate client/server clock skew.
 */
const NEW_ORDER_WINDOW_MS = 10_000;
const NEW_ORDER_MAX_AGE_MS = 10 * 60_000;
function isBrandNewOrder(o: Order): boolean {
  const created = Date.parse(o.createdAt || "");
  if (!created || Math.abs(Date.now() - created) > NEW_ORDER_MAX_AGE_MS) {
    return false;
  }
  const updated = Date.parse(o.updatedAt || "") || created;
  return Math.abs(updated - created) <= NEW_ORDER_WINDOW_MS;
}

/**
 * Another user / Magento changed an order (SSE). Its row and badges move in
 * every cached Match list. "unknown" = nothing this tab has seen tells what it
 * counted as before, so only /orders/match-counts can fix the badges.
 */
export function applyMatchPoolLiveOrder(
  order: Order
): "synced" | "unknown" | null {
  if (!order?.id) return null;
  const poolBefore = readMatchPoolRow(order.id);
  const seen = matchBucketSeen.get(order.id);
  const { changed, covered } = placeMatchPoolRow(order);
  const to = matchCountBucket(order);
  let from: string | null | undefined;
  if (poolBefore) from = matchCountBucket(poolBefore);
  else if (seen !== undefined) from = seen || null;
  else if (covered || isBrandNewOrder(order)) from = null;
  noteMatchBucket(order.id, to);
  const moved = from !== undefined && moveMatchBuckets(from, to);
  if (changed || moved) notifyMatchPoolSync();
  if (from === undefined && matchCountsCache) return "unknown";
  return changed || moved ? "synced" : null;
}

/** This tab replaced a whole order (assign / reassign): placed like a live update. */
function syncMatchPoolOrder(order: Order): void {
  if (isMatchPoolClaimed(order.id)) {
    if (patchMatchPoolRowsInPlace(order.id, order)) notifyMatchPoolSync();
    return;
  }
  if (applyMatchPoolLiveOrder(order) === "unknown") markMatchCountsStale();
}

/** Another user deleted an order (SSE). */
export function applyMatchPoolLiveDelete(
  orderId: string
): "synced" | "unknown" | null {
  if (!orderId) return null;
  const poolBefore = readMatchPoolRow(orderId);
  const seen = matchBucketSeen.get(orderId);
  let changed = false;
  for (const [key, entry] of matchPoolCache) {
    const orders = entry.orders.filter((o) => !orderMatchesId(o, orderId));
    if (orders.length === entry.orders.length) continue;
    matchPoolCache.set(key, { ...entry, orders });
    changed = true;
  }
  const from = poolBefore
    ? matchCountBucket(poolBefore)
    : seen !== undefined
      ? seen || null
      : undefined;
  noteMatchBucket(poolBefore?.id ?? orderId, null);
  const moved = from !== undefined && moveMatchBuckets(from, null);
  if (changed || moved) notifyMatchPoolSync();
  if (from === undefined && matchCountsCache) return "unknown";
  return changed || moved ? "synced" : null;
}

/**
 * Drop an order from every cached Orders board page + badge counts (this tab's
 * Delete, or SSE echo). Board-first AppState often has no activeOrders copy.
 */
export function applyOrdersBoardLiveDelete(orderId: string): void {
  if (!orderId) return;
  noteLocalOrderWrite(orderId);
  const before = readOrdersBoardOrder(orderId);
  if (before) {
    noteLocalOrderWrite(before.id, before.uuid, before.legacyId);
  }

  let changed = false;
  for (const [key, entry] of boardCache) {
    const orders = entry.orders.filter((o) => !orderMatchesId(o, orderId));
    if (orders.length === entry.orders.length) continue;
    const next = { ...entry, orders, updatedAt: Date.now() };
    boardCache.set(key, next);
    try {
      writeBoardSession(ssKey(BOARD_SS_PREFIX, key), next);
    } catch {
      /* ignore */
    }
    changed = true;
  }

  let countsChanged = false;
  if (before && before.status !== "in_mtd") {
    for (const [key, entry] of countsCache) {
      let flaggedOnly = false;
      try {
        flaggedOnly = Boolean(
          (JSON.parse(key) as { flaggedOnly?: boolean }).flaggedOnly
        );
      } catch {
        /* keep */
      }
      if (flaggedOnly) continue;
      const next = {
        counts: bumpNormalBoardPresence(entry.counts, before, -1),
        updatedAt: Date.now(),
      };
      countsCache.set(key, next);
      try {
        writeCountsSession(ssKey(COUNTS_SS_PREFIX, key), next);
      } catch {
        /* ignore */
      }
    }
    countsChanged = true;
  }

  applyMatchPoolLiveDelete(orderId);

  if (typeof window !== "undefined" && (changed || countsChanged || before)) {
    window.dispatchEvent(
      new CustomEvent(ORDERS_BOARD_PATCH_EVENT, {
        detail: {
          orderId: before?.id || orderId,
          deleted: true,
          countsChanged,
        },
      })
    );
  }
}

/**
 * Live updates stopped or dropped: keep painting cached Match lists + badges,
 * but revalidate them before trusting them again.
 */
export function markMatchPoolLiveGap(): void {
  matchBucketSeen.clear();
  for (const [key, entry] of matchPoolCache) {
    matchPoolCache.set(key, { ...entry, stale: true });
  }
  markMatchCountsStale();
}
