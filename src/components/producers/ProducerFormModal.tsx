"use client";

import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import clsx from "clsx";
import { PRODUCER_AVATARS } from "@/lib/producer-avatars";
import { initialsFromName } from "@/lib/producers";
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
  specialty: string;
  avatar: string;
};

const rowInput =
  "w-full bg-transparent text-right text-[15px] text-brand-ink outline-none placeholder:text-brand-ink-tertiary";

function emptyForm(): FormState {
  return {
    name: "",
    initials: "",
    email: "",
    specialty: "Cheer",
    avatar: PRODUCER_AVATARS[0].src,
  };
}

function fromProducer(producer: Producer): FormState {
  return {
    name: producer.name,
    initials: producer.initials,
    email: producer.email,
    specialty: producer.specialty,
    avatar: producer.avatar,
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
  }, [open, producer]);

  if (!open) return null;

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const initials = (form.initials || initialsFromName(form.name))
      .toUpperCase()
      .slice(0, 4);
    if (!form.name.trim() || !form.email.trim() || !initials) return;

    onSave({
      id: producer?.id || `prod-${Date.now()}`,
      name: form.name.trim(),
      initials,
      email: form.email.trim().toLowerCase(),
      specialty: form.specialty,
      avatar: form.avatar,
      mixesThisWeek: producer?.mixesThisWeek ?? 0,
      nextAvailable: producer?.nextAvailable || "TBD",
      status: producer?.status || "available",
      workDays: producer?.workDays ?? [...DEFAULT_WORK_DAYS],
      timeOff: producer?.timeOff ?? [],
      maxMixesPerDay: producer?.maxMixesPerDay ?? null,
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
            <ProfileRow label="Category" last>
              <div className="relative flex w-full items-center justify-end">
                <select
                  value={form.specialty}
                  onChange={(e) =>
                    setForm({ ...form, specialty: e.target.value })
                  }
                  className={clsx(rowInput, "appearance-none pr-5 text-right")}
                >
                  {PRODUCER_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-0 h-3.5 w-3.5 text-brand-ink-tertiary"
                  strokeWidth={2}
                />
              </div>
            </ProfileRow>
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
