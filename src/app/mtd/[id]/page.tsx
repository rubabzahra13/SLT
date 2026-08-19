"use client";

import { use, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InlineInput, InlineSelect, InlineDateInput } from "@/components/mtd/InlineFields";
import {
  AssignEditorModal,
  type EditorAssignmentResult,
} from "@/components/mtd/AssignEditorModal";
import { useAppState } from "@/context/AppStateContext";
import { formatPrice } from "@/lib/data";
import { complianceLabel } from "@/lib/pricing";
import { formatSlotForDisplay, suggestMixStartDate } from "@/lib/scheduling";
import { todayIso } from "@/lib/date-filters";
import {
  EIGHT_CS_OPTIONS,
  SONGS_OPTIONS,
} from "@/types";

export default function MTDDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { mtdRecords, updateMTD, producers, schedule } = useAppState();
  const [assignOpen, setAssignOpen] = useState(false);
  const rec = mtdRecords.find((r) => r.id === id);

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

  if (!rec) {
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
      <div className="mx-auto max-w-3xl space-y-6 p-8">
        <Link href="/mtd" className="link-premium inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back to MTD
        </Link>

        <article className="surface-premium rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-display text-[18px]">{rec.programName}</h1>
              <p className="text-[13px] text-brand-ink-secondary">{rec.section}</p>
            </div>
            <StatusBadge status={rec.status} size="md" />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
                  className="rounded-lg border border-brand-info/40 bg-brand-info/10 px-3 py-1.5 text-[12px] font-medium text-brand-info transition hover:bg-brand-info/15"
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
          </div>

          <div className="mt-6">
            <span className="text-label">Music / theme (F)</span>
            <p className="mt-1.5 text-[13px] text-brand-ink-secondary">{rec.musicTheme}</p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
