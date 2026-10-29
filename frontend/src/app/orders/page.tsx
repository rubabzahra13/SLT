"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
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
import { OrderFormEditModal } from "@/components/orders/OrderFormEditModal";
import { DeleteOrderConfirmModal } from "@/components/orders/DeleteOrderConfirmModal";
import { OrderRequirementsCell } from "@/components/orders/OrderRequirementsCell";
import { OrderDataStatusBadge, OrderAssignmentStatusBadge } from "@/components/orders/OrderStatusDropdown";
import { recordIsRushOrder } from "@/lib/forward-order-mail";
import {
  getAffiliateSelections,
  isDanceFormOrder,
  isInvalidMultiAffiliateSelection,
  recordHeldOnAffiliateFlag,
} from "@/lib/affiliate-flag";
import { formatDanceMusicAffiliates } from "@/lib/dance-music-affiliate";
import {
  DEFAULT_MTD_TABLE_FILTERS,
  type MTDTableFilterState,
} from "@/components/mtd/MTDTableFilters";
import { MTDPageToolbar } from "@/components/mtd/MTDPageToolbar";
import { useAppState } from "@/context/AppStateContext";
import { formatPrice, titleCase } from "@/lib/data";
import {
  getOrderAssignmentStatus,
  getOrderRequirements,
  getOrderStatus,
  mergeOrderFormFieldsForRequirements,
  ORDER_RESELECTION_REASON_LABEL,
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
import { countMagentoFormsWithSuggestions } from "@/lib/manual-form-suggestions";
import {
  formatOrderFormMtdBlockReason,
  getOrderFormFieldsBlockingMtd,
  orderHasSplitField,
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
import { generateOrdersCsv, triggerCsvDownload } from "@/lib/export-csv";
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
  countMTDByCheerSubtype,
  countMTDByDanceSubtype,
  countMTDByForm,
  filterMTDRecords,
  getRecordMusicAffiliateInfo,
  isOrderScheduledAndAssigned,
  matchesFormFilter,
  matchesMTDSearch,
  resolveMTDFormMeta,
  sortMTDRecordsBySortKey,
} from "@/lib/mtd-filters";
import { listPreMtdOrderRecords } from "@/lib/order-staging";
import {
  canAssignManualDespiteMissingData,
  filterRecordsByOrderSource,
} from "@/lib/order-source";
import type {
  CheerFormSubtypeFilter,
  DanceFormSubtypeFilter,
  MTDRecord,
  Order,
  OrderFormType,
  OrderSourceFilter,
  OrderViewRangeFilter,
  PriceCompliance,
} from "@/types";

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";
const DEFAULT_CHEER_SUBTYPE: CheerFormSubtypeFilter = "all-star-cheer";
const DEFAULT_DANCE_SUBTYPE: DanceFormSubtypeFilter = "pom";

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
    activeOrders,
    allOrders,
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
  } = useAppState();

  const [formState, setFormState] = useState<OrderFormType>(DEFAULT_FORM);
  const [cheerSubtypeState, setCheerSubtypeState] = useState<CheerFormSubtypeFilter>(
    DEFAULT_CHEER_SUBTYPE
  );
  const [danceSubtypeState, setDanceSubtypeState] = useState<DanceFormSubtypeFilter>(
    DEFAULT_DANCE_SUBTYPE
  );
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const assignedParam = searchParams.get("assigned");
  const scheduleParam = searchParams.get("schedule");
  const focusParam = searchParams.get("focus");
  const rangeParam = searchParams.get("range");
  const formParam = searchParams.get("form");

  const validOrderForms: OrderFormType[] = [
    "school-all-star-cheer",
    "school-all-star-dance",
    "marching-band",
    "sports-entertainment",
    "school-anthem",
  ];

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
    if (!rangeParam || !allowedRangeFilters.includes(rangeParam as OrderViewRangeFilter)) {
      return "all";
    }
    if (rangeParam === "flagged") return "all";
    if (rangeParam === "reassign_leave" || rangeParam === "reassign_rush") {
      return "reassigned";
    }
    return rangeParam as OrderViewRangeFilter;
  })();
  const [rangeFilter, setRangeFilter] =
    useState<OrderViewRangeFilter>(initialRangeFilter);
  const [sourceFilter, setSourceFilter] =
    useState<OrderSourceFilter>("both");

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
    // Old links / notifications used ?range=flagged — send them to the Flagged page.
    if (rangeParam === "flagged") {
      router.replace("/orders/flagged");
      return;
    }
    if (!rangeParam) return;
    if (allowedRangeFilters.includes(rangeParam as OrderViewRangeFilter)) {
      setRangeFilter(
        rangeParam === "reassign_leave" || rangeParam === "reassign_rush"
          ? "reassigned"
          : (rangeParam as OrderViewRangeFilter)
      );
    }
  }, [rangeParam, router]);

  useEffect(() => {
    if (!formParam) return;
    if (validOrderForms.includes(formParam as OrderFormType)) {
      setForm(formParam as OrderFormType);
    }
  }, [formParam]);

  const clearHighlight = useCallback(() => {
    setHighlightId(null);
    if (typeof window !== "undefined" && focusParam) {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.delete("focus");
      const qs = params.toString();
      router.replace(`/orders${qs ? `?${qs}` : ""}`, { scroll: false });
    }
  }, [focusParam, router, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // URL ?form= wins over the last-used Orders form in sessionStorage.
    if (formParam && validOrderForms.includes(formParam as OrderFormType)) {
      return;
    }
    const savedForm = sessionStorage.getItem("slt_orders_form") as OrderFormType | null;
    const savedCheer = sessionStorage.getItem("slt_orders_cheer_subtype") as CheerFormSubtypeFilter | null;
    const savedDance = sessionStorage.getItem("slt_orders_dance_subtype") as DanceFormSubtypeFilter | null;
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
    if (savedForm && validOrderForms.includes(savedForm)) setFormState(savedForm);
    if (savedCheer && validCheerSubtypes.includes(savedCheer)) setCheerSubtypeState(savedCheer);
    if (savedDance && validDanceSubtypes.includes(savedDance)) setDanceSubtypeState(savedDance);
  }, [formParam]);

  // Newest first so newly added / incoming orders get ID 1 (latest at top).
  const [tableFilters, setTableFilters] = useState<MTDTableFilterState>(
    DEFAULT_MTD_TABLE_FILTERS
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

  const [searchQuery, setSearchQuery] = useState("");
  const [validationModalRecord, setValidationModalRecord] = useState<MTDRecord | null>(null);
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

  const preMtdRecords = useMemo(
    () => listPreMtdOrderRecords(activeOrders, mtdRecords),
    [activeOrders, mtdRecords]
  );

  const orderById = useMemo(() => {
    const map = new Map<string, Order>();
    for (const order of allOrders) {
      if (order.id) map.set(order.id, order);
      if (order.legacyId) map.set(order.legacyId, order);
      if (order.uuid) map.set(order.uuid, order);
    }
    return map;
  }, [allOrders]);

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

  /** Normal Orders board — multi-affiliate Magento holds stay on Flagged until Resolve. */
  const boardRecords = useMemo(
    () =>
      sourceFilteredRecords.filter(
        (rec) => !recordHeldOnAffiliateFlag(rec, orderById)
      ),
    [sourceFilteredRecords, orderById]
  );

  // Source → category → subcategory. Range toggles and the table share this pool.
  const categoryFilteredBoard = useMemo(
    () =>
      boardRecords.filter((rec) =>
        matchesFormFilter(rec, orderById, form, cheerSubtype, danceSubtype)
      ),
    [boardRecords, orderById, form, cheerSubtype, danceSubtype]
  );

  const allOrdersCount = useMemo(
    () => categoryFilteredBoard.length,
    [categoryFilteredBoard]
  );

  const needToBeScheduledCount = useMemo(
    () =>
      categoryFilteredBoard.filter((r) => {
        if (r.isReassigned) return false;
        if (getOrderRequirements(r).missingCount > 0) return false;
        // Complete data = ready to assign (no producer yet)
        return getOrderAssignmentStatus(r) !== "assigned";
      }).length,
    [categoryFilteredBoard]
  );

  const newOrdersCount = needToBeScheduledCount;

  const assignedOrdersCount = useMemo(
    () =>
      categoryFilteredBoard.filter(
        (r) => getOrderAssignmentStatus(r) === "assigned"
      ).length,
    [categoryFilteredBoard]
  );

  const notAssignedOrdersCount = useMemo(
    () =>
      categoryFilteredBoard.filter(
        (r) => getOrderAssignmentStatus(r) === "not_assigned"
      ).length,
    [categoryFilteredBoard]
  );

  const reassignedOrdersCount = useMemo(
    () =>
      categoryFilteredBoard.filter((r) => {
        const status = getOrderAssignmentStatus(r);
        return status === "reassign_leave" || status === "reassign_rush";
      }).length,
    [categoryFilteredBoard]
  );

  const waitingForDataCount = useMemo(
    () =>
      categoryFilteredBoard.filter(
        (r) => getOrderRequirements(r).missingCount > 0
      ).length,
    [categoryFilteredBoard]
  );

  /** Badge always reflects every flagged booking (not the active form only). */
  const flaggedOrdersCount = flaggedRecords.length;

  /** Magento forms with ≥1 identity-similar unmatched manual. */
  const matchOrdersCount = useMemo(
    () => countMagentoFormsWithSuggestions(allOrders),
    [allOrders]
  );

  const matchesRangeFilter = useCallback(
    (rec: MTDRecord) => {
      if (rangeFilter === "all") return true;
      if (rangeFilter === "assigned")
        return getOrderAssignmentStatus(rec) === "assigned";
      if (rangeFilter === "not_assigned")
        return getOrderAssignmentStatus(rec) === "not_assigned";
      if (
        rangeFilter === "reassigned" ||
        rangeFilter === "reassign_leave" ||
        rangeFilter === "reassign_rush"
      ) {
        const status = getOrderAssignmentStatus(rec);
        return status === "reassign_leave" || status === "reassign_rush";
      }
      if (rangeFilter === "waiting_for_data")
        return getOrderRequirements(rec).missingCount > 0;
      if (rangeFilter === "flagged") return false;
      // Complete data: data complete and not yet assigned / reassigned
      return (
        !rec.isReassigned &&
        getOrderRequirements(rec).missingCount === 0 &&
        getOrderAssignmentStatus(rec) !== "assigned"
      );
    },
    [rangeFilter]
  );

  // Rows for the table: source + category/subcategory + range.
  const typeFilteredPreMtdRecords = useMemo(() => {
    return categoryFilteredBoard.filter(matchesRangeFilter);
  }, [categoryFilteredBoard, matchesRangeFilter]);

  // Form / subtype dropdown counts stay range-scoped but not category-scoped
  // so admins can still see other categories while a form is selected.
  const formCountRecords = useMemo(() => {
    return boardRecords.filter(matchesRangeFilter);
  }, [boardRecords, matchesRangeFilter]);

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

  const goToFlaggedPage = useCallback(() => {
    router.push("/orders/flagged");
  }, [router]);

  const goToMatchPage = useCallback(() => {
    router.push("/orders/match");
  }, [router]);

  const openAssignPage = useCallback(
    (recordId: string) => {
      const query = searchParams.toString();
      const returnTo = query ? `${pathname}?${query}` : pathname;
      router.push(
        `/orders/${recordId}/assign?return=${encodeURIComponent(returnTo)}`
      );
    },
    [pathname, router, searchParams]
  );

  const { isViewOnly } = useAppState();

  const handleMoveToMTD = useCallback(
    (rec: MTDRecord, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isViewOnly) return;

      const linkedOrder = findLinkedOrder(rec, allOrders);
      const reqSource = linkedOrder
        ? mergeOrderFormFieldsForRequirements(rec, linkedOrder)
        : rec;
      if (
        linkedOrder &&
        getOrderFormFieldsBlockingMtd(linkedOrder).length > 0
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

      updateMTD(rec.id, {
        inMTD: true,
        isReassigned: false,
        orderStatus: "",
        status: "active",
        recordStatus: "Ongoing",
        mixStartDate: rec.mixStartDate,
        mixEndDate: rec.mixEndDate,
        assignedProducer: rec.assignedProducer,
      });
      // Jump to the MTD tab and highlight the row we just moved.
      router.push(`/mtd?focus=${encodeURIComponent(rec.id)}`);
    },
    [isViewOnly, router, updateMTD, allOrders]
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
      allOrders,
      orderById,
      updateOrder,
      updateMTD,
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

  // Filtered dataset for table
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
        form,
        cheerSubtype,
        danceSubtype,
        orderById,
        producers,
      }),
    [
      typeFilteredPreMtdRecords,
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
    // Moved-back (reassigned) orders pin to the top of the list.
    return [...sorted].sort((a, b) => {
      const aRe = a.isReassigned ? 1 : 0;
      const bRe = b.isReassigned ? 1 : 0;
      return bRe - aRe;
    });
  }, [tableFiltered, searchQuery, tableFilters.sortBy, producers, orderById]);

  const formCounts = useMemo(
    () => countMTDByForm(formCountRecords, orderById),
    [formCountRecords, orderById]
  );

  const cheerSubtypeCounts = useMemo(
    () => countMTDByCheerSubtype(formCountRecords, orderById),
    [formCountRecords, orderById]
  );

  const danceSubtypeCounts = useMemo(
    () => countMTDByDanceSubtype(formCountRecords, orderById),
    [formCountRecords, orderById]
  );

  // Default form is Cheer; demo/live boards often only have Dance/Anthem.
  // Once per load (when URL doesn't pin ?form=), land on a form that has rows.
  const didAutoSelectForm = useRef(false);
  useEffect(() => {
    if (didAutoSelectForm.current || isLoading) return;
    if (formParam && validOrderForms.includes(formParam as OrderFormType)) {
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

  const tableFilterKey = [
    sourceFilter,
    rangeFilter,
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
          const linked = findLinkedOrder(rec, allOrders);
          const stamp = linked?.createdAt || "";
          return (
            <span className="tabular-nums text-[11px] text-brand-ink-secondary whitespace-nowrap">
              {formatDisplayDateTime(stamp)}
            </span>
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
          const linked = findLinkedOrder(rec, allOrders);
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
          const linked = findLinkedOrder(rec, allOrders);
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
                const linked = findLinkedOrder(rec, allOrders);
                const meta = resolveMTDFormMeta(rec, orderById);
                const fromOrder = (linked?.timeLengthOfMix || "").trim();
                const fromPackage = parsePackage(
                  packageTypeDisplayValue(rec.package)
                    ? rec.package
                    : linked?.package || ""
                ).limit;
                let limit =
                  fromOrder ||
                  (fromPackage && fromPackage !== "-" ? fromPackage : "");
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
      // Split/No Split is on VIROC, School Cheer, and Youth Rec — not All Star Cheer.
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
                // All Star Cheer has no Split field — do not treat as missing data.
                if (!orderHasSplitField(meta)) {
                  return (
                    <span
                      className={clsx(
                        "mx-auto block text-center text-brand-ink-tertiary",
                        compactTextClass
                      )}
                    >
                      —
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
                const linked = findLinkedOrder(rec, allOrders);
                const selections = getAffiliateSelections(linked, rec);
                const affiliate =
                  linked?.musicAffiliate ??
                  (rec as MTDRecord & { musicAffiliate?: string }).musicAffiliate;
                if (!affiliate && selections.length === 0) {
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
                const danceOrder =
                  isDanceFormOrder(linked) || isDanceFormOrder(rec);
                const display =
                  selections.length >= 2
                    ? danceOrder
                      ? formatDanceMusicAffiliates(selections)
                      : selections.join(" · ")
                    : titleCase(affiliate || selections[0] || "");

                return (
                  <TruncatedText
                    text={display}
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
      // Form song list text is edit-modal / Songs pill only — not a board column.
      {
        key: "packagePrice",
        header: "Package Price",
        width: "110px",
        align: "center" as const,
        nowrap: false,
        cellClassName: "!px-2",
        headerClassName: "!px-2",
        render: (rec) => {
          const order = findLinkedOrder(rec, allOrders);
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
                <button
                  type="button"
                  onClick={(e) => openRecordPricingModal(rec, e)}
                  title={
                    showNeedsQuote
                      ? "Set package price for this order"
                      : "Edit package price for this order"
                  }
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
              </div>
            );
          }

          return (
            <div
              className="mx-auto flex w-full flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={(e) => openPricingModal(rec, e)}
                title="Open Pricing rate card"
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
            </div>
          );
        },
      },
      ...(showCouponCode
        ? [
            {
              key: "couponCodeCol",
              header: "Coupon Code",
              width: "110px",
              align: "center" as const,
              nowrap: false,
              cellClassName: clsx(compactCellClass, "max-w-[110px]"),
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
                    <span
                      className={clsx(
                        "mx-auto block text-center text-brand-ink-tertiary",
                        compactTextClass
                      )}
                    >
                      None
                    </span>
                  );
                }
                const matched = isValidDiscountCode(coupon, discountCodes);
                return (
                  <span
                    className={clsx(
                      "mx-auto flex flex-col items-center gap-0.5 text-center font-semibold tracking-wide text-brand-ink",
                      compactTextClass
                    )}
                  >
                    <span>{coupon}</span>
                    {matched ? (
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-brand-success">
                        Match
                      </span>
                    ) : null}
                  </span>
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
                const linked = findLinkedOrder(rec, allOrders);
                const label = formatRequestedEditorLabel(rec, producers, linked);
                if (!label.trim()) {
                  return (
                    <span
                      className={clsx(
                        "font-medium text-brand-ink-tertiary",
                        compactTextClass
                      )}
                    >
                      —
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
          const isMissingDataRow = rangeFilter === "waiting_for_data" || getOrderStatus(rec).status === "Missing Data";
          const assigned = getDisplayAssignedProducer(rec);
          const producer = assigned
            ? findProducerByAssignmentKey(assigned, producers)
            : undefined;
          const { missingCount, needsReassign, reassignReason } =
            getOrderStatus(rec);
          // Manual mixes: package filled unlocks Assign even with red collection pills.
          const allowManualAssign = canAssignManualDespiteMissingData(
            rec,
            orderById
          );
          const assignBlockedByMissingData =
            !allowManualAssign && missingCount > 0;
          const blockAssignCell = !allowManualAssign && isMissingDataRow;
          const assignBlockedReason = assignBlockedByMissingData
            ? "Resolve missing data\nbefore assigning"
            : null;
          const assignLabel =
            rec.isReassigned ||
            rangeFilter === "reassigned" ||
            rangeFilter === "reassign_leave" ||
            rangeFilter === "reassign_rush"
              ? "Reassign"
              : "Assign";
          const reassignReasonLabel =
            needsReassign && reassignReason
              ? ORDER_RESELECTION_REASON_LABEL[reassignReason]
              : null;

          return (
            <div className={clsx("flex justify-center", blockAssignCell && "opacity-40 pointer-events-none cursor-not-allowed")} onClick={(e) => e.stopPropagation()}>
              {assigned ? (
                <button
                  type="button"
                  disabled={blockAssignCell}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    if (blockAssignCell) return;
                    e.stopPropagation();
                    openAssignPage(rec.id);
                  }}
                  title={blockAssignCell ? "Scheduling disabled in Missing Data" : "Assign producer"}
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
                      assignBlockedReason ??
                      (reassignReasonLabel
                        ? `${assignLabel}: ${reassignReasonLabel}`
                        : assignLabel)
                    }
                    placement="top"
                  >
                    <button
                      type="button"
                      disabled={assignBlockedByMissingData}
                      aria-disabled={assignBlockedByMissingData}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (assignBlockedByMissingData) {
                          e.preventDefault();
                          return;
                        }
                        openAssignPage(rec.id);
                      }}
                      className={actionButtonClass(
                        false,
                        assignBlockedByMissingData
                      )}
                      aria-label={
                        assignBlockedReason ??
                        (reassignReasonLabel
                          ? `${assignLabel}: ${reassignReasonLabel}`
                          : assignLabel)
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
          const linked = findLinkedOrder(rec, allOrders);
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
          const { needsReassign, missingCount } = getOrderStatus(rec);
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

          if (!showProducerMail && !showCustomerMail) {
            return (
              <span className="text-[11px] text-brand-ink-tertiary">—</span>
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
                <HoverTip
                  label={
                    customerMailAlreadySent
                      ? "Resend to customer"
                      : "Email customer about missing data"
                  }
                  placement="top"
                >
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
                    aria-label={
                      customerMailAlreadySent
                        ? "Resend to customer"
                        : "Email customer"
                    }
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
          const linkedForForm = findLinkedOrder(rec, allOrders);
          const reqSource = linkedForForm
            ? mergeOrderFormFieldsForRequirements(rec, linkedForForm)
            : rec;
          const { needsReassign, missingCount } = getOrderStatus(reqSource);
          const blockedByMissingData = missingCount > 0;
          const formMtdGaps = linkedForForm
            ? getOrderFormFieldsBlockingMtd(linkedForForm)
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
            !blockedByMissingData &&
            !blockedByFormGaps &&
            isAssigned &&
            !producerSentAt &&
            sameProducerAsLastSend &&
            (needsReassign || Boolean(rec.isReassigned));
          const awaitingProducerMail =
            isAssigned &&
            !blockedByMissingData &&
            !blockedByFormGaps &&
            !producerMailSatisfied;
          const ready =
            isAssigned &&
            isScheduled &&
            !blockedByMissingData &&
            !blockedByFormGaps &&
            producerMailSatisfied;
          const mtdBlockedReason = blockedByFormGaps
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
          const mtdDisabled = Boolean(mtdBlockedReason);
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
                    setOrderFormRecord(rec);
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
    rangeFilter,
    producers,
    allOrders,
    mtdRecords,
    orderById,
    discountCodes,
    updateMTD,
    updateOrder,
    handleMoveToMTD,
    openPricingModal,
    openRecordPricingModal,
    openAssignPage,
    isViewOnly,
    pricingRevision,
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ReturnNavBanner />
      <PageHeader
        title="Orders"
        badge={`${filtered.length} of ${typeFilteredPreMtdRecords.length}`}
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
          onClick: () => {
            const csv = generateOrdersCsv(filtered, allOrders);
            triggerCsvDownload(`Orders_Export_${todayIso()}.csv`, csv);
          },
        }}
        headerActions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToMatchPage}
              title={
                matchOrdersCount > 0
                  ? `Open Match Orders (${matchOrdersCount})`
                  : "Open Match Orders"
              }
              aria-label={
                matchOrdersCount > 0
                  ? `Open Match Orders, ${matchOrdersCount}`
                  : "Open Match Orders"
              }
              className="flex h-9 items-center gap-1.5 rounded-xl border border-brand-line/70 bg-white px-3 text-[13px] font-semibold text-brand-ink shadow-sm transition hover:border-brand-line hover:bg-brand-bg/60 hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/20"
            >
              <Link2
                className="h-4 w-4 text-brand-ink-secondary"
                strokeWidth={2}
              />
              <span className="hidden sm:inline">Match Orders</span>
              {matchOrdersCount > 0 ? (
                <span className="rounded-full bg-brand-orange/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-brand-orange">
                  {matchOrdersCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={goToFlaggedPage}
              title={
                flaggedOrdersCount > 0
                  ? `Open Flagged Orders (${flaggedOrdersCount})`
                  : "Open Flagged Orders"
              }
              aria-label={
                flaggedOrdersCount > 0
                  ? `Open Flagged Orders, ${flaggedOrdersCount}`
                  : "Open Flagged Orders"
              }
              className="flex h-9 items-center gap-1.5 rounded-xl border border-brand-line/70 bg-white px-3 text-[13px] font-semibold text-brand-ink shadow-sm transition hover:border-brand-line hover:bg-brand-bg/60 hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/20"
            >
              <Flag
                className="h-4 w-4 text-brand-ink-secondary"
                strokeWidth={2}
              />
              <span className="hidden sm:inline">Flagged Orders</span>
              {flaggedOrdersCount > 0 ? (
                <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-rose-600">
                  {flaggedOrdersCount}
                </span>
              ) : null}
            </button>
          </div>
        }
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
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
            rangeFilter={rangeFilter === "flagged" ? "all" : rangeFilter}
            onRangeFilterChange={setRangeFilter}
            allOrdersCount={allOrdersCount}
            needToBeScheduledCount={needToBeScheduledCount}
            newOrdersCount={newOrdersCount}
            assignedOrdersCount={assignedOrdersCount}
            notAssignedOrdersCount={notAssignedOrdersCount}
            reassignedOrdersCount={reassignedOrdersCount}
            waitingForDataCount={waitingForDataCount}
            onFormChange={switchForm}
            onCheerSubtypeChange={setCheerSubtype}
            onDanceSubtypeChange={setDanceSubtype}
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
              isLoading
                ? "Loading orders…"
                : "No pending pre-MTD orders found."
            }
            pageSize={15}
            embedded
            showScrollIndicator={true}
            highlightRowKey={highlightId}
            onClearHighlight={clearHighlight}
          />
        </div>
      </div>

      {/* Pricing rate card — header Pricing + catalog package-price cells */}
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

      <CompletionBlockedModal
        open={Boolean(validationModalRecord)}
        record={validationModalRecord}
        reason="moveToMtd"
        onClose={() => setValidationModalRecord(null)}
      />

      <ForwardOrderMailModal
        open={Boolean(mailRecord)}
        record={mailRecord}
        orderById={orderById}
        allOrders={allOrders}
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
        onAdd={addManualScheduleEntry}
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

      <DeleteOrderConfirmModal
        open={Boolean(deleteOrderRecord)}
        record={deleteOrderRecord}
        linkedOrder={
          deleteOrderRecord
            ? findLinkedOrder(deleteOrderRecord, allOrders)
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
            findLinkedOrder(rec, allOrders)?.id ||
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
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[13px] text-brand-ink-tertiary">Loading orders...</div>}>
      <OrdersPageContent />
    </Suspense>
  );
}
