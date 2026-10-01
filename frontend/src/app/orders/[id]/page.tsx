"use client";

import { use, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Pencil, X } from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import {
  InlineDateInput,
  InlineTriStateCheckGroup,
} from "@/components/mtd/InlineFields";
import { MTDOrderDetails } from "@/components/mtd/MTDOrderDetails";
import { OrderStatusDropdown } from "@/components/orders/OrderStatusDropdown";
import { CompletionBlockedModal } from "@/components/mtd/CompletionBlockedModal";
import { SetPricingModal } from "@/components/mtd/SetPricingModal";
import { useMixDateCalendarRules } from "@/components/mtd/useMixDateCalendarRules";
import { useAppState } from "@/context/AppStateContext";
import { toIsoDateString } from "@/lib/dates";
import { orderFromMTDRecord, rawFieldValue } from "@/lib/order-detail-fields";
import { orderToMTDRecord } from "@/lib/order-form";
import { getOrderDetailSections } from "@/lib/order-detail-sections";
import { findLinkedOrder, findProducerByAssignmentKey } from "@/lib/editor-assignment";
import { isOrderScheduledAndAssigned } from "@/lib/mtd-filters";
import {
  cycleEightCsItem,
  cycleSongsItem,
  encodeEightCsState,
  encodeSongsState,
  getCollectionItemsForCategory,
  getSongsItems,
  parseEightCsState,
  parseSongsState,
} from "@/lib/mtd-checklist";
import {
  mtdPatchFromOrderField,
  orderPatchFromOrderField,
} from "@/lib/mtd-order-sync";
import type { Order } from "@/types";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const {
    mtdRecords,
    allOrders,
    updateMTD,
    updateOrder,
    producers,
    holidays,
    discountCodes,
    isViewOnly,
    isLoading,
    addNotification,
  } = useAppState();

  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [orderFormEditing, setOrderFormEditing] = useState(false);
  const [orderDraft, setOrderDraft] = useState<Order | null>(null);

  const record = useMemo(() => {
    const directMatch = mtdRecords.find(
      (r) => r.id === id || r.orderId === id || r.uuid === id || r.legacyId === id
    );
    if (directMatch) return directMatch;
    const orderMatch = allOrders.find(
      (o) => o.id === id || o.uuid === id || o.legacyId === id
    );
    if (orderMatch) return orderToMTDRecord(orderMatch);
    return undefined;
  }, [mtdRecords, allOrders, id]);

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
    const producerKey = record?.assignedProducer || displayOrder?.assignedProducer;
    if (!producerKey) return undefined;
    return findProducerByAssignmentKey(producerKey, producers);
  }, [record, displayOrder, producers]);

  const mixDateRules = useMixDateCalendarRules({
    record,
    producer: assignedProducerObj,
    mixStartDate: record?.mixStartDate ?? "",
    producers,
    mtdRecords,
    allOrders,
    studioHolidays: holidays,
  });

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

  const startOrderFormEdit = useCallback(() => {
    if (isViewOnly || !displayOrder) return;
    setOrderDraft({ ...displayOrder });
    setOrderFormEditing(true);
  }, [displayOrder, isViewOnly]);

  const cancelOrderFormEdit = useCallback(() => {
    setOrderDraft(null);
    setOrderFormEditing(false);
  }, []);

  const saveOrderFormEdit = useCallback(() => {
    if (!displayOrder || !orderDraft) return;

    updateOrder(displayOrder.id, orderDraft, displayOrder);

    if (record) {
      const sections = getOrderDetailSections(displayOrder);
      for (const section of sections) {
        for (const field of section.fields) {
          const nextValue = rawFieldValue(orderDraft, field.key);
          const prevValue = rawFieldValue(displayOrder, field.key);
          if (nextValue === prevValue) continue;
          const mtdPatch = mtdPatchFromOrderField(field.key, nextValue);
          if (Object.keys(mtdPatch).length > 0) {
            updateMTD(record.id, mtdPatch);
          }
        }
      }
    }

    addNotification({
      type: "mtd_move",
      title: "Order details updated",
      message: "Order form changes saved successfully.",
    });

    setOrderDraft(null);
    setOrderFormEditing(false);
  }, [displayOrder, orderDraft, record, updateOrder, updateMTD, addNotification]);

  const handleOrderDraftChange = useCallback((key: string, value: string) => {
    setOrderDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, ...orderPatchFromOrderField(key, value) };
    });
  }, []);

  if (isLoading && (!record || !displayOrder)) {
    return (
      <div className="space-y-6 px-6 pb-8 pt-6 lg:px-8">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-brand-line/40" />
        <div className="dashboard-panel h-48 animate-pulse p-6" />
        <div className="dashboard-panel h-96 animate-pulse p-6" />
      </div>
    );
  }

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
  const eightCsState = parseEightCsState(
    record?.eightCountSheet ??
      displayOrder?.eightCountSheet ??
      displayOrder?.sendingEightCountSheets ??
      ""
  );
  const songsState = parseSongsState(
    record?.haveSongs ??
      displayOrder?.haveSongs ??
      displayOrder?.songListSuggestions ??
      ""
  );

  const handleMixStartChange = (next: string) => {
    let nextEnd = record.mixEndDate ?? displayOrder.mixEndDate;
    if (next && !nextEnd) {
      const d = new Date(next);
      d.setDate(d.getDate() + 7);
      nextEnd = d.toISOString().slice(0, 10);
    }
    const patch = { mixStartDate: next, mixEndDate: nextEnd };
    updateOrder(displayOrder.id, patch, displayOrder);
    if (record) {
      updateMTD(record.id, patch);
    }
  };

  const handleMixEndChange = (next: string) => {
    const patch = { mixEndDate: next };
    updateOrder(displayOrder.id, patch, displayOrder);
    if (record) {
      updateMTD(record.id, patch);
    }
  };

  const handleCycleEightCs = (itemId: string) => {
    if (isViewOnly || !displayOrder) return;
    const next = cycleEightCsItem(eightCsState, itemId as keyof typeof eightCsState);
    const encoded = encodeEightCsState(next);
    const patch = {
      eightCountSheet: encoded,
      sendingEightCountSheets: encoded,
    };
    updateOrder(displayOrder.id, patch, displayOrder);
    if (record) {
      updateMTD(record.id, { eightCountSheet: encoded });
    }
  };

  const handleCycleSongs = (itemId: string) => {
    if (isViewOnly || !displayOrder) return;
    const next = cycleSongsItem(songsState, itemId as keyof typeof songsState);
    const encoded = encodeSongsState(next);
    const patch = { haveSongs: encoded };
    updateOrder(displayOrder.id, patch, displayOrder);
    if (record) {
      updateMTD(record.id, { haveSongs: encoded });
    }
  };

  return (
    <>
      <PageHeader
        title={displayOrder.programName || displayOrder.teamName || record.programName || "Order Details"}
        subtitle={displayOrder.contactName || displayOrder.customerName || record.contactName || "Customer"}
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
                Assign a producer and set mix start & end dates to move this order into MTD
              </p>
            </div>

            <div className="flex items-center gap-3">
              <OrderStatusDropdown record={displayOrder} disabled={isViewOnly} />

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
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Editor Tile */}
            <div className="rounded-xl border border-brand-line/40 bg-brand-bg/60 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                Assigned producer
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
                  <span className="text-[13px] font-medium text-brand-ink-tertiary">No assigned producer yet</span>
                )}

                {!isViewOnly && (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/orders/${id}/assign?return=${encodeURIComponent(`/orders/${id}`)}`
                      )
                    }
                    className={clsx(
                      "rounded-lg px-2.5 py-1 text-[12px] font-semibold transition shadow-sm",
                      assignedProducerObj
                        ? "bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20"
                        : "border border-brand-orange-deep bg-brand-orange text-white hover:bg-brand-orange-hover"
                    )}
                  >
                    {assignedProducerObj ? "Change" : "Assign"}
                  </button>
                )}
              </div>
            </div>

            {/* Mix Start Date Tile */}
            <div className="rounded-xl border border-brand-line/40 bg-brand-bg/60 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                Mix Start Date
              </span>
              <div className="mt-2">
                <InlineDateInput
                  value={displayOrder.mixStartDate || record.mixStartDate}
                  placeholder="No scheduled start"
                  readOnly={isViewOnly}
                  onChange={handleMixStartChange}
                  isDateDisabled={mixDateRules.isDateDisabled}
                  dayTitle={mixDateRules.dayTitle}
                  dayTone={mixDateRules.dayTone}
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
                  value={displayOrder.mixEndDate || record.mixEndDate || ""}
                  placeholder="No scheduled end"
                  readOnly={isViewOnly}
                  onChange={handleMixEndChange}
                  template={mixDateRules.suggestedEndIso || undefined}
                  min={toIsoDateString(record.mixStartDate) || undefined}
                  isDateDisabled={mixDateRules.isDateDisabled}
                  dayTitle={mixDateRules.dayTitle}
                  dayTone={mixDateRules.dayTone}
                />
              </div>
            </div>

            {/* Collections Tile */}
            <div className="rounded-xl border border-brand-line/40 bg-brand-bg/60 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                Collections & Materials
              </span>
              <div className="mt-2 space-y-1.5">
                <InlineTriStateCheckGroup
                  items={getCollectionItemsForCategory(displayOrder.formType, eightCsState)}
                  onCycle={handleCycleEightCs}
                  readOnly={isViewOnly}
                />
                <InlineTriStateCheckGroup
                  items={getSongsItems(songsState)}
                  onCycle={handleCycleSongs}
                  readOnly={isViewOnly}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Order Form Fields Only */}
        <section className="dashboard-panel p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-brand-line/40 pb-3">
            <h3 className="text-[14px] font-bold uppercase tracking-[0.06em] text-brand-ink">
              Customer Order Form Submission
            </h3>
            <DetailSectionActions
              editing={orderFormEditing}
              onEdit={startOrderFormEdit}
              onCancel={cancelOrderFormEdit}
              onSave={saveOrderFormEdit}
              editLabel="Edit order form fields"
            />
          </div>
          <MTDOrderDetails
            order={orderDraft ?? displayOrder}
            discountCodes={discountCodes}
            editable={orderFormEditing && !isViewOnly}
            onFieldChange={handleOrderDraftChange}
          />
        </section>
      </div>

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

const detailEditButtonClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-brand-line/60 bg-white text-brand-ink-secondary shadow-sm transition hover:border-brand-orange/50 hover:bg-brand-orange-soft/40 hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/30";

function DetailSectionActions({
  editing,
  onEdit,
  onCancel,
  onSave,
  editLabel,
}: {
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  editLabel: string;
}) {
  const { isViewOnly } = useAppState();

  if (isViewOnly) return null;

  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <button
          type="button"
          onClick={onSave}
          className="rounded-xl bg-brand-orange px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-orange-hover"
        >
          Save
        </button>
      ) : null}
      <DetailEditButton
        active={editing}
        onClick={editing ? onCancel : onEdit}
        label={editLabel}
      />
    </div>
  );
}

function DetailEditButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={active ? "Cancel editing" : label}
      aria-label={active ? "Cancel editing" : label}
      aria-pressed={active}
      className={clsx(
        detailEditButtonClass,
        active && "border-brand-orange/60 bg-brand-orange-soft/50 text-brand-orange shadow-md"
      )}
    >
      {active ? (
        <X className="h-4 w-4" strokeWidth={2.5} />
      ) : (
        <Pencil className="h-4 w-4" strokeWidth={2} />
      )}
    </button>
  );
}
