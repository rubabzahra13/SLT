"use client";

import { GitMerge, SplitSquareVertical } from "lucide-react";
import type { FieldDataSource, ManualFormPair } from "@/lib/manual-form-merge";

type ManualFormPairBarProps = {
  pair: ManualFormPair;
  /** True after admin form-wins merge (form absorbed into manual). */
  isMerged: boolean;
  disabled?: boolean;
  onMerge: () => void;
  onSplit: () => void;
};

export function SourceTag({ source }: { source: FieldDataSource }) {
  const isForm = source === "form";
  return (
    <span
      className={
        isForm
          ? "inline-flex items-center rounded-md bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] text-sky-700 ring-1 ring-inset ring-sky-200/80"
          : "inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] text-amber-800 ring-1 ring-inset ring-amber-200/80"
      }
    >
      {isForm ? "Form" : "Manual"}
    </span>
  );
}

export function ManualFormPairBar({
  pair,
  isMerged,
  disabled = false,
  onMerge,
  onSplit,
}: ManualFormPairBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-line/50 bg-brand-bg-subtle/50 px-3 py-2.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <SourceTag source="manual" />
          <SourceTag source="form" />
          {isMerged ? (
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] text-emerald-800 ring-1 ring-inset ring-emerald-200/80">
              Merged
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] text-violet-800 ring-1 ring-inset ring-violet-200/80">
              Paired
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] leading-snug text-brand-ink-secondary">
          {isMerged
            ? "Form data is primary on overlaps. Split to restore separate Manual and Form orders."
            : "Both Manual and Form data found. Merge keeps form values on overlaps; Split keeps two orders."}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-brand-ink-tertiary">
          Manual {pair.manual.id}
          {" · "}
          Form {pair.form.id}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onMerge}
          className="inline-flex items-center gap-1.5 rounded-xl border border-brand-line/70 bg-white px-3 py-1.5 text-[12px] font-semibold text-brand-ink shadow-sm transition hover:bg-brand-bg disabled:cursor-not-allowed disabled:opacity-40"
          title="Form wins on overlaps; keep manual-only fields"
        >
          <GitMerge className="h-3.5 w-3.5" strokeWidth={2.25} />
          Merge order
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onSplit}
          className="inline-flex items-center gap-1.5 rounded-xl border border-brand-line/70 bg-white px-3 py-1.5 text-[12px] font-semibold text-brand-ink shadow-sm transition hover:bg-brand-bg disabled:cursor-not-allowed disabled:opacity-40"
          title="Restore as separate Manual and Form orders"
        >
          <SplitSquareVertical className="h-3.5 w-3.5" strokeWidth={2.25} />
          Split order
        </button>
      </div>
    </div>
  );
}
