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
  AppNotification,
  DiscountCode,
  MTDRecord,
  Order,
  PayrollAddon,
  Producer,
  ScheduleEntry,
} from "@/types";
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
import { normalizeOrder, orderToMTDRecord } from "@/lib/order-form";
import { mergeCollectionStateFromOrder } from "@/lib/order-staging";
import { useAuth } from "@/context/AuthContext";
import {
  detectCompliance,
  getDefaultPackagePrices,
  getDefaultSecretMenuPricing,
  getPriceForPackage,
  type SecretMenuPricing,
} from "@/lib/pricing";
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
import { inferMTDRecordStatus } from "@/lib/mtd-status";
import { toIsoDateString } from "@/lib/dates";
import { ApiClientError, formatApiClientError } from "@/lib/api/client";
import {
  createProducerApi,
  resolveProducerApiId,
  updateProducerApi,
  deleteProducerApi,
  producerFromConflictError,
  subscribeProducerStream,
  subscribeBoardStream,
  transformProducer,
  createOrderApi,
  updateOrderApi,
  createMTDRecordApi,
  updateMTDRecordApi,
  deleteMTDRecordApi,
  createDiscountCodeApi,
  updateDiscountCodeApi,
  deleteDiscountCodeApi,
  createPayrollAddonApi,
  deletePayrollAddonApi,
  type CreatePayrollAddonPayload,
  createManualScheduleEntryApi,
  type CreateManualSchedulePayload,
  createStudioPersonalReasonApi,
  updateStudioPersonalReasonApi,
  deleteStudioPersonalReasonApi,
  upsertEmailTemplateApi,
  fetchBootstrapApi,
  fetchOrdersApi,
  fetchProducersApi,
  fetchMTDRecordsApi,
  fetchDiscountCodesApi,
  fetchPayrollAddonsApi,
  fetchStudioPersonalReasonsApi,
  fetchEmailTemplatesApi,
  savePackagePricesApi,
  saveSecretMenuPricingApi,
  fetchPackagePricesApi,
  fetchSecretMenuPricingApi,
  type BootstrapPayload,
} from "@/lib/api";

