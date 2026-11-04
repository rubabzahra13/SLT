"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeBoardStream } from "@/lib/api/board-stream";
import {
  fetchMtdBoardApi,
  fetchMtdCountsApi,
  type MtdBoardCounts,
  type MtdBoardQuery,
} from "@/lib/api/mtd-board";
import {
  mergeMtdStickyChips,
  mtdActiveChipTotal,
  mtdBoardCountsQueryKey,
  mtdBoardQueryKey,
  MTD_BOARD_PATCH_EVENT,
  type MtdBoardPatchDetail,
  readMtdBoardCache,
  readMtdBoardCountsCache,
  patchMtdBoardCountsOnBoardCache,
  deleteMtdBoardCache,
  writeMtdBoardCache,
  writeMtdBoardCountsCache,
  writeMtdChipCountsCache,
} from "@/lib/mtd-board-cache";
import type { MTDRecord } from "@/types";

/** Coalesce off-page MTD inserts into one background board reload. */
const SSE_OFF_PAGE_RELOAD_MS = 750;

const EMPTY_COUNTS: MtdBoardCounts = {
  all: 0,
  by_form_type: {},
  by_category: {},
  by_cheer_form_subtype: {},
  by_dance_form_subtype: {},
};

/** Keep at most 3 pages in memory (TanStack maxPages pattern). */
const MAX_BOARD_ROWS = 150;

function countsReadyShape(c: MtdBoardCounts | null | undefined): boolean {
  if (!c) return false;
  return (
    c.all > 0 ||
    Object.values(c.by_form_type || {}).some((n) => n > 0) ||
    Object.values(c.by_category || {}).some((n) => n > 0) ||
    Object.values(c.by_cheer_form_subtype || {}).some((n) => n > 0) ||
    Object.values(c.by_dance_form_subtype || {}).some((n) => n > 0)
  );
}

function knownMtdTotal(
  counts: MtdBoardCounts | null | undefined,
  q: {
    formType?: string;
    cheerFormSubtype?: string;
    danceFormSubtype?: string;
  }
): number {
  if (!counts) return 0;
  return mtdActiveChipTotal(counts, {
    formType: q.formType,
    cheerFormSubtype: q.cheerFormSubtype,
    danceFormSubtype: q.danceFormSubtype,
  });
}

function resolveInitialCounts(
  boardKey: string,
  countsKey: string,
  chipKey: string
): { counts: MtdBoardCounts; ready: boolean } {
  const fromCounts = readMtdBoardCountsCache(countsKey);
  if (fromCounts) {
    return {
      counts: mergeMtdStickyChips(fromCounts.counts, chipKey),
      ready: true,
    };
  }
  const board = readMtdBoardCache(boardKey)?.entry;
  if (board?.counts && countsReadyShape(board.counts)) {
    return {
      counts: mergeMtdStickyChips(board.counts, chipKey),
      ready: true,
    };
  }
  return {
    counts: mergeMtdStickyChips(EMPTY_COUNTS, chipKey),
    ready: false,
  };
}

/**
 * Empty board pages are only trusted when the badge says 0.
 * After Move-to-Orders the cache can stay empty while counts still show rows
 * (or the reverse after a return) — never paint that as a finished page.
 */
function trustedMtdHit(
  hit: ReturnType<typeof readMtdBoardCache>,
  knownTotal: number
): NonNullable<ReturnType<typeof readMtdBoardCache>> | null {
  if (!hit) return null;
  if (hit.entry.records.length > 0) {
    // Badge 0 but rows present → distrust (stale sibling / hash collision).
    if (knownTotal === 0) return null;
    return hit;
  }
  // Empty page: only trust when badge is also 0.
  if (knownTotal === 0) return hit;
  return null;
}

