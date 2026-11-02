"use client";

import { Suspense, use, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AssignEditorModal,
  type EditorAssignmentResult,
} from "@/components/mtd/AssignEditorModal";
import { useAppState } from "@/context/AppStateContext";
import { orderToMTDRecord } from "@/lib/order-form";
import { findLinkedOrder } from "@/lib/editor-assignment";
import { mergeCollectionStateFromOrder } from "@/lib/order-staging";
import { safeReturnHref } from "@/lib/nav-return";

function OrderAssignPageContent({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const {
    mtdRecords,
    allOrders,
    updateMTD,
    producers,
    schedule,
    isLoading,
  } = useAppState();

  const returnHref = useMemo(() => {
    return safeReturnHref(searchParams.get("return"), "/orders") || "/orders";
  }, [searchParams]);

  const record = useMemo(() => {
    const directMatch = mtdRecords.find(
      (r) => r.id === id || r.orderId === id || r.uuid === id || r.legacyId === id
    );
    const orderMatch =
      allOrders.find(
        (o) => o.id === id || o.uuid === id || o.legacyId === id
      ) ||
      (directMatch ? findLinkedOrder(directMatch, allOrders) : undefined);
    // Order SoT for assignment: empty Order producer wins over stale MTD CH.
    if (directMatch && orderMatch) {
      return mergeCollectionStateFromOrder(directMatch, orderMatch);
    }
    if (directMatch) return directMatch;
    if (orderMatch) return orderToMTDRecord(orderMatch);
    return null;
  }, [mtdRecords, allOrders, id]);

  const handleAssign = useCallback(
    (recordId: string, result: EditorAssignmentResult) => {
      updateMTD(recordId, {
        editorRequest: result.editorRequest,
        assignedProducer: result.assignedProducer,
        // Completing reassignment: clear so the row moves to Assigned.
        // Keep orderStatus (Reassign:*) until producer mail is marked/sent so
        // mark-as-sent stays available after MTD → Orders returns.
        isReassigned: false,
        ...(result.mixStartDate ? { mixStartDate: result.mixStartDate } : {}),
        ...(result.mixEndDate ? { mixEndDate: result.mixEndDate } : {}),
        ...(result.invoice !== undefined ? { invoice: result.invoice } : {}),
      });
    },
    [updateMTD]
  );

  if (isLoading) {
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
    <AssignEditorModal
      variant="page"
      open
      record={record}
      mtdRecords={mtdRecords}
      allOrders={allOrders}
      producers={producers}
      schedule={schedule}
      returnHref={returnHref}
      onClose={() => {}}
      onAssign={handleAssign}
    />
  );
}

export default function OrderAssignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <Suspense
      fallback={
        <div className="px-6 py-10 text-[13px] text-brand-ink-tertiary lg:px-8">
          Loading assignment…
        </div>
      }
    >
      <OrderAssignPageContent id={id} />
    </Suspense>
  );
}
