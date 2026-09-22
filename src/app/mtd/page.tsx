"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, Lock, Pencil } from "lucide-react";
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
  InlineDateInput,
  InlineDanceVoiceoverPills,
  InlineCheerVoiceoverPills,
  InlineRushFeePills,
  InlineQuantityStepper,
} from "@/components/mtd/InlineFields";
import {
  AssignEditorModal,
  type EditorAssignmentResult,
} from "@/components/mtd/AssignEditorModal";
import { SetPricingModal } from "@/components/mtd/SetPricingModal";
import { SetInvoicesModal } from "@/components/mtd/SetInvoicesModal";
import { SetInvoiceModal } from "@/components/mtd/SetInvoiceModal";
import { SetRecordPricingModal } from "@/components/mtd/SetRecordPricingModal";
import { CompleteToPayrollModal } from "@/components/mtd/CompleteToPayrollModal";
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
  calculateCheerOrderPricing,
  calculateDanceOrderPricing,
  calculateMarchingBandOrderPricing,
  calculateSportsEntertainmentOrderPricing,
  calculateSchoolAnthemOrderPricing,
} from "@/lib/pricing-engine";
import { formatSlotForDisplay } from "@/lib/scheduling";
import { inferMTDRecordStatus, patchFromRecordStatus } from "@/lib/mtd-status";
import {
  canCompleteForPayroll,
  canSetOngoingOrOutsourced,
  getMTDBoardRecords,
  patchMoveToPayroll,
} from "@/lib/mtd-completion";
import { formatDisplayDate, isIsoDateBefore, toIsoDateString } from "@/lib/dates";
import { todayIso } from "@/lib/date-filters";
import { generateMTDCsv, triggerCsvDownload } from "@/lib/export-csv";
import {
  findLinkedOrder,
  findProducerByAssignmentKey,
  formatRequestedEditorLabel,
  getDisplayAssignedProducer,
  getEditorBookedUntilIso,
  getRequestedEditorFromRecord,
  isRequestedEditorUnavailableForMixWindow,
  producerKeysMatch,
} from "@/lib/editor-assignment";
import {
  countMTDByCheerSubtype,
  countMTDByDanceSubtype,
  countMTDByForm,
  filterMTDRecords,
  getRecordMusicAffiliateInfo,
  hasMixStartDate,
  isMTDRecord,
  matchesAssignedProducerFilter,
  matchesFormFilter,
  matchesMTDSearch,
  resolveMTDFormMeta,
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
import { MTD_RECORD_STATUS_OPTIONS } from "@/types";
import clsx from "clsx";

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";
const DEFAULT_CHEER_SUBTYPE: CheerFormSubtype = "all-star-cheer";
const DEFAULT_DANCE_SUBTYPE: DanceFormSubtypeFilter = "all";

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

const unavailableTagClass =
  "inline-flex items-center rounded-full bg-brand-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-brand-warning ring-1 ring-inset ring-brand-warning/25";

const tableDateClass = "!w-auto min-w-[108px] max-w-full";
const tableStatusSelectClass =
  "!h-8 !min-h-0 !w-auto min-w-[132px] max-w-full !py-0";
const compactCellClass = "!px-1 !py-1 overflow-hidden";
const compactHeaderClass = "!px-2";
const compactTextClass = "text-[12px] leading-none text-brand-ink";

function multilineTableCell(value: string, maxWidth = "180px") {
  if (!value?.trim()) {
    return (
      <span
        className={clsx("mx-auto block w-full min-w-0 max-w-full truncate text-center", compactTextClass)}
        style={{ maxWidth }}
      >
        —
      </span>
    );
  }

  const display = titleCase(value.replace(/\s+/g, " ").trim());

  return (
    <TruncatedText
      text={display}
      className={clsx("mx-auto block w-full min-w-0 max-w-full truncate text-center", compactTextClass)}
      style={{ maxWidth }}
    />
  );
}

function MTDPageContent() {
  const {
    mtdRecords,
    allOrders,
    updateMTD,
    updateOrder,
    setPackagePrices,
    setSecretMenuPrices,
    packagePrices,
    secretMenuPrices,
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

  const searchParams = useSearchParams();
  const assignedParam = searchParams.get("assigned");
  const scheduleParam = searchParams.get("schedule");

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

  const [searchQuery, setSearchQuery] = useState("");
  const [assignRecordId, setAssignRecordId] = useState<string | null>(null);
  const assignRecord = useMemo(
    () =>
      assignRecordId
        ? mtdRecords.find((record) => record.id === assignRecordId) ?? null
        : null,
    [assignRecordId, mtdRecords]
  );
  const [invoiceRecord, setInvoiceRecord] = useState<MTDRecord | null>(null);
  const [pricingRecord, setPricingRecord] = useState<MTDRecord | null>(null);
  const [invoicesOpen, setInvoicesOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [completeRecord, setCompleteRecord] = useState<MTDRecord | null>(null);
  const [blockedRecord, setBlockedRecord] = useState<MTDRecord | null>(null);
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
        ...(result.mixStartDate ? { mixStartDate: result.mixStartDate } : {}),
        ...(result.mixEndDate ? { mixEndDate: result.mixEndDate } : {}),
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
    },
    []
  );

  const handleMoveToOrders = useCallback(
    (rec: MTDRecord, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isViewOnly) return;

      updateMTD(rec.id, {
        inMTD: false,
        isReassigned: true,
        status: "active",
      });
    },
    [isViewOnly, updateMTD]
  );

  const openInvoiceModal = useCallback(
    (rec: MTDRecord, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setInvoiceRecord(rec);
    },
    []
  );

  const openPricingModal = useCallback(
    (rec: MTDRecord, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setPricingRecord(rec);
    },
    []
  );

  const handleInvoiceSave = useCallback(
    (recordId: string, invoice: string) => {
      updateMTD(recordId, { invoice });
    },
    [updateMTD]
  );

  const handleRecordPricingSave = useCallback(
    (
      recordId: string,
      patch: { price: number; priceCompliance: PriceCompliance }
    ) => {
      updateMTD(recordId, patch);
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
    (mtdPatch?: Partial<MTDRecord>, orderPatch?: Partial<Order>) => {
      if (!completeRecord) return;
      const basePatch = patchMoveToPayroll();
      updateMTD(completeRecord.id, { ...basePatch, ...mtdPatch });
      if (completeRecord.orderId && orderPatch) {
        updateOrder(completeRecord.orderId, orderPatch);
      }
      setCompleteRecord(null);
    },
    [completeRecord, updateMTD, updateOrder]
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
    const q = searchQuery.trim();
    if (!q) return tableFiltered;
    return tableFiltered.filter((rec) => matchesMTDSearch(rec, q));
  }, [tableFiltered, searchQuery]);

  const formCounts = useMemo(
    () => countMTDByForm(mtdBoardRecords, orderById),
    [mtdBoardRecords, orderById]
  );

  const cheerSubtypeCounts = useMemo(
    () => countMTDByCheerSubtype(mtdBoardRecords, orderById),
    [mtdBoardRecords, orderById]
  );

  const danceSubtypeCounts = useMemo(
    () => countMTDByDanceSubtype(mtdBoardRecords, orderById),
    [mtdBoardRecords, orderById]
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
    searchQuery,
  ].join("-");

  const columns: Column<MTDRecord>[] = useMemo(() => {
    const showRallyMix = false; // Removed per spec: Rally Mix is a package, not an add-on

    const showYouthAddons =
      form === "school-all-star-cheer" &&
      (cheerSubtype === "youth-rec-cheer" || cheerSubtype === "all");

    const showCheerVoiceover = false; // Removed from MTD per spec (Voiceover is strictly Payroll internal)
    const showDanceVoiceover = false; // Removed from MTD per spec (Voiceover is strictly Payroll internal)
    const showMusicAffiliate =
      form === "school-all-star-cheer" || form === "school-all-star-dance";
    const showMarchingAddons = form === "marching-band";

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
        header: "Contact",
        width: "100px",
        align: "center" as const,
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[100px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => (
          <TruncatedText
            text={titleCase(rec.contactName)}
            className={clsx("mx-auto w-full min-w-0 text-center", compactTextClass)}
            style={{ maxWidth: "100%" }}
          />
        ),
      },
      {
        key: "programD",
        header: "Program",
        width: "100px",
        align: "center" as const,
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[100px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => multilineTableCell(rec.programName, "100%"),
      },
      {
        key: "packageE",
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
              key: "limitE",
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
              key: "splitE",
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
        key: "themeF",
        header: "Music",
        width: "100px",
        align: "center" as const,
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[100px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => multilineTableCell(rec.musicTheme, "100%"),
      },
      {
        key: "chosenInitialsF",
        header: "Requested editor",
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
          const showUnavailable =
            !isFa &&
            requested &&
            isRequestedEditorUnavailableForMixWindow(
              rec,
              requested,
              mtdRecords,
              producers
            ) &&
            (!rec.assignedProducer ||
              !producerKeysMatch(rec.assignedProducer, requested));

          const bookedUntil = requested
            ? getEditorBookedUntilIso(requested, mtdRecords, rec.id)
            : "";
          const unavailableTitle = requested
            ? bookedUntil
              ? `${requested} booked till ${formatDisplayDate(bookedUntil)}`
              : `${requested} is booked on other mixes`
            : "Requested editor is unavailable";

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
            : (numericEnginePrice > 0
                ? numericEnginePrice
                : (order?.finalCustomerPrice ?? rec.price));

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
                  {isOverridden && (
                    <span className="rounded bg-brand-orange/10 px-1 py-0.2 text-[9px] font-semibold uppercase text-brand-orange ring-1 ring-inset ring-brand-orange/20">
                      edited
                    </span>
                  )}
                </div>
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
          const endIso = toIsoDateString(rec.mixEndDate ?? "");

          return (
            <InlineCell
              centered
              footer={
                rec.assignedProducer && !hasMixStartDate(rec) ? (
                  <span
                    className="text-brand-ink-tertiary"
                    title="Next available slot for this producer on the team schedule"
                  >
                    Next slot ·{" "}
                    {formatSlotForDisplay(
                      rec.assignedProducer,
                      producers,
                      schedule
                    )}
                  </span>
                ) : null
              }
            >
              <InlineDateInput
                value={rec.mixStartDate}
                max={endIso || undefined}
                readOnly={isViewOnly}
                className={tableDateClass}
                onChange={(v) => updateMTD(rec.id, { mixStartDate: v })}
              />
            </InlineCell>
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
          const startIso = toIsoDateString(rec.mixStartDate);

          return (
            <InlineCell centered>
              <InlineDateInput
                value={rec.mixEndDate ?? ""}
                min={startIso || undefined}
                readOnly={isViewOnly}
                className={tableDateClass}
                onChange={(v) => {
                  if (!v) {
                    updateMTD(rec.id, { mixEndDate: v });
                    return;
                  }
                  if (startIso && isIsoDateBefore(v, startIso)) {
                    return;
                  }
                  updateMTD(rec.id, { mixEndDate: v });
                }}
              />
            </InlineCell>
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
        header: "Editor",
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
                  title="Editors are assigned on the Orders tab"
                  className="inline-flex items-center gap-1 rounded-md border border-brand-line/70 bg-brand-bg/50 px-2 py-1 text-[10px] font-medium text-brand-ink-tertiary"
                >
                  <Lock className="h-3 w-3" strokeWidth={2} />
                  No editor
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: "rushFeeCol",
        header: "Rush Fee",
        width: "165px",
        align: "center",
        nowrap: false,
        cellClassName: "!px-2 !py-2",
        headerClassName: "!px-2",
        render: (rec) => (
          <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
            <InlineRushFeePills
              record={rec}
              readOnly={isViewOnly}
              onUpdate={(id, patch) => updateMTD(id, patch)}
              onUpdateOrder={(orderId, patch) => updateOrder(orderId, patch)}
            />
          </div>
        ),
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
        width: "130px",
        align: "center",
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[130px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => (
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
            <Link
              href={`/mtd/${rec.id}`}
              title={isViewOnly ? "View record" : "Open record"}
              aria-label={`Open ${rec.programName}`}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-line/70 bg-brand-bg/60 text-brand-ink-secondary shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/25"
            >
              {isViewOnly ? (
                <Eye className="h-3.5 w-3.5" strokeWidth={2} />
              ) : (
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              )}
            </Link>
          </div>
        ),
      }
    );

    return baseCols;
  },
  [
    form,
    cheerSubtype,
    updateMTD,
    handleMoveToOrders,
    allOrders,
    mtdRecords,
    producers,
    schedule,
    openAssignModal,
    openInvoiceModal,
    openPricingModal,
  ]
);

  return (
    <>
      <PageHeader
        title="Music To Do"
        badge={`${filtered.length} of ${mtdBoardRecords.length}`}
        subtitle="Assign editors, set pricing, and track mix progress"
        action={{
          label: "Pricing",
          onClick: () => setPricingOpen(true),
          showPlus: false,
        }}
        exportAction={{
          label: "Export to CSV",
          onClick: () => {
            const csv = generateMTDCsv(filtered, allOrders, producers);
            triggerCsvDownload(`MTD_Export_${todayIso()}.csv`, csv);
          },
        }}
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: "Contact, invoice…",
        }}
        toolbar={
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
            records={mtdBoardRecords}
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

      <div className="px-6 pb-6 pt-5 lg:px-8">
        <div className="dashboard-panel dashboard-panel-framed overflow-hidden">
          <DataTable
            key={`${form}-${cheerSubtype}-${danceSubtype}-${tableFilterKey}`}
            columns={columns}
            data={filtered}
            rowKey={(rec) => rec.id}
            href={(rec) => `/mtd/${rec.id}`}
            emptyMessage="No MTD entries match this filter."
            pageSize={15}
            embedded
            showScrollIndicator={true}
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

      <SetRecordPricingModal
        open={Boolean(pricingRecord)}
        record={pricingRecord}
        packagePrices={packagePrices}
        readOnly={isViewOnly}
        musicAffiliateInfo={
          pricingRecord
            ? getRecordMusicAffiliateInfo(pricingRecord, orderById, allOrders)
            : null
        }
        onClose={() => setPricingRecord(null)}
        onSave={handleRecordPricingSave}
      />

      <SetInvoicesModal
        open={invoicesOpen}
        records={filtered}
        onClose={() => setInvoicesOpen(false)}
        onSave={handleInvoicesSave}
      />

      <SetPricingModal
        open={pricingOpen}
        form={form}
        cheerSubtype={cheerSubtype}
        danceSubtype={danceSubtype}
        onClose={() => setPricingOpen(false)}
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
    </>
  );
}

export default function MTDPage() {
  return (
    <Suspense fallback={null}>
      <MTDPageContent />
    </Suspense>
  );
}
