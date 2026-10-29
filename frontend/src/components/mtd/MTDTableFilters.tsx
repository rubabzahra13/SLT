"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown, SlidersHorizontal, X } from "lucide-react";
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
  MTD_SORT_BY_OPTIONS,
  producersForFormCategory,
  type InfoFilter,
  type MixScheduleFilter,
  type MTDSortBy,
  type SplitFilter,
} from "@/lib/mtd-filters";
import type {
  CheerFormSubtypeFilter,
  DanceFormSubtypeFilter,
  MTDRecord,
  Order,
  OrderFormType,
  Producer,
} from "@/types";

export type MTDTableFilterState = {
  packageTier: string;
  timeLimit: string;
  split: SplitFilter;
  assignedProducer: string;
  requestedProducer: string;
  scheduleFilter: MixScheduleFilter;
  infoFilter: InfoFilter;
  dateFilter: DateFilterValue;
  sortBy: MTDSortBy;
};

type MTDTableFilterPanelProps = {
  records: MTDRecord[];
  producers: Producer[];
  orderById: Map<string, Order>;
  filters: MTDTableFilterState;
  onChange: (patch: Partial<MTDTableFilterState>) => void;
  onReset: () => void;
  form?: OrderFormType;
  cheerSubtype?: CheerFormSubtypeFilter;
  danceSubtype?: DanceFormSubtypeFilter;
  /** Orders tab hides Data (covered by range toggles). */
  variant?: "mtd" | "orders";
};

/** Split/No Split applies to VIROC, School Cheer, Youth Rec: not All Star Cheer. */
function showCheerSplitFilter(
  form?: OrderFormType,
  cheerSubtype?: CheerFormSubtypeFilter
): boolean {
  const isCheer = !form || form === "school-all-star-cheer";
  return isCheer && cheerSubtype !== "all-star-cheer";
}

export function hasActiveMTDFilters(
  filters: MTDTableFilterState,
  form?: OrderFormType,
  variant: "mtd" | "orders" = "mtd",
  cheerSubtype?: CheerFormSubtypeFilter
): boolean {
  const isCheer = !form || form === "school-all-star-cheer";
  const showSplit = showCheerSplitFilter(form, cheerSubtype);
  const showDataFilter = variant !== "orders";
  return (
    filters.packageTier !== "All" ||
    (isCheer && filters.timeLimit !== "All") ||
    (showSplit && filters.split !== "all") ||
    filters.assignedProducer !== "All" ||
    filters.requestedProducer !== "All" ||
    (showDataFilter && (filters.infoFilter ?? "all") !== "all") ||
    filters.dateFilter.type !== "all"
  );
}

