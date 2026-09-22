import {
  effectiveWorkDays,
  expandTimeOffDates,
  isEligibleOvertimeDate,
  overtimeDatesInRange,
  timeOffRangeCoversWorkDay,
} from "@/lib/producer-availability";
import { producerHasHoliday } from "@/lib/producer-time-off";
import {
  isStudioHolidayIso,
  type StudioHoliday,
} from "@/lib/producer-time-off";
import type { Producer, ProducerTimeOff } from "@/types";

export type TimeOffAssigneeStatus =
  | "apply"
  | "already"
  | "nonwork"
  | "overtime";

export type TimeOffAssigneePreview = {
  id: string;
  name: string;
  status: TimeOffAssigneeStatus;
  overtimeDates: string[];
};

export function previewTimeOffAssignees(
  producers: Producer[],
  options: {
    startDate: string;
    endDate: string;
    type: "holiday" | "personal";
    reason: string;
    selectedIds: ReadonlySet<string>;
  }
): TimeOffAssigneePreview[] {
  const end = options.endDate || options.startDate;
  const reason = options.reason.trim();
  const rows: TimeOffAssigneePreview[] = [];

  for (const producer of producers) {
    if (!options.selectedIds.has(producer.id)) continue;

    if (options.type === "holiday" && producerHasHoliday(producer, reason)) {
      rows.push({
        id: producer.id,
        name: producer.name,
        status: "already",
        overtimeDates: [],
      });
      continue;
    }

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
        overtimeDates: [],
      });
      continue;
    }

    const otDates = overtimeDatesInRange(
      producer.overtimeDays,
      options.startDate,
      end
    );
    if (otDates.length > 0) {
      rows.push({
        id: producer.id,
        name: producer.name,
        status: "overtime",
        overtimeDates: otDates,
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
        overtimeDates: [],
      });
      continue;
    }

    rows.push({
      id: producer.id,
      name: producer.name,
      status: "apply",
      overtimeDates: [],
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

export function formatTimeOffRangeLabel(entry: ProducerTimeOff): string {
  if (entry.startDate === entry.endDate) return entry.startDate;
  return `${entry.startDate} → ${entry.endDate}`;
}

export type OvertimeAssigneeStatus = "apply" | "already" | "workday" | "timeoff";

export type OvertimeAssigneePreview = {
  id: string;
  name: string;
  status: OvertimeAssigneeStatus;
};

function isoToLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function previewOvertimeAssignees(
  producers: Producer[],
  options: { dateIso: string; selectedIds: ReadonlySet<string> }
): OvertimeAssigneePreview[] {
  const dateIso = options.dateIso.trim();
  const rows: OvertimeAssigneePreview[] = [];

  for (const producer of producers) {
    if (!options.selectedIds.has(producer.id)) continue;

    if (producer.overtimeDays.includes(dateIso)) {
      rows.push({
        id: producer.id,
        name: producer.name,
        status: "already",
      });
      continue;
    }

    const workDays = effectiveWorkDays(producer);
    const date = isoToLocalDate(dateIso);
    if (!isEligibleOvertimeDate(date, workDays)) {
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

export type UpcomingOvertimeRow = {
  key: string;
  producerId: string;
  producerName: string;
  iso: string;
};

export function listUpcomingOvertime(
  producers: Producer[],
  fromIso: string
): UpcomingOvertimeRow[] {
  const rows: UpcomingOvertimeRow[] = [];
  for (const producer of producers) {
    for (const iso of producer.overtimeDays) {
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

export function formatOvertimeDayLabel(iso: string): string {
  const date = isoToLocalDate(iso);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export type OvertimeCalendarBlockReason =
  | "past"
  | "studio_holiday"
  | "time_off"
  | "none";

export function overtimeCalendarBlockReason(
  iso: string,
  options: {
    todayIso: string;
    studioHolidays: StudioHoliday[];
    producers: Producer[];
    selectedIds: ReadonlySet<string>;
  }
): OvertimeCalendarBlockReason {
  if (iso < options.todayIso) return "past";
  const selected = options.producers.filter((p) =>
    options.selectedIds.has(p.id)
  );
  const holidayHitsSelected =
    selected.length === 0
      ? isStudioHolidayIso(iso, options.studioHolidays)
      : selected.some((p) =>
          isStudioHolidayIso(iso, options.studioHolidays, p.id)
        );
  if (holidayHitsSelected) return "studio_holiday";

  if (selected.length === 0) return "none";

  const someoneOnTimeOff = selected.some((p) =>
    expandTimeOffDates(p.timeOff).includes(iso)
  );
  if (someoneOnTimeOff) return "time_off";

  return "none";
}

export function isOvertimeCalendarDateDisabled(
  iso: string,
  options: Parameters<typeof overtimeCalendarBlockReason>[1]
): boolean {
  const reason = overtimeCalendarBlockReason(iso, options);
  return reason === "past" || reason === "studio_holiday" || reason === "time_off";
}

export function overtimeCalendarDayTitle(
  iso: string,
  options: Parameters<typeof overtimeCalendarBlockReason>[1]
): string | undefined {
  const reason = overtimeCalendarBlockReason(iso, options);
  if (reason === "past") return "Past day";
  if (reason === "studio_holiday") return "Studio holiday\nNot available";
  if (reason === "time_off") return "Holiday or personal time off";
  return undefined;
}
