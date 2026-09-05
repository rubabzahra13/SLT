"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MTDPageToolbar } from "@/components/mtd/MTDPageToolbar";
import { ReturnToMTDModal } from "@/components/mtd/ReturnToMTDModal";
import {
  DEFAULT_MTD_TABLE_FILTERS,
  type MTDTableFilterState,
} from "@/components/mtd/MTDTableFilters";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { useAppState } from "@/context/AppStateContext";
import { formatDisplayDate, toIsoDateString } from "@/lib/dates";
import { formatPrice, titleCase } from "@/lib/data";
import {
  getPayrollRecords,
  patchReturnFromPayroll,
} from "@/lib/mtd-completion";
import {
  countMTDByCheerSubtype,
  countMTDByDanceSubtype,
  countMTDByForm,
  filterMTDRecords,
  matchesMTDSearch,
} from "@/lib/mtd-filters";
import { parsePackage } from "@/lib/package";
import { findLinkedOrder, findProducerByAssignmentKey } from "@/lib/editor-assignment";
import type {
  CheerFormSubtype,
  DanceFormSubtype,
  MTDRecord,
  OrderFormType,
} from "@/types";

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";
const DEFAULT_CHEER_SUBTYPE: CheerFormSubtype = "all-star-cheer";
const DEFAULT_DANCE_SUBTYPE: DanceFormSubtype = "pom";

const actionLinkClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-line/70 bg-brand-bg/60 text-brand-ink-secondary shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/25";

