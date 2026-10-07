"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Lock,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { HoverTip } from "@/components/ui/HoverTip";
import { InlineDateInput } from "@/components/mtd/InlineFields";
import { AssignLimitWarningModal } from "@/components/mtd/AssignLimitWarningModal";
import { ConfirmDeleteProducerAssignModal } from "@/components/mtd/ConfirmDeleteProducerAssignModal";
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
import { getOrderStatus } from "@/lib/order-requirements";
import { parsePendingDeletedProducer } from "@/lib/order-reassign";
import { resolveMTDFormMeta } from "@/lib/mtd-filters";
import { normalizeProducerKey, producerKeysMatch } from "@/lib/producer-keys";
import {
  formatDisplayDate,
  parseFlexibleDate,
  toCanonicalIsoDate,
  toIsoDateString,
} from "@/lib/dates";
import { suggestMixEndDate } from "@/lib/scheduling";
import {
  checkProducerDailyLimits,
  dailyLimitCheckHasIssues,
  extraDatesInRange,
  formatCompactLeaveDaySpans,
  formatLeaveDateLabel,
  isProducerAvailableForMixWindow,
  isProducerWorkableDay,
  leaveApplicableDaysInRange,
  nextProducerWorkableDayIso,
  findMixWindowBlocker,
  describeMixWindowBlocker,
  listProducerCostContributorsInRange,
  listProducerDailyCostContributors,
  packageMixWorkingDays,
  type DailyCostContributor,
  type DailyLimitCheck,
  type MixWindowBlocker,
  type RecordCostEstimator,
} from "@/lib/producer-availability";
import { collectOpenAssignedMixRecords } from "@/lib/producer-assigned-mixes";
import {
  isProducerAvailableOnDate,
  calculateProducerNextOpening,
  type ProducerOpeningOptions,
} from "@/lib/producer-schedule-calc";
import {
  createBookedCostEstimator,
  estimateRecordBasePayout,
  estimateRecordProducerPayoutDetail,
  type ProducerPayoutEstimateDetail,
} from "@/lib/producer-payout-estimate";
import { PRICING_REFERENCE_CHANGED_EVENT } from "@/lib/order-package-price";
import {
  DAILY_COST_SETTINGS_CHANGED_EVENT,
  describeDailyCostSettings,
  loadDailyCostSettings,
  type DailyCostSettings,
} from "@/lib/daily-cost-settings";
import {
  buildMixDateCalendarRules,
  describeDailyLimitIssues,
  describeDailyLimitUsage,
  formatDailyLimits,
  formatProducerWorkDaysShort,
  producerScheduleFingerprint,
} from "@/lib/assign-editor-calendar";
import {
  CHEER_FORM_SUBTABS,
  DANCE_FORM_SUBTABS,
  DEFAULT_WORK_DAYS,
  ORDER_FORM_TABS,
  type MTDRecord,
  type MTDRecordStatus,
  type Order,
  type Producer,
  type ScheduleEntry,
} from "@/types";
import { useAppState } from "@/context/AppStateContext";

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
): string {
  return (
    window.endIso ||
    suggestMixEndDate(window.startIso, packageStr, { producer }) ||
    window.startIso
  );
}

