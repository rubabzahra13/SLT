"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CalendarPlus, ChevronDown, Minus, Pencil, Plus, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { ProducerCategoryAddMenu } from "@/components/producers/ProducerCategoryAddMenu";
import { OvertimeDayPicker } from "@/components/producers/OvertimeDayPicker";
import {
  DayCalendarPicker,
  addDaysToIso,
  isoFromLocalDate,
  parseIsoToLocalDate,
} from "@/components/ui/DayCalendarPicker";
import { SoftSelect } from "@/components/ui/SoftSelect";
import { useAppState } from "@/context/AppStateContext";
import {
  describeTimeOffOutsideWorkDaysParts,
  expandTimeOffDates,
  formatIsoDayMonthYear,
  formatSkippedProducerSummary,
  isEligibleOvertimeDate,
  isEligibleTimeOffDate,
  isTimeOffDateBlockedByOvertime,
  nextOvertimeOnOrAfter,
  overtimeDatesInRange,
  prevOvertimeOnOrBefore,
  timeOffRangeCoversWorkDay,
} from "@/lib/producer-availability";
import {
  defaultReasonForTimeOffType,
  isOtherPersonalReason,
  isStudioHolidayIso,
  OTHER_PERSONAL_REASON_NAME,
  reasonsForTimeOffType,
  resolveHolidayDatesForToday,
  studioHolidayNamesForIso,
  holidaysForProducer,
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
  danceVoiceoverRate?: number;
  cheerVoiceoverRate?: number;
  rushFeeRate?: number;
};

type ProducerAvailabilityModalProps = {
  open: boolean;
  onClose: () => void;
  producer: Producer | null;
  onSave: (patch: AvailabilityPatch) => void;
  readOnly?: boolean;
};

type DraftTimeOff = {
  key: string;
  startDate: string;
  endDate: string;
  type: "holiday" | "personal";
  reason: string;
};

type OtConflictRow = {
  id: string;
  name: string;
  overtimeDates: string[];
  cancelOvertime: boolean;
};

type TimeOffNotice =
  | {
      kind: "info";
      title: string;
      dateLine?: string;
      producerLine?: string;
      skippedNames?: string[];
      applyNames?: string[];
      totalProducers?: number;
    }
  | {
      kind: "ot-conflict";
      title: string;
      dateLine?: string;
      pendingEntry: DraftTimeOff;
      conflicts: OtConflictRow[];
    };

type AvailabilityTab = "schedule" | "leave" | "holidays" | "limit" | "category";

type WorkDayOtConflict = {
  day: Weekday;
  overtimeDates: string[];
};

type WorkDayLeaveConflict = {
  day: Weekday;
  leaveDates: string[];
};

/** OT dates that would be dropped if these work days became active. */
function overtimeDatesBlockedByWorkDays(
  overtimeDays: string[],
  nextWorkDays: Weekday[]
): string[] {
  return overtimeDays.filter((iso) => {
    const parts = iso.split("-").map(Number);
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return false;
    const [y, m, d] = parts;
    return !isEligibleOvertimeDate(new Date(y, m - 1, d), nextWorkDays);
  });
}

/** Leave dates that would no longer fall on a work day. */
function leaveDatesBlockedByWorkDays(
  entries: { startDate: string; endDate?: string | null }[],
  nextWorkDays: Weekday[]
): string[] {
  return [
    ...new Set(
      expandTimeOffDates(entries).filter((iso) => {
        const parts = iso.split("-").map(Number);
        if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
          return false;
        }
        const [y, m, d] = parts;
        return !isEligibleTimeOffDate(new Date(y, m - 1, d), nextWorkDays);
      })
    ),
  ].sort((a, b) => a.localeCompare(b));
}

/** Drop blocked dates from leave ranges; split into contiguous entries. */
function stripLeaveDatesFromEntries(
  entries: DraftTimeOff[],
  removeIso: string[]
): DraftTimeOff[] {
  const remove = new Set(removeIso);
  if (remove.size === 0) return entries;
  const next: DraftTimeOff[] = [];
  for (const entry of entries) {
    const kept = expandTimeOffDates([entry]).filter((iso) => !remove.has(iso));
    if (kept.length === 0) continue;
    let rangeStart = kept[0];
    let prev = kept[0];
    for (let i = 1; i < kept.length; i += 1) {
      const iso = kept[i];
      const expected = addDaysToIso(prev, 1);
      if (iso !== expected) {
        next.push({
          ...entry,
          key: `${entry.key}-${rangeStart}`,
          startDate: rangeStart,
          endDate: prev,
        });
        rangeStart = iso;
      }
      prev = iso;
    }
    next.push({
      ...entry,
      key: `${entry.key}-${rangeStart}`,
      startDate: rangeStart,
      endDate: prev,
    });
  }
  return next;
}

function weekdayLabel(day: Weekday): string {
  return WEEKDAYS.find((entry) => entry.id === day)?.label ?? day;
}

const OT_CONFLICT_ROW_PX = 44;
const OT_CONFLICT_GAP_PX = 8;
const OT_CONFLICT_VISIBLE_ROWS = 3;
const OT_CONFLICT_LIST_PX =
  OT_CONFLICT_VISIBLE_ROWS * OT_CONFLICT_ROW_PX +
  (OT_CONFLICT_VISIBLE_ROWS - 1) * OT_CONFLICT_GAP_PX;
const CATEGORY_RATE_LIST_PX = 224;

function CustomScrollRail({
  children,
  maxHeight,
  className,
  listClassName,
  fadeFromClassName = "from-brand-elevated",
  syncKey,
}: {
  children: ReactNode;
  maxHeight: number;
  className?: string;
  listClassName?: string;
  fadeFromClassName?: string;
  syncKey: unknown;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ top: 0, height: 0, show: false });
  const [atBottom, setAtBottom] = useState(false);

  function syncThumb() {
    const el = listRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight <= clientHeight + 1) {
      setAtBottom(true);
      setThumb((current) =>
        current.show ? { top: 0, height: 0, show: false } : current
      );
      return;
    }
    const height = Math.max(28, (clientHeight / scrollHeight) * clientHeight);
    const maxTop = clientHeight - height;
    const scrollable = scrollHeight - clientHeight;
    const top = (scrollable <= 0 ? 0 : scrollTop / scrollable) * maxTop;
    setThumb({ top, height, show: true });
    setAtBottom(scrollTop >= scrollable - 1);
  }

  useEffect(() => {
    syncThumb();
    const el = listRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => syncThumb());
    observer.observe(el);
    return () => observer.disconnect();
  }, [syncKey]);

  return (
    <div className={clsx("relative pr-3.5", className)}>
      <div
        ref={listRef}
        onScroll={syncThumb}
        className={clsx(
          "overflow-y-auto overscroll-contain scrollbar-hide",
          listClassName
        )}
        style={{ maxHeight }}
      >
        {children}
      </div>
      {thumb.show ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 right-0 top-0 w-2 rounded-full bg-black/10"
          >
            <div
              className="absolute inset-x-0 rounded-full bg-brand-ink/50"
              style={{
                height: thumb.height,
                transform: `translateY(${thumb.top}px)`,
              }}
            />
          </div>
          <div
            aria-hidden
            className={clsx(
              "pointer-events-none absolute inset-x-3.5 bottom-0 h-8 rounded-b-2xl bg-gradient-to-t to-transparent transition-opacity",
              fadeFromClassName,
              atBottom ? "opacity-0" : "opacity-100"
            )}
          />
        </>
      ) : null}
    </div>
  );
}

