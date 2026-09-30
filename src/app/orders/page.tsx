"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Eye, Mail, Pencil } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { HoverTip } from "@/components/ui/HoverTip";
import { TruncatedText } from "@/components/ui/TruncatedText";
import { SetPricingModal } from "@/components/mtd/SetPricingModal";
import { SetRecordPricingModal } from "@/components/mtd/SetRecordPricingModal";
import { CompletionBlockedModal } from "@/components/mtd/CompletionBlockedModal";
import { ForwardOrderMailModal } from "@/components/orders/ForwardOrderMailModal";
import { AddNewOrderModal } from "@/components/orders/AddNewOrderModal";
import { OrderRequirementsCell } from "@/components/orders/OrderRequirementsCell";
import { OrderDataStatusBadge, OrderAssignmentStatusBadge } from "@/components/orders/OrderStatusDropdown";
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
} from "@/lib/order-requirements";
import {
  calculateCheerOrderPricing,
  calculateDanceOrderPricing,
  calculateMarchingBandOrderPricing,
  calculateSchoolAnthemOrderPricing,
  calculateSportsEntertainmentOrderPricing,
} from "@/lib/pricing-engine";
import { formatDisplayDate, formatMixBookedDaysLabel, toIsoDateString } from "@/lib/dates";
import { todayIso } from "@/lib/date-filters";
import { generateOrdersCsv, triggerCsvDownload } from "@/lib/export-csv";
import { parsePackage } from "@/lib/package";
import {
  findLinkedOrder,
  findProducerByAssignmentKey,
  formatRequestedEditorLabel,
  getDisplayAssignedProducer,
  getRequestedEditorFromRecord,
  getRequestedEditorUnavailableReason,
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
  matchesMTDSearch,
  resolveMTDFormMeta,
} from "@/lib/mtd-filters";
import { listPreMtdOrderRecords } from "@/lib/order-staging";
import type {
  CheerFormSubtypeFilter,
  DanceFormSubtypeFilter,
  MTDRecord,
  Order,
  OrderFormType,
  OrderViewRangeFilter,
  PriceCompliance,
} from "@/types";

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";
const DEFAULT_CHEER_SUBTYPE: CheerFormSubtypeFilter = "all-star-cheer";
const DEFAULT_DANCE_SUBTYPE: DanceFormSubtypeFilter = "all";

const unavailableTagClass =
  "inline-flex items-center rounded-full bg-brand-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-brand-warning ring-1 ring-inset ring-brand-warning/25";
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
const compactTextClass = "text-[12px] leading-none text-brand-ink";

