/**
 * Idle-warm the *other* board tab so Orders ↔ MTD feels instant without
 * racing the painted board for bandwidth. Skips when that cache is already fresh.
 */

import type { CheerFormSubtypeFilter, OrderFormType } from "@/types";

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";
const DEFAULT_CHEER: CheerFormSubtypeFilter = "all-star-cheer";

function sessionForm(key: string): OrderFormType {
  if (typeof window === "undefined") return DEFAULT_FORM;
  return (
    (sessionStorage.getItem(key) as OrderFormType | null) || DEFAULT_FORM
  );
}

function sessionCheer(key: string): CheerFormSubtypeFilter {
  if (typeof window === "undefined") return DEFAULT_CHEER;
  return (
    (sessionStorage.getItem(key) as CheerFormSubtypeFilter | null) ||
    DEFAULT_CHEER
  );
}

/** Warm MTD while the user is on Orders (or vice versa). One key only. */
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
          const { prefetchMtdBoard } = await import("@/hooks/useMtdBoard");
          if (cancelled) return;
          const form = sessionForm("slt_mtd_form");
          const cheer = sessionCheer("slt_mtd_cheer_subtype");
          await prefetchMtdBoard({
            scope: "live",
            formType: form,
            cheerFormSubtype:
              form === "school-all-star-cheer" ? cheer : undefined,
          });
          return;
        }
        const { prefetchOrdersBoard } = await import("@/hooks/useOrdersBoard");
        if (cancelled) return;
        const form = sessionForm("slt_orders_form");
        const cheer = sessionCheer("slt_orders_cheer_subtype");
        await prefetchOrdersBoard({
          formType: form,
          cheerFormSubtype:
            form === "school-all-star-cheer" ? cheer : undefined,
          excludeFlagged: true,
          range: "all",
          sortBy: "newest",
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
