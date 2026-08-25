"use client";

import { useEffect, useState } from "react";
import { isDuplicateDiscountCode } from "@/lib/discount-codes";
import type { DiscountCode } from "@/types";

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
};

const rowInput =
  "w-full bg-transparent text-right text-[15px] text-brand-ink outline-none placeholder:text-brand-ink-tertiary";

function emptyForm(): FormState {
  return {
    code: "",
    description: "",
  };
}

function fromDiscountCode(entry: DiscountCode): FormState {
  return {
    code: entry.code,
    description: entry.description,
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

    if (!code) {
      setError("Enter a discount code.");
      return;
    }

    if (!description) {
      setError("Enter a description.");
      return;
    }

    if (
      isDuplicateDiscountCode(code, discountCodes, discountCode?.id)
    ) {
      setError("That code already exists.");
      return;
    }

    onSave({
      id: discountCode?.id || `disc-${Date.now()}`,
      code,
      description,
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
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-6"
        >
          <label className="flex items-center justify-between border-b border-black/[0.06] py-3.5">
            <span className="text-[15px] text-brand-ink-secondary">Code</span>
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
              placeholder="SUMMER25"
              className={`${rowInput} max-w-[180px] font-semibold tracking-[0.04em]`}
              autoCapitalize="characters"
              autoComplete="off"
            />
          </label>

          <label className="block py-3.5">
            <span className="text-[15px] text-brand-ink-secondary">
              Description
            </span>
            <textarea
              required
              value={form.description}
              onChange={(e) => {
                setError(null);
                setForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }));
              }}
              placeholder="What this code is for"
              rows={3}
              className="mt-2 w-full resize-none rounded-2xl bg-brand-bg px-3.5 py-3 text-[14px] leading-relaxed text-brand-ink outline-none ring-1 ring-inset ring-black/[0.06] placeholder:text-brand-ink-tertiary focus:ring-brand-blue-muted"
            />
          </label>

          {error ? (
            <p className="text-[13px] font-medium text-brand-danger">{error}</p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