function OrdersPageContent() {
  const {
    mtdRecords,
    activeOrders,
    allOrders,
    updateMTD,
    addManualScheduleEntry,
    producers,
    schedule,
    holidays,
    packagePrices,
    secretMenuPrices,
    setPackagePrices,
    setSecretMenuPrices,
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

  const allowedRangeFilters: OrderViewRangeFilter[] = [
    "all",
    "need_to_be_scheduled",
    "assigned",
    "not_assigned",
    "reassign_leave",
    "reassign_rush",
    "waiting_for_data",
  ];
  const initialRangeFilter: OrderViewRangeFilter =
    rangeParam && allowedRangeFilters.includes(rangeParam as OrderViewRangeFilter)
      ? (rangeParam as OrderViewRangeFilter)
      : "all";
  const [rangeFilter, setRangeFilter] =
    useState<OrderViewRangeFilter>(initialRangeFilter);

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
    if (!rangeParam) return;
    if (allowedRangeFilters.includes(rangeParam as OrderViewRangeFilter)) {
      setRangeFilter(rangeParam as OrderViewRangeFilter);
    }
  }, [rangeParam]);

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
    const savedForm = sessionStorage.getItem("slt_orders_form") as OrderFormType | null;
    const savedCheer = sessionStorage.getItem("slt_orders_cheer_subtype") as CheerFormSubtypeFilter | null;
    const savedDance = sessionStorage.getItem("slt_orders_dance_subtype") as DanceFormSubtypeFilter | null;
    const validForms: OrderFormType[] = [
      "school-all-star-cheer",
      "school-all-star-dance",
      "marching-band",
      "sports-entertainment",
      "school-anthem",
    ];
    const validCheerSubtypes: CheerFormSubtypeFilter[] = [
      "all",
      "all-star-cheer",
      "school-cheer-viroc-yes",
      "school-cheer-viroc-no",
      "youth-rec-cheer",
    ];
    const validDanceSubtypes: DanceFormSubtypeFilter[] = [
      "all",
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
  const [pricingRecord, setPricingRecord] = useState<MTDRecord | null>(null);
  const [mailRecord, setMailRecord] = useState<MTDRecord | null>(null);
  const [mailRecipient, setMailRecipient] = useState<"producer" | "customer">(
    "producer"
  );
  const [addNewOrderOpen, setAddNewOrderOpen] = useState(false);

  const preMtdRecords = useMemo(
    () => listPreMtdOrderRecords(activeOrders, mtdRecords, packagePrices),
    [activeOrders, mtdRecords, packagePrices]
  );

  const allOrdersCount = useMemo(
    () => preMtdRecords.length,
    [preMtdRecords]
  );

  const needToBeScheduledCount = useMemo(
    () =>
      preMtdRecords.filter((r) => {
        if (r.isReassigned) return false;
        if (getOrderRequirements(r).missingCount > 0) return false;
        // Complete data = ready to assign (no producer yet)
        return getOrderAssignmentStatus(r) !== "assigned";
      }).length,
    [preMtdRecords]
  );

  const newOrdersCount = needToBeScheduledCount;

  const assignedOrdersCount = useMemo(
    () =>
      preMtdRecords.filter((r) => getOrderAssignmentStatus(r) === "assigned")
        .length,
    [preMtdRecords]
  );

  const notAssignedOrdersCount = useMemo(
    () =>
      preMtdRecords.filter(
        (r) => getOrderAssignmentStatus(r) === "not_assigned"
      ).length,
    [preMtdRecords]
  );

  const reassignLeaveOrdersCount = useMemo(
    () =>
      preMtdRecords.filter(
        (r) => getOrderAssignmentStatus(r) === "reassign_leave"
      ).length,
    [preMtdRecords]
  );

  const reassignRushOrdersCount = useMemo(
    () =>
      preMtdRecords.filter(
        (r) => getOrderAssignmentStatus(r) === "reassign_rush"
      ).length,
    [preMtdRecords]
  );

  const waitingForDataCount = useMemo(
    () => preMtdRecords.filter((r) => getOrderRequirements(r).missingCount > 0).length,
    [preMtdRecords]
  );

  const typeFilteredPreMtdRecords = useMemo(
    () =>
      preMtdRecords.filter((rec) => {
        if (rangeFilter === "all") return true;
        if (rangeFilter === "assigned")
          return getOrderAssignmentStatus(rec) === "assigned";
        if (rangeFilter === "not_assigned")
          return getOrderAssignmentStatus(rec) === "not_assigned";
        if (rangeFilter === "reassign_leave")
          return getOrderAssignmentStatus(rec) === "reassign_leave";
        if (rangeFilter === "reassign_rush" || rangeFilter === "reassigned")
          return getOrderAssignmentStatus(rec) === "reassign_rush";
        if (rangeFilter === "waiting_for_data")
          return getOrderRequirements(rec).missingCount > 0;
        // Complete data: data complete and not yet assigned / reassigned
        return (
          !rec.isReassigned &&
          getOrderRequirements(rec).missingCount === 0 &&
          getOrderAssignmentStatus(rec) !== "assigned"
        );
      }),
    [preMtdRecords, rangeFilter]
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

      if (
        !isOrderScheduledAndAssigned(rec) ||
        getOrderStatus(rec).missingCount > 0
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
        order_status: "",
        status: "active",
        recordStatus: "Ongoing",
        mixStartDate: rec.mixStartDate,
        mixEndDate: rec.mixEndDate,
        assignedProducer: rec.assignedProducer,
      });
      // Jump to the MTD tab and highlight the row we just moved.
      router.push(`/mtd?focus=${encodeURIComponent(rec.id)}`);
    },
    [isViewOnly, router, updateMTD]
  );

  const openPricingModal = useCallback((rec: MTDRecord, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPricingRecord(rec);
  }, []);

  const handleRecordPricingSave = useCallback(
    (recordId: string, patch: { price: number; priceCompliance: PriceCompliance }) => {
      updateMTD(recordId, patch);
    },
    [updateMTD]
  );

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
    const base = !q
      ? tableFiltered
      : tableFiltered.filter((rec) => matchesMTDSearch(rec, q));
    // Moved-back (reassigned) orders pin to the top of the list.
    return [...base].sort((a, b) => {
      const aRe = a.isReassigned ? 1 : 0;
      const bRe = b.isReassigned ? 1 : 0;
      return bRe - aRe;
    });
  }, [tableFiltered, searchQuery]);

  const formCounts = useMemo(
    () => countMTDByForm(typeFilteredPreMtdRecords, orderById),
    [typeFilteredPreMtdRecords, orderById]
  );

  const cheerSubtypeCounts = useMemo(
    () => countMTDByCheerSubtype(typeFilteredPreMtdRecords, orderById),
    [typeFilteredPreMtdRecords, orderById]
  );

  const danceSubtypeCounts = useMemo(
    () => countMTDByDanceSubtype(typeFilteredPreMtdRecords, orderById),
    [typeFilteredPreMtdRecords, orderById]
  );

  const tableFilterKey = [
    rangeFilter,
    tableFilters.packageTier,
    tableFilters.timeLimit,
    tableFilters.split,
    tableFilters.assignedProducer,
    tableFilters.requestedProducer,
    tableFilters.scheduleFilter,
    tableFilters.infoFilter,
    tableFilters.dateFilter.type,
    String(tableFilters.dateFilter.value),
    searchQuery,
  ].join("-");

  // Table columns aligned with MTD layout and styling
  const columns: Column<MTDRecord>[] = useMemo(() => {
    const showMusicAffiliate =
      form === "school-all-star-cheer" || form === "school-all-star-dance";

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
        key: "contact",
        header: "Contact",
        width: "100px",
        align: "center" as const,
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[100px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => (
          <TruncatedText
            text={titleCase(rec.contactName || rec.editorInitials)}
            className={clsx("mx-auto w-full min-w-0 text-center", compactTextClass)}
            style={{ maxWidth: "100%" }}
          />
        ),
      },
      {
        key: "program",
        header: "Program",
        width: "100px",
        align: "center" as const,
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[100px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => (
          <TruncatedText
            text={titleCase(rec.programName)}
            className={clsx("mx-auto w-full min-w-0 text-center", compactTextClass)}
            style={{ maxWidth: "100%" }}
          />
        ),
      },
      {
        key: "package",
        header: "Package",
        width: "100px",
        align: "center" as const,
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[100px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => {
          const { tier } = parsePackage(rec.package);
          return (
            <TruncatedText
              text={titleCase(tier)}
              className={clsx("mx-auto w-full min-w-0 text-center font-medium", compactTextClass)}
              style={{ maxWidth: "100%" }}
            />
          );
        },
      },
      ...(form === "school-all-star-cheer"
        ? [
            {
              key: "limit",
              header: "Time limit",
              width: "100px",
              align: "center" as const,
              nowrap: false,
              cellClassName: clsx(compactCellClass, "max-w-[100px]"),
              headerClassName: compactHeaderClass,
              render: (rec: MTDRecord) => {
                const { limit } = parsePackage(rec.package);
                return (
                  <span className={clsx("mx-auto block text-center tabular-nums", compactTextClass)}>
                    {limit}
                  </span>
                );
              },
            },
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
                if (meta.cheerFormSubtype === "all-star-cheer") {
                  return (
                    <span className={clsx("mx-auto block text-center text-brand-ink-tertiary", compactTextClass)}>
                      N/A
                    </span>
                  );
                }
                const linked = rec.orderId ? orderById.get(rec.orderId) : undefined;
                const splitVal = linked?.splitOrNoSplit || parsePackage(rec.package).split;
                return (
                  <TruncatedText
                    text={splitVal || "N/A"}
                    className={clsx("mx-auto w-full min-w-0 text-center", compactTextClass)}
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
                const linked = rec.orderId ? orderById.get(rec.orderId) : undefined;
                const affiliate = linked?.musicAffiliate ?? (rec as MTDRecord & { musicAffiliate?: string }).musicAffiliate;
                if (!affiliate) {
                  return (
                    <span className={clsx("mx-auto block text-center text-brand-ink-tertiary", compactTextClass)}>
                      N/A
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
      {
        key: "music",
        header: "Music",
        width: "100px",
        align: "center" as const,
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[100px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => (
          <TruncatedText
            text={titleCase((rec.musicTheme || "").replace(/\s+/g, " ").trim())}
            className={clsx("mx-auto w-full min-w-0 text-center", compactTextClass)}
            style={{ maxWidth: "100%" }}
          />
        ),
      },
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
              isRushOrder: rec.isRushOrder ?? (order as Order & { isRushOrder?: boolean })?.isRushOrder,
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
              hasRallyMix: rec.hasRallyMix,
              hasExtend8ctAddon: rec.hasExtend8ctAddon,
              hasProcessing8ctSheetsAddon: rec.hasProcessing8ctSheetsAddon,
            });
            engineCustomerPrice = enginePricing.customerFacingPrice;
          }

          if (isUnpriced) {
            return (
              <div
                className="mx-auto flex w-full flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => openPricingModal(rec, e)}
                  title="Edit Package Price (Needs Quote)"
                  aria-label="Edit Package Price: Needs Quote"
                  className={clsx(
                    clickableChipClass,
                    "flex w-full flex-col items-center rounded-lg px-2 py-1 text-center border-brand-warning/35 bg-brand-warning/10"
                  )}
                >
                  <span className="text-[11px] font-semibold text-brand-warning whitespace-nowrap">
                    Needs Quote
                  </span>
                </button>
              </div>
            );
          }

          const isOverridden = Boolean(
            order?.finalCustomerPriceOverridden ?? rec.finalCustomerPriceOverridden
          );

          const numericEnginePrice = engineCustomerPrice ?? 0;

          const displayPrice = isOverridden
            ? (order?.finalCustomerPrice ?? rec.finalCustomerPrice ?? numericEnginePrice)
            : numericEnginePrice > 0
              ? numericEnginePrice
              : (order?.finalCustomerPrice ?? rec.price);

          return (
            <div
              className="mx-auto flex w-full flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={(e) => openPricingModal(rec, e)}
                title="Edit Package Price"
                aria-label={`Edit Package Price ${formatPrice(displayPrice)}`}
                className={clsx(
                  clickableChipClass,
                  "flex w-full flex-col items-center rounded-lg px-2 py-1 text-center"
                )}
              >
                <div className="flex items-center justify-center gap-1">
                  <p className="font-semibold tabular-nums text-[12px] text-brand-ink hover:text-brand-orange">
                    {formatPrice(displayPrice)}
                  </p>
                  {isOverridden ? (
                    <span className="rounded bg-brand-orange/10 px-1 py-0.5 text-[9px] font-semibold uppercase text-brand-orange ring-1 ring-inset ring-brand-orange/20">
                      edited
                    </span>
                  ) : null}
                </div>
              </button>
            </div>
          );
        },
      },
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
        header: "Data",
        width: "130px",
        align: "center" as const,
        nowrap: false,
        cellClassName: compactCellClass,
        headerClassName: compactHeaderClass,
        render: (rec: MTDRecord) => <OrderDataStatusBadge record={rec} />,
      },
      {
        key: "requestedEditor",
        header: "Requested producer",
        width: "100px",
        align: "center" as const,
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[100px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => {
          const linked = findLinkedOrder(rec, allOrders);
          const label = formatRequestedEditorLabel(rec, producers, linked);
          const requested = getRequestedEditorFromRecord(rec, producers, linked);
          const isFa = label === "FA";
          const unavailableReason =
            !isFa && requested
              ? getRequestedEditorUnavailableReason(
                  rec,
                  requested,
                  producers,
                  holidays
                )
              : null;
          const showUnavailable =
            Boolean(unavailableReason) &&
            (!rec.assignedProducer ||
              !producerKeysMatch(rec.assignedProducer, requested as string));
          const unavailableTitle = `${requested}: ${unavailableReason}`;

          return (
            <div className="inline-flex flex-col items-center gap-0.5">
              <span
                className={clsx(
                  "font-medium uppercase tabular-nums",
                  compactTextClass,
                  isFa ? "text-brand-info" : "text-brand-ink"
                )}
              >
                {isFa ? "FA" : label}
              </span>
              {showUnavailable ? (
                <HoverTip label={unavailableTitle} placement="top">
                  <span className={unavailableTagClass}>Unavailable</span>
                </HoverTip>
              ) : null}
            </div>
          );
        },
      },
      {
        key: "editor",
        header: "Assigned producer",
        width: "100px",
        align: "center" as const,
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[100px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => {
          const isMissingDataRow = rangeFilter === "waiting_for_data" || getOrderStatus(rec).status === "Missing Data";
          const assigned = getDisplayAssignedProducer(rec);
          const producer = assigned
            ? findProducerByAssignmentKey(assigned, producers)
            : undefined;
          const { missingCount } = getOrderStatus(rec);
          const assignBlockedByMissingData = missingCount > 0;
          const assignBlockedReason = assignBlockedByMissingData
            ? "Resolve missing data before assigning"
            : null;
          const assignLabel =
            rec.isReassigned ||
            rangeFilter === "reassigned" ||
            rangeFilter === "reassign_leave" ||
            rangeFilter === "reassign_rush"
              ? "Reassign"
              : "Assign";

          return (
            <div className={clsx("flex justify-center", isMissingDataRow && "opacity-40 pointer-events-none cursor-not-allowed")} onClick={(e) => e.stopPropagation()}>
              {assigned ? (
                <button
                  type="button"
                  disabled={isMissingDataRow}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    if (isMissingDataRow) return;
                    e.stopPropagation();
                    openAssignPage(rec.id);
                  }}
                  title={isMissingDataRow ? "Scheduling disabled in Missing Data" : "Edit assignment"}
                  aria-label={`Edit assignment for ${assigned}`}
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
                    label={assignBlockedReason ?? assignLabel}
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
                      aria-label={assignBlockedReason ?? assignLabel}
                    >
                      {assignLabel}
                    </button>
                  </HoverTip>
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: "mixStartDate",
        header: "Mix start date",
        width: "176px",
        align: "center" as const,
        nowrap: false,
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2",
        render: (rec) => {
          const needsReassign = Boolean(rec.isReassigned);
          const startIso =
            !needsReassign && rec.assignedProducer
              ? toIsoDateString(rec.mixStartDate)
              : "";
          const placeholder = needsReassign
            ? "Reassign producer to set"
            : "Assign producer to set";
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
        header: "Mix end date",
        width: "176px",
        align: "center" as const,
        nowrap: false,
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2",
        render: (rec) => {
          const needsReassign = Boolean(rec.isReassigned);
          const endIso =
            !needsReassign && rec.assignedProducer
              ? toIsoDateString(rec.mixEndDate ?? "")
              : "";
          const placeholder = needsReassign
            ? "Reassign producer to set"
            : "Assign producer to set";
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
        header: "Days booked",
        width: "120px",
        align: "center" as const,
        nowrap: false,
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
                  mixWorkDaysForRecord(rec, producers, holidays)
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
        key: "actions",
        header: "Actions",
        width: "150px",
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
            isAssigned &&
            !producerSentAt &&
            sameProducerAsLastSend &&
            (needsReassign || Boolean(rec.isReassigned));
          const awaitingProducerMail =
            isAssigned && !blockedByMissingData && !producerMailSatisfied;
          const ready =
            isAssigned &&
            isScheduled &&
            !blockedByMissingData &&
            producerMailSatisfied;
          const mtdBlockedReason = blockedByMissingData
            ? "Resolve missing data before moving to MTD"
            : !isAssigned && !isScheduled
              ? "Assign a producer and set schedule dates before moving to MTD"
              : !isAssigned
                ? "Assign a producer before moving to MTD"
                : !isScheduled
                  ? "Set start and end dates before moving to MTD"
                  : awaitingProducerMail
                    ? producerMailIsResend
                      ? "Resend producer email before moving to MTD"
                      : "Email producer before moving to MTD"
                    : null;
          const mtdDisabled = Boolean(mtdBlockedReason);
          return (
            <div
              className="flex items-center justify-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <HoverTip label="View" placement="top">
                <Link
                  href={`/orders/${rec.id}`}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-brand-line/60 bg-brand-elevated text-brand-ink-secondary shadow-sm transition hover:border-brand-signature/35 hover:bg-brand-signature/8 hover:text-brand-signature focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-signature/20"
                  aria-label={`View ${rec.programName || "order"}`}
                >
                  <Eye className="h-3.5 w-3.5" strokeWidth={2.25} />
                </Link>
              </HoverTip>
              {!isViewOnly ? (
                <HoverTip label="Edit" placement="top">
                  <Link
                    href={`/orders/${rec.id}?edit=1`}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-brand-line/60 bg-brand-elevated text-brand-ink-secondary shadow-sm transition hover:border-brand-signature/35 hover:bg-brand-signature/8 hover:text-brand-signature focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-signature/20"
                    aria-label={`Edit ${rec.programName || "order"}`}
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
                  </Link>
                </HoverTip>
              ) : null}
              {!isViewOnly ? (
                <HoverTip
                  label={mtdBlockedReason ?? "Move to MTD"}
                  placement="top"
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
                    className={ordersMtdButtonClass(ready, mtdDisabled)}
                    aria-label={mtdBlockedReason ?? "Move to MTD"}
                  >
                    <span>MTD</span>
                    <ArrowRight className="h-3 w-3 shrink-0" strokeWidth={2.25} />
                  </button>
                </HoverTip>
              ) : null}
            </div>
          );
        },
      },
      {
        key: "email",
        header: "Email",
        width: "140px",
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
    ];

    return baseCols;
  }, [
    form,
    rangeFilter,
    producers,
    holidays,
    allOrders,
    mtdRecords,
    orderById,
    updateMTD,
    handleMoveToMTD,
    openPricingModal,
    openAssignPage,
    isViewOnly,
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Orders"
        badge={`${filtered.length} of ${typeFilteredPreMtdRecords.length}`}
        subtitle="Pre-MTD order staging: assign producer, set dates, and move to MTD"
        action={{
          label: "Add New Order",
          onClick: () => setAddNewOrderOpen(true),
          showPlus: true,
        }}
        secondaryAction={{
          label: "Pricing",
          onClick: () => setPricingOpen(true),
          showPlus: false,
        }}
        exportAction={{
          label: "Export to CSV",
          onClick: () => {
            const csv = generateOrdersCsv(filtered, allOrders);
            triggerCsvDownload(`Orders_Export_${todayIso()}.csv`, csv);
          },
        }}
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: "Contact, program…",
        }}
        toolbar={
          <MTDPageToolbar
            form={form}
            cheerSubtype={cheerSubtype}
            danceSubtype={danceSubtype}
            rangeFilter={rangeFilter}
            onRangeFilterChange={setRangeFilter}
            allOrdersCount={allOrdersCount}
            needToBeScheduledCount={needToBeScheduledCount}
            newOrdersCount={newOrdersCount}
            assignedOrdersCount={assignedOrdersCount}
            notAssignedOrdersCount={notAssignedOrdersCount}
            reassignLeaveOrdersCount={reassignLeaveOrdersCount}
            reassignRushOrdersCount={reassignRushOrdersCount}
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
            onFiltersReset={() => setTableFilters(DEFAULT_MTD_TABLE_FILTERS)}
            onPricingClick={() => setPricingOpen(true)}
          />
        }
      />

      <div className="min-h-0 flex-1 overflow-auto px-6 pb-6 pt-5 lg:px-8">
        <div className="dashboard-panel dashboard-panel-framed overflow-hidden">
          <DataTable
            key={`${form}-${cheerSubtype}-${danceSubtype}-${tableFilterKey}`}
            data={filtered}
            columns={columns}
            rowKey={(rec) => rec.id}
            emptyMessage={
              isLoading ? "Loading orders…" : "No pending pre-MTD orders found."
            }
            pageSize={15}
            embedded
            showScrollIndicator={true}
            highlightRowKey={highlightId}
            onClearHighlight={clearHighlight}
          />
        </div>
      </div>

      {/* Pricing Reference Modal */}
      <SetPricingModal
        open={pricingOpen}
        form={form}
        cheerSubtype={cheerSubtype}
        danceSubtype={danceSubtype}
        onClose={() => setPricingOpen(false)}
      />

      <SetRecordPricingModal
        open={Boolean(pricingRecord)}
        record={pricingRecord}
        packagePrices={packagePrices}
        musicAffiliateInfo={
          pricingRecord
            ? getRecordMusicAffiliateInfo(pricingRecord, orderById, allOrders)
            : null
        }
        onClose={() => setPricingRecord(null)}
        onSave={handleRecordPricingSave}
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
        producers={producers}
        mtdRecords={mtdRecords}
        allOrders={allOrders}
        schedule={schedule}
        studioHolidays={holidays}
        initialFormType={form}
        initialCheerSubtype={cheerSubtype}
        initialDanceSubtype={danceSubtype}
        onAdd={addManualScheduleEntry}
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
