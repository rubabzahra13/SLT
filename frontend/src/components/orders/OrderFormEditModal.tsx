"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, X } from "lucide-react";
import { MTDOrderDetails } from "@/components/mtd/MTDOrderDetails";
import { useAppState } from "@/context/AppStateContext";
import { findLinkedOrder } from "@/lib/editor-assignment";
import {
  canSplitManualFormPair,
  enrichOrderWithMatchingForm,
  resolveManualFormPair,
  splitManualFormPatches,
} from "@/lib/manual-form-merge";
import { ManualFormPairBar } from "@/components/orders/ManualFormPairBar";
import { orderFromMTDRecord, rawFieldValue } from "@/lib/order-detail-fields";
import {
  getOrderDetailSections,
  getOrderIdentityFieldKey,
  orderFormFieldsDirty,
} from "@/lib/order-detail-sections";
import {
  buildLinkedFormSyncPatch,
  mtdPatchFromOrderField,
  orderPatchFromOrderField,
} from "@/lib/mtd-order-sync";
import {
  isPersistedMtdRecord,
  mtdRecordCoversOrder,
} from "@/lib/order-staging";
import { resolveOrderFormDisplay } from "@/lib/order-form-display";
import { formatDisplayDateTime } from "@/lib/dates";
import type { MTDRecord, Order } from "@/types";

