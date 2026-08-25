"use client";

import { use, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, X } from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "@/components/layout/PageHeader";
import { AttentionFlag } from "@/components/ui/AttentionFlag";
import {
  DetailInput,
  DetailTextarea,
  InlineDateInput,
  InlineInput,
  InlineSelect,
} from "@/components/mtd/InlineFields";
import {
  AssignEditorModal,
  type EditorAssignmentResult,
} from "@/components/mtd/AssignEditorModal";
import { MTDOrderDetails, formatDetailDisplay } from "@/components/mtd/MTDOrderDetails";
import { SetRecordPricingModal } from "@/components/mtd/SetRecordPricingModal";
import { useAppState } from "@/context/AppStateContext";
import { formatPrice } from "@/lib/data";
import { orderFromMTDRecord, rawFieldValue } from "@/lib/order-detail-fields";
import { getOrderDetailSections } from "@/lib/order-detail-sections";
import { findLinkedOrder } from "@/lib/editor-assignment";
import {
  mtdPatchFromOrderField,
  orderPatchFromMTD,
  orderPatchFromOrderField,
} from "@/lib/mtd-order-sync";
import { complianceLabel } from "@/lib/pricing";
import { formatSlotForDisplay, suggestMixStartDate } from "@/lib/scheduling";
import { todayIso } from "@/lib/date-filters";
import {
  ORDER_FORM_TABS,
  EIGHT_CS_OPTIONS,
  SONGS_OPTIONS,
  type MTDRecord,
  type Order,
  type PriceCompliance,
} from "@/types";

type SpreadsheetDraft = {
  contactName: string;
  package: string;
  invoice: string;
  mixStartDate: string;
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
    musicTheme: rec.musicTheme,
    eightCountSheet: rec.eightCountSheet,
    haveSongs: rec.haveSongs,
    price: rec.price,
    priceCompliance: rec.priceCompliance,
  };
}

const clickableChipClass =
  "cursor-pointer border border-brand-line/70 bg-brand-bg/60 shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/25";

