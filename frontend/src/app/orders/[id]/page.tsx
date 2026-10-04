"use client";

import { use, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, X } from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "@/components/layout/PageHeader";
import { MTDOrderDetails } from "@/components/mtd/MTDOrderDetails";
import { SetPricingModal } from "@/components/mtd/SetPricingModal";
import { useAppState } from "@/context/AppStateContext";
import { orderFromMTDRecord, rawFieldValue } from "@/lib/order-detail-fields";
import { orderToMTDRecord } from "@/lib/order-form";
import { getOrderDetailSections } from "@/lib/order-detail-sections";
import { findLinkedOrder } from "@/lib/editor-assignment";
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
  const {
    mtdRecords,
    allOrders,
    updateMTD,
    updateOrder,
    discountCodes,
    isViewOnly,
    isLoading,
    addNotification,
  } = useAppState();

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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-8 pt-5 lg:px-8">
      <div className="space-y-6">
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
      </div>

      <SetPricingModal
        open={pricingOpen}
        order={displayOrder}
        record={record}
        onClose={() => setPricingOpen(false)}
      />
    </div>
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
