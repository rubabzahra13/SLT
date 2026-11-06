import type { MtdBoardCounts } from "@/lib/api/mtd-board";
import type { MTDRecord } from "@/types";

/** Align with Orders: 90s fresh; live updates come from SSE. */
export const MTD_BOARD_STALE_MS = 90_000;
export const MTD_BOARD_GC_MS = 5 * 60_000;
/**
 * Payroll Archive has no badge/counts and changes rarely (Mark Paid / Delete).
 * Keep the page sticky for a work session so tab flips don't burn egress.
 */
export const MTD_ARCHIVE_GC_MS = 12 * 60 * 60_000;

function mtdCacheScopeFromKey(key: string): string {
  try {
    return String(
      (JSON.parse(key) as { scope?: string }).scope || "live"
    ).toLowerCase();
  } catch {
    return "live";
  }
}

export function isMtdArchiveCacheKey(key: string): boolean {
  return mtdCacheScopeFromKey(key) === "archive";
}

function mtdBoardGcMsForKey(key: string): number {
  return isMtdArchiveCacheKey(key) ? MTD_ARCHIVE_GC_MS : MTD_BOARD_GC_MS;
}

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
    if (now - entry.updatedAt > mtdBoardGcMsForKey(key)) boardCache.delete(key);
  }
}

