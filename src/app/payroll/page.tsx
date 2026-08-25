"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, Pencil, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReturnToMTDModal } from "@/components/mtd/ReturnToMTDModal";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { useAppState } from "@/context/AppStateContext";
import { formatDisplayDate } from "@/lib/dates";
import { toIsoDateString } from "@/lib/dates";
import { formatPrice, titleCase } from "@/lib/data";
import {
  getPayrollRecords,
  patchReturnFromPayroll,
} from "@/lib/mtd-completion";
import { parsePackage } from "@/lib/package";
import type { MTDRecord } from "@/types";

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
        key: "program",
        header: "Program",
        width: "220px",
        nowrap: false,
        render: (rec) => (
          <div>
            <p className="font-medium text-brand-ink">
              {titleCase(rec.programName)}
            </p>
            <p className="mt-0.5 text-[11px] text-brand-ink-tertiary">
              {titleCase(rec.contactName)}
            </p>
          </div>
        ),
      },
      {
        key: "editor",
        header: "Editor",
        width: "100px",
        align: "center",
        render: (rec) => (
          <span className="font-medium uppercase text-brand-ink">
            {rec.assignedProducer}
          </span>
        ),
      },
      {
        key: "invoice",
        header: "Invoice #",
        width: "108px",
        align: "center",
        render: (rec) => (
          <span className="font-semibold tabular-nums text-brand-ink">
            {rec.invoice}
          </span>
        ),
      },
      {
        key: "mixStart",
        header: "Mix start",
        width: "112px",
        align: "center",
        render: (rec) => (
          <span className="tabular-nums text-brand-ink-secondary">
            {formatDisplayDate(toIsoDateString(rec.mixStartDate))}
          </span>
        ),
      },
      {
        key: "mixEnd",
        header: "Mix end",
        width: "112px",
        align: "center",
        render: (rec) => (
          <span className="tabular-nums text-brand-ink-secondary">
            {formatDisplayDate(toIsoDateString(rec.mixEndDate ?? ""))}
          </span>
        ),
      },
      {
        key: "package",
        header: "Package",
        width: "120px",
        align: "center",
        render: (rec) => {
          const { tier, limit } = parsePackage(rec.package);
          return (
            <span className="text-[12px] text-brand-ink">
              {titleCase(tier)} · {limit}
            </span>
          );
        },
      },
      {
        key: "price",
        header: "Price",
        width: "96px",
        align: "center",
        render: (rec) => (
          <span className="font-semibold tabular-nums text-brand-ink">
            {formatPrice(rec.price)}
          </span>
        ),
      },
      {
        key: "completedAt",
        header: "Completed",
        width: "112px",
        align: "center",
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
        sticky: "right",
        render: (rec) => (
          <div
            className="flex items-center justify-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setReturnRecord(rec)}
              className="rounded-lg border border-brand-line/70 bg-brand-bg/60 px-2.5 py-1.5 text-[11px] font-medium text-brand-signature transition hover:border-brand-signature/30 hover:bg-brand-signature/8"
            >
              Return to MTD
            </button>
            <Link
              href={`/mtd/${rec.id}`}
              title="Open record"
              aria-label={`Open ${rec.programName}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-line/70 bg-brand-bg/60 text-brand-ink-secondary shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange"
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
        subtitle={`${payrollRecords.length} completed mixes ready for payroll`}
      />

      <div className="px-6 py-6 lg:px-8">
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="surface-premium overflow-hidden rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-label">Payroll queue</p>
                <p className="text-display mt-2 text-[28px] tabular-nums">
                  {payrollRecords.length}
                </p>
                <p className="mt-1 text-[13px] text-brand-ink-secondary">
                  Completed mixes awaiting payroll
                </p>
              </div>
              <div className="rounded-xl bg-brand-success/10 p-3 text-brand-success">
                <Wallet className="h-5 w-5" strokeWidth={1.75} />
              </div>
            </div>
          </div>

          <div className="surface-premium overflow-hidden rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-label">Total value</p>
                <p className="text-display mt-2 text-[28px] tabular-nums">
                  {formatPrice(totalPayroll)}
                </p>
                <p className="mt-1 text-[13px] text-brand-ink-secondary">
                  Sum of completed mix prices
                </p>
              </div>
              <div className="rounded-xl bg-brand-signature/10 p-3 text-brand-signature">
                <ArrowLeft className="h-5 w-5 rotate-180" strokeWidth={1.75} />
              </div>
            </div>
          </div>
        </div>

        <div className="panel-shell overflow-hidden rounded-2xl">
          <DataTable
            columns={columns}
            data={payrollRecords}
            rowKey={(rec) => rec.id}
            href={(rec) => `/mtd/${rec.id}`}
            emptyMessage="No completed mixes in payroll yet. Mark a mix as Completed on MTD when it's ready."
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
