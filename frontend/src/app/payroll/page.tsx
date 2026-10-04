"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Mic, Pencil, Trash2, Zap } from "lucide-react";
import { AddVoiceoverModal } from "@/components/payroll/AddVoiceoverModal";
import { AddRushFeeModal } from "@/components/payroll/AddRushFeeModal";
import { PageHeader } from "@/components/layout/PageHeader";
import { MTDPageToolbar } from "@/components/mtd/MTDPageToolbar";
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
  getArchivedPayrollRecords,
  getPayrollRecords,
  patchMarkPayrollPaid,
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
type PayrollPageTab = "view" | "archive" | "send";
const DEFAULT_CHEER_SUBTYPE: CheerFormSubtypeFilter = "all";
const DEFAULT_DANCE_SUBTYPE: DanceFormSubtypeFilter = "all";

const addonAmountChipClass =
  "inline-flex h-7 items-center rounded-full bg-brand-success/10 px-2.5 text-[12px] font-semibold tabular-nums text-brand-success ring-1 ring-inset ring-brand-success/20";
const addonAddBtnClass =
  "inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-brand-line/70 bg-transparent px-2.5 text-[11px] font-medium text-brand-ink-tertiary transition hover:border-brand-signature/40 hover:bg-brand-signature/6 hover:text-brand-signature";
const addonEditBtnClass =
  "inline-flex h-7 w-7 items-center justify-center rounded-full text-brand-ink-tertiary transition hover:bg-brand-signature/10 hover:text-brand-signature";
