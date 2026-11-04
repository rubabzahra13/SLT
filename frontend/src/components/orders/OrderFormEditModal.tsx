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
import { resolveFinalMatchedOrder } from "@/lib/order-form-missing";
import { ManualFormPairBar } from "@/components/orders/ManualFormPairBar";
import { orderFromMTDRecord, rawFieldValue } from "@/lib/order-detail-fields";
import {
  getOrderDetailSections,
  orderFormFieldsDirty,
} from "@/lib/order-detail-sections";
import {
  buildLinkedFormSyncPatch,
  buildOrderFormDirtyPatch,
  mtdPatchFromOrderField,
  orderPatchFromOrderField,
} from "@/lib/mtd-order-sync";
import {
  isPersistedMtdRecord,
  mtdRecordCoversOrder,
} from "@/lib/order-staging";
import { resolveOrderFormDisplay } from "@/lib/order-form-display";
import { syncOrdersAfterSplit } from "@/lib/orders-board-cache";
import { isManualSlimFormOrder } from "@/lib/add-order-mixes";
import { formatDisplayDateTime } from "@/lib/dates";
import type { MTDRecord, Order } from "@/types";

type OrderFormEditModalProps = {
  open: boolean;
  record: MTDRecord | null;
  allOrders: Order[];
  /** Optional board row index: unused in the header (no IDs in UI). */
  rowId?: number | null;
  /**
   * Match Orders: show the full Magento field set even on unmatched manuals
   * so required Magento form fields (city, ZIP, …) can be filled before match.
   */
  fullFormFields?: boolean;
  /** Render above another modal (e.g. Match confirm). */
  elevated?: boolean;
  onClose: () => void;
};

