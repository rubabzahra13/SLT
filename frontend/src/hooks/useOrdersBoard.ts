"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeBoardStream } from "@/lib/api/board-stream";
import {
  fetchOrdersBoardApi,
  fetchOrdersCountsApi,
  type OrdersBoardCounts,
  type OrdersBoardQuery,
} from "@/lib/api/orders-board";
import {
  applyPeerOrderUpdate,
  isRecentLocalOrderWrite,
  mergeStickyChipCounts,
  ORDERS_BOARD_PATCH_EVENT,
  ordersBoardCountsQueryKey,
  ordersBoardQueryKey,
  ordersRangeFilterTotal,
  readOrdersBoardCache,
  readOrdersBoardCountsCache,
  readOrdersBoardOrder,
  writeOrdersBoardCache,
  writeOrdersBoardChipCountsCache,
  writeOrdersBoardCountsCache,
  writeOrdersBoardCountsOnlyCache,
} from "@/lib/orders-board-cache";
import { orderMatchesOrdersRangeFilter } from "@/lib/order-requirements";
import { parseOrdersRangeFilters } from "@/lib/orders-range-filters";
import type { Order } from "@/types";

/** Coalesce Magento inserts / filter misses into one background board reload. */
const SSE_OFF_PAGE_RELOAD_MS = 750;

const EMPTY_COUNTS: OrdersBoardCounts = {
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
};

/** Board entries default to zeros when a prefetch skipped counts — never paint those. */
function hasFetchedBadgeCounts(c: OrdersBoardCounts | undefined): c is OrdersBoardCounts {
  if (!c) return false;
  return (
    c.all +
      c.complete_data +
      c.missing_data +
      c.assigned +
      c.not_assigned +
      c.reassigned +
      c.flagged +
      (c.form ?? 0) +
      (c.manual ?? 0) >
    0
  );
}

/** Counts-only cache is written only after a successful fetch (including all-zero). */
function resolveInitialCounts(
  boardKey: string,
  countsKey: string
): { counts: OrdersBoardCounts; ready: boolean } {
  const fromCounts = readOrdersBoardCountsCache(countsKey);
  if (fromCounts) return { counts: fromCounts.counts, ready: true };
  // Only reuse board-entry counts when the dedicated counts cache is cold.
  const board = readOrdersBoardCache(boardKey)?.entry;
  if (hasFetchedBadgeCounts(board?.counts)) {
    return { counts: board.counts, ready: true };
  }
  return { counts: EMPTY_COUNTS, ready: false };
}

type ReloadOpts = {
  background?: boolean;
  forceCounts?: boolean;
  /** Default true; live-event catch-ups pass false. */
  warmSiblings?: boolean;
};

/** Keep at most 3 pages in memory (TanStack maxPages pattern). */
const MAX_BOARD_ROWS = 150;

/** Range tabs share form/source/search — warm hot tabs first (Complete / Not assigned). */
const BOARD_RANGE_SIBLINGS: Array<string | undefined> = [
  undefined, // All
  "need_to_be_scheduled",
  "not_assigned",
  "waiting_for_data",
  "assigned",
  "reassigned",
];

/** Warm cache for a form tab so the next click is instant. */
export async function prefetchOrdersBoard(
  query: OrdersBoardQuery
): Promise<void> {
  const key = ordersBoardQueryKey(query);
  const hit = readOrdersBoardCache(key);
  if (hit?.fresh) return;
  const flaggedOnly = (query.range || "") === "flagged";
  const countsKey = ordersBoardCountsQueryKey({
    category: query.category,
    source: query.source,
    search: query.search,
    excludeFlagged: query.excludeFlagged,
    flaggedOnly: flaggedOnly || undefined,
  });
  const countsFresh = readOrdersBoardCountsCache(countsKey)?.fresh;
  try {
    const boardPromise = fetchOrdersBoardApi({
      ...query,
      pageSize: 50,
      pageToken: null,
    });
    // Counts are form/subtype-agnostic — never pass form filters.
    const countsPromise = countsFresh
      ? Promise.resolve(null)
      : fetchOrdersCountsApi(
          {
            category: query.category || undefined,
            source: query.source || undefined,
            search: query.search || undefined,
            excludeFlagged: query.excludeFlagged,
            flaggedOnly: flaggedOnly || undefined,
          },
          { timeoutMs: 8_000 }
        ).catch(() => null);
    const [board, counts] = await Promise.all([boardPromise, countsPromise]);
    // Memory only — session persist is reserved for the active board paint so
    // empty sibling prefetches cannot evict a 50-row Cheer page on refresh.
    writeOrdersBoardCache(
      key,
      {
        orders: board.orders,
        nextPageToken: board.nextPageToken,
        ...(counts ? { counts } : {}),
      },
      { persist: false }
    );
    if (counts) {
      writeOrdersBoardCountsOnlyCache(countsKey, counts);
      writeOrdersBoardCountsCache(key, counts);
      writeOrdersBoardChipCountsCache(countsKey, counts);
    }
  } catch {
    /* prefetch is best-effort */
  }
}

