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
  MTDRecord,
  Order,
  Producer,
  ScheduleEntry,
} from "@/types";
import { getData } from "@/lib/data";
import { normalizeOrder } from "@/lib/order-form";
import {
  detectCompliance,
  getPriceForPackage,
} from "@/lib/pricing";
import { suggestMixStartDate } from "@/lib/scheduling";

type AppStateContextValue = {
  activeOrders: Order[];
  pastOrders: Order[];
  allOrders: Order[];
  mtdRecords: MTDRecord[];
  producers: Producer[];
  schedule: ScheduleEntry[];
  notifications: AppNotification[];
  unreadCount: number;
  moveOrderToMTD: (orderId: string) => MTDRecord | null;
  updateMTD: (id: string, patch: Partial<MTDRecord>) => void;
  markComplete: (orderId: string) => void;
  addPastOrder: (order: Order) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  isInMTD: (orderId: string) => boolean;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

function normalizeOrders(orders: Order[]): Order[] {
  return orders.map((o) => normalizeOrder(o));
}

function normalizeMTD(records: MTDRecord[]): MTDRecord[] {
  return records.map((r) => ({
    ...r,
    editorRequest: r.editorRequest || "FA",
    contactName: r.contactName || r.editorInitials,
    priceCompliance: r.priceCompliance || detectCompliance(r.musicTheme),
  }));
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
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [initialized, setInitialized] = useState(false);

  const producers = seed.producers;
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

  useEffect(() => {
    if (initialized) return;
    const newOrders = activeOrders.filter((o) => o.status === "new");
    if (newOrders.length > 0) {
      addNotification({
        type: "new_order",
        title: `${newOrders.length} new order${newOrders.length > 1 ? "s" : ""}`,
        message: `${newOrders[0].programName} and others awaiting review.`,
        href: "/orders?tab=active",
      });
    }
    setInitialized(true);
  }, [initialized, activeOrders, addNotification]);

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
        order.price || getPriceForPackage(order.package, compliance, order.price);

      const producerInitials =
        order.editorRequest !== "FA" && order.editorRequest !== "NA"
          ? order.editorRequest
          : order.requestedProducer !== "First Available"
            ? order.requestedProducer
            : null;

      const assignedProducer = producerInitials;
      const mixStartDate = assignedProducer
        ? suggestMixStartDate(assignedProducer, producers, schedule)
        : "";

      const newRecord: MTDRecord = {
        id: `mtd-${Date.now()}`,
        orderId: order.id,
        section: order.category === "Dance" ? "DANCE MUSIC" : "CHEERLEADING MUSIC",
        assignedProducer,
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
        mixStartDate,
        eightCountSheet: "NEED CS",
        haveSongs: "NEED SONGS",
        needsAttention: true,
        status: "needs_attention",
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

      addNotification({
        type: "mtd_move",
        title: "Moved to MTD",
        message: `${order.programName} is now in Music To Do.${slotMsg}`,
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
    [activeOrders, isInMTD, producers, schedule, addNotification]
  );

  const updateMTD = useCallback((id: string, patch: Partial<MTDRecord>) => {
    setMtdRecords((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...patch };

        if (patch.editorRequest === "NA") {
          updated.assignedProducer = null;
          if (patch.bookedUntil === undefined) {
            updated.bookedUntil = null;
          }
        } else if (patch.assignedProducer !== undefined) {
          updated.assignedProducer = patch.assignedProducer;
          if (patch.assignedProducer) {
            const mixDate = suggestMixStartDate(
              patch.assignedProducer,
              producers,
              schedule
            );
            if (mixDate && patch.mixStartDate === undefined) {
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
          if (mixDate && patch.mixStartDate === undefined) {
            updated.mixStartDate = mixDate;
          }
        }

        if (patch.package || patch.priceCompliance || patch.musicTheme) {
          const compliance =
            patch.priceCompliance ||
            detectCompliance(patch.musicTheme ?? r.musicTheme);
          updated.priceCompliance = compliance;
          updated.price = getPriceForPackage(
            patch.package ?? r.package,
            compliance,
            r.price
          );
        }

        const needsCs = updated.eightCountSheet.toUpperCase().includes("NEED");
        const needsSongs = updated.haveSongs.toUpperCase().includes("NEED");
        updated.needsAttention = needsCs || needsSongs;

        return updated;
      })
    );
  }, [producers, schedule]);

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
    producers,
    schedule,
    notifications,
    unreadCount,
    moveOrderToMTD,
    updateMTD,
    markComplete,
    addPastOrder,
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
  const open = schedule.find(
    (s) => s.producer === initials && s.status === "available"
  );
  if (open) return open.day;
  return producer?.nextAvailable ?? "TBD";
}
