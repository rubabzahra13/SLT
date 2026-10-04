import {
  effectiveWorkDays,
  expandTimeOffDates,
  findLeaveMixConflicts,
  formatLeaveDateLabel,
  isEligibleExtraDate,
  extraDatesInRange,
  timeOffRangeCoversWorkDay,
} from "@/lib/producer-availability";
import type { MTDRecord, Producer, ProducerTimeOff, Weekday } from "@/types";

export type TimeOffAssigneeStatus =
  | "apply"
  | "already"
  | "nonwork"
  | "extra"
  | "mix";

export type TimeOffAssigneePreview = {
  id: string;
  name: string;
  status: TimeOffAssigneeStatus;
  extraDates: string[];
  /** Program names of Ongoing mixes that overlap the leave range. */
  mixLabels?: string[];
};

export function previewTimeOffAssignees(
  producers: Producer[],
  options: {
    startDate: string;
    endDate: string;
    type: "holiday" | "personal";
    reason: string;
    selectedIds: ReadonlySet<string>;
    mtdRecords?: MTDRecord[];
  }
): TimeOffAssigneePreview[] {
  const end = options.endDate || options.startDate;
  const reason = options.reason.trim();
  const records = options.mtdRecords ?? [];
  const rows: TimeOffAssigneePreview[] = [];

  for (const producer of producers) {
    if (!options.selectedIds.has(producer.id)) continue;

    if (
      options.type === "personal" &&
      producer.timeOff.some(
        (entry) =>
          entry.type === "personal" &&
          entry.reason.trim().toLowerCase() === reason.toLowerCase() &&
          entry.startDate === options.startDate &&
          (entry.endDate || entry.startDate) === end
      )
    ) {
      rows.push({
        id: producer.id,
        name: producer.name,
        status: "already",
        extraDates: [],
      });
      continue;
    }

    const mixConflicts = findLeaveMixConflicts(
      producer,
      options.startDate,
      end,
      records
    );
    if (mixConflicts.length > 0) {
      rows.push({
        id: producer.id,
        name: producer.name,
        status: "mix",
        extraDates: [],
        mixLabels: mixConflicts.map((m) => m.programName),
      });
      continue;
    }

    const otDates = extraDatesInRange(
      producer.extraDays,
      options.startDate,
      end
    );
    if (otDates.length > 0) {
      rows.push({
        id: producer.id,
        name: producer.name,
        status: "extra",
        extraDates: otDates,
      });
      continue;
    }

    if (
      !timeOffRangeCoversWorkDay(options.startDate, end, producer.workDays)
    ) {
      rows.push({
        id: producer.id,
        name: producer.name,
        status: "nonwork",
        extraDates: [],
      });
      continue;
    }

    rows.push({
      id: producer.id,
      name: producer.name,
      status: "apply",
      extraDates: [],
    });
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export function buildTimeOffEntry(
  options: {
    startDate: string;
    endDate: string;
    type: "holiday" | "personal";
    reason: string;
    producerId: string;
  }
): ProducerTimeOff {
  return {
    id: `to-${options.producerId}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 6)}`,
    startDate: options.startDate,
    endDate: options.endDate || options.startDate,
    type: options.type,
    reason: options.reason.trim(),
  };
}

export type UpcomingTimeOffRow = {
  key: string;
  producerId: string;
  producerName: string;
  entry: ProducerTimeOff;
};

export function listUpcomingTimeOff(
  producers: Producer[],
  fromIso: string
): UpcomingTimeOffRow[] {
  const rows: UpcomingTimeOffRow[] = [];
  for (const producer of producers) {
    for (const entry of producer.timeOff) {
      const end = entry.endDate || entry.startDate;
      if (end < fromIso) continue;
      rows.push({
        key: `${producer.id}:${entry.id}`,
        producerId: producer.id,
        producerName: producer.name,
        entry,
      });
    }
  }
  return rows.sort((a, b) => {
    const byStart = a.entry.startDate.localeCompare(b.entry.startDate);
    if (byStart !== 0) return byStart;
    return a.producerName.localeCompare(b.producerName);
  });
}

export function formatTimeOffRangeLabel(
  entry: ProducerTimeOff,
  workDays?: Weekday[]
): string {
  if (workDays && workDays.length > 0) {
    return formatLeaveDateLabel(entry.startDate, entry.endDate, workDays);
  }
  if (entry.startDate === entry.endDate) return entry.startDate;
  return `${entry.startDate} → ${entry.endDate}`;
}

export type ExtraDayAssigneeStatus = "apply" | "already" | "workday" | "timeoff";

export type ExtraDayAssigneePreview = {
  id: string;
  name: string;
  status: ExtraDayAssigneeStatus;
};

function isoToLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function previewExtraDayAssignees(
  producers: Producer[],
  options: { dateIso: string; selectedIds: ReadonlySet<string> }
): ExtraDayAssigneePreview[] {
  const dateIso = options.dateIso.trim();
  const rows: ExtraDayAssigneePreview[] = [];

  for (const producer of producers) {
    if (!options.selectedIds.has(producer.id)) continue;

    if (producer.extraDays.includes(dateIso)) {
      rows.push({
        id: producer.id,
        name: producer.name,
        status: "already",
      });
      continue;
    }

    const workDays = effectiveWorkDays(producer);
    const date = isoToLocalDate(dateIso);
    if (!isEligibleExtraDate(date, workDays)) {
      rows.push({
        id: producer.id,
        name: producer.name,
        status: "workday",
      });
      continue;
    }

    const timeOffDays = expandTimeOffDates(producer.timeOff);
    if (timeOffDays.includes(dateIso)) {
      rows.push({
        id: producer.id,
        name: producer.name,
        status: "timeoff",
      });
      continue;
    }

    rows.push({
      id: producer.id,
      name: producer.name,
      status: "apply",
    });
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export type UpcomingExtraDayRow = {
  key: string;
  producerId: string;
  producerName: string;
  iso: string;
};

export function listUpcomingExtraDays(
  producers: Producer[],
  fromIso: string
): UpcomingExtraDayRow[] {
  const rows: UpcomingExtraDayRow[] = [];
  for (const producer of producers) {
    for (const iso of producer.extraDays) {
      if (iso < fromIso) continue;
      rows.push({
        key: `${producer.id}:${iso}`,
        producerId: producer.id,
        producerName: producer.name,
        iso,
      });
    }
  }
  return rows.sort((a, b) => {
    const byDate = a.iso.localeCompare(b.iso);
    if (byDate !== 0) return byDate;
    return a.producerName.localeCompare(b.producerName);
  });
}

export function formatExtraDayLabel(iso: string): string {
  const date = isoToLocalDate(iso);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export type ExtraDayCalendarBlockReason = "past" | "time_off" | "none";

export function extraDayCalendarBlockReason(
  iso: string,
  options: {
    todayIso: string;
    producers: Producer[];
    selectedIds: ReadonlySet<string>;
  }
): ExtraDayCalendarBlockReason {
  if (iso < options.todayIso) return "past";
  const selected = options.producers.filter((p) =>
    options.selectedIds.has(p.id)
  );

  if (selected.length === 0) return "none";

  const someoneOnTimeOff = selected.some((p) =>
    expandTimeOffDates(p.timeOff).includes(iso)
  );
  if (someoneOnTimeOff) return "time_off";

  return "none";
}

export function isExtraDayCalendarDateDisabled(
  iso: string,
  options: Parameters<typeof extraDayCalendarBlockReason>[1]
): boolean {
  const reason = extraDayCalendarBlockReason(iso, options);
  return reason === "past" || reason === "time_off";
}

export function extraDayCalendarDayTitle(
  iso: string,
  options: Parameters<typeof extraDayCalendarBlockReason>[1]
): string | undefined {
  const reason = extraDayCalendarBlockReason(iso, options);
  if (reason === "past") return "Past day";
  if (reason === "time_off") return "Cancel off day to add an extra day";
  return undefined;
}
