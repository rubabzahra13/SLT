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
import { ScheduleInsightPanel } from "@/components/schedule/ScheduleInsightPanel";
import { ProducerScheduleDrawer } from "@/components/schedule/ProducerScheduleDrawer";
import { useAppState } from "@/context/AppStateContext";
import {
  aggregateColumns,
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
    () => aggregateColumns(teamRows, ANCHOR_DATE),
    [teamRows]
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

  const openToday = useMemo(() => {
    const today = columns.find((col) => col.isToday);
    return today != null ? today.total - today.unavailableCount : teamRows.length;
  }, [columns, teamRows.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Producer Schedule"
        badge={`${openToday}/${teamRows.length} open`}
        subtitle="Team availability, bookings, and open capacity"
        toolbar={
          <SchedulePageToolbar
            specialty={specialty}
            presentation={presentation}
            view={view}
            onSpecialtyChange={setSpecialty}
            onPresentationChange={handlePresentationChange}
            onViewChange={setView}
          />
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden px-3 py-2.5 lg:px-4">
        {presentation === "matrix" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden lg:flex-row lg:items-stretch lg:max-h-[calc(100dvh-9.25rem)]">
            <div className="flex min-h-0 min-w-0 flex-1 self-stretch overflow-hidden">
              <TeamScheduleMatrix
                rows={teamRows}
                columns={columns}
                range={view}
                activeProducerId={drawerRow?.producer.id}
                onSelectProducer={handleSelectProducer}
              />
            </div>
            <ScheduleInsightPanel
              rows={teamRows}
              columns={columns}
              activeProducerId={drawerRow?.producer.id}
              onSelectProducer={(row) => handleSelectProducer(row)}
              className="min-h-0 w-full lg:w-[300px] lg:max-w-[300px] lg:flex-none"
            />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto lg:max-h-[calc(100dvh-9.25rem)]">
            <TeamScheduleCalendar
              rows={teamRows}
              range={calendarRange}
              selectedDayKey={selectedDay?.key}
              onSelectDay={handleSelectDay}
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
