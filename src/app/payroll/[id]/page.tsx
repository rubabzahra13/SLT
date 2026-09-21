"use client";

import { use, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, X, DollarSign, CalendarCheck, FileText, CheckCircle2, RotateCcw } from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "@/components/layout/PageHeader";
import { AttentionFlag } from "@/components/ui/AttentionFlag";
import { Avatar } from "@/components/ui/Avatar";
import {
  DetailInput,
  DetailTextarea,
  InlineDateInput,
  InlineInput,
  InlineTriStateCheckGroup,
  InlineDanceVoiceoverPills,
  InlineCheerVoiceoverPills,
  InlineRushFeePills,
  InlineQuantityStepper,
} from "@/components/mtd/InlineFields";
import { resolveMTDFormMeta, getRecordMusicAffiliateInfo } from "@/lib/mtd-filters";
import {
  AssignEditorModal,
  type EditorAssignmentResult,
} from "@/components/mtd/AssignEditorModal";
import { MTDOrderDetails, formatDetailDisplay } from "@/components/mtd/MTDOrderDetails";
import { SetRecordPricingModal } from "@/components/mtd/SetRecordPricingModal";
import { SetPricingModal } from "@/components/mtd/SetPricingModal";
import { ReturnToMTDModal } from "@/components/mtd/ReturnToMTDModal";
import { useAppState } from "@/context/AppStateContext";
import { formatPrice, titleCase } from "@/lib/data";
import { formatDisplayDate, toIsoDateString } from "@/lib/dates";
import { orderFromMTDRecord, rawFieldValue } from "@/lib/order-detail-fields";
import { getOrderDetailSections } from "@/lib/order-detail-sections";
import { findLinkedOrder, findProducerByAssignmentKey } from "@/lib/editor-assignment";
import { patchReturnFromPayroll } from "@/lib/mtd-completion";
import { computeClientPayroll } from "@/lib/pricing-display";
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
  orderPatchFromMTD,
  orderPatchFromOrderField,
} from "@/lib/mtd-order-sync";
import { complianceLabel } from "@/lib/pricing";
import { formatSlotForDisplay } from "@/lib/scheduling";
import {
  ORDER_FORM_TABS,
  type MTDRecord,
  type Order,
  type PriceCompliance,
} from "@/types";

type SpreadsheetDraft = {
  contactName: string;
  package: string;
  invoice: string;
  mixStartDate: string;
  mixEndDate: string;
  musicTheme: string;
  eightCountSheet: string;
  haveSongs: string;
  price: number;
  priceCompliance: PriceCompliance;
};

function spreadsheetDraftFromRec(rec: MTDRecord): SpreadsheetDraft {
  return {
    contactName: rec.contactName,
    package: rec.package,
    invoice: rec.invoice ?? "",
    mixStartDate: rec.mixStartDate ?? "",
    mixEndDate: rec.mixEndDate ?? "",
    musicTheme: rec.musicTheme,
    eightCountSheet: rec.eightCountSheet,
    haveSongs: rec.haveSongs,
    price: rec.price,
    priceCompliance: rec.priceCompliance,
  };
}

const clickableChipClass =
  "cursor-pointer border border-brand-line/60 bg-brand-elevated shadow-sm transition hover:border-brand-orange/50 hover:bg-brand-orange-soft/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/30";

