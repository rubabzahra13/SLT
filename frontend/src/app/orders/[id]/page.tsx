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
  buildFieldSourceMap,
  enrichOrderWithMatchingForm,
  mergeFormWinsPatches,
  resolveManualFormPair,
  splitManualFormPatches,
} from "@/lib/manual-form-merge";
import { ManualFormPairBar } from "@/components/orders/ManualFormPairBar";
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
    producers,
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

  const pairBase = useMemo(() => {
    if (linkedOrder) return linkedOrder;
    if (record) return orderFromMTDRecord(record);
    return null;
  }, [linkedOrder, record]);

  const pair = useMemo(() => {
    if (!pairBase) return null;
    return resolveManualFormPair(pairBase, allOrders);
  }, [pairBase, allOrders]);

  const fieldSources = useMemo(() => {
    if (!pair) return undefined;
    const keys = getOrderDetailSections(pair.manual).flatMap((s) =>
      s.fields.map((f) => f.key)
    );
    return buildFieldSourceMap(pair.manual, pair.form, keys);
  }, [pair]);

  const isPairMerged = Boolean(
    pair &&
      (pair.manual.mergedFormOrderId ||
        pair.form.mergedIntoManualOrderId ||
        (pair.manual.manualOverlapSnapshot &&
          Object.keys(pair.manual.manualOverlapSnapshot).length > 0))
  );

  const handleMergePair = useCallback(async () => {
    if (!pair || isViewOnly) return;
    const { manualPatch, formPatch } = mergeFormWinsPatches(
      pair.manual,
      pair.form
    );
    await updateOrder(pair.manual.id, manualPatch, pair.manual);
    await updateOrder(pair.form.id, formPatch, pair.form);
    setOrderDraft((prev) =>
      prev
        ? {
            ...prev,
            ...manualPatch,
            manualOverlapSnapshot:
              manualPatch.manualOverlapSnapshot ?? prev.manualOverlapSnapshot,
          }
        : prev
    );
    addNotification({
      type: "mtd_move",
      title: "Orders merged",
      message:
        "Form data kept on overlaps; manual-only fields preserved. Form row absorbed.",
    });
  }, [pair, isViewOnly, updateOrder, addNotification]);

  const handleSplitPair = useCallback(async () => {
    if (!pair || isViewOnly) return;
    const { manualPatch, formPatch } = splitManualFormPatches(
      pair.manual,
      pair.form
    );
    await updateOrder(pair.manual.id, manualPatch, pair.manual);
    await updateOrder(pair.form.id, formPatch, pair.form);
    setOrderDraft((prev) =>
      prev
        ? {
            ...prev,
            ...manualPatch,
            mergedFormOrderId: undefined,
            manualOverlapSnapshot: undefined,
          }
        : prev
    );
    addNotification({
      type: "mtd_move",
      title: "Orders split",
      message: "Restored as separate Manual and Form orders.",
    });
  }, [pair, isViewOnly, updateOrder, addNotification]);

  const displayOrder: Order | null = useMemo(() => {
    const base = pairBase;
    if (!base) return null;
    const enriched = enrichOrderWithMatchingForm(base, allOrders);
    const virocFlag = String(enriched.varsityVirocCustomer || "").toLowerCase();
    const recSubtype = String(record?.cheerFormSubtype || "");

    const virocYes =
      enriched.cheerFormSubtype === "school-cheer-viroc-yes" ||
      virocFlag === "yes" ||
      recSubtype === "school-cheer-viroc-yes";
    if (virocYes) {
      return {
        ...enriched,
        formType: "school-all-star-cheer" as const,
        cheerFormSubtype: "school-cheer-viroc-yes" as const,
        varsityVirocCustomer: "Yes" as const,
      };
    }

    const schoolCheerNo =
      enriched.cheerFormSubtype === "school-cheer-viroc-no" ||
      virocFlag === "no" ||
      recSubtype === "school-cheer-viroc-no";
    if (schoolCheerNo) {
      return {
        ...enriched,
        formType: "school-all-star-cheer" as const,
        cheerFormSubtype: "school-cheer-viroc-no" as const,
        varsityVirocCustomer: "No" as const,
      };
    }

    const youthRec =
      enriched.cheerFormSubtype === "youth-rec-cheer" ||
      recSubtype === "youth-rec-cheer";
    if (youthRec) {
      return {
        ...enriched,
        formType: "school-all-star-cheer" as const,
        cheerFormSubtype: "youth-rec-cheer" as const,
      };
    }

    const danceSubtypeRaw =
      enriched.danceFormSubtype ||
      (record as { danceFormSubtype?: string } | null)?.danceFormSubtype ||
      "";
    const danceSubtype =
      danceSubtypeRaw === "team-performance" ||
      danceSubtypeRaw.startsWith("team-performance")
        ? "team-performance-variety"
        : danceSubtypeRaw;
    if (
      enriched.formType === "school-all-star-dance" ||
      danceSubtype === "pom" ||
      danceSubtype === "hip-hop" ||
      danceSubtype === "team-performance-variety" ||
      danceSubtype === "gameday" ||
      danceSubtype === "jazz-kick"
    ) {
      return {
        ...enriched,
        formType: "school-all-star-dance" as const,
        danceFormSubtype: (danceSubtype ||
          enriched.danceFormSubtype ||
          "pom") as typeof enriched.danceFormSubtype,
      };
    }

    if (enriched.formType === "marching-band") {
      return {
        ...enriched,
        formType: "marching-band" as const,
      };
    }

    if (enriched.formType === "sports-entertainment") {
      return {
        ...enriched,
        formType: "sports-entertainment" as const,
      };
    }

    if (enriched.formType === "school-anthem") {
      return {
        ...enriched,
        formType: "school-anthem" as const,
        packageType: enriched.packageType || "SCHOOL ANTHEMS",
        package: enriched.package || "SCHOOL ANTHEMS",
      };
    }

    return enriched;
  }, [pairBase, record, allOrders]);

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

      if ((orderDraft.package || "") !== (displayOrder.package || "")) {
        updateMTD(record.id, { package: orderDraft.package || "" });
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
      return { ...prev, ...orderPatchFromOrderField(key, value, prev) };
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
          {pair ? (
            <ManualFormPairBar
              pair={pair}
              isMerged={isPairMerged}
              disabled={isViewOnly}
              onMerge={() => void handleMergePair()}
              onSplit={() => void handleSplitPair()}
            />
          ) : null}
          <MTDOrderDetails
            order={orderDraft ?? displayOrder}
            originalOrder={displayOrder}
            discountCodes={discountCodes}
            producers={producers}
            editable={orderFormEditing && !isViewOnly}
            onFieldChange={handleOrderDraftChange}
            fieldSources={fieldSources}
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
