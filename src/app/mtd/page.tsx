"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { OrderFormFilters } from "@/components/orders/OrderFormFilters";
import {
  InlineCell,
  InlineSelect,
  InlineDateInput,
} from "@/components/mtd/InlineFields";
import {
  AssignEditorModal,
  type EditorAssignmentResult,
} from "@/components/mtd/AssignEditorModal";
import { SetPricingModal } from "@/components/mtd/SetPricingModal";
import { SetInvoicesModal } from "@/components/mtd/SetInvoicesModal";
import { SetInvoiceModal } from "@/components/mtd/SetInvoiceModal";
import { SetRecordPricingModal } from "@/components/mtd/SetRecordPricingModal";
import {
  DEFAULT_MTD_TABLE_FILTERS,
  MTDTableFilters,
  type MTDTableFilterState,
} from "@/components/mtd/MTDTableFilters";
import { useAppState } from "@/context/AppStateContext";
import { formatPrice, titleCase } from "@/lib/data";
import { parsePackage } from "@/lib/package";
import { parseMusicTheme } from "@/lib/music-theme";
import { complianceLabel } from "@/lib/pricing";
import { formatSlotForDisplay, suggestMixEndDate, suggestMixStartDate } from "@/lib/scheduling";
import { toIsoDateString } from "@/lib/dates";
import { todayIso } from "@/lib/date-filters";
import {
  formatRequestedEditorLabel,
  findLinkedOrder,
  findProducerByAssignmentKey,
  getRequestedEditorFromRecord,
  isRequestedEditorUnavailableForMixWindow,
} from "@/lib/editor-assignment";
import {
  countMTDByCheerSubtype,
  countMTDByDanceSubtype,
  countMTDByForm,
  filterMTDRecords,
  hasMixStartDate,
} from "@/lib/mtd-filters";
import type {
  CheerFormSubtype,
  DanceFormSubtype,
  MTDRecord,
  OrderFormType,
  PriceCompliance,
} from "@/types";
import { EIGHT_CS_OPTIONS, SONGS_OPTIONS } from "@/types";
import clsx from "clsx";

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";
const DEFAULT_CHEER_SUBTYPE: CheerFormSubtype = "all-star-cheer";
const DEFAULT_DANCE_SUBTYPE: DanceFormSubtype = "pom";

const actionButtonClass = (filled: boolean) =>
  clsx(
    "mt-1 rounded-md border px-2 py-1 text-[11px] font-medium transition",
    filled
      ? "border-brand-line/70 text-brand-ink hover:border-brand-line hover:bg-brand-bg/50"
      : "border-brand-orange/40 bg-brand-orange-soft text-brand-orange hover:bg-brand-orange-muted/30"
  );

const clickableChipClass =
  "cursor-pointer border border-brand-line/70 bg-brand-bg/60 shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/25";

const bookedTagClass =
  "inline-flex items-center rounded-full bg-brand-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-brand-warning ring-1 ring-inset ring-brand-warning/25";

