"use client";

import { use, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AttentionFlag } from "@/components/ui/AttentionFlag";
import { InlineInput, InlineSelect, InlineDateInput } from "@/components/mtd/InlineFields";
import {
  AssignEditorModal,
  type EditorAssignmentResult,
} from "@/components/mtd/AssignEditorModal";
import { MTDOrderDetails } from "@/components/mtd/MTDOrderDetails";
import { useAppState } from "@/context/AppStateContext";
import { formatPrice } from "@/lib/data";
import { orderFromMTDRecord } from "@/lib/order-detail-fields";
import { complianceLabel } from "@/lib/pricing";
import { formatSlotForDisplay, suggestMixStartDate } from "@/lib/scheduling";
import { todayIso } from "@/lib/date-filters";
import { ORDER_FORM_TABS, EIGHT_CS_OPTIONS, SONGS_OPTIONS } from "@/types";

export default function MTDDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { mtdRecords, allOrders, updateMTD, producers, schedule } = useAppState();
  const [assignOpen, setAssignOpen] = useState(false);
  const rec = mtdRecords.find((r) => r.id === id);

  const orderById = useMemo(
    () => new Map(allOrders.map((order) => [order.id, order])),
    [allOrders]
  );

  const linkedOrder = rec?.orderId ? orderById.get(rec.orderId) : undefined;
  const order = useMemo(
    () => (rec ? orderFromMTDRecord(rec, linkedOrder, orderById) : null),
    [rec, linkedOrder, orderById]
  );

  const formLabel = ORDER_FORM_TABS.find((tab) => tab.id === order?.formType)?.label;

  const handleAssign = useCallback(
    (recordId: string, result: EditorAssignmentResult) => {
      updateMTD(recordId, {
        editorRequest: result.editorRequest,
        assignedProducer: result.assignedProducer,
        bookedUntil: result.bookedUntil,
        ...(result.mixStartDate ? { mixStartDate: result.mixStartDate } : {}),
      });
    },
    [updateMTD]
  );

  const slotLabel = useMemo(() => {
    if (!rec?.assignedProducer) return null;
    return formatSlotForDisplay(rec.assignedProducer, producers, schedule);
  }, [rec?.assignedProducer, producers, schedule]);

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
              <h1 className="text-display text-[18px]">{rec.programName}</h1>
              <p className="text-[13px] text-brand-ink-secondary">
                {rec.section}
                {formLabel ? ` · ${formLabel}` : ""}
              </p>
            </div>
            <StatusBadge status={rec.status} size="md" />
          </div>

          {rec.needsAttention ? (
            <div className="mt-4">
              <AttentionFlag reason="Missing materials or order form items" />
            </div>
          ) : null}

          <div className="mt-6">
            <h2 className="text-label mb-4">Spreadsheet fields (B–K)</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact (C)" value={rec.contactName} />
              <Field label="Package (E)" value={rec.package} />
              <div>
                <span className="text-label">Editor (B)</span>
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
                  {rec.bookedUntil ? (
                    <p className="text-[11px] tabular-nums text-brand-ink-tertiary">
                      Booked until {rec.bookedUntil}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setAssignOpen(true)}
                    className="rounded-lg border border-brand-orange/40 bg-brand-orange-soft px-3 py-1.5 text-[12px] font-medium text-brand-orange transition hover:bg-brand-orange-muted/30"
                  >
                    {rec.assignedProducer ? "Reassign editor" : "Assign editor"}
                  </button>
                </div>
              </div>
              <div>
                <span className="text-label">Price (G)</span>
                <p className="mt-1.5 text-[15px] font-semibold tabular-nums">
                  {formatPrice(rec.price)}
                </p>
                <p className="text-[11px] text-brand-ink-tertiary">
                  {complianceLabel(rec.priceCompliance)}
                </p>
              </div>
              <div>
                <span className="text-label">Invoice (H)</span>
                <div className="mt-1.5">
                  <InlineInput
                    value={rec.invoice}
                    onChange={(v) => updateMTD(rec.id, { invoice: v })}
                  />
                </div>
              </div>
              <div>
                <span className="text-label">Mix start date (I)</span>
                <div className="mt-1.5">
                  <InlineDateInput
                    value={rec.mixStartDate}
                    template={
                      rec.assignedProducer
                        ? suggestMixStartDate(rec.assignedProducer, producers, schedule)
                        : todayIso()
                    }
                    onChange={(v) => updateMTD(rec.id, { mixStartDate: v })}
                  />
                </div>
                {slotLabel ? (
                  <p className="mt-1.5 text-[11px] text-brand-success">
                    Next available slot: {slotLabel}
                  </p>
                ) : null}
              </div>
              <div className="sm:col-span-2">
                <span className="text-label">Music / theme (F)</span>
                <p className="mt-1.5 text-[13px] text-brand-ink-secondary">{rec.musicTheme}</p>
              </div>
              <div>
                <span className="text-label">8-count sheet (J)</span>
                <div className="mt-1.5">
                  <InlineSelect
                    value={rec.eightCountSheet}
                    options={[...EIGHT_CS_OPTIONS]}
                    onChange={(v) => updateMTD(rec.id, { eightCountSheet: v })}
                  />
                </div>
              </div>
              <div>
                <span className="text-label">Songs (K)</span>
                <div className="mt-1.5">
                  <InlineSelect
                    value={rec.haveSongs}
                    options={[...SONGS_OPTIONS]}
                    onChange={(v) => updateMTD(rec.id, { haveSongs: v })}
                  />
                </div>
              </div>
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
            {linkedOrder ? (
              <span className="rounded-md bg-brand-bg px-2.5 py-1 text-[11px] font-medium text-brand-ink-secondary">
                Linked order
              </span>
            ) : (
              <span className="rounded-md bg-brand-bg px-2.5 py-1 text-[11px] font-medium text-brand-ink-tertiary">
                Inferred from MTD record
              </span>
            )}
          </div>
          <MTDOrderDetails order={order} />
        </article>
      </div>

      <AssignEditorModal
        open={assignOpen}
        record={rec}
        mtdRecords={mtdRecords}
        producers={producers}
        schedule={schedule}
        onClose={() => setAssignOpen(false)}
        onAssign={handleAssign}
      />
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-label">{label}</span>
      <p className="mt-1.5 text-[13px] font-semibold">{value}</p>
    </div>
  );
}
