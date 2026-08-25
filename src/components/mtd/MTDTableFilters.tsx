"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { FilterMenu } from "@/components/ui/FilterMenu";
import { DateFilter, type DateFilterValue } from "@/components/ui/DateFilter";
import {
  buildAssignedProducerOptions,
  buildPackageTierOptions,
  buildRequestedProducerOptions,
  buildSplitOptions,
  buildTimeLimitOptions,
  hasMixStartDate,
  type MixScheduleFilter,
  type SplitFilter,
} from "@/lib/mtd-filters";
import type { MTDRecord, Order, Producer } from "@/types";
import { EDITOR_NAMES } from "@/types";

export type MTDTableFilterState = {
  packageTier: string;
  timeLimit: string;
  split: SplitFilter;
  assignedProducer: string;
  requestedProducer: string;
  scheduleFilter: MixScheduleFilter;
  dateFilter: DateFilterValue;
};

type MTDTableFiltersProps = {
  records: MTDRecord[];
  producers: Producer[];
  orderById: Map<string, Order>;
  filters: MTDTableFilterState;
  filteredCount: number;
  onChange: (patch: Partial<MTDTableFilterState>) => void;
  onReset: () => void;
};

function hasActiveFilters(filters: MTDTableFilterState): boolean {
  return (
    filters.packageTier !== "All" ||
    filters.timeLimit !== "All" ||
    filters.split !== "all" ||
    filters.assignedProducer !== "All" ||
    filters.requestedProducer !== "All" ||
    filters.scheduleFilter !== "all" ||
    filters.dateFilter.type !== "all"
  );
}

export function MTDTableFilters({
  records,
  producers,
  orderById,
  filters,
  filteredCount,
  onChange,
  onReset,
}: MTDTableFiltersProps) {
  const packageOptions = useMemo(
    () => buildPackageTierOptions(records),
    [records]
  );
  const timeLimitOptions = useMemo(
    () => buildTimeLimitOptions(records),
    [records]
  );
  const splitOptions = useMemo(() => buildSplitOptions(records), [records]);
  const assignedOptions = useMemo(
    () => buildAssignedProducerOptions(records, EDITOR_NAMES),
    [records]
  );
  const requestedOptions = useMemo(
    () =>
      buildRequestedProducerOptions(
        records,
        EDITOR_NAMES,
        producers,
        orderById
      ),
    [records, producers, orderById]
  );

  const scheduleOptions = useMemo(() => {
    let scheduled = 0;
    let notScheduled = 0;
    for (const rec of records) {
      if (hasMixStartDate(rec)) scheduled += 1;
      else notScheduled += 1;
    }
    return [
      { value: "all", label: "All", count: records.length },
      { value: "scheduled", label: "Scheduled", count: scheduled },
      { value: "not_scheduled", label: "Not scheduled", count: notScheduled },
    ];
  }, [records]);

  const active = hasActiveFilters(filters);

  return (
    <div className="panel-toolbar flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <FilterMenu
          label="Package"
          value={filters.packageTier}
          options={packageOptions}
          onChange={(value) => onChange({ packageTier: value })}
          accent="blue"
        />
        <FilterMenu
          label="Time limit"
          value={filters.timeLimit}
          options={timeLimitOptions}
          onChange={(value) => onChange({ timeLimit: value })}
        />
        <FilterMenu
          label="Split"
          value={filters.split}
          options={splitOptions}
          onChange={(value) => onChange({ split: value as SplitFilter })}
        />
        <FilterMenu
          label="Assigned"
          value={filters.assignedProducer}
          options={assignedOptions}
          onChange={(value) => onChange({ assignedProducer: value })}
          accent="orange"
        />
        <FilterMenu
          label="Requested"
          value={filters.requestedProducer}
          options={requestedOptions}
          onChange={(value) => onChange({ requestedProducer: value })}
          accent="orange"
        />
        <FilterMenu
          label="Scheduled"
          value={filters.scheduleFilter}
          options={scheduleOptions}
          onChange={(value) =>
            onChange({ scheduleFilter: value as MixScheduleFilter })
          }
        />
        <DateFilter
          value={filters.dateFilter}
          onChange={(dateFilter) => onChange({ dateFilter })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] tabular-nums text-brand-ink-tertiary">
          {filteredCount} of {records.length}
        </span>
        {active ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-line bg-brand-elevated px-2.5 text-[12px] font-medium text-brand-ink-secondary shadow-sm transition hover:border-brand-line-strong hover:bg-brand-bg hover:text-brand-ink"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}

export const DEFAULT_MTD_TABLE_FILTERS: MTDTableFilterState = {
  packageTier: "All",
  timeLimit: "All",
  split: "all",
  assignedProducer: "All",
  requestedProducer: "All",
  scheduleFilter: "all",
  dateFilter: { type: "all", value: null },
};
