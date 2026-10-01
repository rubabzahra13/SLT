"use client";

import { useEffect, useState } from "react";
import { Trash2, X } from "lucide-react";
import clsx from "clsx";
import { ProducerCategoryAddMenu } from "@/components/producers/ProducerCategoryAddMenu";
import { findProducerCategoryGroup } from "@/lib/producer-category-groups";
import { formatApiClientError } from "@/lib/api/client";
import { initialsFromName, normalizeProducer } from "@/lib/producers";
import { Avatar } from "@/components/ui/Avatar";
import { DEFAULT_WORK_DAYS, type Producer } from "@/types";

type ProducerFormModalProps = {
  open: boolean;
  onClose: () => void;
  producer?: Producer | null;
  onSave: (producer: Producer) => void | Promise<void>;
  readOnly?: boolean;
};

type FormState = {
  name: string;
  initials: string;
  email: string;
  categories: string[];
  categoryRates: Record<string, number>;
  avatar: string;
  danceVoiceoverRate: number;
  cheerVoiceoverRate: number;
  rushFeeRate: number;
};

const rowInput =
  "w-full bg-transparent text-right text-[15px] text-brand-ink outline-none placeholder:text-brand-ink-tertiary";

function emptyForm(): FormState {
  return {
    name: "",
    initials: "",
    email: "",
    categories: [],
    categoryRates: {},
    avatar: "",
    danceVoiceoverRate: 80,
    cheerVoiceoverRate: 100,
    rushFeeRate: 100,
  };
}

function fromProducer(producer: Producer): FormState {
  const norm = normalizeProducer(producer);
  const categories = norm.categories?.length
    ? [...norm.categories]
    : norm.specialty
      ? [norm.specialty]
      : [];

  const categoryRates: Record<string, number> = {};
  for (const cat of categories) {
    const raw = norm.ratesByCategory?.[cat] ?? norm.defaultRate ?? 0.50;
    categoryRates[cat] = raw <= 1 ? Math.round(raw * 100) : raw;
  }

  const dVo = norm.danceVoiceoverRate ?? 0.8;
  const cVo = norm.cheerVoiceoverRate ?? 1.0;
  const rFee = norm.rushFeeRate ?? 1.0;

  return {
    name: norm.name,
    initials: norm.initials,
    email: norm.email,
    categories,
    categoryRates,
    avatar: norm.avatar,
    danceVoiceoverRate: dVo <= 1 ? Math.round(dVo * 100) : dVo,
    cheerVoiceoverRate: cVo <= 1 ? Math.round(cVo * 100) : cVo,
    rushFeeRate: rFee <= 1 ? Math.round(rFee * 100) : rFee,
  };
}

