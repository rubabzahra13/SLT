"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Lock,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { InlineDateInput } from "@/components/mtd/InlineFields";
import { AssignLimitWarningModal } from "@/components/mtd/AssignLimitWarningModal";
import {
  editorRequestForAssignment,
  findLinkedOrder,
  getEditorNamesForCategory,
  getEditorWorkload,
  getEditorBookedUntilIso,
  getRequestedEditorFromRecord,
  findProducerByAssignmentKey,
  getDisplayAssignedProducer,
  orderCategoryToProducerCategory,
} from "@/lib/editor-assignment";
import { resolveMTDFormMeta } from "@/lib/mtd-filters";
import { normalizeProducerKey, producerKeysMatch } from "@/lib/producer-keys";
import {
  formatDisplayDate,
  parseFlexibleDate,
  toCanonicalIsoDate,
  toIsoDateString,
} from "@/lib/dates";
import { suggestMixStartDate, suggestMixEndDate } from "@/lib/scheduling";
import {
  checkProducerDailyLimits,
  countProducerWorkingDays,
  dailyLimitCheckHasIssues,
  isProducerAvailableForMixWindow,
  isProducerWorkableDay,
  findMixWindowBlocker,
  describeMixWindowBlocker,
  type DailyLimitCheck,
  type MixWindowBlocker,
} from "@/lib/producer-availability";
import {
  isProducerAvailableOnDate,
  calculateProducerNextOpening,
  type ProducerOpeningOptions,
} from "@/lib/producer-schedule-calc";
import {
  createBookedCostEstimator,
  estimateRecordProducerPayout,
} from "@/lib/producer-payout-estimate";
import type { StudioHoliday } from "@/lib/producer-time-off";
import {
  buildMixDateCalendarRules,
  collectAssignCalendarEvents,
  describeDailyLimitIssues,
  describeDailyLimitUsage,
  formatDailyLimits,
  formatProducerWorkDaysShort,
  type AssignCalendarEvent,
} from "@/lib/assign-editor-calendar";
import {
  CHEER_FORM_SUBTABS,
  DANCE_FORM_SUBTABS,
  ORDER_FORM_TABS,
  type MTDRecord,
  type MTDRecordStatus,
  type Order,
  type Producer,
  type ScheduleEntry,
} from "@/types";

export type EditorAssignmentResult = {
  editorRequest: string;
  assignedProducer: string | null;
  mixStartDate?: string;
  mixEndDate?: string;
  recordStatus?: MTDRecordStatus;
  status?: MTDRecord["status"];
};

type AssignEditorModalProps = {
  open: boolean;
  record: MTDRecord | null;
  mtdRecords: MTDRecord[];
  allOrders: Order[];
  producers: Producer[];
  schedule: ScheduleEntry[];
  /** Studio holidays from settings (defaults + any custom dates you add). */
  studioHolidays?: StudioHoliday[];
  /** When true, show assignment details only (MTD tab after move). */
  readOnly?: boolean;
  /** Full assign flow as an app page. */
  variant?: "modal" | "page";
  /** Where back / cancel / success should return. */
  returnHref?: string;
  onClose: () => void;
  onAssign: (recordId: string, result: EditorAssignmentResult) => void;
};

/**
 * Everything the UI needs to reason about one producer for this order:
 * their recommended first date, whether they can work the *selected* mix
 * window (and if not, what blocks them), and how the window sits against
 * their daily limits.
 */
