"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Eye, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProducerSelect } from "@/components/ui/ProducerSelect";
import { ProducerSchedulePreview } from "@/components/schedule/ProducerSchedulePreview";
import {
  SchedulePageToolbar,
  type SchedulePresentation,
} from "@/components/schedule/SchedulePageToolbar";
import { TeamScheduleMatrix } from "@/components/schedule/TeamScheduleMatrix";
import { TeamScheduleTodayView } from "@/components/schedule/TeamScheduleTodayView";
import {
  ScheduleDayDrawer,
  TeamScheduleCalendar,
} from "@/components/schedule/TeamScheduleCalendar";
import { ProducerScheduleDrawer } from "@/components/schedule/ProducerScheduleDrawer";
import { useAppState } from "@/context/AppStateContext";
import { todayIso } from "@/lib/date-filters";
import { generateScheduleCsv, triggerCsvDownload, isEligibleProducerScheduleRecord } from "@/lib/export-csv";
import { findProducerByAssignmentKey } from "@/lib/editor-assignment";
import {
  aggregateColumns,
  buildScheduleColumnAggregates,
  buildTeamSchedule,
  filterTeamScheduleByStatus,
  statusLabel,
  type CalendarDay,
  type ScheduleCell,
  type ScheduleStatusFilter,
  type ScheduleViewRange,
  type TeamScheduleRow,
} from "@/lib/schedule-view";
import {
  countProducersByCheerSubtype,
  countProducersByDanceSubtype,
  countProducersByForm,
  producerMatchesScheduleFormFilter,
  scheduleFormFilterLabel,
} from "@/lib/schedule-filters";
import { DEFAULT_CHEER_SUBTYPE, DEFAULT_DANCE_SUBTYPE } from "@/lib/mtd-filters";
import { matchesProducerSearch } from "@/lib/producers";
import type {
  CheerFormSubtypeFilter,
  DanceFormSubtypeFilter,
  OrderFormType,
} from "@/types";

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";

