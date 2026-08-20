"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { InlineSelect } from "@/components/mtd/InlineFields";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { FilterPill } from "@/components/ui/FilterPill";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAppState } from "@/context/AppStateContext";
import { formatDisplayDate } from "@/lib/dates";
import { formatPrice, titleCase } from "@/lib/data";
import {
  getInProgressRecords,
  getOngoingRecords,
  getOutsourcedRecords,
} from "@/lib/mtd-filters";
import type { MTDRecord } from "@/types";

type ProgressFilter = "all" | "outgoing" | "outsourced";

const WAITING_ON_OPTIONS = [
  "Voiceover / instrumentation",
  "Materials & customization",
  "Song list / approvals",
  "Client feedback",
] as const;

function resolveWaitingOn(rec: MTDRecord): string {
  if (rec.waitingOn?.trim()) return rec.waitingOn.trim();
  return rec.eightCountSheet.includes("NEED")
    ? "Materials & customization"
    : "Voiceover / instrumentation";
}

export default function OutsourcedPage() {
  const { mtdRecords, updateMTD } = useAppState();
  const [filter, setFilter] = useState<ProgressFilter>("all");

  const outgoing = useMemo(() => getOngoingRecords(mtdRecords), [mtdRecords]);
  const outsourced = useMemo(
    () => getOutsourcedRecords(mtdRecords),
    [mtdRecords]
  );
  const all = useMemo(() => getInProgressRecords(mtdRecords), [mtdRecords]);

  const display =
    filter === "outgoing"
      ? outgoing
      : filter === "outsourced"
        ? outsourced
        : all;

  const columns: Column<MTDRecord>[] = useMemo(
    () => [
      {
        key: "program",
        header: "Program",
        width: "240px",
        nowrap: false,
        render: (rec) => (
          <span className="text-brand-ink">{titleCase(rec.programName)}</span>
        ),
      },
      {
        key: "producer",
        header: "Producer",
        width: "120px",
        align: "center",
        render: (rec) => (
          <span className="text-brand-ink">
            {titleCase(rec.assignedProducer ?? "—")}
          </span>
        ),
      },
      {
        key: "package",
        header: "Package",
        width: "180px",
        nowrap: false,
        render: (rec) => (
          <span className="text-brand-ink">{titleCase(rec.package)}</span>
        ),
      },
      {
        key: "waiting",
        header: "Waiting on",
        width: "220px",
        align: "center",
        render: (rec) => {
          const value = resolveWaitingOn(rec);
          const options = WAITING_ON_OPTIONS.includes(
            value as (typeof WAITING_ON_OPTIONS)[number]
          )
            ? WAITING_ON_OPTIONS
            : ([value, ...WAITING_ON_OPTIONS] as string[]);

          return (
            <div onClick={(e) => e.stopPropagation()}>
              <InlineSelect
                value={value}
                options={options}
                onChange={(next) => updateMTD(rec.id, { waitingOn: next })}
              />
            </div>
          );
        },
      },
      {
        key: "mixDate",
        header: "Mix date",
        width: "110px",
        align: "center",
        render: (rec) => (
          <span className="tabular-nums text-brand-ink">
            {formatDisplayDate(rec.mixStartDate)}
          </span>
        ),
      },
      {
        key: "price",
        header: "Price",
        width: "100px",
        align: "right",
        render: (rec) => (
          <span className="font-medium tabular-nums text-brand-ink">
            {formatPrice(rec.price)}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        width: "120px",
        align: "center",
        render: (rec) => {
          const isOutsourced =
            rec.status === "outsourced" ||
            rec.section === "OUTSOURCED MIXES";
          return isOutsourced ? (
            <StatusBadge status="outsourced" />
          ) : (
            <span className="inline-flex items-center rounded-md bg-brand-accent-soft px-2 py-0.5 text-[10px] font-medium capitalize text-brand-ink-secondary ring-1 ring-inset ring-brand-line">
              Outgoing
            </span>
          );
        },
      },
    ],
    [updateMTD]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        title="In Progress / Outsourced"
        subtitle={`${all.length} mixes · ${outgoing.length} outgoing · ${outsourced.length} outsourced`}
      />

      <div className="min-h-0 flex-1 overflow-auto px-6 py-6 lg:px-8">
        <div className="panel-shell overflow-hidden rounded-2xl">
          <div className="panel-toolbar flex flex-wrap items-center gap-2 px-4 py-2.5">
            <nav className="flex flex-wrap gap-2" aria-label="Progress type">
              <FilterPill
                label={`All (${all.length})`}
                active={filter === "all"}
                onClick={() => setFilter("all")}
              />
              <FilterPill
                label={`Outgoing (${outgoing.length})`}
                active={filter === "outgoing"}
                onClick={() => setFilter("outgoing")}
              />
              <FilterPill
                label={`Outsourced (${outsourced.length})`}
                active={filter === "outsourced"}
                onClick={() => setFilter("outsourced")}
                accent="orange"
              />
            </nav>
          </div>

          <DataTable
            key={filter}
            columns={columns}
            data={display}
            rowKey={(rec) => rec.id}
            href={(rec) => `/mtd/${rec.id}`}
            emptyMessage={
              filter === "outsourced"
                ? "No outsourced mixes right now."
                : filter === "outgoing"
                  ? "No outgoing mixes right now."
                  : "No in-progress mixes right now."
            }
            embedded
            pageSize={15}
          />
        </div>
      </div>
    </div>
  );
}