export function mtdBoardQueryKey(query: {
  scope?: string;
  formType?: string;
  cheerFormSubtype?: string;
  category?: string;
  search?: string;
  status?: string;
  createdAfter?: string;
  createdBefore?: string;
}): string {
  return JSON.stringify({
    scope: query.scope ?? "live",
    formType: query.formType ?? "",
    cheerFormSubtype: query.cheerFormSubtype ?? "",
    category: query.category ?? "",
    search: query.search ?? "",
    status: query.status ?? "",
    createdAfter: query.createdAfter ?? "",
    createdBefore: query.createdBefore ?? "",
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
      Date.now() - (persisted.updatedAt || 0) <= mtdBoardGcMsForKey(key) &&
      persisted.queryKey === key
    ) {
      // Session is last-visit paint — soft-refresh on open (Archive stays sticky).
      entry = { ...persisted, updatedAt: persisted.updatedAt };
      boardCache.set(key, entry);
    }
  }
  if (!entry) return null;
  const archive = isMtdArchiveCacheKey(key);
  return {
    entry,
    // Archive: treat in-session pages as fresh — tab flips must not refetch.
    fresh:
      archive || Date.now() - entry.updatedAt < MTD_BOARD_STALE_MS,
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

/** True when two MTD payloads are the same mix (any shared id / order / uuid). */
export function mtdRecordsReferToSame(
  a: Pick<MTDRecord, "id" | "uuid" | "orderId" | "legacyId">,
  b: Pick<MTDRecord, "id" | "uuid" | "orderId" | "legacyId">
): boolean {
  const aKeys = [a.id, a.uuid, a.orderId, a.legacyId].filter(
    (value): value is string => Boolean(value)
  );
  const bKeys = new Set(
    [b.id, b.uuid, b.orderId, b.legacyId].filter(
      (value): value is string => Boolean(value)
    )
  );
  return aKeys.some((key) => bKeys.has(key));
}

/** Find a cached row by patch id OR by the merged record's identities. */
function findMtdRowIndex(
  records: MTDRecord[],
  id: string,
  merged?: MTDRecord | null
): number {
  const byId = records.findIndex((r) => mtdRowMatchesId(r, id));
  if (byId >= 0) return byId;
  if (!merged) return -1;
  return records.findIndex((r) => mtdRecordsReferToSame(r, merged));
}

/** Deduped MTD/payroll rows currently in board caches (for VO program lists). */
export function collectMtdBoardCachedRecords(): MTDRecord[] {
  const byId = new Map<string, MTDRecord>();
  for (const entry of boardCache.values()) {
    for (const rec of entry.records) {
      if (!rec?.id || byId.has(rec.id)) continue;
      byId.set(rec.id, rec);
    }
  }
  return [...byId.values()];
}

/**
 * Hard-remove MTD/payroll rows from every board/archive/payroll cache page.
 * Call when an order or MTD record is deleted so pickers cannot keep ghosts.
 */
export function removeMtdBoardRecordsFromCaches(ids: string[]): void {
  const idSet = new Set(ids.filter(Boolean));
  if (idSet.size === 0) return;

  let anyChanged = false;
  const removedIds: string[] = [];
  // Payroll badge only — Archive has no count to shift.
  let payrollBumpRow:
    | Pick<MTDRecord, "formType" | "cheerFormSubtype" | "danceFormSubtype">
    | null = null;

  for (const [key, entry] of boardCache) {
    let changed = false;
    const scope = mtdCacheScope(key);
    const records = entry.records.filter((r) => {
      for (const id of idSet) {
        if (mtdRowMatchesId(r, id)) {
          changed = true;
          if (!removedIds.includes(r.id)) removedIds.push(r.id);
          if (scope === "payroll" && !payrollBumpRow) {
            payrollBumpRow = {
              formType: r.formType,
              cheerFormSubtype: r.cheerFormSubtype,
              danceFormSubtype: r.danceFormSubtype,
            };
          }
          noteLocalMtdWrite(r.id, r.uuid, r.orderId, r.legacyId);
          return false;
        }
      }
      return true;
    });
    if (!changed) continue;
    anyChanged = true;
    const next: MtdBoardCacheEntry = {
      ...entry,
      records,
      updatedAt: Date.now(),
      queryKey: entry.queryKey ?? key,
    };
    boardCache.set(key, next);
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

  if (payrollBumpRow) {
    bumpScopeCountsCache("payroll", -1, payrollBumpRow);
  }

  if (typeof window === "undefined" || !anyChanged) return;
  for (const id of removedIds) {
    window.dispatchEvent(
      new CustomEvent<MtdBoardPatchDetail>(MTD_BOARD_PATCH_EVENT, {
        detail: { id, patch: {}, removed: true },
      })
    );
  }
}

/** Same pattern as ORDERS_BOARD_PATCH_EVENT — keep useMtdBoard React state in sync. */
export const MTD_BOARD_PATCH_EVENT = "slt-mtd-board-patch";

export type MtdBoardPatchDetail = {
  id: string;
  patch: Partial<MTDRecord>;
  /** True when the row left the live MTD / unpaid payroll board. */
  removed: boolean;
  /** Full merged row when entering a board (e.g. Mark Paid → archive). */
  record?: MTDRecord;
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

/** Don't drop a Cheer row into a Dance (or mismatched subtype) cache key. */
function mtdCacheKeyMatchesRow(
  key: string,
  row: Pick<MTDRecord, "formType" | "cheerFormSubtype" | "danceFormSubtype">
): boolean {
  try {
    const q = JSON.parse(key) as {
      formType?: string;
      cheerFormSubtype?: string;
      danceFormSubtype?: string;
    };
    if (q.formType && row.formType && q.formType !== row.formType) {
      return false;
    }
    if (
      q.cheerFormSubtype &&
      row.cheerFormSubtype &&
      q.cheerFormSubtype !== "all" &&
      q.cheerFormSubtype !== row.cheerFormSubtype
    ) {
      return false;
    }
    if (
      q.danceFormSubtype &&
      row.danceFormSubtype &&
      q.danceFormSubtype !== "all" &&
      q.danceFormSubtype !== row.danceFormSubtype
    ) {
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

function writeBoardEntry(key: string, entry: MtdBoardCacheEntry): void {
  boardCache.set(key, entry);
  const storageKey = ssKey(MTD_BOARD_SS_PREFIX, key);
  if (entry.records.length === 0) {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  } else {
    writeMtdBoardSession(storageKey, entry);
  }
}

function findCachedMtdRow(
  id: string,
  preferScope?: "payroll" | "archive" | "board"
): MTDRecord | null {
  let fallback: MTDRecord | null = null;
  for (const [key, entry] of boardCache) {
    const hit = entry.records.find((r) => mtdRowMatchesId(r, id));
    if (!hit) continue;
    if (preferScope && mtdCacheScope(key) === preferScope) return hit;
    if (!fallback) fallback = hit;
  }
  return fallback;
}

/** Board-first lookup for updateMTD when AppState mtdRecords is cold. */
export function readCachedMtdBoardRow(id: string): MTDRecord | null {
  return findCachedMtdRow(id);
}

/**
 * Orders-style badge shift: bump `all` AND form/subtype chips.
 * Tab trust uses mtdActiveChipTotal (form chips) — bumping only `all`
 * left Archive at chip=0, which deleted the optimistic Mark Paid row.
 */
function bumpScopeCountsCache(
  scope: "payroll" | "archive" | "board",
  delta: 1 | -1,
  row?: Pick<
    MTDRecord,
    "formType" | "cheerFormSubtype" | "danceFormSubtype"
  > | null
): void {
  const key = mtdBoardCountsQueryKey({ scope });
  const hit = readMtdBoardCountsCache(key);
  // Never invent a fresh {all:1} counts doc — that zeros every other form
  // chip and trustEmptyZero then wipes MTD. Wait for /mtd/counts instead.
  if (!hit?.counts) return;
  const base = hit.counts;
  const next: MtdBoardCounts = {
    all: Math.max(0, (base.all || 0) + delta),
    by_form_type: { ...(base.by_form_type || {}) },
    by_category: { ...(base.by_category || {}) },
    by_cheer_form_subtype: { ...(base.by_cheer_form_subtype || {}) },
    by_dance_form_subtype: { ...(base.by_dance_form_subtype || {}) },
  };
  const form = row?.formType ? String(row.formType) : "";
  if (form) {
    next.by_form_type[form] = Math.max(
      0,
      (next.by_form_type[form] || 0) + delta
    );
  }
  const cheer = row?.cheerFormSubtype ? String(row.cheerFormSubtype) : "";
  if (
    form === "school-all-star-cheer" &&
    cheer &&
    cheer.toLowerCase() !== "all"
  ) {
    next.by_cheer_form_subtype![cheer] = Math.max(
      0,
      (next.by_cheer_form_subtype![cheer] || 0) + delta
    );
  }
  const dance = row?.danceFormSubtype ? String(row.danceFormSubtype) : "";
  if (
    form === "school-all-star-dance" &&
    dance &&
    dance.toLowerCase() !== "all"
  ) {
    next.by_dance_form_subtype![dance] = Math.max(
      0,
      (next.by_dance_form_subtype![dance] || 0) + delta
    );
  }
  writeMtdBoardCountsCache(key, next);
  // Optimistic chip bump must not stay "fresh" — otherwise reload skips
  // /mtd/counts and a leave-without-formType drift (all=1, cheer=2) sticks.
  const entry = countsCache.get(key);
  if (entry) {
    entry.updatedAt = Date.now() - MTD_BOARD_STALE_MS - 1;
    countsCache.set(key, entry);
  }
}

const LOCAL_WRITE_ECHO_MS = 15_000;
const localMtdWriteAt = new Map<string, number>();

function noteLocalMtdWrite(...ids: Array<string | null | undefined>) {
  const now = Date.now();
  for (const id of ids) if (id) localMtdWriteAt.set(id, now);
}

/** True when this tab just moved the row (ignore SSE/board echo clobber). */
export function isRecentLocalMtdWrite(
  row: Pick<MTDRecord, "id" | "uuid" | "orderId" | "legacyId">
): boolean {
  const now = Date.now();
  for (const id of [row.id, row.uuid, row.orderId, row.legacyId]) {
    const at = id ? localMtdWriteAt.get(id) : undefined;
    if (at && now - at < LOCAL_WRITE_ECHO_MS) return true;
  }
  return false;
}

/**
 * Optimistic invoice / status / Move-to-Orders / Move-to-Payroll / Mark Paid.
 * Same ghost-row class as Orders: leave the old board + paint the destination
 * cache immediately (no forced /mtd/board round-trip).
 */
export function patchMtdBoardRecordInCaches(
  id: string,
  patch: Partial<MTDRecord>,
  seed?: MTDRecord | null
): void {
  if (!id) return;
  const markedPaid = Boolean(patch.paidAt);
  const returnedFromPayroll = patch.inPayroll === false;
  const movedToPayroll = patch.inPayroll === true && !markedPaid;
  // Mark Paid may pre-seed archive with paidAt — prefer the unpaid payroll
  // copy so membership bumps still fire (Orders: shift from the "from" bucket).
  const before =
    findCachedMtdRow(
      id,
      markedPaid ? "payroll" : returnedFromPayroll ? "archive" : undefined
    ) ??
    seed ??
    null;
  const merged: MTDRecord | null = before
    ? ({ ...before, ...patch } as MTDRecord)
    : seed
      ? ({ ...seed, ...patch } as MTDRecord)
      : null;
  // Membership from cache presence — seed.inMTD can lag after Move-to-Orders.
  let wasOnMusic = false;
  for (const [key, entry] of boardCache) {
    if (!isMusicBoardScope(mtdCacheScope(key))) continue;
    if (entry.records.some((r) => mtdRowMatchesId(r, id))) {
      wasOnMusic = true;
      break;
    }
  }
  // Only treat as enter/leave when membership actually changes — routine
  // patches with inMTD:true must not re-seed or re-bump form chips.
  const enteredMusicBoard =
    patch.inMTD === true && !movedToPayroll && !markedPaid && !wasOnMusic;
  const leftMusicBoard =
    (patch.inMTD === false || movedToPayroll || markedPaid) && wasOnMusic;
  const leftPayroll = markedPaid || returnedFromPayroll;

  let anyChanged = false;
  let removedFromPayroll = false;
  let insertedIntoArchive = false;
  let insertedIntoPayroll = false;
  let insertedIntoMusic = false;
  let removedFromMusic = false;
  // Prefer form chips from the row we actually remove — seed/before often
  // lack formType after Move-to-Orders, which left all=N-1 but cheer=N
  // (UI "2" with one painted row).
  let musicLeaveMeta: Pick<
    MTDRecord,
    "formType" | "cheerFormSubtype" | "danceFormSubtype"
  > | null = null;

  for (const [key, entry] of boardCache) {
    const scope = mtdCacheScope(key);
    let changed = false;
    let records = entry.records;

    if (leftMusicBoard && isMusicBoardScope(scope)) {
      records = entry.records.filter((r) => {
        if (!mtdRowMatchesId(r, id)) return true;
        if (!musicLeaveMeta) {
          musicLeaveMeta = {
            formType: r.formType,
            cheerFormSubtype: r.cheerFormSubtype,
            danceFormSubtype: r.danceFormSubtype,
          };
        }
        changed = true;
        removedFromMusic = true;
        return false;
      });
    } else if (enteredMusicBoard && isMusicBoardScope(scope) && merged) {
      if (!mtdCacheKeyMatchesRow(key, merged)) {
        // Wrong form/subtype page — leave untouched.
      } else {
        // Match by patch id OR merged identities — alias re-patches
        // (orderId / stale order.mtdId) must update, not prepend a twin.
        const idx = findMtdRowIndex(entry.records, id, merged);
        if (idx >= 0) {
          records = entry.records.map((r, i) => (i === idx ? merged : r));
          changed = true;
        } else {
          records = [merged, ...entry.records];
          changed = true;
          insertedIntoMusic = true;
        }
      }
    } else if (scope === "payroll") {
      if (leftPayroll) {
        records = entry.records.filter((r) => {
          if (
            !mtdRowMatchesId(r, id) &&
            !(merged && mtdRecordsReferToSame(r, merged))
          ) {
            return true;
          }
          changed = true;
          removedFromPayroll = true;
          return false;
        });
      } else if (movedToPayroll && merged) {
        const idx = findMtdRowIndex(entry.records, id, merged);
        if (idx >= 0) {
          records = entry.records.map((r, i) =>
            i === idx ? merged : r
          );
          changed = true;
        } else {
          records = [merged, ...entry.records];
          changed = true;
          insertedIntoPayroll = true;
        }
      } else {
        records = entry.records.map((r) => {
          if (!mtdRowMatchesId(r, id)) return r;
          changed = true;
          return { ...r, ...patch };
        });
      }
    } else if (scope === "archive") {
      if (markedPaid && merged) {
        const idx = findMtdRowIndex(entry.records, id, merged);
        if (idx >= 0) {
          records = entry.records.map((r, i) =>
            i === idx ? merged : r
          );
          changed = true;
        } else {
          records = [merged, ...entry.records];
          changed = true;
          insertedIntoArchive = true;
        }
      } else if (returnedFromPayroll || patch.paidAt === null) {
        records = entry.records.filter((r) => {
          if (
            !mtdRowMatchesId(r, id) &&
            !(merged && mtdRecordsReferToSame(r, merged))
          ) {
            return true;
          }
          changed = true;
          return false;
        });
      } else {
        records = entry.records.map((r) => {
          if (!mtdRowMatchesId(r, id)) return r;
          changed = true;
          return { ...r, ...patch };
        });
      }
    } else if (!leftMusicBoard) {
      records = entry.records.map((r) => {
        if (!mtdRowMatchesId(r, id)) return r;
        changed = true;
        return { ...r, ...patch };
      });
    }

    if (changed) {
      anyChanged = true;
      writeBoardEntry(key, {
        ...entry,
        records,
        updatedAt: Date.now(),
        queryKey: entry.queryKey ?? key,
      });
    }
  }

  // Destination board may have no warm cache yet (first Archive visit) —
  // seed the SAME form-scoped key the Payroll page query uses, otherwise
  // tab switch misses the seed and flashes empty until /mtd/board returns.
  if (markedPaid && merged) {
    const preferredArchiveKey = mtdBoardQueryKey({
      scope: "archive",
      formType: merged.formType || undefined,
      cheerFormSubtype: merged.cheerFormSubtype || undefined,
    });
    const archiveKeys = new Set(
      [...boardCache.keys()].filter((k) => mtdCacheScope(k) === "archive")
    );
    archiveKeys.add(preferredArchiveKey);
    archiveKeys.add(mtdBoardQueryKey({ scope: "archive" }));
    for (const key of archiveKeys) {
      const prev = boardCache.get(key);
      const prevRecords = prev?.records ?? [];
      if (prevRecords.some((r) => mtdRecordsReferToSame(r, merged))) continue;
      writeMtdBoardCache(key, {
        records: [merged, ...prevRecords],
        nextPageToken: prev?.nextPageToken ?? null,
        counts: prev?.counts,
      });
      anyChanged = true;
      insertedIntoArchive = true;
    }
  }
  if (movedToPayroll && merged) {
    const preferredPayrollKey = mtdBoardQueryKey({
      scope: "payroll",
      formType: merged.formType || undefined,
      cheerFormSubtype: merged.cheerFormSubtype || undefined,
    });
    const payrollKeys = new Set(
      [...boardCache.keys()].filter((k) => mtdCacheScope(k) === "payroll")
    );
    payrollKeys.add(preferredPayrollKey);
    payrollKeys.add(mtdBoardQueryKey({ scope: "payroll" }));
    for (const key of payrollKeys) {
      const prev = boardCache.get(key);
      const prevRecords = prev?.records ?? [];
      if (prevRecords.some((r) => mtdRecordsReferToSame(r, merged))) continue;
      writeMtdBoardCache(key, {
        records: [merged, ...prevRecords],
        nextPageToken: prev?.nextPageToken ?? null,
        counts: prev?.counts,
      });
      anyChanged = true;
      insertedIntoPayroll = true;
    }
  }
  if (enteredMusicBoard && merged) {
    const preferredMusicKey = mtdBoardQueryKey({
      scope: "board",
      formType: merged.formType || undefined,
      cheerFormSubtype: merged.cheerFormSubtype || undefined,
    });
    const musicKeys = new Set(
      [...boardCache.keys()].filter((k) =>
        isMusicBoardScope(mtdCacheScope(k))
      )
    );
    musicKeys.add(preferredMusicKey);
    musicKeys.add(mtdBoardQueryKey({ scope: "board" }));
    for (const key of musicKeys) {
      const prev = boardCache.get(key);
      const prevRecords = prev?.records ?? [];
      if (prevRecords.some((r) => mtdRecordsReferToSame(r, merged))) continue;
      if (!mtdCacheKeyMatchesRow(key, merged)) continue;
      writeMtdBoardCache(key, {
        records: [merged, ...prevRecords],
        nextPageToken: prev?.nextPageToken ?? null,
        counts: prev?.counts,
      });
      anyChanged = true;
      insertedIntoMusic = true;
    }
  }

  // Orders-style: shift Payroll badge totals once per membership change.
  // Archive has no tab count — never bump /mtd/counts for archive.
  const chipRow = merged ?? before;
  if (markedPaid) {
    if (removedFromPayroll || (Boolean(before?.inPayroll) && !before?.paidAt)) {
      bumpScopeCountsCache("payroll", -1, before ?? chipRow);
      noteLocalMtdWrite(
        id,
        before?.id,
        before?.uuid,
        before?.orderId,
        merged?.id,
        merged?.uuid,
        merged?.orderId
      );
    } else if (insertedIntoArchive) {
      noteLocalMtdWrite(id, merged?.id, merged?.uuid, merged?.orderId);
    }
  } else {
    if (removedFromPayroll) {
      bumpScopeCountsCache("payroll", -1, before ?? chipRow);
      noteLocalMtdWrite(id, before?.id, before?.uuid, before?.orderId);
    }
    if (insertedIntoArchive) {
      noteLocalMtdWrite(id, merged?.id, merged?.uuid, merged?.orderId);
    }
    if (insertedIntoPayroll) {
      bumpScopeCountsCache("payroll", 1, chipRow);
      noteLocalMtdWrite(id, merged?.id, merged?.uuid, merged?.orderId);
    } else if (movedToPayroll) {
      // Always guard SSE/soft-reload echos for Move-to-Payroll, even when the
      // payroll cache already had the row (update-only / double patch).
      noteLocalMtdWrite(
        id,
        before?.id,
        before?.uuid,
        before?.orderId,
        merged?.id,
        merged?.uuid,
        merged?.orderId
      );
    }
    if (removedFromMusic || (leftMusicBoard && wasOnMusic)) {
      if (removedFromMusic) {
        bumpScopeCountsCache(
          "board",
          -1,
          musicLeaveMeta ?? before ?? chipRow
        );
      }
      noteLocalMtdWrite(
        id,
        before?.id,
        before?.uuid,
        before?.orderId,
        merged?.id,
        merged?.uuid,
        merged?.orderId
      );
    }
    if (insertedIntoMusic || enteredMusicBoard) {
      // Only bump when the row is newly present — never when an update-only
      // patch re-enters while server counts already include it.
      if (insertedIntoMusic) bumpScopeCountsCache("board", 1, chipRow);
      noteLocalMtdWrite(
        id,
        before?.id,
        before?.uuid,
        before?.orderId,
        merged?.id,
        merged?.uuid,
        merged?.orderId
      );
    }
  }

  if (typeof window === "undefined") return;
  if (!anyChanged && !leftMusicBoard && !leftPayroll && !enteredMusicBoard)
    return;
  window.dispatchEvent(
    new CustomEvent<MtdBoardPatchDetail>(MTD_BOARD_PATCH_EVENT, {
      detail: {
        id,
        patch,
        removed: leftMusicBoard || leftPayroll,
        record: merged ?? undefined,
      },
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
