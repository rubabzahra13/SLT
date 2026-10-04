"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CalendarPlus, Minus, Plus, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { ExtraDayPicker } from "@/components/producers/ExtraDayPicker";
import {
  DayCalendarPicker,
  addDaysToIso,
  isoFromLocalDate,
  parseIsoToLocalDate,
} from "@/components/ui/DayCalendarPicker";
import { useAppState } from "@/context/AppStateContext";
import {
  describeTimeOffOutsideWorkDaysParts,
  describeProducerMixDayForLeave,
  collectProducerMixBlockedDays,
  expandTimeOffDates,
  findLeaveMixConflicts,
  formatIsoDayMonthYear,
  formatLeaveDateLabel,
  formatCompactLeaveDaySpans,
  formatSkippedProducerSummary,
  isEligibleExtraDate,
  isEligibleTimeOffDate,
  isTimeOffDateBlockedByExtraDay,
  leaveApplicableDaysInRange,
  listProducerMixBookingsOnDay,
  nextExtraDayOnOrAfter,
  extraDatesInRange,
  prevExtraDayOnOrBefore,
  timeOffRangeCoversWorkDay,
  type ProducerMixDayBooking,
} from "@/lib/producer-availability";
import { patchForReassignLeave } from "@/lib/order-reassign";
import {
  formatOffWorkReason,
  isValidOffWorkReason,
  OFF_WORK_FOR_PREFIX,
} from "@/lib/producer-time-off";
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
  extraDays: string[];
};

type ProducerAvailabilityModalProps = {
  open: boolean;
  onClose: () => void;
  producer: Producer | null;
  onSave: (patch: AvailabilityPatch) => void | Promise<void>;
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
  extraDates: string[];
  cancelExtraDays: boolean;
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
    }
  | {
      kind: "mix-conflict";
      title: string;
      pendingEntry: DraftTimeOff;
      fromOrders: ProducerMixDayBooking[];
      fromMtd: ProducerMixDayBooking[];
    };

type AvailabilityTab = "schedule" | "leave" | "limit";

type WorkDayOtConflict = {
  day: Weekday;
  extraDates: string[];
};

type WorkDayLeaveConflict = {
  day: Weekday;
  leaveDates: string[];
};

/** OT dates that would be dropped if these work days became active. */
function extraDatesBlockedByWorkDays(
  extraDays: string[],
  nextWorkDays: Weekday[]
): string[] {
  return extraDays.filter((iso) => {
    const parts = iso.split("-").map(Number);
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return false;
    const [y, m, d] = parts;
    return !isEligibleExtraDate(new Date(y, m - 1, d), nextWorkDays);
  });
}

/** Leave dates that currently apply and would no longer fall on a work day. */
function leaveDatesBlockedByWorkDays(
  entries: { startDate: string; endDate?: string | null }[],
  currentWorkDays: Weekday[],
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
        const date = new Date(y, m - 1, d);
        // Off days only apply on work days — ignore weekends/other off weekdays
        // already outside the current schedule.
        return (
          isEligibleTimeOffDate(date, currentWorkDays) &&
          !isEligibleTimeOffDate(date, nextWorkDays)
        );
      })
    ),
  ].sort((a, b) => a.localeCompare(b));
}

/**
 * Drop cancelled leave dates from stored ranges and split around gaps.
 * Important: cancelled weekdays must not remain inside start→end, or they
 * would reappear if that weekday is turned back into a work day later.
 */
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
          {formatExtraDayLabel(iso)}
        </div>
      ))}
    </CustomScrollRail>
  );
}

