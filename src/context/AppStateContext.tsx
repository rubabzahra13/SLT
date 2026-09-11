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
  Producer,
  ScheduleEntry,
} from "@/types";
import { getData } from "@/lib/data";
import { normalizeOrder } from "@/lib/order-form";
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
import { normalizeProducer } from "@/lib/producers";
import { normalizeDiscountCode } from "@/lib/discount-codes";
import { mergeLocalMtdRecordFields } from "@/lib/mtd-completion";
import { isOrderScheduledAndAssigned, isOutsourcedRecord } from "@/lib/mtd-filters";
import { inferMTDRecordStatus } from "@/lib/mtd-status";
import { toIsoDateString } from "@/lib/dates";
import {
  fetchProducersApi,
  createProducerApi,
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
  schedule: ScheduleEntry[];
  notifications: AppNotification[];
  unreadCount: number;
  isBackendConnected: boolean;
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
  addProducer: (producer: Producer) => void;
  updateProducer: (id: string, patch: Partial<Producer>) => void;
  removeProducer: (id: string) => void;
  addDiscountCode: (discountCode: DiscountCode) => void;
  updateDiscountCode: (id: string, patch: Partial<DiscountCode>) => void;
  removeDiscountCode: (id: string) => void;
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

    // Backfill the explicit MTD flag for records that already belong on the
    // board (assigned + scheduled, or outsourced). New assignments made from
    // the Orders tab at runtime do NOT set this, so they stay in Orders until
    // the user explicitly clicks "Move to MTD".
    if (
      normalized.inMTD === undefined &&
      (isOrderScheduledAndAssigned(normalized) || isOutsourcedRecord(normalized))
    ) {
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

  const [activeOrders, setActiveOrders] = useState<Order[]>(() => {
    const stored = getLocalItem<Order[] | null>("slt_persisted_active_orders", null);
    return stored
      ? normalizeOrders(stored)
      : normalizeOrders(seed.orders.filter((o) => o.status !== "completed"));
  });
  const [pastOrders, setPastOrders] = useState<Order[]>(() => {
    const stored = getLocalItem<Order[] | null>("slt_persisted_past_orders", null);
    return stored ? normalizeOrders(stored) : normalizeOrders(seed.pastOrders ?? []);
  });
  const [mtdRecords, setMtdRecords] = useState<MTDRecord[]>(() => {
    const stored = getLocalItem<MTDRecord[] | null>("slt_persisted_mtd_records", null);
    return stored ? normalizeMTD(stored) : normalizeMTD(seed.mtdRecords);
  });
  const [packagePrices, setPackagePricesState] = useState<Record<string, number>>(
    () => getDefaultPackagePrices()
  );
  const [secretMenuPrices, setSecretMenuPricesState] = useState<SecretMenuPricing>(
    () => getDefaultSecretMenuPricing()
  );
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const newOrders = seed.orders
      .filter((o) => o.status === "new")
      .slice(0, 8);
    return [...newOrders].reverse().map((order, index) => ({
      id: `notif-seed-${order.id}-${index}`,
      type: "new_order" as const,
      title: "New order received",
      message: `${order.programName} · ${
        order.contactName || order.customerName || "Customer"
      }`,
      href: "/mtd",
      read: false,
      createdAt: order.createdAt || new Date().toISOString(),
    }));
  });
  const [producers, setProducers] = useState<Producer[]>(() =>
    seed.producers.map((p) => normalizeProducer(p))
  );
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>(() =>
    (seed.discountCodes ?? []).map((entry) => normalizeDiscountCode(entry))
  );
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  const schedule = seed.schedule;

  // Load data from FastAPI Backend on Mount
  useEffect(() => {
    let isMounted = true;

    async function loadBackendData() {
      try {
        const [producersData, ordersData, mtdData, codesData] = await Promise.all([
          fetchProducersApi(),
          fetchOrdersApi(),
          fetchMTDRecordsApi(),
          fetchDiscountCodesApi(),
        ]);

        if (!isMounted) return;

        if (producersData && producersData.length > 0) {
          const normalizedProducers = producersData.map((p) => normalizeProducer(p));
          const backendIds = new Set(normalizedProducers.map((p) => p.id));
          const seedProducers = seed.producers.map((p) => normalizeProducer(p));
          const missingSeed = seedProducers.filter((p) => !backendIds.has(p.id));
          setProducers([...normalizedProducers, ...missingSeed]);
        }

        if (ordersData) {
          const backendActive = normalizeOrders(ordersData.activeOrders);
          const backendPast = normalizeOrders(ordersData.pastOrders);
          const backendOrderIds = new Set([
            ...backendActive.map((o) => o.id),
            ...backendPast.map((o) => o.id),
          ]);
          const seedActive = normalizeOrders(
            seed.orders.filter((o) => o.status !== "completed")
          );
          const seedPast = normalizeOrders(seed.pastOrders ?? []);
          const missingSeedActive = seedActive.filter((o) => !backendOrderIds.has(o.id));
          const missingSeedPast = seedPast.filter((o) => !backendOrderIds.has(o.id));

          setActiveOrders([...backendActive, ...missingSeedActive]);
          setPastOrders([...backendPast, ...missingSeedPast]);
        }

        if (mtdData) {
          setMtdRecords((prev) => {
            const localById = new Map(prev.map((r) => [r.id, r]));
            const normalizedMtd = normalizeMTD(mtdData).map((r) =>
              mergeLocalMtdRecordFields(r, localById.get(r.id))
            );
            const backendMtdIds = new Set(normalizedMtd.map((r) => r.id));
            const seedMtd = normalizeMTD(seed.mtdRecords);
            const missingSeedMtd = seedMtd
              .filter((r) => !backendMtdIds.has(r.id))
              .map((r) => mergeLocalMtdRecordFields(r, localById.get(r.id)));

            return [...normalizedMtd, ...missingSeedMtd];
          });
        }

        if (codesData && codesData.length > 0) {
          const normalizedCodes = codesData.map((c) => normalizeDiscountCode(c));
          const backendCodeIds = new Set(normalizedCodes.map((c) => c.id));
          const seedCodes = (seed.discountCodes ?? []).map((entry) =>
            normalizeDiscountCode(entry)
          );
          const missingSeedCodes = seedCodes.filter((c) => !backendCodeIds.has(c.id));
          setDiscountCodes([...normalizedCodes, ...missingSeedCodes]);
        }

        setIsBackendConnected(true);
      } catch (err) {
        if (!isMounted) return;
        setIsBackendConnected(false);
        console.warn(
          "FastAPI backend unavailable or unreachable. Falling back to local state.",
          err
        );
      }
    }

    loadBackendData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setLocalItem("slt_persisted_active_orders", activeOrders);
  }, [activeOrders]);

  useEffect(() => {
    setLocalItem("slt_persisted_past_orders", pastOrders);
  }, [pastOrders]);

  useEffect(() => {
    setLocalItem("slt_persisted_mtd_records", mtdRecords);
  }, [mtdRecords]);

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
      const draftRecord: MTDRecord = {
        id: draftId,
        orderId: order.id,
        section:
          order.category === "Dance" ? "DANCE MUSIC" : "CHEERLEADING MUSIC",
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
        mixStartDate: "",
        eightCountSheet: "NEED CS",
        haveSongs: "NEED SONGS",
        needsAttention: true,
        status: "needs_attention",
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

      // Persist to Backend API
      createMTDRecordApi(newRecord).catch((err) =>
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
      const existing = prev.find((r) => r.id === id);
      if (existing?.uuid) apiId = existing.uuid;

      return prev.map((r) => {
        if (r.id !== id) return r;

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

          if (
            resolved &&
            !toIsoDateString(updated.mixStartDate) &&
            patch.mixStartDate === undefined
          ) {
            const mixStartDate = suggestMixStartDate(
              resolved,
              producers,
              schedule
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

    // Persist MTD patch to backend API
    updateMTDRecordApi(apiId, apiPatch).catch((err) =>
      console.error("Failed to persist MTD Record update to backend:", err)
    );

    if (payrollNotice) {
      addNotification(payrollNotice);
    }
  }, [addNotification, packagePrices, producers, schedule]);

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

  const addProducer = useCallback((producer: Producer) => {
    if (isViewOnly) return;
    const normalized = normalizeProducer(producer);
    setProducers((prev) => [normalized, ...prev]);
    createProducerApi(normalized).catch((err) =>
      console.error("Failed to persist new producer to backend:", err)
    );
  }, [isViewOnly]);

  const updateProducer = useCallback((id: string, patch: Partial<Producer>) => {
    if (isViewOnly) return;
    setProducers((prev) =>
      prev.map((p) =>
        p.id === id ? normalizeProducer({ ...p, ...patch, id }) : p
      )
    );
    updateProducerApi(id, patch).catch((err) =>
      console.error("Failed to persist producer update to backend:", err)
    );
  }, [isViewOnly]);

  const removeProducer = useCallback((id: string) => {
    if (isViewOnly) return;
    setProducers((prev) => prev.filter((p) => p.id !== id));
    deleteProducerApi(id).catch((err) =>
      console.error("Failed to delete producer from backend:", err)
    );
  }, [isViewOnly]);

  const addDiscountCode = useCallback((discountCode: DiscountCode) => {
    if (isViewOnly) return;
    const normalized = normalizeDiscountCode(discountCode);
    setDiscountCodes((prev) => [normalized, ...prev]);
    createDiscountCodeApi(normalized).catch((err) =>
      console.error("Failed to persist new discount code to backend:", err)
    );
  }, [isViewOnly]);

  const updateDiscountCode = useCallback(
    (id: string, patch: Partial<DiscountCode>) => {
      if (isViewOnly) return;
      setDiscountCodes((prev) =>
        prev.map((entry) =>
          entry.id === id
            ? normalizeDiscountCode({ ...entry, ...patch, id })
            : entry
        )
      );
      updateDiscountCodeApi(id, patch).catch((err) =>
        console.error("Failed to persist discount code update to backend:", err)
      );
    },
    [isViewOnly]
  );

  const removeDiscountCode = useCallback((id: string) => {
    if (isViewOnly) return;
    setDiscountCodes((prev) => prev.filter((entry) => entry.id !== id));
    deleteDiscountCodeApi(id).catch((err) =>
      console.error("Failed to delete discount code from backend:", err)
    );
  }, [isViewOnly]);

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
    schedule,
    notifications,
    unreadCount,
    isBackendConnected,
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
