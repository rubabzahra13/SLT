"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Lock, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
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
import { formatPrice, titleCase } from "@/lib/data";
import { parsePackage } from "@/lib/package";
import {
  magentoPackageBoardLabel,
  packageTypeDisplayValue,
} from "@/components/mtd/PackageTypeField";
import {
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
import { formatDisplayDate, formatMixBookedDaysLabel, toIsoDateString } from "@/lib/dates";
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
import {
  countMTDByCheerSubtype,
  countMTDByDanceSubtype,
  countMTDByForm,
  filterMTDRecords,
  getRecordMusicAffiliateInfo,
  isMTDRecord,
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
  OrderSourceFilter,
  PriceCompliance,
} from "@/types";
import { MTD_RECORD_STATUS_OPTIONS } from "@/types";
import {
  filterRecordsByOrderSource,
} from "@/lib/order-source";
import clsx from "clsx";

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";
const DEFAULT_CHEER_SUBTYPE: CheerFormSubtype = "all-star-cheer";
const DEFAULT_DANCE_SUBTYPE: DanceFormSubtypeFilter = "pom";

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
const compactTextClass = "text-[12px] leading-none text-brand-ink";

function MTDPageContent() {
  const {
    mtdRecords,
    allOrders,
    updateMTD,
    updateOrder,
    producers,
    schedule,
    isViewOnly,
  } = useAppState();
  const [formState, setFormState] = useState<OrderFormType>(DEFAULT_FORM);
  const [cheerSubtypeState, setCheerSubtypeState] = useState<CheerFormSubtypeFilter>(
    DEFAULT_CHEER_SUBTYPE
  );
  const [danceSubtypeState, setDanceSubtypeState] = useState<DanceFormSubtypeFilter>(
    DEFAULT_DANCE_SUBTYPE
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedForm = sessionStorage.getItem("slt_mtd_form") as OrderFormType | null;
    const savedCheer = sessionStorage.getItem("slt_mtd_cheer_subtype") as CheerFormSubtypeFilter | null;
    const savedDance = sessionStorage.getItem("slt_mtd_dance_subtype") as DanceFormSubtypeFilter | null;
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
  }, []);

  const router = useRouter();
  const pathname = usePathname();
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
  const [sourceFilter, setSourceFilter] =
    useState<OrderSourceFilter>("both");

  useEffect(() => {
    if (assignedParam) {
      setTableFilters((prev) => ({ ...prev, assignedProducer: assignedParam }));
    } else if (scheduleParam) {
      setTableFilters((prev) => ({ ...prev, scheduleFilter: scheduleParam as any }));
    }
  }, [assignedParam, scheduleParam]);

  const [searchQuery, setSearchQuery] = useState("");
  const [viewOrder, setViewOrder] = useState<MTDViewOrder>("sequence");
  const [assignRecordId, setAssignRecordId] = useState<string | null>(null);
  const assignRecord = useMemo(
    () =>
      assignRecordId
        ? mtdRecords.find((record) => record.id === assignRecordId) ?? null
        : null,
    [assignRecordId, mtdRecords]
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

  const mtdBoardRecords = useMemo(
    () => getMTDBoardRecords(mtdRecords).filter(isMTDRecord),
    [mtdRecords]
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

  const switchForm = useCallback((next: OrderFormType) => {
    setForm(next);
    if (next !== "school-all-star-cheer") {
      setCheerSubtype(DEFAULT_CHEER_SUBTYPE);
    }
    if (next !== "school-all-star-dance") {
      setDanceSubtype(DEFAULT_DANCE_SUBTYPE);
    }
  }, [setForm, setCheerSubtype, setDanceSubtype]);

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
      const assigned = Boolean(rec.assignedProducer?.trim());
      if (isViewOnly || assigned) {
        setAssignRecordId(rec.id);
        return;
      }
      const query = searchParams.toString();
      const returnTo = query ? `${pathname}?${query}` : pathname;
      router.push(
        `/mtd/${rec.id}/assign?return=${encodeURIComponent(returnTo)}`
      );
    },
    [isViewOnly, pathname, router, searchParams]
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
    () => {
      const rec = moveToOrdersRecord;
      if (!rec || isViewOnly) return;

      // Move to Orders from MTD always lands as Reassign: rush order with
      // assignment/schedule cleared until the order is reassigned.
      updateMTD(rec.id, patchForReassignRush());
      setMoveToOrdersRecord(null);
      router.push(`/orders?focus=${encodeURIComponent(rec.id)}`);
    },
    [isViewOnly, moveToOrdersRecord, router, updateMTD]
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
      updateMTD(recordId, { invoice });
    },
    [updateMTD]
  );

  const handleInvoicesSave = useCallback(
    (updates: Record<string, string>) => {
      for (const [id, invoice] of Object.entries(updates)) {
        updateMTD(id, { invoice: invoice.trim() });
      }
    },
    [updateMTD]
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
      updateMTD(rec.id, patchFromRecordStatus(nextStatus));
    },
    [updateMTD]
  );

  const confirmCompleteToPayroll = useCallback(
    async (mtdPatch?: Partial<MTDRecord>, orderPatch?: Partial<Order>) => {
      if (!completeRecord) return;
      const basePatch = patchMoveToPayroll();
      const recordId = completeRecord.id;
      const orderId = completeRecord.orderId;
      setCompleteRecord(null);
      // Phase 2: lifecycle flags stay on MTD; pricing/payout SoT is Orders.
      // Persist inPayroll first so SSE cannot briefly clear Payroll membership.
      if (orderId) {
        await updateMTD(recordId, basePatch);
        if (orderPatch) {
          await updateOrder(orderId, orderPatch);
        }
      } else {
        await updateMTD(recordId, { ...basePatch, ...mtdPatch });
      }
    },
    [completeRecord, updateMTD, updateOrder]
  );

  const sourceFilteredBoard = useMemo(
    () => filterRecordsByOrderSource(mtdBoardRecords, sourceFilter, orderById),
    [mtdBoardRecords, sourceFilter, orderById]
  );

  const tableFiltered = useMemo(
    () =>
      filterMTDRecords(sourceFilteredBoard, {
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
      sourceFilteredBoard,
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
    if (!q) return tableFiltered;
    return tableFiltered.filter((rec) => matchesMTDSearch(rec, q));
  }, [tableFiltered, searchQuery]);

  const displayedRecords = useMemo(() => {
    const sorted = sortMTDRecordsBySortKey(
      filtered,
      tableFilters.sortBy ?? "newest",
      producers,
      orderById
    );
    return sortMTDRecordsByViewOrder(sorted, viewOrder, producers);
  }, [filtered, tableFilters.sortBy, viewOrder, producers, orderById]);

  const formCounts = useMemo(
    () => countMTDByForm(sourceFilteredBoard, orderById),
    [sourceFilteredBoard, orderById]
  );

  const cheerSubtypeCounts = useMemo(
    () => countMTDByCheerSubtype(sourceFilteredBoard, orderById),
    [sourceFilteredBoard, orderById]
  );

  const danceSubtypeCounts = useMemo(
    () => countMTDByDanceSubtype(sourceFilteredBoard, orderById),
    [sourceFilteredBoard, orderById]
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
    searchQuery,
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
    const showMarchingAddons = form === "marching-band";
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
              key: "splitE",
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
      // Form song list text is edit-modal / Songs pill only — not a board column.
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
                    {empty ? "—" : label}
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
              hasSheetMusicAdd: rec.hasSheetMusicAdd,
              hasAddVocals: rec.hasAddVocals,
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
      {
        key: "couponCodeCol",
        header: "Coupon Code",
        width: "110px",
        align: "center" as const,
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[110px]"),
        headerClassName: compactHeaderClass,
        render: (rec: MTDRecord) => {
          const linked = rec.orderId ? orderById.get(rec.orderId) : undefined;
          const coupon = (linked?.couponCode || rec.couponCode || "").trim();
          if (!coupon) {
            return (
              <span className={clsx("mx-auto block text-center text-brand-ink-tertiary", compactTextClass)}>
                None
              </span>
            );
          }
          return (
            <span className={clsx("mx-auto block text-center font-semibold uppercase tracking-wider text-brand-ink", compactTextClass)}>
              {coupon}
            </span>
          );
        },
      },
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
        header: "Mix end date",
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

    if (showMarchingAddons) {
      baseCols.push({
        key: "sheetMusicCol",
        header: "Sheet Music",
        width: "95px",
        align: "center",
        nowrap: false,
        cellClassName: "!px-2 !py-2",
        headerClassName: "!px-2",
        render: (rec) => (
          <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
            <InlineTwoStateToggle
              value={Boolean(rec.hasSheetMusicAdd)}
              readOnly={isViewOnly}
              onToggle={() =>
                updateMTD(rec.id, { hasSheetMusicAdd: !rec.hasSheetMusicAdd })
              }
            />
          </div>
        ),
      });

      baseCols.push({
        key: "addVocalsCol",
        header: "Add Vocals",
        width: "95px",
        align: "center",
        nowrap: false,
        cellClassName: "!px-2 !py-2",
        headerClassName: "!px-2",
        render: (rec) => (
          <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
            <InlineTwoStateToggle
              value={Boolean(rec.hasAddVocals)}
              readOnly={isViewOnly}
              onToggle={() =>
                updateMTD(rec.id, { hasAddVocals: !rec.hasAddVocals })
              }
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
        width: "100px",
        align: "center",
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[100px]"),
        headerClassName: compactHeaderClass,
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
                    "max-w-full rounded-lg px-2 py-1 tabular-nums hover:text-brand-orange",
                    compactTextClass
                  )}
                >
                  <span className="truncate">{invoice}</span>
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
      <PageHeader
        title="Music To Do"
        badge={`${displayedRecords.length} of ${sourceFilteredBoard.length}`}
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
          value: searchQuery,
          onChange: setSearchQuery,
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
            sourceFilter={sourceFilter}
            onSourceFilterChange={setSourceFilter}
            sourceCountRecords={mtdBoardRecords}
            onFormChange={switchForm}
            onCheerSubtypeChange={setCheerSubtype}
            onDanceSubtypeChange={setDanceSubtype}
            formCounts={formCounts}
            cheerCounts={cheerSubtypeCounts}
            danceCounts={danceSubtypeCounts}
            records={sourceFilteredBoard}
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
            pageSize={15}
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
        readOnly={isViewOnly || Boolean(assignRecord?.assignedProducer?.trim())}
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