export function ProducerFormModal({
  open,
  onClose,
  producer,
  onSave,
  readOnly = false,
}: ProducerFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [initialsTouched, setInitialsTouched] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isEdit = Boolean(producer);
  useEffect(() => {
    if (!open) return;
    setValidationError(null);
    if (producer) {
      setForm(fromProducer(producer));
      setInitialsTouched(true);
    } else {
      setForm(emptyForm());
      setInitialsTouched(false);
    }
  }, [open, producer]);

  if (!open) return null;

  function addCategory(cat: string) {
    setForm((prev) => {
      if (prev.categories.includes(cat)) return prev;
      return {
        ...prev,
        categories: [...prev.categories, cat],
        categoryRates: {
          ...prev.categoryRates,
          [cat]: prev.categoryRates[cat] ?? 50,
        },
      };
    });
  }

  function removeCategory(cat: string) {
    setForm((prev) => {
      const nextRates = { ...prev.categoryRates };
      delete nextRates[cat];
      return {
        ...prev,
        categories: prev.categories.filter((c) => c !== cat),
        categoryRates: nextRates,
      };
    });
  }

  function updateCategoryRate(cat: string, val: number) {
    setForm((prev) => ({
      ...prev,
      categoryRates: {
        ...prev.categoryRates,
        [cat]: val,
      },
    }));
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (isSaving) return;
    setValidationError(null);

    const initials = (form.initials || initialsFromName(form.name))
      .toUpperCase()
      .slice(0, 4);

    if (!form.name.trim() || !form.email.trim() || !initials) {
      setValidationError("Please fill out name, initials, and email.");
      return;
    }

    for (const cat of form.categories) {
      const rate = form.categoryRates[cat];
      if (typeof rate !== "number" || isNaN(rate) || rate < 0 || rate > 100) {
        setValidationError(`Invalid compensation percentage for category "${cat}". Must be between 0% and 100%.`);
        return;
      }
    }

    if (form.danceVoiceoverRate < 0 || form.danceVoiceoverRate > 100) {
      setValidationError("Dance Voiceover rate must be between 0% and 100%.");
      return;
    }

    if (form.cheerVoiceoverRate < 0 || form.cheerVoiceoverRate > 100) {
      setValidationError("Cheer Voiceover rate must be between 0% and 100%.");
      return;
    }

    if (form.rushFeeRate < 0 || form.rushFeeRate > 100) {
      setValidationError("Rush Fee rate must be between 0% and 100%.");
      return;
    }

    const finalInitials = initials;

    setIsSaving(true);
    try {
      await onSave({
        id: producer?.id || `prod-${Date.now()}`,
        legacyId: producer?.legacyId,
        uuid: producer?.uuid,
        name: form.name.trim(),
        initials: finalInitials,
        email: form.email.trim(),
        categories: form.categories,
        specialty: form.categories[0] ?? "General",
        avatar: form.avatar,
        mixesThisWeek: producer?.mixesThisWeek ?? 0,
        nextAvailable: producer?.nextAvailable || "TBD",
        status: producer?.status || "available",
        workDays: producer?.workDays ?? [...DEFAULT_WORK_DAYS],
        timeOff: producer?.timeOff ?? [],
        maxMixesPerDay: producer?.maxMixesPerDay ?? null,
        maxProducerCostPerDay: producer?.maxProducerCostPerDay ?? null,
        overtimeDays: producer?.overtimeDays ?? [],
        ratesByCategory: form.categoryRates,
        danceVoiceoverRate:
          form.danceVoiceoverRate > 1
            ? form.danceVoiceoverRate / 100
            : form.danceVoiceoverRate,
        cheerVoiceoverRate:
          form.cheerVoiceoverRate > 1
            ? form.cheerVoiceoverRate / 100
            : form.cheerVoiceoverRate,
        rushFeeRate:
          form.rushFeeRate > 1 ? form.rushFeeRate / 100 : form.rushFeeRate,
        compensationModel:
          producer?.compensationModel ?? "percentage_of_payroll_base",
      });
      onClose();
    } catch (err) {
      setValidationError(formatApiClientError(err, "Could not save producer."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] transition"
        onClick={onClose}
        aria-label="Close"
      />

      <div className="relative flex max-h-[min(94dvh,820px)] w-full max-w-md sm:w-[440px] sm:max-w-[440px] flex-col overflow-hidden rounded-t-[28px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:rounded-[28px]">
        <header className="relative flex shrink-0 items-center justify-between border-b border-black/[0.08] px-4 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="min-w-[64px] text-left text-[15px] text-brand-ink-secondary transition hover:text-brand-ink"
          >
            {readOnly ? "Close" : "Cancel"}
          </button>
          <h2 className="absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold tracking-[-0.01em] text-brand-ink">
            {readOnly ? "Producer Profile" : isEdit ? "Edit Producer" : "New Producer"}
          </h2>
          {!readOnly ? (
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSaving}
              className="min-w-[64px] text-right text-[15px] font-semibold text-brand-blue transition hover:text-brand-blue-hover disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Done"}
            </button>
          ) : (
            <span className="min-w-[64px]" />
          )}
        </header>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {validationError ? (
            <div className="bg-brand-danger-soft/80 px-5 py-2.5 text-[12px] font-medium text-brand-danger border-b border-brand-danger-muted">
              {validationError}
            </div>
          ) : null}

          <section className="flex flex-col items-center px-6 pb-5 pt-7">
            <Avatar
              initials={form.initials || initialsFromName(form.name) || "??"}
              name={form.name}
              size="xl"
            />
          </section>

          <section className="border-y border-black/[0.08]">
            <ProfileRow label="Name">
              <input
                required
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    name,
                    initials: initialsTouched
                      ? prev.initials
                      : initialsFromName(name),
                  }));
                }}
                placeholder="Name"
                className={rowInput}
              />
            </ProfileRow>
            <ProfileRow label="Initials">
              <input
                required
                maxLength={4}
                value={form.initials}
                onChange={(e) => {
                  setInitialsTouched(true);
                  setForm({
                    ...form,
                    initials: e.target.value.toUpperCase(),
                  });
                }}
                placeholder="CA"
                className={clsx(rowInput, "tracking-[0.08em]")}
              />
            </ProfileRow>
            <ProfileRow label="Email">
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email"
                className={rowInput}
              />
            </ProfileRow>
          </section>

          <section className="px-5 py-4">
            <div className="rounded-2xl bg-brand-bg px-4 py-3 ring-1 ring-inset ring-black/[0.06]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-brand-ink">
                    Category compensation
                  </p>
                  <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
                    Payroll percentage by category.
                  </p>
                </div>

                <ProducerCategoryAddMenu
                  assignedCategories={form.categories}
                  onAdd={addCategory}
                />
              </div>

              {form.categories.length === 0 ? (
                <p className="mt-3 text-[12px] leading-relaxed text-brand-ink-tertiary">
                  No categories assigned yet. Tap Add to pick a category and
                  subcategory.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-black/[0.06]">
                  {form.categories.map((cat) => {
                    const group = findProducerCategoryGroup(cat);
                    return (
                    <li
                      key={cat}
                      className="flex items-center gap-2 py-2.5 text-[13px] first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-brand-ink-secondary">
                          {cat}
                        </p>
                        {group ? (
                          <p className="truncate text-[11px] text-brand-ink-tertiary">
                            {group.label}
                          </p>
                        ) : null}
                      </div>
                      <div className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-elevated px-2 py-1 ring-1 ring-inset ring-black/[0.06] focus-within:ring-brand-blue/30">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={form.categoryRates[cat] ?? ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            updateCategoryRate(cat, isNaN(val) ? 0 : val);
                          }}
                          className="w-10 bg-transparent text-right text-[13px] font-semibold tabular-nums text-brand-ink outline-none"
                          aria-label={`Compensation percentage for ${cat}`}
                        />
                        <span className="text-[12px] font-semibold text-brand-ink-tertiary">
                          %
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCategory(cat)}
                        className="shrink-0 rounded-full p-1.5 text-brand-ink-tertiary transition hover:bg-brand-elevated hover:text-brand-danger"
                        aria-label={`Remove ${cat}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="mt-4 rounded-2xl bg-brand-bg px-4 py-3 ring-1 ring-inset ring-black/[0.06]">
              <div>
                <p className="text-[13px] font-semibold text-brand-ink">
                  Voiceover compensation
                </p>
                <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
                  Specific rates for Voiceover payouts.
                </p>
              </div>
              <ul className="mt-3 divide-y divide-black/[0.06]">
                <li className="flex items-center justify-between py-2 text-[13px] first:pt-0 last:pb-0">
                  <span className="font-medium text-brand-ink-secondary">
                    Dance Voiceover
                  </span>
                  <div className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-elevated px-2 py-1 ring-1 ring-inset ring-black/[0.06] focus-within:ring-brand-blue/30">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={form.danceVoiceoverRate}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setForm((prev) => ({
                          ...prev,
                          danceVoiceoverRate: isNaN(val) ? 0 : val,
                        }));
                      }}
                      className="w-10 bg-transparent text-right text-[13px] font-semibold tabular-nums text-brand-ink outline-none"
                      aria-label="Dance Voiceover compensation percentage"
                    />
                    <span className="text-[12px] font-semibold text-brand-ink-tertiary">
                      %
                    </span>
                  </div>
                </li>
                <li className="flex items-center justify-between py-2 text-[13px] first:pt-0 last:pb-0">
                  <span className="font-medium text-brand-ink-secondary">
                    Cheer Voiceover
                  </span>
                  <div className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-elevated px-2 py-1 ring-1 ring-inset ring-black/[0.06] focus-within:ring-brand-blue/30">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={form.cheerVoiceoverRate}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setForm((prev) => ({
                          ...prev,
                          cheerVoiceoverRate: isNaN(val) ? 0 : val,
                        }));
                      }}
                      className="w-10 bg-transparent text-right text-[13px] font-semibold tabular-nums text-brand-ink outline-none"
                      aria-label="Cheer Voiceover compensation percentage"
                    />
                    <span className="text-[12px] font-semibold text-brand-ink-tertiary">
                      %
                    </span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="mt-4 rounded-2xl bg-brand-bg px-4 py-3 ring-1 ring-inset ring-black/[0.06]">
              <div>
                <p className="text-[13px] font-semibold text-brand-ink">
                  Rush fee compensation
                </p>
                <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
                  Default rate for Rush Fee payouts.
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between py-1 text-[13px]">
                <span className="font-medium text-brand-ink-secondary">
                  Rush Fee Compensation
                </span>
                <div className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-elevated px-2 py-1 ring-1 ring-inset ring-black/[0.06] focus-within:ring-brand-blue/30">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={form.rushFeeRate}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setForm((prev) => ({
                        ...prev,
                        rushFeeRate: isNaN(val) ? 0 : val,
                      }));
                    }}
                    className="w-10 bg-transparent text-right text-[13px] font-semibold tabular-nums text-brand-ink outline-none"
                    aria-label="Rush Fee compensation percentage"
                  />
                  <span className="text-[12px] font-semibold text-brand-ink-tertiary">
                    %
                  </span>
                </div>
              </div>
            </div>
          </section>

          <div className="flex justify-center pb-5 pt-6 sm:hidden">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-brand-bg p-2 text-brand-ink-tertiary"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProfileRow({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <label
      className={clsx(
        "flex items-center gap-4 px-5 py-[14px]",
        !last && "border-b border-black/[0.06]"
      )}
    >
      <span className="w-[88px] shrink-0 text-[15px] text-brand-ink">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </label>
  );
}
