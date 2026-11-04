import type { MTDRecord, Order } from "@/types";

/**
 * Bump invalidates old localStorage blobs (v4 held full MTD including paid archive).
 */
export const APP_STATE_CACHE_VERSION = "v5";

/** Orders / MTD / producers timed cache TTL (safety; always revalidate from network). */
export const APP_STATE_CACHE_HARD_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function isPastBoardOrder(
  order: Pick<Order, "isPastOrder" | "status">
): boolean {
  return Boolean(order.isPastOrder) || order.status === "completed";
}

export function isArchivedPayrollRecord(
  rec: Pick<MTDRecord, "paidAt"> | { paidAt?: string | null }
): boolean {
  return Boolean(rec.paidAt);
}

/** localStorage orders cache: active board only — never persist past history. */
export function ordersCachePayload(active: Order[]): { active: Order[] } {
  return { active };
}

/**
 * Restore active board from cache. Ignore any legacy `past` array so v3 blobs
 * (or mistaken writes) cannot rehydrate completed history into AppState.
 */
export function readActiveOrdersFromCache(data: unknown): Order[] {
  if (!data || typeof data !== "object") return [];
  const active = (data as { active?: unknown }).active;
  return Array.isArray(active) ? (active as Order[]) : [];
}

/** Drop paid archive rows if a legacy cache blob still contains them. */
export function readLiveMtdFromCache(data: unknown): MTDRecord[] {
  if (!Array.isArray(data)) return [];
  return (data as MTDRecord[]).filter((r) => !isArchivedPayrollRecord(r));
}

/** Stream / complete path: only grow pastOrders while Dashboard has loaded them. */
export function shouldApplyPastOrderUpdate(pastLoaded: boolean): boolean {
  return pastLoaded;
}

/** Stream path: only grow archive while Payroll Archive has loaded it. */
export function shouldApplyArchivedPayrollUpdate(archiveLoaded: boolean): boolean {
  return archiveLoaded;
}

/** Pure stand-in for ensurePastOrdersLoaded → releasePastOrders memory lifecycle. */
export function pastOrdersAfterLoad<T>(past: T[]): { loaded: true; past: T[] } {
  return { loaded: true, past };
}

export function pastOrdersAfterRelease(): { loaded: false; past: [] } {
  return { loaded: false, past: [] };
}

export function archivedPayrollAfterLoad<T>(
  archive: T[]
): { loaded: true; archive: T[] } {
  return { loaded: true, archive };
}

export function archivedPayrollAfterRelease(): { loaded: false; archive: [] } {
  return { loaded: false, archive: [] };
}
