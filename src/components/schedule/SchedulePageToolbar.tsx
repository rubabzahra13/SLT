"use client";

import { FilterPill } from "@/components/ui/FilterPill";
import type { ScheduleViewRange } from "@/lib/schedule-view";

const specialtyFilters = ["All", "Cheer", "Dance", "Marching Band"];
const presentationFilters = ["Matrix", "Calendar"] as const;
export type SchedulePresentation = "matrix" | "calendar";

type SchedulePageToolbarProps = {
  specialty: string;
  presentation: SchedulePresentation;
  view: ScheduleViewRange;
  onSpecialtyChange: (value: string) => void;
  onPresentationChange: (value: SchedulePresentation) => void;
  onViewChange: (value: ScheduleViewRange) => void;
};

export function SchedulePageToolbar({
  specialty,
  presentation,
  view,
  onSpecialtyChange,
  onPresentationChange,
  onViewChange,
}: SchedulePageToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div
        className="inline-flex flex-wrap items-center gap-0.5 rounded-xl bg-brand-elevated/80 p-0.5 ring-1 ring-inset ring-brand-line/40"
        role="toolbar"
        aria-label="Schedule filters"
      >
        <nav
          className="inline-flex flex-wrap items-center gap-0.5"
          aria-label="Producer specialty"
        >
          {specialtyFilters.map((filter) => (
            <FilterPill
              key={filter}
              label={filter}
              active={specialty === filter}
              variant="grouped"
              onClick={() => onSpecialtyChange(filter)}
            />
          ))}
        </nav>

        <span
          className="mx-0.5 hidden h-5 w-px shrink-0 bg-brand-line/45 sm:block"
          aria-hidden
        />

        <nav
          className="inline-flex flex-wrap items-center gap-0.5"
          aria-label="Schedule presentation"
        >
          {presentationFilters.map((label) => {
            const next = label.toLowerCase() as SchedulePresentation;
            return (
              <FilterPill
                key={label}
                label={label}
                active={presentation === next}
                accent="orange"
                variant="grouped"
                onClick={() => onPresentationChange(next)}
              />
            );
          })}
        </nav>

        <span
          className="mx-0.5 hidden h-5 w-px shrink-0 bg-brand-line/45 sm:block"
          aria-hidden
        />

        <nav
          className="inline-flex flex-wrap items-center gap-0.5"
          aria-label="Schedule range"
        >
          <FilterPill
            label="This week"
            active={view === "week"}
            variant="grouped"
            onClick={() => onViewChange("week")}
          />
          <FilterPill
            label="This month"
            active={view === "month"}
            variant="grouped"
            onClick={() => onViewChange("month")}
          />
          {presentation === "matrix" ? (
            <FilterPill
              label="90 days from today"
              active={view === "90days"}
              variant="grouped"
              onClick={() => onViewChange("90days")}
            />
          ) : null}
        </nav>
      </div>
    </div>
  );
}
