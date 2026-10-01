"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
import type { StudioHoliday, StudioPersonalReason } from "@/lib/producer-time-off";
import {
  createDefaultPersonalReasons,
  createDefaultStudioHolidays,
  ensurePersonalReasonsList,
  normalizeStudioHoliday,
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
  resolveAssignedProducerForPatch,
  resolveValidProducerAssignment,
} from "@/lib/editor-assignment";
import { suggestMixEndDate, suggestMixStartDate } from "@/lib/scheduling";
import { normalizeProducer, deduplicateProducers } from "@/lib/producers";
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
  createOrderApi,
  updateOrderApi,
  createMTDRecordApi,
  updateMTDRecordApi,
  createDiscountCodeApi,
  updateDiscountCodeApi,
  deleteDiscountCodeApi,
  createPayrollAddonApi,
  deletePayrollAddonApi,
  type CreatePayrollAddonPayload,
  createManualScheduleEntryApi,
  type CreateManualSchedulePayload,
  createStudioHolidayApi,
  updateStudioHolidayApi,
  deleteStudioHolidayApi,
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
  fetchStudioHolidaysApi,
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
  holidays: StudioHoliday[];
  personalReasons: StudioPersonalReason[];
  emailTemplates: EmailTemplatesState;
  schedule: ScheduleEntry[];
  notifications: AppNotification[];
  unreadCount: number;
  isBackendConnected: boolean;
  isLoading: boolean;
  isViewOnly: boolean;
  moveOrderToMTD: (orderId: string) => MTDRecord | null;
  updateMTD: (id: string, patch: Partial<MTDRecord>) => void;
  updateOrder: (id: string, patch: Partial<Order>, seed?: Order) => void;
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
  addHoliday: (holiday: StudioHoliday) => void;
  updateHoliday: (id: string, patch: Partial<StudioHoliday>) => void;
  removeHoliday: (id: string) => void;
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
// source of truth: hard refresh does NOT clear localStorage, so a long-lived
// cache makes deleted DB rows look "still there" (exactly the Instagram/Google
// problem if you cache mutable lists forever).
//
// Rules (how large apps avoid this):
// 1) Version the key — bump to invalidate everyone's old blobs after schema/data resets
// 2) TTL — after max age, ignore the cache and wait for the network
// 3) Only rewrite cache after a successful backend sync
const CACHE_VERSION = "v2";
const CACHE_ORDERS_KEY = `slt_cache_orders_${CACHE_VERSION}`;
const CACHE_MTD_KEY = `slt_cache_mtd_${CACHE_VERSION}`;
const CACHE_PRODUCERS_KEY = `slt_cache_producers_${CACHE_VERSION}`;
/** Ignore cached lists older than this — force a live fetch. */
const CACHE_MAX_AGE_MS = 30_000;

type TimedCache<T> = { savedAt: number; data: T };

function readTimedCache<T>(key: string): T | null {
  const wrapped = getLocalItem<TimedCache<T> | T | null>(key, null);
  if (!wrapped) return null;
  // Legacy unwrapped shape from older builds — treat as expired.
  if (typeof wrapped === "object" && wrapped !== null && "savedAt" in wrapped && "data" in wrapped) {
    const { savedAt, data } = wrapped as TimedCache<T>;
    if (typeof savedAt !== "number" || Date.now() - savedAt > CACHE_MAX_AGE_MS) {
      return null;
    }
    return data;
  }
  return null;
}

