"use client";

import { useMemo } from "react";
import {
  DayCalendarPicker,
  addDaysToIso,
  isoFromLocalDate,
  parseIsoToLocalDate,
} from "@/components/ui/DayCalendarPicker";
import { isEligibleOvertimeDate } from "@/lib/producer-availability";
import {
  isStudioHolidayIso,
  studioHolidayIsoSetInRange,
  studioHolidayNamesForIso,
  type StudioHoliday,
} from "@/lib/producer-time-off";
import type { Weekday } from "@/types";

type LeaveBlock = {
  startDate: string;
  endDate?: string | null;
  reason?: string | null;
};

type OvertimeDayPickerProps = {
  open: boolean;
  onClose: () => void;
  workDays: Weekday[];
  selectedDays: string[];
  onSelect: (iso: string) => void;
  /** Anchor used for fixed positioning (Add day button / header). */
  excludeRef?: React.RefObject<HTMLElement | null>;
  /** Dates already marked as holiday or personal time off for this producer. */
  blockedTimeOffDays?: string[];
  /** Personal leave entries — used for leave-name tooltips on blocked days. */
  leaveEntries?: LeaveBlock[];
  studioHolidays?: StudioHoliday[];
  /** When set, only holidays that apply to this producer block dates. */
  producerId?: string;
};

function leaveReasonsByIso(entries: LeaveBlock[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const entry of entries) {
    const reason = (entry.reason || "").trim() || "Leave";
    const start = entry.startDate;
    const end = entry.endDate || entry.startDate;
    if (!start) continue;
    let cursor = start;
    let guard = 0;
    while (cursor <= end && guard < 400) {
      const list = map.get(cursor) ?? [];
      if (!list.includes(reason)) list.push(reason);
      map.set(cursor, list);
      cursor = addDaysToIso(cursor, 1);
      guard += 1;
    }
  }
  return map;
}

export function OvertimeDayPicker({
  open,
  onClose,
  workDays,
  selectedDays,
  onSelect,
  excludeRef,
  blockedTimeOffDays = [],
  leaveEntries = [],
  studioHolidays = [],
  producerId,
}: OvertimeDayPickerProps) {
  const todayIso = isoFromLocalDate(new Date());
  // Current year + next year, through December.
  const maxIso = `${Number(todayIso.slice(0, 4)) + 1}-12-31`;
  const selectedSet = useMemo(() => new Set(selectedDays), [selectedDays]);
  const timeOffSet = useMemo(
    () => new Set(blockedTimeOffDays),
    [blockedTimeOffDays]
  );
  const leaveReasonMap = useMemo(
    () => leaveReasonsByIso(leaveEntries),
    [leaveEntries]
  );
  const studioHolidaySet = useMemo(
    () =>
      studioHolidayIsoSetInRange(
        studioHolidays,
        todayIso,
        maxIso,
        producerId
      ),
    [studioHolidays, todayIso, maxIso, producerId]
  );
  const offDayCount = 7 - workDays.length;

  function isStudioHoliday(iso: string): boolean {
    return (
      studioHolidaySet.has(iso) ||
      isStudioHolidayIso(iso, studioHolidays, producerId)
    );
  }

  /** Leave / holiday only use OT-specific tips when the day is an off day. */
  function isOffDay(iso: string, date: Date): boolean {
    return isEligibleOvertimeDate(date, workDays);
  }

  function isHolidayOnOffDay(iso: string, date: Date): boolean {
    return isStudioHoliday(iso) && isOffDay(iso, date);
  }

  function isLeaveOnOffDay(iso: string, date: Date): boolean {
    return timeOffSet.has(iso) && isOffDay(iso, date);
  }

  function isDateDisabled(iso: string): boolean {
    const date = parseIsoToLocalDate(iso);
    if (!date) return true;
    if (iso < todayIso) return true;
    // Work days are never OT (leave may exist there — still just a work day).
    if (!isEligibleOvertimeDate(date, workDays)) return true;
    // Leave shouldn't land on off days; if it does, it blocks OT.
    if (isLeaveOnOffDay(iso, date)) return true;
    if (isHolidayOnOffDay(iso, date)) return true;
    if (selectedSet.has(iso)) return true;
    return false;
  }

  function dayTitle(iso: string, disabled: boolean): string | undefined {
    if (iso < todayIso) return "Past day";
    if (!disabled) return `Add ${iso} as overtime`;
    const date = parseIsoToLocalDate(iso);
    if (date && !isEligibleOvertimeDate(date, workDays)) {
      return "Regular work day\nNot overtime";
    }
    if (date && isLeaveOnOffDay(iso, date)) {
      const reasons = leaveReasonMap.get(iso);
      const name =
        reasons && reasons.length > 0 ? reasons.join(", ") : "Leave";
      return `${name}\nCancel leave to mark overtime`;
    }
    if (date && isHolidayOnOffDay(iso, date)) {
      const names = studioHolidayNamesForIso(iso, studioHolidays, producerId);
      if (names.length > 0) {
        return `${names.join(", ")}\nNot available for overtime`;
      }
      return "Studio holiday\nNot available";
    }
    if (selectedSet.has(iso)) return "Already added";
    return undefined;
  }

  function dayTone(
    iso: string,
    disabled: boolean
  ): "overtime" | "holiday" | "leave" | undefined {
    if (!disabled || iso < todayIso) return undefined;
    const date = parseIsoToLocalDate(iso);
    // Leave is work-day-only; never tint off days as leave on the OT calendar.
    if (date && isLeaveOnOffDay(iso, date)) return "leave";
    if (isStudioHoliday(iso)) return "holiday";
    return undefined;
  }

  const todayDate = parseIsoToLocalDate(todayIso);
  const todayIsWorkDay =
    !!todayDate && !isEligibleOvertimeDate(todayDate, workDays);
  const todayAlreadyAdded = selectedSet.has(todayIso);
  const todayDisabled = isDateDisabled(todayIso);

  return (
    <DayCalendarPicker
      open={open}
      onClose={onClose}
      onSelect={onSelect}
      excludeRef={excludeRef}
      selectedDays={selectedDays}
      minIso={todayIso}
      maxIso={maxIso}
      isDateDisabled={isDateDisabled}
      dayTitle={dayTitle}
      dayTone={dayTone}
      emptyMessage={
        offDayCount <= 0
          ? "Every weekday is already a regular work day. Turn one off above to add overtime."
          : null
      }
      footer={
        todayIsWorkDay ? (
          <p className="px-1 text-[11px] font-medium text-brand-ink-tertiary">
            Today is already a work day. Choose a non-working day for overtime.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (todayDisabled) return;
              onSelect(todayIso);
              onClose();
            }}
            disabled={todayDisabled}
            title={
              todayAlreadyAdded
                ? "Already added as overtime"
                : todayDate && !isEligibleOvertimeDate(todayDate, workDays)
                  ? "Regular work day\nNot overtime"
                  : timeOffSet.has(todayIso)
                    ? `${(leaveReasonMap.get(todayIso) ?? ["Leave"]).join(", ")}\nCancel leave to mark overtime`
                    : todayDisabled
                      ? "Not available for overtime"
                      : "Add today as overtime"
            }
            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-signature transition hover:bg-white disabled:opacity-40"
          >
            Today
          </button>
        )
      }
    />
  );
}
