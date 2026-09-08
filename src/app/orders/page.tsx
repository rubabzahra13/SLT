"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, AlertCircle } from "lucide-react";
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
import {
  DEFAULT_MTD_TABLE_FILTERS,
  type MTDTableFilterState,
} from "@/components/mtd/MTDTableFilters";
import { MTDPageToolbar } from "@/components/mtd/MTDPageToolbar";
import { useAppState } from "@/context/AppStateContext";
import { formatPrice, titleCase } from "@/lib/data";
import { complianceLabel } from "@/lib/pricing";
import { determineComplianceStatus } from "@/lib/pricing-engine";
import { formatDisplayDate, toIsoDateString } from "@/lib/dates";
import {
  formatRequestedEditorLabel,
  findLinkedOrder,
  findProducerByAssignmentKey,
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
  isPreMTDOrderRecord,
  isOrderScheduledAndAssigned,
  matchesMTDSearch,
  resolveMTDFormMeta,
} from "@/lib/mtd-filters";
import type {
  CheerFormSubtype,
  CheerFormSubtypeFilter,
  DanceFormSubtypeFilter,
  MTDRecord,
  Order,
  OrderFormType,
} from "@/types";

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";
const DEFAULT_CHEER_SUBTYPE: CheerFormSubtypeFilter = "all-star-cheer";
const DEFAULT_DANCE_SUBTYPE: DanceFormSubtypeFilter = "all";

