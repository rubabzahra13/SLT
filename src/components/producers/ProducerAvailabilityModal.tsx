"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarPlus, ChevronDown, Minus, Plus, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { ProducerCategoryAddMenu } from "@/components/producers/ProducerCategoryAddMenu";
import {
  defaultReasonForTimeOffType,
  reasonsForTimeOffType,
} from "@/lib/producer-time-off";
import { findProducerCategoryGroup } from "@/lib/producer-category-groups";
import {
  formatCategoryCompensationRate,
  normalizeProducer,
} from "@/lib/producers";
import { Tabs } from "@/components/ui/Tabs";
import { Avatar } from "@/components/ui/Avatar";
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
  maxProducerCostPerDay: number | null;
  overtimeDays: string[];
  categories: string[];
  specialty: string;
  ratesByCategory: Record<string, number>;
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

type AvailabilityTab = "schedule" | "limit" | "category";

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

function createEmptyTimeOffDraft(): DraftTimeOff {
  const today = new Date().toISOString().slice(0, 10);
  return {
    key: "draft",
    startDate: today,
    endDate: today,
    type: "personal",
    reason: defaultReasonForTimeOffType("personal"),
  };
}

const MIN_MAX_COST_PER_DAY = 100;
const MAX_MAX_COST_PER_DAY = 20000;
const MAX_COST_STEP = 100;

function clampMaxCostPerDay(value: number): number {
  return Math.min(
    MAX_MAX_COST_PER_DAY,
    Math.max(MIN_MAX_COST_PER_DAY, Math.round(value))
  );
}

function categoriesFromProducer(producer: Producer): {
  categories: string[];
  categoryRates: Record<string, number>;
} {
  const norm = normalizeProducer(producer);
  const categories = norm.categories?.length
    ? [...norm.categories]
    : norm.specialty
      ? [norm.specialty]
      : [];
  const categoryRates: Record<string, number> = {};
  for (const cat of categories) {
    const raw = norm.ratesByCategory?.[cat] ?? norm.defaultRate ?? 0.5;
    categoryRates[cat] = raw <= 1 ? Math.round(raw * 100) : raw;
  }
  return { categories, categoryRates };
}

function formatTimeOffDateLabel(entry: DraftTimeOff): string {
  if (entry.startDate === entry.endDate) {
    return formatOvertimeLabel(entry.startDate);
  }
  return `${formatOvertimeLabel(entry.startDate)} → ${formatOvertimeLabel(entry.endDate)}`;
}