/** Warm badge/chip totals only — no board page (nav hover / idle). */
export async function prefetchMtdBoardCounts(
  query: Pick<MtdBoardQuery, "scope" | "search" | "category"> = {}
): Promise<void> {
  const countsKey = mtdBoardCountsQueryKey({
    scope: query.scope,
    search: query.search,
  });
  if (readMtdBoardCountsCache(countsKey)?.fresh) return;
  try {
    const counts = await fetchMtdCountsApi({
      scope: query.scope,
      search: query.search,
      category: query.category,
    });
    writeMtdBoardCountsCache(countsKey, counts);
    writeMtdChipCountsCache(countsKey, counts);
  } catch {
    /* prefetch is best-effort */
  }
}

/** Warm cache for MTD/Payroll so sidebar return is instant. */
export async function prefetchMtdBoard(query: MtdBoardQuery): Promise<void> {
  const key = mtdBoardQueryKey(query);
  const hit = readMtdBoardCache(key);
  if (hit?.fresh && hit.entry.records.length > 0) return;
  const countsKey = mtdBoardCountsQueryKey({
    scope: query.scope,
    search: query.search,
  });
  const countsFresh = readMtdBoardCountsCache(countsKey)?.fresh;
  try {
    const boardPromise = fetchMtdBoardApi({
      ...query,
      pageSize: 50,
      pageToken: null,
    });
    const countsPromise = countsFresh
      ? Promise.resolve(null)
      : fetchMtdCountsApi({
          scope: query.scope,
          search: query.search,
          category: query.category,
        }).catch(() => null);
    const [board, counts] = await Promise.all([boardPromise, countsPromise]);
    // Never cache empty pages that thrash later paints when badge > 0.
    if (board.records.length > 0) {
      // Memory only — session persist is for the painted MTD/Payroll page.
      writeMtdBoardCache(
        key,
        {
          records: board.records,
          nextPageToken: board.nextPageToken,
          ...(counts ? { counts } : {}),
        },
        { persist: false }
      );
    }
    if (counts) {
      writeMtdBoardCountsCache(countsKey, counts);
      writeMtdChipCountsCache(countsKey, counts);
      if (board.records.length > 0) {
        patchMtdBoardCountsOnBoardCache(key, counts);
      }
    }
  } catch {
    /* prefetch is best-effort */
  }
}

