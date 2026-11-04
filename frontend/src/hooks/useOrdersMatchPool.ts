"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  subscribeBoardStream,
  type BoardStreamEvent,
} from "@/lib/api/board-stream";
import {
  fetchOrdersMatchCountsApi,
  fetchOrdersMatchPoolApi,
} from "@/lib/api/orders-board";
import { isMatchOrdersPageOpen } from "@/lib/match-suggestion-notify";
import {
  applyMatchPoolLiveDelete,
  applyMatchPoolLiveOrder,
  dropRecentlyMatched,
  isRecentLocalOrderWrite,
  markMatchCountsStale,
  markMatchPoolLiveGap,
  MATCH_POOL_SYNC_EVENT,
  matchPoolQueryKey,
  notifyMatchPoolSync,
  readMatchCountsCache,
  readMatchCountsVersion,
  readMatchPoolCache,
  retainMatchPoolKey,
  writeMatchCountsCache,
  writeMatchPoolCache,
} from "@/lib/orders-board-cache";
import { supportsManualMatchForm, type Order, type OrderFormType } from "@/types";

/** First page only — Match UI pages 5 rows; 25 is enough before load-more. */
const PAGE_SIZE = 25;

/** Bursts (imports, bulk moves) collapse into one /match-counts call. */
const COUNTS_REFRESH_DEBOUNCE_MS = 2_000;
let countsRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let countsRefreshOnVisible = false;

/**
 * Re-read Match badges from the server. Only when Match Orders is on screen —
 * elsewhere they just stay marked stale until Match opens.
 */
