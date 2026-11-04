"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AppAlert,
  AppNotification,
  DiscountCode,
  MTDRecord,
  Order,
  PayrollAddon,
  Producer,
  ScheduleEntry,
} from "@/types";
import {
  claimNotificationDedupeKey,
  findLeavesStartingTomorrow,
  findProducersAtLimitFull,
} from "@/lib/admin-notifications";
import { isNotificationTypeEnabled } from "@/lib/notification-preferences";
import type { StudioPersonalReason } from "@/lib/producer-time-off";
import {
  createDefaultPersonalReasons,
  ensurePersonalReasonsList,
  normalizeStudioPersonalReason,
} from "@/lib/producer-time-off";
import {
  DEFAULT_EMAIL_TEMPLATES,
  EMAIL_TEMPLATES_STORAGE_KEY,
  normalizeEmailTemplates,
  type EmailTemplateCopy,
  type EmailTemplateId,
  type EmailTemplatesState,
} from "@/lib/email-templates";
import { getData } from "@/lib/data";
import { normalizeOrder } from "@/lib/order-form";
import {
  canMergeMagentoFormIntoManual,
  mergeFormWinsPatches,
  mergePatchFromForm,
  overwriteManualWithFormPatches,
  overwriteSplitRestoreSnapshot,
  repairCorruptCrossCategoryFormMerge,
} from "@/lib/manual-form-merge";
import { openAffiliateFlagPatch } from "@/lib/affiliate-flag";
import {
  addUnseenMatchFormId,
  clearUnseenMatchFormIds,
  incomingOrderBellEvent,
  isMatchOrdersPageOpen,
  listMatchSuggestionBellEvents,
  readUnseenMatchFormIds,
} from "@/lib/match-suggestion-notify";
import {
  collapsePreMtdClonesForOrder,
  isPersistedMtdRecord,
  mergeCollectionStateFromOrder,
  mtdRecordCoversOrder,
  stagingRecordFromOrder,
} from "@/lib/order-staging";
import { getOrderIdentityName } from "@/lib/order-detail-sections";
import { overlayMergedFormForDisplay } from "@/lib/manual-form-merge";
import { useAuth } from "@/context/AuthContext";
import {
  getDefaultSecretMenuPricing,
  type SecretMenuPricing,
} from "@/lib/pricing";
import { resolveOrderPriceCompliance as resolveOrderCompliance } from "@/lib/pricing";
import {
  resolveLiveOrderPricing,
  resolveStoredOrEngineCustomerPrice,
} from "@/lib/order-package-price";
import {
  editorRequestForAssignment,
  getSuggestedEditors,
  pickDefaultEditor,
  producerAssignmentKey,
  producerKeysMatch,
  resolveAssignedProducerForPatch,
  resolveValidProducerAssignment,
} from "@/lib/editor-assignment";
import { suggestMixEndDate, suggestMixStartDate } from "@/lib/scheduling";
import {
  normalizeProducer,
  normalizeProducerList,
  producersReferToSamePerson,
  sameStringSet,
  sameTimeOffList,
} from "@/lib/producers";
import { countProducerMixesThisWeek } from "@/lib/producer-availability";
import { normalizeDiscountCode } from "@/lib/discount-codes";
import { isOutsourcedRecord } from "@/lib/mtd-filters";
import { mergeLocalMtdRecordFields } from "@/lib/mtd-completion";
import { mergeIncomingOrderReassignFields } from "@/lib/order-reassign";
import { pickInvoice } from "@/lib/invoice";
import { orderPatchFromMTD } from "@/lib/mtd-order-sync";
import {
  applyOrdersBoardLiveDelete,
  isRecentLocalOrderWrite,
  patchOrdersBoardRowOptimistic,
  readOrdersBoardOrder,
  removeOrdersBoardOrderFromCaches,
  syncOrdersAfterMatch,
  syncOrdersBoardAfterReassign,
} from "@/lib/orders-board-cache";
import {
  patchMtdBoardRecordInCaches,
  readCachedMtdBoardRow,
  removeMtdBoardRecordsFromCaches,
} from "@/lib/mtd-board-cache";
import { orderFromMTDRecord } from "@/lib/order-detail-fields";
import { resolveMTDFormMeta } from "@/lib/mtd-filters";
import { inferMTDRecordStatus } from "@/lib/mtd-status";
import { dedupePayrollAddons } from "@/lib/misc-payroll-adjustment";
import { toIsoDateString } from "@/lib/dates";
import { ApiClientError, formatApiClientError } from "@/lib/api/client";
import { subscribeLiveStream } from "@/lib/api/live-stream";
import {
  createProducerApi,
  resolveProducerApiId,
  updateProducerApi,
  deleteProducerApi,
  producerFromConflictError,
  transformProducer,
  createOrderApi,
  updateOrderApi,
  deleteOrderApi,
  fetchPastOrdersApi,
  createMTDRecordApi,
  updateMTDRecordApi,
  deleteMTDRecordApi,
  createDiscountCodeApi,
  updateDiscountCodeApi,
  deleteDiscountCodeApi,
  createPayrollAddonApi,
  deletePayrollAddonApi,
  updatePayrollAddonApi,
  mergePayrollAddonPatch,
  type CreatePayrollAddonPayload,
  type UpdatePayrollAddonPayload,
  createStudioPersonalReasonApi,
  updateStudioPersonalReasonApi,
  deleteStudioPersonalReasonApi,
  upsertEmailTemplateApi,
  fetchBootstrapApi,
  fetchProducersApi,
  fetchMTDRecordsApi,
  fetchArchivedPayrollApi,
  fetchDiscountCodesApi,
  fetchPayrollAddonsForMtdIdsApi,
  fetchPayrollLinkedAddonsApi,
  fetchVoiceoverAddonsApi,
  fetchStudioPersonalReasonsApi,
  fetchEmailTemplatesApi,
  saveSecretMenuPricingApi,
  fetchSecretMenuPricingApi,
  fetchPricingRulesApi,
  fetchMusicAffiliatesApi,
  type BootstrapPayload,
} from "@/lib/api";
import {
  applyDbMusicAffiliates,
  applyDbPricingRules,
  loadPricingReferenceStore,
} from "@/lib/pricing-reference";
import {
  APP_STATE_CACHE_HARD_MAX_AGE_MS,
  APP_STATE_CACHE_VERSION,
  isArchivedPayrollRecord,
  isPastBoardOrder,
  ordersCachePayload,
  readActiveOrdersFromCache,
  readLiveMtdFromCache,
  shouldApplyArchivedPayrollUpdate,
  shouldApplyPastOrderUpdate,
} from "@/lib/app-state-memory";

type AppStateContextValue = {
  activeOrders: Order[];
  pastOrders: Order[];
  allOrders: Order[];
  mtdRecords: MTDRecord[];
  /** Paid payroll rows — loaded only while Payroll Archive is open. */
  archivedPayrollRecords: MTDRecord[];
  secretMenuPrices: SecretMenuPricing;
  producers: Producer[];
  discountCodes: DiscountCode[];
  payrollAddons: PayrollAddon[];
  personalReasons: StudioPersonalReason[];
  emailTemplates: EmailTemplatesState;
  schedule: ScheduleEntry[];
  notifications: AppNotification[];
  /** Ephemeral toasts: not the bell inbox. */
  alerts: AppAlert[];
  unreadCount: number;
  isBackendConnected: boolean;
  isLoading: boolean;
  isViewOnly: boolean;
  moveOrderToMTD: (orderId: string) => MTDRecord | null;
  updateMTD: (
    id: string,
    patch: Partial<MTDRecord>,
    /** Board-first rows may be absent from AppState; pass the row so Order SoT still PATCHes. */
    seed?: MTDRecord
  ) => Promise<void>;
  removeMTDRecord: (id: string) => Promise<void>;
  updateOrder: (
    id: string,
    patch: Partial<Order>,
    seed?: Order
  ) => Promise<void>;
  /** Permanently delete an Orders-tab booking (clears assignment with the order). */
  deleteOrder: (id: string) => Promise<void>;
  setSecretMenuPrices: (pricing: SecretMenuPricing) => void;
  markComplete: (orderId: string) => void;
  addPastOrder: (order: Order) => void;
  /** Incoming customer order: adds to active list and notifies the bell. */
  receiveOrder: (order: Order) => void;
  /** Load completed/past orders for Dashboard charts (kept out of bootstrap). */
  ensurePastOrdersLoaded: () => Promise<void>;
  /** Drop past orders from memory when leaving Dashboard. */
  releasePastOrders: () => void;
  /**
   * Load live MTD into AppState (board + unpaid payroll). Not part of boot —
   * call from pages that need the full set (Dashboard charts, Schedule,
   * Orders/MTD/Payroll membership). Kept for the session once loaded.
   */
  ensureLiveMtdLoaded: () => Promise<void>;
  /** Load paid payroll archive for Payroll Archive tab. */
  ensureArchivedPayrollLoaded: () => Promise<void>;
  /** Drop paid archive from memory when leaving Payroll Archive. */
  releaseArchivedPayroll: () => void;
  /**
   * Rush/misc for unpaid payroll only. Call from Payroll.
   * Not part of bootstrap — keeps app warm-start constant-size.
   */
  ensurePayrollLinkedAddonsLoaded: (opts?: {
    force?: boolean;
  }) => Promise<void>;
  /**
   * Rush/misc for visible archive (or board) MTD ids only.
   */
  ensureAddonsForMtdIdsLoaded: (mtdIds: string[]) => Promise<void>;
  /**
   * Recent voiceovers only (default last 42 days). Call from VO / Send tabs.
   */
  ensureVoiceoverAddonsLoaded: (opts?: {
    force?: boolean;
    sinceDays?: number;
  }) => Promise<void>;
  /**
   * Admin Match Orders: link a Magento form into an unmatched manual slot
   * (form SoT). Replaces the old automatic name-merge.
   */
  matchManualWithMagento: (
    manualId: string,
    formId: string,
    options?: {
      overwrite?: boolean;
      /** Prefer these over activeOrders (e.g. MatchConfirmModal drafts). */
      manualOverride?: Order;
      formOverride?: Order;
      /** Draft edits saved in the same PATCH as the match (no extra round trip). */
      manualEdits?: Partial<Order>;
      formEdits?: Partial<Order>;
      /** Manual before modal edits: what Split puts back after an overwrite. */
      manualBefore?: Order;
      /** Runs once the pair is off the pool / badges locally, before the PATCHes. */
      onApplied?: () => void;
    }
  ) => Promise<void>;
  addProducer: (producer: Producer) => Promise<Producer>;
  updateProducer: (id: string, patch: Partial<Producer>) => Promise<Producer>;
  removeProducer: (id: string) => Promise<void>;
  addDiscountCode: (discountCode: DiscountCode) => Promise<DiscountCode>;
  updateDiscountCode: (id: string, patch: Partial<DiscountCode>) => Promise<DiscountCode>;
  removeDiscountCode: (id: string) => Promise<void>;
  addPayrollAddon: (payload: CreatePayrollAddonPayload) => Promise<PayrollAddon>;
  updatePayrollAddon: (
    id: string,
    patch: UpdatePayrollAddonPayload
  ) => Promise<PayrollAddon>;
  removePayrollAddon: (id: string) => Promise<void>;
  addManualScheduleEntry: (order: Partial<Order>) => Promise<Order>;
  addNotification: (
    notification: Omit<AppNotification, "id" | "read" | "createdAt">
  ) => boolean;
  addAlert: (alert: Omit<AppAlert, "id" | "createdAt">) => void;
  addPersonalReason: (reason: StudioPersonalReason) => void;
  updatePersonalReason: (
    id: string,
    patch: Partial<StudioPersonalReason>
  ) => void;
  removePersonalReason: (id: string) => void;
  updateEmailTemplate: (
    id: EmailTemplateId,
    patch: Partial<EmailTemplateCopy>
  ) => void;
  resetEmailTemplate: (id: EmailTemplateId) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  /**
   * After a Magento form leaves Flagged (Resolve), check Suggested for You and
   * raise a bell when a manual match exists. Returns the top
   * pair so Resolve can open Match Confirm (same as a single-affiliate form).
   */
  maybeNotifyMatchSuggestion: (
    order: Order
  ) => { formId: string; manualId: string } | null;
  /** Magento forms with Suggested-for-You that haven’t been opened on Match yet. */
  unseenSuggestedMatchCount: number;
  markMatchOrdersSeen: () => void;
  isInMTD: (orderId: string) => boolean;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

function normalizeOrders(orders: Order[]): Order[] {
  return orders.map((o) => {
    const base = normalizeOrder(repairCorruptCrossCategoryFormMerge(o));
    const flagPatch = openAffiliateFlagPatch(base);
    return flagPatch ? normalizeOrder({ ...base, ...flagPatch }) : base;
  });
}

function normalizeMTD(records: MTDRecord[]): MTDRecord[] {
  return records.map((r) => {
    const legacyBookedUntil = (r as MTDRecord & { bookedUntil?: string | null })
      .bookedUntil;
    const mixEndRaw = r.mixEndDate || legacyBookedUntil;
    const mixStartDate = toIsoDateString(r.mixStartDate) || r.mixStartDate;
    let mixEnd = mixEndRaw
      ? toIsoDateString(mixEndRaw) || mixEndRaw
      : undefined;

    const startIso = toIsoDateString(mixStartDate);
    const endIso = mixEnd ? toIsoDateString(mixEnd) : "";
    if (startIso && endIso && endIso < startIso) {
      mixEnd = suggestMixEndDate(startIso, r.package);
    }

    const normalized: MTDRecord = {
      ...r,
      editorRequest: r.editorRequest || "FA",
      contactName: r.contactName || r.editorInitials,
      priceCompliance: resolveOrderCompliance(r),
      mixStartDate,
      recordStatus: inferMTDRecordStatus(r),
      inPayroll: Boolean(r.inPayroll),
      ...(mixEnd ? { mixEndDate: mixEnd } : {}),
    };

    // Backfill only for outsourced rows missing the explicit MTD flag.
    // Assigned + scheduled orders stay on the Orders tab until "Move to MTD".
    if (normalized.inMTD === undefined && isOutsourcedRecord(normalized)) {
      normalized.inMTD = true;
    }

    return normalized;
  });
}



function getLocalItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota or storage errors
  }
}

// --- Stale-while-revalidate cache -------------------------------------------
// Paint last-known data instantly, then refresh from the API. This is NOT a
// source of truth: hard refresh does NOT clear localStorage, so forever-fresh
// blobs can briefly show deleted rows until bootstrap overwrites them.
//
// Rules (how large apps avoid this):
// 1) Version the key: bump to invalidate everyone's old blobs after schema/data resets
// 2) Always paint any snapshot; always revalidate from the network (SWR)
// 3) Drop only absurdly old blobs (safety); rewrite cache after successful sync / mutations
const CACHE_VERSION = APP_STATE_CACHE_VERSION;
const CACHE_ORDERS_KEY = `slt_cache_orders_${CACHE_VERSION}`;
const CACHE_MTD_KEY = `slt_cache_mtd_${CACHE_VERSION}`;
const CACHE_PRODUCERS_KEY = `slt_cache_producers_${CACHE_VERSION}`;
/** Drop snapshots older than this (safety); always revalidate from network. */
const CACHE_HARD_MAX_AGE_MS = APP_STATE_CACHE_HARD_MAX_AGE_MS;

type TimedCache<T> = { savedAt: number; data: T };

/** Last snapshot for first paint, even if stale. Null only when missing/corrupt/too old. */
function readCache<T>(key: string): T | null {
  const wrapped = getLocalItem<TimedCache<T> | T | null>(key, null);
  if (!wrapped) return null;
  // Legacy unwrapped shape from older builds: treat as unusable.
  if (
    typeof wrapped === "object" &&
    wrapped !== null &&
    "savedAt" in wrapped &&
    "data" in wrapped
  ) {
    const { savedAt, data } = wrapped as TimedCache<T>;
    if (typeof savedAt !== "number") return null;
    if (Date.now() - savedAt > CACHE_HARD_MAX_AGE_MS) return null;
    return data;
  }
  return null;
}

function writeTimedCache<T>(key: string, data: T): void {
  setLocalItem<TimedCache<T>>(key, { savedAt: Date.now(), data });
}

function isProducerUpdatedAtNewer(
  server: string | null | undefined,
  local: string | null | undefined
): boolean {
  if (!server) return false;
  if (!local) return true;
  const serverMs = Date.parse(server);
  const localMs = Date.parse(local);
  if (Number.isNaN(serverMs)) return false;
  if (Number.isNaN(localMs)) return true;
  return serverMs >= localMs;
}

function patchNeedsIfMatch(patch: Partial<Producer>): boolean {
  const keys = Object.keys(patch) as (keyof Producer)[];
  if (keys.length === 0) return false;
  // Background mixes sync is best-effort and should not 409 on availability edits.
  return !(keys.length === 1 && keys[0] === "mixesThisWeek");
}

/** Fields that Schedule / Off days must never lose on a stale if-match race. */
function pickAvailabilityPatch(patch: Partial<Producer>): Partial<Producer> {
  const next: Partial<Producer> = {};
  if (patch.workDays !== undefined) next.workDays = patch.workDays;
  if (patch.timeOff !== undefined) next.timeOff = patch.timeOff;
  if (patch.extraDays !== undefined) next.extraDays = patch.extraDays;
  if (patch.maxMixesPerDay !== undefined) {
    next.maxMixesPerDay = patch.maxMixesPerDay;
  }
  if (patch.maxProducerCostPerDay !== undefined) {
    next.maxProducerCostPerDay = patch.maxProducerCostPerDay;
  }
  return next;
}

/** Same-browser instant sync (Schedule tab) while SSE covers other devices. */
const PRODUCERS_SYNC_CHANNEL = "slt_producers_sync_v1";
/** Same-browser instant sync for Payroll Paid / MTD board moves. */
const MTD_SYNC_CHANNEL = "slt_mtd_sync_v1";
/** Same-browser instant sync for Orders package price + shared fields. */
const ORDERS_SYNC_CHANNEL = "slt_orders_sync_v1";

function producerAvailabilityKey(p: Producer): string {
  const days = (p.workDays ?? []).slice().sort().join(",");
  const extra = (p.extraDays ?? []).slice().sort().join(",");
  const leave = (p.timeOff ?? [])
    .map((t) => `${t.startDate}:${t.endDate}:${t.reason}`)
    .sort()
    .join(";");
  return `${days}|${extra}|${leave}|${p.maxMixesPerDay ?? ""}|${p.maxProducerCostPerDay ?? ""}|${p.updatedAt ?? ""}`;
}

