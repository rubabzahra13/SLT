"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Eye, Pencil, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MTDPageToolbar } from "@/components/mtd/MTDPageToolbar";
import { ReturnToMTDModal } from "@/components/mtd/ReturnToMTDModal";
import {
  DEFAULT_MTD_TABLE_FILTERS,
  type MTDTableFilterState,
} from "@/components/mtd/MTDTableFilters";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Avatar } from "@/components/ui/Avatar";
import { DateFilter, type DateFilterValue } from "@/components/ui/DateFilter";
import { ProducerSelect } from "@/components/ui/ProducerSelect";
import { useAppState } from "@/context/AppStateContext";
import { doDateRangesOverlap, formatDisplayDate, toCanonicalIsoDate, toIsoDateString } from "@/lib/dates";
import { calculateDateBounds, todayIso } from "@/lib/date-filters";
import { generatePayrollCsv, generateProducerFacingPayrollCsv, triggerCsvDownload } from "@/lib/export-csv";
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
} from "@/types";

import {
  InlineDanceVoiceoverPills,
  InlineCheerVoiceoverPills,
} from "@/components/mtd/InlineFields";
import { computeClientPayroll } from "@/lib/pricing-display";

import { ProducerStatementPreview } from "@/components/payroll/ProducerStatementPreview";

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";
const DEFAULT_CHEER_SUBTYPE: CheerFormSubtypeFilter = "all";
const DEFAULT_DANCE_SUBTYPE: DanceFormSubtypeFilter = "all";

const actionLinkClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-line/70 bg-brand-bg/60 text-brand-ink-secondary shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/25";

