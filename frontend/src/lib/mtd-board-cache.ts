import type { MtdBoardCounts } from "@/lib/api/mtd-board";
import type { MTDRecord } from "@/types";

/** Align with Orders: 90s fresh; live updates come from SSE. */
export const MTD_BOARD_STALE_MS = 90_000;
export const MTD_BOARD_GC_MS = 5 * 60_000;

export type MtdBoardCacheEntry = {
  records: MTDRecord[];
  nextPageToken: string | null;
  counts: MtdBoardCounts;
  updatedAt: number;
  /** Full query key — rejects sessionStorage hash collisions on read. */
  queryKey?: string;
};

const boardCache = new Map<string, MtdBoardCacheEntry>();

const MTD_BOARD_SS_PREFIX = "slt_mtd_board_v1:";
const MTD_COUNTS_SS_PREFIX = "slt_mtd_counts_v1:";
const MTD_SS_MAX = 6;

type SsIndexEntry = { key: string; n: number; at: number };

function ssKey(prefix: string, key: string): string {
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

function touchMtdSessionIndex(
  prefix: string,
  storageKey: string,
  orderCount: number,
  max: number
): void {
  const indexKey = `${prefix}index`;
  const raw = readSessionJson<SsIndexEntry[]>(indexKey) || [];
  const next: SsIndexEntry[] = [
    { key: storageKey, n: orderCount, at: Date.now() },
    ...raw.filter((e) => e.key !== storageKey),
  ];
  while (next.length > max) {
    const dropped = next.pop();
    if (dropped) sessionStorage.removeItem(dropped.key);
  }
  sessionStorage.setItem(indexKey, JSON.stringify(next));
}

function writeMtdBoardSession(
  storageKey: string,
  entry: MtdBoardCacheEntry
): void {
  if (typeof window === "undefined") return;
  if (!entry.records.length) return;
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(entry));
    touchMtdSessionIndex(
      MTD_BOARD_SS_PREFIX,
      storageKey,
      entry.records.length,
      MTD_SS_MAX
    );
  } catch {
    /* quota */
  }
}

function gc(now = Date.now()) {
  for (const [key, entry] of boardCache) {
    if (now - entry.updatedAt > MTD_BOARD_GC_MS) boardCache.delete(key);
  }
}

export function mtdBoardQueryKey(query: {
  scope?: string;
  formType?: string;
  cheerFormSubtype?: string;
  category?: string;
  search?: string;
  status?: string;
}): string {
  return JSON.stringify({
    scope: query.scope ?? "live",
    formType: query.formType ?? "",
    cheerFormSubtype: query.cheerFormSubtype ?? "",
    category: query.category ?? "",
    search: query.search ?? "",
    status: query.status ?? "",
  });
}

/**
 * Counts are form/subtype-agnostic (chips + totals come from one scan).
 * Same key as chips so Cheer↔Dance does not re-hit /mtd/counts.
 */
export function mtdBoardChipCountsQueryKey(query: {
  scope?: string;
  search?: string;
}): string {
  return JSON.stringify({
    scope: query.scope ?? "live",
    search: query.search ?? "",
  });
}

export function mtdBoardCountsQueryKey(query: {
  scope?: string;
  search?: string;
}): string {
  return mtdBoardChipCountsQueryKey(query);
}