/** Expected row total for a range badge (null = unknown / still loading counts). */
function rangeBadgeTotal(
  counts: OrdersBoardCounts | null | undefined,
  range: string | undefined,
  query?: Pick<
    OrdersBoardQuery,
    "formType" | "cheerFormSubtype" | "danceFormSubtype"
  >
): number | null {
  if (!counts) return null;
  if (range === "flagged") return counts.flagged;
  return ordersRangeFilterTotal(counts, range, {
    formType: query?.formType,
    cheerFormSubtype: query?.cheerFormSubtype,
    danceFormSubtype: query?.danceFormSubtype,
  });
}

/**
 * Drop keepPrevious / cache pollution so filters never show the wrong rows.
 * Comma-separated ranges AND (Complete/Missing × Assigned/…).
 */
function filterOrdersForBoardRange(
  orders: Order[],
  range: string | undefined
): Order[] {
  // Flagged is its own board (not a Complete/Assigned chip): keep open flags only.
  if ((range || "").trim().toLowerCase() === "flagged") {
    return orders.filter((o) => o.affiliateFlagStatus === "open");
  }
  const parts = parseOrdersRangeFilters(range);
  if (!parts.length) return orders;
  return orders.filter((o) =>
    parts.every((rf) => orderMatchesOrdersRangeFilter(o, rf))
  );
}

/** Same form/source/search with range cleared — status chips filter this like search. */
function readAllScopeOrders(q: OrdersBoardQuery): Order[] {
  const allKey = ordersBoardQueryKey({ ...q, range: undefined });
  const hit = readOrdersBoardCache(allKey);
  return hit?.entry.orders?.length ? hit.entry.orders : [];
}

/**
 * Instant chip paint: prefer the ranged cache, else scope the All page, else
 * scope the rows on screen (Not assigned / Missing feel like search). May be
 * empty for sparse chips — callers skeleton until the ranged page lands.
 */
function seedOrdersOnRangeChange(
  q: OrdersBoardQuery,
  prev: Order[]
): { orders: Order[]; nextPageToken: string | null } {
  const rangedHit = readOrdersBoardCache(ordersBoardQueryKey(q));
  if (rangedHit?.entry.orders.length) {
    const scoped = filterOrdersForBoardRange(rangedHit.entry.orders, q.range);
    if (scoped.length) {
      return {
        orders: scoped,
        nextPageToken: rangedHit.entry.nextPageToken,
      };
    }
  }
  const allOrders = readAllScopeOrders(q);
  // All-scope / on-screen seeds never reuse another key's page token.
  return {
    orders: filterOrdersForBoardRange(
      allOrders.length ? allOrders : prev,
      q.range
    ),
    nextPageToken: null,
  };
}

function rangeHasToken(range: string | undefined, ...ids: string[]): boolean {
  const parts = parseOrdersRangeFilters(range);
  if (!parts.length) return ids.includes("all");
  return ids.some((id) =>
    parts.some((p) => p === id || (id === "reassigned" && p === "reassigned"))
  );
}

/** Prefetch non-empty sibling ranges only; max 2 in flight (egress-friendly). */
export function prefetchOrdersBoardRangeSiblings(
  query: OrdersBoardQuery,
  counts?: OrdersBoardCounts | null
): void {
  const current = query.range || undefined;
  const jobs: Array<string | undefined> = [];
  for (const range of BOARD_RANGE_SIBLINGS) {
    if (range === current) continue;
    if (counts) {
      const total = rangeBadgeTotal(counts, range, query);
      // 0 already seeded empty in memory — skip the board round-trip.
      if (total === 0) continue;
    }
    jobs.push(range);
  }
  let cursor = 0;
  const pump = async () => {
    while (cursor < jobs.length) {
      const batch = jobs.slice(cursor, cursor + 2);
      cursor += 2;
      await Promise.all(
        batch.map((range) => prefetchOrdersBoard({ ...query, range }))
      );
    }
  };
  void pump();
}

/** Badge says 0 → seed empty cache (never clobber a non-empty painted page). */
function seedEmptyRangeCaches(
  query: OrdersBoardQuery,
  counts: OrdersBoardCounts
): void {
  for (const range of BOARD_RANGE_SIBLINGS) {
    const total = rangeBadgeTotal(counts, range, query);
    if (total !== 0) continue;
    const key = ordersBoardQueryKey({ ...query, range });
    const existing = readOrdersBoardCache(key);
    // False 0 must not wipe a painted non-empty page.
    if (existing && existing.entry.orders.length > 0) continue;
    writeOrdersBoardCache(
      key,
      { orders: [], nextPageToken: null },
      { persist: false }
    );
  }
}

