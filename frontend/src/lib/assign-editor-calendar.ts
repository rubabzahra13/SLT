import { parseFlexibleDate } from "@/lib/dates";
import {
  checkProducerDailyLimits,
  dateToIsoLocal,
  effectiveWorkDays,
  getProducerDayBlockReason,
  isProducerWorkDay,
  isProducerOvertimeDay,
  toDayStart,
  type DailyCostOptions,
  type DailyLimitCheck,
} from "@/lib/producer-availability";
import {
  expandStudioHolidayDatesForYear,
  holidayAppliesToProducer,
  studioHolidayNamesForIso,
  type StudioHoliday,
} from "@/lib/producer-time-off";
import type { MTDRecord, Producer } from "@/types";

export type AssignCalendarEventKind =
  | "studio_holiday"
  | "leave"
  | "overtime"
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

function studioHolidayDatesInRange(
  startIso: string,
  endIso: string,
  holidays: StudioHoliday[],
  producerId?: string
): AssignCalendarEvent[] {
  const days = eachIsoDayInRange(startIso, endIso);
  if (days.length === 0) return [];

  const years = new Set<number>();
  for (const iso of days) years.add(Number(iso.slice(0, 4)));

  const holidayDates = new Map<string, string[]>();
  for (const holiday of holidays) {
    if (producerId && !holidayAppliesToProducer(holiday, producerId)) continue;
    if (!producerId && holiday.appliesToAll === false) continue;

    for (const year of years) {
      for (const iso of expandStudioHolidayDatesForYear(holiday, year)) {
        if (iso < startIso || iso > endIso) continue;
        const list = holidayDates.get(iso) ?? [];
        if (!list.includes(holiday.name)) list.push(holiday.name);
        holidayDates.set(iso, list);
      }
    }
  }

  const events: AssignCalendarEvent[] = [];
  for (const [iso, names] of holidayDates) {
    events.push({
      iso,
      kind: "studio_holiday",
      label: names.join(", "),
    });
  }
  return events;
}

/**
 * Transparent calendar context while picking mix dates.
 * Without a producer: studio-wide holidays only.
 * With a producer: their holidays, leave, overtime, and non-work days in range.
 */
export function collectAssignCalendarEvents(
  startIso: string,
  endIso: string,
  studioHolidays: StudioHoliday[],
  producer?: Producer | null
): AssignCalendarEvent[] {
  const end = endIso || startIso;
  const events: AssignCalendarEvent[] = [
    ...studioHolidayDatesInRange(
      startIso,
      end,
      studioHolidays,
      producer?.id
    ),
  ];

  if (!producer) {
    return events.sort((a, b) => a.iso.localeCompare(b.iso));
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
        label: entry.reason?.trim() || "Time off",
      });
    }
  }

  for (const iso of producer.overtimeDays ?? []) {
    if (iso < startIso || iso > end) continue;
    events.push({
      iso,
      kind: "overtime",
      label: "Extra day",
    });
  }

  for (const iso of eachIsoDayInRange(startIso, end)) {
    const d = parseFlexibleDate(iso);
    if (!d) continue;
    if (isProducerWorkDay(producer, d) || isProducerOvertimeDay(producer, d)) {
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
    lines.push({
      label: "Cost per day",
      value:
        check.newMixCost != null
          ? `${formatUsd(booked)} booked + ${formatUsd(check.newMixCost)} this mix = ${formatUsd(booked + check.newMixCost)}/${cap}${busiest}`
          : `${formatUsd(booked)}/${cap} booked${busiest} · this mix's payout is set in payroll`,
      over: check.overCostDays.length > 0,
    });
  }

  return lines;
}

export type MixDateDayTone = "holiday" | "leave" | "limit";

export type MixDateCalendarRules = {
  isDateDisabled: (iso: string) => boolean;
  dayTitle: (iso: string) => string | undefined;
  dayTone: (iso: string) => MixDateDayTone | undefined;
};

export type MixDateCalendarOptions = DailyCostOptions & {
  /** Without a producer only past days are blocked. */
  producer?: Producer | null;
  studioHolidays?: StudioHoliday[];
  /** Bookings used to flag days at a daily limit; those stay pickable. */
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

/**
 * Day rules for mix start/end calendars: past days and days the producer
 * can't work are blocked; days at a daily limit stay pickable but flagged.
 */
export function buildMixDateCalendarRules(
  options: MixDateCalendarOptions
): MixDateCalendarRules {
  const todayIso = options.todayIso ?? dateToIsoLocal(new Date());
  const { producer } = options;
  const name = producer?.name?.trim().split(/\s+/)[0] || "Producer";
  const hasLimits =
    producer?.maxMixesPerDay != null || producer?.maxProducerCostPerDay != null;
  const cache = new Map<string, MixDateDayInfo>();

  function compute(iso: string): MixDateDayInfo {
    if (!options.allowPastDays && iso < todayIso) {
      return { disabled: true, title: "Past day" };
    }
    if (!producer) return { disabled: false };
    const day = parseFlexibleDate(iso);
    if (!day) return { disabled: true };

    const reason = getProducerDayBlockReason(producer, day, options.studioHolidays);
    if (reason === "not_working") {
      return { disabled: true, title: `${name} doesn't work this day` };
    }
    if (reason === "holiday") {
      const names = studioHolidayNamesForIso(
        iso,
        options.studioHolidays ?? [],
        producer.id
      );
      return {
        disabled: true,
        tone: "holiday",
        title: `Studio holiday · ${names.join(", ") || "Holiday"}`,
      };
    }
    if (reason === "leave") {
      const entry = (producer.timeOff ?? []).find(
        (off) => iso >= off.startDate && iso <= (off.endDate || off.startDate)
      );
      return {
        disabled: true,
        tone: "leave",
        title: `${name} on leave${entry?.reason?.trim() ? ` · ${entry.reason.trim()}` : ""}`,
      };
    }

    if (hasLimits && options.mtdRecords) {
      const check = checkProducerDailyLimits(producer, iso, iso, options.mtdRecords, {
        excludeRecordId: options.excludeRecordId,
        estimateCost: options.estimateCost,
        newMixCost: options.newMixCost,
        studioHolidays: options.studioHolidays,
      });
      const parts: string[] = [];
      if (check.overMixDays.length > 0 && check.maxMixesPerDay != null) {
        parts.push(
          `${check.peakMixDay?.bookedMixes ?? 0}/${check.maxMixesPerDay} mixes booked`
        );
      }
      if (check.overCostDays.length > 0 && check.maxCostPerDay != null) {
        parts.push(
          `${formatUsd(check.peakCostDay?.bookedCost ?? 0)}/${formatUsd(check.maxCostPerDay)} booked`
        );
      }
      if (parts.length > 0) {
        return {
          disabled: false,
          tone: "limit",
          title: `Not recommended · ${parts.join(" · ")}`,
        };
      }
    }

    return { disabled: false };
  }

  function describe(iso: string): MixDateDayInfo {
    let info = cache.get(iso);
    if (!info) {
      info = compute(iso);
      cache.set(iso, info);
    }
    return info;
  }

  return {
    isDateDisabled: (iso) => describe(iso).disabled,
    dayTitle: (iso) => describe(iso).title,
    dayTone: (iso) => describe(iso).tone,
  };
}