/** Active form/subtype total for pager badges (from sticky server chips). */
export function mtdActiveChipTotal(
  counts: MtdBoardCounts,
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

export function readMtdBoardCache(
  key: string
): { entry: MtdBoardCacheEntry; fresh: boolean } | null {
  gc();
  let entry = boardCache.get(key);
  if (!entry) {
    const persisted = readSessionJson<MtdBoardCacheEntry>(
      ssKey(MTD_BOARD_SS_PREFIX, key)
    );
    if (
      persisted?.records &&
      Array.isArray(persisted.records) &&
      Date.now() - (persisted.updatedAt || 0) <= MTD_BOARD_GC_MS &&
      persisted.queryKey === key
    ) {
      // Session is last-visit paint — soft-refresh on open.
      entry = { ...persisted, updatedAt: persisted.updatedAt };
      boardCache.set(key, entry);
    }
  }
  if (!entry) return null;
  return {
    entry,
    fresh: Date.now() - entry.updatedAt < MTD_BOARD_STALE_MS,
  };
}

const EMPTY_COUNTS_SHAPE: MtdBoardCounts = {
  all: 0,
  by_form_type: {},
  by_category: {},
  by_cheer_form_subtype: {},
  by_dance_form_subtype: {},
};

export function writeMtdBoardCache(
  key: string,
  patch: Partial<MtdBoardCacheEntry> &
    Pick<MtdBoardCacheEntry, "records" | "nextPageToken">,
  opts?: { persist?: boolean }
) {
  const prev = boardCache.get(key);
  const entry: MtdBoardCacheEntry = {
    records: patch.records,
    nextPageToken: patch.nextPageToken,
    counts: patch.counts ?? prev?.counts ?? { ...EMPTY_COUNTS_SHAPE },
    updatedAt: Date.now(),
    queryKey: key,
  };
  boardCache.set(key, entry);
  // Default persist so sidebar return / reload paints instantly (Orders pattern).
  // Prefetch can pass persist:false so empty siblings do not thrash slots.
  if (opts?.persist !== false) {
    writeMtdBoardSession(ssKey(MTD_BOARD_SS_PREFIX, key), entry);
  }
}

/** Drop a poisoned/empty page so the next mount cannot skip a needed refetch. */
export function deleteMtdBoardCache(key: string) {
  boardCache.delete(key);
}

function mtdRowMatchesId(r: MTDRecord, id: string): boolean {
  return (
    r.id === id ||
    r.uuid === id ||
    r.orderId === id ||
    r.legacyId === id
  );
}

/** Same pattern as ORDERS_BOARD_PATCH_EVENT — keep useMtdBoard React state in sync. */
export const MTD_BOARD_PATCH_EVENT = "slt-mtd-board-patch";

export type MtdBoardPatchDetail = {
  id: string;
  patch: Partial<MTDRecord>;
  /** True when the row left the live MTD board (Move to Orders). */
  removed: boolean;
};

function mtdCacheScope(key: string): string {
  try {
    return (
      (JSON.parse(key) as { scope?: string }).scope || "live"
    ).toLowerCase();
  } catch {
    return "live";
  }
}

/** Music-to-do board pages (not unpaid payroll / paid archive). */
function isMusicBoardScope(scope: string): boolean {
  return scope === "board" || scope === "live" || scope === "all" || !scope;
}

/**
 * Optimistic invoice / status / Move-to-Orders / Move-to-Payroll patch.
 * Leaves music-board caches on inMTD:false or inPayroll:true (same ghost-row
 * class as Move to Orders).
 */
export function patchMtdBoardRecordInCaches(
  id: string,
  patch: Partial<MTDRecord>
): void {
  if (!id) return;
  const leftMusicBoard =
    patch.inMTD === false || patch.inPayroll === true;
  let anyChanged = false;
  for (const [key, entry] of boardCache) {
    const scope = mtdCacheScope(key);
    let changed = false;
    let records = entry.records;

    if (leftMusicBoard && isMusicBoardScope(scope)) {
      records = entry.records.filter((r) => {
        if (!mtdRowMatchesId(r, id)) return true;
        changed = true;
        return false;
      });
    } else if (leftMusicBoard && scope === "payroll") {
      // Keep payroll pages in sync so sidebar→Payroll paints the new row.
      records = entry.records.map((r) => {
        if (!mtdRowMatchesId(r, id)) return r;
        changed = true;
        return { ...r, ...patch };
      });
    } else if (!leftMusicBoard) {
      records = entry.records.map((r) => {
        if (!mtdRowMatchesId(r, id)) return r;
        changed = true;
        return { ...r, ...patch };
      });
    }

    if (changed) {
      anyChanged = true;
      const next: MtdBoardCacheEntry = {
        ...entry,
        records,
        updatedAt: Date.now(),
        queryKey: entry.queryKey ?? key,
      };
      boardCache.set(key, next);
      // Session must drop the row too — remount otherwise resurrects it.
      const storageKey = ssKey(MTD_BOARD_SS_PREFIX, key);
      if (records.length === 0) {
        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          /* ignore */
        }
      } else {
        writeMtdBoardSession(storageKey, next);
      }
    }
  }
  if (typeof window === "undefined") return;
  if (!anyChanged && !leftMusicBoard) return;
  window.dispatchEvent(
    new CustomEvent<MtdBoardPatchDetail>(MTD_BOARD_PATCH_EVENT, {
      detail: { id, patch, removed: leftMusicBoard },
    })
  );
}

