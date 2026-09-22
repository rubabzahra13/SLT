"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Trash2, Mic, Zap } from "lucide-react";
import { AddVoiceoverModal } from "@/components/payroll/AddVoiceoverModal";
import { AddRushFeeModal } from "@/components/payroll/AddRushFeeModal";
import { PageHeader } from "@/components/layout/PageHeader";
import { MTDPageToolbar } from "@/components/mtd/MTDPageToolbar";
import { PayrollSendPanel } from "@/components/payroll/PayrollSendPanel";
import { PayrollSendToolbar } from "@/components/payroll/PayrollSendToolbar";
import { ReturnToMTDModal } from "@/components/mtd/ReturnToMTDModal";
import {
  DEFAULT_MTD_TABLE_FILTERS,
  type MTDTableFilterState,
} from "@/components/mtd/MTDTableFilters";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs } from "@/components/ui/Tabs";
import { useAppState } from "@/context/AppStateContext";
import { formatDisplayDate, toCanonicalIsoDate, toIsoDateString } from "@/lib/dates";
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
  patchReturnFromPayroll,
} from "@/lib/mtd-completion";
import {
  countMTDByCheerSubtype,
  countMTDByDanceSubtype,
  countMTDByForm,
  filterMTDRecords,
  matchesFormFilter,
  matchesMTDSearch,
  resolveMTDFormMeta,
} from "@/lib/mtd-filters";
import { parsePackage } from "@/lib/package";
import { findLinkedOrder, findProducerByAssignmentKey } from "@/lib/editor-assignment";
import type {
  CheerFormSubtype,
  CheerFormSubtypeFilter,
  DanceFormSubtype,
  DanceFormSubtypeFilter,
  MTDRecord,
  OrderFormType,
  PayrollAddon,
} from "@/types";

import {
  InlineDanceVoiceoverPills,
  InlineCheerVoiceoverPills,
} from "@/components/mtd/InlineFields";
import { computeClientPayroll } from "@/lib/pricing-display";
import {
  getPayrollSendProducerNames,
  resolvePayrollSendEditorProducers,
} from "@/lib/payroll-send-filters";
import {
  producerMatchesScheduleFormFilter,
  scheduleFormFilterLabel,
} from "@/lib/schedule-filters";

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";
type PayrollPageTab = "view" | "send";
const DEFAULT_CHEER_SUBTYPE: CheerFormSubtypeFilter = "all";
const DEFAULT_DANCE_SUBTYPE: DanceFormSubtypeFilter = "all";

const actionLinkClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-line/70 bg-brand-bg/60 text-brand-ink-secondary shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/25";