export function ProducerAvailabilityModal({
  open,
  onClose,
  producer,
  onSave,
}: ProducerAvailabilityModalProps) {
  const [workDays, setWorkDays] = useState<Weekday[]>([...DEFAULT_WORK_DAYS]);
  const [timeOff, setTimeOff] = useState<DraftTimeOff[]>([]);
  const [timeOffDraft, setTimeOffDraft] = useState<DraftTimeOff>(() =>
    createEmptyTimeOffDraft()
  );
  const [showTimeOffForm, setShowTimeOffForm] = useState(false);
  const [hasMaxCapacity, setHasMaxCapacity] = useState(false);
  const [maxMixesPerDay, setMaxMixesPerDay] = useState(6);
  const [maxProducerCostPerDay, setMaxProducerCostPerDay] = useState(2000);
  const [maxCostInput, setMaxCostInput] = useState("2000");
  const [overtimeDays, setOvertimeDays] = useState<string[]>([]);
  const [overtimeDraft, setOvertimeDraft] = useState("");
  const [activeTab, setActiveTab] = useState<AvailabilityTab>("schedule");
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryRates, setCategoryRates] = useState<Record<string, number>>({});
  const overtimeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !producer) return;
    setActiveTab("schedule");
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
    setHasMaxCapacity(
      producer.maxMixesPerDay != null || producer.maxProducerCostPerDay != null
    );
    setMaxMixesPerDay(producer.maxMixesPerDay ?? 6);
    setMaxProducerCostPerDay(producer.maxProducerCostPerDay ?? 2000);
    setMaxCostInput(String(producer.maxProducerCostPerDay ?? 2000));
    setOvertimeDays([...producer.overtimeDays]);
    setOvertimeDraft("");
    setTimeOffDraft(createEmptyTimeOffDraft());
    setShowTimeOffForm(false);
    const { categories: nextCategories, categoryRates: nextCategoryRates } =
      categoriesFromProducer(producer);
    setCategories(nextCategories);
    setCategoryRates(nextCategoryRates);
  }, [open, producer]);

  if (!open || !producer) return null;

  const usesPercentageCompensation =
    producer.compensationModel !== "not_paid_for_mixing" &&
    producer.compensationModel !== "hourly_manual";

  function toggleDay(day: Weekday) {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function openTimeOffForm() {
    setTimeOffDraft(createEmptyTimeOffDraft());
    setShowTimeOffForm(true);
  }

  function closeTimeOffForm() {
    setTimeOffDraft(createEmptyTimeOffDraft());
    setShowTimeOffForm(false);
  }

  function updateTimeOffDraft(patch: Partial<DraftTimeOff>) {
    setTimeOffDraft((current) => ({ ...current, ...patch }));
  }

  function commitTimeOffDraft() {
    if (!timeOffDraft.startDate || !timeOffDraft.reason.trim()) return;
    setTimeOff((prev) => [
      ...prev,
      {
        ...timeOffDraft,
        key: `to-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        endDate: timeOffDraft.endDate || timeOffDraft.startDate,
      },
    ]);
    closeTimeOffForm();
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

  function syncMaxCostInput(value: number) {
    const clamped = clampMaxCostPerDay(value);
    setMaxProducerCostPerDay(clamped);
    setMaxCostInput(String(clamped));
  }

  function commitMaxCostInput() {
    const parsed = parseInt(maxCostInput, 10);
    syncMaxCostInput(Number.isNaN(parsed) ? maxProducerCostPerDay : parsed);
  }

  function addCategory(category: string) {
    setCategories((prev) =>
      prev.includes(category) ? prev : [...prev, category]
    );
    setCategoryRates((prev) => ({
      ...prev,
      [category]: prev[category] ?? 50,
    }));
  }

  function removeCategory(category: string) {
    setCategories((prev) => prev.filter((item) => item !== category));
    setCategoryRates((prev) => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
  }

  function updateCategoryRate(category: string, value: number) {
    setCategoryRates((prev) => ({
      ...prev,
      [category]: value,
    }));
  }

  function handleDone() {
    const parsed = parseInt(maxCostInput, 10);
    const committedMaxCost = hasMaxCapacity
      ? clampMaxCostPerDay(Number.isNaN(parsed) ? maxProducerCostPerDay : parsed)
      : null;
    const ratesByCategory: Record<string, number> = {};
    for (const category of categories) {
      const value = categoryRates[category] ?? 50;
      ratesByCategory[category] = value > 1 ? value / 100 : value;
    }

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
      maxProducerCostPerDay: hasMaxCapacity
        ? Math.max(1, committedMaxCost ?? maxProducerCostPerDay)
        : null,
      overtimeDays,
      categories,
      specialty: categories[0] ?? producer?.specialty ?? "",
      ratesByCategory,
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
            Producer settings
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
            <Avatar producer={producer} size="md" />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-brand-ink">
                {producer.name}
              </p>
              <p className="text-[12px] text-brand-ink-tertiary">
                {categories.length
                  ? categories.slice(0, 3).join(", ") +
                    (categories.length > 3 ? ` +${categories.length - 3}` : "")
                  : producer.specialty}
              </p>
            </div>
          </div>

          <div className="mb-6 border-b border-black/[0.08]">
            <Tabs
              options={[
                { value: "schedule", label: "Schedule" },
                { value: "limit", label: "Limit" },
                {
                  value: "category",
                  label: "Category",
                  count: categories.length || undefined,
                },
              ]}
              value={activeTab}
              onChange={(value) => setActiveTab(value as AvailabilityTab)}
              accent="blue"
            />
          </div>

          {activeTab === "category" ? (
            <div className="rounded-2xl bg-brand-bg px-4 py-3 ring-1 ring-inset ring-black/[0.06]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold text-brand-ink">
                    Compensation rates
                  </p>
                  <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
                    Payroll percentage by category.
                  </p>
                </div>
                <ProducerCategoryAddMenu
                  assignedCategories={categories}
                  onAdd={addCategory}
                />
              </div>

              {categories.length > 0 ? (
                <ul className="mt-3 divide-y divide-black/[0.06]">
                  {categories.map((category) => {
                    const group = findProducerCategoryGroup(category);
                    return (
                    <li
                      key={category}
                      className="flex items-center gap-2 py-2.5 text-[13px] first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-brand-ink-secondary">
                          {category}
                        </p>
                        {group ? (
                          <p className="truncate text-[11px] text-brand-ink-tertiary">
                            {group.label}
                          </p>
                        ) : null}
                      </div>
                      {usesPercentageCompensation ? (
                        <div className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-elevated px-2 py-1 ring-1 ring-inset ring-black/[0.06] focus-within:ring-brand-blue/30">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={categoryRates[category] ?? 50}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              updateCategoryRate(
                                category,
                                Number.isNaN(value) ? 0 : value
                              );
                            }}
                            className="w-10 bg-transparent text-right text-[13px] font-semibold tabular-nums text-brand-ink outline-none"
                            aria-label={`Compensation percentage for ${category}`}
                          />
                          <span className="text-[12px] font-semibold text-brand-ink-tertiary">
                            %
                          </span>
                        </div>
                      ) : (
                        <span className="shrink-0 font-semibold tabular-nums text-brand-blue">
                          {formatCategoryCompensationRate(producer, category)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeCategory(category)}
                        className="shrink-0 rounded-full p-1.5 text-brand-ink-tertiary transition hover:bg-brand-elevated hover:text-brand-danger"
                        aria-label={`Remove ${category}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-[12px] text-brand-ink-tertiary">
                  No categories assigned. Click Add to pick a category and
                  subcategory.
                </p>
              )}
            </div>
          ) : null}

          {activeTab === "schedule" ? (
            <>
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-brand-ink">
                  Time off
                </p>
                <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
                  Block out days when this producer won&apos;t be available.
                </p>
              </div>
              {!showTimeOffForm ? (
                <button
                  type="button"
                  onClick={openTimeOffForm}
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-brand-bg px-3 text-[13px] font-semibold text-brand-blue ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Add
                </button>
              ) : null}
            </div>

            <div className="mt-4">
              {timeOff.length === 0 ? (
                <p className="text-center text-[13px] text-brand-ink-tertiary">
                  Nothing scheduled yet.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {timeOff.map((entry) => (
                    <li key={entry.key}>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue-soft py-1.5 pl-3 pr-1.5 text-[12px] font-semibold text-brand-blue-deep ring-1 ring-inset ring-brand-blue-muted"
                        title={`${entry.type} · ${entry.reason}`}
                      >
                        {formatTimeOffDateLabel(entry)}
                        <button
                          type="button"
                          onClick={() => removeTimeOff(entry.key)}
                          className="rounded-full p-1 text-brand-blue-deep/70 transition hover:bg-brand-blue-muted hover:text-brand-blue-deep"
                          aria-label={`Remove ${formatTimeOffDateLabel(entry)} (${entry.type}, ${entry.reason})`}
                        >
                          <X className="h-3 w-3" strokeWidth={2.5} />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {showTimeOffForm ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-dashed border-brand-blue/35 bg-brand-blue-soft/20">
              <div className="flex items-center justify-between px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-brand-blue-deep">
                  Add new
                </p>
                <button
                  type="button"
                  onClick={closeTimeOffForm}
                  className="rounded-full p-1 text-brand-blue-deep/70 transition hover:bg-brand-blue-muted hover:text-brand-blue-deep"
                  aria-label="Cancel add time off"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              </div>

              <div className="space-y-2 px-3 pb-3">
                <div className="overflow-hidden rounded-xl bg-brand-elevated ring-1 ring-inset ring-black/[0.06]">
                  <div className="flex gap-1 border-b border-black/[0.06] p-1">
                    {(["holiday", "personal"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          const options = reasonsForTimeOffType(type);
                          updateTimeOffDraft({
                            type,
                            reason: options.includes(timeOffDraft.reason)
                              ? timeOffDraft.reason
                              : defaultReasonForTimeOffType(type),
                          });
                        }}
                        className={clsx(
                          "flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold capitalize transition",
                          timeOffDraft.type === type
                            ? "bg-brand-ink text-white"
                            : "text-brand-ink-secondary hover:bg-brand-bg-subtle"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 divide-x divide-black/[0.06]">
                    <label className="px-2.5 py-2">
                      <span className="block text-[9px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary">
                        From
                      </span>
                      <input
                        type="date"
                        required
                        value={timeOffDraft.startDate}
                        onChange={(e) =>
                          updateTimeOffDraft({
                            startDate: e.target.value,
                            endDate:
                              timeOffDraft.endDate < e.target.value
                                ? e.target.value
                                : timeOffDraft.endDate,
                          })
                        }
                        className="mt-0.5 w-full bg-transparent text-[12px] text-brand-ink outline-none"
                      />
                    </label>
                    <label className="px-2.5 py-2">
                      <span className="block text-[9px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary">
                        To
                      </span>
                      <input
                        type="date"
                        required
                        min={timeOffDraft.startDate}
                        value={timeOffDraft.endDate}
                        onChange={(e) =>
                          updateTimeOffDraft({ endDate: e.target.value })
                        }
                        className="mt-0.5 w-full bg-transparent text-[12px] text-brand-ink outline-none"
                      />
                    </label>
                  </div>

                  <label className="block border-t border-black/[0.06] px-2.5 py-2">
                    <span className="block text-[9px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary">
                      {timeOffDraft.type === "holiday" ? "Holiday" : "Why"}
                    </span>
                    <div className="relative mt-0.5">
                      <select
                        required
                        value={
                          reasonsForTimeOffType(timeOffDraft.type).includes(
                            timeOffDraft.reason
                          )
                            ? timeOffDraft.reason
                            : defaultReasonForTimeOffType(timeOffDraft.type)
                        }
                        onChange={(e) =>
                          updateTimeOffDraft({ reason: e.target.value })
                        }
                        className="w-full appearance-none bg-transparent pr-4 text-[13px] text-brand-ink outline-none"
                      >
                        {reasonsForTimeOffType(timeOffDraft.type).map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 text-brand-ink-tertiary"
                        strokeWidth={2}
                      />
                    </div>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={commitTimeOffDraft}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-brand-blue px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-brand-blue-hover"
                >
                  <Plus className="h-3 w-3" strokeWidth={2.5} />
                  Add to schedule
                </button>
              </div>
            </div>
            ) : null}
          </div>
            </>
          ) : null}

          {activeTab === "limit" ? (
            <>
          <div>
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
              <div className="mt-4 space-y-2">
                <div className="grid grid-cols-[minmax(0,1fr)_9.5rem] items-center gap-x-3 rounded-2xl bg-brand-bg px-4 py-3 ring-1 ring-inset ring-black/[0.06]">
                  <span className="text-[13px] font-medium text-brand-ink">
                    Max mixes per day
                  </span>
                  <div className="grid grid-cols-[2rem_1fr_2rem] items-center gap-2">
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
                    <span className="w-full text-center text-[18px] font-semibold tabular-nums text-brand-ink">
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

                <div className="grid grid-cols-[minmax(0,1fr)_9.5rem] items-center gap-x-3 rounded-2xl bg-brand-bg px-4 py-3 ring-1 ring-inset ring-black/[0.06]">
                  <span className="text-[13px] font-medium text-brand-ink">
                    <span className="mr-1 text-[15px] font-semibold text-brand-ink-secondary">
                      $
                    </span>
                    Max cost per day
                  </span>
                  <div className="grid grid-cols-[2rem_1fr_2rem] items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        syncMaxCostInput(maxProducerCostPerDay - MAX_COST_STEP)
                      }
                      disabled={maxProducerCostPerDay <= MIN_MAX_COST_PER_DAY}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-elevated text-brand-ink ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle disabled:opacity-40"
                      aria-label="Decrease max cost per day"
                    >
                      <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={maxCostInput}
                      onChange={(e) =>
                        setMaxCostInput(e.target.value.replace(/[^\d]/g, ""))
                      }
                      onBlur={commitMaxCostInput}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                        }
                      }}
                      className="w-full min-w-0 rounded-md bg-brand-elevated/50 px-1 text-center text-[18px] font-semibold tabular-nums text-brand-ink outline-none ring-1 ring-inset ring-black/[0.06] focus:bg-brand-elevated focus:ring-brand-blue/30"
                      aria-label="Max cost per day amount"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        syncMaxCostInput(maxProducerCostPerDay + MAX_COST_STEP)
                      }
                      disabled={maxProducerCostPerDay >= MAX_MAX_COST_PER_DAY}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-elevated text-brand-ink ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle disabled:opacity-40"
                      aria-label="Increase max cost per day"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
