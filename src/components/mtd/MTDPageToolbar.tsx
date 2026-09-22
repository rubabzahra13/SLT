"use client";

import { OrderFormFilters } from "@/components/orders/OrderFormFilters";
import { OrderRangeToggle } from "@/components/orders/OrderRangeToggle";
import {
  MTDFilterChipsRow,
  MTDTableFilterPanel,
  type MTDTableFilterState,
} from "@/components/mtd/MTDTableFilters";
import type { MTDRecord, Order, OrderViewRangeFilter, Producer } from "@/types";
import type {
  CheerFormSubtypeFilter,
  DanceFormSubtypeFilter,
  OrderFormType,
} from "@/types";

type MTDPageToolbarProps = {
  form: OrderFormType;
  cheerSubtype: CheerFormSubtypeFilter;
  danceSubtype: DanceFormSubtypeFilter;
  rangeFilter?: OrderViewRangeFilter;
  onRangeFilterChange?: (filter: OrderViewRangeFilter) => void;
  allOrdersCount?: number;
  needToBeScheduledCount?: number;
  newOrdersCount?: number;
  reassignedOrdersCount?: number;
  waitingForDataCount?: number;
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
  rangeFilter,
  onRangeFilterChange,
  allOrdersCount,
  needToBeScheduledCount,
  newOrdersCount,
  reassignedOrdersCount,
  waitingForDataCount,
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
          />
        </div>

        {onRangeFilterChange && rangeFilter ? (
          <div className="flex shrink-0 items-center">
            <OrderRangeToggle
              value={rangeFilter}
              onChange={onRangeFilterChange}
              counts={{
                all: allOrdersCount,
                needToBeScheduled: needToBeScheduledCount ?? newOrdersCount,
                newOrders: newOrdersCount,
                reassigned: reassignedOrdersCount,
                waitingForData: waitingForDataCount,
              }}
            />
          </div>
        ) : null}
      </div>

      <MTDFilterChipsRow
        records={records}
        producers={producers}
        orderById={orderById}
        filters={filters}
        onChange={onFiltersChange}
        onReset={onFiltersReset}
        form={form}
        variant={filterVariant}
      />
    </div>
  );
}
