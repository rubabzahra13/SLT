"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Lock, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReturnNavBanner } from "@/components/layout/ReturnNavBanner";
import { Avatar } from "@/components/ui/Avatar";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { HoverTip } from "@/components/ui/HoverTip";
import { TruncatedText } from "@/components/ui/TruncatedText";
import {
  InlineCell,
  InlineTriStateCheckGroup,
  InlineTwoStateToggle,
  InlineSelect,
  InlineDanceVoiceoverPills,
  InlineCheerVoiceoverPills,
  InlineQuantityStepper,
} from "@/components/mtd/InlineFields";
import {
  AssignEditorModal,
  type EditorAssignmentResult,
} from "@/components/mtd/AssignEditorModal";
import { SetPricingModal } from "@/components/mtd/SetPricingModal";
import { SetRecordPricingModal } from "@/components/mtd/SetRecordPricingModal";
import { SetInvoicesModal } from "@/components/mtd/SetInvoicesModal";
import { SetInvoiceModal } from "@/components/mtd/SetInvoiceModal";
import { CompleteToPayrollModal } from "@/components/mtd/CompleteToPayrollModal";
import { MoveToOrdersConfirmModal } from "@/components/mtd/MoveToOrdersConfirmModal";
import { OrderFormEditModal } from "@/components/orders/OrderFormEditModal";
import { patchForReassignRush } from "@/lib/order-reassign";
import {
  CompletionBlockedModal,
  type StatusBlockReason,
} from "@/components/mtd/CompletionBlockedModal";
import {
  DEFAULT_MTD_TABLE_FILTERS,
  type MTDTableFilterState,
} from "@/components/mtd/MTDTableFilters";
import { MTDPageToolbar } from "@/components/mtd/MTDPageToolbar";
import { useAppState } from "@/context/AppStateContext";
import { prefetchMtdBoard, useMtdBoard } from "@/hooks/useMtdBoard";
import {
  mtdActiveChipTotal,
  patchMtdBoardRecordInCaches,
  readCachedMtdBoardRow,
} from "@/lib/mtd-board-cache";
import { formatPrice, titleCase } from "@/lib/data";
import { displayMixLengthLabel } from "@/lib/mix-duration";
import { parsePackage } from "@/lib/package";
import {
  magentoPackageBoardLabel,
  packageTypeDisplayValue,
} from "@/components/mtd/PackageTypeField";
import { isValidDiscountCode } from "@/lib/discount-codes";
import {
  formSupportsCouponCode,
  getContactColumnHeader,
  getOrderContactPersonName,
  getOrderIdentityName,
  getProgramColumnHeader,
} from "@/lib/order-detail-sections";
import { orderFromMTDRecord } from "@/lib/order-detail-fields";
import { orderHasSplitField } from "@/lib/order-form-missing";
import type { MTDViewOrder } from "@/components/mtd/MTDViewOrderToggle";
import {
  calculateCheerOrderPricing,
  calculateDanceOrderPricing,
  calculateMarchingBandOrderPricing,
  calculateSportsEntertainmentOrderPricing,
  calculateSchoolAnthemOrderPricing,
} from "@/lib/pricing-engine";
import {
  buildRecordPriceSavePatch,
  orderNeedsManualPackageQuote,
  PRICING_REFERENCE_CHANGED_EVENT,
  resolveOrderPackageDisplayPrice,
} from "@/lib/order-package-price";
import { inferMTDRecordStatus, patchFromRecordStatus } from "@/lib/mtd-status";
import {
  canCompleteForPayroll,
  canSetOngoingOrOutsourced,
  getMTDBoardRecords,
  patchMoveToPayroll,
} from "@/lib/mtd-completion";
import {
  formatDisplayDate,
  formatDisplayDateTime,
  formatMixBookedDaysLabel,
  toIsoDateString,
} from "@/lib/dates";
import { todayIso } from "@/lib/date-filters";
import { generateMTDCsv, triggerCsvDownload } from "@/lib/export-csv";
import {
  findLinkedOrder,
  findProducerByAssignmentKey,
  formHasRequestedProducer,
  formatRequestedEditorLabel,
  getDisplayAssignedProducer,
  mixWorkDaysForRecord,
} from "@/lib/editor-assignment";
import { resolveMtdTimestamp } from "@/lib/mtd-timestamp";
import { overlayMergedFormForDisplay } from "@/lib/manual-form-merge";
import { mergeCollectionStateFromOrder } from "@/lib/order-staging";
import {
  filterMTDRecords,
  getRecordMusicAffiliateInfo,
  matchesAssignedProducerFilter,
  matchesFormFilter,
  matchesMTDSearch,
  resolveMTDFormMeta,
  sortMTDRecordsBySortKey,
  sortMTDRecordsByViewOrder,
} from "@/lib/mtd-filters";
import {
  cycleEightCsItem,
  cycleSongsItem,
  encodeEightCsState,
  encodeSongsState,
  getCollectionItemsForCategory,
  getSongsItems,
  parseEightCsState,
  parseSongsState,
} from "@/lib/mtd-checklist";
import type {
  CheerFormSubtype,
  CheerFormSubtypeFilter,
  DanceFormSubtype,
  DanceFormSubtypeFilter,
  MTDRecord,
  MTDRecordStatus,
  Order,
  OrderFormType,
  PriceCompliance,
} from "@/types";
import {
  CHEER_FORM_SUBTABS,
  DANCE_FORM_SUBTABS,
  MTD_RECORD_STATUS_OPTIONS,
} from "@/types";
import clsx from "clsx";

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";
const DEFAULT_CHEER_SUBTYPE: CheerFormSubtype = "all-star-cheer";
const DEFAULT_DANCE_SUBTYPE: DanceFormSubtypeFilter = "pom";

const VALID_MTD_FORMS: OrderFormType[] = [
  "school-all-star-cheer",
  "school-all-star-dance",
  "marching-band",
  "sports-entertainment",
  "school-anthem",
];
const VALID_MTD_CHEER: CheerFormSubtypeFilter[] = [
  "all-star-cheer",
  "school-cheer-viroc-yes",
  "school-cheer-viroc-no",
  "youth-rec-cheer",
];
const VALID_MTD_DANCE: DanceFormSubtypeFilter[] = [
  "pom",
  "hip-hop",
  "team-performance-variety",
  "gameday",
  "jazz-kick",
];

/** Read on first paint so sidebar return hits the warm board cache key. */
function readStoredMtdFilters(): {
  form: OrderFormType;
  cheerSubtype: CheerFormSubtypeFilter;
  danceSubtype: DanceFormSubtypeFilter;
} {
  if (typeof window === "undefined") {
    return {
      form: DEFAULT_FORM,
      cheerSubtype: DEFAULT_CHEER_SUBTYPE,
      danceSubtype: DEFAULT_DANCE_SUBTYPE,
    };
  }
  const savedForm = sessionStorage.getItem("slt_mtd_form") as OrderFormType | null;
  const savedCheer = sessionStorage.getItem(
    "slt_mtd_cheer_subtype"
  ) as CheerFormSubtypeFilter | null;
  const savedDance = sessionStorage.getItem(
    "slt_mtd_dance_subtype"
  ) as DanceFormSubtypeFilter | null;
  return {
    form:
      savedForm && VALID_MTD_FORMS.includes(savedForm)
        ? savedForm
        : DEFAULT_FORM,
    cheerSubtype:
      savedCheer && VALID_MTD_CHEER.includes(savedCheer)
        ? savedCheer
        : DEFAULT_CHEER_SUBTYPE,
    danceSubtype:
      savedDance && VALID_MTD_DANCE.includes(savedDance)
        ? savedDance
        : DEFAULT_DANCE_SUBTYPE,
  };
}

const actionButtonClass = (filled: boolean) =>
  clsx(
    "mt-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition shadow-sm",
    filled
      ? "border-brand-line/70 bg-brand-elevated text-brand-ink hover:border-brand-line hover:bg-brand-bg/50"
      : "border-brand-orange-deep bg-brand-orange text-white hover:bg-brand-orange-hover"
  );

