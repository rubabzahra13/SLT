"use client";

import { OrderFormFilters } from "@/components/orders/OrderFormFilters";
import { OrderRangeToggle } from "@/components/orders/OrderRangeToggle";
import { OrderSourceFilter } from "@/components/orders/OrderSourceFilter";
import {
  MTDFilterChipsRow,
  MTDSortMenu,
  MTDTableFilterPanel,
  type MTDTableFilterState,
} from "@/components/mtd/MTDTableFilters";
import {
  MTDViewOrderToggle,
  type MTDViewOrder,
} from "@/components/mtd/MTDViewOrderToggle";
import { ProducerSelect } from "@/components/ui/ProducerSelect";
import type {
  MTDRecord,
  Order,
  OrderSourceFilter as OrderSourceFilterId,
  OrderViewRangeFilter,
  Producer,
} from "@/types";
import type {
  CheerFormSubtypeFilter,
  DanceFormSubtypeFilter,
  OrderFormType,
} from "@/types";

type MTDPageToolbarProps = {
  form?: OrderFormType;
  cheerSubtype?: CheerFormSubtypeFilter;
  danceSubtype?: DanceFormSubtypeFilter;
  /** Payroll board: hide Form/Cheer/Dance; show producer search instead. */
  hideFormFilters?: boolean;
  boardProducerFilter?: string;
  onBoardProducerFilterChange?: (value: string) => void;
  sourceFilter?: OrderSourceFilterId;
  onSourceFilterChange?: (filter: OrderSourceFilterId) => void;
  /** Unfiltered-by-source pool used for Source menu counts. */
  sourceCountRecords?: MTDRecord[];
  /** Server Source menu totals (All / Form / Manual). */
  sourceServerCounts?: { both?: number; form?: number; manual?: number } | null;
  rangeFilter?: OrderViewRangeFilter | OrderViewRangeFilter[];
  onRangeFilterChange?: (filter: OrderViewRangeFilter[]) => void;
  viewOrder?: MTDViewOrder;
  onViewOrderChange?: (value: MTDViewOrder) => void;
  allOrdersCount?: number;
  needToBeScheduledCount?: number;
  newOrdersCount?: number;
  assignedOrdersCount?: number;
  notAssignedOrdersCount?: number;
  reassignLeaveOrdersCount?: number;
  reassignRushOrdersCount?: number;
  reassignedOrdersCount?: number;
  waitingForDataCount?: number;
  onFormChange?: (form: OrderFormType) => void;
  onCheerSubtypeChange?: (subtype: CheerFormSubtypeFilter) => void;
  onDanceSubtypeChange?: (subtype: DanceFormSubtypeFilter) => void;
  onFormMenuIntent?: () => void;
  onFormOptionIntent?: (form: OrderFormType) => void;
  onCheerOptionIntent?: (subtype: CheerFormSubtypeFilter) => void;
  onDanceOptionIntent?: (subtype: DanceFormSubtypeFilter) => void;
  onRangeIntent?: (filter: OrderViewRangeFilter) => void;
  formCounts?: Record<OrderFormType, number>;
  cheerCounts?: Record<CheerFormSubtypeFilter, number>;
  danceCounts?: Record<DanceFormSubtypeFilter, number>;
  /** Hide Form/Cheer/Dance option counts (Payroll). Default true. */
  showFormOptionCounts?: boolean;
  records: MTDRecord[];
  producers: Producer[];
  orderById: Map<string, Order>;
  filters: MTDTableFilterState;
  onFiltersChange: (patch: Partial<MTDTableFilterState>) => void;
  onFiltersReset: () => void;
  onPricingClick?: () => void;
};

