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
};

const boardCache = new Map<string, MtdBoardCacheEntry>();

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
  const entry = boardCache.get(key);
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
    Pick<MtdBoardCacheEntry, "records" | "nextPageToken">
) {
  const prev = boardCache.get(key);
  boardCache.set(key, {
    records: patch.records,
    nextPageToken: patch.nextPageToken,
    counts: patch.counts ?? prev?.counts ?? { ...EMPTY_COUNTS_SHAPE },
    updatedAt: Date.now(),
  });
}

/** Drop a poisoned/empty page so the next mount cannot skip a needed refetch. */
export function deleteMtdBoardCache(key: string) {
  boardCache.delete(key);
}

/** Optimistic invoice (etc.) patch across every cached MTD board page. */
export function patchMtdBoardRecordInCaches(
  id: string,
  patch: Partial<MTDRecord>
): void {
  if (!id) return;
  for (const [key, entry] of boardCache) {
    let changed = false;
    const records = entry.records.map((r) => {
      if (
        r.id === id ||
        r.uuid === id ||
        r.orderId === id ||
        r.legacyId === id
      ) {
        changed = true;
        return { ...r, ...patch };
      }
      return r;
    });
    if (changed) {
      boardCache.set(key, { ...entry, records, updatedAt: Date.now() });
    }
  }
}

const countsCache = new Map<
  string,
  { counts: MtdBoardCounts; updatedAt: number }
>();

export function readMtdBoardCountsCache(
  key: string
): { counts: MtdBoardCounts; fresh: boolean } | null {
  const entry = countsCache.get(key);
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
  countsCache.set(key, { counts, updatedAt: Date.now() });
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
