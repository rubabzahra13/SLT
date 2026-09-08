"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
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
    avatar: PRODUCER_AVATARS[0].src,
  };
}

function fromProducer(producer: Producer): FormState {
  const norm = normalizeProducer(producer);
  return {
    name: norm.name,
    initials: norm.initials,
    email: norm.email,
    categories: norm.categories?.length
      ? [...norm.categories]
      : norm.specialty
        ? [norm.specialty]
        : [],
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isEdit = Boolean(producer);

  useEffect(() => {
    if (!open) return;
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
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories
        : [...prev.categories, cat],
    }));
    setCategoryDropdownOpen(false);
  }

  function removeCategory(cat: string) {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c !== cat),
    }));
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const initials = (form.initials || initialsFromName(form.name))
      .toUpperCase()
      .slice(0, 4);
    if (!form.name.trim() || !form.email.trim() || !initials) return;

    const categories = form.categories;
    const specialty = categories[0] ?? "";

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
            {isEdit ? "Edit profile" : "New producer"}
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

          {/* Categories section */}
          <section className="border-b border-black/[0.08] px-5 py-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-brand-ink">
                Categories
              </p>
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
                      className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-2xl bg-brand-elevated shadow-[0_8px_32px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.08]"
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
                No categories selected. Add at least one.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {form.categories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-blue-soft py-1 pl-2.5 pr-1 text-[12px] font-semibold text-brand-blue-deep ring-1 ring-inset ring-brand-blue-muted"
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={() => removeCategory(cat)}
                      className="rounded-full p-0.5 text-brand-blue-deep/60 transition hover:bg-brand-blue-muted hover:text-brand-blue-deep"
                      aria-label={`Remove ${cat}`}
                    >
                      <X className="h-3 w-3" strokeWidth={2.5} />
                    </button>
                  </span>
                ))}
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
