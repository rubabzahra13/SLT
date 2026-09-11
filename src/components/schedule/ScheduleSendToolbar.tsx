"use client";

import { OrderFormFilters } from "@/components/orders/OrderFormFilters";
import { ProducerSelect } from "@/components/ui/ProducerSelect";
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
  onFormChange: (form: OrderFormType) => void;
  onCheerSubtypeChange: (subtype: CheerFormSubtypeFilter) => void;
  onDanceSubtypeChange: (subtype: DanceFormSubtypeFilter) => void;
};

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
  onFormChange,
  onCheerSubtypeChange,
  onDanceSubtypeChange,
}: ScheduleSendToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
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
    </div>
  );
}
