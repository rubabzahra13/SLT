"use client";

import { useEffect, useState } from "react";
import { isDuplicateDiscountCode } from "@/lib/discount-codes";
import type { DiscountCode, DiscountCodeType } from "@/types";

type DiscountCodeFormModalProps = {
  open: boolean;
  onClose: () => void;
  discountCode?: DiscountCode | null;
  discountCodes: DiscountCode[];
  onSave: (discountCode: DiscountCode) => void;
};

type FormState = {
  code: string;
  description: string;
  discountType: DiscountCodeType;
  discountValue: string;
};

const rowInput =
  "w-full bg-transparent text-right text-[15px] text-brand-ink outline-none placeholder:text-brand-ink-tertiary";

function emptyForm(): FormState {
  return {
    code: "",
    description: "",
    discountType: "fixed",
    discountValue: "200",
  };
}

function fromDiscountCode(entry: DiscountCode): FormState {
  const isPercentage = entry.discountType === "percentage";
  const numVal =
    typeof entry.discountValue === "number" && !isNaN(entry.discountValue)
      ? String(entry.discountValue)
      : isPercentage
      ? "10"
      : "200";

  return {
    code: entry.code,
    description: entry.description || "",
    discountType: entry.discountType || "fixed",
    discountValue: numVal,
  };
}

