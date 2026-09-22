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
import { ApiClientError } from "@/lib/api/client";
import {
  fetchProducersApi,
  createProducerApi,
  resolveProducerApiId,
  updateProducerApi,
  deleteProducerApi,
  fetchOrdersApi,
  createOrderApi,
  updateOrderApi,
  fetchMTDRecordsApi,
  createMTDRecordApi,
  updateMTDRecordApi,
  fetchDiscountCodesApi,
  createDiscountCodeApi,
  updateDiscountCodeApi,
  deleteDiscountCodeApi,
  fetchPayrollAddonsApi,
  createPayrollAddonApi,
  deletePayrollAddonApi,
  type CreatePayrollAddonPayload,
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

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const seed = getData();

  // One-time migration: clear any stale localStorage keys that may contain
  // old mock/demo data, ensuring the backend API is always the data source.
  if (typeof window !== "undefined") {
    localStorage.removeItem("slt_persisted_active_orders");
    localStorage.removeItem("slt_persisted_past_orders");
    localStorage.removeItem("slt_persisted_mtd_records");
  }

  // Transactional data always starts empty — populated exclusively from the
  // backend API (Supabase). No fallback to local seed/mock data.
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [pastOrders, setPastOrders] = useState<Order[]>([]);
  const [mtdRecords, setMtdRecords] = useState<MTDRecord[]>([]);

  const [packagePrices, setPackagePricesState] = useState<Record<string, number>>(
    () => getDefaultPackagePrices()
  );
  const [secretMenuPrices, setSecretMenuPricesState] = useState<SecretMenuPricing>(
    () => getDefaultSecretMenuPricing()
  );

  // Notifications start empty — populated when backend data loads or user actions occur.
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [producers, setProducers] = useState<Producer[]>(() =>
    deduplicateProducers(seed.producers.map((p) => normalizeProducer(p)))
  );
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
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const schedule = seed.schedule;

  // Load data from FastAPI Backend on Mount
  useEffect(() => {
    let isMounted = true;

    async function loadBackendData() {
      try {
        const [producersData, ordersData, mtdData, codesData, addonsData] = await Promise.all([
          fetchProducersApi(),
          fetchOrdersApi(),
          fetchMTDRecordsApi(),
          fetchDiscountCodesApi(),
          fetchPayrollAddonsApi(),
        ]);

        if (!isMounted) return;

        if (producersData && producersData.length > 0) {
          const normalizedProducers = producersData.map((p) => normalizeProducer(p));
          setProducers(deduplicateProducers(normalizedProducers));
        }

        let loadedActiveOrders: Order[] = [];
        let loadedMtdRecords: MTDRecord[] = [];

        if (ordersData) {
          // Database is the single source of truth for orders.
          // Replace state entirely — no seed fallback.
          loadedActiveOrders = normalizeOrders(ordersData.activeOrders);
          setActiveOrders(loadedActiveOrders);
          setPastOrders(normalizeOrders(ordersData.pastOrders));
        }

        if (mtdData) {
          // Database is the single source of truth for MTD records.
          // Replace state entirely — no seed fallback.
          loadedMtdRecords = normalizeMTD(mtdData);
        }

        // Map active orders to MTDRecords for staging in Orders tab.
        // Orders with status !== "in_mtd" have inMTD: false (pre-MTD staging).
        // Orders with status === "in_mtd" have inMTD: true.
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

        setMtdRecords([...loadedMtdRecords, ...convertedOrders]);

        if (codesData) {
          // Database is the single source of truth for discount codes.
          // Replace state entirely — no seed fallback.
          const normalizedCodes = codesData.map((c) => normalizeDiscountCode(c));
          setDiscountCodes(normalizedCodes);
        }

        if (addonsData) {
          setPayrollAddons(addonsData);
        }

        setIsBackendConnected(true);
      } catch (err) {
        if (!isMounted) return;
        setIsBackendConnected(false);
        console.warn(
          "FastAPI backend unavailable or unreachable. Falling back to local state.",
          err
        );
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
        orderId: order.id,
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
      setActiveOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: "in_mtd" as const, mtdId: newRecord.id }
            : o
        )
      );

      // Persist to Backend API and write real DB UUID back into state
      // so that subsequent PATCH calls use the correct ID (avoids 404s).
      createMTDRecordApi(newRecord)
        .then((saved) => {
          if (saved.uuid && saved.uuid !== draftId) {
            setMtdRecords((prev) =>
              prev.map((r) =>
                r.id === draftId
                  ? { ...r, id: saved.id, uuid: saved.uuid, legacyId: saved.legacyId }
                  : r
              )
            );
          }
        })
        .catch((err) =>
          console.error("Failed to persist MTD Record to backend:", err)
        );
      updateOrderApi(orderId, { status: "in_mtd" }).catch((err) =>
        console.error("Failed to persist Order status to backend:", err)
      );

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
    [activeOrders, isInMTD, mtdRecords, producers, schedule, addNotification, packagePrices]
  );

  const setPackagePrices = useCallback((prices: Record<string, number>) => {
    if (isViewOnly) return;
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
  }, [isViewOnly]);

  const setSecretMenuPrices = useCallback((pricing: SecretMenuPricing) => {
    if (isViewOnly) return;
    setSecretMenuPricesState(pricing);
  }, [isViewOnly]);

  const updateMTD = useCallback((id: string, patch: Partial<MTDRecord>) => {
    if (isViewOnly) return;
    let payrollNotice: Omit<AppNotification, "id" | "read" | "createdAt"> | null =
      null;
    let apiId = id;
    let apiPatch = patch;

    setMtdRecords((prev) => {
      const existing = prev.find(
        (r) => r.id === id || r.orderId === id || r.uuid === id || r.legacyId === id
      );
      if (existing?.uuid) apiId = existing.uuid;

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

        const needsCs = updated.eightCountSheet.toUpperCase().includes("NEED");
        const needsSongs = updated.haveSongs.toUpperCase().includes("NEED");
        updated.needsAttention = needsCs || needsSongs;

        return updated;
      });
    });

    // Also sync pre-MTD edits to activeOrders if this ID belongs to an active order
    const linkedOrder = activeOrders.find(
      (o) => o.id === id || o.legacyId === id || o.uuid === id
    );
    if (linkedOrder) {
      const orderPatch: Record<string, any> = {};
      if (patch.assignedProducer !== undefined) orderPatch.assignedProducer = patch.assignedProducer;
      if (patch.mixStartDate !== undefined) orderPatch.mixStartDate = patch.mixStartDate;
      if (patch.mixEndDate !== undefined) orderPatch.mixEndDate = patch.mixEndDate;
      if (patch.price !== undefined) orderPatch.price = patch.price;
      if (patch.editorRequest !== undefined) orderPatch.editorRequest = patch.editorRequest;
      if (patch.inMTD === true) orderPatch.status = "in_mtd";
      if (patch.inMTD === false) orderPatch.status = "active";
      if (patch.isReassigned !== undefined) orderPatch.isReassigned = patch.isReassigned;
      if (patch.collectionStates !== undefined) orderPatch.collectionStates = patch.collectionStates;
      if ((patch as any).collection_states !== undefined) orderPatch.collection_states = (patch as any).collection_states;
      if (patch.haveSongs !== undefined) orderPatch.haveSongs = patch.haveSongs;
      if (patch.eightCountSheet !== undefined) orderPatch.eightCountSheet = patch.eightCountSheet;
      if ((patch as any).orderStatus !== undefined) orderPatch.orderStatus = (patch as any).orderStatus;
      if ((patch as any).order_status !== undefined) orderPatch.order_status = (patch as any).order_status;

      if (Object.keys(orderPatch).length > 0) {
        setActiveOrders((prev) =>
          prev.map((o) =>
            o.id === linkedOrder.id ? { ...o, ...orderPatch } : o
          )
        );
        updateOrderApi(linkedOrder.id, orderPatch).catch((err) =>
          console.error("Failed to sync order update to backend:", err)
        );
      }
    }

    // Persist MTD patch to backend API
    if (patch.inMTD === true) {
      const targetRecord = mtdRecords.find(
        (r) => r.id === id || r.orderId === id || r.uuid === id || r.legacyId === id
      );
      const updatedRecord = targetRecord ? { ...targetRecord, ...patch, inMTD: true } : { ...patch, inMTD: true };
      createMTDRecordApi(updatedRecord)
        .then((saved) => {
          setMtdRecords((prev) =>
            prev.map((r) =>
              r.id === id || r.orderId === id || r.uuid === id || r.legacyId === id
                ? { ...r, id: saved.id, uuid: saved.uuid, legacyId: saved.legacyId, inMTD: true }
                : r
            )
          );
        })
        .catch(() => {
          updateMTDRecordApi(apiId, apiPatch).catch((err) =>
            console.error("Failed to persist MTD Record update to backend:", err)
          );
        });
    } else {
      updateMTDRecordApi(apiId, apiPatch).catch((err) =>
        console.error("Failed to persist MTD Record update to backend:", err)
      );
    }

    if (payrollNotice) {
      addNotification(payrollNotice);
    }
  }, [activeOrders, addNotification, mtdRecords, packagePrices, producers, schedule]);

  const updateOrder = useCallback(
    (id: string, patch: Partial<Order>, seed?: Order) => {
      if (isViewOnly) return;
      const merge = (order: Order) => normalizeOrder({ ...order, ...patch, id });

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

      // Persist Order patch to backend API
      updateOrderApi(id, patch).catch((err) =>
        console.error("Failed to persist Order update to backend:", err)
      );
    },
    [isViewOnly]
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

      setActiveOrders((prev) => prev.filter((o) => o.id !== orderId));
      setPastOrders((prev) => [completed, ...prev]);

      // Persist completed status to backend API
      updateOrderApi(orderId, {
        status: "completed",
        completedAt: completed.completedAt,
      }).catch((err) =>
        console.error("Failed to persist Order completion to backend:", err)
      );
    },
    [activeOrders, isViewOnly, producers]
  );

  const addPastOrder = useCallback((order: Order) => {
    if (isViewOnly) return;
    setPastOrders((prev) => [order, ...prev]);
    updateOrderApi(order.id, { status: "completed", completedAt: order.completedAt }).catch((err) =>
      console.error("Failed to persist past order to backend:", err)
    );
  }, [isViewOnly]);

  const receiveOrder = useCallback(
    (order: Order) => {
      const incoming = normalizeOrder({
        ...order,
        status: order.status || "new",
      });
      setActiveOrders((prev) => {
        if (prev.some((o) => o.id === incoming.id)) return prev;
        return [incoming, ...prev];
      });

      // Persist new incoming order to backend API
      createOrderApi(incoming).catch((err) =>
        console.error("Failed to persist new order to backend:", err)
      );

      addNotification({
        type: "new_order",
        title: "New order received",
        message: `${incoming.programName} · ${
          incoming.contactName || incoming.customerName || "Customer"
        }`,
        href: "/mtd",
      });
    },
    [addNotification]
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
      if (
        err instanceof ApiClientError &&
        (err.status === 0 || err.status >= 500)
      ) {
        setIsBackendConnected(false);
        console.warn(
          "Backend unavailable; keeping local producer create.",
          err
        );
        return normalized;
      }
      setProducers((prev) => prev.filter((p) => p.id !== tempId));
      throw err;
    }
  }, [isViewOnly, isBackendConnected]);

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
      if (
        err instanceof ApiClientError &&
        (err.status === 0 || err.status >= 500)
      ) {
        setIsBackendConnected(false);
        console.warn(
          "Backend unavailable; keeping local producer update.",
          err
        );
        return next;
      }
      setProducers((prev) =>
        prev.map((p) => (p.id === id ? previous! : p))
      );
      throw err;
    }
  }, [isViewOnly, isBackendConnected]);

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
      if (
        err instanceof ApiClientError &&
        (err.status === 0 || err.status >= 500)
      ) {
        setIsBackendConnected(false);
        console.warn(
          "Backend unavailable; keeping local producer delete.",
          err
        );
        return;
      }
      setProducers((prev) => [removed!, ...prev]);
      throw err;
    }
  }, [isViewOnly, isBackendConnected]);

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

  useEffect(() => {
    setLocalItem("slt_studio_personal_reasons", personalReasons);
  }, [personalReasons]);

  const addHoliday = useCallback(
    (holiday: StudioHoliday) => {
      if (isViewOnly) return;
      const normalized = normalizeStudioHoliday(holiday);
      setHolidays((prev) => [normalized, ...prev]);
    },
    [isViewOnly]
  );

  const updateHoliday = useCallback(
    (id: string, patch: Partial<StudioHoliday>) => {
      if (isViewOnly) return;
      setHolidays((prev) =>
        prev.map((entry) =>
          entry.id === id
            ? normalizeStudioHoliday({ ...entry, ...patch, id })
            : entry
        )
      );
    },
    [isViewOnly]
  );

  const removeHoliday = useCallback(
    (id: string) => {
      if (isViewOnly) return;
      setHolidays((prev) => prev.filter((entry) => entry.id !== id));
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
      setPersonalReasons((prev) =>
        ensurePersonalReasonsList([normalized, ...prev])
      );
    },
    [isViewOnly]
  );

  const updatePersonalReason = useCallback(
    (id: string, patch: Partial<StudioPersonalReason>) => {
      if (isViewOnly) return;
      setPersonalReasons((prev) =>
        ensurePersonalReasonsList(
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
        )
      );
    },
    [isViewOnly]
  );

  const removePersonalReason = useCallback(
    (id: string) => {
      if (isViewOnly) return;
      setPersonalReasons((prev) =>
        ensurePersonalReasonsList(
          prev.filter((entry) => entry.id !== id || entry.isOther)
        )
      );
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
    addNotification,
    addHoliday,
    updateHoliday,
    removeHoliday,
    addPersonalReason,
    updatePersonalReason,
    removePersonalReason,
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
