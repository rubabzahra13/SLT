"use client";

import { OrderFlaggedToggle } from "@/components/orders/OrderFlaggedToggle";
import { OrderFormFilters } from "@/components/orders/OrderFormFilters";
import { OrderRangeToggle } from "@/components/orders/OrderRangeToggle";
import { OrderSourceFilter } from "@/components/orders/OrderSourceFilter";
import {
  MTDFilterChipsRow,
  MTDTableFilterPanel,
  type MTDTableFilterState,
} from "@/components/mtd/MTDTableFilters";
import {
  MTDViewOrderToggle,
  type MTDViewOrder,
} from "@/components/mtd/MTDViewOrderToggle";
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
  form: OrderFormType;
  cheerSubtype: CheerFormSubtypeFilter;
  danceSubtype: DanceFormSubtypeFilter;
  sourceFilter?: OrderSourceFilterId;
  onSourceFilterChange?: (filter: OrderSourceFilterId) => void;
  /** Unfiltered-by-source pool used for Source menu counts. */
  sourceCountRecords?: MTDRecord[];
  rangeFilter?: OrderViewRangeFilter;
  onRangeFilterChange?: (filter: OrderViewRangeFilter) => void;
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
  flaggedOrdersCount?: number;
  onFlaggedToggle?: () => void;
  onFormChange: (form: OrderFormType) => void;
  onCheerSubtypeChange: (subtype: CheerFormSubtypeFilter) => void;
  onDanceSubtypeChange: (subtype: DanceFormSubtypeFilter) => void;
  formCounts: Record<OrderFormType, number>;
  cheerCounts: Record<CheerFormSubtypeFilter, number>;
  danceCounts: Record<DanceFormSubtypeFilter, number>;
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
  cheerSubtype,
  danceSubtype,
  sourceFilter,
  onSourceFilterChange,
  sourceCountRecords,
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
  flaggedOrdersCount,
  onFlaggedToggle,
  onFormChange,
  onCheerSubtypeChange,
  onDanceSubtypeChange,
  formCounts,
  cheerCounts,
  danceCounts,
  records,
  producers,
  orderById,
  filters,
  onFiltersChange,
  onFiltersReset,
  onPricingClick,
}: MTDPageToolbarProps) {
  const filterVariant = onRangeFilterChange ? "orders" : "mtd";

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
              />
              <span
                className="mx-0.5 hidden h-5 w-px shrink-0 bg-brand-line/45 sm:block"
                aria-hidden
              />
            </>
          ) : null}
          <OrderFormFilters
            grouped
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
          {onFlaggedToggle && typeof flaggedOrdersCount === "number" ? (
            <>
              <span
                className="mx-0.5 hidden h-5 w-px shrink-0 bg-brand-line/45 sm:block"
                aria-hidden
              />
              <OrderFlaggedToggle
                grouped
                active={rangeFilter === "flagged"}
                count={flaggedOrdersCount}
                onClick={onFlaggedToggle}
              />
            </>
          ) : null}
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
    </div>
  );
}
