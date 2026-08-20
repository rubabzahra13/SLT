"use client";

import { FilterSelect } from "@/components/ui/FilterSelect";
import {
  CHEER_FORM_SUBTABS,
  DANCE_FORM_SUBTABS,
  ORDER_FORM_TABS,
  type CheerFormSubtype,
  type DanceFormSubtype,
  type OrderFormType,
} from "@/types";

type OrderFormFiltersProps = {
  form: OrderFormType;
  cheerSubtype: CheerFormSubtype;
  danceSubtype: DanceFormSubtype;
  onFormChange: (form: OrderFormType) => void;
  onCheerSubtypeChange: (subtype: CheerFormSubtype) => void;
  onDanceSubtypeChange: (subtype: DanceFormSubtype) => void;
  formCounts: Record<OrderFormType, number>;
  cheerCounts: Record<CheerFormSubtype, number>;
  danceCounts: Record<DanceFormSubtype, number>;
  onInvoiceClick?: () => void;
  onPricingClick?: () => void;
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
  onInvoiceClick,
  onPricingClick,
}: OrderFormFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-line bg-brand-bg/30 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Form"
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
          <FilterSelect
            label="Cheer"
            value={cheerSubtype}
            onChange={(v) => onCheerSubtypeChange(v as CheerFormSubtype)}
            accent="orange"
            options={CHEER_FORM_SUBTABS.map(({ id, label }) => ({
              value: id,
              label,
              count: cheerCounts[id] ?? 0,
            }))}
          />
        ) : null}

        {form === "school-all-star-dance" ? (
          <FilterSelect
            label="Dance"
            value={danceSubtype}
            onChange={(v) => onDanceSubtypeChange(v as DanceFormSubtype)}
            accent="orange"
            options={DANCE_FORM_SUBTABS.map(({ id, label }) => ({
              value: id,
              label,
              count: danceCounts[id] ?? 0,
            }))}
          />
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onInvoiceClick}
          className="rounded-lg border border-brand-line bg-brand-surface px-3 py-1.5 text-[12px] font-semibold text-brand-ink transition hover:border-brand-line-strong hover:bg-brand-bg"
        >
          Invoice
        </button>
        <button
          type="button"
          onClick={onPricingClick}
          className="rounded-lg border border-brand-orange/40 bg-brand-orange-soft px-3 py-1.5 text-[12px] font-semibold text-brand-orange transition hover:bg-brand-orange-muted/30"
        >
          Pricing
        </button>
      </div>
    </div>
  );
}