const ordersMtdButtonClass = (ready: boolean) =>
  clsx(
    "inline-flex h-7 items-center justify-center gap-0.5 rounded-md border px-2 text-[10px] font-semibold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30",
    ready
      ? "border-brand-blue/25 bg-brand-blue text-white shadow-sm hover:bg-brand-blue-hover"
      : "border-brand-line/60 bg-brand-bg/50 text-brand-ink-tertiary hover:bg-brand-bg hover:text-brand-ink"
  );

const clickableChipClass =
  "cursor-pointer border border-brand-line/70 bg-brand-bg/60 shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/25";

const tableStatusSelectClass =
  "!h-8 !min-h-0 !w-auto min-w-[132px] max-w-full !py-0";
const compactCellClass = "!px-1 !py-1 overflow-hidden";
const compactHeaderClass = "!px-2";
const compactTextClass = "text-[12px] leading-tight text-brand-ink";

function MTDPageContent() {
  const {
    mtdRecords,
    allOrders,
    updateMTD,
    updateOrder,
    producers,
    schedule,
    discountCodes,
    isViewOnly,
    addAlert,
    ensureLiveMtdLoaded,
  } = useAppState();

  // Board paints from /mtd/board only. Full live-MTD hydrate waits until Assign
  // (needs all open mixes for capacity) — not on every MTD visit.
  const [formState, setFormState] = useState<OrderFormType>(() =>
    typeof window !== "undefined" ? readStoredMtdFilters().form : DEFAULT_FORM
  );
  const [cheerSubtypeState, setCheerSubtypeState] =
    useState<CheerFormSubtypeFilter>(() =>
      typeof window !== "undefined"
        ? readStoredMtdFilters().cheerSubtype
        : DEFAULT_CHEER_SUBTYPE
    );
  const [danceSubtypeState, setDanceSubtypeState] =
    useState<DanceFormSubtypeFilter>(() =>
      typeof window !== "undefined"
        ? readStoredMtdFilters().danceSubtype
        : DEFAULT_DANCE_SUBTYPE
    );

  const [form, setForm] = [
    formState,
    (next: OrderFormType) => {
      setFormState(next);
      if (typeof window !== "undefined") sessionStorage.setItem("slt_mtd_form", next);
    },
  ];

  const [cheerSubtype, setCheerSubtype] = [
    cheerSubtypeState,
    (next: CheerFormSubtypeFilter) => {
      setCheerSubtypeState(next);
      if (typeof window !== "undefined") sessionStorage.setItem("slt_mtd_cheer_subtype", next);
    },
  ];

  const [danceSubtype, setDanceSubtype] = [
    danceSubtypeState,
    (next: DanceFormSubtypeFilter) => {
      setDanceSubtypeState(next);
      if (typeof window !== "undefined") sessionStorage.setItem("slt_mtd_dance_subtype", next);
    },
  ];

  const router = useRouter();
  const searchParams = useSearchParams();
  const assignedParam = searchParams.get("assigned");
  const scheduleParam = searchParams.get("schedule");
  const focusParam = searchParams.get("focus");

  // Highlight a row that was just moved here from the Orders tab. Seeded from
  // the ?focus= param on navigation, cleared when the user clicks a column.
  const [highlightId, setHighlightId] = useState<string | null>(focusParam);
  useEffect(() => {
    setHighlightId(focusParam);
  }, [focusParam]);

  const clearHighlight = useCallback(() => {
    setHighlightId(null);
    if (typeof window !== "undefined" && focusParam) {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.delete("focus");
      const qs = params.toString();
      router.replace(`/mtd${qs ? `?${qs}` : ""}`, { scroll: false });
    }
  }, [focusParam, router, searchParams]);

  const [tableFilters, setTableFilters] = useState<MTDTableFilterState>(
    DEFAULT_MTD_TABLE_FILTERS
  );

  useEffect(() => {
    if (assignedParam) {
      setTableFilters((prev) => ({ ...prev, assignedProducer: assignedParam }));
    } else if (scheduleParam) {
      setTableFilters((prev) => ({ ...prev, scheduleFilter: scheduleParam as any }));
    }
  }, [assignedParam, scheduleParam]);

  // Input updates instantly; board query waits so we don't thrash /mtd/board
  // + /mtd/counts on every keystroke (Orders pattern).
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Clear immediately so we don't keep search hits after X.
    if (!searchInput.trim()) {
      setSearchQuery("");
      return;
    }
    const t = window.setTimeout(() => {
      setSearchQuery(searchInput);
    }, 220);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  // scope=board excludes in_payroll (live wrongly kept Completed rows on MTD).
  const mtdBoardQuery = useMemo(
    () => ({
      scope: "board" as const,
      formType: form,
      cheerFormSubtype:
        form === "school-all-star-cheer" ? cheerSubtype : undefined,
      search: searchQuery.trim() || undefined,
    }),
    [form, cheerSubtype, searchQuery]
  );
  const {
    records: pagedMtdRecords,
    counts: mtdBoardCounts,
    nextPageToken: mtdNextPageToken,
    loading: mtdBoardLoading,
    loadingMore: mtdBoardLoadingMore,
    countsReady: mtdCountsReady,
    loadMore: loadMoreMtd,
    reload: reloadMtdBoard,
    setRecords: setPagedMtdRecords,
  } = useMtdBoard(mtdBoardQuery);

  const [viewOrder, setViewOrder] = useState<MTDViewOrder>("sequence");
  const [assignRecordId, setAssignRecordId] = useState<string | null>(null);
  const assignRecord = useMemo(
    () =>
      assignRecordId
        ? pagedMtdRecords.find((record) => record.id === assignRecordId) ??
          mtdRecords.find((record) => record.id === assignRecordId) ??
          null
        : null,
    [assignRecordId, pagedMtdRecords, mtdRecords]
  );
  const [invoiceRecord, setInvoiceRecord] = useState<MTDRecord | null>(null);
  const [pricingFocusRecord, setPricingFocusRecord] = useState<MTDRecord | null>(
    null
  );
  const [recordPricingRecord, setRecordPricingRecord] =
    useState<MTDRecord | null>(null);
  const [invoicesOpen, setInvoicesOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [pricingRevision, setPricingRevision] = useState(0);
  const [completeRecord, setCompleteRecord] = useState<MTDRecord | null>(null);
  const [blockedRecord, setBlockedRecord] = useState<MTDRecord | null>(null);
  const [orderFormRecord, setOrderFormRecord] = useState<MTDRecord | null>(null);
  const [orderFormRowId, setOrderFormRowId] = useState<number | null>(null);
  const [moveToOrdersRecord, setMoveToOrdersRecord] = useState<MTDRecord | null>(
    null
  );
  const [blockedReason, setBlockedReason] =
    useState<StatusBlockReason>("completed");

  const orderById = useMemo(() => {
    const map = new Map<string, Order>();
    for (const order of allOrders) {
      if (order.id) map.set(order.id, order);
      if (order.legacyId) map.set(order.legacyId, order);
      if (order.uuid) map.set(order.uuid, order);
    }
    return map;
  }, [allOrders]);

  // Server-paged music board (identity projected on API).
  // Filter AFTER Order merge — Move to Orders clears the producer on Order
  // first; filtering before merge left a "No producer" + Orders ghost row.
  // Also drop payroll members (scope=board should already exclude them).
  const mtdBoardRecords = useMemo(
    () =>
      pagedMtdRecords
        .map((rec) => {
          const linked = findLinkedOrder(rec, allOrders);
          if (!linked) return rec;
          const enriched = overlayMergedFormForDisplay(linked, allOrders);
          return mergeCollectionStateFromOrder(rec, enriched);
        })
        .filter((rec) => !rec.isReassigned && !rec.inPayroll),
    [pagedMtdRecords, allOrders]
  );

  // Land on a subtype that actually has rows (same as Orders) so warm key matches paint.
  const switchForm = useCallback(
    (next: OrderFormType) => {
      setForm(next);
      if (next === "school-all-star-cheer") {
        const byCheer = mtdBoardCounts.by_cheer_form_subtype || {};
        const nextCheer =
          CHEER_FORM_SUBTABS.find((t) => (byCheer[t.id] ?? 0) > 0)?.id ??
          DEFAULT_CHEER_SUBTYPE;
        setCheerSubtype(nextCheer);
        setDanceSubtype(DEFAULT_DANCE_SUBTYPE);
        return;
      }
      if (next === "school-all-star-dance") {
        const byDance = mtdBoardCounts.by_dance_form_subtype || {};
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
    [setForm, setCheerSubtype, setDanceSubtype, mtdBoardCounts]
  );

  /** Form/Cheer pointerdown warm — same pattern as Orders warmBoardQuery. */
  const warmBoardQuery = useCallback(
    (patch: {
      formType?: OrderFormType;
      cheerFormSubtype?: string;
    }) => {
      const nextForm = patch.formType ?? form;
      void prefetchMtdBoard({
        scope: "board",
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
    [form, cheerSubtype, searchQuery]
  );

  useEffect(() => {
    if (!assignedParam || assignedParam === "All") return;

    const matchingBoard = mtdBoardRecords.filter((rec) =>
      matchesAssignedProducerFilter(rec, assignedParam)
    );
    if (matchingBoard.length === 0) return;

    const hasVisibleForForm = matchingBoard.some((rec) =>
      matchesFormFilter(rec, orderById, form, cheerSubtype, danceSubtype)
    );
    if (hasVisibleForForm) return;

    const meta = resolveMTDFormMeta(matchingBoard[0], orderById);
    switchForm(meta.formType);
    if (meta.formType === "school-all-star-cheer" && meta.cheerFormSubtype) {
      setCheerSubtype(meta.cheerFormSubtype as CheerFormSubtypeFilter);
    }
    if (meta.formType === "school-all-star-dance" && meta.danceFormSubtype) {
      setDanceSubtype(meta.danceFormSubtype as DanceFormSubtypeFilter);
    }
  }, [
    assignedParam,
    mtdBoardRecords,
    orderById,
    form,
    cheerSubtype,
    danceSubtype,
    switchForm,
  ]);

  // Deep-link / Move-to-MTD: switch Dance↔Cheer (and subtype) so ?focus= is
  // visible — sticky form filter otherwise leaves the row "missing".
  useEffect(() => {
    if (!focusParam) return;
    const match = (r: MTDRecord) =>
      r.id === focusParam ||
      r.orderId === focusParam ||
      r.uuid === focusParam ||
      r.legacyId === focusParam;
    const focused =
      mtdBoardRecords.find(match) ??
      mtdRecords.find(match) ??
      readCachedMtdBoardRow(focusParam) ??
      null;
    if (!focused) {
      // Order-only focus (rare): form from linked order.
      const order =
        orderById.get(focusParam) ??
        allOrders.find(
          (o) =>
            o.id === focusParam ||
            o.uuid === focusParam ||
            o.legacyId === focusParam ||
            o.mtdId === focusParam
        );
      if (!order?.formType) return;
      const alreadyVisible =
        order.formType === form &&
        (form !== "school-all-star-cheer" ||
          cheerSubtype === "all" ||
          !order.cheerFormSubtype ||
          order.cheerFormSubtype === cheerSubtype) &&
        (form !== "school-all-star-dance" ||
          danceSubtype === "all" ||
          !order.danceFormSubtype ||
          order.danceFormSubtype === danceSubtype);
      if (alreadyVisible) return;
      switchForm(order.formType);
      if (
        order.formType === "school-all-star-cheer" &&
        order.cheerFormSubtype
      ) {
        setCheerSubtype(order.cheerFormSubtype as CheerFormSubtypeFilter);
      }
      if (
        order.formType === "school-all-star-dance" &&
        order.danceFormSubtype
      ) {
        setDanceSubtype(order.danceFormSubtype as DanceFormSubtypeFilter);
      }
      return;
    }
    if (
      matchesFormFilter(focused, orderById, form, cheerSubtype, danceSubtype)
    ) {
      return;
    }
    const meta = resolveMTDFormMeta(focused, orderById);
    switchForm(meta.formType);
    if (meta.formType === "school-all-star-cheer" && meta.cheerFormSubtype) {
      setCheerSubtype(meta.cheerFormSubtype as CheerFormSubtypeFilter);
    }
    if (meta.formType === "school-all-star-dance" && meta.danceFormSubtype) {
      setDanceSubtype(meta.danceFormSubtype as DanceFormSubtypeFilter);
    }
  }, [
    focusParam,
    mtdBoardRecords,
    mtdRecords,
    allOrders,
    orderById,
    form,
    cheerSubtype,
    danceSubtype,
    switchForm,
    setCheerSubtype,
    setDanceSubtype,
  ]);

  const handleAssign = useCallback(
    (recordId: string, result: EditorAssignmentResult) => {
      updateMTD(recordId, {
        editorRequest: result.editorRequest,
        assignedProducer: result.assignedProducer,
        ...(result.mixStartDate !== undefined
          ? { mixStartDate: result.mixStartDate }
          : {}),
        ...(result.mixEndDate !== undefined
          ? { mixEndDate: result.mixEndDate }
          : {}),
        ...(result.invoice !== undefined ? { invoice: result.invoice } : {}),
        ...(result.recordStatus
          ? {
              recordStatus: result.recordStatus,
              ...(result.status ? { status: result.status } : {}),
            }
          : {}),
      });
    },
    [updateMTD]
  );

  const openAssignModal = useCallback(
    (rec: MTDRecord, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setAssignRecordId(rec.id);
      void ensureLiveMtdLoaded().catch(() => {
        /* Assign still works from paged board rows */
      });
    },
    [ensureLiveMtdLoaded]
  );

  const handleMoveToOrders = useCallback(
    (rec: MTDRecord, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isViewOnly) return;

      setMoveToOrdersRecord(rec);
    },
    [isViewOnly]
  );

  const confirmMoveToOrders = useCallback(
    async () => {
      const rec = moveToOrdersRecord;
      if (!rec || isViewOnly) return;

      // Move to Orders from MTD always lands as Reassign: rush order with
      // assignment/schedule cleared until the order is reassigned.
      // Pass the board row as seed — AppState mtd/orders caches are often empty
      // (board-first), so updateMTD(id) alone used to no-op the Order PATCH.
      setMoveToOrdersRecord(null);
      // Drop the row immediately — do not wait for updateMTD / Order merge.
      const leaveIds = new Set(
        [rec.id, rec.uuid, rec.orderId, rec.legacyId].filter(Boolean) as string[]
      );
      const leftLive = (r: MTDRecord) =>
        leaveIds.has(r.id) ||
        (r.uuid != null && leaveIds.has(r.uuid)) ||
        (r.orderId != null && leaveIds.has(r.orderId)) ||
        (r.legacyId != null && leaveIds.has(r.legacyId));
      setPagedMtdRecords((prev) => prev.filter((r) => !leftLive(r)));
      const rush = patchForReassignRush();
      patchMtdBoardRecordInCaches(rec.id, rush);
      if (rec.orderId && rec.orderId !== rec.id) {
        patchMtdBoardRecordInCaches(rec.orderId, rush);
      }
      try {
        await updateMTD(rec.id, rush, rec);
      } catch {
        // updateMTD already surfaces save errors; still navigate so the user
        // can recover from Reassign after a retry/refresh.
      }
      const meta = resolveMTDFormMeta(rec, orderById);
      const focusId = rec.orderId || rec.id;
      const params = new URLSearchParams({
        range: "reassigned",
        source: "both",
        focus: focusId,
        form: meta.formType,
      });
      if (meta.formType === "school-all-star-cheer") {
        params.set("cheer", meta.cheerFormSubtype);
      }
      if (meta.formType === "school-all-star-dance") {
        params.set("dance", meta.danceFormSubtype);
      }
      const href = `/orders?${params.toString()}`;
      const name =
        titleCase(rec.programName || "").trim() ||
        titleCase(rec.contactName || "").trim() ||
        "Order";
      addAlert({
        tone: "info",
        title: "Moved to Reassign",
        message: `${name} left MTD and is now under Reassign.`,
        href,
      });
      // Reassign + All sources + matching form so the row is visible immediately.
      router.push(href);
    },
    [
      isViewOnly,
      moveToOrdersRecord,
      router,
      updateMTD,
      addAlert,
      orderById,
      setPagedMtdRecords,
    ]
  );

  const openInvoiceModal = useCallback(
    (rec: MTDRecord, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setInvoiceRecord(rec);
    },
    []
  );

  useEffect(() => {
    const bump = () => setPricingRevision((n) => n + 1);
    window.addEventListener(PRICING_REFERENCE_CHANGED_EVENT, bump);
    return () =>
      window.removeEventListener(PRICING_REFERENCE_CHANGED_EVENT, bump);
  }, []);

  const openPricingModal = useCallback(
    (rec: MTDRecord, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setPricingFocusRecord(rec);
      setPricingOpen(true);
    },
    []
  );

  const openPricingReference = useCallback(() => {
    setPricingFocusRecord(null);
    setPricingOpen(true);
  }, []);

  const openRecordPricingModal = useCallback(
    (rec: MTDRecord, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setRecordPricingRecord(rec);
    },
    []
  );

  const saveRecordPricing = useCallback(
    async (
      recordId: string,
      patch: { price: number; priceCompliance: PriceCompliance }
    ) => {
      if (isViewOnly) return;
      const rec =
        recordPricingRecord?.id === recordId
          ? recordPricingRecord
          : mtdRecords.find((r) => r.id === recordId);
      if (!rec) return;
      const order = findLinkedOrder(rec, allOrders);
      const meta = resolveMTDFormMeta(rec, orderById);
      const fullPatch = buildRecordPriceSavePatch(
        rec,
        order,
        patch.price,
        patch.priceCompliance,
        meta,
        orderById
      );
      // Phase 2: Orders is pricing SoT; updateOrder mirrors display cache to MTD.
      if (order) {
        await updateOrder(order.id, fullPatch);
      } else {
        await updateMTD(rec.id, fullPatch);
      }
    },
    [
      isViewOnly,
      recordPricingRecord,
      mtdRecords,
      allOrders,
      orderById,
      updateMTD,
      updateOrder,
    ]
  );

  const pricingFocusOrder = useMemo(
    () =>
      pricingFocusRecord
        ? findLinkedOrder(pricingFocusRecord, allOrders)
        : undefined,
    [pricingFocusRecord, allOrders]
  );

  const recordPricingOrder = useMemo(
    () =>
      recordPricingRecord
        ? findLinkedOrder(recordPricingRecord, allOrders)
        : null,
    [recordPricingRecord, allOrders]
  );

  const recordPricingInitialPrice = useMemo(() => {
    if (!recordPricingRecord) return null;
    return resolveOrderPackageDisplayPrice(
      recordPricingRecord,
      recordPricingOrder,
      resolveMTDFormMeta(recordPricingRecord, orderById),
      orderById
    );
  }, [recordPricingRecord, recordPricingOrder, orderById]);

  const handleInvoiceSave = useCallback(
    (recordId: string, invoice: string) => {
      const seed =
        invoiceRecord?.id === recordId
          ? invoiceRecord
          : mtdBoardRecords.find((r) => r.id === recordId) ??
            pagedMtdRecords.find((r) => r.id === recordId);
      // Board-first UI: paint + cache before AppState/API so the cell updates now.
      const nextInvoice = invoice.trim();
      patchMtdBoardRecordInCaches(recordId, { invoice: nextInvoice });
      if (seed?.orderId) {
        patchMtdBoardRecordInCaches(seed.orderId, { invoice: nextInvoice });
      }
      setPagedMtdRecords((prev) =>
        prev.map((r) =>
          r.id === recordId ||
          r.uuid === recordId ||
          r.orderId === recordId ||
          (seed && (r.id === seed.id || r.uuid === seed.uuid))
            ? { ...r, invoice: nextInvoice }
            : r
        )
      );
      void updateMTD(recordId, { invoice: nextInvoice }, seed);
    },
    [
      updateMTD,
      invoiceRecord,
      mtdBoardRecords,
      pagedMtdRecords,
      setPagedMtdRecords,
    ]
  );

  const handleInvoicesSave = useCallback(
    (updates: Record<string, string>) => {
      for (const [id, invoice] of Object.entries(updates)) {
        const seed =
          mtdBoardRecords.find((r) => r.id === id) ??
          pagedMtdRecords.find((r) => r.id === id);
        const nextInvoice = invoice.trim();
        patchMtdBoardRecordInCaches(id, { invoice: nextInvoice });
        setPagedMtdRecords((prev) =>
          prev.map((r) =>
            r.id === id || r.uuid === id || r.orderId === id
              ? { ...r, invoice: nextInvoice }
              : r
          )
        );
        void updateMTD(id, { invoice: nextInvoice }, seed);
      }
    },
    [updateMTD, mtdBoardRecords, pagedMtdRecords, setPagedMtdRecords]
  );

  const handleRecordStatusChange = useCallback(
    (rec: MTDRecord, value: string) => {
      const nextStatus = value as MTDRecordStatus;
      if (nextStatus === "Completed") {
        const check = canCompleteForPayroll(rec);
        if (!check.ready) {
          setBlockedReason("completed");
          setBlockedRecord(rec);
          return;
        }
        setCompleteRecord(rec);
        return;
      }
      if (nextStatus === "Ongoing" || nextStatus === "Outsourced") {
        const check = canSetOngoingOrOutsourced(rec);
        if (!check.ready) {
          setBlockedReason("assignment");
          setBlockedRecord(rec);
          return;
        }
      }
      // Paint board cache immediately — MTD table reads useMtdBoard, not AppState.
      const statusPatch = patchFromRecordStatus(nextStatus);
      patchMtdBoardRecordInCaches(rec.id, statusPatch);
      if (rec.orderId) patchMtdBoardRecordInCaches(rec.orderId, statusPatch);
      setPagedMtdRecords((prev) =>
        prev.map((r) =>
          r.id === rec.id || r.orderId === rec.id || r.uuid === rec.id
            ? { ...r, ...statusPatch }
            : r
        )
      );
      void updateMTD(rec.id, statusPatch, rec);
    },
    [updateMTD, setPagedMtdRecords]
  );

  const confirmCompleteToPayroll = useCallback(
    async (mtdPatch?: Partial<MTDRecord>, orderPatch?: Partial<Order>) => {
      if (!completeRecord) return;
      const basePatch = patchMoveToPayroll();
      const recordId = completeRecord.id;
      const orderId = completeRecord.orderId;
      const seed = completeRecord;
      setCompleteRecord(null);
      // Drop from music board immediately — same ghost-row class as Move to Orders.
      const leaveIds = new Set(
        [seed.id, seed.uuid, seed.orderId, seed.legacyId].filter(
          Boolean
        ) as string[]
      );
      const leftBoard = (r: MTDRecord) =>
        leaveIds.has(r.id) ||
        (r.uuid != null && leaveIds.has(r.uuid)) ||
        (r.orderId != null && leaveIds.has(r.orderId)) ||
        (r.legacyId != null && leaveIds.has(r.legacyId));
      setPagedMtdRecords((prev) => prev.filter((r) => !leftBoard(r)));
      const payrollPatch = {
        ...basePatch,
        ...(mtdPatch?.finalPayrollPrice != null
          ? { finalPayrollPrice: mtdPatch.finalPayrollPrice }
          : {}),
        ...(mtdPatch?.extraSongsQuantity != null
          ? { extraSongsQuantity: mtdPatch.extraSongsQuantity }
          : {}),
        ...(mtdPatch?.extraSongEditingTimeQuantity != null
          ? {
              extraSongEditingTimeQuantity:
                mtdPatch.extraSongEditingTimeQuantity,
            }
          : {}),
      };
      // One patch only — alias re-patches (orderId) used to duplicate Payroll.
      // updateMTD patches the board cache again with the canonical id.
      patchMtdBoardRecordInCaches(recordId, payrollPatch, seed);
      // Phase 2: lifecycle flags stay on MTD; pricing/payout SoT is Orders.
      // Persist inPayroll first so SSE cannot briefly clear Payroll membership.
      // Fire without blocking UI — pricing already finalized in the modal.
      try {
        if (orderId) {
          await updateMTD(recordId, payrollPatch, seed);
          if (orderPatch) {
            await updateOrder(orderId, orderPatch);
          }
        } else {
          await updateMTD(recordId, { ...payrollPatch, ...mtdPatch }, seed);
        }
      } catch {
        /* updateMTD / updateOrder already surface errors */
      }
    },
    [completeRecord, updateMTD, updateOrder, setPagedMtdRecords]
  );

  const tableFiltered = useMemo(
    () =>
      filterMTDRecords(mtdBoardRecords, {
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
      mtdBoardRecords,
      tableFilters,
      form,
      cheerSubtype,
      danceSubtype,
      orderById,
      producers,
    ]
  );

  const filtered = useMemo(() => {
    // Instant local filter while typing (searchInput). Server searchQuery
    // catches up after debounce — same as Orders.
    const q = searchInput.trim();
    if (!q) return tableFiltered;
    return tableFiltered.filter((rec) => matchesMTDSearch(rec, q));
  }, [tableFiltered, searchInput]);

  const displayedRecords = useMemo(() => {
    const sorted = sortMTDRecordsBySortKey(
      filtered,
      tableFilters.sortBy ?? "newest",
      producers,
      orderById
    );
    return sortMTDRecordsByViewOrder(sorted, viewOrder, producers);
  }, [filtered, tableFilters.sortBy, viewOrder, producers, orderById]);

  // Form / subtype menu: server chip totals only (sticky via useMtdBoard).
  const formCounts = useMemo(
    () =>
      (mtdBoardCounts.by_form_type || {}) as Record<OrderFormType, number>,
    [mtdBoardCounts.by_form_type]
  );

  const cheerSubtypeCounts = useMemo(
    () =>
      (mtdBoardCounts.by_cheer_form_subtype || {}) as Record<
        CheerFormSubtypeFilter,
        number
      >,
    [mtdBoardCounts.by_cheer_form_subtype]
  );

  const danceSubtypeCounts = useMemo(
    () =>
      (mtdBoardCounts.by_dance_form_subtype || {}) as Record<
        DanceFormSubtypeFilter,
        number
      >,
    [mtdBoardCounts.by_dance_form_subtype]
  );

  const tableFilterKey = [
    tableFilters.packageTier,
    tableFilters.timeLimit,
    tableFilters.split,
    tableFilters.assignedProducer,
    tableFilters.requestedProducer,
    tableFilters.scheduleFilter,
    tableFilters.infoFilter,
    tableFilters.dateFilter.type,
    String(tableFilters.dateFilter.value),
    tableFilters.sortBy,
    searchInput,
  ].join("-");

  const columns: Column<MTDRecord>[] = useMemo(() => {
    const showRallyMix = false; // Removed per spec: Rally Mix is a package, not an add-on

    const showYouthAddons =
      form === "school-all-star-cheer" &&
      cheerSubtype === "youth-rec-cheer";

    const showCheerVoiceover = false; // Removed from MTD per spec (Voiceover is strictly Payroll internal)
    const showDanceVoiceover = false; // Removed from MTD per spec (Voiceover is strictly Payroll internal)
    const showMusicAffiliate =
      form === "school-all-star-cheer" || form === "school-all-star-dance";
    const showCouponCode = formSupportsCouponCode(form);
    const showRequestedProducer = formHasRequestedProducer(
      form,
      cheerSubtype === "all" ? undefined : cheerSubtype
    );
    const programHeader = getProgramColumnHeader(
      form,
      cheerSubtype === "all" ? undefined : cheerSubtype,
      danceSubtype === "all" ? undefined : danceSubtype
    );
    const contactHeader = getContactColumnHeader(
      form,
      cheerSubtype === "all" ? undefined : cheerSubtype,
      danceSubtype === "all" ? undefined : danceSubtype
    );

    const baseCols: Column<MTDRecord>[] = [
      {
        key: "rowId",
        header: "ID",
        width: "56px",
        align: "center" as const,
        render: (_rec, index) => (
          <span className="tabular-nums text-[12px] text-brand-ink">
            {index + 1}
          </span>
        ),
      },
      {
        key: "createdAt",
        header: "Timestamp",
        width: "128px",
        align: "center" as const,
        nowrap: true,
        cellClassName: compactCellClass,
        headerClassName: compactHeaderClass,
        render: (rec) => (
          <span className="tabular-nums text-[11px] text-brand-ink-secondary whitespace-nowrap">
            {formatDisplayDateTime(resolveMtdTimestamp(rec, allOrders))}
          </span>
        ),
      },
      {
        key: "contactC",
        header: contactHeader,
        width: contactHeader.length > 14 ? "150px" : "100px",
        align: "center" as const,
        nowrap: false,
        cellClassName: clsx(
          compactCellClass,
          contactHeader.length > 14 ? "max-w-[150px]" : "max-w-[100px]"
        ),
        headerClassName: clsx(
          compactHeaderClass,
          contactHeader.length > 14 && "whitespace-normal leading-tight"
        ),
        render: (rec) => {
          const linked = findLinkedOrder(rec, allOrders);
          const name = getOrderContactPersonName(
            linked || orderFromMTDRecord(rec),
            rec.contactName,
            rec.programName
          ).trim();
          return (
            <TruncatedText
              text={name || "No data"}
              className={clsx(
                "mx-auto w-full min-w-0 text-center",
                compactTextClass,
                !name && "text-brand-ink-tertiary"
              )}
              style={{ maxWidth: "100%" }}
            />
          );
        },
      },
      {
        key: "programD",
        header: programHeader,
        width: programHeader.length > 14 ? "150px" : "100px",
        align: "center" as const,
        nowrap: false,
        cellClassName: clsx(
          compactCellClass,
          programHeader.length > 14 ? "max-w-[150px]" : "max-w-[100px]"
        ),
        headerClassName: clsx(compactHeaderClass, "whitespace-normal leading-tight"),
        render: (rec) => {
          const linked = findLinkedOrder(rec, allOrders);
          const identityOrder = linked || orderFromMTDRecord(rec);
          const name = getOrderIdentityName(identityOrder).trim();
          return (
            <TruncatedText
              text={name || "No data"}
              className={clsx(
                "mx-auto w-full min-w-0 text-center",
                compactTextClass,
                !name && "text-brand-ink-tertiary"
              )}
              style={{ maxWidth: "100%" }}
            />
          );
        },
      },
      {
        key: "packageE",
        header: "Package type",
        width: "100px",
        align: "center" as const,
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[100px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => {
          const linked = findLinkedOrder(rec, allOrders);
          const meta = resolveMTDFormMeta(rec, orderById);
          const raw =
            linked?.packageType ||
            linked?.package ||
            rec.package ||
            "";
          const label = magentoPackageBoardLabel(
            meta.formType,
            raw,
            meta.danceFormSubtype,
            meta.cheerFormSubtype
          );
          return (
            <TruncatedText
              text={label || "No data"}
              className={clsx(
                "mx-auto w-full min-w-0 text-center font-medium",
                compactTextClass,
                !label && "text-brand-ink-tertiary"
              )}
              style={{ maxWidth: "100%" }}
            />
          );
        },
      },
      ...(form === "school-all-star-cheer"
        ? [
            {
              key: "limitE",
              // Matches client form field "Length of Mix" (API: time_length_of_mix).
              header: "Length of Mix",
              width: "100px",
              align: "center" as const,
              nowrap: false,
              cellClassName: clsx(compactCellClass, "max-w-[100px]"),
              headerClassName: clsx(
                compactHeaderClass,
                "whitespace-normal leading-tight"
              ),
              render: (rec: MTDRecord) => {
                const linked = findLinkedOrder(rec, allOrders);
                const meta = resolveMTDFormMeta(rec, orderById);
                const fromOrder = displayMixLengthLabel(
                  linked?.timeLengthOfMix || ""
                );
                const fromPackage = parsePackage(
                  packageTypeDisplayValue(rec.package)
                    ? rec.package
                    : linked?.package || ""
                ).limit;
                let limit =
                  fromOrder ||
                  displayMixLengthLabel(
                    fromPackage && fromPackage !== "-" ? fromPackage : ""
                  );
                // Magento SoftSelect Mix Length has no 2:15 for Youth Rec.
                if (
                  meta.cheerFormSubtype === "youth-rec-cheer" &&
                  limit === "2:15"
                ) {
                  limit = "2:30";
                }
                return (
                  <span
                    className={clsx(
                      "mx-auto block text-center tabular-nums",
                      compactTextClass,
                      !limit && "text-brand-ink-tertiary"
                    )}
                  >
                    {limit || "No data"}
                  </span>
                );
              },
            },
          ]
        : []),
      // Split/No Split is on VIROC, School Cheer, and Youth Rec: not All Star Cheer.
      ...(form === "school-all-star-cheer" &&
      cheerSubtype !== "all-star-cheer"
        ? [
            {
              key: "splitE",
              header: "Split",
              width: "100px",
              align: "center" as const,
              nowrap: false,
              cellClassName: clsx(compactCellClass, "max-w-[100px]"),
              headerClassName: compactHeaderClass,
              render: (rec: MTDRecord) => {
                const meta = resolveMTDFormMeta(rec, orderById);
                // All Star Cheer has no Split field: do not treat as missing data.
                if (!orderHasSplitField(meta)) {
                  return (
                    <span
                      className={clsx(
                        "mx-auto block text-center text-brand-ink-tertiary",
                        compactTextClass
                      )}
                    >
                      -
                    </span>
                  );
                }
                const linked = rec.orderId
                  ? orderById.get(rec.orderId)
                  : undefined;
                const splitVal =
                  linked?.splitOrNoSplit || parsePackage(rec.package).split;
                return (
                  <TruncatedText
                    text={splitVal || "No data"}
                    className={clsx(
                      "mx-auto w-full min-w-0 text-center",
                      compactTextClass,
                      !splitVal && "text-brand-ink-tertiary"
                    )}
                    style={{ maxWidth: "100%" }}
                  />
                );
              },
            },
          ]
        : []),
      ...(showMusicAffiliate
        ? [
            {
              key: "musicAffiliateCol",
              header: "Music Affiliate",
              width: "120px",
              align: "center" as const,
              nowrap: false,
              cellClassName: clsx(compactCellClass, "max-w-[120px]"),
              headerClassName: compactHeaderClass,
              render: (rec: MTDRecord) => {
                const linked = rec.orderId ? orderById.get(rec.orderId) : undefined;
                const affiliate = linked?.musicAffiliate ?? (rec as any).musicAffiliate;
                if (!affiliate) {
                  return (
                    <span className={clsx("mx-auto block text-center text-brand-ink-tertiary", compactTextClass)}>
                      No data
                    </span>
                  );
                }

                return (
                  <TruncatedText
                    text={titleCase(affiliate)}
                    className={clsx("mx-auto w-full min-w-0 text-center font-medium", compactTextClass)}
                    style={{ maxWidth: "100%" }}
                  />
                );
              },
            },
          ]
        : []),
      // Form song list text is edit-modal / Songs pill only: not a board column.
      ...(showRequestedProducer
        ? [
            {
              key: "chosenInitialsF",
              header: "Requested producer",
              width: "100px",
              align: "center" as const,
              nowrap: false,
              cellClassName: clsx(compactCellClass, "max-w-[100px]"),
              headerClassName: compactHeaderClass,
              render: (rec: MTDRecord) => {
                const linked = findLinkedOrder(rec, allOrders);
                const label = formatRequestedEditorLabel(rec, producers, linked);
                const isFa = label === "First Available";
                const empty = !label.trim();

                return (
                  <span
                    className={clsx(
                      "font-medium",
                      compactTextClass,
                      empty
                        ? "text-brand-ink-tertiary"
                        : isFa
                          ? "text-brand-info"
                          : "text-brand-ink"
                    )}
                  >
                    {empty ? "-" : label}
                  </span>
                );
              },
            } satisfies Column<MTDRecord>,
          ]
        : []),
      {
        key: "priceG",
        header: "Package Price",
        width: "110px",
        align: "center" as const,
        nowrap: false,
        cellClassName: "!px-2",
        headerClassName: "!px-2",
        render: (rec) => {
          const order = findLinkedOrder(rec, allOrders);
          const meta = resolveMTDFormMeta(rec, orderById);
          let engineCustomerPrice: number | null = 0;
          let isUnpriced = false;

          if (meta.formType === "school-all-star-dance") {
            const dancePricing = calculateDanceOrderPricing({
              danceFormSubtype: meta.danceFormSubtype,
              packageType: order?.packageType || rec.package,
              musicAffiliate: order?.musicAffiliate,
              hasTraditionalVoiceover: rec.hasTraditionalVoiceover,
              hasThemedVoiceover: rec.hasThemedVoiceover,
            });
            engineCustomerPrice = dancePricing.customerFacingPrice;
          } else if (meta.formType === "marching-band") {
            const mbPricing = calculateMarchingBandOrderPricing({
              packageType: order?.packageType || rec.package,
              musicAffiliate: order?.musicAffiliate,
            });
            engineCustomerPrice = mbPricing.customerFacingPrice;
          } else if (meta.formType === "sports-entertainment") {
            const sePricing = calculateSportsEntertainmentOrderPricing({
              packageType: order?.packageType || rec.package,
              isRushOrder: rec.isRushOrder ?? (order as any)?.isRushOrder,
            });
            isUnpriced = sePricing.isUnpriced || sePricing.customerFacingPrice === null;
            engineCustomerPrice = sePricing.customerFacingPrice;
          } else if (meta.formType === "school-anthem") {
            const saPricing = calculateSchoolAnthemOrderPricing({
              packageType: order?.packageType || rec.package,
            });
            engineCustomerPrice = saPricing.customerFacingPrice;
          } else {
            const enginePricing = calculateCheerOrderPricing({
              cheerFormSubtype: meta.cheerFormSubtype,
              packageType: order?.packageType || rec.package,
              timeLengthOfMix: order?.timeLengthOfMix,
              musicAffiliate: order?.musicAffiliate,
              hasRallyMix: order?.hasRallyMix,
              hasExtend8ctAddon: rec.hasExtend8ctAddon,
              hasProcessing8ctSheetsAddon: rec.hasProcessing8ctSheetsAddon,
            });
            engineCustomerPrice = enginePricing.customerFacingPrice;
            if (enginePricing.isUnpriced) isUnpriced = true;
          }

          const displayPrice = resolveOrderPackageDisplayPrice(
            rec,
            order,
            meta,
            orderById
          );

          // Unpriced SoftSelect packages (SE OTHER / School Cheer Other mix)
          // get a per-order quote. Catalog-priced packages open Pricing.
          if (
            isUnpriced ||
            orderNeedsManualPackageQuote(meta, order, {
              customerFacingPrice: engineCustomerPrice,
              payrollBasePrice: null,
              isUnpriced,
            })
          ) {
            const showNeedsQuote = displayPrice <= 0;
            return (
              <div
                className="mx-auto flex w-full flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <HoverTip
                  label={
                    showNeedsQuote
                      ? "Set package price for this order"
                      : "Edit package price for this order"
                  }
                  placement="top"
                  className="w-full"
                >
                  <button
                    type="button"
                    onClick={(e) => openRecordPricingModal(rec, e)}
                    aria-label={
                      showNeedsQuote
                        ? "Set package price: Needs Quote"
                        : `Edit package price ${formatPrice(displayPrice)}`
                    }
                    className={clsx(
                      clickableChipClass,
                      "flex w-full flex-col items-center rounded-lg px-2 py-1 text-center",
                      showNeedsQuote &&
                        "border-brand-warning/35 bg-brand-warning/10"
                    )}
                  >
                    {showNeedsQuote ? (
                      <span className="text-[11px] font-semibold text-brand-warning whitespace-nowrap">
                        Needs Quote
                      </span>
                    ) : (
                      <p className="font-semibold tabular-nums text-[12px] text-brand-ink hover:text-brand-orange">
                        {formatPrice(displayPrice)}
                      </p>
                    )}
                  </button>
                </HoverTip>
              </div>
            );
          }

          return (
            <div
              className="mx-auto flex w-full flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <HoverTip
                label="Open Pricing rate card"
                placement="top"
                className="w-full"
              >
                <button
                  type="button"
                  onClick={(e) => openPricingModal(rec, e)}
                  aria-label={`Open Pricing ${formatPrice(displayPrice)}`}
                  className={clsx(
                    clickableChipClass,
                    "flex w-full flex-col items-center rounded-lg px-2 py-1 text-center"
                  )}
                >
                  <p className="font-semibold tabular-nums text-[12px] text-brand-ink hover:text-brand-orange">
                    {formatPrice(displayPrice)}
                  </p>
                </button>
              </HoverTip>
            </div>
          );
        },
      },
      ...(showCouponCode
        ? [
            {
              key: "couponCodeCol",
              header: "Coupon Code",
              width: "100px",
              align: "left" as const,
              nowrap: false,
              cellClassName: clsx(compactCellClass, "max-w-[100px]"),
              headerClassName: compactHeaderClass,
              render: (rec: MTDRecord) => {
                const linked = findLinkedOrder(rec, allOrders);
                const coupon = (
                  linked?.couponCode ||
                  rec.couponCode ||
                  ""
                ).trim();
                if (!coupon) {
                  return (
                    <TruncatedText
                      text="None"
                      className={clsx(
                        "w-full min-w-0 text-left text-brand-ink-tertiary",
                        compactTextClass
                      )}
                      style={{ maxWidth: "100%" }}
                    />
                  );
                }
                const matched = isValidDiscountCode(coupon, discountCodes);
                return (
                  <TruncatedText
                    text={matched ? `${coupon} · Match` : coupon}
                    className={clsx(
                      "w-full min-w-0 text-left",
                      compactTextClass,
                      matched && "text-brand-success"
                    )}
                    style={{ maxWidth: "100%" }}
                  />
                );
              },
            },
          ]
        : []),
      {
        key: "mixDateI",
        header: "Mix start date",
        width: "128px",
        align: "center" as const,
        nowrap: false,
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2",
        render: (rec) => {
          const assigned = Boolean(getDisplayAssignedProducer(rec));
          const startIso = assigned ? toIsoDateString(rec.mixStartDate) : "";
          return (
            <span
              className={clsx(
                "mx-auto block text-center tabular-nums text-[12px] font-medium",
                startIso ? "text-brand-ink" : "text-brand-ink-tertiary"
              )}
            >
              {startIso ? formatDisplayDate(startIso) : "Assign producer to set"}
            </span>
          );
        },
      },
      {
        key: "mixEndDate",
        header: "Mix due date",
        width: "128px",
        align: "center" as const,
        nowrap: false,
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2",
        render: (rec) => {
          const assigned = Boolean(getDisplayAssignedProducer(rec));
          const endIso = assigned
            ? toIsoDateString(rec.mixEndDate ?? "")
            : "";
          return (
            <span
              className={clsx(
                "mx-auto block text-center tabular-nums text-[12px] font-medium",
                endIso ? "text-brand-ink" : "text-brand-ink-tertiary"
              )}
            >
              {endIso ? formatDisplayDate(endIso) : "Assign producer to set"}
            </span>
          );
        },
      },
      {
        key: "daysBooked",
        header: "Days booked",
        width: "120px",
        align: "center" as const,
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[120px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => {
          const label =
            getDisplayAssignedProducer(rec) &&
            toIsoDateString(rec.mixStartDate) &&
            toIsoDateString(rec.mixEndDate ?? "")
              ? formatMixBookedDaysLabel(
                  rec.mixStartDate,
                  rec.mixEndDate,
                  mixWorkDaysForRecord(rec, producers)
                )
              : "Not booked yet";
          const booked = label !== "Not booked yet";
          return (
            <span
              className={clsx(
                "mx-auto block text-center text-[12px] font-medium",
                booked ? "text-brand-ink" : "text-brand-ink-tertiary"
              )}
            >
              {label}
            </span>
          );
        },
      },
    ];



    if (showYouthAddons) {
      baseCols.push({
        key: "extend8ctCol",
        header: "Extend 8-CS",
        width: "90px",
        align: "center",
        nowrap: false,
        cellClassName: "!px-2 !py-2",
        headerClassName: "!px-2",
        render: (rec) => (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <InlineTwoStateToggle
                value={Boolean(rec.hasExtend8ctAddon)}
                readOnly={isViewOnly}
                onToggle={() =>
                  updateMTD(rec.id, { hasExtend8ctAddon: !rec.hasExtend8ctAddon })
                }
              />
            </div>
          ),
      });

      baseCols.push({
        key: "process8ctCol",
        header: "Process 8-CS",
        width: "95px",
        align: "center",
        nowrap: false,
        cellClassName: "!px-2 !py-2",
        headerClassName: "!px-2",
        render: (rec) => (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <InlineTwoStateToggle
                value={Boolean(rec.hasProcessing8ctSheetsAddon)}
                readOnly={isViewOnly}
                onToggle={() =>
                  updateMTD(rec.id, {
                    hasProcessing8ctSheetsAddon: !rec.hasProcessing8ctSheetsAddon,
                  })
                }
              />
            </div>
          ),
      });
    }

    if (showDanceVoiceover) {
      baseCols.push({
        key: "voiceoverCol",
        header: "Voice Over",
        width: "135px",
        align: "center",
        nowrap: false,
        cellClassName: "!px-2 !py-2",
        headerClassName: "!px-2",
        render: (rec) => (
          <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
            <InlineDanceVoiceoverPills
              record={rec}
              readOnly={isViewOnly}
              onUpdate={(id, patch) => updateMTD(id, patch)}
            />
          </div>
        ),
      });
    }

    if (showCheerVoiceover) {
      baseCols.push({
        key: "cheerVoiceoverCol",
        header: "Voice Over",
        width: "135px",
        align: "center",
        nowrap: false,
        cellClassName: "!px-2 !py-2",
        headerClassName: "!px-2",
        render: (rec) => (
          <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
            <InlineCheerVoiceoverPills
              record={rec}
              readOnly={isViewOnly}
              onUpdate={(id, patch) => updateMTD(id, patch)}
            />
          </div>
        ),
      });
    }

    if (form === "school-all-star-dance") {
      baseCols.push({
        key: "extraSongsCol",
        header: "Extra Songs",
        width: "132px",
        align: "center",
        nowrap: false,
        cellClassName: "!px-2 !py-2",
        headerClassName: "!px-2",
        render: (rec) => (
          <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
            <InlineQuantityStepper
              quantity={rec.extraSongsQuantity ?? 0}
              unitCost={15}
              label="Extra Songs"
              readOnly={isViewOnly}
              onChange={(qty) => updateMTD(rec.id, { extraSongsQuantity: qty })}
            />
          </div>
        ),
      });

      baseCols.push({
        key: "extraSongTimeCol",
        header: "Extra Song Time",
        width: "132px",
        align: "center",
        nowrap: false,
        cellClassName: "!px-2 !py-2",
        headerClassName: "!px-2",
        render: (rec) => (
          <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
            <InlineQuantityStepper
              quantity={rec.extraSongEditingTimeQuantity ?? 0}
              unitCost={30}
              label="Extra Song Time"
              readOnly={isViewOnly}
              onChange={(qty) =>
                updateMTD(rec.id, { extraSongEditingTimeQuantity: qty })
              }
            />
          </div>
        ),
      });
    }

    baseCols.push(
      {
        key: "editorB",
        header: "Assigned producer",
        width: "100px",
        align: "center",
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[100px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => {
          const assigned = getDisplayAssignedProducer(rec);
          const producer = assigned
            ? findProducerByAssignmentKey(assigned, producers)
            : undefined;

          return (
            <div
              className="flex justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {assigned ? (
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => openAssignModal(rec, e)}
                  title="View assignment"
                  aria-label={`View assignment for ${assigned}`}
                  className={clsx(
                    clickableChipClass,
                    "inline-flex items-center rounded-full p-0.5"
                  )}
                >
                  <Avatar producer={producer} initials={assigned} size="xs" />
                </button>
              ) : (
                <span
                  title="Producers are assigned on the Orders tab"
                  className="inline-flex items-center gap-1 rounded-md border border-brand-line/70 bg-brand-bg/50 px-2 py-1 text-[10px] font-medium text-brand-ink-tertiary"
                >
                  <Lock className="h-3 w-3" strokeWidth={2} />
                  No producer
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: "invoiceAction",
        header: "Invoice #",
        width: "132px",
        align: "center",
        nowrap: true,
        cellClassName: clsx(compactCellClass, "max-w-[132px] !px-1.5"),
        headerClassName: clsx(compactHeaderClass, "!px-1.5"),
        render: (rec) => {
          const invoice = rec.invoice?.trim() ?? "";
          return (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              {invoice ? (
                <button
                  type="button"
                  onClick={(e) => openInvoiceModal(rec, e)}
                  title="Edit invoice"
                  aria-label={`Edit invoice ${invoice}`}
                  className={clsx(
                    clickableChipClass,
                    "max-w-full rounded-lg px-2.5 pr-3 py-1 tabular-nums hover:text-brand-orange",
                    compactTextClass
                  )}
                >
                  <span className="block min-w-0 truncate">{invoice}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => openInvoiceModal(rec, e)}
                  className={actionButtonClass(false)}
                >
                  Invoice
                </button>
              )}
            </div>
          );
        },
      },
      {
        key: "recordStatus",
        header: "Status",
        width: "148px",
        align: "center",
        nowrap: false,
        cellClassName: "!px-2 !py-1.5 pr-5",
        headerClassName: "!px-2 pr-5",
        render: (rec) => (
          <InlineCell centered>
            <InlineSelect
              centered
              value={inferMTDRecordStatus(rec)}
              options={[...MTD_RECORD_STATUS_OPTIONS]}
              readOnly={isViewOnly}
              onChange={(value) => handleRecordStatusChange(rec, value)}
              className={tableStatusSelectClass}
            />
          </InlineCell>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        width: "120px",
        align: "center",
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[120px]"),
        headerClassName: compactHeaderClass,
        render: (rec, index) => (
          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
            {!isViewOnly ? (
              <HoverTip label="Move to Orders" placement="top">
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => handleMoveToOrders(rec, e)}
                  className={ordersMtdButtonClass(true)}
                  aria-label="Move to Orders"
                >
                  <span>Orders</span>
                  <ArrowLeft className="h-3 w-3 shrink-0" strokeWidth={2.25} />
                </button>
              </HoverTip>
            ) : null}
            <HoverTip
              label={isViewOnly ? "View order form" : "Edit order form"}
              placement="top"
            >
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setOrderFormRowId(index + 1);
                  setOrderFormRecord(rec);
                }}
                title={isViewOnly ? "View order form" : "Edit order form"}
                aria-label={
                  isViewOnly
                    ? `View ${rec.programName || "order"}`
                    : `Edit order form: ${rec.programName || "order"}`
                }
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-line/70 bg-brand-bg/60 text-brand-ink-secondary shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/25"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </HoverTip>
          </div>
        ),
      }
    );

    return baseCols;
  },
  [
    form,
    cheerSubtype,
    danceSubtype,
    updateMTD,
    handleMoveToOrders,
    allOrders,
    mtdRecords,
    producers,
    schedule,
    discountCodes,
    openAssignModal,
    openInvoiceModal,
    openPricingModal,
    openRecordPricingModal,
    pricingRevision,
    orderById,
  ]
);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ReturnNavBanner />
      <PageHeader
        title="Music To Do"
        subtitle="Complete mixes, pricing, and invoicing"
        action={{
          label: "Pricing",
          onClick: openPricingReference,
          showPlus: false,
        }}
        exportAction={{
          label: "CSV",
          onClick: () => {
            const csv = generateMTDCsv(displayedRecords, allOrders, producers);
            triggerCsvDownload(`MTD_Export_${todayIso()}.csv`, csv);
          },
        }}
        search={{
          value: searchInput,
          onChange: setSearchInput,
          placeholder: `${getContactColumnHeader(
            form,
            cheerSubtype === "all" ? undefined : cheerSubtype,
            danceSubtype === "all" ? undefined : danceSubtype
          )}, invoice…`,
        }}
        toolbar={
          <MTDPageToolbar
            form={form}
            cheerSubtype={cheerSubtype}
            danceSubtype={danceSubtype}
            onFormChange={switchForm}
            onCheerSubtypeChange={setCheerSubtype}
            onDanceSubtypeChange={setDanceSubtype}
            onFormMenuIntent={() => {
              const byForm = mtdBoardCounts.by_form_type || {};
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
                const byCheer = mtdBoardCounts.by_cheer_form_subtype || {};
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
                const byCheer = mtdBoardCounts.by_cheer_form_subtype || {};
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
            records={mtdBoardRecords}
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
            onPricingClick={openPricingReference}
            viewOrder={viewOrder}
            onViewOrderChange={setViewOrder}
          />
        }
      />

      <div className="min-h-0 flex-1 overflow-auto px-2 pb-6 pt-5 lg:px-3">
        <div className="dashboard-panel dashboard-panel-framed overflow-hidden">
          <DataTable
            key={`${form}-${cheerSubtype}-${danceSubtype}-${tableFilterKey}-${viewOrder}`}
            columns={columns}
            data={displayedRecords}
            rowKey={(rec) => rec.id}
            emptyMessage="No MTD entries match this filter."
            loading={mtdBoardLoading && displayedRecords.length === 0}
            pageSize={15}
            totalCount={
              mtdCountsReady
                ? mtdActiveChipTotal(mtdBoardCounts, {
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
            hasMore={Boolean(mtdNextPageToken)}
            onLoadMore={loadMoreMtd}
            loadingMore={mtdBoardLoadingMore}
            resetKey={`${form}-${cheerSubtype}-${danceSubtype}-${tableFilterKey}-${viewOrder}`}
            embedded
            showScrollIndicator={true}
            highlightRowKey={highlightId}
            onClearHighlight={clearHighlight}
          />
        </div>
      </div>

      <AssignEditorModal
        open={assignRecordId !== null}
        record={assignRecord}
        mtdRecords={mtdRecords}
        allOrders={allOrders}
        producers={producers}
        schedule={schedule}
        readOnly={
          isViewOnly ||
          (Boolean(assignRecord?.assignedProducer?.trim()) &&
            !assignRecord?.isReassigned)
        }
        onClose={() => setAssignRecordId(null)}
        onAssign={handleAssign}
      />

      <SetInvoiceModal
        open={Boolean(invoiceRecord)}
        record={invoiceRecord}
        readOnly={isViewOnly}
        onClose={() => setInvoiceRecord(null)}
        onSave={handleInvoiceSave}
      />

      <SetInvoicesModal
        open={invoicesOpen}
        records={filtered}
        onClose={() => setInvoicesOpen(false)}
        onSave={handleInvoicesSave}
      />

      <SetPricingModal
        open={pricingOpen}
        order={pricingFocusOrder}
        record={pricingFocusRecord}
        form={pricingFocusRecord ? undefined : form}
        cheerSubtype={pricingFocusRecord ? undefined : cheerSubtype}
        danceSubtype={pricingFocusRecord ? undefined : danceSubtype}
        onClose={() => {
          setPricingOpen(false);
          setPricingFocusRecord(null);
        }}
      />

      <SetRecordPricingModal
        open={Boolean(recordPricingRecord)}
        record={recordPricingRecord}
        initialPrice={recordPricingInitialPrice}
        musicAffiliateInfo={
          recordPricingRecord
            ? getRecordMusicAffiliateInfo(
                recordPricingRecord,
                orderById,
                allOrders
              )
            : null
        }
        onClose={() => setRecordPricingRecord(null)}
        onSave={saveRecordPricing}
        readOnly={isViewOnly}
      />

      <CompleteToPayrollModal
        open={Boolean(completeRecord)}
        record={completeRecord}
        allOrders={allOrders}
        producers={producers}
        onClose={() => setCompleteRecord(null)}
        onConfirm={confirmCompleteToPayroll}
      />

      <CompletionBlockedModal
        open={Boolean(blockedRecord)}
        record={blockedRecord}
        reason={blockedReason}
        onClose={() => setBlockedRecord(null)}
      />

      <MoveToOrdersConfirmModal
        open={Boolean(moveToOrdersRecord)}
        record={moveToOrdersRecord}
        onClose={() => setMoveToOrdersRecord(null)}
        onConfirm={confirmMoveToOrders}
      />

      <OrderFormEditModal
        open={Boolean(orderFormRecord)}
        record={orderFormRecord}
        allOrders={allOrders}
        rowId={orderFormRowId}
        onClose={() => {
          setOrderFormRecord(null);
          setOrderFormRowId(null);
        }}
      />
    </div>
  );
}

export default function MTDPage() {
  return (
    <Suspense fallback={null}>
      <MTDPageContent />
    </Suspense>
  );
}
