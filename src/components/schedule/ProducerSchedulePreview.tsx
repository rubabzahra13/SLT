"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Download, FileSpreadsheet, Send } from "lucide-react";
import type { MTDRecord, Order, Producer } from "@/types";
import { ProducerSelect } from "@/components/ui/ProducerSelect";
import { Avatar } from "@/components/ui/Avatar";
import { todayIso } from "@/lib/date-filters";
import {
  PRODUCER_SCHEDULE_COLUMNS,
  getProducerFacingScheduleRows,
  generateScheduleCsv,
  triggerCsvDownload,
  isEligibleProducerScheduleRecord,
  type ProducerFacingScheduleRow,
} from "@/lib/export-csv";
import { findProducerByAssignmentKey } from "@/lib/editor-assignment";

type ProducerSchedulePreviewProps = {
  selectedProducer: string;
  onProducerChange: (producer: string) => void;
  mtdRecords: MTDRecord[];
  allOrders: Order[];
  producers: Producer[];
  onBack: () => void;
};

export function ProducerSchedulePreview({
  selectedProducer,
  onProducerChange,
  mtdRecords,
  allOrders,
  producers,
  onBack,
}: ProducerSchedulePreviewProps) {
  const [activeTabProducer, setActiveTabProducer] = useState<string>("");

  // Find all producers who have ongoing assigned MTD records with valid schedule dates
  const activeProducersInSchedule = useMemo(() => {
    const eligibleRecords = mtdRecords.filter(isEligibleProducerScheduleRecord);

    const set = new Set<string>();
    for (const r of eligibleRecords) {
      if (r.assignedProducer) {
        const prodObj = findProducerByAssignmentKey(r.assignedProducer, producers);
        const name = prodObj?.name || r.assignedProducer;
        if (name) set.add(name);
      }
    }
    return Array.from(set).sort();
  }, [mtdRecords, producers]);

  // Determine current active producer name to view
  const currentProducerToView = useMemo(() => {
    if (selectedProducer !== "all") {
      const found = producers.find(
        (p) => p.id === selectedProducer || p.name.toUpperCase() === selectedProducer.toUpperCase()
      );
      return found ? found.name : selectedProducer;
    }
    if (activeTabProducer && activeProducersInSchedule.includes(activeTabProducer)) {
      return activeTabProducer;
    }
    return activeProducersInSchedule[0] || producers[0]?.name || "Casey Marlow";
  }, [selectedProducer, activeTabProducer, activeProducersInSchedule, producers]);

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

  // Get ongoing schedule rows for currently viewed producer
  const currentRows = useMemo(() => {
    return getProducerFacingScheduleRows(
      mtdRecords,
      allOrders,
      producers,
      currentProducerToView
    );
  }, [mtdRecords, allOrders, producers, currentProducerToView]);

  const handleDownloadCurrentProducer = () => {
    const csv = generateScheduleCsv(
      mtdRecords,
      allOrders,
      producers,
      currentProducerToView
    );
    triggerCsvDownload(
      `Schedule_Producer_Statement_${currentProducerToView.replace(/\s+/g, "_")}_${todayIso()}.csv`,
      csv
    );
  };

  const handleDownloadAllProducers = () => {
    const targets = selectedProducer === "all" ? activeProducersInSchedule : [currentProducerToView];
    if (targets.length === 0) {
      if (typeof window !== "undefined") {
        alert("No ongoing scheduled mixes found for the active producers.");
      }
      return;
    }

    targets.forEach((targetName) => {
      const csv = generateScheduleCsv(
        mtdRecords,
        allOrders,
        producers,
        targetName
      );
      triggerCsvDownload(
        `Schedule_${targetName.replace(/\s+/g, "_")}_${todayIso()}.csv`,
        csv
      );
    });
  };

  return (
    <div className="space-y-5">
      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-line/60 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-brand-line/70 bg-brand-surface text-brand-ink-secondary shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange"
            title="Back to Schedule Overview"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-[18px] font-bold text-brand-ink">
              Producer Schedule Preview
            </h2>
            <p className="text-[12px] text-brand-ink-secondary">
              Exact on-screen visual preview of the schedule statement sent to the producer.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <ProducerSelect
            producers={producers}
            value={selectedProducer}
            onChange={(val) => {
              onProducerChange(val);
              setActiveTabProducer("");
            }}
            label="Editor:"
            allLabel="All Editors"
          />

          <button
            type="button"
            onClick={handleDownloadCurrentProducer}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-brand-line/80 bg-brand-surface px-3.5 text-[12px] font-semibold text-brand-ink shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange active:scale-[0.98]"
          >
            <Download className="h-4 w-4 text-brand-orange" />
            <span>Export Schedule CSV</span>
          </button>

          {selectedProducer === "all" && (
            <button
              type="button"
              onClick={handleDownloadAllProducers}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-cta px-4 text-[12px] font-semibold text-brand-cta-text shadow-sm transition hover:bg-brand-cta-hover active:scale-[0.98]"
            >
              <Send className="h-4 w-4" />
              <span>Send to All (Download Files)</span>
            </button>
          )}
        </div>
      </div>

      {/* Producer Selector Tabs (When "All Editors" is selected) */}
      {selectedProducer === "all" && activeProducersInSchedule.length > 0 && (
        <div className="dashboard-panel p-3 border border-brand-line/70 bg-brand-surface/90 rounded-2xl">
          <div className="text-[11px] font-bold uppercase tracking-wider text-brand-ink-tertiary mb-2 px-1">
            Active Producer Schedules ({activeProducersInSchedule.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {activeProducersInSchedule.map((prodName) => {
              const pObj =
                producers.find(
                  (p) => p.name.toUpperCase() === prodName.toUpperCase() || p.id === prodName
                ) || findProducerByAssignmentKey(prodName, producers);
              const pRows = getProducerFacingScheduleRows(
                mtdRecords,
                allOrders,
                producers,
                prodName
              );
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
                    {pRows.length} mixes
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Producer Schedule Summary Card */}
      <div className="dashboard-panel p-5 border border-brand-line/70 bg-gradient-to-r from-brand-surface to-brand-bg/80 shadow-sm rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Avatar producer={currentProducerObj} name={currentProducerToView} size="md" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] font-bold text-brand-ink">
                {currentProducerToView}'s Schedule
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
              Previewing ongoing scheduled mixes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-brand-surface/90 border border-brand-line/60 rounded-xl px-4 py-2.5 shadow-sm">
          <div className="text-right">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-brand-ink-tertiary">
              Scheduled Mixes
            </span>
            <span className="text-[18px] font-bold tabular-nums text-brand-ink">
              {currentRows.length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Producer Schedule Preview Table */}
      <div className="dashboard-panel dashboard-panel-framed overflow-hidden rounded-2xl">
        <div className="border-b border-brand-line/70 bg-brand-surface/90 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-brand-orange" />
            <h4 className="text-[13px] font-bold text-brand-ink tracking-wide">
              Schedule Data Preview (Matching CSV Export)
            </h4>
          </div>
          <span className="text-[11px] text-brand-ink-tertiary font-mono">
            {PRODUCER_SCHEDULE_COLUMNS.length} columns
          </span>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="table-header-row bg-brand-bg/80 border-b border-brand-line/70">
                <th className="table-header-cell px-3 py-2.5 text-[11px] font-bold uppercase text-brand-ink-secondary w-12 text-center">
                  #
                </th>
                {PRODUCER_SCHEDULE_COLUMNS.map((col) => (
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
                    colSpan={PRODUCER_SCHEDULE_COLUMNS.length + 1}
                    className="px-4 py-8 text-center text-[13px] text-brand-ink-tertiary"
                  >
                    No ongoing scheduled mixes found for this producer.
                  </td>
                </tr>
              ) : (
                currentRows.map((row, idx) => (
                  <tr
                    key={row.recId || idx}
                    className="hover:bg-brand-bg/40 transition-colors"
                  >
                    <td className="px-3 py-2.5 text-[12px] font-mono text-center text-brand-ink-tertiary">
                      {idx + 1}
                    </td>
                    {PRODUCER_SCHEDULE_COLUMNS.map((col) => {
                      const val = row[col.key];
                      const isProgramCol = col.key === "programName";
                      const isStatusCol = col.key === "status";

                      return (
                        <td
                          key={col.key}
                          className={`px-3 py-2.5 text-[12px] whitespace-nowrap ${
                            isProgramCol
                              ? "font-semibold text-brand-ink"
                              : isStatusCol
                              ? "font-medium text-brand-orange"
                              : "text-brand-ink-secondary"
                          }`}
                        >
                          {String(val ?? "—")}
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