export function MTDPageToolbar({
  form,
  cheerSubtype = "all",
  danceSubtype = "all",
  hideFormFilters = false,
  boardProducerFilter = "all",
  onBoardProducerFilterChange,
  sourceFilter,
  onSourceFilterChange,
  sourceCountRecords,
  sourceServerCounts,
  rangeFilter,
  onRangeFilterChange,
  viewOrder,
  onViewOrderChange,
  allOrdersCount,
  needToBeScheduledCount,
  newOrdersCount,
  assignedOrdersCount,
  notAssignedOrdersCount,
  reassignLeaveOrdersCount,
  reassignRushOrdersCount,
  reassignedOrdersCount,
  waitingForDataCount,
  onFormChange,
  onCheerSubtypeChange,
  onDanceSubtypeChange,
  onFormMenuIntent,
  onFormOptionIntent,
  onCheerOptionIntent,
  onDanceOptionIntent,
  onRangeIntent,
  formCounts,
  cheerCounts,
  danceCounts,
  showFormOptionCounts = true,
  records,
  producers,
  orderById,
  filters,
  onFiltersChange,
  onFiltersReset,
  onPricingClick,
}: MTDPageToolbarProps) {
  const filterVariant = onRangeFilterChange ? "orders" : "mtd";
  const showFormFilters =
    !hideFormFilters &&
    form &&
    onFormChange &&
    onCheerSubtypeChange &&
    onDanceSubtypeChange &&
    formCounts &&
    cheerCounts &&
    danceCounts;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex flex-wrap items-center gap-0.5 rounded-xl bg-brand-elevated/80 p-0.5 ring-1 ring-inset ring-brand-line/40"
          role="toolbar"
          aria-label="MTD filters"
        >
          {onSourceFilterChange && sourceFilter ? (
            <>
              <OrderSourceFilter
                grouped
                value={sourceFilter}
                onChange={onSourceFilterChange}
                records={sourceCountRecords ?? records}
                orderById={orderById}
                serverCounts={sourceServerCounts}
              />
              <span
                className="mx-0.5 hidden h-5 w-px shrink-0 bg-brand-line/45 sm:block"
                aria-hidden
              />
            </>
          ) : null}
          {showFormFilters ? (
            <>
              <OrderFormFilters
                grouped
                form={form}
                cheerSubtype={cheerSubtype}
                danceSubtype={danceSubtype}
                onFormChange={onFormChange}
                onCheerSubtypeChange={onCheerSubtypeChange}
                onDanceSubtypeChange={onDanceSubtypeChange}
                onFormMenuIntent={onFormMenuIntent}
                onFormOptionIntent={onFormOptionIntent}
                onCheerOptionIntent={onCheerOptionIntent}
                onDanceOptionIntent={onDanceOptionIntent}
                formCounts={formCounts}
                cheerCounts={cheerCounts}
                danceCounts={danceCounts}
                showOptionCounts={showFormOptionCounts}
              />
              <span
                className="mx-0.5 hidden h-5 w-px shrink-0 bg-brand-line/45 sm:block"
                aria-hidden
              />
            </>
          ) : null}
          {hideFormFilters && onBoardProducerFilterChange ? (
            <>
              <div className="px-1.5 py-0.5">
                <ProducerSelect
                  producers={producers}
                  value={boardProducerFilter}
                  onChange={onBoardProducerFilterChange}
                  label="Producer:"
                  allLabel="All producers"
                  searchable
                  searchPlaceholder="Search producers…"
                />
              </div>
              <span
                className="mx-0.5 hidden h-5 w-px shrink-0 bg-brand-line/45 sm:block"
                aria-hidden
              />
            </>
          ) : null}
          {!hideFormFilters ? (
            <>
              <MTDTableFilterPanel
                grouped
                variant={filterVariant}
                records={records}
                producers={producers}
                orderById={orderById}
                filters={filters}
                onChange={onFiltersChange}
                onReset={onFiltersReset}
                form={form}
                cheerSubtype={cheerSubtype}
                danceSubtype={danceSubtype}
              />
              <span
                className="mx-0.5 hidden h-5 w-px shrink-0 bg-brand-line/45 sm:block"
                aria-hidden
              />
            </>
          ) : null}
          <MTDSortMenu
            grouped
            value={filters.sortBy ?? "newest"}
            onChange={(sortBy) => onFiltersChange({ sortBy })}
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {onViewOrderChange && viewOrder ? (
            <MTDViewOrderToggle
              value={viewOrder}
              onChange={onViewOrderChange}
            />
          ) : null}
          {onRangeFilterChange && rangeFilter && rangeFilter !== "flagged" ? (
            <OrderRangeToggle
              value={rangeFilter}
              onChange={onRangeFilterChange}
              onRangeIntent={onRangeIntent}
              counts={{
                all: allOrdersCount,
                needToBeScheduled: needToBeScheduledCount ?? newOrdersCount,
                newOrders: newOrdersCount,
                assigned: assignedOrdersCount,
                notAssigned: notAssignedOrdersCount,
                reassignLeave: reassignLeaveOrdersCount,
                reassignRush: reassignRushOrdersCount,
                reassigned: reassignedOrdersCount,
                waitingForData: waitingForDataCount,
              }}
            />
          ) : null}
        </div>
      </div>

      {!hideFormFilters ? (
        <MTDFilterChipsRow
          records={records}
          producers={producers}
          orderById={orderById}
          form={form}
          cheerSubtype={cheerSubtype}
          danceSubtype={danceSubtype}
          filters={filters}
          onChange={onFiltersChange}
          onReset={onFiltersReset}
          variant={filterVariant}
        />
      ) : null}
    </div>
  );
}
