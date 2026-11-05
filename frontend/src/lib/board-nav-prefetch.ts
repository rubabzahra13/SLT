/**
 * Intentional board warms (hover / Back). Avoid idle API prefetch — each call
 * holds Vercel Fluid memory; boards load their own data on mount.
 */

import {
  buildOrdersReturnHref,
  ordersBoardQueryForReturn,
  ordersReturnViewState,
  type OrdersViewState,
} from "@/lib/orders-view-state";

/** Warm the exact Orders board Back will open (persist so session keeps it). */
export function warmOrdersReturnBoard(state?: OrdersViewState | null): void {
  if (typeof window === "undefined") return;
  const query = ordersBoardQueryForReturn(state);
  void (async () => {
    try {
      const { prefetchOrdersBoard } = await import("@/hooks/useOrdersBoard");
      await prefetchOrdersBoard(query, { persist: true });
    } catch {
      /* best-effort */
    }
  })();
}

export function ordersReturnHref(state?: OrdersViewState | null): string {
  return buildOrdersReturnHref(ordersReturnViewState(state));
}

/** Warm sibling counts while the user is on Orders (or vice versa). */
export function idlePrefetchSiblingBoard(
  from: "orders" | "mtd"
): () => void {
  if (typeof window === "undefined") return () => undefined;

  let cancelled = false;
  let idleId: number | null = null;
  let timeoutId: number | null = null;

  const run = () => {
    if (cancelled) return;
    void (async () => {
      try {
        if (from === "orders") {
          const { prefetchMtdBoardCounts } = await import("@/hooks/useMtdBoard");
          if (cancelled) return;
          await prefetchMtdBoardCounts({ scope: "board" });
          return;
        }
        const { prefetchOrdersBoardCounts } = await import(
          "@/hooks/useOrdersBoard"
        );
        if (cancelled) return;
        await prefetchOrdersBoardCounts({
          excludeFlagged: true,
          range: "all",
        });
      } catch {
        /* best-effort */
      }
    })();
  };

  // A warm-cache mount reports "loaded" instantly while its own revalidation
  // is still in flight — wait that out, then take the next idle slot.
  timeoutId = window.setTimeout(() => {
    timeoutId = null;
    if (cancelled) return;
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(run, { timeout: 2000 });
    } else {
      run();
    }
  }, 1500);

  return () => {
    cancelled = true;
    if (idleId != null && typeof window.cancelIdleCallback === "function") {
      window.cancelIdleCallback(idleId);
    }
    if (timeoutId != null) window.clearTimeout(timeoutId);
  };
}