function writeTimedCache<T>(key: string, data: T): void {
  setLocalItem<TimedCache<T>>(key, { savedAt: Date.now(), data });
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const seed = getData();

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

  // Hydrate only from a fresh (TTL) cache; otherwise start empty and load live.
  const cachedOrders = readTimedCache<{ active: Order[]; past: Order[] }>(
    CACHE_ORDERS_KEY
  );
  const cachedMtd = readTimedCache<MTDRecord[]>(CACHE_MTD_KEY);
  const hasCachedData = Boolean(cachedOrders && cachedMtd);

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
    const cachedProducers = readTimedCache<Producer[]>(CACHE_PRODUCERS_KEY);
    if (cachedProducers && cachedProducers.length > 0) {
      return deduplicateProducers(cachedProducers.map((p) => normalizeProducer(p)));
    }
    return deduplicateProducers(seed.producers.map((p) => normalizeProducer(p)));
  });
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [payrollAddons, setPayrollAddons] = useState<PayrollAddon[]>([]);
  const [holidays, setHolidays] = useState<StudioHoliday[]>(() => {
    const stored = getLocalItem<StudioHoliday[] | null>("slt_studio_holidays", null);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      return stored.map((entry) => normalizeStudioHoliday(entry));
    }
    return createDefaultStudioHolidays();
  });
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
  // If we hydrated from a fresh cache, don't block the UI; otherwise wait on API.
  const [isLoading, setIsLoading] = useState<boolean>(!hasCachedData);

  const schedule = seed.schedule;

  // Load data from FastAPI Backend on Mount — prefer one bootstrap request.
  useEffect(() => {
    let isMounted = true;
    let loadGen = 0;

    function applyBoot(boot: BootstrapPayload) {
      if (boot.producers.length > 0) {
        setProducers(boot.producers);
        writeTimedCache(CACHE_PRODUCERS_KEY, boot.producers);
      }

      const loadedActiveOrders = normalizeOrders(boot.activeOrders);
      const loadedPastOrders = normalizeOrders(boot.pastOrders);
      setActiveOrders(loadedActiveOrders);
      setPastOrders(loadedPastOrders);
      writeTimedCache(CACHE_ORDERS_KEY, {
        active: loadedActiveOrders,
        past: loadedPastOrders,
      });

      const loadedMtdRecords = normalizeMTD(boot.mtdRecords);
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
      setMtdRecords(combinedMtd);
      writeTimedCache(CACHE_MTD_KEY, combinedMtd);

      setDiscountCodes(boot.discountCodes);
      setPayrollAddons(boot.payrollAddons);

      if (boot.holidays.length > 0) {
        setHolidays(boot.holidays.map((entry) => normalizeStudioHoliday(entry)));
      }
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
        holidays,
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
        fetchStudioHolidaysApi().catch(() => [] as StudioHoliday[]),
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
        holidays,
        personalReasons,
        emailTemplates,
        packagePrices,
        secretMenuPricing,
      };
    }

    async function loadBackendData() {
      const gen = ++loadGen;
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
        applyBoot(boot);
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
          fetchBootstrapApi()
            .catch(() => fetchLegacyBootstrap())
            .then((boot) => {
              if (!isMounted) return;
              applyBoot(boot);
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

  // NOTE: Orders and MTD records are intentionally NOT persisted to localStorage.
  // The backend API (Supabase) is the sole persistent store. On each page load
  // the app fetches fresh data from the database.

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

  const updateMTD = useCallback((id: string, patch: Partial<MTDRecord>) => {
    if (isViewOnly) return;
    let payrollNotice: Omit<AppNotification, "id" | "read" | "createdAt"> | null =
      null;
    let apiPatch = patch;

    const existing = mtdRecords.find(
      (r) => r.id === id || r.orderId === id || r.uuid === id || r.legacyId === id
    );
    const apiId = existing?.uuid || existing?.id || id;

    setMtdRecords((prev) => {
      return prev.map((r) => {
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
            updated.mixStartDate = "";
            apiPatch = { ...apiPatch, mixStartDate: "" };
          }
          if (patch.mixEndDate === undefined) {
            updated.mixEndDate = undefined;
            apiPatch = { ...apiPatch, mixEndDate: undefined };
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
    void (async () => {
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
            ? { ...targetRecord, ...apiPatch, inMTD: true }
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
                      id: saved.id,
                      uuid: saved.uuid,
                      legacyId: saved.legacyId,
                      inMTD: true,
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
          }
        }
      } catch (err) {
        setActiveOrders(prevActive);
        setMtdRecords(prevMtd);
        notifySaveError("Could not save MTD changes", err);
      }
    })();

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

  const updateOrder = useCallback(
    (id: string, patch: Partial<Order>, seed?: Order) => {
      if (isViewOnly) return;
      const merge = (order: Order) => normalizeOrder({ ...order, ...patch, id });
      const prevActive = activeOrders;
      const prevPast = pastOrders;
      const prevMtd = mtdRecords;

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

      void (async () => {
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
        }
      })();
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
    setProducers((prev) => [normalized, ...prev]);
    if (!isBackendConnected) {
      return normalized;
    }
    try {
      const saved = await createProducerApi(normalized);
      setProducers((prev) =>
        prev.map((p) => (p.id === tempId ? saved : p))
      );
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
    }
  }, [isViewOnly, isBackendConnected, notifySaveError]);

  const updateProducer = useCallback(async (id: string, patch: Partial<Producer>) => {
    if (isViewOnly) {
      throw new Error("View-only accounts cannot edit producers.");
    }
    let previous: Producer | undefined;
    let next: Producer | undefined;
    setProducers((prev) => {
      previous = prev.find((p) => p.id === id);
      if (!previous) return prev;
      next = normalizeProducer({ ...previous, ...patch, id });
      return prev.map((p) => (p.id === id ? next! : p));
    });
    if (!previous || !next) {
      throw new Error("Producer not found.");
    }
    if (!isBackendConnected) {
      return next;
    }
    try {
      const saved = await updateProducerApi(
        id,
        patch,
        resolveProducerApiId(previous)
      );
      setProducers((prev) => prev.map((p) => (p.id === id ? saved : p)));
      return saved;
    } catch (err) {
      setProducers((prev) =>
        prev.map((p) => (p.id === id ? previous! : p))
      );
      if (
        err instanceof ApiClientError &&
        (err.status === 0 || err.status >= 500)
      ) {
        setIsBackendConnected(false);
      }
      notifySaveError("Could not save producer", err);
      throw err;
    }
  }, [isViewOnly, isBackendConnected, notifySaveError]);

  const removeProducer = useCallback(async (id: string) => {
    if (isViewOnly) {
      throw new Error("View-only accounts cannot remove producers.");
    }
    let removed: Producer | undefined;
    setProducers((prev) => {
      removed = prev.find((p) => p.id === id);
      return prev.filter((p) => p.id !== id);
    });
    if (!removed) {
      throw new Error("Producer not found.");
    }
    if (!isBackendConnected) {
      return;
    }
    try {
      await deleteProducerApi(id, resolveProducerApiId(removed));
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
  }, [isViewOnly, isBackendConnected, notifySaveError]);

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

  useEffect(() => {
    setLocalItem("slt_studio_holidays", holidays);
  }, [holidays]);

  // Keep the stale-while-revalidate cache in sync after edits (Move to Orders/MTD,
  // inline changes, etc.). Only write once the backend has loaded so we never
  // clobber a good cache with the empty initial state on a cold start.
  useEffect(() => {
    if (!isBackendConnected) return;
    writeTimedCache(CACHE_ORDERS_KEY, { active: activeOrders, past: pastOrders });
  }, [activeOrders, pastOrders, isBackendConnected]);

  useEffect(() => {
    if (!isBackendConnected) return;
    writeTimedCache(CACHE_MTD_KEY, mtdRecords);
  }, [mtdRecords, isBackendConnected]);

  useEffect(() => {
    setLocalItem(EMAIL_TEMPLATES_STORAGE_KEY, emailTemplates);
  }, [emailTemplates]);

  useEffect(() => {
    setLocalItem("slt_studio_personal_reasons", personalReasons);
  }, [personalReasons]);

  const addHoliday = useCallback(
    (holiday: StudioHoliday) => {
      if (isViewOnly) return;
      const normalized = normalizeStudioHoliday(holiday);
      const tempId = normalized.id;
      setHolidays((prev) => [normalized, ...prev]);
      void createStudioHolidayApi(normalized)
        .then((saved) => {
          setHolidays((prev) =>
            prev.map((entry) => (entry.id === tempId ? saved : entry))
          );
        })
        .catch((err) => {
          setHolidays((prev) => prev.filter((entry) => entry.id !== tempId));
          notifySaveError("Could not save holiday", err);
        });
    },
    [isViewOnly]
  );

  const updateHoliday = useCallback(
    (id: string, patch: Partial<StudioHoliday>) => {
      if (isViewOnly) return;
      let previous: StudioHoliday | undefined;
      setHolidays((prev) => {
        previous = prev.find((entry) => entry.id === id);
        return prev.map((entry) =>
          entry.id === id
            ? normalizeStudioHoliday({ ...entry, ...patch, id })
            : entry
        );
      });
      if (!previous) return;
      void updateStudioHolidayApi(id, patch)
        .then((saved) => {
          setHolidays((prev) =>
            prev.map((entry) => (entry.id === id ? saved : entry))
          );
        })
        .catch((err) => {
          setHolidays((prev) =>
            prev.map((entry) => (entry.id === id ? previous! : entry))
          );
          notifySaveError("Could not update holiday", err);
        });
    },
    [isViewOnly]
  );

  const removeHoliday = useCallback(
    (id: string) => {
      if (isViewOnly) return;
      let removed: StudioHoliday | undefined;
      setHolidays((prev) => {
        removed = prev.find((entry) => entry.id === id);
        return prev.filter((entry) => entry.id !== id);
      });
      if (!removed) return;
      void deleteStudioHolidayApi(id).catch((err) => {
        setHolidays((prev) => [removed!, ...prev]);
        notifySaveError("Could not delete holiday", err);
      });
    },
    [isViewOnly]
  );

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
      let nextCopy: EmailTemplateCopy | undefined;
      setEmailTemplates((prev) => {
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
      void upsertEmailTemplateApi(id, nextCopy).catch((err) => {
        notifySaveError("Could not save email template", err);
      });
    },
    [isViewOnly]
  );

  const resetEmailTemplate = useCallback(
    (id: EmailTemplateId) => {
      if (isViewOnly) return;
      const nextCopy = DEFAULT_EMAIL_TEMPLATES[id];
      setEmailTemplates((prev) =>
        normalizeEmailTemplates({
          ...prev,
          [id]: nextCopy,
        })
      );
      void upsertEmailTemplateApi(id, nextCopy).catch((err) => {
        notifySaveError("Could not reset email template", err);
      });
    },
    [isViewOnly]
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
    holidays,
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
    addHoliday,
    updateHoliday,
    removeHoliday,
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
