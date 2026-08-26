"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import clsx from "clsx";
import { FilterMenu } from "@/components/ui/FilterMenu";
import { DateFilter, type DateFilterValue } from "@/components/ui/DateFilter";
import { getDateFilterLabel } from "@/lib/date-filters";
import {
  buildAssignedProducerOptions,
  buildInfoOptions,
  buildPackageTierOptions,
  buildRequestedProducerOptions,
  buildSplitOptions,
  buildTimeLimitOptions,
  hasMixStartDate,
  type InfoFilter,
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
  infoFilter: InfoFilter;
  dateFilter: DateFilterValue;
};

type MTDTableFilterPanelProps = {
  records: MTDRecord[];
  producers: Producer[];
  orderById: Map<string, Order>;
  filters: MTDTableFilterState;
  onChange: (patch: Partial<MTDTableFilterState>) => void;
  onReset: () => void;
};

export function hasActiveMTDFilters(filters: MTDTableFilterState): boolean {
  return (
    filters.packageTier !== "All" ||
    filters.timeLimit !== "All" ||
    filters.split !== "all" ||
    filters.assignedProducer !== "All" ||
    filters.requestedProducer !== "All" ||
    filters.scheduleFilter !== "all" ||
    (filters.infoFilter ?? "all") !== "all" ||
    filters.dateFilter.type !== "all"
  );
}

function countTableFilters(filters: MTDTableFilterState): number {
  let count = 0;
  if (filters.packageTier !== "All") count += 1;
  if (filters.timeLimit !== "All") count += 1;
  if (filters.split !== "all") count += 1;
  if (filters.assignedProducer !== "All") count += 1;
  if (filters.requestedProducer !== "All") count += 1;
  if (filters.scheduleFilter !== "all") count += 1;
  if ((filters.infoFilter ?? "all") !== "all") count += 1;
  if (filters.dateFilter.type !== "all") count += 1;
  return count;
}

export function MTDTableFilterPanel({
  records,
  producers,
  orderById,
  filters,
  onChange,
  onReset,
  grouped = false,
}: MTDTableFilterPanelProps & { grouped?: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const infoOptions = useMemo(() => buildInfoOptions(records), [records]);

  const activeCount = countTableFilters(filters);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={clsx(
            "inline-flex h-8 items-center gap-1.5 text-[12px] font-medium transition",
            grouped
              ? clsx(
                  "rounded-lg px-2.5",
                  open && "bg-brand-elevated shadow-sm ring-1 ring-brand-line/35",
                  open || activeCount > 0
                    ? "bg-brand-blue-soft/70 font-semibold text-brand-ink"
                    : "text-brand-ink-secondary hover:bg-brand-elevated/90 hover:text-brand-ink",
                  open && activeCount === 0 && "text-brand-ink"
                )
              : clsx(
                  "rounded-full border px-3 shadow-sm",
                  open || activeCount > 0
                    ? "border-brand-blue/35 bg-brand-blue-soft/45 text-brand-ink"
                    : "border-brand-line/55 bg-brand-elevated/90 text-brand-ink-secondary hover:border-brand-line-strong hover:bg-brand-elevated",
                  open && "ring-2 ring-brand-blue/15"
                )
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          Filters
          {activeCount > 0 ? (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-blue-deep px-1 text-[10px] font-bold tabular-nums text-white">
              {activeCount}
            </span>
          ) : null}
        </button>

        {open ? (
          <div className="absolute left-0 top-[calc(100%+8px)] z-40 w-[min(92vw,560px)] rounded-2xl border border-brand-line bg-brand-surface p-4 shadow-[var(--shadow-premium)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[13px] font-semibold text-brand-ink">
                Table filters
              </p>
              {activeCount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    onReset();
                    setOpen(false);
                  }}
                  className="text-[12px] font-medium text-brand-signature hover:underline"
                >
                  Clear all
                </button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
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
                label="Schedule"
                value={filters.scheduleFilter}
                options={scheduleOptions}
                onChange={(value) =>
                  onChange({ scheduleFilter: value as MixScheduleFilter })
                }
              />
              <FilterMenu
                label="Data"
                value={filters.infoFilter ?? "all"}
                options={infoOptions}
                onChange={(value) => onChange({ infoFilter: value as InfoFilter })}
                accent="orange"
              />
              <DateFilter
                value={filters.dateFilter}
                onChange={(dateFilter) => onChange({ dateFilter })}
              />
            </div>
          </div>
        ) : null}
    </div>
  );
}

export function MTDActiveFilterChips({
  chips,
}: {
  chips: Array<{ key: string; label: string; onClear: () => void }>;
}) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onClear}
          className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-blue-soft/50 py-1 pl-2.5 pr-1.5 text-[11px] font-medium text-brand-signature ring-1 ring-inset ring-brand-blue/20 transition hover:bg-brand-blue-soft"
        >
          <span className="truncate">{chip.label}</span>
          <X className="h-3 w-3 shrink-0 opacity-70" strokeWidth={2.5} />
        </button>
      ))}
    </div>
  );
}

