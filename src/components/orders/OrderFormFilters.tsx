"use client";

import { FilterMenu } from "@/components/ui/FilterMenu";
import {
  CHEER_FORM_SUBTABS_WITH_ALL,
  DANCE_FORM_SUBTABS_WITH_ALL,
  ORDER_FORM_TABS,
  type CheerFormSubtypeFilter,
  type DanceFormSubtypeFilter,
  type OrderFormType,
} from "@/types";

type OrderFormFiltersProps = {
  form: OrderFormType;
  cheerSubtype: CheerFormSubtypeFilter;
  danceSubtype: DanceFormSubtypeFilter;
  onFormChange: (form: OrderFormType) => void;
  onCheerSubtypeChange: (subtype: CheerFormSubtypeFilter) => void;
  onDanceSubtypeChange: (subtype: DanceFormSubtypeFilter) => void;
  formCounts: Record<OrderFormType, number>;
  cheerCounts: Record<CheerFormSubtypeFilter, number>;
  danceCounts: Record<DanceFormSubtypeFilter, number>;
  grouped?: boolean;
};

export function OrderFormFilters({
  form,
  cheerSubtype,
  danceSubtype,
  onFormChange,
  onCheerSubtypeChange,
  onDanceSubtypeChange,
  formCounts,
  cheerCounts,
  danceCounts,
  grouped = false,
}: OrderFormFiltersProps) {
  return (
    <>
      <FilterMenu
        label="Form"
        hideLabel
        grouped={grouped}
        value={form}
        onChange={(v) => onFormChange(v as OrderFormType)}
        accent="blue"
        options={ORDER_FORM_TABS.map(({ id, label }) => ({
          value: id,
          label,
          count: formCounts[id] ?? 0,
        }))}
      />

      {form === "school-all-star-cheer" ? (
        <FilterMenu
          label="Cheer"
          hideLabel
          grouped={grouped}
          value={cheerSubtype}
          onChange={(v) => onCheerSubtypeChange(v as CheerFormSubtypeFilter)}
          accent="orange"
          options={CHEER_FORM_SUBTABS_WITH_ALL.map(({ id, label }) => ({
            value: id,
            label,
            count: cheerCounts[id] ?? 0,
          }))}
        />
      ) : null}

      {form === "school-all-star-dance" ? (
        <FilterMenu
          label="Dance"
          hideLabel
          grouped={grouped}
          value={danceSubtype}
          onChange={(v) => onDanceSubtypeChange(v as DanceFormSubtypeFilter)}
          accent="orange"
          options={DANCE_FORM_SUBTABS_WITH_ALL.map(({ id, label }) => ({
            value: id,
            label,
            count: danceCounts[id] ?? 0,
          }))}
        />
      ) : null}
    </>
  );
}
