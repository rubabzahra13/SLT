"use client";

import { useCallback, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { DateFilter, type DateFilterValue } from "@/components/ui/DateFilter";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { OrderFormFilters } from "@/components/orders/OrderFormFilters";
import {
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
import { useAppState } from "@/context/AppStateContext";
import { formatPrice, titleCase } from "@/lib/data";
import { parsePackage } from "@/lib/package";
import { parseMusicTheme } from "@/lib/music-theme";
import { complianceLabel } from "@/lib/pricing";
import { formatSlotForDisplay, suggestMixStartDate } from "@/lib/scheduling";
import { todayIso } from "@/lib/date-filters";
import {
  countMTDByCheerSubtype,
  countMTDByDanceSubtype,
  countMTDByForm,
  filterMTDRecords,
} from "@/lib/mtd-filters";
import type {
  CheerFormSubtype,
  DanceFormSubtype,
  MTDRecord,
  OrderFormType,
  PriceCompliance,
} from "@/types";
import {
  EDITOR_NAMES,
  EIGHT_CS_OPTIONS,
  SONGS_OPTIONS,
} from "@/types";
import clsx from "clsx";

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";
const DEFAULT_CHEER_SUBTYPE: CheerFormSubtype = "all-star-cheer";
const DEFAULT_DANCE_SUBTYPE: DanceFormSubtype = "pom";

const actionButtonClass = (filled: boolean) =>
  clsx(
    "mt-1 rounded-md border px-2 py-1 text-[11px] font-medium transition",
    filled
      ? "border-brand-line/70 text-brand-ink-secondary hover:border-brand-line hover:bg-brand-bg/50"
      : "border-brand-orange/40 bg-brand-orange-soft text-brand-orange hover:bg-brand-orange-muted/30"
  );

export default function MTDPage() {
  const {
    mtdRecords,
    allOrders,
    updateMTD,
    setPackagePrices,
    packagePrices,
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
  const [producerFilter, setProducerFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    type: "all",
    value: null,
  });
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
        bookedUntil: result.bookedUntil,
        ...(result.mixStartDate ? { mixStartDate: result.mixStartDate } : {}),
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

  const openRecordPricingModal = useCallback(
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
        producer: producerFilter,
        dateFilter,
        form,
        cheerSubtype,
        danceSubtype,
        orderById,
      }),
    [
      mtdRecords,
      producerFilter,
      dateFilter,
      form,
      cheerSubtype,
      danceSubtype,
      orderById,
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

  const producerOptions = useMemo(() => {
    const counts = new Map<string, number>();
    let unassigned = 0;

    for (const rec of mtdRecords) {
      if (!rec.assignedProducer) {
        unassigned += 1;
      } else {
        counts.set(
          rec.assignedProducer,
          (counts.get(rec.assignedProducer) ?? 0) + 1
        );
      }
    }

    return [
      { value: "All", label: "All producers", count: mtdRecords.length },
      { value: "Unassigned", label: "Unassigned", count: unassigned },
      ...EDITOR_NAMES.map((name) => ({
        value: name,
        label: name,
        count: counts.get(name) ?? 0,
      })),
    ];
  }, [mtdRecords]);

  const columns: Column<MTDRecord>[] = useMemo(
    () => [
      {
        key: "contactC",
        header: "Contact (C)",
        width: "160px",
        nowrap: false,
        render: (rec) => (
          <span className="whitespace-nowrap text-brand-ink-secondary">
            {titleCase(rec.contactName)}
          </span>
        ),
      },
      {
        key: "programD",
        header: "Program (D)",
        width: "200px",
        render: (rec) => (
          <div className="flex items-start gap-1.5">
            {rec.needsAttention ? (
              <StatusBadge status="needs_attention" />
            ) : null}
            <span className="font-medium">{titleCase(rec.programName)}</span>
          </div>
        ),
      },
      {
        key: "packageE",
        header: "Package (E)",
        width: "88px",
        render: (rec) => {
          const { tier } = parsePackage(rec.package);
          return <span className="font-medium">{titleCase(tier)}</span>;
        },
      },
      {
        key: "limitE",
        header: "Limit",
        width: "72px",
        render: (rec) => {
          const { limit } = parsePackage(rec.package);
          return (
            <span className="text-[12px] tabular-nums text-brand-ink-secondary">
              {limit}
            </span>
          );
        },
      },
      {
        key: "splitE",
        header: "Split",
        width: "88px",
        render: (rec) => {
          const { split } = parsePackage(rec.package);
          return (
            <span className="text-[12px] text-brand-ink-secondary">
              {split}
            </span>
          );
        },
      },
      {
        key: "themeF",
        header: "Music (F)",
        width: "180px",
        nowrap: false,
        render: (rec) => {
          const { music } = parseMusicTheme(rec.musicTheme);
          return (
            <span className="text-[11px] text-brand-ink-tertiary">
              {titleCase(music)}
            </span>
          );
        },
      },
      {
        key: "chosenInitialsF",
        header: "Requested editor",
        width: "108px",
        render: (rec) => {
          const { chosenInitials } = parseMusicTheme(rec.musicTheme);
          return (
            <span className="text-[12px] font-medium uppercase tabular-nums text-brand-ink-secondary">
              {chosenInitials}
            </span>
          );
        },
      },
      {
        key: "priceG",
        header: "Price (G)",
        width: "96px",
        align: "right",
        render: (rec) => (
          <div className="text-right">
            <p className="font-medium tabular-nums">{formatPrice(rec.price)}</p>
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
          </div>
        ),
      },
      {
        key: "mixDateI",
        header: "Mix date (I)",
        width: "128px",
        render: (rec) => {
          const template = rec.assignedProducer
            ? suggestMixStartDate(rec.assignedProducer, producers, schedule)
            : todayIso();

          return (
            <div onClick={(e) => e.stopPropagation()}>
              <InlineDateInput
                value={rec.mixStartDate}
                template={template}
                onChange={(v) => updateMTD(rec.id, { mixStartDate: v })}
              />
              {rec.assignedProducer ? (
                <p className="mt-1 truncate text-[9px] text-brand-success">
                  {formatSlotForDisplay(
                    rec.assignedProducer,
                    producers,
                    schedule
                  )}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        key: "eightJ",
        header: "8CS (J)",
        width: "120px",
        render: (rec) => (
          <InlineSelect
            value={rec.eightCountSheet || EIGHT_CS_OPTIONS[2]}
            options={[...EIGHT_CS_OPTIONS]}
            onChange={(v) => updateMTD(rec.id, { eightCountSheet: v })}
          />
        ),
      },
      {
        key: "songsK",
        header: "Songs (K)",
        width: "88px",
        render: (rec) => (
          <InlineSelect
            value={rec.haveSongs || SONGS_OPTIONS[1]}
            options={[...SONGS_OPTIONS]}
            onChange={(v) => updateMTD(rec.id, { haveSongs: v })}
          />
        ),
      },
      {
        key: "editorB",
        header: "Editor (B)",
        width: "108px",
        render: (rec) => (
          <div className="min-w-[88px]" onClick={(e) => e.stopPropagation()}>
            {rec.assignedProducer ? (
              <div className="flex items-start gap-1.5">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-[12px] font-medium">
                    {rec.assignedProducer}
                  </p>
                  {rec.editorRequest === "FA" ? (
                    <p className="text-[9px] uppercase tracking-wide text-brand-info">
                      First available
                    </p>
                  ) : null}
                  {rec.bookedUntil ? (
                    <p className="text-[9px] tabular-nums text-brand-ink-tertiary">
                      thru {rec.bookedUntil}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={(e) => openAssignModal(rec, e)}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-orange"
                  title="Reassign editor"
                  aria-label="Reassign editor"
                >
                  <Pencil className="h-3 w-3" strokeWidth={2} />
                </button>
              </div>
            ) : (
              <>
                {rec.editorRequest === "NA" ? (
                  <span className="text-[12px] text-brand-ink-tertiary">NA</span>
                ) : null}
                <button
                  type="button"
                  onClick={(e) => openAssignModal(rec, e)}
                  className={actionButtonClass(false)}
                >
                  Assign
                </button>
              </>
            )}
          </div>
        ),
      },
      {
        key: "invoiceAction",
        header: "Invoice",
        width: "112px",
        render: (rec) => {
          const invoice = rec.invoice?.trim() ?? "";
          return (
            <div className="min-w-[88px]" onClick={(e) => e.stopPropagation()}>
              {invoice ? (
                <div className="flex items-center gap-1.5">
                  <span className="min-w-0 truncate text-[12px] font-medium tabular-nums text-brand-ink">
                    {invoice}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => openInvoiceModal(rec, e)}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-orange"
                    title="Edit invoice"
                    aria-label="Edit invoice"
                  >
                    <Pencil className="h-3 w-3" strokeWidth={2} />
                  </button>
                </div>
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
        key: "pricingAction",
        header: "Pricing",
        width: "108px",
        render: (rec) => (
          <div className="min-w-[88px]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => openRecordPricingModal(rec, e)}
              className={actionButtonClass(rec.price > 0)}
            >
              Pricing
            </button>
          </div>
        ),
      },
    ],
    [
      updateMTD,
      producers,
      schedule,
      openAssignModal,
      openInvoiceModal,
      openRecordPricingModal,
    ]
  );

  return (
    <>
      <PageHeader
        title="Music To Do"
        subtitle={`${mtdRecords.length} entries · spreadsheet cols B through K`}
      />

      <div className="px-6 py-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-brand-line bg-brand-surface shadow-[var(--shadow-premium-sm)]">
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

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-line bg-brand-bg/30 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect
                label="Producer"
                value={producerFilter}
                options={producerOptions}
                onChange={setProducerFilter}
                accent="orange"
              />
              <DateFilter value={dateFilter} onChange={setDateFilter} />
              <span className="text-[12px] text-brand-ink-tertiary">
                {filtered.length} of {mtdRecords.length} entries
              </span>
            </div>
          </div>

          <DataTable
            key={`${form}-${cheerSubtype}-${danceSubtype}-${producerFilter}-${dateFilter.type}-${String(dateFilter.value)}`}
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
        onClose={() => setPricingOpen(false)}
        onSave={setPackagePrices}
      />
    </>
  );
}
