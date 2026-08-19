"use client";

import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPill } from "@/components/ui/FilterPill";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { DateFilter, type DateFilterValue } from "@/components/ui/DateFilter";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { InlineInput, InlineSelect, InlineDateInput } from "@/components/mtd/InlineFields";
import {
  AssignEditorModal,
  type EditorAssignmentResult,
} from "@/components/mtd/AssignEditorModal";
import { useAppState } from "@/context/AppStateContext";
import { formatPrice, titleCase } from "@/lib/data";
import { parsePackage } from "@/lib/package";
import { complianceLabel } from "@/lib/pricing";
import { formatSlotForDisplay, suggestMixStartDate } from "@/lib/scheduling";
import { todayIso } from "@/lib/date-filters";
import { filterMTDRecords } from "@/lib/mtd-filters";
import type { MTDRecord } from "@/types";
import {
  EDITOR_NAMES,
  EIGHT_CS_OPTIONS,
  SONGS_OPTIONS,
} from "@/types";
import clsx from "clsx";

const categoryFilters = ["All", "Cheer", "Dance", "Outsourced"];

export default function MTDPage() {
  const { mtdRecords, updateMTD, producers, schedule } = useAppState();
  const [activeFilter, setActiveFilter] = useState("All");
  const [producerFilter, setProducerFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    type: "all",
    value: null,
  });
  const [assignRecord, setAssignRecord] = useState<MTDRecord | null>(null);

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

  const openAssignModal = useCallback(
    (rec: MTDRecord, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setAssignRecord(rec);
    },
    []
  );

  const filtered = useMemo(
    () =>
      filterMTDRecords(mtdRecords, {
        category: activeFilter,
        producer: producerFilter,
        dateFilter,
      }),
    [mtdRecords, activeFilter, producerFilter, dateFilter]
  );

  const producerOptions = useMemo(() => {
    const counts = new Map<string, number>();
    let unassigned = 0;

    for (const rec of mtdRecords) {
      if (!rec.assignedProducer) {
        unassigned += 1;
      } else {
        counts.set(
          rec.assignedProducer,
          (counts.get(rec.assignedProducer) ?? 0) + 1
        );
      }
    }

    return [
      { value: "All", label: "All producers", count: mtdRecords.length },
      { value: "Unassigned", label: "Unassigned", count: unassigned },
      ...EDITOR_NAMES.map((name) => ({
        value: name,
        label: name,
        count: counts.get(name) ?? 0,
      })),
    ];
  }, [mtdRecords]);

  const columns: Column<MTDRecord>[] = useMemo(
    () => [
      {
        key: "contactC",
        header: "Contact (C)",
        width: "96px",
        render: (rec) => (
          <span className="text-brand-ink-secondary">
            {titleCase(rec.contactName)}
          </span>
        ),
      },
      {
        key: "programD",
        header: "Program (D)",
        width: "200px",
        render: (rec) => (
          <div className="flex items-start gap-1.5">
            {rec.needsAttention ? (
              <StatusBadge status="needs_attention" />
            ) : null}
            <span className="font-medium">{titleCase(rec.programName)}</span>
          </div>
        ),
      },
      {
        key: "packageE",
        header: "Package (E)",
        width: "88px",
        render: (rec) => {
          const { tier } = parsePackage(rec.package);
          return <span className="font-medium">{titleCase(tier)}</span>;
        },
      },
      {
        key: "limitE",
        header: "Limit",
        width: "108px",
        render: (rec) => {
          const { limit } = parsePackage(rec.package);
          return (
            <span className="text-[12px] text-brand-ink-secondary tabular-nums">
              {titleCase(limit)}
            </span>
          );
        },
      },
      {
        key: "themeF",
        header: "Music (F)",
        width: "180px",
        nowrap: false,
        render: (rec) => (
          <span className="text-[11px] text-brand-ink-tertiary">
            {titleCase(rec.musicTheme)}
          </span>
        ),
      },
      {
        key: "priceG",
        header: "Price (G)",
        width: "96px",
        align: "right",
        render: (rec) => (
          <div className="text-right">
            <p className="font-medium tabular-nums">{formatPrice(rec.price)}</p>
            <p
              className={clsx(
                "text-[10px] font-medium",
                rec.priceCompliance === "compliant"
                  ? "text-brand-success"
                  : "text-brand-warning"
              )}
            >
              {complianceLabel(rec.priceCompliance)}
            </p>
          </div>
        ),
      },
      {
        key: "invoiceH",
        header: "Invoice (H)",
        width: "80px",
        render: (rec) => (
          <InlineInput
            value={rec.invoice}
            placeholder="#"
            onChange={(v) => updateMTD(rec.id, { invoice: v })}
          />
        ),
      },
      {
        key: "mixDateI",
        header: "Mix date (I)",
        width: "128px",
        render: (rec) => {
          const template = rec.assignedProducer
              ? suggestMixStartDate(rec.assignedProducer, producers, schedule)
              : todayIso();

          return (
            <div onClick={(e) => e.stopPropagation()}>
              <InlineDateInput
                value={rec.mixStartDate}
                template={template}
                onChange={(v) => updateMTD(rec.id, { mixStartDate: v })}
              />
              {rec.assignedProducer ? (
                <p className="mt-1 truncate text-[9px] text-brand-success">
                  {formatSlotForDisplay(rec.assignedProducer, producers, schedule)}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        key: "eightJ",
        header: "8CS (J)",
        width: "120px",
        render: (rec) => (
          <InlineSelect
            value={rec.eightCountSheet || EIGHT_CS_OPTIONS[2]}
            options={[...EIGHT_CS_OPTIONS]}
            onChange={(v) => updateMTD(rec.id, { eightCountSheet: v })}
          />
        ),
      },
      {
        key: "songsK",
        header: "Songs (K)",
        width: "88px",
        render: (rec) => (
          <InlineSelect
            value={rec.haveSongs || SONGS_OPTIONS[1]}
            options={[...SONGS_OPTIONS]}
            onChange={(v) => updateMTD(rec.id, { haveSongs: v })}
          />
        ),
      },
      {
        key: "editorB",
        header: "Editor (B)",
        width: "108px",
        render: (rec) => (
          <div className="min-w-[88px]">
            {rec.assignedProducer ? (
              <div className="space-y-0.5">
                <p className="truncate text-[12px] font-medium">
                  {rec.assignedProducer}
                </p>
                {rec.editorRequest === "FA" ? (
                  <p className="text-[9px] uppercase tracking-wide text-brand-info">
                    First available
                  </p>
                ) : null}
                {rec.bookedUntil ? (
                  <p className="text-[9px] tabular-nums text-brand-ink-tertiary">
                    thru {rec.bookedUntil}
                  </p>
                ) : null}
              </div>
            ) : rec.editorRequest === "NA" ? (
              <span className="text-[12px] text-brand-ink-tertiary">NA</span>
            ) : null}
            <button
              type="button"
              onClick={(e) => openAssignModal(rec, e)}
              className={clsx(
                "mt-1 rounded-md border px-2 py-1 text-[11px] font-medium transition",
                rec.assignedProducer
                  ? "border-brand-line/70 text-brand-ink-secondary hover:border-brand-line hover:bg-brand-bg/50"
                  : "border-brand-info/40 bg-brand-info/10 text-brand-info hover:bg-brand-info/15"
              )}
            >
              {rec.assignedProducer ? "Reassign" : "Assign"}
            </button>
          </div>
        ),
      },
    ],
    [updateMTD, producers, schedule, openAssignModal]
  );

  return (
    <>
      <PageHeader
        title="Music To Do"
        subtitle={`${mtdRecords.length} entries · spreadsheet cols B through K`}
      />

      <div className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categoryFilters.map((filter) => (
              <FilterPill
                key={filter}
                label={filter}
                active={activeFilter === filter}
                onClick={() => setActiveFilter(filter)}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              label="Producer"
              value={producerFilter}
              options={producerOptions}
              onChange={setProducerFilter}
            />
            <DateFilter value={dateFilter} onChange={setDateFilter} />
            <span className="text-[12px] text-brand-ink-tertiary">
              {filtered.length} of {mtdRecords.length} entries
            </span>
          </div>
        </div>

        <DataTable
          key={`${activeFilter}-${producerFilter}-${dateFilter.type}-${String(dateFilter.value)}`}
          columns={columns}
          data={filtered}
          rowKey={(rec) => rec.id}
          href={(rec) => `/mtd/${rec.id}`}
          emptyMessage="No MTD entries match this filter."
          pageSize={15}
        />
      </div>

      <AssignEditorModal
        open={Boolean(assignRecord)}
        record={assignRecord}
        mtdRecords={mtdRecords}
        producers={producers}
        schedule={schedule}
        onClose={() => setAssignRecord(null)}
        onAssign={handleAssign}
      />
    </>
  );
}
