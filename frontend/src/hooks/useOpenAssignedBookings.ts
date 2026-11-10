"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/context/AppStateContext";
import { fetchOrdersBoardApi } from "@/lib/api/orders-board";
import { collectOrdersBoardCachedOrders } from "@/lib/orders-board-cache";
import { collectOpenAssignedMixRecords } from "@/lib/producer-assigned-mixes";
import type { MTDRecord, Order } from "@/types";

function mergeOrdersForBookingScan(...lists: Order[][]): Order[] {
  const byId = new Map<string, Order>();
  for (const list of lists) {
    for (const order of list) {
      if (!order?.id || byId.has(order.id)) continue;
      byId.set(order.id, order);
    }
  }
  return [...byId.values()];
}

async function fetchAllAssignedBoardOrders(): Promise<Order[]> {
  const gathered: Order[] = [];
  let pageToken: string | null = null;
  for (let page = 0; page < 10; page += 1) {
    const result = await fetchOrdersBoardApi({
      range: "assigned",
      source: "both",
      pageSize: 100,
      pageToken,
    });
    gathered.push(...result.orders);
    pageToken = result.nextPageToken;
    if (!pageToken) break;
  }
  return gathered;
}

/**
 * Open assigned mixes (Orders Assigned + live MTD) for calendars / limits /
 * producer conflict dialogs — hydrated only while `enabled` (Assign open,
 * Producers modal, etc.). Idle Producers/Settings stay cold.
 */
export function useOpenAssignedBookings(
  enabled: boolean,
  opts?: { alwaysFetch?: boolean }
): {
  bookingRecords: MTDRecord[];
  conflictOrders: Order[];
  mtdRecords: MTDRecord[];
  ready: boolean;
} {
  const { activeOrders, mtdRecords, ensureLiveMtdLoaded } = useAppState();
  const alwaysFetch = opts?.alwaysFetch === true;
  const [fetchedOrders, setFetchedOrders] = useState<Order[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setFetchedOrders([]);
      setReady(false);
      return;
    }

    let cancelled = false;
    setReady(false);

    void (async () => {
      try {
        await ensureLiveMtdLoaded();
      } catch {
        /* assigned board fetch still helps Orders-side */
      }

      const cached = mergeOrdersForBookingScan(
        activeOrders,
        collectOrdersBoardCachedOrders()
      );
      const cachedHits = collectOpenAssignedMixRecords(cached, mtdRecords);
      // Cache/memory already has open bookings → skip board round-trip.
      // Send Schedule must still read the Orders table: MTD hits are not a
      // substitute for assigned orders that were never loaded into memory.
      if (!alwaysFetch && cachedHits.length > 0) {
        if (!cancelled) {
          setFetchedOrders([]);
          setReady(true);
        }
        return;
      }

      try {
        const gathered = await fetchAllAssignedBoardOrders();
        if (!cancelled) setFetchedOrders(gathered);
      } catch {
        if (!cancelled) setFetchedOrders([]);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open gate only
  }, [enabled, alwaysFetch, ensureLiveMtdLoaded]);

  const conflictOrders = useMemo(
    () =>
      mergeOrdersForBookingScan(
        activeOrders,
        fetchedOrders,
        collectOrdersBoardCachedOrders()
      ),
    [activeOrders, fetchedOrders]
  );

  const bookingRecords = useMemo(() => {
    if (!enabled) return [];
    return collectOpenAssignedMixRecords(conflictOrders, mtdRecords);
  }, [enabled, conflictOrders, mtdRecords]);

  return {
    bookingRecords,
    conflictOrders,
    mtdRecords,
    ready,
  };
}
