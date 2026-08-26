"use client";

import clsx from "clsx";
import { FilterPill } from "@/components/ui/FilterPill";
import { ScheduleHeaderMeta } from "@/components/schedule/ScheduleHeaderMeta";
import type { ColumnAggregate, ScheduleViewRange } from "@/lib/schedule-view";

const specialtyFilters = ["All", "Cheer", "Dance", "Marching Band"];
const presentationFilters = ["Matrix", "Calendar"] as const;
export type SchedulePresentation = "matrix" | "calendar";

type SchedulePageToolbarProps = {
  specialty: string;
  presentation: SchedulePresentation;
  view: ScheduleViewRange;
  columns: ColumnAggregate[];
  availableToday: number;
  totalProducers: number;
  onSpecialtyChange: (value: string) => void;
  onPresentationChange: (value: SchedulePresentation) => void;
  onViewChange: (value: ScheduleViewRange) => void;
};

function FilterGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex min-w-0 flex-col gap-1.5", className)}>
      <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
        {label}
      </p>
      <div
        className="inline-flex flex-wrap items-center gap-0.5 rounded-xl bg-white p-1 shadow-sm ring-1 ring-inset ring-brand-line/45"
        role="group"
        aria-label={label}
      >
        {children}
      </div>
    </div>
  );
}

export function SchedulePageToolbar({
  specialty,
  presentation,
  view,
  columns,
  availableToday,
  totalProducers,
  onSpecialtyChange,
  onPresentationChange,
  onViewChange,
}: SchedulePageToolbarProps) {
  return (
    <div className="flex flex-col gap-3.5">
      <div
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_auto_minmax(0,1fr)] xl:items-end"
        role="toolbar"
        aria-label="Schedule filters"
      >
        <FilterGroup label="Team">
          {specialtyFilters.map((filter) => (
            <FilterPill
              key={filter}
              label={filter}
              active={specialty === filter}
              variant="grouped"
              onClick={() => onSpecialtyChange(filter)}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="View" className="sm:justify-self-start xl:justify-self-center">
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
        </FilterGroup>

        <FilterGroup label="Range" className="sm:col-span-2 xl:col-span-1 xl:justify-self-end">
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
              label="90 days"
              active={view === "90days"}
              variant="grouped"
              onClick={() => onViewChange("90days")}
            />
          ) : null}
        </FilterGroup>
      </div>

      <div className="border-t border-brand-line/30 px-1 pt-3.5">
        <ScheduleHeaderMeta
          columns={columns}
          availableToday={availableToday}
          totalProducers={totalProducers}
        />
      </div>
    </div>
  );
}
