"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { HoverTip } from "@/components/ui/HoverTip";
import { TruncatedText } from "@/components/ui/TruncatedText";
import { InlineDateInput } from "@/components/mtd/InlineFields";
import {
  AssignEditorModal,
  type EditorAssignmentResult,
} from "@/components/mtd/AssignEditorModal";
import { SetPricingModal } from "@/components/mtd/SetPricingModal";
import { SetRecordPricingModal } from "@/components/mtd/SetRecordPricingModal";
import { CompletionBlockedModal } from "@/components/mtd/CompletionBlockedModal";
import { MoveToMtdConfirmModal } from "@/components/mtd/MoveToMtdConfirmModal";
import { ForwardOrderMailModal } from "@/components/orders/ForwardOrderMailModal";
import {
  DEFAULT_MTD_TABLE_FILTERS,
  type MTDTableFilterState,
} from "@/components/mtd/MTDTableFilters";
import { MTDPageToolbar } from "@/components/mtd/MTDPageToolbar";
import { useAppState } from "@/context/AppStateContext";
import { formatPrice, titleCase } from "@/lib/data";
import {
  calculateCheerOrderPricing,
  calculateDanceOrderPricing,
  calculateMarchingBandOrderPricing,
  calculateSchoolAnthemOrderPricing,
  calculateSportsEntertainmentOrderPricing,
} from "@/lib/pricing-engine";
import { formatDisplayDate, isIsoDateBefore, toIsoDateString } from "@/lib/dates";
import { todayIso } from "@/lib/date-filters";
import { generateOrdersCsv, triggerCsvDownload } from "@/lib/export-csv";
import { parsePackage } from "@/lib/package";
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
  isPreMTDOrderRecord,
  isOrderScheduledAndAssigned,
  matchesMTDSearch,
  resolveMTDFormMeta,
} from "@/lib/mtd-filters";
import type {
  CheerFormSubtypeFilter,
  DanceFormSubtypeFilter,
  MTDRecord,
  Order,
  OrderFormType,
  PriceCompliance,
} from "@/types";

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";
const DEFAULT_CHEER_SUBTYPE: CheerFormSubtypeFilter = "all-star-cheer";
const DEFAULT_DANCE_SUBTYPE: DanceFormSubtypeFilter = "all";

const unavailableTagClass =
  "inline-flex items-center rounded-full bg-brand-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-brand-warning ring-1 ring-inset ring-brand-warning/25";
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
const ordersMailIconButtonClass =
  "inline-flex h-7 w-7 items-center justify-center rounded-md border border-brand-line/60 bg-brand-elevated text-brand-ink-secondary shadow-sm transition hover:border-brand-signature/35 hover:bg-brand-signature/8 hover:text-brand-signature focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-signature/20";
const clickableChipClass =
  "cursor-pointer border border-brand-line/70 bg-brand-bg/60 shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/25";
const tableDateClass = "!w-auto min-w-[108px] max-w-full";
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