function SchedulePageContent() {
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view") || searchParams.get("range");

  const { producers, schedule, mtdRecords, allOrders } = useAppState();
  const [selectedProducer, setSelectedProducer] = useState<string>("all");
  const [sendPrepProducer, setSendPrepProducer] = useState<string>("all");
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);

  const [view, setView] = useState<ScheduleViewRange>(() => {
    if (viewParam === "today") return "today";
    return "week";
  });

  useEffect(() => {
    if (viewParam === "today") {
      setView("today");
    }
  }, [viewParam]);

  const [presentation, setPresentation] = useState<SchedulePresentation>("matrix");
  const [form, setForm] = useState<OrderFormType>(DEFAULT_FORM);
  const [cheerSubtype, setCheerSubtype] = useState<CheerFormSubtypeFilter>(
    DEFAULT_CHEER_SUBTYPE
  );
  const [danceSubtype, setDanceSubtype] = useState<DanceFormSubtypeFilter>(
    DEFAULT_DANCE_SUBTYPE
  );
  const [statusFilter, setStatusFilter] = useState<ScheduleStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerRow, setDrawerRow] = useState<TeamScheduleRow | null>(null);
  const [focusCell, setFocusCell] = useState<ScheduleCell | null>(null);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const switchForm = useCallback((next: OrderFormType) => {
    setForm(next);
    if (next !== "school-all-star-cheer") {
      setCheerSubtype(DEFAULT_CHEER_SUBTYPE);
    }
    if (next !== "school-all-star-dance") {
      setDanceSubtype(DEFAULT_DANCE_SUBTYPE);
    }
  }, []);

  const formCounts = useMemo(() => countProducersByForm(producers), [producers]);
  const cheerSubtypeCounts = useMemo(
    () => countProducersByCheerSubtype(producers),
    [producers]
  );
  const danceSubtypeCounts = useMemo(
    () => countProducersByDanceSubtype(producers),
    [producers]
  );

  const filteredProducers = useMemo(() => {
    let list = producers.filter((producer) =>
      producerMatchesScheduleFormFilter(producer, form, cheerSubtype, danceSubtype)
    );
    if (selectedProducer && selectedProducer !== "all") {
      list = list.filter(
        (p) =>
          p.name.toUpperCase() === selectedProducer.toUpperCase() ||
          p.id.toUpperCase() === selectedProducer.toUpperCase()
      );
    }
    const q = searchQuery.trim();
    if (!q) return list;
    return list.filter((producer) => matchesProducerSearch(producer, q));
  }, [producers, form, cheerSubtype, danceSubtype, selectedProducer, searchQuery]);

  const currentDate = useMemo(() => new Date(), []);
  const anchorDate = useMemo(
    () => currentDate,
    [currentDate]
  );

  const teamRows = useMemo(
    () =>
      filterTeamScheduleByStatus(
        buildTeamSchedule(
          filteredProducers,
          schedule,
          view,
          anchorDate,
          mtdRecords
        ),
        statusFilter,
        view
      ),
    [filteredProducers, schedule, view, anchorDate, mtdRecords, statusFilter]
  );

  const emptyMessage = useMemo(() => {
    if (searchQuery.trim()) {
      return `No producers match "${searchQuery.trim()}".`;
    }
    if (statusFilter !== "all") {
      return `No producers marked ${statusLabel(statusFilter).toLowerCase()} in this view.`;
    }
    const label = scheduleFormFilterLabel(form, cheerSubtype, danceSubtype);
    return `No producers specialize in ${label}.`;
  }, [form, cheerSubtype, danceSubtype, statusFilter, searchQuery]);

  const handlePresentationChange = useCallback(
    (next: SchedulePresentation) => {
      setPresentation(next);
      if (next === "calendar" && (view === "90days" || view === "6months")) {
        setView("month");
      }
    },
    [view]
  );

  const handleSelectProducer = useCallback(
    (producerId: string, dayKey?: string) => {
      const row = teamRows.find((r) => r.producer.id === producerId);
      if (!row) return;
      setDrawerRow(row);
      if (dayKey) {
        const cell = row.cells.find((c) => c.key === dayKey) ?? null;
        setFocusCell(cell);
      } else {
        setFocusCell(null);
      }
    },
    [teamRows]
  );

  const handleSelectDay = useCallback((day: CalendarDay) => {
    setSelectedDay(day);
  }, []);

  const handleOpenProducerFromDay = useCallback(
    (producerId: string, dayKey: string) => {
      handleSelectProducer(producerId, dayKey);
    },
    [handleSelectProducer]
  );

  const closeDrawer = useCallback(() => {
    setDrawerRow(null);
    setFocusCell(null);
  }, []);

  const columns = useMemo(
    () => aggregateColumns(teamRows, anchorDate),
    [teamRows, anchorDate]
  );

  const columnAggregates = useMemo(
    () => buildScheduleColumnAggregates(view, anchorDate),
    [view, anchorDate]
  );

  const availableToday = useMemo(() => {
    const todayKey = todayIso();
    let count = 0;
    for (const r of teamRows) {
      const cell = r.cells.find((c) => c.key === todayKey);
      if (cell && cell.status === "available") count += 1;
    }
    return count;
  }, [teamRows]);

  const offToday = useMemo(() => {
    const todayKey = todayIso();
    let count = 0;
    for (const r of teamRows) {
      const cell = r.cells.find((c) => c.key === todayKey);
      if (cell && cell.status === "off") count += 1;
    }
    return count;
  }, [teamRows]);

  const calendarRange = useMemo<Extract<ScheduleViewRange, "week" | "month">>(() => {
    if (view === "today") return "week";
    if (view === "week" || view === "month") return view;
    return "month";
  }, [view]);

  const handleDownloadSchedule = useCallback(() => {
    if (selectedProducer === "all") {
      const listToProcess = filteredProducers.map((p) => p.name);
      if (listToProcess.length === 0) {
        if (typeof window !== "undefined") {
          alert("No matching producers found to export.");
        }
        return;
      }

      listToProcess.forEach((targetName) => {
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
    } else {
      const targetProdObj = producers.find(
        (p) => p.name === selectedProducer || p.id === selectedProducer
      );
      const targetName = targetProdObj?.name || selectedProducer;

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
    }
  }, [selectedProducer, filteredProducers, mtdRecords, allOrders, producers]);

  const handleSendPrepDownload = useCallback(() => {
    if (sendPrepProducer === "all") {
      const eligibleRecords = mtdRecords.filter(isEligibleProducerScheduleRecord);

      const set = new Set<string>();
      for (const r of eligibleRecords) {
        if (r.assignedProducer) {
          const prodObj = findProducerByAssignmentKey(r.assignedProducer, producers);
          const name = prodObj?.name || r.assignedProducer;
          if (name) set.add(name);
        }
      }
      const activeList = Array.from(set).sort();

      if (activeList.length === 0) {
        if (typeof window !== "undefined") {
          alert("No ongoing scheduled mixes found for any producer.");
        }
        return;
      }

      activeList.forEach((targetName) => {
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
    } else {
      const targetProdObj = producers.find(
        (p) => p.name === sendPrepProducer || p.id === sendPrepProducer
      );
      const targetName = targetProdObj?.name || sendPrepProducer;

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
    }
  }, [sendPrepProducer, mtdRecords, allOrders, producers]);

  const sendPrepButtonLabel = useMemo(() => {
    if (sendPrepProducer === "all") return "Send to All (Download Files)";
    const found = producers.find(
      (p) => p.id === sendPrepProducer || p.name.toUpperCase() === sendPrepProducer.toUpperCase()
    );
    const name = found ? found.name : sendPrepProducer;
    return `Send Schedule to ${name}`;
  }, [sendPrepProducer, producers]);

  if (isPreviewMode) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6 pt-5 lg:px-8">
        <ProducerSchedulePreview
          selectedProducer={sendPrepProducer}
          onProducerChange={setSendPrepProducer}
          mtdRecords={mtdRecords}
          allOrders={allOrders}
          producers={producers}
          onBack={() => setIsPreviewMode(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        compact
        title="Producer Schedule"
        subtitle="Team availability, bookings, and available capacity"
        exportAction={{
          label:
            selectedProducer === "all"
              ? "Download All Schedules"
              : `Download ${selectedProducer}'s Schedule`,
          onClick: handleDownloadSchedule,
        }}
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: "Search producers…",
        }}
        toolbar={
          <SchedulePageToolbar
            form={form}
            cheerSubtype={cheerSubtype}
            danceSubtype={danceSubtype}
            formCounts={formCounts}
            cheerCounts={cheerSubtypeCounts}
            danceCounts={danceSubtypeCounts}
            presentation={presentation}
            view={view}
            statusFilter={statusFilter}
            columns={columns}
            availableToday={availableToday}
            offToday={offToday}
            totalProducers={teamRows.length}
            producers={producers}
            selectedProducer={selectedProducer}
            onProducerChange={setSelectedProducer}
            onFormChange={switchForm}
            onCheerSubtypeChange={setCheerSubtype}
            onDanceSubtypeChange={setDanceSubtype}
            onPresentationChange={handlePresentationChange}
            onViewChange={setView}
            onStatusFilterChange={setStatusFilter}
          />
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6 pt-5 lg:px-8">
        {/* Producer Schedule Preparation Banner / Control Strip */}
        <div className="dashboard-panel relative z-[60] !overflow-visible p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-brand-line/70 bg-brand-surface/90 shadow-sm rounded-2xl mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange ring-1 ring-inset ring-brand-orange/20">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-brand-ink">
                Producer Schedule Preparation
              </h3>
              <p className="text-[12px] text-brand-ink-secondary">
                Select editor to preview and download upcoming producer schedule statements.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ProducerSelect
              producers={producers}
              value={sendPrepProducer}
              onChange={setSendPrepProducer}
              label="Editor:"
              allLabel="All Editors"
            />

            <button
              type="button"
              onClick={() => setIsPreviewMode(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-line/80 bg-brand-elevated px-3 text-[12px] font-semibold text-brand-ink shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange active:scale-[0.98]"
            >
              <Eye className="h-3.5 w-3.5 text-brand-orange" />
              <span>View Schedule</span>
            </button>

            <button
              type="button"
              onClick={handleSendPrepDownload}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-cta px-3.5 text-[12px] font-semibold text-brand-cta-text shadow-sm transition hover:bg-brand-cta-hover active:scale-[0.98]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{sendPrepButtonLabel}</span>
            </button>
          </div>
        </div>

        {presentation === "matrix" ? (
          <div className="flex min-h-0 w-full flex-1 flex-col">
            {view === "today" ? (
              <TeamScheduleTodayView
                rows={teamRows}
                date={anchorDate}
                activeProducerId={drawerRow?.producer.id}
                onSelectProducer={handleSelectProducer}
                emptyMessage={emptyMessage}
                className="min-h-0 w-full flex-1"
              />
            ) : (
              <TeamScheduleMatrix
                rows={teamRows}
                columns={columns}
                range={view}
                statusFilter={statusFilter}
                activeProducerId={drawerRow?.producer.id}
                onSelectProducer={handleSelectProducer}
                emptyMessage={emptyMessage}
                className="min-h-0 w-full flex-1"
              />
            )}
          </div>
        ) : (
          <div className="min-h-0 w-full flex-1 overflow-auto">
            <TeamScheduleCalendar
              rows={teamRows}
              range={calendarRange}
              selectedDayKey={selectedDay?.key}
              onSelectDay={handleSelectDay}
              className="dashboard-panel dashboard-panel-framed h-full min-h-0"
            />
          </div>
        )}
      </div>

      <ScheduleDayDrawer
        open={Boolean(selectedDay)}
        day={selectedDay}
        onClose={() => setSelectedDay(null)}
        onSelectProducer={handleOpenProducerFromDay}
      />

      <ProducerScheduleDrawer
        open={Boolean(drawerRow)}
        producer={drawerRow?.producer ?? null}
        cells={drawerRow?.cells ?? []}
        range={view}
        focusCell={focusCell}
        onClose={closeDrawer}
      />
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={null}>
      <SchedulePageContent />
    </Suspense>
  );
}