type OrderFormEditModalProps = {
  open: boolean;
  record: MTDRecord | null;
  allOrders: Order[];
  /** Optional board row index — unused in the header (no IDs in UI). */
  rowId?: number | null;
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
    mtdRecords,
    discountCodes,
    producers,
    isViewOnly,
    addAlert,
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

  const displayOrder = useMemo(() => {
    if (!linkedBase) return null;
    const enriched = enrichOrderWithMatchingForm(linkedBase, allOrders);
    // Same form sections as Add New Order — formType wins over stale subtypes.
    return resolveOrderFormDisplay(enriched, record);
  }, [linkedBase, allOrders, record]);

  const handleSplitPair = useCallback(async () => {
    if (!pair || isViewOnly) return;
    if (!canSplitManualFormPair(pair.manual, pair.form)) return;
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
    addAlert({
      tone: "success",
      title: "Orders split",
      message: "Restored as separate Manual and Form orders.",
    });
  }, [pair, isViewOnly, updateOrder, addAlert]);

  useEffect(() => {
    if (!open || !displayOrder) {
      setOrderDraft(null);
      return;
    }
    // Same SoT columns as Add New — keep existing values; do not blank form-
    // specific Magento fields (that would wipe power_music_covers / voiceovers
    // on save when this form does not show those inputs).
    setOrderDraft({
      ...displayOrder,
      songListSuggestions: String(displayOrder.songListSuggestions || "").trim(),
    });
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

  const handleSave = useCallback(async () => {
    if (!displayOrder || !orderDraft || !record || isViewOnly || !isDirty) return;

    // Order is source of truth for form fields. Same column mapping as Add New
    // (updateOrder → updateOrderApi). Only patch a real mtd_records row when one
    // already covers this order — never PATCH /api/mtd/{orderId} (synthetic
    // staging rows use the order UUID as id → 404).
    const editorInitials =
      orderDraft.requestedEditor === "First Available" ||
      !orderDraft.requestedEditor
        ? "FA"
        : orderDraft.editorRequest || orderDraft.requestedEditor;
    const savePatch: Partial<Order> = {
      ...orderDraft,
      editorRequest: editorInitials,
      requestedProducer: orderDraft.requestedEditor || "",
      sendingEightCountSheets:
        orderDraft.sendingEightCountSheets ||
        orderDraft.usingEightCountSheets ||
        "",
      usingEightCountSheets:
        orderDraft.sendingEightCountSheets ||
        orderDraft.usingEightCountSheets ||
        "",
    };

    try {
      await updateOrder(displayOrder.id, savePatch, displayOrder);

      // Paired Magento form is SoT on reload (form-wins). Keep it in sync so
      // edits on the manual slot are not revived from the stale form row.
      if (pair?.form?.id && pair.form.id !== displayOrder.id) {
        await updateOrder(
          pair.form.id,
          buildLinkedFormSyncPatch(orderDraft),
          pair.form
        );
      }
    } catch {
      // updateOrder already notifies on failure.
      return;
    }

    const coveringMtd = mtdRecords.find(
      (rec) =>
        isPersistedMtdRecord(rec) && mtdRecordCoversOrder(rec, displayOrder)
    );
    const mtdTargetId = coveringMtd
      ? coveringMtd.uuid || coveringMtd.id
      : null;

    if (mtdTargetId) {
      const sections = getOrderDetailSections(displayOrder);
      for (const section of sections) {
        for (const field of section.fields) {
          const nextValue = rawFieldValue(orderDraft, field.key);
          const prevValue = rawFieldValue(displayOrder, field.key);
          if (nextValue === prevValue) continue;
          const mtdPatch = mtdPatchFromOrderField(field.key, nextValue);
          if (
            field.key === "songListSuggestions" ||
            field.key === "powerMusicCovers" ||
            field.key === "unleashTheBeatsCovers" ||
            field.key === "customerSongs" ||
            field.key === "routineNotes" ||
            field.key === "additionalNotes" ||
            field.key === "timeLengthOfMix"
          ) {
            const prevStates =
              (coveringMtd?.collectionStates as
                | Record<string, unknown>
                | undefined) ||
              (record.collectionStates as Record<string, unknown> | undefined) ||
              {};
            const nextStates = { ...prevStates };
            if (
              field.key === "songListSuggestions" ||
              field.key === "powerMusicCovers" ||
              field.key === "unleashTheBeatsCovers" ||
              field.key === "customerSongs"
            ) {
              delete nextStates.songs;
            }
            if (
              field.key === "routineNotes" ||
              field.key === "additionalNotes"
            ) {
              delete nextStates.notes;
            }
            if (field.key === "timeLengthOfMix") {
              delete nextStates.mix;
              delete nextStates.time_of_mix;
            }
            void updateMTD(mtdTargetId, {
              ...mtdPatch,
              collectionStates: nextStates as MTDRecord["collectionStates"],
            });
          } else if (Object.keys(mtdPatch).length > 0) {
            void updateMTD(mtdTargetId, mtdPatch);
          }
        }
      }

      if ((orderDraft.package || "") !== (displayOrder.package || "")) {
        void updateMTD(mtdTargetId, { package: orderDraft.package || "" });
      }
    }

    addAlert({
      tone: "success",
      title: "Order details updated",
      message: "Order form changes saved successfully.",
    });
    onClose();
  }, [
    displayOrder,
    orderDraft,
    record,
    pair,
    mtdRecords,
    isViewOnly,
    isDirty,
    updateOrder,
    updateMTD,
    addAlert,
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
  const createdLabel = formatDisplayDateTime(displayOrder.createdAt);

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
              {createdLabel !== "—" ? (
                <p className="mt-1 text-[12px] tabular-nums text-brand-ink-tertiary">
                  Timestamp {createdLabel}
                </p>
              ) : null}
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
              disabled={isViewOnly}
              manual={pair.manual}
              form={pair.form}
              onConfirmSplit={handleSplitPair}
            />
          ) : null}
          <MTDOrderDetails
            order={orderDraft}
            originalOrder={displayOrder}
            discountCodes={discountCodes}
            producers={producers}
            editable={!isViewOnly}
            onFieldChange={handleFieldChange}
            // Admin forms: only identity name is required; other empties stay quiet.
            requiredFieldKeys={
              orderDraft
                ? [
                    getOrderIdentityFieldKey(
                      orderDraft.formType,
                      orderDraft.cheerFormSubtype,
                      orderDraft.danceFormSubtype
                    ),
                  ]
                : []
            }
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