function countTableFilters(
  filters: MTDTableFilterState,
  form?: OrderFormType,
  variant: "mtd" | "orders" = "mtd",
  cheerSubtype?: CheerFormSubtypeFilter
): number {
  const isCheer = !form || form === "school-all-star-cheer";
  const showSplit = showCheerSplitFilter(form, cheerSubtype);
  const showDataFilter = variant !== "orders";
  let count = 0;
  if (filters.packageTier !== "All") count += 1;
  if (isCheer && filters.timeLimit !== "All") count += 1;
  if (showSplit && filters.split !== "all") count += 1;
  if (filters.assignedProducer !== "All") count += 1;
  if (filters.requestedProducer !== "All") count += 1;
  if (showDataFilter && (filters.infoFilter ?? "all") !== "all") count += 1;
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
  form,
  cheerSubtype,
  danceSubtype,
  grouped = false,
  variant = "mtd",
}: MTDTableFilterPanelProps & { grouped?: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const showDataFilter = variant !== "orders";
  const editorFilterLabel = "Assigned editor";

  const packageOptions = useMemo(
    () => buildPackageTierOptions(records),
    [records]
  );
  const timeLimitOptions = useMemo(
    () => buildTimeLimitOptions(records),
    [records]
  );
  const splitOptions = useMemo(() => buildSplitOptions(records), [records]);
  const categoryProducers = useMemo(
    () =>
      producersForFormCategory(producers, form, cheerSubtype, danceSubtype),
    [producers, form, cheerSubtype, danceSubtype]
  );
  const assignedOptions = useMemo(
    () => buildAssignedProducerOptions(records, [], categoryProducers),
    [records, categoryProducers]
  );
  const requestedOptions = useMemo(
    () =>
      buildRequestedProducerOptions(
        records,
        [],
        categoryProducers,
        orderById
      ),
    [records, categoryProducers, orderById]
  );

  const infoOptions = useMemo(() => buildInfoOptions(records), [records]);

  const isCheer = !form || form === "school-all-star-cheer";
  const showSplit = showCheerSplitFilter(form, cheerSubtype);
  const activeCount = countTableFilters(filters, form, variant, cheerSubtype);

  // All Star Cheer has no Split field: drop a leftover Split filter.
  useEffect(() => {
    if (!showSplit && filters.split !== "all") {
      onChange({ split: "all" });
    }
  }, [showSplit, filters.split, onChange]);

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
              {isCheer ? (
                <>
                  <FilterMenu
                    label="Mix Length"
                    value={filters.timeLimit}
                    options={timeLimitOptions}
                    onChange={(value) => onChange({ timeLimit: value })}
                  />
                  {showSplit ? (
                    <FilterMenu
                      label="Split"
                      value={filters.split}
                      options={splitOptions}
                      onChange={(value) =>
                        onChange({ split: value as SplitFilter })
                      }
                    />
                  ) : null}
                </>
              ) : null}
              <FilterMenu
                label={editorFilterLabel}
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
              {showDataFilter ? (
                <FilterMenu
                  label="Data"
                  value={filters.infoFilter ?? "all"}
                  options={infoOptions}
                  onChange={(value) =>
                    onChange({ infoFilter: value as InfoFilter })
                  }
                  accent="orange"
                />
              ) : null}
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
  const {
    records,
    producers,
    orderById,
    filters,
    onChange,
    form,
    cheerSubtype,
    danceSubtype,
    variant = "mtd",
  } = props;
  const isCheer = !form || form === "school-all-star-cheer";
  const showSplit = showCheerSplitFilter(form, cheerSubtype);
  const showDataFilter = variant !== "orders";
  const editorFilterLabel = "Assigned editor";

  const packageOptions = useMemo(
    () => buildPackageTierOptions(records),
    [records]
  );
  const timeLimitOptions = useMemo(
    () => buildTimeLimitOptions(records),
    [records]
  );
  const splitOptions = useMemo(() => buildSplitOptions(records), [records]);
  const categoryProducers = useMemo(
    () =>
      producersForFormCategory(producers, form, cheerSubtype, danceSubtype),
    [producers, form, cheerSubtype, danceSubtype]
  );
  const assignedOptions = useMemo(
    () => buildAssignedProducerOptions(records, [], categoryProducers),
    [records, categoryProducers]
  );
  const requestedOptions = useMemo(
    () =>
      buildRequestedProducerOptions(
        records,
        [],
        categoryProducers,
        orderById
      ),
    [records, categoryProducers, orderById]
  );
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
    if (isCheer && filters.timeLimit !== "All") {
      const label =
        timeLimitOptions.find((o) => o.value === filters.timeLimit)?.label ??
        filters.timeLimit;
      items.push({
        key: "timeLimit",
        label: `Mix Length · ${label}`,
        onClear: () => onChange({ timeLimit: "All" }),
      });
    }
    if (showSplit && filters.split !== "all") {
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
        label: `${editorFilterLabel} · ${label}`,
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
    if (showDataFilter && (filters.infoFilter ?? "all") !== "all") {
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
    infoOptions,
    onChange,
    isCheer,
    showSplit,
    showDataFilter,
    editorFilterLabel,
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
  sortBy: "newest",
};

/** Standalone Sort control: lives outside Filters, defaults to Newest. */
export function MTDSortMenu({
  value,
  onChange,
  grouped = false,
}: {
  value: MTDSortBy;
  onChange: (sortBy: MTDSortBy) => void;
  grouped?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const sortValue = value || "newest";
  const isDefault = sortValue === "newest";
  const selectedLabel =
    MTD_SORT_BY_OPTIONS.find((o) => o.value === sortValue)?.label ?? "Newest";

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
        aria-expanded={open}
        aria-haspopup="listbox"
        className={clsx(
          "inline-flex h-8 items-center gap-1.5 text-[12px] font-medium transition",
          grouped
            ? clsx(
                "rounded-lg px-2.5",
                open && "bg-brand-elevated shadow-sm ring-1 ring-brand-line/35",
                open || !isDefault
                  ? "bg-brand-blue-soft/70 font-semibold text-brand-ink"
                  : "text-brand-ink-secondary hover:bg-brand-elevated/90 hover:text-brand-ink",
                open && isDefault && "text-brand-ink"
              )
            : clsx(
                "rounded-full border px-3 shadow-sm",
                open || !isDefault
                  ? "border-brand-blue/35 bg-brand-blue-soft/45 text-brand-ink"
                  : "border-brand-line/55 bg-brand-elevated/90 text-brand-ink-secondary hover:border-brand-line-strong hover:bg-brand-elevated",
                open && "ring-2 ring-brand-blue/15"
              )
        )}
      >
        <ArrowUpDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        Sort
        {!isDefault ? (
          <span className="max-w-[100px] truncate text-brand-ink-secondary">
            · {selectedLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Sort by"
          className="absolute left-0 top-[calc(100%+8px)] z-40 max-h-[300px] w-[min(92vw,248px)] overflow-y-auto rounded-xl border border-brand-line bg-brand-surface py-1 shadow-[var(--shadow-premium)]"
        >
          {MTD_SORT_BY_OPTIONS.map((opt) => {
            const active = opt.value === sortValue;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={clsx(
                  "flex w-full items-center px-3 py-2 text-left text-[13px] transition hover:bg-brand-bg",
                  active
                    ? "font-semibold text-brand-ink"
                    : "text-brand-ink-secondary"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Use MTDTableFilterPanel */
export function MTDTableFilters(props: MTDTableFilterPanelProps & { embedded?: boolean; filteredCount?: number }) {
  return <MTDTableFilterPanel {...props} />;
}
