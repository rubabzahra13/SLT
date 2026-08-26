"use client";

import { OrderFormFilters } from "@/components/orders/OrderFormFilters";
import {
  MTDFilterChipsRow,
  MTDTableFilterPanel,
  type MTDTableFilterState,
} from "@/components/mtd/MTDTableFilters";
import type { MTDRecord, Order, Producer } from "@/types";
import type {
  CheerFormSubtype,
  DanceFormSubtype,
  OrderFormType,
} from "@/types";

type MTDPageToolbarProps = {
  form: OrderFormType;
  cheerSubtype: CheerFormSubtype;
  danceSubtype: DanceFormSubtype;
  onFormChange: (form: OrderFormType) => void;
  onCheerSubtypeChange: (subtype: CheerFormSubtype) => void;
  onDanceSubtypeChange: (subtype: DanceFormSubtype) => void;
  formCounts: Record<OrderFormType, number>;
  cheerCounts: Record<CheerFormSubtype, number>;
  danceCounts: Record<DanceFormSubtype, number>;
  records: MTDRecord[];
  producers: Producer[];
  orderById: Map<string, Order>;
  filters: MTDTableFilterState;
  onFiltersChange: (patch: Partial<MTDTableFilterState>) => void;
  onFiltersReset: () => void;
  onPricingClick: () => void;
};

export function MTDPageToolbar({
  form,
  cheerSubtype,
  danceSubtype,
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
          />
        </div>

        <button
          type="button"
          onClick={onPricingClick}
          className="ml-auto inline-flex h-8 shrink-0 items-center rounded-lg bg-brand-orange px-3.5 text-[12px] font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition hover:bg-brand-orange-hover hover:shadow-[0_2px_4px_rgba(0,0,0,0.12)]"
        >
          Pricing
        </button>
      </div>

      <MTDFilterChipsRow
        records={records}
        producers={producers}
        orderById={orderById}
        filters={filters}
        onChange={onFiltersChange}
        onReset={onFiltersReset}
      />
    </div>
  );
}
