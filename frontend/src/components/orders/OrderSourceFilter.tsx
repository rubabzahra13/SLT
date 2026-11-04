"use client";

import { FilterMenu } from "@/components/ui/FilterMenu";
import {
  ORDER_SOURCE_OPTIONS,
  filterRecordsByOrderSource,
} from "@/lib/order-source";
import type { MTDRecord, Order, OrderSourceFilter as OrderSourceFilterId } from "@/types";

type OrderSourceFilterProps = {
  value: OrderSourceFilterId;
  onChange: (value: OrderSourceFilterId) => void;
  records: MTDRecord[];
  orderById: Map<string, Order>;
  /** Prefer server totals so the menu isn't stuck at 0 / page size. */
  serverCounts?: { both?: number; form?: number; manual?: number } | null;
  grouped?: boolean;
  portalMenus?: boolean;
};

export function OrderSourceFilter({
  value,
  onChange,
  records,
  orderById,
  serverCounts,
  grouped = false,
  portalMenus = false,
}: OrderSourceFilterProps) {
  const pageCounts = {
    both: records.length,
    form: filterRecordsByOrderSource(records, "form", orderById).length,
    manual: filterRecordsByOrderSource(records, "manual", orderById).length,
  };
  const counts = {
    both:
      typeof serverCounts?.both === "number" && serverCounts.both >= 0
        ? serverCounts.both
        : pageCounts.both,
    form:
      typeof serverCounts?.form === "number" && serverCounts.form >= 0
        ? serverCounts.form
        : pageCounts.form,
    manual:
      typeof serverCounts?.manual === "number" && serverCounts.manual >= 0
        ? serverCounts.manual
        : pageCounts.manual,
  };

  return (
    <FilterMenu
      label="Source"
      hideLabel
      grouped={grouped}
      portal={portalMenus}
      value={value}
      onChange={(v) => onChange(v as OrderSourceFilterId)}
      accent="blue"
      options={ORDER_SOURCE_OPTIONS.map(({ id, label }) => ({
        value: id,
        label,
        count: counts[id],
      }))}
    />
  );
}
