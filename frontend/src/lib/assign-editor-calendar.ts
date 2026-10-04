import { parseFlexibleDate } from "@/lib/dates";
import {
  checkProducerDailyLimits,
  dateToIsoLocal,
  describeProducerMixDayForLeave,
  effectiveWorkDays,
  formatCompactLeaveDaySpans,
  getProducerDayBlockReason,
  isProducerWorkDay,
  isProducerWorkableDay,
  isProducerExtraDay,
  listProducerMixBookingsOnDay,
  toDayStart,
  type DailyCostOptions,
  type DailyLimitCheck,
} from "@/lib/producer-availability";
import type { MTDRecord, Producer } from "@/types";

export type AssignCalendarEventKind =
  | "leave"
  | "extra"
  | "non_work";

export type AssignCalendarEvent = {
  iso: string;
  kind: AssignCalendarEventKind;
  label: string;
};

/** Inclusive YYYY-MM-DD days from start through end. */
export function eachIsoDayInRange(startIso: string, endIso: string): string[] {
  const start = parseFlexibleDate(startIso);
  const end = parseFlexibleDate(endIso || startIso);
  if (!start || !end) return [];

  const out: string[] = [];
  const cursor = toDayStart(start);
  const last = toDayStart(end);
  let guard = 0;
  while (cursor <= last && guard < 400) {
    out.push(dateToIsoLocal(cursor));
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return out;
}

/**
 * Transparent calendar context while picking mix dates.
 * With a producer: their leave, extra days, and non-work days in range.
 */
export function collectAssignCalendarEvents(
  startIso: string,
  endIso: string,
  producer?: Producer | null
): AssignCalendarEvent[] {
  const end = endIso || startIso;
  const events: AssignCalendarEvent[] = [];

  if (!producer) {
    return events;
  }

  for (const entry of producer.timeOff ?? []) {
    const leaveStart = entry.startDate;
    const leaveEnd = entry.endDate || entry.startDate;
    for (const iso of eachIsoDayInRange(leaveStart, leaveEnd)) {
      if (iso < startIso || iso > end) continue;
      if (events.some((e) => e.iso === iso && e.kind === "leave")) continue;
      events.push({
        iso,
        kind: "leave",
        label: entry.reason?.trim() || "Off day",
      });
    }
  }

  for (const iso of producer.extraDays ?? []) {
    if (iso < startIso || iso > end) continue;
    events.push({
      iso,
      kind: "extra",
      label: "Extra day",
    });
  }

  for (const iso of eachIsoDayInRange(startIso, end)) {
    const d = parseFlexibleDate(iso);
    if (!d) continue;
    if (isProducerWorkDay(producer, d) || isProducerExtraDay(producer, d)) {
      continue;
    }
    events.push({
      iso,
      kind: "non_work",
      label: "Not a regular work day",
    });
  }

  return events.sort((a, b) => a.iso.localeCompare(b.iso));
}

/** Day-number spans only: "12,15,17-20" (no month/year). */
export function formatCompactDayNumbers(isos: string[]): string {
  if (isos.length === 0) return "";
  const sorted = [...isos].sort((a, b) => a.localeCompare(b));
  type Run = { start: string; end: string };
  const runs: Run[] = [];
  for (const iso of sorted) {
    const last = runs[runs.length - 1];
    if (!last) {
      runs.push({ start: iso, end: iso });
      continue;
    }
    const [y, m, d] = last.end.split("-").map(Number);
    const next = new Date(y, m - 1, d);
    next.setDate(next.getDate() + 1);
    if (dateToIsoLocal(next) === iso) {
      last.end = iso;
    } else {
      runs.push({ start: iso, end: iso });
    }
  }
  function dayNum(iso: string): number {
    return Number(iso.slice(8, 10));
  }
  return runs
    .map((run) =>
      run.start === run.end
        ? String(dayNum(run.start))
        : `${dayNum(run.start)}-${dayNum(run.end)}`
    )
    .join(",");
}

export type MixWindowDaySummary = {
  /** Working days counted in the mix window, e.g. "12,15,17-20 Oct 2026". */
  includedLabel: string;
  /** Compact day numbers for the chip, e.g. "12,15,17-20". */
  includedDays: string;
  includedCount: number;
  /** e.g. "13-14 off for Personal", "16 non-work day". */
  excludedNotes: string[];
};

/**
 * Compact booking-range summary like producer leave chips: included work
 * days with commas/dashes, plus notes for off / non-work days skipped.
 */
export function summarizeMixWindowDays(
  startIso: string,
  endIso: string,
  producer?: Producer | null
): MixWindowDaySummary {
  const end = endIso || startIso;
  const days = eachIsoDayInRange(startIso, end);
  if (days.length === 0) {
    return {
      includedLabel: "",
      includedDays: "",
      includedCount: 0,
      excludedNotes: [],
    };
  }

  if (!producer) {
    return {
      includedLabel: formatCompactLeaveDaySpans(days),
      includedDays: formatCompactDayNumbers(days),
      includedCount: days.length,
      excludedNotes: [],
    };
  }

  const included: string[] = [];
  const leaveByReason = new Map<string, string[]>();
  const nonWork: string[] = [];

  for (const iso of days) {
    const day = parseFlexibleDate(iso);
    if (!day) continue;
    if (isProducerWorkableDay(producer, day)) {
      included.push(iso);
      continue;
    }
    const reason = getProducerDayBlockReason(producer, day);
    if (reason === "leave") {
      const entry = (producer.timeOff ?? []).find(
        (off) => iso >= off.startDate && iso <= (off.endDate || off.startDate)
      );
      const label = entry?.reason?.trim() || "Off day";
      const list = leaveByReason.get(label) ?? [];
      list.push(iso);
      leaveByReason.set(label, list);
    } else {
      nonWork.push(iso);
    }
  }

  const excludedNotes: string[] = [];
  for (const [reason, isos] of leaveByReason) {
    const span = formatCompactDayNumbers(isos);
    if (!span) continue;
    excludedNotes.push(`${span} off for ${reason}`);
  }
  if (nonWork.length > 0) {
    const span = formatCompactDayNumbers(nonWork);
    excludedNotes.push(
      nonWork.length === 1
        ? `${span} non-work day`
        : `${span} non-work days`
    );
  }

  return {
    includedLabel:
      included.length > 0
        ? formatCompactLeaveDaySpans(included)
        : formatCompactLeaveDaySpans(days),
    includedDays: formatCompactDayNumbers(included),
    includedCount: included.length,
    excludedNotes,
  };
}

export function formatProducerWorkDaysShort(producer: Producer): string {
  const work = effectiveWorkDays(producer);
  const labels: Record<string, string> = {
    sun: "Sun",
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
  };
  return work.map((d) => labels[d] ?? d).join(" · ");
}

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
});