function WorkDayOtConflictDateList({ dates }: { dates: string[] }) {
  return (
    <CustomScrollRail
      className="mt-4"
      maxHeight={OT_CONFLICT_LIST_PX}
      listClassName="space-y-2"
      syncKey={dates.join("|")}
    >
      {dates.map((iso) => (
        <div
          key={iso}
          className="flex h-11 shrink-0 items-center rounded-2xl bg-brand-bg px-4 text-[13px] font-semibold text-brand-ink ring-1 ring-inset ring-black/[0.06]"
        >
          {formatOvertimeLabel(iso)}
        </div>
      ))}
    </CustomScrollRail>
  );
}

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

function createEmptyTimeOffDraft(
  personalReasons?: Parameters<typeof defaultReasonForTimeOffType>[2]
): DraftTimeOff {
  return {
    key: "draft",
    startDate: "",
    endDate: "",
    type: "personal",
    reason: defaultReasonForTimeOffType("personal", undefined, personalReasons),
  };
}

function formatShortDateLabel(iso: string): string {
  if (!iso) return "Select date";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatHolidayListDate(startIso: string, endIso: string): string {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };
  if (!startIso) return "—";
  if (startIso === endIso) return fmt(startIso);
  return `${fmt(startIso)} – ${fmt(endIso)}`;
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

function NoticeProducerList({
  label,
  names,
  total,
  expanded,
  onToggleExpand,
}: {
  label: string;
  names: string[];
  total: number;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  if (names.length === 0) return null;
  const summary = formatSkippedProducerSummary(names, {
    total,
    previewLimit: expanded ? names.length : 3,
  });
  const heading = summary.ratioLabel
    ? `${label} ${summary.ratioLabel}`
    : `${label} ${summary.countLabel}`;

  return (
    <div className="mt-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
        {heading}
      </p>
      <ul className="mt-2 space-y-1.5">
        {summary.shown.map((name) => (
          <li
            key={name}
            className="rounded-xl bg-brand-bg px-3 py-2 text-[13px] font-medium text-brand-ink ring-1 ring-inset ring-black/[0.05]"
          >
            {name}
          </li>
        ))}
      </ul>
      {summary.extra > 0 ? (
        <button
          type="button"
          onClick={onToggleExpand}
          className="mt-2 w-full text-center text-[12px] font-semibold text-brand-blue transition hover:text-brand-signature"
        >
          View all {names.length}
        </button>
      ) : expanded && names.length > 3 ? (
        <button
          type="button"
          onClick={onToggleExpand}
          className="mt-2 w-full text-center text-[12px] font-semibold text-brand-ink-tertiary transition hover:text-brand-ink"
        >
          Show less
        </button>
      ) : null}
    </div>
  );
}

export function ProducerAvailabilityModal({
  open,
  onClose,
  producer,
  onSave,
  readOnly = false,
}: ProducerAvailabilityModalProps) {
  const { holidays, personalReasons } = useAppState();
  const [workDays, setWorkDays] = useState<Weekday[]>([...DEFAULT_WORK_DAYS]);
  const [timeOff, setTimeOff] = useState<DraftTimeOff[]>([]);
  const [timeOffDraft, setTimeOffDraft] = useState<DraftTimeOff>(() =>
    createEmptyTimeOffDraft()
  );
  const [showTimeOffForm, setShowTimeOffForm] = useState(false);
  const [timeOffNotice, setTimeOffNotice] = useState<TimeOffNotice | null>(null);
  const [noticeListExpand, setNoticeListExpand] = useState<
    "skipped" | "apply" | null
  >(null);
  const [hasMaxCapacity, setHasMaxCapacity] = useState(false);
  const [maxMixesPerDay, setMaxMixesPerDay] = useState(6);
  const [maxProducerCostPerDay, setMaxProducerCostPerDay] = useState(2000);
  const [maxCostInput, setMaxCostInput] = useState("2000");
  const [overtimeDays, setOvertimeDays] = useState<string[]>([]);
  const [workDayOtConflict, setWorkDayOtConflict] =
    useState<WorkDayOtConflict | null>(null);
  const [workDayLeaveConflict, setWorkDayLeaveConflict] =
    useState<WorkDayLeaveConflict | null>(null);
  const [overtimePickerOpen, setOvertimePickerOpen] = useState(false);
  const [timeOffDateField, setTimeOffDateField] = useState<"start" | "end" | null>(
    null
  );
  const [reasonSelectOpen, setReasonSelectOpen] = useState(false);
  const [otherReasonName, setOtherReasonName] = useState("");
  const [timeOffMultiDay, setTimeOffMultiDay] = useState(false);
  const [activeTab, setActiveTab] = useState<AvailabilityTab>("schedule");
  const [showAllHolidays, setShowAllHolidays] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryRates, setCategoryRates] = useState<Record<string, number>>({});
  const overtimeButtonRef = useRef<HTMLButtonElement>(null);
  const timeOffStartRef = useRef<HTMLButtonElement>(null);
  const timeOffEndRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || !producer) return;
    setActiveTab("schedule");
    setWorkDays([...producer.workDays]);
    setTimeOff(
      producer.timeOff
        .filter((entry) => entry.type === "personal")
        .map((entry) => ({
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
    setWorkDayOtConflict(null);
    setWorkDayLeaveConflict(null);
    setOvertimePickerOpen(false);
    setShowAllHolidays(false);
    setTimeOffDraft(createEmptyTimeOffDraft(personalReasons));
    setShowTimeOffForm(false);
    const { categories: nextCategories, categoryRates: nextCategoryRates } =
      categoriesFromProducer(producer);
    setCategories(nextCategories);
    setCategoryRates(nextCategoryRates);
  }, [open, producer, personalReasons]);

  useEffect(() => {
    if (activeTab !== "schedule") setOvertimePickerOpen(false);
    if (activeTab !== "leave") {
      setShowTimeOffForm(false);
      setTimeOffDateField(null);
      setReasonSelectOpen(false);
      setOtherReasonName("");
      setTimeOffMultiDay(false);
    }
    if (activeTab !== "holidays") setShowAllHolidays(false);
  }, [activeTab]);

  if (!open || !producer) return null;

  const usesPercentageCompensation =
    producer.compensationModel !== "not_paid_for_mixing" &&
    producer.compensationModel !== "hourly_manual";

  function applyWorkDayChange(nextWorkDays: Weekday[]) {
    setWorkDays(nextWorkDays);
    // Drop overtime dates that now fall on regular work weekdays.
    setOvertimeDays((days) =>
      days.filter((iso) => {
        const date = parseIsoToLocalDate(iso);
        return !!date && isEligibleOvertimeDate(date, nextWorkDays);
      })
    );
  }

  function toggleDay(day: Weekday) {
    if (workDays.includes(day)) {
      const nextWorkDays = workDays.filter((d) => d !== day);
      const conflicting = leaveDatesBlockedByWorkDays(timeOff, nextWorkDays);
      if (conflicting.length > 0) {
        setWorkDayLeaveConflict({ day, leaveDates: conflicting });
        return;
      }
      applyWorkDayChange(nextWorkDays);
      return;
    }

    const nextWorkDays = [...workDays, day];
    const conflicting = overtimeDatesBlockedByWorkDays(
      overtimeDays,
      nextWorkDays
    );
    if (conflicting.length > 0) {
      setWorkDayOtConflict({ day, overtimeDates: conflicting });
      return;
    }

    applyWorkDayChange(nextWorkDays);
  }

  function clearWorkDayOtConflict() {
    setWorkDayOtConflict(null);
  }

  function confirmWorkDayOtRemoval() {
    if (!workDayOtConflict) return;
    const { day } = workDayOtConflict;
    const next = workDays.includes(day) ? workDays : [...workDays, day];
    applyWorkDayChange(next);
    setWorkDayOtConflict(null);
  }

  function clearWorkDayLeaveConflict() {
    setWorkDayLeaveConflict(null);
  }

  function confirmWorkDayLeaveRemoval() {
    if (!workDayLeaveConflict) return;
    const { day, leaveDates } = workDayLeaveConflict;
    const next = workDays.filter((d) => d !== day);
    setTimeOff((entries) => stripLeaveDatesFromEntries(entries, leaveDates));
    applyWorkDayChange(next);
    setWorkDayLeaveConflict(null);
  }

  function closeTimeOffForm() {
    setTimeOffDraft(createEmptyTimeOffDraft(personalReasons));
    setOtherReasonName("");
    setTimeOffMultiDay(false);
    setTimeOffDateField(null);
    setReasonSelectOpen(false);
    setShowTimeOffForm(false);
  }

  function clearTimeOffNotice() {
    setTimeOffNotice(null);
    setNoticeListExpand(null);
  }

  function showTimeOffNotice(notice: TimeOffNotice) {
    setNoticeListExpand(null);
    setTimeOffNotice(notice);
  }

  function updateTimeOffDraft(patch: Partial<DraftTimeOff>) {
    clearTimeOffNotice();
    setTimeOffDraft((current) => ({ ...current, ...patch }));
  }

  function getBlockedTimeOffDays(): string[] {
    return [
      ...new Set([...overtimeDays, ...expandTimeOffDates(timeOff)]),
    ];
  }

  function snapOffBlockedTimeOffDay(iso: string): string {
    let next = iso;
    for (let i = 0; i < 60; i += 1) {
      if (!isBlockedTimeOffCalendarDay(next)) return next;
      next = addDaysToIso(next, 1);
    }
    return iso;
  }

  function isNonWorkTimeOffDay(iso: string): boolean {
    const date = parseIsoToLocalDate(iso);
    if (!date) return true;
    return !isEligibleTimeOffDate(date, workDays);
  }

  function isBlockedTimeOffCalendarDay(iso: string): boolean {
    if (getBlockedTimeOffDays().includes(iso)) return true;
    if (isStudioHolidayIso(iso, holidays, producer.id)) return true;
    if (isNonWorkTimeOffDay(iso)) return true;
    return false;
  }

  function clampEndAroundBlockedDays(startIso: string, endIso: string): string {
    const end = endIso < startIso ? startIso : endIso;
    let cursor = addDaysToIso(startIso, 1);
    for (let i = 0; i < 800 && cursor <= end; i += 1) {
      if (isBlockedTimeOffCalendarDay(cursor)) {
        const before = addDaysToIso(cursor, -1);
        return before < startIso ? startIso : before;
      }
      cursor = addDaysToIso(cursor, 1);
    }
    return end;
  }

  function clampStartAroundBlockedDays(startIso: string, endIso: string): string {
    let start = startIso > endIso ? endIso : startIso;
    const minIso = isoFromLocalDate(new Date());
    if (start < minIso) start = minIso;
    let cursor = addDaysToIso(endIso, -1);
    for (let i = 0; i < 800 && cursor >= minIso; i += 1) {
      if (isBlockedTimeOffCalendarDay(cursor)) {
        const after = addDaysToIso(cursor, 1);
        if (after > start) start = after;
        break;
      }
      cursor = addDaysToIso(cursor, -1);
    }
    if (start > endIso) start = endIso;
    return start;
  }

  function openTimeOffForm() {
    clearTimeOffNotice();
    setTimeOffDateField(null);
    setReasonSelectOpen(false);
    setOtherReasonName("");
    setTimeOffMultiDay(false);
    setTimeOffDraft(createEmptyTimeOffDraft(personalReasons));
    setShowTimeOffForm(true);
  }

  function commitTimeOffDraft() {
    const reasonLabel = isOtherPersonalReason(timeOffDraft.reason)
      ? otherReasonName.trim()
      : timeOffDraft.reason.trim();
    if (!timeOffDraft.startDate || !reasonLabel || !producer) {
      return;
    }
    const endDate = timeOffMultiDay
      ? timeOffDraft.endDate
      : timeOffDraft.startDate;
    if (
      !endDate ||
      (timeOffMultiDay && endDate <= timeOffDraft.startDate)
    ) {
      return;
    }
    const pendingEntry: DraftTimeOff = {
      ...timeOffDraft,
      type: "personal",
      reason: reasonLabel,
      key: `to-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      endDate,
    };

    const currentOt = overtimeDatesInRange(
      overtimeDays,
      pendingEntry.startDate,
      endDate
    );

    if (currentOt.length > 0) {
      showTimeOffNotice({
        kind: "ot-conflict",
        title: "Overtime on these dates",
        dateLine: `${formatIsoDayMonthYear(pendingEntry.startDate)}${
          pendingEntry.startDate !== endDate
            ? ` to ${formatIsoDayMonthYear(endDate)}`
            : ""
        } overlaps overtime.`,
        pendingEntry,
        conflicts: [
          {
            id: producer.id,
            name: producer.name,
            overtimeDates: currentOt,
            cancelOvertime: false,
          },
        ],
      });
      return;
    }

    if (!timeOffRangeCoversWorkDay(pendingEntry.startDate, endDate, workDays)) {
      const parts = describeTimeOffOutsideWorkDaysParts(
        producer.name,
        pendingEntry.startDate,
        endDate,
        workDays
      );
      showTimeOffNotice({
        kind: "info",
        title: "Not a usual work day",
        dateLine: parts.dateLine,
        producerLine: parts.producerLine,
      });
      return;
    }

    setTimeOff((prev) => [...prev, pendingEntry]);
    closeTimeOffForm();
  }

  function toggleConflictCancel(producerId: string) {
    setTimeOffNotice((current) => {
      if (!current || current.kind !== "ot-conflict") return current;
      return {
        ...current,
        conflicts: current.conflicts.map((row) =>
          row.id === producerId
            ? { ...row, cancelOvertime: !row.cancelOvertime }
            : row
        ),
      };
    });
  }

  function confirmOtConflictAssignment() {
    if (!timeOffNotice || timeOffNotice.kind !== "ot-conflict" || !producer) {
      return;
    }
    const { pendingEntry, conflicts } = timeOffNotice;
    const row = conflicts.find((c) => c.id === producer.id);
    if (!row?.cancelOvertime) return;

    const removeOt = overtimeDatesInRange(
      overtimeDays,
      pendingEntry.startDate,
      pendingEntry.endDate
    );
    setOvertimeDays((prev) => prev.filter((day) => !removeOt.includes(day)));
    setTimeOff((prev) => [...prev, pendingEntry]);
    closeTimeOffForm();
    clearTimeOffNotice();
  }

  function removeTimeOff(key: string) {
    setTimeOff((prev) => prev.filter((entry) => entry.key !== key));
  }

  function addOvertimeDay(iso: string) {
    const value = iso.trim();
    if (!value) return;
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (value < todayIso) return;
    if (existingTimeOffDays.includes(value)) return;
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (!isEligibleOvertimeDate(date, workDays)) return;
    // Holidays only block OT on off days; work-day holidays already fail above.
    if (isStudioHolidayIso(value, holidays, producer.id)) return;
    setOvertimeDays((prev) =>
      [...new Set([...prev, value])].sort((a, b) => a.localeCompare(b))
    );
    setOvertimePickerOpen(false);
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
    if (readOnly) return;
    setCategoryRates((prev) => ({
      ...prev,
      [category]: value,
    }));
  }

  function handleDone() {
    if (readOnly) {
      onClose();
      return;
    }
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
        .filter(
          (entry) =>
            entry.type === "personal" &&
            entry.startDate &&
            entry.reason.trim()
        )
        .map((entry) => ({
          id: entry.key,
          startDate: entry.startDate,
          endDate: entry.endDate || entry.startDate,
          type: "personal" as const,
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

  const todayIso = isoFromLocalDate(new Date());
  const timeOffMinIso = todayIso;
  const timeOffMaxIso = `${Number(todayIso.slice(0, 4)) + 1}-12-31`;

  // Overtime and already-added time off block new ranges: start can't land
  // on/before a blocked day inside the chosen end, and end can't land on/after
  // a blocked day after start.
  const existingTimeOffDays = expandTimeOffDates(timeOff);
  const blockedTimeOffDays = [
    ...new Set([...overtimeDays, ...existingTimeOffDays]),
  ];

  const producerHolidays = holidaysForProducer(holidays, producer.id);

  const upcomingStudioHolidays = producerHolidays
    .map((holiday) => {
      const range = resolveHolidayDatesForToday(holiday, todayIso);
      return { holiday, ...range };
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  // Contiguous leave ranges can't cross any unavailable day (overtime, existing
  // leave, holidays, or non-work weekdays). Start stays after the previous
  // blocked day; end stops before the next blocked day.
  const rangeBlockedDays: string[] = [];
  {
    let cursor = timeOffMinIso;
    for (let i = 0; i < 800 && cursor <= timeOffMaxIso; i += 1) {
      if (isBlockedTimeOffCalendarDay(cursor)) rangeBlockedDays.push(cursor);
      cursor = addDaysToIso(cursor, 1);
    }
  }

  let timeOffStartMinIso = timeOffMinIso;
  let timeOffStartMaxIso =
    timeOffDraft.endDate && timeOffDraft.endDate > timeOffMinIso
      ? addDaysToIso(timeOffDraft.endDate, -1)
      : timeOffMaxIso;
  if (timeOffStartMaxIso > timeOffMaxIso) timeOffStartMaxIso = timeOffMaxIso;
  let timeOffEndMinIso =
    timeOffDraft.startDate && timeOffDraft.startDate >= timeOffMinIso
      ? addDaysToIso(timeOffDraft.startDate, 1)
      : timeOffMinIso;
  let timeOffEndMaxIso = timeOffMaxIso;

  if (timeOffDraft.endDate) {
    const prevBlocked = prevOvertimeOnOrBefore(
      rangeBlockedDays,
      addDaysToIso(timeOffDraft.endDate, -1)
    );
    if (prevBlocked) {
      const afterBlocked = addDaysToIso(prevBlocked, 1);
      if (afterBlocked > timeOffStartMinIso) timeOffStartMinIso = afterBlocked;
    }
  }
  if (timeOffDraft.startDate) {
    const nextBlocked = nextOvertimeOnOrAfter(
      rangeBlockedDays,
      addDaysToIso(timeOffDraft.startDate, 1)
    );
    if (nextBlocked) {
      const beforeBlocked = addDaysToIso(nextBlocked, -1);
      if (beforeBlocked < timeOffEndMaxIso) timeOffEndMaxIso = beforeBlocked;
    }
  }

  if (timeOffStartMaxIso < timeOffStartMinIso) {
    // No valid start on this side of a blocked day — keep min so the grid opens.
  }
  if (timeOffEndMaxIso < timeOffEndMinIso) {
    timeOffEndMaxIso = timeOffEndMinIso;
  }

  const todayInTimeOffStartRange =
    todayIso >= timeOffStartMinIso &&
    todayIso <= timeOffStartMaxIso &&
    !isBlockedTimeOffCalendarDay(todayIso);
  const todayInTimeOffEndRange =
    todayIso >= timeOffEndMinIso &&
    todayIso <= timeOffEndMaxIso &&
    !isBlockedTimeOffCalendarDay(todayIso);

  function isOutsideTimeOffFieldRange(iso: string): boolean {
    if (timeOffDateField === "end") {
      return iso < timeOffEndMinIso || iso > timeOffEndMaxIso;
    }
    return iso < timeOffStartMinIso || iso > timeOffStartMaxIso;
  }

  function timeOffDayTitle(iso: string, disabled: boolean): string | undefined {
    if (iso < todayIso) {
      return "Past day";
    }
    const outsideRange = disabled && isOutsideTimeOffFieldRange(iso);
    const holidayNames = studioHolidayNamesForIso(iso, holidays, producer.id);
    if (holidayNames.length > 0) {
      const name =
        holidayNames.length === 1
          ? holidayNames[0]
          : holidayNames.join(", ");
      if (outsideRange) {
        return `${name}\nRange can’t include holidays or non-working days`;
      }
      return `${name}\nLeave can’t be added on holidays`;
    }
    // Off days can't take leave — OT on an off day doesn't change that.
    if (isNonWorkTimeOffDay(iso)) {
      if (outsideRange) {
        return "Not a working day\nRange can’t include holidays or non-working days";
      }
      return "Not a working day";
    }
    if (overtimeDays.includes(iso)) {
      return "Overtime Day\nCancel overtime to mark leave";
    }
    if (existingTimeOffDays.includes(iso)) {
      return "Already added as time off";
    }
    if (
      disabled &&
      (isOutsideTimeOffFieldRange(iso) ||
        isTimeOffDateBlockedByOvertime(
          iso,
          timeOffDateField === "end" ? "end" : "start",
          timeOffDateField === "end"
            ? timeOffDraft.startDate
            : timeOffDraft.endDate,
          rangeBlockedDays
        ))
    ) {
      return "Range can’t include holidays or non-working days";
    }
    if (iso === todayIso) return "Today";
    return undefined;
  }

  function timeOffStartDayTitle(
    iso: string,
    disabled: boolean
  ): string | undefined {
    if (iso < todayIso) return "Past day";
    if (timeOffDraft.endDate && iso === timeOffDraft.endDate) {
      return "Start date can’t be the same as end date";
    }
    if (timeOffDraft.endDate && iso > timeOffDraft.endDate) {
      return "Start date can’t be after end date";
    }
    return timeOffDayTitle(iso, disabled);
  }

  function timeOffEndDayTitle(
    iso: string,
    disabled: boolean
  ): string | undefined {
    if (iso < todayIso) return "Past day";
    if (timeOffDraft.startDate && iso === timeOffDraft.startDate) {
      return "End date can’t be the same as start date";
    }
    if (timeOffDraft.startDate && iso < timeOffDraft.startDate) {
      return "End date can’t be before start date";
    }
    return timeOffDayTitle(iso, disabled);
  }

  function timeOffDayTone(
    iso: string,
    _disabled: boolean
  ): "overtime" | "holiday" | "leave" | undefined {
    if (iso < todayIso) return undefined;
    if (isStudioHolidayIso(iso, holidays, producer.id)) return "holiday";
    // OT blue only when the day is otherwise a work day (leave could apply).
    if (overtimeDays.includes(iso) && !isNonWorkTimeOffDay(iso)) {
      return "overtime";
    }
    return undefined;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close"
      />

      <div className="relative flex h-[min(92dvh,720px)] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[28px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:rounded-[28px]">
        <header className="relative flex shrink-0 items-center justify-between border-b border-black/[0.08] px-4 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="min-w-[64px] text-left text-[15px] text-brand-ink-secondary transition hover:text-brand-ink"
          >
            {readOnly ? "Close" : "Cancel"}
          </button>
          <h2 className="absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold tracking-[-0.01em] text-brand-ink">
            {readOnly ? "Availability" : "Producer settings"}
          </h2>
          {!readOnly ? (
            <button
              type="button"
              onClick={handleDone}
              className="min-w-[64px] text-right text-[15px] font-semibold text-brand-blue transition hover:text-brand-blue-hover"
            >
              Done
            </button>
          ) : (
            <span className="min-w-[64px]" />
          )}
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
                { value: "leave", label: "Leaves" },
                { value: "holidays", label: "Holidays" },
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
                (() => {
                  const rows = (
                    <ul className="divide-y divide-black/[0.06]">
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
                                {formatCategoryCompensationRate(
                                  producer,
                                  category
                                )}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeCategory(category)}
                              className="shrink-0 rounded-full p-1.5 text-brand-ink-tertiary transition hover:bg-brand-elevated hover:text-brand-danger"
                              aria-label={`Remove ${category}`}
                            >
                              <Trash2
                                className="h-3.5 w-3.5"
                                strokeWidth={1.75}
                              />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  );
                  return categories.length >= 4 ? (
                    <CustomScrollRail
                      className="mt-3"
                      maxHeight={CATEGORY_RATE_LIST_PX}
                      fadeFromClassName="from-brand-bg"
                      syncKey={categories.join("|")}
                    >
                      {rows}
                    </CustomScrollRail>
                  ) : (
                    <div className="mt-3">{rows}</div>
                  );
                })()
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
              const pill =
                day.id === "sun"
                  ? "Su"
                  : day.id === "sat"
                    ? "Sa"
                    : day.id === "tue"
                      ? "Tu"
                      : day.id === "thu"
                        ? "Th"
                        : day.short.charAt(0);
              return (
                <button
                  key={day.id}
                  type="button"
                  aria-label={day.label}
                  aria-pressed={active}
                  onClick={() => toggleDay(day.id)}
                  className={clsx(
                    "flex h-11 w-11 flex-col items-center justify-center rounded-full text-[11px] font-semibold transition",
                    active
                      ? "bg-brand-ink text-white shadow-sm"
                      : "bg-brand-bg text-brand-ink-secondary ring-1 ring-inset ring-black/[0.06] hover:bg-brand-bg-subtle"
                  )}
                >
                  {pill}
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
                  Work days outside the regular schedule. Cross a date to
                  cancel it.
                </p>
              </div>
              <button
                ref={overtimeButtonRef}
                type="button"
                onClick={() => setOvertimePickerOpen((open) => !open)}
                onMouseDown={(e) => e.stopPropagation()}
                className={clsx(
                  "inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-semibold ring-1 ring-inset transition",
                  overtimePickerOpen
                    ? "bg-brand-blue text-white ring-brand-blue"
                    : "bg-brand-bg text-brand-blue ring-black/[0.06] hover:bg-brand-bg-subtle"
                )}
              >
                <CalendarPlus className="h-3.5 w-3.5" strokeWidth={2.5} />
                Add day
              </button>
              <OvertimeDayPicker
                open={overtimePickerOpen}
                onClose={() => setOvertimePickerOpen(false)}
                workDays={workDays}
                selectedDays={overtimeDays}
                onSelect={addOvertimeDay}
                excludeRef={overtimeButtonRef}
                studioHolidays={holidays}
                producerId={producer.id}
                blockedTimeOffDays={existingTimeOffDays}
                leaveEntries={timeOff}
              />
            </div>

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
            </>
          ) : null}

          {activeTab === "leave" ? (
            <>
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-brand-ink">
                  Personal leave
                </p>
                <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
                  Block regular work days when this producer won&apos;t be
                  available. Holidays and non-working days can&apos;t be
                  selected.
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
              {timeOff.filter((entry) => entry.type === "personal").length === 0 ? (
                <p className="text-center text-[13px] text-brand-ink-tertiary">
                  No personal leave scheduled yet.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {timeOff
                    .filter((entry) => entry.type === "personal")
                    .map((entry) => (
                    <li key={entry.key}>
                      <span
                        className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand-blue-soft py-1.5 pl-3 pr-1.5 text-[12px] font-semibold text-brand-blue-deep ring-1 ring-inset ring-brand-blue-muted"
                      >
                        <span className="min-w-0 truncate">
                          {formatTimeOffDateLabel(entry)}
                          {entry.reason.trim() ? (
                            <span className="font-medium text-brand-blue-deep/75">
                              {" · "}
                              {entry.reason.trim()}
                            </span>
                          ) : null}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeTimeOff(entry.key)}
                          className="shrink-0 rounded-full p-1 text-brand-blue-deep/70 transition hover:bg-brand-blue-muted hover:text-brand-blue-deep"
                          aria-label={`Remove ${formatTimeOffDateLabel(entry)} (${entry.reason})`}
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
            <div className="mt-3 overflow-visible rounded-2xl border border-dashed border-brand-blue/35 bg-brand-blue-soft/20">
              <div className="flex items-center justify-between px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-brand-blue-deep">
                  Add personal leave
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
                <div className="flex gap-1 rounded-full bg-brand-elevated p-1 ring-1 ring-inset ring-black/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      setTimeOffMultiDay(false);
                      setTimeOffDateField(null);
                      if (timeOffDraft.startDate) {
                        updateTimeOffDraft({
                          endDate: timeOffDraft.startDate,
                        });
                      }
                    }}
                    className={clsx(
                      "flex-1 rounded-full py-1.5 text-[12px] font-semibold transition",
                      !timeOffMultiDay
                        ? "bg-brand-ink text-white shadow-sm"
                        : "text-brand-ink-secondary hover:text-brand-ink"
                    )}
                  >
                    Single day
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTimeOffMultiDay(true);
                      setTimeOffDateField(null);
                      updateTimeOffDraft({ endDate: "" });
                    }}
                    className={clsx(
                      "flex-1 rounded-full py-1.5 text-[12px] font-semibold transition",
                      timeOffMultiDay
                        ? "bg-brand-ink text-white shadow-sm"
                        : "text-brand-ink-secondary hover:text-brand-ink"
                    )}
                  >
                    Date range
                  </button>
                </div>

                <div className="overflow-visible rounded-xl bg-brand-elevated ring-1 ring-inset ring-black/[0.06]">
                  {timeOffMultiDay ? (
                  <div className="grid grid-cols-2 divide-x divide-black/[0.06]">
                    <div className="px-2.5 py-2">
                      <span className="block text-[9px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary">
                        From
                      </span>
                      <button
                        ref={timeOffStartRef}
                        type="button"
                        onClick={() => {
                          setReasonSelectOpen(false);
                          setTimeOffDateField((current) =>
                            current === "start" ? null : "start"
                          );
                        }}
                        className={clsx(
                          "mt-0.5 flex w-full items-center justify-between gap-1 rounded-lg py-0.5 text-left text-[12px] font-semibold outline-none transition",
                          timeOffDateField === "start"
                            ? "text-brand-signature"
                            : "text-brand-ink hover:text-brand-signature"
                        )}
                      >
                        <span className="min-w-0 truncate">
                          {formatShortDateLabel(timeOffDraft.startDate)}
                        </span>
                      </button>
                      <DayCalendarPicker
                        open={timeOffDateField === "start"}
                        onClose={() => setTimeOffDateField(null)}
                        excludeRef={timeOffStartRef}
                        value={timeOffDraft.startDate || null}
                        minIso={timeOffStartMinIso}
                        maxIso={
                          timeOffDraft.endDate
                            ? timeOffMaxIso
                            : timeOffStartMaxIso
                        }
                        isDateDisabled={(iso) =>
                          (!!timeOffDraft.endDate &&
                            iso >= timeOffDraft.endDate) ||
                          isBlockedTimeOffCalendarDay(iso) ||
                          isTimeOffDateBlockedByOvertime(
                            iso,
                            "start",
                            timeOffDraft.endDate || null,
                            rangeBlockedDays
                          )
                        }
                        dayTitle={timeOffStartDayTitle}
                        dayTone={timeOffDayTone}
                        ariaLabel="Leave start date"
                        onSelect={(iso) => {
                          if (isBlockedTimeOffCalendarDay(iso)) return;
                          if (
                            timeOffDraft.endDate &&
                            iso >= timeOffDraft.endDate
                          ) {
                            return;
                          }
                          const startDate = iso;
                          if (!timeOffDraft.endDate) {
                            updateTimeOffDraft({ startDate });
                            return;
                          }
                          const nextEnd = clampEndAroundBlockedDays(
                            startDate,
                            timeOffDraft.endDate
                          );
                          updateTimeOffDraft({
                            startDate,
                            endDate: nextEnd,
                          });
                        }}
                        footer={
                          todayInTimeOffStartRange ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (isBlockedTimeOffCalendarDay(todayIso)) return;
                                if (
                                  timeOffDraft.endDate &&
                                  todayIso >= timeOffDraft.endDate
                                ) {
                                  return;
                                }
                                if (!timeOffDraft.endDate) {
                                  updateTimeOffDraft({ startDate: todayIso });
                                  setTimeOffDateField(null);
                                  return;
                                }
                                const nextEnd = clampEndAroundBlockedDays(
                                  todayIso,
                                  timeOffDraft.endDate
                                );
                                updateTimeOffDraft({
                                  startDate: todayIso,
                                  endDate: nextEnd,
                                });
                                setTimeOffDateField(null);
                              }}
                              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-signature transition hover:bg-white"
                            >
                              Today
                            </button>
                          ) : (
                            <p className="px-1 text-[11px] font-medium text-brand-ink-tertiary">
                              {rangeBlockedDays.length > 0
                                ? "Range can’t include holidays or non-working days"
                                : "Through December next year"}
                            </p>
                          )
                        }
                      />
                    </div>
                    <div className="px-2.5 py-2">
                      <span className="block text-[9px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary">
                        To
                      </span>
                      <button
                        ref={timeOffEndRef}
                        type="button"
                        onClick={() => {
                          setReasonSelectOpen(false);
                          setTimeOffDateField((current) =>
                            current === "end" ? null : "end"
                          );
                        }}
                        className={clsx(
                          "mt-0.5 flex w-full items-center justify-between gap-1 rounded-lg py-0.5 text-left text-[12px] font-semibold outline-none transition",
                          timeOffDateField === "end"
                            ? "text-brand-signature"
                            : "text-brand-ink hover:text-brand-signature"
                        )}
                      >
                        <span className="min-w-0 truncate">
                          {formatShortDateLabel(timeOffDraft.endDate)}
                        </span>
                      </button>
                      <DayCalendarPicker
                        open={timeOffDateField === "end"}
                        onClose={() => setTimeOffDateField(null)}
                        excludeRef={timeOffEndRef}
                        value={timeOffDraft.endDate || null}
                        minIso={timeOffMinIso}
                        maxIso={timeOffEndMaxIso}
                        isDateDisabled={(iso) =>
                          (!!timeOffDraft.startDate &&
                            iso <= timeOffDraft.startDate) ||
                          isBlockedTimeOffCalendarDay(iso) ||
                          isTimeOffDateBlockedByOvertime(
                            iso,
                            "end",
                            timeOffDraft.startDate || null,
                            rangeBlockedDays
                          )
                        }
                        dayTitle={timeOffEndDayTitle}
                        dayTone={timeOffDayTone}
                        ariaLabel="Leave end date"
                        onSelect={(iso) => {
                          if (isBlockedTimeOffCalendarDay(iso)) return;
                          if (
                            timeOffDraft.startDate &&
                            iso <= timeOffDraft.startDate
                          ) {
                            return;
                          }
                          const endDate = iso;
                          if (!timeOffDraft.startDate) {
                            updateTimeOffDraft({ endDate });
                            return;
                          }
                          const startDate = clampStartAroundBlockedDays(
                            timeOffDraft.startDate,
                            endDate
                          );
                          if (startDate >= endDate) return;
                          updateTimeOffDraft({ startDate, endDate });
                        }}
                        footer={
                          todayInTimeOffEndRange ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (isBlockedTimeOffCalendarDay(todayIso)) return;
                                if (
                                  timeOffDraft.startDate &&
                                  todayIso <= timeOffDraft.startDate
                                ) {
                                  return;
                                }
                                const endDate = todayIso;
                                if (!timeOffDraft.startDate) {
                                  updateTimeOffDraft({ endDate });
                                  setTimeOffDateField(null);
                                  return;
                                }
                                const startDate = clampStartAroundBlockedDays(
                                  timeOffDraft.startDate,
                                  endDate
                                );
                                if (startDate >= endDate) return;
                                updateTimeOffDraft({ startDate, endDate });
                                setTimeOffDateField(null);
                              }}
                              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-signature transition hover:bg-white"
                            >
                              Today
                            </button>
                          ) : (
                            <p className="px-1 text-[11px] font-medium text-brand-ink-tertiary">
                              {rangeBlockedDays.length > 0
                                ? "Range can’t include holidays or non-working days"
                                : "Through December next year"}
                            </p>
                          )
                        }
                      />
                    </div>
                  </div>
                  ) : (
                  <div className="px-2.5 py-2">
                    <span className="block text-[9px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary">
                      Date
                    </span>
                    <button
                      ref={timeOffStartRef}
                      type="button"
                      onClick={() => {
                        setReasonSelectOpen(false);
                        setTimeOffDateField((current) =>
                          current === "start" ? null : "start"
                        );
                      }}
                      className={clsx(
                        "mt-0.5 flex w-full items-center justify-between gap-1 rounded-lg py-0.5 text-left text-[12px] font-semibold outline-none transition",
                        timeOffDateField === "start"
                          ? "text-brand-signature"
                          : "text-brand-ink hover:text-brand-signature"
                      )}
                    >
                      <span className="min-w-0 truncate">
                        {formatShortDateLabel(timeOffDraft.startDate)}
                      </span>
                    </button>
                    <DayCalendarPicker
                      open={timeOffDateField === "start"}
                      onClose={() => setTimeOffDateField(null)}
                      excludeRef={timeOffStartRef}
                      value={timeOffDraft.startDate || null}
                      minIso={timeOffStartMinIso}
                      maxIso={timeOffStartMaxIso}
                      isDateDisabled={(iso) =>
                        isBlockedTimeOffCalendarDay(iso) ||
                        isTimeOffDateBlockedByOvertime(
                          iso,
                          "start",
                          iso,
                          blockedTimeOffDays
                        )
                      }
                      dayTitle={timeOffDayTitle}
                      dayTone={timeOffDayTone}
                      ariaLabel="Leave date"
                      onSelect={(iso) => {
                        if (isBlockedTimeOffCalendarDay(iso)) return;
                        updateTimeOffDraft({
                          startDate: iso,
                          endDate: iso,
                        });
                      }}
                      footer={
                        todayInTimeOffStartRange ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (isBlockedTimeOffCalendarDay(todayIso)) return;
                              updateTimeOffDraft({
                                startDate: todayIso,
                                endDate: todayIso,
                              });
                              setTimeOffDateField(null);
                            }}
                            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-signature transition hover:bg-white"
                          >
                            Today
                          </button>
                        ) : (
                          <p className="px-1 text-[11px] font-medium text-brand-ink-tertiary">
                            Work days only · through December next year
                          </p>
                        )
                      }
                    />
                  </div>
                  )}

                  <div className="relative z-20 border-t border-black/[0.06] px-2.5 py-2">
                    <span className="block text-[9px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary">
                      Why
                    </span>
                    <SoftSelect
                      aria-label="Leave reason"
                      className="mt-1"
                      placement="above"
                      value={
                        reasonsForTimeOffType(
                          "personal",
                          holidays,
                          personalReasons
                        ).includes(timeOffDraft.reason)
                          ? timeOffDraft.reason
                          : isOtherPersonalReason(timeOffDraft.reason)
                            ? OTHER_PERSONAL_REASON_NAME
                            : defaultReasonForTimeOffType(
                                "personal",
                                holidays,
                                personalReasons
                              )
                      }
                      options={reasonsForTimeOffType(
                        "personal",
                        holidays,
                        personalReasons
                      ).map((reason) => ({ value: reason, label: reason }))}
                      onChange={(reason) => {
                        updateTimeOffDraft({ reason });
                        if (!isOtherPersonalReason(reason)) {
                          setOtherReasonName("");
                        }
                      }}
                      open={reasonSelectOpen}
                      onOpenChange={(next) => {
                        if (next) setTimeOffDateField(null);
                        setReasonSelectOpen(next);
                      }}
                    />
                    {isOtherPersonalReason(timeOffDraft.reason) ? (
                      <label className="mt-2 block">
                        <span className="block text-[9px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary">
                          Name this leave
                        </span>
                        <input
                          type="text"
                          value={otherReasonName}
                          onChange={(e) => setOtherReasonName(e.target.value)}
                          placeholder="e.g. Sabbatical"
                          className="mt-1 h-8 w-full rounded-full bg-brand-bg px-3 text-[13px] font-medium text-brand-ink outline-none ring-1 ring-inset ring-black/[0.06] transition placeholder:text-brand-ink-tertiary focus:ring-brand-blue/30"
                          aria-label="Custom leave name"
                        />
                      </label>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={commitTimeOffDraft}
                  disabled={
                    !timeOffDraft.startDate ||
                    (timeOffMultiDay &&
                      (!timeOffDraft.endDate ||
                        timeOffDraft.endDate <= timeOffDraft.startDate)) ||
                    (isOtherPersonalReason(timeOffDraft.reason) &&
                      !otherReasonName.trim())
                  }
                  className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-brand-blue px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-brand-blue-hover disabled:opacity-40"
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

          {activeTab === "holidays" ? (
            <>
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-brand-ink">
                  Public holidays
                </p>
                <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
                  Holidays that apply to this producer. Managed in Settings.
                </p>
              </div>
              {!readOnly ? (
                <Link
                  href="/settings/holidays"
                  onClick={onClose}
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-brand-bg px-3 text-[13px] font-semibold text-brand-blue ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Edit
                </Link>
              ) : null}
            </div>
            <div className="mt-4">
              {upcomingStudioHolidays.length === 0 ? (
                <p className="text-center text-[13px] text-brand-ink-tertiary">
                  No public holidays set yet.
                </p>
              ) : (
                <div className="rounded-2xl ring-1 ring-inset ring-black/[0.06]">
                  <button
                    type="button"
                    onClick={() => setShowAllHolidays((open) => !open)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-brand-bg/60"
                    aria-expanded={showAllHolidays}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-brand-ink">
                        {upcomingStudioHolidays[0].holiday.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-brand-ink-tertiary">
                        Next ·{" "}
                        {formatHolidayListDate(
                          upcomingStudioHolidays[0].startDate,
                          upcomingStudioHolidays[0].endDate
                        )}
                        {upcomingStudioHolidays.length > 1
                          ? ` · ${upcomingStudioHolidays.length} total`
                          : null}
                      </p>
                    </div>
                    <ChevronDown
                      className={clsx(
                        "h-4 w-4 shrink-0 text-brand-ink-tertiary transition",
                        showAllHolidays && "rotate-180"
                      )}
                      strokeWidth={2.25}
                      aria-hidden
                    />
                  </button>
                  {showAllHolidays ? (
                    <div
                      className="border-t border-black/[0.06] overflow-y-auto overscroll-contain"
                      style={{ maxHeight: 128 }}
                    >
                      <ul>
                        {upcomingStudioHolidays.map(
                          ({ holiday, startDate, endDate }) => (
                            <li
                              key={holiday.id}
                              className="flex items-center justify-between gap-3 px-3 py-1.5"
                            >
                              <span className="min-w-0 truncate text-[11px] font-medium text-brand-ink">
                                {holiday.name}
                              </span>
                              <span className="shrink-0 text-[10px] tabular-nums text-brand-ink-tertiary">
                                {formatHolidayListDate(startDate, endDate)}
                              </span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
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

      {timeOffNotice ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-brand-scrim/80"
            aria-label="Close"
            onClick={clearTimeOffNotice}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="time-off-notice-title"
            className="relative flex max-h-[min(92dvh,640px)] w-full max-w-[360px] flex-col overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-7">
              <h2
                id="time-off-notice-title"
                className="text-center text-[17px] font-semibold tracking-[-0.02em] text-brand-ink"
              >
                {timeOffNotice.title}
              </h2>

              {timeOffNotice.dateLine ||
              (timeOffNotice.kind === "info" && timeOffNotice.producerLine) ? (
                <div className="mt-4 rounded-2xl bg-brand-bg px-4 py-3 ring-1 ring-inset ring-black/[0.06]">
                  {timeOffNotice.dateLine ? (
                    <p className="text-[13px] font-semibold text-brand-ink">
                      {timeOffNotice.dateLine}
                    </p>
                  ) : null}
                  {timeOffNotice.kind === "info" && timeOffNotice.producerLine ? (
                    <p
                      className={clsx(
                        "text-[13px] leading-snug text-brand-ink-secondary",
                        timeOffNotice.dateLine && "mt-1"
                      )}
                    >
                      {timeOffNotice.producerLine}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {timeOffNotice.kind === "ot-conflict" ? (
                <div className="mt-4">
                  <p className="text-[12px] leading-relaxed text-brand-ink-secondary">
                    Cancel overtime to apply this leave, or keep overtime and
                    skip. You can also remove overtime from the chips above.
                  </p>
                  <ul className="mt-3 space-y-2">
                    {timeOffNotice.conflicts.map((row) => (
                      <li
                        key={row.id}
                        className="rounded-2xl bg-brand-bg px-3 py-3 ring-1 ring-inset ring-black/[0.06]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-brand-ink">
                              {row.name}
                            </p>
                            <p className="mt-0.5 text-[11px] text-brand-ink-tertiary">
                              Overtime{" "}
                              {row.overtimeDates
                                .map((iso) => formatIsoDayMonthYear(iso))
                                .join(", ")}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleConflictCancel(row.id)}
                            className={clsx(
                              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                              row.cancelOvertime
                                ? "bg-brand-blue text-white"
                                : "bg-brand-elevated text-brand-blue ring-1 ring-inset ring-brand-blue/30"
                            )}
                          >
                            {row.cancelOvertime
                              ? "OT canceled"
                              : "Cancel OT"}
                          </button>
                        </div>
                        <p className="mt-2 text-[11px] text-brand-ink-tertiary">
                          {row.cancelOvertime
                            ? "Leave will be assigned."
                            : "Leave will be skipped. Overtime stays."}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {timeOffNotice.kind === "info" &&
              ((timeOffNotice.skippedNames?.length ?? 0) > 0 ||
                (timeOffNotice.applyNames?.length ?? 0) > 0)
                ? (() => {
                    const skippedNames = timeOffNotice.skippedNames ?? [];
                    const applyNames = timeOffNotice.applyNames ?? [];
                    const total =
                      timeOffNotice.totalProducers ??
                      skippedNames.length + applyNames.length;
                    return (
                      <>
                        <NoticeProducerList
                          label="Doesn’t apply to"
                          names={skippedNames}
                          total={total}
                          expanded={noticeListExpand === "skipped"}
                          onToggleExpand={() =>
                            setNoticeListExpand((current) =>
                              current === "skipped" ? null : "skipped"
                            )
                          }
                        />
                        <NoticeProducerList
                          label="Applies to"
                          names={applyNames}
                          total={total}
                          expanded={noticeListExpand === "apply"}
                          onToggleExpand={() =>
                            setNoticeListExpand((current) =>
                              current === "apply" ? null : "apply"
                            )
                          }
                        />
                      </>
                    );
                  })()
                : null}
            </div>

            <div className="shrink-0 border-t border-black/[0.08]">
              {timeOffNotice.kind === "ot-conflict" ? (
                (() => {
                  const applyCount = timeOffNotice.conflicts.filter(
                    (row) => row.cancelOvertime
                  ).length;
                  return (
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={confirmOtConflictAssignment}
                        disabled={applyCount === 0}
                        className="border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-blue transition hover:bg-brand-blue-soft/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        {applyCount === 0
                          ? "Cancel OT to apply"
                          : "Apply leave"}
                      </button>
                      <button
                        type="button"
                        onClick={clearTimeOffNotice}
                        className="py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg"
                      >
                        Cancel
                      </button>
                    </div>
                  );
                })()
              ) : (
                <button
                  type="button"
                  onClick={clearTimeOffNotice}
                  className="w-full py-3.5 text-[15px] font-semibold text-brand-blue transition hover:bg-brand-blue-soft/40"
                >
                  Got it
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {workDayOtConflict
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <button
                type="button"
                className="absolute inset-0 bg-brand-scrim/80"
                aria-label="Close"
                onClick={clearWorkDayOtConflict}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="work-day-ot-conflict-title"
                className="relative flex max-h-[min(92dvh,640px)] w-full max-w-[360px] flex-col overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
              >
                <div className="shrink-0 px-6 pb-4 pt-7">
                  <h2
                    id="work-day-ot-conflict-title"
                    className="text-center text-[17px] font-semibold tracking-[-0.02em] text-brand-ink"
                  >
                    Remove overtime?
                  </h2>
                  <p className="mt-3 text-center text-[13px] leading-relaxed text-brand-ink-secondary">
                    Making {weekdayLabel(workDayOtConflict.day)} a regular work
                    day will remove overtime on{" "}
                    {workDayOtConflict.overtimeDates.length === 1
                      ? "this date."
                      : "these dates."}
                  </p>
                  <WorkDayOtConflictDateList
                    dates={workDayOtConflict.overtimeDates}
                  />
                </div>
                <div className="shrink-0 border-t border-black/[0.08]">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={confirmWorkDayOtRemoval}
                      className="border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-blue transition hover:bg-brand-blue-soft/40"
                    >
                      Remove overtime
                    </button>
                    <button
                      type="button"
                      onClick={clearWorkDayOtConflict}
                      className="py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {workDayLeaveConflict
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <button
                type="button"
                className="absolute inset-0 bg-brand-scrim/80"
                aria-label="Close"
                onClick={clearWorkDayLeaveConflict}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="work-day-leave-conflict-title"
                className="relative flex max-h-[min(92dvh,640px)] w-full max-w-[360px] flex-col overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
              >
                <div className="shrink-0 px-6 pb-4 pt-7">
                  <h2
                    id="work-day-leave-conflict-title"
                    className="text-center text-[17px] font-semibold tracking-[-0.02em] text-brand-ink"
                  >
                    Cancel leave?
                  </h2>
                  <p className="mt-3 text-center text-[13px] leading-relaxed text-brand-ink-secondary">
                    Making {weekdayLabel(workDayLeaveConflict.day)} a
                    non-working day will cancel leave on{" "}
                    {workDayLeaveConflict.leaveDates.length === 1
                      ? "this date."
                      : "these dates."}
                  </p>
                  <WorkDayOtConflictDateList
                    dates={workDayLeaveConflict.leaveDates}
                  />
                </div>
                <div className="shrink-0 border-t border-black/[0.08]">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={confirmWorkDayLeaveRemoval}
                      className="border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-blue transition hover:bg-brand-blue-soft/40"
                    >
                      Cancel leave
                    </button>
                    <button
                      type="button"
                      onClick={clearWorkDayLeaveConflict}
                      className="py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
