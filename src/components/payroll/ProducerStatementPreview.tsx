"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Download, FileSpreadsheet, Send, User } from "lucide-react";
import type { MTDRecord, Order, Producer } from "@/types";
import { DateFilter, type DateFilterValue } from "@/components/ui/DateFilter";
import { ProducerSelect } from "@/components/ui/ProducerSelect";
import { Avatar } from "@/components/ui/Avatar";
import { formatPrice } from "@/lib/data";
import { calculateDateBounds, getDateFilterLabel, todayIso } from "@/lib/date-filters";
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
  onBack: () => void;
};

export function ProducerStatementPreview({
  selectedProducer,
  onProducerChange,
  selectedPeriod,
  onPeriodChange,
  payrollRecords,
  allOrders,
  producers,
  onBack,
}: ProducerStatementPreviewProps) {
  const [activeTabProducer, setActiveTabProducer] = useState<string>("");

  const filterPeriod = useMemo(() => {
    const bounds = calculateDateBounds(selectedPeriod.type, selectedPeriod.value);
    return {
      start: bounds.start ? toCanonicalIsoDate(bounds.start) : "",
      end: bounds.end ? toCanonicalIsoDate(bounds.end) : "",
    };
  }, [selectedPeriod]);

  // Find all active producers who have records in this pay period
  const activeProducersInPeriod = useMemo(() => {
    const dateMatching = payrollRecords.filter((rec) => {
      const recStart = rec.completedAt || rec.mixStartDate || "";
      const recEnd = rec.completedAt || rec.mixEndDate || rec.mixStartDate || "";
      return doDateRangesOverlap({ start: recStart, end: recEnd }, filterPeriod);
    });

    const set = new Set<string>();
    for (const r of dateMatching) {
      if (r.assignedProducer) {
        const prodObj = findProducerByAssignmentKey(r.assignedProducer, producers);
        const name = prodObj?.name || r.assignedProducer;
        if (name) set.add(name);
      }
    }
    return Array.from(set).sort();
  }, [payrollRecords, producers, filterPeriod]);

  // Determine current active producer name to view
  const currentProducerToView = useMemo(() => {
    if (selectedProducer !== "all") {
      const found = producers.find(
        (p) => p.id === selectedProducer || p.name.toUpperCase() === selectedProducer.toUpperCase()
      );
      return found ? found.name : selectedProducer;
    }
    if (activeTabProducer && activeProducersInPeriod.includes(activeTabProducer)) {
      return activeTabProducer;
    }
    return activeProducersInPeriod[0] || producers[0]?.name || "Casey Marlow";
  }, [selectedProducer, activeTabProducer, activeProducersInPeriod, producers]);

  // Get rows for currently viewed producer
  const currentRows = useMemo(() => {
    return getProducerFacingPayrollRows(
      payrollRecords,
      allOrders,
      producers,
      currentProducerToView,
      filterPeriod
    );
  }, [payrollRecords, allOrders, producers, currentProducerToView, filterPeriod]);

  // Calculate total payout sum for currently viewed producer
  const currentProducerTotal = useMemo(() => {
    return currentRows.reduce((sum, r) => sum + r.rawTotalPayout, 0);
  }, [currentRows]);

  // Producer object for avatar/color display
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
    const targets = selectedProducer === "all" ? activeProducersInPeriod : [currentProducerToView];
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
    <div className="px-6 py-6 lg:px-8 space-y-5 animate-fade-in">
      {/* Top Header Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-line/70 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-brand-line/80 bg-brand-elevated px-3 text-[13px] font-semibold text-brand-ink shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange focus:outline-none"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Payroll</span>
          </button>
          <div>
            <h2 className="text-[20px] font-bold text-brand-ink tracking-tight">
              Producer Statement Preview
            </h2>
            <p className="text-[12px] text-brand-ink-secondary mt-0.5">
              Exact on-screen visual preview of the statement sent to the producer. No internal revenue or cross-producer data exposed.
            </p>
          </div>
        </div>

        {/* Action Controls */}
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
            <span>{selectedProducer === "all" ? "Send to All (Download Files)" : "Send Statement (Download)"}</span>
          </button>
        </div>
      </div>

      {/* Control Filter Strip */}
      <div className="dashboard-panel relative z-20 !overflow-visible p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-brand-line/70 bg-brand-surface/90 shadow-sm rounded-2xl">
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

      {/* Multi-Producer Tabs if All Editors selected */}
      {selectedProducer === "all" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-brand-ink-tertiary">
              Active Producer Statements ({activeProducersInPeriod.length})
            </h3>
            <span className="text-[12px] text-brand-ink-secondary">
              Click a producer below to preview their specific payout statement table:
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeProducersInPeriod.map((prodName) => {
              const pObj = producers.find(
                (p) => p.name.toUpperCase() === prodName.toUpperCase() || p.id === prodName
              ) || findProducerByAssignmentKey(prodName, producers);
              const pRows = getProducerFacingPayrollRows(
                payrollRecords,
                allOrders,
                producers,
                prodName,
                filterPeriod
              );
              const pTotal = pRows.reduce((sum, r) => sum + r.rawTotalPayout, 0);
              const isSelected = currentProducerToView.toUpperCase() === prodName.toUpperCase();
              const dotColor = pObj?.color || "#94a3b8";

              return (
                <button
                  key={prodName}
                  type="button"
                  onClick={() => setActiveTabProducer(prodName)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12px] font-medium transition border shadow-sm ${
                    isSelected
                      ? "border-brand-orange/60 bg-brand-orange-soft/40 text-brand-ink ring-2 ring-brand-orange/20"
                      : "border-brand-line/70 bg-brand-surface text-brand-ink-secondary hover:border-brand-line-strong hover:bg-brand-bg"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-black/10"
                    style={{ backgroundColor: dotColor }}
                    aria-hidden="true"
                  />
                  <span className="font-semibold text-brand-ink">{prodName}</span>
                  <span className="rounded bg-black/5 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-brand-ink-secondary">
                    {pRows.length} mixes · {formatPrice(pTotal)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Producer Statement Summary Card */}
      <div className="dashboard-panel p-5 border border-brand-line/70 bg-gradient-to-r from-brand-surface to-brand-bg/80 shadow-sm rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Avatar producer={currentProducerObj} name={currentProducerToView} size="md" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] font-bold text-brand-ink">
                {currentProducerToView}'s Payroll Statement
              </h3>
              {currentProducerObj?.color && (
                <span
                  className="h-3 w-3 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: currentProducerObj.color }}
                  title={`${currentProducerToView} accent color`}
                />
              )}
            </div>
            <p className="text-[12px] text-brand-ink-secondary mt-0.5">
              Previewing payout statement
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-brand-surface/90 border border-brand-line/60 rounded-xl px-4 py-2.5 shadow-sm">
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

      {/* Main Producer Statement Preview Table */}
      <div className="dashboard-panel dashboard-panel-framed overflow-hidden rounded-2xl">
        <div className="border-b border-brand-line/70 bg-brand-surface/90 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-brand-orange" />
            <h4 className="text-[13px] font-bold text-brand-ink tracking-wide">
              Statement Data Preview (Matching CSV Export)
            </h4>
          </div>
          <span className="text-[11px] text-brand-ink-tertiary font-mono">
            {PRODUCER_STATEMENT_COLUMNS.length} columns
          </span>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="table-header-row bg-brand-bg/80 border-b border-brand-line/70">
                <th className="table-header-cell px-3 py-2.5 text-[11px] font-bold uppercase text-brand-ink-secondary w-12 text-center">
                  #
                </th>
                {PRODUCER_STATEMENT_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="table-header-cell px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-brand-ink-secondary whitespace-nowrap"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-line/50 bg-white">
              {currentRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={PRODUCER_STATEMENT_COLUMNS.length + 1}
                    className="px-6 py-12 text-center text-brand-ink-secondary"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <User className="h-8 w-8 text-brand-ink-tertiary/40" />
                      <p className="text-[14px] font-semibold text-brand-ink">
                        No completed mixes for {currentProducerToView} in this pay period.
                      </p>
                      <p className="text-[12px] text-brand-ink-tertiary">
                        Try selecting a different pay period or producer above.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentRows.map((row, idx) => (
                  <tr
                    key={row.recId || idx}
                    className="hover:bg-brand-orange-soft/20 transition-colors"
                  >
                    <td className="px-3 py-2 text-center text-[12px] tabular-nums font-semibold text-brand-ink-tertiary">
                      {idx + 1}
                    </td>
                    {PRODUCER_STATEMENT_COLUMNS.map((col) => {
                      const val = row[col.key];
                      const isTotalCol = col.key === "totalPayout";
                      const isProgramCol = col.key === "programName";

                      return (
                        <td
                          key={col.key}
                          className={`px-3 py-2.5 text-[12px] whitespace-nowrap ${
                            isTotalCol
                              ? "font-bold text-brand-success tabular-nums"
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
    </div>
  );
}
