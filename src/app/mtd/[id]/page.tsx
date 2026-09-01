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
  InlineTriStateCheckGroup,
} from "@/components/mtd/InlineFields";
import {
  AssignEditorModal,
  type EditorAssignmentResult,
} from "@/components/mtd/AssignEditorModal";
import { MTDOrderDetails, formatDetailDisplay } from "@/components/mtd/MTDOrderDetails";
import { SetRecordPricingModal } from "@/components/mtd/SetRecordPricingModal";
import { SetPricingModal } from "@/components/mtd/SetPricingModal";
import { useAppState } from "@/context/AppStateContext";
import { formatPrice } from "@/lib/data";
import { orderFromMTDRecord, rawFieldValue } from "@/lib/order-detail-fields";
import { getOrderDetailSections } from "@/lib/order-detail-sections";
import { findLinkedOrder } from "@/lib/editor-assignment";
import {
  cycleEightCsItem,
  cycleSongsItem,
  encodeEightCsState,
  encodeSongsState,
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
  "cursor-pointer border border-brand-line/60 bg-brand-elevated shadow-sm transition hover:border-brand-orange/50 hover:bg-brand-orange-soft/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/30";

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
    secretMenuPrices,
    setPackagePrices,
    setSecretMenuPrices,
    producers,
    schedule,
    discountCodes,
  } = useAppState();
  const [assignOpen, setAssignOpen] = useState(false);
  const [recordPricingOpen, setRecordPricingOpen] = useState(false);
  const [packagePricingOpen, setPackagePricingOpen] = useState(false);
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
  const eightCsState = parseEightCsState(rec.eightCountSheet ?? "");
  const songsState = parseSongsState(rec.haveSongs ?? "");
  const slotLabel = rec.assignedProducer
    ? formatSlotForDisplay(rec.assignedProducer, producers, schedule)
    : null;
  const orderForm = orderDraft ?? order;

  return (
    <>
      <PageHeader
        title="MTD Record"
        badge={rec.invoice ? `#${rec.invoice}` : undefined}
        subtitle={formatDetailDisplay(rec.programName) || rec.programName}
        toolbar={
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/mtd"
              className="link-premium inline-flex items-center gap-2 text-[13px] font-medium"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Back to MTD
            </Link>
            <button
              type="button"
              onClick={() => setPackagePricingOpen(true)}
              className="inline-flex h-8 shrink-0 items-center rounded-lg bg-brand-orange px-3.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-brand-orange-hover"
            >
              Pricing
            </button>
          </div>
        }
      />
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-6 lg:px-8">
        <article className="overflow-hidden rounded-2xl border border-brand-line/50 bg-white shadow-[var(--shadow-premium-sm)] ring-1 ring-inset ring-brand-line/20">
          <div className="border-b border-brand-line/40 bg-gradient-to-r from-brand-blue-soft/50 via-white to-brand-orange-soft/20 px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-[22px] font-bold tracking-[-0.03em] text-brand-ink">
                  {formatDetailDisplay(rec.programName) || rec.programName}
                </h1>
                <p className="mt-1.5 text-[13px] font-medium text-brand-ink-secondary">
                  {rec.section}
                  {formLabel ? ` · ${formLabel}` : ""}
                </p>
              </div>
              {rec.needsAttention ? (
                <AttentionFlag reason="Missing materials or order form items" />
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-brand-line/35 px-6 py-3.5">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
              Spreadsheet fields
            </h2>
            <DetailSectionActions
              editing={spreadsheetEditing}
              onEdit={startSpreadsheetEdit}
              onCancel={cancelSpreadsheetEdit}
              onSave={saveSpreadsheetEdit}
              editLabel="Edit spreadsheet fields"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 p-6">
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
            <FieldTile label="Editor">
              <div className="space-y-2">
                {rec.assignedProducer ? (
                  <p className="text-[13px] font-semibold text-brand-ink">
                    {rec.assignedProducer}
                  </p>
                ) : rec.editorRequest === "NA" ? (
                  <p className="text-[13px] text-brand-ink-tertiary">Not assigned</p>
                ) : (
                  <p className="text-[13px] text-brand-ink-tertiary">Unassigned</p>
                )}
                {rec.editorRequest === "FA" && rec.assignedProducer ? (
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-signature">
                    First available request
                  </p>
                ) : null}
                {spreadsheetEditing ? (
                  <button
                    type="button"
                    onClick={() => setAssignOpen(true)}
                    className="rounded-lg border border-brand-orange/40 bg-brand-orange-soft/50 px-3 py-1.5 text-[12px] font-semibold text-brand-orange transition hover:bg-brand-orange-soft"
                  >
                    {rec.assignedProducer ? "Reassign editor" : "Assign editor"}
                  </button>
                ) : null}
              </div>
            </FieldTile>
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
            <FieldTile label="Mix start date">
              {spreadsheetEditing ? (
                <>
                  <InlineDateInput
                    value={sheet.mixStartDate}
                    onChange={(value) =>
                      updateSpreadsheetDraft({ mixStartDate: value })
                    }
                  />
                  {slotLabel ? (
                    <p className="mt-1.5 text-[11px] font-medium text-brand-signature">
                      Next available slot: {slotLabel}
                    </p>
                  ) : null}
                </>
              ) : (
                <ReadOnlyValue value={rec.mixStartDate} muted={!rec.mixStartDate} />
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
            <FieldTile label="8 count sheet">
              <InlineTriStateCheckGroup
                items={[
                  { id: "cs", label: "CS", state: eightCsState.cs },
                  { id: "video", label: "Video", state: eightCsState.video },
                  { id: "form", label: "Form", state: eightCsState.form },
                  { id: "mix", label: "Mix", state: eightCsState.mix },
                ]}
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
                items={[
                  { id: "songs", label: "Songs", state: songsState.songs },
                  { id: "notes", label: "Notes", state: songsState.notes },
                ]}
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
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-brand-line/50 bg-white shadow-[var(--shadow-premium-sm)] ring-1 ring-inset ring-brand-line/20">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-line/40 bg-gradient-to-r from-brand-bg-subtle/80 via-white to-white px-6 py-4">
            <div>
              <h2 className="text-[18px] font-bold tracking-[-0.02em] text-brand-ink">
                Order form
              </h2>
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
          <div className="p-6">
            <MTDOrderDetails
              order={orderForm}
              discountCodes={discountCodes}
              editable={orderFormEditing}
              onFieldChange={handleOrderDraftChange}
            />
          </div>
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
        open={recordPricingOpen}
        record={
          spreadsheetEditing && spreadsheetDraft
            ? { ...rec, ...spreadsheetDraft }
            : rec
        }
        packagePrices={packagePrices}
        onClose={() => setRecordPricingOpen(false)}
        onSave={handleRecordPricingSave}
      />

      <SetPricingModal
        open={packagePricingOpen}
        prices={packagePrices}
        secretMenuPrices={secretMenuPrices}
        onClose={() => setPackagePricingOpen(false)}
        onSave={(prices, secretMenu) => {
          setPackagePrices(prices);
          setSecretMenuPrices(secretMenu);
        }}
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
