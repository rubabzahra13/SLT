"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  ArrowLeft,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Send,
  User,
} from "lucide-react";
import type { MTDRecord, Order, Producer } from "@/types";
import { DateFilter, type DateFilterValue } from "@/components/ui/DateFilter";
import { ProducerSelect } from "@/components/ui/ProducerSelect";
import { Avatar } from "@/components/ui/Avatar";
import { formatPrice } from "@/lib/data";
import { calculateDateBounds, todayIso } from "@/lib/date-filters";
import { doDateRangesOverlap, toCanonicalIsoDate } from "@/lib/dates";
import {
  PRODUCER_STATEMENT_COLUMNS,
  getProducerFacingPayrollRows,
  generateProducerFacingPayrollCsv,
  triggerCsvDownload,
  type ProducerFacingPayrollRow,
} from "@/lib/export-csv";
import { findProducerByAssignmentKey } from "@/lib/editor-assignment";

type ProducerStatementPreviewProps = {
  selectedProducer: string;
  onProducerChange: (producer: string) => void;
  selectedPeriod: DateFilterValue;
  onPeriodChange: (period: DateFilterValue) => void;
  payrollRecords: MTDRecord[];
  allOrders: Order[];
  producers: Producer[];
  onBack?: () => void;
  embedded?: boolean;
  allowedProducerNames?: string[];
  sendLayout?: "together" | "separate";
};

