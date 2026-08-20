"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPill } from "@/components/ui/FilterPill";
import { TeamScheduleMatrix } from "@/components/schedule/TeamScheduleMatrix";
import {
  ScheduleDayDrawer,
  TeamScheduleCalendar,
} from "@/components/schedule/TeamScheduleCalendar";
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
  const { producers, schedule } = useAppState();
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
    () => buildTeamSchedule(filteredProducers, schedule, view, ANCHOR_DATE),
    [filteredProducers, schedule, view]
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
    <>
      <PageHeader
        title="Producer Schedule"
      />

      <div className="space-y-2.5 px-2 py-2.5 lg:px-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
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
              label="Weekly"
              active={view === "week"}
              onClick={() => setView("week")}
            />
            <FilterPill
              label="Monthly"
              active={view === "month"}
              onClick={() => setView("month")}
            />
            {presentation === "matrix" ? (
              <FilterPill
                label="90 days"
                active={view === "90days"}
                onClick={() => setView("90days")}
              />
            ) : null}
          </nav>
        </div>

        {presentation === "matrix" ? (
          <TeamScheduleMatrix
            rows={teamRows}
            columns={columns}
            range={view}
            activeProducerId={drawerRow?.producer.id}
            onSelectProducer={handleSelectProducer}
          />
        ) : (
          <TeamScheduleCalendar
            rows={teamRows}
            range={calendarRange}
            selectedDayKey={selectedDay?.key}
            onSelectDay={handleSelectDay}
          />
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
    </>
  );
}
