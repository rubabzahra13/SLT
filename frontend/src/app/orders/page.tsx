"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowRight, Flag, Link2, Mail, Pencil, Trash2 } from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReturnNavBanner } from "@/components/layout/ReturnNavBanner";
import { Avatar } from "@/components/ui/Avatar";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { HoverTip } from "@/components/ui/HoverTip";
import { TruncatedText } from "@/components/ui/TruncatedText";
import { SetPricingModal } from "@/components/mtd/SetPricingModal";
import { SetRecordPricingModal } from "@/components/mtd/SetRecordPricingModal";
import { CompletionBlockedModal } from "@/components/mtd/CompletionBlockedModal";
import { InlineTwoStateToggle } from "@/components/mtd/InlineFields";
import { ForwardOrderMailModal } from "@/components/orders/ForwardOrderMailModal";
import { AddNewOrderModal } from "@/components/orders/AddNewOrderModal";
import { MatchBeforeMtdModal } from "@/components/orders/MatchBeforeMtdModal";
import { OrderFormEditModal } from "@/components/orders/OrderFormEditModal";
import { DeleteOrderConfirmModal } from "@/components/orders/DeleteOrderConfirmModal";
import { OrdersCsvExportModal } from "@/components/orders/OrdersCsvExportModal";
import { OrderRequirementsCell } from "@/components/orders/OrderRequirementsCell";
import { OrderDataStatusBadge, OrderAssignmentStatusBadge } from "@/components/orders/OrderStatusDropdown";
import { recordIsRushOrder } from "@/lib/forward-order-mail";
import {
  formatMusicAffiliateDisplay,
  isInvalidMultiAffiliateSelection,
  recordHeldOnAffiliateFlag,
} from "@/lib/affiliate-flag";
import {
  DEFAULT_MTD_TABLE_FILTERS,
  type MTDTableFilterState,
} from "@/components/mtd/MTDTableFilters";
import { MTDPageToolbar } from "@/components/mtd/MTDPageToolbar";
import { useAppState } from "@/context/AppStateContext";
import { OrdersLookupProvider } from "@/context/OrdersLookupContext";
import { fetchOrderApi } from "@/lib/api/orders";
import { formatPrice, titleCase } from "@/lib/data";
import {
  getOrderAssignmentStatus,
  getOrderRequirements,
  getOrdersRangeTabLabel,
  getOrderStatus,
  mergeOrderFormFieldsForRequirements,
  orderMatchesOrdersRangeFilter,
  ORDER_RESELECTION_REASON_LABEL,
  ordersRangeTabToFilter,
  type OrdersRangeTabLabel,
} from "@/lib/order-requirements";
import { isValidDiscountCode } from "@/lib/discount-codes";
import {
  formSupportsCouponCode,
  getContactColumnHeader,
  getOrderContactPersonName,
  getOrderIdentityName,
  getProgramColumnHeader,
} from "@/lib/order-detail-sections";
import { orderFromMTDRecord } from "@/lib/order-detail-fields";
import {
  matchCandidatesBeforeMtd,
  type MatchBeforeMtdCandidate,
} from "@/lib/manual-form-suggestions";
import {
  formatOrderFormMtdBlockReason,
  getOrderFormFieldsBlockingMtd,
  MAGENTO_MATCH_BEFORE_MTD_REASON,
  orderHasSplitField,
  resolveFinalMatchedOrder,
  unmatchedManualNeedsMagentoMatch,
} from "@/lib/order-form-missing";
import {
  buildRecordPriceSavePatch,
  orderNeedsManualPackageQuote,
  PRICING_REFERENCE_CHANGED_EVENT,
  resolveEngineCustomerPrice,
  resolveOrderPackageDisplayPrice,
} from "@/lib/order-package-price";
import {
  formatDisplayDate,
  formatDisplayDateTime,
  formatMixBookedDaysLabel,
  toIsoDateString,
} from "@/lib/dates";
import { todayIso } from "@/lib/date-filters";
import { displayMixLengthLabel } from "@/lib/mix-duration";
import { parsePackage } from "@/lib/package";
import {
  magentoPackageBoardLabel,
  packageTypeDisplayValue,
} from "@/components/mtd/PackageTypeField";
import {
  findLinkedOrder,
  findProducerByAssignmentKey,
  formHasRequestedProducer,
  formatRequestedEditorLabel,
  getDisplayAssignedProducer,
  mixWorkDaysForRecord,
  producerKeysMatch,
} from "@/lib/editor-assignment";
import {
  filterMTDRecords,
  getRecordMusicAffiliateInfo,
  isOrderScheduledAndAssigned,
  matchesMTDSearch,
  resolveMTDFormMeta,
  sortMTDRecordsBySortKey,
} from "@/lib/mtd-filters";
import { listPreMtdOrderRecords } from "@/lib/order-staging";
import {
  prefetchOrdersBoard,
  useOrdersBoard,
} from "@/hooks/useOrdersBoard";
import { downloadOrdersBoardCsv } from "@/lib/api/orders-board";
import {
  ORDERS_BOARD_PATCH_EVENT,
  ordersActiveFormTotal,
  ordersRangeFilterTotal,
  ordersRangeTabTotal,
  ordersSourceMenuCounts,
  readOrdersBoardOrder,
} from "@/lib/orders-board-cache";
import {
  prefetchOrdersMatchData,
  useOrdersMatchPool,
} from "@/hooks/useOrdersMatchPool";
import {
  filterRecordsByOrderSource,
  isManualOrderRecord,
  ORDER_SOURCE_OPTIONS,
} from "@/lib/order-source";
import { seedAssignPage } from "@/lib/assign-page-seed";
import { idlePrefetchSiblingBoard } from "@/lib/board-nav-prefetch";
import {
  coerceOrdersRangeFilters,
  isOrdersRangeFilterActive,
  serializeOrdersRangeFilters,
} from "@/lib/orders-range-filters";
import {
  applyTableFilterDefaults,
  buildOrdersReturnHref,
  loadOrdersViewState,
  mergeOrdersViewState,
  parseOrdersViewFromSearchParams,
  saveOrdersViewState,
} from "@/lib/orders-view-state";
import {
  CHEER_FORM_SUBTABS,
  DANCE_FORM_SUBTABS,
  MANUAL_MATCH_FORM_TABS,
  ORDER_FORM_TABS,
  type CheerFormSubtypeFilter,
  type DanceFormSubtypeFilter,
  type MTDRecord,
  type Order,
  type OrderFormType,
  type OrderSourceFilter,
  type OrderViewRangeFilter,
  type PriceCompliance,
} from "@/types";

const ORDERS_CSV_RANGE_LABELS: Record<OrderViewRangeFilter, string> = {
  all: "All",
  need_to_be_scheduled: "Complete data",
  new_orders: "Complete data",
  waiting_for_data: "Missing data",
  assigned: "Assigned",
  not_assigned: "Not assigned",
  reassigned: "Reassign",
  reassign_leave: "Reassign",
  reassign_rush: "Reassign",
  flagged: "Flagged",
};

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";
const DEFAULT_CHEER_SUBTYPE: CheerFormSubtypeFilter = "all-star-cheer";
const DEFAULT_DANCE_SUBTYPE: DanceFormSubtypeFilter = "pom";

const VALID_ORDER_FORMS: OrderFormType[] = [
  "school-all-star-cheer",
  "school-all-star-dance",
  "marching-band",
  "sports-entertainment",
  "school-anthem",
];
const VALID_CHEER_SUBTYPES: CheerFormSubtypeFilter[] = [
  "all-star-cheer",
  "school-cheer-viroc-yes",
  "school-cheer-viroc-no",
  "youth-rec-cheer",
];
const VALID_DANCE_SUBTYPES: DanceFormSubtypeFilter[] = [
  "pom",
  "hip-hop",
  "team-performance-variety",
  "gameday",
  "jazz-kick",
];

/** Sync read so the first board query matches last visit (no default→restore refetch flash). */
function readStoredOrdersFilters(searchParams: URLSearchParams | null): {
  form: OrderFormType;
  cheerSubtype: CheerFormSubtypeFilter;
  danceSubtype: DanceFormSubtypeFilter;
} {
  const formParam = searchParams?.get("form") ?? null;
  const cheerParam = searchParams?.get("cheer") ?? null;
  const danceParam = searchParams?.get("dance") ?? null;
  if (typeof window === "undefined") {
    return {
      form:
        formParam && VALID_ORDER_FORMS.includes(formParam as OrderFormType)
          ? (formParam as OrderFormType)
          : DEFAULT_FORM,
      cheerSubtype:
        cheerParam && VALID_CHEER_SUBTYPES.includes(cheerParam as CheerFormSubtypeFilter)
          ? (cheerParam as CheerFormSubtypeFilter)
          : DEFAULT_CHEER_SUBTYPE,
      danceSubtype:
        danceParam && VALID_DANCE_SUBTYPES.includes(danceParam as DanceFormSubtypeFilter)
          ? (danceParam as DanceFormSubtypeFilter)
          : DEFAULT_DANCE_SUBTYPE,
    };
  }
  const stored = loadOrdersViewState();
  const formFromUrl =
    formParam && VALID_ORDER_FORMS.includes(formParam as OrderFormType)
      ? (formParam as OrderFormType)
      : null;
  const formFromSession = (() => {
    const raw = sessionStorage.getItem("slt_orders_form") as OrderFormType | null;
    if (raw && VALID_ORDER_FORMS.includes(raw)) return raw;
    if (stored?.form && VALID_ORDER_FORMS.includes(stored.form)) return stored.form;
    return null;
  })();
  const cheerFromUrl =
    cheerParam && VALID_CHEER_SUBTYPES.includes(cheerParam as CheerFormSubtypeFilter)
      ? (cheerParam as CheerFormSubtypeFilter)
      : null;
  const danceFromUrl =
    danceParam && VALID_DANCE_SUBTYPES.includes(danceParam as DanceFormSubtypeFilter)
      ? (danceParam as DanceFormSubtypeFilter)
      : null;
  const cheerRaw =
    cheerFromUrl ||
    (sessionStorage.getItem(
      "slt_orders_cheer_subtype"
    ) as CheerFormSubtypeFilter | null) ||
    stored?.cheerSubtype;
  const danceRaw =
    danceFromUrl ||
    (sessionStorage.getItem(
      "slt_orders_dance_subtype"
    ) as DanceFormSubtypeFilter | null) ||
    stored?.danceSubtype;
  return {
    form: formFromUrl || formFromSession || DEFAULT_FORM,
    cheerSubtype:
      cheerRaw && VALID_CHEER_SUBTYPES.includes(cheerRaw)
        ? cheerRaw
        : DEFAULT_CHEER_SUBTYPE,
    danceSubtype:
      danceRaw && VALID_DANCE_SUBTYPES.includes(danceRaw)
        ? danceRaw
        : DEFAULT_DANCE_SUBTYPE,
  };
}

/** Same restore as layoutEffect — keep the first board queryKey stable on refresh. */
function readInitialOrdersBoardView(
  searchParams: URLSearchParams,
  initialRangeFromUrl: OrderViewRangeFilter
): {
  sourceFilter: OrderSourceFilter;
  rangeFilters: OrderViewRangeFilter[];
  searchQuery: string;
  tableFilters: ReturnType<typeof applyTableFilterDefaults>;
} {
  if (typeof window === "undefined") {
    return {
      sourceFilter: "both",
      rangeFilters: coerceOrdersRangeFilters(initialRangeFromUrl),
      searchQuery: "",
      tableFilters: DEFAULT_MTD_TABLE_FILTERS,
    };
  }
  const fromUrl = parseOrdersViewFromSearchParams(searchParams);
  const fromStore = loadOrdersViewState();
  const restored = mergeOrdersViewState(fromStore, fromUrl);
  // Move-to-Orders / focus deep links: never let a leftover session search
  // force All (search clears range in boardQuery) or delay Reassign.
  const deepLinkRange =
    Boolean(fromUrl.rangeFilters?.length) ||
    Boolean(fromUrl.rangeFilter && fromUrl.rangeFilter !== "flagged") ||
    (initialRangeFromUrl !== "all" && initialRangeFromUrl !== "flagged");
  const deepLinkFocus = Boolean(searchParams.get("focus"));
  // Search is sticky only via URL `q` (Assign Back). Session search is cleared
  // on sidebar leave / clear — never restore a stale typed query.
  const restoredSearch =
    deepLinkRange || deepLinkFocus
      ? ""
      : fromUrl.searchQuery?.trim() || "";
  // Range chips: URL deep-link only. Do not restore Complete/Assigned (etc.)
  // from session — that made soft returns land on empty combo views.
  let rangeFilters: OrderViewRangeFilter[] = [];
  if (fromUrl.rangeFilters?.length) {
    rangeFilters = fromUrl.rangeFilters;
  } else if (fromUrl.rangeFilter && fromUrl.rangeFilter !== "flagged") {
    rangeFilters = coerceOrdersRangeFilters(fromUrl.rangeFilter);
  } else if (
    initialRangeFromUrl &&
    initialRangeFromUrl !== "all" &&
    initialRangeFromUrl !== "flagged"
  ) {
    rangeFilters = coerceOrdersRangeFilters(initialRangeFromUrl);
  } else if (restoredSearch.trim()) {
    // Searching ⇒ All (same as boardQuery), but never override a URL range.
    rangeFilters = [];
  }
  return {
    sourceFilter: (restored.sourceFilter as OrderSourceFilter) || "both",
    rangeFilters,
    searchQuery: restoredSearch,
    tableFilters: applyTableFilterDefaults(restored.tableFilters),
  };
}

