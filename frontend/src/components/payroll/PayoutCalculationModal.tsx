"use client";

import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Eye, X } from "lucide-react";
import type { MTDRecord, Order, PayrollAddon, Producer } from "@/types";
import { HoverTip } from "@/components/ui/HoverTip";
import { formatPrice, titleCase } from "@/lib/data";
import {
  buildPayoutCalculationView,
  type PayoutCalcLine,
} from "@/lib/payout-calculation-view";

const SECTION_LABEL: Record<string, string> = {
  base: "Payroll base",
  compensation: "Compensation",
  addons: "Payroll add-ons",
};

function amountClass(line: PayoutCalcLine): string {
  if (line.kind === "reduction") return "text-brand-danger";
  if (line.kind === "addition") return "text-brand-success";
  if (line.kind === "total") return "text-brand-success";
  return "text-brand-ink";
}

function amountText(line: PayoutCalcLine): string {
  const abs = formatPrice(Math.abs(line.amount));
  if (line.kind === "reduction") return `−${abs}`;
  if (line.kind === "addition") return `+${abs}`;
  return formatPrice(line.amount);
}

export function PayoutCalculationButton({
  onOpen,
}: {
  onOpen: () => void;
}) {
  return (
    <HoverTip label="View payout calculation">
      <button
        type="button"
        aria-label="View payout calculation"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink"
      >
        <Eye className="h-3.5 w-3.5" />
      </button>
    </HoverTip>
  );
}

export function PayoutCalculationModal({
  open,
  record,
  allOrders,
  producers,
  payrollAddons,
  onClose,
}: {
  open: boolean;
  record: MTDRecord | null;
  allOrders: Order[];
  producers: Producer[];
  payrollAddons: PayrollAddon[];
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const view = useMemo(() => {
    if (!record) return null;
    return buildPayoutCalculationView({
      record,
      allOrders,
      producers,
      payrollAddons,
    });
  }, [record, allOrders, producers, payrollAddons]);

  if (!open || !record || !view || typeof document === "undefined") return null;

  let lastSection = "";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payout-calc-title"
        className="relative flex max-h-[90vh] w-full max-w-[540px] flex-col overflow-hidden rounded-[24px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.32)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-brand-line/60 px-6 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
              View payout calculation
            </p>
            <h2
              id="payout-calc-title"
              className="mt-0.5 truncate text-[17px] font-semibold tracking-[-0.02em] text-brand-ink"
            >
              {titleCase(record.programName)}
            </h2>
            <p className="mt-0.5 truncate text-[12px] text-brand-ink-secondary">
              Read only · saved payroll figures
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-brand-ink-tertiary hover:bg-brand-bg hover:text-brand-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-6 py-5">
          {view.lines.map((line, index) => {
            const showHeading =
              line.section !== "total" &&
              line.section !== lastSection &&
              Boolean(SECTION_LABEL[line.section]);
            if (line.section !== "total") lastSection = line.section;
            const heading = showHeading ? SECTION_LABEL[line.section] : null;
            return (
              <div key={`${line.section}-${line.label}-${index}`}>
                {heading ? (
                  <p
                    className={`px-1 text-[11px] font-bold uppercase tracking-wider text-brand-ink-tertiary ${
                      index === 0 ? "mb-2" : "mb-2 mt-4"
                    }`}
                  >
                    {heading}
                  </p>
                ) : null}
                <div
                  className={`flex items-start justify-between gap-4 rounded-xl px-3 py-2.5 ${
                    line.kind === "total"
                      ? "mt-3 bg-brand-success/10"
                      : "bg-brand-bg/40"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-brand-ink">
                      {line.label}
                    </p>
                    {line.detail ? (
                      <p className="mt-0.5 text-[11px] text-brand-ink-tertiary">
                        {line.detail}
                      </p>
                    ) : null}
                  </div>
                  <p
                    className={`shrink-0 text-[13px] font-bold tabular-nums ${amountClass(line)}`}
                  >
                    {amountText(line)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