export async function refreshMatchCounts(): Promise<void> {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    if (countsRefreshOnVisible) return;
    countsRefreshOnVisible = true;
    const onVisible = () => {
      if (document.visibilityState === "hidden") return;
      document.removeEventListener("visibilitychange", onVisible);
      countsRefreshOnVisible = false;
      if (isMatchOrdersPageOpen() && !readMatchCountsCache()?.fresh) {
        void refreshMatchCounts();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return;
  }
  const version = readMatchCountsVersion();
  try {
    const counts = await fetchOrdersMatchCountsApi({ timeoutMs: 8_000 });
    // A local match / edit moved the badges mid-flight: this answer may predate it.
    if (readMatchCountsVersion() !== version) {
      scheduleMatchCountsRefresh();
      return;
    }
    writeMatchCountsCache(counts);
    notifyMatchPoolSync();
  } catch {
    /* keep cached badges */
  }
}

function scheduleMatchCountsRefresh() {
  markMatchCountsStale();
  if (typeof window === "undefined" || !isMatchOrdersPageOpen()) return;
  if (countsRefreshTimer) clearTimeout(countsRefreshTimer);
  countsRefreshTimer = setTimeout(() => {
    countsRefreshTimer = null;
    void refreshMatchCounts();
  }, COUNTS_REFRESH_DEBOUNCE_MS);
}

function onMatchLiveEvent(event: BoardStreamEvent) {
  if (event.type === "ready") {
    if (!event.reconnect) return;
    markMatchPoolLiveGap();
    notifyMatchPoolSync(undefined, { stale: true });
    scheduleMatchCountsRefresh();
    return;
  }
  if (event.type === "order.updated") {
    // Our own save: lists + badges already moved with the optimistic patch.
    if (isRecentLocalOrderWrite(event.order)) return;
    if (applyMatchPoolLiveOrder(event.order) === "unknown") {
      scheduleMatchCountsRefresh();
    }
    return;
  }
  if (event.type === "order.deleted") {
    if (applyMatchPoolLiveDelete(event.id) === "unknown") {
      scheduleMatchCountsRefresh();
    }
  }
}

/** One listener on the tab's shared stream for every mounted Match list. */
let liveUsers = 0;
let liveAbort: AbortController | null = null;
let liveStopTimer: ReturnType<typeof setTimeout> | null = null;
/** Orders ↔ Match navigation unmounts one list just before the next mounts. */
const LIVE_STOP_GRACE_MS = 5_000;

function retainMatchPoolLive(): () => void {
  liveUsers += 1;
  if (liveStopTimer) {
    clearTimeout(liveStopTimer);
    liveStopTimer = null;
  }
  if (!liveAbort) {
    liveAbort = new AbortController();
    void subscribeBoardStream(onMatchLiveEvent, liveAbort.signal).catch(() => {
      /* stream retries internally */
    });
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    liveUsers -= 1;
    if (liveUsers > 0) return;
    liveStopTimer = setTimeout(() => {
      liveStopTimer = null;
      if (liveUsers > 0 || !liveAbort) return;
      liveAbort.abort();
      liveAbort = null;
      markMatchPoolLiveGap();
    }, LIVE_STOP_GRACE_MS);
  };
}

export type OrdersMatchPoolQuery = {
  enabled?: boolean;
  formType?: string;
  cheerFormSubtype?: string;
  danceFormSubtype?: string;
};

/** Session keys owned by /orders/match — prefetch must use these, not Orders form. */
const MATCH_FORM_KEY = "slt_match_form";
const MATCH_CHEER_KEY = "slt_match_cheer_subtype";
const MATCH_DANCE_KEY = "slt_match_dance_subtype";

/**
 * Filters Match will actually open with. Warming Orders' form/subtype misses
 * this key and first Match click still cold-skeletons.
 */
export function resolveMatchPrefetchQuery(fallback?: {
  formType?: string;
  cheerFormSubtype?: string;
  danceFormSubtype?: string;
}): {
  formType?: string;
  cheerFormSubtype?: string;
  danceFormSubtype?: string;
} {
  if (typeof window === "undefined") {
    return {
      formType: fallback?.formType,
      cheerFormSubtype: fallback?.cheerFormSubtype,
      danceFormSubtype: fallback?.danceFormSubtype,
    };
  }
  const rawForm =
    sessionStorage.getItem(MATCH_FORM_KEY)?.trim() ||
    fallback?.formType ||
    undefined;
  // Sports Entertainment / School Anthem have no manuals — Match never opens them.
  const form =
    rawForm && supportsManualMatchForm(rawForm as OrderFormType)
      ? rawForm
      : rawForm
        ? "school-all-star-cheer"
        : undefined;
  const cheer =
    sessionStorage.getItem(MATCH_CHEER_KEY)?.trim() ||
    fallback?.cheerFormSubtype ||
    undefined;
  const dance =
    sessionStorage.getItem(MATCH_DANCE_KEY)?.trim() ||
    fallback?.danceFormSubtype ||
    undefined;
  return {
    formType: form,
    cheerFormSubtype: form === "school-all-star-cheer" ? cheer : undefined,
    danceFormSubtype: form === "school-all-star-dance" ? dance : undefined,
  };
}

/** Warm one Match pool key (does not rewrite with Match session storage). */
export async function prefetchOrdersMatchPoolQuery(opts: {
  formType?: string;
  cheerFormSubtype?: string;
  danceFormSubtype?: string;
  timeoutMs?: number;
}): Promise<void> {
  const key = matchPoolQueryKey(opts);
  if (readMatchPoolCache(key)?.fresh) return;
  try {
    const page = await fetchOrdersMatchPoolApi(null, {
      pageSize: PAGE_SIZE,
      formType: opts.formType,
      cheerFormSubtype: opts.cheerFormSubtype,
      danceFormSubtype: opts.danceFormSubtype,
      timeoutMs: opts.timeoutMs,
    });
    // Memory only — session persist is for the painted Match page.
    writeMatchPoolCache(
      dropRecentlyMatched(page.orders),
      page.nextPageToken,
      key,
      { persist: false }
    );
  } catch {
    /* prefetch is best-effort */
  }
}

const matchPrefetchInflight = new Map<string, Promise<void>>();

export async function prefetchOrdersMatchData(opts?: {
  formType?: string;
  cheerFormSubtype?: string;
  danceFormSubtype?: string;
}): Promise<void> {
  // Prefer Match page session filters so the warm key matches first paint.
  const q = resolveMatchPrefetchQuery(opts);
  const key = matchPoolQueryKey(q);
  const existing = matchPrefetchInflight.get(key);
  if (existing) return existing;

  const run = (async () => {
    const countsHit = readMatchCountsCache();
    try {
      // Pool + counts in parallel — awaiting counts first delayed warm completion.
      const countsPromise = countsHit?.fresh
        ? Promise.resolve(null)
        : fetchOrdersMatchCountsApi({ timeoutMs: 8_000 }).catch(() => null);
      const [, counts] = await Promise.all([
        prefetchOrdersMatchPoolQuery(q),
        countsPromise,
      ]);
      if (counts) writeMatchCountsCache(counts);
    } catch {
      /* prefetch is best-effort */
    }
  })();

  matchPrefetchInflight.set(key, run);
  try {
    await run;
  } finally {
    matchPrefetchInflight.delete(key);
  }
}

/**
 * Paged match pool with board-style cache: paint warm rows, skip network when
 * fresh, silent revalidate when stale.
 *
 * Key changes sync during render (not useEffect) so the first paint after a
 * subtype click never keeps the previous tab's rows — client form filters
 * would otherwise empty the list while sticky counts still say "1".
 */
export function useOrdersMatchPool(opts: OrdersMatchPoolQuery = {}) {
  const enabled = opts.enabled !== false;
  const queryKey = matchPoolQueryKey({
    formType: opts.formType,
    cheerFormSubtype: opts.cheerFormSubtype,
    danceFormSubtype: opts.danceFormSubtype,
  });
  const cached = readMatchPoolCache(queryKey);
  const [poolKey, setPoolKey] = useState(queryKey);
  const [orders, setOrders] = useState<Order[]>(
    () => cached?.entry.orders ?? []
  );
  const [nextPageToken, setNextPageToken] = useState<string | null>(
    () => cached?.entry.nextPageToken ?? null
  );
  const [loading, setLoading] = useState(() => enabled && !cached);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const genRef = useRef(0);
  const paintedRef = useRef(Boolean(cached?.entry.orders.length));

  // React: adjust state during render when the query key changes so we never
  // commit a frame of previous-subtype rows under the new tab's counts.
  if (poolKey !== queryKey) {
    const hit = readMatchPoolCache(queryKey);
    setPoolKey(queryKey);
    genRef.current += 1;
    setLoadingMore(false);
    setError(null);
    if (hit) {
      setOrders(hit.entry.orders);
      setNextPageToken(hit.entry.nextPageToken);
      paintedRef.current = hit.entry.orders.length > 0;
      setLoading(false);
    } else {
      setOrders([]);
      setNextPageToken(null);
      paintedRef.current = false;
      setLoading(enabled);
    }
  }

  const reload = useCallback(
    async (reloadOpts?: { background?: boolean }) => {
      if (!enabled) return;
      const gen = ++genRef.current;
      const hit = readMatchPoolCache(queryKey);
      const background = Boolean(reloadOpts?.background) || Boolean(hit);
      if (hit) {
        setOrders(hit.entry.orders);
        setNextPageToken(hit.entry.nextPageToken);
        paintedRef.current = hit.entry.orders.length > 0;
        setLoading(false);
        if (hit.fresh && background) return;
      } else if (!background) {
        setLoading(true);
        setOrders([]);
        setNextPageToken(null);
      } else {
        setLoading(false);
      }
      setError(null);

      try {
        const q = JSON.parse(queryKey) as {
          formType: string;
          cheerFormSubtype: string;
          danceFormSubtype: string;
        };
        const page = await fetchOrdersMatchPoolApi(null, {
          pageSize: PAGE_SIZE,
          formType: q.formType || undefined,
          cheerFormSubtype: q.cheerFormSubtype || undefined,
          danceFormSubtype: q.danceFormSubtype || undefined,
        });
        if (gen !== genRef.current) return;
        const rows = dropRecentlyMatched(page.orders);
        setOrders(rows);
        setNextPageToken(page.nextPageToken);
        paintedRef.current = rows.length > 0;
        writeMatchPoolCache(rows, page.nextPageToken, queryKey);
      } catch (err) {
        if (gen !== genRef.current) return;
        setError(
          err instanceof Error ? err.message : "Failed to load match pool"
        );
        if (!readMatchPoolCache(queryKey)) setOrders([]);
      } finally {
        if (gen === genRef.current) setLoading(false);
      }
    },
    [enabled, queryKey]
  );

  // Live rows from other users / Magento; this key stays cached while shown.
  useEffect(() => {
    if (!enabled) return;
    const releaseKey = retainMatchPoolKey(queryKey);
    const releaseLive = retainMatchPoolLive();
    return () => {
      releaseLive();
      releaseKey();
    };
  }, [enabled, queryKey]);

  // Saves, matches, splits and live updates all land in the cache first
  // (every key at once) — repaint from it, no refetch.
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const onSync = (ev: Event) => {
      const detail = (
        ev as CustomEvent<{ removeIds?: string[]; stale?: boolean }>
      ).detail;
      const hit = readMatchPoolCache(queryKey);
      if (hit) {
        setOrders(hit.entry.orders);
      } else if (detail?.removeIds?.length) {
        const gone = new Set(detail.removeIds);
        setOrders((prev) =>
          prev.filter(
            (o) =>
              !gone.has(o.id) &&
              !(o.uuid && gone.has(o.uuid)) &&
              !(o.legacyId && gone.has(o.legacyId))
          )
        );
      }
      if (detail?.stale) void reload({ background: true });
    };
    window.addEventListener(MATCH_POOL_SYNC_EVENT, onSync);
    return () => window.removeEventListener(MATCH_POOL_SYNC_EVENT, onSync);
  }, [enabled, queryKey, reload]);

  useEffect(() => {
    if (!enabled) return;
    const hit = readMatchPoolCache(queryKey);
    if (hit?.fresh) {
      setOrders(hit.entry.orders);
      setNextPageToken(hit.entry.nextPageToken);
      paintedRef.current = hit.entry.orders.length > 0;
      setLoading(false);
      return;
    }
    void reload({ background: Boolean(hit) });
  }, [enabled, queryKey, reload]);

  const loadMore = useCallback(async () => {
    if (!enabled || !nextPageToken || loading || loadingMore) return;
    const gen = genRef.current;
    setLoadingMore(true);
    try {
      const q = JSON.parse(queryKey) as {
        formType: string;
        cheerFormSubtype: string;
        danceFormSubtype: string;
      };
      const page = await fetchOrdersMatchPoolApi(nextPageToken, {
        pageSize: PAGE_SIZE,
        formType: q.formType || undefined,
        cheerFormSubtype: q.cheerFormSubtype || undefined,
        danceFormSubtype: q.danceFormSubtype || undefined,
      });
      if (gen !== genRef.current) return;
      setOrders((prev) => {
        // Live inserts may already hold a row from this page.
        const base = readMatchPoolCache(queryKey)?.entry.orders ?? prev;
        const have = new Set(base.map((o) => o.id));
        const next = [
          ...base,
          ...dropRecentlyMatched(page.orders).filter((o) => !have.has(o.id)),
        ];
        writeMatchPoolCache(next, page.nextPageToken, queryKey);
        return next;
      });
      setNextPageToken(page.nextPageToken);
    } catch {
      /* keep current page */
    } finally {
      if (gen === genRef.current) setLoadingMore(false);
    }
  }, [enabled, nextPageToken, loading, loadingMore, queryKey]);

  return {
    orders,
    nextPageToken,
    loading,
    loadingMore,
    error,
    reload: () => reload(),
    loadMore,
  };
}
