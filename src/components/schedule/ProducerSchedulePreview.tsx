"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Search,
  Send,
} from "lucide-react";
import clsx from "clsx";
import type { MTDRecord, Order, Producer } from "@/types";
import { ProducerSelect } from "@/components/ui/ProducerSelect";
import { Avatar } from "@/components/ui/Avatar";
import { matchesProducerSearch } from "@/lib/producers";
import { todayIso } from "@/lib/date-filters";
import { doDateRangesOverlap } from "@/lib/dates";
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
  onBack?: () => void;
  embedded?: boolean;
  allowedProducerNames?: string[];
  sendLayout?: "together" | "separate";
  onViewingProducerChange?: (name: string) => void;
  filterPeriod?: { start: string; end: string };
};

function SchedulePreviewTable({ rows }: { rows: ProducerFacingScheduleRow[] }) {
  return (
    <div className="dashboard-panel dashboard-panel-framed overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-brand-line/70 bg-brand-surface/90 px-4 py-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-brand-orange" />
          <h4 className="text-[13px] font-bold tracking-wide text-brand-ink">
            Schedule Data Preview (Matching CSV Export)
          </h4>
        </div>
        <span className="font-mono text-[11px] text-brand-ink-tertiary">
          {PRODUCER_SCHEDULE_COLUMNS.length} columns
        </span>
      </div>

      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full min-w-[1000px] border-collapse text-left">
          <thead>
            <tr className="table-header-row border-b border-brand-line/70 bg-brand-bg/80">
              <th className="table-header-cell w-12 px-3 py-2.5 text-center text-[11px] font-bold uppercase text-brand-ink-secondary">
                #
              </th>
              {PRODUCER_SCHEDULE_COLUMNS.map((col) => (
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
                  colSpan={PRODUCER_SCHEDULE_COLUMNS.length + 1}
                  className="px-4 py-8 text-center text-[13px] text-brand-ink-tertiary"
                >
                  No ongoing scheduled mixes found for this producer.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={row.recId || idx}
                  className="transition-colors hover:bg-brand-bg/40"
                >
                  <td className="px-3 py-2.5 text-center font-mono text-[12px] text-brand-ink-tertiary">
                    {idx + 1}
                  </td>
                  {PRODUCER_SCHEDULE_COLUMNS.map((col) => {
                    const val = row[col.key];
                    const isProgramCol = col.key === "programName";
                    const isStatusCol = col.key === "status";

                    return (
                      <td
                        key={col.key}
                        className={`whitespace-nowrap px-3 py-2.5 text-[12px] ${
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
  );
}

export function ProducerSchedulePreview({
  selectedProducer,
  onProducerChange,
  mtdRecords,
  allOrders,
  producers,
  onBack,
  embedded = false,
  allowedProducerNames,
  sendLayout = "separate",
  onViewingProducerChange,
  filterPeriod,
}: ProducerSchedulePreviewProps) {
  const [activeTabProducer, setActiveTabProducer] = useState<string>("");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [collapsedProducers, setCollapsedProducers] = useState<Set<string>>(
    () => new Set()
  );

  const activeProducerSummaries = useMemo(() => {
    const eligibleRecords = mtdRecords.filter((r) => {
      if (!isEligibleProducerScheduleRecord(r)) return false;
      if (!filterPeriod) return true;
      const recStart = r.mixStartDate || r.completedAt || "";
      const recEnd = r.mixEndDate || r.mixStartDate || r.completedAt || "";
      return doDateRangesOverlap(
        { start: recStart, end: recEnd },
        filterPeriod
      );
    });
    const mixCounts = new Map<string, number>();

    for (const r of eligibleRecords) {
      if (!r.assignedProducer) continue;
      const prodObj = findProducerByAssignmentKey(r.assignedProducer, producers);
      const name = prodObj?.name || r.assignedProducer;
      if (!name) continue;
      mixCounts.set(name, (mixCounts.get(name) ?? 0) + 1);
    }

    const allowed =
      allowedProducerNames && allowedProducerNames.length > 0
        ? new Set(allowedProducerNames.map((name) => name.toUpperCase()))
        : null;

    return Array.from(mixCounts.entries())
      .map(([name, mixCount]) => {
        const producerObj =
          producers.find(
            (p) => p.name.toUpperCase() === name.toUpperCase() || p.id === name
          ) || findProducerByAssignmentKey(name, producers);
        return { name, mixCount, producerObj };
      })
      .filter((entry) => !allowed || allowed.has(entry.name.toUpperCase()))
      .sort((a, b) => b.mixCount - a.mixCount || a.name.localeCompare(b.name));
  }, [mtdRecords, producers, allowedProducerNames, filterPeriod]);

  const activeProducersInSchedule = useMemo(
    () => activeProducerSummaries.map((entry) => entry.name),
    [activeProducerSummaries]
  );

  const producerNamesKey = activeProducersInSchedule.join("|");

  useEffect(() => {
    if (!embedded || sendLayout !== "together") return;
    setCollapsedProducers(new Set(activeProducersInSchedule.slice(1)));
  }, [embedded, sendLayout, producerNamesKey, activeProducersInSchedule]);

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

  const filteredProducerSummaries = useMemo(() => {
    const query = sidebarSearch.trim();
    if (!query) return activeProducerSummaries;
    return activeProducerSummaries.filter((entry) => {
      if (entry.producerObj) {
        return matchesProducerSearch(entry.producerObj, query);
      }
      return entry.name.toLowerCase().includes(query.toLowerCase());
    });
  }, [activeProducerSummaries, sidebarSearch]);

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
      currentProducerToView,
      filterPeriod
    );
  }, [mtdRecords, allOrders, producers, currentProducerToView, filterPeriod]);

  const rowsByProducer = useMemo(() => {
    const map = new Map<string, ProducerFacingScheduleRow[]>();
    for (const summary of activeProducerSummaries) {
      map.set(
        summary.name,
        getProducerFacingScheduleRows(
          mtdRecords,
          allOrders,
          producers,
          summary.name,
          filterPeriod
        )
      );
    }
    return map;
  }, [activeProducerSummaries, mtdRecords, allOrders, producers, filterPeriod]);

  useEffect(() => {
    onViewingProducerChange?.(currentProducerToView);
  }, [currentProducerToView, onViewingProducerChange]);

  const showSidebar =
    !embedded &&
    sendLayout === "separate" &&
    selectedProducer === "all" &&
    activeProducersInSchedule.length > 0;

  const handleDownloadCurrentProducer = () => {
    const csv = generateScheduleCsv(
      mtdRecords,
      allOrders,
      producers,
      currentProducerToView,
      filterPeriod
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
        targetName,
        filterPeriod
      );
      triggerCsvDownload(
        `Schedule_${targetName.replace(/\s+/g, "_")}_${todayIso()}.csv`,
        csv
      );
    });
  };

  return (
    <div className={embedded ? "space-y-4" : "space-y-5"}>
      {!embedded ? (
        <div className="flex flex-col justify-between gap-4 border-b border-brand-line/60 pb-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-brand-line/70 bg-brand-surface text-brand-ink-secondary shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange"
                title="Back to Schedule Overview"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : null}
            <div>
              <h2 className="text-[18px] font-bold text-brand-ink">
                Producer Schedule Preview
              </h2>
              <p className="text-[12px] text-brand-ink-secondary">
                Review each editor&apos;s schedule, then download or send it individually.
              </p>
            </div>
          </div>

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
              <span>Download this editor&apos;s CSV</span>
            </button>

            {selectedProducer === "all" && (
              <button
                type="button"
                onClick={handleDownloadAllProducers}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-cta px-4 text-[12px] font-semibold text-brand-cta-text shadow-sm transition hover:bg-brand-cta-hover active:scale-[0.98]"
              >
                <Send className="h-4 w-4" />
                <span>Download all editor CSVs</span>
              </button>
            )}
          </div>
        </div>
      ) : null}

      <div
        className={clsx(
          "min-h-0",
          showSidebar
            ? "flex flex-col gap-4 lg:flex-row lg:items-start"
            : "space-y-4"
        )}
      >
        {showSidebar ? (
          <aside className="dashboard-panel flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-brand-line/70 bg-brand-surface/90 lg:w-[240px]">
            <div className="border-b border-brand-line/50 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                Editors ({activeProducersInSchedule.length})
              </p>
              <div className="relative mt-2">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-ink-tertiary"
                  strokeWidth={2}
                />
                <input
                  type="search"
                  value={sidebarSearch}
                  onChange={(event) => setSidebarSearch(event.target.value)}
                  placeholder="Search editors…"
                  aria-label="Search editors"
                  className="h-8 w-full rounded-lg border border-brand-line/70 bg-brand-elevated pl-8 pr-2.5 text-[12px] text-brand-ink outline-none transition placeholder:text-brand-ink-tertiary focus:border-brand-blue/45 focus:ring-2 focus:ring-brand-blue/15"
                />
              </div>
            </div>

            <div className="max-h-[320px] overflow-y-auto p-1.5 lg:max-h-[480px]">
              {filteredProducerSummaries.length === 0 ? (
                <p className="px-2 py-3 text-[12px] text-brand-ink-tertiary">
                  No editors match your search.
                </p>
              ) : (
                filteredProducerSummaries.map(({ name, mixCount, producerObj }) => {
                  const isSelected =
                    currentProducerToView.toUpperCase() === name.toUpperCase();

                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setActiveTabProducer(name)}
                      className={clsx(
                        "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition",
                        isSelected
                          ? "bg-brand-orange-soft/50 ring-1 ring-inset ring-brand-orange/25"
                          : "hover:bg-brand-bg/80"
                      )}
                    >
                      <Avatar producer={producerObj} name={name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold text-brand-ink">
                          {name}
                        </span>
                        <span className="text-[11px] tabular-nums text-brand-ink-tertiary">
                          {mixCount} mix{mixCount === 1 ? "" : "es"}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        ) : null}

        <div className="min-w-0 flex-1 space-y-4">
          {embedded && sendLayout === "together" ? (
            activeProducerSummaries.map(({ name, mixCount, producerObj }, index) => {
              const rows = rowsByProducer.get(name) ?? [];
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
                          {mixCount} ongoing mix{mixCount === 1 ? "" : "es"}
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
                      <SchedulePreviewTable rows={rows} />
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
                      {currentRows.length} ongoing mix
                      {currentRows.length === 1 ? "" : "es"}
                    </p>
                  </div>
                </div>
              </div>
              <SchedulePreviewTable rows={currentRows} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
