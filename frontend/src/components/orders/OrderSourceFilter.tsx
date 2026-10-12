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
  grouped?: boolean;
  portalMenus?: boolean;
};

export function OrderSourceFilter({
  value,
  onChange,
  records,
  orderById,
  grouped = false,
  portalMenus = false,
}: OrderSourceFilterProps) {
  const counts = {
    both: records.length,
    form: filterRecordsByOrderSource(records, "form", orderById).length,
    manual: filterRecordsByOrderSource(records, "manual", orderById).length,
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
