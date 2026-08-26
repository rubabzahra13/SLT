"use client";

import {
  createContext,
  useCallback,
  useContext,
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
} from "@/lib/editor-assignment";
import { suggestMixStartDate, suggestMixEndDate } from "@/lib/scheduling";
import { normalizeProducer } from "@/lib/producers";
import { normalizeDiscountCode } from "@/lib/discount-codes";
import { inferMTDRecordStatus } from "@/lib/mtd-status";
import { toIsoDateString } from "@/lib/dates";

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

    return {
      ...r,
      editorRequest: r.editorRequest || "FA",
      contactName: r.contactName || r.editorInitials,
      priceCompliance: r.priceCompliance || detectCompliance(r.musicTheme),
      mixStartDate,
      recordStatus: inferMTDRecordStatus(r),
      inPayroll: Boolean(r.inPayroll),
      ...(mixEnd ? { mixEndDate: mixEnd } : {}),
    };
  });
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const seed = getData();

  const [activeOrders, setActiveOrders] = useState<Order[]>(() =>
    normalizeOrders(seed.orders.filter((o) => o.status !== "completed"))
  );
  const [pastOrders, setPastOrders] = useState<Order[]>(() =>
    normalizeOrders(seed.pastOrders ?? [])
  );
  const [mtdRecords, setMtdRecords] = useState<MTDRecord[]>(() =>
    normalizeMTD(seed.mtdRecords)
  );
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
    // Seed unread "order received" items for the bell without toasting on refresh.
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

  const schedule = seed.schedule;

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

  const moveOrderToMTD = useCallback(
    (orderId: string): MTDRecord | null => {
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
      const mixStartDate = assignedProducer
        ? suggestMixStartDate(assignedProducer, producers, schedule)
        : "";

      const newRecord: MTDRecord = {
        ...draftRecord,
        assignedProducer,
        editorRequest,
        mixStartDate,
      };

      setMtdRecords((prev) => [newRecord, ...prev]);
      setActiveOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: "in_mtd" as const, mtdId: newRecord.id }
            : o
        )
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

      if (assignedProducer && mixStartDate) {
        addNotification({
          type: "schedule",
          title: "Mix slot identified",
          message: `${assignedProducer} · ${order.programName} · start ${mixStartDate}`,
          href: "/schedule",
        });
      }

      return newRecord;
    },
    [activeOrders, isInMTD, mtdRecords, producers, schedule, addNotification, packagePrices]
  );

  const setPackagePrices = useCallback((prices: Record<string, number>) => {
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
  }, []);

  const setSecretMenuPrices = useCallback((pricing: SecretMenuPricing) => {
    setSecretMenuPricesState(pricing);
  }, []);

  const updateMTD = useCallback((id: string, patch: Partial<MTDRecord>) => {
    setMtdRecords((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...patch };

        if (patch.editorRequest === "NA" || patch.assignedProducer === null) {
          updated.assignedProducer = null;
        } else if (patch.assignedProducer !== undefined) {
          updated.assignedProducer = patch.assignedProducer;
          if (patch.assignedProducer) {
            const mixDate = suggestMixStartDate(
              patch.assignedProducer,
              producers,
              schedule
            );
            if (mixDate && patch.mixStartDate === undefined && !updated.mixStartDate) {
              updated.mixStartDate = mixDate;
            }
          }
        } else if (
          patch.editorRequest &&
          patch.editorRequest !== "FA" &&
          patch.editorRequest !== "NA"
        ) {
          updated.assignedProducer = patch.editorRequest;
          const mixDate = suggestMixStartDate(
            patch.editorRequest,
            producers,
            schedule
          );
          if (mixDate && patch.mixStartDate === undefined && !updated.mixStartDate) {
            updated.mixStartDate = mixDate;
          }
        }

        const startIso = toIsoDateString(updated.mixStartDate);
        const endIso = toIsoDateString(updated.mixEndDate ?? "");
        if (
          patch.mixStartDate !== undefined &&
          patch.assignedProducer === undefined &&
          startIso &&
          !endIso &&
          patch.mixEndDate === undefined
        ) {
          updated.mixEndDate = suggestMixEndDate(startIso, updated.package);
        }

        if (startIso && endIso && endIso < startIso) {
          updated.mixEndDate = suggestMixEndDate(startIso, updated.package);
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
      })
    );
  }, [producers, schedule, packagePrices]);

  const updateOrder = useCallback(
    (id: string, patch: Partial<Order>, seed?: Order) => {
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
    },
    []
  );

  const markComplete = useCallback(
    (orderId: string) => {
      const order = activeOrders.find((o) => o.id === orderId);
      if (!order) return;

      const completed: Order = {
        ...order,
        status: "completed",
        completedAt: new Date().toISOString().slice(0, 10),
        assignedProducer:
          order.assignedProducer ||
          (order.editorRequest !== "FA" && order.editorRequest !== "NA"
            ? order.editorRequest
            : "CASEY"),
      };

      setActiveOrders((prev) => prev.filter((o) => o.id !== orderId));
      setPastOrders((prev) => [completed, ...prev]);
    },
    [activeOrders]
  );

  const addPastOrder = useCallback((order: Order) => {
    setPastOrders((prev) => [order, ...prev]);
  }, []);

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
    setProducers((prev) => [normalizeProducer(producer), ...prev]);
  }, []);

  const updateProducer = useCallback((id: string, patch: Partial<Producer>) => {
    setProducers((prev) =>
      prev.map((p) =>
        p.id === id ? normalizeProducer({ ...p, ...patch, id }) : p
      )
    );
  }, []);

  const removeProducer = useCallback((id: string) => {
    setProducers((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addDiscountCode = useCallback((discountCode: DiscountCode) => {
    setDiscountCodes((prev) => [
      normalizeDiscountCode(discountCode),
      ...prev,
    ]);
  }, []);

  const updateDiscountCode = useCallback(
    (id: string, patch: Partial<DiscountCode>) => {
      setDiscountCodes((prev) =>
        prev.map((entry) =>
          entry.id === id
            ? normalizeDiscountCode({ ...entry, ...patch, id })
            : entry
        )
      );
    },
    []
  );

  const removeDiscountCode = useCallback((id: string) => {
    setDiscountCodes((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

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
