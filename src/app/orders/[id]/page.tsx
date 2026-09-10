"use client";

import { use, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { InlineDateInput } from "@/components/mtd/InlineFields";
import {
  AssignEditorModal,
  type EditorAssignmentResult,
} from "@/components/mtd/AssignEditorModal";
import { MTDOrderDetails } from "@/components/mtd/MTDOrderDetails";
import { CompletionBlockedModal } from "@/components/mtd/CompletionBlockedModal";
import { SetPricingModal } from "@/components/mtd/SetPricingModal";
import { useAppState } from "@/context/AppStateContext";
import { formatPrice } from "@/lib/data";
import { orderFromMTDRecord } from "@/lib/order-detail-fields";
import { findLinkedOrder, findProducerByAssignmentKey } from "@/lib/editor-assignment";
import { isOrderScheduledAndAssigned, isPreMTDOrderRecord } from "@/lib/mtd-filters";
import type { MTDRecord, Order } from "@/types";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const {
    mtdRecords,
    allOrders,
    updateMTD,
    producers,
    schedule,
  } = useAppState();

  const [assignOpen, setAssignOpen] = useState(false);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);

  const record = useMemo(
    () => mtdRecords.find((r) => r.id === id || r.orderId === id),
    [mtdRecords, id]
  );

  const linkedOrder = useMemo(() => {
    if (!record) return undefined;
    return findLinkedOrder(record, allOrders);
  }, [record, allOrders]);

  const displayOrder: Order | null = useMemo(() => {
    if (linkedOrder) return linkedOrder;
    if (record) return orderFromMTDRecord(record);
    return null;
  }, [linkedOrder, record]);

  const assignedProducerObj = useMemo(() => {
    if (!record?.assignedProducer) return undefined;
    return findProducerByAssignmentKey(record.assignedProducer, producers);
  }, [record, producers]);

  const handleAssign = useCallback(
    (recordId: string, result: EditorAssignmentResult) => {
      updateMTD(recordId, {
        editorRequest: result.editorRequest,
        assignedProducer: result.assignedProducer,
        ...(result.mixStartDate ? { mixStartDate: result.mixStartDate } : {}),
        ...(result.mixEndDate ? { mixEndDate: result.mixEndDate } : {}),
      });
    },
    [updateMTD]
  );

  const handleMoveToMTD = useCallback(() => {
    if (!record) return;
    if (!isOrderScheduledAndAssigned(record)) {
      setValidationModalOpen(true);
      return;
    }

    updateMTD(record.id, {
      inMTD: true,
      status: record.status === "needs_attention" ? "active" : record.status,
    });
    window.location.href = "/mtd";
  }, [record, updateMTD]);

  if (!record || !displayOrder) {
    return (
      <div className="p-8 text-center text-brand-ink-tertiary">
        <p className="text-[15px] font-semibold">Order not found</p>
        <Link href="/orders" className="mt-3 inline-block text-[13px] text-brand-blue hover:underline">
          ← Return to Orders
        </Link>
      </div>
    );
  }

  const isReadyForMTD = isOrderScheduledAndAssigned(record);

  return (
    <>
      <PageHeader
        title={record.programName || "Order Details"}
        subtitle={`ID: ${record.id} · ${record.contactName || "Customer"}`}
        secondaryAction={{
          label: "Pricing",
          onClick: () => setPricingOpen(true),
          showPlus: false,
        }}
        action={{
          label: "← Back to Orders",
          onClick: () => {
            window.location.href = "/orders";
          },
          showPlus: false,
        }}
      />

      <div className="space-y-6 px-6 pb-8 pt-5 lg:px-8">
        {/* Assignment & Scheduling Header Banner */}
        <section className="dashboard-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-line/40 pb-4">
            <div>
              <h2 className="text-[14px] font-bold uppercase tracking-[0.06em] text-brand-ink">
                Pre-MTD Staging & Scheduling
              </h2>
              <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
                Assign an editor and set mix start & end dates to move this order into MTD
              </p>
            </div>

            <button
              type="button"
              onClick={handleMoveToMTD}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-semibold transition shadow-sm",
                isReadyForMTD
                  ? "bg-brand-blue text-white hover:bg-brand-blue-hover"
                  : "border border-brand-line/60 bg-brand-bg-subtle text-brand-ink-tertiary hover:bg-brand-bg-subtle/80 hover:text-brand-ink"
              )}
            >
              <span>Move to MTD</span>
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {/* Editor Tile */}
            <div className="rounded-xl border border-brand-line/40 bg-brand-bg/60 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                Assigned Editor
              </span>
              <div className="mt-2 flex items-center justify-between">
                {assignedProducerObj ? (
                  <div className="flex items-center gap-2">
                    <Avatar producer={assignedProducerObj} size="sm" />
                    <div>
                      <p className="text-[13px] font-semibold text-brand-ink">{assignedProducerObj.name}</p>
                      <p className="text-[11px] text-brand-ink-tertiary">{assignedProducerObj.initials}</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-[13px] font-medium text-brand-ink-tertiary">Unassigned</span>
                )}

                <button
                  type="button"
                  onClick={() => setAssignOpen(true)}
                  className={clsx(
                    "rounded-lg px-2.5 py-1 text-[12px] font-semibold transition shadow-sm",
                    assignedProducerObj
                      ? "bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20"
                      : "border border-brand-orange-deep bg-brand-orange text-white hover:bg-brand-orange-hover"
                  )}
                >
                  {assignedProducerObj ? "Change" : "Assign"}
                </button>
              </div>
            </div>

            {/* Mix Start Date Tile */}
            <div className="rounded-xl border border-brand-line/40 bg-brand-bg/60 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                Mix Start Date
              </span>
              <div className="mt-2">
                <InlineDateInput
                  value={record.mixStartDate}
                  onChange={(next) => {
                    let nextEnd = record.mixEndDate;
                    if (next && !nextEnd) {
                      const d = new Date(next);
                      d.setDate(d.getDate() + 7);
                      nextEnd = d.toISOString().slice(0, 10);
                    }
                    updateMTD(record.id, { mixStartDate: next, mixEndDate: nextEnd });
                  }}
                />
              </div>
            </div>

            {/* Mix End Date Tile */}
            <div className="rounded-xl border border-brand-line/40 bg-brand-bg/60 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                Mix End Date
              </span>
              <div className="mt-2">
                <InlineDateInput
                  value={record.mixEndDate ?? ""}
                  onChange={(next) => updateMTD(record.id, { mixEndDate: next })}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Order Form Fields Only */}
        <section className="dashboard-panel p-6">
          <h3 className="mb-4 border-b border-brand-line/40 pb-3 text-[14px] font-bold uppercase tracking-[0.06em] text-brand-ink">
            Customer Order Form Submission
          </h3>
          <MTDOrderDetails order={displayOrder} editable={false} />
        </section>
      </div>

      {/* Assign Editor Modal */}
      <AssignEditorModal
        open={assignOpen}
        record={record}
        mtdRecords={mtdRecords}
        allOrders={allOrders}
        producers={producers}
        schedule={schedule}
        onClose={() => setAssignOpen(false)}
        onAssign={handleAssign}
      />

      <CompletionBlockedModal
        open={validationModalOpen}
        record={record}
        reason="moveToMtd"
        onClose={() => setValidationModalOpen(false)}
      />

      <SetPricingModal
        open={pricingOpen}
        order={displayOrder}
        record={record}
        onClose={() => setPricingOpen(false)}
      />
    </>
  );
}