export function useMtdBoard(
  query: MtdBoardQuery,
  opts?: { enabled?: boolean }
) {
  const enabled = opts?.enabled !== false;
  const queryKey = mtdBoardQueryKey(query);
  const countsKey = mtdBoardCountsQueryKey({
    scope: query.scope,
    search: query.search,
  });
  // Search skips /counts — Form chips + tab badges stay on unsearched totals.
  const unsearchedCountsKey = (query.search || "").trim()
    ? mtdBoardCountsQueryKey({ scope: query.scope })
    : countsKey;
  const badgeCountsKey = unsearchedCountsKey;
  const chipKey = badgeCountsKey;

  const cached = readMtdBoardCache(queryKey);
  const initial = resolveInitialCounts(queryKey, badgeCountsKey, chipKey);
  const initialKnown = knownMtdTotal(initial.counts, query);
  const initialTrusted =
    cached && cached.entry.records.length > 0
      ? cached
      : cached && initialKnown === 0
        ? cached
        : null;

  const [records, setRecords] = useState<MTDRecord[]>(
    () => initialTrusted?.entry.records ?? []
  );
  const [counts, setCounts] = useState<MtdBoardCounts>(() => initial.counts);
  const [nextPageToken, setNextPageToken] = useState<string | null>(
    () => initialTrusted?.entry.nextPageToken ?? null
  );
  const [loading, setLoading] = useState(() => {
    if (!enabled) return false;
    if (initialTrusted?.entry.records.length) return false;
    // Fresh badge 0 → empty table is correct; no skeleton.
    if (initial.ready && initialKnown === 0) return false;
    // Cold or empty-with-badge>0 → fetch (show skeleton).
    return true;
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [countsReady, setCountsReady] = useState(() => initial.ready);
  const genRef = useRef(0);
  const pageIdsRef = useRef<Set<string>>(
    new Set((initialTrusted?.entry.records ?? []).map((r) => r.id))
  );
  const lastGoodCountsRef = useRef<MtdBoardCounts | null>(
    initial.ready ? initial.counts : null
  );
  const prevKeyRef = useRef(queryKey);
  const prevCountsKeyRef = useRef(badgeCountsKey);
  const offPageReloadTimerRef = useRef<number | null>(null);
  const paintedRef = useRef(
    Boolean(initialTrusted?.entry.records.length)
  );
  const reloadRef = useRef<
    (opts?: { background?: boolean; forceCounts?: boolean }) => Promise<void>
  >(async () => undefined);

  // Render-phase sync: apply warm cache before paint (Orders pattern).
  const [paintKey, setPaintKey] = useState(queryKey);
  if (paintKey !== queryKey) {
    const prevQ = JSON.parse(paintKey) as MtdBoardQuery;
    setPaintKey(queryKey);
    const hit = readMtdBoardCache(queryKey);
    const q = JSON.parse(queryKey) as MtdBoardQuery;
    const countsHit = readMtdBoardCountsCache(badgeCountsKey);
    const knownTotal = knownMtdTotal(
      countsHit?.counts ?? lastGoodCountsRef.current,
      q
    );
    const searching = Boolean((q.search || "").trim());
    const wasSearching = Boolean((prevQ.search || "").trim());
    const searchOnlyChange =
      (prevQ.search || "") !== (q.search || "") &&
      (prevQ.formType || "") === (q.formType || "") &&
      (prevQ.cheerFormSubtype || "") === (q.cheerFormSubtype || "") &&
      (prevQ.scope || "live") === (q.scope || "live");
    const trusted = trustedMtdHit(hit, knownTotal);

    if (trusted && trusted.entry.records.length > 0) {
      setRecords(trusted.entry.records);
      setNextPageToken(trusted.entry.nextPageToken);
      pageIdsRef.current = new Set(trusted.entry.records.map((r) => r.id));
      paintedRef.current = true;
      setLoading(false);
    } else if (knownTotal === 0 && !searching && !searchOnlyChange) {
      setRecords([]);
      setNextPageToken(null);
      pageIdsRef.current = new Set();
      setLoading(false);
    } else if (wasSearching && !searching) {
      // Cleared search: drop search hits; restore full board via fetch.
      setRecords([]);
      setNextPageToken(null);
      pageIdsRef.current = new Set();
      paintedRef.current = false;
      setLoading(knownTotal !== 0);
    } else if (
      paintedRef.current &&
      (searching || searchOnlyChange)
    ) {
      // Typing search: keep rows — client filters instantly.
      setLoading(false);
    } else {
      setRecords([]);
      setNextPageToken(null);
      pageIdsRef.current = new Set();
      paintedRef.current = false;
      // Skeleton when badge says rows exist (empty table + "0 of 1" looks broken).
      setLoading(knownTotal !== 0 || !countsHit);
    }
  }

  useEffect(() => {
    if (prevKeyRef.current === queryKey) return;
    const prevKey = prevKeyRef.current;
    prevKeyRef.current = queryKey;
    const hit = readMtdBoardCache(queryKey);
    const next = resolveInitialCounts(queryKey, badgeCountsKey, chipKey);
    if (next.ready) {
      setCounts(next.counts);
      lastGoodCountsRef.current = next.counts;
      setCountsReady(true);
    } else if (
      prevCountsKeyRef.current === badgeCountsKey &&
      lastGoodCountsRef.current
    ) {
      setCounts(mergeMtdStickyChips(lastGoodCountsRef.current, chipKey));
      setCountsReady(true);
    } else {
      const merged = mergeMtdStickyChips(EMPTY_COUNTS, chipKey);
      setCounts(merged);
      const hasChips = Object.keys(merged.by_form_type || {}).length > 0;
      setCountsReady(hasChips);
    }
    prevCountsKeyRef.current = badgeCountsKey;

    setLoadingMore(false);

    const q = JSON.parse(queryKey) as MtdBoardQuery;
    const prevQ = (() => {
      try {
        return JSON.parse(prevKey) as MtdBoardQuery;
      } catch {
        return {} as MtdBoardQuery;
      }
    })();
    const searching = Boolean((q.search || "").trim());
    const wasSearching = Boolean((prevQ.search || "").trim());
    const searchOnlyChange =
      (prevQ.search || "") !== (q.search || "") &&
      (prevQ.formType || "") === (q.formType || "") &&
      (prevQ.cheerFormSubtype || "") === (q.cheerFormSubtype || "") &&
      (prevQ.scope || "live") === (q.scope || "live");
    const knownTotal = knownMtdTotal(
      lastGoodCountsRef.current ?? next.counts,
      q
    );
    const trusted = trustedMtdHit(hit, knownTotal);

    // Drop poisoned empty pages from memory so a later remount cannot skip fetch.
    if (hit && !trusted) {
      deleteMtdBoardCache(queryKey);
    }

    if (trusted && trusted.entry.records.length > 0) {
      setRecords(trusted.entry.records);
      setNextPageToken(trusted.entry.nextPageToken);
      pageIdsRef.current = new Set(trusted.entry.records.map((r) => r.id));
      paintedRef.current = true;
      setLoading(false);
      if (!searching && !searchOnlyChange) return;
    }

    if (!trusted) {
      setNextPageToken(null);
    }

    if (knownTotal === 0 && !searching) {
      setRecords([]);
      pageIdsRef.current = new Set();
      setLoading(false);
      return;
    }

    if (wasSearching && !searching && !trusted) {
      setRecords([]);
      pageIdsRef.current = new Set();
      paintedRef.current = false;
      setLoading(knownTotal !== 0);
    } else if (searching || searchOnlyChange || paintedRef.current) {
      setLoading(false);
    } else if (!trusted) {
      setRecords([]);
      pageIdsRef.current = new Set();
      paintedRef.current = false;
      setLoading(knownTotal !== 0);
    }
  }, [queryKey, badgeCountsKey, chipKey]);

  const reload = useCallback(
    async (opts?: { background?: boolean; forceCounts?: boolean }) => {
      if (!enabled) {
        setLoading(false);
        return;
      }
      const gen = ++genRef.current;
      const cachedNow = readMtdBoardCache(queryKey);
      const q = JSON.parse(queryKey) as MtdBoardQuery;
      const knownTotal = knownMtdTotal(lastGoodCountsRef.current, q);
      const forceCounts = Boolean(opts?.forceCounts);
      const cachedScoped =
        cachedNow && cachedNow.entry.records.length > 0 ? cachedNow : null;
      const hasPaintedRows = pageIdsRef.current.size > 0;
      const searching = Boolean(q.search?.trim());
      // Silent refresh when rows are on screen, badge is 0, or searching
      // (client already filtered — never skeleton-block on slow search).
      const background =
        searching ||
        (Boolean(opts?.background) && hasPaintedRows) ||
        hasPaintedRows ||
        Boolean(cachedScoped) ||
        knownTotal === 0;
      if (!background) setLoading(true);
      else setLoading(false);

      // Badge/chip totals never include search — keep Form chips sticky.
      const cKey = mtdBoardCountsQueryKey({ scope: q.scope });
      const countsHit = readMtdBoardCountsCache(cKey);
      // Search typing: board rows matter; full /counts is the slow path.
      const skipCountsForSearch =
        Boolean(q.search?.trim()) && !forceCounts;
      // Counts are form/subtype-agnostic — never pass form filters or search.
      const countsPromise =
        skipCountsForSearch ||
        (background && countsHit?.fresh && !forceCounts)
          ? Promise.resolve(null)
          : fetchMtdCountsApi({
              scope: q.scope,
              category: q.category,
            }).catch(() => null);

      // Badge 0 is only trusted while counts are fresh.
      const trustEmptyZero =
        knownTotal === 0 && Boolean(countsHit?.fresh) && !forceCounts;

      const paintBoard = async () => {
        try {
          const board = await fetchMtdBoardApi({
            ...q,
            pageSize: 50,
            pageToken: null,
          });
          if (gen !== genRef.current) return;
          setRecords(board.records);
          pageIdsRef.current = new Set(board.records.map((r) => r.id));
          setNextPageToken(board.nextPageToken);
          paintedRef.current = true;
          writeMtdBoardCache(queryKey, {
            records: board.records,
            nextPageToken: board.nextPageToken,
          });
          if (gen === genRef.current) setLoading(false);
        } catch {
          if (gen !== genRef.current) return;
          // Keep prior rows on transient failure.
          if (gen === genRef.current) setLoading(false);
        }
      };

      if (trustEmptyZero) {
        setRecords([]);
        pageIdsRef.current = new Set();
        setNextPageToken(null);
        writeMtdBoardCache(queryKey, {
          records: [],
          nextPageToken: null,
        });
        if (gen === genRef.current) setLoading(false);
      } else {
        await paintBoard();
      }

      const boardCounts = await countsPromise;
      if (!boardCounts || gen !== genRef.current) return;
      writeMtdChipCountsCache(cKey, boardCounts);
      const merged = mergeMtdStickyChips(boardCounts, cKey);
      setCounts(merged);
      lastGoodCountsRef.current = merged;
      setCountsReady(true);
      writeMtdBoardCountsCache(cKey, boardCounts);
      patchMtdBoardCountsOnBoardCache(queryKey, boardCounts);
      // Took the empty shortcut on a stale 0 — refill if recount says rows exist.
      if (trustEmptyZero) {
        const nextTotal = knownMtdTotal(boardCounts, q);
        if (nextTotal > 0) {
          await paintBoard();
        }
      }
    },
    [queryKey, enabled]
  );

  reloadRef.current = reload;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const q = JSON.parse(queryKey) as MtdBoardQuery;
    const countsHit = readMtdBoardCountsCache(badgeCountsKey);
    const next = resolveInitialCounts(queryKey, badgeCountsKey, chipKey);
    const countsForBadge = next.ready
      ? next.counts
      : countsHit?.counts ?? lastGoodCountsRef.current;
    const knownTotal = knownMtdTotal(countsForBadge, q);
    const hit = readMtdBoardCache(queryKey);
    const trusted = trustedMtdHit(hit, knownTotal);

    if (hit && !trusted) {
      deleteMtdBoardCache(queryKey);
    }

    if (trusted && trusted.entry.records.length > 0) {
      setRecords(trusted.entry.records);
      if (next.ready) {
        setCounts(next.counts);
        lastGoodCountsRef.current = next.counts;
        setCountsReady(true);
      } else if (lastGoodCountsRef.current) {
        setCounts(mergeMtdStickyChips(lastGoodCountsRef.current, chipKey));
        setCountsReady(true);
      }
      setNextPageToken(trusted.entry.nextPageToken);
      pageIdsRef.current = new Set(trusted.entry.records.map((r) => r.id));
      paintedRef.current = true;
      setLoading(false);
      // Fresh non-empty cache → paint only. Live sync is SSE.
      if (trusted.fresh && countsHit?.fresh) return;
      const t = window.setTimeout(() => {
        void reload({
          background: true,
          forceCounts: !countsHit?.fresh,
        });
      }, 0);
      return () => window.clearTimeout(t);
    }

    // Board cold / empty-but-badge>0 — still paint badge counts if we have them.
    if (countsHit) {
      const merged = mergeMtdStickyChips(countsHit.counts, chipKey);
      setCounts(merged);
      lastGoodCountsRef.current = merged;
      setCountsReady(true);
    } else if (lastGoodCountsRef.current) {
      setCounts(mergeMtdStickyChips(lastGoodCountsRef.current, chipKey));
      setCountsReady(true);
    } else {
      setCounts(mergeMtdStickyChips(EMPTY_COUNTS, chipKey));
      setCountsReady(false);
    }

    // Fresh badge 0 → empty now. Stale 0 must recount + fetch.
    if (knownTotal === 0 && countsHit?.fresh) {
      setRecords([]);
      pageIdsRef.current = new Set();
      setNextPageToken(null);
      setLoading(false);
      return;
    }

    // Search is debounced on the page; fetch immediately here. Keep rows on
    // screen while searching (background) so typing doesn't feel stuck.
    const searching = Boolean(q.search?.trim());
    const t = window.setTimeout(() => {
      void reload({
        background: paintedRef.current || knownTotal === 0 || searching,
        forceCounts: !searching && (!countsHit?.fresh || knownTotal === 0),
      });
    }, 0);
    return () => window.clearTimeout(t);
  }, [reload, query.search, queryKey, badgeCountsKey, chipKey, enabled]);

  const loadMore = useCallback(async () => {
    if (!enabled || !nextPageToken || loading || loadingMore) return;
    const gen = genRef.current;
    setLoadingMore(true);
    try {
      const q = JSON.parse(queryKey) as MtdBoardQuery;
      const board = await fetchMtdBoardApi({
        ...q,
        pageSize: 50,
        pageToken: nextPageToken,
      });
      if (gen !== genRef.current) return;
      setRecords((prev) => {
        const next = [...prev, ...board.records].slice(-MAX_BOARD_ROWS);
        pageIdsRef.current = new Set(next.map((r) => r.id));
        writeMtdBoardCache(queryKey, {
          records: next,
          nextPageToken: board.nextPageToken,
        });
        return next;
      });
      setNextPageToken(board.nextPageToken);
    } catch {
      /* keep current */
    } finally {
      if (gen === genRef.current) setLoadingMore(false);
    }
  }, [enabled, nextPageToken, loading, loadingMore, queryKey]);

  // Optimistic patches from updateMTD / Move-to-Orders / Move-to-Payroll.
  useEffect(() => {
    if (!enabled) return;
    const onPatch = (ev: Event) => {
      const detail = (ev as CustomEvent<MtdBoardPatchDetail>).detail;
      if (!detail?.id) return;
      const scope = (() => {
        try {
          return (
            (JSON.parse(queryKey) as MtdBoardQuery).scope || "live"
          ).toLowerCase();
        } catch {
          return "live";
        }
      })();
      const isPayrollBoard = scope === "payroll";
      const isArchiveBoard = scope === "archive";
      const isMusicBoard =
        !isPayrollBoard && !isArchiveBoard;
      const match = (r: MTDRecord) =>
        r.id === detail.id ||
        r.uuid === detail.id ||
        r.orderId === detail.id ||
        r.legacyId === detail.id;
      // Leave music board on Move-to-Orders or Move-to-Payroll.
      const leaveMusic =
        isMusicBoard &&
        (detail.removed ||
          detail.patch.inMTD === false ||
          detail.patch.inPayroll === true);
      // Leave unpaid payroll when marked paid / returned to MTD.
      const leavePayroll =
        isPayrollBoard &&
        (Boolean(detail.patch.paidAt) || detail.patch.inPayroll === false);
      setRecords((prev) => {
        if (leaveMusic || leavePayroll) {
          if (!prev.some(match)) return prev;
          const next = prev.filter((r) => !match(r));
          pageIdsRef.current = new Set(next.map((r) => r.id));
          writeMtdBoardCache(queryKey, {
            records: next,
            nextPageToken:
              readMtdBoardCache(queryKey)?.entry.nextPageToken ?? null,
          });
          return next;
        }
        if (!prev.some(match)) return prev;
        const next = prev.map((r) =>
          match(r) ? { ...r, ...detail.patch } : r
        );
        pageIdsRef.current = new Set(next.map((r) => r.id));
        writeMtdBoardCache(queryKey, {
          records: next,
          nextPageToken:
            readMtdBoardCache(queryKey)?.entry.nextPageToken ?? null,
        });
        return next;
      });
      // Do not reload here — a premature /mtd/board would resurrect the row
      // and burn egress. SSE schedules a deferred counts catch-up.
    };
    window.addEventListener(MTD_BOARD_PATCH_EVENT, onPatch);
    return () => window.removeEventListener(MTD_BOARD_PATCH_EVENT, onPatch);
  }, [enabled, queryKey]);

  // SSE-first: patch rows in place; full reload only on stream reconnect or
  // off-page inserts that need board/count catch-up. No focus poll.
  useEffect(() => {
    if (!enabled) return;
    const ac = new AbortController();

    const scheduleOffPageReload = (opts?: { forceCounts?: boolean }) => {
      if (offPageReloadTimerRef.current != null) {
        window.clearTimeout(offPageReloadTimerRef.current);
      }
      offPageReloadTimerRef.current = window.setTimeout(() => {
        offPageReloadTimerRef.current = null;
        void reloadRef.current({
          background: true,
          forceCounts: Boolean(opts?.forceCounts),
        });
      }, SSE_OFF_PAGE_RELOAD_MS);
    };

    void subscribeBoardStream((event) => {
      if (event.type === "ready") {
        if (event.reconnect) {
          // Match Orders: board catch-up only — don't force /mtd/counts every
          // stream drop (Orders↔MTD remounts recreate the stream often).
          void reloadRef.current({ background: true });
        }
        return;
      }
      if (event.type !== "mtd.updated") return;
      const id = event.record.id;
      const scope = (() => {
        try {
          return (
            (JSON.parse(queryKey) as MtdBoardQuery).scope || "live"
          ).toLowerCase();
        } catch {
          return "live";
        }
      })();
      const isPayrollBoard = scope === "payroll";
      const isMusicBoard = scope !== "payroll" && scope !== "archive";
      const inPayroll =
        event.record.inPayroll === true ||
        (event.record as { in_payroll?: boolean }).in_payroll === true;
      const leftMusic =
        event.record.inMTD === false ||
        (event.record as { in_mtd?: boolean }).in_mtd === false ||
        inPayroll;
      const leftPayroll =
        Boolean(event.record.paidAt) ||
        event.record.inPayroll === false ||
        (event.record as { in_payroll?: boolean }).in_payroll === false;
      if (pageIdsRef.current.has(id)) {
        setRecords((prev) => {
          const drop =
            (isMusicBoard && leftMusic) || (isPayrollBoard && leftPayroll);
          const next = drop
            ? prev.filter((r) => r.id !== id)
            : prev.map((r) =>
                r.id === id ? { ...r, ...event.record } : r
              );
          pageIdsRef.current = new Set(next.map((r) => r.id));
          writeMtdBoardCache(queryKey, {
            records: next,
            nextPageToken:
              readMtdBoardCache(queryKey)?.entry.nextPageToken ?? null,
          });
          return next;
        });
        // Membership change — recount chips once (not on every field patch).
        if ((isMusicBoard && leftMusic) || (isPayrollBoard && leftPayroll)) {
          scheduleOffPageReload({ forceCounts: true });
        }
        return;
      }
      // Entered this board off-page — one deferred board+counts fetch.
      const enteredMusic =
        isMusicBoard &&
        (event.record.inMTD === true ||
          (event.record as { in_mtd?: boolean }).in_mtd === true) &&
        !inPayroll;
      const enteredPayroll = isPayrollBoard && inPayroll && !event.record.paidAt;
      if (enteredMusic || enteredPayroll) {
        scheduleOffPageReload({ forceCounts: true });
      }
      // Other off-page field noise: ignore — no board/counts refetch (egress).
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
    records,
    counts,
    nextPageToken,
    loading: enabled ? loading : false,
    loadingMore: enabled ? loadingMore : false,
    countsReady,
    reload: () => reload({ forceCounts: true }),
    loadMore,
    setRecords,
  };
}
