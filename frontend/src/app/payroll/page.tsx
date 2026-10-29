"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import { PayrollRushFeeControls } from "@/components/payroll/PayrollRushFeeControls";
import { MarkPaidConfirmModal } from "@/components/payroll/MarkPaidConfirmModal";
import {
  PayoutCalculationButton,
  PayoutCalculationModal,
} from "@/components/payroll/PayoutCalculationModal";
import { MiscAdjustmentModal } from "@/components/payroll/MiscAdjustmentModal";
import { VoiceoversPanel } from "@/components/payroll/VoiceoversPanel";
import type { CreatePayrollAddonPayload } from "@/lib/api/payroll-addons";
import {
  applyMiscAdjustmentToPayout,
  formatSignedMiscAdjustment,
  miscAdjustmentAddonForRecord,
  miscAdjustmentAmount,
} from "@/lib/misc-payroll-adjustment";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReturnNavBanner } from "@/components/layout/ReturnNavBanner";
import { MTDPageToolbar } from "@/components/mtd/MTDPageToolbar";
import type { MTDViewOrder } from "@/components/mtd/MTDViewOrderToggle";
import { OrderFormFilters } from "@/components/orders/OrderFormFilters";
import { PayrollSendPanel } from "@/components/payroll/PayrollSendPanel";
import { PayrollSendToolbar } from "@/components/payroll/PayrollSendToolbar";
import {
  DEFAULT_MTD_TABLE_FILTERS,
  type MTDTableFilterState,
} from "@/components/mtd/MTDTableFilters";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs } from "@/components/ui/Tabs";
import { useAppState } from "@/context/AppStateContext";
import {
  formatDisplayDate,
  formatDisplayDateTime,
  toCanonicalIsoDate,
  toIsoDateString,
} from "@/lib/dates";
import {
  calculateDateBounds,
  payPeriodRangeToDateFilter,
  todayIso,
  type PayPeriodRange,
} from "@/lib/date-filters";
import { generatePayrollCsv, triggerCsvDownload } from "@/lib/export-csv";
import { formatPrice, titleCase } from "@/lib/data";
import {
  getArchivedPayrollRecords,
  getPayrollRecords,
  patchMarkPayrollPaid,
} from "@/lib/mtd-completion";
import {
  countMTDByCheerSubtype,
  countMTDByDanceSubtype,
  countMTDByForm,
  filterMTDRecords,
  matchesFormFilter,
  matchesMTDSearch,
  resolveMTDFormMeta,
  sortMTDRecordsBySortKey,
  sortMTDRecordsByViewOrder,
} from "@/lib/mtd-filters";
import { parsePackage } from "@/lib/package";
import { findLinkedOrder, findProducerByAssignmentKey } from "@/lib/editor-assignment";
import { payrollRowIsRushOrder } from "@/lib/forward-order-mail";
import type {
  CheerFormSubtype,
  CheerFormSubtypeFilter,
  DanceFormSubtype,
  DanceFormSubtypeFilter,
  MTDRecord,
  OrderFormType,
  PayrollAddon,
} from "@/types";

import { payrollAmountsForRow } from "@/lib/order-package-price";
import {
  computeClientPayroll,
  finalizedPayrollRate,
  packagePayoutMatchingCompliance,
} from "@/lib/pricing-display";
import {
  compensationRatesEqual,
  DEFAULT_RUSH_FEE_UNIT,
  finalizeMixPayout,
  normalizeCompensationFraction,
  resolveRushFeeSelection,
  rushCustomerTotal,
  rushFeeAddonForRecord,
  rushFeeAddonsForRecord,
  sportsEntertainmentIncludedRushCompensation,
  sportsEntertainmentIncludedRushFeeAmount,
} from "@/lib/rush-fee";
import { HoverTip } from "@/components/ui/HoverTip";
import {
  filterPayrollAddonsForForm,
  getPayrollSendProducerNames,
  resolvePayrollSendEditorProducers,
} from "@/lib/payroll-send-filters";
import {
  producerMatchesScheduleFormFilter,
  scheduleFormFilterLabel,
} from "@/lib/schedule-filters";

/** Survives a dev remount so a rush row is not created twice for the same mix. */
const rushCreateInflight = new Set<string>();
/** Clear requested while a create was still in flight — delete as soon as it lands. */
const rushPendingClear = new Set<string>();

const RUSH_SAVE_DEBOUNCE_MS = 200;

type RushFeeOverlay = {
  quantity: number;
  compensationRate?: number | null;
  compensationOverridden?: boolean;
};

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";
type PayrollPageTab = "view" | "archive" | "voiceovers" | "send";
const DEFAULT_CHEER_SUBTYPE: CheerFormSubtypeFilter = "all-star-cheer";
const DEFAULT_DANCE_SUBTYPE: DanceFormSubtypeFilter = "pom";

const paidBtnClass =
  "inline-flex h-7 items-center gap-1 rounded-md border border-brand-success/35 bg-brand-success/10 px-2.5 text-[11px] font-semibold text-brand-success transition hover:bg-brand-success/18";
const deleteForeverBtnClass =
  "inline-flex h-7 items-center gap-1 rounded-md border border-brand-danger/35 bg-brand-danger/8 px-2.5 text-[11px] font-semibold text-brand-danger transition hover:bg-brand-danger/15";