const actionButtonClass = (filled: boolean, disabled = false) =>
  clsx(
    "mt-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition shadow-sm",
    disabled
      ? "cursor-not-allowed border-brand-line/50 bg-brand-bg/40 text-brand-ink-tertiary hover:border-brand-line/50 hover:bg-brand-bg/40 hover:text-brand-ink-tertiary"
      : filled
        ? "border-brand-line/70 bg-brand-elevated text-brand-ink hover:border-brand-line hover:bg-brand-bg/50"
        : "border-brand-orange-deep bg-brand-orange text-white hover:bg-brand-orange-hover"
  );
const ordersMtdButtonClass = (ready: boolean, disabled = false) =>
  clsx(
    "inline-flex h-7 items-center justify-center gap-0.5 rounded-md border px-2 text-[10px] font-semibold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30",
    disabled
      ? "cursor-not-allowed border-brand-line/50 bg-brand-bg/40 text-brand-ink-tertiary hover:border-brand-line/50 hover:bg-brand-bg/40 hover:text-brand-ink-tertiary"
      : ready
        ? "border-brand-blue/25 bg-brand-blue text-white shadow-sm hover:bg-brand-blue-hover"
        : "border-brand-line/60 bg-brand-bg/50 text-brand-ink-tertiary hover:border-brand-line/60 hover:bg-brand-bg/50 hover:text-brand-ink-tertiary"
  );
const ordersMailTextButtonClass =
  "inline-flex h-7 items-center justify-center gap-0.5 rounded-md border border-brand-line/60 bg-brand-elevated px-2 text-[10px] font-semibold leading-none text-brand-ink-secondary shadow-sm transition hover:border-brand-signature/35 hover:bg-brand-signature/8 hover:text-brand-signature focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-signature/20";
const ordersMailTextButtonDisabledClass =
  "inline-flex h-7 cursor-not-allowed items-center justify-center gap-0.5 rounded-md border border-brand-line/50 bg-brand-bg/40 px-2 text-[10px] font-semibold leading-none text-brand-ink-tertiary shadow-sm";
const ordersMailCustomerButtonClass =
  "inline-flex h-7 items-center justify-center gap-0.5 rounded-md border border-brand-warning/35 bg-brand-warning/8 px-2 text-[10px] font-semibold leading-none text-brand-warning shadow-sm transition hover:border-brand-warning/50 hover:bg-brand-warning/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-warning/20";
const clickableChipClass =
  "cursor-pointer border border-brand-line/70 bg-brand-bg/60 shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/25";
const compactCellClass = "!px-1 !py-1 overflow-hidden";
const compactHeaderClass = "!px-2";
const compactTextClass = "text-[12px] leading-snug text-brand-ink";