function StatementPreviewTable({ rows }: { rows: ProducerFacingPayrollRow[] }) {
  return (
    <div className="dashboard-panel dashboard-panel-framed overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-brand-line/70 bg-brand-surface/90 px-4 py-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-brand-orange" />
          <h4 className="text-[13px] font-bold tracking-wide text-brand-ink">
            Statement Data Preview (Matching CSV Export)
          </h4>
        </div>
        <span className="font-mono text-[11px] text-brand-ink-tertiary">
          {PRODUCER_STATEMENT_COLUMNS.length} columns
        </span>
      </div>

      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full min-w-[1200px] border-collapse text-left">
          <thead>
            <tr className="table-header-row border-b border-brand-line/70 bg-brand-bg/80">
              <th className="table-header-cell w-12 px-3 py-2.5 text-center text-[11px] font-bold uppercase text-brand-ink-secondary">
                #
              </th>
              {PRODUCER_STATEMENT_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="table-header-cell whitespace-nowrap px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-brand-ink-secondary"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-line/50 bg-white">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={PRODUCER_STATEMENT_COLUMNS.length + 1}
                  className="px-6 py-12 text-center text-brand-ink-secondary"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <User className="h-8 w-8 text-brand-ink-tertiary/40" />
                    <p className="text-[14px] font-semibold text-brand-ink">
                      No completed mixes in this pay period.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={row.recId || idx}
                  className="transition-colors hover:bg-brand-orange-soft/20"
                >
                  <td className="px-3 py-2 text-center text-[12px] font-semibold tabular-nums text-brand-ink-tertiary">
                    {idx + 1}
                  </td>
                  {PRODUCER_STATEMENT_COLUMNS.map((col) => {
                    const val = row[col.key];
                    const isTotalCol = col.key === "totalPayout";
                    const isProgramCol = col.key === "programName";

                    return (
                      <td
                        key={col.key}
                        className={`whitespace-nowrap px-3 py-2.5 text-[12px] ${
                          isTotalCol
                            ? "font-bold tabular-nums text-brand-success"
                            : isProgramCol
                              ? "font-semibold text-brand-ink"
                              : "text-brand-ink-secondary"
                        }`}
                      >
                        {val || "—"}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ProducerStatementPreview({
  selectedProducer,
  onProducerChange,
  selectedPeriod,
  onPeriodChange,
  payrollRecords,
  allOrders,
  producers,
  onBack,
  embedded = false,
  allowedProducerNames,
  sendLayout = "separate",
}: ProducerStatementPreviewProps) {
  const [activeTabProducer, setActiveTabProducer] = useState("");
  const [collapsedProducers, setCollapsedProducers] = useState<Set<string>>(
    () => new Set()
  );

  const filterPeriod = useMemo(() => {
    const bounds = calculateDateBounds(selectedPeriod.type, selectedPeriod.value);
    return {
      start: bounds.start ? toCanonicalIsoDate(bounds.start) : "",
      end: bounds.end ? toCanonicalIsoDate(bounds.end) : "",
    };
  }, [selectedPeriod]);

  const activeProducerSummaries = useMemo(() => {
    const dateMatching = payrollRecords.filter((rec) => {
      const recStart = rec.completedAt || rec.mixStartDate || "";
      const recEnd = rec.completedAt || rec.mixEndDate || rec.mixStartDate || "";
      return doDateRangesOverlap({ start: recStart, end: recEnd }, filterPeriod);
    });

    const payoutByProducer = new Map<string, number>();

    for (const rec of dateMatching) {
      if (!rec.assignedProducer) continue;
      const prodObj = findProducerByAssignmentKey(rec.assignedProducer, producers);
      const name = prodObj?.name || rec.assignedProducer;
      if (!name) continue;
      payoutByProducer.set(name, (payoutByProducer.get(name) ?? 0) + 1);
    }

    const allowed =
      allowedProducerNames && allowedProducerNames.length > 0
        ? new Set(allowedProducerNames.map((name) => name.toUpperCase()))
        : null;

    return Array.from(payoutByProducer.entries())
      .map(([name, mixCount]) => {
        const rows = getProducerFacingPayrollRows(
          payrollRecords,
          allOrders,
          producers,
          name,
          filterPeriod
        );
        const total = rows.reduce((sum, row) => sum + row.rawTotalPayout, 0);
        const producerObj =
          producers.find(
            (p) => p.name.toUpperCase() === name.toUpperCase() || p.id === name
          ) || findProducerByAssignmentKey(name, producers);
        return { name, mixCount, total, producerObj, rows };
      })
      .filter((entry) => !allowed || allowed.has(entry.name.toUpperCase()))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }, [
    payrollRecords,
    allOrders,
    producers,
    filterPeriod,
    allowedProducerNames,
  ]);

  const activeProducersInPeriod = useMemo(
    () => activeProducerSummaries.map((entry) => entry.name),
    [activeProducerSummaries]
  );

  const producerNamesKey = activeProducersInPeriod.join("|");

  useEffect(() => {
    if (!embedded || sendLayout !== "together") return;
    setCollapsedProducers(new Set(activeProducersInPeriod.slice(1)));
  }, [embedded, sendLayout, producerNamesKey, activeProducersInPeriod]);

  const toggleProducerCollapsed = (name: string) => {
    setCollapsedProducers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const currentProducerToView = useMemo(() => {
    if (selectedProducer !== "all") {
      const found = producers.find(
        (p) =>
          p.id === selectedProducer ||
          p.name.toUpperCase() === selectedProducer.toUpperCase()
      );
      return found ? found.name : selectedProducer;
    }
    if (activeTabProducer && activeProducersInPeriod.includes(activeTabProducer)) {
      return activeTabProducer;
    }
    return activeProducersInPeriod[0] || producers[0]?.name || "";
  }, [selectedProducer, activeTabProducer, activeProducersInPeriod, producers]);

  const currentRows = useMemo(() => {
    return getProducerFacingPayrollRows(
      payrollRecords,
      allOrders,
      producers,
      currentProducerToView,
      filterPeriod
    );
  }, [payrollRecords, allOrders, producers, currentProducerToView, filterPeriod]);

  const currentProducerTotal = useMemo(
    () => currentRows.reduce((sum, row) => sum + row.rawTotalPayout, 0),
    [currentRows]
  );

  const currentProducerObj = useMemo(() => {
    return (
      producers.find(
        (p) =>
          p.name.toUpperCase() === currentProducerToView.toUpperCase() ||
          p.id.toUpperCase() === currentProducerToView.toUpperCase()
      ) || findProducerByAssignmentKey(currentProducerToView, producers)
    );
  }, [producers, currentProducerToView]);

  const handleDownloadCurrentProducer = () => {
    const csv = generateProducerFacingPayrollCsv(
      payrollRecords,
      allOrders,
      producers,
      currentProducerToView,
      filterPeriod
    );
    triggerCsvDownload(
      `Payroll_Producer_Statement_${currentProducerToView.replace(/\s+/g, "_")}_${todayIso()}.csv`,
      csv
    );
  };

  const handleDownloadAllProducers = () => {
    const targets =
      selectedProducer === "all" ? activeProducersInPeriod : [currentProducerToView];
    if (targets.length === 0) {
      if (typeof window !== "undefined") {
        alert("No completed records found for the selected pay period.");
      }
      return;
    }

    targets.forEach((targetName) => {
      const csv = generateProducerFacingPayrollCsv(
        payrollRecords,
        allOrders,
        producers,
        targetName,
        filterPeriod
      );
      triggerCsvDownload(
        `Payroll_Producer_Statement_${targetName.replace(/\s+/g, "_")}_${todayIso()}.csv`,
        csv
      );
    });
  };

  return (
    <div className={embedded ? "space-y-4" : "space-y-5 animate-fade-in px-6 py-6 lg:px-8"}>
      {!embedded ? (
        <>
          <div className="flex flex-col justify-between gap-4 border-b border-brand-line/70 pb-4 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-brand-line/80 bg-brand-elevated px-3 text-[13px] font-semibold text-brand-ink shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange focus:outline-none"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Payroll</span>
                </button>
              ) : null}
              <div>
                <h2 className="text-[20px] font-bold tracking-tight text-brand-ink">
                  Producer Statement Preview
                </h2>
                <p className="mt-0.5 text-[12px] text-brand-ink-secondary">
                  Exact on-screen preview of the statement sent to the producer.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadCurrentProducer}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-brand-line/80 bg-brand-elevated px-3.5 text-[12px] font-semibold text-brand-ink shadow-sm transition hover:border-brand-line-strong hover:bg-brand-bg"
              >
                <Download className="h-4 w-4 text-brand-ink-secondary" />
                <span>Export Statement CSV</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadAllProducers}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-cta px-4 text-[12px] font-semibold text-brand-cta-text shadow-sm transition hover:bg-brand-cta-hover active:scale-[0.98]"
              >
                <Send className="h-4 w-4" />
                <span>
                  {selectedProducer === "all"
                    ? "Send to All (Download Files)"
                    : "Send Statement (Download)"}
                </span>
              </button>
            </div>
          </div>

          <div className="dashboard-panel relative z-20 !overflow-visible flex flex-col justify-between gap-4 rounded-2xl border border-brand-line/70 bg-brand-surface/90 p-4 shadow-sm md:flex-row md:items-center">
            <div className="flex flex-wrap items-center gap-3">
              <ProducerSelect
                producers={producers}
                value={selectedProducer}
                onChange={(val) => {
                  onProducerChange(val);
                  if (val !== "all") setActiveTabProducer("");
                }}
                label="Editor:"
                allLabel="All Editors"
              />

              <div className="flex items-center gap-2">
                <label className="text-[12px] font-semibold text-brand-ink-secondary">
                  Payroll Period:
                </label>
                <DateFilter value={selectedPeriod} onChange={onPeriodChange} />
              </div>
            </div>
          </div>

          {selectedProducer === "all" && activeProducersInPeriod.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold uppercase tracking-wider text-brand-ink-tertiary">
                  Active Producer Statements ({activeProducersInPeriod.length})
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">
                {activeProducerSummaries.map(({ name, mixCount, total, producerObj }) => {
                  const isSelected =
                    currentProducerToView.toUpperCase() === name.toUpperCase();
                  const dotColor = producerObj?.color || "#94a3b8";

                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setActiveTabProducer(name)}
                      className={clsx(
                        "flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[12px] font-medium shadow-sm transition",
                        isSelected
                          ? "border-brand-orange/60 bg-brand-orange-soft/40 text-brand-ink ring-2 ring-brand-orange/20"
                          : "border-brand-line/70 bg-brand-surface text-brand-ink-secondary hover:border-brand-line-strong hover:bg-brand-bg"
                      )}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: dotColor }}
                        aria-hidden="true"
                      />
                      <span className="font-semibold text-brand-ink">{name}</span>
                      <span className="rounded bg-black/5 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-brand-ink-secondary">
                        {mixCount} mixes · {formatPrice(total)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="dashboard-panel flex flex-col justify-between gap-4 rounded-2xl border border-brand-line/70 bg-gradient-to-r from-brand-surface to-brand-bg/80 p-5 shadow-sm md:flex-row md:items-center">
            <div className="flex items-center gap-3.5">
              <Avatar producer={currentProducerObj} name={currentProducerToView} size="md" />
              <div>
                <h3 className="text-[16px] font-bold text-brand-ink">
                  {currentProducerToView}&apos;s Payroll Statement
                </h3>
                <p className="mt-0.5 text-[12px] text-brand-ink-secondary">
                  Previewing payout statement
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-brand-line/60 bg-brand-surface/90 px-4 py-2.5 shadow-sm">
              <div className="text-right">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-brand-ink-tertiary">
                  Total Payout
                </span>
                <span className="text-[20px] font-extrabold tabular-nums text-brand-success">
                  {formatPrice(currentProducerTotal)}
                </span>
              </div>
              <div className="h-8 w-px bg-brand-line/70" />
              <div className="text-right">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-brand-ink-tertiary">
                  Completed Mixes
                </span>
                <span className="text-[18px] font-bold tabular-nums text-brand-ink">
                  {currentRows.length}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div className="min-h-0 space-y-4">
        {embedded && sendLayout === "together" ? (
          activeProducerSummaries.map(({ name, mixCount, total, producerObj, rows }, index) => {
            const isCollapsed = collapsedProducers.has(name);

            return (
              <section
                key={name}
                className="overflow-hidden rounded-2xl border border-brand-line/70 bg-brand-surface/90 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleProducerCollapsed(name)}
                  aria-expanded={!isCollapsed}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-brand-bg/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={clsx(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold tabular-nums tracking-tight ring-1 ring-inset transition",
                        !isCollapsed
                          ? "bg-brand-orange-soft/55 text-brand-orange ring-brand-orange/30"
                          : "bg-brand-bg/90 text-brand-ink-tertiary ring-brand-line/55"
                      )}
                      aria-hidden
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <Avatar producer={producerObj} name={name} size="md" />
                    <div className="min-w-0">
                      <h3 className="truncate text-[15px] font-bold text-brand-ink">
                        {name}
                      </h3>
                      <p className="text-[12px] text-brand-ink-secondary">
                        {mixCount} mix{mixCount === 1 ? "" : "es"} · {formatPrice(total)}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={clsx(
                      "h-4 w-4 shrink-0 text-brand-ink-tertiary transition-transform duration-200",
                      !isCollapsed && "rotate-180"
                    )}
                    strokeWidth={2}
                    aria-hidden
                  />
                </button>
                {!isCollapsed ? (
                  <div className="border-t border-brand-line/60 px-3 pb-3">
                    <StatementPreviewTable rows={rows} />
                  </div>
                ) : null}
              </section>
            );
          })
        ) : (
          <>
            <div className="dashboard-panel flex items-center justify-between gap-4 rounded-2xl border border-brand-line/70 bg-brand-surface/90 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  producer={currentProducerObj}
                  name={currentProducerToView}
                  size="md"
                />
                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-bold text-brand-ink">
                    {currentProducerToView}
                  </h3>
                  <p className="text-[12px] text-brand-ink-secondary">
                    {currentRows.length} mix{currentRows.length === 1 ? "" : "es"} ·{" "}
                    {formatPrice(currentProducerTotal)}
                  </p>
                </div>
              </div>
            </div>
            <StatementPreviewTable rows={currentRows} />
          </>
        )}
      </div>
    </div>
  );
}
