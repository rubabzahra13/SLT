"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarPlus,
  Trash2,
} from "lucide-react";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import {
  DayCalendarPicker,
  addYearsToIso,
  isoFromLocalDate,
  parseIsoToLocalDate,
} from "@/components/ui/DayCalendarPicker";
import { SoftSelect, type SoftSelectOption } from "@/components/ui/SoftSelect";
import { useAppState } from "@/context/AppStateContext";
import {
  effectiveWorkDays,
  expandTimeOffDates,
  formatLeaveDateLabel,
  isEligibleExtraDate,
  extraDatesInRange,
} from "@/lib/producer-availability";
import {
  formatOffWorkReason,
  isValidOffWorkReason,
  OFF_WORK_FOR_PREFIX,
} from "@/lib/producer-time-off";
import {
  buildTimeOffEntry,
  formatExtraDayLabel,
  formatTimeOffRangeLabel,
  isExtraDayCalendarDateDisabled,
  listUpcomingExtraDays,
  listUpcomingTimeOff,
  extraDayCalendarDayTitle,
  previewExtraDayAssignees,
  previewTimeOffAssignees,
} from "@/lib/schedule-time-off";
import type { Producer } from "@/types";

type Mode = "leaves" | "extra";
type Audience = "everyone" | "choose";
type DateField = "start" | "end" | "ot" | null;

function formatShortDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function formatOtHeroDate(iso: string): { primary: string; secondary: string } {
  const date = parseIsoToLocalDate(iso);
  if (!date) return { primary: "—", secondary: "" };
  return {
    primary: date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    }),
    secondary: date.toLocaleDateString(undefined, { year: "numeric" }),
  };
}