function OrdersPageContent() {
  const {
    mtdRecords,
    updateMTD,
    updateOrder,
    deleteOrder,
    addManualScheduleEntry,
    producers,
    schedule,
    secretMenuPrices,
    setSecretMenuPrices,
    discountCodes,
    isLoading,
    addAlert,
  } = useAppState();

  // Do not hydrate full live MTD on Orders — board + counts are enough.
  // (ensureLiveMtdLoaded here raced Magento and made sidebar clicks feel stuck.)

  const router = useRouter();
  const searchParams = useSearchParams();
  const assignedParam = searchParams.get("assigned");
  const scheduleParam = searchParams.get("schedule");
  const focusParam = searchParams.get("focus");
  const rangeParam = searchParams.get("range");
  const formParam = searchParams.get("form");

  const validOrderForms = VALID_ORDER_FORMS;

  const allowedRangeFilters: OrderViewRangeFilter[] = [
    "all",
    "need_to_be_scheduled",
    "assigned",
    "not_assigned",
    "reassigned",
    "reassign_leave",
    "reassign_rush",
    "waiting_for_data",
    "flagged",
  ];
  const initialRangeFilter: OrderViewRangeFilter = (() => {
    const parsed = coerceOrdersRangeFilters(rangeParam);
    if (parsed.length) return parsed[0]!;
    if (!rangeParam || !allowedRangeFilters.includes(rangeParam as OrderViewRangeFilter)) {
      return "all";
    }
    if (rangeParam === "flagged") return "all";
    if (rangeParam === "reassign_leave" || rangeParam === "reassign_rush") {
      return "reassigned";
    }
    return rangeParam as OrderViewRangeFilter;
  })();

  // Client navigations can read sessionStorage on first paint; SSR waits for layout hydrate.
  const [filtersReady, setFiltersReady] = useState(
    () => typeof window !== "undefined"
  );
  const [formState, setFormState] = useState<OrderFormType>(() =>
    readStoredOrdersFilters(
      new URLSearchParams(Array.from(searchParams.entries()))
    ).form
  );
  const [cheerSubtypeState, setCheerSubtypeState] =
    useState<CheerFormSubtypeFilter>(() =>
      readStoredOrdersFilters(
        new URLSearchParams(Array.from(searchParams.entries()))
      ).cheerSubtype
    );
  const [danceSubtypeState, setDanceSubtypeState] =
    useState<DanceFormSubtypeFilter>(() =>
      readStoredOrdersFilters(
        new URLSearchParams(Array.from(searchParams.entries()))
      ).danceSubtype
    );
  const initialBoardView = useMemo(
    () =>
      readInitialOrdersBoardView(
        new URLSearchParams(Array.from(searchParams.entries())),
        initialRangeFilter
      ),
    // First paint only — URL sync effects handle later deep links.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [rangeFilters, setRangeFilters] = useState<OrderViewRangeFilter[]>(
    () => initialBoardView.rangeFilters
  );
  /** First active filter — legacy single-range call sites / empty-state copy. */
  const rangeFilter: OrderViewRangeFilter = rangeFilters[0] ?? "all";
  const [sourceFilter, setSourceFilter] = useState<OrderSourceFilter>(
    () => initialBoardView.sourceFilter
  );

  const [form, setForm] = [
    formState,
    (next: OrderFormType) => {
      setFormState(next);
      if (typeof window !== "undefined") sessionStorage.setItem("slt_orders_form", next);
    },
  ];

  const [cheerSubtype, setCheerSubtype] = [
    cheerSubtypeState,
    (next: CheerFormSubtypeFilter) => {
      setCheerSubtypeState(next);
      if (typeof window !== "undefined") sessionStorage.setItem("slt_orders_cheer_subtype", next);
    },
  ];

  const [danceSubtype, setDanceSubtype] = [
    danceSubtypeState,
    (next: DanceFormSubtypeFilter) => {
      setDanceSubtypeState(next);
      if (typeof window !== "undefined") sessionStorage.setItem("slt_orders_dance_subtype", next);
    },
  ];

  // Highlight a row that was just moved here from the MTD tab. Seeded from the
  // ?focus= param on navigation, cleared when the user clicks a column.
  const [highlightId, setHighlightId] = useState<string | null>(focusParam);
  useEffect(() => {
    setHighlightId(focusParam);
  }, [focusParam]);

  useEffect(() => {
    // Old links / notifications used ?range=flagged: send them to the Flagged page.
    if (rangeParam === "flagged") {
      router.replace("/orders/flagged");
      return;
    }
    if (!rangeParam) return;
    const parsed = coerceOrdersRangeFilters(rangeParam);
    if (parsed.length) {
      setRangeFilters(parsed);
      return;
    }
    if (allowedRangeFilters.includes(rangeParam as OrderViewRangeFilter)) {
      setRangeFilters(
        coerceOrdersRangeFilters(
          rangeParam === "reassign_leave" || rangeParam === "reassign_rush"
            ? "reassigned"
            : (rangeParam as OrderViewRangeFilter)
        )
      );
    }
  }, [rangeParam, router]);

  // Move-to-Orders / deep links: apply source= from the URL (Manual filter hides Form reassigns).
  useEffect(() => {
    const source = searchParams.get("source");
    if (source === "manual" || source === "form" || source === "both") {
      setSourceFilter(source);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!formParam) return;
    if (validOrderForms.includes(formParam as OrderFormType)) {
      setForm(formParam as OrderFormType);
    }
  }, [formParam]);

  // Deep-link subtypes without switchForm (that resets range → All flicker).
  useEffect(() => {
    const cheer = searchParams.get("cheer");
    if (
      cheer &&
      VALID_CHEER_SUBTYPES.includes(cheer as CheerFormSubtypeFilter)
    ) {
      setCheerSubtype(cheer as CheerFormSubtypeFilter);
    }
    const dance = searchParams.get("dance");
    if (
      dance &&
      VALID_DANCE_SUBTYPES.includes(dance as DanceFormSubtypeFilter)
    ) {
      setDanceSubtype(dance as DanceFormSubtypeFilter);
    }
  }, [searchParams, setCheerSubtype, setDanceSubtype]);

  const clearHighlight = useCallback(() => {
    setHighlightId(null);
    if (typeof window !== "undefined" && focusParam) {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.delete("focus");
      const qs = params.toString();
      router.replace(`/orders${qs ? `?${qs}` : ""}`, { scroll: false });
    }
  }, [focusParam, router, searchParams]);

  // Newest first so newly added / incoming orders get ID 1 (latest at top).
  const [tableFilters, setTableFilters] = useState<MTDTableFilterState>(
    () => initialBoardView.tableFilters
  );

  useEffect(() => {
    if (assignedParam) {
      setTableFilters((prev) => ({ ...prev, assignedProducer: assignedParam }));
    } else if (scheduleParam) {
      setTableFilters((prev) => ({
        ...prev,
        scheduleFilter: scheduleParam as MTDTableFilterState["scheduleFilter"],
      }));
    }
  }, [assignedParam, scheduleParam]);

  // Input updates instantly; board query waits so we don't thrash /orders/board
  // + /orders/counts on every keystroke.
  const [searchInput, setSearchInputState] = useState(
    () => initialBoardView.searchQuery
  );
  const [searchQuery, setSearchQueryState] = useState(
    () => initialBoardView.searchQuery
  );

  // Jump to All immediately on first character so range+search don't change in
  // the same board queryKey (that wiped rows and left a stuck skeleton).
  const setSearchInput = useCallback((next: string) => {
    setSearchInputState(next);
  }, []);

  const clearOrdersSearchPersistence = useCallback(() => {
    const stored = loadOrdersViewState() || {};
    saveOrdersViewState({ ...stored, searchQuery: "" });
    if (typeof window === "undefined") return;
    if (!searchParams.get("q")) return;
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.delete("q");
    const qs = params.toString();
    router.replace(`/orders${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    // Clear immediately so we don't keep search hits for 220ms after X.
    // Debounce only when typing a non-empty query.
    if (!searchInput.trim()) {
      setSearchQueryState("");
      clearOrdersSearchPersistence();
      return;
    }
    const t = window.setTimeout(() => {
      setSearchQueryState(searchInput);
    }, 220);
    return () => window.clearTimeout(t);
  }, [searchInput, clearOrdersSearchPersistence]);

  // Sidebar leave (or any unmount): drop typed search so it does not come back.
  useEffect(() => {
    return () => {
      const stored = loadOrdersViewState() || {};
      saveOrdersViewState({ ...stored, searchQuery: "" });
    };
  }, []);

  // Filters already restored in useState — only mark ready (no queryKey churn).
  useLayoutEffect(() => {
    setFiltersReady(true);
  }, []);

  const boardQuery = useMemo(() => {
    const search = searchQuery.trim() || undefined;
    return {
      formType: form,
      cheerFormSubtype:
        form === "school-all-star-cheer" ? cheerSubtype : undefined,
      danceFormSubtype:
        form === "school-all-star-dance" ? danceSubtype : undefined,
      source: sourceFilter === "both" ? undefined : sourceFilter,
      search,
      // Status chips scope the board query (Assigned isn't on the first All
      // pages). Paint stays optimistic via keep-previous + client filter.
      range: search
        ? undefined
        : serializeOrdersRangeFilters(rangeFilters),
      sortBy: tableFilters.sortBy ?? "newest",
      excludeFlagged: true as boolean,
    };
  }, [
    form,
    cheerSubtype,
    danceSubtype,
    sourceFilter,
    searchQuery,
    rangeFilters,
    tableFilters.sortBy,
  ]);
  const {
    orders: boardOrders,
    counts: boardCounts,
    nextPageToken: boardNextPageToken,
    loading: boardLoading,
    loadingMore: boardLoadingMore,
    refreshing: boardRefreshing,
    countsReady: boardCountsReady,
    reload: reloadBoard,
    loadMore: loadMoreBoard,
  } = useOrdersBoard(boardQuery, { enabled: filtersReady });

  // Match pool is only for Move-to-MTD lookalikes — keep it off until the
  // board is quiet so Match/Flagged header warm owns the DB on click.
  const [matchPoolEnabled, setMatchPoolEnabled] = useState(false);
  useEffect(() => {
    if (boardLoading) {
      setMatchPoolEnabled(false);
      return;
    }
    const t = window.setTimeout(() => setMatchPoolEnabled(true), 4000);
    return () => window.clearTimeout(t);
  }, [boardLoading]);
  const { orders: matchPool } = useOrdersMatchPool({
    enabled: matchPoolEnabled,
    formType: form,
    cheerFormSubtype:
      form === "school-all-star-cheer" ? cheerSubtype : undefined,
    danceFormSubtype:
      form === "school-all-star-dance" ? danceSubtype : undefined,
  });

  const [validationModalRecord, setValidationModalRecord] = useState<MTDRecord | null>(null);
  const [matchBeforeMtd, setMatchBeforeMtd] = useState<{
    record: MTDRecord;
    suggestions: MatchBeforeMtdCandidate[];
  } | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [pricingFocusRecord, setPricingFocusRecord] = useState<MTDRecord | null>(
    null
  );
  const [recordPricingRecord, setRecordPricingRecord] =
    useState<MTDRecord | null>(null);
  const [pricingRevision, setPricingRevision] = useState(0);
  const [mailRecord, setMailRecord] = useState<MTDRecord | null>(null);
  const [mailRecipient, setMailRecipient] = useState<"producer" | "customer">(
    "producer"
  );
  const [addNewOrderOpen, setAddNewOrderOpen] = useState(false);
  const [orderFormRecord, setOrderFormRecord] = useState<MTDRecord | null>(null);
  const [orderFormRowId, setOrderFormRowId] = useState<number | null>(null);
  const [deleteOrderRecord, setDeleteOrderRecord] = useState<MTDRecord | null>(
    null
  );
  const [deletingOrder, setDeletingOrder] = useState(false);
  const [csvExportOpen, setCsvExportOpen] = useState(false);
  const [csvExportBusy, setCsvExportBusy] = useState(false);

  /** Extra orders fetched by id for modals (not on current page). */
  const [orderCache, setOrderCache] = useState<Order[]>([]);
  const ordersForUi = useMemo(() => {
    if (orderCache.length === 0 && matchPool.length === 0) return boardOrders;
    const map = new Map<string, Order>();
    for (const o of [...boardOrders, ...matchPool, ...orderCache]) {
      map.set(o.id, o);
    }
    return [...map.values()];
  }, [boardOrders, matchPool, orderCache]);

  const ensureOrderInCache = useCallback(
    async (id: string | null | undefined) => {
      if (!id) return null;
      const hit = ordersForUi.find(
        (o) => o.id === id || o.legacyId === id || o.uuid === id
      );
      if (hit) return hit;
      try {
        const order = await fetchOrderApi(id);
        setOrderCache((prev) =>
          prev.some((o) => o.id === order.id) ? prev : [...prev, order]
        );
        return order;
      } catch {
        return null;
      }
    },
    [ordersForUi]
  );

  // Optimistic saves also land on by-id fetched peers (matched Magento forms).
  useEffect(() => {
    const onPatch = (ev: Event) => {
      const detail = (
        ev as CustomEvent<{
          orderId?: string;
          patch?: Partial<Order>;
          deleted?: boolean;
        }>
      ).detail;
      const orderId = detail?.orderId;
      if (!orderId) return;
      const match = (o: Order) =>
        o.id === orderId || o.uuid === orderId || o.legacyId === orderId;
      if (detail?.deleted) {
        setOrderCache((prev) =>
          prev.some(match) ? prev.filter((o) => !match(o)) : prev
        );
        return;
      }
      const patch = detail?.patch;
      if (!patch) return;
      setOrderCache((prev) => {
        if (!prev.some(match)) return prev;
        return prev.map((o) => (match(o) ? { ...o, ...patch } : o));
      });
    };
    window.addEventListener(ORDERS_BOARD_PATCH_EVENT, onPatch);
    return () => window.removeEventListener(ORDERS_BOARD_PATCH_EVENT, onPatch);
  }, []);

  // Server-paged board (50/page) — never scan the full AppState order list.
  const preMtdRecords = useMemo(
    () => listPreMtdOrderRecords(boardOrders, mtdRecords),
    [boardOrders, mtdRecords]
  );

  const orderById = useMemo(() => {
    const map = new Map<string, Order>();
    for (const order of ordersForUi) {
      if (order.id) map.set(order.id, order);
      if (order.legacyId) map.set(order.legacyId, order);
      if (order.uuid) map.set(order.uuid, order);
    }
    return map;
  }, [ordersForUi]);

  const sourceFilteredRecords = useMemo(
    () => filterRecordsByOrderSource(preMtdRecords, sourceFilter, orderById),
    [preMtdRecords, sourceFilter, orderById]
  );

  const flaggedRecords = useMemo(
    () =>
      sourceFilteredRecords.filter((rec) =>
        recordHeldOnAffiliateFlag(rec, orderById)
      ),
    [sourceFilteredRecords, orderById]
  );

  /** Normal Orders board: multi-affiliate Magento holds stay on Flagged until Resolve. */
  const boardRecords = useMemo(
    () =>
      sourceFilteredRecords.filter(
        (rec) => !recordHeldOnAffiliateFlag(rec, orderById)
      ),
    [sourceFilteredRecords, orderById]
  );

  // Board API already scopes form + subtype. Re-filtering here wiped keepPreviousData
  // on form/subtype switches (old rows failed the new form check → "0 of N" empty flash).
  const categoryFilteredBoard = boardRecords;

  // Form/subtype "All" from chips — counts fetch is form-agnostic (no refetch on tab switch).
  const allOrdersCount = useMemo(
    () =>
      ordersActiveFormTotal(boardCounts, {
        formType: form,
        cheerFormSubtype:
          form === "school-all-star-cheer" ? cheerSubtype : undefined,
        danceFormSubtype:
          form === "school-all-star-dance" ? danceSubtype : undefined,
      }),
    [boardCounts, form, cheerSubtype, danceSubtype]
  );

  // Same Magento-merged SoT as Form data / Collections pills (avoids Complete↔Missing flicker).
  const requirementsRecordFor = useCallback(
    (rec: MTDRecord) => {
      const linked = findLinkedOrder(rec, ordersForUi);
      const finalized = linked
        ? resolveFinalMatchedOrder(linked, ordersForUi)
        : null;
      return mergeOrderFormFieldsForRequirements(rec, finalized);
    },
    [ordersForUi]
  );

  // Range badges: form maps capped by active subtype All (board is subtype-scoped).
  const rangeBadgeOpts = {
    formType: form,
    cheerFormSubtype:
      form === "school-all-star-cheer" ? cheerSubtype : undefined,
    danceFormSubtype:
      form === "school-all-star-dance" ? danceSubtype : undefined,
  };
  // Badges are fixed per-chip totals: selecting chips never changes them —
  // only data edits / assigns / new orders do. The pager shows the AND total.
  const chipTotal = (chip: OrderViewRangeFilter) =>
    ordersRangeTabTotal(boardCounts, chip, rangeBadgeOpts);
  const needToBeScheduledCount = chipTotal("need_to_be_scheduled");
  const newOrdersCount = needToBeScheduledCount;
  const assignedOrdersCount = chipTotal("assigned");
  const notAssignedOrdersCount = chipTotal("not_assigned");
  const reassignedOrdersCount = chipTotal("reassigned");
  const waitingForDataCount = chipTotal("waiting_for_data");

  /** Presence only — any open flag across forms (not the active form only). */
  const hasFlaggedOrders = boardCounts.flagged > 0;

  /**
   * Match needs manuals; Magento/form-only queues get no dot. Scoped to
   * match-eligible forms (Sports Ent / Anthem are Magento-only).
   */
  const hasMatchManuals = useMemo(() => {
    const byForm = boardCounts.manual_by_form_type ?? {};
    let n = 0;
    for (const tab of MANUAL_MATCH_FORM_TABS) {
      n += byForm[tab.id] ?? 0;
    }
    if (n > 0) return true;
    // Maps empty / not yet hydrated — fall back to board total manuals.
    if (Object.keys(byForm).length === 0) {
      return (boardCounts.manual ?? 0) > 0;
    }
    return false;
  }, [boardCounts.manual, boardCounts.manual_by_form_type]);

  /** Pager "of N" for the active chips (exact for combined chips too). */
  const boardTotalCount = useMemo(() => {
    // Search scopes rows the counts don't know about — loaded rows are the total.
    if (searchInput.trim()) return undefined;
    if (rangeFilters.length === 0) return allOrdersCount;
    return (
      ordersRangeFilterTotal(
        boardCounts,
        serializeOrdersRangeFilters(rangeFilters),
        {
          formType: form,
          cheerFormSubtype:
            form === "school-all-star-cheer" ? cheerSubtype : undefined,
          danceFormSubtype:
            form === "school-all-star-dance" ? danceSubtype : undefined,
        }
      ) ?? undefined
    );
  }, [
    searchInput,
    rangeFilters,
    allOrdersCount,
    boardCounts,
    form,
    cheerSubtype,
    danceSubtype,
  ]);

  const csvExportFilters = useMemo(() => {
    const lines: { label: string; value: string }[] = [];
    const formLabel =
      ORDER_FORM_TABS.find((tab) => tab.id === form)?.label ?? form;
    lines.push({ label: "Form", value: formLabel });

    if (form === "school-all-star-cheer" && cheerSubtype !== "all") {
      const subtypeLabel =
        CHEER_FORM_SUBTABS.find((tab) => tab.id === cheerSubtype)?.label ??
        cheerSubtype;
      lines.push({ label: "Subtype", value: subtypeLabel });
    } else if (form === "school-all-star-dance" && danceSubtype !== "all") {
      const subtypeLabel =
        DANCE_FORM_SUBTABS.find((tab) => tab.id === danceSubtype)?.label ??
        danceSubtype;
      lines.push({ label: "Subtype", value: subtypeLabel });
    }

    const sourceLabel =
      ORDER_SOURCE_OPTIONS.find((opt) => opt.id === sourceFilter)?.label ??
      "All orders";
    lines.push({ label: "Source", value: sourceLabel });

    const statusLabel =
      rangeFilters.length === 0
        ? "All"
        : rangeFilters
            .map((id) => ORDERS_CSV_RANGE_LABELS[id] ?? id)
            .join(" + ");
    lines.push({ label: "Status", value: statusLabel });

    const search = searchQuery.trim();
    if (search) {
      lines.push({ label: "Search", value: search });
    }

    return lines;
  }, [
    form,
    cheerSubtype,
    danceSubtype,
    sourceFilter,
    rangeFilters,
    searchQuery,
  ]);

  // Alert when a row changes Orders status tab so it doesn't look like it vanished.
  // Debounce so SSE/optimistic Complete↔Missing races do not spam or "disappear" rows.
  const ordersTabByIdRef = useRef<Map<string, OrdersRangeTabLabel> | null>(
    null
  );
  const ordersTabPendingRef = useRef<Map<
    string,
    { from: OrdersRangeTabLabel; to: OrdersRangeTabLabel }
  > | null>(null);
  useEffect(() => {
    if (isLoading) return;
    const next = new Map<string, OrdersRangeTabLabel>();
    for (const rec of categoryFilteredBoard) {
      next.set(rec.id, getOrdersRangeTabLabel(requirementsRecordFor(rec)));
    }
    const prev = ordersTabByIdRef.current;
    if (prev === null) {
      ordersTabByIdRef.current = next;
      return;
    }

    const pending =
      ordersTabPendingRef.current ??
      new Map<string, { from: OrdersRangeTabLabel; to: OrdersRangeTabLabel }>();
    for (const rec of categoryFilteredBoard) {
      const to = next.get(rec.id);
      const from = prev.get(rec.id);
      if (!to || !from || from === to) {
        pending.delete(rec.id);
        continue;
      }
      const existing = pending.get(rec.id);
      pending.set(rec.id, {
        from: existing?.from ?? from,
        to,
      });
    }
    // Drop ids that left this category board.
    for (const id of [...pending.keys()]) {
      if (!next.has(id)) pending.delete(id);
    }
    ordersTabPendingRef.current = pending;
    ordersTabByIdRef.current = next;

    const timer = window.setTimeout(() => {
      const settled = ordersTabPendingRef.current;
      ordersTabPendingRef.current = null;
      if (!settled || settled.size === 0) return;
      const latest = ordersTabByIdRef.current;
      for (const rec of categoryFilteredBoard) {
        const change = settled.get(rec.id);
        if (!change) continue;
        // Only toast if the settled label still matches the pending "to".
        let to = latest?.get(rec.id) ?? change.to;
        if (to !== change.to) continue;
        if (to === change.from) continue;
        if (
          change.from === "Assigned" &&
          to !== "Assigned" &&
          to !== "Reassign"
        ) {
          to = "Not assigned";
        }
        // Dedicated flows already toast these (Move to Orders / Assign).
        // Emitting again stacked "Moved to Reassign" + "Producer assigned" +
        // "Moved to Assigned" on every MTD ↔ Orders round-trip.
        if (
          (change.from === "Assigned" && to === "Reassign") ||
          (change.from === "Reassign" && to === "Assigned") ||
          (change.from === "Reassign" && to === "Not assigned") ||
          (change.from === "Not assigned" && to === "Assigned")
        ) {
          continue;
        }
        const name =
          titleCase(rec.programName || "").trim() ||
          titleCase(rec.contactName || "").trim() ||
          "Order";
        addAlert({
          tone: "info",
          title: `Moved to ${to}`,
          message: `${name} left ${change.from} and is now under ${to}.`,
          href: `/orders?range=${ordersRangeTabToFilter(to)}`,
        });
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [categoryFilteredBoard, isLoading, addAlert, requirementsRecordFor]);

  // Range/form/source already applied by /orders/board — do not re-filter with
  // getOrderRequirements here (that disagreed with needs_attention and wiped rows).
  const typeFilteredPreMtdRecords = categoryFilteredBoard;

  // Form / subtype dropdown counts: page rows + server by_form overlays.
  const formCountRecords = boardRecords;

  const scheduleIdle = useCallback((run: () => void) => {
    if (
      typeof window !== "undefined" &&
      typeof window.requestIdleCallback === "function"
    ) {
      window.requestIdleCallback(() => run(), { timeout: 900 });
    } else {
      window.setTimeout(run, 0);
    }
  }, []);

  /** Route + data warm on pointerdown — must start now (idle loses to navigation). */
  const warmFlaggedData = useCallback(() => {
    router.prefetch("/orders/flagged");
    void prefetchOrdersBoard({
      range: "flagged",
      excludeFlagged: false,
      sortBy: "newest",
    });
  }, [router]);

  const warmMatchData = useCallback(() => {
    // Overlap route + match pool with the click (same idea as sidebar boards).
    router.prefetch("/orders/match");
    void prefetchOrdersMatchData({
      formType: form,
      cheerFormSubtype:
        form === "school-all-star-cheer" ? cheerSubtype : undefined,
      danceFormSubtype:
        form === "school-all-star-dance" ? danceSubtype : undefined,
    });
  }, [router, form, cheerSubtype, danceSubtype]);

  const warmBoardQuery = useCallback(
    (patch: {
      formType?: OrderFormType;
      cheerFormSubtype?: string;
      danceFormSubtype?: string;
      range?: string;
    }) => {
      const nextForm = patch.formType ?? form;
      const search = searchQuery.trim() || undefined;
      const nextRange =
        patch.range ?? serializeOrdersRangeFilters(rangeFilters);
      const run = () => {
        void prefetchOrdersBoard({
          formType: nextForm,
          cheerFormSubtype:
            patch.cheerFormSubtype !== undefined
              ? patch.cheerFormSubtype || undefined
              : nextForm === "school-all-star-cheer"
                ? cheerSubtype
                : undefined,
          danceFormSubtype:
            patch.danceFormSubtype !== undefined
              ? patch.danceFormSubtype || undefined
              : nextForm === "school-all-star-dance"
                ? danceSubtype
                : undefined,
          source: sourceFilter === "both" ? undefined : sourceFilter,
          search,
          range: search ? undefined : nextRange,
          sortBy: tableFilters.sortBy ?? "newest",
          excludeFlagged: true,
        });
      };
      // Range/form pointerdown must start fetch now — idle callback loses the race.
      if (patch.range != null || patch.formType != null) {
        run();
        return;
      }
      scheduleIdle(run);
    },
    [
      form,
      cheerSubtype,
      danceSubtype,
      sourceFilter,
      searchQuery,
      rangeFilters,
      tableFilters.sortBy,
      scheduleIdle,
    ]
  );

  const goToMatchPage = useCallback((opts?: {
    manualId?: string;
    formId?: string;
  }) => {
    saveOrdersViewState({
      form,
      cheerSubtype,
      danceSubtype,
      rangeFilters,
      rangeFilter,
      sourceFilter,
      searchQuery,
      tableFilters,
    });
    const params = new URLSearchParams();
    if (opts?.manualId) params.set("manual", opts.manualId);
    if (opts?.formId) params.set("form", opts.formId);
    const qs = params.toString();
    router.push(qs ? `/orders/match?${qs}` : "/orders/match");
  }, [
    router,
    form,
    cheerSubtype,
    danceSubtype,
    rangeFilters,
    rangeFilter,
    sourceFilter,
    searchQuery,
    tableFilters,
  ]);

  const openAssignPage = useCallback(
    (rec: MTDRecord) => {
      const recordId = rec.id;
      const linked = findLinkedOrder(rec, ordersForUi);
      // Board row is not in AppState — seed so Assign paints before fetch.
      seedAssignPage(recordId, rec, linked ?? null);
      if (linked?.id && linked.id !== recordId) {
        seedAssignPage(linked.id, rec, linked);
      }
      void import("@/components/mtd/AssignEditorModal");
      const viewState = {
        form,
        cheerSubtype,
        danceSubtype,
        rangeFilters,
        rangeFilter,
        sourceFilter,
        searchQuery,
        tableFilters,
      };
      saveOrdersViewState(viewState);
      const returnTo = buildOrdersReturnHref(viewState);
      const href = `/orders/${recordId}/assign?return=${encodeURIComponent(returnTo)}`;
      router.push(href);
    },
    [
      router,
      ordersForUi,
      form,
      cheerSubtype,
      danceSubtype,
      rangeFilters,
      rangeFilter,
      sourceFilter,
      searchQuery,
      tableFilters,
    ]
  );

  const warmAssignPage = useCallback(
    (rec: MTDRecord) => {
      const linked = findLinkedOrder(rec, ordersForUi);
      seedAssignPage(rec.id, rec, linked ?? null);
      if (linked?.id && linked.id !== rec.id) {
        seedAssignPage(linked.id, rec, linked);
      }
      router.prefetch(`/orders/${rec.id}/assign`);
      // Warm the heavy assign chunk before click (route prefetch alone is not enough).
      void import("@/components/mtd/AssignEditorModal");
    },
    [ordersForUi, router]
  );

  // Idle-preload Assign so the first Assign click is not a cold JS parse.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const warm = () => {
      void import("@/components/mtd/AssignEditorModal");
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(warm, 800);
    return () => window.clearTimeout(t);
  }, []);

  const { isViewOnly } = useAppState();

  const commitMoveToMTD = useCallback(
    (rec: MTDRecord) => {
      const linkedOrder = findLinkedOrder(rec, ordersForUi);
      const covering = mtdRecords.find(
        (r) =>
          r.id === rec.id ||
          r.orderId === rec.orderId ||
          r.orderId === rec.id ||
          (linkedOrder &&
            (r.orderId === linkedOrder.id ||
              r.orderId === linkedOrder.uuid ||
              r.id === linkedOrder.mtdId))
      );
      const keptInvoice =
        (rec.invoice || "").trim() ||
        (covering?.invoice || "").trim() ||
        (linkedOrder?.invoice || "").trim();
      const seedBase = covering || rec;
      const meta = resolveMTDFormMeta(seedBase, orderById);
      const seed: MTDRecord = {
        ...seedBase,
        formType: seedBase.formType || meta.formType,
        cheerFormSubtype:
          seedBase.cheerFormSubtype || meta.cheerFormSubtype,
        danceFormSubtype:
          seedBase.danceFormSubtype || meta.danceFormSubtype,
        createdAt:
          seedBase.createdAt ||
          linkedOrder?.createdAt ||
          readOrdersBoardOrder(linkedOrder?.id || rec.orderId || rec.id)
            ?.createdAt ||
          null,
      };
      updateMTD(
        covering?.id || rec.id,
        {
          inMTD: true,
          isReassigned: false,
          orderStatus: "",
          status: "active",
          recordStatus: "Ongoing",
          mixStartDate: rec.mixStartDate,
          mixEndDate: rec.mixEndDate,
          assignedProducer: rec.assignedProducer,
          formType: seed.formType,
          cheerFormSubtype: seed.cheerFormSubtype,
          danceFormSubtype: seed.danceFormSubtype,
          // Omit empty invoice so mtd_records SoT is never wiped on return.
          ...(keptInvoice ? { invoice: keptInvoice } : {}),
        },
        seed
      );
      // Stay on Orders — toast only (same as Move to Payroll from MTD).
    },
    [mtdRecords, ordersForUi, orderById, updateMTD]
  );

  const handleMoveToMTD = useCallback(
    (rec: MTDRecord, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isViewOnly) return;

      const linkedOrder = findLinkedOrder(rec, ordersForUi);
      const finalized = linkedOrder
        ? resolveFinalMatchedOrder(linkedOrder, ordersForUi)
        : null;
      const reqSource = finalized
        ? mergeOrderFormFieldsForRequirements(rec, finalized)
        : rec;

      // Manuals must Match Orders first. Soft-gate when lookalike forms exist.
      if (linkedOrder && unmatchedManualNeedsMagentoMatch(linkedOrder)) {
        const suggestions = matchCandidatesBeforeMtd(linkedOrder, matchPool);
        if (suggestions.length > 0) {
          setMatchBeforeMtd({ record: rec, suggestions });
          return;
        }
        setValidationModalRecord(rec);
        return;
      }

      if (
        linkedOrder &&
        getOrderFormFieldsBlockingMtd(linkedOrder, ordersForUi).length > 0
      ) {
        setValidationModalRecord(rec);
        return;
      }

      if (
        !isOrderScheduledAndAssigned(rec) ||
        getOrderStatus(reqSource).missingCount > 0
      ) {
        setValidationModalRecord(rec);
        return;
      }

      const assigned =
        getDisplayAssignedProducer(rec) || rec.assignedProducer?.trim() || "";
      const sentTo = rec.producerEmailSentTo?.trim() || "";
      const producerMailOk =
        Boolean(rec.producerEmailSentAt) &&
        Boolean(assigned) &&
        Boolean(sentTo) &&
        producerKeysMatch(assigned, sentTo);
      if (!producerMailOk) {
        setValidationModalRecord(rec);
        return;
      }

      commitMoveToMTD(rec);
    },
    [isViewOnly, boardOrders, matchPool, commitMoveToMTD]
  );

  useEffect(() => {
    const bump = () => setPricingRevision((n) => n + 1);
    window.addEventListener(PRICING_REFERENCE_CHANGED_EVENT, bump);
    return () =>
      window.removeEventListener(PRICING_REFERENCE_CHANGED_EVENT, bump);
  }, []);

  const openPricingModal = useCallback((rec: MTDRecord, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPricingFocusRecord(rec);
    setPricingOpen(true);
  }, []);

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
          : preMtdRecords.find((r) => r.id === recordId) ??
            mtdRecords.find((r) => r.id === recordId);
      if (!rec) return;
      const order = findLinkedOrder(rec, ordersForUi);
      const meta = resolveMTDFormMeta(rec, orderById);
      const fullPatch = buildRecordPriceSavePatch(
        rec,
        order,
        patch.price,
        patch.priceCompliance,
        meta,
        orderById
      );
      if (order) {
        await updateOrder(order.id, fullPatch);
      } else {
        await updateMTD(rec.id, fullPatch);
      }
    },
    [
      isViewOnly,
      recordPricingRecord,
      preMtdRecords,
      mtdRecords,
      boardOrders,
      orderById,
      updateOrder,
      updateMTD,
    ]
  );

  const pricingFocusOrder = useMemo(
    () =>
      pricingFocusRecord
        ? findLinkedOrder(pricingFocusRecord, ordersForUi)
        : undefined,
    [pricingFocusRecord, ordersForUi]
  );

  const recordPricingOrder = useMemo(
    () =>
      recordPricingRecord
        ? findLinkedOrder(recordPricingRecord, ordersForUi)
        : null,
    [recordPricingRecord, ordersForUi]
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

  // Filtered dataset for table. Form/subtype stay on the server board query —
  // re-applying them here wiped keepPreviousData rows on every Form/Hip Hop switch.
  const tableFiltered = useMemo(
    () =>
      filterMTDRecords(typeFilteredPreMtdRecords, {
        packageTier: tableFilters.packageTier,
        timeLimit: tableFilters.timeLimit,
        split: tableFilters.split,
        assignedProducer: tableFilters.assignedProducer,
        requestedProducer: tableFilters.requestedProducer,
        dateFilter: tableFilters.dateFilter,
        scheduleFilter: tableFilters.scheduleFilter,
        infoFilter: tableFilters.infoFilter ?? "all",
        orderById,
        producers,
      }),
    [typeFilteredPreMtdRecords, tableFilters, orderById, producers]
  );

  const filtered = useMemo(() => {
    // Instant client filter (search-like) while the ranged board fetch catches up.
    // Assignment chips use the row SoT; Complete/Missing use Magento-merged pills.
    let rows = tableFiltered;
    if (rangeFilters.length > 0) {
      rows = rows.filter((rec) => {
        const reqRec = requirementsRecordFor(rec);
        return rangeFilters.every((rf) => {
          if (
            rf === "assigned" ||
            rf === "not_assigned" ||
            rf === "reassigned" ||
            rf === "reassign_leave" ||
            rf === "reassign_rush"
          ) {
            return orderMatchesOrdersRangeFilter(rec, rf);
          }
          return orderMatchesOrdersRangeFilter(reqRec, rf);
        });
      });
    }
    const q = searchInput.trim();
    const searched = q
      ? rows.filter((rec) => {
          const linked =
            (rec.orderId && orderById.get(rec.orderId)) ||
            orderById.get(rec.id) ||
            null;
          return matchesMTDSearch(rec, q, linked);
        })
      : rows;
    const sorted = sortMTDRecordsBySortKey(
      searched,
      tableFilters.sortBy ?? "newest",
      producers,
      orderById
    );
    // Moved-back (reassigned) orders pin to the top of the list.
    return [...sorted].sort((a, b) => {
      const aRe = a.isReassigned ? 1 : 0;
      const bRe = b.isReassigned ? 1 : 0;
      return bRe - aRe;
    });
  }, [
    tableFiltered,
    rangeFilters,
    requirementsRecordFor,
    searchInput,
    tableFilters.sortBy,
    producers,
    orderById,
  ]);

  /** CSV respects active status chips (server AND) even though the table filters locally. */
  const confirmExportFilteredOrdersCsv = useCallback(() => {
    setCsvExportBusy(true);
    void downloadOrdersBoardCsv({
      ...boardQuery,
      range: serializeOrdersRangeFilters(rangeFilters),
    })
      .then(() => setCsvExportOpen(false))
      .catch(() => {
        /* user can retry */
      })
      .finally(() => setCsvExportBusy(false));
  }, [boardQuery, rangeFilters]);

  // Form / subtype menu chips: server totals only. Mixing page-local rows
  // zeroed other forms on every tab switch (184↔0↔185 flicker).
  const formCounts = useMemo(() => {
    return (boardCounts.by_form_type || {}) as Record<OrderFormType, number>;
  }, [boardCounts.by_form_type]);

  const cheerSubtypeCounts = useMemo(() => {
    return (boardCounts.by_cheer_form_subtype || {}) as Record<
      CheerFormSubtypeFilter,
      number
    >;
  }, [boardCounts.by_cheer_form_subtype]);

  const danceSubtypeCounts = useMemo(() => {
    return (boardCounts.by_dance_form_subtype || {}) as Record<
      DanceFormSubtypeFilter,
      number
    >;
  }, [boardCounts.by_dance_form_subtype]);

  // Form / subtype switches always land on All — don't keep Complete+Assigned
  // (or any chip combo) from the previous tab when the new one has 0 there.
  const resetRangeToAll = useCallback(() => {
    setRangeFilters([]);
  }, []);

  const switchCheerSubtype = useCallback(
    (next: CheerFormSubtypeFilter) => {
      if (next !== cheerSubtype) resetRangeToAll();
      setCheerSubtype(next);
    },
    [cheerSubtype, resetRangeToAll, setCheerSubtype]
  );

  const switchDanceSubtype = useCallback(
    (next: DanceFormSubtypeFilter) => {
      if (next !== danceSubtype) resetRangeToAll();
      setDanceSubtype(next);
    },
    [danceSubtype, resetRangeToAll, setDanceSubtype]
  );

  // Land on a subtype that actually has rows (POM default is often empty).
  const switchForm = useCallback(
    (next: OrderFormType) => {
      resetRangeToAll();
      setForm(next);
      if (next === "school-all-star-cheer") {
        const nextCheer =
          CHEER_FORM_SUBTABS.find((t) => (cheerSubtypeCounts[t.id] ?? 0) > 0)
            ?.id ?? DEFAULT_CHEER_SUBTYPE;
        setCheerSubtype(nextCheer);
        setDanceSubtype(DEFAULT_DANCE_SUBTYPE);
        return;
      }
      if (next === "school-all-star-dance") {
        const nextDance =
          DANCE_FORM_SUBTABS.find((t) => (danceSubtypeCounts[t.id] ?? 0) > 0)
            ?.id ?? DEFAULT_DANCE_SUBTYPE;
        setDanceSubtype(nextDance);
        setCheerSubtype(DEFAULT_CHEER_SUBTYPE);
        return;
      }
      setCheerSubtype(DEFAULT_CHEER_SUBTYPE);
      setDanceSubtype(DEFAULT_DANCE_SUBTYPE);
    },
    [
      resetRangeToAll,
      setForm,
      setCheerSubtype,
      setDanceSubtype,
      cheerSubtypeCounts,
      danceSubtypeCounts,
    ]
  );

  // Prefetch Match/Flagged route chunks only (cheap JS). Data warms on
  // pointerdown of those buttons — not idle after every Orders visit.
  useEffect(() => {
    router.prefetch("/orders/match");
    router.prefetch("/orders/flagged");
  }, [router]);

  // Idle-warm MTD counts so the next sidebar hop feels ready (counts only).
  useEffect(() => {
    if (boardLoading) return;
    return idlePrefetchSiblingBoard("orders");
  }, [boardLoading]);

  // Default form is Cheer; demo/live boards often only have Dance/Anthem.
  // Once per load (when URL doesn't pin ?form=), land on a form that has rows.
  // Skip when session already restored a form (filtersReady + stored preference).
  const didAutoSelectForm = useRef(false);
  useEffect(() => {
    // Prefer board counts over waiting on full AppState bootstrap (isLoading).
    if (didAutoSelectForm.current || !filtersReady) return;
    if (!boardCountsReady && isLoading) return;
    if (formParam && validOrderForms.includes(formParam as OrderFormType)) {
      didAutoSelectForm.current = true;
      return;
    }
    // Respect last-used form/subtype from session — don't bounce to another tab.
    if (typeof window !== "undefined" && sessionStorage.getItem("slt_orders_form")) {
      didAutoSelectForm.current = true;
      return;
    }
    if (formCountRecords.length === 0) return;
    if ((formCounts[form] ?? 0) > 0) {
      didAutoSelectForm.current = true;
      return;
    }
    const nextForm = validOrderForms.find((id) => (formCounts[id] ?? 0) > 0);
    if (!nextForm) {
      didAutoSelectForm.current = true;
      return;
    }
    switchForm(nextForm);
    if (nextForm === "school-all-star-dance") {
      const danceTabs: DanceFormSubtypeFilter[] = [
        "pom",
        "hip-hop",
        "team-performance-variety",
        "gameday",
        "jazz-kick",
      ];
      const nextDance =
        danceTabs.find((id) => (danceSubtypeCounts[id] ?? 0) > 0) ??
        DEFAULT_DANCE_SUBTYPE;
      setDanceSubtype(nextDance);
    }
    if (nextForm === "school-all-star-cheer") {
      const cheerTabs: CheerFormSubtypeFilter[] = [
        "all-star-cheer",
        "school-cheer-viroc-yes",
        "school-cheer-viroc-no",
        "youth-rec-cheer",
      ];
      const nextCheer =
        cheerTabs.find((id) => (cheerSubtypeCounts[id] ?? 0) > 0) ??
        DEFAULT_CHEER_SUBTYPE;
      setCheerSubtype(nextCheer);
    }
    didAutoSelectForm.current = true;
  }, [
    isLoading,
    boardCountsReady,
    filtersReady,
    formParam,
    formCountRecords.length,
    formCounts,
    form,
    danceSubtypeCounts,
    cheerSubtypeCounts,
    switchForm,
    setDanceSubtype,
    setCheerSubtype,
  ]);

  // Status chips filter client-side — leave them out of resetKey so toggling
  // doesn't remount the table / flash a loading empty state.
  const tableFilterKey = [
    sourceFilter,
    tableFilters.packageTier,
    tableFilters.timeLimit,
    tableFilters.split,
    tableFilters.assignedProducer,
    tableFilters.requestedProducer,
    tableFilters.scheduleFilter,
    tableFilters.infoFilter,
    tableFilters.dateFilter.type,
    tableFilters.sortBy,
    String(tableFilters.dateFilter.value),
    searchQuery,
  ].join("-");

  // Table columns aligned with MTD layout and styling
  const columns: Column<MTDRecord>[] = useMemo(() => {
    const showMusicAffiliate =
      form === "school-all-star-cheer" || form === "school-all-star-dance";
    const showCouponCode = formSupportsCouponCode(form);
    // Magento / New Order: no Requested Editor on Anthem, Sports, Band, Youth Rec.
    const showFormProducer = formHasRequestedProducer(
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
          <span className="tabular-nums text-[12px] text-brand-ink">{index + 1}</span>
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
        render: (rec) => {
          const linked = findLinkedOrder(rec, ordersForUi);
          const stamp =
            linked?.createdAt ||
            rec.createdAt ||
            (rec.orderId
              ? readOrdersBoardOrder(rec.orderId)?.createdAt
              : null) ||
            readOrdersBoardOrder(rec.id)?.createdAt ||
            "";
          return (
            <span className="tabular-nums text-[11px] text-brand-ink-secondary whitespace-nowrap">
              {formatDisplayDateTime(stamp)}
            </span>
          );
        },
      },
      {
        key: "orderSource",
        header: "Source",
        width: "72px",
        align: "center" as const,
        nowrap: true,
        cellClassName: compactCellClass,
        headerClassName: compactHeaderClass,
        render: (rec) => {
          const isManual = isManualOrderRecord(rec, orderById);
          const badge = (
            <span
              className={clsx(
                "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none",
                isManual
                  ? "border border-brand-orange/35 bg-brand-orange/10 text-brand-orange-deep"
                  : "border border-brand-blue/30 bg-brand-blue-soft/70 text-brand-signature"
              )}
            >
              {isManual ? "Manual" : "Form"}
            </span>
          );
          if (!isManual) return badge;
          return (
            <HoverTip
              label="Becomes Form once you match it with a Magento form in Match Orders"
              placement="top"
            >
              {badge}
            </HoverTip>
          );
        },
      },
      {
        key: "contact",
        header: contactHeader,
        width: contactHeader.length > 14 ? "150px" : "100px",
        align: "left" as const,
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
          const linked = findLinkedOrder(rec, ordersForUi);
          const name = titleCase(
            getOrderContactPersonName(
              linked || orderFromMTDRecord(rec),
              rec.contactName,
              rec.programName
            )
          ).trim();
          return (
            <TruncatedText
              text={name || "No data"}
              className={clsx(
                "w-full min-w-0 text-left",
                compactTextClass,
                !name && "text-brand-ink-tertiary"
              )}
              style={{ maxWidth: "100%" }}
            />
          );
        },
      },
      {
        key: "program",
        header: programHeader,
        width: programHeader.length > 14 ? "150px" : "100px",
        align: "left" as const,
        nowrap: false,
        cellClassName: clsx(
          compactCellClass,
          programHeader.length > 14 ? "max-w-[150px]" : "max-w-[100px]"
        ),
        headerClassName: clsx(compactHeaderClass, "whitespace-normal leading-tight"),
        render: (rec) => {
          const linked = findLinkedOrder(rec, ordersForUi);
          const identityOrder = linked || orderFromMTDRecord(rec);
          // Same value as the edit-form identity field (Gym Name / School Name / …).
          const name = getOrderIdentityName(identityOrder).trim();
          return (
            <TruncatedText
              text={name || "No data"}
              className={clsx(
                "w-full min-w-0 text-left",
                compactTextClass,
                !name && "text-brand-ink-tertiary"
              )}
              style={{ maxWidth: "100%" }}
            />
          );
        },
      },
      {
        key: "package",
        header: "Package type",
        width: "100px",
        align: "center" as const,
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[100px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => {
          const linked = findLinkedOrder(rec, ordersForUi);
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
              key: "limit",
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
                const linked = findLinkedOrder(rec, ordersForUi);
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
              key: "split",
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
              key: "musicAffiliate",
              header: "Music Affiliate",
              width: "120px",
              align: "center" as const,
              nowrap: false,
              cellClassName: clsx(compactCellClass, "max-w-[120px]"),
              headerClassName: compactHeaderClass,
              render: (rec: MTDRecord) => {
                const linked = findLinkedOrder(rec, ordersForUi);
                const display = formatMusicAffiliateDisplay(linked, rec);
                if (!display) {
                  return (
                    <span className={clsx("mx-auto block text-center text-brand-ink-tertiary", compactTextClass)}>
                      No data
                    </span>
                  );
                }

                const invalidMulti = isInvalidMultiAffiliateSelection(
                  linked,
                  rec
                );

                return (
                  <TruncatedText
                    text={
                      invalidMulti
                        ? display
                        : titleCase(display)
                    }
                    className={clsx(
                      "mx-auto w-full min-w-0 text-center font-medium",
                      compactTextClass,
                      invalidMulti && "text-rose-600"
                    )}
                    style={{ maxWidth: "100%" }}
                  />
                );
              },
            },
          ]
        : []),
      // Form song list text is edit-modal / Songs pill only: not a board column.
      {
        key: "packagePrice",
        header: "Package Price",
        width: "110px",
        align: "center" as const,
        nowrap: false,
        cellClassName: "!px-2",
        headerClassName: "!px-2",
        render: (rec) => {
          const order = findLinkedOrder(rec, ordersForUi);
          const meta = resolveMTDFormMeta(rec, orderById);
          const engineCustomerPrice = resolveEngineCustomerPrice(
            rec,
            order,
            meta,
            orderById
          );
          const needsManualQuote = orderNeedsManualPackageQuote(meta, order, {
            customerFacingPrice: engineCustomerPrice,
            payrollBasePrice: null,
          });

          const displayPrice = resolveOrderPackageDisplayPrice(
            rec,
            order,
            meta,
            orderById
          );

          // Unpriced SoftSelect packages (SE OTHER / School Cheer Other mix)
          // get a per-order quote. Catalog-priced packages open Pricing.
          if (needsManualQuote) {
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
                const linked = findLinkedOrder(rec, ordersForUi);
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
        key: "collections",
        header: "Collections",
        width: "140px",
        align: "center" as const,
        nowrap: false,
        cellClassName: clsx(compactCellClass, "min-w-[140px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => <OrderRequirementsCell record={rec} category="collections" />,
      },
      {
        key: "songsArea",
        header: "Songs",
        width: "130px",
        align: "center" as const,
        nowrap: false,
        cellClassName: clsx(compactCellClass, "min-w-[130px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => <OrderRequirementsCell record={rec} category="songs" />,
      },
      {
        key: "dataStatus",
        header: "Form data",
        width: "130px",
        align: "center" as const,
        nowrap: false,
        cellClassName: compactCellClass,
        headerClassName: compactHeaderClass,
        render: (rec: MTDRecord) => <OrderDataStatusBadge record={rec} />,
      },
      ...(showFormProducer
        ? [
            {
              key: "requestedEditor",
              header: "Requested\nproducer",
              width: "100px",
              align: "center" as const,
              nowrap: false,
              cellClassName: clsx(compactCellClass, "max-w-[100px]"),
              headerClassName: clsx(
                compactHeaderClass,
                "whitespace-pre-line leading-tight"
              ),
              render: (rec: MTDRecord) => {
                const linked = findLinkedOrder(rec, ordersForUi);
                const label = formatRequestedEditorLabel(rec, producers, linked);
                if (!label.trim()) {
                  return (
                    <span
                      className={clsx(
                        "font-medium text-brand-ink-tertiary",
                        compactTextClass
                      )}
                    >
                      -
                    </span>
                  );
                }
                const isFa = label === "First Available";

                return (
                  <span
                    className={clsx(
                      "font-medium",
                      compactTextClass,
                      isFa ? "text-brand-info" : "text-brand-ink"
                    )}
                  >
                    {label}
                  </span>
                );
              },
            } satisfies Column<MTDRecord>,
          ]
        : []),
      {
        key: "editor",
        header: "Assigned producer",
        width: "130px",
        align: "center" as const,
        nowrap: true,
        cellClassName: clsx(compactCellClass, "max-w-[130px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => {
          const { needsReassign, reassignReason } = getOrderStatus(rec);
          const awaitingReassign =
            needsReassign || Boolean(rec.isReassigned);
          const assigned = awaitingReassign
            ? null
            : getDisplayAssignedProducer(rec);
          const producer = assigned
            ? findProducerByAssignmentKey(assigned, producers)
            : undefined;
          // Assign is always available (missing data does not block).
          const assignLabel =
            awaitingReassign ||
            isOrdersRangeFilterActive(rangeFilters, "reassigned")
              ? "Reassign"
              : "Assign";
          const reassignReasonLabel =
            needsReassign && reassignReason
              ? ORDER_RESELECTION_REASON_LABEL[reassignReason]
              : null;

          return (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              {assigned ? (
                <button
                  type="button"
                  onMouseEnter={() => warmAssignPage(rec)}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    warmAssignPage(rec);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openAssignPage(rec);
                  }}
                  title="Assign producer"
                  aria-label={`Assign producer for ${assigned}`}
                  className={clsx(
                    clickableChipClass,
                    "inline-flex items-center rounded-full p-0.5"
                  )}
                >
                  <Avatar producer={producer} initials={assigned} size="xs" />
                </button>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <HoverTip
                    label={
                      reassignReasonLabel
                        ? `${assignLabel}: ${reassignReasonLabel}`
                        : assignLabel
                    }
                    placement="top"
                  >
                    <button
                      type="button"
                      onMouseEnter={() => warmAssignPage(rec)}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        warmAssignPage(rec);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openAssignPage(rec);
                      }}
                      className={actionButtonClass(false, false)}
                      aria-label={
                        reassignReasonLabel
                          ? `${assignLabel}: ${reassignReasonLabel}`
                          : assignLabel
                      }
                    >
                      {assignLabel}
                    </button>
                  </HoverTip>
                  {reassignReasonLabel ? (
                    <span className="max-w-[110px] text-center text-[9px] font-medium leading-tight text-brand-ink-tertiary">
                      {reassignReasonLabel}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: "mixStartDate",
        header: "Mix start\ndate",
        width: "120px",
        align: "center" as const,
        nowrap: false,
        cellClassName: "!px-1.5 !py-1.5",
        headerClassName: "!px-1.5 whitespace-pre-line leading-tight",
        render: (rec) => {
          const needsReassign = Boolean(rec.isReassigned);
          const startIso =
            !needsReassign && rec.assignedProducer
              ? toIsoDateString(rec.mixStartDate)
              : "";
          const placeholder = "Assign producer";
          return (
            <span
              className={clsx(
                "mx-auto block whitespace-nowrap text-center tabular-nums text-[12px] font-medium",
                startIso ? "text-brand-ink" : "text-brand-ink-tertiary"
              )}
            >
              {startIso ? formatDisplayDate(startIso) : placeholder}
            </span>
          );
        },
      },
      {
        key: "mixEndDate",
        header: "Mix due\ndate",
        width: "120px",
        align: "center" as const,
        nowrap: false,
        cellClassName: "!px-1.5 !py-1.5",
        headerClassName: "!px-1.5 whitespace-pre-line leading-tight",
        render: (rec) => {
          const needsReassign = Boolean(rec.isReassigned);
          const endIso =
            !needsReassign && rec.assignedProducer
              ? toIsoDateString(rec.mixEndDate ?? "")
              : "";
          const placeholder = "Assign producer";
          return (
            <span
              className={clsx(
                "mx-auto block whitespace-nowrap text-center tabular-nums text-[12px] font-medium",
                endIso ? "text-brand-ink" : "text-brand-ink-tertiary"
              )}
            >
              {endIso ? formatDisplayDate(endIso) : placeholder}
            </span>
          );
        },
      },
      {
        key: "daysBooked",
        header: "Booked days",
        width: "120px",
        align: "center" as const,
        nowrap: true,
        cellClassName: clsx(compactCellClass, "max-w-[120px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => {
          const label =
            !rec.isReassigned &&
            rec.assignedProducer &&
            toIsoDateString(rec.mixStartDate) &&
            toIsoDateString(rec.mixEndDate ?? "")
              ? formatMixBookedDaysLabel(
                  rec.mixStartDate,
                  rec.mixEndDate,
                  mixWorkDaysForRecord(rec, producers)
                )
              : "Assign producer";
          const booked = label !== "Assign producer";
          return (
            <span
              className={clsx(
                "mx-auto block whitespace-nowrap text-center text-[12px] font-medium",
                booked ? "text-brand-ink" : "text-brand-ink-tertiary"
              )}
            >
              {label}
            </span>
          );
        },
      },
      {
        key: "reassignStatus",
        header: "Assignment status",
        width: "150px",
        align: "center" as const,
        nowrap: false,
        cellClassName: compactCellClass,
        headerClassName: compactHeaderClass,
        render: (rec: MTDRecord) => (
          <OrderAssignmentStatusBadge record={rec} />
        ),
      },
      {
        key: "rushOrder",
        header: "Rush\norder",
        width: "72px",
        align: "center" as const,
        nowrap: true,
        cellClassName: compactCellClass,
        headerClassName: clsx(compactHeaderClass, "whitespace-pre-line leading-tight"),
        render: (rec: MTDRecord) => {
          const linked = findLinkedOrder(rec, ordersForUi);
          const rushSource = linked
            ? { ...rec, ...linked, formType: linked.formType || rec.formType }
            : rec;
          const isRush = recordIsRushOrder(rushSource);
          const isSportsEnt =
            String(rushSource.formType || "").toLowerCase().includes("sports") ||
            String(rushSource.category || "")
              .toLowerCase()
              .includes("sports");
          return (
            <div
              className="flex justify-center"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <InlineTwoStateToggle
                value={isRush}
                readOnly={isViewOnly}
                onToggle={() => {
                  const next = isRush ? "no" : "yes";
                  const nextLabel = next === "yes" ? "Yes" : "No";
                  updateMTD(rec.id, {
                    isRushOrder: next,
                    ...(isSportsEnt
                      ? { clientRequestedRushOrder: nextLabel }
                      : {}),
                  } as Partial<MTDRecord>);
                  if (rec.orderId) {
                    updateOrder(rec.orderId, {
                      isRushOrder: nextLabel,
                      ...(isSportsEnt
                        ? { clientRequestedRushOrder: nextLabel }
                        : {}),
                    });
                  }
                }}
              />
            </div>
          );
        },
      },
      {
        key: "email",
        header: "Email",
        width: "120px",
        align: "center" as const,
        nowrap: false,
        cellClassName: compactCellClass,
        headerClassName: compactHeaderClass,
        render: (rec) => {
          // Same SoT as Songs/Notes/Mix Time pills + MTD gate: merge linked Magento.
          const linkedForMail = findLinkedOrder(rec, ordersForUi);
          const finalizedMail = linkedForMail
            ? resolveFinalMatchedOrder(linkedForMail, ordersForUi)
            : null;
          const reqSource = finalizedMail
            ? mergeOrderFormFieldsForRequirements(rec, finalizedMail)
            : rec;
          const { needsReassign, missingCount } = getOrderStatus(reqSource);
          const blockedByMissingData = missingCount > 0;
          const assignedProducer =
            getDisplayAssignedProducer(rec) ||
            rec.assignedProducer?.trim() ||
            null;
          const isAssigned = Boolean(assignedProducer);
          const producerSentAt = rec.producerEmailSentAt || null;
          const producerSentTo = rec.producerEmailSentTo?.trim() || null;
          const sameProducerAsLastSend = Boolean(
            assignedProducer &&
              producerSentTo &&
              producerKeysMatch(assignedProducer, producerSentTo)
          );
          const producerMailSatisfied =
            isAssigned && Boolean(producerSentAt) && sameProducerAsLastSend;
          const showProducerMail = !blockedByMissingData;
          const producerMailIsResend =
            showProducerMail &&
            isAssigned &&
            !producerSentAt &&
            sameProducerAsLastSend &&
            (needsReassign || Boolean(rec.isReassigned));
          const producerMailDisabled =
            !showProducerMail || !isAssigned || producerMailSatisfied;
          const producerMailLabel = producerMailIsResend ? "Resend" : "Producer";
          const producerMailTip = !isAssigned
            ? "Assign a producer before emailing"
            : producerMailSatisfied
              ? "Producer already emailed"
              : producerMailIsResend
                ? "Resend updated schedule to the same producer"
                : "Email producer about order";
          const showCustomerMail = blockedByMissingData;
          const customerMailAlreadySent = Boolean(rec.missingDataEmailSentAt);
          const unmatchedManualCustomerMail = linkedForMail
            ? unmatchedManualNeedsMagentoMatch(linkedForMail)
            : Boolean(rec.isManualScheduleEntry);
          const customerMailTip = customerMailAlreadySent
            ? "Resend to customer"
            : unmatchedManualCustomerMail
              ? "Email customer about form order"
              : "Email customer about missing data";

          if (!showProducerMail && !showCustomerMail) {
            return (
              <span className="text-[11px] text-brand-ink-tertiary">-</span>
            );
          }

          return (
            <div
              className="flex items-center justify-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {showProducerMail ? (
                <HoverTip label={producerMailTip} placement="top">
                  <button
                    type="button"
                    disabled={producerMailDisabled || isViewOnly}
                    aria-disabled={producerMailDisabled || isViewOnly}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      if (producerMailDisabled || isViewOnly) return;
                      setMailRecipient("producer");
                      setMailRecord(rec);
                    }}
                    className={
                      producerMailDisabled || isViewOnly
                        ? ordersMailTextButtonDisabledClass
                        : ordersMailTextButtonClass
                    }
                    aria-label={producerMailTip}
                  >
                    <Mail className="h-3 w-3 shrink-0" strokeWidth={2.25} />
                    <span>{producerMailLabel}</span>
                  </button>
                </HoverTip>
              ) : null}
              {showCustomerMail ? (
                <HoverTip label={customerMailTip} placement="top">
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      setMailRecipient("customer");
                      setMailRecord(rec);
                    }}
                    className={
                      customerMailAlreadySent
                        ? ordersMailTextButtonClass
                        : missingCount > 0
                          ? ordersMailCustomerButtonClass
                          : ordersMailTextButtonClass
                    }
                    aria-label={customerMailTip}
                  >
                    <Mail className="h-3 w-3 shrink-0" strokeWidth={2.25} />
                    <span>{customerMailAlreadySent ? "Resend" : "Customer"}</span>
                  </button>
                </HoverTip>
              ) : null}
            </div>
          );
        },
      },
      {
        key: "actions",
        header: "Actions",
        width: "148px",
        align: "center" as const,
        nowrap: true,
        cellClassName: compactCellClass,
        headerClassName: compactHeaderClass,
        render: (rec, index) => {
          const linkedForForm = findLinkedOrder(rec, ordersForUi);
          const finalizedForm = linkedForForm
            ? resolveFinalMatchedOrder(linkedForForm, ordersForUi)
            : null;
          const reqSource = finalizedForm
            ? mergeOrderFormFieldsForRequirements(rec, finalizedForm)
            : rec;
          const { needsReassign, missingCount } = getOrderStatus(reqSource);
          const blockedByMissingData = missingCount > 0;
          const needsMagentoMatch = linkedForForm
            ? unmatchedManualNeedsMagentoMatch(linkedForForm)
            : Boolean(rec.isManualScheduleEntry);
          const matchSuggestions =
            needsMagentoMatch && linkedForForm
              ? matchCandidatesBeforeMtd(linkedForForm, matchPool)
              : [];
          // Lookalike soft-gate stays clickable; otherwise Match Orders first.
          const hardBlockMagentoMatch =
            needsMagentoMatch && matchSuggestions.length === 0;
          const formMtdGaps =
            !needsMagentoMatch && linkedForForm
              ? getOrderFormFieldsBlockingMtd(linkedForForm, ordersForUi)
              : [];
          const blockedByFormGaps = formMtdGaps.length > 0;
          const assignedProducer =
            getDisplayAssignedProducer(rec) ||
            rec.assignedProducer?.trim() ||
            null;
          const isAssigned = Boolean(assignedProducer);
          const isScheduled = Boolean(
            toIsoDateString(rec.mixStartDate) && toIsoDateString(rec.mixEndDate)
          );
          const producerSentAt = rec.producerEmailSentAt || null;
          const producerSentTo = rec.producerEmailSentTo?.trim() || null;
          const sameProducerAsLastSend = Boolean(
            assignedProducer &&
              producerSentTo &&
              producerKeysMatch(assignedProducer, producerSentTo)
          );
          const producerMailSatisfied =
            isAssigned && Boolean(producerSentAt) && sameProducerAsLastSend;
          const producerMailIsResend =
            !hardBlockMagentoMatch &&
            !blockedByMissingData &&
            !blockedByFormGaps &&
            isAssigned &&
            !producerSentAt &&
            sameProducerAsLastSend &&
            (needsReassign || Boolean(rec.isReassigned));
          const awaitingProducerMail =
            isAssigned &&
            !hardBlockMagentoMatch &&
            !blockedByMissingData &&
            !blockedByFormGaps &&
            !producerMailSatisfied;
          const ready =
            !hardBlockMagentoMatch &&
            isAssigned &&
            isScheduled &&
            !blockedByMissingData &&
            !blockedByFormGaps &&
            producerMailSatisfied;
          const mtdBlockedReason = needsMagentoMatch
            ? MAGENTO_MATCH_BEFORE_MTD_REASON
            : blockedByFormGaps
              ? formatOrderFormMtdBlockReason(formMtdGaps)
              : blockedByMissingData
                ? "Resolve missing data\nbefore moving to MTD"
                : !isAssigned && !isScheduled
                  ? "Assign a producer and set\nschedule dates before moving to MTD"
                  : !isAssigned
                    ? "Assign a producer\nbefore moving to MTD"
                    : !isScheduled
                      ? "Set start and end dates\nbefore moving to MTD"
                      : awaitingProducerMail
                        ? producerMailIsResend
                          ? "Resend producer email\nbefore moving to MTD"
                          : "Email producer\nbefore moving to MTD"
                        : null;
          // Soft-gate lookalikes: keep MTD clickable so MatchBeforeMtd can open.
          const mtdDisabled = needsMagentoMatch
            ? matchSuggestions.length === 0
            : Boolean(mtdBlockedReason);
          return (
            <div
              className="flex items-center justify-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
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
                    const id =
                      findLinkedOrder(rec, ordersForUi)?.id ||
                      rec.orderId ||
                      rec.uuid ||
                      rec.id;
                    void ensureOrderInCache(id).finally(() => {
                      setOrderFormRecord(rec);
                    });
                  }}
                  className={clsx(ordersMailTextButtonClass, "!px-1.5")}
                  aria-label={
                    isViewOnly
                      ? `View ${rec.programName || "order"}`
                      : `Edit order form: ${rec.programName || "order"}`
                  }
                >
                  <Pencil className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
                </button>
              </HoverTip>
              {!isViewOnly ? (
                <>
                  <HoverTip
                    label={
                      mtdBlockedReason ?? "MTD"
                    }
                    placement="left"
                  >
                    <button
                      type="button"
                      disabled={mtdDisabled}
                      aria-disabled={mtdDisabled}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        if (mtdDisabled) {
                          e.preventDefault();
                          e.stopPropagation();
                          return;
                        }
                        handleMoveToMTD(rec, e);
                      }}
                      className={clsx(
                        ordersMtdButtonClass(ready, mtdDisabled),
                        "whitespace-nowrap"
                      )}
                      aria-label={
                        mtdBlockedReason ?? "MTD"
                      }
                    >
                      <span>MTD</span>
                      <ArrowRight className="h-3 w-3 shrink-0" strokeWidth={2.25} />
                    </button>
                  </HoverTip>
                  <HoverTip label="Delete" placement="top">
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteOrderRecord(rec);
                      }}
                      className={clsx(
                        ordersMailTextButtonClass,
                        "!px-1.5 text-brand-danger hover:border-brand-danger/35 hover:bg-brand-orange-soft/50 hover:text-brand-danger"
                      )}
                      aria-label={`Delete ${rec.programName || "order"}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
                    </button>
                  </HoverTip>
                </>
              ) : null}
            </div>
          );
        },
      },
    ];

    return baseCols;
  }, [
    form,
    cheerSubtype,
    danceSubtype,
    rangeFilters,
    producers,
    boardOrders,
    matchPool,
    mtdRecords,
    orderById,
    discountCodes,
    updateMTD,
    updateOrder,
    handleMoveToMTD,
    openPricingModal,
    openRecordPricingModal,
    openAssignPage,
    warmAssignPage,
    isViewOnly,
    pricingRevision,
  ]);

  return (
    <OrdersLookupProvider orders={ordersForUi}>
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ReturnNavBanner />
      <PageHeader
        title="Orders"
        subtitle="Assign orders to producers"
        action={{
          label: "New Order",
          onClick: () => setAddNewOrderOpen(true),
          showPlus: true,
        }}
        secondaryAction={{
          label: "Pricing",
          onClick: openPricingReference,
          showPlus: false,
        }}
        exportAction={{
          label: "CSV",
          title:
            "Export current Orders filters to CSV (server query: search, form, range)",
          onClick: () => setCsvExportOpen(true),
        }}
        headerActions={
          <div className="flex items-center gap-2">
            <Link
              href="/orders/match"
              prefetch
              onMouseEnter={warmMatchData}
              onPointerDown={warmMatchData}
              onClick={() => {
                saveOrdersViewState({
                  form,
                  cheerSubtype,
                  danceSubtype,
                  rangeFilters,
                  rangeFilter,
                  sourceFilter,
                  searchQuery,
                  tableFilters,
                });
              }}
              title={
                hasMatchManuals
                  ? "Open Match Orders — manuals waiting to match"
                  : "Open Match Orders"
              }
              aria-label={
                hasMatchManuals
                  ? "Open Match Orders, manuals waiting to match"
                  : "Open Match Orders"
              }
              className="relative flex h-9 items-center gap-1.5 rounded-xl border border-brand-line/70 bg-white px-3 text-[13px] font-semibold text-brand-ink shadow-sm transition hover:border-brand-line hover:bg-brand-bg/60 hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/20"
            >
              <Link2
                className="h-4 w-4 text-brand-ink-secondary"
                strokeWidth={2}
              />
              <span className="hidden sm:inline">Match Orders</span>
              {hasMatchManuals ? (
                <span
                  className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand-blue"
                  aria-hidden
                />
              ) : null}
            </Link>
            <Link
              href="/orders/flagged"
              prefetch
              onMouseEnter={warmFlaggedData}
              onPointerDown={warmFlaggedData}
              onClick={() => {
                saveOrdersViewState({
                  form,
                  cheerSubtype,
                  danceSubtype,
                  rangeFilters,
                  rangeFilter,
                  sourceFilter,
                  searchQuery,
                  tableFilters,
                });
              }}
              title={
                hasFlaggedOrders
                  ? "Open Flagged Orders — unresolved flags"
                  : "Open Flagged Orders"
              }
              aria-label={
                hasFlaggedOrders
                  ? "Open Flagged Orders, unresolved flags"
                  : "Open Flagged Orders"
              }
              className="relative flex h-9 items-center gap-1.5 rounded-xl border border-brand-line/70 bg-white px-3 text-[13px] font-semibold text-brand-ink shadow-sm transition hover:border-brand-line hover:bg-brand-bg/60 hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/20"
            >
              <Flag
                className="h-4 w-4 text-brand-ink-secondary"
                strokeWidth={2}
              />
              <span className="hidden sm:inline">Flagged Orders</span>
              {hasFlaggedOrders ? (
                <span
                  className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand-blue"
                  aria-hidden
                />
              ) : null}
            </Link>
          </div>
        }
        search={{
          value: searchInput,
          onChange: setSearchInput,
          placeholder: `${getContactColumnHeader(
            form,
            cheerSubtype === "all" ? undefined : cheerSubtype,
            danceSubtype === "all" ? undefined : danceSubtype
          )}, program…`,
        }}
        toolbar={
          <MTDPageToolbar
            form={form}
            cheerSubtype={cheerSubtype}
            danceSubtype={danceSubtype}
            sourceFilter={sourceFilter}
            onSourceFilterChange={setSourceFilter}
            sourceCountRecords={preMtdRecords}
            sourceServerCounts={
              boardCountsReady
                ? ordersSourceMenuCounts(boardCounts, {
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
                : null
            }
            rangeFilter={rangeFilters}
            onRangeFilterChange={setRangeFilters}
            allOrdersCount={boardCountsReady ? allOrdersCount : undefined}
            needToBeScheduledCount={
              boardCountsReady ? needToBeScheduledCount : undefined
            }
            newOrdersCount={boardCountsReady ? newOrdersCount : undefined}
            assignedOrdersCount={
              boardCountsReady ? assignedOrdersCount : undefined
            }
            notAssignedOrdersCount={
              boardCountsReady ? notAssignedOrdersCount : undefined
            }
            reassignedOrdersCount={
              boardCountsReady ? reassignedOrdersCount : undefined
            }
            waitingForDataCount={
              boardCountsReady ? waitingForDataCount : undefined
            }
            onFormChange={switchForm}
            onCheerSubtypeChange={switchCheerSubtype}
            onDanceSubtypeChange={switchDanceSubtype}
            onFormMenuIntent={() => {
              // Warm the busiest other form at the subtype switchForm will land on.
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
                .sort(
                  (a, b) => (formCounts[b] ?? 0) - (formCounts[a] ?? 0)
                )[0];
              if (!peer || (formCounts[peer] ?? 0) <= 0) return;
              if (peer === "school-all-star-cheer") {
                const nextCheer =
                  CHEER_FORM_SUBTABS.find(
                    (t) => (cheerSubtypeCounts[t.id] ?? 0) > 0
                  )?.id ?? DEFAULT_CHEER_SUBTYPE;
                warmBoardQuery({
                  formType: peer,
                  cheerFormSubtype: nextCheer,
                });
                return;
              }
              if (peer === "school-all-star-dance") {
                const nextDance =
                  DANCE_FORM_SUBTABS.find(
                    (t) => (danceSubtypeCounts[t.id] ?? 0) > 0
                  )?.id ?? DEFAULT_DANCE_SUBTYPE;
                warmBoardQuery({
                  formType: peer,
                  danceFormSubtype: nextDance,
                });
                return;
              }
              warmBoardQuery({
                formType: peer,
                cheerFormSubtype: "",
                danceFormSubtype: "",
              });
            }}
            onFormOptionIntent={(next) => {
              // Must match switchForm's landing subtype or prefetch misses the real key.
              if (next === "school-all-star-cheer") {
                const nextCheer =
                  CHEER_FORM_SUBTABS.find(
                    (t) => (cheerSubtypeCounts[t.id] ?? 0) > 0
                  )?.id ?? DEFAULT_CHEER_SUBTYPE;
                warmBoardQuery({
                  formType: next,
                  cheerFormSubtype: nextCheer,
                });
                return;
              }
              if (next === "school-all-star-dance") {
                const nextDance =
                  DANCE_FORM_SUBTABS.find(
                    (t) => (danceSubtypeCounts[t.id] ?? 0) > 0
                  )?.id ?? DEFAULT_DANCE_SUBTYPE;
                warmBoardQuery({
                  formType: next,
                  danceFormSubtype: nextDance,
                });
                return;
              }
              warmBoardQuery({
                formType: next,
                cheerFormSubtype: "",
                danceFormSubtype: "",
              });
            }}
            onCheerOptionIntent={(next) =>
              warmBoardQuery({
                formType: "school-all-star-cheer",
                cheerFormSubtype: next,
              })
            }
            onDanceOptionIntent={(next) =>
              warmBoardQuery({
                formType: "school-all-star-dance",
                danceFormSubtype: next,
              })
            }
            formCounts={formCounts}
            cheerCounts={cheerSubtypeCounts}
            danceCounts={danceSubtypeCounts}
            records={typeFilteredPreMtdRecords}
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
          />
        }
      />

      <div className="min-h-0 flex-1 overflow-auto px-2 pb-6 pt-5 lg:px-3">
        <div className="dashboard-panel dashboard-panel-framed overflow-hidden">
          <DataTable
            key={`${form}-${cheerSubtype}-${danceSubtype}-${tableFilterKey}`}
            data={filtered}
            columns={columns}
            rowKey={(rec) => {
              const linked =
                (rec.orderId ? orderById.get(rec.orderId) : undefined) ||
                orderById.get(rec.id) ||
                (rec.uuid ? orderById.get(rec.uuid) : undefined) ||
                (rec.legacyId ? orderById.get(rec.legacyId) : undefined);
              return (
                linked?.id ||
                rec.orderId ||
                rec.legacyId ||
                rec.uuid ||
                rec.id
              );
            }}
            emptyMessage={
              searchInput.trim()
                ? "No orders match this search."
                : rangeFilters.length > 0
                  ? "No orders match these filters."
                  : "No pending pre-MTD orders found."
            }
            loading={
              // Rows stay painted during chip fetches. Skeleton only when the
              // instant client seed is empty but counts say rows are coming —
              // never a false "No orders match" flash.
              filtered.length === 0 &&
              ((boardLoading && boardOrders.length === 0) ||
                (boardRefreshing && (boardTotalCount ?? 1) > 0))
            }
            pageSize={15}
            totalCount={boardTotalCount}
            hasMore={Boolean(boardNextPageToken)}
            onLoadMore={loadMoreBoard}
            loadingMore={boardLoadingMore}
            // Chips reset to page 1 without remounting (key excludes them).
            resetKey={`${tableFilterKey}|${rangeFilters.join(",")}`}
            embedded
            showScrollIndicator={true}
            highlightRowKey={highlightId}
            onClearHighlight={clearHighlight}
          />
        </div>
      </div>

      {/* Pricing rate card: header Pricing + catalog package-price cells */}
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
                boardOrders
              )
            : null
        }
        onClose={() => setRecordPricingRecord(null)}
        onSave={saveRecordPricing}
        readOnly={isViewOnly}
      />

      <CompletionBlockedModal
        open={Boolean(validationModalRecord)}
        record={validationModalRecord}
        reason="moveToMtd"
        onClose={() => setValidationModalRecord(null)}
      />

      <MatchBeforeMtdModal
        open={Boolean(matchBeforeMtd)}
        record={matchBeforeMtd?.record ?? null}
        suggestions={matchBeforeMtd?.suggestions ?? []}
        onClose={() => setMatchBeforeMtd(null)}
        onOpenMatchOrders={() => {
          const linked = matchBeforeMtd
            ? findLinkedOrder(matchBeforeMtd.record, ordersForUi)
            : null;
          setMatchBeforeMtd(null);
          // Focus this order on Match Orders (Form section when it's a Magento form).
          goToMatchPage({
            manualId: linked?.isManualEntry ? linked.id : undefined,
            formId:
              linked && !linked.isManualEntry ? linked.id : undefined,
          });
        }}
        onMoveToMtd={() => {
          if (matchBeforeMtd) commitMoveToMTD(matchBeforeMtd.record);
        }}
      />

      <ForwardOrderMailModal
        open={Boolean(mailRecord)}
        record={mailRecord}
        orderById={orderById}
        allOrders={ordersForUi}
        producers={producers}
        recipient={mailRecipient}
        onClose={() => setMailRecord(null)}
      />

      <AddNewOrderModal
        open={addNewOrderOpen}
        onClose={() => setAddNewOrderOpen(false)}
        initialFormType={form}
        initialCheerSubtype={cheerSubtype}
        initialDanceSubtype={danceSubtype}
        onAdd={async (draft) => {
          const created = await addManualScheduleEntry(draft);
          // New Order always creates Manual rows; Form filter would hide them.
          setSourceFilter("both");
          await reloadBoard();
          return created;
        }}
      />

      <OrderFormEditModal
        open={Boolean(orderFormRecord)}
        record={orderFormRecord}
        allOrders={ordersForUi}
        rowId={orderFormRowId}
        onClose={() => {
          setOrderFormRecord(null);
          setOrderFormRowId(null);
        }}
      />

      <DeleteOrderConfirmModal
        open={Boolean(deleteOrderRecord)}
        record={deleteOrderRecord}
        linkedOrder={
          deleteOrderRecord
            ? findLinkedOrder(deleteOrderRecord, boardOrders)
            : null
        }
        busy={deletingOrder}
        onClose={() => {
          if (deletingOrder) return;
          setDeleteOrderRecord(null);
        }}
        onConfirm={() => {
          const rec = deleteOrderRecord;
          if (!rec || deletingOrder) return;
          const orderId =
            findLinkedOrder(rec, ordersForUi)?.id ||
            rec.orderId ||
            rec.uuid ||
            rec.id;
          setDeletingOrder(true);
          void deleteOrder(orderId)
            .then(() => setDeleteOrderRecord(null))
            .catch(() => {
              /* toast from AppState */
            })
            .finally(() => setDeletingOrder(false));
        }}
      />

      <OrdersCsvExportModal
        open={csvExportOpen}
        filters={csvExportFilters}
        busy={csvExportBusy}
        onClose={() => {
          if (csvExportBusy) return;
          setCsvExportOpen(false);
        }}
        onConfirm={confirmExportFilteredOrdersCsv}
      />

    </div>
    </OrdersLookupProvider>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersPageContent />
    </Suspense>
  );
}