function formatUsd(amount: number): string {
  return usdFormatter.format(amount);
}

function mixesLabel(count: number): string {
  return `${count} mix${count === 1 ? "" : "es"}`;
}

function formatShortDay(iso: string): string {
  const d = parseFlexibleDate(iso);
  return d
    ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : iso;
}

function formatDayList(isos: string[]): string {
  const shown = isos.slice(0, 3).map(formatShortDay).join(", ");
  return isos.length > 3 ? `${shown} +${isos.length - 3} more` : shown;
}

export function formatDailyLimits(producer: Producer): string {
  const parts: string[] = [];
  if (producer.maxMixesPerDay != null) {
    parts.push(`${mixesLabel(producer.maxMixesPerDay)}/day max`);
  }
  if (producer.maxProducerCostPerDay != null) {
    parts.push(`${formatUsd(producer.maxProducerCostPerDay)}/day cost cap`);
  }
  if (parts.length === 0) return "No daily limits";
  return parts.join(" · ");
}

/** Why assigning this mix is not recommended; empty when it stays within limits. */
export function describeDailyLimitIssues(check: DailyLimitCheck): string[] {
  const issues: string[] = [];
  if (check.maxMixesPerDay != null && check.overMixDays.length > 0) {
    issues.push(
      `Goes over ${mixesLabel(check.maxMixesPerDay)}/day on ${formatDayList(check.overMixDays)}`
    );
  }
  if (check.maxCostPerDay != null && check.overCostDays.length > 0) {
    const cap = `${formatUsd(check.maxCostPerDay)}/day cost cap`;
    issues.push(
      check.newMixCost != null
        ? `Goes over the ${cap} on ${formatDayList(check.overCostDays)}`
        : `Already at the ${cap} on ${formatDayList(check.overCostDays)}`
    );
  }
  return issues;
}