export default function MTDDetailPage({
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
  } = useAppState();
  const [assignOpen, setAssignOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [spreadsheetEditing, setSpreadsheetEditing] = useState(false);
  const [spreadsheetDraft, setSpreadsheetDraft] = useState<SpreadsheetDraft | null>(
    null
  );
  const [orderFormEditing, setOrderFormEditing] = useState(false);
  const [orderDraft, setOrderDraft] = useState<Order | null>(null);
  const rec = mtdRecords.find((r) => r.id === id);

  const orderById = useMemo(
    () => new Map(allOrders.map((order) => [order.id, order])),
    [allOrders]
  );

  const linkedOrder = rec ? findLinkedOrder(rec, allOrders) : undefined;
  const order = useMemo(
    () => (rec ? orderFromMTDRecord(rec, linkedOrder, orderById) : null),
    [rec, linkedOrder, orderById, allOrders]
  );

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
        setSpreadsheetDraft((prev) =>
          prev ? { ...prev, ...patch } : prev
        );
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
    if (!rec) return;
    setSpreadsheetDraft(spreadsheetDraftFromRec(rec));
    setSpreadsheetEditing(true);
  }, [rec]);

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
    if (!order) return;
    setOrderDraft({ ...order });
    setOrderFormEditing(true);
  }, [order]);

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

  if (!rec || !order) {
    return (
      <div className="p-8">
        <p>Record not found.</p>
        <Link href="/mtd" className="text-brand-info">
          Back to MTD
        </Link>
      </div>
    );
  }

  const sheet = spreadsheetDraft ?? spreadsheetDraftFromRec(rec);
  const slotLabel = rec.assignedProducer
    ? formatSlotForDisplay(rec.assignedProducer, producers, schedule)
    : null;
  const orderForm = orderDraft ?? order;

  return (
    <>
      <PageHeader title="MTD Record" />
      <div className="mx-auto max-w-5xl space-y-6 p-8">
        <Link href="/mtd" className="link-premium inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back to MTD
        </Link>

        <article className="surface-premium rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-display text-[18px]">
                {formatDetailDisplay(rec.programName) || rec.programName}
              </h1>
              <p className="text-[13px] text-brand-ink-secondary">
                {rec.section}
                {formLabel ? `, ${formLabel}` : ""}
              </p>
            </div>
          </div>

          {rec.needsAttention ? (
            <div className="mt-4">
              <AttentionFlag reason="Missing materials or order form items" />
            </div>
          ) : null}

          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-label">Spreadsheet fields</h2>
              <DetailSectionActions
                editing={spreadsheetEditing}
                onEdit={startSpreadsheetEdit}
                onCancel={cancelSpreadsheetEdit}
                onSave={saveSpreadsheetEdit}
                editLabel="Edit spreadsheet fields"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <EditableField label="Contact">
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
              </EditableField>
              <EditableField label="Package">
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
              </EditableField>
              <div>
                <span className="text-label">Editor</span>
                <div className="mt-1.5 space-y-2">
                  {rec.assignedProducer ? (
                    <p className="text-[13px] font-semibold">{rec.assignedProducer}</p>
                  ) : rec.editorRequest === "NA" ? (
                    <p className="text-[13px] text-brand-ink-tertiary">Not assigned</p>
                  ) : (
                    <p className="text-[13px] text-brand-ink-tertiary">Unassigned</p>
                  )}
                  {rec.editorRequest === "FA" && rec.assignedProducer ? (
                    <p className="text-[11px] uppercase tracking-wide text-brand-info">
                      First available request
                    </p>
                  ) : null}
                  {spreadsheetEditing ? (
                    <button
                      type="button"
                      onClick={() => setAssignOpen(true)}
                      className="rounded-lg border border-brand-orange/40 bg-brand-orange-soft px-3 py-1.5 text-[12px] font-medium text-brand-orange transition hover:bg-brand-orange-muted/30"
                    >
                      {rec.assignedProducer ? "Reassign editor" : "Assign editor"}
                    </button>
                  ) : null}
                </div>
              </div>
              <EditableField label="Price">
                {spreadsheetEditing ? (
                  <button
                    type="button"
                    onClick={() => setPricingOpen(true)}
                    title="Edit pricing"
                    aria-label={`Edit pricing ${formatPrice(sheet.price)}`}
                    className={clsx(
                      clickableChipClass,
                      "rounded-lg px-3 py-2 text-left"
                    )}
                  >
                    <p className="font-semibold tabular-nums text-[13px] text-brand-ink hover:text-brand-orange">
                      {formatPrice(sheet.price)}
                    </p>
                    <p
                      className={clsx(
                        "text-[11px] font-medium",
                        sheet.priceCompliance === "compliant"
                          ? "text-brand-success"
                          : "text-brand-warning"
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
                          ? "text-brand-success"
                          : "text-brand-warning"
                      )}
                    >
                      {complianceLabel(rec.priceCompliance)}
                    </p>
                  </div>
                )}
              </EditableField>
              <EditableField label="Invoice">
                {spreadsheetEditing ? (
                  <InlineInput
                    value={sheet.invoice}
                    onChange={(value) =>
                      updateSpreadsheetDraft({ invoice: value })
                    }
                    className="h-auto min-h-[36px] rounded-lg px-3 py-2 text-[13px]"
                  />
                ) : (
                  <ReadOnlyValue
                    value={rec.invoice}
                    muted={!rec.invoice}
                  />
                )}
              </EditableField>
              <EditableField label="Mix start date">
                {spreadsheetEditing ? (
                  <>
                    <InlineDateInput
                      value={sheet.mixStartDate}
                      template={
                        rec.assignedProducer
                          ? suggestMixStartDate(rec.assignedProducer, producers, schedule)
                          : todayIso()
                      }
                      onChange={(value) =>
                        updateSpreadsheetDraft({ mixStartDate: value })
                      }
                    />
                    {slotLabel ? (
                      <p className="mt-1.5 text-[11px] text-brand-success">
                        Next available slot: {slotLabel}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <ReadOnlyValue
                    value={rec.mixStartDate}
                    muted={!rec.mixStartDate}
                  />
                )}
              </EditableField>
              <div className="sm:col-span-2">
                <span className="text-label">Music / theme</span>
                <div className="mt-1.5">
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
                </div>
              </div>
              <EditableField label="8 count sheet">
                {spreadsheetEditing ? (
                  <InlineSelect
                    value={sheet.eightCountSheet}
                    options={[...EIGHT_CS_OPTIONS]}
                    onChange={(value) =>
                      updateSpreadsheetDraft({ eightCountSheet: value })
                    }
                    className="h-auto min-h-[36px] rounded-lg px-3 py-2 text-[13px]"
                  />
                ) : (
                  <ReadOnlyValue value={rec.eightCountSheet} />
                )}
              </EditableField>
              <EditableField label="Songs">
                {spreadsheetEditing ? (
                  <InlineSelect
                    value={sheet.haveSongs}
                    options={[...SONGS_OPTIONS]}
                    onChange={(value) =>
                      updateSpreadsheetDraft({ haveSongs: value })
                    }
                    className="h-auto min-h-[36px] rounded-lg px-3 py-2 text-[13px]"
                  />
                ) : (
                  <ReadOnlyValue value={rec.haveSongs} />
                )}
              </EditableField>
            </div>
          </div>
        </article>

        <article className="surface-premium rounded-2xl p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-display text-[16px]">Order form</h2>
              <p className="mt-1 text-[13px] text-brand-ink-secondary">
                Full submission details previously shown on the Orders tab
              </p>
            </div>
            <DetailSectionActions
              editing={orderFormEditing}
              onEdit={startOrderFormEdit}
              onCancel={cancelOrderFormEdit}
              onSave={saveOrderFormEdit}
              editLabel="Edit order form fields"
            />
          </div>
          <MTDOrderDetails
            order={orderForm}
            discountCodes={discountCodes}
            editable={orderFormEditing}
            onFieldChange={handleOrderDraftChange}
          />
        </article>
      </div>

      <AssignEditorModal
        open={assignOpen}
        record={rec}
        mtdRecords={mtdRecords}
        allOrders={allOrders}
        producers={producers}
        schedule={schedule}
        onClose={() => setAssignOpen(false)}
        onAssign={handleAssign}
      />

      <SetRecordPricingModal
        open={pricingOpen}
        record={
          spreadsheetEditing && spreadsheetDraft
            ? { ...rec, ...spreadsheetDraft }
            : rec
        }
        packagePrices={packagePrices}
        onClose={() => setPricingOpen(false)}
        onSave={handleRecordPricingSave}
      />
    </>
  );
}

function EditableField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="text-label">{label}</span>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

const detailEditButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-line/70 bg-brand-bg/60 text-brand-ink-secondary shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/25";

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
  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <button
          type="button"
          onClick={onSave}
          className="rounded-lg bg-brand-cta px-3 py-1.5 text-[12px] font-semibold text-brand-cta-text transition hover:bg-brand-cta-hover"
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
        active && "border-brand-orange/40 bg-brand-orange-soft/35 text-brand-orange"
      )}
    >
      {active ? (
        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
      ) : (
        <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
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
