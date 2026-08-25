"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarPlus, ChevronDown, Minus, Plus, Trash2, X } from "lucide-react";
import clsx from "clsx";
import {
  defaultReasonForTimeOffType,
  reasonsForTimeOffType,
} from "@/lib/producer-time-off";
import {
  DEFAULT_WORK_DAYS,
  WEEKDAYS,
  type Producer,
  type ProducerTimeOff,
  type Weekday,
} from "@/types";

type AvailabilityPatch = {
  workDays: Weekday[];
  timeOff: ProducerTimeOff[];
  maxMixesPerDay: number | null;
  overtimeDays: string[];
};

type ProducerAvailabilityModalProps = {
  open: boolean;
  onClose: () => void;
  producer: Producer | null;
  onSave: (patch: AvailabilityPatch) => void;
};

type DraftTimeOff = {
  key: string;
  startDate: string;
  endDate: string;
  type: "holiday" | "personal";
  reason: string;
};

function formatOvertimeLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProducerAvailabilityModal({
  open,
  onClose,
  producer,
  onSave,
}: ProducerAvailabilityModalProps) {
  const [workDays, setWorkDays] = useState<Weekday[]>([...DEFAULT_WORK_DAYS]);
  const [timeOff, setTimeOff] = useState<DraftTimeOff[]>([]);
  const [hasMaxCapacity, setHasMaxCapacity] = useState(false);
  const [maxMixesPerDay, setMaxMixesPerDay] = useState(6);
  const [overtimeDays, setOvertimeDays] = useState<string[]>([]);
  const [overtimeDraft, setOvertimeDraft] = useState("");
  const overtimeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !producer) return;
    setWorkDays([...producer.workDays]);
    setTimeOff(
      producer.timeOff.map((entry) => ({
        key: entry.id,
        startDate: entry.startDate,
        endDate: entry.endDate,
        type: entry.type,
        reason: entry.reason,
      }))
    );
    setHasMaxCapacity(producer.maxMixesPerDay != null);
    setMaxMixesPerDay(producer.maxMixesPerDay ?? 6);
    setOvertimeDays([...producer.overtimeDays]);
    setOvertimeDraft("");
  }, [open, producer]);

  if (!open || !producer) return null;

  function toggleDay(day: Weekday) {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function addTimeOff() {
    const today = new Date().toISOString().slice(0, 10);
    setTimeOff((prev) => [
      ...prev,
      {
        key: `to-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        startDate: today,
        endDate: today,
        type: "personal",
        reason: defaultReasonForTimeOffType("personal"),
      },
    ]);
  }

  function updateTimeOff(key: string, patch: Partial<DraftTimeOff>) {
    setTimeOff((prev) =>
      prev.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry))
    );
  }

  function removeTimeOff(key: string) {
    setTimeOff((prev) => prev.filter((entry) => entry.key !== key));
  }

  function addOvertimeDay(iso?: string) {
    const value = (iso ?? overtimeDraft).trim();
    if (!value) return;
    setOvertimeDays((prev) =>
      [...new Set([...prev, value])].sort((a, b) => a.localeCompare(b))
    );
    setOvertimeDraft("");
  }

  function removeOvertimeDay(iso: string) {
    setOvertimeDays((prev) => prev.filter((day) => day !== iso));
  }

  function handleDone() {
    onSave({
      workDays,
      timeOff: timeOff
        .filter((entry) => entry.startDate && entry.reason.trim())
        .map((entry) => ({
          id: entry.key,
          startDate: entry.startDate,
          endDate: entry.endDate || entry.startDate,
          type: entry.type,
          reason: entry.reason.trim(),
        })),
      maxMixesPerDay: hasMaxCapacity ? Math.max(1, maxMixesPerDay) : null,
      overtimeDays,
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
            Schedule & capacity
          </h2>
          <button
            type="button"
            onClick={handleDone}
            className="min-w-[64px] text-right text-[15px] font-semibold text-brand-blue transition hover:text-brand-blue-hover"
          >
            Done
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-6">
          <div className="mb-6 flex items-center gap-3">
            <img
              src={producer.avatar}
              alt=""
              className="h-11 w-11 rounded-full bg-brand-bg object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-brand-ink">
                {producer.name}
              </p>
              <p className="text-[12px] text-brand-ink-tertiary">
                {producer.specialty}
              </p>
            </div>
          </div>

          <p className="text-[13px] font-semibold text-brand-ink">
            Days they work
          </p>
          <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
            Regular weekly schedule. Mon–Fri by default.
          </p>
          <div className="mt-4 flex justify-between gap-1">
            {WEEKDAYS.map((day) => {
              const active = workDays.includes(day.id);
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  className={clsx(
                    "flex h-11 w-11 flex-col items-center justify-center rounded-full text-[12px] font-semibold transition",
                    active
                      ? "bg-brand-ink text-white shadow-sm"
                      : "bg-brand-bg text-brand-ink-secondary ring-1 ring-inset ring-black/[0.06] hover:bg-brand-bg-subtle"
                  )}
                >
                  {day.short.charAt(0)}
                </button>
              );
            })}
          </div>

          <div className="mt-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-brand-ink">
                  Overtime
                </p>
                <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
                  Extra days they will work outside their regular schedule.
                </p>
              </div>
              <button
                type="button"
                onClick={() => overtimeInputRef.current?.showPicker?.()}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-brand-bg px-3 text-[13px] font-semibold text-brand-blue ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle"
              >
                <CalendarPlus className="h-3.5 w-3.5" strokeWidth={2.5} />
                Add day
              </button>
            </div>

            <input
              ref={overtimeInputRef}
              type="date"
              value={overtimeDraft}
              onChange={(e) => {
                const value = e.target.value;
                setOvertimeDraft(value);
                if (value) addOvertimeDay(value);
              }}
              className="pointer-events-none absolute h-0 w-0 opacity-0"
              tabIndex={-1}
              aria-hidden
            />

            {overtimeDays.length === 0 ? (
              <p className="mt-4 text-center text-[13px] text-brand-ink-tertiary">
                No overtime days added.
              </p>
            ) : (
              <ul className="mt-4 flex flex-wrap gap-2">
                {overtimeDays.map((iso) => (
                  <li key={iso}>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue-soft py-1.5 pl-3 pr-1.5 text-[12px] font-semibold text-brand-blue-deep ring-1 ring-inset ring-brand-blue-muted">
                      {formatOvertimeLabel(iso)}
                      <button
                        type="button"
                        onClick={() => removeOvertimeDay(iso)}
                        className="rounded-full p-1 text-brand-blue-deep/70 transition hover:bg-brand-blue-muted hover:text-brand-blue-deep"
                        aria-label={`Remove ${iso}`}
                      >
                        <X className="h-3 w-3" strokeWidth={2.5} />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-8">
            <p className="text-[13px] font-semibold text-brand-ink">
              Daily mix limit
            </p>
            <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
              How many mixes they can take on a scheduled day.
            </p>

            <div className="mt-4 flex gap-1 rounded-full bg-brand-bg p-1 ring-1 ring-inset ring-black/[0.06]">
              <button
                type="button"
                onClick={() => setHasMaxCapacity(false)}
                className={clsx(
                  "flex-1 rounded-full py-2 text-[13px] font-semibold transition",
                  !hasMaxCapacity
                    ? "bg-brand-ink text-white shadow-sm"
                    : "text-brand-ink-secondary hover:text-brand-ink"
                )}
              >
                No limit
              </button>
              <button
                type="button"
                onClick={() => setHasMaxCapacity(true)}
                className={clsx(
                  "flex-1 rounded-full py-2 text-[13px] font-semibold transition",
                  hasMaxCapacity
                    ? "bg-brand-ink text-white shadow-sm"
                    : "text-brand-ink-secondary hover:text-brand-ink"
                )}
              >
                Set limit
              </button>
            </div>

            {hasMaxCapacity ? (
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-brand-bg px-4 py-3 ring-1 ring-inset ring-black/[0.06]">
                <span className="text-[13px] font-medium text-brand-ink">
                  Max mixes per day
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setMaxMixesPerDay((value) => Math.max(1, value - 1))
                    }
                    disabled={maxMixesPerDay <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-elevated text-brand-ink ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle disabled:opacity-40"
                    aria-label="Decrease limit"
                  >
                    <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                  <span className="min-w-[2ch] text-center text-[18px] font-semibold tabular-nums text-brand-ink">
                    {maxMixesPerDay}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setMaxMixesPerDay((value) => Math.min(10, value + 1))
                    }
                    disabled={maxMixesPerDay >= 10}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-elevated text-brand-ink ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle disabled:opacity-40"
                    aria-label="Increase limit"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-brand-ink">
                Time off
              </p>
              <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
                Holidays or personal days, and why.
              </p>
            </div>
            <button
              type="button"
              onClick={addTimeOff}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-brand-bg px-3 text-[13px] font-semibold text-brand-blue ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              Add
            </button>
          </div>

          {timeOff.length === 0 ? (
            <p className="mt-4 text-center text-[13px] text-brand-ink-tertiary">
              No time off added yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {timeOff.map((entry) => (
                <li
                  key={entry.key}
                  className="overflow-hidden rounded-2xl bg-brand-bg ring-1 ring-inset ring-black/[0.06]"
                >
                  <div className="flex items-center justify-between border-b border-black/[0.06] px-3.5 py-2.5">
                    <div className="flex gap-1 rounded-full bg-brand-elevated p-0.5 ring-1 ring-inset ring-black/[0.06]">
                      {(["holiday", "personal"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            const options = reasonsForTimeOffType(type);
                            updateTimeOff(entry.key, {
                              type,
                              reason: options.includes(entry.reason)
                                ? entry.reason
                                : defaultReasonForTimeOffType(type),
                            });
                          }}
                          className={clsx(
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize transition",
                            entry.type === type
                              ? "bg-brand-ink text-white"
                              : "text-brand-ink-secondary"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTimeOff(entry.key)}
                      className="rounded-full p-1.5 text-brand-ink-tertiary transition hover:bg-brand-elevated hover:text-brand-danger"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-black/[0.06] border-b border-black/[0.06]">
                    <label className="px-3.5 py-2.5">
                      <span className="block text-[10px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary">
                        From
                      </span>
                      <input
                        type="date"
                        required
                        value={entry.startDate}
                        onChange={(e) =>
                          updateTimeOff(entry.key, {
                            startDate: e.target.value,
                            endDate:
                              entry.endDate < e.target.value
                                ? e.target.value
                                : entry.endDate,
                          })
                        }
                        className="mt-0.5 w-full bg-transparent text-[13px] text-brand-ink outline-none"
                      />
                    </label>
                    <label className="px-3.5 py-2.5">
                      <span className="block text-[10px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary">
                        To
                      </span>
                      <input
                        type="date"
                        required
                        min={entry.startDate}
                        value={entry.endDate}
                        onChange={(e) =>
                          updateTimeOff(entry.key, {
                            endDate: e.target.value,
                          })
                        }
                        className="mt-0.5 w-full bg-transparent text-[13px] text-brand-ink outline-none"
                      />
                    </label>
                  </div>
                  <label className="block px-3.5 py-2.5">
                    <span className="block text-[10px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary">
                      {entry.type === "holiday" ? "Holiday" : "Why"}
                    </span>
                    <div className="relative mt-0.5">
                      <select
                        required
                        value={
                          reasonsForTimeOffType(entry.type).includes(
                            entry.reason
                          )
                            ? entry.reason
                            : defaultReasonForTimeOffType(entry.type)
                        }
                        onChange={(e) =>
                          updateTimeOff(entry.key, {
                            reason: e.target.value,
                          })
                        }
                        className="w-full appearance-none bg-transparent pr-5 text-[14px] text-brand-ink outline-none"
                      >
                        {reasonsForTimeOffType(entry.type).map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-ink-tertiary"
                        strokeWidth={2}
                      />
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