export function MTDFilterChipsRow(props: MTDTableFilterPanelProps) {
  const chips = useMTDFilterChips(props);
  return <MTDActiveFilterChips chips={chips} />;
}

export function useMTDFilterChips(
  props: MTDTableFilterPanelProps
): Array<{ key: string; label: string; onClear: () => void }> {
  const { records, producers, orderById, filters, onChange } = props;

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
  const infoOptions = useMemo(() => buildInfoOptions(records), [records]);

  return useMemo(() => {
    const items: Array<{ key: string; label: string; onClear: () => void }> =
      [];

    if (filters.packageTier !== "All") {
      const label =
        packageOptions.find((o) => o.value === filters.packageTier)?.label ??
        filters.packageTier;
      items.push({
        key: "packageTier",
        label: `Package · ${label}`,
        onClear: () => onChange({ packageTier: "All" }),
      });
    }
    if (filters.timeLimit !== "All") {
      const label =
        timeLimitOptions.find((o) => o.value === filters.timeLimit)?.label ??
        filters.timeLimit;
      items.push({
        key: "timeLimit",
        label: `Limit · ${label}`,
        onClear: () => onChange({ timeLimit: "All" }),
      });
    }
    if (filters.split !== "all") {
      const label =
        splitOptions.find((o) => o.value === filters.split)?.label ??
        filters.split;
      items.push({
        key: "split",
        label: `Split · ${label}`,
        onClear: () => onChange({ split: "all" }),
      });
    }
    if (filters.assignedProducer !== "All") {
      const label =
        assignedOptions.find((o) => o.value === filters.assignedProducer)
          ?.label ?? filters.assignedProducer;
      items.push({
        key: "assignedProducer",
        label: `Assigned · ${label}`,
        onClear: () => onChange({ assignedProducer: "All" }),
      });
    }
    if (filters.requestedProducer !== "All") {
      const label =
        requestedOptions.find((o) => o.value === filters.requestedProducer)
          ?.label ?? filters.requestedProducer;
      items.push({
        key: "requestedProducer",
        label: `Requested · ${label}`,
        onClear: () => onChange({ requestedProducer: "All" }),
      });
    }
    if (filters.scheduleFilter !== "all") {
      const label =
        scheduleOptions.find((o) => o.value === filters.scheduleFilter)
          ?.label ?? filters.scheduleFilter;
      items.push({
        key: "scheduleFilter",
        label: `Schedule · ${label}`,
        onClear: () => onChange({ scheduleFilter: "all" }),
      });
    }
    if ((filters.infoFilter ?? "all") !== "all") {
      const label =
        infoOptions.find((o) => o.value === filters.infoFilter)?.label ??
        filters.infoFilter;
      items.push({
        key: "infoFilter",
        label: `Data · ${label}`,
        onClear: () => onChange({ infoFilter: "all" }),
      });
    }
    if (filters.dateFilter.type !== "all") {
      items.push({
        key: "dateFilter",
        label: getDateFilterLabel(filters.dateFilter),
        onClear: () => onChange({ dateFilter: { type: "all", value: null } }),
      });
    }

    return items;
  }, [
    filters,
    packageOptions,
    timeLimitOptions,
    splitOptions,
    assignedOptions,
    requestedOptions,
    scheduleOptions,
    infoOptions,
    onChange,
  ]);
}

export const DEFAULT_MTD_TABLE_FILTERS: MTDTableFilterState = {
  packageTier: "All",
  timeLimit: "All",
  split: "all",
  assignedProducer: "All",
  requestedProducer: "All",
  scheduleFilter: "all",
  infoFilter: "all",
  dateFilter: { type: "all", value: null },
};

/** @deprecated Use MTDTableFilterPanel */
export function MTDTableFilters(props: MTDTableFilterPanelProps & { embedded?: boolean; filteredCount?: number }) {
  return <MTDTableFilterPanel {...props} />;
}
