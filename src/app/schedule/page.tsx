"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
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

const ANCHOR_DATE = new Date(2026, 7, 19);

function SchedulePageContent() {
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view") || searchParams.get("range");

  const { producers, schedule, mtdRecords } = useAppState();
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
    const byForm = producers.filter((producer) =>
      producerMatchesScheduleFormFilter(producer, form, cheerSubtype, danceSubtype)
    );
    const q = searchQuery.trim();
    if (!q) return byForm;
    return byForm.filter((producer) => matchesProducerSearch(producer, q));
  }, [producers, form, cheerSubtype, danceSubtype, searchQuery]);

  const currentDate = useMemo(() => new Date(), []);
  const anchorDate = useMemo(
    () => (view === "today" ? currentDate : ANCHOR_DATE),
    [view, currentDate]
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

  const columns = useMemo(
    () =>
      teamRows.length > 0
        ? aggregateColumns(teamRows, anchorDate)
        : buildScheduleColumnAggregates(view, anchorDate),
    [teamRows, view, anchorDate]
  );

  const calendarRange: "week" | "month" =
    view === "90days" || view === "6months" ? "month" : view === "today" ? "week" : view;

  function handleSelectProducer(row: TeamScheduleRow, cell?: ScheduleCell) {
    setSelectedDay(null);
    setDrawerRow(row);
    setFocusCell(cell ?? null);
  }

  function closeDrawer() {
    setDrawerRow(null);
    setFocusCell(null);
  }

  function handlePresentationChange(next: SchedulePresentation) {
    setPresentation(next);
    setSelectedDay(null);
    if (next === "calendar" && (view === "90days" || view === "6months")) {
      setView("month");
    }
  }

  function handleSelectDay(day: CalendarDay) {
    setDrawerRow(null);
    setFocusCell(null);
    setSelectedDay(day);
  }

  function handleOpenProducerFromDay(producerId: string, dayKey: string) {
    const row = teamRows.find((entry) => entry.producer.id === producerId);
    if (!row) return;
    const cell = row.cells.find((entry) => entry.key === dayKey);
    setSelectedDay(null);
    setDrawerRow(row);
    setFocusCell(cell ?? null);
  }

  const todayColumnKey = useMemo(
    () => columns.find((col) => col.isToday)?.key,
    [columns]
  );

  const availableToday = useMemo(() => {
    const today = columns.find((col) => col.isToday);
    return today != null ? today.availableCount : teamRows.length;
  }, [columns, teamRows.length]);

  const offToday = useMemo(() => {
    return teamRows.filter((row) => {
      const cell =
        view === "today"
          ? row.cells[0]
          : row.cells.find((entry) => entry.key === todayColumnKey);
      return cell && !cell.filteredOut && cell.status === "off";
    }).length;
  }, [teamRows, todayColumnKey, view]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        compact
        title="Producer Schedule"
        subtitle="Team availability, bookings, and available capacity"
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
