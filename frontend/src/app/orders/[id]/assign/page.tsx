"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AssignEditorModal,
  type EditorAssignmentResult,
} from "@/components/mtd/AssignEditorModal";
import { useAppState } from "@/context/AppStateContext";
import { OrdersLookupProvider } from "@/context/OrdersLookupContext";
import { fetchOrderApi } from "@/lib/api/orders";
import {
  patchAssignPageSeed,
  readAssignPageSeed,
  seedAssignPage,
} from "@/lib/assign-page-seed";
import { orderToMTDRecord } from "@/lib/order-form";
import { findLinkedOrder } from "@/lib/editor-assignment";
import { mergeCollectionStateFromOrder } from "@/lib/order-staging";
import { safeReturnHref } from "@/lib/nav-return";
import type { MTDRecord, Order } from "@/types";

function orderMatchesRouteId(order: Order, id: string): boolean {
  return order.id === id || order.uuid === id || order.legacyId === id;
}

function readReturnHref(): string {
  if (typeof window === "undefined") return "/orders";
  return (
    safeReturnHref(
      new URLSearchParams(window.location.search).get("return"),
      "/orders"
    ) || "/orders"
  );
}

function OrderAssignPageContent({ id }: { id: string }) {
  const {
    mtdRecords,
    updateMTD,
    updateOrder,
    producers,
    schedule,
    activeOrders,
    allOrders,
  } = useAppState();

  // Sync seed on first paint (useState init — not useMemo after empty frame).
  const [seed] = useState(() => readAssignPageSeed(id));
  const [returnHref] = useState(readReturnHref);

  const cachedOrder = useMemo(() => {
    // Live AppState wins over navigate seed — otherwise Unassign leaves CH
    // selected because seed still has the old assignment.
    const fromActive = activeOrders.find((o) => orderMatchesRouteId(o, id));
    if (fromActive) return fromActive;
    if (seed?.order && orderMatchesRouteId(seed.order, id)) return seed.order;
    // Avoid scanning pastOrders/allOrders when the board seed already has a row.
    if (seed?.record) return null;
    return allOrders.find((o) => orderMatchesRouteId(o, id)) || null;
  }, [seed, activeOrders, allOrders, id]);

  const [fetchedOrder, setFetchedOrder] = useState<Order | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);

  // Soft revalidate in background. Warm seed still paints first; never skip the
  // GET entirely or Unassign + Back resurrects stale producer/dates.
  useEffect(() => {
    let cancelled = false;
    setFetchFailed(false);
    void fetchOrderApi(id)
      .then((order) => {
        if (cancelled) return;
        setFetchedOrder(order);
        const baseRecord =
          seed?.record ||
          (order ? orderToMTDRecord(order) : null);
        if (baseRecord) {
          seedAssignPage(
            id,
            {
              ...baseRecord,
              assignedProducer: order.assignedProducer ?? null,
              mixStartDate: order.mixStartDate || "",
              mixEndDate: order.mixEndDate || "",
              isReassigned: Boolean(order.isReassigned),
            },
            order
          );
        }
      })
      .catch(() => {
        if (!cancelled && !cachedOrder && !seed?.order) setFetchFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // cachedOrder/seed intentionally omitted — one soft fetch per id mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const order = fetchedOrder || cachedOrder;

  const ordersForUi = useMemo(() => (order ? [order] : []), [order]);

  const record = useMemo(() => {
    const directMatch =
      mtdRecords.find(
        (r) =>
          r.id === id || r.orderId === id || r.uuid === id || r.legacyId === id
      ) ||
      (seed?.record &&
      (seed.record.id === id ||
        seed.record.orderId === id ||
        seed.record.uuid === id ||
        seed.record.legacyId === id)
        ? seed.record
        : null);

    const orderMatch =
      order ||
      (directMatch ? findLinkedOrder(directMatch, ordersForUi) : undefined) ||
      seed?.order ||
      null;

    if (directMatch && orderMatch) {
      return mergeCollectionStateFromOrder(directMatch, orderMatch);
    }
    if (directMatch) return directMatch;
    if (orderMatch) return orderToMTDRecord(orderMatch);
    return null;
  }, [mtdRecords, order, ordersForUi, id, seed]);

  const handleAssign = useCallback(
    async (recordId: string, result: EditorAssignmentResult) => {
      const orderId = order?.id || record?.orderId || recordId;
      // Assignment is Orders SoT — one PATCH only (never also updateMTD with
      // the same fields; that used to double Vercel + DB + SSE).
      const assignmentPatch = {
        editorRequest: result.editorRequest,
        assignedProducer: result.assignedProducer,
        isReassigned: false,
        ...(result.mixStartDate !== undefined
          ? { mixStartDate: result.mixStartDate }
          : {}),
        ...(result.mixEndDate !== undefined
          ? { mixEndDate: result.mixEndDate }
          : {}),
      };
      if (orderId) {
        await updateOrder(orderId, assignmentPatch, order || undefined);
        // Keep navigate seed in sync so Back → Assign doesn't resurrect CH.
        patchAssignPageSeed(orderId, {
          record: {
            assignedProducer: result.assignedProducer,
            mixStartDate: result.mixStartDate ?? "",
            mixEndDate: result.mixEndDate ?? "",
            isReassigned: false,
            editorRequest: result.editorRequest,
          },
          order: {
            assignedProducer: result.assignedProducer,
            mixStartDate: result.mixStartDate ?? "",
            mixEndDate: result.mixEndDate ?? "",
            isReassigned: false,
            editorRequest: result.editorRequest,
          },
        });
        if (id !== orderId) {
          patchAssignPageSeed(id, {
            record: {
              assignedProducer: result.assignedProducer,
              mixStartDate: result.mixStartDate ?? "",
              mixEndDate: result.mixEndDate ?? "",
              isReassigned: false,
            },
            order: {
              assignedProducer: result.assignedProducer,
              mixStartDate: result.mixStartDate ?? "",
              mixEndDate: result.mixEndDate ?? "",
              isReassigned: false,
            },
          });
        }
      }
      // Invoice is mtd_records SoT — invoice-only fast path (no assignment rewrite).
      if (result.invoice !== undefined) {
        const mtdSeed =
          mtdRecords.find(
            (r) =>
              r.id === recordId ||
              r.orderId === orderId ||
              r.id === orderId
          ) || record || undefined;
        const mtdId = mtdSeed?.id || recordId;
        void updateMTD(mtdId, { invoice: result.invoice }, mtdSeed);
      }
    },
    [updateMTD, updateOrder, order, record, mtdRecords, id]
  );

  if (!record && !fetchFailed) {
    return (
      <div className="px-6 py-10 text-[13px] text-brand-ink-tertiary lg:px-8">
        Loading assignment…
      </div>
    );
  }

  if (!record) {
    return (
      <div className="px-6 py-10 lg:px-8">
        <p className="text-[13px] text-brand-ink-secondary">Order not found.</p>
        <Link
          href={returnHref}
          className="mt-3 inline-block text-[13px] font-semibold text-brand-info"
        >
          ← Back to orders
        </Link>
      </div>
    );
  }

  return (
    <OrdersLookupProvider orders={ordersForUi}>
      <AssignEditorModal
        variant="page"
        open
        record={record as MTDRecord}
        mtdRecords={mtdRecords}
        allOrders={ordersForUi}
        producers={producers}
        schedule={schedule}
        returnHref={returnHref}
        onClose={() => {}}
        onAssign={handleAssign}
      />
    </OrdersLookupProvider>
  );
}

export default function OrderAssignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <OrderAssignPageContent id={id} />;
}