type ProducerRow = {
  name: string;
  key: string;
  producer?: Producer;
  mixCount: number;
  bookedUntil?: string;
  /** First working day within daily limits (the recommended start). */
  nextOpeningDate: Date | null;
  nextOpeningIso: string;
  /** Today is recommended: a working day within daily limits. */
  isAvailableToday: boolean;
  /** Today is a working day, regardless of daily limits. */
  canWorkToday: boolean;
  /** Only meaningful when a mix window is selected. */
  availableForWindow: boolean;
  blocker: MixWindowBlocker | null;
  blockerLabel: string | null;
  /** Daily mix / cost load across the selected window with this mix added. */
  limitCheck: DailyLimitCheck | null;
  /** The selected window goes over a daily limit (not recommended, still assignable). */
  overLimit: boolean;
  workDaysShort: string;
  dailyLimitsLabel: string;
};

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** The picked mix end, else the start plus the package's working days for this producer. */
function mixWindowEndFor(
  window: { startIso: string; endIso: string },
  packageStr: string,
  producer: Producer | undefined,
  studioHolidays: StudioHoliday[]
): string {
  return (
    window.endIso ||
    suggestMixEndDate(window.startIso, packageStr, { producer, studioHolidays }) ||
    window.startIso
  );
}

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function AssignEditorModal({
  open,
  record,
  mtdRecords,
  allOrders,
  producers,
  schedule,
  studioHolidays = [],
  readOnly = false,
  variant = "modal",
  returnHref,
  onClose,
  onAssign,
}: AssignEditorModalProps) {
  const isPage = variant === "page";
  const router = useRouter();

  const orderById = useMemo(() => {
    const map = new Map<string, Order>();
    for (const order of allOrders) {
      map.set(order.id, order);
      if (order.legacyId) map.set(order.legacyId, order);
      if (order.uuid) map.set(order.uuid, order);
    }
    return map;
  }, [allOrders]);

  /** Form + subtype from the linked order (same chips as the board header). */
  const formMeta = useMemo(
    () => (record ? resolveMTDFormMeta(record, orderById) : null),
    [record, orderById]
  );

  const requiredProducerCategory = useMemo(() => {
    if (!formMeta) return "";
    return orderCategoryToProducerCategory(
      formMeta.formType,
      formMeta.canonicalSubtypeId
    );
  }, [formMeta]);

  /** Label matching Form / Cheer·Dance subtype chips on the order header. */
  const orderCategoryLabel = useMemo(() => {
    if (!formMeta) return "";
    if (formMeta.formType === "school-all-star-cheer") {
      return (
        CHEER_FORM_SUBTABS.find((t) => t.id === formMeta.cheerFormSubtype)
          ?.label || "Cheer"
      );
    }
    if (formMeta.formType === "school-all-star-dance") {
      return (
        DANCE_FORM_SUBTABS.find((t) => t.id === formMeta.danceFormSubtype)
          ?.label || "Dance"
      );
    }
    return (
      ORDER_FORM_TABS.find((t) => t.id === formMeta.formType)?.label ||
      requiredProducerCategory
    );
  }, [formMeta, requiredProducerCategory]);

  const categoryEditors = useMemo(
    () =>
      requiredProducerCategory
        ? getEditorNamesForCategory(producers, requiredProducerCategory)
        : [],
    [producers, requiredProducerCategory]
  );

  const [selectedEditor, setSelectedEditor] = useState<string>("");
  const [draftMixStartDate, setDraftMixStartDate] = useState("");
  const [draftMixEndDate, setDraftMixEndDate] = useState("");
  const [limitConfirmOpen, setLimitConfirmOpen] = useState(false);

  const displayAssigned = record ? getDisplayAssignedProducer(record) : null;
  const formalAssigned = record?.assignedProducer?.trim() || null;
  const isAssignmentLocked = Boolean(formalAssigned);

  const today = useMemo(() => startOfLocalDay(new Date()), []);

  const draftStartIso = toIsoDateString(draftMixStartDate);
  const draftEndIso = toIsoDateString(draftMixEndDate);

  const linkedOrder = useMemo(
    () => (record ? findLinkedOrder(record, allOrders) : undefined),
    [record, allOrders]
  );

  const requestedEditor = useMemo(
    () =>
      record ? getRequestedEditorFromRecord(record, producers, linkedOrder) : null,
    [record, producers, linkedOrder]
  );

  const editorWorkload = useMemo(
    () => getEditorWorkload(mtdRecords, record?.id),
    [mtdRecords, record?.id]
  );

  const editorBookedUntil = useMemo(() => {
    const map = new Map<string, string>();
    for (const name of categoryEditors) {
      const until = getEditorBookedUntilIso(name, mtdRecords, record?.id);
      if (until) map.set(normalizeProducerKey(name), until);
    }
    return map;
  }, [categoryEditors, mtdRecords, record?.id]);

  const assignedProducer = useMemo(
    () =>
      isAssignmentLocked && formalAssigned
        ? findProducerByAssignmentKey(formalAssigned, producers)
        : undefined,
    [isAssignmentLocked, formalAssigned, producers]
  );

  /**
   * The window every availability check keys off. When the user has picked a
   * start (and optionally end) we honour those exact dates; without an end,
   * each producer is evaluated to their own package-estimated end.
   */
  const evalWindow = useMemo(() => {
    if (!record || !draftStartIso) return null;
    return { startIso: draftStartIso, endIso: draftEndIso };
  }, [record, draftStartIso, draftEndIso]);

  const windowMode = Boolean(evalWindow);
  /** Strip only switches to “free for window” once both mix dates are set. */
  const stripWindowMode = Boolean(draftStartIso && draftEndIso);

  /** Payout per booked mix, counted in full on every day of its range. */
  const estimateBookedCost = useMemo(
    () => createBookedCostEstimator(producers, orderById),
    [producers, orderById]
  );

  const producerRows = useMemo((): ProducerRow[] => {
    if (readOnly || !record) return [];

    return categoryEditors.map((name) => {
      const key = normalizeProducerKey(name);
      const producer = findProducerByAssignmentKey(name, producers);
      const mixCount = editorWorkload.get(key) ?? 0;
      const bookedUntil = editorBookedUntil.get(key);

      let nextOpeningDate: Date | null = null;
      let isAvailableToday = false;
      let canWorkToday = false;
      let availableForWindow = false;
      let blocker: MixWindowBlocker | null = null;
      let limitCheck: DailyLimitCheck | null = null;

      if (producer) {
        const openingOptions: ProducerOpeningOptions = {
          excludeRecordId: record.id,
          estimateCost: estimateBookedCost,
          newMixCost: estimateRecordProducerPayout(record, producer, orderById),
        };

        canWorkToday = isProducerWorkableDay(producer, today, studioHolidays);
        isAvailableToday = isProducerAvailableOnDate(
          producer,
          today,
          mtdRecords,
          schedule,
          studioHolidays,
          openingOptions
        );

        const calc = calculateProducerNextOpening(
          producer,
          mtdRecords,
          schedule,
          today,
          studioHolidays,
          openingOptions
        );
        if (calc.nextAvailable !== "TBD") {
          nextOpeningDate = startOfLocalDay(calc.nextAvailableDate);
        }

        if (evalWindow) {
          const endIso = mixWindowEndFor(
            evalWindow,
            record.package,
            producer,
            studioHolidays
          );
          availableForWindow = isProducerAvailableForMixWindow(
            producer,
            evalWindow.startIso,
            endIso,
            studioHolidays
          );
          if (!availableForWindow) {
            blocker = findMixWindowBlocker(
              producer,
              evalWindow.startIso,
              endIso,
              studioHolidays
            );
          }
          limitCheck = checkProducerDailyLimits(
            producer,
            evalWindow.startIso,
            endIso,
            mtdRecords,
            { ...openingOptions, studioHolidays }
          );
        }
      }

      return {
        name,
        key,
        producer,
        mixCount,
        bookedUntil,
        nextOpeningDate,
        nextOpeningIso: nextOpeningDate
          ? toCanonicalIsoDate(nextOpeningDate)
          : "",
        isAvailableToday,
        canWorkToday,
        availableForWindow,
        blocker,
        blockerLabel: describeMixWindowBlocker(blocker),
        limitCheck,
        overLimit: dailyLimitCheckHasIssues(limitCheck),
        workDaysShort: producer ? formatProducerWorkDaysShort(producer) : "",
        dailyLimitsLabel: producer ? formatDailyLimits(producer) : "",
      };
    });
  }, [
    readOnly,
    record,
    categoryEditors,
    producers,
    mtdRecords,
    schedule,
    studioHolidays,
    editorWorkload,
    editorBookedUntil,
    evalWindow,
    today,
    orderById,
    estimateBookedCost,
  ]);

  const rowsByKey = useMemo(() => {
    const map = new Map<string, ProducerRow>();
    for (const row of producerRows) map.set(row.key, row);
    return map;
  }, [producerRows]);

  /** A producer counts as a candidate if they can work the window (window mode) or has any opening (browse). */
  function isRowCandidate(row: ProducerRow): boolean {
    return windowMode ? row.availableForWindow : Boolean(row.nextOpeningDate);
  }

  /**
   * Best alternative producer given all factors: within daily limits first,
   * then soonest opening, then lightest workload.
   */
  const bestCandidateRow = useMemo(() => {
    const candidates = producerRows.filter((row) =>
      windowMode ? row.availableForWindow : Boolean(row.nextOpeningDate)
    );
    if (candidates.length === 0) return null;
    return [...candidates].sort((a, b) => {
      const la = windowMode && a.overLimit ? 1 : 0;
      const lb = windowMode && b.overLimit ? 1 : 0;
      if (la !== lb) return la - lb;
      const ta = a.nextOpeningDate ? a.nextOpeningDate.getTime() : Infinity;
      const tb = b.nextOpeningDate ? b.nextOpeningDate.getTime() : Infinity;
      if (ta !== tb) return ta - tb;
      return a.mixCount - b.mixCount;
    })[0];
  }, [producerRows, windowMode]);

  const requestedRow = useMemo(
    () =>
      requestedEditor
        ? rowsByKey.get(normalizeProducerKey(requestedEditor)) ?? null
        : null,
    [requestedEditor, rowsByKey]
  );

  /** Live status of the requested producer against the current context. */
  const requestedInfo = useMemo(() => {
    if (!requestedEditor) {
      return { kind: "first_available" as const };
    }
    if (!requestedRow) {
      return { kind: "unknown" as const, name: requestedEditor };
    }
    const available = windowMode
      ? requestedRow.availableForWindow
      : requestedRow.canWorkToday;
    const caution = windowMode
      ? requestedRow.overLimit
      : !requestedRow.isAvailableToday;
    const nextOpenLabel = requestedRow.nextOpeningIso
      ? formatDisplayDate(requestedRow.nextOpeningIso)
      : null;

    let statusLabel = "";
    if (available && !caution) {
      statusLabel = "Available";
    } else if (available && windowMode) {
      statusLabel = "Available · not recommended (daily limit)";
    } else if (available) {
      statusLabel = nextOpenLabel
        ? `Available · at daily limit today, recommended ${nextOpenLabel}`
        : "Available · at daily limit today";
    } else if (nextOpenLabel) {
      statusLabel = `Unavailable till ${nextOpenLabel}`;
    } else if (windowMode && requestedRow.blockerLabel) {
      statusLabel = `Unavailable · ${requestedRow.blockerLabel}`;
    } else {
      statusLabel = "Unavailable · no date yet";
    }

    return {
      kind: "specific" as const,
      name: requestedEditor,
      row: requestedRow,
      available,
      caution: available && caution,
      statusLabel,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedEditor, requestedRow, windowMode]);

  /** The single best recommendation, honouring the request when possible. */
  const suggestion = useMemo(() => {
    if (!record) return null;

    // 1. Honour the requested producer when they can take it within their limits.
    if (
      requestedRow &&
      isRowCandidate(requestedRow) &&
      !(windowMode && requestedRow.overLimit)
    ) {
      return {
        name: requestedRow.name,
        row: requestedRow,
        tone: "good" as const,
        reason: "requested_available" as const,
        reasonTitle: "Requested producer available",
      };
    }

    const best = bestCandidateRow;
    if (!best) return null;

    const bestOverLimit = windowMode && best.overLimit;
    return {
      name: best.name,
      row: best,
      tone:
        requestedRow || bestOverLimit ? ("swap" as const) : ("good" as const),
      reason: "first_available" as const,
      reasonTitle: bestOverLimit
        ? "First available · everyone goes over a daily limit on these dates"
        : "First available",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, requestedRow, bestCandidateRow, windowMode]);

  const availableNames = useMemo(
    () => producerRows.filter(isRowCandidate).map((row) => row.name),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [producerRows, windowMode]
  );

  useEffect(() => {
    if (!record) return;
    if (!isPage && !open) return;

    const assignedKey = record.assignedProducer?.trim();
    if (assignedKey) {
      const match = categoryEditors.find((name) =>
        producerKeysMatch(name, assignedKey)
      );
      setSelectedEditor(match ?? assignedKey.toUpperCase());
      setDraftMixStartDate(toIsoDateString(record.mixStartDate) || "");
      setDraftMixEndDate(toIsoDateString(record.mixEndDate) || "");
      return;
    }

    // No producer yet — leave everything empty until the user chooses.
    setSelectedEditor("");
    setDraftMixStartDate("");
    setDraftMixEndDate("");
  }, [open, record, categoryEditors, isPage]);

  const selectedProducer = useMemo(
    () =>
      selectedEditor
        ? findProducerByAssignmentKey(selectedEditor, producers)
        : undefined,
    [selectedEditor, producers]
  );

  const calendarRange = useMemo(() => {
    if (!evalWindow || !record) return null;
    return {
      startIso: evalWindow.startIso,
      endIso: mixWindowEndFor(
        evalWindow,
        record.package,
        selectedProducer,
        studioHolidays
      ),
    };
  }, [evalWindow, record, selectedProducer, studioHolidays]);

  const calendarWorkDays = useMemo(
    () =>
      calendarRange && selectedProducer
        ? countProducerWorkingDays(
            selectedProducer,
            calendarRange.startIso,
            calendarRange.endIso,
            studioHolidays
          )
        : null,
    [calendarRange, selectedProducer, studioHolidays]
  );

  /** Suggested end shown in the end calendar; never auto-filled. */
  const suggestedEndIso = useMemo(
    () =>
      draftStartIso && record
        ? suggestMixEndDate(draftStartIso, record.package, {
            producer: selectedProducer,
            studioHolidays,
          })
        : "",
    [draftStartIso, record, selectedProducer, studioHolidays]
  );

  const mixDateRules = useMemo(
    () =>
      buildMixDateCalendarRules({
        producer: selectedProducer,
        studioHolidays,
        mtdRecords,
        excludeRecordId: record?.id,
        estimateCost: estimateBookedCost,
        newMixCost:
          record && selectedProducer
            ? estimateRecordProducerPayout(record, selectedProducer, orderById)
            : null,
        todayIso: toCanonicalIsoDate(today),
      }),
    [
      selectedProducer,
      studioHolidays,
      mtdRecords,
      record,
      estimateBookedCost,
      orderById,
      today,
    ]
  );

  const calendarEvents = useMemo((): AssignCalendarEvent[] => {
    if (!calendarRange) return [];
    return collectAssignCalendarEvents(
      calendarRange.startIso,
      calendarRange.endIso,
      studioHolidays,
      selectedProducer ?? null
    );
  }, [calendarRange, studioHolidays, selectedProducer]);

  const selectedRow = selectedEditor
    ? rowsByKey.get(normalizeProducerKey(selectedEditor))
    : undefined;

  const selectedWindowConflict = Boolean(
    selectedProducer && evalWindow && selectedRow && !selectedRow.availableForWindow
  );
  const selectedLimitCheck = selectedProducer
    ? selectedRow?.limitCheck ?? null
    : null;
  const selectedOverLimit =
    !selectedWindowConflict && dailyLimitCheckHasIssues(selectedLimitCheck);

  const mixStartIso = toIsoDateString(
    draftMixStartDate || (isAssignmentLocked ? record?.mixStartDate : "") || ""
  );
  const mixEndIso = toIsoDateString(
    draftMixEndDate || (isAssignmentLocked ? record?.mixEndDate : "") || ""
  );
  const showProducerBooking = Boolean(mixStartIso || mixEndIso);

  if (!record) return null;
  if (!isPage && !open) return null;

  const activeRecord = record;
  const isViewOnly = readOnly;
  const showCompactAssigned = isViewOnly || isAssignmentLocked;
  const genreLabel =
    orderCategoryLabel ||
    requiredProducerCategory ||
    activeRecord.category ||
    "this";

  const windowStartLabel = evalWindow
    ? formatDisplayDate(evalWindow.startIso)
    : "";
  const windowEndLabel = draftEndIso ? formatDisplayDate(draftEndIso) : "";

  const canSubmit =
    Boolean(selectedEditor) &&
    categoryEditors.some((name) => producerKeysMatch(name, selectedEditor)) &&
    Boolean(draftStartIso) &&
    Boolean(draftEndIso) &&
    draftEndIso >= draftStartIso &&
    !selectedWindowConflict &&
    !showCompactAssigned &&
    !isAssignmentLocked;

  function handleUnassign() {
    onAssign(activeRecord.id, {
      editorRequest: "FA",
      assignedProducer: null,
      mixStartDate: "",
      mixEndDate: "",
    });
    setDraftMixStartDate("");
    setDraftMixEndDate("");
    setSelectedEditor("");
  }

  /**
   * Pick an editor. When no start date is set yet, fill it from the producer's
   * availability. When the user already chose dates, keep them untouched.
   */
  function applyEditorSelection(name: string, startIso?: string) {
    setSelectedEditor(name);
    if (toIsoDateString(draftMixStartDate)) return;
    const nextStart =
      startIso || suggestMixStartDate(name, producers, schedule, mtdRecords) || "";
    setDraftMixStartDate(nextStart);
    // Mix end is never auto-filled — the user sets it explicitly.
  }

  function clearDates() {
    setDraftMixStartDate("");
    setDraftMixEndDate("");
  }

  function handleMixStartChange(next: string) {
    setDraftMixStartDate(next);
    const nextIso = toIsoDateString(next);
    if (draftEndIso && nextIso && draftEndIso < nextIso) setDraftMixEndDate("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      if (selectedWindowConflict) {
        alert(
          selectedRow?.blockerLabel ||
            "This producer is not available for the selected mix dates."
        );
      }
      return;
    }

    if (selectedOverLimit) {
      setLimitConfirmOpen(true);
      return;
    }
    commitAssignment();
  }

  function commitAssignment() {
    onAssign(activeRecord.id, {
      editorRequest: editorRequestForAssignment(
        selectedEditor,
        requestedEditor,
        availableNames
      ),
      assignedProducer: selectedEditor,
      mixStartDate: draftStartIso,
      mixEndDate: draftEndIso,
    });
    if (isPage && returnHref) {
      router.push(returnHref);
    } else {
      onClose();
    }
  }

  const limitConfirmModal = (
    <AssignLimitWarningModal
      open={limitConfirmOpen && selectedOverLimit}
      producerName={selectedProducer?.name?.trim() || selectedEditor}
      rangeLabel={
        draftStartIso && draftEndIso
          ? `${formatDisplayDate(draftStartIso)} – ${formatDisplayDate(draftEndIso)}`
          : windowStartLabel
      }
      issues={selectedLimitCheck ? describeDailyLimitIssues(selectedLimitCheck) : []}
      usage={selectedLimitCheck ? describeDailyLimitUsage(selectedLimitCheck) : []}
      onClose={() => setLimitConfirmOpen(false)}
      onConfirm={commitAssignment}
    />
  );

  const assignmentForm = (
        <form
          onSubmit={handleSubmit}
          className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden"
        >
          {showCompactAssigned ? (
            <div className="flex min-h-0 flex-col px-6 py-5">
              <div className="space-y-5">
                <div>
                  <p className="text-label">Producer</p>
                  <p className="mt-0.5 text-[11px] text-brand-ink-tertiary">
                    Requested:{" "}
                    <span className="font-semibold text-brand-ink">
                      {requestedEditor || "First available"}
                    </span>
                  </p>
                  {displayAssigned ? (
                    <div className="mt-1.5 rounded-xl border border-brand-line/70 bg-brand-bg/50 px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          producer={assignedProducer}
                          initials={displayAssigned}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-brand-ink">
                            {displayAssigned}
                          </p>
                          <p className="text-[11px] text-brand-ink-tertiary">
                            {isViewOnly ? "Assigned on MTD" : "Currently assigned"}
                          </p>
                        </div>
                        {isViewOnly ? (
                          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-bg text-brand-ink-tertiary">
                            <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleUnassign}
                            title="Unassign producer"
                            aria-label="Unassign producer"
                            className="inline-flex h-7 shrink-0 items-center justify-center rounded-lg border border-brand-line/70 bg-brand-elevated px-2.5 text-[11px] font-semibold text-brand-ink-secondary transition hover:border-brand-warning/40 hover:bg-brand-warning/10 hover:text-brand-warning"
                          >
                            Unassign
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1.5 rounded-xl border border-brand-line/70 bg-brand-bg/50 px-3 py-2.5">
                      <p className="text-[13px] font-medium text-brand-ink-tertiary">
                        No producer assigned
                      </p>
                      <p className="mt-1 text-[11px] text-brand-ink-tertiary">
                        Assign a producer on the Orders tab before moving to MTD.
                      </p>
                    </div>
                  )}
                </div>

                {showProducerBooking ? (
                  <div className="rounded-xl border border-brand-line/70 bg-brand-bg/40 px-3 py-2.5">
                    <p className="text-label">Producer booking</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-brand-ink-tertiary">
                      Mix dates from assignment. Reassign to change them.
                    </p>
                    <dl className="mt-2.5 space-y-1.5">
                      <div className="flex items-baseline justify-between gap-3 text-[12px]">
                        <dt className="text-brand-ink-tertiary">From</dt>
                        <dd className="font-medium tabular-nums text-brand-ink">
                          {mixStartIso ? formatDisplayDate(mixStartIso) : "Not set"}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-3 text-[12px]">
                        <dt className="text-brand-ink-tertiary">Until</dt>
                        <dd className="font-medium tabular-nums text-brand-ink">
                          {mixEndIso ? formatDisplayDate(mixEndIso) : "Not set"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <div
                className={clsx(
                  "h-0 min-h-0 flex-1 overflow-y-auto overscroll-contain",
                  isPage
                    ? "px-6 py-6 pb-24 lg:px-8"
                    : "px-5 py-4 scrollbar-hide sm:px-6"
                )}
              >
                <style>{`
                  .assign-editor-layout {
                    display: grid;
                    gap: 1rem;
                  }
                  @media (min-width: 1024px) {
                    .assign-editor-layout {
                      grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.85fr);
                      align-items: start;
                      gap: 1.25rem 1.75rem;
                    }
                  }
                `}</style>
                <div className="space-y-4 lg:space-y-5">
                  <div className="assign-editor-layout">
                    <div className="min-w-0 space-y-4">
                      {categoryEditors.length === 0 ? (
                        <p className="rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3 py-2 text-[13px] text-brand-warning">
                          No producers specialize in {genreLabel}.
                        </p>
                      ) : (
                        <AvailabilityProducerStrip
                          rows={producerRows}
                          windowMode={stripWindowMode}
                          selectedEditor={selectedEditor}
                          genreLabel={genreLabel}
                          windowLabel={
                            stripWindowMode
                              ? `${windowStartLabel}${
                                  windowEndLabel ? ` – ${windowEndLabel}` : ""
                                }`
                              : null
                          }
                          onSelect={applyEditorSelection}
                        />
                      )}
                    </div>

                    <div className="min-w-0 space-y-4">
                      <div className="rounded-2xl border border-brand-line/60 bg-white p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-brand-ink-tertiary">
                          Requested on form
                        </p>
                        <div className="mt-2">
                          <RequestedCard
                            variant="compact"
                            info={requestedInfo}
                            producers={producers}
                            readOnly
                          />
                        </div>
                        <div className="mt-4 border-t border-brand-line/40 pt-3">
                          <p className="text-[11px] font-medium text-brand-ink-tertiary">
                            Assigned producer
                          </p>
                          <div className="mt-1.5">
                            {selectedEditor ? (
                              <div
                                className={clsx(
                                  "flex w-full items-center gap-2 rounded-lg border px-2 py-1.5",
                                  selectedWindowConflict || selectedOverLimit
                                    ? "border-brand-warning/35 bg-brand-warning/8"
                                    : "border-brand-line/50 bg-brand-bg/40"
                                )}
                              >
                                <Avatar
                                  producer={selectedProducer}
                                  initials={selectedEditor}
                                  size="xs"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[12px] font-semibold text-brand-ink">
                                    {selectedEditor}
                                  </span>
                                  <span
                                    className={clsx(
                                      "block truncate text-[10px]",
                                      selectedWindowConflict || selectedOverLimit
                                        ? "text-brand-warning"
                                        : "text-brand-success"
                                    )}
                                  >
                                    {selectedWindowConflict
                                      ? selectedRow?.blockerLabel ||
                                        "Not free for selected dates"
                                      : selectedOverLimit
                                        ? "Available · not recommended (daily limit)"
                                        : selectedRow?.isAvailableToday
                                        ? "Available today"
                                        : selectedRow?.nextOpeningIso
                                          ? `Available from ${formatDisplayDate(selectedRow.nextOpeningIso)}`
                                          : "Selected"}
                                  </span>
                                </span>
                              </div>
                            ) : (
                              <p className="rounded-lg border border-dashed border-brand-line/70 bg-brand-bg/30 px-3 py-2.5 text-[12px] text-brand-ink-tertiary">
                                Pick someone from first available dates
                              </p>
                            )}
                          </div>
                          {selectedWindowConflict ? (
                            <p className="mt-2 rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3 py-2 text-[12px] text-brand-warning">
                              {selectedEditor} can&apos;t take these dates
                              {selectedRow?.blockerLabel
                                ? ` — ${selectedRow.blockerLabel.toLowerCase()}`
                                : ""}
                              .
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-brand-line/60 bg-white p-4">
                        <SectionHeading title="Booking dates" />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-[11px] font-medium text-brand-ink-tertiary">
                              Mix start
                            </label>
                            <div className="mt-1">
                              <InlineDateInput
                                value={draftMixStartDate}
                                placeholder="Required"
                                min={toCanonicalIsoDate(today)}
                                menuZIndex={80}
                                onChange={handleMixStartChange}
                                isDateDisabled={mixDateRules.isDateDisabled}
                                dayTitle={mixDateRules.dayTitle}
                                dayTone={mixDateRules.dayTone}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-brand-ink-tertiary">
                              Mix end
                            </label>
                            <div className="mt-1">
                              <InlineDateInput
                                value={draftMixEndDate}
                                placeholder="Required"
                                template={suggestedEndIso || undefined}
                                min={draftStartIso || toCanonicalIsoDate(today)}
                                menuZIndex={80}
                                onChange={setDraftMixEndDate}
                                isDateDisabled={mixDateRules.isDateDisabled}
                                dayTitle={mixDateRules.dayTitle}
                                dayTone={mixDateRules.dayTone}
                              />
                            </div>
                          </div>
                        </div>
                        {windowMode ? (
                          <button
                            type="button"
                            onClick={clearDates}
                            className="mt-3 text-[11px] font-semibold text-brand-info transition hover:text-brand-ink"
                          >
                            Clear dates · browse by soonest opening
                          </button>
                        ) : null}
                        {calendarRange ? (
                          <div className="mt-4">
                            <CalendarTransparencyPanel
                              calendarRange={calendarRange}
                              events={calendarEvents}
                              selectedProducer={selectedProducer}
                              selectedEditor={selectedEditor}
                              limitCheck={selectedLimitCheck}
                              workDays={calendarWorkDays}
                              endIsSuggested={!draftEndIso}
                            />
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-2xl border border-brand-line/60 bg-white p-4">
                        <SectionHeading
                          title="Suggested pick"
                          subtitle="Best match from request, dates, and workload"
                        />
                        {suggestion ? (
                          <SuggestionDetailCard
                            suggestion={suggestion}
                            producers={producers}
                            selectedEditor={selectedEditor}
                            windowMode={windowMode}
                            onSelect={() =>
                              applyEditorSelection(suggestion.name)
                            }
                          />
                        ) : (
                          <p className="rounded-xl border border-brand-line/70 bg-brand-bg/40 px-3 py-2.5 text-[13px] text-brand-ink-tertiary">
                            {windowMode
                              ? "No producer is free for the selected dates."
                              : "No suggestion available yet."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={clsx(
                  "flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-brand-line/60 bg-brand-elevated/95 px-4 py-3 backdrop-blur-sm sm:px-6",
                  isPage && "fixed bottom-0 left-0 right-0 z-30"
                )}
                style={
                  isPage
                    ? ({
                        left: "var(--sidebar-margin, 0px)",
                      } as React.CSSProperties)
                    : undefined
                }
              >
                <p className="text-[11px] text-brand-ink-tertiary">
                  {selectedEditor ? (
                    <>
                      Selected{" "}
                      <span className="font-semibold text-brand-ink">
                        {selectedEditor}
                      </span>
                      {draftStartIso && draftEndIso
                        ? ` · ${formatDisplayDate(draftStartIso)} – ${formatDisplayDate(draftEndIso)}`
                        : " · set mix dates to assign"}
                      {selectedOverLimit ? (
                        <span className="font-semibold text-brand-warning">
                          {" "}
                          · Not recommended (daily limit)
                        </span>
                      ) : null}
                    </>
                  ) : (
                    "Select a producer and mix dates to assign"
                  )}
                </p>
                <div className="flex items-center gap-2">
                  {isPage && returnHref ? (
                    <Link
                      href={returnHref}
                      className="rounded-lg border border-brand-line/70 px-3 py-2 text-[13px] font-medium text-brand-ink-secondary transition hover:bg-brand-bg"
                    >
                      Cancel
                    </Link>
                  ) : null}
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="rounded-lg bg-brand-cta px-4 py-2 text-[13px] font-medium text-brand-cta-text transition hover:bg-brand-cta-hover disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Assign
                  </button>
                </div>
              </div>
            </>
          )}
        </form>
  );

  if (isPage) {
    return (
      <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
        <PageHeader
          title={showCompactAssigned ? "View assignment" : "Assign producer"}
          subtitle={`${activeRecord.programName} · ${genreLabel} specialists`}
          headerActions={
            returnHref ? (
              <Link
                href={returnHref}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-brand-line bg-brand-elevated/90 px-3 text-[12px] font-semibold text-brand-ink-secondary transition hover:bg-brand-elevated hover:text-brand-ink"
              >
                ← Back
              </Link>
            ) : null
          }
        />
        <div
          className={clsx(
            "flex h-0 min-h-0 flex-1 flex-col overflow-hidden",
            showCompactAssigned && "mx-6 max-w-lg lg:mx-8"
          )}
        >
          {assignmentForm}
        </div>
        {limitConfirmModal}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-brand-scrim backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        className={clsx(
          "surface-premium relative z-10 flex w-full flex-col overflow-hidden rounded-2xl shadow-[var(--shadow-premium)]",
          showCompactAssigned
            ? "max-h-[90dvh] max-w-lg"
            : "flex h-[min(90dvh,820px)] max-h-[90dvh] max-w-4xl flex-col"
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-brand-line/60 px-5 py-4 sm:px-6">
          <div>
            <p className="text-label">Producer assignment</p>
            <h2 className="text-display mt-1 text-[18px]">
              {showCompactAssigned ? "View assignment" : "Assign producer"}
            </h2>
            <p className="mt-1 text-[13px] text-brand-ink-secondary">
              {activeRecord.programName}
              <span className="text-brand-ink-tertiary">
                {" "}
                · {genreLabel} specialists
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {assignmentForm}
      </div>
      {limitConfirmModal}
    </div>
  );
}

type RequestedInfo =
  | { kind: "first_available" }
  | { kind: "unknown"; name: string }
  | {
      kind: "specific";
      name: string;
      row: ProducerRow;
      available: boolean;
      /** Available but not recommended (daily limits). */
      caution: boolean;
      statusLabel: string;
    };

function RequestedCard({
  variant = "default",
  info,
  producers,
  selectedEditor = "",
  onSelect,
  readOnly = false,
}: {
  variant?: "default" | "compact";
  info: RequestedInfo;
  producers: Producer[];
  selectedEditor?: string;
  onSelect?: (name: string, startIso?: string) => void;
  /** When true, show form request only — not a selectable assignment control. */
  readOnly?: boolean;
}) {
  const compact = variant === "compact";

  if (info.kind === "first_available") {
    return (
      <div className={compact ? "mt-1.5" : "rounded-xl border border-brand-line/70 bg-brand-bg/40 px-3 py-2.5"}>
        {!compact ? (
          <p className="text-[11px] font-medium text-brand-ink-tertiary">Requested</p>
        ) : null}
        <p
          className={clsx(
            "font-semibold text-brand-ink",
            compact ? "text-[13px]" : "mt-0.5 text-[13px]"
          )}
        >
          First available
        </p>
        {!compact ? (
          <p className="mt-0.5 text-[11px] leading-snug text-brand-ink-tertiary">
            No specific producer was requested on the form.
          </p>
        ) : null}
      </div>
    );
  }

  if (info.kind === "unknown") {
    return (
      <div className={compact ? "mt-1.5" : "rounded-xl border border-brand-line/70 bg-brand-bg/40 px-3 py-2.5"}>
        {!compact ? (
          <p className="text-[11px] font-medium text-brand-ink-tertiary">Requested</p>
        ) : null}
        <p
          className={clsx(
            "font-semibold text-brand-ink",
            compact ? "text-[13px]" : "mt-0.5 text-[13px]"
          )}
        >
          {info.name}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-brand-ink-tertiary">
          {compact
            ? "Not on this genre roster."
            : "Not on this genre's roster."}
        </p>
      </div>
    );
  }

  const isSelected =
    Boolean(selectedEditor) && producerKeysMatch(selectedEditor, info.name);
  const warn = !info.available || info.caution;

  if (compact) {
    if (readOnly || !onSelect) {
      return (
        <div
          className={clsx(
            "mt-1.5 flex w-full items-center gap-2 rounded-lg border px-2 py-1.5",
            warn
              ? "border-brand-warning/35 bg-brand-warning/8"
              : "border-brand-line/50 bg-brand-bg/40"
          )}
          title={info.statusLabel}
        >
          <Avatar
            producer={findProducerByAssignmentKey(info.name, producers)}
            initials={info.name}
            size="xs"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-semibold text-brand-ink">
              {info.name}
            </span>
            <span
              className={clsx(
                "block truncate text-[10px]",
                warn ? "text-brand-warning" : "text-brand-success"
              )}
            >
              {info.statusLabel}
            </span>
          </span>
        </div>
      );
    }

    return (
      <button
        type="button"
        disabled={!info.available}
        onClick={() => onSelect(info.name, info.row.nextOpeningIso || undefined)}
        className={clsx(
          "mt-1.5 flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition",
          !info.available && "cursor-not-allowed opacity-90",
          isSelected
            ? "border-brand-signature bg-brand-signature-soft/80"
            : info.available
              ? "border-brand-line/50 bg-brand-bg/40 hover:border-brand-line hover:bg-brand-bg/70"
              : "border-brand-warning/35 bg-brand-warning/8"
        )}
      >
        <Avatar
          producer={findProducerByAssignmentKey(info.name, producers)}
          initials={info.name}
          size="xs"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold text-brand-ink">
            {info.name}
          </span>
          <span
            className={clsx(
              "block truncate text-[10px]",
              info.available ? "text-brand-success" : "text-brand-warning"
            )}
          >
            {info.statusLabel}
          </span>
        </span>
      </button>
    );
  }

  return (
    <div
      className={clsx(
        "rounded-xl border px-3 py-2.5",
        info.available
          ? "border-brand-line/70 bg-brand-bg/40"
          : "border-brand-warning/30 bg-brand-warning/8"
      )}
    >
      <p className="text-[11px] font-medium text-brand-ink-tertiary">Requested</p>
      <button
        type="button"
        disabled={!info.available || !onSelect}
        onClick={() => {
          if (!onSelect) return;
          onSelect(info.name, info.row.nextOpeningIso || undefined);
        }}
        className={clsx(
          "mt-1.5 flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition",
          (!info.available || !onSelect) && "cursor-not-allowed",
          isSelected
            ? "border-brand-signature bg-brand-signature-soft shadow-sm"
            : info.available
              ? "border-brand-line/70 bg-brand-elevated hover:border-brand-line hover:bg-brand-bg"
              : "border-brand-warning/30 bg-brand-elevated/60"
        )}
      >
        <Avatar
          producer={findProducerByAssignmentKey(info.name, producers)}
          initials={info.name}
          size="xs"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-brand-ink">
            {info.name}
          </span>
          <span
            className={clsx(
              "block text-[11px]",
              info.available ? "text-brand-success" : "text-brand-warning"
            )}
          >
            {info.statusLabel}
          </span>
          <span className="mt-1 block text-[10px] text-brand-ink-tertiary">
            {info.row.dailyLimitsLabel} · {info.row.workDaysShort}
          </span>
        </span>
      </button>
    </div>
  );
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3">
      <h3 className="text-[14px] font-semibold text-brand-ink">{title}</h3>
      {subtitle ? (
        <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">{subtitle}</p>
      ) : null}
    </div>
  );
}

const CALENDAR_KIND_META: Record<
  AssignCalendarEvent["kind"],
  { dot: string; label: string }
> = {
  studio_holiday: { dot: "bg-brand-warning", label: "Studio holiday" },
  leave: { dot: "bg-brand-orange", label: "Leave" },
  overtime: { dot: "bg-brand-info", label: "Extra day" },
  non_work: { dot: "bg-brand-line-strong", label: "Non-work day" },
};

function DailyLimitsSummary({ check }: { check: DailyLimitCheck }) {
  const usage = describeDailyLimitUsage(check);
  if (usage.length === 0) return null;

  const issues = describeDailyLimitIssues(check);
  const notRecommended = issues.length > 0;

  return (
    <div
      className={clsx(
        "mt-3 rounded-lg border px-2.5 py-2",
        notRecommended
          ? "border-brand-warning/30 bg-brand-warning/8"
          : "border-brand-success/25 bg-brand-success/8"
      )}
    >
      <p
        className={clsx(
          "text-[11px] font-semibold",
          notRecommended ? "text-brand-warning" : "text-brand-success"
        )}
      >
        {notRecommended
          ? "Not recommended · goes over daily limits"
          : "Within daily limits"}
      </p>
      {notRecommended ? (
        <ul className="mt-1 space-y-0.5">
          {issues.map((issue) => (
            <li key={issue} className="text-[11px] leading-snug text-brand-warning">
              {issue}
            </li>
          ))}
        </ul>
      ) : null}
      <dl className="mt-1.5 space-y-1">
        {usage.map((line) => (
          <div key={line.label}>
            <dt className="text-[10px] font-medium uppercase tracking-wide text-brand-ink-tertiary">
              {line.label}
            </dt>
            <dd
              className={clsx(
                "text-[11px] tabular-nums",
                line.over ? "font-semibold text-brand-warning" : "text-brand-ink"
              )}
            >
              {line.value}
            </dd>
          </div>
        ))}
      </dl>
      {notRecommended ? (
        <p className="mt-1.5 text-[10px] leading-snug text-brand-ink-tertiary">
          You can still assign — you&apos;ll be asked to confirm.
        </p>
      ) : null}
    </div>
  );
}

function CalendarTransparencyPanel({
  calendarRange,
  events,
  selectedProducer,
  selectedEditor,
  limitCheck,
  workDays,
  endIsSuggested,
}: {
  calendarRange: { startIso: string; endIso: string } | null;
  events: AssignCalendarEvent[];
  selectedProducer?: Producer;
  selectedEditor: string;
  limitCheck: DailyLimitCheck | null;
  workDays: number | null;
  endIsSuggested: boolean;
}) {
  if (!calendarRange) {
    return null;
  }

  const rangeLabel = `${formatDisplayDate(calendarRange.startIso)} – ${formatDisplayDate(calendarRange.endIso)}`;
  const skippedCount = events.filter(
    (event) => event.kind !== "overtime"
  ).length;

  return (
    <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[12px] font-semibold text-brand-ink">
            Calendar context
          </p>
          <p className="mt-0.5 text-[11px] text-brand-ink-tertiary tabular-nums">
            {rangeLabel}
            {endIsSuggested ? " (suggested end)" : ""}
          </p>
          {workDays != null ? (
            <p className="mt-0.5 text-[11px] font-medium text-brand-ink-secondary tabular-nums">
              {workDays} work {workDays === 1 ? "day" : "days"}
              {skippedCount > 0
                ? " · days off, leave and holidays skipped"
                : ""}
            </p>
          ) : null}
        </div>
        <span className="rounded-full bg-brand-elevated px-2 py-0.5 text-[10px] font-semibold text-brand-ink-secondary ring-1 ring-brand-line/60">
          {selectedProducer
            ? selectedEditor || "Producer"
            : "Studio-wide"}
        </span>
      </div>

      {events.length === 0 ? (
        <p className="mt-3 rounded-lg border border-brand-success/25 bg-brand-success/8 px-2.5 py-2 text-[11px] text-brand-success">
          No holidays or leave in this range
          {selectedProducer ? " for this producer" : " (studio-wide)"}.
        </p>
      ) : (
        <ul className="mt-3 max-h-[220px] space-y-1.5 overflow-y-auto scrollbar-hide">
          {events.map((event) => {
            const meta = CALENDAR_KIND_META[event.kind];
            return (
              <li
                key={`${event.iso}-${event.kind}-${event.label}`}
                className="flex items-start gap-2 rounded-lg border border-brand-line/50 bg-brand-elevated/70 px-2.5 py-1.5"
              >
                <span
                  className={clsx(
                    "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                    meta.dot
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold tabular-nums text-brand-ink">
                    {formatDisplayDate(event.iso)}
                  </span>
                  <span className="block text-[10px] text-brand-ink-tertiary">
                    {meta.label} · {event.label}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {selectedProducer && limitCheck ? (
        <DailyLimitsSummary check={limitCheck} />
      ) : null}

      {selectedProducer ? (
        <p className="mt-3 text-[10px] leading-snug text-brand-ink-tertiary">
          Work days: {formatProducerWorkDaysShort(selectedProducer)} ·{" "}
          {formatDailyLimits(selectedProducer)}
        </p>
      ) : (
        <p className="mt-3 text-[10px] leading-snug text-brand-ink-tertiary">
          Showing studio holidays that apply to all producers. Select someone to
          see personal leave and schedule.
        </p>
      )}
    </div>
  );
}

function sortProducerRowsByOpening(a: ProducerRow, b: ProducerRow): number {
  const ta = a.nextOpeningDate?.getTime() ?? Infinity;
  const tb = b.nextOpeningDate?.getTime() ?? Infinity;
  return ta - tb || a.mixCount - b.mixCount;
}

function isProducerRowOpen(row: ProducerRow, windowMode: boolean): boolean {
  return windowMode ? row.availableForWindow : Boolean(row.nextOpeningDate);
}

function producerStatusLabel(
  row: ProducerRow,
  windowMode: boolean
): string {
  if (windowMode) return "Free";
  if (!row.nextOpeningDate) return "TBD";
  if (row.isAvailableToday) return "Today";
  return `${MONTH_LABELS[row.nextOpeningDate.getMonth()].slice(0, 3)} ${row.nextOpeningDate.getDate()}`;
}

function ProducerAvailChip({
  row,
  windowMode,
  selectedEditor,
  onSelect,
}: {
  row: ProducerRow;
  windowMode: boolean;
  selectedEditor: string;
  onSelect: (name: string, startIso?: string) => void;
}) {
  const open = isProducerRowOpen(row, windowMode);
  const selected =
    Boolean(selectedEditor) && producerKeysMatch(selectedEditor, row.name);
  const displayName = row.producer?.name?.trim() || row.name;
  const statusLabel = producerStatusLabel(row, windowMode);
  const fullStatus = windowMode
    ? row.overLimit
      ? "Free · not recommended (daily limit)"
      : "Free"
    : row.isAvailableToday
      ? "Today"
      : row.nextOpeningIso
        ? formatDisplayDate(row.nextOpeningIso)
        : "TBD";

  return (
    <button
      type="button"
      disabled={!open}
      title={`${displayName} · ${fullStatus}`}
      onClick={() => {
        if (!open) return;
        onSelect(row.name, row.nextOpeningIso || undefined);
      }}
      className={clsx(
        "inline-flex w-11 shrink-0 flex-col items-center gap-1 rounded-lg px-0.5 py-1 transition",
        selected
          ? "bg-brand-signature-soft ring-1 ring-brand-signature/30"
          : "hover:bg-brand-bg/70"
      )}
    >
      <span
        className={clsx(
          "w-full truncate text-center text-[9px] font-semibold leading-tight tabular-nums",
          open ? "text-brand-success" : "text-brand-ink-tertiary"
        )}
      >
        {statusLabel}
      </span>
      <span className="relative">
        <Avatar producer={row.producer} initials={row.name} size="sm" />
        {selected ? (
          <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-signature text-white shadow-sm">
            <Check className="h-2 w-2" strokeWidth={3} />
          </span>
        ) : null}
      </span>
    </button>
  );
}

function AvailabilityProducerStrip({
  rows,
  windowMode,
  selectedEditor,
  genreLabel,
  windowLabel,
  onSelect,
}: {
  rows: ProducerRow[];
  windowMode: boolean;
  selectedEditor: string;
  genreLabel: string;
  windowLabel: string | null;
  onSelect: (name: string, startIso?: string) => void;
}) {
  const monthSections = useMemo(() => {
    if (windowMode) {
      const free = rows
        .filter((row) => isProducerRowOpen(row, true))
        .sort(sortProducerRowsByOpening);
      return free.length
        ? [
            {
              key: "window",
              title: windowLabel || "Selected dates",
              rows: free,
            },
          ]
        : [];
    }

    // Every category producer appears once, grouped by their first available date.
    const byMonth = new Map<
      string,
      { sortKey: number; title: string; rows: ProducerRow[] }
    >();
    const noDateYet: ProducerRow[] = [];

    for (const row of rows) {
      if (!row.nextOpeningDate) {
        noDateYet.push(row);
        continue;
      }
      const y = row.nextOpeningDate.getFullYear();
      const m = row.nextOpeningDate.getMonth();
      const key = `${y}-${m}`;
      const existing = byMonth.get(key);
      if (existing) {
        existing.rows.push(row);
      } else {
        byMonth.set(key, {
          sortKey: y * 12 + m,
          title: `${MONTH_LABELS[m]} ${y}`,
          rows: [row],
        });
      }
    }

    const sections = [...byMonth.values()]
      .sort((a, b) => a.sortKey - b.sortKey)
      .map((section) => ({
        key: `${section.sortKey}`,
        title: section.title,
        rows: [...section.rows].sort(sortProducerRowsByOpening),
      }));

    if (noDateYet.length > 0) {
      sections.push({
        key: "no-date",
        title: "No date yet",
        rows: [...noDateYet].sort((a, b) => a.name.localeCompare(b.name)),
      });
    }

    return sections;
  }, [rows, windowMode, windowLabel]);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-line/60 bg-white p-4">
        <p className="rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3 py-2 text-[13px] text-brand-warning">
          {windowMode
            ? "No producers match this mix window."
            : `No producers specialize in ${genreLabel}.`}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-line/60 bg-white">
      <div className="border-b border-brand-line/50 px-4 py-3.5 sm:px-5">
        <h3 className="text-[14px] font-semibold text-brand-ink">
          Producer&apos;s first available dates
        </h3>
        <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
          {windowLabel
            ? `${genreLabel} · ${windowLabel}`
            : `${genreLabel} · choose a producer below`}
        </p>
      </div>

      <div className="divide-y divide-brand-line/40">
        {monthSections.map((section) => (
          <div key={section.key}>
            <div className="flex items-center justify-between gap-2 bg-brand-bg/30 px-4 py-2 sm:px-5">
              <p className="text-[12px] font-semibold tabular-nums text-brand-ink">
                {section.title}
              </p>
              <p className="text-[11px] text-brand-ink-tertiary">
                {section.rows.length} producer
                {section.rows.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex flex-nowrap gap-1 overflow-x-auto overscroll-x-contain px-3 py-2 scrollbar-hide sm:px-4">
              {section.rows.map((row) => (
                <ProducerAvailChip
                  key={row.key}
                  row={row}
                  windowMode={windowMode}
                  selectedEditor={selectedEditor}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type SuggestionView = {
  name: string;
  row: ProducerRow;
  tone: "good" | "swap";
  reason: "requested_available" | "first_available";
  reasonTitle: string;
};

function SuggestionDetailCard({
  suggestion,
  producers,
  selectedEditor,
  windowMode,
  onSelect,
}: {
  suggestion: SuggestionView;
  producers: Producer[];
  selectedEditor: string;
  windowMode: boolean;
  onSelect: () => void;
}) {
  const isSelected =
    Boolean(selectedEditor) &&
    producerKeysMatch(selectedEditor, suggestion.name);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition",
        isSelected
          ? "border-brand-signature bg-brand-signature-soft shadow-sm ring-1 ring-brand-signature/25"
          : "border-brand-line/70 bg-brand-bg/40 hover:border-brand-line hover:bg-brand-bg/70"
      )}
    >
      <Avatar
        producer={findProducerByAssignmentKey(suggestion.name, producers)}
        initials={suggestion.name}
        size="sm"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-[13px] font-semibold text-brand-ink">
            {suggestion.name}
          </span>
          <span className="rounded-full bg-brand-info/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand-info">
            Recommended
          </span>
        </span>
        <p
          className={clsx(
            "mt-1 text-[12px] font-medium leading-snug",
            suggestion.tone === "swap"
              ? "text-brand-warning"
              : "text-brand-ink-secondary"
          )}
        >
          {suggestion.reasonTitle}
        </p>
        <dl className="mt-2 grid gap-1.5">
          <div className="rounded-lg bg-white/80 px-2.5 py-1.5">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-brand-ink-tertiary">
              Daily limits
            </dt>
            <dd className="text-[12px] font-medium text-brand-ink">
              {suggestion.row.dailyLimitsLabel}
            </dd>
          </div>
          <div className="rounded-lg bg-white/80 px-2.5 py-1.5">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-brand-ink-tertiary">
              {windowMode ? "Mix window" : "Schedule"}
            </dt>
            <dd className="text-[12px] text-brand-ink">
              {windowMode
                ? suggestion.row.availableForWindow
                  ? suggestion.row.overLimit
                    ? "Can take these dates · goes over daily limits"
                    : "Can take the full selected mix window"
                  : suggestion.row.blockerLabel ?? "Cannot take selected dates"
                : suggestion.row.workDaysShort}
            </dd>
          </div>
        </dl>
      </span>
    </button>
  );
}