export default function PayrollPage() {
  const {
    mtdRecords,
    allOrders,
    producers,
    payrollAddons,
    addPayrollAddon,
    removePayrollAddon,
    updateMTD,
    isViewOnly,
  } = useAppState();
  const [returnRecord, setReturnRecord] = useState<MTDRecord | null>(null);
  const [pageTab, setPageTab] = useState<PayrollPageTab>("view");
  const [selectedSendEditor, setSelectedSendEditor] = useState("all");
  const [voiceoverModalOpen, setVoiceoverModalOpen] = useState(false);
  const [rushFeeModalOpen, setRushFeeModalOpen] = useState(false);
  const [addonDeleteId, setAddonDeleteId] = useState<string | null>(null);

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
    if (savedSearch !== null) setSearchQueryState(savedSearch);
    if (savedTableFilters) {
      try {
        const parsed = JSON.parse(savedTableFilters);
        if (parsed && typeof parsed === "object") setTableFiltersState(parsed);
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

  const orderById = useMemo(
    () => new Map(allOrders.map((order) => [order.id, order])),
    [allOrders]
  );

  const switchForm = useCallback(
    (next: OrderFormType) => {
      setForm(next);
      if (next !== "school-all-star-cheer") {
        setCheerSubtype("all");
      }
      if (next !== "school-all-star-dance") {
        setDanceSubtype("all");
      }
    },
    [setForm, setCheerSubtype, setDanceSubtype]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedForm = sessionStorage.getItem("slt_payroll_form");
    if (savedForm) return;

    if (payrollRecords.length === 0) return;

    const hasVisibleForForm = payrollRecords.some((rec) =>
      matchesFormFilter(rec, orderById, form, cheerSubtype, danceSubtype)
    );
    if (hasVisibleForForm) return;

    const latest = payrollRecords[0];
    const meta = resolveMTDFormMeta(latest, orderById);
    setFormState(meta.formType);
    if (meta.formType === "school-all-star-cheer" && meta.cheerFormSubtype) {
      setCheerSubtypeState(meta.cheerFormSubtype as CheerFormSubtypeFilter);
    }
    if (meta.formType === "school-all-star-dance" && meta.danceFormSubtype) {
      setDanceSubtypeState(meta.danceFormSubtype as DanceFormSubtypeFilter);
    }
  }, [payrollRecords, orderById, form, cheerSubtype, danceSubtype]);

  const tableFiltered = useMemo(
    () =>
      filterMTDRecords(payrollRecords, {
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
      payrollRecords,
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

  const totalPayroll = useMemo(() => {
    const mixTotal = filtered.reduce((sum, rec) => {
      const order = orderById.get(rec.orderId || "");
      const producerObj = findProducerByAssignmentKey(rec.assignedProducer, producers);
      const meta = resolveMTDFormMeta(rec, orderById);
      const custPrice = order?.finalCustomerPrice ?? rec.finalCustomerPrice ?? rec.price;
      const payrollPrice = rec.finalPayrollPrice ?? order?.finalPayrollPrice ?? rec.price;
      const rushQty = typeof rec.rushFeeQuantity === "number"
        ? rec.rushFeeQuantity
        : rec.rushFeeOption === "double"
        ? 2
        : rec.rushFeeOption === "single" || rec.isRushOrder === "yes" || rec.isRushOrder === true
        ? 1
        : 0;

      const calc = computeClientPayroll(
        producerObj,
        custPrice,
        null,
        rec.rateUsed ?? order?.rateUsed ?? null,
        rec.manualPayoutInput ?? null,
        meta.canonicalSubtypeId,
        payrollPrice,
        {
          rushFeeQuantity: rushQty,
          rushFeeCompensationRate: rec.rushFeeCompensationRate ?? producerObj?.rushFeeRate ?? 1.0,
          danceVoiceover: rec.danceVoiceover,
          hasTraditionalVoiceover: rec.hasTraditionalVoiceover,
          hasThemedVoiceover: rec.hasThemedVoiceover,
          cheerVoiceover20: rec.cheerVoiceover20,
          cheerVoiceover40: rec.cheerVoiceover40,
          formType: meta.formType,
        }
      );
      const payout = calc.producerPayout ?? rec.producerPayout ?? order?.producerPayout ?? 0;
      return sum + payout;
    }, 0);

    const addonTotal = payrollAddons.reduce((sum, a) => sum + a.amount, 0);
    return mixTotal + addonTotal;
  }, [filtered, orderById, producers, payrollAddons]);

  const formCounts = useMemo(
    () => countMTDByForm(payrollRecords, orderById),
    [payrollRecords, orderById]
  );

  const cheerSubtypeCounts = useMemo(
    () => countMTDByCheerSubtype(payrollRecords, orderById),
    [payrollRecords, orderById]
  );

  const danceSubtypeCounts = useMemo(
    () => countMTDByDanceSubtype(payrollRecords, orderById),
    [payrollRecords, orderById]
  );

  const emptyMessage = useMemo(() => {
    if (payrollRecords.length === 0) {
      return "No completed mixes in payroll yet. On MTD, set status to Completed and click Confirm & Move to Payroll in the final step.";
    }
    if (filtered.length === 0) {
      return "No mixes match the current category or filters. Try another tab or clear filters.";
    }
    return "No mixes to show.";
  }, [payrollRecords.length, filtered.length]);

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

  const confirmReturn = useCallback(() => {
    if (!returnRecord) return;
    updateMTD(returnRecord.id, patchReturnFromPayroll());
    setReturnRecord(null);
  }, [returnRecord, updateMTD]);

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

  const sendProducerNames = useMemo(
    () =>
      getPayrollSendProducerNames(
        sendPayrollRecords,
        orderById,
        producers,
        form,
        cheerSubtype,
        danceSubtype,
        sendPayPeriodBounds
      ),
    [
      sendPayrollRecords,
      orderById,
      producers,
      form,
      cheerSubtype,
      danceSubtype,
      sendPayPeriodBounds,
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

  const showCheerVoiceover = form === "school-all-star-cheer";
  const showDanceVoiceover = form === "school-all-star-dance";

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
        width: "160px",
        align: "center",
        nowrap: false,
        cellClassName: "!px-3 !py-2",
        headerClassName: "!px-3 !py-2",
        render: (rec) => (
          <p className="text-center text-[13px] font-medium text-brand-ink">
            {titleCase(rec.programName)}
          </p>
        ),
      },
      {
        key: "editor",
        header: "Editor",
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
        header: "Mix start",
        width: "112px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => (
          <span className="text-[12px] tabular-nums text-brand-ink-secondary">
            {formatDisplayDate(toIsoDateString(rec.mixStartDate))}
          </span>
        ),
      },
      {
        key: "mixEnd",
        header: "Mix end",
        width: "112px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => (
          <span className="text-[12px] tabular-nums text-brand-ink-secondary">
            {formatDisplayDate(toIsoDateString(rec.mixEndDate ?? ""))}
          </span>
        ),
      },
      {
        key: "package",
        header: "Package",
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
              header: "Time limit",
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
            rec.systemCalculatedCustomerPrice ??
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

      if (showDanceVoiceover) {
        baseCols.push({
          key: "voiceoverCol",
          header: "Voice Over",
          width: "135px",
          align: "center",
          cellClassName: "!px-2 !py-2",
          headerClassName: "!px-2 !py-2",
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
          cellClassName: "!px-2 !py-2",
          headerClassName: "!px-2 !py-2",
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

      baseCols.push(
      {
        key: "payout",
        header: "Producer Payout",
        width: "148px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => {
          const order = findLinkedOrder(rec, allOrders);
          const producerObj = findProducerByAssignmentKey(
            rec.assignedProducer,
            producers
          );
          const model = producerObj?.compensationModel;
          const meta = resolveMTDFormMeta(rec, orderById);
          const custPrice = order?.finalCustomerPrice ?? rec.finalCustomerPrice ?? rec.price;
          const payrollPrice = rec.finalPayrollPrice ?? order?.finalPayrollPrice ?? rec.price;
          const rushQty = typeof rec.rushFeeQuantity === "number"
            ? rec.rushFeeQuantity
            : rec.rushFeeOption === "double"
            ? 2
            : rec.rushFeeOption === "single" || rec.isRushOrder === "yes" || rec.isRushOrder === true
            ? 1
            : 0;

          const calculated = computeClientPayroll(
            producerObj,
            custPrice,
            null,
            rec.rateUsed ?? order?.rateUsed ?? null,
            rec.manualPayoutInput ?? null,
            meta.canonicalSubtypeId,
            payrollPrice,
            {
              rushFeeQuantity: rushQty,
              rushFeeCompensationRate: rec.rushFeeCompensationRate ?? producerObj?.rushFeeRate ?? 1.0,
              danceVoiceover: rec.danceVoiceover,
              hasTraditionalVoiceover: rec.hasTraditionalVoiceover,
              hasThemedVoiceover: rec.hasThemedVoiceover,
              cheerVoiceover20: rec.cheerVoiceover20,
              cheerVoiceover40: rec.cheerVoiceover40,
              formType: meta.formType,
            }
          );

          const payout = calculated.producerPayout ?? rec.producerPayout ?? order?.producerPayout;
          const isRateOverridden =
            rec.rateSource === "manual_override" ||
            order?.rateSource === "manual_override";
          const isPriceOverridden = Boolean(
            rec.finalCustomerPriceOverridden || order?.finalCustomerPriceOverridden
          );

          if (model === "not_paid_for_mixing") {
            return (
              <div className="flex flex-col items-center">
                <span className="text-[12px] font-semibold tabular-nums text-brand-ink">
                  $0.00
                </span>
                <span className="text-[10px] text-brand-ink-tertiary">
                  Not Paid for Mixing
                </span>
              </div>
            );
          }

          if (model === "hourly_manual") {
            return (
              <div className="flex flex-col items-center">
                <span className="text-[12px] font-semibold tabular-nums text-brand-ink">
                  {payout !== undefined && payout !== null
                    ? formatPrice(payout)
                    : "Hourly"}
                </span>
                <span className="text-[10px] text-brand-ink-tertiary">
                  Manual Pay Sheet
                </span>
              </div>
            );
          }

          if (payout === undefined || payout === null) {
            return (
              <div className="flex flex-col items-center">
                <span className="text-[12px] font-semibold tabular-nums text-brand-orange">
                  Needs Review
                </span>
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
        key: "actions",
        header: "Actions",
        width: "148px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => (
          <div
            className="flex items-center justify-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {!isViewOnly && (
              <button
                type="button"
                onClick={() => setReturnRecord(rec)}
                className="rounded-lg border border-brand-line/60 bg-brand-elevated px-2.5 py-1.5 text-[11px] font-semibold text-brand-signature shadow-sm transition hover:border-brand-signature/40 hover:bg-brand-blue-soft/40"
              >
                Return to MTD
              </button>
            )}
            <Link
              href={`/payroll/${rec.id}`}
              title={isViewOnly ? "View record" : "Open record"}
              aria-label={`Open ${rec.programName}`}
              className={actionLinkClass}
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
    [allOrders, producers, form, showCheerVoiceover, showDanceVoiceover, updateMTD, orderById]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        compact
        title="Payroll"
        badge={
          pageTab === "view"
            ? `${filtered.length} of ${payrollRecords.length} · ${formatPrice(totalPayroll)}`
            : undefined
        }
        subtitle={
          pageTab === "view"
            ? "Completed mixes ready for payout"
            : "Filter editors, preview statements, and send via Gmail"
        }
        tabs={
          <Tabs
            accent="orange"
            value={pageTab}
            onChange={(value) => setPageTab(value as PayrollPageTab)}
            options={[
              { value: "view", label: "View Payroll" },
              {
                value: "send",
                label: "Send Statements",
                count: sendProducerNames.length || undefined,
              },
            ]}
          />
        }
        exportAction={
          pageTab === "view"
            ? {
                label: "Export to CSV",
                onClick: () => {
                  const csv = generatePayrollCsv(filtered, allOrders, producers);
                  triggerCsvDownload(`Payroll_Export_${todayIso()}.csv`, csv);
                },
              }
            : undefined
        }
        search={
          pageTab === "view"
            ? {
                value: searchQuery,
                onChange: setSearchQuery,
                placeholder: "Contact, invoice…",
              }
            : undefined
        }
        toolbar={
          pageTab === "view" ? (
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
              records={payrollRecords}
              producers={producers}
              orderById={orderById}
              filters={tableFilters}
              onFiltersChange={(patch) =>
                setTableFilters((prev) => ({ ...prev, ...patch }))
              }
              onFiltersReset={() => setTableFilters(DEFAULT_MTD_TABLE_FILTERS)}
            />
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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6 pt-5 lg:px-8">
        {pageTab === "view" ? (
          <>
            <div className="dashboard-panel dashboard-panel-framed min-h-0 flex-1 overflow-hidden">
              <DataTable
                key={`${form}-${cheerSubtype}-${danceSubtype}-${tableFilterKey}`}
                columns={columns}
                data={filtered}
                rowKey={(rec) => rec.id}
                href={(rec) => `/payroll/${rec.id}`}
                emptyMessage={emptyMessage}
                pageSize={15}
                embedded
                showScrollIndicator={false}
              />
            </div>

            {/* Payroll Add-ons section */}
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-brand-ink">
                    Payroll Add-ons
                  </span>
                  {payrollAddons.length > 0 && (
                    <span className="rounded-full bg-brand-orange/15 px-2 py-0.5 text-xs font-semibold text-brand-orange">
                      {payrollAddons.length}
                    </span>
                  )}
                </div>
                {!isViewOnly && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      id="add-voiceover-btn"
                      onClick={() => setVoiceoverModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-line bg-brand-bg px-3 py-1.5 text-xs font-medium text-brand-ink-secondary shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/20 hover:text-brand-orange"
                    >
                      <Mic className="h-3.5 w-3.5" />
                      Add Voiceover
                    </button>
                    <button
                      type="button"
                      id="add-rush-fee-btn"
                      onClick={() => setRushFeeModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-line bg-brand-bg px-3 py-1.5 text-xs font-medium text-brand-ink-secondary shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/20 hover:text-brand-orange"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Add Rush Fee
                    </button>
                  </div>
                )}
              </div>

              {payrollAddons.length === 0 ? (
                <div className="rounded-xl border border-brand-line/60 bg-brand-bg/60 px-4 py-3 text-xs text-brand-ink-faint">
                  No standalone voiceover or rush fee add-ons yet. Use the buttons above to add them.
                </div>
              ) : (
                <div className="dashboard-panel dashboard-panel-framed overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-brand-line">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-brand-ink-faint">Date</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-brand-ink-faint">Program</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-brand-ink-faint">Category</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-brand-ink-faint">Type</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-brand-ink-faint">Producer</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-brand-ink-faint">Amount</th>
                        {!isViewOnly && (
                          <th className="w-8 px-2 py-2.5" />
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {payrollAddons.map((addon) => (
                        <tr
                          key={addon.id}
                          className="border-b border-brand-line/50 last:border-b-0 hover:bg-brand-hover/40"
                        >
                          <td className="px-4 py-2.5 text-xs text-brand-ink-secondary">
                            {formatDisplayDate(addon.createdAt)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-sm font-medium text-brand-ink">{addon.programName}</span>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-brand-ink-secondary">
                            {addon.category}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                addon.addonType === "voiceover"
                                  ? "bg-blue-500/10 text-blue-600"
                                  : "bg-amber-500/10 text-amber-600"
                              }`}
                            >
                              {addon.addonType === "voiceover" ? (
                                <><Mic className="h-3 w-3" /> Voiceover</>
                              ) : (
                                <><Zap className="h-3 w-3" /> Rush Fee</>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-brand-ink-secondary">
                            {addon.producerInitials ?? "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm font-semibold text-brand-ink">
                            {formatPrice(addon.amount)}
                          </td>
                          {!isViewOnly && (
                            <td className="px-2 py-2.5">
                              {addonDeleteId === addon.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAddon(addon.id)}
                                    className="rounded px-1.5 py-0.5 text-xs font-semibold text-red-500 hover:bg-red-50"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setAddonDeleteId(null)}
                                    className="rounded px-1.5 py-0.5 text-xs text-brand-ink-faint hover:bg-brand-hover"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setAddonDeleteId(addon.id)}
                                  className="flex h-6 w-6 items-center justify-center rounded text-brand-ink-faint transition hover:bg-red-50 hover:text-red-500"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-brand-line bg-brand-bg/40">
                        <td colSpan={5} className="px-4 py-2.5 text-xs font-semibold text-brand-ink-secondary">
                          Add-on Total
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm font-bold text-brand-ink">
                          {formatPrice(payrollAddons.reduce((s, a) => s + a.amount, 0))}
                        </td>
                        {!isViewOnly && <td />}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
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
            payrollAddons={payrollAddons}
          />
        )}
      </div>

      <ReturnToMTDModal
        open={Boolean(returnRecord)}
        record={returnRecord}
        onClose={() => setReturnRecord(null)}
        onConfirm={confirmReturn}
      />

      <AddVoiceoverModal
        open={voiceoverModalOpen}
        onClose={() => setVoiceoverModalOpen(false)}
        programOptions={programOptions}
        producers={producers}
        onAdd={addPayrollAddon}
      />

      <AddRushFeeModal
        open={rushFeeModalOpen}
        onClose={() => setRushFeeModalOpen(false)}
        programOptions={programOptions}
        producers={producers}
        onAdd={addPayrollAddon}
      />
    </div>
  );
}
