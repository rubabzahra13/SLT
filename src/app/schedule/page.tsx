"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPill } from "@/components/ui/FilterPill";
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

const specialtyFilters = ["All", "Cheer", "Dance", "Marching Band"];
const presentationFilters = ["Matrix", "Calendar"] as const;
type SchedulePresentation = "matrix" | "calendar";

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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Producer Schedule"
        subtitle="Team availability, bookings, and open capacity"
      />

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden px-3 py-2.5 lg:px-4">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-line/70 bg-brand-elevated/90 px-3 py-2 shadow-[var(--shadow-premium-sm)]">
          <nav className="flex flex-wrap gap-2" aria-label="Producer specialty">
            {specialtyFilters.map((filter) => (
              <FilterPill
                key={filter}
                label={filter}
                active={specialty === filter}
                onClick={() => setSpecialty(filter)}
              />
            ))}
          </nav>

          <nav className="flex flex-wrap gap-2" aria-label="Schedule presentation">
            {presentationFilters.map((label) => {
              const next = label.toLowerCase() as SchedulePresentation;
              return (
                <FilterPill
                  key={label}
                  label={label}
                  active={presentation === next}
                  accent="orange"
                  onClick={() => handlePresentationChange(next)}
                />
              );
            })}
          </nav>

          <nav
            className="ml-auto flex flex-wrap gap-2"
            aria-label="Schedule range"
          >
            <FilterPill
              label="This week"
              active={view === "week"}
              onClick={() => setView("week")}
            />
            <FilterPill
              label="This month"
              active={view === "month"}
              onClick={() => setView("month")}
            />
            {presentation === "matrix" ? (
              <FilterPill
                label="90 days from today"
                active={view === "90days"}
                onClick={() => setView("90days")}
              />
            ) : null}
          </nav>
        </div>

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