export default function ScheduleTimeOffPage() {
  const {
    producers,
    mtdRecords,
    updateProducer,
    isViewOnly,
  } = useAppState();

  const todayIso = isoFromLocalDate(new Date());
  const [mode, setMode] = useState<Mode>("leaves");
  const [dateField, setDateField] = useState<DateField>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const sortedProducers = useMemo(
    () => [...producers].sort((a, b) => a.name.localeCompare(b.name)),
    [producers]
  );

  const allProducerIds = useMemo(
    () => new Set(sortedProducers.map((p) => p.id)),
    [sortedProducers]
  );

  const [audience, setAudience] = useState<Audience>("everyone");
  const [pickedIds, setPickedIds] = useState<Set<string>>(() => new Set(allProducerIds));

  const [offWorkDetail, setOffWorkDetail] = useState("");
  const [leaveStart, setLeaveStart] = useState(todayIso);
  const [leaveEnd, setLeaveEnd] = useState(todayIso);
  const [leaveProducerId, setLeaveProducerId] = useState(
    () => producers[0]?.id ?? ""
  );
  const [otDate, setOtDate] = useState(todayIso);
  const [cancelOtIds, setCancelOtIds] = useState<Set<string>>(() => new Set());

  const [producerOpen, setProducerOpen] = useState(false);

  const leaveStartRef = useRef<HTMLButtonElement>(null);
  const leaveEndRef = useRef<HTMLButtonElement>(null);
  const otDateRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!leaveProducerId && sortedProducers[0]) {
      setLeaveProducerId(sortedProducers[0].id);
    }
  }, [sortedProducers, leaveProducerId]);

  useEffect(() => {
    if (audience === "everyone") {
      setPickedIds(new Set(allProducerIds));
    }
  }, [audience, allProducerIds]);

  const teamSelection =
    audience === "everyone" ? allProducerIds : pickedIds;

  const selection =
    mode === "extra"
      ? teamSelection
      : new Set(leaveProducerId ? [leaveProducerId] : []);

  const startDate = leaveStart;
  const endDate = leaveEnd;
  const reason = formatOffWorkReason(offWorkDetail);

  const preview = useMemo(
    () =>
      mode === "extra"
        ? []
        : previewTimeOffAssignees(sortedProducers, {
            startDate,
            endDate,
            type: "personal",
            reason,
            selectedIds: selection,
            mtdRecords,
          }),
    [sortedProducers, startDate, endDate, mode, reason, selection, mtdRecords]
  );

  const extraDayPreview = useMemo(
    () =>
      previewExtraDayAssignees(sortedProducers, {
        dateIso: otDate,
        selectedIds: selection,
      }),
    [sortedProducers, otDate, selection]
  );

  const applyRows = preview.filter((r) => r.status === "apply");
  const otRows = preview.filter((r) => r.status === "extra");
  const skipRows = preview.filter(
    (r) =>
      r.status === "nonwork" || r.status === "already" || r.status === "mix"
  );
  const otApplyRows = extraDayPreview.filter((r) => r.status === "apply");
  const otSkipRows = extraDayPreview.filter((r) => r.status !== "apply");
  const applyCount =
    mode === "extra"
      ? otApplyRows.length
      : applyRows.length + otRows.filter((r) => cancelOtIds.has(r.id)).length;

  const upcoming = useMemo(
    () => listUpcomingTimeOff(sortedProducers, todayIso).slice(0, 8),
    [sortedProducers, todayIso]
  );

  const upcomingOt = useMemo(
    () => listUpcomingExtraDays(sortedProducers, todayIso).slice(0, 12),
    [sortedProducers, todayIso]
  );

  const otHero = formatOtHeroDate(otDate);

  const extraDayCalendarOptions = useMemo(
    () => ({
      todayIso,
      producers: sortedProducers,
      selectedIds: selection,
    }),
    [todayIso, sortedProducers, selection]
  );

  function extraDayTitle(iso: string, disabled: boolean): string | undefined {
    const blockTitle = extraDayCalendarDayTitle(iso, extraDayCalendarOptions);
    if (blockTitle) return blockTitle;
    const eligible = sortedProducers.filter((p) => {
      if (!selection.has(p.id)) return false;
      if (p.extraDays.includes(iso)) return false;
      const date = parseIsoToLocalDate(iso);
      if (!date || !isEligibleExtraDate(date, effectiveWorkDays(p))) {
        return false;
      }
      if (expandTimeOffDates(p.timeOff).includes(iso)) return false;
      return true;
    });
    if (eligible.length === 0) {
      return "No one selected can take an extra day on this date";
    }
    if (!disabled) return `${eligible.length} can be assigned`;
    return undefined;
  }

  function isExtraDayDateDisabled(iso: string): boolean {
    if (isExtraDayCalendarDateDisabled(iso, extraDayCalendarOptions)) return true;
    const eligible = sortedProducers.filter((p) => {
      if (!selection.has(p.id)) return false;
      if (p.extraDays.includes(iso)) return false;
      const date = parseIsoToLocalDate(iso);
      if (!date || !isEligibleExtraDate(date, effectiveWorkDays(p))) {
        return false;
      }
      if (expandTimeOffDates(p.timeOff).includes(iso)) return false;
      return true;
    });
    return eligible.length === 0;
  }

  const producersById = useMemo(
    () => new Map(sortedProducers.map((p) => [p.id, p])),
    [sortedProducers]
  );

  const producerOptions: SoftSelectOption[] = sortedProducers.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  function togglePicked(id: string) {
    setAudience("choose");
    setPickedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function assignOne(producer: Producer, cancelOt: boolean) {
    const entry = buildTimeOffEntry({
      startDate,
      endDate,
      type: "personal",
      reason,
      producerId: producer.id,
    });
    const otInRange = extraDatesInRange(
      producer.extraDays,
      entry.startDate,
      entry.endDate
    );
    const nextOt = cancelOt
      ? producer.extraDays.filter((d) => !otInRange.includes(d))
      : producer.extraDays;
    await updateProducer(producer.id, {
      extraDays: nextOt,
      timeOff: [...producer.timeOff, entry],
    });
  }

  async function handleShare() {
    if (isViewOnly || busy || applyCount === 0) return;
    setBusy(true);
    setStatus(null);
    try {
      let n = 0;
      if (mode === "extra") {
        for (const row of otApplyRows) {
        const producer = sortedProducers.find((p) => p.id === row.id);
        if (!producer) continue;
          const next = [...new Set([...producer.extraDays, otDate])].sort(
            (a, b) => a.localeCompare(b)
          );
          await updateProducer(producer.id, { extraDays: next });
          n += 1;
        }
        setStatus(
          n === 1
            ? "Extra day added for 1 person"
            : `Extra days added for ${n} people`
        );
      } else {
        for (const row of preview) {
          const producer = sortedProducers.find((p) => p.id === row.id);
          if (!producer) continue;
          if (row.status === "apply") {
            await assignOne(producer, false);
            n += 1;
          } else if (row.status === "extra" && cancelOtIds.has(row.id)) {
            await assignOne(producer, true);
            n += 1;
          }
        }
        setCancelOtIds(new Set());
        setStatus(
          n === 1 ? "Off day assigned" : `Off day assigned to ${n} people`
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function removeExtraDay(producerId: string, iso: string) {
    if (isViewOnly) return;
    const producer = sortedProducers.find((p) => p.id === producerId);
    if (!producer) return;
    await updateProducer(producer.id, {
      extraDays: producer.extraDays.filter((d) => d !== iso),
    });
  }

  async function removeEntry(producerId: string, entryId: string) {
    if (isViewOnly) return;
    const producer = sortedProducers.find((p) => p.id === producerId);
    if (!producer) return;
    await updateProducer(producer.id, {
      timeOff: producer.timeOff.filter((e) => e.id !== entryId),
    });
  }

  const leaveMin = todayIso;
  const leaveMax = addYearsToIso(todayIso, 1);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#fafafa]">
      <header className="shrink-0 border-b border-black/[0.06] bg-white px-4 py-2.5 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link
            href="/schedule"
            className="inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-[13px] font-semibold text-brand-ink-secondary transition hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Schedule
          </Link>
          <h1 className="text-[15px] font-semibold tracking-[-0.02em] text-brand-ink">
            Off days &amp; extra days
          </h1>
          <span className="w-[72px]" aria-hidden />
        </div>
        <div
          className="mx-auto mt-2 flex max-w-6xl justify-center"
          role="tablist"
          aria-label="Assignment type"
        >
          <div className="inline-flex rounded-full bg-brand-bg p-0.5 ring-1 ring-inset ring-black/[0.06]">
            {(
              [
                { id: "leaves" as const, label: "Off days" },
                { id: "extra" as const, label: "Extra days" },
              ] as const
            ).map((tab) => {
              const active = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setMode(tab.id);
                    setDateField(null);
                    setStatus(null);
                    setCancelOtIds(new Set());
                  }}
                  className={clsx(
                    "rounded-full px-4 py-1.5 text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/35 sm:px-5 sm:text-[13px]",
                    active
                      ? "bg-white text-brand-ink shadow-sm"
                      : "text-brand-ink-tertiary hover:text-brand-ink-secondary"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-cols-1 gap-3 overflow-hidden p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-4">
        <section
          aria-labelledby="compose-heading"
          className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
        >
          <h2 id="compose-heading" className="sr-only">
            {mode === "extra" ? "Assign extra day" : "Assign off day"}
          </h2>

          {mode === "extra" ? (
            <>
              <div className="shrink-0 border-b border-black/[0.06] px-4 py-3 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-ink-tertiary">
                      Extra day date
                    </p>
                    <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
                      Add a day that is not on their regular work week
                    </p>
                  </div>
                  <button
                    ref={otDateRef}
                    type="button"
                    onClick={() =>
                      setDateField(dateField === "ot" ? null : "ot")
                    }
                    className={clsx(
                      "inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-[12px] font-semibold ring-1 ring-inset transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/35",
                      dateField === "ot"
                        ? "bg-brand-blue text-white ring-brand-blue"
                        : "bg-brand-bg text-brand-blue ring-black/[0.06] hover:bg-brand-bg-subtle"
                    )}
                  >
                    <CalendarPlus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Pick day
                  </button>
                  </div>
                <button
                  type="button"
                  onClick={() =>
                    setDateField(dateField === "ot" ? null : "ot")
                  }
                  className={clsx(
                    "mt-3 w-full rounded-2xl px-4 py-4 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/35",
                    dateField === "ot"
                      ? "bg-brand-blue-soft/50 ring-2 ring-brand-blue/30"
                      : "bg-gradient-to-br from-brand-blue-soft/60 to-brand-bg/80 hover:from-brand-blue-soft/80"
                  )}
                >
                  <span className="block text-[18px] font-semibold leading-tight text-brand-ink sm:text-[20px]">
                    {otHero.primary}
                  </span>
                  <span className="mt-1 block text-[12px] font-medium tabular-nums text-brand-ink-secondary">
                    {otHero.secondary}
                  </span>
                </button>
                <DayCalendarPicker
                  open={dateField === "ot"}
                  onClose={() => setDateField(null)}
                  excludeRef={otDateRef}
                  value={otDate}
                  minIso={todayIso}
                  isDateDisabled={isExtraDayDateDisabled}
                  dayTitle={extraDayTitle}
                  ariaLabel="Extra day date"
                  onSelect={(iso) => {
                    setOtDate(iso);
                    setStatus(null);
                  }}
                />
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3 sm:px-5">
                <div
                  className="flex shrink-0 justify-center"
                  role="group"
                  aria-label="Who receives an extra day"
                >
                  <div className="inline-flex rounded-full bg-brand-bg p-0.5 ring-1 ring-inset ring-black/[0.06]">
                    <button
                      type="button"
                      aria-pressed={audience === "everyone"}
                      onClick={() => setAudience("everyone")}
                      className={clsx(
                        "rounded-full px-4 py-1.5 text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/35",
                        audience === "everyone"
                          ? "bg-white text-brand-ink shadow-sm"
                          : "text-brand-ink-tertiary"
                      )}
                    >
                      Everyone
                    </button>
                    <button
                      type="button"
                      aria-pressed={audience === "choose"}
                      onClick={() => setAudience("choose")}
                      className={clsx(
                        "rounded-full px-4 py-1.5 text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/35",
                        audience === "choose"
                          ? "bg-white text-brand-ink shadow-sm"
                          : "text-brand-ink-tertiary"
                      )}
                    >
                      Choose people
                    </button>
                  </div>
                </div>

                {audience === "choose" ? (
                  <ul
                    className="mt-3 flex min-h-0 flex-1 gap-3 overflow-x-auto pb-1 scrollbar-hide"
                    aria-label="Choose producers for an extra day"
                  >
                    {sortedProducers.map((producer) => {
                      const on = pickedIds.has(producer.id);
                      const row = extraDayPreview.find((r) => r.id === producer.id);
                      const ringOk = row?.status === "apply";
                      return (
                        <li key={producer.id} className="shrink-0">
                          <button
                            type="button"
                            aria-pressed={on}
                            aria-label={`${on ? "Remove" : "Include"} ${producer.name}`}
                            onClick={() => togglePicked(producer.id)}
                            className="flex w-[68px] flex-col items-center gap-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 focus-visible:ring-offset-2"
                          >
                            <div
                              className={clsx(
                                "rounded-full p-[2px]",
                                on && ringOk
                                  ? "bg-gradient-to-tr from-brand-blue via-brand-signature to-brand-orange"
                                  : on
                                    ? "bg-black/15"
                                    : "bg-black/10 opacity-60"
                              )}
                            >
                              <div className="rounded-full bg-white p-[2px]">
                                <Avatar producer={producer} size="lg" />
                              </div>
                            </div>
                            <span
                              className={clsx(
                                "max-w-full truncate text-[11px] font-medium",
                                on ? "text-brand-ink" : "text-brand-ink-tertiary"
                              )}
                            >
                              {firstName(producer.name)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="mt-4 flex flex-1 flex-col items-center justify-center text-center">
                    <div className="flex -space-x-2">
                      {sortedProducers.slice(0, 6).map((p) => (
                        <Avatar
                          key={p.id}
                          producer={p}
                          size="md"
                          className="ring-2 ring-white"
                        />
                      ))}
                      {sortedProducers.length > 6 ? (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-bg text-[11px] font-semibold text-brand-ink-secondary ring-2 ring-white">
                          +{sortedProducers.length - 6}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-[14px] font-semibold text-brand-ink">
                      Whole team
                    </p>
                    <p className="mt-0.5 max-w-xs text-[13px] text-brand-ink-tertiary">
                      Skips regular work days, existing extra days, and off days
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="shrink-0 border-b border-black/[0.06] px-4 py-3 sm:px-5">
                <p className="mb-3 text-[12px] text-brand-ink-tertiary">
                  Assign off days on scheduled work days with a short reason.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-brand-ink-tertiary">
                      Producer
                    </label>
                    <SoftSelect
                      aria-label="Producer"
                      open={producerOpen}
                      onOpenChange={setProducerOpen}
                      value={leaveProducerId}
                      options={producerOptions}
                      onChange={setLeaveProducerId}
                      searchable
                      placement="above"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-brand-ink-tertiary">
                      Reason
                    </label>
                    <label className="flex h-10 min-w-0 items-center gap-1.5 rounded-xl border border-brand-line/60 bg-brand-bg px-3 focus-within:border-brand-blue/45 focus-within:ring-2 focus-within:ring-brand-blue/15">
                      <span className="shrink-0 text-[13px] font-medium text-brand-ink-secondary">
                        {OFF_WORK_FOR_PREFIX.trim()}
                      </span>
                      <input
                        type="text"
                        value={offWorkDetail}
                        onChange={(e) => setOffWorkDetail(e.target.value)}
                        placeholder="wedding"
                        required
                        className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-brand-ink outline-none placeholder:text-brand-ink-tertiary"
                        aria-label="Off work reason"
                      />
                    </label>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 rounded-2xl bg-brand-bg/80 p-1">
                  <button
                    ref={leaveStartRef}
                    type="button"
                    aria-label="Off day start date"
                    onClick={() =>
                      setDateField(dateField === "start" ? null : "start")
                    }
                    className={clsx(
                      "rounded-xl px-3 py-2 text-[12px] font-semibold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30",
                      dateField === "start"
                        ? "bg-white text-brand-signature shadow-sm"
                        : "text-brand-ink hover:bg-white/70"
                    )}
                  >
                    {formatShortDate(leaveStart)}
                  </button>
                  <ArrowRight className="h-3.5 w-3.5 text-brand-ink-tertiary" aria-hidden />
                  <button
                    ref={leaveEndRef}
                    type="button"
                    aria-label="Off day end date"
                    onClick={() =>
                      setDateField(dateField === "end" ? null : "end")
                    }
                    className={clsx(
                      "rounded-xl px-3 py-2 text-[12px] font-semibold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30",
                      dateField === "end"
                        ? "bg-white text-brand-signature shadow-sm"
                        : "text-brand-ink hover:bg-white/70"
                    )}
                  >
                    {formatShortDate(leaveEnd)}
                  </button>
                </div>
                <DayCalendarPicker
                  open={dateField === "start"}
                  onClose={() => setDateField(null)}
                  excludeRef={leaveStartRef}
                  value={leaveStart}
                    minIso={leaveMin}
                    maxIso={leaveMax}
                  ariaLabel="Off day start date"
                  onSelect={(iso) => {
                      setLeaveStart(iso);
                      if (leaveEnd < iso) setLeaveEnd(iso);
                    }}
                />
                <DayCalendarPicker
                  open={dateField === "end"}
                  onClose={() => setDateField(null)}
                  excludeRef={leaveEndRef}
                  value={leaveEnd}
                  minIso={leaveStart || leaveMin}
                  maxIso={leaveMax}
                  ariaLabel="Off day end date"
                  onSelect={setLeaveEnd}
                    />
                  </div>
              <div className="flex flex-1 items-center justify-center px-5 py-4">
                {leaveProducerId ? (
                  <div className="flex flex-col items-center text-center">
                    <div className="rounded-full bg-gradient-to-tr from-brand-signature via-brand-blue to-brand-orange p-[3px]">
                      <div className="rounded-full bg-white p-[3px]">
                        <Avatar
                          producer={producersById.get(leaveProducerId)}
                          size="xl"
                        />
                      </div>
                    </div>
                    <p className="mt-3 text-[15px] font-semibold text-brand-ink">
                      {producersById.get(leaveProducerId)?.name}
                    </p>
                    <p className="mt-0.5 text-[13px] text-brand-ink-tertiary">
                      {reason || "Off work for …"}
                    </p>
                  </div>
                        ) : null}
                      </div>
            </>
          )}

          <div className="shrink-0 border-t border-black/[0.06] px-4 py-3 sm:px-5">
            {mode === "extra" ? (
              <>
                <p
                  className="text-center text-[12px] text-brand-ink-secondary"
                  aria-live="polite"
                >
                  <span className="font-semibold tabular-nums text-brand-blue-deep">
                    {applyCount}
                  </span>{" "}
                  will get an extra day
                  {otSkipRows.length > 0 ? (
                    <>
                      {" · "}
                      <span className="tabular-nums">{otSkipRows.length}</span>{" "}
                      skipped
                    </>
                                ) : null}
                </p>
                {otApplyRows.length > 0 ? (
                  <div className="mt-2 flex justify-center gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
                    {otApplyRows.slice(0, 10).map((row) => (
                      <Avatar
                        key={row.id}
                        producer={producersById.get(row.id)}
                        name={row.name}
                        size="xs"
                        alt={row.name}
                      />
                    ))}
                    {otApplyRows.length > 10 ? (
                      <span className="self-center text-[11px] font-medium text-brand-ink-tertiary">
                        +{otApplyRows.length - 10}
                              </span>
                    ) : null}
                  </div>
                ) : null}
                {otSkipRows.length > 0 ? (
                  <ul className="mt-2 max-h-14 space-y-0.5 overflow-y-auto text-center text-[11px] text-brand-ink-tertiary scrollbar-hide">
                    {otSkipRows.slice(0, 4).map((row) => (
                      <li key={row.id}>
                        {row.name} —{" "}
                        {row.status === "workday"
                          ? "regular work day"
                          : row.status === "already"
                            ? "already an extra day"
                            : "off day"}
                            </li>
                          ))}
                    {otSkipRows.length > 4 ? (
                      <li>+{otSkipRows.length - 4} more</li>
                    ) : null}
                        </ul>
                ) : null}
                    </>
                  ) : (
              <>
                <p
                  className="text-center text-[12px] text-brand-ink-secondary"
                  aria-live="polite"
                >
                  <span className="font-semibold tabular-nums text-brand-signature">
                    {applyCount}
                  </span>{" "}
                  will receive it
                  {skipRows.length > 0 ? (
                    <>
                      {" · "}
                      <span className="tabular-nums">{skipRows.length}</span>{" "}
                      exempt
                    </>
                  ) : null}
                  {otRows.length > 0 ? (
                    <>
                      {" · "}
                      <span className="tabular-nums">{otRows.length}</span> extra day
                    </>
                  ) : null}
                </p>
                {applyRows.length > 0 ? (
                  <div className="mt-2 flex justify-center gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
                    {applyRows.slice(0, 10).map((row) => (
                      <Avatar
                        key={row.id}
                        producer={producersById.get(row.id)}
                        name={row.name}
                        size="xs"
                        alt={row.name}
                      />
                    ))}
                    {applyRows.length > 10 ? (
                      <span className="self-center text-[11px] font-medium text-brand-ink-tertiary">
                        +{applyRows.length - 10}
                      </span>
              ) : null}
            </div>
                ) : null}
                {otRows.length > 0 ? (
                  <ul className="mt-2 max-h-16 space-y-1 overflow-y-auto scrollbar-hide">
                    {otRows.slice(0, 3).map((row) => (
                      <li
                        key={row.id}
                        className="flex items-center justify-between gap-2 text-[11px]"
                      >
                        <span className="truncate text-brand-ink-secondary">
                          {row.name}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCancelOtIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(row.id)) next.delete(row.id);
                              else next.add(row.id);
                              return next;
                            })
                          }
                          className={clsx(
                            "shrink-0 rounded-full px-2 py-0.5 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30",
                            cancelOtIds.has(row.id)
                              ? "bg-brand-ink text-white"
                              : "text-brand-blue"
                          )}
                        >
                          {cancelOtIds.has(row.id) ? "Extra day off" : "Cancel extra day"}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {skipRows.some((r) => r.status === "mix") ? (
                  <ul className="mt-2 max-h-14 space-y-0.5 overflow-y-auto text-center text-[11px] text-brand-orange-deep scrollbar-hide">
                    {skipRows
                      .filter((r) => r.status === "mix")
                      .slice(0, 4)
                      .map((row) => (
                        <li key={row.id}>
                          {row.name} — mix scheduled
                          {row.mixLabels?.[0]
                            ? ` · ${row.mixLabels[0]}`
                            : ""}
                        </li>
                      ))}
                  </ul>
                ) : null}
              </>
            )}
            {status ? (
              <p className="mt-2 text-center text-[13px] font-semibold text-brand-signature">
                {status}
              </p>
                  ) : null}
            {!isViewOnly ? (
              <button
                type="button"
                disabled={
                  busy ||
                  applyCount === 0 ||
                  (mode === "leaves" && !isValidOffWorkReason(reason))
                }
                onClick={() => void handleShare()}
                className={clsx(
                  "mt-3 w-full rounded-xl py-3 text-[15px] font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 disabled:cursor-not-allowed disabled:opacity-40",
                  mode === "extra"
                    ? "bg-brand-blue hover:bg-brand-blue/90"
                    : "bg-brand-ink hover:bg-brand-ink/90"
                )}
              >
                {busy
                  ? mode === "extra"
                    ? "Adding…"
                    : "Assigning…"
                  : applyCount === 0
                    ? mode === "extra"
                      ? "No one eligible on this day"
                      : "Nothing to assign"
                    : mode === "extra"
                      ? `Add extra day · ${applyCount}`
                      : `Assign off day · ${applyCount}`}
              </button>
            ) : (
              <p className="mt-3 text-center text-[12px] text-brand-ink-tertiary">
                View-only: you can’t assign off days.
              </p>
            )}
          </div>
        </section>

        <aside
          aria-labelledby="upcoming-heading"
          className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] lg:max-h-full"
        >
          <div className="shrink-0 border-b border-black/[0.06] px-3 py-2.5">
            <h2 id="upcoming-heading" className="text-[13px] font-semibold text-brand-ink">
              Scheduled
            </h2>
            <p className="text-[11px] text-brand-ink-tertiary">
              {mode === "extra"
                ? `${upcomingOt.length} extra days`
                : `${upcoming.length} upcoming`}
            </p>
          </div>
          <ul className="min-h-0 flex-1 divide-y divide-black/[0.06] overflow-y-auto scrollbar-hide">
            {mode === "extra" ? (
              upcomingOt.length === 0 ? (
                <li className="px-3 py-6 text-center text-[12px] text-brand-ink-tertiary">
                  No extra days scheduled yet.
                </li>
              ) : (
                upcomingOt.map((row) => {
                  const producer = producersById.get(row.producerId);
                  return (
                  <li
                    key={row.key}
                      className="flex items-center gap-2 px-2.5 py-2"
                    >
                      <Avatar
                        producer={producer}
                        name={row.producerName}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-brand-ink">
                          {formatExtraDayLabel(row.iso)}
                        </p>
                        <p className="truncate text-[11px] text-brand-ink-secondary">
                        {row.producerName}
                      </p>
                        <p className="text-[10px] tabular-nums text-brand-ink-tertiary">
                          {row.iso}
                      </p>
                    </div>
                    {!isViewOnly ? (
                      <button
                        type="button"
                        onClick={() =>
                            void removeExtraDay(row.producerId, row.iso)
                        }
                          className="shrink-0 rounded-full p-1.5 text-brand-ink-tertiary hover:bg-brand-bg hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30"
                          aria-label={`Remove extra day ${row.iso} for ${row.producerName}`}
                      >
                          <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </li>
                  );
                })
              )
             ) : upcoming.length === 0 ? (
              <li className="px-3 py-6 text-center text-[12px] text-brand-ink-tertiary">
                Nothing scheduled yet.
              </li>
            ) : (
              upcoming.map((row) => {
                const producer = producersById.get(row.producerId);
                return (
                  <li
                    key={row.key}
                    className="flex items-center gap-2 px-2.5 py-2"
                  >
                    <Avatar producer={producer} name={row.producerName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-brand-ink">
                        {row.entry.reason}
                      </p>
                      <p className="truncate text-[11px] text-brand-ink-secondary">
                        {row.producerName}
                      </p>
                      <p className="text-[10px] tabular-nums text-brand-ink-tertiary">
                        {formatTimeOffRangeLabel(
                          row.entry,
                          producer
                            ? effectiveWorkDays(producer)
                            : undefined
                        )}
                      </p>
        </div>
                    {!isViewOnly ? (
            <button
              type="button"
                        onClick={() => void removeEntry(row.producerId, row.entry.id)}
                        className="shrink-0 rounded-full p-1.5 text-brand-ink-tertiary hover:bg-brand-bg hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30"
                        aria-label={`Remove ${row.entry.reason} for ${row.producerName}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
            </button>
        ) : null}
                  </li>
                );
              })
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}
