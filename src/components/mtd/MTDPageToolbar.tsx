"use client";

import { OrderFormFilters } from "@/components/orders/OrderFormFilters";
import {
  MTDFilterChipsRow,
  MTDTableFilterPanel,
  type MTDTableFilterState,
} from "@/components/mtd/MTDTableFilters";
import type { MTDRecord, Order, Producer } from "@/types";
import type {
  CheerFormSubtypeFilter,
  DanceFormSubtypeFilter,
  OrderFormType,
} from "@/types";

import { FilterMenu } from "@/components/ui/FilterMenu";

export type OrderTypeFilter = "new_orders" | "reassigned";

type MTDPageToolbarProps = {
  form: OrderFormType;
  cheerSubtype: CheerFormSubtypeFilter;
  danceSubtype: DanceFormSubtypeFilter;
  orderType?: OrderTypeFilter;
  onOrderTypeChange?: (orderType: OrderTypeFilter) => void;
  newOrdersCount?: number;
  reassignedOrdersCount?: number;
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
  orderType,
  onOrderTypeChange,
  newOrdersCount,
  reassignedOrdersCount,
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
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2.5">
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
            records={records}
            producers={producers}
            orderById={orderById}
            filters={filters}
            onChange={onFiltersChange}
            onReset={onFiltersReset}
            form={form}
          />
          {onOrderTypeChange && orderType ? (
            <>
              <span
                className="mx-0.5 hidden h-5 w-px shrink-0 bg-brand-line/45 sm:block"
                aria-hidden
              />
              <FilterMenu
                label="Order Type"
                hideLabel
                grouped
                value={orderType}
                onChange={(v) => onOrderTypeChange(v as OrderTypeFilter)}
                accent={orderType === "reassigned" ? "red" : "blue"}
                options={[
                  { value: "new_orders", label: "New Orders", count: newOrdersCount },
                  { value: "reassigned", label: "Reassigned", count: reassignedOrdersCount, isRed: true },
                ]}
              />
            </>
          ) : null}
        </div>

      </div>

      <MTDFilterChipsRow
        records={records}
        producers={producers}
        orderById={orderById}
        filters={filters}
        onChange={onFiltersChange}
        onReset={onFiltersReset}
        form={form}
      />
    </div>
  );
}