export function AssignEditorModal({
  open,
  record,
  mtdRecords: mtdRecordsProp,
  allOrders: allOrdersProp,
  producers: producersProp,
  schedule: scheduleProp,
  readOnly = false,
  variant = "modal",
  returnHref,
  onClose,
  onAssign,
}: AssignEditorModalProps) {
  const isPage = variant === "page";
  const router = useRouter();
  // Always prefer live studio state so leave / Extra days / mix bookings
  // paint on the calendars immediately after save (not only after refresh).
  const live = useAppState();
  const producers = live.producers;
  const mtdRecords = live.mtdRecords;
  const allOrders = live.allOrders;
  const activeOrders = live.activeOrders;
  const schedule = live.schedule.length > 0 ? live.schedule : scheduleProp;

  /** Orders + MTD assigned mixes (excludes payroll/completed) for limit comparison. */
  const bookingRecords = useMemo(
    () => collectOpenAssignedMixRecords(activeOrders, mtdRecords),
    [activeOrders, mtdRecords]
  );

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
  const [deleteProducerConfirmOpen, setDeleteProducerConfirmOpen] =
    useState(false);

  const displayAssigned = record ? getDisplayAssignedProducer(record) : null;
  const formalAssigned = record?.assignedProducer?.trim() || null;
  const isAssignmentLocked = Boolean(formalAssigned);

  const pendingDeletedProducer = useMemo(() => {
    if (!record) return null;
    const { needsReassign, reassignReason } = getOrderStatus(record);
    if (!needsReassign || reassignReason !== "producer_deletion") return null;
    return parsePendingDeletedProducer(record.orderStatus);
  }, [record]);

  /** Only prompt to delete while the producer is still on the roster. */
  const pendingDeletedProducerOnRoster = useMemo(() => {
    if (!pendingDeletedProducer) return null;
    const stillOnRoster = producers.some(
      (p) =>
        p.id === pendingDeletedProducer.id ||
        p.uuid === pendingDeletedProducer.id ||
        producerKeysMatch(p.name, pendingDeletedProducer.name)
    );
    return stillOnRoster ? pendingDeletedProducer : null;
  }, [pendingDeletedProducer, producers]);

  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const todayIso = toCanonicalIsoDate(today);

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

  // Recompute daily-cost estimates when Pricing Reference / daily-cost settings change.
  const [pricingReferenceRevision, setPricingReferenceRevision] = useState(0);
  useEffect(() => {
    const bump = () => setPricingReferenceRevision((n) => n + 1);
    window.addEventListener(PRICING_REFERENCE_CHANGED_EVENT, bump);
    window.addEventListener(DAILY_COST_SETTINGS_CHANGED_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(PRICING_REFERENCE_CHANGED_EVENT, bump);
      window.removeEventListener(DAILY_COST_SETTINGS_CHANGED_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const producerRatesRevision = useMemo(
    () =>
      producers
        .map(
          (p) =>
            `${p.id}:${JSON.stringify(p.ratesByCategory ?? null)}:${p.defaultRate ?? ""}:${p.rushFeeRate ?? ""}:${p.cheerVoiceoverRate ?? ""}:${p.danceVoiceoverRate ?? ""}`
        )
        .join("|"),
    [producers]
  );

  const orderPriceRevision = useMemo(
    () =>
      allOrders
        .map(
          (o) =>
            `${o.id}:${o.price ?? ""}:${o.finalCustomerPrice ?? ""}:${o.finalPayrollPrice ?? ""}:${o.finalCustomerPriceOverridden ? 1 : 0}:${o.package ?? ""}:${o.timeLengthOfMix ?? ""}`
        )
        .join("|"),
    [allOrders]
  );

  /** Payout per booked mix, divided across that mix's work days. */
  const estimateBookedCost = useMemo(
    () => createBookedCostEstimator(producers, orderById),
    // pricingReferenceRevision / rate / order price revisions bust the estimator.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      producers,
      orderById,
      pricingReferenceRevision,
      producerRatesRevision,
      orderPriceRevision,
      live.packagePrices,
      live.secretMenuPrices,
    ]
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
        const basePayout = estimateRecordBasePayout(
          record,
          producer,
          orderById
        );
        const packageDays = Math.max(1, packageMixWorkingDays(record.package));
        const newMixDailyShare =
          basePayout != null
            ? Math.round((basePayout / packageDays) * 100) / 100
            : null;

        const openingOptions: ProducerOpeningOptions = {
          excludeRecordId: record.id,
          estimateCost: estimateBookedCost,
          // Single-day availability checks expect a per-day share.
          newMixCost: newMixDailyShare,
          // Only compare capacity against mixes in this category + subcategory.
          matchCategory: requiredProducerCategory || record.category,
          matchFormType: formMeta?.formType || record.formType,
        };

        canWorkToday = isProducerWorkableDay(producer, today);
        isAvailableToday = isProducerAvailableOnDate(
          producer,
          today,
          bookingRecords,
          schedule,
          openingOptions
        );

        const calc = calculateProducerNextOpening(
          producer,
          bookingRecords,
          schedule,
          today,
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
          );
          availableForWindow = isProducerAvailableForMixWindow(
            producer,
            evalWindow.startIso,
            endIso,
          );
          if (!availableForWindow) {
            blocker = findMixWindowBlocker(
              producer,
              evalWindow.startIso,
              endIso,
            );
          }
          // Window check divides full base payout across actual work days.
          limitCheck = checkProducerDailyLimits(
            producer,
            evalWindow.startIso,
            endIso,
            bookingRecords,
            {
              excludeRecordId: record.id,
              estimateCost: estimateBookedCost,
              newMixCost: basePayout,
              matchCategory: requiredProducerCategory || record.category,
              matchFormType: formMeta?.formType || record.formType,
            }
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
    bookingRecords,
    schedule,
    editorWorkload,
    editorBookedUntil,
    evalWindow,
    today,
    orderById,
    estimateBookedCost,
    requiredProducerCategory,
    formMeta?.formType,
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

  const availableNames = useMemo(
    () => producerRows.filter(isRowCandidate).map((row) => row.name),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [producerRows, windowMode]
  );

  /** When the selected producer loses this order's category mid-assign. */
  const categoryLossNotifiedRef = useRef<string | null>(null);
  useEffect(() => {
    if ((!open && !isPage) || readOnly || !selectedEditor) {
      if (!selectedEditor) categoryLossNotifiedRef.current = null;
      return;
    }
    // Wait until the order's producer category is known.
    if (!requiredProducerCategory) return;

    const stillEligible = categoryEditors.some((name) =>
      producerKeysMatch(name, selectedEditor)
    );
    if (stillEligible) {
      categoryLossNotifiedRef.current = null;
      return;
    }

    const noticeKey = `${normalizeProducerKey(selectedEditor)}:${requiredProducerCategory}`;
    if (categoryLossNotifiedRef.current === noticeKey) return;
    categoryLossNotifiedRef.current = noticeKey;

    const producer = findProducerByAssignmentKey(selectedEditor, producers);
    const displayName =
      producer?.name?.trim() || selectedEditor.trim().toUpperCase();
    const categoryLabel =
      orderCategoryLabel || requiredProducerCategory || "this category";

    setSelectedEditor("");
    setDraftMixStartDate("");
    setDraftMixEndDate("");
    live.addNotification({
      type: "schedule",
      title: "Producer category removed",
      message: `${displayName} no longer covers ${categoryLabel}. Choose another producer.`,
      href: record?.id ? `/orders/${record.id}/assign` : "/orders",
    });
  }, [
    open,
    isPage,
    readOnly,
    selectedEditor,
    categoryEditors,
    producers,
    requiredProducerCategory,
    orderCategoryLabel,
    live.addNotification,
    record?.id,
  ]);

  // Hydrate draft from a locked assignment. Do NOT clear draft whenever an
  // unassigned record object refreshes — that wiped first-available picks
  // right after Unassign while the parent re-synced MTD/order.
  useEffect(() => {
    if (!record) return;
    if (!isPage && !open) return;

    const assignedKey = record.assignedProducer?.trim();
    if (!assignedKey) return;

    const match = categoryEditors.find((name) =>
      producerKeysMatch(name, assignedKey)
    );
    setSelectedEditor(match ?? assignedKey.toUpperCase());
    setDraftMixStartDate(toIsoDateString(record.mixStartDate) || "");
    setDraftMixEndDate(toIsoDateString(record.mixEndDate) || "");
  }, [
    open,
    isPage,
    record?.id,
    record?.assignedProducer,
    record?.mixStartDate,
    record?.mixEndDate,
    categoryEditors,
  ]);

  // Fresh open / switch to a different unassigned record — leave dates empty
  // until a producer is selected.
  useEffect(() => {
    if (!record) return;
    if (!isPage && !open) return;
    if (record.assignedProducer?.trim()) return;

    setSelectedEditor("");
    setDraftMixStartDate("");
    setDraftMixEndDate("");
  }, [open, isPage, record?.id]);

  const selectedProducer = useMemo(
    () =>
      selectedEditor
        ? findProducerByAssignmentKey(selectedEditor, producers)
        : undefined,
    [selectedEditor, producers]
  );

  /** Suggested end shown in the end calendar; never auto-filled. */
  const suggestedEndIso = useMemo(
    () =>
      draftStartIso && record
        ? suggestMixEndDate(draftStartIso, record.package, {
            producer: selectedProducer,
          })
        : "",
    [draftStartIso, record, selectedProducer]
  );

  const mixDateScheduleRevision = useMemo(
    () =>
      producerScheduleFingerprint(
        selectedProducer,
        bookingRecords,
        record?.id
      ),
    [selectedProducer, bookingRecords, record?.id]
  );

  const selectedPayoutDetail = useMemo((): ProducerPayoutEstimateDetail | null => {
    if (!record || !selectedProducer) return null;
    return estimateRecordProducerPayoutDetail(
      record,
      selectedProducer,
      orderById
    );
  }, [record, selectedProducer, orderById]);

  const mixDateRules = useMemo(
    () => {
      const base =
        record && selectedProducer
          ? estimateRecordBasePayout(record, selectedProducer, orderById)
          : null;
      const packageDays = Math.max(
        1,
        packageMixWorkingDays(record?.package ?? "")
      );
      const dailyShare =
        base != null ? Math.round((base / packageDays) * 100) / 100 : null;
      return buildMixDateCalendarRules({
        producer: selectedProducer,
        mtdRecords: bookingRecords,
        excludeRecordId: record?.id,
        estimateCost: estimateBookedCost,
        newMixCost: dailyShare,
        matchCategory: requiredProducerCategory || record?.category,
        matchFormType: formMeta?.formType || record?.formType,
        todayIso,
      });
    },
    // Fingerprint catches nested leave / Extra / work-day / mix booking edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      mixDateScheduleRevision,
      record,
      selectedProducer,
      estimateBookedCost,
      orderById,
      todayIso,
      bookingRecords,
      requiredProducerCategory,
      formMeta?.formType,
    ]
  );

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

  /** Same compact work-day spans as leave chips (skip non-work days). */
  const producerBookingLabel = useMemo(() => {
    if (!mixStartIso && !mixEndIso) return "Not set";
    const start = mixStartIso || mixEndIso || "";
    const end = mixEndIso || mixStartIso || start;
    const workDays =
      selectedProducer?.workDays && selectedProducer.workDays.length > 0
        ? selectedProducer.workDays
        : [...DEFAULT_WORK_DAYS];
    if (!selectedProducer) {
      return formatLeaveDateLabel(start, end, workDays);
    }
    const workIsos = leaveApplicableDaysInRange(start, end, workDays);
    const extraIsos = extraDatesInRange(
      selectedProducer.extraDays ?? [],
      start,
      end
    );
    const bookedIsos = [...new Set([...workIsos, ...extraIsos])].sort((a, b) =>
      a.localeCompare(b)
    );
    if (bookedIsos.length === 0) {
      return formatLeaveDateLabel(start, end, workDays);
    }
    return formatCompactLeaveDaySpans(bookedIsos);
  }, [mixStartIso, mixEndIso, selectedProducer]);

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
   * Pick an editor. On first pick with no start date yet, prefill their next
   * workable day (skips leave / non-work only — not existing mixes).
   */
  function applyEditorSelection(name: string, _startIso?: string) {
    if (selectedEditor && producerKeysMatch(selectedEditor, name)) {
      setSelectedEditor("");
      return;
    }
    setSelectedEditor(name);
    if (toIsoDateString(draftMixStartDate)) return;
    const producer = findProducerByAssignmentKey(name, producers);
    const nextStart = producer
      ? nextProducerWorkableDayIso(producer, today)
      : todayIso;
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

    if (pendingDeletedProducerOnRoster) {
      setDeleteProducerConfirmOpen(true);
      return;
    }

    if (selectedOverLimit) {
      setLimitConfirmOpen(true);
      return;
    }
    commitAssignment();
  }

  function commitAssignment() {
    setDeleteProducerConfirmOpen(false);
    setLimitConfirmOpen(false);
    const toDelete = pendingDeletedProducerOnRoster;
    const programLabel = activeRecord?.programName || "this mix";
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

    if (toDelete) {
      const deletedName =
        toDelete.name?.trim() || toDelete.initials?.trim() || "Producer";
      void live.removeProducer(toDelete.id).then(
        () => {
          live.addNotification({
            type: "schedule",
            title: `${deletedName} deleted`,
            message: `${deletedName} was removed from the producer roster.`,
          });
          live.addNotification({
            type: "schedule",
            title: "New producer assigned to mix",
            message: `${selectedEditor} assigned to ${programLabel}.`,
            href: `/orders/${activeRecord.id}`,
          });
        },
        () => {
          // removeProducer already surfaces its own error notification
        }
      );
    } else if (pendingDeletedProducer) {
      live.addNotification({
        type: "schedule",
        title: "New producer assigned to mix",
        message: `${selectedEditor} assigned to ${programLabel}.`,
        href: `/orders/${activeRecord.id}`,
      });
    } else if (
      getOrderStatus(activeRecord).reassignReason === "category_removed"
    ) {
      live.addNotification({
        type: "schedule",
        title: "Reassigned after category change",
        message: `${selectedEditor} assigned to ${programLabel}.`,
        href: `/orders/${activeRecord.id}`,
      });
    }

    if (isPage && returnHref) {
      router.push(returnHref);
    } else {
      onClose();
    }
  }

  function confirmDeleteProducerAssign() {
    if (selectedOverLimit) {
      setDeleteProducerConfirmOpen(false);
      setLimitConfirmOpen(true);
      return;
    }
    commitAssignment();
  }

  const deleteProducerConfirmModal = (
    <ConfirmDeleteProducerAssignModal
      open={deleteProducerConfirmOpen}
      deletedProducerName={
        pendingDeletedProducerOnRoster?.name ||
        pendingDeletedProducerOnRoster?.initials ||
        "this producer"
      }
      newProducerName={selectedEditor}
      programName={activeRecord?.programName || "this mix"}
      onClose={() => setDeleteProducerConfirmOpen(false)}
      onConfirm={confirmDeleteProducerAssign}
    />
  );

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
                      Booked work days from assignment (non-work days excluded).
                      Reassign to change them.
                    </p>
                    <p className="mt-2.5 text-[13px] font-semibold tabular-nums tracking-tight text-brand-ink">
                      {producerBookingLabel}
                    </p>
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
                <div className="space-y-4 lg:space-y-5">
                  <div className="assign-editor-layout grid grid-cols-1 items-start gap-4 lg:grid-cols-2 lg:gap-5">
                    <div className="min-w-0">
                      {categoryEditors.length === 0 ? (
                        <p className="rounded-2xl border border-brand-warning/30 bg-brand-warning/8 px-3 py-2 text-[13px] text-brand-warning">
                          No producers specialize in {genreLabel}.
                        </p>
                      ) : (
                        <AvailabilityProducerStrip
                          rows={producerRows}
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

                    <div
                      className={clsx(
                        "min-w-0 rounded-2xl border border-brand-line/60 bg-white p-4",
                        !selectedEditor && "opacity-70"
                      )}
                    >
                      <SectionHeading title="Booking dates" />
                      {!selectedEditor ? (
                        <p className="mb-3 text-[12px] text-brand-ink-tertiary">
                          Select a producer first to set booking dates.
                        </p>
                      ) : null}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-[11px] font-medium text-brand-ink-tertiary">
                            Mix start
                          </label>
                          <div className="mt-1">
                            <InlineDateInput
                              value={draftMixStartDate}
                              placeholder="Required"
                              min={todayIso}
                              menuZIndex={80}
                              disabled={!selectedEditor}
                              onChange={handleMixStartChange}
                              isDateDisabled={mixDateRules.isDateDisabled}
                              dayTitle={mixDateRules.dayTitle}
                              dayTone={mixDateRules.dayTone}
                              calendarRevision={mixDateScheduleRevision}
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
                              min={draftStartIso || todayIso}
                              menuZIndex={80}
                              disabled={!selectedEditor}
                              onChange={setDraftMixEndDate}
                              isDateDisabled={mixDateRules.isDateDisabled}
                              dayTitle={mixDateRules.dayTitle}
                              dayTone={mixDateRules.dayTone}
                              calendarRevision={mixDateScheduleRevision}
                            />
                          </div>
                        </div>
                      </div>
                      {windowMode && selectedEditor ? (
                        <button
                          type="button"
                          onClick={clearDates}
                          className="mt-3 text-[11px] font-semibold text-brand-info transition hover:text-brand-ink"
                        >
                          Clear
                        </button>
                      ) : null}
                      {selectedWindowConflict ? (
                        <p className="mt-3 rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3 py-2 text-[12px] text-brand-warning">
                          {selectedEditor} can&apos;t take these dates
                          {selectedRow?.blockerLabel
                            ? `: ${selectedRow.blockerLabel.toLowerCase()}`
                            : ""}
                          .
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {selectedEditor &&
                  stripWindowMode &&
                  selectedLimitCheck ? (
                    <SelectedMixLimitPanel
                      check={selectedLimitCheck}
                      producer={selectedProducer}
                      producerName={
                        selectedProducer?.name?.trim() || selectedEditor
                      }
                      rangeStartIso={mixStartIso}
                      rangeEndIso={mixEndIso || mixStartIso}
                      windowLabel={`${windowStartLabel}${
                        windowEndLabel &&
                        windowEndLabel !== windowStartLabel
                          ? ` – ${windowEndLabel}`
                          : ""
                      }`}
                      payoutDetail={selectedPayoutDetail}
                      mtdRecords={bookingRecords}
                      excludeRecordId={record?.id}
                      estimateCost={estimateBookedCost}
                      matchCategory={
                        requiredProducerCategory || record?.category
                      }
                      matchFormType={formMeta?.formType || record?.formType}
                    />
                  ) : null}
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

  const requestedHeaderLabel =
    requestedInfo.kind === "first_available"
      ? "First available"
      : requestedInfo.kind === "unknown"
        ? requestedInfo.name
        : requestedInfo.name;

  const requestedHeaderMeta = (
    <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-brand-blue-soft/70 px-3 py-1.5 ring-1 ring-inset ring-brand-blue/25">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.05em] text-brand-signature/70">
        Requested
      </span>
      <span className="h-3 w-px shrink-0 bg-brand-blue/25" aria-hidden />
      <span className="min-w-0 truncate text-[12px] font-semibold text-brand-signature">
        {requestedHeaderLabel}
      </span>
      {requestedInfo.kind === "specific" ? (
        <span
          className={clsx(
            "shrink-0 text-[11px]",
            !requestedInfo.available || requestedInfo.caution
              ? "text-brand-warning"
              : "text-brand-success"
          )}
        >
          {requestedInfo.statusLabel}
        </span>
      ) : requestedInfo.kind === "unknown" ? (
        <span className="shrink-0 text-[11px] text-brand-ink-tertiary">
          Not on roster
        </span>
      ) : null}
    </div>
  );

  if (isPage) {
    return (
      <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
        <PageHeader
          title={showCompactAssigned ? "View assignment" : "Assign producer"}
          subtitle={`${activeRecord.programName} · ${genreLabel} specialists`}
          meta={requestedHeaderMeta}
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
        {deleteProducerConfirmModal}
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
          <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
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
            <div className="shrink-0 pt-0.5">{requestedHeaderMeta}</div>
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
      {deleteProducerConfirmModal}
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

function ProducerAvailChip({
  row,
  selectedEditor,
  onSelect,
}: {
  row: ProducerRow;
  selectedEditor: string;
  onSelect: (name: string, startIso?: string) => void;
}) {
  // Category roster only — availability is handled by the booking calendars,
  // not by greying out chips in this strip.
  const selected =
    Boolean(selectedEditor) && producerKeysMatch(selectedEditor, row.name);
  const displayName = row.producer?.name?.trim() || row.name;

  return (
    <button
      type="button"
      title={
        selected
          ? `${displayName} · click to unselect`
          : displayName
      }
      onClick={() => onSelect(row.name, row.nextOpeningIso || undefined)}
      className={clsx(
        "inline-flex items-center justify-center overflow-visible rounded-xl border p-2 transition",
        selected
          ? "border-brand-signature bg-brand-signature-soft shadow-sm ring-1 ring-brand-signature/25"
          : "border-brand-line/60 bg-brand-bg/30 hover:border-brand-line hover:bg-brand-bg/60"
      )}
    >
      <span className="relative inline-flex overflow-visible">
        <Avatar producer={row.producer} initials={row.name} size="sm" />
        {selected ? (
          <span className="pointer-events-none absolute -bottom-1 -right-1 z-10 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-signature text-white shadow-sm ring-2 ring-white">
            <Check className="h-2 w-2" strokeWidth={3} />
          </span>
        ) : null}
      </span>
    </button>
  );
}

function shortMixLimitDay(iso: string): string {
  const d = parseFlexibleDate(iso);
  return d
    ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : iso;
}

function mixLimitWeekday(iso: string): string {
  const d = parseFlexibleDate(iso);
  return d ? d.toLocaleDateString("en-US", { weekday: "short" }) : "";
}

function formatLimitUsd(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const whole = Number.isInteger(rounded);
  return `$${rounded.toLocaleString("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Small pad above the max line (sums live in day tooltips). */
const LIMIT_TOP_PAD = 6;
/** Plot height from 0% up to the dashed max line. */
const LIMIT_PLOT_HEIGHT = 148;
const LIMIT_CHART_HEIGHT = LIMIT_TOP_PAD + LIMIT_PLOT_HEIGHT;
/** Clear air between a full bar top and the dashed max line. */
const LIMIT_MAX_LINE_GAP = 6;
/** Max line / 100% sit this many px above the chart bottom. */
const LIMIT_MAX_LINE_Y = LIMIT_PLOT_HEIGHT;
const LIMIT_BAR_HEIGHT = LIMIT_MAX_LINE_Y - LIMIT_MAX_LINE_GAP;
const LIMIT_Y_AXIS_WIDTH = 40;
/** Right inset so the Max label never sits on the bars. */
const LIMIT_MAX_LABEL_PAD = 128;

type CostBarSegment = {
  key: string;
  pct: number;
  label: string;
  amount: number;
};

const LIMIT_METRIC_BAR_WIDTH = "w-3 sm:w-3.5";

/** Cost bar: separate rounded blocks stacked by mix share (% of daily cost max). */
function CostMetricBar({ segments }: { segments: CostBarSegment[] }) {
  const visible = segments
    .map((seg) => ({
      ...seg,
      pct: Math.max(0, Math.min(100, seg.pct)),
    }))
    .filter((seg) => seg.pct > 0);
  const totalPct = Math.min(
    100,
    visible.reduce((sum, seg) => sum + seg.pct, 0)
  );
  /** Keep block stack height true to %, then gap eats a little visual space inside. */
  const stackHeightPct = Math.max(totalPct, visible.length > 0 ? 6 : 0);

  return (
    <div
      className={clsx(
        "relative rounded-t-md bg-brand-line/20",
        LIMIT_METRIC_BAR_WIDTH
      )}
      style={{ height: LIMIT_BAR_HEIGHT }}
    >
      {visible.length > 0 ? (
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col-reverse gap-px"
          style={{ height: `${stackHeightPct}%` }}
        >
          {visible.map((seg, i) => {
            const tip = `${seg.label}\n${formatLimitUsd(seg.amount)}/day`;
            return (
              <div
                key={seg.key}
                className="relative min-h-[5px] w-full"
                style={{ flex: `${seg.pct} 1 0` }}
              >
                <HoverTip
                  label={tip}
                  placement="top"
                  className="block h-full w-full"
                  zIndex={260}
                >
                  <div
                    className={clsx(
                      "h-full w-full rounded-[3px] transition-[filter] hover:brightness-110",
                      i % 2 === 1 ? "bg-brand-info/55" : "bg-brand-info/75"
                    )}
                  />
                </HoverTip>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** Mixes bar: equal slots up to max; filled slots are separate rounded mix blocks. */
function MixMetricBar({
  bookedMixes,
  maxMixes,
  mixLabels = [],
}: {
  bookedMixes: number;
  maxMixes: number;
  /** Bottom-up labels for filled mix blocks (tooltips). */
  mixLabels?: string[];
}) {
  const slots = Math.max(1, Math.floor(maxMixes));
  const filled = Math.max(0, Math.min(slots, bookedMixes));

  return (
    <div
      className={clsx(
        "relative rounded-t-md bg-brand-line/20",
        LIMIT_METRIC_BAR_WIDTH
      )}
      style={{ height: LIMIT_BAR_HEIGHT }}
    >
      <div className="absolute inset-0 flex flex-col-reverse gap-px">
        {Array.from({ length: slots }, (_, i) => {
          const isFilled = i < filled;
          const label = mixLabels[i]?.trim();
          const tip = isFilled
            ? label || `Mix ${i + 1}`
            : null;
          const block = (
            <div
              className={clsx(
                "h-full w-full rounded-[3px] transition-[filter]",
                isFilled
                  ? "bg-brand-warning hover:brightness-110"
                  : "bg-transparent"
              )}
            />
          );
          return (
            <div key={i} className="relative min-h-[5px] w-full flex-1">
              {tip ? (
                <HoverTip
                  label={tip}
                  placement="top"
                  className="block h-full w-full"
                  zIndex={260}
                >
                  {block}
                </HoverTip>
              ) : (
                block
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Grouped bars per date: cost (blue, mix-stacked) + mixes (orange, slotted by max). */
function LimitDayBarGroup({
  iso,
  maxMixes,
  bookedMixes,
  maxCost,
  costSegments,
  thisMixDaily,
  selected,
  onSelect,
}: {
  iso: string;
  maxMixes: number | null;
  bookedMixes: number;
  maxCost: number | null;
  costSegments: CostBarSegment[];
  thisMixDaily: number | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const showCost = maxCost != null;
  const showMix = maxMixes != null;
  // Bars = already-booked load only. Current mix is shown in the header label,
  // not stacked into the chart (that looked like the graph was "for itself").
  const mixCount = bookedMixes;
  const costSum = costSegments.reduce((sum, seg) => sum + seg.amount, 0);
  const projectedCost = costSum + (thisMixDaily ?? 0);
  const projectedMixes =
    bookedMixes + (thisMixDaily != null && thisMixDaily > 0 ? 1 : 0);
  const dayTipParts: string[] = [];
  if (showCost && costSum > 0) dayTipParts.push(formatLimitUsd(costSum));
  if (showMix) {
    dayTipParts.push(
      `${mixCount} ${mixCount === 1 ? "mix" : "mixes"} booked`
    );
  }
  if (thisMixDaily != null && thisMixDaily > 0) {
    dayTipParts.push(
      `+ current → ${formatLimitUsd(projectedCost)} · ${projectedMixes} ${
        projectedMixes === 1 ? "mix" : "mixes"
      }`
    );
  }
  const dayTip = dayTipParts.length > 0 ? dayTipParts.join(" · ") : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${shortMixLimitDay(iso)}${
        dayTip ? ` · ${dayTip}` : ""
      }`}
      className={clsx(
        "flex min-w-[40px] flex-1 flex-col items-center outline-none",
        selected && "opacity-100"
      )}
    >
      <HoverTip
        label={dayTip ?? undefined}
        placement="top"
        className="flex w-full flex-col items-center"
        zIndex={260}
      >
        <div
          className="flex items-end justify-center gap-[3px] px-0.5"
          style={{ height: LIMIT_BAR_HEIGHT }}
        >
          {showCost ? <CostMetricBar segments={costSegments} /> : null}
          {showMix ? (
            <MixMetricBar
              bookedMixes={mixCount}
              maxMixes={maxMixes as number}
              mixLabels={costSegments.map((seg) => seg.label)}
            />
          ) : null}
        </div>
      </HoverTip>
    </button>
  );
}

function DailyLimitBarChart({
  days,
  maxMixes,
  maxCost,
  thisMixDaily,
  selectedIso,
  onSelect,
  dayCostSegments,
}: {
  days: DailyLimitCheck["workDays"];
  maxMixes: number | null;
  maxCost: number | null;
  thisMixDaily: number | null;
  selectedIso: string;
  onSelect: (iso: string) => void;
  dayCostSegments: Record<string, CostBarSegment[]>;
}) {
  const yTicks = [0, 50, 100];

  return (
    <div className="space-y-2">
      <div
        className="flex min-w-0 items-center justify-between gap-x-3"
        style={{ paddingLeft: LIMIT_Y_AXIS_WIDTH }}
      >
        <p className="shrink-0 text-[10px] font-medium text-brand-ink-tertiary">
          % of daily limit
        </p>
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-brand-ink-tertiary">
          {maxCost != null ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-[3px] bg-brand-info"
                aria-hidden
              />
              Booked cost
            </span>
          ) : null}
          {maxMixes != null ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-[3px] bg-brand-warning"
                aria-hidden
              />
              Booked mixes
            </span>
          ) : null}
        </div>
        {thisMixDaily != null ? (
          <p className="shrink-0 text-right text-[10px] tabular-nums text-brand-ink-secondary">
            Producer cost for current mix:{" "}
            <span className="font-semibold text-brand-info">
              {formatLimitUsd(thisMixDaily)}/day
            </span>
          </p>
        ) : (
          <span className="shrink-0" />
        )}
      </div>
      <div className="flex min-w-0 items-start">
        <div
          className="relative shrink-0"
          style={{ width: LIMIT_Y_AXIS_WIDTH, height: LIMIT_CHART_HEIGHT }}
          aria-hidden
        >
          {yTicks.map((tick) => {
            // Same top offset as the dashed max / grid lines in the plot.
            const top =
              LIMIT_TOP_PAD + (LIMIT_PLOT_HEIGHT * (100 - tick)) / 100;
            return (
              <span
                key={tick}
                className="absolute right-1.5 -translate-y-1/2 text-right text-[10px] tabular-nums leading-none text-brand-ink-tertiary"
                style={{ top }}
              >
                {tick}%
              </span>
            );
          })}
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain scrollbar-hide">
          <div className="relative min-w-full">
            <div
              className="relative border-b-2 border-l-2 border-brand-ink/25"
              style={{ height: LIMIT_CHART_HEIGHT }}
            >
              {yTicks.map((tick) => {
                if (tick === 0) return null;
                const top =
                  LIMIT_TOP_PAD + (LIMIT_PLOT_HEIGHT * (100 - tick)) / 100;
                return (
                  <div
                    key={`grid-${tick}`}
                    className={clsx(
                      "pointer-events-none absolute inset-x-0",
                      tick === 100
                        ? "z-[1] border-t-2 border-dashed border-brand-warning"
                        : "border-t border-brand-line/35"
                    )}
                    style={{ top }}
                    aria-hidden
                  >
                    {tick === 100 ? (
                      <span className="absolute right-1.5 top-0 flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap bg-white px-1.5 text-[9px] font-semibold tabular-nums leading-none">
                        <span className="uppercase tracking-wide text-brand-ink-tertiary">
                          Max
                        </span>
                        {maxCost != null ? (
                          <span className="text-brand-info">
                            {formatLimitUsd(maxCost)}/day
                          </span>
                        ) : null}
                        {maxCost != null && maxMixes != null ? (
                          <span className="font-normal text-brand-ink-tertiary/70">
                            ·
                          </span>
                        ) : null}
                        {maxMixes != null ? (
                          <span className="text-brand-warning">
                            {maxMixes} {maxMixes === 1 ? "mix" : "mixes"}/day
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                );
              })}

              <div
                className="absolute bottom-0 left-0 z-0 flex items-end gap-1 px-1"
                style={{
                  height: LIMIT_BAR_HEIGHT,
                  right: LIMIT_MAX_LABEL_PAD,
                }}
              >
                {days.map((day) => (
                  <LimitDayBarGroup
                    key={day.iso}
                    iso={day.iso}
                    maxMixes={maxMixes}
                    bookedMixes={day.bookedMixes}
                    maxCost={maxCost}
                    costSegments={dayCostSegments[day.iso] ?? []}
                    thisMixDaily={thisMixDaily}
                    selected={day.iso === selectedIso}
                    onSelect={() => onSelect(day.iso)}
                  />
                ))}
              </div>
            </div>

            <div
              className="flex gap-1 border-t border-transparent px-1 pt-1.5"
              style={{ paddingRight: LIMIT_MAX_LABEL_PAD }}
            >
              {days.map((day) => {
                const selected = day.iso === selectedIso;
                const over =
                  (maxCost != null &&
                    day.bookedCost + (thisMixDaily ?? 0) > maxCost) ||
                  (maxMixes != null && day.bookedMixes + 1 > maxMixes);
                return (
                  <button
                    key={`x-${day.iso}`}
                    type="button"
                    onClick={() => onSelect(day.iso)}
                    className={clsx(
                      "flex min-w-[40px] flex-1 flex-col items-center gap-0.5 outline-none",
                      selected
                        ? "text-brand-ink"
                        : over
                          ? "text-brand-warning"
                          : "text-brand-ink-tertiary"
                    )}
                  >
                    <span
                      className={clsx(
                        "text-[10px] tabular-nums leading-none",
                        selected && "font-semibold"
                      )}
                    >
                      {shortMixLimitDay(day.iso)}
                    </span>
                    <span className="text-[9px] uppercase leading-none tracking-wide opacity-80">
                      {mixLimitWeekday(day.iso).slice(0, 2)}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-center text-[9px] font-medium uppercase tracking-[0.06em] text-brand-ink-tertiary">
              Date
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

function RangeMixBreakdown({
  rangeStartIso,
  rangeEndIso,
  contributors,
  dailyCostSettings,
}: {
  rangeStartIso: string;
  rangeEndIso: string;
  contributors: DailyCostContributor[];
  dailyCostSettings: DailyCostSettings;
}) {
  const rangeLabel =
    rangeEndIso && rangeEndIso !== rangeStartIso
      ? `${shortMixLimitDay(rangeStartIso)} – ${shortMixLimitDay(rangeEndIso)}`
      : shortMixLimitDay(rangeStartIso);

  const mixCostFormula = describeDailyCostSettings(dailyCostSettings);

  return (
    <details className="group mt-3 overflow-hidden rounded-xl border border-brand-line/50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-brand-bg/40 px-3.5 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-brand-ink-tertiary transition duration-200 group-open:rotate-180" />
          <span className="min-w-0 text-[13px] font-semibold tracking-tight text-brand-ink">
            How previous mixes use daily cost
            <span className="ml-2 font-normal tabular-nums text-brand-ink-secondary">
              {rangeLabel}
            </span>
          </span>
        </span>
        <span className="shrink-0 rounded-md bg-brand-ink/[0.06] px-2 py-0.5 text-[11px] font-medium tabular-nums text-brand-ink-secondary">
          {contributors.length}{" "}
          {contributors.length === 1 ? "mix" : "mixes"}
        </span>
      </summary>

      <div className="border-t border-brand-line/40">
        {contributors.length > 0 ? (
          <div className="space-y-1.5 px-3.5 pt-2.5">
            <div className="space-y-0.5 font-mono text-[11px] leading-relaxed text-brand-ink-tertiary">
              <p>mix cost ÷ work days = daily share</p>
              <p>mix cost = {mixCostFormula}</p>
            </div>
            <p className="text-[11px] leading-relaxed text-brand-ink-tertiary">
              Change what counts as mix cost in{" "}
              <Link
                href="/settings"
                className="font-medium text-brand-blue underline-offset-2 hover:underline"
              >
                Settings
              </Link>
              .
            </p>
          </div>
        ) : null}

        {contributors.length === 0 ? (
          <p className="px-3.5 py-3 text-[12px] text-brand-ink-tertiary">
            No booked mixes in this date range yet.
          </p>
        ) : (
          <ul className="flex gap-2 overflow-x-auto overscroll-x-contain p-2.5 scrollbar-hide">
            {contributors.map((c) => {
              const dateRange =
                c.mixEndDate !== c.mixStartDate
                  ? `${shortMixLimitDay(c.mixStartDate)} – ${shortMixLimitDay(c.mixEndDate)}`
                  : shortMixLimitDay(c.mixStartDate);
              const workDays = Math.max(c.workDays, 0);
              return (
                <li
                  key={c.recordId}
                  className="flex w-[220px] shrink-0 flex-col gap-2 rounded-lg border border-brand-line/45 bg-white px-3 py-2.5"
                >
                  <span className="truncate text-[12.5px] font-medium text-brand-ink">
                    {c.programName}
                  </span>
                  <span className="text-[11px] tabular-nums text-brand-ink-tertiary">
                    {dateRange}
                  </span>
                  <span className="flex flex-wrap items-center gap-1 text-[11px] tabular-nums">
                    <span className="rounded-md bg-brand-bg px-1.5 py-0.5 font-medium text-brand-ink ring-1 ring-inset ring-brand-line/50">
                      {formatLimitUsd(c.mixTotal)}
                    </span>
                    <span className="text-brand-ink-tertiary">÷</span>
                    <span className="rounded-md bg-brand-bg px-1.5 py-0.5 font-medium text-brand-ink ring-1 ring-inset ring-brand-line/50">
                      {workDays || "—"}
                    </span>
                    <span className="text-brand-ink-tertiary">=</span>
                    <span className="rounded-md bg-brand-info/10 px-1.5 py-0.5 font-semibold text-brand-info ring-1 ring-inset ring-brand-info/25">
                      {formatLimitUsd(c.dayShare)}/day
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </details>
  );
}

function SelectedMixLimitPanel({
  check,
  producer,
  producerName,
  rangeStartIso,
  rangeEndIso,
  windowLabel,
  payoutDetail,
  mtdRecords,
  excludeRecordId,
  estimateCost,
  matchCategory,
  matchFormType,
}: {
  check: DailyLimitCheck;
  producer?: Producer | null;
  producerName: string;
  rangeStartIso: string;
  rangeEndIso: string;
  windowLabel: string;
  payoutDetail: ProducerPayoutEstimateDetail | null;
  mtdRecords: MTDRecord[];
  excludeRecordId?: string;
  estimateCost: RecordCostEstimator;
  matchCategory?: string | null;
  matchFormType?: string | null;
}) {
  const maxMixes = check.maxMixesPerDay;
  const maxCost = check.maxCostPerDay;
  const thisMixDaily = check.newMixDailyCost;
  const hasLimits = maxMixes != null || maxCost != null;
  const categoryMatch = {
    matchCategory,
    matchFormType,
  };

  // Graph only shows days at ≥50% of mix and/or cost limit (with this mix).
  const chartDays = useMemo(() => {
    const thisDaily = thisMixDaily ?? 0;
    return check.workDays.filter((day) => {
      let costHit = false;
      let mixHit = false;
      if (maxCost != null && maxCost > 0) {
        costHit = (day.bookedCost + thisDaily) / maxCost >= 0.5;
      }
      if (maxMixes != null && maxMixes > 0) {
        const mixes = day.bookedMixes + (thisDaily > 0 ? 1 : 0);
        mixHit = mixes / maxMixes >= 0.5;
      }
      return costHit || mixHit;
    });
  }, [check.workDays, thisMixDaily, maxCost, maxMixes]);

  const defaultIso = chartDays[0]?.iso || "";
  const [inspectIso, setInspectIso] = useState(defaultIso);

  useEffect(() => {
    if (!chartDays.some((d) => d.iso === inspectIso)) {
      setInspectIso(defaultIso);
    }
  }, [chartDays, defaultIso, inspectIso]);

  const contributors = useMemo(() => {
    if (!producer || !rangeStartIso) return [];
    // Orders + MTD assigned mixes in the same category/subcategory only.
    return listProducerCostContributorsInRange(
      producer,
      rangeStartIso,
      rangeEndIso || rangeStartIso,
      mtdRecords,
      excludeRecordId,
      estimateCost,
      categoryMatch
    );
  }, [
    producer,
    rangeStartIso,
    rangeEndIso,
    mtdRecords,
    excludeRecordId,
    estimateCost,
    matchCategory,
    matchFormType,
  ]);

  const dayCostSegments = useMemo(() => {
    const out: Record<string, CostBarSegment[]> = {};
    if (!producer || maxCost == null || maxCost <= 0) return out;
    for (const day of chartDays) {
      const dayDate = parseFlexibleDate(day.iso);
      if (!dayDate) continue;
      const dayContributors = listProducerDailyCostContributors(
        producer,
        dayDate,
        mtdRecords,
        excludeRecordId,
        estimateCost,
        categoryMatch
      );
      // Booked mixes only — do not stack the draft/current mix into the bar.
      out[day.iso] = dayContributors.map((c) => ({
        key: c.recordId,
        pct: (c.dayShare / maxCost) * 100,
        label: c.programName,
        amount: c.dayShare,
      }));
    }
    return out;
  }, [
    producer,
    maxCost,
    chartDays,
    mtdRecords,
    excludeRecordId,
    estimateCost,
    matchCategory,
    matchFormType,
  ]);

  if (!hasLimits || chartDays.length === 0) return null;

  return (
    <div className="rounded-2xl border border-brand-line/60 bg-white p-4">
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="min-w-0 text-[13px] font-semibold tracking-tight text-brand-ink">
            Daily limits for {producerName}
          </p>
          {windowLabel ? (
            <p className="shrink-0 text-[12px] tabular-nums text-brand-ink-tertiary">
              {windowLabel}
            </p>
          ) : null}
        </div>

        <div>
          <DailyLimitBarChart
            days={chartDays}
            maxMixes={maxMixes}
            maxCost={maxCost}
            thisMixDaily={thisMixDaily}
            selectedIso={inspectIso}
            onSelect={setInspectIso}
            dayCostSegments={dayCostSegments}
          />
          {rangeStartIso && contributors.length > 0 ? (
            <RangeMixBreakdown
              rangeStartIso={rangeStartIso}
              rangeEndIso={rangeEndIso || rangeStartIso}
              contributors={contributors}
              dailyCostSettings={
                payoutDetail?.dailyCostSettings ?? loadDailyCostSettings()
              }
            />
          ) : null}
        </div>

        {payoutDetail ? (
          <div className="rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-warning">
              Disclaimer
            </p>
            <div className="mt-1 space-y-0.5 text-[11px] leading-relaxed text-brand-ink-secondary">
              <p>
                {payoutDetail.extrasApplied
                  ? `Extras ${formatLimitUsd(
                      payoutDetail.rushFeePayout + payoutDetail.voiceoverPayout
                    )} on this order are not in the daily sum. `
                  : null}
                Prices may change when edited.
              </p>
              <p>Completed and payroll mixes are not included.</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AvailabilityProducerStrip({
  rows,
  selectedEditor,
  genreLabel,
  windowLabel,
  onSelect,
}: {
  rows: ProducerRow[];
  selectedEditor: string;
  genreLabel: string;
  windowLabel: string | null;
  onSelect: (name: string, startIso?: string) => void;
}) {
  // Stable category order — do not sort by next opening / free status.
  const stripRows = rows;

  if (stripRows.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-line/60 bg-white p-4">
        <p className="rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3 py-2 text-[13px] text-brand-warning">
          No producers specialize in {genreLabel}.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-line/60 bg-white">
      <div className="border-b border-brand-line/50 px-4 py-3.5 sm:px-5">
        <h3 className="text-[14px] font-semibold text-brand-ink">
          Select producer for details
        </h3>
        <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
          {windowLabel
            ? `${genreLabel} · ${windowLabel}`
            : `${genreLabel} · ${stripRows.length} producer${stripRows.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 p-3 sm:p-4">
        {stripRows.map((row) => (
          <ProducerAvailChip
            key={row.key}
            row={row}
            selectedEditor={selectedEditor}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
