"use client";

import { FilterMenu } from "@/components/ui/FilterMenu";
import {
  CHEER_FORM_SUBTABS,
  DANCE_FORM_SUBTABS,
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
  /** Warm sibling form boards when the Form menu opens. */
  onFormMenuIntent?: () => void;
  /** Warm a specific form/subtype board before the selection commits. */
  onFormOptionIntent?: (form: OrderFormType) => void;
  onCheerOptionIntent?: (subtype: CheerFormSubtypeFilter) => void;
  onDanceOptionIntent?: (subtype: DanceFormSubtypeFilter) => void;
  formCounts: Record<OrderFormType, number>;
  cheerCounts: Record<CheerFormSubtypeFilter, number>;
  danceCounts: Record<DanceFormSubtypeFilter, number>;
  /** When false, dropdown options are labels only (Payroll). Default true. */
  showOptionCounts?: boolean;
  grouped?: boolean;
  portalMenus?: boolean;
};

export function OrderFormFilters({
  form,
  cheerSubtype,
  danceSubtype,
  onFormChange,
  onCheerSubtypeChange,
  onDanceSubtypeChange,
  onFormMenuIntent,
  onFormOptionIntent,
  onCheerOptionIntent,
  onDanceOptionIntent,
  formCounts,
  cheerCounts,
  danceCounts,
  showOptionCounts = true,
  grouped = false,
  portalMenus = false,
}: OrderFormFiltersProps) {
  return (
    <>
      <FilterMenu
        label="Form"
        hideLabel
        grouped={grouped}
        portal={portalMenus}
        value={form}
        onChange={(v) => onFormChange(v as OrderFormType)}
        onOpenIntent={onFormMenuIntent}
        onOptionIntent={(v) => onFormOptionIntent?.(v as OrderFormType)}
        accent="blue"
        options={ORDER_FORM_TABS.map(({ id, label }) => ({
          value: id,
          label,
          ...(showOptionCounts ? { count: formCounts[id] ?? 0 } : {}),
        }))}
      />

      {form === "school-all-star-cheer" ? (
        <FilterMenu
          label="Cheer"
          hideLabel
          grouped={grouped}
          portal={portalMenus}
          value={cheerSubtype}
          onChange={(v) => onCheerSubtypeChange(v as CheerFormSubtypeFilter)}
          onOptionIntent={(v) =>
            onCheerOptionIntent?.(v as CheerFormSubtypeFilter)
          }
          accent="orange"
          options={CHEER_FORM_SUBTABS.map(({ id, label }) => ({
            value: id,
            label,
            ...(showOptionCounts ? { count: cheerCounts[id] ?? 0 } : {}),
          }))}
        />
      ) : null}

      {form === "school-all-star-dance" ? (
        <FilterMenu
          label="Dance"
          hideLabel
          grouped={grouped}
          portal={portalMenus}
          value={danceSubtype}
          onChange={(v) => onDanceSubtypeChange(v as DanceFormSubtypeFilter)}
          onOptionIntent={(v) =>
            onDanceOptionIntent?.(v as DanceFormSubtypeFilter)
          }
          accent="orange"
          options={DANCE_FORM_SUBTABS.map(({ id, label }) => ({
            value: id,
            label,
            ...(showOptionCounts ? { count: danceCounts[id] ?? 0 } : {}),
          }))}
        />
      ) : null}
    </>
  );
}
