"use client";

import { MTDSortMenu } from "@/components/mtd/MTDTableFilters";
import { ProducerSelect } from "@/components/ui/ProducerSelect";
import type { MTDSortBy } from "@/lib/mtd-filters";
import type { Producer } from "@/types";

type PayrollSendToolbarProps = {
  producers: Producer[];
  selectedSendEditor: string;
  onSelectedSendEditorChange: (editor: string) => void;
  sortBy: MTDSortBy;
  onSortByChange: (sortBy: MTDSortBy) => void;
};

export function PayrollSendToolbar({
  producers,
  selectedSendEditor,
  onSelectedSendEditorChange,
  sortBy,
  onSortByChange,
}: PayrollSendToolbarProps) {
  return (
    <div className="flex flex-col gap-3.5">
      <div
        className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between"
        role="toolbar"
        aria-label="Payroll send filters"
      >
        <div className="relative z-40 inline-flex flex-wrap items-center gap-0.5 rounded-xl bg-brand-elevated/80 p-0.5 ring-1 ring-inset ring-brand-line/40">
          <div className="px-1.5 py-0.5">
            <ProducerSelect
              producers={producers}
              value={selectedSendEditor}
              onChange={onSelectedSendEditorChange}
              label="Producer:"
              allLabel="All producers"
              searchable
              searchPlaceholder="Search producers…"
            />
          </div>
          <span
            className="mx-0.5 hidden h-5 w-px shrink-0 bg-brand-line/45 sm:block"
            aria-hidden
          />
          <MTDSortMenu grouped value={sortBy} onChange={onSortByChange} />
        </div>

        <p className="shrink-0 text-[11px] font-medium text-brand-ink-tertiary">
          Period: last 2 weeks
        </p>
      </div>
    </div>
  );
}