const unavailableTagClass =
  "inline-flex items-center rounded-full bg-brand-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-brand-warning ring-1 ring-inset ring-brand-warning/25";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [assignRecordId, setAssignRecordId] = useState<string | null>(null);
  const [validationModalRecord, setValidationModalRecord] = useState<MTDRecord | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);

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

  const handleMoveToMTD = useCallback(
    (rec: MTDRecord, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!isOrderScheduledAndAssigned(rec)) {
        setValidationModalRecord(rec);
        return;
      }

      updateMTD(rec.id, {
        inMTD: true,
        status: rec.status === "needs_attention" ? "active" : rec.status,
      });
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

  // Table columns (Strict 11 Columns matching MTD UI styling)
  const columns: Column<MTDRecord>[] = useMemo(
    () => [
      {
        key: "id",
        header: "ID",
        width: "72px",
        align: "center" as const,
        headerClassName: compactHeaderClass,
        cellClassName: compactCellClass,
        render: (rec: MTDRecord) => (
          <Link
            href={`/orders/${rec.id}`}
            className="text-[12px] font-semibold text-brand-blue hover:text-brand-blue-hover hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {rec.id}
          </Link>
        ),
      },
      {
        key: "contact",
        header: "Contact",
        width: "120px",
        align: "center" as const,
        headerClassName: compactHeaderClass,
        cellClassName: compactCellClass,
        render: (rec: MTDRecord) => multilineTableCell(rec.contactName || rec.editorInitials, "120px"),
      },
      {
        key: "program",
        header: "Program",
        width: "150px",
        align: "center" as const,
        headerClassName: compactHeaderClass,
        cellClassName: compactCellClass,
        render: (rec: MTDRecord) => multilineTableCell(rec.programName, "150px"),
      },
      {
        key: "package",
        header: "Package",
        width: "140px",
        align: "center" as const,
        headerClassName: compactHeaderClass,
        cellClassName: compactCellClass,
        render: (rec: MTDRecord) => multilineTableCell(rec.package, "140px"),
      },
      {
        key: "musicAffiliate",
        header: "Music Affiliate",
        width: "140px",
        align: "center" as const,
        headerClassName: compactHeaderClass,
        cellClassName: compactCellClass,
        render: (rec: MTDRecord) => {
          const meta = resolveMTDFormMeta(rec, orderById);
          const linked = rec.orderId ? orderById.get(rec.orderId) : undefined;
          const affiliate = linked?.musicAffiliate ?? (rec as any).musicAffiliate ?? rec.musicTheme;
          if (!affiliate) {
            return (
              <span className={clsx("mx-auto block text-center text-brand-ink-tertiary", compactTextClass)}>
                —
              </span>
            );
          }

          const compliance = determineComplianceStatus(
            meta.formType === "school-all-star-dance"
              ? meta.danceFormSubtype
              : meta.cheerFormSubtype,
            affiliate
          );

          return (
            <div className="mx-auto flex w-full min-w-0 flex-col items-center gap-0.5">
              <TruncatedText
                text={titleCase(affiliate)}
                className={clsx("mx-auto w-full min-w-0 text-center font-medium", compactTextClass)}
                style={{ maxWidth: "140px" }}
              />
              {compliance !== "unknown-no-affiliate-field" && (
                <span
                  className={clsx(
                    "text-[10px] font-semibold tracking-tight",
                    compliance === "compliant"
                      ? "text-brand-signature"
                      : "text-brand-orange"
                  )}
                >
                  {complianceLabel(compliance)}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: "requestedEditor",
        header: "Requested Editor",
        width: "110px",
        align: "center" as const,
        headerClassName: compactHeaderClass,
        cellClassName: compactCellClass,
        render: (rec: MTDRecord) => {
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
        width: "100px",
        align: "center" as const,
        headerClassName: compactHeaderClass,
        cellClassName: compactCellClass,
        render: (rec: MTDRecord) => (
          <span className="inline-block w-full text-center text-[12px] font-medium tabular-nums text-brand-ink">
            {formatPrice(rec.price)}
          </span>
        ),
      },
      {
        key: "mixStartDate",
        header: "Mix Start Date",
        width: "128px",
        align: "center" as const,
        headerClassName: compactHeaderClass,
        cellClassName: "!px-2 !py-1",
        render: (rec: MTDRecord) => {
          const endIso = toIsoDateString(rec.mixEndDate ?? "");
          return (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <InlineDateInput
                value={rec.mixStartDate}
                max={endIso || undefined}
                className="!w-auto min-w-[108px] max-w-full"
                onChange={(next) => {
                  let nextEnd = rec.mixEndDate;
                  if (next && !nextEnd) {
                    const d = new Date(next);
                    d.setDate(d.getDate() + 7);
                    nextEnd = d.toISOString().slice(0, 10);
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
        header: "Mix End Date",
        width: "128px",
        align: "center" as const,
        headerClassName: compactHeaderClass,
        cellClassName: "!px-2 !py-1",
        render: (rec: MTDRecord) => {
          const startIso = toIsoDateString(rec.mixStartDate);
          return (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <InlineDateInput
                value={rec.mixEndDate ?? ""}
                min={startIso || undefined}
                className="!w-auto min-w-[108px] max-w-full"
                onChange={(next) => updateMTD(rec.id, { mixEndDate: next })}
              />
            </div>
          );
        },
      },
      {
        key: "editor",
        header: "Editor",
        width: "110px",
        align: "center" as const,
        headerClassName: compactHeaderClass,
        cellClassName: compactCellClass,
        render: (rec: MTDRecord) => {
          const producer = findProducerByAssignmentKey(rec.assignedProducer, producers);
          if (!rec.assignedProducer || !producer) {
            return (
              <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAssignRecordId(rec.id);
                  }}
                  className="rounded-md border border-brand-orange-deep bg-brand-orange px-2 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-brand-orange-hover"
                >
                  Assign
                </button>
              </div>
            );
          }
          return (
            <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Avatar src={producer.avatar} alt={producer.name} size="sm" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAssignRecordId(rec.id);
                }}
                className="text-[12px] font-semibold text-brand-ink hover:text-brand-blue hover:underline"
              >
                {producer.initials}
              </button>
            </div>
          );
        },
      },
      {
        key: "actions",
        header: "Actions",
        width: "120px",
        align: "center" as const,
        headerClassName: compactHeaderClass,
        cellClassName: compactCellClass,
        render: (rec: MTDRecord) => {
          const ready = isOrderScheduledAndAssigned(rec);
          return (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={(e) => handleMoveToMTD(rec, e)}
                className={clsx(
                  "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition shadow-sm",
                  ready
                    ? "bg-brand-blue text-white hover:bg-brand-blue-hover"
                    : "border border-brand-line/60 bg-brand-bg-subtle text-brand-ink-tertiary hover:bg-brand-bg-subtle/80 hover:text-brand-ink"
                )}
                title={ready ? "Move this order to MTD" : "Requires Editor, Start Date & End Date to move to MTD"}
              >
                <span>Move to MTD</span>
                <ArrowRight className="h-3 w-3" strokeWidth={2.25} />
              </button>
            </div>
          );
        },
      },
    ],
    [producers, allOrders, updateMTD, handleMoveToMTD, mtdRecords, orderById]
  );

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

      {/* Missing Information Validation Modal */}
      {validationModalRecord ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => setValidationModalRecord(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-brand-elevated p-6 shadow-2xl ring-1 ring-black/10">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-warning/10 text-brand-warning">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[16px] font-semibold text-brand-ink">
                  Assignment & Scheduling Required
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-brand-ink-secondary">
                  To move <strong className="text-brand-ink">{validationModalRecord.programName}</strong> to MTD, you must complete all three requirements:
                </p>
                <ul className="mt-3 space-y-1.5 text-[12px]">
                  <li className={clsx("flex items-center gap-2", validationModalRecord.assignedProducer ? "text-brand-ink font-medium" : "text-brand-danger font-semibold")}>
                    {validationModalRecord.assignedProducer ? <Check className="h-3.5 w-3.5 text-brand-blue" /> : "• "}
                    Editor assigned: {validationModalRecord.assignedProducer || "Missing"}
                  </li>
                  <li className={clsx("flex items-center gap-2", validationModalRecord.mixStartDate ? "text-brand-ink font-medium" : "text-brand-danger font-semibold")}>
                    {validationModalRecord.mixStartDate ? <Check className="h-3.5 w-3.5 text-brand-blue" /> : "• "}
                    Mix Start Date set: {validationModalRecord.mixStartDate || "Missing"}
                  </li>
                  <li className={clsx("flex items-center gap-2", validationModalRecord.mixEndDate ? "text-brand-ink font-medium" : "text-brand-danger font-semibold")}>
                    {validationModalRecord.mixEndDate ? <Check className="h-3.5 w-3.5 text-brand-blue" /> : "• "}
                    Mix End Date set: {validationModalRecord.mixEndDate || "Missing"}
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setValidationModalRecord(null)}
                className="rounded-xl bg-brand-bg px-4 py-2 text-[13px] font-semibold text-brand-ink hover:bg-brand-bg-subtle"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = validationModalRecord.id;
                  setValidationModalRecord(null);
                  setAssignRecordId(targetId);
                }}
                className="rounded-xl bg-brand-blue px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-blue-hover"
              >
                Assign & Schedule Now
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
