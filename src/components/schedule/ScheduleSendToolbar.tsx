"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import { OrderFormFilters } from "@/components/orders/OrderFormFilters";
import { FilterPill } from "@/components/ui/FilterPill";
import { ProducerSelect } from "@/components/ui/ProducerSelect";
import type { ScheduleSendPeriod } from "@/lib/schedule-view";
import type {
  CheerFormSubtypeFilter,
  DanceFormSubtypeFilter,
  OrderFormType,
  Producer,
} from "@/types";

type ScheduleSendToolbarProps = {
  form: OrderFormType;
  cheerSubtype: CheerFormSubtypeFilter;
  danceSubtype: DanceFormSubtypeFilter;
  formCounts: Record<OrderFormType, number>;
  cheerCounts: Record<CheerFormSubtypeFilter, number>;
  danceCounts: Record<DanceFormSubtypeFilter, number>;
  sendEditorProducers: Producer[];
  selectedSendEditor: string;
  onSelectedSendEditorChange: (editor: string) => void;
  sendView: ScheduleSendPeriod;
  onSendViewChange: (value: ScheduleSendPeriod) => void;
  onFormChange: (form: OrderFormType) => void;
  onCheerSubtypeChange: (subtype: CheerFormSubtypeFilter) => void;
  onDanceSubtypeChange: (subtype: DanceFormSubtypeFilter) => void;
};

function FilterGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex min-w-0 flex-col gap-1.5", className)}>
      <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
        {label}
      </p>
      <div
        className="inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-xl bg-white p-1 shadow-sm ring-1 ring-inset ring-brand-line/45"
        role="group"
        aria-label={label}
      >
        {children}
      </div>
    </div>
  );
}

export function ScheduleSendToolbar({
  form,
  cheerSubtype,
  danceSubtype,
  formCounts,
  cheerCounts,
  danceCounts,
  sendEditorProducers,
  selectedSendEditor,
  onSelectedSendEditorChange,
  sendView,
  onSendViewChange,
  onFormChange,
  onCheerSubtypeChange,
  onDanceSubtypeChange,
}: ScheduleSendToolbarProps) {
  return (
    <div className="flex flex-col gap-3.5">
      <div
        className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between"
        role="toolbar"
        aria-label="Send schedule filters"
      >
        <div className="relative z-40 inline-flex flex-wrap items-center gap-0.5 rounded-xl bg-brand-elevated/80 p-0.5 ring-1 ring-inset ring-brand-line/40">
          <OrderFormFilters
            grouped
            portalMenus
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
          {sendEditorProducers.length > 0 ? (
            <>
              <span
                className="mx-0.5 hidden h-5 w-px shrink-0 bg-brand-line/45 sm:block"
                aria-hidden
              />
              <div className="px-1.5 py-0.5">
                <ProducerSelect
                  producers={sendEditorProducers}
                  value={selectedSendEditor}
                  onChange={onSelectedSendEditorChange}
                  label="Editor:"
                  allLabel="All Editors"
                />
              </div>
            </>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <FilterGroup label="Send period">
            <FilterPill
              label="Complete"
              active={sendView === "complete"}
              variant="grouped"
              onClick={() => onSendViewChange("complete")}
            />
            <FilterPill
              label="This Week"
              active={sendView === "week"}
              variant="grouped"
              onClick={() => onSendViewChange("week")}
            />
            <FilterPill
              label="This Month"
              active={sendView === "month"}
              variant="grouped"
              onClick={() => onSendViewChange("month")}
            />
            <FilterPill
              label="90 Day"
              active={sendView === "90days"}
              variant="grouped"
              onClick={() => onSendViewChange("90days")}
            />
            <FilterPill
              label="6 Month"
              active={sendView === "6months"}
              variant="grouped"
              onClick={() => onSendViewChange("6months")}
            />
          </FilterGroup>
        </div>
      </div>
    </div>
  );
}
