"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, X } from "lucide-react";
import { MTDOrderDetails } from "@/components/mtd/MTDOrderDetails";
import { useAppState } from "@/context/AppStateContext";
import { findLinkedOrder } from "@/lib/editor-assignment";
import {
  buildFieldSourceMap,
  enrichOrderWithMatchingForm,
  mergeFormWinsPatches,
  resolveManualFormPair,
  splitManualFormPatches,
} from "@/lib/manual-form-merge";
import { ManualFormPairBar } from "@/components/orders/ManualFormPairBar";
import { orderFromMTDRecord, rawFieldValue } from "@/lib/order-detail-fields";
import {
  getOrderDetailSections,
  orderFormFieldsDirty,
} from "@/lib/order-detail-sections";
import {
  mtdPatchFromOrderField,
  orderPatchFromOrderField,
} from "@/lib/mtd-order-sync";
import type { MTDRecord, Order } from "@/types";

type OrderFormEditModalProps = {
  open: boolean;
  record: MTDRecord | null;
  allOrders: Order[];
  onClose: () => void;
};

export function OrderFormEditModal({
  open,
  record,
  allOrders,
  onClose,
}: OrderFormEditModalProps) {
  const {
    updateMTD,
    updateOrder,
    discountCodes,
    producers,
    isViewOnly,
    addNotification,
  } = useAppState();

  const [mounted, setMounted] = useState(false);
  const [orderDraft, setOrderDraft] = useState<Order | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const linkedBase = useMemo(() => {
    if (!record) return null;
    return findLinkedOrder(record, allOrders) ?? orderFromMTDRecord(record);
  }, [record, allOrders]);

  const pair = useMemo(() => {
    if (!linkedBase) return null;
    return resolveManualFormPair(linkedBase, allOrders);
  }, [linkedBase, allOrders]);

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

  const displayOrder = useMemo(() => {
    if (!linkedBase) return null;
    const enriched = enrichOrderWithMatchingForm(linkedBase, allOrders);
    const virocFlag = String(enriched.varsityVirocCustomer || "").toLowerCase();
    const recSubtype = String(record?.cheerFormSubtype || "");

    // Keep School Cheer / VIROC edit sections on the correct subtype form.
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
  }, [linkedBase, allOrders, record]);

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

  useEffect(() => {
    if (!open || !displayOrder) {
      setOrderDraft(null);
      return;
    }
    setOrderDraft({ ...displayOrder });
  }, [open, displayOrder]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const isDirty = useMemo(() => {
    if (!displayOrder || !orderDraft) return false;
    return orderFormFieldsDirty(displayOrder, orderDraft);
  }, [displayOrder, orderDraft]);

  const handleFieldChange = useCallback((key: string, value: string) => {
    setOrderDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, ...orderPatchFromOrderField(key, value, prev) };
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!displayOrder || !orderDraft || !record || isViewOnly || !isDirty) return;

    updateOrder(displayOrder.id, orderDraft, displayOrder);

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

    addNotification({
      type: "mtd_move",
      title: "Order details updated",
      message: "Order form changes saved successfully.",
    });
    onClose();
  }, [
    displayOrder,
    orderDraft,
    record,
    isViewOnly,
    isDirty,
    updateOrder,
    updateMTD,
    addNotification,
    onClose,
  ]);

  if (!mounted || !open || !record || !displayOrder || !orderDraft) return null;

  const title =
    displayOrder.programName ||
    displayOrder.teamName ||
    record.programName ||
    "Order form";
  const subtitle =
    displayOrder.contactName ||
    displayOrder.customerName ||
    record.contactName ||
    "Customer";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-form-edit-title"
        className="relative flex max-h-[90vh] w-full max-w-[920px] flex-col overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-brand-line/60 bg-gradient-to-br from-brand-orange/10 via-brand-elevated to-brand-signature/8 px-6 pb-5 pt-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-orange/12 text-brand-orange ring-1 ring-inset ring-brand-orange/20">
              <Pencil className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                {isViewOnly ? "Order form" : "Edit order form"}
              </p>
              <h2
                id="order-form-edit-title"
                className="mt-0.5 truncate text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
              >
                {title}
              </h2>
              <p className="mt-0.5 truncate text-[13px] text-brand-ink-secondary">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-line/60 bg-white text-brand-ink-secondary shadow-sm transition hover:border-brand-line hover:bg-brand-bg hover:text-brand-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
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
            order={orderDraft}
            originalOrder={displayOrder}
            discountCodes={discountCodes}
            producers={producers}
            editable={!isViewOnly}
            onFieldChange={handleFieldChange}
            fieldSources={fieldSources}
          />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-brand-line/60 bg-brand-bg/40 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-brand-line/70 bg-white px-4 py-2 text-[13px] font-semibold text-brand-ink-secondary shadow-sm transition hover:bg-brand-bg"
          >
            {isViewOnly ? "Close" : "Cancel"}
          </button>
          {!isViewOnly ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty}
              className="rounded-xl bg-brand-orange px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-orange-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand-orange"
            >
              Save
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