export default function PayrollPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const focusParam = searchParams.get("focus");
  const {
    mtdRecords,
    allOrders,
    producers,
    payrollAddons,
    addPayrollAddon,
    updatePayrollAddon,
    removePayrollAddon,
    updateMTD,
    removeMTDRecord,
    isViewOnly,
  } = useAppState();
  const [pageTab, setPageTab] = useState<PayrollPageTab>("view");
  const [rushOverlay, setRushOverlay] = useState<Record<string, RushFeeOverlay>>({});
  const rushOverlayRef = useRef<Record<string, RushFeeOverlay>>({});
  const [highlightId, setHighlightId] = useState<string | null>(focusParam);
  const [selectedSendEditor, setSelectedSendEditor] = useState("all");
  const [addonDeleteId, setAddonDeleteId] = useState<string | null>(null);
  const [deleteForeverRecord, setDeleteForeverRecord] =
    useState<MTDRecord | null>(null);
  const [deletingForever, setDeletingForever] = useState(false);
  const [markPaidRecord, setMarkPaidRecord] = useState<MTDRecord | null>(null);
  const [miscAdjustmentRecord, setMiscAdjustmentRecord] =
    useState<MTDRecord | null>(null);
  const [payoutViewRecord, setPayoutViewRecord] = useState<MTDRecord | null>(
    null
  );
  const [viewOrder, setViewOrder] = useState<MTDViewOrder>("sequence");

  const [formState, setFormState] = useState<OrderFormType>(DEFAULT_FORM);
  const [cheerSubtypeState, setCheerSubtypeState] = useState<CheerFormSubtypeFilter>(
    DEFAULT_CHEER_SUBTYPE
  );
  const [danceSubtypeState, setDanceSubtypeState] = useState<DanceFormSubtypeFilter>(
    DEFAULT_DANCE_SUBTYPE
  );
  const [tableFiltersState, setTableFiltersState] = useState<MTDTableFilterState>(
    DEFAULT_MTD_TABLE_FILTERS
  );
  const [searchQueryState, setSearchQueryState] = useState("");

  const [sendPayPeriod, setSendPayPeriod] = useState<PayPeriodRange>("2weeks");

  const [form, setForm] = [
    formState,
    (next: OrderFormType) => {
      setFormState(next);
      if (typeof window !== "undefined") sessionStorage.setItem("slt_payroll_form", next);
    },
  ];

  const [cheerSubtype, setCheerSubtype] = [
    cheerSubtypeState,
    (next: CheerFormSubtypeFilter) => {
      setCheerSubtypeState(next);
      if (typeof window !== "undefined") sessionStorage.setItem("slt_payroll_cheer_subtype", next);
    },
  ];

  const [danceSubtype, setDanceSubtype] = [
    danceSubtypeState,
    (next: DanceFormSubtypeFilter) => {
      setDanceSubtypeState(next);
      if (typeof window !== "undefined") sessionStorage.setItem("slt_payroll_dance_subtype", next);
    },
  ];

  const [tableFilters, setTableFilters] = [
    tableFiltersState,
    (next: MTDTableFilterState | ((prev: MTDTableFilterState) => MTDTableFilterState)) => {
      setTableFiltersState((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        if (typeof window !== "undefined") {
          sessionStorage.setItem("slt_payroll_table_filters", JSON.stringify(value));
        }
        return value;
      });
    },
  ];

  const [searchQuery, setSearchQuery] = [
    searchQueryState,
    (next: string) => {
      setSearchQueryState(next);
      if (typeof window !== "undefined") sessionStorage.setItem("slt_payroll_search", next);
    },
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedForm = sessionStorage.getItem("slt_payroll_form") as OrderFormType | null;
    const savedCheer = sessionStorage.getItem("slt_payroll_cheer_subtype") as CheerFormSubtypeFilter | null;
    const savedDance = sessionStorage.getItem("slt_payroll_dance_subtype") as DanceFormSubtypeFilter | null;
    const savedTableFilters = sessionStorage.getItem("slt_payroll_table_filters");
    const savedSearch = sessionStorage.getItem("slt_payroll_search");

    const validForms: OrderFormType[] = [
      "school-all-star-cheer",
      "school-all-star-dance",
      "marching-band",
      "sports-entertainment",
      "school-anthem",
    ];
    const validCheerSubtypes: CheerFormSubtypeFilter[] = [
      "all-star-cheer",
      "school-cheer-viroc-yes",
      "school-cheer-viroc-no",
      "youth-rec-cheer",
    ];
    const validDanceSubtypes: DanceFormSubtypeFilter[] = [
      "pom",
      "hip-hop",
      "team-performance-variety",
      "gameday",
      "jazz-kick",
    ];

    if (savedForm && validForms.includes(savedForm)) setFormState(savedForm);
    if (savedCheer && validCheerSubtypes.includes(savedCheer)) setCheerSubtypeState(savedCheer);
    if (savedDance && validDanceSubtypes.includes(savedDance)) setDanceSubtypeState(savedDance);
    if (savedSearch !== null) setSearchQueryState(savedSearch);
    if (savedTableFilters) {
      try {
        const parsed = JSON.parse(savedTableFilters);
        if (parsed && typeof parsed === "object") {
          setTableFiltersState({ ...DEFAULT_MTD_TABLE_FILTERS, ...parsed });
        }
      } catch {}
    }
  }, []);

  const payrollRecords = useMemo(
    () =>
      [...getPayrollRecords(mtdRecords)].sort((a, b) =>
        (b.completedAt ?? "").localeCompare(a.completedAt ?? "")
      ),
    [mtdRecords]
  );

  const archivedPayrollRecords = useMemo(
    () =>
      [...getArchivedPayrollRecords(mtdRecords)].sort((a, b) =>
        (b.paidAt ?? b.completedAt ?? "").localeCompare(
          a.paidAt ?? a.completedAt ?? ""
        )
      ),
    [mtdRecords]
  );

  const orderById = useMemo(
    () => new Map(allOrders.map((order) => [order.id, order])),
    [allOrders]
  );

  // No Source filter here — manuals are merged/split on Orders/MTD before
  // completion, so Payroll rows are effectively form-sourced.
  const sourceRecords =
    pageTab === "archive" ? archivedPayrollRecords : payrollRecords;

  const markPaid = useCallback(
    (rec: MTDRecord) => {
      if (isViewOnly) return;
      updateMTD(rec.id, patchMarkPayrollPaid());
      const meta = resolveMTDFormMeta(
        rec,
        new Map(allOrders.map((order) => [order.id, order]))
      );
      setFormState(meta.formType);
      if (meta.formType === "school-all-star-cheer" && meta.cheerFormSubtype) {
        setCheerSubtypeState(meta.cheerFormSubtype as CheerFormSubtypeFilter);
      }
      if (meta.formType === "school-all-star-dance" && meta.danceFormSubtype) {
        setDanceSubtypeState(meta.danceFormSubtype as DanceFormSubtypeFilter);
      }
      setHighlightId(rec.id);
      setPageTab("archive");
      setMarkPaidRecord(null);
    },
    [isViewOnly, updateMTD, allOrders]
  );

  const clearHighlight = useCallback(() => {
    setHighlightId(null);
    if (typeof window !== "undefined" && focusParam) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("focus");
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [focusParam, pathname, router, searchParams]);

  useEffect(() => {
    setHighlightId(focusParam);
  }, [focusParam]);

  const confirmDeleteForever = useCallback(async () => {
    if (isViewOnly || !deleteForeverRecord || deletingForever) return;
    setDeletingForever(true);
    try {
      await removeMTDRecord(deleteForeverRecord.id);
      setDeleteForeverRecord(null);
    } catch {
      // Error toast from removeMTDRecord
    } finally {
      setDeletingForever(false);
    }
  }, [isViewOnly, deleteForeverRecord, deletingForever, removeMTDRecord]);

  useEffect(() => {
    if (!focusParam) return;
    const focused =
      mtdRecords.find(
        (r) =>
          r.id === focusParam ||
          r.orderId === focusParam ||
          r.uuid === focusParam ||
          r.legacyId === focusParam
      ) ?? null;
    if (!focused) return;
    const paid = Boolean(focused.paidAt);
    setPageTab(paid ? "archive" : "view");
    const meta = resolveMTDFormMeta(focused, orderById);
    setFormState(meta.formType);
    if (meta.formType === "school-all-star-cheer" && meta.cheerFormSubtype) {
      setCheerSubtypeState(meta.cheerFormSubtype as CheerFormSubtypeFilter);
    }
    if (meta.formType === "school-all-star-dance" && meta.danceFormSubtype) {
      setDanceSubtypeState(meta.danceFormSubtype as DanceFormSubtypeFilter);
    }
  }, [focusParam, mtdRecords, orderById]);

  const switchForm = useCallback(
    (next: OrderFormType) => {
      setForm(next);
      if (next !== "school-all-star-cheer") {
        setCheerSubtype(DEFAULT_CHEER_SUBTYPE);
      }
      if (next !== "school-all-star-dance") {
        setDanceSubtype(DEFAULT_DANCE_SUBTYPE);
      }
    },
    [setForm, setCheerSubtype, setDanceSubtype]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedForm = sessionStorage.getItem("slt_payroll_form");
    if (savedForm) return;

    if (sourceRecords.length === 0) return;

    const hasVisibleForForm = sourceRecords.some((rec) =>
      matchesFormFilter(rec, orderById, form, cheerSubtype, danceSubtype)
    );
    if (hasVisibleForForm) return;

    const latest = sourceRecords[0];
    const meta = resolveMTDFormMeta(latest, orderById);
    setFormState(meta.formType);
    if (meta.formType === "school-all-star-cheer" && meta.cheerFormSubtype) {
      setCheerSubtypeState(meta.cheerFormSubtype as CheerFormSubtypeFilter);
    }
    if (meta.formType === "school-all-star-dance" && meta.danceFormSubtype) {
      setDanceSubtypeState(meta.danceFormSubtype as DanceFormSubtypeFilter);
    }
  }, [sourceRecords, orderById, form, cheerSubtype, danceSubtype]);

  const tableFiltered = useMemo(
    () =>
      filterMTDRecords(sourceRecords, {
        packageTier: tableFilters.packageTier,
        timeLimit: tableFilters.timeLimit,
        split: tableFilters.split,
        assignedProducer: tableFilters.assignedProducer,
        requestedProducer: tableFilters.requestedProducer,
        dateFilter: tableFilters.dateFilter,
        scheduleFilter: tableFilters.scheduleFilter,
        infoFilter: tableFilters.infoFilter ?? "all",
        form,
        cheerSubtype,
        danceSubtype,
        orderById,
        producers,
      }),
    [
      sourceRecords,
      tableFilters,
      form,
      cheerSubtype,
      danceSubtype,
      orderById,
      producers,
    ]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim();
    const searched = !q
      ? tableFiltered
      : tableFiltered.filter((rec) => matchesMTDSearch(rec, q));
    const sorted = sortMTDRecordsBySortKey(
      searched,
      tableFilters.sortBy ?? "newest",
      producers,
      orderById
    );
    return sortMTDRecordsByViewOrder(sorted, viewOrder, producers);
  }, [
    tableFiltered,
    searchQuery,
    tableFilters.sortBy,
    viewOrder,
    producers,
    orderById,
  ]);

  const rushStateForRecord = useCallback(
    (rec: MTDRecord) => {
      const order = findLinkedOrder(rec, allOrders);
      const producerObj = findProducerByAssignmentKey(
        rec.assignedProducer,
        producers
      );
      const isRush = payrollRowIsRushOrder(rec, order);
      const key = rec.uuid || rec.id;
      const addonBase = rushFeeAddonForRecord(rec.id, rec.orderId, payrollAddons);
      const overlay = rushOverlay[key];
      const unit = addonBase?.unitAmount ?? DEFAULT_RUSH_FEE_UNIT;
      const addon = overlay
        ? {
            ...(addonBase ?? {}),
            amount: rushCustomerTotal(unit, overlay.quantity),
            quantity: overlay.quantity,
            unitAmount: unit,
            compensationOverridden:
              overlay.compensationOverridden ??
              addonBase?.compensationOverridden ??
              false,
            compensationRate: overlay.compensationOverridden
              ? overlay.compensationRate ?? null
              : addonBase?.compensationRate ?? null,
            producerId: addonBase?.producerId ?? producerObj?.id ?? null,
          }
        : addonBase;
      const selection = resolveRushFeeSelection({
        isRush,
        producerRate: producerObj?.rushFeeRate,
        producerId: producerObj?.id,
        addon,
      });
      return { order, producerObj, isRush, addon, selection };
    },
    [allOrders, producers, payrollAddons, rushOverlay]
  );

  const totalPayroll = useMemo(() => {
    // Mix editors: package payout plus rush compensation once.
    // Voiceovers are paid separately to VO producers.
    const mixTotal = filtered.reduce((sum, rec) => {
      const { order, producerObj, selection } = rushStateForRecord(rec);
      const meta = resolveMTDFormMeta(rec, orderById);
      const priced = payrollAmountsForRow(rec, order, meta, orderById);
      const custPrice = priced.customerPrice;
      const payrollPrice = priced.payrollPrice;
      const selectedRate = finalizedPayrollRate(order);

      const seRushFee =
        meta.formType === "sports-entertainment"
          ? sportsEntertainmentIncludedRushFeeAmount({
              isRush: payrollRowIsRushOrder(rec, order),
              formType: meta.formType,
              category: order?.category || rec.category,
              finalCustomerPrice: custPrice,
              finalPayrollPrice: payrollPrice,
            })
          : 0;
      const calc = computeClientPayroll(
        producerObj,
        custPrice,
        null,
        selectedRate,
        rec.manualPayoutInput ?? null,
        meta.canonicalSubtypeId,
        payrollPrice,
        {
          // Package (+ SE Magento rush × rushFeeRate). Cheer Rushby added below.
          rushFeeQuantity: 0,
          includeRushFeeInPayout: false,
          sportsEntertainmentRushFee: seRushFee,
          danceVoiceover: null,
          hasTraditionalVoiceover: false,
          hasThemedVoiceover: false,
          cheerVoiceover20: false,
          cheerVoiceover40: false,
          formType: meta.formType,
          rushFeeCompensationRate: producerObj?.rushFeeRate ?? 1.0,
        }
      );
      const base =
        packagePayoutMatchingCompliance(
          order,
          calc.producerPayout,
          priced.savedPayrollPrice,
          payrollPrice,
          meta.formType
        ) ?? 0;
      const withRush = finalizeMixPayout(base, calc.status, selection) ?? 0;
      const misc = miscAdjustmentAmount(rec.id, rec.orderId, payrollAddons);
      const payout = applyMiscAdjustmentToPayout(withRush, misc) ?? withRush;
      return sum + payout;
    }, 0);

    const voTotal = payrollAddons
      .filter((a) => a.addonType === "voiceover")
      .reduce((sum, a) => sum + a.amount, 0);
    return mixTotal + voTotal;
  }, [filtered, orderById, payrollAddons, rushStateForRecord]);

  const voiceoverCount = useMemo(
    () =>
      filterPayrollAddonsForForm(
        payrollAddons,
        form,
        cheerSubtype,
        danceSubtype,
        payrollRecords,
        orderById
      ).filter((a) => a.addonType === "voiceover").length,
    [
      payrollAddons,
      form,
      cheerSubtype,
      danceSubtype,
      payrollRecords,
      orderById,
    ]
  );

  const formCounts = useMemo(
    () => countMTDByForm(sourceRecords, orderById),
    [sourceRecords, orderById]
  );

  const cheerSubtypeCounts = useMemo(
    () => countMTDByCheerSubtype(sourceRecords, orderById),
    [sourceRecords, orderById]
  );

  const danceSubtypeCounts = useMemo(
    () => countMTDByDanceSubtype(sourceRecords, orderById),
    [sourceRecords, orderById]
  );

  const emptyMessage = useMemo(() => {
    if (pageTab === "archive") {
      if (archivedPayrollRecords.length === 0) {
        return "No paid mixes in archive yet. Mark a mix as Paid on Payroll to move it here.";
      }
      if (filtered.length === 0) {
        return "No archived mixes match the current category or filters.";
      }
      return "No mixes to show.";
    }
    if (payrollRecords.length === 0) {
      return "No completed mixes in payroll yet. On MTD, set status to Completed and click Confirm & Move to Payroll in the final step.";
    }
    if (filtered.length === 0) {
      return "No mixes match the current category or filters. Try another tab or clear filters.";
    }
    return "No mixes to show.";
  }, [
    pageTab,
    archivedPayrollRecords.length,
    payrollRecords.length,
    filtered.length,
  ]);

  // Build unique program options from allOrders for the add-on modals
  const programOptions = useMemo(() => {
    const seen = new Set<string>();
    const result: { programName: string; contactName: string; category: string }[] = [];
    for (const order of allOrders) {
      const key = order.programName?.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push({
        programName: order.programName,
        contactName: order.contactName || order.customerName || "",
        category: order.category || "",
      });
    }
    return result.sort((a, b) => a.programName.localeCompare(b.programName));
  }, [allOrders]);

  const handleDeleteAddon = useCallback(
    async (id: string) => {
      try {
        await removePayrollAddon(id);
      } catch (err) {
        console.error("Failed to delete payroll add-on:", err);
      }
      setAddonDeleteId(null);
    },
    [removePayrollAddon]
  );

  const payrollAddonsRef = useRef(payrollAddons);
  payrollAddonsRef.current = payrollAddons;
  const knownRushAddonRef = useRef(new Map<string, PayrollAddon>());
  const rushSaveTimerRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const clearRushOverlay = useCallback((key: string) => {
    delete rushOverlayRef.current[key];
    setRushOverlay({ ...rushOverlayRef.current });
  }, []);

  const flushRushFeeSave = useCallback(
    async (rec: MTDRecord) => {
      const key = rec.uuid || rec.id;
      const overlay = rushOverlayRef.current[key];
      if (!overlay) return;

      const order = findLinkedOrder(rec, allOrders);
      if (!payrollRowIsRushOrder(rec, order)) {
        clearRushOverlay(key);
        rushPendingClear.delete(key);
        return;
      }

      const producer = findProducerByAssignmentKey(
        rec.assignedProducer,
        producers
      );
      const existing =
        rushFeeAddonForRecord(rec.id, rec.orderId, payrollAddonsRef.current) ||
        knownRushAddonRef.current.get(key) ||
        null;
      const quantity = Math.max(0, Math.min(100, Math.round(overlay.quantity) || 0));

      // Qty 0 = remove the add-on. Never PATCH quantity 0 (API 422).
      if (quantity < 1) {
        rushPendingClear.add(key);
        if (rushCreateInflight.has(key) && !existing) {
          // Create still running — delete in that path once it finishes.
          clearRushOverlay(key);
          return;
        }
        if (existing) {
          try {
            await removePayrollAddon(existing.id);
          } catch (err) {
            console.error("Failed to remove rush fee:", err);
            return;
          }
          knownRushAddonRef.current.delete(key);
        }
        rushPendingClear.delete(key);
        clearRushOverlay(key);
        return;
      }

      rushPendingClear.delete(key);

      const current = resolveRushFeeSelection({
        isRush: true,
        producerRate: producer?.rushFeeRate,
        producerId: producer?.id,
        addon: existing,
      });
      const unit = current.unitAmount > 0 ? current.unitAmount : DEFAULT_RUSH_FEE_UNIT;
      const rawOverridden = Boolean(overlay.compensationOverridden);
      const compensationRate = rawOverridden
        ? normalizeCompensationFraction(overlay.compensationRate)
        : null;
      // Avoid 422: override flag with a missing rate is rejected by the API.
      const overridden = rawOverridden && compensationRate != null;
      const amount = rushCustomerTotal(unit, quantity);
      const producerId = producer?.id || null;
      const producerInitials =
        producer?.initials || rec.assignedProducer || null;

      try {
        if (!existing && rushCreateInflight.has(key)) return;
        if (!existing) rushCreateInflight.add(key);
        const saved = existing
          ? await updatePayrollAddon(existing.id, {
              quantity,
              unitAmount: unit,
              amount,
              compensationRate,
              compensationOverridden: overridden,
              producerId,
              producerInitials,
            })
          : await addPayrollAddon({
              orderId: rec.orderId || rec.id,
              mtdId: rec.id,
              programName: rec.programName || "—",
              teamName: (rec as { teamName?: string }).teamName || null,
              contactName: rec.contactName || null,
              category:
                resolveMTDFormMeta(rec, orderById).formType ===
                "school-all-star-dance"
                  ? "Dance"
                  : "Cheer",
              addonType: "rush_fee",
              amount,
              quantity,
              unitAmount: unit,
              compensationRate,
              compensationOverridden: overridden,
              rateSource: "predefined",
              producerId,
              producerInitials,
            });

        // User cleared while create was in flight — drop the row now.
        if (rushPendingClear.has(key) || (rushOverlayRef.current[key]?.quantity ?? 1) < 1) {
          rushPendingClear.delete(key);
          knownRushAddonRef.current.delete(key);
          clearRushOverlay(key);
          try {
            await removePayrollAddon(saved.id);
          } catch (err) {
            console.error("Failed to remove rush fee after clear:", err);
          }
          return;
        }

        knownRushAddonRef.current.set(key, saved);
        clearRushOverlay(key);
      } catch (err) {
        console.error("Failed to save rush fee:", err);
      } finally {
        rushCreateInflight.delete(key);
      }
    },
    [
      allOrders,
      producers,
      orderById,
      addPayrollAddon,
      updatePayrollAddon,
      removePayrollAddon,
      clearRushOverlay,
    ]
  );

  const persistRushFee = useCallback(
    (rec: MTDRecord, next: { quantity: number; ratePercent?: number }) => {
      if (isViewOnly) return;
      const key = rec.uuid || rec.id;
      const producer = findProducerByAssignmentKey(
        rec.assignedProducer,
        producers
      );
      const producerRate = normalizeCompensationFraction(producer?.rushFeeRate);
      const quantity = Math.max(0, Math.min(100, Math.round(next.quantity) || 0));
      const prior = rushOverlayRef.current[key];
      const existingAddon = rushFeeAddonForRecord(
        rec.id,
        rec.orderId,
        payrollAddonsRef.current
      );
      let compensationOverridden =
        prior?.compensationOverridden ?? existingAddon?.compensationOverridden;
      let compensationRate =
        prior?.compensationRate ?? existingAddon?.compensationRate ?? null;

      if (next.ratePercent !== undefined) {
        const selected = normalizeCompensationFraction(next.ratePercent);
        if (selected == null) return;
        compensationOverridden =
          producerRate == null || !compensationRatesEqual(selected, producerRate);
        compensationRate = compensationOverridden ? selected : null;
      }

      if (quantity < 1) {
        rushPendingClear.add(key);
        compensationOverridden = false;
        compensationRate = null;
      } else {
        rushPendingClear.delete(key);
      }

      rushOverlayRef.current = {
        ...rushOverlayRef.current,
        [key]: {
          quantity,
          compensationOverridden: compensationOverridden ?? false,
          compensationRate: compensationOverridden ? compensationRate ?? null : null,
        },
      };
      setRushOverlay({ ...rushOverlayRef.current });

      const existingTimer = rushSaveTimerRef.current.get(key);
      if (existingTimer) clearTimeout(existingTimer);
      // Clear immediately so a second click/double-click removes without waiting.
      const delay = quantity < 1 ? 0 : RUSH_SAVE_DEBOUNCE_MS;
      rushSaveTimerRef.current.set(
        key,
        setTimeout(() => {
          rushSaveTimerRef.current.delete(key);
          void flushRushFeeSave(rec);
        }, delay)
      );
    },
    [isViewOnly, producers, flushRushFeeSave]
  );

  // Rush Order Yes/No is informational (and gates the Rush Fee controls).
  // Never auto-create a Rushby payroll add-on — admin must add amount/qty
  // explicitly. Drop orphan fees when Rush Order is No; de-dupe extras;
  // clear an override that belonged to a previous producer.
  const orphanRushCleanupRef = useRef(new Set<string>());
  const overrideResetRef = useRef(new Set<string>());
  const duplicateRushCleanupRef = useRef(new Set<string>());
  useEffect(() => {
    if (isViewOnly || pageTab !== "view") return;
    for (const rec of payrollRecords) {
      const key = rec.uuid || rec.id;
      const { isRush, addon, producerObj, selection } = rushStateForRecord(rec);
      const matches = rushFeeAddonsForRecord(rec.id, rec.orderId, payrollAddonsRef.current);

      if (!isRush) {
        for (const extra of matches) {
          if (orphanRushCleanupRef.current.has(extra.id)) continue;
          orphanRushCleanupRef.current.add(extra.id);
          knownRushAddonRef.current.delete(key);
          void removePayrollAddon(extra.id);
        }
        continue;
      }

      for (const extra of matches) {
        if (!addon || extra.id === addon.id) continue;
        if (duplicateRushCleanupRef.current.has(extra.id)) continue;
        duplicateRushCleanupRef.current.add(extra.id);
        void removePayrollAddon(extra.id);
      }

      if (
        addon?.compensationOverridden &&
        addon.producerId &&
        producerObj?.id &&
        addon.producerId !== producerObj.id
      ) {
        const resetKey = `${addon.id}:${producerObj.id}`;
        if (!overrideResetRef.current.has(resetKey)) {
          overrideResetRef.current.add(resetKey);
          void persistRushFee(rec, {
            quantity: Math.max(1, selection.quantity || 1),
          });
        }
      }
    }
  }, [
    isViewOnly,
    pageTab,
    payrollRecords,
    rushStateForRecord,
    persistRushFee,
    removePayrollAddon,
  ]);

  const categoryFilteredProducers = useMemo(
    () =>
      producers.filter((producer) =>
        producerMatchesScheduleFormFilter(producer, form, cheerSubtype, danceSubtype)
      ),
    [producers, form, cheerSubtype, danceSubtype]
  );

  const sendPayPeriodBounds = useMemo(() => {
    const sendPeriodFilter = payPeriodRangeToDateFilter(sendPayPeriod);
    const bounds = calculateDateBounds(sendPeriodFilter.type, sendPeriodFilter.value);
    return {
      start: bounds.start ? toCanonicalIsoDate(bounds.start) : "",
      end: bounds.end ? toCanonicalIsoDate(bounds.end) : "",
    };
  }, [sendPayPeriod]);

  const sendPayrollRecords = useMemo(
    () =>
      payrollRecords.filter((rec) =>
        matchesFormFilter(rec, orderById, form, cheerSubtype, danceSubtype)
      ),
    [payrollRecords, orderById, form, cheerSubtype, danceSubtype]
  );

  // Voiceovers are Cheer|Dance-tagged; scope them to the active form tab so
  // Cheer VOs never appear on Sports Entertainment / Band / Anthem statements.
  const sendPayrollAddons = useMemo(
    () =>
      filterPayrollAddonsForForm(
        payrollAddons,
        form,
        cheerSubtype,
        danceSubtype,
        payrollRecords,
        orderById
      ),
    [payrollAddons, form, cheerSubtype, danceSubtype, payrollRecords, orderById]
  );

  const sendProducerNames = useMemo(
    () =>
      getPayrollSendProducerNames(
        sendPayrollRecords,
        orderById,
        producers,
        form,
        cheerSubtype,
        danceSubtype,
        sendPayPeriodBounds,
        sendPayrollAddons,
        payrollRecords
      ),
    [
      sendPayrollRecords,
      orderById,
      producers,
      form,
      cheerSubtype,
      danceSubtype,
      sendPayPeriodBounds,
      sendPayrollAddons,
      payrollRecords,
    ]
  );

  const sendEditorProducers = useMemo(
    () => resolvePayrollSendEditorProducers(producers, sendProducerNames),
    [producers, sendProducerNames]
  );

  const exportCategoryLabel = useMemo(
    () => scheduleFormFilterLabel(form, cheerSubtype, danceSubtype),
    [form, cheerSubtype, danceSubtype]
  );

  useEffect(() => {
    if (selectedSendEditor === "all") return;
    const stillValid = sendEditorProducers.some(
      (producer) =>
        producer.name === selectedSendEditor ||
        producer.id === selectedSendEditor ||
        producer.name.toUpperCase() === selectedSendEditor.toUpperCase()
    );
    if (!stillValid) setSelectedSendEditor("all");
  }, [sendEditorProducers, selectedSendEditor]);

  const addonsLocked = isViewOnly || pageTab === "archive";

  const columns: Column<MTDRecord>[] = useMemo(
    () => {
      const baseCols: Column<MTDRecord>[] = [
      {
        key: "rowId",
        header: "ID",
        width: "56px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (_rec, index) => (
          <span className="text-[12px] tabular-nums text-brand-ink">
            {index + 1}
          </span>
        ),
      },
      {
        key: "createdAt",
        header: "Timestamp",
        width: "128px",
        align: "center",
        nowrap: true,
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => {
          const linked = findLinkedOrder(rec, allOrders);
          return (
            <span className="whitespace-nowrap text-[11px] tabular-nums text-brand-ink-secondary">
              {formatDisplayDateTime(linked?.createdAt || "")}
            </span>
          );
        },
      },
      {
        key: "contact",
        header: "Contact",
        width: "96px",
        align: "center",
        cellClassName: "!px-3 !py-2",
        headerClassName: "!px-3 !py-2",
        render: (rec) => (
          <span className="block truncate text-[12px] leading-snug text-brand-ink">
            {titleCase(rec.contactName)}
          </span>
        ),
      },
      {
        key: "program",
        header: "Program",
        width: "96px",
        align: "center",
        cellClassName: "!px-3 !py-2",
        headerClassName: "!px-3 !py-2",
        render: (rec) => (
          <span className="block truncate text-[12px] leading-snug text-brand-ink">
            {titleCase(rec.programName)}
          </span>
        ),
      },
      {
        key: "editor",
        header: "Assigned producer",
        width: "96px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => {
          const producer = rec.assignedProducer
            ? findProducerByAssignmentKey(rec.assignedProducer, producers)
            : undefined;
          return (
            <div className="flex items-center justify-center">
              <Avatar producer={producer} initials={rec.assignedProducer} size="xs" />
            </div>
          );
        },
      },
      {
        key: "invoice",
        header: "Invoice #",
        width: "108px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => (
          <span className="text-[12px] font-semibold tabular-nums text-brand-ink">
            {rec.invoice}
          </span>
        ),
      },
      {
        key: "mixStart",
        header: "Mix start\ndate",
        width: "112px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2 whitespace-pre-line leading-tight",
        render: (rec) => (
          <span className="text-[12px] tabular-nums text-brand-ink-secondary">
            {formatDisplayDate(toIsoDateString(rec.mixStartDate))}
          </span>
        ),
      },
      {
        key: "mixEnd",
        header: "Mix due\ndate",
        width: "112px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2 whitespace-pre-line leading-tight",
        render: (rec) => (
          <span className="text-[12px] tabular-nums text-brand-ink-secondary">
            {formatDisplayDate(toIsoDateString(rec.mixEndDate ?? ""))}
          </span>
        ),
      },
      {
        key: "package",
        header: "Package type",
        width: "88px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => {
          const { tier } = parsePackage(rec.package);
          return (
            <span className="text-[12px] font-medium text-brand-ink">
              {titleCase(tier)}
            </span>
          );
        },
      },
      ...(form === "school-all-star-cheer"
        ? [
            {
              key: "timeLimit",
              header: "Mix Length",
              width: "80px",
              align: "center" as const,
              cellClassName: "!px-2 !py-1.5",
              headerClassName: "!px-2 !py-2",
              render: (rec: MTDRecord) => {
                const { limit } = parsePackage(rec.package);
                return (
                  <span className="text-[12px] tabular-nums text-brand-ink">
                    {limit}
                  </span>
                );
              },
            },
          ]
        : []),
      {
        key: "price",
        header: "Package Price",
        width: "110px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => {
          const order = findLinkedOrder(rec, allOrders);
          const custPrice =
            order?.finalCustomerPrice ??
            order?.systemCalculatedCustomerPrice ??
            rec.finalCustomerPrice ??
            rec.price;
          const isOverridden = Boolean(
            order?.finalCustomerPriceOverridden ?? rec.finalCustomerPriceOverridden
          );

          return (
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-[12px] font-semibold tabular-nums text-brand-ink">
                  {formatPrice(custPrice)}
                </span>
                {isOverridden && (
                  <span
                    className="rounded bg-brand-orange/10 px-1 py-0.2 text-[9px] font-semibold uppercase text-brand-orange ring-1 ring-inset ring-brand-orange/20"
                    title="Customer price overridden"
                  >
                    edited
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      ];

      baseCols.push(
      {
        key: "payout",
        header: "Producer Payout",
        width: "148px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => {
          const { order, producerObj, selection } = rushStateForRecord(rec);
          const model = producerObj?.compensationModel;
          const meta = resolveMTDFormMeta(rec, orderById);
          const priced = payrollAmountsForRow(rec, order, meta, orderById);
          const custPrice = priced.customerPrice;
          const payrollPrice = priced.payrollPrice;

          const selectedRate = finalizedPayrollRate(order);

          const seRushFee =
            meta.formType === "sports-entertainment"
              ? sportsEntertainmentIncludedRushFeeAmount({
                  isRush: payrollRowIsRushOrder(rec, order),
                  formType: meta.formType,
                  category: order?.category || rec.category,
                  finalCustomerPrice: custPrice,
                  finalPayrollPrice: payrollPrice,
                })
              : 0;
          const calculated = computeClientPayroll(
            producerObj,
            custPrice,
            null,
            selectedRate,
            rec.manualPayoutInput ?? null,
            meta.canonicalSubtypeId,
            payrollPrice,
            {
              // Package (+ SE Magento rush × rushFeeRate). Cheer Rushby below.
              rushFeeQuantity: 0,
              includeRushFeeInPayout: false,
              sportsEntertainmentRushFee: seRushFee,
              rushFeeCompensationRate: producerObj?.rushFeeRate ?? 1.0,
              danceVoiceover: null,
              hasTraditionalVoiceover: false,
              hasThemedVoiceover: false,
              cheerVoiceover20: false,
              cheerVoiceover40: false,
              formType: meta.formType,
            }
          );

          const withRush = finalizeMixPayout(
            packagePayoutMatchingCompliance(
              order,
              calculated.producerPayout,
              priced.savedPayrollPrice,
              payrollPrice,
              meta.formType
            ),
            calculated.status,
            selection
          );
          const miscAdj = miscAdjustmentAmount(
            rec.id,
            rec.orderId,
            payrollAddons
          );
          const payout = applyMiscAdjustmentToPayout(withRush, miscAdj);
          const isRateOverridden = order?.rateSource === "manual_override";
          const isPriceOverridden = Boolean(
            order?.finalCustomerPriceOverridden ?? rec.finalCustomerPriceOverridden
          );

          const viewCalc = (
            <PayoutCalculationButton
              onOpen={() => setPayoutViewRecord(rec)}
            />
          );

          if (model === "not_paid_for_mixing") {
            // Misc adjustments still apply when the mix itself is unpaid.
            const unpaidTotal = applyMiscAdjustmentToPayout(0, miscAdj) ?? 0;
            return (
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[12px] font-semibold tabular-nums text-brand-ink">
                    {formatPrice(unpaidTotal)}
                  </span>
                  {viewCalc}
                </div>
                <span className="text-[10px] text-brand-ink-tertiary">
                  Not Paid for Mixing
                </span>
              </div>
            );
          }

          if (model === "hourly_manual") {
            return (
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[12px] font-semibold tabular-nums text-brand-ink">
                    {payout !== undefined && payout !== null
                      ? formatPrice(payout)
                      : "Hourly"}
                  </span>
                  {viewCalc}
                </div>
                <span className="text-[10px] text-brand-ink-tertiary">
                  Manual Pay Sheet
                </span>
              </div>
            );
          }

          if (payout === undefined || payout === null) {
            return (
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[12px] font-semibold tabular-nums text-brand-orange">
                    Needs Review
                  </span>
                  {viewCalc}
                </div>
                <span className="text-[10px] text-brand-ink-tertiary">
                  No rate on file
                </span>
              </div>
            );
          }

          return (
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-[12px] font-bold tabular-nums text-brand-success">
                  {formatPrice(payout)}
                </span>
                {(isRateOverridden || isPriceOverridden) && (
                  <span
                    className="rounded bg-brand-orange/10 px-1 py-0.2 text-[9px] font-semibold uppercase text-brand-orange ring-1 ring-inset ring-brand-orange/20"
                    title="Rate or customer price overridden"
                  >
                    edited
                  </span>
                )}
                {viewCalc}
              </div>
            </div>
          );
        },
      },
      {
        key: "completedAt",
        header: "Completed",
        width: "112px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => (
          <span className="text-[12px] tabular-nums text-brand-ink-secondary">
            {rec.completedAt
              ? formatDisplayDate(rec.completedAt.slice(0, 10))
              : "—"}
          </span>
        ),
      },
      {
        key: "rushOrder",
        header: "Rush order",
        width: "120px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => {
          const order = findLinkedOrder(rec, allOrders);
          const isRush = payrollRowIsRushOrder(rec, order);
          const meta = resolveMTDFormMeta(rec, orderById);
          const custPrice =
            order?.finalCustomerPrice ?? rec.finalCustomerPrice ?? rec.price;
          const payrollPrice =
            order?.finalPayrollPrice ?? rec.finalPayrollPrice ?? rec.price;
          const producerObj = findProducerByAssignmentKey(
            rec.assignedProducer,
            producers
          );
          const seIncluded = sportsEntertainmentIncludedRushCompensation({
            isRush,
            formType: meta.formType,
            category: order?.category || rec.category,
            finalCustomerPrice: custPrice,
            finalPayrollPrice: payrollPrice,
            rushFeeRate: producerObj?.rushFeeRate ?? null,
          });

          if (!isRush) {
            return (
              <span className="text-[12px] text-brand-ink-tertiary">No</span>
            );
          }

          const badge = (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-orange-soft px-2 py-0.5 text-[11px] font-semibold text-brand-orange-deep">
              Yes
              {seIncluded ? (
                <span className="tabular-nums font-semibold">
                  ({formatPrice(seIncluded.compensation)})
                </span>
              ) : null}
            </span>
          );

          if (!seIncluded) return badge;

          return (
            <HoverTip
              placement="top"
              label={`$${seIncluded.feeAmount} Sports Entertainment rush fee already applied in the producer payout.`}
            >
              {badge}
            </HoverTip>
          );
        },
      },
      {
        key: "miscAdjustment",
        header: "Misc Adjustment",
        width: "128px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => {
          const amount = miscAdjustmentAmount(
            rec.id,
            rec.orderId,
            payrollAddons
          );
          const label =
            amount !== 0 ? formatSignedMiscAdjustment(amount) : "Add";
          return (
            <div
              className="flex items-center justify-center"
              data-stop-row-nav
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                disabled={addonsLocked}
                onClick={() => setMiscAdjustmentRecord(rec)}
                title="Miscellaneous Adjustment"
                className={
                  amount !== 0
                    ? "inline-flex h-7 items-center rounded-md border border-brand-orange/35 bg-brand-orange/10 px-2.5 text-[11px] font-semibold tabular-nums text-brand-orange transition hover:bg-brand-orange/18 disabled:cursor-not-allowed disabled:opacity-50"
                    : "inline-flex h-7 items-center rounded-md border border-brand-line px-2.5 text-[11px] font-semibold text-brand-ink-secondary transition hover:border-brand-orange/40 hover:text-brand-ink disabled:cursor-not-allowed disabled:opacity-50"
                }
              >
                {label}
              </button>
            </div>
          );
        },
      },
      {
        key: "rushFee",
        header: "Rush Fee",
        width: "1px",
        nowrap: false,
        align: "center",
        cellClassName:
          "!px-1 !py-1 !max-w-none w-px overflow-visible whitespace-normal",
        headerClassName: "!px-1 !py-1.5 whitespace-nowrap",
        render: (rec) => {
          const { isRush, selection, producerObj } = rushStateForRecord(rec);
          return (
            <PayrollRushFeeControls
              rushOrder={isRush}
              selection={selection}
              producerRate={producerObj?.rushFeeRate}
              readOnly={addonsLocked}
              onQuantity={(quantity) => {
                void persistRushFee(rec, { quantity });
              }}
              onRate={(percent) => {
                void persistRushFee(rec, {
                  quantity: Math.max(1, selection.quantity || 1),
                  ratePercent: percent,
                });
              }}
            />
          );
        },
      }
      );

      if (pageTab === "archive") {
        baseCols.push({
          key: "paidAt",
          header: "Paid",
          width: "112px",
          align: "center",
          cellClassName: "!px-2 !py-1.5",
          headerClassName: "!px-2 !py-2",
          render: (rec) => (
            <span className="text-[12px] tabular-nums text-brand-ink-secondary">
              {rec.paidAt
                ? formatDisplayDate(rec.paidAt.slice(0, 10))
                : "—"}
            </span>
          ),
        });
        if (!isViewOnly) {
          baseCols.push({
            key: "deleteForever",
            header: "Archive",
            width: "128px",
            align: "center",
            cellClassName: "!px-2 !py-1.5",
            headerClassName: "!px-2 !py-2",
            render: (rec) => (
              <div
                className="flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeleteForeverRecord(rec);
                  }}
                  className={deleteForeverBtnClass}
                  title="Delete forever"
                >
                  <Trash2 className="h-3 w-3" strokeWidth={2.25} />
                  <span>Delete forever</span>
                </button>
              </div>
            ),
          });
        }
      } else if (pageTab === "view" && !isViewOnly) {
        baseCols.push({
          key: "markPaid",
          header: "Paid",
          width: "96px",
          align: "center",
          cellClassName: "!px-2 !py-1.5",
          headerClassName: "!px-2 !py-2",
          render: (rec) => (
            <div
              className="flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setMarkPaidRecord(rec)}
                className={paidBtnClass}
                title="Mark paid and move to archive"
              >
                <Check className="h-3 w-3" strokeWidth={2.5} />
                <span>Paid</span>
              </button>
            </div>
          ),
        });
      }

      return baseCols;
    },
    [
      form,
      addonsLocked,
      isViewOnly,
      orderById,
      allOrders,
      producers,
      payrollAddons,
      rushStateForRecord,
      persistRushFee,
      pageTab,
    ]
  );

  const miscAdjustmentExisting = useMemo(
    () =>
      miscAdjustmentRecord
        ? miscAdjustmentAddonForRecord(
            miscAdjustmentRecord.id,
            miscAdjustmentRecord.orderId,
            payrollAddons
          )
        : null,
    [miscAdjustmentRecord, payrollAddons]
  );

  const persistMiscAdjustment = useCallback(
    async (payload: CreatePayrollAddonPayload) => {
      const rec = miscAdjustmentRecord;
      if (!rec) return;

      // Always read the latest list — a stale closure after create would miss
      // the row and POST a second misc_adjustment for the same mix.
      const latest = payrollAddonsRef.current;
      const matches = latest.filter((addon) => {
        if (addon.addonType !== "misc_adjustment") return false;
        const aMtd = addon.mtdId ? String(addon.mtdId).trim() : "";
        const aOrd = addon.orderId ? String(addon.orderId).trim() : "";
        const rId = String(rec.id).trim();
        const rOrd = rec.orderId ? String(rec.orderId).trim() : "";
        if (aMtd && (aMtd === rId || (rOrd && aMtd === rOrd))) return true;
        if (aOrd && ((rOrd && aOrd === rOrd) || aOrd === rId)) return true;
        return false;
      });

      const primary = matches[0] ?? null;
      // Keep exactly one misc adjustment per order — drop duplicates.
      for (const extra of matches.slice(1)) {
        await removePayrollAddon(extra.id);
      }

      if (primary) {
        await updatePayrollAddon(primary.id, { amount: payload.amount });
        return;
      }
      await addPayrollAddon(payload);
    },
    [
      miscAdjustmentRecord,
      addPayrollAddon,
      updatePayrollAddon,
      removePayrollAddon,
    ]
  );

  const clearMiscAdjustment = useCallback(async () => {
    const rec = miscAdjustmentRecord;
    if (!rec) return;
    const matches = payrollAddonsRef.current.filter((addon) => {
      if (addon.addonType !== "misc_adjustment") return false;
      const aMtd = addon.mtdId ? String(addon.mtdId).trim() : "";
      const aOrd = addon.orderId ? String(addon.orderId).trim() : "";
      const rId = String(rec.id).trim();
      const rOrd = rec.orderId ? String(rec.orderId).trim() : "";
      if (aMtd && (aMtd === rId || (rOrd && aMtd === rOrd))) return true;
      if (aOrd && ((rOrd && aOrd === rOrd) || aOrd === rId)) return true;
      return false;
    });
    for (const addon of matches) {
      await removePayrollAddon(addon.id);
    }
  }, [miscAdjustmentRecord, removePayrollAddon]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ReturnNavBanner />
      <PageHeader
        compact
        title="Payroll"
        badge={
          pageTab === "view"
            ? `${filtered.length} of ${payrollRecords.length} · ${formatPrice(totalPayroll)}`
            : pageTab === "archive"
              ? `${filtered.length} of ${archivedPayrollRecords.length}`
              : pageTab === "voiceovers" && voiceoverCount > 0
                ? `${voiceoverCount}`
                : undefined
        }
        subtitle={
          pageTab === "view"
            ? "Ready for payout"
            : pageTab === "archive"
              ? "Paid mixes · delete forever when done"
              : pageTab === "voiceovers"
                ? undefined
                : "Filter producers, preview statements, and send via Gmail"
        }
        tabs={
          <Tabs
            accent="orange"
            value={pageTab}
            onChange={(value) => setPageTab(value as PayrollPageTab)}
            options={[
              {
                value: "view",
                label: "Payroll",
                count: payrollRecords.length || undefined,
              },
              {
                value: "archive",
                label: "Archive",
                count: archivedPayrollRecords.length || undefined,
              },
              {
                value: "voiceovers",
                label: "Add Voiceover",
                count: voiceoverCount || undefined,
              },
              {
                value: "send",
                label: "Send Statements",
                count: sendProducerNames.length || undefined,
              },
            ]}
          />
        }
        exportAction={
          pageTab === "view" || pageTab === "archive"
            ? {
                label: "CSV",
                onClick: () => {
                  const csv = generatePayrollCsv(
                    filtered,
                    allOrders,
                    producers,
                    payrollAddons
                  );
                  const prefix =
                    pageTab === "archive"
                      ? "Payroll_Archive"
                      : "Payroll_Export";
                  triggerCsvDownload(`${prefix}_${todayIso()}.csv`, csv);
                },
              }
            : undefined
        }
        search={
          pageTab === "view" || pageTab === "archive"
            ? {
                value: searchQuery,
                onChange: setSearchQuery,
                placeholder: "Contact, invoice…",
              }
            : undefined
        }
        toolbar={
          pageTab === "view" || pageTab === "archive" ? (
            <MTDPageToolbar
              form={form}
              cheerSubtype={cheerSubtype}
              danceSubtype={danceSubtype}
              onFormChange={switchForm}
              onCheerSubtypeChange={setCheerSubtype}
              onDanceSubtypeChange={setDanceSubtype}
              formCounts={formCounts}
              cheerCounts={cheerSubtypeCounts}
              danceCounts={danceSubtypeCounts}
              records={sourceRecords}
              producers={producers}
              orderById={orderById}
              filters={tableFilters}
              onFiltersChange={(patch) =>
                setTableFilters((prev) => ({ ...prev, ...patch }))
              }
              onFiltersReset={() =>
                setTableFilters((prev) => ({
                  ...DEFAULT_MTD_TABLE_FILTERS,
                  sortBy: prev.sortBy ?? "newest",
                }))
              }
              viewOrder={viewOrder}
              onViewOrderChange={setViewOrder}
            />
          ) : pageTab === "voiceovers" ? (
            <div className="relative z-40 inline-flex flex-wrap items-center gap-0.5 rounded-xl bg-brand-elevated/80 p-0.5 ring-1 ring-inset ring-brand-line/40">
              <OrderFormFilters
                grouped
                portalMenus
                form={form}
                cheerSubtype={cheerSubtype}
                danceSubtype={danceSubtype}
                onFormChange={switchForm}
                onCheerSubtypeChange={setCheerSubtype}
                onDanceSubtypeChange={setDanceSubtype}
                formCounts={formCounts}
                cheerCounts={cheerSubtypeCounts}
                danceCounts={danceSubtypeCounts}
              />
            </div>
          ) : (
            <PayrollSendToolbar
              form={form}
              cheerSubtype={cheerSubtype}
              danceSubtype={danceSubtype}
              formCounts={formCounts}
              cheerCounts={cheerSubtypeCounts}
              danceCounts={danceSubtypeCounts}
              sendEditorProducers={sendEditorProducers}
              selectedSendEditor={selectedSendEditor}
              onSelectedSendEditorChange={setSelectedSendEditor}
              payPeriod={sendPayPeriod}
              onPayPeriodChange={setSendPayPeriod}
              onFormChange={switchForm}
              onCheerSubtypeChange={setCheerSubtype}
              onDanceSubtypeChange={setDanceSubtype}
            />
          )
        }
      />

      <div className="min-h-0 flex-1 overflow-auto px-2 pb-6 pt-5 lg:px-3">
        {pageTab === "view" || pageTab === "archive" ? (
          <div className="dashboard-panel dashboard-panel-framed overflow-hidden">
            <DataTable
              key={`${pageTab}-${viewOrder}`}
              columns={columns}
              data={filtered}
              rowKey={(rec) => rec.id}
              emptyMessage={emptyMessage}
              pageSize={15}
              embedded
              showScrollIndicator={false}
              highlightRowKey={highlightId}
              onClearHighlight={clearHighlight}
            />
          </div>
        ) : pageTab === "voiceovers" ? (
          <VoiceoversPanel
            payrollAddons={payrollAddons}
            producers={producers}
            mtdRecords={mtdRecords}
            allOrders={allOrders}
            form={form}
            cheerSubtype={cheerSubtype}
            danceSubtype={danceSubtype}
            readOnly={isViewOnly}
            onAdd={addPayrollAddon}
            onDelete={handleDeleteAddon}
          />
        ) : (
          <PayrollSendPanel
            categoryLabel={exportCategoryLabel}
            producerNames={sendProducerNames}
            categoryProducers={categoryFilteredProducers}
            selectedSendEditor={selectedSendEditor}
            payPeriod={sendPayPeriod}
            payrollRecords={sendPayrollRecords}
            allOrders={allOrders}
            producers={producers}
            payrollAddons={sendPayrollAddons}
          />
        )}
      </div>

      <PayoutCalculationModal
        open={Boolean(payoutViewRecord)}
        record={payoutViewRecord}
        allOrders={allOrders}
        producers={producers}
        payrollAddons={payrollAddons}
        onClose={() => setPayoutViewRecord(null)}
      />

      <MarkPaidConfirmModal
        open={Boolean(markPaidRecord)}
        record={markPaidRecord}
        onClose={() => setMarkPaidRecord(null)}
        onConfirm={() => {
          if (markPaidRecord) markPaid(markPaidRecord);
        }}
      />

      <MiscAdjustmentModal
        open={Boolean(miscAdjustmentRecord)}
        record={miscAdjustmentRecord}
        existing={miscAdjustmentExisting}
        allOrders={allOrders}
        producers={producers}
        onClose={() => setMiscAdjustmentRecord(null)}
        onSave={persistMiscAdjustment}
        onClear={clearMiscAdjustment}
      />

      {deleteForeverRecord && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <button
                type="button"
                className="absolute inset-0 bg-brand-scrim backdrop-blur-sm"
                onClick={() => {
                  if (!deletingForever) setDeleteForeverRecord(null);
                }}
                aria-label="Close"
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-forever-title"
                className="relative w-full max-w-[400px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
              >
                <div className="px-6 pb-5 pt-7 text-center">
                  <h2
                    id="delete-forever-title"
                    className="text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
                  >
                    Delete forever?
                  </h2>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-brand-ink-secondary">
                    {titleCase(deleteForeverRecord.programName)}
                    {deleteForeverRecord.invoice?.trim()
                      ? ` · #${deleteForeverRecord.invoice.trim()}`
                      : ""}{" "}
                    will be permanently removed from the payroll archive. This
                    cannot be undone.
                  </p>
                </div>
                <div className="flex flex-col border-t border-black/[0.08]">
                  <button
                    type="button"
                    disabled={deletingForever}
                    onClick={() => void confirmDeleteForever()}
                    className="border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-danger transition hover:bg-brand-orange-soft/60 disabled:opacity-60"
                  >
                    {deletingForever ? "Deleting…" : "Delete forever"}
                  </button>
                  <button
                    type="button"
                    disabled={deletingForever}
                    onClick={() => setDeleteForeverRecord(null)}
                    className="py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