export type DailyLimitUsageLine = {
  label: string;
  value: string;
  over: boolean;
};

/** Load on the busiest working day of the mix range, with this mix added. */
export function describeDailyLimitUsage(
  check: DailyLimitCheck
): DailyLimitUsageLine[] {
  const lines: DailyLimitUsageLine[] = [];

  if (check.maxMixesPerDay != null) {
    const booked = check.peakMixDay?.bookedMixes ?? 0;
    const busiest =
      check.peakMixDay && booked > 0
        ? ` · busiest ${formatShortDay(check.peakMixDay.iso)}`
        : "";
    lines.push({
      label: "Mixes per day",
      value: `${booked} booked + 1 this mix = ${booked + 1}/${check.maxMixesPerDay}${busiest}`,
      over: check.overMixDays.length > 0,
    });
  }

  if (check.maxCostPerDay != null) {
    const booked = check.peakCostDay?.bookedCost ?? 0;
    const busiest =
      check.peakCostDay && booked > 0
        ? ` · busiest ${formatShortDay(check.peakCostDay.iso)}`
        : "";
    const cap = formatUsd(check.maxCostPerDay);
    const thisMixDaily = check.newMixDailyCost ?? check.newMixCost;
    lines.push({
      label: "Cost per day",
      value:
        thisMixDaily != null
          ? `${formatUsd(booked)} booked + ${formatUsd(thisMixDaily)} this mix/day = ${formatUsd(booked + thisMixDaily)}/${cap}${busiest}`
          : `${formatUsd(booked)}/${cap} booked${busiest} · this mix's payout is set in payroll`,
      over: check.overCostDays.length > 0,
    });
  }

  return lines;
}

export type MixDateDayTone = "leave" | "limit" | "mix" | "extra";

export type MixDateCalendarRules = {
  isDateDisabled: (iso: string) => boolean;
  dayTitle: (iso: string) => string | undefined;
  dayTone: (iso: string) => MixDateDayTone | undefined;
};

export type MixDateCalendarOptions = DailyCostOptions & {
  /** Without a producer only past days are blocked. */
  producer?: Producer | null;
  /** Bookings used for pink mix days and daily-limit flags. */
  mtdRecords?: MTDRecord[];
  excludeRecordId?: string;
  todayIso?: string;
  /** Completed mixes keep their historical dates editable. */
  allowPastDays?: boolean;
};

type MixDateDayInfo = {
  disabled: boolean;
  title?: string;
  tone?: MixDateDayTone;
};

function mixBookingsOnDay(
  producer: Producer,
  iso: string,
  mtdRecords: MTDRecord[] | undefined,
  excludeRecordId?: string,
  categoryMatch?: Pick<DailyCostOptions, "matchCategory" | "matchFormType"> | null
) {
  if (!mtdRecords?.length) return [];
  return listProducerMixBookingsOnDay(
    producer,
    iso,
    mtdRecords,
    categoryMatch
  ).filter((b) => b.recordId !== excludeRecordId);
}

/**
 * Fingerprint of schedule fields the mix calendars paint from.
 * Used so leave / Extra days / work-day edits rebuild rules immediately.
 */
export function producerScheduleFingerprint(
  producer: Producer | null | undefined,
  mtdRecords?: MTDRecord[],
  excludeRecordId?: string
): string {
  if (!producer) return "none";
  const leave = (producer.timeOff ?? [])
    .map(
      (off) =>
        `${off.startDate}:${off.endDate || off.startDate}:${off.reason ?? ""}`
    )
    .join("|");
  const ot = (producer.extraDays ?? []).join(",");
  const work = (producer.workDays ?? []).join(",");
  const key = producerAssignmentKeyForFingerprint(producer);
  const bookings = (mtdRecords ?? [])
    .filter((rec) => {
      if (excludeRecordId && rec.id === excludeRecordId) return false;
      if (!rec.assignedProducer?.trim()) return false;
      return true;
    })
    .map(
      (rec) =>
        `${rec.id}:${rec.assignedProducer}:${rec.mixStartDate ?? ""}:${rec.mixEndDate ?? ""}:${rec.status ?? ""}:${rec.inPayroll ? 1 : 0}`
    )
    .join("|");
  return `${producer.id}:${key}:${work}:${ot}:${leave}:${bookings}`;
}