const addonRemoveBtnClass =
  "inline-flex h-7 w-7 items-center justify-center rounded-full text-brand-ink-tertiary transition hover:bg-brand-danger/10 hover:text-brand-danger";
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
    mtdRecords,
    allOrders,
    producers,
    payrollAddons,
    addPayrollAddon,
    removePayrollAddon,
    updateMTD,
    removeMTDRecord,
    isViewOnly,
  } = useAppState();
  const [pageTab, setPageTab] = useState<PayrollPageTab>("view");
  const [highlightId, setHighlightId] = useState<string | null>(focusParam);
  const [selectedSendEditor, setSelectedSendEditor] = useState("all");
  const [voiceoverRecord, setVoiceoverRecord] = useState<MTDRecord | null>(null);
  const [rushFeeRecord, setRushFeeRecord] = useState<MTDRecord | null>(null);
  const [addonDeleteId, setAddonDeleteId] = useState<string | null>(null);
  const [deleteForeverRecord, setDeleteForeverRecord] =
    useState<MTDRecord | null>(null);
  const [deletingForever, setDeletingForever] = useState(false);


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

  const archivedPayrollRecords = useMemo(
    () =>
      [...getArchivedPayrollRecords(mtdRecords)].sort((a, b) =>
        (b.paidAt ?? b.completedAt ?? "").localeCompare(
          a.paidAt ?? a.completedAt ?? ""
        )
      ),
    [mtdRecords]
  );

  const sourceRecords =
    pageTab === "archive" ? archivedPayrollRecords : payrollRecords;

  const markPaid = useCallback(
    (rec: MTDRecord) => {
      if (isViewOnly) return;
      updateMTD(rec.id, patchMarkPayrollPaid());
      const meta = resolveMTDFormMeta(
        rec,
        new Map(allOrders.map((order) => [order.id, order]))
      );
      setFormState(meta.formType);
      if (meta.formType === "school-all-star-cheer" && meta.cheerFormSubtype) {
        setCheerSubtypeState(meta.cheerFormSubtype as CheerFormSubtypeFilter);
      }
      if (meta.formType === "school-all-star-dance" && meta.danceFormSubtype) {
        setDanceSubtypeState(meta.danceFormSubtype as DanceFormSubtypeFilter);
      }
      setHighlightId(rec.id);
      setPageTab("archive");
    },
    [isViewOnly, updateMTD, allOrders]
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
    } catch {
      // Error toast from removeMTDRecord
    } finally {
      setDeletingForever(false);
    }
  }, [isViewOnly, deleteForeverRecord, deletingForever, removeMTDRecord]);

  const orderById = useMemo(
    () => new Map(allOrders.map((order) => [order.id, order])),
    [allOrders]
  );

  useEffect(() => {
    if (!focusParam) return;
    const focused =
      mtdRecords.find(
        (r) =>
          r.id === focusParam ||
          r.orderId === focusParam ||
          r.uuid === focusParam ||
          r.legacyId === focusParam
      ) ?? null;
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
  }, [focusParam, mtdRecords, orderById]);

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

  const tableFiltered = useMemo(
    () =>
      filterMTDRecords(sourceRecords, {
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
      sourceRecords,
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
      // Prefer live producer rates after Producers-tab edits; keep only explicit
      // admin overrides snapshotted on the mix/order.
      const rateIsManual =
        rec.rateSource === "manual_override" ||
        order?.rateSource === "manual_override";
      const selectedRate = rateIsManual
        ? rec.rateUsed ?? order?.rateUsed ?? null
        : null;

      const calc = computeClientPayroll(
        producerObj,
        custPrice,
        null,
        selectedRate,
        rec.manualPayoutInput ?? null,
        meta.canonicalSubtypeId,
        payrollPrice,
        {
          rushFeeQuantity: rushQty,
          rushFeeCompensationRate: producerObj?.rushFeeRate ?? rec.rushFeeCompensationRate ?? 1.0,
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
    () => countMTDByForm(sourceRecords, orderById),
    [sourceRecords, orderById]
  );

  const cheerSubtypeCounts = useMemo(
    () => countMTDByCheerSubtype(sourceRecords, orderById),
    [sourceRecords, orderById]
  );

  const danceSubtypeCounts = useMemo(
    () => countMTDByDanceSubtype(sourceRecords, orderById),
    [sourceRecords, orderById]
  );

  const emptyMessage = useMemo(() => {
    if (pageTab === "archive") {
      if (archivedPayrollRecords.length === 0) {
        return "No paid mixes in archive yet. Mark a mix as Paid on View Payroll to move it here.";
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
    archivedPayrollRecords.length,
    payrollRecords.length,
    filtered.length,
  ]);

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

  const handleReplaceAddon = useCallback(
    async (payload: Parameters<typeof addPayrollAddon>[0]) => {
      const match = payrollAddons.find(
        (a) =>
          a.addonType === payload.addonType &&
          ((payload.mtdId && a.mtdId === payload.mtdId) ||
            (payload.orderId && a.orderId === payload.orderId))
      );
      if (match) {
        await removePayrollAddon(match.id);
      }
      return addPayrollAddon(payload);
    },
    [payrollAddons, removePayrollAddon, addPayrollAddon]
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
  const addonsLocked = isViewOnly || pageTab === "archive";

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

          const rateIsManual =
            rec.rateSource === "manual_override" ||
            order?.rateSource === "manual_override";
          const selectedRate = rateIsManual
            ? rec.rateUsed ?? order?.rateUsed ?? null
            : null;

          const calculated = computeClientPayroll(
            producerObj,
            custPrice,
            null,
            selectedRate,
            rec.manualPayoutInput ?? null,
            meta.canonicalSubtypeId,
            payrollPrice,
            {
              rushFeeQuantity: rushQty,
              rushFeeCompensationRate:
                producerObj?.rushFeeRate ?? rec.rushFeeCompensationRate ?? 1.0,
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
        key: "voiceover",
        header: "Voiceover",
        width: "150px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => {
          const voAddon = payrollAddons.find(
            (a) =>
              (a.mtdId === rec.id || a.orderId === rec.orderId) &&
              a.addonType === "voiceover"
          );
          const voAmount = voAddon
            ? voAddon.amount
            : rec.cheerVoiceover40
              ? 40
              : rec.cheerVoiceover20
                ? 20
                : rec.danceVoiceover && !isNaN(parseFloat(rec.danceVoiceover))
                  ? parseFloat(rec.danceVoiceover)
                  : 0;
          const hasVoiceover = voAmount > 0;

          return (
            <div
              className="flex items-center justify-center gap-1 whitespace-nowrap"
              onClick={(e) => e.stopPropagation()}
            >
              {hasVoiceover ? (
                <span className={addonAmountChipClass}>
                  {formatPrice(voAmount)}
                </span>
              ) : null}
              {!addonsLocked && !hasVoiceover ? (
                <button
                  type="button"
                  onClick={() => setVoiceoverRecord(rec)}
                  title="Add Voiceover"
                  className={addonAddBtnClass}
                >
                  <Mic className="h-3 w-3" strokeWidth={2.25} />
                  <span>Add</span>
                </button>
              ) : null}
              {!addonsLocked && hasVoiceover ? (
                <>
                  <button
                    type="button"
                    onClick={() => setVoiceoverRecord(rec)}
                    title="Edit Voiceover"
                    className={addonEditBtnClass}
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  {voAddon ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteAddon(voAddon.id)}
                      title="Remove Voiceover"
                      className={addonRemoveBtnClass}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          );
        },
      },
      {
        key: "rushFee",
        header: "Rush Fee",
        width: "140px",
        align: "center",
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2 !py-2",
        render: (rec) => {
          const rushAddon = payrollAddons.find(
            (a) =>
              (a.mtdId === rec.id || a.orderId === rec.orderId) &&
              a.addonType === "rush_fee"
          );
          const rushAmount = rushAddon
            ? rushAddon.amount
            : rec.rushFeeQuantity === 2 || rec.rushFeeOption === "double"
              ? 300
              : rec.rushFeeQuantity === 1 ||
                  rec.rushFeeOption === "single" ||
                  rec.isRushOrder === "yes" ||
                  rec.isRushOrder === true
                ? 150
                : 0;
          const hasRush = rushAmount > 0;

          return (
            <div
              className="flex items-center justify-center gap-1 whitespace-nowrap"
              onClick={(e) => e.stopPropagation()}
            >
              {hasRush ? (
                <span className={addonAmountChipClass}>
                  {formatPrice(rushAmount)}
                </span>
              ) : null}
              {!addonsLocked && !hasRush ? (
                <button
                  type="button"
                  onClick={() => setRushFeeRecord(rec)}
                  title="Add Rush Fee"
                  className={addonAddBtnClass}
                >
                  <Zap className="h-3 w-3" strokeWidth={2.25} />
                  <span>Add</span>
                </button>
              ) : null}
              {!addonsLocked && hasRush ? (
                <>
                  <button
                    type="button"
                    onClick={() => setRushFeeRecord(rec)}
                    title="Edit Rush Fee"
                    className={addonEditBtnClass}
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  {rushAddon ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteAddon(rushAddon.id)}
                      title="Remove Rush Fee"
                      className={addonRemoveBtnClass}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
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
                : "—"}
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
                onClick={() => markPaid(rec)}
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
      allOrders,
      producers,
      form,
      addonsLocked,
      isViewOnly,
      payrollAddons,
      orderById,
      handleDeleteAddon,
      pageTab,
      markPaid,
    ]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        compact
        title="Payroll"
        badge={
          pageTab === "view"
            ? `${filtered.length} of ${payrollRecords.length} · ${formatPrice(totalPayroll)}`
            : pageTab === "archive"
              ? `${filtered.length} of ${archivedPayrollRecords.length}`
              : undefined
        }
        subtitle={
          pageTab === "view"
            ? "Ready for payout"
            : pageTab === "archive"
              ? "Paid mixes · delete forever when done"
              : "Filter producers, preview statements, and send via Gmail"
        }
        tabs={
          <Tabs
            accent="orange"
            value={pageTab}
            onChange={(value) => setPageTab(value as PayrollPageTab)}
            options={[
              { value: "view", label: "View Payroll" },
              {
                value: "archive",
                label: "Archive",
                count: archivedPayrollRecords.length || undefined,
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
                value: searchQuery,
                onChange: setSearchQuery,
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
              formCounts={formCounts}
              cheerCounts={cheerSubtypeCounts}
              danceCounts={danceSubtypeCounts}
              records={sourceRecords}
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

      <div className="min-h-0 flex-1 overflow-auto px-2 pb-6 pt-5 lg:px-3">
        {pageTab === "view" || pageTab === "archive" ? (
          <div className="dashboard-panel dashboard-panel-framed overflow-hidden">
            <DataTable
              key={`${pageTab}-${form}-${cheerSubtype}-${danceSubtype}-${tableFilterKey}`}
              columns={columns}
              data={filtered}
              rowKey={(rec) => rec.id}
              emptyMessage={emptyMessage}
              pageSize={15}
              embedded
              showScrollIndicator={false}
              highlightRowKey={highlightId}
              onClearHighlight={clearHighlight}
            />
          </div>
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

      <AddVoiceoverModal
        open={Boolean(voiceoverRecord)}
        onClose={() => setVoiceoverRecord(null)}
        record={voiceoverRecord}
        allOrders={allOrders}
        producers={producers}
        onAdd={handleReplaceAddon}
      />

      <AddRushFeeModal
        open={Boolean(rushFeeRecord)}
        onClose={() => setRushFeeRecord(null)}
        record={rushFeeRecord}
        allOrders={allOrders}
        producers={producers}
        onAdd={handleReplaceAddon}
      />

      {deleteForeverRecord && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <button
                type="button"
                className="absolute inset-0 bg-brand-scrim backdrop-blur-sm"
                onClick={() => {
                  if (!deletingForever) setDeleteForeverRecord(null);
                }}
                aria-label="Close"
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-forever-title"
                className="relative w-full max-w-[400px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
              >
                <div className="px-6 pb-5 pt-7 text-center">
                  <h2
                    id="delete-forever-title"
                    className="text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
                  >
                    Delete forever?
                  </h2>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-brand-ink-secondary">
                    {titleCase(deleteForeverRecord.programName)}
                    {deleteForeverRecord.invoice?.trim()
                      ? ` · #${deleteForeverRecord.invoice.trim()}`
                      : ""}{" "}
                    will be permanently removed from the payroll archive. This
                    cannot be undone.
                  </p>
                </div>
                <div className="flex flex-col border-t border-black/[0.08]">
                  <button
                    type="button"
                    disabled={deletingForever}
                    onClick={() => void confirmDeleteForever()}
                    className="border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-danger transition hover:bg-brand-orange-soft/60 disabled:opacity-60"
                  >
                    {deletingForever ? "Deleting…" : "Delete forever"}
                  </button>
                  <button
                    type="button"
                    disabled={deletingForever}
                    onClick={() => setDeleteForeverRecord(null)}
                    className="py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

