"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReturnToMTDModal } from "@/components/mtd/ReturnToMTDModal";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { useAppState } from "@/context/AppStateContext";
import { formatDisplayDate, toIsoDateString } from "@/lib/dates";
import { formatPrice, titleCase } from "@/lib/data";
import {
  getPayrollRecords,
  patchReturnFromPayroll,
} from "@/lib/mtd-completion";
import { parsePackage } from "@/lib/package";
import type { MTDRecord } from "@/types";

const actionLinkClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-line/70 bg-brand-bg/60 text-brand-ink-secondary shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/25";

export default function PayrollPage() {
  const { mtdRecords, updateMTD } = useAppState();
  const [returnRecord, setReturnRecord] = useState<MTDRecord | null>(null);

  const payrollRecords = useMemo(
    () =>
      [...getPayrollRecords(mtdRecords)].sort((a, b) =>
        (b.completedAt ?? "").localeCompare(a.completedAt ?? "")
      ),
    [mtdRecords]
  );

  const totalPayroll = useMemo(
    () => payrollRecords.reduce((sum, rec) => sum + rec.price, 0),
    [payrollRecords]
  );

  const confirmReturn = useCallback(() => {
    if (!returnRecord) return;
    updateMTD(returnRecord.id, patchReturnFromPayroll());
    setReturnRecord(null);
  }, [returnRecord, updateMTD]);

  const columns: Column<MTDRecord>[] = useMemo(
    () => [
      {
        key: "rowId",
        header: "ID",
        width: "56px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (_rec, index) => (
          <span className="text-[12px] tabular-nums text-brand-ink">
            {index + 1}
          </span>
        ),
      },
      {
        key: "contact",
        header: "Contact",
        width: "96px",
        align: "center",
        cellClassName: "!px-3 !py-2",
        headerClassName: "!px-3 !py-2",
        render: (rec) => (
          <span className="block truncate text-[12px] leading-snug text-brand-ink">
            {titleCase(rec.contactName)}
          </span>
        ),
      },
      {
        key: "program",
        header: "Program",
        width: "160px",
        align: "center",
        nowrap: false,
        cellClassName: "!px-3 !py-2",
        headerClassName: "!px-3 !py-2",
        render: (rec) => (
          <p className="text-center text-[13px] font-medium text-brand-ink">
            {titleCase(rec.programName)}
          </p>
        ),
      },
      {
        key: "editor",
        header: "Editor",
        width: "96px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => (
          <span className="text-[12px] font-medium uppercase tabular-nums text-brand-ink">
            {rec.assignedProducer}
          </span>
        ),
      },
      {
        key: "invoice",
        header: "Invoice #",
        width: "108px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => (
          <span className="text-[12px] font-semibold tabular-nums text-brand-ink">
            {rec.invoice}
          </span>
        ),
      },
      {
        key: "mixStart",
        header: "Mix start",
        width: "112px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => (
          <span className="text-[12px] tabular-nums text-brand-ink-secondary">
            {formatDisplayDate(toIsoDateString(rec.mixStartDate))}
          </span>
        ),
      },
      {
        key: "mixEnd",
        header: "Mix end",
        width: "112px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => (
          <span className="text-[12px] tabular-nums text-brand-ink-secondary">
            {formatDisplayDate(toIsoDateString(rec.mixEndDate ?? ""))}
          </span>
        ),
      },
      {
        key: "package",
        header: "Package",
        width: "88px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => {
          const { tier } = parsePackage(rec.package);
          return (
            <span className="text-[12px] font-medium text-brand-ink">
              {titleCase(tier)}
            </span>
          );
        },
      },
      {
        key: "timeLimit",
        header: "Time limit",
        width: "80px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => {
          const { limit } = parsePackage(rec.package);
          return (
            <span className="text-[12px] tabular-nums text-brand-ink">
              {limit}
            </span>
          );
        },
      },
      {
        key: "price",
        header: "Price",
        width: "96px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => (
          <span className="text-[12px] font-semibold tabular-nums text-brand-ink">
            {formatPrice(rec.price)}
          </span>
        ),
      },
      {
        key: "completedAt",
        header: "Completed",
        width: "112px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => (
          <span className="text-[12px] tabular-nums text-brand-ink-secondary">
            {rec.completedAt
              ? formatDisplayDate(rec.completedAt.slice(0, 10))
              : "—"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        width: "148px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => (
          <div
            className="flex items-center justify-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setReturnRecord(rec)}
              className="rounded-lg border border-brand-line/60 bg-brand-elevated px-2.5 py-1.5 text-[11px] font-semibold text-brand-signature shadow-sm transition hover:border-brand-signature/40 hover:bg-brand-blue-soft/40"
            >
              Return to MTD
            </button>
            <Link
              href={`/mtd/${rec.id}`}
              title="Open record"
              aria-label={`Open ${rec.programName}`}
              className={actionLinkClass}
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <>
      <PageHeader
        title="Payroll"
        badge={`${payrollRecords.length} · ${formatPrice(totalPayroll)}`}
        subtitle="Completed mixes ready for payout"
      />

      <div className="px-6 pb-6 pt-5 lg:px-8">
        <div className="dashboard-panel dashboard-panel-framed overflow-hidden">
          <DataTable
            columns={columns}
            data={payrollRecords}
            rowKey={(rec) => rec.id}
            href={(rec) => `/mtd/${rec.id}`}
            emptyMessage="No completed mixes in payroll yet. Mark a mix as Completed on MTD when it's ready."
            pageSize={15}
            embedded
            showScrollIndicator={false}
          />
        </div>
      </div>

      <ReturnToMTDModal
        open={Boolean(returnRecord)}
        record={returnRecord}
        onClose={() => setReturnRecord(null)}
        onConfirm={confirmReturn}
      />
    </>
  );
}
