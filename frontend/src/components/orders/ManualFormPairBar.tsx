"use client";

import { useState } from "react";
import { SplitSquareVertical } from "lucide-react";
import type { FieldDataSource } from "@/lib/manual-form-merge";
import { canSplitManualFormPair } from "@/lib/manual-form-merge";
import { SplitManualFormConfirmModal } from "@/components/orders/SplitManualFormConfirmModal";
import type { Order } from "@/types";
import clsx from "clsx";

type ManualFormPairBarProps = {
  disabled?: boolean;
  manual: Order;
  form: Order;
  onConfirmSplit: () => void | Promise<void>;
};

/** Compact source cue: used on field labels when provenance is passed in. */
export function SourceCue({
  source,
}: {
  source: FieldDataSource;
  /** @deprecated Kept for call sites; color is source-only (Form=sky, Manual=amber). */
  tone?: "default" | "conflict";
}) {
  const isForm = source === "form";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide",
        isForm ? "text-sky-700" : "text-amber-800"
      )}
    >
      <span
        className={clsx(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          isForm ? "bg-sky-500" : "bg-amber-500"
        )}
        aria-hidden
      />
      {isForm ? "Form" : "Manual"}
    </span>
  );
}

/** Shown when a Magento form order is linked to this manual order: Split only. */
export function ManualFormPairBar({
  disabled = false,
  manual,
  form,
  onConfirmSplit,
}: ManualFormPairBarProps) {
  const [splitConfirmOpen, setSplitConfirmOpen] = useState(false);
  const splitAllowed = canSplitManualFormPair(manual, form);

  if (!splitAllowed) {
    return (
      <div className="mb-4 border-b border-brand-line/40 pb-3">
        <p className="text-[13px] font-semibold text-brand-ink">Form received</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-brand-line/40 pb-3">
        <p className="min-w-0 flex-1 text-[13px] font-semibold text-brand-ink">
          Form received
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setSplitConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-line/70 bg-white px-3 py-1.5 text-[12px] font-semibold text-brand-ink shadow-sm transition hover:bg-brand-bg disabled:cursor-not-allowed disabled:opacity-40"
            title="Undo Match: restore Manual and Form as two Orders rows"
          >
            <SplitSquareVertical className="h-3.5 w-3.5" strokeWidth={2.25} />
            Split
          </button>
        </div>
      </div>

      <SplitManualFormConfirmModal
        open={splitConfirmOpen}
        manual={manual}
        form={form}
        onClose={() => setSplitConfirmOpen(false)}
        onConfirm={async () => {
          await onConfirmSplit();
          setSplitConfirmOpen(false);
        }}
      />
    </>
  );
}