function formatExtraDayLabel(iso: string): string {
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
  return {
    key: "draft",
    startDate: "",
    endDate: "",
    type: "personal",
    reason: "",
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

const MIN_MAX_COST_PER_DAY = 100;
const MAX_MAX_COST_PER_DAY = 20000;
const MAX_COST_STEP = 100;

function clampMaxCostPerDay(value: number): number {
  return Math.min(
    MAX_MAX_COST_PER_DAY,
    Math.max(MIN_MAX_COST_PER_DAY, Math.round(value))
  );
}

function formatTimeOffDateLabel(
  entry: DraftTimeOff,
  workDays: Weekday[]
): string {
  return formatLeaveDateLabel(entry.startDate, entry.endDate, workDays);
}

/** One chip per reason — keeps split storage (so cancelled weekdays stay gone)
 *  but shows the compact comma/dash label the user expects. */
function groupPersonalOffDayChips(
  entries: DraftTimeOff[],
  workDays: Weekday[]
): { keys: string[]; reason: string; label: string }[] {
  const groups = new Map<string, DraftTimeOff[]>();
  for (const entry of entries) {
    if (entry.type !== "personal") continue;
    const groupKey = entry.reason.trim().toLowerCase() || "__empty__";
    const list = groups.get(groupKey) ?? [];
    list.push(entry);
    groups.set(groupKey, list);
  }
  return [...groups.values()].map((group) => {
    const days = [
      ...new Set(
        group.flatMap((entry) =>
          leaveApplicableDaysInRange(
            entry.startDate,
            entry.endDate || entry.startDate,
            workDays
          )
        )
      ),
    ].sort((a, b) => a.localeCompare(b));
    return {
      keys: group.map((entry) => entry.key),
      reason: group[0].reason,
      label:
        days.length > 0
          ? formatCompactLeaveDaySpans(days)
          : formatTimeOffDateLabel(group[0], workDays),
    };
  });
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
  const router = useRouter();
  const { mtdRecords, updateMTD } = useAppState();
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
  const [extraDays, setExtraDays] = useState<string[]>([]);
  const [workDayExtraConflict, setWorkDayOtConflict] =
    useState<WorkDayOtConflict | null>(null);
  const [workDayLeaveConflict, setWorkDayLeaveConflict] =
    useState<WorkDayLeaveConflict | null>(null);
  const [extraDayPickerOpen, setExtraDayPickerOpen] = useState(false);
  const [timeOffDateField, setTimeOffDateField] = useState<"start" | "end" | null>(
    null
  );
  const [offWorkDetail, setOffWorkDetail] = useState("");
  const [timeOffMultiDay, setTimeOffMultiDay] = useState(false);
  const [activeTab, setActiveTab] = useState<AvailabilityTab>("schedule");
  const extraDayButtonRef = useRef<HTMLButtonElement>(null);
  const timeOffStartRef = useRef<HTMLButtonElement>(null);
  const timeOffEndRef = useRef<HTMLButtonElement>(null);
  /** Only re-hydrate when the modal opens or the producer id changes — not when
   *  the parent passes a new producer object for the same person (bootstrap/cache). */
  const hydratedProducerKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !producer) {
      if (!open) hydratedProducerKeyRef.current = null;
      return;
    }
    const key = producer.uuid || producer.id;
    if (hydratedProducerKeyRef.current === key) return;
    hydratedProducerKeyRef.current = key;

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
    setExtraDays([...producer.extraDays]);
    setWorkDayOtConflict(null);
    setWorkDayLeaveConflict(null);
    setExtraDayPickerOpen(false);
    setTimeOffDraft(createEmptyTimeOffDraft());
    setOffWorkDetail("");
    setShowTimeOffForm(false);
  }, [open, producer]);

  useEffect(() => {
    if (activeTab !== "schedule") setExtraDayPickerOpen(false);
    if (activeTab !== "leave") {
      setShowTimeOffForm(false);
      setTimeOffDateField(null);
      setOffWorkDetail("");
      setTimeOffMultiDay(false);
    }
  }, [activeTab]);

  if (!open || !producer) return null;

  // Nested helpers don't keep the null narrowing from the guard above.
  const producerId = producer.id;
  const todayIso = isoFromLocalDate(new Date());
  const timeOffMinIso = todayIso;
  const timeOffMaxIso = `${Number(todayIso.slice(0, 4)) + 1}-12-31`;
  const mixBlockedTimeOffDaySet = new Set(
    collectProducerMixBlockedDays(
      producer,
      mtdRecords,
      timeOffMinIso,
      timeOffMaxIso
    )
  );

  function applyWorkDayChange(nextWorkDays: Weekday[]) {
    setWorkDays(nextWorkDays);
    // Drop extra dates that now fall on regular work weekdays.
    setExtraDays((days) =>
      days.filter((iso) => {
        const date = parseIsoToLocalDate(iso);
        return !!date && isEligibleExtraDate(date, nextWorkDays);
      })
    );
  }

  function toggleDay(day: Weekday) {
    if (workDays.includes(day)) {
      const nextWorkDays = workDays.filter((d) => d !== day);
      const conflicting = leaveDatesBlockedByWorkDays(
        timeOff,
        workDays,
        nextWorkDays
      );
      if (conflicting.length > 0) {
        setWorkDayLeaveConflict({ day, leaveDates: conflicting });
        return;
      }
      applyWorkDayChange(nextWorkDays);
      return;
    }

    const nextWorkDays = [...workDays, day];
    const conflicting = extraDatesBlockedByWorkDays(
      extraDays,
      nextWorkDays
    );
    if (conflicting.length > 0) {
      setWorkDayOtConflict({ day, extraDates: conflicting });
      return;
    }

    applyWorkDayChange(nextWorkDays);
  }

  function clearWorkDayOtConflict() {
    setWorkDayOtConflict(null);
  }

  function confirmWorkDayOtRemoval() {
    if (!workDayExtraConflict) return;
    const { day } = workDayExtraConflict;
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
    // Strip the cancelled dates out of stored ranges so they cannot return
    // if this weekday is turned back on later.
    setTimeOff((entries) => stripLeaveDatesFromEntries(entries, leaveDates));
    applyWorkDayChange(next);
    setWorkDayLeaveConflict(null);
  }

  function closeTimeOffForm() {
    setTimeOffDraft(createEmptyTimeOffDraft());
    setOffWorkDetail("");
    setTimeOffMultiDay(false);
    setTimeOffDateField(null);
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
    // Extra days sit on non-work weekdays — leave already can't start/end there.
    // Don't treat them as a separate cancel-first barrier.
    return [...new Set(expandTimeOffDates(timeOff))];
  }

  function hasMixOnLeaveDay(iso: string): boolean {
    return mixBlockedTimeOffDaySet.has(iso);
  }

  function mixLeaveDayTitle(iso: string): string | undefined {
    if (!producer) return undefined;
    return (
      describeProducerMixDayForLeave(
        listProducerMixBookingsOnDay(producer, iso, mtdRecords)
      ) ?? undefined
    );
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
    if (isNonWorkTimeOffDay(iso)) return true;
    // Mix days are highlighted (pink) but still selectable for leave.
    return false;
  }

  function isLeaveSpanBarrierDay(iso: string): boolean {
    if (expandTimeOffDates(timeOff).includes(iso)) return true;
    return false;
  }

  function clampEndAroundBlockedDays(startIso: string, endIso: string): string {
    const end = endIso < startIso ? startIso : endIso;
    let cursor = addDaysToIso(startIso, 1);
    for (let i = 0; i < 800 && cursor <= end; i += 1) {
      if (isLeaveSpanBarrierDay(cursor)) {
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
      if (isLeaveSpanBarrierDay(cursor)) {
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
    setOffWorkDetail("");
    setTimeOffMultiDay(false);
    setTimeOffDraft(createEmptyTimeOffDraft());
    setShowTimeOffForm(true);
  }

  function commitTimeOffDraft() {
    const reasonLabel = formatOffWorkReason(offWorkDetail);
    if (!timeOffDraft.startDate || !isValidOffWorkReason(reasonLabel) || !producer) {
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

    const currentOt = extraDatesInRange(
      extraDays,
      pendingEntry.startDate,
      endDate
    ).filter((iso) => {
      // Extra days are non-work weekdays; leave never applies there.
      // Only conflict when an Extra day somehow lands on a work day.
      const date = parseIsoToLocalDate(iso);
      return !!date && isEligibleTimeOffDate(date, workDays);
    });

    if (currentOt.length > 0) {
      showTimeOffNotice({
        kind: "ot-conflict",
        title: "Extra days on these dates",
        dateLine: `${formatIsoDayMonthYear(pendingEntry.startDate)}${
          pendingEntry.startDate !== endDate
            ? ` to ${formatIsoDayMonthYear(endDate)}`
            : ""
        } overlaps an extra day.`,
        pendingEntry,
        conflicts: [
          {
            id: producer.id,
            name: producer.name,
            extraDates: currentOt,
            cancelExtraDays: false,
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

    const mixConflicts = findLeaveMixConflicts(
      producer,
      pendingEntry.startDate,
      endDate,
      mtdRecords
    );
    if (mixConflicts.length > 0) {
      const fromMtd = mixConflicts.filter((b) => b.inMTD);
      const fromOrders = mixConflicts.filter((b) => !b.inMTD);
      showTimeOffNotice({
        kind: "mix-conflict",
        title: "Off day overlaps booked mixes",
        pendingEntry,
        fromOrders,
        fromMtd,
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
            ? { ...row, cancelExtraDays: !row.cancelExtraDays }
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
    if (!row?.cancelExtraDays) return;

    const removeOt = extraDatesInRange(
      extraDays,
      pendingEntry.startDate,
      pendingEntry.endDate
    );
    setExtraDays((prev) => prev.filter((day) => !removeOt.includes(day)));
    setTimeOff((prev) => [...prev, pendingEntry]);
    closeTimeOffForm();
    clearTimeOffNotice();
  }

  function removeTimeOff(keys: string | string[]) {
    const remove = new Set(Array.isArray(keys) ? keys : [keys]);
    setTimeOff((prev) => prev.filter((entry) => !remove.has(entry.key)));
  }

  function addExtraDay(iso: string) {
    const value = iso.trim();
    if (!value) return;
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (value < todayIso) return;
    if (existingTimeOffDays.includes(value)) return;
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (!isEligibleExtraDate(date, workDays)) return;
    setExtraDays((prev) =>
      [...new Set([...prev, value])].sort((a, b) => a.localeCompare(b))
    );
    setExtraDayPickerOpen(false);
  }

  function removeExtraDay(iso: string) {
    setExtraDays((prev) => prev.filter((day) => day !== iso));
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

  function buildAvailabilityPatch(
    nextTimeOff: DraftTimeOff[] = timeOff
  ): AvailabilityPatch {
    const parsed = parseInt(maxCostInput, 10);
    const committedMaxCost = hasMaxCapacity
      ? clampMaxCostPerDay(Number.isNaN(parsed) ? maxProducerCostPerDay : parsed)
      : null;

    return {
      workDays,
      timeOff: nextTimeOff
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
      extraDays,
    };
  }

  async function handleSave() {
    if (readOnly) {
      onClose();
      return;
    }
    const patch = buildAvailabilityPatch();
    onClose();
    try {
      await onSave(patch);
    } catch {
      // Error toast comes from updateProducer (optimistic update already applied).
    }
  }

  function confirmMixConflictLeave() {
    if (!timeOffNotice || timeOffNotice.kind !== "mix-conflict" || !producer) {
      return;
    }
    const { pendingEntry, fromOrders, fromMtd } = timeOffNotice;
    const affected = [...fromOrders, ...fromMtd];
    for (const booking of affected) {
      updateMTD(booking.recordId, patchForReassignLeave());
    }
    const nextTimeOff = [...timeOff, pendingEntry];
    onSave(buildAvailabilityPatch(nextTimeOff));
    clearTimeOffNotice();
    closeTimeOffForm();
    onClose();

    const focusId = affected[0]?.recordId;
    const params = new URLSearchParams();
    params.set("range", "reassigned");
    if (focusId) params.set("focus", focusId);
    router.push(`/orders?${params.toString()}`);
  }

  // Extra days and already-added time off block new ranges: start can't land
  // on/before a blocked day inside the chosen end, and end can't land on/after
  // a blocked day after start.
  const existingTimeOffDays = expandTimeOffDates(timeOff);
  // Off days only apply on work days — Extra day calendar must match chips.
  const applicableTimeOffDays = [
    ...new Set(
      timeOff.flatMap((entry) =>
        leaveApplicableDaysInRange(
          entry.startDate,
          entry.endDate || entry.startDate,
          workDays
        )
      )
    ),
  ];
  const blockedTimeOffDays = [
    ...new Set([...extraDays, ...existingTimeOffDays]),
  ];

  // Days that cannot be pick points for leave start/end (and can't sit inside
  // a leave range): existing leave. Extra days are non-work weekdays — shown
  // with Extra day styling, but leave can't start/end there either way.
  // Weekends/non-work weekdays are only invalid as endpoints — a leave range
  // may span them. Mix days stay selectable (pink) and confirm on commit.
  const leaveSpanBarrierDays: string[] = [];
  {
    let cursor = timeOffMinIso;
    for (let i = 0; i < 800 && cursor <= timeOffMaxIso; i += 1) {
      if (existingTimeOffDays.includes(cursor)) {
        leaveSpanBarrierDays.push(cursor);
      }
      cursor = addDaysToIso(cursor, 1);
    }
  }

  // Legacy name used by clamp helpers — barriers that split contiguous leave.
  const rangeBlockedDays = leaveSpanBarrierDays;

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
    const prevBlocked = prevExtraDayOnOrBefore(
      rangeBlockedDays,
      addDaysToIso(timeOffDraft.endDate, -1)
    );
    if (prevBlocked) {
      const afterBlocked = addDaysToIso(prevBlocked, 1);
      if (afterBlocked > timeOffStartMinIso) timeOffStartMinIso = afterBlocked;
    }
  }
  if (timeOffDraft.startDate) {
    const nextBlocked = nextExtraDayOnOrAfter(
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
    todayIso >= timeOffStartMinIso && todayIso <= timeOffStartMaxIso;
  const todayInTimeOffEndRange =
    todayIso >= timeOffEndMinIso && todayIso <= timeOffEndMaxIso;

  const todayStartDisabled =
    !todayInTimeOffStartRange ||
    isBlockedTimeOffCalendarDay(todayIso) ||
    (!!timeOffDraft.endDate && todayIso >= timeOffDraft.endDate) ||
    isTimeOffDateBlockedByExtraDay(
      todayIso,
      "start",
      timeOffDraft.endDate || null,
      rangeBlockedDays
    );
  const todayEndDisabled =
    !todayInTimeOffEndRange ||
    isBlockedTimeOffCalendarDay(todayIso) ||
    (!!timeOffDraft.startDate && todayIso <= timeOffDraft.startDate) ||
    isTimeOffDateBlockedByExtraDay(
      todayIso,
      "end",
      timeOffDraft.startDate || null,
      rangeBlockedDays
    );
  const todaySingleDisabled =
    !todayInTimeOffStartRange ||
    isBlockedTimeOffCalendarDay(todayIso) ||
    isTimeOffDateBlockedByExtraDay(
      todayIso,
      "start",
      todayIso,
      blockedTimeOffDays
    );

  function todayOffDayTitle(disabled: boolean): string {
    if (!disabled) return "Use today";
    return (
      timeOffDayTitle(todayIso, true) ??
      (isNonWorkTimeOffDay(todayIso)
        ? "Not a working day"
        : existingTimeOffDays.includes(todayIso)
          ? "Already added as an off day"
          : "Not available")
    );
  }

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
    // Extra days are still non-work weekdays — canceling them doesn't enable leave.
    // Keep Extra day styling via tone; tooltip matches other non-work days.
    if (extraDays.includes(iso) || isNonWorkTimeOffDay(iso)) {
      if (outsideRange) {
        return "Not a working day\nPick a work day for off day start/end";
      }
      return "Not a working day";
    }
    if (existingTimeOffDays.includes(iso)) {
      return "Already added as an off day";
    }
    const mixTitle = mixLeaveDayTitle(iso);
    if (mixTitle) {
      return mixTitle;
    }
    if (disabled && isOutsideTimeOffFieldRange(iso)) {
      return "Outside off day range";
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
  ): "extra" | "leave" | "mix" | undefined {
    if (iso < todayIso) return undefined;
    if (extraDays.includes(iso)) return "extra";
    if (hasMixOnLeaveDay(iso)) return "mix";
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

      <div className="relative flex max-h-[min(92dvh,720px)] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[28px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:rounded-[28px]">
        <header className="relative flex shrink-0 items-center justify-between border-b border-black/[0.08] px-4 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="min-w-[64px] text-left text-[15px] text-brand-ink-secondary transition hover:text-brand-ink"
          >
            {readOnly ? "Close" : "Cancel"}
          </button>
          <h2 className="absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold tracking-[-0.01em] text-brand-ink">
            {readOnly ? "Availability" : "Schedule and capacity"}
          </h2>
          {!readOnly ? (
            <button
              type="button"
              onClick={() => void handleSave()}
              className="min-w-[64px] text-right text-[15px] font-semibold text-brand-blue transition hover:text-brand-blue-hover"
            >
              Save
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
                {producer.categories?.length
                  ? producer.categories.slice(0, 3).join(", ") +
                    (producer.categories.length > 3
                      ? ` +${producer.categories.length - 3}`
                      : "")
                  : "No categories"}
              </p>
            </div>
          </div>

          <div className="mb-6 border-b border-black/[0.08]">
            <Tabs
              options={[
                { value: "schedule", label: "Schedule" },
                { value: "leave", label: "Off days" },
                { value: "limit", label: "Limit" },
              ]}
              value={activeTab}
              onChange={(value) => setActiveTab(value as AvailabilityTab)}
              accent="blue"
            />
          </div>

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
                  Extra days
                </p>
                <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
                  Days outside their regular work week. Click the × on a date
                  to cancel that extra day.
                </p>
              </div>
              <button
                ref={extraDayButtonRef}
                type="button"
                onClick={() => setExtraDayPickerOpen((open) => !open)}
                onMouseDown={(e) => e.stopPropagation()}
                className={clsx(
                  "inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-semibold ring-1 ring-inset transition",
                  extraDayPickerOpen
                    ? "bg-brand-blue text-white ring-brand-blue"
                    : "bg-brand-bg text-brand-blue ring-black/[0.06] hover:bg-brand-bg-subtle"
                )}
              >
                <CalendarPlus className="h-3.5 w-3.5" strokeWidth={2.5} />
                Add day
              </button>
              <ExtraDayPicker
                open={extraDayPickerOpen}
                onClose={() => setExtraDayPickerOpen(false)}
                workDays={workDays}
                selectedDays={extraDays}
                onSelect={addExtraDay}
                excludeRef={extraDayButtonRef}
                blockedTimeOffDays={applicableTimeOffDays}
                mixBlockedDays={[...mixBlockedTimeOffDaySet]}
              />
            </div>

            {extraDays.length === 0 ? (
              <p className="mt-4 text-center text-[13px] text-brand-ink-tertiary">
                No extra days added.
              </p>
            ) : (
              <ul className="mt-4 flex flex-wrap gap-2">
                {extraDays.map((iso) => (
                  <li key={iso}>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue-soft py-1.5 pl-3 pr-1.5 text-[12px] font-semibold text-brand-blue-deep ring-1 ring-inset ring-brand-blue-muted">
                      {formatExtraDayLabel(iso)}
                      <button
                        type="button"
                        onClick={() => removeExtraDay(iso)}
                        className="rounded-full p-1 text-brand-blue-deep/70 transition hover:bg-brand-blue-muted hover:text-brand-blue-deep"
                        aria-label={`Remove extra day ${iso}`}
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
                  Off days
                </p>
                <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
                  Mark off days on scheduled work days and add a short reason.
                  Booked mix days stay selectable and prompt for reassignment.
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
                  No off days scheduled yet.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {groupPersonalOffDayChips(timeOff, workDays).map((chip) => (
                    <li key={chip.keys.join("|")} className="min-w-0 max-w-full">
                      <span
                        className="flex max-w-full items-start gap-1.5 rounded-2xl bg-brand-blue-soft py-1.5 pl-3 pr-1.5 text-[12px] font-semibold leading-snug text-brand-blue-deep ring-1 ring-inset ring-brand-blue-muted"
                      >
                        <span className="min-w-0 flex-1 whitespace-normal break-words">
                          {chip.label}
                          {chip.reason.trim() ? (
                            <span className="font-medium text-brand-blue-deep/75">
                              {" · "}
                              {chip.reason.trim()}
                            </span>
                          ) : null}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeTimeOff(chip.keys)}
                          className="mt-0.5 shrink-0 rounded-full p-1 text-brand-blue-deep/70 transition hover:bg-brand-blue-muted hover:text-brand-blue-deep"
                          aria-label={`Remove ${chip.label} (${chip.reason})`}
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
                  Add off day
                </p>
                <button
                  type="button"
                  onClick={closeTimeOffForm}
                  className="rounded-full p-1 text-brand-blue-deep/70 transition hover:bg-brand-blue-muted hover:text-brand-blue-deep"
                  aria-label="Cancel add off day"
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
                          isTimeOffDateBlockedByExtraDay(
                            iso,
                            "start",
                            timeOffDraft.endDate || null,
                            rangeBlockedDays
                          )
                        }
                        dayTitle={timeOffStartDayTitle}
                        dayTone={timeOffDayTone}
                        ariaLabel="Off day start date"
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
                          <button
                            type="button"
                            onClick={() => {
                              if (todayStartDisabled) return;
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
                            disabled={todayStartDisabled}
                            title={todayOffDayTitle(todayStartDisabled)}
                            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-signature transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                          >
                            Today
                          </button>
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
                          isTimeOffDateBlockedByExtraDay(
                            iso,
                            "end",
                            timeOffDraft.startDate || null,
                            rangeBlockedDays
                          )
                        }
                        dayTitle={timeOffEndDayTitle}
                        dayTone={timeOffDayTone}
                        ariaLabel="Off day end date"
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
                          <button
                            type="button"
                            onClick={() => {
                              if (todayEndDisabled) return;
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
                            disabled={todayEndDisabled}
                            title={todayOffDayTitle(todayEndDisabled)}
                            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-signature transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                          >
                            Today
                          </button>
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
                        isTimeOffDateBlockedByExtraDay(
                          iso,
                          "start",
                          iso,
                          blockedTimeOffDays
                        )
                      }
                      dayTitle={timeOffDayTitle}
                      dayTone={timeOffDayTone}
                      ariaLabel="Off day date"
                      onSelect={(iso) => {
                        if (isBlockedTimeOffCalendarDay(iso)) return;
                        updateTimeOffDraft({
                          startDate: iso,
                          endDate: iso,
                        });
                      }}
                      footer={
                        <button
                          type="button"
                          onClick={() => {
                            if (todaySingleDisabled) return;
                            updateTimeOffDraft({
                              startDate: todayIso,
                              endDate: todayIso,
                            });
                            setTimeOffDateField(null);
                          }}
                          disabled={todaySingleDisabled}
                          title={todayOffDayTitle(todaySingleDisabled)}
                          className="rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-signature transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                          Today
                        </button>
                      }
                    />
                  </div>
                  )}

                  <div className="relative z-20 border-t border-black/[0.06] px-2.5 py-2">
                    <span className="block text-[9px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary">
                      Why
                    </span>
                    <label className="mt-1 flex min-w-0 items-center gap-1.5 rounded-full bg-brand-bg px-3 py-1.5 ring-1 ring-inset ring-black/[0.06] focus-within:ring-brand-blue/30">
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

                <button
                  type="button"
                  onClick={commitTimeOffDraft}
                  disabled={
                    !timeOffDraft.startDate ||
                    (timeOffMultiDay &&
                      (!timeOffDraft.endDate ||
                        timeOffDraft.endDate <= timeOffDraft.startDate)) ||
                    !offWorkDetail.trim()
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

              {(timeOffNotice.kind === "info" ||
                timeOffNotice.kind === "ot-conflict") &&
              (timeOffNotice.dateLine ||
                (timeOffNotice.kind === "info" && timeOffNotice.producerLine)) ? (
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
                    Cancel the extra day to apply this off day, or keep it and
                    skip. You can also remove an extra day with the × on its
                    chip above.
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
                              Extra day{" "}
                              {row.extraDates
                                .map((iso) => formatIsoDayMonthYear(iso))
                                .join(", ")}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleConflictCancel(row.id)}
                            className={clsx(
                              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                              row.cancelExtraDays
                                ? "bg-brand-blue text-white"
                                : "bg-brand-elevated text-brand-blue ring-1 ring-inset ring-brand-blue/30"
                            )}
                          >
                            {row.cancelExtraDays
                              ? "Extra day canceled"
                              : "Cancel extra day"}
                          </button>
                        </div>
                        <p className="mt-2 text-[11px] text-brand-ink-tertiary">
                          {row.cancelExtraDays
                            ? "Off day will be assigned."
                            : "Off day will be skipped. Extra day stays."}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {timeOffNotice.kind === "mix-conflict" ? (
                <div className="mt-4 space-y-3">
                  <p className="text-[12px] leading-relaxed text-brand-ink-secondary">
                    Off day is set. Reassign clears their producer assignment and
                    schedule and sends them to{" "}
                    <span className="font-semibold text-brand-ink">
                      Reassign: Off day
                    </span>{" "}
                    on Orders.
                  </p>
                  {timeOffNotice.fromOrders.length > 0 ? (
                    <div className="rounded-2xl bg-brand-bg px-3 py-3 ring-1 ring-inset ring-black/[0.06]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-ink-secondary">
                        Orders · Assigned → Reassign: Off day
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {timeOffNotice.fromOrders.map((b) => (
                          <li
                            key={b.recordId}
                            className="text-[12.5px] leading-snug text-brand-ink"
                          >
                            <span className="font-semibold">{b.programName}</span>
                            <span className="mt-0.5 block text-[11px] text-brand-ink-tertiary">
                              {formatIsoDayMonthYear(b.mixStartDate)} –{" "}
                              {formatIsoDayMonthYear(b.mixEndDate)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {timeOffNotice.fromMtd.length > 0 ? (
                    <div className="rounded-2xl bg-brand-bg px-3 py-3 ring-1 ring-inset ring-black/[0.06]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-ink-secondary">
                        MTD → Orders · Reassign: Off day
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {timeOffNotice.fromMtd.map((b) => (
                          <li
                            key={b.recordId}
                            className="text-[12.5px] leading-snug text-brand-ink"
                          >
                            <span className="font-semibold">{b.programName}</span>
                            <span className="mt-0.5 block text-[11px] text-brand-ink-tertiary">
                              {formatIsoDayMonthYear(b.mixStartDate)} –{" "}
                              {formatIsoDayMonthYear(b.mixEndDate)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
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
              {timeOffNotice.kind === "mix-conflict" ? (
                <button
                  type="button"
                  onClick={confirmMixConflictLeave}
                  className="w-full py-3.5 text-[15px] font-semibold text-rose-700 transition hover:bg-rose-50"
                >
                  Reassign
                </button>
              ) : timeOffNotice.kind === "ot-conflict" ? (
                (() => {
                  const applyCount = timeOffNotice.conflicts.filter(
                    (row) => row.cancelExtraDays
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
                          ? "Cancel extra day to apply"
                          : "Apply off day"}
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

      {workDayExtraConflict
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
                    Convert to regular work day?
                  </h2>
                  <p className="mt-3 text-center text-[13px] leading-relaxed text-brand-ink-secondary">
                    {weekdayLabel(workDayExtraConflict.day)} will become a normal
                    work day, and{" "}
                    {workDayExtraConflict.extraDates.length === 1
                      ? "this date will be cancelled from Extra days."
                      : "these dates will be cancelled from Extra days."}
                  </p>
                  <WorkDayOtConflictDateList
                    dates={workDayExtraConflict.extraDates}
                  />
                </div>
                <div className="shrink-0 border-t border-black/[0.08]">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={confirmWorkDayOtRemoval}
                      className="border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-blue transition hover:bg-brand-blue-soft/40"
                    >
                      Make regular work day
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
                    Cancel off day?
                  </h2>
                  <p className="mt-3 text-center text-[13px] leading-relaxed text-brand-ink-secondary">
                    Making {weekdayLabel(workDayLeaveConflict.day)} a
                    non-working day will cancel the off day on{" "}
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
                      Cancel off day
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