function mtdRecordsReferToSame(a: MTDRecord, b: MTDRecord): boolean {
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

/** Fields other tabs/browsers must see immediately after Paid / price edits. */
function mtdLiveSyncKey(r: MTDRecord): string {
  return [
    r.inPayroll ? "1" : "0",
    r.paidAt || "",
    r.status || "",
    r.recordStatus || "",
    r.inMTD ? "1" : "0",
    r.isReassigned ? "1" : "0",
    r.assignedProducer || "",
    r.mixStartDate || "",
    r.mixEndDate || "",
    r.completedAt || "",
    r.price ?? "",
    r.finalCustomerPrice ?? "",
    r.finalCustomerPriceOverridden ? "1" : "0",
    r.finalPayrollPrice ?? "",
    r.priceCompliance || "",
  ].join("|");
}

function ordersReferToSame(a: Order, b: Order): boolean {
  const aKeys = [a.id, a.uuid, a.legacyId, a.mtdId].filter(
    (value): value is string => Boolean(value)
  );
  const bKeys = new Set(
    [b.id, b.uuid, b.legacyId, b.mtdId].filter(
      (value): value is string => Boolean(value)
    )
  );
  return aKeys.some((key) => bKeys.has(key));
}

function orderLiveSyncKey(o: Order): string {
  const snap = o.manualOverlapSnapshot;
  const snapKey =
    snap && typeof snap === "object" ? Object.keys(snap).sort().join(",") : "";
  return [
    o.status || "",
    o.price ?? "",
    o.finalCustomerPrice ?? "",
    o.finalCustomerPriceOverridden ? "1" : "0",
    o.finalPayrollPrice ?? "",
    o.priceCompliance || "",
    o.assignedProducer || "",
    o.mixStartDate || "",
    o.mixEndDate || "",
    // Reassign flag + reason: without these, SSE/boot can skip or flicker
    // Reassign ↔ Assigned when only isReassigned/orderStatus changed.
    o.isReassigned ? "1" : "0",
    o.orderStatus || "",
    // Magento↔manual link: must invalidate live sync or Form filter stays stale.
    o.mergedFormOrderId || "",
    o.mergedIntoManualOrderId || "",
    o.isManualEntry ? "1" : "0",
    snapKey,
    (o as Order & { updatedAt?: string }).updatedAt || "",
    // Form fields: without these, PATCH/SSE that only fill Magento details
    // (billing, team, city, songs, …) are treated as no-ops and Match keeps "-".
    o.programName || "",
    o.gymBillingAddress || "",
    o.teamName || "",
    o.division || "",
    o.coachName || "",
    o.coachPhone || "",
    o.coachEmail || "",
    o.billingPersonName || "",
    o.billingPersonEmail || "",
    o.city || "",
    o.stateProvince || "",
    o.zipPostalCode || "",
    o.teamCoedAllGirl || "",
    o.teamColors || "",
    o.numberOfCopies || "",
    o.musicAffiliate || "",
    o.sendingEightCountSheets || "",
    o.songListSuggestions || "",
    o.routineNotes || "",
    o.package || "",
    o.packageType || "",
    o.timeLengthOfMix || "",
  ].join("|");
}

function rewriteMtdAssignmentKeys(
  records: MTDRecord[],
  oldKey: string,
  newKey: string
): MTDRecord[] {
  return records.map((rec) => {
    let updated = rec;
    if (
      rec.assignedProducer &&
      producerKeysMatch(rec.assignedProducer, oldKey)
    ) {
      updated = { ...updated, assignedProducer: newKey };
    }
    if (
      updated.editorRequest &&
      producerKeysMatch(updated.editorRequest, oldKey)
    ) {
      updated = {
        ...updated,
        editorRequest: newKey as typeof rec.editorRequest,
      };
    }
    return updated;
  });
}

function rewriteOrderAssignmentKeys(
  orders: Order[],
  oldKey: string,
  newKey: string
): Order[] {
  return orders.map((order) => {
    let updated = order;
    if (
      order.assignedProducer &&
      producerKeysMatch(order.assignedProducer, oldKey)
    ) {
      updated = { ...updated, assignedProducer: newKey };
    }
    if (
      updated.editorRequest &&
      producerKeysMatch(updated.editorRequest, oldKey)
    ) {
      updated = {
        ...updated,
        editorRequest: newKey as typeof order.editorRequest,
      };
    }
    if (
      updated.requestedProducer &&
      producerKeysMatch(updated.requestedProducer, oldKey)
    ) {
      updated = { ...updated, requestedProducer: newKey };
    }
    if (
      updated.requestedEditor &&
      producerKeysMatch(updated.requestedEditor, oldKey)
    ) {
      updated = { ...updated, requestedEditor: newKey };
    }
    return updated;
  });
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const seed = getData();
  const producersMutatedAtRef = useRef(0);
  const mtdMutatedAtRef = useRef(0);
  const ordersMutatedAtRef = useRef(0);
  /** Producer ids with an in-flight save: skip stream merges until complete. */
  const pendingProducerSavesRef = useRef<Set<string>>(new Set());
  const applyingPeerProducersRef = useRef(false);
  const producersChannelRef = useRef<BroadcastChannel | null>(null);
  const applyingPeerMtdRef = useRef(false);
  const mtdChannelRef = useRef<BroadcastChannel | null>(null);
  const applyingPeerOrdersRef = useRef(false);
  const ordersChannelRef = useRef<BroadcastChannel | null>(null);
  /** Latest match-suggestion flush (bootstrap effect is mount-only). */
  const flushMatchSuggestionNoticesRef = useRef<(orders: Order[]) => void>(
    () => undefined
  );

  // Drop legacy cache keys so hard-to-clear v1 blobs (e.g. 439 deleted orders)
  // can never hydrate again.
  if (typeof window !== "undefined") {
    localStorage.removeItem("slt_persisted_active_orders");
    localStorage.removeItem("slt_persisted_past_orders");
    localStorage.removeItem("slt_persisted_mtd_records");
    localStorage.removeItem("slt_cache_orders_v1");
    localStorage.removeItem("slt_cache_mtd_v1");
    localStorage.removeItem("slt_cache_producers_v1");
    localStorage.removeItem("slt_cache_orders_v3");
    localStorage.removeItem("slt_cache_mtd_v3");
    localStorage.removeItem("slt_cache_producers_v3");
    localStorage.removeItem("slt_cache_payroll_addons_v3");
    localStorage.removeItem("slt_cache_orders_v4");
    localStorage.removeItem("slt_cache_mtd_v4");
    localStorage.removeItem("slt_cache_producers_v4");
  }

  // Paint any SWR snapshot immediately; bootstrap always revalidates in background.
  const cachedOrders = readCache<{ active: Order[] }>(CACHE_ORDERS_KEY);
  const cachedMtd = readCache<MTDRecord[]>(CACHE_MTD_KEY);
  const cachedProducers = readCache<Producer[]>(CACHE_PRODUCERS_KEY);
  const hasCachedData = Boolean(
    cachedOrders || cachedMtd || (cachedProducers && cachedProducers.length > 0)
  );

  const [unseenMatchFormIds, setUnseenMatchFormIds] = useState<string[]>(() =>
    readUnseenMatchFormIds()
  );
  const [activeOrders, setActiveOrders] = useState<Order[]>(
    () => readActiveOrdersFromCache(cachedOrders)
  );
  // Past/completed history is Dashboard-only; never restored from cache.
  const [pastOrders, setPastOrders] = useState<Order[]>([]);
  const pastOrdersLoadedRef = useRef(false);
  const pastOrdersLoadPromiseRef = useRef<Promise<void> | null>(null);
  // Live MTD only (board + unpaid payroll); never restore paid archive from cache.
  // Full list is lazy via ensureLiveMtdLoaded — boot keeps SWR paint only.
  const [mtdRecords, setMtdRecords] = useState<MTDRecord[]>(() =>
    readLiveMtdFromCache(cachedMtd)
  );
  const liveMtdLoadedRef = useRef(false);
  const liveMtdLoadPromiseRef = useRef<Promise<void> | null>(null);
  const [archivedPayrollRecords, setArchivedPayrollRecords] = useState<
    MTDRecord[]
  >([]);
  const archivedPayrollLoadedRef = useRef(false);
  const archivedPayrollLoadPromiseRef = useRef<Promise<void> | null>(null);
  const payrollLinkedAddonsLoadedRef = useRef(false);
  const payrollLinkedAddonsLoadPromiseRef = useRef<Promise<void> | null>(null);
  const voiceoverAddonsLoadedRef = useRef(false);
  const voiceoverAddonsSinceDaysRef = useRef<number | null>(null);
  const voiceoverAddonsLoadPromiseRef = useRef<Promise<void> | null>(null);
  const loadedAddonMtdIdsRef = useRef<Set<string>>(new Set());

  const [secretMenuPrices, setSecretMenuPricesState] = useState<SecretMenuPricing>(
    () => getDefaultSecretMenuPricing()
  );

  // Notifications start empty: populated when backend data loads or user actions occur.
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [producers, setProducers] = useState<Producer[]>(() => {
    if (cachedProducers && cachedProducers.length > 0) {
      return normalizeProducerList(
        cachedProducers.map((p) => normalizeProducer(p))
      );
    }
    // Don't paint seed order first: that reshuffles when DB bootstrap arrives.
    return [];
  });
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  // Addons come from bootstrap only (not localStorage) to avoid a second full copy.
  const [payrollAddons, setPayrollAddons] = useState<PayrollAddon[]>([]);
  const [personalReasons, setPersonalReasons] = useState<StudioPersonalReason[]>(
    () => {
      const stored = getLocalItem<StudioPersonalReason[] | null>(
        "slt_studio_personal_reasons",
        null
      );
      if (stored && Array.isArray(stored) && stored.length > 0) {
        return ensurePersonalReasonsList(
          stored.map((entry) => normalizeStudioPersonalReason(entry))
        );
      }
      return createDefaultPersonalReasons();
    }
  );
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplatesState>(() =>
    normalizeEmailTemplates(
      getLocalItem(EMAIL_TEMPLATES_STORAGE_KEY, DEFAULT_EMAIL_TEMPLATES)
    )
  );
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  // Block UI only on true cold start; cached paint stays interactive while revalidating.
  const [isLoading, setIsLoading] = useState<boolean>(!hasCachedData);

  const schedule = seed.schedule;

  // Load data from FastAPI Backend on Mount: prefer one bootstrap request.
  useEffect(() => {
    let isMounted = true;
    let loadGen = 0;
    // Sync Edit Affiliates → pricing-engine compliance matchers for Magento text.
    loadPricingReferenceStore();

    function applyBoot(boot: BootstrapPayload, fetchedAt: number) {
      // Don't clobber a newer optimistic availability edit with a slower boot.
      if (
        boot.producers.length > 0 &&
        fetchedAt >= producersMutatedAtRef.current
      ) {
        const nextProducers = normalizeProducerList(boot.producers);
        setProducers(nextProducers);
        writeTimedCache(CACHE_PRODUCERS_KEY, nextProducers);
      }

      const loadedActiveOrders = normalizeOrders(boot.activeOrders);
      // Board-first /api/bootstrap returns orders: [] — keep SWR paint / local
      // mutations. Never wipe AppState with an empty boot list.
      if (
        fetchedAt >= ordersMutatedAtRef.current &&
        loadedActiveOrders.length > 0
      ) {
        setActiveOrders(loadedActiveOrders);
        // Past history is Dashboard-only; never hydrate into AppState from bootstrap.
        if (!pastOrdersLoadedRef.current) {
          setPastOrders([]);
        }
        writeTimedCache(
          CACHE_ORDERS_KEY,
          ordersCachePayload(loadedActiveOrders)
        );

        // Persist affiliate flags opened on hydrate (Magento multi-select → Flagged).
        const rawById = new Map(
          boot.activeOrders.map((o) => [o.id, o] as const)
        );
        const newlyFlagged = loadedActiveOrders.filter((o) => {
          if (o.affiliateFlagStatus !== "open") return false;
          const raw = rawById.get(o.id);
          return raw?.affiliateFlagStatus !== "open";
        });
        if (newlyFlagged.length > 0) {
          void Promise.all(
            newlyFlagged.map((o) =>
              updateOrderApi(o.id, {
                affiliateFlagStatus: "open",
                musicAffiliateSelections: o.musicAffiliateSelections,
                needsAttention: o.needsAttention,
                attentionReason: o.attentionReason,
              })
            )
          ).catch((err) => {
            notifySaveError("Could not open affiliate flags", err);
          });
          for (const o of newlyFlagged) {
            addNotification({
              type: "flagged_order",
              title: "Order flagged - multiple affiliates",
              message: `${o.programName || o.gymName || "Order"} · ${
                o.contactName || o.customerName || "Customer"
              }`,
              href: "/orders/flagged",
              dedupeKey: `flagged_order:${o.id}`,
            });
          }
        }
      }
      // Magento↔manual Suggested-for-You: catch matches that arrived while the
      // tab was closed, or SSE that landed before manuals were in state.
      if (loadedActiveOrders.length > 0) {
        flushMatchSuggestionNoticesRef.current(loadedActiveOrders);
      }

      // Past history is not in bootstrap; overlay only against the active board.
      const orderById = new Map<string, Order>();
      for (const order of loadedActiveOrders) {
        for (const key of [order.id, order.uuid, order.legacyId]) {
          if (key) orderById.set(key, order);
        }
      }

      const allBootOrders = loadedActiveOrders;
      const loadedMtdRecords = normalizeMTD(boot.mtdRecords)
        .filter((rec) => !isArchivedPayrollRecord(rec))
        .map((rec) => {
        const linked =
          (rec.orderId && orderById.get(rec.orderId)) ||
          orderById.get(rec.id) ||
          (rec.uuid && orderById.get(rec.uuid)) ||
          (rec.legacyId && orderById.get(rec.legacyId)) ||
          null;
        const enriched = linked
          ? overlayMergedFormForDisplay(linked, allBootOrders)
          : null;
        return mergeCollectionStateFromOrder(rec, enriched);
      });
      // Do NOT inject orderToMTDRecord fakes into mtdRecords: those reuse the
      // order UUID as id and cause PATCH /api/mtd/{orderId} → 404. Orders-tab
      // synthetics come from listPreMtdOrderRecords(activeOrders, mtdRecords).
      const combinedMtd = loadedMtdRecords.filter(isPersistedMtdRecord);
      // Don't clobber a newer optimistic Paid / board edit with a slower boot.
      // Board-first /api/bootstrap returns mtd: [] — keep SWR paint until a page
      // calls ensureLiveMtdLoaded (Dashboard KPIs use /dashboard/pulse).
      if (fetchedAt >= mtdMutatedAtRef.current && combinedMtd.length > 0) {
        setMtdRecords((prev) => {
          const next = combinedMtd.map((backend) => {
            const local = prev.find((r) => mtdRecordsReferToSame(r, backend));
            return mergeLocalMtdRecordFields(backend, local, {
              trustBackendBoardMembership: true,
            });
          });
          writeTimedCache(CACHE_MTD_KEY, next);
          return next;
        });
      }

      setDiscountCodes(boot.discountCodes);
      // Bootstrap returns payroll_addons: [] (hydrated on Payroll). Never wipe
      // a faster ensureVoiceover/Linked load or optimistic adds with empty boot.
      if (boot.payrollAddons.length > 0) {
        setPayrollAddons((prev) =>
          dedupePayrollAddons([...boot.payrollAddons, ...prev])
        );
      }

      if (boot.personalReasons.length > 0) {
        setPersonalReasons(ensurePersonalReasonsList(boot.personalReasons));
      }
      if (boot.emailTemplates) {
        setEmailTemplates(normalizeEmailTemplates(boot.emailTemplates));
      }
      if (boot.secretMenuPricing) {
        setSecretMenuPricesState(boot.secretMenuPricing);
      }

      setIsBackendConnected(true);
    }

    /**
     * Legacy path: parallel GETs when /api/bootstrap is missing or down.
     * Same shape as modern bootstrap — no unbounded orders/MTD lists
     * (those stay on paged boards + ensureLiveMtdLoaded / ensurePastOrdersLoaded).
     */
    async function fetchLegacyBootstrap(): Promise<BootstrapPayload> {
      // Match modern bootstrap: no unbounded payroll_addons (Payroll hydrates).
      const [
        producers,
        discountCodes,
        personalReasons,
        emailTemplates,
        secretMenuPricing,
      ] = await Promise.all([
        fetchProducersApi().catch(() => [] as Producer[]),
        fetchDiscountCodesApi().catch(() => [] as DiscountCode[]),
        fetchStudioPersonalReasonsApi().catch(
          () => [] as StudioPersonalReason[]
        ),
        fetchEmailTemplatesApi().catch(() => null),
        fetchSecretMenuPricingApi().catch(() => null),
      ]);

      if (
        producers.length === 0 &&
        discountCodes.length === 0 &&
        personalReasons.length === 0 &&
        !emailTemplates &&
        !secretMenuPricing
      ) {
        throw new Error("Legacy bootstrap returned no data");
      }

      return {
        producers,
        activeOrders: [] as Order[],
        pastOrders: [] as Order[],
        mtdRecords: [] as MTDRecord[],
        discountCodes,
        payrollAddons: [] as PayrollAddon[],
        personalReasons,
        emailTemplates,
        secretMenuPricing,
      };
    }

    async function loadBackendData() {
      const gen = ++loadGen;
      const fetchedAt = Date.now();
      try {
        let boot: BootstrapPayload;
        try {
          boot = await fetchBootstrapApi();
        } catch (bootErr) {
          console.warn(
            "Bootstrap endpoint failed; trying legacy parallel fetches.",
            bootErr
          );
          boot = await fetchLegacyBootstrap();
        }
        if (!isMounted || gen !== loadGen) return;
        applyBoot(boot, fetchedAt);
        // Bootstrap omits orders/mtd/payroll_addons (paged boards). Live MTD
        // stays on SWR paint until ensureLiveMtdLoaded; add-ons hydrate on
        // Payroll via ensurePayrollLinkedAddonsLoaded / ensureVoiceoverAddonsLoaded.
        // Package prices + SoftSelect affiliate catalogs from DB.
        void fetchPricingRulesApi()
          .then((rules) => {
            if (!isMounted || gen !== loadGen || !rules.length) return;
            applyDbPricingRules(rules);
          })
          .catch(() => {
            /* keep hardcoded defaults */
          });
        void fetchMusicAffiliatesApi()
          .then((affiliates) => {
            if (!isMounted || gen !== loadGen || !affiliates.length) return;
            applyDbMusicAffiliates(affiliates);
            // Recompute compliance now that per-subtype SoftSelect catalogs
            // are loaded: bootstrap normalized orders before this hydrate.
            const refreshCompliance = (order: Order): Order => ({
              ...order,
              priceCompliance: resolveOrderCompliance(order),
            });
            setActiveOrders((prev) => prev.map(refreshCompliance));
            setPastOrders((prev) => prev.map(refreshCompliance));
          })
          .catch(() => {
            /* keep hardcoded SoftSelect defaults */
          });
      } catch (err) {
        if (!isMounted) return;
        // Keep previous cache visible but mark disconnected so UI can retry.
        setIsBackendConnected(false);
        console.warn(
          "FastAPI backend unavailable or unreachable. Falling back to local cache.",
          err
        );
        // Soft retry once after a short delay (covers single cold-start miss).
        window.setTimeout(() => {
          if (!isMounted) return;
          const retryFetchedAt = Date.now();
          fetchBootstrapApi()
            .catch(() => fetchLegacyBootstrap())
            .then((boot) => {
              if (!isMounted) return;
              applyBoot(boot, retryFetchedAt);
              setIsLoading(false);
            })
            .catch(() => {
              /* still offline */
            });
        }, 1500);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadBackendData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Orders / MTD / producers use localStorage only as an SWR paint buffer.
  // Supabase via the API remains the source of truth; bootstrap always revalidates.

  const addAlert = useCallback((a: Omit<AppAlert, "id" | "createdAt">) => {
    const alert: AppAlert = {
      ...a,
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    setAlerts((prev) => [alert, ...prev].slice(0, 8));
  }, []);

  const addNotification = useCallback(
    (n: Omit<AppNotification, "id" | "read" | "createdAt">): boolean => {
      if (!isNotificationTypeEnabled(n.type)) return false;
      if (n.dedupeKey && !claimNotificationDedupeKey(n.dedupeKey)) {
        return false;
      }
      // Also skip if an unread/read copy with the same dedupe key is already in the inbox.
      if (n.dedupeKey) {
        let added = true;
        setNotifications((prev) => {
          if (prev.some((x) => x.dedupeKey === n.dedupeKey)) {
            added = false;
            return prev;
          }
          const notification: AppNotification = {
            ...n,
            id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            read: false,
            createdAt: new Date().toISOString(),
          };
          return [notification, ...prev].slice(0, 30);
        });
        return added;
      }
      const notification: AppNotification = {
        ...n,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        read: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [notification, ...prev].slice(0, 30));
      return true;
    },
    []
  );

  const recordUnseenSuggestedMatch = useCallback((formId: string) => {
    if (isMatchOrdersPageOpen()) return;
    setUnseenMatchFormIds((prev) => addUnseenMatchFormId(formId, prev));
  }, []);

  const markMatchOrdersSeen = useCallback(() => {
    clearUnseenMatchFormIds();
    setUnseenMatchFormIds([]);
  }, []);

  /**
   * Raise match_suggestion bells + Match Orders "N new" blink for every
   * Magento↔manual pair that is Suggested for You. Safe to call after
   * bootstrap / SSE: session dedupe prevents repeats.
   * Catches the race where Magento SSE lands before manuals are in state
   * (first paint would otherwise only fire a plain new_order bell).
   */
  const flushMatchSuggestionNotices = useCallback(
    (orders: Order[]) => {
      for (const event of listMatchSuggestionBellEvents(orders)) {
        const added = addNotification(event.notification);
        if (!added) continue;
        recordUnseenSuggestedMatch(event.formId);
        addAlert({
          tone: "info",
          title: event.notification.title,
          message: event.notification.message,
          href: event.notification.href,
        });
      }
    },
    [addAlert, addNotification, recordUnseenSuggestedMatch]
  );
  flushMatchSuggestionNoticesRef.current = flushMatchSuggestionNotices;

  const maybeNotifyMatchSuggestion = useCallback(
    (order: Order): { formId: string; manualId: string } | null => {
      const stamped = normalizeOrder(order);
      const catalog = [
        stamped,
        ...activeOrders.filter((o) => o.id !== stamped.id),
      ];
      const event = incomingOrderBellEvent(stamped, catalog);
      if (event.kind !== "match_suggestion") return null;
      const added = addNotification(event.notification);
      if (added) {
        recordUnseenSuggestedMatch(event.formId);
        addAlert({
          tone: "info",
          title: event.notification.title,
          message: event.notification.message,
          href: event.notification.href,
        });
      }
      return { formId: event.formId, manualId: event.manualId };
    },
    [activeOrders, addAlert, addNotification, recordUnseenSuggestedMatch]
  );

  const notifySaveError = useCallback(
    (title: string, err: unknown) => {
      addAlert({
        tone: "error",
        title,
        message: formatApiClientError(err, "Could not save. Please try again."),
      });
    },
    [addAlert]
  );

  const allOrders = useMemo(
    () => [...activeOrders, ...pastOrders],
    [activeOrders, pastOrders]
  );

  const mtdOrderIds = useMemo(
    () => new Set(mtdRecords.map((r) => r.orderId).filter(Boolean)),
    [mtdRecords]
  );

  const isInMTD = useCallback(
    (orderId: string) => mtdOrderIds.has(orderId),
    [mtdOrderIds]
  );

  let isViewOnly = false;
  try {
    const auth = useAuth();
    isViewOnly = auth.isViewOnly;
  } catch {
    // Fallback if rendered outside AuthProvider
  }

  const moveOrderToMTD = useCallback(
    (orderId: string): MTDRecord | null => {
      if (isViewOnly) return null;
      const order = activeOrders.find((o) => o.id === orderId);
      if (!order || isInMTD(orderId)) return null;

      const compliance = resolveOrderCompliance(order);
      const price = resolveStoredOrEngineCustomerPrice(order);

      const draftId = `mtd-${Date.now()}`;

      const sectionForCategory = (cat: string) => {
        if (cat === "Dance") return "DANCE MUSIC";
        if (cat === "Marching Band") return "MARCHING BAND";
        if (cat === "Sports Entertainment") return "SPORTS ENTERTAINMENT";
        if (cat === "School Anthem") return "SCHOOL ANTHEMS";
        return "CHEERLEADING MUSIC";
      };

      const coveringInvoice = pickInvoice(
        order.invoice,
        ...mtdRecords
          .filter((r) => mtdRecordCoversOrder(r, order))
          .map((r) => r.invoice)
      );

      // Mirror Orders-tab staging display: Order remains SoT; do not null
      // assignment/identity onto the create payload (that wiped Order fields).
      const draftRecord: MTDRecord = mergeCollectionStateFromOrder(
        {
        id: draftId,
        orderId: order.uuid || order.id,
        section: sectionForCategory(order.category),
          assignedProducer: order.assignedProducer ?? null,
        category: order.category,
          editorRequest: order.editorRequest || "FA",
          contactName: "",
          editorInitials: "",
          programName: "",
          package: "",
          musicTheme: order.musicTheme || "",
        price,
        priceCompliance: compliance,
        invoice: coveringInvoice,
          mixStartDate: order.mixStartDate || "",
          mixEndDate: order.mixEndDate || undefined,
          eightCountSheet: order.eightCountSheet || "",
          haveSongs: order.haveSongs || "",
          needsAttention: Boolean(order.needsAttention),
        status: "active",
        recordStatus: "Ongoing",
        formType: order.formType,
        cheerFormSubtype: order.cheerFormSubtype,
        danceFormSubtype: order.danceFormSubtype,
          inMTD: true,
        },
        order
      );

      const newRecord: MTDRecord = {
        ...draftRecord,
        inMTD: true,
      };

      setMtdRecords((prev) => [newRecord, ...prev]);
      const prevActive = activeOrders;
      const prevMtd = mtdRecords;
      setActiveOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: "in_mtd" as const, mtdId: newRecord.id }
            : o
        )
      );

      // Orders + MTD boards: drop from Orders / seed music board immediately
      // so ?focus= lands on a painted row (same class as Move-to-Payroll).
      patchOrdersBoardRowOptimistic(orderId, {
        status: "in_mtd",
        mtdId: newRecord.id,
      });
      if (order.uuid && order.uuid !== orderId) {
        patchOrdersBoardRowOptimistic(order.uuid, {
          status: "in_mtd",
          mtdId: newRecord.id,
        });
      }
      patchMtdBoardRecordInCaches(
        newRecord.id,
        { inMTD: true },
        newRecord
      );
      if (newRecord.orderId) {
        patchMtdBoardRecordInCaches(
          newRecord.orderId,
          { inMTD: true },
          newRecord
        );
      }

      // Persist board row only: Order SoT stays on the Order (no wipe on create).
      void (async () => {
        try {
          const saved = await createMTDRecordApi({
            id: draftId,
            orderId: order.uuid || order.id,
            section: newRecord.section,
            price: newRecord.price,
            priceCompliance: newRecord.priceCompliance,
            invoice: newRecord.invoice || "",
            status: newRecord.status,
            recordStatus: newRecord.recordStatus,
            inMTD: true,
            hasExtend8ctAddon: newRecord.hasExtend8ctAddon,
            hasProcessing8ctSheetsAddon: newRecord.hasProcessing8ctSheetsAddon,
          });
          const hydrated = mergeCollectionStateFromOrder(
            {
              ...saved,
              orderId: saved.orderId || order.uuid || order.id,
              formType: saved.formType || newRecord.formType,
              cheerFormSubtype:
                saved.cheerFormSubtype || newRecord.cheerFormSubtype,
              danceFormSubtype:
                saved.danceFormSubtype || newRecord.danceFormSubtype,
              inMTD: true,
            },
            order
          );
            setMtdRecords((prev) =>
            prev.map((r) => (r.id === draftId ? hydrated : r))
          );
          // Re-seed under server id if it differs from the draft key.
          patchMtdBoardRecordInCaches(hydrated.id, { inMTD: true }, hydrated);
          if (hydrated.orderId) {
            patchMtdBoardRecordInCaches(
              hydrated.orderId,
              { inMTD: true },
              hydrated
            );
          }
          await updateOrderApi(orderId, {
            status: "in_mtd",
            mtdId: saved.id || newRecord.id,
          });
          setIsBackendConnected(true);
        } catch (err) {
          console.error("Failed to move order to MTD:", err);
          setActiveOrders(prevActive);
          setMtdRecords(prevMtd);
          notifySaveError("Could not move to MTD", err);
        }
      })();

      const label =
        getOrderIdentityName(order) ||
        order.programName ||
        order.contactName ||
        "Order";
      addAlert({
        tone: "success",
        title: "Moved to MTD",
        message: `${label} is now in Music To Do.`,
        href: `/mtd?focus=${encodeURIComponent(newRecord.id)}`,
      });

      return newRecord;
    },
    [
      activeOrders,
      isInMTD,
      mtdRecords,
      addAlert,
      notifySaveError,
      isViewOnly,
    ]
  );

  const setSecretMenuPrices = useCallback(
    (pricing: SecretMenuPricing) => {
      if (isViewOnly) return;
      const prev = secretMenuPrices;
      setSecretMenuPricesState(pricing);
      void saveSecretMenuPricingApi(pricing)
        .then((saved) => setSecretMenuPricesState(saved))
        .catch((err) => {
          setSecretMenuPricesState(prev);
          notifySaveError("Could not save secret menu pricing", err);
        });
    },
    [isViewOnly, secretMenuPrices, notifySaveError]
  );

  const updateMTD = useCallback(async (
    id: string,
    patch: Partial<MTDRecord>,
    seed?: MTDRecord
  ) => {
    if (isViewOnly) return;

    // Fast path: invoice-only edits skip assignment/identity machinery and
    // never wait on an Orders PATCH (invoice is mtd_records SoT).
    const patchKeys = Object.keys(patch);
    if (patchKeys.length === 1 && patch.invoice !== undefined) {
      mtdMutatedAtRef.current = Date.now();
      ordersMutatedAtRef.current = Date.now();
      const invoiceNext = String(patch.invoice ?? "").trim();
      const existing =
        mtdRecords.find(
          (r) =>
            r.id === id ||
            r.orderId === id ||
            r.uuid === id ||
            r.legacyId === id
        ) || seed;
      const earlyOrderLookupIds = new Set(
        [
          id,
          existing?.orderId,
          existing?.id,
          existing?.uuid,
          existing?.legacyId,
          seed?.orderId,
          seed?.id,
          seed?.uuid,
          seed?.legacyId,
        ].filter((value): value is string => Boolean(value))
      );
      const linkedOrder = activeOrders.find(
        (o) =>
          earlyOrderLookupIds.has(o.id) ||
          (o.legacyId && earlyOrderLookupIds.has(o.legacyId)) ||
          (o.uuid && earlyOrderLookupIds.has(o.uuid)) ||
          (o.mtdId && earlyOrderLookupIds.has(o.mtdId))
      );
      const coveringPersisted =
        (existing && isPersistedMtdRecord(existing) ? existing : undefined) ||
        (seed && isPersistedMtdRecord(seed) ? seed : undefined) ||
        (linkedOrder
          ? mtdRecords.find(
              (r) =>
                isPersistedMtdRecord(r) && mtdRecordCoversOrder(r, linkedOrder)
            )
          : undefined);

      if (linkedOrder) {
        setActiveOrders((prev) =>
          prev.map((o) =>
            o.id === linkedOrder.id ? { ...o, invoice: invoiceNext } : o
          )
        );
      }
      // Board-first MTD table reads paged cache, not AppState — keep it in sync.
      for (const key of [
        id,
        coveringPersisted?.id,
        coveringPersisted?.uuid,
        existing?.id,
        existing?.uuid,
        seed?.id,
        seed?.uuid,
        seed?.orderId,
        linkedOrder?.id,
        linkedOrder?.uuid,
        linkedOrder?.mtdId,
      ]) {
        if (key) patchMtdBoardRecordInCaches(key, { invoice: invoiceNext });
      }
      setMtdRecords((prev) => {
        let matched = false;
        const next = prev.map((r) => {
          if (
            r.id !== id &&
            r.orderId !== id &&
            r.uuid !== id &&
            r.legacyId !== id &&
            !(
              coveringPersisted &&
              (r.id === coveringPersisted.id ||
                r.uuid === coveringPersisted.uuid)
            )
          ) {
            return r;
          }
          matched = true;
          return { ...r, invoice: invoiceNext };
        });
        if (!matched && linkedOrder) {
          const staged = stagingRecordFromOrder({
            ...linkedOrder,
            invoice: invoiceNext,
          });
          next.unshift({
            ...staged,
            ...(existing && !isPersistedMtdRecord(existing) ? existing : {}),
            invoice: invoiceNext,
            orderId: linkedOrder.uuid || linkedOrder.id,
            inMTD: Boolean(existing?.inMTD || coveringPersisted?.inMTD),
          });
        }
        writeTimedCache(CACHE_MTD_KEY, next);
        return next;
      });

      const prevActive = activeOrders;
      const prevMtd = mtdRecords;
      try {
        if (coveringPersisted && isPersistedMtdRecord(coveringPersisted)) {
          const apiId = coveringPersisted.uuid || coveringPersisted.id;
          const saved = await updateMTDRecordApi(apiId, {
            invoice: invoiceNext,
          });
          const savedInvoice = pickInvoice(
            invoiceNext,
            saved.invoice,
            coveringPersisted.invoice
          );
          patchMtdBoardRecordInCaches(apiId, { invoice: savedInvoice });
          setMtdRecords((prev) =>
            prev.map((r) =>
              r.id === coveringPersisted.id ||
              r.uuid === coveringPersisted.uuid
                ? {
                    ...r,
                    // Explicit edit wins over a stale API echo / prior local value.
                    invoice: savedInvoice,
                  }
                : r
            )
          );
        } else if (linkedOrder || seed?.orderId) {
          const orderRef = linkedOrder || {
            id: seed!.orderId!,
            uuid: seed!.orderId,
          } as Order;
          const orderWithInvoice = linkedOrder
            ? { ...linkedOrder, invoice: invoiceNext }
            : orderRef;
          const boardInMtd =
            seed?.inMTD !== undefined
              ? seed.inMTD
              : existing?.inMTD !== undefined
                ? existing.inMTD
                : true;
          const seeded = mergeCollectionStateFromOrder(
            {
              ...stagingRecordFromOrder(orderWithInvoice as Order),
              ...(existing && !isPersistedMtdRecord(existing) ? existing : {}),
              ...(seed && !isPersistedMtdRecord(seed) ? seed : {}),
              invoice: invoiceNext,
              orderId:
                linkedOrder?.uuid ||
                linkedOrder?.id ||
                seed?.orderId ||
                undefined,
              inMTD: boardInMtd,
            },
            orderWithInvoice as Order
          );
          const saved = await createMTDRecordApi(seeded);
          const mergedInvoice = pickInvoice(invoiceNext, saved.invoice);
          const mergedSaved = mergeCollectionStateFromOrder(
            {
              ...seeded,
              ...saved,
              id: saved.id,
              uuid: saved.uuid,
              orderId: saved.orderId || seeded.orderId,
              invoice: mergedInvoice,
            },
            orderWithInvoice
          );
          for (const key of [
            id,
            seed?.id,
            seed?.uuid,
            seed?.orderId,
            saved.id,
            saved.uuid,
            saved.orderId,
          ]) {
            if (key) patchMtdBoardRecordInCaches(key, { invoice: mergedInvoice });
          }
          const orderForCollapse =
            linkedOrder ||
            (seed?.orderId
              ? ({ id: seed.orderId, uuid: seed.orderId } as Order)
              : undefined);
          setMtdRecords((prev) =>
            orderForCollapse
              ? collapsePreMtdClonesForOrder(prev, mergedSaved, orderForCollapse)
              : normalizeMTD([mergedSaved, ...prev])
          );
        }
      } catch (err) {
        setActiveOrders(prevActive);
        setMtdRecords(prevMtd);
        notifySaveError("Could not save invoice", err);
        throw err;
      }
      return;
    }

    let apiPatch = patch;

    const existing =
      mtdRecords.find(
        (r) =>
          r.id === id || r.orderId === id || r.uuid === id || r.legacyId === id
      ) ||
      seed ||
      // Payroll/MTD are board-first — Mark Paid must still PATCH paid_at.
      readCachedMtdBoardRow(id) ||
      null;
    const apiId = existing?.uuid || existing?.id || seed?.uuid || seed?.id || id;
    mtdMutatedAtRef.current = Date.now();
    ordersMutatedAtRef.current = Date.now();

    // Toast immediately on action: do not wait for the API round-trip.
    // Do not navigate — same pattern for Payroll and Music To Do.
    if (patch.inPayroll === true && existing && !existing.inPayroll) {
      const producer = existing.assignedProducer?.trim();
      addAlert({
        tone: "success",
        title: "Moved to payroll",
        message: producer
          ? `${existing.programName} · ${producer}`
          : existing.programName,
        href: "/payroll",
      });
    }
    if (patch.inMTD === true && existing && !existing.inMTD) {
      const label =
        existing.programName?.trim() ||
        existing.contactName?.trim() ||
        "Order";
      const producer = (
        patch.assignedProducer ?? existing.assignedProducer
      )?.trim();
      addAlert({
        tone: "success",
        title: "Moved to MTD",
        message: producer ? `${label} · ${producer}` : label,
        href: `/mtd?focus=${encodeURIComponent(existing.id)}`,
      });
    }

    // Resolve linked order before the optimistic write so Move to MTD can
    // seed a board row even when the Orders tab row was synthetic-only.
    // Board-first: bootstrap may ship empty orders — also use seed.orderId.
    const earlyOrderLookupIds = new Set(
      [
        id,
        existing?.orderId,
        existing?.id,
        existing?.uuid,
        existing?.legacyId,
        seed?.orderId,
        seed?.id,
        seed?.uuid,
        seed?.legacyId,
      ].filter((value): value is string => Boolean(value))
    );
    const earlyLinkedOrder = activeOrders.find(
      (o) =>
        earlyOrderLookupIds.has(o.id) ||
        (o.legacyId && earlyOrderLookupIds.has(o.legacyId)) ||
        (o.uuid && earlyOrderLookupIds.has(o.uuid)) ||
        (o.mtdId && earlyOrderLookupIds.has(o.mtdId))
    );

    // Board-first MTD / Payroll paint — one canonical patch. Re-patching every
    // alias id used to prepend duplicate Payroll rows when an alias (e.g. stale
    // order.mtdId) did not match the cached row via mtdRowMatchesId.
    {
      const boardId =
        existing?.uuid ||
        existing?.id ||
        seed?.uuid ||
        seed?.id ||
        id ||
        existing?.orderId ||
        seed?.orderId ||
        earlyLinkedOrder?.mtdId ||
        earlyLinkedOrder?.id ||
        null;
      if (boardId) {
        patchMtdBoardRecordInCaches(boardId, patch, existing ?? seed);
      }
    }

    setMtdRecords((prev) => {
      let matched = false;
      const next = prev.map((r) => {
        if (r.id !== id && r.orderId !== id && r.uuid !== id && r.legacyId !== id) return r;
        matched = true;

        const updated = {
          ...r,
          ...patch,
          // Never let an empty invoice wipe a saved # (Move to Orders / return).
          invoice: pickInvoice(patch.invoice, r.invoice),
        };

        if (patch.editorRequest === "NA" || patch.assignedProducer === null) {
          updated.assignedProducer = null;
          apiPatch = { ...apiPatch, assignedProducer: null };
          if (patch.mixStartDate === undefined) {
            // Local UI uses ""; API must send null (Postgres Date rejects "").
            updated.mixStartDate = "";
            apiPatch = { ...apiPatch, mixStartDate: null as unknown as string };
          }
          if (patch.mixEndDate === undefined) {
            updated.mixEndDate = undefined;
            apiPatch = { ...apiPatch, mixEndDate: null as unknown as string };
          }
        } else if (patch.assignedProducer !== undefined) {
          const resolved = resolveAssignedProducerForPatch(
            patch.assignedProducer,
            producers,
            updated.category
          );
          updated.assignedProducer = resolved;
          apiPatch = { ...apiPatch, assignedProducer: resolved };

          if (resolved && !r.inMTD && patch.inMTD === undefined) {
            updated.inMTD = false;
            apiPatch = { ...apiPatch, inMTD: false };
          }

          if (
            resolved &&
            !toIsoDateString(updated.mixStartDate) &&
            patch.mixStartDate === undefined
          ) {
            const mixStartDate = suggestMixStartDate(
              resolved,
              producers,
              schedule,
              mtdRecords
            );
            if (mixStartDate) {
              updated.mixStartDate = mixStartDate;
              apiPatch = { ...apiPatch, mixStartDate };
            }
          }
        } else if (
          patch.editorRequest &&
          patch.editorRequest !== "FA" &&
          patch.editorRequest !== "NA"
        ) {
          const resolved = resolveAssignedProducerForPatch(
            patch.editorRequest,
            producers,
            updated.category
          );
          if (resolved) {
            updated.assignedProducer = resolved;
            apiPatch = { ...apiPatch, assignedProducer: resolved };
          }
        }

        if (
          patch.package ||
          patch.priceCompliance ||
          patch.musicTheme ||
          patch.musicAffiliate !== undefined
        ) {
          const compliance =
            patch.priceCompliance ||
            resolveOrderCompliance({
              ...updated,
              musicTheme: patch.musicTheme ?? updated.musicTheme,
              musicAffiliate:
                patch.musicAffiliate !== undefined
                  ? patch.musicAffiliate
                  : (updated as MTDRecord & { musicAffiliate?: string })
                      .musicAffiliate,
            });
          updated.priceCompliance = compliance;
          if (patch.price === undefined) {
            const linkedOrder =
              activeOrders.find(
                (o) =>
                  o.id === r.orderId ||
                  o.id === r.id ||
                  o.uuid === r.orderId ||
                  o.uuid === r.uuid ||
                  o.legacyId === r.legacyId
              ) ?? null;
            const live = resolveLiveOrderPricing(updated, linkedOrder);
            updated.price =
              live.engineCustomerPrice != null && live.engineCustomerPrice > 0
                ? live.engineCustomerPrice
                : live.customerPrice > 0
                  ? live.customerPrice
                  : r.price;
          }
        }

        const sheet = String(updated.eightCountSheet ?? "");
        const songs = String(updated.haveSongs ?? "");
        const needsCs = sheet.toUpperCase().includes("NEED");
        const needsSongs = songs.toUpperCase().includes("NEED");
        updated.needsAttention = needsCs || needsSongs;

        return updated;
      });

      // Synthetic / board-first rows are not in mtdRecords: insert immediately so
      // MTD invoice UI, Move-to-Orders, and return-to-MTD keep the #.
      if (
        !matched &&
        (patch.inMTD === true ||
          patch.inMTD === false ||
          (patch.invoice !== undefined && String(patch.invoice).trim() !== ""))
      ) {
        const seedOrder = earlyLinkedOrder;
        const staged = seedOrder
          ? stagingRecordFromOrder(seedOrder)
          : null;
        const base =
          seed && !isPersistedMtdRecord(seed)
            ? seed
            : staged ||
              (seed && isPersistedMtdRecord(seed) ? seed : null);
        const optimistic: MTDRecord = {
          ...(base ||
            ({
              id,
              orderId: id,
              section: "CHEERLEADING MUSIC",
              assignedProducer: null,
              category: "Cheer",
              editorRequest: "FA",
              contactName: "",
              editorInitials: "",
              programName: "",
              package: "",
              musicTheme: "",
              price: 0,
              priceCompliance: "compliant",
              invoice: "",
              mixStartDate: "",
              eightCountSheet: "",
              haveSongs: "",
              needsAttention: false,
              status: "active",
              recordStatus: "Ongoing",
              inMTD: false,
            } satisfies MTDRecord)),
          ...patch,
          id: (base && isPersistedMtdRecord(base) ? base.id : null) ||
            seed?.id ||
            staged?.id ||
            id,
          uuid: seed?.uuid || (base as MTDRecord | null)?.uuid,
          orderId:
            seedOrder?.uuid ||
            seedOrder?.id ||
            seed?.orderId ||
            staged?.orderId ||
            id,
          invoice: pickInvoice(
            patch.invoice,
            seed?.invoice,
            staged?.invoice,
            seedOrder?.invoice,
            (base as MTDRecord | null)?.invoice
          ),
          inMTD:
            patch.inMTD !== undefined
              ? Boolean(patch.inMTD)
              : Boolean(seed?.inMTD ?? staged?.inMTD),
          status: patch.status || seed?.status || staged?.status || "active",
          recordStatus:
            patch.recordStatus ||
            seed?.recordStatus ||
            staged?.recordStatus ||
            "Ongoing",
        };
        next.unshift(optimistic);
      }

      // Paid archive leaves the live working set (never cache paid rows).
      const paidMoved: MTDRecord[] = [];
      const liveNext = next.filter((r) => {
        if (!isArchivedPayrollRecord(r)) return true;
        paidMoved.push(r);
        return false;
      });
      if (
        paidMoved.length > 0 &&
        shouldApplyArchivedPayrollUpdate(archivedPayrollLoadedRef.current)
      ) {
        setArchivedPayrollRecords((prevArchive) => {
          let archive = [...prevArchive];
          for (const paid of paidMoved) {
            const aidx = archive.findIndex((r) =>
              mtdRecordsReferToSame(r, paid)
            );
            if (aidx === -1) archive = [paid, ...archive];
            else archive[aidx] = paid;
          }
          return normalizeMTD(archive);
        });
      }
      writeTimedCache(CACHE_MTD_KEY, liveNext);
      return liveNext;
    });

    // Sync linked Order. MTD rows use their own UUID as `id`, so also match via
    // orderId / mtdId: otherwise Move to Orders never flips Order.status off in_mtd.
    // Board-first: AppState.activeOrders is often empty — still PATCH by orderId.
    const orderLookupIds = new Set(
      [
        id,
        existing?.orderId,
        existing?.id,
        existing?.uuid,
        existing?.legacyId,
        seed?.orderId,
        seed?.id,
        seed?.uuid,
        seed?.legacyId,
      ].filter((value): value is string => Boolean(value))
    );
    const linkedOrder = activeOrders.find(
      (o) =>
        orderLookupIds.has(o.id) ||
        (o.legacyId && orderLookupIds.has(o.legacyId)) ||
        (o.uuid && orderLookupIds.has(o.uuid)) ||
        (o.mtdId && orderLookupIds.has(o.mtdId))
    );
    const orderIdForApi =
      linkedOrder?.id ||
      existing?.orderId ||
      seed?.orderId ||
      null;

    const orderPatch: Record<string, unknown> = {};
    let undoBoardPatch: () => void = () => undefined;
    if (orderIdForApi) {
      if (patch.assignedProducer !== undefined) {
        orderPatch.assignedProducer =
          apiPatch.assignedProducer ?? patch.assignedProducer;
      }
      // Local Order mirror only (API has no invoice column) so Match / Orders /
      // return-to-MTD keep a # set on MTD or Assign (incl. after Move to Orders).
      {
        const mirroredInvoice = pickInvoice(
          patch.invoice,
          existing?.invoice,
          seed?.invoice,
          linkedOrder?.invoice
        );
        if (patch.invoice !== undefined || patch.inMTD === false) {
          if (mirroredInvoice) orderPatch.invoice = mirroredInvoice;
        }
      }
      if (patch.mixStartDate !== undefined) {
        orderPatch.mixStartDate = apiPatch.mixStartDate ?? patch.mixStartDate;
      }
      if (patch.mixEndDate !== undefined) {
        orderPatch.mixEndDate = apiPatch.mixEndDate ?? patch.mixEndDate;
      }
      // Phase 2: pricing/payout SoT is Orders: do not push price fields
      // from MTD patches onto the linked order.
      // Phase 3: identity SoT is Orders: route board identity edits here.
      {
        const identityOrderPatch = orderPatchFromMTD(patch);
        delete identityOrderPatch.price;
        delete identityOrderPatch.priceCompliance;
        Object.assign(orderPatch, identityOrderPatch);
      }
      if (patch.editorRequest !== undefined) {
        orderPatch.editorRequest = patch.editorRequest;
      }
      if (patch.inMTD === true) orderPatch.status = "in_mtd";
      if (patch.inMTD === false) orderPatch.status = "active";
      if (patch.isReassigned !== undefined) {
        orderPatch.isReassigned = patch.isReassigned;
      }
      if (patch.missingDataEmailSentAt !== undefined) {
        orderPatch.missingDataEmailSentAt = patch.missingDataEmailSentAt;
      }
      if (patch.producerEmailSentAt !== undefined) {
        orderPatch.producerEmailSentAt = patch.producerEmailSentAt;
      }
      if (patch.producerEmailSentTo !== undefined) {
        orderPatch.producerEmailSentTo = patch.producerEmailSentTo;
      }
      // Stamp so stale awaiting SSE cannot wipe a fresh assign / reassign.
      if (
        patch.isReassigned !== undefined ||
        patch.assignedProducer !== undefined ||
        patch.mixStartDate !== undefined ||
        patch.mixEndDate !== undefined
      ) {
        orderPatch.updatedAt = new Date().toISOString();
      }
      if (patch.collectionStates !== undefined) {
        orderPatch.collectionStates = patch.collectionStates;
      }
      if (patch.haveSongs !== undefined) orderPatch.haveSongs = patch.haveSongs;
      if (patch.eightCountSheet !== undefined) {
        orderPatch.eightCountSheet = patch.eightCountSheet;
      }
      if ((patch as { orderStatus?: string }).orderStatus !== undefined) {
        orderPatch.orderStatus = (patch as { orderStatus?: string }).orderStatus;
      }
      if (Object.keys(orderPatch).length > 0) {
        // Block slower boot/SSE from wiping Move-to-Orders reassign before PATCH lands.
        ordersMutatedAtRef.current = Date.now();
        const seedOrder =
          linkedOrder ||
          (existing || seed
            ? orderFromMTDRecord(existing || seed!)
            : null);
        setActiveOrders((prev) => {
          if (prev.some((o) => o.id === orderIdForApi)) {
            return prev.map((o) =>
              o.id === orderIdForApi ? { ...o, ...orderPatch } : o
            );
          }
          if (seedOrder) {
            return [{ ...seedOrder, id: orderIdForApi, ...orderPatch } as Order, ...prev];
          }
          return prev;
        });
        undoBoardPatch = patchOrdersBoardRowOptimistic(
          orderIdForApi,
          orderPatch as Partial<Order>
        );
        // Paint Reassign before the Order PATCH so ?range=reassigned lands
        // on a seeded row (and keeps createdAt — no Timestamp blink).
        if (patch.isReassigned === true && patch.inMTD === false) {
          const mtdSeed = existing || seed;
          const seedForBoard =
            seedOrder ||
            (mtdSeed ? orderFromMTDRecord(mtdSeed) : null);
          if (seedForBoard || orderIdForApi) {
            const meta = mtdSeed
              ? resolveMTDFormMeta(mtdSeed, new Map())
              : null;
            const stamp =
              String(
                (seedForBoard as Order | null)?.createdAt ||
                  linkedOrder?.createdAt ||
                  mtdSeed?.createdAt ||
                  ""
              ).trim() ||
              readOrdersBoardOrder(orderIdForApi)?.createdAt ||
              "";
            syncOrdersBoardAfterReassign(
              {
                ...(seedForBoard || ({ id: orderIdForApi } as Order)),
                ...orderPatch,
                id: orderIdForApi,
                isReassigned: true,
                status: "active",
                assignedProducer: null,
                ...(stamp ? { createdAt: stamp } : {}),
                ...(meta
                  ? {
                      formType: meta.formType,
                      cheerFormSubtype: meta.cheerFormSubtype,
                      danceFormSubtype: meta.danceFormSubtype,
                    }
                  : {}),
              } as Order,
              meta
                ? {
                    formType: meta.formType,
                    cheerFormSubtype: meta.cheerFormSubtype,
                    danceFormSubtype: meta.danceFormSubtype,
                  }
                : undefined
            );
          }
        }
      }
    }

    // Never persist Order-SoT identity/assignment onto mtd_records (display only).
    const mtdApiPatch: Partial<MTDRecord> = { ...apiPatch };
    delete mtdApiPatch.contactName;
    delete mtdApiPatch.programName;
    delete mtdApiPatch.package;
    delete mtdApiPatch.musicTheme;
    delete mtdApiPatch.category;
    delete mtdApiPatch.editorRequest;
    delete mtdApiPatch.assignedProducer;
    delete mtdApiPatch.editorInitials;
    delete mtdApiPatch.mixStartDate;
    delete mtdApiPatch.mixEndDate;
    delete mtdApiPatch.isReassigned;
    // Phase 5: collection / email / attention → Orders only.
    delete mtdApiPatch.eightCountSheet;
    delete mtdApiPatch.haveSongs;
    delete mtdApiPatch.collectionStates;
    delete mtdApiPatch.orderStatus;
    delete mtdApiPatch.needsAttention;
    delete mtdApiPatch.missingDataEmailSentAt;
    delete mtdApiPatch.producerEmailSentAt;
    delete mtdApiPatch.producerEmailSentTo;
    // Empty invoice must never wipe mtd_records SoT (Move to Orders → return).
    if (
      mtdApiPatch.invoice !== undefined &&
      !String(mtdApiPatch.invoice ?? "").trim()
    ) {
      delete mtdApiPatch.invoice;
    }
    apiPatch = mtdApiPatch;

    const prevActive = activeOrders;
    const prevMtd = mtdRecords;

    // Persist: order shared fields first (canonical), then MTD board row.
      try {
        if (orderIdForApi && Object.keys(orderPatch).length > 0) {
          // Invoice is mtd_records SoT — keep it on the Order in memory only.
          const { invoice: _invoiceMirror, ...orderApiPatch } = orderPatch as {
            invoice?: string;
          } & Record<string, unknown>;
          if (Object.keys(orderApiPatch).length > 0) {
            await updateOrderApi(orderIdForApi, orderApiPatch);
          }
          // Reassign board seed runs optimistically above (before await).
        }

        // Prefer an existing persisted mtd_records row for this order so invoice
        // / board fields survive Assign → Match → Move → Payroll without clones.
        const coveringPersisted =
          (existing && isPersistedMtdRecord(existing) ? existing : undefined) ||
          (seed && isPersistedMtdRecord(seed) ? seed : undefined) ||
          (linkedOrder
            ? mtdRecords.find(
                (r) =>
                  isPersistedMtdRecord(r) &&
                  mtdRecordCoversOrder(r, linkedOrder)
              )
            : undefined);

        if (patch.inMTD === true) {
          const targetRecord = mtdRecords.find(
            (r) =>
              r.id === id ||
              r.orderId === id ||
              r.uuid === id ||
              r.legacyId === id
          );
          // Orders-tab rows are often synthetic (listPreMtdOrderRecords) and are
          // NOT in mtdRecords state: always seed orderId from the linked Order.
          const orderRef =
            linkedOrder?.uuid ||
            linkedOrder?.id ||
            coveringPersisted?.orderId ||
            targetRecord?.orderId ||
            (existing && !isPersistedMtdRecord(existing) ? existing.id : null) ||
            null;
          if (!orderRef) {
            throw new Error(
              "Cannot move to MTD without a linked order_id"
            );
          }
          const invoiceSeed = pickInvoice(
            (apiPatch as MTDRecord).invoice,
            patch.invoice,
            coveringPersisted?.invoice,
            targetRecord?.invoice,
            existing?.invoice,
            seed?.invoice,
            linkedOrder?.invoice
          );
          const boardPatch: Partial<MTDRecord> = {
            ...apiPatch,
            orderId: orderRef,
            inMTD: true,
            recordStatus:
              (apiPatch as MTDRecord).recordStatus ||
              coveringPersisted?.recordStatus ||
              targetRecord?.recordStatus ||
              "Ongoing",
            status: (apiPatch as MTDRecord).status || "active",
          };
          // Prefer kept #; never send blank invoice that clears DB.
          if (invoiceSeed) boardPatch.invoice = invoiceSeed;
          else delete boardPatch.invoice;

          let nextRow: MTDRecord;
          if (coveringPersisted && isPersistedMtdRecord(coveringPersisted)) {
            const realApiId = coveringPersisted.uuid || coveringPersisted.id;
            const saved = await updateMTDRecordApi(realApiId, boardPatch);
            nextRow = mergeCollectionStateFromOrder(
              {
                ...coveringPersisted,
                ...boardPatch,
                ...saved,
                id: saved.id || coveringPersisted.id,
                uuid: saved.uuid || coveringPersisted.uuid,
                legacyId: saved.legacyId || coveringPersisted.legacyId,
                orderId: saved.orderId || orderRef,
                inMTD: true,
                invoice: pickInvoice(
                  saved.invoice,
                  invoiceSeed,
                  coveringPersisted.invoice
                ),
              },
              linkedOrder
            );
          } else {
            const updatedRecord: MTDRecord = {
              ...(targetRecord || existing || ({} as MTDRecord)),
              ...boardPatch,
              orderId: orderRef,
              inMTD: true,
              collectionStates:
                (apiPatch as MTDRecord).collectionStates ??
                targetRecord?.collectionStates ??
                linkedOrder?.collectionStates,
              haveSongs:
                (apiPatch as MTDRecord).haveSongs ||
                targetRecord?.haveSongs ||
                linkedOrder?.haveSongs ||
                "",
              eightCountSheet:
                (apiPatch as MTDRecord).eightCountSheet ||
                targetRecord?.eightCountSheet ||
                linkedOrder?.eightCountSheet ||
                "",
              invoice: invoiceSeed,
            };
            const saved = await createMTDRecordApi({
              ...updatedRecord,
              orderId: orderRef,
              inMTD: true,
              invoice: invoiceSeed,
            });
            nextRow = mergeCollectionStateFromOrder(
              {
                ...(targetRecord || existing || updatedRecord),
                ...boardPatch,
                ...saved,
                id: saved.id,
                uuid: saved.uuid,
                legacyId: saved.legacyId,
                orderId: saved.orderId || orderRef,
                inMTD: true,
                invoice: pickInvoice(saved.invoice, invoiceSeed),
                recordStatus:
                  saved.recordStatus ||
                  updatedRecord.recordStatus ||
                  "Ongoing",
              },
              linkedOrder
            );
          }
          setMtdRecords((prev) => {
            const match = (r: MTDRecord) =>
              r.id === id ||
              r.orderId === id ||
              r.uuid === id ||
              r.legacyId === id ||
              r.orderId === orderRef ||
              r.id === orderRef ||
              (coveringPersisted != null &&
                (r.id === coveringPersisted.id ||
                  r.uuid === coveringPersisted.uuid));
            if (prev.some(match)) {
              return prev.map((r) => (match(r) ? { ...r, ...nextRow } : r));
            }
            return [nextRow, ...prev];
          });
        } else if (Object.keys(apiPatch).length > 0) {
          // Invoice / payroll / waiting_on live on mtd_records. Persist even
          // when the Orders board row is still synthetic (Assign invoice).
          if (coveringPersisted && isPersistedMtdRecord(coveringPersisted)) {
            const linkedApiId = coveringPersisted.uuid || coveringPersisted.id;
            const invoiceSeed = pickInvoice(
              (apiPatch as MTDRecord).invoice,
              coveringPersisted.invoice,
              linkedOrder?.invoice
            );
            const saved = await updateMTDRecordApi(linkedApiId, {
              ...apiPatch,
              ...(invoiceSeed && (apiPatch as MTDRecord).invoice !== undefined
                ? { invoice: invoiceSeed }
                : {}),
            });
            setMtdRecords((prev) =>
              prev.map((r) =>
                r.id === coveringPersisted.id ||
                r.uuid === coveringPersisted.uuid ||
                (coveringPersisted.orderId &&
                  r.orderId === coveringPersisted.orderId)
                  ? {
                      ...r,
                      ...apiPatch,
                      ...saved,
                      invoice: pickInvoice(
                        (apiPatch as MTDRecord).invoice,
                        saved.invoice,
                        r.invoice
                      ),
                      // Order SoT fields are stripped from mtd API patches —
                      // keep Move-to-Orders reassign / cleared assignment locally
                      // so Reassign tab does not flash empty before Order merges.
                      ...(patch.isReassigned !== undefined
                        ? { isReassigned: Boolean(patch.isReassigned) }
                        : {}),
                      ...(patch.inMTD !== undefined
                        ? { inMTD: Boolean(patch.inMTD) }
                        : {}),
                      ...(patch.orderStatus !== undefined
                        ? { orderStatus: patch.orderStatus }
                        : {}),
                      ...(patch.assignedProducer !== undefined
                        ? { assignedProducer: patch.assignedProducer }
                        : {}),
                      ...(patch.mixStartDate !== undefined
                        ? { mixStartDate: patch.mixStartDate || "" }
                        : {}),
                      ...(patch.mixEndDate !== undefined
                        ? { mixEndDate: patch.mixEndDate || "" }
                        : {}),
                    }
                  : r
              )
            );
          } else if (linkedOrder) {
            const invoiceSeed = pickInvoice(
              (apiPatch as MTDRecord).invoice,
              linkedOrder.invoice,
              existing?.invoice
            );
            const seeded = mergeCollectionStateFromOrder(
              {
                ...stagingRecordFromOrder(linkedOrder),
                ...(existing && !isPersistedMtdRecord(existing) ? existing : {}),
                ...apiPatch,
                orderId: linkedOrder.uuid || linkedOrder.id,
                inMTD: false,
                invoice: invoiceSeed,
              },
              linkedOrder
            );
            const saved = await createMTDRecordApi(seeded);
            const mergedSaved: MTDRecord = mergeCollectionStateFromOrder(
              {
                ...seeded,
                ...apiPatch,
                ...saved,
                id: saved.id,
                uuid: saved.uuid,
                orderId: saved.orderId || seeded.orderId,
                invoice: pickInvoice(saved.invoice, invoiceSeed),
              },
              linkedOrder
            );
            setMtdRecords((prev) =>
              collapsePreMtdClonesForOrder(prev, mergedSaved, linkedOrder)
            );
          } else if (existing) {
            const invoiceSeed = pickInvoice(
              (apiPatch as MTDRecord).invoice,
              existing.invoice
            );
            const seeded: MTDRecord = {
              ...existing,
              ...apiPatch,
              orderId: existing.orderId || existing.id,
              invoice: invoiceSeed,
              collectionStates:
                (apiPatch as MTDRecord).collectionStates ??
                existing.collectionStates,
              haveSongs:
                (apiPatch as MTDRecord).haveSongs || existing.haveSongs || "",
              eightCountSheet:
                (apiPatch as MTDRecord).eightCountSheet ||
                existing.eightCountSheet ||
                "",
            };
            const saved = await createMTDRecordApi(seeded);
            const mergedSaved: MTDRecord = {
              ...seeded,
              ...apiPatch,
              id: saved.id,
              uuid: saved.uuid,
              orderId: saved.orderId || seeded.orderId,
              invoice: pickInvoice(saved.invoice, invoiceSeed),
            };
            setMtdRecords((prev) =>
              collapsePreMtdClonesForOrder(prev, mergedSaved, null)
            );
          }
        }
      } catch (err) {
        setActiveOrders(prevActive);
        setMtdRecords(prevMtd);
        undoBoardPatch();
        notifySaveError("Could not save MTD changes", err);
        throw err;
      }
  }, [
    activeOrders,
    addAlert,
    notifySaveError,
    mtdRecords,
    producers,
    schedule,
    isViewOnly,
  ]);

  const deleteOrder = useCallback(
    async (id: string) => {
      if (isViewOnly) {
        throw new Error("View-only accounts cannot delete orders.");
      }

      const matchesOrderId = (order: Order, target: string) =>
        order.id === target ||
        order.uuid === target ||
        order.legacyId === target;

      // Board-first: AppState.activeOrders is often empty — board cache is SoT.
      const removedOrder =
        activeOrders.find((o) => matchesOrderId(o, id)) ||
        pastOrders.find((o) => matchesOrderId(o, id)) ||
        readOrdersBoardOrder(id);
      const apiId = removedOrder?.uuid || removedOrder?.id || id;
      if (!apiId) {
        throw new Error("Order not found");
      }

      const orderIds = new Set(
        [apiId, removedOrder?.id, removedOrder?.uuid, removedOrder?.legacyId]
          .filter(Boolean)
          .map(String)
      );

      const clearPeerLinks = (order: Order): Order => {
        let next = order;
        if (
          order.mergedFormOrderId &&
          orderIds.has(String(order.mergedFormOrderId))
        ) {
          next = {
            ...next,
            mergedFormOrderId: undefined,
            manualOverlapSnapshot: undefined,
          };
        }
        if (
          order.mergedIntoManualOrderId &&
          orderIds.has(String(order.mergedIntoManualOrderId))
        ) {
          next = {
            ...next,
            mergedIntoManualOrderId: undefined,
            manualOverlapSnapshot: undefined,
          };
        }
        return next;
      };

      const removedMtd = mtdRecords.filter(
        (r) =>
          orderIds.has(r.id) ||
          (r.orderId && orderIds.has(r.orderId)) ||
          (r.uuid && orderIds.has(r.uuid)) ||
          (r.legacyId && orderIds.has(r.legacyId))
      );
      const removedMtdIds = new Set(removedMtd.map((r) => r.id));
      const removedAddons = payrollAddons.filter(
        (a) =>
          (a.orderId && orderIds.has(a.orderId)) ||
          (a.mtdId && removedMtdIds.has(a.mtdId))
      );

      const label =
        (removedOrder
          ? getOrderIdentityName(removedOrder).trim() || removedOrder.programName
          : "") || "Order";

      // Drop from board/match caches first so the Orders tab updates immediately
      // even when AppState has no copy of this Magento/board-only row.
      for (const oid of orderIds) {
        applyOrdersBoardLiveDelete(oid);
      }

      if (removedOrder) {
        setActiveOrders((prev) =>
          prev.filter((o) => !matchesOrderId(o, removedOrder.id)).map(clearPeerLinks)
        );
        setPastOrders((prev) =>
          prev.filter((o) => !matchesOrderId(o, removedOrder.id)).map(clearPeerLinks)
        );
      } else {
        setActiveOrders((prev) =>
          prev.filter((o) => !matchesOrderId(o, apiId)).map(clearPeerLinks)
        );
        setPastOrders((prev) =>
          prev.filter((o) => !matchesOrderId(o, apiId)).map(clearPeerLinks)
        );
      }

      mtdMutatedAtRef.current = Date.now();
      setMtdRecords((prev) => {
        const next = prev.filter((r) => !removedMtdIds.has(r.id));
        writeTimedCache(CACHE_MTD_KEY, next);
        return next;
      });

      setPayrollAddons((prev) => {
        const removedAddonIds = new Set(removedAddons.map((a) => a.id));
        return prev.filter((a) => !removedAddonIds.has(a.id));
      });

      try {
        // UI delete is declarative ("ensure gone") → AIP-135 allow_missing.
        await deleteOrderApi(apiId, { allowMissing: true });
        setIsBackendConnected(true);
        addAlert({
          tone: "success",
          title: "Order deleted",
          message: `${label} was removed.`,
        });
      } catch (err) {
        if (removedOrder) {
          setActiveOrders((prev) => {
            if (prev.some((o) => o.id === removedOrder.id)) return prev;
            return [removedOrder, ...prev];
          });
        }
        if (removedMtd.length) {
          setMtdRecords((prev) => {
            const next = [...removedMtd, ...prev];
            writeTimedCache(CACHE_MTD_KEY, next);
            return next;
          });
        }
        if (removedAddons.length) {
          setPayrollAddons((prev) => [...removedAddons, ...prev]);
        }
        if (
          err instanceof ApiClientError &&
          (err.status === 0 || err.status >= 500)
        ) {
          setIsBackendConnected(false);
        }
        notifySaveError("Could not delete order", err);
        throw err;
      }
    },
    [
      isViewOnly,
      notifySaveError,
      addAlert,
      activeOrders,
      pastOrders,
      mtdRecords,
      payrollAddons,
    ]
  );

  const removeMTDRecord = useCallback(
    async (id: string) => {
      if (isViewOnly) {
        throw new Error("View-only accounts cannot delete payroll records.");
      }
      mtdMutatedAtRef.current = Date.now();

      const matches = (r: MTDRecord) =>
        r.id === id ||
        r.orderId === id ||
        r.uuid === id ||
        r.legacyId === id;

      // Resolve before relying on setState side effects — Strict Mode re-runs
      // updaters and can clear a `let removed` assigned inside setMtdRecords,
      // which crashed setPayrollAddons on removed!.id.
      let removed: MTDRecord | undefined =
        readCachedMtdBoardRow(id) ?? undefined;
      setMtdRecords((prev) => {
        const hit = prev.find(matches);
        // Prefer the in-memory row when present; never clear a prior find.
        if (hit) removed = hit;
        const drop = hit ?? removed;
        if (!drop) return prev;
        const next = prev.filter(
          (r) =>
            !matches(r) &&
            !(drop.orderId && (r.orderId === drop.orderId || r.id === drop.orderId))
        );
        writeTimedCache(CACHE_MTD_KEY, next);
        return next;
      });

      const deleteId = removed?.uuid || removed?.id || id;
      if (!removed) {
        removeMtdBoardRecordsFromCaches([id]);
        try {
          await deleteMTDRecordApi(deleteId);
          setIsBackendConnected(true);
        } catch (err) {
          if (
            err instanceof ApiClientError &&
            (err.status === 0 || err.status >= 500)
          ) {
            setIsBackendConnected(false);
          }
          notifySaveError("Could not delete payroll record", err);
          throw err;
        }
        return;
      }

      // Freeze ids so later updaters cannot see a cleared `removed`.
      const removedRow = removed;
      const removedId = removedRow.id;
      const removedOrderId = removedRow.orderId || "";
      const orderIds = new Set(
        [
          removedRow.orderId,
          removedRow.id,
          removedRow.uuid,
          removedRow.legacyId,
        ].filter(Boolean) as string[]
      );

      let removedOrder: Order | undefined;
      setActiveOrders((prev) => {
        removedOrder = prev.find(
          (o) =>
            orderIds.has(o.id) ||
            (o.uuid && orderIds.has(o.uuid)) ||
            (o.legacyId && orderIds.has(o.legacyId))
        );
        if (!removedOrder) return prev;
        return prev.filter((o) => o.id !== removedOrder!.id);
      });
      setPastOrders((prev) =>
        prev.filter(
          (o) =>
            !orderIds.has(o.id) &&
            !(o.uuid && orderIds.has(o.uuid)) &&
            !(o.legacyId && orderIds.has(o.legacyId))
        )
      );
      setPayrollAddons((prev) =>
        prev.filter(
          (a) =>
            a.mtdId !== removedId &&
            !(removedOrderId && a.orderId === removedOrderId)
        )
      );

      removeMtdBoardRecordsFromCaches([
        removedId,
        removedRow.uuid || "",
        removedOrderId,
        removedRow.legacyId || "",
      ]);
      if (removedOrder) {
        removeOrdersBoardOrderFromCaches(removedOrder.id);
        if (removedOrder.uuid) {
          removeOrdersBoardOrderFromCaches(removedOrder.uuid);
        }
      } else if (removedOrderId) {
        removeOrdersBoardOrderFromCaches(removedOrderId);
      }

      try {
        await deleteMTDRecordApi(deleteId);
        setMtdRecords((prev) => {
          writeTimedCache(CACHE_MTD_KEY, prev);
          return prev;
        });
        setIsBackendConnected(true);
      } catch (err) {
        setMtdRecords((prev) => [removedRow, ...prev]);
        if (removedOrder) {
          setActiveOrders((prev) => [removedOrder!, ...prev]);
        }
        if (
          err instanceof ApiClientError &&
          (err.status === 0 || err.status >= 500)
        ) {
          setIsBackendConnected(false);
        }
        notifySaveError("Could not delete payroll record", err);
        throw err;
      }
    },
    [isViewOnly, notifySaveError]
  );

  const updateOrder = useCallback(
    async (id: string, patch: Partial<Order>, seed?: Order) => {
      if (isViewOnly) return;
      // normalizeOrder rebuilds musicTheme from notes/covers/affiliate. When the
      // caller explicitly clears song fields / musicTheme (Songs pill remove),
      // re-apply those patch values so clears actually stick.
      const merge = (order: Order) => {
        const assignmentTouched =
          patch.isReassigned !== undefined ||
          patch.assignedProducer !== undefined ||
          patch.mixStartDate !== undefined ||
          patch.mixEndDate !== undefined;
        const normalized = normalizeOrder({
          ...order,
          ...patch,
          id,
          ...(assignmentTouched && patch.updatedAt === undefined
            ? { updatedAt: new Date().toISOString() }
            : {}),
        });
        // Re-apply explicit empty-string clears. normalizeOrder folds aliases with
        // fallbacks; a cleared primary can otherwise be revived from a sibling.
        for (const [key, value] of Object.entries(patch)) {
          if (typeof value === "string" && value.trim() === "") {
            (normalized as Record<string, unknown>)[key] = "";
          }
        }
        if (patch.musicTheme !== undefined) {
          normalized.musicTheme = patch.musicTheme;
        }
        if (patch.songListSuggestions !== undefined) {
          normalized.songListSuggestions = patch.songListSuggestions;
        }
        if (patch.powerMusicCovers !== undefined) {
          normalized.powerMusicCovers = patch.powerMusicCovers;
        }
        if (patch.unleashTheBeatsCovers !== undefined) {
          normalized.unleashTheBeatsCovers = patch.unleashTheBeatsCovers;
        }
        if (patch.customerSongs !== undefined) {
          normalized.customerSongs = patch.customerSongs;
        }
        if (patch.routineNotes !== undefined) {
          normalized.routineNotes = patch.routineNotes;
        }
        if (patch.additionalNotes !== undefined) {
          normalized.additionalNotes = patch.additionalNotes;
        }
        if (patch.instrumentationNotes !== undefined) {
          normalized.instrumentationNotes = patch.instrumentationNotes;
        }
        if (patch.instrumentalStylePreference !== undefined) {
          normalized.instrumentalStylePreference =
            patch.instrumentalStylePreference;
          if (patch.instrumentationNotes === undefined) {
            normalized.instrumentationNotes =
              patch.instrumentalStylePreference;
          }
        }
        if (patch.lyricalNotes !== undefined) {
          normalized.lyricalNotes = patch.lyricalNotes;
        }
        if (patch.haveSongs !== undefined) {
          normalized.haveSongs = patch.haveSongs;
        }
        if (patch.collectionStates !== undefined) {
          normalized.collectionStates = patch.collectionStates;
        }
        if (patch.timeLengthOfMix !== undefined) {
          normalized.timeLengthOfMix = patch.timeLengthOfMix;
        }
        // Manual Add Order + Magento: affiliate free text drives compliance.
        if (patch.priceCompliance !== undefined) {
          normalized.priceCompliance = patch.priceCompliance;
        } else if (
          patch.musicAffiliate !== undefined ||
          patch.musicTheme !== undefined ||
          normalized.musicAffiliate?.trim() ||
          normalized.musicTheme?.trim()
        ) {
          normalized.priceCompliance =
            resolveOrderCompliance(normalized);
        }
        return normalized;
      };
      const prevActive = activeOrders;
      const prevPast = pastOrders;
      const prevMtd = mtdRecords;
      ordersMutatedAtRef.current = Date.now();
      mtdMutatedAtRef.current = Date.now();

      setActiveOrders((prev) => {
        if (prev.some((order) => order.id === id)) {
          return prev.map((order) => (order.id === id ? merge(order) : order));
        }
        if (seed) return [merge(seed), ...prev];
        return prev;
      });
      setPastOrders((prev) => {
        if (prev.some((order) => order.id === id)) {
          return prev.map((order) => (order.id === id ? merge(order) : order));
        }
        return prev;
      });
      // Orders table rows come from the board cache, not activeOrders.
      const undoBoardPatch = patchOrdersBoardRowOptimistic(id, patch);

      // Keep linked MTD board rows in sync (shared fields only).
      const mtdPatch: Partial<MTDRecord> = {};
      if (patch.assignedProducer !== undefined) {
        mtdPatch.assignedProducer = patch.assignedProducer;
      }
      if (patch.mixStartDate !== undefined) mtdPatch.mixStartDate = patch.mixStartDate;
      if (patch.mixEndDate !== undefined) mtdPatch.mixEndDate = patch.mixEndDate;
      if (patch.price !== undefined) mtdPatch.price = patch.price;
      if (patch.finalCustomerPrice !== undefined) {
        mtdPatch.finalCustomerPrice = patch.finalCustomerPrice;
      }
      if (patch.finalCustomerPriceOverridden !== undefined) {
        mtdPatch.finalCustomerPriceOverridden =
          patch.finalCustomerPriceOverridden;
      }
      if (patch.finalPayrollPrice !== undefined) {
        mtdPatch.finalPayrollPrice = patch.finalPayrollPrice;
      }
      // Payout / system calc / rates stay on Orders only: do not fan out to MTD.
      if (patch.priceCompliance !== undefined) {
        mtdPatch.priceCompliance = patch.priceCompliance;
      }
      // Phase 3: identity display cache on local MTD only (Orders is SoT).
      if (patch.editorRequest !== undefined) {
        mtdPatch.editorRequest = patch.editorRequest;
      }
      if (patch.contactName !== undefined) mtdPatch.contactName = patch.contactName;
      if (patch.coachName !== undefined && patch.contactName === undefined) {
        mtdPatch.contactName = patch.coachName;
      }
      if (patch.programName !== undefined) mtdPatch.programName = patch.programName;
      if (patch.gymName !== undefined && patch.programName === undefined) {
        mtdPatch.programName = patch.gymName;
      }
      if (patch.schoolName !== undefined && patch.programName === undefined) {
        mtdPatch.programName = patch.schoolName;
      }
      if (patch.package !== undefined) mtdPatch.package = patch.package;
      if (patch.musicTheme !== undefined) mtdPatch.musicTheme = patch.musicTheme;
      if (patch.category !== undefined) mtdPatch.category = patch.category;
      if (patch.isReassigned !== undefined) mtdPatch.isReassigned = patch.isReassigned;
      if (patch.collectionStates !== undefined) {
        mtdPatch.collectionStates = patch.collectionStates;
      }
      if (patch.haveSongs !== undefined) mtdPatch.haveSongs = patch.haveSongs;
      if (patch.eightCountSheet !== undefined) {
        mtdPatch.eightCountSheet = patch.eightCountSheet;
      }
      if (patch.orderStatus !== undefined) mtdPatch.orderStatus = patch.orderStatus;
      if (patch.songListSuggestions !== undefined) {
        mtdPatch.songListSuggestions = patch.songListSuggestions;
      }
      if (patch.routineNotes !== undefined) {
        mtdPatch.routineNotes = patch.routineNotes;
      }
      if (patch.timeLengthOfMix !== undefined) {
        // Include "" so Mix Time clear is not revived from stale MTD staging.
        mtdPatch.timeLengthOfMix = patch.timeLengthOfMix;
      }
      if (patch.powerMusicCovers !== undefined) {
        (mtdPatch as { powerMusicCovers?: string }).powerMusicCovers =
          patch.powerMusicCovers;
      }

      const linkedMtd = mtdRecords.find(
        (r) =>
          r.orderId === id ||
          r.id === id ||
          r.uuid === id ||
          (r.legacyId && r.legacyId === id)
      );
      if (Object.keys(mtdPatch).length > 0) {
        setMtdRecords((prev) =>
          prev.map((r) => {
            const linked =
              r.orderId === id ||
              r.id === id ||
              r.uuid === id ||
              (r.legacyId && r.legacyId === id);
            return linked ? { ...r, ...mtdPatch } : r;
          })
        );
      }

        try {
          // Order is canonical for identity + shared ops.
          await updateOrderApi(id, patch);
          // Persist only MTD-owned fields (not Order identity/assignment SoT).
          const mtdOwnedPatch: Partial<MTDRecord> = { ...mtdPatch };
          delete mtdOwnedPatch.contactName;
          delete mtdOwnedPatch.programName;
          delete mtdOwnedPatch.package;
          delete mtdOwnedPatch.musicTheme;
          delete mtdOwnedPatch.category;
          delete mtdOwnedPatch.editorRequest;
          delete mtdOwnedPatch.assignedProducer;
          delete mtdOwnedPatch.editorInitials;
          delete mtdOwnedPatch.mixStartDate;
          delete mtdOwnedPatch.mixEndDate;
          delete mtdOwnedPatch.isReassigned;
          delete mtdOwnedPatch.eightCountSheet;
          delete mtdOwnedPatch.haveSongs;
          delete mtdOwnedPatch.collectionStates;
          delete mtdOwnedPatch.orderStatus;
          delete mtdOwnedPatch.needsAttention;
          delete mtdOwnedPatch.missingDataEmailSentAt;
          delete mtdOwnedPatch.producerEmailSentAt;
          delete mtdOwnedPatch.producerEmailSentTo;
          if (
            linkedMtd &&
            isPersistedMtdRecord(linkedMtd) &&
            (linkedMtd.inMTD || linkedMtd.isManualScheduleEntry) &&
            Object.keys(mtdOwnedPatch).length > 0
          ) {
            const apiId = linkedMtd.uuid || linkedMtd.id;
            await updateMTDRecordApi(apiId, mtdOwnedPatch);
          }
        } catch (err) {
          setActiveOrders(prevActive);
          setPastOrders(prevPast);
          setMtdRecords(prevMtd);
          undoBoardPatch();
          notifySaveError("Could not save order", err);
        throw err;
        }
    },
    [isViewOnly, mtdRecords, activeOrders, pastOrders, notifySaveError]
  );

  const markComplete = useCallback(
    (orderId: string) => {
      if (isViewOnly) return;
      const order = activeOrders.find((o) => o.id === orderId);
      if (!order) return;

      const completed: Order = {
        ...order,
        status: "completed",
        completedAt: new Date().toISOString().slice(0, 10),
        assignedProducer: resolveValidProducerAssignment(
          order.assignedProducer || order.requestedProducer || order.editorRequest,
          producers,
          order.category || order.formType || ""
        ),
      };

      const prevActive = activeOrders;
      const prevPast = pastOrders;
      setActiveOrders((prev) => prev.filter((o) => o.id !== orderId));
      // Only keep completed history in memory while Dashboard has past loaded.
      if (pastOrdersLoadedRef.current) {
        setPastOrders((prev) => [completed, ...prev]);
      }

      void updateOrderApi(orderId, {
        status: "completed",
        completedAt: completed.completedAt,
      }).catch((err) => {
        setActiveOrders(prevActive);
        setPastOrders(prevPast);
        notifySaveError("Could not complete order", err);
      });
    },
    [activeOrders, pastOrders, isViewOnly, producers, notifySaveError]
  );

  const addPastOrder = useCallback(
    (order: Order) => {
      if (isViewOnly) return;
      const prevPast = pastOrders;
      if (pastOrdersLoadedRef.current) {
        setPastOrders((prev) => [order, ...prev]);
      }
      void updateOrderApi(order.id, {
        status: "completed",
        completedAt: order.completedAt,
      }).catch((err) => {
        setPastOrders(prevPast);
        notifySaveError("Could not save past order", err);
      });
    },
    [isViewOnly, pastOrders, notifySaveError]
  );

  const ensurePastOrdersLoaded = useCallback(async () => {
    if (pastOrdersLoadedRef.current) return;
    if (pastOrdersLoadPromiseRef.current) {
      await pastOrdersLoadPromiseRef.current;
      return;
    }
    const loadPromise = (async () => {
      // Chart window only (14d) — never pull full completed history into AppState.
      const past = await fetchPastOrdersApi(14);
      pastOrdersLoadedRef.current = true;
      setPastOrders(normalizeOrders(past));
    })();
    pastOrdersLoadPromiseRef.current = loadPromise;
    try {
      await loadPromise;
    } catch (err) {
      pastOrdersLoadPromiseRef.current = null;
      throw err;
    }
  }, []);

  const releasePastOrders = useCallback(() => {
    pastOrdersLoadedRef.current = false;
    pastOrdersLoadPromiseRef.current = null;
    setPastOrders([]);
  }, []);

  const ensureLiveMtdLoaded = useCallback(async () => {
    if (liveMtdLoadedRef.current) return;
    if (liveMtdLoadPromiseRef.current) {
      await liveMtdLoadPromiseRef.current;
      return;
    }
    const fetchedAt = Date.now();
    const loadPromise = (async () => {
      const records = await fetchMTDRecordsApi();
      if (fetchedAt < mtdMutatedAtRef.current) {
        liveMtdLoadedRef.current = true;
        return;
      }
      const next = normalizeMTD(records)
        .filter((rec) => !isArchivedPayrollRecord(rec))
        .filter(isPersistedMtdRecord);
      setMtdRecords((prev) => {
        const merged = next.map((backend) => {
          const local = prev.find((r) => mtdRecordsReferToSame(r, backend));
          return mergeLocalMtdRecordFields(backend, local, {
            trustBackendBoardMembership: true,
          });
        });
        writeTimedCache(CACHE_MTD_KEY, merged);
        return merged;
      });
      liveMtdLoadedRef.current = true;
    })();
    liveMtdLoadPromiseRef.current = loadPromise;
    try {
      await loadPromise;
    } catch (err) {
      liveMtdLoadPromiseRef.current = null;
      throw err;
    }
  }, []);

  const ensureArchivedPayrollLoaded = useCallback(async () => {
    if (archivedPayrollLoadedRef.current) return;
    if (archivedPayrollLoadPromiseRef.current) {
      await archivedPayrollLoadPromiseRef.current;
      return;
    }
    const loadPromise = (async () => {
      const archive = await fetchArchivedPayrollApi();
      archivedPayrollLoadedRef.current = true;
      setArchivedPayrollRecords(normalizeMTD(archive));
    })();
    archivedPayrollLoadPromiseRef.current = loadPromise;
    try {
      await loadPromise;
    } catch (err) {
      archivedPayrollLoadPromiseRef.current = null;
      throw err;
    }
  }, []);

  const releaseArchivedPayroll = useCallback(() => {
    archivedPayrollLoadedRef.current = false;
    archivedPayrollLoadPromiseRef.current = null;
    setArchivedPayrollRecords([]);
  }, []);

  const ensurePayrollLinkedAddonsLoaded = useCallback(
    async (opts?: { force?: boolean }) => {
      if (opts?.force) {
        payrollLinkedAddonsLoadedRef.current = false;
        payrollLinkedAddonsLoadPromiseRef.current = null;
      }
      if (payrollLinkedAddonsLoadedRef.current) return;
      if (payrollLinkedAddonsLoadPromiseRef.current) {
        await payrollLinkedAddonsLoadPromiseRef.current;
        return;
      }
      const loadPromise = (async () => {
        const linked = await fetchPayrollLinkedAddonsApi();
        payrollLinkedAddonsLoadedRef.current = true;
        if (linked.length === 0) return;
        setPayrollAddons((prev) => dedupePayrollAddons([...prev, ...linked]));
      })();
      payrollLinkedAddonsLoadPromiseRef.current = loadPromise;
      try {
        await loadPromise;
      } catch (err) {
        payrollLinkedAddonsLoadPromiseRef.current = null;
        throw err;
      }
    },
    []
  );

  const ensureAddonsForMtdIdsLoaded = useCallback(
    async (mtdIds: string[]) => {
      const missing = [
        ...new Set(mtdIds.map((id) => String(id || "").trim()).filter(Boolean)),
      ].filter((id) => !loadedAddonMtdIdsRef.current.has(id));
      if (missing.length === 0) return;
      const linked = await fetchPayrollAddonsForMtdIdsApi(missing);
      for (const id of missing) loadedAddonMtdIdsRef.current.add(id);
      if (linked.length === 0) return;
      setPayrollAddons((prev) => dedupePayrollAddons([...prev, ...linked]));
    },
    []
  );

  const ensureVoiceoverAddonsLoaded = useCallback(
    async (opts?: { force?: boolean; sinceDays?: number }) => {
      const sinceDays = opts?.sinceDays ?? 42;
      if (opts?.force || voiceoverAddonsSinceDaysRef.current !== sinceDays) {
        voiceoverAddonsLoadedRef.current = false;
        voiceoverAddonsLoadPromiseRef.current = null;
      }
      if (voiceoverAddonsLoadedRef.current) return;
      if (voiceoverAddonsLoadPromiseRef.current) {
        await voiceoverAddonsLoadPromiseRef.current;
        return;
      }
      const loadPromise = (async () => {
        const voiceovers = await fetchVoiceoverAddonsApi(undefined, {
          sinceDays,
        });
        voiceoverAddonsLoadedRef.current = true;
        voiceoverAddonsSinceDaysRef.current = sinceDays;
        if (voiceovers.length === 0) return;
        setPayrollAddons((prev) => {
          // Replace older VO window with the requested window; keep rush/misc.
          const keep = prev.filter((a) => a.addonType !== "voiceover");
          return dedupePayrollAddons([...keep, ...voiceovers]);
        });
      })();
      voiceoverAddonsLoadPromiseRef.current = loadPromise;
      try {
        await loadPromise;
      } catch (err) {
        voiceoverAddonsLoadPromiseRef.current = null;
        throw err;
      }
    },
    []
  );

  const receiveOrder = useCallback(
    (order: Order) => {
      const incoming = normalizeOrder({
        ...order,
        status: order.status || "new",
      });
      const prevActive = activeOrders;

      // Magento forms stay unmatched until an admin links them on Match Orders.
      const flagPatch = openAffiliateFlagPatch(incoming);
      const toStore = flagPatch
        ? normalizeOrder({ ...incoming, ...flagPatch })
        : incoming;
      const stamped: Order = {
        ...toStore,
        createdAt: toStore.createdAt || new Date().toISOString(),
      };

      setActiveOrders((prev) => {
        if (prev.some((o) => o.id === stamped.id)) return prev;
        return [stamped, ...prev];
      });

      void createOrderApi(stamped).catch((err) => {
        setActiveOrders(prevActive);
        notifySaveError("Could not save new order", err);
      });

      const alreadyPresent = prevActive.some((o) => o.id === stamped.id);
      if (!alreadyPresent) {
        const catalog = [stamped, ...prevActive];
        const event = incomingOrderBellEvent(stamped, catalog);
        // Flagged / plain new-order bells fire immediately. Match suggestions
        // go through flush so toast + blink stay consistent with SSE/bootstrap.
        if (event.kind === "flagged" || event.kind === "new_order") {
          addNotification(event.notification);
        }
        flushMatchSuggestionNotices(catalog);
      }
    },
    [
      addNotification,
      activeOrders,
      flushMatchSuggestionNotices,
      notifySaveError,
    ]
  );

  const matchManualWithMagento = useCallback(
    async (
      manualId: string,
      formId: string,
      options?: {
        overwrite?: boolean;
        manualOverride?: Order;
        formOverride?: Order;
        manualEdits?: Partial<Order>;
        formEdits?: Partial<Order>;
        manualBefore?: Order;
        onApplied?: () => void;
      }
    ) => {
      if (isViewOnly) {
        throw new Error("View-only accounts cannot match orders.");
      }
      // Prefer MatchConfirmModal drafts: updateOrder ahead of match does not
      // refresh this callback's activeOrders closure, so notes/songs filled in
      // the modal would otherwise never copy onto the manual booking row.
      const manualFromState = activeOrders.find(
        (o) => o.id === manualId || o.uuid === manualId || o.legacyId === manualId
      );
      const formFromState = activeOrders.find(
        (o) => o.id === formId || o.uuid === formId || o.legacyId === formId
      );
      const manual = options?.manualOverride
        ? normalizeOrder({
            ...(manualFromState || {}),
            ...options.manualOverride,
            id: manualFromState?.id || options.manualOverride.id || manualId,
          })
        : manualFromState;
      const form = options?.formOverride
        ? normalizeOrder({
            ...(formFromState || {}),
            ...options.formOverride,
            id: formFromState?.id || options.formOverride.id || formId,
          })
        : formFromState;
      if (!manual || !form) {
        throw new Error("Could not find both orders to match.");
      }
      if (!canMergeMagentoFormIntoManual(form, manual)) {
        throw new Error(
          "These orders cannot be matched (category/subtype mismatch or already linked)."
        );
      }
      if (manual.mergedFormOrderId) {
        throw new Error("This manual order is already matched to a Magento form.");
      }
      if (form.mergedIntoManualOrderId) {
        throw new Error("This Magento form is already matched to a manual order.");
      }

      const { manualPatch, formPatch } = mergeFormWinsPatches(manual, form);
      const softPatch = mergePatchFromForm(manual, form);
      let combinedManualPatch: Partial<Order> = {
        ...manualPatch,
        ...softPatch,
      };
      let combinedFormPatch: Partial<Order> = { ...formPatch };
      const linkedPreview = normalizeOrder({
        ...manual,
        ...combinedManualPatch,
        id: manual.id,
      });
      const taggedFormPreview = normalizeOrder({
        ...form,
        ...combinedFormPatch,
        mergedIntoManualOrderId: manual.id,
      });

      if (options?.overwrite) {
        const ow = overwriteManualWithFormPatches(
          linkedPreview,
          taggedFormPreview
        );
        combinedManualPatch = { ...combinedManualPatch, ...ow.manualPatch };
        combinedFormPatch = { ...combinedFormPatch, ...ow.formPatch };
        // Overwrite drops the cue snapshot; Split still needs the pre-match manual.
        combinedManualPatch.manualOverlapSnapshot = overwriteSplitRestoreSnapshot(
          options.manualBefore ?? manual,
          normalizeOrder({ ...manual, ...combinedManualPatch, id: manual.id })
        );
      }

      const mergedPreview = normalizeOrder({
        ...manual,
        ...combinedManualPatch,
        id: manual.id,
      });
      const flagPatch = openAffiliateFlagPatch({
        ...mergedPreview,
        musicAffiliate:
          form.musicAffiliate || mergedPreview.musicAffiliate,
      });
      const manualNext = flagPatch
        ? normalizeOrder({ ...mergedPreview, ...flagPatch })
        : mergedPreview;
      const taggedForm = normalizeOrder({
        ...form,
        ...combinedFormPatch,
        mergedIntoManualOrderId: manual.id,
      });

      const prevActive = activeOrders;
      const prevMtd = mtdRecords;
      // Keep pre-MTD / schedule rows' assignment + invoice with the manual slot
      // (Match must not hide Assign or drop invoice that was already set).
      // Exception: awaiting reassign — never revive a cleared producer from MTD.
      const awaitingReassign = Boolean(
        manualNext.isReassigned || manual.isReassigned
      );
      const matchAssignment =
        manualNext.assignedProducer?.trim() ||
        manual.assignedProducer?.trim() ||
        "";
      const coveringBeforeMatch = mtdRecords.find(
        (r) =>
          mtdRecordCoversOrder(r, manual) || mtdRecordCoversOrder(r, manualNext)
      );
      const matchInvoice = pickInvoice(
        manualNext.invoice,
        manual.invoice,
        coveringBeforeMatch?.invoice
      );
      const manualWithInvoice = matchInvoice
        ? normalizeOrder({ ...manualNext, invoice: matchInvoice })
        : manualNext;
      const matchCs =
        String(manualNext.eightCountSheet || manual.eightCountSheet || "").trim();
      const matchCsIsStatus =
        matchCs &&
        !/^(YES|Y|NO|N)\b/i.test(matchCs);
      const matchHaveSongs = String(
        manualNext.haveSongs || manual.haveSongs || ""
      ).trim();
      const matchCollectionStates = {
        ...(manual.collectionStates || {}),
        ...(manualNext.collectionStates || {}),
      };
      setActiveOrders((prev) =>
        prev.map((o) => {
          if (o.id === manual.id) return manualWithInvoice;
          if (o.id === form.id) return taggedForm;
          return o;
        })
      );
      setMtdRecords((prev) =>
        prev.map((rec) => {
          if (!mtdRecordCoversOrder(rec, manual) && !mtdRecordCoversOrder(rec, manualNext)) {
            return rec;
          }
          const nextAssigned = awaitingReassign
            ? matchAssignment || null
            : matchAssignment ||
              rec.assignedProducer?.trim() ||
              rec.assignedProducer ||
              null;
          const nextInvoice = pickInvoice(matchInvoice, rec.invoice);
          const nextCs =
            (matchCsIsStatus ? matchCs : "") ||
            rec.eightCountSheet ||
            "";
          const nextHaveSongs = matchHaveSongs || rec.haveSongs || "";
          const nextStates = {
            ...(rec.collectionStates || {}),
            ...matchCollectionStates,
          };
          return {
            ...rec,
            assignedProducer: nextAssigned || null,
            ...(awaitingReassign
              ? {
                  mixStartDate: matchAssignment ? rec.mixStartDate : "",
                  mixEndDate: matchAssignment ? rec.mixEndDate : undefined,
                  isReassigned: true,
                }
              : {}),
            invoice: nextInvoice,
            eightCountSheet: nextCs,
            haveSongs: nextHaveSongs,
            collectionStates:
              Object.keys(nextStates).length > 0
                ? nextStates
                : rec.collectionStates,
          };
        })
      );
      ordersMutatedAtRef.current = Date.now();
      mtdMutatedAtRef.current = Date.now();

      const manualApiPatch: Partial<Order> = {
        ...(options?.manualEdits || {}),
        ...combinedManualPatch,
        ...(flagPatch || {}),
        ...(matchAssignment ? { assignedProducer: matchAssignment } : {}),
      };
      const formApiPatch: Partial<Order> = {
        ...(options?.formEdits || {}),
        ...combinedFormPatch,
      };
      const undoMatchCaches = syncOrdersAfterMatch({
        manual,
        form,
        manualPatch: manualApiPatch,
        formPatch: { ...formApiPatch, mergedIntoManualOrderId: manual.id },
      });
      options?.onApplied?.();

      let linked = false;
      try {
        await Promise.all([
          updateOrderApi(manual.id, manualApiPatch),
          updateOrderApi(form.id, formApiPatch),
        ]);
        linked = true;
        // Invoice SoT is mtd_records: persist after match so payroll still sees it.
        if (matchInvoice) {
          const covering =
            mtdRecords.find(
              (r) =>
                isPersistedMtdRecord(r) &&
                (mtdRecordCoversOrder(r, manual) ||
                  mtdRecordCoversOrder(r, manualNext))
            ) || null;
          if (covering) {
            const apiId = covering.uuid || covering.id;
            const saved = await updateMTDRecordApi(apiId, {
              invoice: matchInvoice,
            });
            setMtdRecords((prev) =>
              prev.map((r) =>
                r.id === covering.id || r.uuid === covering.uuid
                  ? {
                      ...r,
                      invoice: pickInvoice(saved.invoice, matchInvoice, r.invoice),
                    }
                  : r
              )
            );
          } else {
            const seeded = mergeCollectionStateFromOrder(
              {
                ...stagingRecordFromOrder(manualWithInvoice),
                invoice: matchInvoice,
                inMTD: false,
                orderId: manualWithInvoice.uuid || manualWithInvoice.id,
              },
              manualWithInvoice
            );
            const saved = await createMTDRecordApi(seeded);
            const mergedSaved = mergeCollectionStateFromOrder(
              {
                ...seeded,
                ...saved,
                id: saved.id,
                uuid: saved.uuid,
                orderId: saved.orderId || seeded.orderId,
                invoice: pickInvoice(saved.invoice, matchInvoice),
              },
              manualWithInvoice
            );
            setMtdRecords((prev) =>
              collapsePreMtdClonesForOrder(prev, mergedSaved, manualWithInvoice)
            );
          }
        }
        if (flagPatch) {
          addNotification({
            type: "flagged_order",
            title: "Order flagged - multiple affiliates",
            message: `${
              form.programName ||
              form.schoolOrganizationName ||
              form.gymName ||
              "Order"
            } · choose one affiliate on Flagged`,
            href: "/orders/flagged",
          });
        } else {
          addAlert({
            tone: "success",
            title: options?.overwrite
              ? "Orders matched · form data kept"
              : "Orders matched",
            message: options?.overwrite
              ? `${
                  getOrderIdentityName(form) ||
                  form.programName ||
                  "Magento form"
                } linked · Magento values kept, Form/Manual cues removed`
              : `${
                  getOrderIdentityName(form) ||
                  form.programName ||
                  "Magento form"
                } linked · form is source of truth`,
            href: "/orders",
          });
        }
      } catch (err) {
        if (!linked) undoMatchCaches();
        setActiveOrders(prevActive);
        setMtdRecords(prevMtd);
        notifySaveError("Could not match Magento form to manual order", err);
        throw err;
      }
    },
    [
      activeOrders,
      mtdRecords,
      isViewOnly,
      addNotification,
      addAlert,
      notifySaveError,
    ]
  );

  const addProducer = useCallback(async (producer: Producer) => {
    if (isViewOnly) {
      throw new Error("View-only accounts cannot add producers.");
    }
    const normalized = normalizeProducer(producer);
    const tempId = normalized.id;
    pendingProducerSavesRef.current.add(tempId);
    setProducers((prev) => normalizeProducerList([normalized, ...prev]));
    try {
      const saved = await createProducerApi(normalized);
      setProducers((prev) => {
        // Drop temp + any SSE/Broadcast twin, then insert the server row once.
        const withoutTwins = prev.filter(
          (p) => p.id !== tempId && !producersReferToSamePerson(p, saved)
        );
        const nextList = normalizeProducerList([saved, ...withoutTwins]);
        writeTimedCache(CACHE_PRODUCERS_KEY, nextList);
        return nextList;
      });
      setIsBackendConnected(true);
      return saved;
    } catch (err) {
      setProducers((prev) => prev.filter((p) => p.id !== tempId));
      if (
        err instanceof ApiClientError &&
        (err.status === 0 || err.status >= 500)
      ) {
        setIsBackendConnected(false);
      }
      notifySaveError("Could not save producer", err);
      throw err;
    } finally {
      pendingProducerSavesRef.current.delete(tempId);
    }
  }, [isViewOnly, notifySaveError]);

  const updateProducer = useCallback(async (id: string, patch: Partial<Producer>) => {
    if (isViewOnly) {
      throw new Error("View-only accounts cannot edit producers.");
    }
    const matchProducer = (p: Producer) => p.id === id || p.uuid === id;

    let previous: Producer | undefined;
    let next: Producer | undefined;
    setProducers((prev) => {
      previous = prev.find(matchProducer);
      if (!previous) return prev;
      next = normalizeProducer({ ...previous, ...patch, id: previous.id });
      const nextList = normalizeProducerList(
        prev.map((p) => (matchProducer(p) ? next! : p))
      );
      // Cache + stamp immediately so Schedule can paint before the network returns.
      producersMutatedAtRef.current = Date.now();
      writeTimedCache(CACHE_PRODUCERS_KEY, nextList);
      return nextList;
    });
    if (!previous || !next) {
      throw new Error("Producer not found.");
    }
    const baseline = previous;
    const optimistic = next;
    const apiId = resolveProducerApiId(baseline);
    const pendingKey = baseline.id || baseline.uuid || apiId;
    if (pendingKey) pendingProducerSavesRef.current.add(pendingKey);
    const ifMatchUpdatedAt = patchNeedsIfMatch(patch)
      ? baseline.updatedAt ?? null
      : null;

    // Keep Orders / MTD / Payroll chips linked when initials (assignment key) change.
    const oldAssignmentKey = producerAssignmentKey(baseline);
    const newAssignmentKey = producerAssignmentKey(optimistic);
    const assignmentKeyChanged =
      Boolean(oldAssignmentKey) &&
      Boolean(newAssignmentKey) &&
      oldAssignmentKey !== newAssignmentKey;
    const ordersToSync = assignmentKeyChanged
      ? activeOrders
          .filter(
            (order) =>
              (order.assignedProducer &&
                producerKeysMatch(order.assignedProducer, oldAssignmentKey)) ||
              (order.editorRequest &&
                producerKeysMatch(order.editorRequest, oldAssignmentKey)) ||
              (order.requestedProducer &&
                producerKeysMatch(order.requestedProducer, oldAssignmentKey)) ||
              (order.requestedEditor &&
                producerKeysMatch(order.requestedEditor, oldAssignmentKey))
          )
          .map((order) => ({
            id: order.id,
            assignedProducer: order.assignedProducer,
            editorRequest: order.editorRequest,
            requestedProducer: order.requestedProducer,
            requestedEditor: order.requestedEditor,
          }))
      : [];
    if (assignmentKeyChanged) {
      mtdMutatedAtRef.current = Date.now();
      ordersMutatedAtRef.current = Date.now();
      setMtdRecords((prev) => {
        const nextRecords = rewriteMtdAssignmentKeys(
          prev,
          oldAssignmentKey,
          newAssignmentKey
        );
        writeTimedCache(CACHE_MTD_KEY, nextRecords);
        return nextRecords;
      });
      setActiveOrders((prev) =>
        rewriteOrderAssignmentKeys(prev, oldAssignmentKey, newAssignmentKey)
      );
    }

    const persistRewrittenAssignmentKeys = async () => {
      if (!assignmentKeyChanged) return;
      // Phase 4: assignment SoT is Orders: backend cascade updates Orders and
      // re-publishes linked MTD projections. Local MTD state already rewritten.
      for (const order of ordersToSync) {
        const orderPatch: Partial<Order> = {};
        if (
          order.assignedProducer &&
          producerKeysMatch(order.assignedProducer, oldAssignmentKey)
        ) {
          orderPatch.assignedProducer = newAssignmentKey;
        }
        if (
          order.editorRequest &&
          producerKeysMatch(order.editorRequest, oldAssignmentKey)
        ) {
          orderPatch.editorRequest =
            newAssignmentKey as Order["editorRequest"];
        }
        if (
          order.requestedProducer &&
          producerKeysMatch(order.requestedProducer, oldAssignmentKey)
        ) {
          orderPatch.requestedProducer = newAssignmentKey;
        }
        if (
          order.requestedEditor &&
          producerKeysMatch(order.requestedEditor, oldAssignmentKey)
        ) {
          orderPatch.requestedEditor = newAssignmentKey;
        }
        if (Object.keys(orderPatch).length === 0) continue;
        try {
          await updateOrderApi(order.id, orderPatch);
        } catch {
          /* best-effort; backend cascade is primary */
        }
      }
    };

    const commitSavedProducer = (saved: Producer) => {
      const resolvedWorkDays =
        patch.workDays !== undefined
          ? sameStringSet(saved.workDays, patch.workDays)
            ? saved.workDays
            : patch.workDays
          : undefined;
      const resolvedExtraDays =
        patch.extraDays !== undefined
          ? sameStringSet(saved.extraDays, patch.extraDays)
            ? saved.extraDays
            : patch.extraDays
          : undefined;
      const resolvedTimeOff =
        patch.timeOff !== undefined
          ? sameTimeOffList(saved.timeOff, patch.timeOff)
            ? saved.timeOff
            : optimistic.timeOff
          : undefined;

      const merged = normalizeProducer({
        ...saved,
        id: saved.id || baseline.id,
        uuid: saved.uuid || saved.id || baseline.uuid,
        updatedAt: saved.updatedAt ?? baseline.updatedAt,
        ...(resolvedTimeOff !== undefined ? { timeOff: resolvedTimeOff } : {}),
        ...(resolvedExtraDays !== undefined
          ? { extraDays: resolvedExtraDays }
          : {}),
        ...(resolvedWorkDays !== undefined
          ? { workDays: resolvedWorkDays }
          : {}),
        ...(patch.maxMixesPerDay !== undefined
          ? {
              maxMixesPerDay:
                saved.maxMixesPerDay ?? patch.maxMixesPerDay ?? null,
            }
          : {}),
        ...(patch.maxProducerCostPerDay !== undefined
          ? {
              maxProducerCostPerDay:
                saved.maxProducerCostPerDay ??
                patch.maxProducerCostPerDay ??
                null,
            }
          : {}),
        ...(patch.ratesByCategory !== undefined
          ? {
              ratesByCategory: (() => {
                const savedRates = saved.ratesByCategory;
                const optimisticRates = optimistic.ratesByCategory;
                if (
                  savedRates &&
                  Object.keys(savedRates).length > 0 &&
                  sameStringSet(
                    Object.keys(savedRates),
                    Object.keys(patch.ratesByCategory ?? {})
                  )
                ) {
                  return savedRates;
                }
                return optimisticRates ?? savedRates ?? null;
              })(),
            }
          : {}),
        ...(patch.danceVoiceoverRate !== undefined
          ? {
              danceVoiceoverRate:
                saved.danceVoiceoverRate ?? optimistic.danceVoiceoverRate,
            }
          : {}),
        ...(patch.cheerVoiceoverRate !== undefined
          ? {
              cheerVoiceoverRate:
                saved.cheerVoiceoverRate ?? optimistic.cheerVoiceoverRate,
            }
          : {}),
        ...(patch.rushFeeRate !== undefined
          ? { rushFeeRate: saved.rushFeeRate ?? optimistic.rushFeeRate }
          : {}),
        ...(patch.categories !== undefined
          ? {
              categories: sameStringSet(
                saved.categories ?? [],
                patch.categories ?? []
              )
                ? saved.categories
                : optimistic.categories,
            }
          : {}),
      });
      setProducers((prev) => {
        const latest = prev.find(matchProducer) ?? merged;
        const mergedLatest = normalizeProducer({
          ...latest,
          ...merged,
          id: latest.id,
          uuid: latest.uuid || latest.id,
          updatedAt: merged.updatedAt ?? latest.updatedAt,
          ...(resolvedTimeOff !== undefined
            ? { timeOff: resolvedTimeOff }
            : {}),
          ...(resolvedExtraDays !== undefined
            ? { extraDays: resolvedExtraDays }
            : {}),
          ...(resolvedWorkDays !== undefined
            ? { workDays: resolvedWorkDays }
            : {}),
        });
        const nextList = normalizeProducerList(
          prev.map((p) => (matchProducer(p) ? mergedLatest : p))
        );
        writeTimedCache(CACHE_PRODUCERS_KEY, nextList);
        return nextList;
      });
      setIsBackendConnected(true);
      return merged;
    };

    const echoRetryAvailability = async (
      saved: Producer,
      matchAt: string | null
    ): Promise<Producer> => {
      // JSON / leave rows can occasionally echo stale values; retry once so the
      // schedule matrix never drifts from what we just persisted.
      const availabilityRetry: Partial<Producer> = {};
      if (
        patch.workDays !== undefined &&
        !sameStringSet(saved.workDays, patch.workDays)
      ) {
        availabilityRetry.workDays = patch.workDays;
      }
      if (
        patch.extraDays !== undefined &&
        !sameStringSet(saved.extraDays, patch.extraDays)
      ) {
        availabilityRetry.extraDays = patch.extraDays;
      }
      if (
        patch.timeOff !== undefined &&
        !sameTimeOffList(saved.timeOff, patch.timeOff)
      ) {
        availabilityRetry.timeOff = patch.timeOff;
      }
      if (
        patch.maxMixesPerDay !== undefined &&
        saved.maxMixesPerDay !== patch.maxMixesPerDay
      ) {
        availabilityRetry.maxMixesPerDay = patch.maxMixesPerDay;
      }
      if (
        patch.maxProducerCostPerDay !== undefined &&
        saved.maxProducerCostPerDay !== patch.maxProducerCostPerDay
      ) {
        availabilityRetry.maxProducerCostPerDay = patch.maxProducerCostPerDay;
      }
      if (Object.keys(availabilityRetry).length === 0) return saved;
      return updateProducerApi(baseline.id, availabilityRetry, apiId, {
        ifMatchUpdatedAt: saved.updatedAt ?? matchAt,
      });
    };

    // Network sync happens after the optimistic paint (Google-style).
    try {
      let saved = await updateProducerApi(baseline.id, patch, apiId, {
        ifMatchUpdatedAt,
      });
      saved = await echoRetryAvailability(saved, ifMatchUpdatedAt);
      const committed = commitSavedProducer(saved);
      await persistRewrittenAssignmentKeys();
      return committed;
    } catch (err) {
      const conflictProducer = producerFromConflictError(err);
      if (conflictProducer) {
        // Background mixes_this_week (and peer tabs) bump updated_at and can
        // 409 a leave/schedule save. Retry availability once on the newer stamp
        // so Off days still land in the DB instead of rolling back.
        const availabilityPatch = pickAvailabilityPatch(patch);
        if (Object.keys(availabilityPatch).length > 0) {
          try {
            let saved = await updateProducerApi(
              baseline.id,
              availabilityPatch,
              apiId,
              { ifMatchUpdatedAt: conflictProducer.updatedAt ?? null }
            );
            saved = await echoRetryAvailability(
              saved,
              conflictProducer.updatedAt ?? null
            );
            const committed = commitSavedProducer(saved);
            await persistRewrittenAssignmentKeys();
            return committed;
          } catch (retryErr) {
            const retryConflict = producerFromConflictError(retryErr);
            if (retryConflict) {
              setProducers((prev) => {
                const nextList = normalizeProducerList(
                  prev.map((p) => (matchProducer(p) ? retryConflict : p))
                );
                writeTimedCache(CACHE_PRODUCERS_KEY, nextList);
                return nextList;
              });
              addAlert({
                tone: "warning",
                title: "Updated elsewhere - reloaded",
                message: `${retryConflict.name}'s schedule changed in another session.`,
              });
              throw retryErr;
            }
            setProducers((prev) => {
              const rolledBack = normalizeProducerList(
                prev.map((p) => (matchProducer(p) ? baseline : p))
              );
              writeTimedCache(CACHE_PRODUCERS_KEY, rolledBack);
              return rolledBack;
            });
            notifySaveError("Could not save producer", retryErr);
            throw retryErr;
          }
        }

        setProducers((prev) => {
          const nextList = normalizeProducerList(
            prev.map((p) => (matchProducer(p) ? conflictProducer : p))
          );
          writeTimedCache(CACHE_PRODUCERS_KEY, nextList);
          return nextList;
        });
        addAlert({
          tone: "warning",
          title: "Updated elsewhere - reloaded",
          message: `${conflictProducer.name}'s schedule changed in another session.`,
        });
        throw err;
      }

      setProducers((prev) => {
        const rolledBack = normalizeProducerList(
          prev.map((p) => (matchProducer(p) ? baseline : p))
        );
        writeTimedCache(CACHE_PRODUCERS_KEY, rolledBack);
        return rolledBack;
      });
      if (
        err instanceof ApiClientError &&
        (err.status === 0 || err.status >= 500)
      ) {
        setIsBackendConnected(false);
      }
      notifySaveError("Could not save producer", err);
      throw err;
    } finally {
      if (pendingKey) pendingProducerSavesRef.current.delete(pendingKey);
    }
  }, [
    isViewOnly,
    notifySaveError,
    addAlert,
    mtdRecords,
    activeOrders,
  ]);

  const removeProducer = useCallback(async (id: string) => {
    if (isViewOnly) {
      throw new Error("View-only accounts cannot remove producers.");
    }
    let removed: Producer | undefined;
    setProducers((prev) => {
      removed = prev.find((p) => p.id === id || p.uuid === id);
      return prev.filter((p) => p.id !== id && p.uuid !== id);
    });
    if (!removed) {
      // Already removed (e.g. confirmed on a later reassignment).
      return;
    }
    try {
      await deleteProducerApi(id, resolveProducerApiId(removed));
      setProducers((prev) => {
        writeTimedCache(CACHE_PRODUCERS_KEY, prev);
        return prev;
      });
      setIsBackendConnected(true);
    } catch (err) {
      setProducers((prev) => [removed!, ...prev]);
      if (
        err instanceof ApiClientError &&
        (err.status === 0 || err.status >= 500)
      ) {
        setIsBackendConnected(false);
      }
      notifySaveError("Could not delete producer", err);
      throw err;
    }
  }, [isViewOnly, notifySaveError]);

  const addDiscountCode = useCallback(
    async (discountCode: DiscountCode): Promise<DiscountCode> => {
      if (isViewOnly) {
        throw new Error("View-only accounts cannot add coupon codes.");
      }
      const normalized = normalizeDiscountCode(discountCode);
      const tempId = normalized.id;
      setDiscountCodes((prev) => [normalized, ...prev]);
      try {
        const saved = await createDiscountCodeApi(normalized);
        setDiscountCodes((prev) =>
          prev.map((c) => (c.id === tempId ? saved : c))
        );
        return saved;
      } catch (err) {
        setDiscountCodes((prev) => prev.filter((c) => c.id !== tempId));
        throw err;
      }
    },
    [isViewOnly]
  );

  const updateDiscountCode = useCallback(
    async (
      id: string,
      patch: Partial<DiscountCode>
    ): Promise<DiscountCode> => {
      if (isViewOnly) {
        throw new Error("View-only accounts cannot edit coupon codes.");
      }
      let previous: DiscountCode | undefined;
      setDiscountCodes((prev) => {
        previous = prev.find((entry) => entry.id === id);
        return prev.map((entry) =>
          entry.id === id
            ? normalizeDiscountCode({ ...entry, ...patch, id })
            : entry
        );
      });
      if (!previous) {
        throw new Error("Coupon code not found.");
      }
      try {
        const saved = await updateDiscountCodeApi(id, patch);
        setDiscountCodes((prev) =>
          prev.map((entry) => (entry.id === id ? saved : entry))
        );
        return saved;
      } catch (err) {
        setDiscountCodes((prev) =>
          prev.map((entry) => (entry.id === id ? previous! : entry))
        );
        throw err;
      }
    },
    [isViewOnly]
  );

  const removeDiscountCode = useCallback(
    async (id: string): Promise<void> => {
      if (isViewOnly) {
        throw new Error("View-only accounts cannot delete coupon codes.");
      }
      let removed: DiscountCode | undefined;
      setDiscountCodes((prev) => {
        removed = prev.find((entry) => entry.id === id);
        return prev.filter((entry) => entry.id !== id);
      });
      if (!removed) {
        throw new Error("Coupon code not found.");
      }
      try {
        await deleteDiscountCodeApi(id);
      } catch (err) {
        setDiscountCodes((prev) => [removed!, ...prev]);
        throw err;
      }
    },
    [isViewOnly]
  );

  // Keep the stale-while-revalidate cache in sync after edits (Move to Orders/MTD,
  // leave/Extra days, etc.). Only write once the backend has loaded so we never
  // clobber a good cache with the empty initial state on a cold start.
  useEffect(() => {
    if (!isBackendConnected) return;
    const payload = ordersCachePayload(activeOrders);
    if (applyingPeerOrdersRef.current) {
      applyingPeerOrdersRef.current = false;
      return;
    }
    writeTimedCache(CACHE_ORDERS_KEY, payload);
    try {
      if (!ordersChannelRef.current) {
        ordersChannelRef.current = new BroadcastChannel(ORDERS_SYNC_CHANNEL);
      }
      ordersChannelRef.current.postMessage({
        kind: "orders",
        ...payload,
      });
    } catch {
      /* BroadcastChannel unavailable */
    }
  }, [activeOrders, isBackendConnected]);

  useEffect(() => {
    if (!isBackendConnected) return;
    // Peer apply already mirrored this tab's view from another tab's cache /
    // BroadcastChannel. Rewriting localStorage here re-fires `storage` on the
    // peer and can ping-pong setMtdRecords until max update depth.
    if (applyingPeerMtdRef.current) {
      applyingPeerMtdRef.current = false;
      return;
    }
    writeTimedCache(CACHE_MTD_KEY, mtdRecords);
    // Instant same-browser fan-out (Payroll Paid visible in other tabs).
    try {
      if (!mtdChannelRef.current) {
        mtdChannelRef.current = new BroadcastChannel(MTD_SYNC_CHANNEL);
      }
      mtdChannelRef.current.postMessage({
        kind: "mtd",
        records: mtdRecords,
      });
    } catch {
      /* BroadcastChannel unavailable */
    }
  }, [mtdRecords, isBackendConnected]);

  useEffect(() => {
    if (!isBackendConnected) return;
    if (applyingPeerProducersRef.current) {
      applyingPeerProducersRef.current = false;
      return;
    }
    writeTimedCache(CACHE_PRODUCERS_KEY, producers);
    // Instant same-browser fan-out (Schedule open in another tab).
    try {
      if (!producersChannelRef.current) {
        producersChannelRef.current = new BroadcastChannel(PRODUCERS_SYNC_CHANNEL);
      }
      producersChannelRef.current.postMessage({
        kind: "producers",
        producers,
      });
    } catch {
      /* BroadcastChannel unavailable */
    }
  }, [producers, isBackendConnected]);

  const applyIncomingProducer = useCallback((incoming: Producer) => {
    const id = incoming.id || incoming.uuid || "";
    if (!id) return;
    let oldKeyForRewrite: string | null = null;
    let newKeyForRewrite: string | null = null;

    setProducers((prev) => {
      const idx = prev.findIndex((p) => producersReferToSamePerson(p, incoming));
      if (idx === -1) {
        const nextList = normalizeProducerList([...prev, incoming]);
        applyingPeerProducersRef.current = true;
        producersMutatedAtRef.current = Date.now();
        writeTimedCache(CACHE_PRODUCERS_KEY, nextList);
        return nextList;
      }
      const local = prev[idx];
      // Don't clobber a local in-flight save for this same person.
      if (
        pendingProducerSavesRef.current.has(local.id) ||
        (local.uuid && pendingProducerSavesRef.current.has(local.uuid)) ||
        pendingProducerSavesRef.current.has(id)
      ) {
        // Still collapse temp+server twins by preferring the incoming server row
        // when ids differ but initials match.
        if (local.id === incoming.id || local.uuid === incoming.id) {
          return prev;
        }
      }
      const newer = isProducerUpdatedAtNewer(
        incoming.updatedAt,
        local.updatedAt
      );
      const availabilityChanged =
        producerAvailabilityKey(incoming) !== producerAvailabilityKey(local);
      const idChanged = local.id !== incoming.id && local.uuid !== incoming.id;
      const localKey = producerAssignmentKey(local);
      const incomingKey = producerAssignmentKey(incoming);
      const keyChanged =
        Boolean(localKey) &&
        Boolean(incomingKey) &&
        localKey !== incomingKey;
      if (!newer && !availabilityChanged && !idChanged && !keyChanged) {
        return prev;
      }
      if (
        local.updatedAt &&
        incoming.updatedAt &&
        Date.parse(incoming.updatedAt) < Date.parse(local.updatedAt)
      ) {
        return prev;
      }
      if (keyChanged) {
        oldKeyForRewrite = localKey;
        newKeyForRewrite = incomingKey;
      }
      const nextList = normalizeProducerList(
        prev.map((p, i) => (i === idx ? incoming : p))
      );
      applyingPeerProducersRef.current = true;
      producersMutatedAtRef.current = Date.now();
      writeTimedCache(CACHE_PRODUCERS_KEY, nextList);
      return nextList;
    });

    // Other browsers receive producer.updated before/without waiting for
    // order patches: rewrite local assignment keys immediately so Orders
    // doesn't flash Assign while the old initials are orphaned.
    if (oldKeyForRewrite && newKeyForRewrite) {
      mtdMutatedAtRef.current = Date.now();
      ordersMutatedAtRef.current = Date.now();
      setMtdRecords((prev) => {
        const nextRecords = rewriteMtdAssignmentKeys(
          prev,
          oldKeyForRewrite!,
          newKeyForRewrite!
        );
        applyingPeerMtdRef.current = true;
        writeTimedCache(CACHE_MTD_KEY, nextRecords);
        return nextRecords;
      });
      setActiveOrders((prev) => {
        applyingPeerOrdersRef.current = true;
        return rewriteOrderAssignmentKeys(
          prev,
          oldKeyForRewrite!,
          newKeyForRewrite!
        );
      });
    }
  }, []);

  // Same-browser tabs: BroadcastChannel + storage (instant, no reload).
  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyPeerList = (list: Producer[]) => {
      const incoming = normalizeProducerList(
        list.map((raw) => normalizeProducer(raw))
      );
      setProducers((prev) => {
        let changed = false;
        const next = prev.map((local) => {
          const peer = incoming.find((p) => producersReferToSamePerson(p, local));
          if (!peer) return local;
          if (
            pendingProducerSavesRef.current.has(local.id) ||
            (local.uuid && pendingProducerSavesRef.current.has(local.uuid))
          ) {
            // Replace temp optimistic row with the peer's server id when needed.
            if (
              local.id !== peer.id &&
              !/^(prod-|temp)/i.test(peer.id)
            ) {
              changed = true;
              return peer;
            }
            return local;
          }
          const peerOlder =
            local.updatedAt &&
            peer.updatedAt &&
            Date.parse(peer.updatedAt) < Date.parse(local.updatedAt);
          if (peerOlder) return local;
          if (
            producerAvailabilityKey(peer) === producerAvailabilityKey(local) &&
            local.id === peer.id
          ) {
            return local;
          }
          changed = true;
          return peer;
        });
        for (const peer of incoming) {
          if (next.some((p) => producersReferToSamePerson(p, peer))) continue;
          next.push(peer);
          changed = true;
        }
        if (!changed) return prev;
        applyingPeerProducersRef.current = true;
        producersMutatedAtRef.current = Date.now();
        return normalizeProducerList(next);
      });
    };

    const applyPeerMtdList = (list: MTDRecord[]) => {
      const incoming = normalizeMTD(list);
      setMtdRecords((prev) => {
        let changed = false;
        const next = prev.map((local) => {
          const peer = incoming.find((r) => mtdRecordsReferToSame(r, local));
          if (!peer) return local;
          if (mtdLiveSyncKey(peer) === mtdLiveSyncKey(local)) return local;
          // Prefer peer Paid / payroll state when it advanced further.
          const peerPaid = Boolean(peer.paidAt);
          const localPaid = Boolean(local.paidAt);
          if (localPaid && !peerPaid) return local;
          const merged = mergeLocalMtdRecordFields(peer, local);
          if (mtdLiveSyncKey(merged) === mtdLiveSyncKey(local)) return local;
          changed = true;
          return { ...merged, id: local.id, uuid: local.uuid || peer.uuid };
        });
        for (const peer of incoming) {
          if (next.some((r) => mtdRecordsReferToSame(r, peer))) continue;
          next.push(peer);
          changed = true;
        }
        if (!changed) return prev;
        // Do not writeTimedCache here: this path is fed by storage/BroadcastChannel.
        // Rewriting the same key re-notifies peers and can infinite-loop setState.
        applyingPeerMtdRef.current = true;
        mtdMutatedAtRef.current = Date.now();
        return next;
      });
    };

    const applyPeerOrders = (active: Order[]) => {
      const mergeSide = (prev: Order[], incoming: Order[]) => {
        let changed = false;
        const next = prev.map((local) => {
          const peer = incoming.find((o) => ordersReferToSame(o, local));
          if (!peer) return local;
          if (orderLiveSyncKey(peer) === orderLiveSyncKey(local)) return local;
          changed = true;
          const reassignFields = mergeIncomingOrderReassignFields(peer, local);
          return normalizeOrder({
            ...local,
            ...peer,
            ...reassignFields,
            id: local.id,
            uuid: local.uuid || peer.uuid,
          });
        });
        for (const peer of incoming) {
          if (next.some((o) => ordersReferToSame(o, peer))) continue;
          next.push(peer);
          changed = true;
        }
        return { next, changed };
      };

      setActiveOrders((prev) => {
        const { next, changed } = mergeSide(prev, normalizeOrders(active));
        if (!changed) return prev;
        // Peer path: no cache rewrite (avoids storage ↔ setState loops).
        applyingPeerOrdersRef.current = true;
        ordersMutatedAtRef.current = Date.now();
        return next;
      });
    };

    let producersChannel: BroadcastChannel | null = null;
    let mtdChannel: BroadcastChannel | null = null;
    let ordersChannel: BroadcastChannel | null = null;
    try {
      producersChannel = new BroadcastChannel(PRODUCERS_SYNC_CHANNEL);
      producersChannelRef.current = producersChannel;
      producersChannel.onmessage = (event: MessageEvent) => {
        const data = event.data;
        if (!data || data.kind !== "producers" || !Array.isArray(data.producers)) {
          return;
        }
        applyPeerList(data.producers as Producer[]);
      };
    } catch {
      producersChannel = null;
    }
    try {
      mtdChannel = new BroadcastChannel(MTD_SYNC_CHANNEL);
      mtdChannelRef.current = mtdChannel;
      mtdChannel.onmessage = (event: MessageEvent) => {
        const data = event.data;
        if (!data || data.kind !== "mtd" || !Array.isArray(data.records)) {
          return;
        }
        applyPeerMtdList(data.records as MTDRecord[]);
      };
    } catch {
      mtdChannel = null;
    }
    try {
      ordersChannel = new BroadcastChannel(ORDERS_SYNC_CHANNEL);
      ordersChannelRef.current = ordersChannel;
      ordersChannel.onmessage = (event: MessageEvent) => {
        const data = event.data;
        if (!data || data.kind !== "orders") return;
        if (!Array.isArray(data.active)) return;
        applyPeerOrders(data.active as Order[]);
      };
    } catch {
      ordersChannel = null;
    }

    const onStorage = (event: StorageEvent) => {
      if (!event.newValue) return;
      try {
        if (event.key === CACHE_PRODUCERS_KEY) {
          const parsed = JSON.parse(event.newValue) as TimedCache<Producer[]> | null;
          if (parsed && Array.isArray(parsed.data)) {
            applyPeerList(parsed.data);
          }
          return;
        }
        if (event.key === CACHE_MTD_KEY) {
          const parsed = JSON.parse(event.newValue) as TimedCache<MTDRecord[]> | null;
          if (parsed && Array.isArray(parsed.data)) {
            applyPeerMtdList(parsed.data);
          }
          return;
        }
        if (event.key === CACHE_ORDERS_KEY) {
          const parsed = JSON.parse(event.newValue) as TimedCache<{
            active: Order[];
          }> | null;
          if (parsed?.data && Array.isArray(parsed.data.active)) {
            applyPeerOrders(parsed.data.active);
          }
        }
      } catch {
        /* ignore corrupt peer cache */
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
      if (producersChannel) {
        producersChannel.close();
        if (producersChannelRef.current === producersChannel) {
          producersChannelRef.current = null;
        }
      }
      if (mtdChannel) {
        mtdChannel.close();
        if (mtdChannelRef.current === mtdChannel) {
          mtdChannelRef.current = null;
        }
      }
      if (ordersChannel) {
        ordersChannel.close();
        if (ordersChannelRef.current === ordersChannel) {
          ordersChannelRef.current = null;
        }
      }
    };
  }, []);

  const applyIncomingOrder = useCallback((incoming: Order) => {
    const mergeList = (prev: Order[], notify: boolean) => {
      const idx = prev.findIndex((o) => ordersReferToSame(o, incoming));
      if (idx === -1) {
        // Brand-new Magento form from API/stream: stays unmatched until
        // an admin links it on Match Orders (no automatic name-merge).
        applyingPeerOrdersRef.current = true;
        ordersMutatedAtRef.current = Date.now();
        const flagPatch = openAffiliateFlagPatch(incoming);
        const stamped = normalizeOrder(
          flagPatch ? { ...incoming, ...flagPatch } : incoming
        );
        if (notify && flagPatch) {
          void updateOrderApi(stamped.id, flagPatch).catch((err) => {
            notifySaveError("Could not open affiliate flag", err);
          });
        }
        if (notify) {
          const catalog = [stamped, ...prev];
          const event = incomingOrderBellEvent(stamped, catalog);
          // Immediate flagged / unmatched new-order bells only. Match
          // suggestions flush after the list updates (handles empty-catalog race).
          if (event.kind === "flagged" || event.kind === "new_order") {
            addNotification(event.notification);
          }
        }
        return [stamped, ...prev];
      }
      const local = prev[idx];
      if (orderLiveSyncKey(local) === orderLiveSyncKey(incoming)) return prev;
      applyingPeerOrdersRef.current = true;
      ordersMutatedAtRef.current = Date.now();
      const next = [...prev];
      const keptFlag =
        local.affiliateFlagStatus === "released" ||
        local.affiliateFlagStatus === "resolved"
          ? local.affiliateFlagStatus
          : (incoming.affiliateFlagStatus ?? local.affiliateFlagStatus);
      const reassignFields = mergeIncomingOrderReassignFields(incoming, local);
      const candidate = {
        ...local,
        ...incoming,
        ...reassignFields,
        id: local.id,
        uuid: local.uuid || incoming.uuid,
        affiliateFlagStatus: keptFlag,
      };
      // Normalize once: fold affiliate open-flag into the same pass.
      const flagPatch = openAffiliateFlagPatch(candidate);
      const merged = normalizeOrder(
        flagPatch ? { ...candidate, ...flagPatch } : candidate
      );
      next[idx] = merged;
      if (notify && flagPatch) {
        addNotification({
          type: "flagged_order",
          title: "Order flagged - multiple affiliates",
          message: `${merged.programName || merged.gymName || "Order"} · ${
            merged.contactName || merged.customerName || "Customer"
          }`,
          href: "/orders/flagged",
          dedupeKey: `flagged_order:${merged.id}`,
        });
      }
      return next;
    };
    if (isPastBoardOrder(incoming)) {
      // Drop from active board if it completed; only grow past while Dashboard loaded it.
      setActiveOrders((prev) => {
        const next = prev.filter((o) => !ordersReferToSame(o, incoming));
        return next.length === prev.length ? prev : next;
      });
      if (shouldApplyPastOrderUpdate(pastOrdersLoadedRef.current)) {
        setPastOrders((prev) => mergeList(prev, false));
      }
    } else {
      setActiveOrders((prev) => {
        const next = mergeList(prev, true);
        // Always reconcile Suggested-for-You after live order fan-out (create or
        // update). Session dedupe keeps bells/toasts from repeating.
        if (next !== prev) {
          Promise.resolve().then(() => flushMatchSuggestionNotices(next));
        }
        return next;
      });
      if (shouldApplyPastOrderUpdate(pastOrdersLoadedRef.current)) {
        setPastOrders((prev) => {
          const next = prev.filter((o) => !ordersReferToSame(o, incoming));
          return next.length === prev.length ? prev : next;
        });
      }
    }

    // Keep linked MTD chip/base in sync when order price lands first.
    setMtdRecords((prev) => {
      let changed = false;
      const next = prev.map((r) => {
        const linked =
          (r.orderId &&
            (r.orderId === incoming.id ||
              r.orderId === incoming.uuid ||
              r.orderId === incoming.legacyId)) ||
          r.id === incoming.id ||
          r.uuid === incoming.id ||
          (r.legacyId && r.legacyId === incoming.id);
        if (!linked) return r;
        const patched: MTDRecord = {
          ...r,
          price: incoming.price ?? r.price,
          finalCustomerPrice:
            incoming.finalCustomerPrice ?? r.finalCustomerPrice,
          finalCustomerPriceOverridden:
            incoming.finalCustomerPriceOverridden ??
            r.finalCustomerPriceOverridden,
          finalPayrollPrice:
            incoming.finalPayrollPrice ?? r.finalPayrollPrice,
          priceCompliance: incoming.priceCompliance ?? r.priceCompliance,
        };
        if (mtdLiveSyncKey(patched) === mtdLiveSyncKey(r)) return r;
        changed = true;
        return patched;
      });
      if (!changed) return prev;
      applyingPeerMtdRef.current = true;
      mtdMutatedAtRef.current = Date.now();
      writeTimedCache(CACHE_MTD_KEY, next);
      return next;
    });
  }, [addNotification, flushMatchSuggestionNotices, notifySaveError]);

  const applyIncomingMtd = useCallback((incoming: MTDRecord) => {
    if (isArchivedPayrollRecord(incoming)) {
      // Leave the live working set; only grow archive while Payroll Archive is open.
      setMtdRecords((prev) => {
        const next = prev.filter((r) => !mtdRecordsReferToSame(r, incoming));
        if (next.length === prev.length) return prev;
        applyingPeerMtdRef.current = true;
        mtdMutatedAtRef.current = Date.now();
        writeTimedCache(CACHE_MTD_KEY, next);
        return next;
      });
      if (
        shouldApplyArchivedPayrollUpdate(archivedPayrollLoadedRef.current)
      ) {
        setArchivedPayrollRecords((prev) => {
          const idx = prev.findIndex((r) => mtdRecordsReferToSame(r, incoming));
          applyingPeerMtdRef.current = true;
          mtdMutatedAtRef.current = Date.now();
          if (idx === -1) return normalizeMTD([incoming, ...prev]);
          const local = prev[idx];
          if (mtdLiveSyncKey(local) === mtdLiveSyncKey(incoming)) return prev;
          const next = [...prev];
          next[idx] = {
            ...mergeLocalMtdRecordFields(incoming, local),
            id: local.id,
            uuid: local.uuid || incoming.uuid,
          };
          return next;
        });
      }
      return;
    }

    // Live board / unpaid payroll: upsert live, drop from archive if returned.
    setMtdRecords((prev) => {
      const idx = prev.findIndex((r) => mtdRecordsReferToSame(r, incoming));
      if (idx === -1) {
        applyingPeerMtdRef.current = true;
        mtdMutatedAtRef.current = Date.now();
        const next = normalizeMTD([...prev, incoming]);
        writeTimedCache(CACHE_MTD_KEY, next);
        return next;
      }
      const local = prev[idx];
      if (mtdLiveSyncKey(local) === mtdLiveSyncKey(incoming)) return prev;
      // Stale order→MTD fan-out can arrive with inPayroll still false while
      // local already moved the row to Payroll: keep local payroll fields.
      const merged = mergeLocalMtdRecordFields(incoming, local);
      if (isArchivedPayrollRecord(merged)) {
        applyingPeerMtdRef.current = true;
        mtdMutatedAtRef.current = Date.now();
        const next = prev.filter((_, i) => i !== idx);
        writeTimedCache(CACHE_MTD_KEY, next);
        return next;
      }
      if (mtdLiveSyncKey(merged) === mtdLiveSyncKey(local)) return prev;
      applyingPeerMtdRef.current = true;
      mtdMutatedAtRef.current = Date.now();
      const next = [...prev];
      next[idx] = {
        ...merged,
        id: local.id,
        uuid: local.uuid || incoming.uuid,
      };
      writeTimedCache(CACHE_MTD_KEY, next);
      return next;
    });
    if (archivedPayrollLoadedRef.current) {
      setArchivedPayrollRecords((prev) => {
        const next = prev.filter((r) => !mtdRecordsReferToSame(r, incoming));
        return next.length === prev.length ? prev : next;
      });
    }
  }, []);

  // Single SSE for orders/MTD + producers, shared with the boards.
  useEffect(() => {
    if (!isBackendConnected || typeof window === "undefined") return;

    let cancelled = false;
    const unsubscribe = subscribeLiveStream((event) => {
      if (cancelled) return;
      if (event.type === "ready") {
        // Producer edits missed while the tab slept (boards catch up themselves).
        if (event.reconnect && event.downMs > 60_000) {
          void fetchProducersApi()
            .then((list) => {
              if (cancelled) return;
              for (const p of list) applyIncomingProducer(p);
            })
            .catch(() => {
              /* next event / reload covers it */
            });
        }
        return;
      }
      if (event.type === "order.updated") {
        applyIncomingOrder(event.order);
        return;
      }
      if (event.type === "order.deleted") {
        const deletedId = event.id;
        // Other tabs / Magento poller: drop board rows. Skip this tab's own
        // delete echo — applyOrdersBoardLiveDelete already ran locally.
        if (!isRecentLocalOrderWrite({ id: deletedId })) {
          applyOrdersBoardLiveDelete(deletedId);
        }
        setActiveOrders((prev) =>
          prev.filter(
            (o) =>
              o.id !== deletedId &&
              o.uuid !== deletedId &&
              o.legacyId !== deletedId
          )
        );
        if (pastOrdersLoadedRef.current) {
          setPastOrders((prev) =>
            prev.filter(
              (o) =>
                o.id !== deletedId &&
                o.uuid !== deletedId &&
                o.legacyId !== deletedId
            )
          );
        }
        mtdMutatedAtRef.current = Date.now();
        setMtdRecords((prev) => {
          const next = prev.filter(
            (r) =>
              r.id !== deletedId &&
              r.orderId !== deletedId &&
              r.uuid !== deletedId &&
              r.legacyId !== deletedId
          );
          writeTimedCache(CACHE_MTD_KEY, next);
          return next;
        });
        if (archivedPayrollLoadedRef.current) {
          setArchivedPayrollRecords((prev) =>
            prev.filter(
              (r) =>
                r.id !== deletedId &&
                r.orderId !== deletedId &&
                r.uuid !== deletedId &&
                r.legacyId !== deletedId
            )
          );
        }
        return;
      }
      if (event.type === "mtd.updated") {
        applyIncomingMtd(event.record);
        return;
      }
      if (event.type === "producer.updated") {
        applyIncomingProducer(transformProducer(event.producer));
        return;
      }
      if (event.type === "producer.deleted") {
        setProducers((prev) => {
          const nextList = normalizeProducerList(
            prev.filter((p) => p.id !== event.id && p.uuid !== event.id)
          );
          if (nextList.length === prev.length) return prev;
          applyingPeerProducersRef.current = true;
          producersMutatedAtRef.current = Date.now();
          writeTimedCache(CACHE_PRODUCERS_KEY, nextList);
          return nextList;
        });
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [
    isBackendConnected,
    applyIncomingOrder,
    applyIncomingMtd,
    applyIncomingProducer,
  ]);

  // Keep producers.mixesThisWeek aligned with live MTD bookings for this week.
  // Display-only: MTD is paged, so a count from local rows must never be
  // written back (it PATCHed every producer on each load, often with 0).
  const producerSyncKey = producers.map((p) => p.id).join("|");

  useEffect(() => {
    if (!isBackendConnected || isViewOnly) return;

    setProducers((prev) => {
      let changed = false;
      const next = prev.map((producer) => {
        const mixesThisWeek = countProducerMixesThisWeek(producer, mtdRecords);
        if (mixesThisWeek === (producer.mixesThisWeek ?? 0)) return producer;
        changed = true;
        return { ...producer, mixesThisWeek };
      });
      return changed ? next : prev;
    });
  }, [mtdRecords, producerSyncKey, isBackendConnected, isViewOnly]);

  useEffect(() => {
    setLocalItem(EMAIL_TEMPLATES_STORAGE_KEY, emailTemplates);
  }, [emailTemplates]);

  useEffect(() => {
    setLocalItem("slt_studio_personal_reasons", personalReasons);
  }, [personalReasons]);

  const addPersonalReason = useCallback(
    (reason: StudioPersonalReason) => {
      if (isViewOnly) return;
      const normalized = normalizeStudioPersonalReason({
        ...reason,
        isOther: false,
      });
      const tempId = normalized.id;
      setPersonalReasons((prev) =>
        ensurePersonalReasonsList([normalized, ...prev])
      );
      void createStudioPersonalReasonApi(normalized)
        .then((saved) => {
          setPersonalReasons((prev) =>
            ensurePersonalReasonsList(
              prev.map((entry) => (entry.id === tempId ? saved : entry))
            )
          );
        })
        .catch((err) => {
          setPersonalReasons((prev) =>
            ensurePersonalReasonsList(
              prev.filter((entry) => entry.id !== tempId)
            )
          );
          notifySaveError("Could not save personal reason", err);
        });
    },
    [isViewOnly]
  );

  const updatePersonalReason = useCallback(
    (id: string, patch: Partial<StudioPersonalReason>) => {
      if (isViewOnly) return;
      let previous: StudioPersonalReason | undefined;
      setPersonalReasons((prev) => {
        previous = prev.find((entry) => entry.id === id);
        return ensurePersonalReasonsList(
          prev.map((entry) => {
            if (entry.id !== id) return entry;
            if (entry.isOther) {
              return normalizeStudioPersonalReason({
                ...entry,
                name: patch.name ?? entry.name,
                enabled: true,
                isOther: true,
                id,
              });
            }
            return normalizeStudioPersonalReason({ ...entry, ...patch, id });
          })
        );
      });
      if (!previous) return;
      void updateStudioPersonalReasonApi(id, patch)
        .then((saved) => {
          setPersonalReasons((prev) =>
            ensurePersonalReasonsList(
              prev.map((entry) => (entry.id === id ? saved : entry))
            )
          );
        })
        .catch((err) => {
          setPersonalReasons((prev) =>
            ensurePersonalReasonsList(
              prev.map((entry) => (entry.id === id ? previous! : entry))
            )
          );
          notifySaveError("Could not update personal reason", err);
        });
    },
    [isViewOnly]
  );

  const removePersonalReason = useCallback(
    (id: string) => {
      if (isViewOnly) return;
      let removed: StudioPersonalReason | undefined;
      setPersonalReasons((prev) => {
        removed = prev.find((entry) => entry.id === id);
        return ensurePersonalReasonsList(
          prev.filter((entry) => entry.id !== id || entry.isOther)
        );
      });
      if (!removed || removed.isOther) return;
      void deleteStudioPersonalReasonApi(id).catch((err) => {
        setPersonalReasons((prev) =>
          ensurePersonalReasonsList([removed!, ...prev])
        );
        notifySaveError("Could not delete personal reason", err);
      });
    },
    [isViewOnly]
  );

  const addPayrollAddon = useCallback(
    async (payload: CreatePayrollAddonPayload): Promise<PayrollAddon> => {
      if (isViewOnly) throw new Error("View-only accounts cannot add payroll items.");
      const tempId = `pending-addon-${crypto.randomUUID()}`;
      const optimistic: PayrollAddon = {
        id: tempId,
        programName: payload.programName,
        contactName: payload.contactName ?? null,
        teamName: payload.teamName ?? null,
        orderId: payload.orderId ?? null,
        mtdId: payload.mtdId ?? null,
        category: payload.category,
        addonType: payload.addonType,
        amount: payload.amount,
        quantity: payload.quantity ?? null,
        unitAmount: payload.unitAmount ?? null,
        compensationRate: payload.compensationRate ?? null,
        compensationOverridden: Boolean(payload.compensationOverridden),
        rateSource: payload.rateSource,
        producerId: payload.producerId ?? null,
        producerInitials: payload.producerInitials ?? null,
        notes: payload.notes ?? null,
        createdAt: new Date().toISOString(),
      };
      setPayrollAddons((prev) => {
        const next = [optimistic, ...prev];
        return next;
      });
      try {
      const addon = await createPayrollAddonApi(payload);
        setPayrollAddons((prev) => {
          const next = prev.map((row) => (row.id === tempId ? addon : row));
          return next;
        });
      return addon;
      } catch (err) {
        setPayrollAddons((prev) => {
          const next = prev.filter((row) => row.id !== tempId);
          return next;
        });
        throw err;
      }
    },
    [isViewOnly]
  );

  const updatePayrollAddon = useCallback(
    async (
      id: string,
      patch: UpdatePayrollAddonPayload
    ): Promise<PayrollAddon> => {
      if (isViewOnly) {
        throw new Error("View-only accounts cannot edit payroll items.");
      }
      // Optimistic temp ids are not on the server — patch local only.
      if (id.startsWith("pending-addon-")) {
        let local: PayrollAddon | undefined;
        setPayrollAddons((prev) => {
          const next = prev.map((addon) => {
            if (addon.id !== id) return addon;
            local = mergePayrollAddonPatch(addon, patch);
            return local;
          });
          return next;
        });
        if (!local) throw new Error("Payroll add-on not found.");
        return local;
      }
      setPayrollAddons((prev) => {
        const next = prev.map((addon) =>
          addon.id === id ? mergePayrollAddonPatch(addon, patch) : addon
        );
        return next;
      });
      const updated = await updatePayrollAddonApi(id, patch);
      setPayrollAddons((prev) => {
        const next = prev.map((addon) => (addon.id === id ? updated : addon));
        return next;
      });
      return updated;
    },
    [isViewOnly]
  );

  const removePayrollAddon = useCallback(
    async (id: string): Promise<void> => {
      if (isViewOnly) throw new Error("View-only accounts cannot delete payroll items.");
      // Drop optimistic rows locally — they were never POSTed (or failed).
      if (id.startsWith("pending-addon-")) {
        setPayrollAddons((prev) => prev.filter((a) => a.id !== id));
        return;
      }
      await deletePayrollAddonApi(id);
      setPayrollAddons((prev) => {
        const next = prev.filter((a) => a.id !== id);
        return next;
      });
    },
    [isViewOnly]
  );

  const addManualScheduleEntry = useCallback(
    async (order: Partial<Order>): Promise<Order> => {
      if (isViewOnly) throw new Error("View-only accounts cannot create manual schedule entries.");
      // One POST with the full draft (is_manual_entry): no create-then-patch.
      const created = await createOrderApi({
        ...order,
        isManualEntry: true,
        status: order.status || "new",
      });
      // Stamp createdAt so Orders "newest" sort places this row at ID 1.
      const withCreatedAt: Order = {
        ...created,
        createdAt: created.createdAt || new Date().toISOString(),
      };
      // Dedupe vs live stream: order.updated often arrives before/alongside this
      // prepend; blind unshift was showing the same manual twice on Match.
      setActiveOrders((prev) => {
        const idx = prev.findIndex((o) => ordersReferToSame(o, withCreatedAt));
        if (idx === -1) return [withCreatedAt, ...prev];
        const next = [...prev];
        next[idx] = normalizeOrder({
          ...prev[idx],
          ...withCreatedAt,
          id: prev[idx].id,
        });
        return next;
      });
      return withCreatedAt;
    },
    [isViewOnly]
  );

  const updateEmailTemplate = useCallback(
    (id: EmailTemplateId, patch: Partial<EmailTemplateCopy>) => {
      if (isViewOnly) return;
      let previousCopy: EmailTemplateCopy | undefined;
      let nextCopy: EmailTemplateCopy | undefined;
      setEmailTemplates((prev) => {
        previousCopy = prev[id];
        const merged = normalizeEmailTemplates({
          ...prev,
          [id]: {
            ...prev[id],
            ...patch,
          },
        });
        nextCopy = merged[id];
        return merged;
      });
      if (!nextCopy) return;
      void upsertEmailTemplateApi(id, nextCopy)
        .then(() => {
          // localStorage sync effect will persist the saved state
        })
        .catch((err) => {
          if (previousCopy) {
            setEmailTemplates((prev) =>
              normalizeEmailTemplates({
                ...prev,
                [id]: previousCopy!,
              })
            );
          }
        notifySaveError("Could not save email template", err);
      });
    },
    [isViewOnly, notifySaveError]
  );

  const resetEmailTemplate = useCallback(
    (id: EmailTemplateId) => {
      if (isViewOnly) return;
      let previousCopy: EmailTemplateCopy | undefined;
      const nextCopy = DEFAULT_EMAIL_TEMPLATES[id];
      setEmailTemplates((prev) => {
        previousCopy = prev[id];
        return normalizeEmailTemplates({
          ...prev,
          [id]: nextCopy,
        });
      });
      void upsertEmailTemplateApi(id, nextCopy).catch((err) => {
        if (previousCopy) {
      setEmailTemplates((prev) =>
        normalizeEmailTemplates({
          ...prev,
              [id]: previousCopy!,
        })
      );
        }
        notifySaveError("Could not reset email template", err);
      });
    },
    [isViewOnly, notifySaveError]
  );

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Bell watchers: leave starting tomorrow + producers at Limit full today.
  useEffect(() => {
    if (isLoading || producers.length === 0) return;

    for (const hit of findLeavesStartingTomorrow(producers)) {
      addNotification({
        type: "leave_tomorrow",
        title: hit.title,
        message: hit.message,
        href: "/schedule",
        dedupeKey: hit.dedupeKey,
      });
    }

    for (const hit of findProducersAtLimitFull(producers, mtdRecords)) {
      addNotification({
        type: "limit_full",
        title: hit.title,
        message: hit.message,
        href: "/schedule",
        dedupeKey: hit.dedupeKey,
      });
    }
  }, [isLoading, producers, mtdRecords, addNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value: AppStateContextValue = {
    activeOrders,
    pastOrders,
    allOrders,
    mtdRecords,
    archivedPayrollRecords,
    secretMenuPrices,
    producers,
    discountCodes,
    payrollAddons,
    personalReasons,
    emailTemplates,
    schedule,
    notifications,
    alerts,
    unreadCount,
    isBackendConnected,
    isLoading,
    isViewOnly,
    moveOrderToMTD,
    updateMTD,
    removeMTDRecord,
    updateOrder,
    deleteOrder,
    setSecretMenuPrices,
    markComplete,
    addPastOrder,
    receiveOrder,
    ensurePastOrdersLoaded,
    releasePastOrders,
    ensureLiveMtdLoaded,
    ensureArchivedPayrollLoaded,
    releaseArchivedPayroll,
    ensurePayrollLinkedAddonsLoaded,
    ensureAddonsForMtdIdsLoaded,
    ensureVoiceoverAddonsLoaded,
    matchManualWithMagento,
    addProducer,
    updateProducer,
    removeProducer,
    addDiscountCode,
    updateDiscountCode,
    removeDiscountCode,
    addPayrollAddon,
    updatePayrollAddon,
    removePayrollAddon,
    addManualScheduleEntry,
    addNotification,
    addAlert,
    addPersonalReason,
    updatePersonalReason,
    removePersonalReason,
    updateEmailTemplate,
    resetEmailTemplate,
    markNotificationRead,
    markAllNotificationsRead,
    maybeNotifyMatchSuggestion,
    unseenSuggestedMatchCount: unseenMatchFormIds.length,
    markMatchOrdersSeen,
    isInMTD,
  };

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}

