"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { fetchOrderApi } from "@/lib/api/orders";
import type { Order } from "@/types";

type OrdersLookupValue = {
  orders: Order[];
  orderById: Map<string, Order>;
  /** Resolve from page cache, else GET /api/orders/{id}. */
  resolveOrder: (id: string | null | undefined) => Promise<Order | null>;
  upsertOrder: (order: Order) => void;
};

const OrdersLookupContext = createContext<OrdersLookupValue | null>(null);

function buildMap(orders: Order[]): Map<string, Order> {
  const map = new Map<string, Order>();
  for (const order of orders) {
    map.set(order.id, order);
    if (order.legacyId) map.set(order.legacyId, order);
    if (order.uuid) map.set(order.uuid, order);
  }
  return map;
}

export function OrdersLookupProvider({
  orders,
  children,
}: {
  orders: Order[];
  children: ReactNode;
}) {
  const [extra, setExtra] = useState<Order[]>([]);
  const inflight = useRef(new Map<string, Promise<Order | null>>());

  const merged = useMemo(() => {
    if (extra.length === 0) return orders;
    const seen = new Set(orders.map((o) => o.id));
    return [...orders, ...extra.filter((o) => !seen.has(o.id))];
  }, [orders, extra]);

  const orderById = useMemo(() => buildMap(merged), [merged]);

  const upsertOrder = useCallback((order: Order) => {
    setExtra((prev) => {
      const without = prev.filter((o) => o.id !== order.id);
      return [...without, order];
    });
  }, []);

  const resolveOrder = useCallback(
    async (id: string | null | undefined): Promise<Order | null> => {
      if (!id) return null;
      const hit = orderById.get(id);
      if (hit) return hit;
      const existing = inflight.current.get(id);
      if (existing) return existing;
      const req = fetchOrderApi(id)
        .then((order) => {
          upsertOrder(order);
          return order;
        })
        .catch(() => null)
        .finally(() => {
          inflight.current.delete(id);
        });
      inflight.current.set(id, req);
      return req;
    },
    [orderById, upsertOrder]
  );

  const value = useMemo(
    () => ({ orders: merged, orderById, resolveOrder, upsertOrder }),
    [merged, orderById, resolveOrder, upsertOrder]
  );

  return (
    <OrdersLookupContext.Provider value={value}>
      {children}
    </OrdersLookupContext.Provider>
  );
}

export function useOrdersLookup(): OrdersLookupValue {
  const ctx = useContext(OrdersLookupContext);
  return (
    ctx ?? {
      orders: [],
      orderById: new Map(),
      resolveOrder: async () => null,
      upsertOrder: () => undefined,
    }
  );
}