export function useOrdersBoard(
  query: OrdersBoardQuery,
  opts?: { enabled?: boolean }
) {
  const enabled = opts?.enabled !== false;
  const queryKey = ordersBoardQueryKey(query);
  const flaggedOnly = (query.range || "") === "flagged";
  const countsKey = ordersBoardCountsQueryKey({
    category: query.category,
    source: query.source,
    search: query.search,
    excludeFlagged: query.excludeFlagged,
    flaggedOnly: flaggedOnly || undefined,
  });
  const chipKey = countsKey;
  // Search skips /counts, so badges stay on the unsearched counts.
  const unsearchedCountsKey = (query.search || "").trim()
    ? ordersBoardCountsQueryKey({
        category: query.category,
        source: query.source,
        excludeFlagged: query.excludeFlagged,
        flaggedOnly: flaggedOnly || undefined,
      })
    : countsKey;

  const cached = readOrdersBoardCache(queryKey);
  const initial = resolveInitialCounts(queryKey, countsKey);
  const initialKnownTotal = rangeBadgeTotal(
    initial.ready ? initial.counts : null,
    query.range,
    query
  );
  // Badge 0 + non-empty cache → collision/stale; start empty.
  const initialEntry =
    cached &&
    !(initialKnownTotal === 0 && cached.entry.orders.length > 0)
      ? cached.entry
      : null;
  if (cached && !initialEntry) {
    writeOrdersBoardCache(
      queryKey,
      { orders: [], nextPageToken: null },
      { persist: false }
    );
  }
  const [orders, setOrders] = useState<Order[]>(
    () => initialEntry?.orders ?? []
  );
  const [counts, setCounts] = useState<OrdersBoardCounts>(() =>
    mergeStickyChipCounts(initial.counts, chipKey)
  );
  const [nextPageToken, setNextPageToken] = useState<string | null>(
    () => initialEntry?.nextPageToken ?? null
  );
  // Only true cold-start (no rows ever) shows Loading — tab switches keep prior rows.
  const [loading, setLoading] = useState(() => enabled && !initialEntry);
  const [loadingMore, setLoadingMore] = useState(false);
  /** Background first-page fetch in flight (rows may be a client-scoped seed). */
  const [refreshing, setRefreshing] = useState(false);
  /** True after the first successful counts response for this query (or warm cache). */
  const [countsReady, setCountsReady] = useState(() => initial.ready);
  const [error, setError] = useState<string | null>(null);
  const genRef = useRef(0);
  const pageIdsRef = useRef<Set<string>>(
    new Set((initialEntry?.orders ?? []).map((o) => o.id))
  );
  const lastGoodCountsRef = useRef<OrdersBoardCounts | null>(
    initial.ready ? initial.counts : null
  );
  const prevKeyRef = useRef(queryKey);
  const prevCountsKeyRef = useRef(countsKey);
  const offPageReloadTimerRef = useRef<number | null>(null);
  const paintedRef = useRef(Boolean(initialEntry?.orders.length));
  const reloadRef = useRef<
    (opts?: ReloadOpts) => Promise<void>
  >(async () => undefined);

  // Render-phase sync (React "adjust state when props change"): effects run
  // after paint, so Reassign→All used to flash "0 of N" for one frame even
  // with a warm All cache. Apply cache / empty-badge here before paint.
  const [paintKey, setPaintKey] = useState(queryKey);
  if (paintKey !== queryKey) {
    const prevQ = JSON.parse(paintKey) as OrdersBoardQuery;
    setPaintKey(queryKey);
    const hit = readOrdersBoardCache(queryKey);
    const q = JSON.parse(queryKey) as OrdersBoardQuery;
    // Prefer countsCache (Move-to-Reassign bumps it) over a stale All-tab ref.
    const countsHit = readOrdersBoardCountsCache(countsKey);
    const knownTotal = rangeBadgeTotal(
      countsHit?.counts ?? lastGoodCountsRef.current,
      q.range,
      q
    );
    const sameRange = (prevQ.range || "all") === (q.range || "all");
    const rangeChanged =
      (prevQ.range || "all") !== (q.range || "all");
    const searching = Boolean((q.search || "").trim());
    const wasSearching = Boolean((prevQ.search || "").trim());
    const searchOnlyChange =
      (prevQ.search || "") !== (q.search || "") &&
      (prevQ.formType || "") === (q.formType || "") &&
      (prevQ.cheerFormSubtype || "") === (q.cheerFormSubtype || "") &&
      (prevQ.danceFormSubtype || "") === (q.danceFormSubtype || "") &&
      (prevQ.source || "") === (q.source || "") &&
      sameRange &&
      (prevQ.sortBy || "newest") === (q.sortBy || "newest");
    // Never paint another range's rows into Reassign/Assigned/etc.
    const trustedPaintOrders =
      hit && hit.entry.orders.length > 0
        ? filterOrdersForBoardRange(hit.entry.orders, q.range)
        : [];
    if (trustedPaintOrders.length > 0) {
      setOrders(trustedPaintOrders);
      setNextPageToken(hit!.entry.nextPageToken);
      pageIdsRef.current = new Set(trustedPaintOrders.map((o) => o.id));
      paintedRef.current = true;
      setLoading(false);
      const paintCounts =
        countsHit?.counts ??
        (hasFetchedBadgeCounts(hit!.entry.counts) ? hit!.entry.counts : null);
      if (paintCounts) {
        const merged = mergeStickyChipCounts(paintCounts, chipKey);
        setCounts(merged);
        lastGoodCountsRef.current = merged;
        setCountsReady(true);
      }
    } else if (knownTotal === 0 && !searching && !searchOnlyChange) {
      setOrders([]);
      setNextPageToken(null);
      pageIdsRef.current = new Set();
      setLoading(false);
    } else if (wasSearching && !searching) {
      // Cleared search: do NOT keep the 2 search hits — restore All via fetch.
      setOrders([]);
      setNextPageToken(null);
      pageIdsRef.current = new Set();
      paintedRef.current = false;
      setLoading(enabled && knownTotal !== 0);
    } else if (
      paintedRef.current &&
      (searching || searchOnlyChange || (sameRange && !rangeChanged))
    ) {
      // Typing search (and form/subtype) keep rows — client filters instantly.
      setLoading(false);
    } else if (rangeChanged && paintedRef.current) {
      // Status chips should feel like search: seed from cache / on-screen rows
      // now, fetch the real ranged page in the background. Empty seed →
      // skeleton (not a false "No orders match") until that page lands.
      const seeded = seedOrdersOnRangeChange(q, orders);
      setOrders(seeded.orders);
      setNextPageToken(seeded.nextPageToken);
      pageIdsRef.current = new Set(seeded.orders.map((o) => o.id));
      setLoading(enabled && knownTotal !== 0 && seeded.orders.length === 0);
    } else {
      // Cold range switch with nothing painted — skeleton if badge says rows.
      setOrders([]);
      setNextPageToken(null);
      pageIdsRef.current = new Set();
      paintedRef.current = false;
      setLoading(enabled && knownTotal !== 0);
    }
  }

  // Sync paint to the active query before fetch (no empty flash on form/subtype switch).
  useEffect(() => {
    if (prevKeyRef.current === queryKey) return;
    const prevKey = prevKeyRef.current;
    prevKeyRef.current = queryKey;
    const hit = readOrdersBoardCache(queryKey);
    const next = resolveInitialCounts(queryKey, countsKey);
    // Never flash zeros when switching All ↔ Assigned (same countsKey).
    // Form-menu chips stay via mergeStickyChipCounts across Cheer↔Dance.
    if (next.ready) {
      const merged = mergeStickyChipCounts(next.counts, chipKey);
      setCounts(merged);
      lastGoodCountsRef.current = merged;
      setCountsReady(true);
    } else if (
      prevCountsKeyRef.current === countsKey &&
      lastGoodCountsRef.current
    ) {
      setCounts(mergeStickyChipCounts(lastGoodCountsRef.current, chipKey));
      setCountsReady(true);
    } else {
      const merged = mergeStickyChipCounts(EMPTY_COUNTS, chipKey);
      setCounts(merged);
      // Sticky chips count as ready — don't blank badges on form switch.
      const hasChips = Object.keys(merged.by_form_type || {}).length > 0;
      setCountsReady(hasChips);
    }
    prevCountsKeyRef.current = countsKey;
    setError(null);

    // Drop in-flight fetches / page appends from the previous key (footer
    // "· loading…", or old-range rows landing after a fast chip switch).
    genRef.current++;
    setLoadingMore(false);
    setRefreshing(false);

    const q = JSON.parse(queryKey) as OrdersBoardQuery;
    const prevRange = (() => {
      try {
        return (JSON.parse(prevKey) as OrdersBoardQuery).range || "all";
      } catch {
        return "all";
      }
    })();
    const rangeChanged = prevRange !== (q.range || "all");
    const prevQ = (() => {
      try {
        return JSON.parse(prevKey) as OrdersBoardQuery;
      } catch {
        return {} as OrdersBoardQuery;
      }
    })();
    const searching = Boolean((q.search || "").trim());
    const wasSearching = Boolean((prevQ.search || "").trim());
    const searchOnlyChange =
      (prevQ.search || "") !== (q.search || "") &&
      (prevQ.formType || "") === (q.formType || "") &&
      (prevQ.cheerFormSubtype || "") === (q.cheerFormSubtype || "") &&
      (prevQ.danceFormSubtype || "") === (q.danceFormSubtype || "") &&
      (prevQ.source || "") === (q.source || "") &&
      (prevQ.range || "all") === (q.range || "all") &&
      (prevQ.sortBy || "newest") === (q.sortBy || "newest");
    const knownTotal = rangeBadgeTotal(
      lastGoodCountsRef.current ?? next.counts,
      q.range,
      q
    );
    const rangedOrders = hit
      ? filterOrdersForBoardRange(hit.entry.orders, q.range)
      : [];
    // Badge 0 but cache has rows → distrust (hash collision / stale sibling).
    // Also distrust keepPrevious pollution (All rows cached under Reassign).
    const trustedHit =
      hit &&
      rangedOrders.length > 0 &&
      !(knownTotal === 0 && rangedOrders.length > 0)
        ? { ...hit, entry: { ...hit.entry, orders: rangedOrders } }
        : null;
    if (hit && (!trustedHit || rangedOrders.length !== hit.entry.orders.length)) {
      writeOrdersBoardCache(
        queryKey,
        {
          orders: trustedHit ? rangedOrders : [],
          nextPageToken: trustedHit ? hit.entry.nextPageToken : null,
        },
        { persist: false }
      );
    }

    if (trustedHit) {
      setOrders(trustedHit.entry.orders);
      setNextPageToken(trustedHit.entry.nextPageToken);
      pageIdsRef.current = new Set(
        trustedHit.entry.orders.map((o) => o.id)
      );
      paintedRef.current = trustedHit.entry.orders.length > 0;
      setLoading(false);
      // Still refresh in background when search just changed.
      if (!searching && !searchOnlyChange) return;
    }

    if (!trustedHit) {
      setNextPageToken(null);
    }

    // Badge 0 → empty now (Complete/Not assigned under empty subtypes too).
    if (knownTotal === 0 && !searching) {
      setOrders([]);
      pageIdsRef.current = new Set();
      setLoading(false);
      return;
    }

    // Cleared search: drop search hits; fetch full All (skeleton if no cache).
    if (wasSearching && !searching && !trustedHit) {
      setOrders([]);
      pageIdsRef.current = new Set();
      paintedRef.current = false;
      setLoading(enabled && knownTotal !== 0);
    } else if (
      searching ||
      searchOnlyChange ||
      (paintedRef.current && !rangeChanged)
    ) {
      // Typing search: keep rows. Range tabs: never keep All on Reassign.
      setLoading(false);
    } else if (rangeChanged && paintedRef.current && !trustedHit) {
      // Render-phase sync already seeded this chip; skeleton only if empty.
      setLoading(enabled && knownTotal !== 0 && pageIdsRef.current.size === 0);
    } else if (!trustedHit) {
      setOrders([]);
      pageIdsRef.current = new Set();
      paintedRef.current = false;
      // Skeleton while fetching — badge>0 + blank table looks broken.
      setLoading(enabled && knownTotal !== 0);
    }
  }, [queryKey, countsKey, chipKey, enabled]);

  const reload = useCallback(
    async (opts?: ReloadOpts) => {
      const gen = ++genRef.current;
      const cachedNow = readOrdersBoardCache(queryKey);
      const q = JSON.parse(queryKey) as OrdersBoardQuery;
      const knownTotal = rangeBadgeTotal(
        lastGoodCountsRef.current,
        q.range,
        q
      );
      const forceCounts = Boolean(opts?.forceCounts);
      const cachedScoped =
        cachedNow &&
        filterOrdersForBoardRange(cachedNow.entry.orders, q.range).length > 0
          ? cachedNow
          : null;
      const hasPaintedRows = pageIdsRef.current.size > 0;
      const searching = Boolean(q.search?.trim());
      // Silent refresh when rows are on screen, badge is 0, or searching
      // (client already filtered — never skeleton-block on slow Supabase search).
      const background =
        searching ||
        (Boolean(opts?.background) && hasPaintedRows) ||
        hasPaintedRows ||
        Boolean(cachedScoped) ||
        knownTotal === 0;
      if (!background) {
        setLoading(true);
        setError(null);
      } else {
        setLoading(false);
      }

      const flagged = (q.range || "") === "flagged";
      const cKey = ordersBoardCountsQueryKey({
        category: q.category,
        source: q.source,
        search: q.search,
        excludeFlagged: q.excludeFlagged,
        flaggedOnly: flagged || undefined,
      });
      const countsHit = readOrdersBoardCountsCache(cKey);
      // Search typing: board rows matter; full /counts is the slow path.
      // Keep sticky badges and only recount when search clears or is forced.
      const skipCountsForSearch =
        Boolean(q.search?.trim()) && !forceCounts && !flagged;
      const countsPromise =
        skipCountsForSearch || (background && countsHit?.fresh && !forceCounts)
          ? Promise.resolve(null)
          : fetchOrdersCountsApi(
              {
                category: q.category || undefined,
                source: q.source || undefined,
                search: q.search || undefined,
                excludeFlagged: q.excludeFlagged,
                flaggedOnly: flagged || undefined,
              },
              { timeoutMs: 8_000 }
            ).catch(() => null);

      // Badge 0 is only trusted while counts are fresh. Stale/forced recounts
      // must re-fetch — otherwise Assign stays empty after a producer assign.
      const trustEmptyZero =
        knownTotal === 0 && Boolean(countsHit?.fresh) && !forceCounts;

      const paintBoard = async () => {
        setRefreshing(true);
        try {
          const board = await fetchOrdersBoardApi({
            ...q,
            pageSize: 50,
            pageToken: null,
          });
          if (gen !== genRef.current) return;
          const scoped = filterOrdersForBoardRange(board.orders, q.range);
          setOrders(scoped);
          pageIdsRef.current = new Set(scoped.map((o) => o.id));
          setNextPageToken(board.nextPageToken);
          paintedRef.current = true;
          writeOrdersBoardCache(queryKey, {
            orders: scoped,
            nextPageToken: board.nextPageToken,
          });
          if (gen === genRef.current) setLoading(false);
        } catch (err) {
          if (gen !== genRef.current) return;
          setError(
            err instanceof Error ? err.message : "Failed to load orders"
          );
          setNextPageToken((prev) => prev);
          if (gen === genRef.current) setLoading(false);
        } finally {
          if (gen === genRef.current) setRefreshing(false);
        }
      };

      if (trustEmptyZero) {
        setOrders([]);
        pageIdsRef.current = new Set();
        setNextPageToken(null);
        writeOrdersBoardCache(
          queryKey,
          { orders: [], nextPageToken: null },
          { persist: false }
        );
        if (gen === genRef.current) setLoading(false);
      } else {
        await paintBoard();
      }

      // Range siblings warm once per real load, after counts say which tabs
      // have rows. SSE catch-ups skip it (stale sibling caches still paint).
      const warmSiblings = opts?.warmSiblings !== false && !flagged && !q.search;
      const boardCounts = await countsPromise;
      if (gen !== genRef.current) return;
      if (!boardCounts) {
        const known = lastGoodCountsRef.current;
        if (warmSiblings && known) {
          seedEmptyRangeCaches(q, known);
          window.setTimeout(() => prefetchOrdersBoardRangeSiblings(q, known), 0);
        }
        return;
      }
      writeOrdersBoardChipCountsCache(cKey, boardCounts);
      const merged = mergeStickyChipCounts(boardCounts, cKey);
      setCounts(merged);
      lastGoodCountsRef.current = merged;
      setCountsReady(true);
      writeOrdersBoardCountsOnlyCache(cKey, boardCounts);
      writeOrdersBoardCountsCache(queryKey, boardCounts);
      // Took the empty shortcut on a stale 0 — refill if recount says rows exist.
      if (trustEmptyZero) {
        const nextTotal = rangeBadgeTotal(boardCounts, q.range, q);
        if (nextTotal !== null && nextTotal > 0) {
          await paintBoard();
        }
      }
      if (!flagged && !q.search) {
        seedEmptyRangeCaches(q, boardCounts);
        if (warmSiblings) {
          window.setTimeout(
            () => prefetchOrdersBoardRangeSiblings(q, boardCounts),
            0
          );
        }
      }
    },
    [queryKey]
  );

  reloadRef.current = reload;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const q = JSON.parse(queryKey) as OrdersBoardQuery;
    const countsHit = readOrdersBoardCountsCache(countsKey);
    const next = resolveInitialCounts(queryKey, countsKey);
    const countsForBadge =
      next.ready
        ? next.counts
        : countsHit?.counts ?? lastGoodCountsRef.current;
    const knownTotal = rangeBadgeTotal(countsForBadge, q.range, q);
    const hit = readOrdersBoardCache(queryKey);
    const rangedOrders = hit
      ? filterOrdersForBoardRange(hit.entry.orders, q.range)
      : [];
    // Don't re-paint rows into a 0-badge tab after the sync effect cleared.
    // Also reject All/Assigned pollution cached under Reassign.
    const trustedHit =
      hit &&
      rangedOrders.length > 0 &&
      !(knownTotal === 0 && rangedOrders.length > 0)
        ? {
            ...hit,
            entry: { ...hit.entry, orders: rangedOrders },
          }
        : null;
    if (hit && (!trustedHit || rangedOrders.length !== hit.entry.orders.length)) {
      writeOrdersBoardCache(
        queryKey,
        {
          orders: trustedHit ? rangedOrders : [],
          nextPageToken: trustedHit ? hit.entry.nextPageToken : null,
        },
        { persist: false }
      );
    }
    if (trustedHit) {
      setOrders(trustedHit.entry.orders);
      if (next.ready) {
        const merged = mergeStickyChipCounts(next.counts, chipKey);
        setCounts(merged);
        lastGoodCountsRef.current = merged;
        setCountsReady(true);
      } else if (lastGoodCountsRef.current) {
        setCounts(mergeStickyChipCounts(lastGoodCountsRef.current, chipKey));
        setCountsReady(true);
      }
      setNextPageToken(trustedHit.entry.nextPageToken);
      pageIdsRef.current = new Set(
        trustedHit.entry.orders.map((o) => o.id)
      );
      paintedRef.current = trustedHit.entry.orders.length > 0;
      setLoading(false);
      // Fresh cache → paint only. Live sync is SSE; stale → one silent catch-up
      // for events missed while this route was unmounted.
      // Polluted-then-filtered caches must still refetch to get the real page.
      const cacheWasPolluted = hit!.entry.orders.length !== rangedOrders.length;
      if (trustedHit.fresh && countsHit?.fresh && !cacheWasPolluted) {
        // Remount with warm cache: paint only — no sibling fan-out (that was
        // 3–5 board GETs every Orders↔MTD hop). Sibling warm stays on idle
        // after a real network load / first interactive session.
        if (!flaggedOnly && !q.search) {
          seedEmptyRangeCaches(q, countsHit.counts);
        }
        return;
      }
      const t = window.setTimeout(() => {
        void reload({
          background: true,
          forceCounts: !countsHit?.fresh,
        });
      }, 0);
      return () => window.clearTimeout(t);
    }
    // Board cold — still paint badge counts if we have them for this form.
    if (countsHit) {
      const merged = mergeStickyChipCounts(countsHit.counts, chipKey);
      setCounts(merged);
      lastGoodCountsRef.current = merged;
      setCountsReady(true);
      if (!flaggedOnly && !q.search) {
        seedEmptyRangeCaches(q, countsHit.counts);
      }
    } else if (lastGoodCountsRef.current) {
      setCounts(mergeStickyChipCounts(lastGoodCountsRef.current, chipKey));
      setCountsReady(true);
    } else {
      setCounts(mergeStickyChipCounts(EMPTY_COUNTS, chipKey));
      setCountsReady(false);
    }

    // Fresh badge 0 → empty now. Stale 0 (e.g. just assigned) must recount.
    if (knownTotal === 0 && countsHit?.fresh) {
      setOrders([]);
      pageIdsRef.current = new Set();
      setNextPageToken(null);
      setLoading(false);
      if (!flaggedOnly && !q.search && countsForBadge) {
        seedEmptyRangeCaches(q, countsForBadge);
        window.setTimeout(
          () => prefetchOrdersBoardRangeSiblings(q, countsForBadge),
          0
        );
      }
      return;
    }

    // Search is debounced on the page; fetch immediately here. Keep rows on
    // screen while searching (background) so typing doesn't feel stuck.
    const searching = Boolean(q.search?.trim());
    const t = window.setTimeout(() => {
      void reload({
        background: paintedRef.current || knownTotal === 0 || searching,
        forceCounts:
          !searching && (!countsHit?.fresh || knownTotal === 0),
      });
    }, 0);
    return () => window.clearTimeout(t);
  }, [reload, query.search, queryKey, countsKey, chipKey, enabled, flaggedOnly]);

  const loadMore = useCallback(async () => {
    if (!nextPageToken || loading || loadingMore) return;
    const gen = genRef.current;
    setLoadingMore(true);
    try {
      const q = JSON.parse(queryKey) as OrdersBoardQuery;
      const board = await fetchOrdersBoardApi({
        ...q,
        pageSize: 50,
        pageToken: nextPageToken,
      });
      if (gen !== genRef.current) return;
      setOrders((prev) => {
        const next = [...prev, ...board.orders].slice(-MAX_BOARD_ROWS);
        pageIdsRef.current = new Set(next.map((o) => o.id));
        writeOrdersBoardCache(queryKey, {
          orders: next,
          nextPageToken: board.nextPageToken,
        });
        return next;
      });
      setNextPageToken(board.nextPageToken);
    } catch {
      /* keep current page */
    } finally {
      if (gen === genRef.current) setLoadingMore(false);
    }
  }, [nextPageToken, loading, loadingMore, queryKey]);

  // Optimistic local patches (CS / collection toggles) before SSE lands.
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const onPatch = (ev: Event) => {
      const detail = (
        ev as CustomEvent<{
          orderId?: string;
          patch?: Partial<Order>;
          inPlaceOnly?: boolean;
          countsChanged?: boolean;
        }>
      ).detail;
      // Assign / reassign / flag resolve bumped the counts cache — show it now.
      if (detail?.countsChanged) {
        const searchHit = readOrdersBoardCountsCache(countsKey);
        const hit = searchHit ?? readOrdersBoardCountsCache(unsearchedCountsKey);
        if (hit) {
          const merged = mergeStickyChipCounts(
            hit.counts,
            searchHit ? chipKey : unsearchedCountsKey
          );
          setCounts(merged);
          lastGoodCountsRef.current = merged;
          setCountsReady(true);
        }
      }
      const orderId = detail?.orderId;
      const patch = detail?.patch;
      if (!orderId || !patch) return;
      setOrders((prev) => {
        const match = (o: Order) =>
          o.id === orderId || o.uuid === orderId || o.legacyId === orderId;
        const q = JSON.parse(queryKey) as OrdersBoardQuery;
        const range = q.range || "all";
        const onPage = prev.some(match);
        // Flag cleared: row may newly belong on this Orders page (was Flagged-only).
        const flagReleased =
          patch.affiliateFlagStatus != null &&
          patch.affiliateFlagStatus !== "open";
        let next: Order[];
        if (onPage) {
          next = prev.map((o) => (match(o) ? { ...o, ...patch } : o));
        } else if (flagReleased) {
          const merged = {
            ...(readOrdersBoardOrder(orderId) || {}),
            ...patch,
            id: orderId,
          } as Order;
          if (filterOrdersForBoardRange([merged], range).length === 0) {
            return prev;
          }
          next = [merged, ...prev.filter((o) => !match(o))];
        } else if (detail.inPlaceOnly) {
          return prev;
        } else if (patch.isReassigned && rangeHasToken(range, "reassigned")) {
          // Never spread keepPrevious All/Assigned rows into Reassign.
          const scoped = filterOrdersForBoardRange(prev, range);
          next = [{ ...(patch as Order), id: orderId }, ...scoped.filter((o) => !match(o))];
        } else if (
          patch.isReassigned &&
          parseOrdersRangeFilters(range).length === 0
        ) {
          next = [{ ...(patch as Order), id: orderId }, ...prev.filter((o) => !match(o))];
        } else {
          return prev;
        }
        next = filterOrdersForBoardRange(next, range);
        pageIdsRef.current = new Set(next.map((o) => o.id));
        writeOrdersBoardCache(queryKey, {
          orders: next,
          nextPageToken:
            readOrdersBoardCache(queryKey)?.entry.nextPageToken ?? null,
        });
        return next;
      });
    };
    window.addEventListener(ORDERS_BOARD_PATCH_EVENT, onPatch);
    return () => window.removeEventListener(ORDERS_BOARD_PATCH_EVENT, onPatch);
  }, [enabled, queryKey, countsKey, chipKey, unsearchedCountsKey]);

  // SSE-first: patch rows in place; full reload only on stream reconnect or
  // off-page inserts (Magento) / deletes that need count catch-up. No focus poll.
  useEffect(() => {
    if (!enabled) return;
    const ac = new AbortController();

    const scheduleOffPageReload = () => {
      if (offPageReloadTimerRef.current != null) {
        window.clearTimeout(offPageReloadTimerRef.current);
      }
      offPageReloadTimerRef.current = window.setTimeout(() => {
        offPageReloadTimerRef.current = null;
        void reloadRef.current({
          background: true,
          forceCounts: true,
          warmSiblings: false,
        });
      }, SSE_OFF_PAGE_RELOAD_MS);
    };

    void subscribeBoardStream((event) => {
      if (event.type === "ready") {
        if (event.reconnect) {
          void reloadRef.current({ background: true, warmSiblings: false });
        }
        return;
      }
      if (event.type === "order.updated") {
        const id = event.order.id;
        const q = JSON.parse(queryKey) as OrdersBoardQuery;
        const range = q.range || "all";
        const belongsHere =
          filterOrdersForBoardRange([event.order as Order], range).length > 0;

        if (pageIdsRef.current.has(id)) {
          // Peer save: badges move with the row (our own saves already did).
          const moved = isRecentLocalOrderWrite(event.order)
            ? null
            : applyPeerOrderUpdate(event.order);
          if (moved === "shifted") {
            window.dispatchEvent(
              new CustomEvent(ORDERS_BOARD_PATCH_EVENT, {
                detail: { countsChanged: true },
              })
            );
          } else if (moved === "recount") {
            scheduleOffPageReload();
          }
          setOrders((prev) => {
            // Assigned rows must leave Not assigned (don't just patch the avatar).
            const next = belongsHere
              ? prev.map((o) => (o.id === id ? { ...o, ...event.order } : o))
              : prev.filter((o) => o.id !== id);
            pageIdsRef.current = new Set(next.map((o) => o.id));
            writeOrdersBoardCache(queryKey, {
              orders: next,
              nextPageToken:
                readOrdersBoardCache(queryKey)?.entry.nextPageToken ?? null,
            });
            return next;
          });
          // No board+counts refetch for in-page rows — that doubled egress
          // after every assign.
          return;
        }
        // Echo of this tab's own save: rows + badges were already moved.
        if (isRecentLocalOrderWrite(event.order)) return;
        if (
          belongsHere &&
          rangeHasToken(range, "assigned", "not_assigned", "reassigned")
        ) {
          // Row entered this filter set from another view — pull a fresh page.
          scheduleOffPageReload();
          return;
        }
        // Off-page status moves (e.g. reassign) — soft catch-up without
        // invalidating every sticky chip first.
        scheduleOffPageReload();
        return;
      }
      if (event.type === "order.deleted") {
        if (pageIdsRef.current.has(event.id)) {
          setOrders((prev) => {
            const next = prev.filter((o) => o.id !== event.id);
            pageIdsRef.current = new Set(next.map((o) => o.id));
            writeOrdersBoardCache(queryKey, {
              orders: next,
              nextPageToken:
                readOrdersBoardCache(queryKey)?.entry.nextPageToken ?? null,
            });
            return next;
          });
        }
        scheduleOffPageReload();
      }
    }, ac.signal).catch(() => {
      /* stream retries internally; cold load / remount still cover gaps */
    });

    return () => {
      ac.abort();
      if (offPageReloadTimerRef.current != null) {
        window.clearTimeout(offPageReloadTimerRef.current);
        offPageReloadTimerRef.current = null;
      }
    };
  }, [enabled, queryKey]);

  return {
    orders,
    counts,
    nextPageToken,
    loading,
    loadingMore,
    refreshing,
    countsReady,
    error,
    reload: (opts?: { forceCounts?: boolean }) =>
      reload({ background: true, forceCounts: opts?.forceCounts }),
    loadMore,
    setOrders,
  };
}