export default function PayrollPage() {
  const { mtdRecords, allOrders, producers, updateMTD } = useAppState();
  const [returnRecord, setReturnRecord] = useState<MTDRecord | null>(null);
  const [form, setForm] = useState<OrderFormType>(DEFAULT_FORM);
  const [cheerSubtype, setCheerSubtype] = useState<CheerFormSubtype>(
    DEFAULT_CHEER_SUBTYPE
  );
  const [danceSubtype, setDanceSubtype] = useState<DanceFormSubtype>(
    DEFAULT_DANCE_SUBTYPE
  );
  const [tableFilters, setTableFilters] = useState<MTDTableFilterState>(
    DEFAULT_MTD_TABLE_FILTERS
  );
  const [searchQuery, setSearchQuery] = useState("");

  const payrollRecords = useMemo(
    () =>
      [...getPayrollRecords(mtdRecords)].sort((a, b) =>
        (b.completedAt ?? "").localeCompare(a.completedAt ?? "")
      ),
    [mtdRecords]
  );

  const orderById = useMemo(
    () => new Map(allOrders.map((order) => [order.id, order])),
    [allOrders]
  );

  const switchForm = useCallback((next: OrderFormType) => {
    setForm(next);
    if (next !== "school-all-star-cheer") {
      setCheerSubtype(DEFAULT_CHEER_SUBTYPE);
    }
    if (next !== "school-all-star-dance") {
      setDanceSubtype(DEFAULT_DANCE_SUBTYPE);
    }
  }, []);

  const tableFiltered = useMemo(
    () =>
      filterMTDRecords(payrollRecords, {
        packageTier: tableFilters.packageTier,
        timeLimit: tableFilters.timeLimit,
        split: tableFilters.split,
        assignedProducer: tableFilters.assignedProducer,
        requestedProducer: tableFilters.requestedProducer,
        dateFilter: tableFilters.dateFilter,
        scheduleFilter: tableFilters.scheduleFilter,
        infoFilter: tableFilters.infoFilter ?? "all",
        form,
        cheerSubtype,
        danceSubtype,
        orderById,
        producers,
      }),
    [
      payrollRecords,
      tableFilters,
      form,
      cheerSubtype,
      danceSubtype,
      orderById,
      producers,
    ]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return tableFiltered;
    return tableFiltered.filter((rec) => matchesMTDSearch(rec, q));
  }, [tableFiltered, searchQuery]);

  const totalPayroll = useMemo(
    () =>
      filtered.reduce((sum, rec) => {
        const order = orderById.get(rec.orderId || "");
        const payout = rec.producerPayout ?? order?.producerPayout ?? 0;
        return sum + payout;
      }, 0),
    [filtered, orderById]
  );

  const formCounts = useMemo(
    () => countMTDByForm(payrollRecords, orderById),
    [payrollRecords, orderById]
  );

  const cheerSubtypeCounts = useMemo(
    () => countMTDByCheerSubtype(payrollRecords, orderById),
    [payrollRecords, orderById]
  );

  const danceSubtypeCounts = useMemo(
    () => countMTDByDanceSubtype(payrollRecords, orderById),
    [payrollRecords, orderById]
  );

  const tableFilterKey = [
    tableFilters.packageTier,
    tableFilters.timeLimit,
    tableFilters.split,
    tableFilters.assignedProducer,
    tableFilters.requestedProducer,
    tableFilters.scheduleFilter,
    tableFilters.infoFilter,
    tableFilters.dateFilter.type,
    String(tableFilters.dateFilter.value),
    searchQuery,
  ].join("-");

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
        header: "Customer Price",
        width: "110px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => {
          const order = findLinkedOrder(rec, allOrders);
          const custPrice =
            order?.finalCustomerPrice ??
            order?.systemCalculatedCustomerPrice ??
            rec.finalCustomerPrice ??
            rec.systemCalculatedCustomerPrice ??
            rec.price;
          const isOverridden = Boolean(
            order?.finalCustomerPriceOverridden ?? rec.finalCustomerPriceOverridden
          );

          return (
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-[12px] font-semibold tabular-nums text-brand-ink">
                  {formatPrice(custPrice)}
                </span>
                {isOverridden && (
                  <span
                    className="rounded bg-brand-orange/10 px-1 py-0.2 text-[9px] font-semibold uppercase text-brand-orange ring-1 ring-inset ring-brand-orange/20"
                    title="Customer price overridden"
                  >
                    edited
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: "payout",
        header: "Producer Payout / SLT",
        width: "148px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => {
          const order = findLinkedOrder(rec, allOrders);
          const producerObj = findProducerByAssignmentKey(
            rec.assignedProducer,
            producers
          );
          const model = producerObj?.compensationModel;

          const payout = rec.producerPayout ?? order?.producerPayout;
          const slt = rec.sltPortion ?? order?.sltPortion;
          const isRateOverridden =
            rec.rateSource === "manual_override" ||
            order?.rateSource === "manual_override";
          const isPriceOverridden = Boolean(
            rec.finalCustomerPriceOverridden || order?.finalCustomerPriceOverridden
          );

          if (model === "not_paid_for_mixing") {
            return (
              <div className="flex flex-col items-center">
                <span className="text-[12px] font-semibold tabular-nums text-brand-ink">
                  $0.00
                </span>
                <span className="text-[10px] text-brand-ink-tertiary">
                  Not Paid for Mixing
                </span>
              </div>
            );
          }

          if (model === "hourly_manual") {
            return (
              <div className="flex flex-col items-center">
                <span className="text-[12px] font-semibold tabular-nums text-brand-ink">
                  {payout !== undefined && payout !== null
                    ? formatPrice(payout)
                    : "Hourly"}
                </span>
                <span className="text-[10px] text-brand-ink-tertiary">
                  Manual Pay Sheet
                </span>
              </div>
            );
          }

          if (payout === undefined || payout === null) {
            return (
              <div className="flex flex-col items-center">
                <span className="text-[12px] font-semibold tabular-nums text-brand-orange">
                  Needs Review
                </span>
                <span className="text-[10px] text-brand-ink-tertiary">
                  No rate on file
                </span>
              </div>
            );
          }

          return (
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-[12px] font-bold tabular-nums text-brand-success">
                  {formatPrice(payout)}
                </span>
                {(isRateOverridden || isPriceOverridden) && (
                  <span
                    className="rounded bg-brand-orange/10 px-1 py-0.2 text-[9px] font-semibold uppercase text-brand-orange ring-1 ring-inset ring-brand-orange/20"
                    title="Rate or customer price overridden"
                  >
                    edited
                  </span>
                )}
              </div>
              <span className="text-[10px] text-brand-ink-secondary tabular-nums">
                SLT: {slt !== undefined && slt !== null ? formatPrice(slt) : "—"}
              </span>
            </div>
          );
        },
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
    [allOrders, producers]
  );

  return (
    <>
      <PageHeader
        title="Payroll"
        badge={`${filtered.length} of ${payrollRecords.length} · ${formatPrice(totalPayroll)}`}
        subtitle="Completed mixes ready for payout"
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: "Contact, invoice…",
        }}
        toolbar={
          <MTDPageToolbar
            form={form}
            cheerSubtype={cheerSubtype}
            danceSubtype={danceSubtype}
            onFormChange={switchForm}
            onCheerSubtypeChange={setCheerSubtype}
            onDanceSubtypeChange={setDanceSubtype}
            formCounts={formCounts}
            cheerCounts={cheerSubtypeCounts}
            danceCounts={danceSubtypeCounts}
            records={payrollRecords}
            producers={producers}
            orderById={orderById}
            filters={tableFilters}
            onFiltersChange={(patch) =>
              setTableFilters((prev) => ({ ...prev, ...patch }))
            }
            onFiltersReset={() => setTableFilters(DEFAULT_MTD_TABLE_FILTERS)}
          />
        }
      />

      <div className="px-6 pb-6 pt-5 lg:px-8">
        <div className="dashboard-panel dashboard-panel-framed overflow-hidden">
          <DataTable
            key={`${form}-${cheerSubtype}-${danceSubtype}-${tableFilterKey}`}
            columns={columns}
            data={filtered}
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
