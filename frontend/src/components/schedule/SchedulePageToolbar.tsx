"use client";

import clsx from "clsx";
import { OrderFormFilters } from "@/components/orders/OrderFormFilters";
import { FilterPill } from "@/components/ui/FilterPill";
import { ProducerSelect } from "@/components/ui/ProducerSelect";
import { ScheduleHeaderMeta } from "@/components/schedule/ScheduleHeaderMeta";
import { ScheduleStatusFilterPanel } from "@/components/schedule/ScheduleStatusFilterPanel";
import {
  type ColumnAggregate,
  type ScheduleStatusFilter,
  type ScheduleViewRange,
} from "@/lib/schedule-view";
import type {
  CheerFormSubtypeFilter,
  DanceFormSubtypeFilter,
  OrderFormType,
  Producer,
} from "@/types";

type SchedulePageToolbarProps = {
  form: OrderFormType;
  cheerSubtype: CheerFormSubtypeFilter;
  danceSubtype: DanceFormSubtypeFilter;
  formCounts: Record<OrderFormType, number>;
  cheerCounts: Record<CheerFormSubtypeFilter, number>;
  danceCounts: Record<DanceFormSubtypeFilter, number>;
  view: ScheduleViewRange;
  statusFilter: ScheduleStatusFilter;
  columns: ColumnAggregate[];
  availableCount: number;
  offToday: number;
  totalProducers: number;
  producers?: Producer[];
  selectedEditor?: string;
  onEditorChange?: (editor: string) => void;
  onFormChange: (form: OrderFormType) => void;
  onCheerSubtypeChange: (subtype: CheerFormSubtypeFilter) => void;
  onDanceSubtypeChange: (subtype: DanceFormSubtypeFilter) => void;
  onViewChange: (value: ScheduleViewRange) => void;
  onStatusFilterChange: (value: ScheduleStatusFilter) => void;
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
        className="inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-xl bg-white p-1 shadow-sm ring-1 ring-inset ring-brand-line/45"
        role="group"
        aria-label={label}
      >
        {children}
      </div>
    </div>
  );
}

export function SchedulePageToolbar({
  form,
  cheerSubtype,
  danceSubtype,
  formCounts,
  cheerCounts,
  danceCounts,
  view,
  statusFilter,
  columns,
  availableCount,
  offToday,
  totalProducers,
  producers,
  selectedEditor = "all",
  onEditorChange,
  onFormChange,
  onCheerSubtypeChange,
  onDanceSubtypeChange,
  onViewChange,
  onStatusFilterChange,
}: SchedulePageToolbarProps) {
  return (
    <div className="flex flex-col gap-3.5">
      <div
        className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between"
        role="toolbar"
        aria-label="Schedule filters"
      >
        <div className="relative z-40 inline-flex flex-wrap items-center gap-0.5 rounded-xl bg-brand-elevated/80 p-0.5 ring-1 ring-inset ring-brand-line/40">
          <OrderFormFilters
            grouped
            portalMenus
            form={form}
            cheerSubtype={cheerSubtype}
            danceSubtype={danceSubtype}
            onFormChange={onFormChange}
            onCheerSubtypeChange={onCheerSubtypeChange}
            onDanceSubtypeChange={onDanceSubtypeChange}
            formCounts={formCounts}
            cheerCounts={cheerCounts}
            danceCounts={danceCounts}
          />
          <span
            className="mx-0.5 hidden h-5 w-px shrink-0 bg-brand-line/45 sm:block"
            aria-hidden
          />
          <ScheduleStatusFilterPanel
            grouped
            value={statusFilter}
            onChange={onStatusFilterChange}
          />
          {producers && producers.length > 0 && onEditorChange ? (
            <>
              <span
                className="mx-0.5 hidden h-5 w-px shrink-0 bg-brand-line/45 sm:block"
                aria-hidden
              />
              <div className="px-1.5 py-0.5">
                <ProducerSelect
                  producers={producers}
                  value={selectedEditor}
                  onChange={onEditorChange}
                  label="Editor:"
                  allLabel="All Editors"
                />
              </div>
            </>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <FilterGroup label="Range">
            <FilterPill
              label="Today"
              active={view === "today"}
              variant="grouped"
              onClick={() => onViewChange("today")}
            />
            <FilterPill
              label="This Week"
              active={view === "week"}
              variant="grouped"
              onClick={() => onViewChange("week")}
            />
            <FilterPill
              label="This Month"
              active={view === "month"}
              variant="grouped"
              onClick={() => onViewChange("month")}
            />
            <FilterPill
              label="90 Day"
              active={view === "90days"}
              variant="grouped"
              onClick={() => onViewChange("90days")}
            />
            <FilterPill
              label="6 Month"
              active={view === "6months"}
              variant="grouped"
              onClick={() => onViewChange("6months")}
            />
          </FilterGroup>
        </div>
      </div>

      <div className="border-t border-brand-line/30 px-1 pt-3.5">
        <ScheduleHeaderMeta
          columns={columns}
          availableCount={availableCount}
          offToday={offToday}
          totalProducers={totalProducers}
          view={view}
        />
      </div>
    </div>
  );
}
