"use client";

import { Suspense, use, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AssignEditorModal,
  type EditorAssignmentResult,
} from "@/components/mtd/AssignEditorModal";
import { useAppState } from "@/context/AppStateContext";

function MtdAssignPageContent({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const {
    mtdRecords,
    allOrders,
    updateMTD,
    producers,
    schedule,
    holidays,
    isLoading,
  } = useAppState();

  const returnHref = useMemo(() => {
    const raw = searchParams.get("return");
    if (raw && raw.startsWith("/")) return raw;
    return `/mtd/${id}`;
  }, [searchParams, id]);

  const record = useMemo(
    () =>
      mtdRecords.find(
        (r) => r.id === id || r.orderId === id || r.uuid === id || r.legacyId === id
      ) ?? null,
    [mtdRecords, id]
  );

  const handleAssign = useCallback(
    (recordId: string, result: EditorAssignmentResult) => {
      updateMTD(recordId, {
        editorRequest: result.editorRequest,
        assignedProducer: result.assignedProducer,
        ...(result.mixStartDate ? { mixStartDate: result.mixStartDate } : {}),
        ...(result.mixEndDate ? { mixEndDate: result.mixEndDate } : {}),
        ...(result.recordStatus ? { recordStatus: result.recordStatus } : {}),
        ...(result.status ? { status: result.status } : {}),
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
        <p className="text-[13px] text-brand-ink-secondary">MTD record not found.</p>
        <Link
          href="/mtd"
          className="mt-3 inline-block text-[13px] font-semibold text-brand-info"
        >
          ← Back to MTD
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
      studioHolidays={holidays}
      returnHref={returnHref}
      onClose={() => {}}
      onAssign={handleAssign}
    />
  );
}

export default function MtdAssignPage({
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
      <MtdAssignPageContent id={id} />
    </Suspense>
  );
}
