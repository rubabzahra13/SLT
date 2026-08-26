"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TruncatedText } from "@/components/ui/TruncatedText";
import {
  InlineCell,
  InlineMultiCheckGroup,
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
import { complianceLabel } from "@/lib/pricing";
import { formatSlotForDisplay, suggestMixEndDate, suggestMixStartDate } from "@/lib/scheduling";
import { inferMTDRecordStatus, patchFromRecordStatus } from "@/lib/mtd-status";
import {
  canCompleteForPayroll,
  canSetOngoingOrOutsourced,
  getMTDBoardRecords,
  patchMoveToPayroll,
} from "@/lib/mtd-completion";
import { isIsoDateAfter, isIsoDateBefore, toIsoDateString } from "@/lib/dates";
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
import {
  encodeEightCs,
  encodeSongs,
  parseEightCsFlags,
  parseSongsFlags,
} from "@/lib/mtd-checklist";
import type {
  CheerFormSubtype,
  DanceFormSubtype,
  MTDRecord,
  MTDRecordStatus,
  OrderFormType,
  PriceCompliance,
} from "@/types";
import { EIGHT_CS_OPTIONS, MTD_RECORD_STATUS_OPTIONS, SONGS_OPTIONS } from "@/types";
import clsx from "clsx";

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";
const DEFAULT_CHEER_SUBTYPE: CheerFormSubtype = "all-star-cheer";
const DEFAULT_DANCE_SUBTYPE: DanceFormSubtype = "pom";

const actionButtonClass = (filled: boolean) =>
  clsx(
    "mt-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition shadow-sm",
    filled
      ? "border-brand-line/70 bg-brand-elevated text-brand-ink hover:border-brand-line hover:bg-brand-bg/50"
      : "border-brand-orange-deep bg-brand-orange text-white hover:bg-brand-orange-hover"
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
    () => getMTDBoardRecords(mtdRecords),
    [mtdRecords]
  );

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

  const confirmCompleteToPayroll = useCallback(() => {
    if (!completeRecord) return;
    updateMTD(completeRecord.id, patchMoveToPayroll());
    setCompleteRecord(null);
  }, [completeRecord, updateMTD]);

  const filtered = useMemo(
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
  ].join("-");

  const columns: Column<MTDRecord>[] = useMemo(
    () => [
      {
        key: "rowId",
        header: "ID",
        width: "56px",
        align: "center",
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
        align: "center",
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
        align: "center",
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[100px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => multilineTableCell(rec.programName, "100%"),
      },
      {
        key: "packageE",
        header: "Package",
        width: "100px",
        align: "center",
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
      {
        key: "limitE",
        header: "Time limit",
        width: "100px",
        align: "center",
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[100px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => {
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
        align: "center",
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[100px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => {
          const { split } = parsePackage(rec.package);
          return (
            <TruncatedText
              text={split}
              className={clsx("mx-auto w-full min-w-0 text-center", compactTextClass)}
              style={{ maxWidth: "100%" }}
            />
          );
        },
      },
      {
        key: "themeF",
        header: "Music",
        width: "100px",
        align: "center",
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[100px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => multilineTableCell(rec.musicTheme, "100%"),
      },
      {
        key: "chosenInitialsF",
        header: "Requested editor",
        width: "100px",
        align: "center",
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
            );

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
                <span
                  className={unavailableTagClass}
                  title="Requested editor is unavailable during this mix window"
                >
                  Unavailable
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
        nowrap: false,
        cellClassName: "!px-2",
        headerClassName: "!px-2",
        render: (rec) => (
          <div
            className="mx-auto flex w-full flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={(e) => openPricingModal(rec, e)}
              title="Edit pricing"
              aria-label={`Edit pricing ${formatPrice(rec.price)}`}
              className={clsx(
                clickableChipClass,
                "flex w-full flex-col items-center rounded-lg px-2 py-1 text-center"
              )}
            >
              <p className="font-medium tabular-nums text-[12px] text-brand-ink hover:text-brand-orange">
                {formatPrice(rec.price)}
              </p>
              <p
                className={clsx(
                  "text-[10px] font-medium",
                  rec.priceCompliance === "compliant"
                    ? "text-brand-signature"
                    : "text-brand-orange"
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
        nowrap: false,
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2",
        render: (rec) => {
          const template = rec.assignedProducer
            ? suggestMixStartDate(rec.assignedProducer, producers, schedule)
            : todayIso();
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
                template={template}
                max={endIso || undefined}
                className={tableDateClass}
                onChange={(v) => {
                  if (!v) {
                    updateMTD(rec.id, { mixStartDate: v });
                    return;
                  }
                  const patch: Partial<MTDRecord> = { mixStartDate: v };
                  if (!endIso) {
                    patch.mixEndDate = suggestMixEndDate(v, rec.package);
                  } else if (isIsoDateAfter(v, endIso)) {
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
        nowrap: false,
        cellClassName: "!px-2 !py-1.5",
        headerClassName: "!px-2",
        render: (rec) => {
          const startIso = toIsoDateString(rec.mixStartDate);
          const template =
            startIso && !toIsoDateString(rec.mixEndDate ?? "")
              ? suggestMixEndDate(rec.mixStartDate, rec.package)
              : "";

          return (
            <InlineCell centered>
              <InlineDateInput
                value={rec.mixEndDate ?? ""}
                template={template}
                min={startIso || undefined}
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
      {
        key: "eightJ",
        header: "8CS",
        width: "132px",
        align: "center",
        nowrap: false,
        cellClassName: "!px-2 !py-2",
        headerClassName: "!px-2",
        render: (rec) => {
          const current = rec.eightCountSheet || EIGHT_CS_OPTIONS[2];
          const flags = parseEightCsFlags(current);

          return (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <InlineMultiCheckGroup
                items={[
                  { id: "cs", label: "CS", checked: flags.cs },
                  { id: "video", label: "Video", checked: flags.video },
                  { id: "form", label: "Form", checked: flags.form },
                ]}
                onToggle={(id, checked) => {
                  const next = { ...flags, [id]: checked };
                  updateMTD(rec.id, {
                    eightCountSheet: encodeEightCs(next, current),
                  });
                }}
              />
            </div>
          );
        },
      },
      {
        key: "songsK",
        header: "Songs",
        width: "104px",
        align: "center",
        nowrap: false,
        cellClassName: "!px-2 !py-2",
        headerClassName: "!px-2",
        render: (rec) => {
          const current = rec.haveSongs || SONGS_OPTIONS[1];
          const flags = parseSongsFlags(current);

          return (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <InlineMultiCheckGroup
                items={[
                  { id: "songs", label: "Songs", checked: flags.songs },
                  { id: "mix", label: "Mix", checked: flags.mix },
                ]}
                onToggle={(id, checked) => {
                  const next = { ...flags, [id]: checked };
                  updateMTD(rec.id, { haveSongs: encodeSongs(next) });
                }}
              />
            </div>
          );
        },
      },
      {
        key: "editorB",
        header: "Editor",
        width: "100px",
        align: "center",
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[100px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => {
          const assigned = rec.assignedProducer;
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
                  <span className={clsx("truncate font-semibold", compactTextClass)}>
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
              onChange={(value) => handleRecordStatusChange(rec, value)}
              className={tableStatusSelectClass}
            />
          </InlineCell>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        width: "100px",
        align: "center",
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[100px]"),
        headerClassName: compactHeaderClass,
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
      handleRecordStatusChange,
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
        badge={`${filtered.length} of ${mtdBoardRecords.length}`}
        subtitle="Assign editors, set pricing, and track mix progress"
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
            showScrollIndicator={false}
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
        onClose={() => setAssignRecordId(null)}
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

      <CompleteToPayrollModal
        open={Boolean(completeRecord)}
        record={completeRecord}
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
