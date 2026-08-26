"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  SchedulePageToolbar,
  type SchedulePresentation,
} from "@/components/schedule/SchedulePageToolbar";
import { TeamScheduleMatrix } from "@/components/schedule/TeamScheduleMatrix";
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
  type CalendarDay,
  type ScheduleCell,
  type ScheduleViewRange,
  type TeamScheduleRow,
} from "@/lib/schedule-view";

const ANCHOR_DATE = new Date(2026, 7, 19);

export default function SchedulePage() {
  const { producers, schedule, mtdRecords } = useAppState();
  const [view, setView] = useState<ScheduleViewRange>("week");
  const [presentation, setPresentation] = useState<SchedulePresentation>("matrix");
  const [specialty, setSpecialty] = useState("All");
  const [drawerRow, setDrawerRow] = useState<TeamScheduleRow | null>(null);
  const [focusCell, setFocusCell] = useState<ScheduleCell | null>(null);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const filteredProducers = useMemo(
    () =>
      specialty === "All"
        ? producers
        : producers.filter((p) => p.specialty === specialty),
    [producers, specialty]
  );

  const teamRows = useMemo(
    () =>
      buildTeamSchedule(
        filteredProducers,
        schedule,
        view,
        ANCHOR_DATE,
        mtdRecords
      ),
    [filteredProducers, schedule, view, mtdRecords]
  );

  const columns = useMemo(
    () =>
      teamRows.length > 0
        ? aggregateColumns(teamRows, ANCHOR_DATE)
        : buildScheduleColumnAggregates(view, ANCHOR_DATE),
    [teamRows, view]
  );

  const calendarRange: "week" | "month" = view === "90days" ? "month" : view;

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
    if (next === "calendar" && view === "90days") {
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

  const availableToday = useMemo(() => {
    const today = columns.find((col) => col.isToday);
    return today != null ? today.total - today.unavailableCount : teamRows.length;
  }, [columns, teamRows.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        compact
        title="Producer Schedule"
        subtitle="Team availability, bookings, and available capacity"
        toolbar={
          <SchedulePageToolbar
            specialty={specialty}
            presentation={presentation}
            view={view}
            columns={columns}
            availableToday={availableToday}
            totalProducers={teamRows.length}
            onSpecialtyChange={setSpecialty}
            onPresentationChange={handlePresentationChange}
            onViewChange={setView}
          />
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6 pt-5 lg:px-8">
        {presentation === "matrix" ? (
          <div className="flex min-h-0 w-full flex-1 flex-col">
            <TeamScheduleMatrix
              rows={teamRows}
              columns={columns}
              range={view}
              activeProducerId={drawerRow?.producer.id}
              onSelectProducer={handleSelectProducer}
              emptyMessage={
                specialty === "All"
                  ? "No producers in this view."
                  : `No producers specialize in ${specialty}.`
              }
              className="min-h-0 w-full flex-1"
            />
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
