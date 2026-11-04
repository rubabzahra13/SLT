"use client";

import { useEffect, useState } from "react";
import { DashboardKpiStripLive } from "@/components/dashboard/DashboardKpiStripLive";
import { DashboardPageClient } from "@/components/dashboard/DashboardPageClient";
import { subscribeBoardStream } from "@/lib/api/board-stream";
import {
  fetchDashboardPulseApi,
  invalidateDashboardPulseCache,
  readDashboardPulseForPaint,
  type DashboardPulseApi,
} from "@/lib/api/dashboard";
import type { Order } from "@/types";
import {
  ORDERS_BOARD_PATCH_EVENT,
  readOrdersBoardOrder,
} from "@/lib/orders-board-cache";

function assignedKey(o: Order | null | undefined): string {
  return (o?.assignedProducer || "").trim();
}

function boardKey(o: Order | null | undefined): string {
  return `${o?.status || ""}|${o?.affiliateFlagStatus || ""}`;
}

/** One pulse fetch for the whole Dashboard (KPIs + panels). No full MTD hydrate. */
export function DashboardData() {
  const [pulseApi, setPulseApi] = useState<DashboardPulseApi | null>(
    () => readDashboardPulseForPaint()?.pulse ?? null
  );

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: number | null = null;
    const seen = new Map<string, { assigned: string; board: string }>();

    const load = (force = false) => {
      const paint = readDashboardPulseForPaint();
      if (!force && paint) setPulseApi(paint.pulse);
      // Fresh pulse → paint only (return from Settings/Orders feels instant).
      if (!force && paint?.fresh) return;
      void fetchDashboardPulseApi()
        .then((pulse) => {
          if (!cancelled) setPulseApi(pulse);
        })
        .catch(() => {
          /* keep last */
        });
    };

    const scheduleRefresh = () => {
      invalidateDashboardPulseCache();
      if (refreshTimer != null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        if (cancelled) return;
        load(true);
      }, 120);
    };

    load(false);

    const onPatch = (event: Event) => {
      const detail = (event as CustomEvent<{ countsChanged?: boolean }>).detail;
      if (!detail?.countsChanged) return;
      scheduleRefresh();
    };
    window.addEventListener(ORDERS_BOARD_PATCH_EVENT, onPatch);

    const ac = new AbortController();
    void subscribeBoardStream((event) => {
      if (cancelled) return;
      if (event.type === "ready" && event.reconnect) {
        scheduleRefresh();
        return;
      }
      if (event.type === "mtd.updated" || event.type === "order.deleted") {
        scheduleRefresh();
        return;
      }
      if (event.type !== "order.updated") return;
      const after = event.order as Order;
      const cached = readOrdersBoardOrder(after.id);
      const next = {
        assigned: assignedKey(after),
        board: boardKey(after),
      };
      const prev =
        seen.get(after.id) ||
        (cached
          ? { assigned: assignedKey(cached), board: boardKey(cached) }
          : null);
      seen.set(after.id, next);
      // First sighting = create (or cold SSE) — refresh Unassigned / Orders in.
      if (!prev) {
        scheduleRefresh();
        return;
      }
      if (prev.assigned === next.assigned && prev.board === next.board) return;
      scheduleRefresh();
    }, ac.signal).catch(() => {
      /* stream retries */
    });

    return () => {
      cancelled = true;
      if (refreshTimer != null) window.clearTimeout(refreshTimer);
      window.removeEventListener(ORDERS_BOARD_PATCH_EVENT, onPatch);
      ac.abort();
    };
  }, []);

  return (
    <>
      <DashboardKpiStripLive pulseApi={pulseApi} />
      <DashboardPageClient pulseApi={pulseApi} />
    </>
  );
}