export default function MTDPage() {
  const {
    mtdRecords,
    allOrders,
    updateMTD,
    setPackagePrices,
    setSecretMenuPrices,
    packagePrices,
    secretMenuPrices,
    producers,
    schedule,
  } = useAppState();
  const [form, setForm] = useState<OrderFormType>(DEFAULT_FORM);
  const [cheerSubtype, setCheerSubtype] = useState<CheerFormSubtype>(
    DEFAULT_CHEER_SUBTYPE
  );
  const [danceSubtype, setDanceSubtype] = useState<DanceFormSubtype>(
    DEFAULT_DANCE_SUBTYPE
  );
  const [tableFilters, setTableFilters] = useState<MTDTableFilterState>(
    DEFAULT_MTD_TABLE_FILTERS
  );
  const [assignRecord, setAssignRecord] = useState<MTDRecord | null>(null);
  const [invoiceRecord, setInvoiceRecord] = useState<MTDRecord | null>(null);
  const [pricingRecord, setPricingRecord] = useState<MTDRecord | null>(null);
  const [invoicesOpen, setInvoicesOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);

  const orderById = useMemo(
    () => new Map(allOrders.map((order) => [order.id, order])),
    [allOrders]
  );

  const switchForm = useCallback((next: OrderFormType) => {
    setForm(next);
    if (next !== "school-all-star-cheer") {
      setCheerSubtype(DEFAULT_CHEER_SUBTYPE);
    }
    if (next !== "school-all-star-dance") {
      setDanceSubtype(DEFAULT_DANCE_SUBTYPE);
    }
  }, []);

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

  const openAssignModal = useCallback(
    (rec: MTDRecord, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setAssignRecord(rec);
    },
    []
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

  const filtered = useMemo(
    () =>
      filterMTDRecords(mtdRecords, {
        packageTier: tableFilters.packageTier,
        timeLimit: tableFilters.timeLimit,
        split: tableFilters.split,
        assignedProducer: tableFilters.assignedProducer,
        requestedProducer: tableFilters.requestedProducer,
        dateFilter: tableFilters.dateFilter,
        scheduleFilter: tableFilters.scheduleFilter,
        form,
        cheerSubtype,
        danceSubtype,
        orderById,
        producers,
      }),
    [
      mtdRecords,
      tableFilters,
      form,
      cheerSubtype,
      danceSubtype,
      orderById,
      producers,
    ]
  );

  const formCounts = useMemo(
    () => countMTDByForm(mtdRecords, orderById),
    [mtdRecords, orderById]
  );

  const cheerSubtypeCounts = useMemo(
    () => countMTDByCheerSubtype(mtdRecords, orderById),
    [mtdRecords, orderById]
  );

  const danceSubtypeCounts = useMemo(
    () => countMTDByDanceSubtype(mtdRecords, orderById),
    [mtdRecords, orderById]
  );

  const tableFilterKey = [
    tableFilters.packageTier,
    tableFilters.timeLimit,
    tableFilters.split,
    tableFilters.assignedProducer,
    tableFilters.requestedProducer,
    tableFilters.scheduleFilter,
    tableFilters.dateFilter.type,
    String(tableFilters.dateFilter.value),
  ].join("-");

  const columns: Column<MTDRecord>[] = useMemo(
    () => [
      {
        key: "rowId",
        header: "ID",
        width: "56px",
        align: "center",
        render: (_rec, index) => (
          <span className="tabular-nums text-brand-ink">
            {index + 1}
          </span>
        ),
      },
      {
        key: "contactC",
        header: "Contact",
        width: "160px",
        align: "center",
        nowrap: false,
        render: (rec) => (
          <span className="whitespace-nowrap text-brand-ink">
            {titleCase(rec.contactName)}
          </span>
        ),
      },
      {
        key: "programD",
        header: "Program & division",
        width: "200px",
        align: "center",
        nowrap: false,
        render: (rec) => {
          const linked = findLinkedOrder(rec, allOrders);
          const division = linked?.division?.trim();
          return (
            <div className="inline-flex max-w-full flex-col items-center justify-center gap-1">
              <span className="text-[11px] leading-snug text-brand-ink">
                {titleCase(rec.programName)}
              </span>
              {division ? (
                <span className="text-[10px] leading-snug text-brand-ink-tertiary">
                  {titleCase(division)}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        key: "packageE",
        header: "Package",
        width: "88px",
        align: "center",
        render: (rec) => {
          const { tier } = parsePackage(rec.package);
          return <span className="font-medium text-brand-ink">{titleCase(tier)}</span>;
        },
      },
      {
        key: "limitE",
        header: "Time limit",
        width: "72px",
        align: "center",
        render: (rec) => {
          const { limit } = parsePackage(rec.package);
          return (
            <span className="text-[12px] tabular-nums text-brand-ink">
              {limit}
            </span>
          );
        },
      },
      {
        key: "splitE",
        header: "Split",
        width: "88px",
        align: "center",
        render: (rec) => {
          const { split } = parsePackage(rec.package);
          return (
            <span className="text-[12px] text-brand-ink">
              {split}
            </span>
          );
        },
      },
      {
        key: "themeF",
        header: "Music & theme",
        width: "180px",
        align: "center",
        nowrap: false,
        render: (rec) => {
          const { music } = parseMusicTheme(rec.musicTheme);
          return (
            <span className="text-[11px] text-brand-ink">
              {titleCase(music)}
            </span>
          );
        },
      },
      {
        key: "chosenInitialsF",
        header: "Requested editor",
        width: "108px",
        align: "center",
        render: (rec) => {
          const linked = findLinkedOrder(rec, allOrders);
          const label = formatRequestedEditorLabel(rec, producers, linked);
          const requested = getRequestedEditorFromRecord(rec, producers, linked);
          const isFa = label === "FA";
          const showBooked =
            !isFa &&
            requested &&
            isRequestedEditorUnavailableForMixWindow(
              rec,
              requested,
              mtdRecords,
              producers
            );

          return (
            <div className="inline-flex flex-col items-center gap-1">
              <span
                className={clsx(
                  "text-[12px] font-medium uppercase tabular-nums",
                  isFa ? "text-brand-info" : "text-brand-ink"
                )}
              >
                {isFa ? "FA" : label}
              </span>
              {showBooked ? (
                <span
                  className={bookedTagClass}
                  title="Requested editor is unavailable during this mix window"
                >
                  Booked
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        key: "priceG",
        header: "Price",
        width: "96px",
        align: "center",
        render: (rec) => (
          <div className="mx-auto min-w-[88px]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => openPricingModal(rec, e)}
              title="Edit pricing"
              aria-label={`Edit pricing ${formatPrice(rec.price)}`}
              className={clsx(
                clickableChipClass,
                "max-w-full rounded-lg px-2.5 py-1 text-center"
              )}
            >
              <p className="font-medium tabular-nums text-[12px] text-brand-ink hover:text-brand-orange">
                {formatPrice(rec.price)}
              </p>
              <p
                className={clsx(
                  "text-[10px] font-medium",
                  rec.priceCompliance === "compliant"
                    ? "text-brand-success"
                    : "text-brand-warning"
                )}
              >
                {complianceLabel(rec.priceCompliance)}
              </p>
            </button>
          </div>
        ),
      },
      {
        key: "mixDateI",
        header: "Mix start date",
        width: "128px",
        align: "center",
        render: (rec) => {
          const template = rec.assignedProducer
            ? suggestMixStartDate(rec.assignedProducer, producers, schedule)
            : todayIso();

          return (
            <InlineCell
              footer={
                rec.assignedProducer && !hasMixStartDate(rec) ? (
                  <span
                    className="text-brand-ink-tertiary"
                    title="Next open slot for this producer on the team schedule"
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
                template={template}
                onChange={(v) => {
                  const patch: Partial<MTDRecord> = { mixStartDate: v };
                  if (v && !toIsoDateString(rec.mixEndDate ?? "")) {
                    patch.mixEndDate = suggestMixEndDate(v, rec.package);
                  }
                  updateMTD(rec.id, patch);
                }}
              />
            </InlineCell>
          );
        },
      },
      {
        key: "mixEndDate",
        header: "Mix end date",
        width: "128px",
        align: "center",
        render: (rec) => {
          const template =
            hasMixStartDate(rec) && !toIsoDateString(rec.mixEndDate ?? "")
              ? suggestMixEndDate(rec.mixStartDate, rec.package)
              : "";

          return (
            <InlineCell>
              <InlineDateInput
                value={rec.mixEndDate ?? ""}
                template={template}
                onChange={(v) => updateMTD(rec.id, { mixEndDate: v })}
              />
            </InlineCell>
          );
        },
      },
      {
        key: "eightJ",
        header: "8CS",
        width: "120px",
        align: "center",
        render: (rec) => (
          <InlineCell>
            <InlineSelect
              value={rec.eightCountSheet || EIGHT_CS_OPTIONS[2]}
              options={[...EIGHT_CS_OPTIONS]}
              onChange={(v) => updateMTD(rec.id, { eightCountSheet: v })}
            />
          </InlineCell>
        ),
      },
      {
        key: "songsK",
        header: "Songs",
        width: "88px",
        align: "center",
        render: (rec) => (
          <InlineCell>
            <InlineSelect
              value={rec.haveSongs || SONGS_OPTIONS[1]}
              options={[...SONGS_OPTIONS]}
              onChange={(v) => updateMTD(rec.id, { haveSongs: v })}
            />
          </InlineCell>
        ),
      },
      {
        key: "editorB",
        header: "Editor",
        width: "128px",
        align: "center",
        render: (rec) => {
          const assigned = rec.assignedProducer;
          const producer = assigned
            ? findProducerByAssignmentKey(assigned, producers)
            : undefined;

          return (
            <div
              className="mx-auto min-w-[96px]"
              onClick={(e) => e.stopPropagation()}
            >
              {assigned ? (
                <button
                  type="button"
                  onClick={(e) => openAssignModal(rec, e)}
                  title="Edit assignment"
                  aria-label={`Edit assignment for ${assigned}`}
                  className={clsx(
                    clickableChipClass,
                    "inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5"
                  )}
                >
                  {producer?.avatar ? (
                    <Avatar
                      src={producer.avatar}
                      alt={producer.name}
                      size="xs"
                    />
                  ) : (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-signature-soft text-[10px] font-bold text-brand-signature">
                      {assigned.slice(0, 2)}
                    </span>
                  )}
                  <span className="truncate text-[12px] font-semibold leading-none text-brand-ink">
                    {assigned}
                  </span>
                </button>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => openAssignModal(rec, e)}
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
        key: "invoiceAction",
        header: "Invoice #",
        width: "112px",
        align: "center",
        render: (rec) => {
          const invoice = rec.invoice?.trim() ?? "";
          return (
            <div className="mx-auto min-w-[88px]" onClick={(e) => e.stopPropagation()}>
              {invoice ? (
                <button
                  type="button"
                  onClick={(e) => openInvoiceModal(rec, e)}
                  title="Edit invoice"
                  aria-label={`Edit invoice ${invoice}`}
                  className={clsx(
                    clickableChipClass,
                    "max-w-full rounded-lg px-2.5 py-1 text-[12px] font-medium tabular-nums text-brand-ink hover:text-brand-orange"
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
        key: "actions",
        header: "Actions",
        width: "72px",
        align: "center",
        sticky: "right",
        nowrap: false,
        render: (rec) => (
          <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
            <Link
              href={`/mtd/${rec.id}`}
              title="Open record"
              aria-label={`Open ${rec.programName}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-line/70 bg-brand-bg/60 text-brand-ink-secondary shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/25"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </div>
        ),
      },
    ],
    [
      updateMTD,
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
        subtitle={`${mtdRecords.length} entries`}
      />

      <div className="px-6 py-6 lg:px-8">
        <div className="panel-shell overflow-hidden rounded-2xl">
          <OrderFormFilters
            form={form}
            cheerSubtype={cheerSubtype}
            danceSubtype={danceSubtype}
            onFormChange={switchForm}
            onCheerSubtypeChange={setCheerSubtype}
            onDanceSubtypeChange={setDanceSubtype}
            formCounts={formCounts}
            cheerCounts={cheerSubtypeCounts}
            danceCounts={danceSubtypeCounts}
            onInvoiceClick={() => setInvoicesOpen(true)}
            onPricingClick={() => setPricingOpen(true)}
          />

          <MTDTableFilters
            records={mtdRecords}
            producers={producers}
            orderById={orderById}
            filters={tableFilters}
            filteredCount={filtered.length}
            onChange={(patch) =>
              setTableFilters((prev) => ({ ...prev, ...patch }))
            }
            onReset={() => setTableFilters(DEFAULT_MTD_TABLE_FILTERS)}
          />

          <DataTable
            key={`${form}-${cheerSubtype}-${danceSubtype}-${tableFilterKey}`}
            columns={columns}
            data={filtered}
            rowKey={(rec) => rec.id}
            href={(rec) => `/mtd/${rec.id}`}
            emptyMessage="No MTD entries match this filter."
            pageSize={15}
            embedded
          />
        </div>
      </div>

      <AssignEditorModal
        open={Boolean(assignRecord)}
        record={assignRecord}
        mtdRecords={mtdRecords}
        allOrders={allOrders}
        producers={producers}
        schedule={schedule}
        onClose={() => setAssignRecord(null)}
        onAssign={handleAssign}
      />

      <SetInvoiceModal
        open={Boolean(invoiceRecord)}
        record={invoiceRecord}
        onClose={() => setInvoiceRecord(null)}
        onSave={handleInvoiceSave}
      />

      <SetRecordPricingModal
        open={Boolean(pricingRecord)}
        record={pricingRecord}
        packagePrices={packagePrices}
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
        prices={packagePrices}
        secretMenuPrices={secretMenuPrices}
        onClose={() => setPricingOpen(false)}
        onSave={(prices, secretMenu) => {
          setPackagePrices(prices);
          setSecretMenuPrices(secretMenu);
        }}
      />
    </>
  );
}