function OrdersPageContent() {
  const {
    mtdRecords,
    allOrders,
    updateMTD,
    producers,
    schedule,
    packagePrices,
    secretMenuPrices,
    setPackagePrices,
    setSecretMenuPrices,
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

  const searchParams = useSearchParams();
  const assignedParam = searchParams.get("assigned");
  const scheduleParam = searchParams.get("schedule");

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
  const [assignRecordId, setAssignRecordId] = useState<string | null>(null);
  const [validationModalRecord, setValidationModalRecord] = useState<MTDRecord | null>(null);
  const [moveConfirmRecord, setMoveConfirmRecord] = useState<MTDRecord | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [pricingRecord, setPricingRecord] = useState<MTDRecord | null>(null);
  const [mailRecord, setMailRecord] = useState<MTDRecord | null>(null);

  // Pre-MTD records
  const preMtdRecords = useMemo(
    () => mtdRecords.filter(isPreMTDOrderRecord),
    [mtdRecords]
  );

  const assignRecord = useMemo(
    () =>
      assignRecordId
        ? preMtdRecords.find((record) => record.id === assignRecordId) ?? null
        : null,
    [assignRecordId, preMtdRecords]
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

  const handleAssign = useCallback(
    (recordId: string, result: EditorAssignmentResult) => {
      updateMTD(recordId, {
        editorRequest: result.editorRequest,
        assignedProducer: result.assignedProducer,
        ...(result.mixStartDate ? { mixStartDate: result.mixStartDate } : {}),
        ...(result.mixEndDate ? { mixEndDate: result.mixEndDate } : {}),
      });
    },
    [updateMTD]
  );

  const { isViewOnly } = useAppState();

  const handleMoveToMTD = useCallback(
    (rec: MTDRecord, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isViewOnly) return;

      if (!isOrderScheduledAndAssigned(rec)) {
        setValidationModalRecord(rec);
        return;
      }

      setMoveConfirmRecord(rec);
    },
    [isViewOnly, updateMTD]
  );

  const confirmMoveToMTD = useCallback(() => {
    const rec = moveConfirmRecord;
    if (!rec) return;
    updateMTD(rec.id, {
      inMTD: true,
      status: "active",
      recordStatus: "Ongoing",
      mixStartDate: rec.mixStartDate,
      mixEndDate: rec.mixEndDate,
      assignedProducer: rec.assignedProducer,
    });
    setMoveConfirmRecord(null);
  }, [moveConfirmRecord, updateMTD]);

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
      filterMTDRecords(preMtdRecords, {
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
      preMtdRecords,
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
    () => countMTDByForm(preMtdRecords, orderById),
    [preMtdRecords, orderById]
  );

  const cheerSubtypeCounts = useMemo(
    () => countMTDByCheerSubtype(preMtdRecords, orderById),
    [preMtdRecords, orderById]
  );

  const danceSubtypeCounts = useMemo(
    () => countMTDByDanceSubtype(preMtdRecords, orderById),
    [preMtdRecords, orderById]
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
        render: (rec) => multilineTableCell(rec.programName, "100%"),
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
        render: (rec) => multilineTableCell(rec.musicTheme, "100%"),
      },
      {
        key: "requestedEditor",
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
        key: "mixStartDate",
        header: "Mix start date",
        width: "128px",
        align: "center" as const,
        nowrap: false,
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2",
        render: (rec) => {
          return (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <InlineDateInput
                value={rec.mixStartDate}
                className={tableDateClass}
                onChange={(next) => {
                  let nextEnd = rec.mixEndDate;
                  // Keep the mix window valid: if the new start is on/after the
                  // existing end (or no end yet), push the end to start + 7 days.
                  if (next) {
                    const endIso = toIsoDateString(nextEnd ?? "");
                    if (!endIso || !isIsoDateBefore(next, endIso)) {
                      const d = new Date(`${next}T12:00:00`);
                      d.setDate(d.getDate() + 7);
                      nextEnd = d.toISOString().slice(0, 10);
                    }
                  }
                  updateMTD(rec.id, { mixStartDate: next, mixEndDate: nextEnd });
                }}
              />
            </div>
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
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <InlineDateInput
                value={rec.mixEndDate ?? ""}
                min={startIso || undefined}
                className={tableDateClass}
                onChange={(next) => updateMTD(rec.id, { mixEndDate: next })}
              />
            </div>
          );
        },
      },
      {
        key: "editor",
        header: "Editor",
        width: "100px",
        align: "center" as const,
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[100px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => {
          const assigned = getDisplayAssignedProducer(rec);
          const producer = assigned
            ? findProducerByAssignmentKey(assigned, producers)
            : undefined;

          return (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              {assigned ? (
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setAssignRecordId(rec.id);
                  }}
                  title="Edit assignment"
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
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAssignRecordId(rec.id);
                    }}
                    className={actionButtonClass(false)}
                  >
                    Assign
                  </button>
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: "actions",
        header: "Actions",
        width: "112px",
        align: "center" as const,
        nowrap: false,
        cellClassName: compactCellClass,
        headerClassName: compactHeaderClass,
        render: (rec) => {
          const ready = isOrderScheduledAndAssigned(rec);
          return (
            <div
              className="flex items-center justify-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {!isViewOnly ? (
                <HoverTip label="Move to MTD" placement="top">
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => handleMoveToMTD(rec, e)}
                    className={ordersMtdButtonClass(ready)}
                    aria-label="Move to MTD"
                  >
                    <span>MTD</span>
                    <ArrowRight className="h-3 w-3 shrink-0" strokeWidth={2.25} />
                  </button>
                </HoverTip>
              ) : null}
              <HoverTip label="Send mail" placement="top">
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setMailRecord(rec)}
                  className={ordersMailIconButtonClass}
                  aria-label="Send mail"
                >
                  <Mail className="h-3.5 w-3.5" strokeWidth={2.25} />
                </button>
              </HoverTip>
            </div>
          );
        },
      },
    ];

    return baseCols;
  }, [
    form,
    producers,
    allOrders,
    mtdRecords,
    orderById,
    updateMTD,
    handleMoveToMTD,
    openPricingModal,
  ]);

  return (
    <>
      <PageHeader
        title="Orders"
        badge={`${filtered.length} of ${preMtdRecords.length}`}
        subtitle="Pre-MTD order staging: assign editor, set dates, and move to MTD"
        action={{
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
            onFormChange={switchForm}
            onCheerSubtypeChange={setCheerSubtype}
            onDanceSubtypeChange={setDanceSubtype}
            formCounts={formCounts}
            cheerCounts={cheerSubtypeCounts}
            danceCounts={danceSubtypeCounts}
            records={preMtdRecords}
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
            data={filtered}
            columns={columns}
            rowKey={(rec) => rec.id}
            onRowClick={(rec) => {
              window.location.href = `/orders/${rec.id}`;
            }}
            emptyMessage="No pending pre-MTD orders found."
            pageSize={15}
            embedded
            showScrollIndicator={true}
          />
        </div>
      </div>

      {/* Assign Editor Modal */}
      <AssignEditorModal
        open={Boolean(assignRecordId)}
        record={assignRecord}
        mtdRecords={mtdRecords}
        allOrders={allOrders}
        producers={producers}
        schedule={schedule}
        onClose={() => setAssignRecordId(null)}
        onAssign={handleAssign}
      />

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

      <MoveToMtdConfirmModal
        open={Boolean(moveConfirmRecord)}
        record={moveConfirmRecord}
        onClose={() => setMoveConfirmRecord(null)}
        onConfirm={confirmMoveToMTD}
      />

      <ForwardOrderMailModal
        open={Boolean(mailRecord)}
        record={mailRecord}
        orderById={orderById}
        allOrders={allOrders}
        producers={producers}
        onClose={() => setMailRecord(null)}
      />
    </>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[13px] text-brand-ink-tertiary">Loading orders...</div>}>
      <OrdersPageContent />
    </Suspense>
  );
}
