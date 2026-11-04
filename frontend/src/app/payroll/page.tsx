"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import { PayrollRushFeeControls } from "@/components/payroll/PayrollRushFeeControls";
import { DeleteForeverConfirmModal } from "@/components/payroll/DeleteForeverConfirmModal";
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
  prefetchMtdBoard,
  prefetchMtdBoardCounts,
  useMtdBoard,
} from "@/hooks/useMtdBoard";
import {
  mtdActiveChipTotal,
  mtdBoardCountsQueryKey,
  mtdBoardQueryKey,
  readMtdBoardCache,
  readMtdBoardCountsCache,
  writeMtdBoardCache,
} from "@/lib/mtd-board-cache";
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
  getPayrollRecords,
  patchMarkPayrollPaid,
} from "@/lib/mtd-completion";
import {
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
import { CHEER_FORM_SUBTABS, DANCE_FORM_SUBTABS } from "@/types";

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
/** Clear requested while a create was still in flight: delete as soon as it lands. */
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

const VALID_PAYROLL_FORMS: OrderFormType[] = [
  "school-all-star-cheer",
  "school-all-star-dance",
  "marching-band",
  "sports-entertainment",
  "school-anthem",
];
const VALID_PAYROLL_CHEER: CheerFormSubtypeFilter[] = [
  "all-star-cheer",
  "school-cheer-viroc-yes",
  "school-cheer-viroc-no",
  "youth-rec-cheer",
];
const VALID_PAYROLL_DANCE: DanceFormSubtypeFilter[] = [
  "pom",
  "hip-hop",
  "team-performance-variety",
  "gameday",
  "jazz-kick",
];

/** Read on first paint so sidebar return hits the warm board cache key. */
function readStoredPayrollFilters(): {
  form: OrderFormType;
  cheerSubtype: CheerFormSubtypeFilter;
  danceSubtype: DanceFormSubtypeFilter;
  search: string;
  tableFilters: MTDTableFilterState;
} {
  if (typeof window === "undefined") {
    return {
      form: DEFAULT_FORM,
      cheerSubtype: DEFAULT_CHEER_SUBTYPE,
      danceSubtype: DEFAULT_DANCE_SUBTYPE,
      search: "",
      tableFilters: DEFAULT_MTD_TABLE_FILTERS,
    };
  }
  const savedForm = sessionStorage.getItem(
    "slt_payroll_form"
  ) as OrderFormType | null;
  const savedCheer = sessionStorage.getItem(
    "slt_payroll_cheer_subtype"
  ) as CheerFormSubtypeFilter | null;
  const savedDance = sessionStorage.getItem(
    "slt_payroll_dance_subtype"
  ) as DanceFormSubtypeFilter | null;
  const savedSearch = sessionStorage.getItem("slt_payroll_search");
  let tableFilters = DEFAULT_MTD_TABLE_FILTERS;
  const savedTableFilters = sessionStorage.getItem("slt_payroll_table_filters");
  if (savedTableFilters) {
    try {
      const parsed = JSON.parse(savedTableFilters);
      if (parsed && typeof parsed === "object") {
        tableFilters = { ...DEFAULT_MTD_TABLE_FILTERS, ...parsed };
      }
    } catch {
      /* keep defaults */
    }
  }
  return {
    form:
      savedForm && VALID_PAYROLL_FORMS.includes(savedForm)
        ? savedForm
        : DEFAULT_FORM,
    cheerSubtype:
      savedCheer && VALID_PAYROLL_CHEER.includes(savedCheer)
        ? savedCheer
        : DEFAULT_CHEER_SUBTYPE,
    danceSubtype:
      savedDance && VALID_PAYROLL_DANCE.includes(savedDance)
        ? savedDance
        : DEFAULT_DANCE_SUBTYPE,
    search: savedSearch ?? "",
    tableFilters,
  };
}

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
    allOrders,
    producers,
    payrollAddons,
    addPayrollAddon,
    updatePayrollAddon,
    removePayrollAddon,
    updateMTD,
    removeMTDRecord,
    ensurePayrollLinkedAddonsLoaded,
    ensureAddonsForMtdIdsLoaded,
    ensureVoiceoverAddonsLoaded,
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

  const [formState, setFormState] = useState<OrderFormType>(() =>
    typeof window !== "undefined"
      ? readStoredPayrollFilters().form
      : DEFAULT_FORM
  );
  const [cheerSubtypeState, setCheerSubtypeState] =
    useState<CheerFormSubtypeFilter>(() =>
      typeof window !== "undefined"
        ? readStoredPayrollFilters().cheerSubtype
        : DEFAULT_CHEER_SUBTYPE
    );
  const [danceSubtypeState, setDanceSubtypeState] =
    useState<DanceFormSubtypeFilter>(() =>
      typeof window !== "undefined"
        ? readStoredPayrollFilters().danceSubtype
        : DEFAULT_DANCE_SUBTYPE
    );
  const [tableFiltersState, setTableFiltersState] =
    useState<MTDTableFilterState>(() =>
      typeof window !== "undefined"
        ? readStoredPayrollFilters().tableFilters
        : DEFAULT_MTD_TABLE_FILTERS
    );
  const [searchInput, setSearchInput] = useState(() =>
    typeof window !== "undefined" ? readStoredPayrollFilters().search : ""
  );
  const [searchQuery, setSearchQuery] = useState(() =>
    typeof window !== "undefined" ? readStoredPayrollFilters().search : ""
  );

  const [sendPayPeriod, setSendPayPeriod] = useState<PayPeriodRange>("2weeks");

  // Sticky Payroll tab badge only — Archive has no count (no /mtd/counts).
  const [payrollBadgeTotal, setPayrollBadgeTotal] = useState<number | null>(
    () => {
      if (typeof window === "undefined") return null;
      const pay = readMtdBoardCountsCache(
        mtdBoardCountsQueryKey({ scope: "payroll" })
      );
      return pay ? pay.counts.all : null;
    }
  );

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

  // Debounce board search like Orders/MTD — avoid /mtd/board per keystroke.
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("slt_payroll_search", searchInput);
    }
    if (!searchInput.trim()) {
      setSearchQuery("");
      return;
    }
    const t = window.setTimeout(() => setSearchQuery(searchInput), 220);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  /** Orders-style: Payroll tab badge mirrors counts cache (never local +/-). */
  const syncPayrollBadgeFromCache = useCallback(() => {
    const pay = readMtdBoardCountsCache(
      mtdBoardCountsQueryKey({ scope: "payroll" })
    );
    setPayrollBadgeTotal(pay ? pay.counts.all : null);
  }, []);

  // Warm unpaid payroll badge once (counts-only — cheap). No archive counts.
  useEffect(() => {
    let cancelled = false;
    const warm = async () => {
      await prefetchMtdBoardCounts({ scope: "payroll" });
      if (cancelled) return;
      syncPayrollBadgeFromCache();
    };
    void warm();
    return () => {
      cancelled = true;
    };
  }, [syncPayrollBadgeFromCache]);

  const boardTabActive = pageTab === "view" || pageTab === "archive";
  const payrollBoardQuery = useMemo(
    () => ({
      scope: (pageTab === "archive" ? "archive" : "payroll") as
        | "archive"
        | "payroll",
      formType: form,
      cheerFormSubtype:
        form === "school-all-star-cheer" ? cheerSubtype : undefined,
      search: searchQuery.trim() || undefined,
    }),
    [pageTab, form, cheerSubtype, searchQuery]
  );
  const {
    records: payrollBoardRecords,
    counts: payrollBoardCounts,
    nextPageToken: payrollNextPageToken,
    loading: payrollBoardLoading,
    loadingMore: payrollBoardLoadingMore,
    countsReady: payrollCountsReady,
    loadMore: loadMorePayrollBoard,
    reload: reloadPayrollBoard,
  } = useMtdBoard(payrollBoardQuery, { enabled: boardTabActive });

  // Unpaid rush/misc for Payroll / Archive / Send payouts — not Add Voiceover.
  useEffect(() => {
    if (pageTab === "voiceovers") return;
    void ensurePayrollLinkedAddonsLoaded().catch(() => {
      /* keep empty / optimistic */
    });
  }, [pageTab, ensurePayrollLinkedAddonsLoaded]);

  // Archive page: rush/misc for visible rows only.
  useEffect(() => {
    if (pageTab !== "archive") return;
    const ids = payrollBoardRecords.flatMap((r) =>
      [r.id, r.orderId, r.uuid].filter(Boolean)
    ) as string[];
    if (ids.length === 0) return;
    void ensureAddonsForMtdIdsLoaded(ids).catch(() => {
      /* keep empty */
    });
  }, [pageTab, payrollBoardRecords, ensureAddonsForMtdIdsLoaded]);

  // Voiceovers: only when VO / Send needs them, and only a recent window.
  useEffect(() => {
    if (pageTab !== "voiceovers" && pageTab !== "send") return;
    const sinceDays =
      pageTab === "send"
        ? sendPayPeriod === "6weeks"
          ? 42
          : sendPayPeriod === "4weeks"
            ? 28
            : 14
        : 42;
    void ensureVoiceoverAddonsLoaded({ sinceDays }).catch(() => {
      /* keep empty */
    });
  }, [pageTab, sendPayPeriod, ensureVoiceoverAddonsLoaded]);

  // Payroll tab badge only — Archive never shows / fetches scope counts.
  useEffect(() => {
    if (pageTab !== "view" || !payrollCountsReady) return;
    setPayrollBadgeTotal(payrollBoardCounts.all);
  }, [pageTab, payrollCountsReady, payrollBoardCounts.all]);

  // Snapshot unpaid payroll for Voiceovers/Send — Archive freezes board on
  // paid rows, and VO/Send pause fetch so they must not read that freeze.
  const lastUnpaidPayrollRef = useRef<MTDRecord[]>([]);
  // Form chips stay on unpaid payroll totals — Archive never fetches counts.
  const lastPayrollCountsRef = useRef(payrollBoardCounts);
  useEffect(() => {
    if (pageTab === "view") {
      lastUnpaidPayrollRef.current = payrollBoardRecords;
      if (payrollCountsReady) {
        lastPayrollCountsRef.current = payrollBoardCounts;
      }
    }
  }, [pageTab, payrollBoardRecords, payrollBoardCounts, payrollCountsReady]);

  const chipCounts =
    pageTab === "archive" ? lastPayrollCountsRef.current : payrollBoardCounts;

  const unpaidPayrollForPanels =
    pageTab === "view" ? payrollBoardRecords : lastUnpaidPayrollRef.current;

  // Instant Mark Paid paint — don't wait for useMtdBoard queryKey swap.
  const [optimisticArchiveRow, setOptimisticArchiveRow] =
    useState<MTDRecord | null>(null);
  const [optimisticPaidIds, setOptimisticPaidIds] = useState<Set<string>>(
    () => new Set()
  );

  // Clear optimistic overlays once the board cache/hook catches up.
  useEffect(() => {
    if (!optimisticArchiveRow) return;
    const onBoard =
      pageTab === "archive" &&
      payrollBoardRecords.some(
        (r) =>
          r.id === optimisticArchiveRow.id ||
          r.uuid === optimisticArchiveRow.id
      );
    if (onBoard) {
      setOptimisticArchiveRow(null);
      setOptimisticPaidIds((prev) => {
        if (!prev.has(optimisticArchiveRow.id)) return prev;
        const next = new Set(prev);
        next.delete(optimisticArchiveRow.id);
        return next;
      });
    }
  }, [pageTab, payrollBoardRecords, optimisticArchiveRow]);

  const payrollRecords = useMemo(
    () =>
      pageTab === "archive"
        ? []
        : [
            ...(pageTab === "view"
              ? payrollBoardRecords
              : unpaidPayrollForPanels),
          ]
            .filter(
              (r) =>
                !r.paidAt &&
                !optimisticPaidIds.has(r.id) &&
                !(r.uuid && optimisticPaidIds.has(r.uuid))
            )
            .sort((a, b) =>
              (b.completedAt ?? "").localeCompare(a.completedAt ?? "")
            ),
    [
      pageTab,
      payrollBoardRecords,
      unpaidPayrollForPanels,
      optimisticPaidIds,
    ]
  );

  const sortedArchivedPayrollRecords = useMemo(() => {
    if (pageTab !== "archive") return [];
    const byId = new Map<string, MTDRecord>();
    for (const r of payrollBoardRecords) byId.set(r.id, r);
    if (optimisticArchiveRow) {
      byId.set(optimisticArchiveRow.id, {
        ...byId.get(optimisticArchiveRow.id),
        ...optimisticArchiveRow,
      });
    }
    return [...byId.values()].sort((a, b) =>
      (b.paidAt ?? b.completedAt ?? "").localeCompare(
        a.paidAt ?? a.completedAt ?? ""
      )
    );
  }, [pageTab, payrollBoardRecords, optimisticArchiveRow]);

  const orderById = useMemo(
    () => new Map(allOrders.map((order) => [order.id, order])),
    [allOrders]
  );

  // No Source filter here: manuals are merged/split on Orders/MTD before
  // completion, so Payroll rows are effectively form-sourced.
  const sourceRecords =
    pageTab === "archive" ? sortedArchivedPayrollRecords : payrollRecords;

  const markPaid = useCallback(
    (rec: MTDRecord) => {
      if (isViewOnly) return;
      const paidPatch = patchMarkPayrollPaid();
      const paidRow: MTDRecord = { ...rec, ...paidPatch };
      const meta = resolveMTDFormMeta(
        rec,
        new Map(allOrders.map((order) => [order.id, order]))
      );
      // Paint Archive / hide Payroll in THIS render — before hook queryKey swap.
      setOptimisticArchiveRow(paidRow);
      setOptimisticPaidIds((prev) => {
        const next = new Set(prev);
        next.add(rec.id);
        if (rec.uuid) next.add(rec.uuid);
        return next;
      });
      {
        const archiveKey = mtdBoardQueryKey({
          scope: "archive",
          formType: meta.formType,
          cheerFormSubtype:
            meta.formType === "school-all-star-cheer"
              ? meta.cheerFormSubtype || undefined
              : undefined,
        });
        const prevArchive = readMtdBoardCache(archiveKey)?.entry;
        const rest = (prevArchive?.records ?? []).filter(
          (r) => r.id !== paidRow.id && r.uuid !== paidRow.id
        );
        writeMtdBoardCache(archiveKey, {
          records: [paidRow, ...rest],
          nextPageToken: prevArchive?.nextPageToken ?? null,
        });
      }
      // Optimistic like Orders leave: cache layer shifts counts once;
      // badges re-read cache (do not local +/- — that double-counted).
      // Pass board row as seed — Payroll is board-first; AppState mtdRecords
      // may be empty, and without seed updateMTD skips the paidAt PATCH.
      void updateMTD(rec.id, paidPatch, rec);
      syncPayrollBadgeFromCache();
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
    [isViewOnly, updateMTD, allOrders, syncPayrollBadgeFromCache]
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
      // Cache already shifted payroll totals — re-read like Orders.
      syncPayrollBadgeFromCache();
      void reloadPayrollBoard();
    } catch {
      // Error toast from removeMTDRecord
    } finally {
      setDeletingForever(false);
    }
  }, [
    isViewOnly,
    deleteForeverRecord,
    deletingForever,
    removeMTDRecord,
    reloadPayrollBoard,
    syncPayrollBadgeFromCache,
  ]);

  // Focus from board pages only — no full live-MTD hydrate for deep links.
  useEffect(() => {
    if (!focusParam) return;
    const match = (r: MTDRecord) =>
      r.id === focusParam ||
      r.orderId === focusParam ||
      r.uuid === focusParam ||
      r.legacyId === focusParam;
    const focused = payrollBoardRecords.find(match) ?? null;
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
  }, [focusParam, payrollBoardRecords, orderById]);

  const switchForm = useCallback(
    (next: OrderFormType) => {
      setForm(next);
      if (next === "school-all-star-cheer") {
        const byCheer = chipCounts.by_cheer_form_subtype || {};
        const nextCheer =
          CHEER_FORM_SUBTABS.find((t) => (byCheer[t.id] ?? 0) > 0)?.id ??
          DEFAULT_CHEER_SUBTYPE;
        setCheerSubtype(nextCheer);
        setDanceSubtype(DEFAULT_DANCE_SUBTYPE);
        return;
      }
      if (next === "school-all-star-dance") {
        const byDance = chipCounts.by_dance_form_subtype || {};
        const nextDance =
          DANCE_FORM_SUBTABS.find((t) => (byDance[t.id] ?? 0) > 0)?.id ??
          DEFAULT_DANCE_SUBTYPE;
        setDanceSubtype(nextDance);
        setCheerSubtype(DEFAULT_CHEER_SUBTYPE);
        return;
      }
      setCheerSubtype(DEFAULT_CHEER_SUBTYPE);
      setDanceSubtype(DEFAULT_DANCE_SUBTYPE);
    },
    [setForm, setCheerSubtype, setDanceSubtype, chipCounts]
  );

  const warmBoardQuery = useCallback(
    (patch: {
      formType?: OrderFormType;
      cheerFormSubtype?: string;
    }) => {
      const nextForm = patch.formType ?? form;
      void prefetchMtdBoard({
        scope: pageTab === "archive" ? "archive" : "payroll",
        formType: nextForm,
        cheerFormSubtype:
          patch.cheerFormSubtype !== undefined
            ? patch.cheerFormSubtype || undefined
            : nextForm === "school-all-star-cheer"
              ? cheerSubtype
              : undefined,
        search: searchQuery.trim() || undefined,
      });
    },
    [form, cheerSubtype, searchQuery, pageTab]
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

  const tableFiltered = useMemo(() => {
    // Skip table pipeline on VO/Send — those tabs don't render the board.
    if (!boardTabActive) return [];
    return filterMTDRecords(sourceRecords, {
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
    });
  }, [
    boardTabActive,
    sourceRecords,
    tableFilters,
    form,
    cheerSubtype,
    danceSubtype,
    orderById,
    producers,
  ]);

  const filtered = useMemo(() => {
    if (!boardTabActive) return [];
    // Instant client filter on keystrokes; debounced searchQuery drives /mtd/board.
    const q = searchInput.trim();
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
    boardTabActive,
    tableFiltered,
    searchInput,
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
    if (!boardTabActive) return 0;
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
  }, [boardTabActive, filtered, orderById, payrollAddons, rushStateForRecord]);

  const formCounts = useMemo(
    () => (chipCounts.by_form_type || {}) as Record<OrderFormType, number>,
    [chipCounts.by_form_type]
  );

  const cheerSubtypeCounts = useMemo(
    () =>
      (chipCounts.by_cheer_form_subtype || {}) as Record<
        CheerFormSubtypeFilter,
        number
      >,
    [chipCounts.by_cheer_form_subtype]
  );

  const danceSubtypeCounts = useMemo(
    () =>
      (chipCounts.by_dance_form_subtype || {}) as Record<
        DanceFormSubtypeFilter,
        number
      >,
    [chipCounts.by_dance_form_subtype]
  );

  const emptyMessage = useMemo(() => {
    if (pageTab === "archive") {
      if (sortedArchivedPayrollRecords.length === 0) {
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
    sortedArchivedPayrollRecords.length,
    payrollRecords.length,
    filtered.length,
  ]);

  // Build unique program options from allOrders for the add-on modals
  const programOptions = useMemo(() => {
    if (!boardTabActive) return [];
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
  }, [boardTabActive, allOrders]);

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
          // Create still running: delete in that path once it finishes.
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
              programName: rec.programName || "-",
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

        // User cleared while create was in flight: drop the row now.
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
  // Never auto-create a Rushby payroll add-on: admin must add amount/qty
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
      if (!boardTabActive) return [];
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
              : "-"}
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
                : "-"}
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
      boardTabActive,
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

      const isPendingAddon = (id: string) => id.startsWith("pending-addon-");

      // Always read the latest list: a stale closure after create would miss
      // the row and POST a second misc_adjustment for the same mix.
      const latest = payrollAddonsRef.current;
      const matches = latest.filter((addon) => {
        if (addon.addonType !== "misc_adjustment") return false;
        // Optimistic rows aren't server IDs — never PATCH/DELETE them.
        if (isPendingAddon(addon.id)) return false;
        const aMtd = addon.mtdId ? String(addon.mtdId).trim() : "";
        const aOrd = addon.orderId ? String(addon.orderId).trim() : "";
        const rId = String(rec.id).trim();
        const rOrd = rec.orderId ? String(rec.orderId).trim() : "";
        if (aMtd && (aMtd === rId || (rOrd && aMtd === rOrd))) return true;
        if (aOrd && ((rOrd && aOrd === rOrd) || aOrd === rId)) return true;
        return false;
      });

      const primary = matches[0] ?? null;
      // Keep exactly one misc adjustment per mix: drop duplicates.
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
            onChange={(value) => {
              const next = value as PayrollPageTab;
              setPageTab(next);
              // Payroll badge only — Archive never warms /mtd/counts.
              if (next === "view") {
                void prefetchMtdBoardCounts({ scope: "payroll" }).then(() =>
                  syncPayrollBadgeFromCache()
                );
              }
            }}
            options={[
              {
                value: "view",
                label: "Payroll",
                count: payrollBadgeTotal || undefined,
              },
              {
                value: "archive",
                label: "Archive",
              },
              {
                value: "voiceovers",
                label: "Add Voiceover",
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
                value: searchInput,
                onChange: setSearchInput,
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
              onFormMenuIntent={() => {
                const byForm = chipCounts.by_form_type || {};
                const peer = (
                  [
                    "school-all-star-cheer",
                    "school-all-star-dance",
                    "school-anthem",
                    "marching-band",
                    "sports-entertainment",
                  ] as OrderFormType[]
                )
                  .filter((id) => id !== form)
                  .sort((a, b) => (byForm[b] ?? 0) - (byForm[a] ?? 0))[0];
                if (!peer || (byForm[peer] ?? 0) <= 0) return;
                if (peer === "school-all-star-cheer") {
                  const byCheer = chipCounts.by_cheer_form_subtype || {};
                  const nextCheer =
                    CHEER_FORM_SUBTABS.find((t) => (byCheer[t.id] ?? 0) > 0)
                      ?.id ?? DEFAULT_CHEER_SUBTYPE;
                  warmBoardQuery({
                    formType: peer,
                    cheerFormSubtype: nextCheer,
                  });
                  return;
                }
                warmBoardQuery({
                  formType: peer,
                  cheerFormSubtype: "",
                });
              }}
              onFormOptionIntent={(next) => {
                if (next === "school-all-star-cheer") {
                  const byCheer = chipCounts.by_cheer_form_subtype || {};
                  const nextCheer =
                    CHEER_FORM_SUBTABS.find((t) => (byCheer[t.id] ?? 0) > 0)
                      ?.id ?? DEFAULT_CHEER_SUBTYPE;
                  warmBoardQuery({
                    formType: next,
                    cheerFormSubtype: nextCheer,
                  });
                  return;
                }
                warmBoardQuery({
                  formType: next,
                  cheerFormSubtype: "",
                });
              }}
              onCheerOptionIntent={(next) =>
                warmBoardQuery({
                  formType: "school-all-star-cheer",
                  cheerFormSubtype: next,
                })
              }
              formCounts={formCounts}
              cheerCounts={cheerSubtypeCounts}
              danceCounts={danceSubtypeCounts}
              showFormOptionCounts={false}
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
                showOptionCounts={false}
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
              loading={payrollBoardLoading && filtered.length === 0}
              pageSize={15}
              totalCount={
                pageTab === "archive"
                  ? undefined
                  : payrollCountsReady
                    ? mtdActiveChipTotal(payrollBoardCounts, {
                        formType: form,
                        cheerFormSubtype:
                          form === "school-all-star-cheer"
                            ? cheerSubtype
                            : undefined,
                        danceFormSubtype:
                          form === "school-all-star-dance"
                            ? danceSubtype
                            : undefined,
                      })
                    : undefined
              }
              hasMore={Boolean(payrollNextPageToken)}
              onLoadMore={loadMorePayrollBoard}
              loadingMore={payrollBoardLoadingMore}
              resetKey={`${pageTab}-${viewOrder}-${form}-${cheerSubtype}-${searchQuery}`}
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
            mtdRecords={unpaidPayrollForPanels}
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

      <DeleteForeverConfirmModal
        open={Boolean(deleteForeverRecord)}
        record={deleteForeverRecord}
        deleting={deletingForever}
        onClose={() => {
          if (!deletingForever) setDeleteForeverRecord(null);
        }}
        onConfirm={() => void confirmDeleteForever()}
      />
    </div>
  );
}

