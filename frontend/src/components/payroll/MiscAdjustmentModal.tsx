"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import type { MTDRecord, Order, PayrollAddon, Producer } from "@/types";
import type { CreatePayrollAddonPayload } from "@/lib/api/payroll-addons";
import { findProducerByAssignmentKey } from "@/lib/editor-assignment";
import { Avatar } from "@/components/ui/Avatar";
import { resolveMTDFormMeta } from "@/lib/mtd-filters";
import {
  categoryLabelForMiscAdjustment,
  MISC_ADJUSTMENT_LABEL,
} from "@/lib/misc-payroll-adjustment";

type AdjustmentDirection = "add" | "deduct";

type MiscAdjustmentModalProps = {
  open: boolean;
  onClose: () => void;
  record: MTDRecord | null;
  existing: PayrollAddon | null;
  allOrders: Order[];
  producers: Producer[];
  onSave: (payload: CreatePayrollAddonPayload) => Promise<unknown>;
  onClear?: () => Promise<unknown>;
};

export function MiscAdjustmentModal({
  open,
  onClose,
  record,
  existing,
  allOrders,
  producers,
  onSave,
  onClear,
}: MiscAdjustmentModalProps) {
  const [direction, setDirection] = useState<AdjustmentDirection>("add");
  const [amountText, setAmountText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const assignedProducerObj = useMemo(() => {
    if (!record?.assignedProducer) return null;
    return findProducerByAssignmentKey(record.assignedProducer, producers) || null;
  }, [record, producers]);

  const category = useMemo(() => {
    if (!record) return "Other";
    const meta = resolveMTDFormMeta(
      record,
      new Map(allOrders.map((o) => [o.id, o]))
    );
    return categoryLabelForMiscAdjustment(meta.formType);
  }, [record, allOrders]);

  useEffect(() => {
    if (!open || !record) return;
    if (existing && Number(existing.amount) !== 0) {
      const signed = Number(existing.amount);
      setDirection(signed < 0 ? "deduct" : "add");
      setAmountText(String(Math.abs(signed)));
    } else {
      setDirection("add");
      setAmountText("");
    }
    setError(null);
    setSaving(false);
  }, [open, record, existing]);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleSave = async () => {
    if (saving) return;
    setError(null);
    if (!record) {
      setError("No payroll row selected.");
      return;
    }

    const parsed = parseFloat(amountText.replace(/[^0-9.]/g, ""));
    if (!amountText.trim() || Number.isNaN(parsed) || parsed <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }

    const signed = direction === "deduct" ? -parsed : parsed;

    setSaving(true);
    try {
      await onSave({
        orderId: record.orderId || record.id,
        mtdId: record.id,
        programName: record.programName || "Program",
        teamName: (record as { teamName?: string }).teamName || null,
        contactName: record.contactName || null,
        category,
        addonType: "misc_adjustment",
        amount: signed,
        rateSource: "manual",
        producerId: assignedProducerObj?.id || null,
        producerInitials:
          assignedProducerObj?.initials || record.assignedProducer || null,
        notes: MISC_ADJUSTMENT_LABEL,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save adjustment."
      );
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!onClear || !existing || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onClear();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to clear adjustment."
      );
      setSaving(false);
    }
  };

  if (!open || !record) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
    >
      <div
        className="relative flex w-full max-w-md flex-col rounded-xl border border-brand-line bg-brand-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-brand-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-brand-ink">
              {MISC_ADJUSTMENT_LABEL}
            </h2>
            <p className="text-xs text-brand-ink-faint">
              Row: {record.programName}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-brand-ink-faint transition hover:bg-brand-hover hover:text-brand-ink disabled:pointer-events-none disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5">
          <div className="rounded-lg border border-brand-line/70 bg-brand-bg/60 p-3">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-brand-ink-faint">
              Assigned Producer
            </span>
            <div className="mt-1 flex items-center gap-2">
              <Avatar
                producer={assignedProducerObj ?? undefined}
                initials={record.assignedProducer}
                size="xs"
              />
              <span className="text-sm font-semibold text-brand-ink">
                {assignedProducerObj?.name ||
                  record.assignedProducer ||
                  "Unassigned"}
              </span>
              {assignedProducerObj?.initials ? (
                <span className="rounded bg-brand-hover px-1.5 py-0.5 text-xs font-semibold text-brand-ink-secondary">
                  ({assignedProducerObj.initials})
                </span>
              ) : null}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-brand-ink-secondary">
              Adjustment Type <span className="text-brand-orange">*</span>
            </label>
            <div className="flex gap-2">
              {(
                [
                  { id: "add", label: "Add to Payroll" },
                  { id: "deduct", label: "Deduct from Payroll" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDirection(opt.id)}
                  disabled={saving}
                  className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-60 ${
                    direction === opt.id
                      ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                      : "border-brand-line bg-brand-bg text-brand-ink-secondary hover:border-brand-orange/40 hover:text-brand-ink"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-brand-ink-secondary">
              Amount <span className="text-brand-orange">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-sm text-brand-ink-faint">
                $
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="w-full rounded-lg border border-brand-line bg-brand-bg py-2 pl-7 pr-3 text-sm text-brand-ink placeholder:text-brand-ink-faint focus:border-brand-orange/60 focus:outline-none focus:ring-1 focus:ring-brand-orange/30 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="0.00"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                disabled={saving}
                autoFocus
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-brand-line px-5 py-4">
          <div>
            {existing && onClear ? (
              <button
                type="button"
                onClick={() => void handleClear()}
                disabled={saving}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-danger transition hover:bg-brand-danger/10 disabled:pointer-events-none disabled:opacity-50"
              >
                Clear
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="rounded-lg border border-brand-line px-4 py-1.5 text-sm font-medium text-brand-ink-secondary transition hover:bg-brand-hover disabled:pointer-events-none disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              aria-busy={saving}
              className="inline-flex min-w-[5.5rem] items-center justify-center gap-1.5 rounded-lg bg-brand-orange px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-orange/90 disabled:opacity-80"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