export function DiscountCodeFormModal({
  open,
  onClose,
  discountCode,
  discountCodes,
  onSave,
}: DiscountCodeFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(discountCode);

  useEffect(() => {
    if (!open) return;
    setForm(discountCode ? fromDiscountCode(discountCode) : emptyForm());
    setError(null);
  }, [open, discountCode]);

  if (!open) return null;

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const code = form.code.trim().toUpperCase();
    const description = form.description.trim();
    const numValue = parseFloat(form.discountValue);

    if (!code) {
      setError("Enter a discount code.");
      return;
    }

    if (isNaN(numValue) || numValue <= 0) {
      setError(
        form.discountType === "fixed"
          ? "Enter a valid dollar amount greater than $0."
          : "Enter a valid percentage greater than 0%."
      );
      return;
    }

    if (form.discountType === "percentage" && numValue > 100) {
      setError("Percentage discount cannot exceed 100%.");
      return;
    }

    if (isDuplicateDiscountCode(code, discountCodes, discountCode?.id)) {
      setError("That code already exists.");
      return;
    }

    onSave({
      id: discountCode?.id || `disc-${Date.now()}`,
      code,
      description: description || undefined,
      discountType: form.discountType,
      discountValue: numValue,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close"
      />

      <div className="relative flex max-h-[min(94dvh,820px)] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[28px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:rounded-[28px]">
        <header className="relative flex shrink-0 items-center justify-between border-b border-black/[0.08] px-4 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="min-w-[64px] text-left text-[15px] text-brand-ink-secondary transition hover:text-brand-ink"
          >
            Cancel
          </button>
          <h2 className="absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold tracking-[-0.01em] text-brand-ink">
            {isEdit ? "Edit code" : "Add code"}
          </h2>
          <button
            type="button"
            onClick={() => handleSubmit()}
            className="min-w-[64px] text-right text-[15px] font-semibold text-brand-blue transition hover:text-brand-blue-hover"
          >
            Save
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-6 space-y-4"
        >
          {/* Code */}
          <label className="flex items-center justify-between border-b border-black/[0.06] pb-3.5">
            <span className="text-[15px] font-medium text-brand-ink-secondary">
              Discount Code <span className="text-brand-danger">*</span>
            </span>
            <input
              required
              value={form.code}
              onChange={(e) => {
                setError(null);
                setForm((prev) => ({
                  ...prev,
                  code: e.target.value.toUpperCase(),
                }));
              }}
              placeholder="SUMMER20"
              className={`${rowInput} max-w-[180px] font-semibold tracking-[0.04em]`}
              autoCapitalize="characters"
              autoComplete="off"
            />
          </label>

          {/* Discount Type */}
          <div className="border-b border-black/[0.06] pb-3.5">
            <span className="block text-[15px] font-medium text-brand-ink-secondary mb-2">
              Discount Type
            </span>
            {isEdit ? (
              <div className="flex items-center justify-between rounded-xl border border-black/[0.08] bg-brand-bg px-3.5 py-2.5">
                <span className="text-[13.5px] font-semibold text-brand-ink">
                  {form.discountType === "percentage"
                    ? "Percentage (%)"
                    : "Fixed Amount ($)"}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setForm((prev) => ({
                      ...prev,
                      discountType: "fixed",
                      discountValue:
                        prev.discountType === "fixed" ? prev.discountValue : "200",
                    }));
                  }}
                  className={`rounded-xl border py-2.5 px-3 text-[13.5px] font-semibold transition ${
                    form.discountType === "fixed"
                      ? "border-brand-signature bg-brand-signature/10 text-brand-signature ring-2 ring-brand-signature/20"
                      : "border-black/[0.08] bg-brand-bg text-brand-ink-secondary hover:bg-black/[0.03]"
                  }`}
                >
                  Fixed Amount ($)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setForm((prev) => ({
                      ...prev,
                      discountType: "percentage",
                      discountValue:
                        prev.discountType === "percentage"
                          ? prev.discountValue
                          : "10",
                    }));
                  }}
                  className={`rounded-xl border py-2.5 px-3 text-[13.5px] font-semibold transition ${
                    form.discountType === "percentage"
                      ? "border-brand-signature bg-brand-signature/10 text-brand-signature ring-2 ring-brand-signature/20"
                      : "border-black/[0.08] bg-brand-bg text-brand-ink-secondary hover:bg-black/[0.03]"
                  }`}
                >
                  Percentage (%)
                </button>
              </div>
            )}
          </div>

          {/* Single Discount Value Input */}
          <label className="flex items-center justify-between border-b border-black/[0.06] pb-3.5">
            <span className="text-[15px] font-medium text-brand-ink-secondary">
              {form.discountType === "fixed"
                ? "Discount Amount ($)"
                : "Discount Percentage (%)"}
            </span>
            <div className="relative max-w-[140px]">
              {form.discountType === "fixed" && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-brand-ink-tertiary">
                  $
                </span>
              )}
              <input
                type="number"
                step={form.discountType === "fixed" ? "1" : "0.1"}
                min="0"
                max={form.discountType === "percentage" ? "100" : undefined}
                required
                value={form.discountValue}
                onChange={(e) => {
                  setError(null);
                  setForm((prev) => ({
                    ...prev,
                    discountValue: e.target.value,
                  }));
                }}
                placeholder={form.discountType === "fixed" ? "200" : "10"}
                className={`${rowInput} ${
                  form.discountType === "fixed" ? "pl-4 pr-0" : "pr-6"
                } font-semibold tabular-nums`}
              />
              {form.discountType === "percentage" && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-brand-ink-tertiary">
                  %
                </span>
              )}
            </div>
          </label>

          {/* Description (Optional) */}
          <label className="block pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-medium text-brand-ink-secondary">
                Description
              </span>
              <span className="text-[12px] text-brand-ink-tertiary">Optional</span>
            </div>
            <textarea
              value={form.description}
              onChange={(e) => {
                setError(null);
                setForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }));
              }}
              placeholder="What this code is for (optional)"
              rows={3}
              className="mt-2 w-full resize-none rounded-2xl bg-brand-bg px-3.5 py-3 text-[14px] leading-relaxed text-brand-ink outline-none ring-1 ring-inset ring-black/[0.06] placeholder:text-brand-ink-tertiary focus:ring-brand-blue-muted"
            />
          </label>

          {error ? (
            <p className="text-[13px] font-medium text-brand-danger pt-1">{error}</p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