export function OrderFormEditModal({
  open,
  record,
  allOrders,
  fullFormFields = false,
  elevated = false,
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
  const [saving, setSaving] = useState(false);

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
    // Matched: Magento-wins finals (same as MTD gate). Unmatched: soft enrich.
    const enriched = pair
      ? resolveFinalMatchedOrder(linkedBase, allOrders)
      : enrichOrderWithMatchingForm(linkedBase, allOrders);
    // Same form sections as Add New Order: formType wins over stale subtypes.
    return resolveOrderFormDisplay(enriched, record);
  }, [linkedBase, allOrders, record, pair]);

  const handleSplitPair = useCallback(async () => {
    if (!pair || isViewOnly) return;
    if (!canSplitManualFormPair(pair.manual, pair.form)) return;
    const { manualPatch, formPatch } = splitManualFormPatches(
      pair.manual,
      pair.form
    );
    const undoSplitCaches = syncOrdersAfterSplit({
      manual: { ...pair.manual, ...manualPatch },
      form: { ...pair.form, ...formPatch },
    });
    try {
      await Promise.all([
        updateOrder(pair.manual.id, manualPatch, pair.manual),
        updateOrder(pair.form.id, formPatch, pair.form),
      ]);
    } catch (err) {
      undoSplitCaches();
      throw err;
    }
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
      setSaving(false);
      return;
    }
    // Same SoT columns as Add New: keep existing values; do not blank form-
    // specific Magento fields (that would wipe power_music_covers / voiceovers
    // on save when this form does not show those inputs).
    setSaving(false);
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
    if (
      !displayOrder ||
      !orderDraft ||
      !record ||
      isViewOnly ||
      !isDirty ||
      saving
    ) {
      return;
    }

    // Only changed form fields — spreading the whole draft made Save wait on a
    // fat PATCH (and optional second paired-form write).
    const savePatch = buildOrderFormDirtyPatch(displayOrder, orderDraft);
    if (Object.keys(savePatch).length === 0) {
      onClose();
      return;
    }

    if (
      savePatch.requestedEditor !== undefined ||
      savePatch.requestedProducer !== undefined
    ) {
      const editorInitials =
        orderDraft.requestedEditor === "First Available" ||
        !orderDraft.requestedEditor
          ? "FA"
          : orderDraft.editorRequest || orderDraft.requestedEditor;
      savePatch.editorRequest = editorInitials;
      savePatch.requestedProducer = orderDraft.requestedEditor || "";
    }
    if (
      savePatch.sendingEightCountSheets !== undefined ||
      savePatch.usingEightCountSheets !== undefined
    ) {
      const eight =
        orderDraft.sendingEightCountSheets ||
        orderDraft.usingEightCountSheets ||
        "";
      savePatch.sendingEightCountSheets = eight;
      savePatch.usingEightCountSheets = eight;
    }

    const coveringMtd = mtdRecords.find(
      (rec) =>
        isPersistedMtdRecord(rec) && mtdRecordCoversOrder(rec, displayOrder)
    );
    const mtdTargetId = coveringMtd
      ? coveringMtd.uuid || coveringMtd.id
      : null;

    // One combined MTD write for changed fields (was N sequential patches).
    const combinedMtd: Partial<MTDRecord> = {};
    if (mtdTargetId) {
      let nextStates:
        | Record<string, unknown>
        | undefined;
      for (const section of getOrderDetailSections(displayOrder)) {
        for (const field of section.fields) {
          const nextValue = rawFieldValue(orderDraft, field.key);
          const prevValue = rawFieldValue(displayOrder, field.key);
          if (nextValue === prevValue) continue;
          Object.assign(
            combinedMtd,
            mtdPatchFromOrderField(field.key, nextValue)
          );
          if (
            field.key === "songListSuggestions" ||
            field.key === "powerMusicCovers" ||
            field.key === "unleashTheBeatsCovers" ||
            field.key === "customerSongs" ||
            field.key === "routineNotes" ||
            field.key === "additionalNotes" ||
            field.key === "timeLengthOfMix"
          ) {
            if (!nextStates) {
              nextStates = {
                ...((coveringMtd?.collectionStates as
                  | Record<string, unknown>
                  | undefined) ||
                  (record.collectionStates as
                    | Record<string, unknown>
                    | undefined) ||
                  {}),
              };
            }
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
          }
        }
      }

      if ((orderDraft.package || "") !== (displayOrder.package || "")) {
        combinedMtd.package = orderDraft.package || "";
      }
      if (nextStates) {
        combinedMtd.collectionStates =
          nextStates as MTDRecord["collectionStates"];
      }
    }

    // Table rows patch optimistically inside updateOrder; close now and let
    // the writes finish in the background (failures roll back + toast).
    const linkedFormPatch =
      pair?.form?.id && pair.form.id !== displayOrder.id
        ? buildLinkedFormSyncPatch(orderDraft)
        : null;
    void (async () => {
      await updateOrder(displayOrder.id, savePatch, displayOrder);
      // Paired Magento form is SoT on reload (form-wins). Keep it in sync so
      // edits on the manual slot are not revived from the stale form row.
      if (pair?.form && linkedFormPatch) {
        await updateOrder(pair.form.id, linkedFormPatch, pair.form);
      }
      if (mtdTargetId && Object.keys(combinedMtd).length > 0) {
        await updateMTD(mtdTargetId, combinedMtd);
      }
    })().catch(() => {
      /* updateOrder / updateMTD already notify on failure */
    });

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
    saving,
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

  const useSlimManualFields =
    !fullFormFields && isManualSlimFormOrder(orderDraft);

  return createPortal(
    <div
      className={
        fullFormFields || elevated
          ? "fixed inset-0 z-[110] flex items-center justify-center p-4"
          : "fixed inset-0 z-[100] flex items-center justify-center p-4"
      }
    >
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
              {createdLabel !== "-" ? (
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
            manualAddSlim={useSlimManualFields}
            // Admin edit: never show the old "- required" / identity star cues.
            highlightMissing={false}
            requiredFieldKeys={[]}
          />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-brand-line/60 bg-brand-bg/40 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-brand-line/70 bg-white px-4 py-2 text-[13px] font-semibold text-brand-ink-secondary shadow-sm transition hover:bg-brand-bg disabled:opacity-50"
          >
            {isViewOnly ? "Close" : "Cancel"}
          </button>
          {!isViewOnly ? (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!isDirty || saving}
              className="rounded-xl bg-brand-orange px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-orange-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand-orange"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