const countsCache = new Map<
  string,
  { counts: MtdBoardCounts; updatedAt: number }
>();

export function readMtdBoardCountsCache(
  key: string
): { counts: MtdBoardCounts; fresh: boolean } | null {
  let entry = countsCache.get(key);
  if (!entry) {
    const persisted = readSessionJson<{
      counts: MtdBoardCounts;
      updatedAt: number;
    }>(ssKey(MTD_COUNTS_SS_PREFIX, key));
    if (
      persisted?.counts &&
      Date.now() - (persisted.updatedAt || 0) <= MTD_BOARD_GC_MS
    ) {
      countsCache.set(key, persisted);
      entry = persisted;
    }
  }
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > MTD_BOARD_GC_MS) {
    countsCache.delete(key);
    return null;
  }
  return {
    counts: entry.counts,
    fresh: Date.now() - entry.updatedAt < MTD_BOARD_STALE_MS,
  };
}

export function writeMtdBoardCountsCache(key: string, counts: MtdBoardCounts) {
  const entry = { counts, updatedAt: Date.now() };
  countsCache.set(key, entry);
  if (typeof window === "undefined") return;
  try {
    const storageKey = ssKey(MTD_COUNTS_SS_PREFIX, key);
    sessionStorage.setItem(storageKey, JSON.stringify(entry));
    touchMtdSessionIndex(MTD_COUNTS_SS_PREFIX, storageKey, 1, MTD_SS_MAX);
  } catch {
    /* quota */
  }
}

export function patchMtdBoardCountsOnBoardCache(
  boardKey: string,
  counts: MtdBoardCounts
) {
  const prev = boardCache.get(boardKey);
  if (!prev) return;
  boardCache.set(boardKey, { ...prev, counts, updatedAt: Date.now() });
}

export type MtdBoardChipCounts = {
  by_form_type: Record<string, number>;
  by_cheer_form_subtype: Record<string, number>;
  by_dance_form_subtype: Record<string, number>;
};

const chipCache = new Map<
  string,
  { chips: MtdBoardChipCounts; updatedAt: number }
>();

function chipCountsFromBoard(
  counts: MtdBoardCounts
): MtdBoardChipCounts | null {
  const byForm = counts.by_form_type || {};
  if (Object.keys(byForm).length === 0) return null;
  return {
    by_form_type: { ...byForm },
    by_cheer_form_subtype: { ...(counts.by_cheer_form_subtype || {}) },
    by_dance_form_subtype: { ...(counts.by_dance_form_subtype || {}) },
  };
}

export function writeMtdChipCountsCache(
  chipKey: string,
  counts: MtdBoardCounts
) {
  const chips = chipCountsFromBoard(counts);
  if (!chips) return;
  chipCache.set(chipKey, { chips, updatedAt: Date.now() });
}

export function readMtdChipCountsCache(
  chipKey: string
): MtdBoardChipCounts | null {
  const entry = chipCache.get(chipKey);
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > MTD_BOARD_GC_MS) {
    chipCache.delete(chipKey);
    return null;
  }
  return entry.chips;
}

/** Overlay sticky Form/subtype chips when the active tab's counts lack them. */
export function mergeMtdStickyChips(
  counts: MtdBoardCounts,
  chipKey: string
): MtdBoardCounts {
  const chips = readMtdChipCountsCache(chipKey);
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