export default function PayrollPage() {
  const { mtdRecords, allOrders, producers, updateMTD, isViewOnly } = useAppState();
  const [returnRecord, setReturnRecord] = useState<MTDRecord | null>(null);

  const [isPreviewMode, setIsPreviewMode] = useState(false);

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

  const [sendPrepProducer, setSendPrepProducer] = useState<string>("all");
  const [sendPrepPeriod, setSendPrepPeriod] = useState<DateFilterValue>({
    type: "last2Weeks",
    value: null,
  });

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

  const totalPayroll = useMemo(
    () =>
      filtered.reduce((sum, rec) => {
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
      }, 0),
    [filtered, orderById, producers]
  );

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

  const sendPrepButtonLabel = useMemo(() => {
    if (sendPrepProducer === "all") {
      return "Send to All (Prepare & Download)";
    }
    const found = producers.find((p) => p.id === sendPrepProducer || p.name === sendPrepProducer);
    const name = found ? found.name : sendPrepProducer;
    return `Send to ${name} (Prepare & Download)`;
  }, [sendPrepProducer, producers]);

  const handleSendPrepDownload = useCallback(() => {
    const bounds = calculateDateBounds(sendPrepPeriod.type, sendPrepPeriod.value);
    const filterPeriod = {
      start: bounds.start ? toCanonicalIsoDate(bounds.start) : "",
      end: bounds.end ? toCanonicalIsoDate(bounds.end) : "",
    };

    const dateMatchingRecords = payrollRecords.filter((rec) => {
      const recStart = rec.completedAt || rec.mixStartDate || "";
      const recEnd = rec.completedAt || rec.mixEndDate || rec.mixStartDate || "";
      return doDateRangesOverlap({ start: recStart, end: recEnd }, filterPeriod);
    });

    if (sendPrepProducer === "all") {
      const distinctProducers = Array.from(
        new Set(
          dateMatchingRecords
            .map((r) => {
              if (!r.assignedProducer) return null;
              const p = findProducerByAssignmentKey(r.assignedProducer, producers);
              return p?.name || r.assignedProducer;
            })
            .filter(Boolean) as string[]
        )
      );

      if (distinctProducers.length === 0) {
        if (typeof window !== "undefined") {
          alert("No completed records found for the selected pay period.");
        }
        return;
      }

      distinctProducers.forEach((targetName) => {
        const prodRecords = dateMatchingRecords.filter((r) => {
          const p = findProducerByAssignmentKey(r.assignedProducer, producers);
          return p?.name === targetName || r.assignedProducer === targetName;
        });

        const csv = generateProducerFacingPayrollCsv(
          prodRecords,
          allOrders,
          producers,
          targetName
        );
        triggerCsvDownload(
          `Payroll_Producer_Statement_${targetName.replace(/\s+/g, "_")}_${todayIso()}.csv`,
          csv
        );
      });
    } else {
      const targetProdObj = producers.find(
        (p) => p.name === sendPrepProducer || p.id === sendPrepProducer
      );
      const targetName = targetProdObj?.name || sendPrepProducer;

      const prodRecords = dateMatchingRecords.filter((r) => {
        const p = findProducerByAssignmentKey(r.assignedProducer, producers);
        return (
          r.assignedProducer === sendPrepProducer ||
          r.assignedProducer === targetProdObj?.id ||
          p?.name === targetName
        );
      });

      const csv = generateProducerFacingPayrollCsv(
        prodRecords,
        allOrders,
        producers,
        targetName
      );
      triggerCsvDownload(
        `Payroll_Producer_Statement_${targetName.replace(/\s+/g, "_")}_${todayIso()}.csv`,
        csv
      );
    }
  }, [sendPrepPeriod, sendPrepProducer, payrollRecords, allOrders, producers]);

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
            <div className="flex items-center justify-center gap-1.5">
              <Avatar producer={producer} initials={rec.assignedProducer} size="xs" />
              <span className="text-[12px] font-semibold text-brand-ink">
                {rec.assignedProducer}
              </span>
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

  if (isPreviewMode) {
    return (
      <ProducerStatementPreview
        selectedProducer={sendPrepProducer}
        onProducerChange={setSendPrepProducer}
        selectedPeriod={sendPrepPeriod}
        onPeriodChange={setSendPrepPeriod}
        payrollRecords={payrollRecords}
        allOrders={allOrders}
        producers={producers}
        onBack={() => setIsPreviewMode(false)}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Payroll"
        badge={`${filtered.length} of ${payrollRecords.length} · ${formatPrice(totalPayroll)}`}
        subtitle="Completed mixes ready for payout"
        exportAction={{
          label: "Export to CSV",
          onClick: () => {
            const csv = generatePayrollCsv(filtered, allOrders, producers);
            triggerCsvDownload(`Payroll_Export_${todayIso()}.csv`, csv);
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
            records={payrollRecords}
            producers={producers}
            orderById={orderById}
            filters={tableFilters}
            onFiltersChange={(patch) =>
              setTableFilters((prev) => ({ ...prev, ...patch }))
            }
            onFiltersReset={() => setTableFilters(DEFAULT_MTD_TABLE_FILTERS)}
          />
        }
      />

      <div className="px-6 pb-6 pt-5 lg:px-8 space-y-4">
        {/* Producer Statement Send-Preparation Workflow Panel */}
        <div className="dashboard-panel relative z-20 !overflow-visible p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-brand-line/70 bg-brand-surface/90 shadow-sm rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange ring-1 ring-inset ring-brand-orange/20">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-brand-ink">
                Producer Statement Preparation
              </h3>
              <p className="text-[12px] text-brand-ink-secondary">
                Select editor and pay period to generate & download producer-safe payout statements.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ProducerSelect
              producers={producers}
              value={sendPrepProducer}
              onChange={setSendPrepProducer}
              label="Editor:"
              allLabel="All Editors"
            />

            <div className="flex items-center gap-2">
              <label className="text-[12px] font-semibold text-brand-ink-secondary">
                Payroll Period:
              </label>
              <DateFilter
                value={sendPrepPeriod}
                onChange={setSendPrepPeriod}
              />
            </div>

            <button
              type="button"
              onClick={() => setIsPreviewMode(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-line/80 bg-brand-elevated px-3 text-[12px] font-semibold text-brand-ink shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange active:scale-[0.98]"
            >
              <Eye className="h-3.5 w-3.5 text-brand-orange" />
              <span>View Payroll</span>
            </button>

            <button
              type="button"
              onClick={handleSendPrepDownload}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-cta px-3.5 text-[12px] font-semibold text-brand-cta-text shadow-sm transition hover:bg-brand-cta-hover active:scale-[0.98]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{sendPrepButtonLabel}</span>
            </button>
          </div>
        </div>

        <div className="dashboard-panel dashboard-panel-framed overflow-hidden">
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
      </div>

      <ReturnToMTDModal
        open={Boolean(returnRecord)}
        record={returnRecord}
        onClose={() => setReturnRecord(null)}
        onConfirm={confirmReturn}
      />
    </>
  );
}
