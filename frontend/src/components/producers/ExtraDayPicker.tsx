"use client";

import { useMemo } from "react";
import {
  DayCalendarPicker,
  isoFromLocalDate,
  parseIsoToLocalDate,
} from "@/components/ui/DayCalendarPicker";
import { isEligibleExtraDate } from "@/lib/producer-availability";
import type { Weekday } from "@/types";

type ExtraDayPickerProps = {
  open: boolean;
  onClose: () => void;
  workDays: Weekday[];
  selectedDays: string[];
  onSelect: (iso: string) => void;
  /** Anchor used for fixed positioning (Add day button / header). */
  excludeRef?: React.RefObject<HTMLElement | null>;
  /** Work-day Off days already scheduled for this producer. */
  blockedTimeOffDays?: string[];
  /** Days with an ongoing mix — not available as Extra days. */
  mixBlockedDays?: string[];
};

export function ExtraDayPicker({
  open,
  onClose,
  workDays,
  selectedDays,
  onSelect,
  excludeRef,
  blockedTimeOffDays = [],
  mixBlockedDays = [],
}: ExtraDayPickerProps) {
  const todayIso = isoFromLocalDate(new Date());
  // Current year + next year, through December.
  const maxIso = `${Number(todayIso.slice(0, 4)) + 1}-12-31`;
  const selectedSet = useMemo(() => new Set(selectedDays), [selectedDays]);
  const timeOffSet = useMemo(
    () => new Set(blockedTimeOffDays),
    [blockedTimeOffDays]
  );
  const mixSet = useMemo(() => new Set(mixBlockedDays), [mixBlockedDays]);
  const offDayCount = 7 - workDays.length;

  function isDateDisabled(iso: string): boolean {
    const date = parseIsoToLocalDate(iso);
    if (!date) return true;
    if (iso < todayIso) return true;
    // Work days are never OT.
    if (!isEligibleExtraDate(date, workDays)) return true;
    if (timeOffSet.has(iso)) return true;
    if (mixSet.has(iso)) return true;
    if (selectedSet.has(iso)) return true;
    return false;
  }

  function dayTitle(iso: string, disabled: boolean): string | undefined {
    if (iso < todayIso) return "Past day";
    if (!disabled) return `Add ${iso} as an extra day`;
    const date = parseIsoToLocalDate(iso);
    if (mixSet.has(iso)) return "Mix on this day\nNot available as an extra day";
    if (timeOffSet.has(iso) || (date && !isEligibleExtraDate(date, workDays))) {
      return "Not a working day";
    }
    if (selectedSet.has(iso)) return "Already added";
    return undefined;
  }

  function dayTone(
    iso: string,
    disabled: boolean
  ): "extra" | "leave" | "mix" | undefined {
    if (!disabled || iso < todayIso) return undefined;
    if (mixSet.has(iso)) return "mix";
    // Leave UI on scheduled work days that are already Off days.
    if (timeOffSet.has(iso)) return "leave";
    return undefined;
  }

  const todayDate = parseIsoToLocalDate(todayIso);
  const todayIsWorkDay =
    !!todayDate && !isEligibleExtraDate(todayDate, workDays);
  const todayAlreadyAdded = selectedSet.has(todayIso);
  const todayHasMix = mixSet.has(todayIso);
  const todayHasLeave = timeOffSet.has(todayIso);
  const todayDisabled = isDateDisabled(todayIso);
  const todayTitle = todayAlreadyAdded
    ? "Already added as an extra day"
    : todayHasMix
      ? "Mix on this day\nNot available as an extra day"
      : todayIsWorkDay || todayHasLeave
        ? "Not a working day"
        : todayDisabled
          ? "Not available as an extra day"
          : "Add today as an extra day";

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
          ? "Every weekday is already a regular work day. Turn one off above to add an extra day."
          : null
      }
      footer={
        <button
          type="button"
          onClick={() => {
            if (todayDisabled) return;
            onSelect(todayIso);
            onClose();
          }}
          disabled={todayDisabled}
          title={todayTitle}
          className="rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-signature transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Today
        </button>
      }
    />
  );
}
