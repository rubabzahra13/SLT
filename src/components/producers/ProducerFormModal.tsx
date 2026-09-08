"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { PRODUCER_AVATARS } from "@/lib/producer-avatars";
import { initialsFromName, normalizeProducer } from "@/lib/producers";
import {
  DEFAULT_WORK_DAYS,
  PRODUCER_CATEGORIES,
  type Producer,
} from "@/types";

type ProducerFormModalProps = {
  open: boolean;
  onClose: () => void;
  producer?: Producer | null;
  onSave: (producer: Producer) => void;
};

type FormState = {
  name: string;
  initials: string;
  email: string;
  categories: string[];
  categoryRates: Record<string, number>;
  avatar: string;
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
    avatar: PRODUCER_AVATARS[0].src,
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

  return {
    name: norm.name,
    initials: norm.initials,
    email: norm.email,
    categories,
    categoryRates,
    avatar: norm.avatar,
  };
}

export function ProducerFormModal({
  open,
  onClose,
  producer,
  onSave,
}: ProducerFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [initialsTouched, setInitialsTouched] = useState(false);
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
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
    setPickingAvatar(false);
    setCategoryDropdownOpen(false);
  }, [open, producer]);

  // Close category dropdown on outside click
  useEffect(() => {
    if (!categoryDropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [categoryDropdownOpen]);

  if (!open) return null;

  const availableCategories = PRODUCER_CATEGORIES.filter(
    (c) => !form.categories.includes(c)
  );

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
    setCategoryDropdownOpen(false);
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

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
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

    const categories = form.categories;
    const specialty = categories[0] ?? "";
    const ratesByCategory: Record<string, number> = {};

    for (const cat of categories) {
      const val = form.categoryRates[cat] ?? 50;
      ratesByCategory[cat] = val > 1 ? val / 100 : val;
    }

    onSave({
      id: producer?.id || `prod-${Date.now()}`,
      name: form.name.trim(),
      initials,
      email: form.email.trim().toLowerCase(),
      categories,
      specialty,
      avatar: form.avatar,
      mixesThisWeek: producer?.mixesThisWeek ?? 0,
      nextAvailable: producer?.nextAvailable || "TBD",
      status: producer?.status || "available",
      workDays: producer?.workDays ?? [...DEFAULT_WORK_DAYS],
      timeOff: producer?.timeOff ?? [],
      maxMixesPerDay: producer?.maxMixesPerDay ?? null,
      maxProducerCostPerDay: producer?.maxProducerCostPerDay ?? null,
      overtimeDays: producer?.overtimeDays ?? [],
      ratesByCategory,
      compensationModel: producer?.compensationModel ?? "percentage_of_payroll_base",
    });
    onClose();
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
            Cancel
          </button>
          <h2 className="absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold tracking-[-0.01em] text-brand-ink">
            {isEdit ? "Edit Producer" : "New Producer"}
          </h2>
          <button
            type="button"
            onClick={() => handleSubmit()}
            className="min-w-[64px] text-right text-[15px] font-semibold text-brand-blue transition hover:text-brand-blue-hover"
          >
            Done
          </button>
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
            <button
              type="button"
              onClick={() => setPickingAvatar((v) => !v)}
              className="group relative"
              aria-expanded={pickingAvatar}
              aria-label="Change photo"
            >
              <span
                className="absolute -inset-[3px] rounded-full bg-[conic-gradient(from_210deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888,#f09433)] opacity-90"
                aria-hidden
              />
              <span
                className="absolute -inset-px rounded-full bg-brand-elevated"
                aria-hidden
              />
              <img
                src={form.avatar}
                alt=""
                className="relative h-[96px] w-[96px] rounded-full bg-brand-bg object-cover ring-[3px] ring-brand-elevated transition group-active:scale-[0.98]"
              />
            </button>

            <button
              type="button"
              onClick={() => setPickingAvatar((v) => !v)}
              className="mt-3 text-[14px] font-semibold text-brand-blue transition hover:text-brand-blue-hover"
            >
              Change photo
            </button>

            {pickingAvatar ? (
              <div className="mt-4 w-full">
                <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {PRODUCER_AVATARS.map((option) => {
                    const selected = form.avatar === option.src;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        title={option.label}
                        onClick={() => {
                          setForm({ ...form, avatar: option.src });
                          setPickingAvatar(false);
                        }}
                        className={clsx(
                          "shrink-0 rounded-full p-[2px] transition",
                          selected
                            ? "bg-[linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)]"
                            : "bg-transparent hover:bg-brand-bg-subtle"
                        )}
                      >
                        <img
                          src={option.src}
                          alt={option.label}
                          className="h-14 w-14 rounded-full bg-brand-bg object-cover ring-2 ring-brand-elevated"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
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

          {/* Categories & Per-Category Compensation Section */}
          <section className="border-b border-black/[0.08] px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-brand-ink">
                  Category Compensation
                </p>
                <p className="text-[11px] text-brand-ink-tertiary">
                  Configure compensation percentage per category
                </p>
              </div>

              {availableCategories.length > 0 && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setCategoryDropdownOpen((v) => !v)}
                    className="inline-flex h-7 items-center gap-1 rounded-full bg-brand-bg px-2.5 text-[12px] font-semibold text-brand-blue ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle"
                    aria-expanded={categoryDropdownOpen}
                    aria-haspopup="listbox"
                  >
                    <Plus className="h-3 w-3" strokeWidth={2.5} />
                    Add Category
                  </button>
                  {categoryDropdownOpen && (
                    <div
                      className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-2xl bg-brand-elevated shadow-[0_8px_32px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.08]"
                      role="listbox"
                      aria-label="Select category"
                    >
                      <div className="max-h-56 overflow-y-auto py-1.5">
                        {availableCategories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            role="option"
                            aria-selected={false}
                            onClick={() => addCategory(cat)}
                            className="w-full px-4 py-2.5 text-left text-[13px] text-brand-ink transition hover:bg-brand-bg-subtle"
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {form.categories.length === 0 ? (
              <p className="mt-3 text-[12px] text-brand-ink-tertiary">
                No categories assigned. Click "+ Add Category" to assign categories and set compensation rates.
              </p>
            ) : (
              <div className="mt-3 overflow-hidden rounded-xl border border-black/[0.08] bg-brand-bg/50">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-black/[0.06] bg-brand-bg-subtle/80 text-[10px] font-bold uppercase tracking-[0.06em] text-brand-ink-tertiary">
                      <th className="px-3.5 py-2">Category</th>
                      <th className="px-3.5 py-2 text-right">Compensation %</th>
                      <th className="w-12 px-3 py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.06] bg-white/70">
                    {form.categories.map((cat) => (
                      <tr key={cat} className="group">
                        <td className="px-3.5 py-2.5 font-medium text-brand-ink">
                          {cat}
                        </td>
                        <td className="px-3.5 py-2 text-right">
                          <div className="inline-flex items-center justify-end gap-1 rounded-lg border border-black/[0.12] bg-white px-2 py-1 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/20">
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
                              className="w-12 text-right text-[13px] font-semibold text-brand-ink outline-none"
                            />
                            <span className="text-[12px] font-semibold text-brand-ink-tertiary">
                              %
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeCategory(cat)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-brand-ink-tertiary transition hover:bg-brand-orange-soft hover:text-brand-danger"
                            aria-label={`Remove ${cat}`}
                            title={`Remove ${cat}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