type AppStateContextValue = {
  activeOrders: Order[];
  pastOrders: Order[];
  allOrders: Order[];
  mtdRecords: MTDRecord[];
  packagePrices: Record<string, number>;
  secretMenuPrices: SecretMenuPricing;
  producers: Producer[];
  discountCodes: DiscountCode[];
  payrollAddons: PayrollAddon[];
  personalReasons: StudioPersonalReason[];
  emailTemplates: EmailTemplatesState;
  schedule: ScheduleEntry[];
  notifications: AppNotification[];
  unreadCount: number;
  isBackendConnected: boolean;
  isLoading: boolean;
  isViewOnly: boolean;
  moveOrderToMTD: (orderId: string) => MTDRecord | null;
  updateMTD: (id: string, patch: Partial<MTDRecord>) => Promise<void>;
  removeMTDRecord: (id: string) => Promise<void>;
  updateOrder: (
    id: string,
    patch: Partial<Order>,
    seed?: Order
  ) => Promise<void>;
  setPackagePrices: (prices: Record<string, number>) => void;
  setSecretMenuPrices: (pricing: SecretMenuPricing) => void;
  markComplete: (orderId: string) => void;
  addPastOrder: (order: Order) => void;
  /** Incoming customer order — adds to active list and notifies the bell. */
  receiveOrder: (order: Order) => void;
  addProducer: (producer: Producer) => Promise<Producer>;
  updateProducer: (id: string, patch: Partial<Producer>) => Promise<Producer>;
  removeProducer: (id: string) => Promise<void>;
  addDiscountCode: (discountCode: DiscountCode) => Promise<DiscountCode>;
  updateDiscountCode: (id: string, patch: Partial<DiscountCode>) => Promise<DiscountCode>;
  removeDiscountCode: (id: string) => Promise<void>;
  addPayrollAddon: (payload: CreatePayrollAddonPayload) => Promise<PayrollAddon>;
  removePayrollAddon: (id: string) => Promise<void>;
  addManualScheduleEntry: (payload: CreateManualSchedulePayload) => Promise<Order>;
  addNotification: (notification: Omit<AppNotification, "id" | "read" | "createdAt">) => void;
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
  isInMTD: (orderId: string) => boolean;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

function normalizeOrders(orders: Order[]): Order[] {
  return orders.map((o) => normalizeOrder(o));
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
      priceCompliance: r.priceCompliance || detectCompliance(r.musicTheme),
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
// 1) Version the key — bump to invalidate everyone's old blobs after schema/data resets
// 2) Always paint any snapshot; always revalidate from the network (SWR)
// 3) Drop only absurdly old blobs (safety); rewrite cache after successful sync / mutations
const CACHE_VERSION = "v2";
const CACHE_ORDERS_KEY = `slt_cache_orders_${CACHE_VERSION}`;
const CACHE_MTD_KEY = `slt_cache_mtd_${CACHE_VERSION}`;
const CACHE_PRODUCERS_KEY = `slt_cache_producers_${CACHE_VERSION}`;
/** Drop snapshots older than this — not used to block first paint under 7 days. */
const CACHE_HARD_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type TimedCache<T> = { savedAt: number; data: T };

/** Last snapshot for first paint, even if stale. Null only when missing/corrupt/too old. */
function readCache<T>(key: string): T | null {
  const wrapped = getLocalItem<TimedCache<T> | T | null>(key, null);
  if (!wrapped) return null;
  // Legacy unwrapped shape from older builds — treat as unusable.
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
  /** Producer ids with an in-flight save — skip stream merges until complete. */
  const pendingProducerSavesRef = useRef<Set<string>>(new Set());
  const applyingPeerProducersRef = useRef(false);
  const producersChannelRef = useRef<BroadcastChannel | null>(null);
  const applyingPeerMtdRef = useRef(false);
  const mtdChannelRef = useRef<BroadcastChannel | null>(null);
  const applyingPeerOrdersRef = useRef(false);
  const ordersChannelRef = useRef<BroadcastChannel | null>(null);

  // Drop legacy cache keys so hard-to-clear v1 blobs (e.g. 439 deleted orders)
  // can never hydrate again.
  if (typeof window !== "undefined") {
    localStorage.removeItem("slt_persisted_active_orders");
    localStorage.removeItem("slt_persisted_past_orders");
    localStorage.removeItem("slt_persisted_mtd_records");
    localStorage.removeItem("slt_cache_orders_v1");
    localStorage.removeItem("slt_cache_mtd_v1");
    localStorage.removeItem("slt_cache_producers_v1");
  }

  // Paint any SWR snapshot immediately; bootstrap always revalidates in background.
  const cachedOrders = readCache<{ active: Order[]; past: Order[] }>(
    CACHE_ORDERS_KEY
  );
  const cachedMtd = readCache<MTDRecord[]>(CACHE_MTD_KEY);
  const cachedProducers = readCache<Producer[]>(CACHE_PRODUCERS_KEY);
  const hasCachedData = Boolean(
    cachedOrders || cachedMtd || (cachedProducers && cachedProducers.length > 0)
  );

  const [activeOrders, setActiveOrders] = useState<Order[]>(
    () => cachedOrders?.active ?? []
  );
  const [pastOrders, setPastOrders] = useState<Order[]>(
    () => cachedOrders?.past ?? []
  );
  const [mtdRecords, setMtdRecords] = useState<MTDRecord[]>(() => cachedMtd ?? []);

  const [packagePrices, setPackagePricesState] = useState<Record<string, number>>(
    () => getDefaultPackagePrices()
  );
  const [secretMenuPrices, setSecretMenuPricesState] = useState<SecretMenuPricing>(
    () => getDefaultSecretMenuPricing()
  );

  // Notifications start empty — populated when backend data loads or user actions occur.
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [producers, setProducers] = useState<Producer[]>(() => {
    if (cachedProducers && cachedProducers.length > 0) {
      return normalizeProducerList(
        cachedProducers.map((p) => normalizeProducer(p))
      );
    }
    // Don't paint seed order first — that reshuffles when DB bootstrap arrives.
    return [];
  });
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
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

  // Load data from FastAPI Backend on Mount — prefer one bootstrap request.
  useEffect(() => {
    let isMounted = true;
    let loadGen = 0;

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
      const loadedPastOrders = normalizeOrders(boot.pastOrders);
      // Don't clobber a newer optimistic price edit with a slower boot.
      if (fetchedAt >= ordersMutatedAtRef.current) {
        setActiveOrders(loadedActiveOrders);
        setPastOrders(loadedPastOrders);
        writeTimedCache(CACHE_ORDERS_KEY, {
          active: loadedActiveOrders,
          past: loadedPastOrders,
        });
      }

      const orderById = new Map<string, Order>();
      for (const order of [...loadedActiveOrders, ...loadedPastOrders]) {
        for (const key of [order.id, order.uuid, order.legacyId]) {
          if (key) orderById.set(key, order);
        }
      }

      const loadedMtdRecords = normalizeMTD(boot.mtdRecords).map((rec) => {
        const linked =
          (rec.orderId && orderById.get(rec.orderId)) ||
          orderById.get(rec.id) ||
          (rec.uuid && orderById.get(rec.uuid)) ||
          (rec.legacyId && orderById.get(rec.legacyId)) ||
          null;
        return mergeCollectionStateFromOrder(rec, linked);
      });
      const existingMtdOrderIds = new Set(
        loadedMtdRecords.map((r) => r.orderId).filter(Boolean)
      );
      const convertedOrders: MTDRecord[] = [];
      for (const order of loadedActiveOrders) {
        const oid = order.id || order.uuid || order.legacyId;
        if (oid && !existingMtdOrderIds.has(oid)) {
          convertedOrders.push(orderToMTDRecord(order));
        }
      }
      const combinedMtd = [...loadedMtdRecords, ...convertedOrders];
      // Don't clobber a newer optimistic Paid / board edit with a slower boot.
      if (fetchedAt >= mtdMutatedAtRef.current) {
        setMtdRecords(combinedMtd);
        writeTimedCache(CACHE_MTD_KEY, combinedMtd);
      }

      setDiscountCodes(boot.discountCodes);
      setPayrollAddons(boot.payrollAddons);

      if (boot.personalReasons.length > 0) {
        setPersonalReasons(ensurePersonalReasonsList(boot.personalReasons));
      }
      if (boot.emailTemplates) {
        setEmailTemplates(normalizeEmailTemplates(boot.emailTemplates));
      }
      if (boot.packagePrices) {
        setPackagePricesState(boot.packagePrices);
      }
      if (boot.secretMenuPricing) {
        setSecretMenuPricesState(boot.secretMenuPricing);
      }

      setIsBackendConnected(true);
    }

    /** Legacy path: parallel GETs when /api/bootstrap is missing or down. */
    async function fetchLegacyBootstrap(): Promise<BootstrapPayload> {
      const [
        producers,
        orders,
        mtdRecords,
        discountCodes,
        payrollAddons,
        personalReasons,
        emailTemplates,
        packagePrices,
        secretMenuPricing,
      ] = await Promise.all([
        fetchProducersApi().catch(() => [] as Producer[]),
        fetchOrdersApi().catch(() => ({
          activeOrders: [] as Order[],
          pastOrders: [] as Order[],
        })),
        fetchMTDRecordsApi().catch(() => [] as MTDRecord[]),
        fetchDiscountCodesApi().catch(() => [] as DiscountCode[]),
        fetchPayrollAddonsApi().catch(() => [] as PayrollAddon[]),
        fetchStudioPersonalReasonsApi().catch(
          () => [] as StudioPersonalReason[]
        ),
        fetchEmailTemplatesApi().catch(() => null),
        fetchPackagePricesApi().catch(() => null),
        fetchSecretMenuPricingApi().catch(() => null),
      ]);

      if (
        producers.length === 0 &&
        orders.activeOrders.length === 0 &&
        orders.pastOrders.length === 0 &&
        mtdRecords.length === 0
      ) {
        throw new Error("Legacy bootstrap returned no data");
      }

      return {
        producers,
        activeOrders: orders.activeOrders,
        pastOrders: orders.pastOrders,
        mtdRecords,
        discountCodes,
        payrollAddons,
        personalReasons,
        emailTemplates,
        packagePrices,
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

  const addNotification = useCallback(
    (n: Omit<AppNotification, "id" | "read" | "createdAt">) => {
      const notification: AppNotification = {
        ...n,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        read: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [notification, ...prev].slice(0, 20));
    },
    []
  );

  const notifySaveError = useCallback(
    (title: string, err: unknown) => {
      addNotification({
        type: "error",
        title,
        message: formatApiClientError(err, "Could not save. Please try again."),
      });
    },
    [addNotification]
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

      const compliance = order.priceCompliance || detectCompliance(order.musicTheme);
      const price =
        order.price ||
        getPriceForPackage(order.package, compliance, order.price, packagePrices);

      const draftId = `mtd-${Date.now()}`;

      const sectionForCategory = (cat: string) => {
        if (cat === "Dance") return "DANCE MUSIC";
        if (cat === "Marching Band") return "MARCHING BAND";
        if (cat === "Sports Entertainment") return "SPORTS ENTERTAINMENT";
        if (cat === "School Anthem") return "SCHOOL ANTHEMS";
        return "CHEERLEADING MUSIC";
      };

      const draftRecord: MTDRecord = {
        id: draftId,
        orderId: order.uuid || order.id,
        section: sectionForCategory(order.category),
        assignedProducer: null,
        category: order.category,
        editorRequest: order.editorRequest,
        contactName: order.contactName || order.customerName,
        editorInitials: order.contactName || order.customerName,
        programName: order.programName,
        package: order.package,
        musicTheme: order.musicTheme,
        price,
        priceCompliance: compliance,
        invoice: "",
        mixStartDate: (order as any).mixStartDate || "",
        mixEndDate: (order as any).mixEndDate || undefined,
        eightCountSheet: "NEED CS",
        haveSongs: "NEED SONGS",
        needsAttention: false,
        status: "active",
        recordStatus: "Ongoing",
        formType: order.formType,
        cheerFormSubtype: order.cheerFormSubtype,
        danceFormSubtype: order.danceFormSubtype,
      };

      const pick = pickDefaultEditor(
        draftRecord,
        producers,
        mtdRecords,
        schedule,
        order
      );
      const availableNames = getSuggestedEditors(
        mtdRecords,
        producers,
        schedule,
        order.category,
        draftId,
        draftRecord
      ).map((suggestion) => suggestion.name);
      const assignedProducer = pick.editor || null;
      const editorRequest = assignedProducer
        ? editorRequestForAssignment(
            pick.editor,
            pick.requestedEditor,
            availableNames
          )
        : order.editorRequest;
      const newRecord: MTDRecord = {
        ...draftRecord,
        assignedProducer,
        editorRequest,
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

      // Persist to Backend API and write real DB UUID back into state
      // so that subsequent PATCH calls use the correct ID (avoids 404s).
      void (async () => {
        try {
          const saved = await createMTDRecordApi({
            ...newRecord,
            orderId: order.uuid || order.id,
          });
          if (saved.uuid && saved.uuid !== draftId) {
            setMtdRecords((prev) =>
              prev.map((r) =>
                r.id === draftId
                  ? {
                      ...r,
                      id: saved.id,
                      uuid: saved.uuid,
                      legacyId: saved.legacyId,
                    }
                  : r
              )
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

      const slotMsg = assignedProducer
        ? ` Next slot: ${formatSlot(assignedProducer, producers, schedule)}.`
        : "";
      const busyFallback =
        pick.reason === "requested_busy"
          ? ` ${pick.requestedEditor} was booked — assigned ${assignedProducer} (FA).`
          : "";

      addNotification({
        type: "mtd_move",
        title: "Moved to MTD",
        message: `${order.programName} is now in Music To Do.${busyFallback}${slotMsg}`,
        href: `/mtd/${newRecord.id}`,
      });

      return newRecord;
    },
    [
      activeOrders,
      isInMTD,
      mtdRecords,
      producers,
      schedule,
      addNotification,
      notifySaveError,
      packagePrices,
      isViewOnly,
    ]
  );

  const setPackagePrices = useCallback(
    (prices: Record<string, number>) => {
      if (isViewOnly) return;
      const prevPrices = packagePrices;
      const prevMtd = mtdRecords;
      setPackagePricesState(prices);
      setMtdRecords((prev) =>
        prev.map((record) => {
          const compliance =
            record.priceCompliance || detectCompliance(record.musicTheme);
          return {
            ...record,
            price: getPriceForPackage(
              record.package,
              compliance,
              record.price,
              prices
            ),
          };
        })
      );
      void savePackagePricesApi(prices)
        .then((saved) => setPackagePricesState(saved))
        .catch((err) => {
          setPackagePricesState(prevPrices);
          setMtdRecords(prevMtd);
          notifySaveError("Could not save package prices", err);
        });
    },
    [isViewOnly, packagePrices, mtdRecords, notifySaveError]
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

  const updateMTD = useCallback(async (id: string, patch: Partial<MTDRecord>) => {
    if (isViewOnly) return;
    let payrollNotice: Omit<AppNotification, "id" | "read" | "createdAt"> | null =
      null;
    let apiPatch = patch;

    const existing = mtdRecords.find(
      (r) => r.id === id || r.orderId === id || r.uuid === id || r.legacyId === id
    );
    const apiId = existing?.uuid || existing?.id || id;
    mtdMutatedAtRef.current = Date.now();
    ordersMutatedAtRef.current = Date.now();

    setMtdRecords((prev) => {
      const next = prev.map((r) => {
        if (r.id !== id && r.orderId !== id && r.uuid !== id && r.legacyId !== id) return r;

        if (patch.inPayroll === true && !r.inPayroll) {
          const producer = r.assignedProducer?.trim();
          payrollNotice = {
            type: "payroll",
            title: "Moved to payroll",
            message: producer
              ? `${r.programName} · ${producer}`
              : r.programName,
            href: "/payroll",
          };
        }

        const updated = { ...r, ...patch };

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

        if (patch.package || patch.priceCompliance || patch.musicTheme) {
          const compliance =
            patch.priceCompliance ||
            detectCompliance(patch.musicTheme ?? r.musicTheme);
          updated.priceCompliance = compliance;
          if (patch.price === undefined) {
            updated.price = getPriceForPackage(
              patch.package ?? r.package,
              compliance,
              r.price,
              packagePrices
            );
          }
        }

        const sheet = String(updated.eightCountSheet ?? "");
        const songs = String(updated.haveSongs ?? "");
        const needsCs = sheet.toUpperCase().includes("NEED");
        const needsSongs = songs.toUpperCase().includes("NEED");
        updated.needsAttention = needsCs || needsSongs;

        return updated;
      });
      // Cache immediately so other tabs pick Paid / board moves via storage.
      writeTimedCache(CACHE_MTD_KEY, next);
      return next;
    });

    // Sync linked Order. MTD rows use their own UUID as `id`, so also match via
    // orderId / mtdId — otherwise Move to Orders never flips Order.status off in_mtd.
    const orderLookupIds = new Set(
      [id, existing?.orderId, existing?.id, existing?.uuid, existing?.legacyId].filter(
        (value): value is string => Boolean(value)
      )
    );
    const linkedOrder = activeOrders.find(
      (o) =>
        orderLookupIds.has(o.id) ||
        (o.legacyId && orderLookupIds.has(o.legacyId)) ||
        (o.uuid && orderLookupIds.has(o.uuid)) ||
        (o.mtdId && orderLookupIds.has(o.mtdId))
    );

    const orderPatch: Record<string, unknown> = {};
    if (linkedOrder) {
      if (patch.assignedProducer !== undefined) {
        orderPatch.assignedProducer =
          apiPatch.assignedProducer ?? patch.assignedProducer;
      }
      if (patch.mixStartDate !== undefined) {
        orderPatch.mixStartDate = apiPatch.mixStartDate ?? patch.mixStartDate;
      }
      if (patch.mixEndDate !== undefined) {
        orderPatch.mixEndDate = apiPatch.mixEndDate ?? patch.mixEndDate;
      }
      if (patch.price !== undefined) orderPatch.price = patch.price;
      if (patch.finalCustomerPrice !== undefined) {
        orderPatch.finalCustomerPrice = patch.finalCustomerPrice;
      }
      if (patch.finalCustomerPriceOverridden !== undefined) {
        orderPatch.finalCustomerPriceOverridden =
          patch.finalCustomerPriceOverridden;
      }
      if (patch.finalPayrollPrice !== undefined) {
        orderPatch.finalPayrollPrice = patch.finalPayrollPrice;
      }
      if (patch.priceCompliance !== undefined) {
        orderPatch.priceCompliance = patch.priceCompliance;
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
        setActiveOrders((prev) =>
          prev.map((o) =>
            o.id === linkedOrder.id ? { ...o, ...orderPatch } : o
          )
        );
      }
    }

    const prevActive = activeOrders;
    const prevMtd = mtdRecords;

    // Persist: order shared fields first (canonical), then MTD board row.
    try {
      if (linkedOrder && Object.keys(orderPatch).length > 0) {
        await updateOrderApi(linkedOrder.id, orderPatch);
      }

      if (patch.inMTD === true) {
        const targetRecord = mtdRecords.find(
          (r) =>
            r.id === id ||
            r.orderId === id ||
            r.uuid === id ||
            r.legacyId === id
        );
        const updatedRecord = targetRecord
          ? {
              ...targetRecord,
              ...apiPatch,
              inMTD: true,
              collectionStates:
                (apiPatch as MTDRecord).collectionStates ??
                targetRecord.collectionStates ??
                linkedOrder?.collectionStates,
              haveSongs:
                (apiPatch as MTDRecord).haveSongs ||
                targetRecord.haveSongs ||
                linkedOrder?.haveSongs ||
                "",
              eightCountSheet:
                (apiPatch as MTDRecord).eightCountSheet ||
                targetRecord.eightCountSheet ||
                linkedOrder?.eightCountSheet ||
                "",
            }
          : { ...apiPatch, inMTD: true };
        try {
          const saved = await createMTDRecordApi(updatedRecord as MTDRecord);
          setMtdRecords((prev) =>
            prev.map((r) =>
              r.id === id ||
              r.orderId === id ||
              r.uuid === id ||
              r.legacyId === id
                ? {
                    ...r,
                    ...apiPatch,
                    id: saved.id,
                    uuid: saved.uuid,
                    legacyId: saved.legacyId,
                    inMTD: true,
                    collectionStates:
                      saved.collectionStates ??
                      (updatedRecord as MTDRecord).collectionStates ??
                      r.collectionStates,
                    haveSongs:
                      saved.haveSongs ||
                      (updatedRecord as MTDRecord).haveSongs ||
                      r.haveSongs,
                    eightCountSheet:
                      saved.eightCountSheet ||
                      (updatedRecord as MTDRecord).eightCountSheet ||
                      r.eightCountSheet,
                  }
                : r
            )
          );
        } catch {
          await updateMTDRecordApi(apiId, apiPatch);
        }
      } else {
        const isRealMtdRecord = Boolean(
          existing &&
            (existing.inMTD === true ||
              existing.isManualScheduleEntry === true ||
              !linkedOrder)
        );
        if (isRealMtdRecord) {
          await updateMTDRecordApi(apiId, apiPatch);
        } else if (existing && Object.keys(apiPatch).length > 0) {
          // Orders-board virtual row: create a real MTD row so MTD-only
          // fields (payroll, invoice, etc.) survive hard refresh.
          try {
            const seeded: MTDRecord = {
              ...existing,
              ...apiPatch,
              collectionStates:
                (apiPatch as MTDRecord).collectionStates ??
                existing.collectionStates ??
                linkedOrder?.collectionStates,
              haveSongs:
                (apiPatch as MTDRecord).haveSongs ||
                existing.haveSongs ||
                linkedOrder?.haveSongs ||
                "",
              eightCountSheet:
                (apiPatch as MTDRecord).eightCountSheet ||
                existing.eightCountSheet ||
                linkedOrder?.eightCountSheet ||
                linkedOrder?.sendingEightCountSheets ||
                linkedOrder?.usingEightCountSheets ||
                "",
              orderStatus:
                (apiPatch as { orderStatus?: string }).orderStatus ||
                existing.orderStatus ||
                linkedOrder?.orderStatus,
              isReassigned:
                (apiPatch as MTDRecord).isReassigned ??
                existing.isReassigned ??
                linkedOrder?.isReassigned,
            };
            const saved = await createMTDRecordApi(seeded);
            setMtdRecords((prev) =>
              prev.map((r) =>
                r.id === id ||
                r.orderId === id ||
                r.uuid === id ||
                r.legacyId === id
                  ? {
                      ...r,
                      ...apiPatch,
                      id: saved.id,
                      uuid: saved.uuid,
                      legacyId: saved.legacyId,
                      collectionStates:
                        saved.collectionStates ??
                        seeded.collectionStates ??
                        r.collectionStates,
                      haveSongs:
                        saved.haveSongs || seeded.haveSongs || r.haveSongs,
                      eightCountSheet:
                        saved.eightCountSheet ||
                        seeded.eightCountSheet ||
                        r.eightCountSheet,
                      orderStatus:
                        saved.orderStatus ||
                        seeded.orderStatus ||
                        r.orderStatus,
                    }
                  : r
              )
            );
          } catch {
            await updateMTDRecordApi(apiId, apiPatch);
          }
        }
      }
    } catch (err) {
      setActiveOrders(prevActive);
      setMtdRecords(prevMtd);
      notifySaveError("Could not save MTD changes", err);
      throw err;
    }

    if (payrollNotice) {
      addNotification(payrollNotice);
    }
  }, [
    activeOrders,
    addNotification,
    notifySaveError,
    mtdRecords,
    packagePrices,
    producers,
    schedule,
    isViewOnly,
  ]);

  const removeMTDRecord = useCallback(
    async (id: string) => {
      if (isViewOnly) {
        throw new Error("View-only accounts cannot delete payroll records.");
      }
      let removed: MTDRecord | undefined;
      let removedOrder: Order | undefined;
      mtdMutatedAtRef.current = Date.now();
      setMtdRecords((prev) => {
        removed = prev.find(
          (r) => r.id === id || r.orderId === id || r.uuid === id || r.legacyId === id
        );
        const next = prev.filter(
          (r) =>
            r.id !== id &&
            r.orderId !== id &&
            r.uuid !== id &&
            r.legacyId !== id &&
            !(removed?.orderId && (r.orderId === removed.orderId || r.id === removed.orderId))
        );
        writeTimedCache(CACHE_MTD_KEY, next);
        return next;
      });
      if (!removed) return;
      const orderIds = new Set(
        [removed.orderId, removed.id, removed.uuid, removed.legacyId].filter(
          Boolean
        ) as string[]
      );
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
            a.mtdId !== removed!.id &&
            !(removed!.orderId && a.orderId === removed!.orderId)
        )
      );
      try {
        await deleteMTDRecordApi(removed.uuid || removed.id);
        setMtdRecords((prev) => {
          writeTimedCache(CACHE_MTD_KEY, prev);
          return prev;
        });
        setIsBackendConnected(true);
      } catch (err) {
        if (removed) {
          setMtdRecords((prev) => [removed!, ...prev]);
        }
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
      const merge = (order: Order) => normalizeOrder({ ...order, ...patch, id });
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
      if (patch.priceCompliance !== undefined) {
        mtdPatch.priceCompliance = patch.priceCompliance;
      }
      if (patch.editorRequest !== undefined) {
        mtdPatch.editorRequest = patch.editorRequest;
      }
      if (patch.isReassigned !== undefined) mtdPatch.isReassigned = patch.isReassigned;
      if (patch.collectionStates !== undefined) {
        mtdPatch.collectionStates = patch.collectionStates;
      }
      if (patch.haveSongs !== undefined) mtdPatch.haveSongs = patch.haveSongs;
      if (patch.eightCountSheet !== undefined) {
        mtdPatch.eightCountSheet = patch.eightCountSheet;
      }
      if (patch.orderStatus !== undefined) mtdPatch.orderStatus = patch.orderStatus;

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
        // Order is canonical — write it first; backend mirrors to MTD.
        await updateOrderApi(id, patch);
        if (
          linkedMtd &&
          (linkedMtd.inMTD || linkedMtd.isManualScheduleEntry) &&
          Object.keys(mtdPatch).length > 0
        ) {
          const apiId = linkedMtd.uuid || linkedMtd.id;
          await updateMTDRecordApi(apiId, mtdPatch);
        }
      } catch (err) {
        setActiveOrders(prevActive);
        setPastOrders(prevPast);
        setMtdRecords(prevMtd);
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
      setPastOrders((prev) => [completed, ...prev]);

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
      setPastOrders((prev) => [order, ...prev]);
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
  const receiveOrder = useCallback(
    (order: Order) => {
      const incoming = normalizeOrder({
        ...order,
        status: order.status || "new",
      });
      const prevActive = activeOrders;
      setActiveOrders((prev) => {
        if (prev.some((o) => o.id === incoming.id)) return prev;
        return [incoming, ...prev];
      });

      void createOrderApi(incoming).catch((err) => {
        setActiveOrders(prevActive);
        notifySaveError("Could not save new order", err);
      });

      addNotification({
        type: "new_order",
        title: "New order received",
        message: `${incoming.programName} · ${
          incoming.contactName || incoming.customerName || "Customer"
        }`,
        href: "/mtd",
      });
    },
    [addNotification, activeOrders, notifySaveError]
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
    const mtdToSync = assignmentKeyChanged
      ? mtdRecords
          .filter(
            (rec) =>
              (rec.assignedProducer &&
                producerKeysMatch(rec.assignedProducer, oldAssignmentKey)) ||
              (rec.editorRequest &&
                producerKeysMatch(rec.editorRequest, oldAssignmentKey))
          )
          .map((rec) => ({
            id: rec.uuid || rec.id,
            assignedProducer: rec.assignedProducer,
            editorRequest: rec.editorRequest,
          }))
      : [];
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
      // Only after the producer initials exist in the DB — rewriting first
      // cleared MTD assigned_producer_id when resolve(newKey) failed.
      for (const rec of mtdToSync) {
        const mtdPatch: Partial<MTDRecord> = {};
        if (
          rec.assignedProducer &&
          producerKeysMatch(rec.assignedProducer, oldAssignmentKey)
        ) {
          mtdPatch.assignedProducer = newAssignmentKey;
        }
        if (
          rec.editorRequest &&
          producerKeysMatch(rec.editorRequest, oldAssignmentKey)
        ) {
          mtdPatch.editorRequest =
            newAssignmentKey as MTDRecord["editorRequest"];
        }
        if (Object.keys(mtdPatch).length === 0) continue;
        try {
          await updateMTDRecordApi(rec.id, mtdPatch);
        } catch {
          /* best-effort; backend cascade is primary */
        }
      }
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
              addNotification({
                type: "schedule",
                title: "Updated elsewhere — reloaded",
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
        addNotification({
          type: "schedule",
          title: "Updated elsewhere — reloaded",
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
    addNotification,
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
        throw new Error("View-only accounts cannot add discount codes.");
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
        throw new Error("View-only accounts cannot edit discount codes.");
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
        throw new Error("Discount code not found.");
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
        throw new Error("View-only accounts cannot delete discount codes.");
      }
      let removed: DiscountCode | undefined;
      setDiscountCodes((prev) => {
        removed = prev.find((entry) => entry.id === id);
        return prev.filter((entry) => entry.id !== id);
      });
      if (!removed) {
        throw new Error("Discount code not found.");
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
    const payload = { active: activeOrders, past: pastOrders };
    writeTimedCache(CACHE_ORDERS_KEY, payload);
    if (applyingPeerOrdersRef.current) {
      applyingPeerOrdersRef.current = false;
      return;
    }
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
  }, [activeOrders, pastOrders, isBackendConnected]);

  useEffect(() => {
    if (!isBackendConnected) return;
    writeTimedCache(CACHE_MTD_KEY, mtdRecords);
    // Instant same-browser fan-out (Payroll Paid visible in other tabs).
    if (applyingPeerMtdRef.current) {
      applyingPeerMtdRef.current = false;
      return;
    }
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
    writeTimedCache(CACHE_PRODUCERS_KEY, producers);
    // Instant same-browser fan-out (Schedule open in another tab).
    if (applyingPeerProducersRef.current) {
      applyingPeerProducersRef.current = false;
      return;
    }
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
    // order patches — rewrite local assignment keys immediately so Orders
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
        const nextList = normalizeProducerList(next);
        writeTimedCache(CACHE_PRODUCERS_KEY, nextList);
        return nextList;
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
          changed = true;
          return { ...local, ...peer, id: local.id, uuid: local.uuid || peer.uuid };
        });
        for (const peer of incoming) {
          if (next.some((r) => mtdRecordsReferToSame(r, peer))) continue;
          next.push(peer);
          changed = true;
        }
        if (!changed) return prev;
        applyingPeerMtdRef.current = true;
        mtdMutatedAtRef.current = Date.now();
        writeTimedCache(CACHE_MTD_KEY, next);
        return next;
      });
    };

    const applyPeerOrders = (active: Order[], past: Order[]) => {
      const mergeSide = (prev: Order[], incoming: Order[]) => {
        let changed = false;
        const next = prev.map((local) => {
          const peer = incoming.find((o) => ordersReferToSame(o, local));
          if (!peer) return local;
          if (orderLiveSyncKey(peer) === orderLiveSyncKey(local)) return local;
          changed = true;
          return {
            ...local,
            ...peer,
            id: local.id,
            uuid: local.uuid || peer.uuid,
          };
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
        applyingPeerOrdersRef.current = true;
        ordersMutatedAtRef.current = Date.now();
        return next;
      });
      setPastOrders((prev) => {
        const { next, changed } = mergeSide(prev, normalizeOrders(past));
        if (!changed) return prev;
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
        if (!Array.isArray(data.active) || !Array.isArray(data.past)) return;
        applyPeerOrders(data.active as Order[], data.past as Order[]);
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
            past: Order[];
          }> | null;
          if (
            parsed?.data &&
            Array.isArray(parsed.data.active) &&
            Array.isArray(parsed.data.past)
          ) {
            applyPeerOrders(parsed.data.active, parsed.data.past);
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
    const mergeList = (prev: Order[]) => {
      const idx = prev.findIndex((o) => ordersReferToSame(o, incoming));
      if (idx === -1) return prev;
      const local = prev[idx];
      if (orderLiveSyncKey(local) === orderLiveSyncKey(incoming)) return prev;
      applyingPeerOrdersRef.current = true;
      ordersMutatedAtRef.current = Date.now();
      const next = [...prev];
      next[idx] = {
        ...local,
        ...incoming,
        id: local.id,
        uuid: local.uuid || incoming.uuid,
      };
      return next;
    };
    setActiveOrders(mergeList);
    setPastOrders(mergeList);

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
  }, []);

  const applyIncomingMtd = useCallback((incoming: MTDRecord) => {
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
      const peerPaid = Boolean(incoming.paidAt);
      const localPaid = Boolean(local.paidAt);
      if (localPaid && !peerPaid) return prev;
      applyingPeerMtdRef.current = true;
      mtdMutatedAtRef.current = Date.now();
      const next = [...prev];
      next[idx] = {
        ...local,
        ...incoming,
        id: local.id,
        uuid: local.uuid || incoming.uuid,
      };
      writeTimedCache(CACHE_MTD_KEY, next);
      return next;
    });
  }, []);

  // Server fan-out for other devices / when BroadcastChannel is unavailable.
  useEffect(() => {
    if (!isBackendConnected || typeof window === "undefined") return;

    let cancelled = false;
    let retryTimer: number | undefined;
    const abortRef = { current: null as AbortController | null };

    const connect = () => {
      if (cancelled) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      void subscribeProducerStream((event) => {
        if (cancelled) return;
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
      }, controller.signal)
        .catch(() => {
          /* reconnect below */
        })
        .then(() => {
          if (cancelled) return;
          retryTimer = window.setTimeout(connect, 1500);
        });
    };

    connect();

    return () => {
      cancelled = true;
      abortRef.current?.abort();
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [isBackendConnected, applyIncomingProducer]);

  // Cross-browser package price + board field fan-out.
  useEffect(() => {
    if (!isBackendConnected || typeof window === "undefined") return;

    let cancelled = false;
    let retryTimer: number | undefined;
    const abortRef = { current: null as AbortController | null };

    const connect = () => {
      if (cancelled) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      void subscribeBoardStream((event) => {
        if (cancelled) return;
        if (event.type === "order.updated") {
          applyIncomingOrder(event.order);
          return;
        }
        if (event.type === "mtd.updated") {
          applyIncomingMtd(event.record);
        }
      }, controller.signal)
        .catch(() => {
          /* reconnect below */
        })
        .then(() => {
          if (cancelled) return;
          retryTimer = window.setTimeout(connect, 1500);
        });
    };

    connect();

    return () => {
      cancelled = true;
      abortRef.current?.abort();
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [isBackendConnected, applyIncomingOrder, applyIncomingMtd]);

  // Keep producers.mixesThisWeek aligned with live MTD bookings for this week.
  // Local state updates immediately; DB is patched in the background (no reload).
  const persistedMixesThisWeekRef = useRef<Record<string, number>>({});
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
    if (!isBackendConnected || isViewOnly) return;

    const timer = window.setTimeout(() => {
      for (const producer of producers) {
        const apiId = resolveProducerApiId(producer);
        if (!apiId) continue;
        // Don't race availability/off-day saves: mixes patches bump updated_at
        // and used to 409 (then wipe) in-flight leave writes.
        if (
          pendingProducerSavesRef.current.has(producer.id) ||
          (producer.uuid &&
            pendingProducerSavesRef.current.has(producer.uuid)) ||
          pendingProducerSavesRef.current.has(apiId)
        ) {
          continue;
        }
        const count = producer.mixesThisWeek ?? 0;
        if (persistedMixesThisWeekRef.current[apiId] === count) continue;
        persistedMixesThisWeekRef.current[apiId] = count;
        void updateProducerApi(
          producer.id,
          { mixesThisWeek: count },
          apiId
        ).catch(() => {
          delete persistedMixesThisWeekRef.current[apiId];
        });
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [producers, isBackendConnected, isViewOnly]);

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
      const addon = await createPayrollAddonApi(payload);
      setPayrollAddons((prev) => [addon, ...prev]);
      return addon;
    },
    [isViewOnly]
  );

  const removePayrollAddon = useCallback(
    async (id: string): Promise<void> => {
      if (isViewOnly) throw new Error("View-only accounts cannot delete payroll items.");
      await deletePayrollAddonApi(id);
      setPayrollAddons((prev) => prev.filter((a) => a.id !== id));
    },
    [isViewOnly]
  );

  const addManualScheduleEntry = useCallback(
    async (payload: CreateManualSchedulePayload): Promise<Order> => {
      if (isViewOnly) throw new Error("View-only accounts cannot create manual schedule entries.");
      const created = await createManualScheduleEntryApi(payload);
      setActiveOrders((prev) => [created, ...prev]);
      return created;
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value: AppStateContextValue = {
    activeOrders,
    pastOrders,
    allOrders,
    mtdRecords,
    packagePrices,
    secretMenuPrices,
    producers,
    discountCodes,
    payrollAddons,
    personalReasons,
    emailTemplates,
    schedule,
    notifications,
    unreadCount,
    isBackendConnected,
    isLoading,
    isViewOnly,
    moveOrderToMTD,
    updateMTD,
    removeMTDRecord,
    updateOrder,
    setPackagePrices,
    setSecretMenuPrices,
    markComplete,
    addPastOrder,
    receiveOrder,
    addProducer,
    updateProducer,
    removeProducer,
    addDiscountCode,
    updateDiscountCode,
    removeDiscountCode,
    addPayrollAddon,
    removePayrollAddon,
    addManualScheduleEntry,
    addNotification,
    addPersonalReason,
    updatePersonalReason,
    removePersonalReason,
    updateEmailTemplate,
    resetEmailTemplate,
    markNotificationRead,
    markAllNotificationsRead,
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

function formatSlot(
  initials: string,
  producers: Producer[],
  schedule: ScheduleEntry[]
): string {
  const producer = producers.find((p) => p.initials === initials);
  const availableEntry = schedule.find(
    (s) => s.producer === initials && s.status === "available"
  );
  if (availableEntry) return availableEntry.day;
  return producer?.nextAvailable ?? "TBD";
}