export default function PayrollDetailPage({
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
    packagePrices,
    producers,
    schedule,
    discountCodes,
    isViewOnly,
    isLoading,
  } = useAppState();

  const [assignOpen, setAssignOpen] = useState(false);
  const [recordPricingOpen, setRecordPricingOpen] = useState(false);
  const [packagePricingOpen, setPackagePricingOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [spreadsheetEditing, setSpreadsheetEditing] = useState(false);
  const [spreadsheetDraft, setSpreadsheetDraft] = useState<SpreadsheetDraft | null>(null);
  const [orderFormEditing, setOrderFormEditing] = useState(false);
  const [orderDraft, setOrderDraft] = useState<Order | null>(null);

  const rec = useMemo(
    () =>
      mtdRecords.find(
        (r) => r.id === id || r.orderId === id || r.uuid === id || r.legacyId === id
      ),
    [mtdRecords, id]
  );

  const orderById = useMemo(
    () => new Map(allOrders.map((order) => [order.id, order])),
    [allOrders]
  );

  const linkedOrder = rec ? findLinkedOrder(rec, allOrders) : undefined;
  const order = useMemo(
    () => (rec ? orderFromMTDRecord(rec, linkedOrder, orderById) : null),
    [rec, linkedOrder, orderById, allOrders]
  );

  const assignedProducerObj = useMemo(() => {
    if (!rec?.assignedProducer) return undefined;
    return findProducerByAssignmentKey(rec.assignedProducer, producers);
  }, [rec, producers]);

  const formLabel = ORDER_FORM_TABS.find((tab) => tab.id === order?.formType)?.label;

  const syncLinkedOrder = useCallback(
    (mtdPatch: Partial<MTDRecord>) => {
      if (!linkedOrder) return;
      const orderPatch = orderPatchFromMTD(mtdPatch);
      if (Object.keys(orderPatch).length > 0) {
        updateOrder(linkedOrder.id, orderPatch);
      }
    },
    [linkedOrder, updateOrder]
  );

  const patchMTD = useCallback(
    (patch: Parameters<typeof updateMTD>[1]) => {
      if (!rec) return;
      updateMTD(rec.id, patch);
      syncLinkedOrder(patch);
    },
    [rec, updateMTD, syncLinkedOrder]
  );

  const handleAssign = useCallback(
    (recordId: string, result: EditorAssignmentResult) => {
      updateMTD(recordId, {
        editorRequest: result.editorRequest,
        assignedProducer: result.assignedProducer,
        ...(result.mixStartDate ? { mixStartDate: result.mixStartDate } : {}),
        ...(result.mixEndDate ? { mixEndDate: result.mixEndDate } : {}),
        ...(result.recordStatus
          ? {
              recordStatus: result.recordStatus,
              ...(result.status ? { status: result.status } : {}),
            }
          : {}),
      });
    },
    [updateMTD]
  );

  const handleRecordPricingSave = useCallback(
    (
      _recordId: string,
      patch: { price: number; priceCompliance: PriceCompliance }
    ) => {
      if (spreadsheetEditing && spreadsheetDraft) {
        setSpreadsheetDraft((prev) => (prev ? { ...prev, ...patch } : prev));
        return;
      }
      patchMTD(patch);
      if (linkedOrder) {
        updateOrder(linkedOrder.id, patch);
      } else if (order) {
        updateOrder(order.id, patch, order);
      }
    },
    [spreadsheetEditing, spreadsheetDraft, patchMTD, linkedOrder, order, updateOrder]
  );

  const startSpreadsheetEdit = useCallback(() => {
    if (isViewOnly || !rec) return;
    setSpreadsheetDraft(spreadsheetDraftFromRec(rec));
    setSpreadsheetEditing(true);
  }, [rec, isViewOnly]);

  const cancelSpreadsheetEdit = useCallback(() => {
    setSpreadsheetDraft(null);
    setSpreadsheetEditing(false);
  }, []);

  const saveSpreadsheetEdit = useCallback(() => {
    if (!rec || !spreadsheetDraft) return;
    patchMTD({
      contactName: spreadsheetDraft.contactName,
      package: spreadsheetDraft.package,
      invoice: spreadsheetDraft.invoice,
      mixStartDate: spreadsheetDraft.mixStartDate,
      mixEndDate: spreadsheetDraft.mixEndDate,
      musicTheme: spreadsheetDraft.musicTheme,
      eightCountSheet: spreadsheetDraft.eightCountSheet,
      haveSongs: spreadsheetDraft.haveSongs,
      price: spreadsheetDraft.price,
      priceCompliance: spreadsheetDraft.priceCompliance,
    });
    setSpreadsheetDraft(null);
    setSpreadsheetEditing(false);
  }, [rec, spreadsheetDraft, patchMTD]);

  const startOrderFormEdit = useCallback(() => {
    if (isViewOnly || !order) return;
    setOrderDraft({ ...order });
    setOrderFormEditing(true);
  }, [order, isViewOnly]);

  const cancelOrderFormEdit = useCallback(() => {
    setOrderDraft(null);
    setOrderFormEditing(false);
  }, []);

  const saveOrderFormEdit = useCallback(() => {
    if (!rec || !order || !orderDraft) return;
    const orderId = linkedOrder?.id ?? order.id;
    updateOrder(orderId, orderDraft, linkedOrder ?? order);

    const sections = getOrderDetailSections(order);
    for (const section of sections) {
      for (const field of section.fields) {
        const nextValue = rawFieldValue(orderDraft, field.key);
        const prevValue = rawFieldValue(order, field.key);
        if (nextValue === prevValue) continue;
        const mtdPatch = mtdPatchFromOrderField(field.key, nextValue);
        if (Object.keys(mtdPatch).length > 0) {
          updateMTD(rec.id, mtdPatch);
        }
      }
    }

    setOrderDraft(null);
    setOrderFormEditing(false);
  }, [rec, order, orderDraft, linkedOrder, updateOrder, updateMTD]);

  const handleOrderDraftChange = useCallback((key: string, value: string) => {
    setOrderDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, ...orderPatchFromOrderField(key, value) };
    });
  }, []);

  const updateSpreadsheetDraft = useCallback(
    (patch: Partial<SpreadsheetDraft>) => {
      setSpreadsheetDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    },
    []
  );

  const confirmReturnToMTD = useCallback(() => {
    if (!rec) return;
    updateMTD(rec.id, patchReturnFromPayroll());
    setReturnModalOpen(false);
    window.location.href = "/payroll";
  }, [rec, updateMTD]);

  if (isLoading && (!rec || !order)) {
    return (
      <div className="space-y-6 px-6 pb-8 pt-6 lg:px-8">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-brand-line/40" />
        <div className="dashboard-panel h-48 animate-pulse p-6" />
        <div className="dashboard-panel h-96 animate-pulse p-6" />
      </div>
    );
  }

  if (!rec || !order) {
    return (
      <div className="p-8 text-center text-brand-ink-tertiary">
        <p className="text-[15px] font-semibold">Payroll record not found</p>
        <Link href="/payroll" className="mt-3 inline-block text-[13px] text-brand-blue hover:underline">
          ← Return to Payroll
        </Link>
      </div>
    );
  }

  const meta = resolveMTDFormMeta(rec, orderById);
  const custPrice = order?.finalCustomerPrice ?? rec.finalCustomerPrice ?? rec.price;
  const payrollPrice = rec.finalPayrollPrice ?? order?.finalPayrollPrice ?? rec.price;
  const rushQty = typeof rec.rushFeeQuantity === "number"
    ? rec.rushFeeQuantity
    : rec.rushFeeOption === "double"
    ? 2
    : rec.rushFeeOption === "single" || rec.isRushOrder === "yes" || rec.isRushOrder === true
    ? 1
    : 0;

  const payrollCalc = computeClientPayroll(
    assignedProducerObj,
    custPrice,
    null,
    rec.rateUsed ?? order?.rateUsed ?? null,
    rec.manualPayoutInput ?? null,
    meta.canonicalSubtypeId,
    payrollPrice,
    {
      rushFeeQuantity: rushQty,
      rushFeeCompensationRate: rec.rushFeeCompensationRate ?? assignedProducerObj?.rushFeeRate ?? 1.0,
      danceVoiceover: rec.danceVoiceover,
      hasTraditionalVoiceover: rec.hasTraditionalVoiceover,
      hasThemedVoiceover: rec.hasThemedVoiceover,
      cheerVoiceover20: rec.cheerVoiceover20,
      cheerVoiceover40: rec.cheerVoiceover40,
      formType: meta.formType,
    }
  );

  const producerPayout = payrollCalc.producerPayout ?? rec.producerPayout ?? order?.producerPayout ?? 0;
  const sheet = spreadsheetDraft ?? spreadsheetDraftFromRec(rec);
  const eightCsState = parseEightCsState(rec.eightCountSheet ?? "");
  const songsState = parseSongsState(rec.haveSongs ?? "");
  const slotLabel = rec.assignedProducer
    ? formatSlotForDisplay(rec.assignedProducer, producers, schedule)
    : null;
  const orderForm = orderDraft ?? order;
  const isCheer = meta.formType === "school-all-star-cheer";
  const isDance = meta.formType === "school-all-star-dance";

  const handleMixStartChange = (next: string) => {
    let nextEnd = sheet.mixEndDate || rec.mixEndDate;
    if (next && !nextEnd) {
      const d = new Date(next);
      d.setDate(d.getDate() + 7);
      nextEnd = d.toISOString().slice(0, 10);
    }
    if (spreadsheetEditing) {
      updateSpreadsheetDraft({ mixStartDate: next, mixEndDate: nextEnd ?? "" });
      return;
    }
    patchMTD({ mixStartDate: next, mixEndDate: nextEnd });
  };

  const handleMixEndChange = (next: string) => {
    if (spreadsheetEditing) {
      updateSpreadsheetDraft({ mixEndDate: next });
      return;
    }
    patchMTD({ mixEndDate: next });
  };

  return (
    <>
      <PageHeader
        title={formatDetailDisplay(rec.programName) || rec.programName}
        subtitle={`${rec.contactName || "Customer"} · Payroll Detail`}
        badge={rec.invoice?.trim() ? `#${rec.invoice.trim()}` : undefined}
        secondaryAction={{
          label: "Pricing",
          onClick: () => setPackagePricingOpen(true),
          showPlus: false,
        }}
        action={{
          label: "← Back to Payroll",
          onClick: () => {
            window.location.href = "/payroll";
          },
          showPlus: false,
        }}
      />

      <div className="space-y-6 px-6 pb-8 pt-5 lg:px-8">
        {/* PAYROLL-SPECIFIC SUMMARY CARD LAYERED ON TOP */}
        <section className="dashboard-panel border-2 border-brand-success/30 bg-brand-bg-elevated p-6 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-line/40 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-success/15 text-brand-success ring-1 ring-inset ring-brand-success/30">
                <DollarSign className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <div>
                <h2 className="text-[15px] font-bold tracking-tight text-brand-ink">
                  Payroll & Compensation Summary
                </h2>
                <p className="text-[12px] text-brand-ink-tertiary">
                  Completed record breakdown for producer payout
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isViewOnly && (
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-brand-line/60 bg-brand-elevated px-3 py-1.5 text-[12px] font-semibold text-brand-signature shadow-sm transition hover:border-brand-signature/40 hover:bg-brand-blue-soft/40"
                >
                  <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Return to MTD</span>
                </button>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-success/15 px-3 py-1 text-[12px] font-bold text-brand-success ring-1 ring-inset ring-brand-success/30">
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                Status: Completed / In Payroll
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* PRODUCER PAYOUT TILE */}
            <div className="rounded-2xl border border-brand-success/30 bg-brand-success/5 p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                Producer Payout
              </span>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <p className="text-[22px] font-bold tabular-nums text-brand-success">
                  {formatPrice(producerPayout)}
                </p>
                {payrollCalc.rateUsed !== null && (
                  <span className="rounded-md bg-brand-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-success ring-1 ring-inset ring-brand-success/25">
                    {Math.round(payrollCalc.rateUsed * 100)}% Rate
                  </span>
                )}
              </div>
              <p className="mt-1.5 truncate text-[11px] font-medium text-brand-ink-tertiary">
                {assignedProducerObj ? `${assignedProducerObj.name} (${assignedProducerObj.initials})` : "No producer assigned"}
              </p>
            </div>

            {/* PACKAGE PRICE TILE */}
            <div className="rounded-2xl border border-brand-line/40 bg-brand-bg-subtle/50 p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                Package Price
              </span>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <p className="text-[22px] font-bold tabular-nums text-brand-ink">
                  {formatPrice(custPrice)}
                </p>
                <span
                  className={clsx(
                    "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset",
                    rec.priceCompliance === "compliant"
                      ? "bg-brand-signature/10 text-brand-signature ring-brand-signature/20"
                      : "bg-brand-orange/10 text-brand-orange ring-brand-orange/20"
                  )}
                >
                  {complianceLabel(rec.priceCompliance)}
                </span>
              </div>
              <p className="mt-1.5 truncate text-[11px] font-medium text-brand-ink-tertiary">
                {rec.package}
              </p>
            </div>

            {/* COMPLETED DATE TILE */}
            <div className="rounded-2xl border border-brand-line/40 bg-brand-bg-subtle/50 p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                Completed Date
              </span>
              <div className="mt-2 flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-brand-blue" strokeWidth={2} />
                <p className="text-[18px] font-bold tabular-nums text-brand-ink">
                  {rec.completedAt ? formatDisplayDate(rec.completedAt.slice(0, 10)) : "—"}
                </p>
              </div>
              <p className="mt-1.5 text-[11px] font-medium text-brand-ink-tertiary">
                Finalized and moved to payroll
              </p>
            </div>

            {/* PAYOUT BREAKDOWN TILE */}
            <div className="rounded-2xl border border-brand-line/40 bg-brand-bg-subtle/50 p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                Payout Breakdown
              </span>
              <div className="mt-2 space-y-1 text-[11px] font-medium">
                <div className="flex justify-between text-brand-ink-secondary">
                  <span>Base Category:</span>
                  <span className="tabular-nums font-semibold text-brand-ink">
                    {formatPrice(payrollCalc.categoryPayout ?? 0)}
                  </span>
                </div>
                {Boolean(payrollCalc.voiceoverPayout) && (
                  <div className="flex justify-between text-brand-ink-secondary">
                    <span>Voiceover Add-on:</span>
                    <span className="tabular-nums font-semibold text-brand-success">
                      +{formatPrice(payrollCalc.voiceoverPayout ?? 0)}
                    </span>
                  </div>
                )}
                {Boolean(payrollCalc.rushFeePayout) && (
                  <div className="flex justify-between text-brand-ink-secondary">
                    <span>Rush Fee Payout:</span>
                    <span className="tabular-nums font-semibold text-brand-success">
                      +{formatPrice(payrollCalc.rushFeePayout ?? 0)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-brand-line/30 pt-1 text-brand-ink-tertiary">
                  <span>SLT Split Portion:</span>
                  <span className="tabular-nums font-semibold text-brand-ink-secondary">
                    {formatPrice(payrollCalc.sltPortion ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* VOICEOVER SELECTION & PAYOUT BREAKDOWN BAR */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-line/40 bg-brand-bg/60 p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-brand-orange" strokeWidth={2} />
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-brand-ink">
                  Voiceover Selection & Compensation
                </p>
                <p className="text-[11px] text-brand-ink-tertiary">
                  {isDance
                    ? `Dance VO: Traditional ($25) / Themed ($75) / Both ($100)`
                    : isCheer
                    ? `Cheer VO: $20 / $40 add-on options`
                    : `Category Voiceover options`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {isDance && (
                <div onClick={(e) => e.stopPropagation()}>
                  <InlineDanceVoiceoverPills
                    record={rec}
                    readOnly={isViewOnly}
                    onUpdate={(_id, patch) => patchMTD(patch)}
                  />
                </div>
              )}
              {isCheer && (
                <div onClick={(e) => e.stopPropagation()}>
                  <InlineCheerVoiceoverPills
                    record={rec}
                    readOnly={isViewOnly}
                    onUpdate={(_id, patch) => patchMTD(patch)}
                  />
                </div>
              )}
              <div className="rounded-lg bg-brand-success/10 px-3 py-1.5 text-right">
                <span className="block text-[9px] font-bold uppercase tracking-[0.06em] text-brand-ink-tertiary">
                  VO Payout
                </span>
                <span className="text-[13px] font-bold tabular-nums text-brand-success">
                  {formatPrice(payrollCalc.voiceoverPayout ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* BASE MTD SPREADSHEET OPERATIONAL SECTION (REUSED STRUCTURE) */}
        <section className="dashboard-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-line/40 pb-4">
            <div>
              <p className="text-[12px] text-brand-ink-tertiary">
                {rec.section}
                {formLabel ? ` · ${formLabel}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {rec.needsAttention ? (
                <AttentionFlag reason="Missing materials or order form items" />
              ) : null}
              <DetailSectionActions
                editing={spreadsheetEditing}
                onEdit={startSpreadsheetEdit}
                onCancel={cancelSpreadsheetEdit}
                onSave={saveSpreadsheetEdit}
                editLabel="Edit spreadsheet fields"
              />
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-brand-line/40 bg-brand-bg/40">
            <div className="grid grid-cols-1 divide-y divide-brand-line/35 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="flex min-h-[48px] items-center gap-2.5 px-3 py-2">
                <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-[0.07em] text-brand-ink-tertiary">
                  Editor
                </span>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  {assignedProducerObj ? (
                    <div
                      className="flex min-w-0 items-center gap-1.5"
                      title={
                        rec.editorRequest === "FA"
                          ? "First available request"
                          : assignedProducerObj.name
                      }
                    >
                      <Avatar producer={assignedProducerObj} size="xs" />
                      <p className="truncate text-[12px] font-semibold text-brand-ink">
                        {assignedProducerObj.name}
                      </p>
                    </div>
                  ) : rec.editorRequest === "NA" ? (
                    <span className="text-[12px] font-medium text-brand-ink-tertiary">
                      Not assigned
                    </span>
                  ) : (
                    <span className="text-[12px] font-medium text-brand-ink-tertiary">
                      Unassigned
                    </span>
                  )}

                  {(assignedProducerObj || rec.assignedProducer) && (
                    <button
                      type="button"
                      onClick={() => setAssignOpen(true)}
                      className="shrink-0 rounded-md bg-brand-blue/10 px-2 py-0.5 text-[11px] font-semibold text-brand-blue transition hover:bg-brand-blue/20"
                    >
                      View
                    </button>
                  )}
                  {!assignedProducerObj && !rec.assignedProducer && rec.editorRequest !== "NA" && (
                    <button
                      type="button"
                      onClick={() => setAssignOpen(true)}
                      className="shrink-0 rounded-md bg-brand-orange px-2 py-0.5 text-[11px] font-semibold text-white transition hover:bg-brand-orange-hover"
                    >
                      Assign
                    </button>
                  )}
                </div>
              </div>

              <div
                className="flex min-h-[48px] items-center gap-2 px-3 py-2"
                title={slotLabel ? `Next available slot: ${slotLabel}` : undefined}
              >
                <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-[0.07em] text-brand-ink-tertiary">
                  Start
                </span>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <InlineDateInput
                    value={sheet.mixStartDate}
                    readOnly={isViewOnly}
                    onChange={handleMixStartChange}
                    className="min-h-[30px] min-w-0 flex-1 py-1"
                  />
                  {slotLabel ? (
                    <span className="hidden max-w-[128px] truncate text-[10px] font-medium text-brand-signature xl:inline">
                      {slotLabel}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex min-h-[48px] items-center gap-2 px-3 py-2">
                <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-[0.07em] text-brand-ink-tertiary">
                  End
                </span>
                <InlineDateInput
                  value={sheet.mixEndDate}
                  readOnly={isViewOnly}
                  onChange={handleMixEndChange}
                  className="min-h-[30px] min-w-0 flex-1 py-1"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FieldTile label="Price">
              {spreadsheetEditing ? (
                <button
                  type="button"
                  onClick={() => setRecordPricingOpen(true)}
                  title="Edit pricing"
                  aria-label={`Edit pricing ${formatPrice(sheet.price)}`}
                  className={clsx(
                    clickableChipClass,
                    "w-full rounded-lg px-3 py-2 text-left"
                  )}
                >
                  <p className="text-[13px] font-semibold tabular-nums text-brand-ink hover:text-brand-orange">
                    {formatPrice(sheet.price)}
                  </p>
                  <p
                    className={clsx(
                      "text-[11px] font-medium",
                      sheet.priceCompliance === "compliant"
                        ? "text-brand-signature"
                        : "text-brand-orange"
                    )}
                  >
                    {complianceLabel(sheet.priceCompliance)}
                  </p>
                </button>
              ) : (
                <div>
                  <p className="text-[13px] font-semibold tabular-nums text-brand-ink">
                    {formatPrice(rec.price)}
                  </p>
                  <p
                    className={clsx(
                      "text-[11px] font-medium",
                      rec.priceCompliance === "compliant"
                        ? "text-brand-signature"
                        : "text-brand-orange"
                    )}
                  >
                    {complianceLabel(rec.priceCompliance)}
                  </p>
                </div>
              )}
            </FieldTile>
            <FieldTile label="Invoice">
              {spreadsheetEditing ? (
                <InlineInput
                  value={sheet.invoice}
                  onChange={(value) =>
                    updateSpreadsheetDraft({ invoice: value })
                  }
                  className="h-auto min-h-[36px] rounded-lg px-3 py-2 text-[13px]"
                />
              ) : (
                <ReadOnlyValue value={rec.invoice} muted={!rec.invoice} />
              )}
            </FieldTile>
            <FieldTile label="Collections">
              <InlineTriStateCheckGroup
                items={getCollectionItemsForCategory(meta.formType, eightCsState)}
                onCycle={(id) => {
                  const next = cycleEightCsItem(eightCsState, id as keyof typeof eightCsState);
                  const encoded = encodeEightCsState(next);
                  patchMTD({ eightCountSheet: encoded });
                  if (spreadsheetEditing) {
                    updateSpreadsheetDraft({ eightCountSheet: encoded });
                  }
                }}
              />
            </FieldTile>
            <FieldTile label="Songs">
              <InlineTriStateCheckGroup
                items={getSongsItems(songsState)}
                onCycle={(id) => {
                  const next = cycleSongsItem(songsState, id as keyof typeof songsState);
                  const encoded = encodeSongsState(next);
                  patchMTD({ haveSongs: encoded });
                  if (spreadsheetEditing) {
                    updateSpreadsheetDraft({ haveSongs: encoded });
                  }
                }}
              />
            </FieldTile>

            <FieldTile label="Rush Fee">
              <InlineRushFeePills
                record={rec}
                onUpdate={(_id, patch) => patchMTD(patch)}
                onUpdateOrder={(orderId, patch) => updateOrder(orderId, patch)}
              />
            </FieldTile>
            {((rec?.category || "").toLowerCase().includes("dance") || order?.formType === "school-all-star-dance") && (
              <>
                <FieldTile label="Extra Songs">
                  <InlineQuantityStepper
                    quantity={rec.extraSongsQuantity ?? 0}
                    unitCost={15}
                    label="Extra Songs"
                    onChange={(qty) => patchMTD({ extraSongsQuantity: qty })}
                  />
                </FieldTile>
                <FieldTile label="Extra Song Editing Time">
                  <InlineQuantityStepper
                    quantity={rec.extraSongEditingTimeQuantity ?? 0}
                    unitCost={30}
                    label="Extra Song Time"
                    onChange={(qty) => patchMTD({ extraSongEditingTimeQuantity: qty })}
                  />
                </FieldTile>
              </>
            )}
          </div>
        </section>

        {/* CUSTOMER ORDER FORM SUBMISSION SECTION */}
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
          <div className="mb-6 grid grid-cols-1 gap-3">
            <FieldTile label="Contact">
              {spreadsheetEditing ? (
                <DetailInput
                  value={sheet.contactName}
                  onChange={(value) =>
                    updateSpreadsheetDraft({ contactName: value })
                  }
                />
              ) : (
                <ReadOnlyValue value={rec.contactName} />
              )}
            </FieldTile>
            <FieldTile label="Package">
              {spreadsheetEditing ? (
                <DetailInput
                  value={sheet.package}
                  onChange={(value) =>
                    updateSpreadsheetDraft({ package: value })
                  }
                />
              ) : (
                <ReadOnlyValue value={rec.package} />
              )}
            </FieldTile>
            <FieldTile label="Music / theme">
              {spreadsheetEditing ? (
                <DetailTextarea
                  value={sheet.musicTheme}
                  onChange={(value) =>
                    updateSpreadsheetDraft({ musicTheme: value })
                  }
                  rows={3}
                />
              ) : (
                <ReadOnlyValue value={rec.musicTheme} multiline />
              )}
            </FieldTile>
          </div>
          <MTDOrderDetails
            order={orderForm}
            discountCodes={discountCodes}
            editable={orderFormEditing && !isViewOnly}
            onFieldChange={handleOrderDraftChange}
          />
        </section>
      </div>

      <AssignEditorModal
        open={assignOpen}
        record={rec}
        mtdRecords={mtdRecords}
        allOrders={allOrders}
        producers={producers}
        schedule={schedule}
        readOnly={isViewOnly || Boolean(rec?.assignedProducer?.trim())}
        onClose={() => setAssignOpen(false)}
        onAssign={handleAssign}
      />

      <SetRecordPricingModal
        open={recordPricingOpen}
        record={
          spreadsheetEditing && spreadsheetDraft
            ? { ...rec, ...spreadsheetDraft }
            : rec
        }
        packagePrices={packagePrices}
        readOnly={isViewOnly}
        musicAffiliateInfo={getRecordMusicAffiliateInfo(rec, orderById, allOrders)}
        onClose={() => setRecordPricingOpen(false)}
        onSave={handleRecordPricingSave}
      />

      <SetPricingModal
        open={packagePricingOpen}
        order={order}
        record={rec}
        onClose={() => setPackagePricingOpen(false)}
      />

      <ReturnToMTDModal
        open={returnModalOpen}
        record={rec}
        onClose={() => setReturnModalOpen(false)}
        onConfirm={confirmReturnToMTD}
      />
    </>
  );
}

function FieldTile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-brand-line/40 bg-brand-bg-subtle/40 px-4 py-3.5 ring-1 ring-inset ring-brand-line/10">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
        {label}
      </p>
      <div className="mt-2">{children}</div>
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

function ReadOnlyValue({
  value,
  multiline = false,
  muted = false,
}: {
  value: string;
  multiline?: boolean;
  muted?: boolean;
}) {
  const display = formatDetailDisplay(value);
  if (!display) {
    return (
      <p className="mt-0 text-[13px] text-brand-ink-tertiary">Not set</p>
    );
  }

  return (
    <p
      className={clsx(
        multiline
          ? "whitespace-pre-wrap text-[13px] leading-relaxed"
          : "text-[13px] font-semibold",
        muted ? "text-brand-ink-tertiary" : "text-brand-ink"
      )}
    >
      {display}
    </p>
  );
}