function producerAssignmentKeyForFingerprint(producer: Producer): string {
  return (
    producer.initials?.trim().toUpperCase() ||
    producer.name?.trim().toUpperCase() ||
    producer.id
  );
}

/**
 * Day rules for mix start/end calendars: only work + Extra days are
 * pickable; leave is shown (blocked); other mixes for this producer are
 * pink with a tooltip listing each mix name and date range.
 *
 * No per-day memo cache — schedule edits must repaint every cell instantly.
 */
export function buildMixDateCalendarRules(
  options: MixDateCalendarOptions
): MixDateCalendarRules {
  const todayIso = options.todayIso ?? dateToIsoLocal(new Date());
  const { producer } = options;
  const name = producer?.name?.trim().split(/\s+/)[0] || "Producer";
  const hasLimits =
    producer?.maxMixesPerDay != null || producer?.maxProducerCostPerDay != null;

  const categoryMatch = {
    matchCategory: options.matchCategory,
    matchFormType: options.matchFormType,
  };

  function limitParts(iso: string): string[] {
    if (!hasLimits || !producer || !options.mtdRecords) return [];
    const check = checkProducerDailyLimits(producer, iso, iso, options.mtdRecords, {
      excludeRecordId: options.excludeRecordId,
      estimateCost: options.estimateCost,
      newMixCost: options.newMixCost,
      matchCategory: options.matchCategory,
      matchFormType: options.matchFormType,
    });
    const parts: string[] = [];
    if (check.overCostDays.length > 0 && check.maxCostPerDay != null) {
      parts.push(
        `${formatUsd(check.peakCostDay?.bookedCost ?? 0)}/${formatUsd(check.maxCostPerDay)} booked`
      );
    }
    return parts;
  }

  function compute(iso: string): MixDateDayInfo {
    if (!options.allowPastDays && iso < todayIso) {
      return { disabled: true, title: "Past day" };
    }
    if (!producer) return { disabled: false };
    const day = parseFlexibleDate(iso);
    if (!day) return { disabled: true };

    const reason = getProducerDayBlockReason(producer, day);
    // Non-work days are not Extra days and don't carry daily mix cost — don't
    // paint mix bookings here just because the mix date range spans the weekend.
    if (reason === "not_working") {
      return { disabled: true, title: `${name} doesn't work this day` };
    }

    // Same category/subcategory mixes paint on work + Extra days only
    // (no 50% filter — that threshold is only for the daily-limits graph).
    const bookings = mixBookingsOnDay(
      producer,
      iso,
      options.mtdRecords,
      options.excludeRecordId,
      categoryMatch
    );
    const mixTip = describeProducerMixDayForLeave(bookings);

    if (reason === "leave") {
      const entry = (producer.timeOff ?? []).find(
        (off) => iso >= off.startDate && iso <= (off.endDate || off.startDate)
      );
      const leaveLine = `${name} off${
        entry?.reason?.trim() ? ` · ${entry.reason.trim()}` : ""
      }`;
      return {
        disabled: true,
        tone: "leave",
        title: mixTip ? `${leaveLine}\n\n${mixTip}` : leaveLine,
      };
    }

    const isExtra = isProducerExtraDay(producer, day);
    const limits = limitParts(iso);

    if (bookings.length > 0 && mixTip) {
      const lines = [mixTip];
      if (isExtra) lines.push("Extra day");
      if (limits.length > 0) lines.push(limits.join(" · "));
      return {
        disabled: false,
        tone: "mix",
        title: lines.join("\n"),
      };
    }

    if (isExtra) {
      const lines = ["Extra day"];
      if (limits.length > 0) lines.push(limits.join(" · "));
      return {
        disabled: false,
        tone: limits.length > 0 ? "limit" : "extra",
        title: lines.join("\n"),
      };
    }

    if (limits.length > 0) {
      return {
        disabled: false,
        tone: "limit",
        title: limits.join(" · "),
      };
    }

    return { disabled: false };
  }

  return {
    isDateDisabled: (iso) => compute(iso).disabled,
    dayTitle: (iso) => compute(iso).title,
    dayTone: (iso) => compute(iso).tone,
  };
}
