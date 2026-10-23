"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Link2,
  Search,
} from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "@/components/layout/PageHeader";
import { OrderFormTabs } from "@/components/orders/OrderFormTabs";
import { OrderFormSubtypeTabs } from "@/components/orders/OrderFormSubtypeTabs";
import { MatchConfirmModal } from "@/components/orders/MatchConfirmModal";
import { OrderFormEditModal } from "@/components/orders/OrderFormEditModal";
import {
  magentoPackageBoardLabel,
  packageTypeDisplayValue,
} from "@/components/mtd/PackageTypeField";
import {
  DEFAULT_MTD_TABLE_FILTERS,
  MTDSortMenu,
  MTDTableFilterPanel,
  type MTDTableFilterState,
} from "@/components/mtd/MTDTableFilters";
import { useAppState } from "@/context/AppStateContext";
import { titleCase } from "@/lib/data";
import { formatDisplayDateTime } from "@/lib/dates";
import { rawFieldValue } from "@/lib/order-detail-fields";
import {
  getOrderContactPersonName,
  getOrderDetailSections,
  getOrderIdentityName,
  getProgramColumnHeader,
} from "@/lib/order-detail-sections";
import {
  listUnmatchedMagentoForms,
  listUnmatchedManualOrders,
  suggestManualsForMagento,
} from "@/lib/manual-form-suggestions";
import { canMergeMagentoFormIntoManual } from "@/lib/manual-form-merge";
import {
  filterMTDRecords,
  sortMTDRecordsBySortKey,
} from "@/lib/mtd-filters";
import { stagingRecordFromOrder } from "@/lib/order-staging";
import {
  CHEER_FORM_SUBTABS,
  DANCE_FORM_SUBTABS,
  ORDER_FORM_TABS,
} from "@/types";
import type {
  CheerFormSubtypeFilter,
  DanceFormSubtypeFilter,
  Order,
  OrderFormType,
  Producer,
} from "@/types";

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";
const DEFAULT_CHEER_SUBTYPE: CheerFormSubtypeFilter = "all-star-cheer";
const DEFAULT_DANCE_SUBTYPE: DanceFormSubtypeFilter = "pom";
/** Rows per Match panel page — small enough that dual panes page quickly. */
const MATCH_PAGE_SIZE = 5;

function ListPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (pageSize <= 0 || total <= 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const rangeStart = safePage * pageSize + 1;
  const rangeEnd = Math.min(total, (safePage + 1) * pageSize);
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-brand-line/40 bg-brand-elevated/40 px-4 py-2.5">
      <p className="text-[12px] font-medium text-brand-ink-tertiary">
        {rangeStart}–{rangeEnd} of {total}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={safePage === 0}
          onClick={() => onPageChange(Math.max(0, safePage - 1))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-ink-secondary transition hover:bg-brand-bg hover:text-brand-ink disabled:opacity-30"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <span className="min-w-[4.5rem] text-center text-[12px] font-semibold tabular-nums text-brand-ink-secondary">
          {safePage + 1} / {totalPages}
        </span>
        <button
          type="button"
          disabled={safePage >= totalPages - 1}
          onClick={() => onPageChange(Math.min(totalPages - 1, safePage + 1))}
          aria-label="Next page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-ink-secondary transition hover:bg-brand-bg hover:text-brand-ink disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

/** Same Filters + Sort pipeline as Orders (via staging MTD rows). */
function filterAndSortMatchOrders(
  orders: Order[],
  filters: MTDTableFilterState,
  producers: Producer[],
  orderById: Map<string, Order>,
  form: OrderFormType,
  cheerSubtype: CheerFormSubtypeFilter,
  danceSubtype: DanceFormSubtypeFilter
): Order[] {
  if (orders.length === 0) return [];
  const records = orders.map(stagingRecordFromOrder);
  const filtered = filterMTDRecords(records, {
    packageTier: filters.packageTier,
    timeLimit: filters.timeLimit,
    split: filters.split,
    assignedProducer: filters.assignedProducer,
    requestedProducer: filters.requestedProducer,
    dateFilter: filters.dateFilter,
    scheduleFilter: filters.scheduleFilter,
    infoFilter: filters.infoFilter,
    producers,
    orderById,
    form,
    cheerSubtype,
    danceSubtype,
  });
  const sorted = sortMTDRecordsBySortKey(
    filtered,
    filters.sortBy,
    producers,
    orderById
  );
  const byId = new Map(orders.map((o) => [o.id, o]));
  return sorted
    .map((r) => byId.get(r.orderId || r.id))
    .filter((o): o is Order => Boolean(o));
}

function orderMatchesFormFilter(
  order: Order,
  form: OrderFormType,
  cheerSubtype: CheerFormSubtypeFilter,
  danceSubtype: DanceFormSubtypeFilter
): boolean {
  if (order.formType !== form) return false;
  if (form === "school-all-star-cheer") {
    if (cheerSubtype === "all") return true;
    const subtype = String(order.cheerFormSubtype || "");
    const viroc = String(order.varsityVirocCustomer || "").toLowerCase();
    const isVirocYes =
      subtype === "school-cheer-viroc-yes" || viroc === "yes";
    const isSchoolCheer =
      subtype.startsWith("school-cheer") || subtype === "school-cheer-viroc-no";
    if (cheerSubtype === "school-cheer-viroc-yes") return isVirocYes;
    if (cheerSubtype === "school-cheer-viroc-no") {
      return isSchoolCheer && !isVirocYes;
    }
    return subtype === cheerSubtype;
  }
  if (form === "school-all-star-dance") {
    if (danceSubtype === "all") return true;
    let sub = String(order.danceFormSubtype || "");
    if (sub === "team-performance" || sub.startsWith("team-performance")) {
      sub = "team-performance-variety";
    }
    return sub === danceSubtype;
  }
  return true;
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] || ""}${parts[1]![0] || ""}`.toUpperCase();
}

function packageLabel(o: Order): string {
  return (
    magentoPackageBoardLabel(
      o.formType,
      o.packageType || o.package || "",
      o.danceFormSubtype,
      o.cheerFormSubtype
    ) ||
    packageTypeDisplayValue(o.packageType || "") ||
    o.package ||
    "No package"
  );
}

/**
 * Search: order ids + every Add New Order form field for this order's
 * form type / cheer·dance subtype (same field set as AddNewOrderModal).
 */
function orderSearchBlob(o: Order): string {
  const parts: string[] = [
    o.id,
    o.uuid || "",
    o.legacyId || "",
    o.mtdId || "",
  ];
  for (const section of getOrderDetailSections(o)) {
    for (const field of section.fields) {
      parts.push(rawFieldValue(o, field.key));
    }
  }
  return parts.filter(Boolean).join(" ").toLowerCase();
}

type SideRowProps = {
  order: Order;
  selected?: boolean;
  suggested?: boolean;
  badge?: string;
  onSelect?: () => void;
  onOpen: () => void;
  matchAction?: { label: string; onClick: () => void; disabled?: boolean } | null;
};

function SideRow({
  order,
  selected,
  suggested,
  badge,
  onSelect,
  onOpen,
  matchAction,
}: SideRowProps) {
  const identity = getOrderIdentityName(order).trim();
  const contact = titleCase(getOrderContactPersonName(order)).trim();
  const displayName = identity || "No name yet";
  const meta = [contact || null, packageLabel(order)].filter(Boolean).join(" · ");

  return (
    <div
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      className={clsx(
        "group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition",
        onSelect && "cursor-pointer",
        selected
          ? "bg-brand-orange/10 ring-1 ring-inset ring-brand-orange/35"
          : suggested
            ? "bg-brand-signature-soft/60 ring-1 ring-inset ring-brand-signature/20"
            : "hover:bg-brand-bg/80"
      )}
    >
      <div
        className={clsx(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[12px] font-bold tracking-wide",
          selected
            ? "bg-brand-orange text-white"
            : suggested
              ? "bg-brand-signature/15 text-brand-signature"
              : "bg-brand-bg text-brand-ink-secondary ring-1 ring-inset ring-brand-line/50"
        )}
        aria-hidden
      >
        {initialsFrom(displayName)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className={clsx(
              "truncate text-left text-[14px] font-semibold text-brand-ink underline-offset-2 hover:underline",
              !identity && "text-brand-ink-tertiary"
            )}
            title={identity ? `View ${displayName}` : "View order details"}
          >
            {displayName}
          </button>
          {badge ? (
            <span className="shrink-0 rounded-full bg-brand-orange/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-orange">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-[12px] text-brand-ink-secondary">
          {meta || "—"}
        </p>
        <p className="truncate text-[11px] tabular-nums text-brand-ink-tertiary">
          {formatDisplayDateTime(order.createdAt || "")}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="inline-flex h-8 items-center gap-1 rounded-full border border-brand-line/60 bg-white px-2.5 text-[11px] font-semibold text-brand-ink-secondary shadow-sm transition hover:border-brand-line hover:bg-brand-bg hover:text-brand-ink"
          title="View filled form details"
          aria-label={`View ${displayName}`}
        >
          <Eye className="h-3.5 w-3.5" strokeWidth={2} />
          View
        </button>
        {matchAction ? (
          <button
            type="button"
            disabled={matchAction.disabled}
            onClick={(e) => {
              e.stopPropagation();
              matchAction.onClick();
            }}
            className={clsx(
              "rounded-full px-3.5 py-1.5 text-[12px] font-bold transition",
              matchAction.disabled
                ? "cursor-not-allowed bg-brand-bg text-brand-ink-tertiary ring-1 ring-inset ring-brand-line/50"
                : "bg-brand-orange text-white hover:bg-brand-orange-hover"
            )}
          >
            {matchAction.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function MatchOrdersPage() {
  const {
    activeOrders,
    allOrders,
    producers,
    isLoading,
    isViewOnly,
  } = useAppState();

  const [form, setForm] = useState<OrderFormType>(DEFAULT_FORM);
  const [cheerSubtype, setCheerSubtype] =
    useState<CheerFormSubtypeFilter>(DEFAULT_CHEER_SUBTYPE);
  const [danceSubtype, setDanceSubtype] =
    useState<DanceFormSubtypeFilter>(DEFAULT_DANCE_SUBTYPE);
  const [magentoSearch, setMagentoSearch] = useState("");
  const [manualSearch, setManualSearch] = useState("");
  const [magentoFilters, setMagentoFilters] = useState<MTDTableFilterState>(
    DEFAULT_MTD_TABLE_FILTERS
  );
  const [manualFilters, setManualFilters] = useState<MTDTableFilterState>(
    DEFAULT_MTD_TABLE_FILTERS
  );
  const [selectedMagentoId, setSelectedMagentoId] = useState<string | null>(null);
  const [magentoPage, setMagentoPage] = useState(0);
  const [manualPage, setManualPage] = useState(0);

  const orderById = useMemo(() => {
    const map = new Map<string, Order>();
    for (const order of allOrders) {
      map.set(order.id, order);
      if (order.legacyId) map.set(order.legacyId, order);
      if (order.uuid) map.set(order.uuid, order);
    }
    return map;
  }, [allOrders]);
  const [matchPair, setMatchPair] = useState<{
    magento: Order;
    manual: Order;
  } | null>(null);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const editRecord = useMemo(
    () => (editOrder ? stagingRecordFromOrder(editOrder) : null),
    [editOrder]
  );

  const unmatchedMagento = useMemo(
    () => listUnmatchedMagentoForms(activeOrders),
    [activeOrders]
  );
  const unmatchedManuals = useMemo(
    () => listUnmatchedManualOrders(activeOrders),
    [activeOrders]
  );

  const formCounts = useMemo(() => {
    const counts = Object.fromEntries(
      ORDER_FORM_TABS.map(({ id }) => [id, 0])
    ) as Record<OrderFormType, number>;
    for (const o of unmatchedMagento) {
      if (counts[o.formType] !== undefined) counts[o.formType] += 1;
    }
    return counts;
  }, [unmatchedMagento]);

  const cheerSubtypeCounts = useMemo(() => {
    const cheer = unmatchedMagento.filter(
      (o) => o.formType === "school-all-star-cheer"
    );
    const counts = {
      all: cheer.length,
      ...Object.fromEntries(CHEER_FORM_SUBTABS.map(({ id }) => [id, 0])),
    } as Record<CheerFormSubtypeFilter, number>;
    for (const o of cheer) {
      for (const tab of CHEER_FORM_SUBTABS) {
        if (
          orderMatchesFormFilter(o, "school-all-star-cheer", tab.id, "all")
        ) {
          counts[tab.id] = (counts[tab.id] || 0) + 1;
        }
      }
    }
    return counts;
  }, [unmatchedMagento]);

  const danceSubtypeCounts = useMemo(() => {
    const dance = unmatchedMagento.filter(
      (o) => o.formType === "school-all-star-dance"
    );
    const counts = {
      all: dance.length,
      ...Object.fromEntries(DANCE_FORM_SUBTABS.map(({ id }) => [id, 0])),
    } as Record<DanceFormSubtypeFilter, number>;
    for (const o of dance) {
      for (const tab of DANCE_FORM_SUBTABS) {
        if (
          orderMatchesFormFilter(o, "school-all-star-dance", "all", tab.id)
        ) {
          counts[tab.id] = (counts[tab.id] || 0) + 1;
        }
      }
    }
    return counts;
  }, [unmatchedMagento]);

  const switchForm = useCallback((next: OrderFormType) => {
    setForm(next);
    setSelectedMagentoId(null);
    setMagentoPage(0);
    setManualPage(0);
    if (next !== "school-all-star-cheer") {
      setCheerSubtype(DEFAULT_CHEER_SUBTYPE);
    }
    if (next !== "school-all-star-dance") {
      setDanceSubtype(DEFAULT_DANCE_SUBTYPE);
    }
  }, []);

  const magentoInCategory = useMemo(
    () =>
      unmatchedMagento.filter((o) =>
        orderMatchesFormFilter(o, form, cheerSubtype, danceSubtype)
      ),
    [unmatchedMagento, form, cheerSubtype, danceSubtype]
  );

  const manualsInCategory = useMemo(
    () =>
      unmatchedManuals.filter((o) =>
        orderMatchesFormFilter(o, form, cheerSubtype, danceSubtype)
      ),
    [unmatchedManuals, form, cheerSubtype, danceSubtype]
  );

  const mq = magentoSearch.trim().toLowerCase();
  const nq = manualSearch.trim().toLowerCase();

  const magentoRecords = useMemo(
    () => magentoInCategory.map(stagingRecordFromOrder),
    [magentoInCategory]
  );
  const manualRecords = useMemo(
    () => manualsInCategory.map(stagingRecordFromOrder),
    [manualsInCategory]
  );

  const magentoFiltered = useMemo(() => {
    let list = magentoInCategory;
    if (mq) list = list.filter((o) => orderSearchBlob(o).includes(mq));
    return filterAndSortMatchOrders(
      list,
      magentoFilters,
      producers,
      orderById,
      form,
      cheerSubtype,
      danceSubtype
    );
  }, [
    magentoInCategory,
    mq,
    magentoFilters,
    producers,
    orderById,
    form,
    cheerSubtype,
    danceSubtype,
  ]);

  const manualsFiltered = useMemo(() => {
    let list = manualsInCategory;
    if (nq) list = list.filter((o) => orderSearchBlob(o).includes(nq));
    return filterAndSortMatchOrders(
      list,
      manualFilters,
      producers,
      orderById,
      form,
      cheerSubtype,
      danceSubtype
    );
  }, [
    manualsInCategory,
    nq,
    manualFilters,
    producers,
    orderById,
    form,
    cheerSubtype,
    danceSubtype,
  ]);

  const selectedMagento = useMemo(() => {
    if (!selectedMagentoId) return null;
    return (
      magentoFiltered.find((o) => o.id === selectedMagentoId) ||
      unmatchedMagento.find((o) => o.id === selectedMagentoId) ||
      null
    );
  }, [selectedMagentoId, magentoFiltered, unmatchedMagento]);

  useEffect(() => {
    if (
      selectedMagentoId &&
      !magentoFiltered.some((o) => o.id === selectedMagentoId) &&
      !unmatchedMagento.some((o) => o.id === selectedMagentoId)
    ) {
      setSelectedMagentoId(null);
    }
  }, [magentoFiltered, unmatchedMagento, selectedMagentoId]);

  const suggestionIds = useMemo(() => {
    if (!selectedMagento) return new Set<string>();
    return new Set(
      suggestManualsForMagento(selectedMagento, activeOrders).map(
        (s) => s.manual.id
      )
    );
  }, [selectedMagento, activeOrders]);

  useEffect(() => {
    setMagentoPage(0);
  }, [mq, magentoFilters, form, cheerSubtype, danceSubtype]);

  useEffect(() => {
    setManualPage(0);
  }, [nq, manualFilters, form, cheerSubtype, danceSubtype, selectedMagentoId]);

  const { suggestedManuals, otherManuals } = useMemo(() => {
    const suggested: Order[] = [];
    const other: Order[] = [];
    for (const m of manualsFiltered) {
      if (suggestionIds.has(m.id)) suggested.push(m);
      else other.push(m);
    }
    // Keep suggestion-score order within Suggested when sort is Newest.
    if (selectedMagento && (manualFilters.sortBy ?? "newest") === "newest") {
      const rank = new Map(
        suggestManualsForMagento(selectedMagento, activeOrders).map((s, i) => [
          s.manual.id,
          i,
        ])
      );
      suggested.sort(
        (a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99)
      );
    }
    return { suggestedManuals: suggested, otherManuals: other };
  }, [
    manualsFiltered,
    suggestionIds,
    selectedMagento,
    activeOrders,
    manualFilters.sortBy,
  ]);

  const manualsOrdered = useMemo(
    () => [...suggestedManuals, ...otherManuals],
    [suggestedManuals, otherManuals]
  );

  const magentoTotalPages = Math.max(
    1,
    Math.ceil(magentoFiltered.length / MATCH_PAGE_SIZE)
  );
  const magentoSafePage = Math.min(magentoPage, magentoTotalPages - 1);
  const magentoPageItems = magentoFiltered.slice(
    magentoSafePage * MATCH_PAGE_SIZE,
    magentoSafePage * MATCH_PAGE_SIZE + MATCH_PAGE_SIZE
  );

  const manualTotalPages = Math.max(
    1,
    Math.ceil(manualsOrdered.length / MATCH_PAGE_SIZE)
  );
  const manualSafePage = Math.min(manualPage, manualTotalPages - 1);
  const manualPageItems = manualsOrdered.slice(
    manualSafePage * MATCH_PAGE_SIZE,
    manualSafePage * MATCH_PAGE_SIZE + MATCH_PAGE_SIZE
  );
  const pageSuggestedManuals = manualPageItems.filter((m) =>
    suggestionIds.has(m.id)
  );
  const pageOtherManuals = manualPageItems.filter(
    (m) => !suggestionIds.has(m.id)
  );

  const programHeader = getProgramColumnHeader(
    form,
    cheerSubtype === "all" ? undefined : cheerSubtype,
    danceSubtype === "all" ? undefined : danceSubtype
  );

  const openOrder = (o: Order) => setEditOrder(o);

  const startMatch = (magento: Order, manual: Order) => {
    if (isViewOnly) return;
    if (!canMergeMagentoFormIntoManual(magento, manual)) return;
    setMatchPair({ magento, manual });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Match Orders"
        badge={`${magentoFiltered.length} Magento · ${suggestedManuals.length + otherManuals.length} manual`}
        subtitle={`Pick a Magento form, then link it to a manual ${programHeader.toLowerCase()} when names look alike`}
        headerActions={
          <Link
            href="/orders"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-brand-line/70 bg-white px-3 text-[13px] font-semibold text-brand-ink shadow-sm transition hover:border-brand-line hover:bg-brand-bg/60"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            <span>Back to Orders</span>
          </Link>
        }
        toolbar={
          <div className="flex min-w-0 flex-col items-start gap-1.5">
            <OrderFormTabs
              form={form}
              onFormChange={switchForm}
              formCounts={formCounts}
            />
            <OrderFormSubtypeTabs
              form={form}
              cheerSubtype={cheerSubtype}
              danceSubtype={danceSubtype}
              onCheerSubtypeChange={(s) => {
                setCheerSubtype(s);
                setSelectedMagentoId(null);
              }}
              onDanceSubtypeChange={(s) => {
                setDanceSubtype(s);
                setSelectedMagentoId(null);
              }}
              cheerCounts={cheerSubtypeCounts}
              danceCounts={danceSubtypeCounts}
            />
          </div>
        }
      />

      <div className="min-h-0 flex-1 overflow-hidden px-2 pb-4 pt-4 lg:px-3">
        {isLoading ? (
          <p className="px-4 text-[13px] text-brand-ink-secondary">Loading…</p>
        ) : magentoFiltered.length === 0 && manualsFiltered.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-bg text-brand-ink-tertiary ring-1 ring-inset ring-brand-line/50">
              <Link2 className="h-5 w-5" />
            </div>
            <h3 className="text-[15px] font-bold text-brand-ink">
              Nothing to match here
            </h3>
            <p className="text-[13px] text-brand-ink-secondary">
              Unmatched Magento forms and your New Order manuals for this form
              show up side by side. Name suggestions appear when both sides have
              a similar school / gym / program / org.
            </p>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-3">
            <div className="shrink-0 border-b border-brand-line/50 pb-2">
              <h2 className="text-[13px] font-bold tracking-wide text-brand-ink">
                Select a Magento form on the left. Similar manuals rise to the
                top with Match.
              </h2>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
              {/* Magento column */}
              <section className="dashboard-panel dashboard-panel-framed flex min-h-0 flex-col overflow-hidden">
                <header className="space-y-2 border-b border-brand-line/40 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-[13px] font-bold tracking-wide text-brand-ink">
                        Incoming form data
                      </h3>
                      <p className="text-[11px] text-brand-ink-secondary">
                        Customer submissions waiting to link
                      </p>
                    </div>
                    <span className="rounded-full bg-brand-bg px-2 py-0.5 text-[11px] font-semibold tabular-nums text-brand-ink-secondary ring-1 ring-inset ring-brand-line/40">
                      {magentoFiltered.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-ink-tertiary" />
                      <input
                        type="search"
                        value={magentoSearch}
                        onChange={(e) => setMagentoSearch(e.target.value)}
                        placeholder="Search id or form fields…"
                        className="h-8 w-full rounded-lg border border-brand-line/60 bg-white py-1.5 pl-8 pr-2.5 text-[12px] text-brand-ink outline-none placeholder:text-brand-ink-tertiary focus:border-brand-signature/40 focus:ring-2 focus:ring-brand-signature/15"
                      />
                    </label>
                    <div className="inline-flex shrink-0 flex-wrap items-center gap-0.5 rounded-xl bg-brand-elevated/80 p-0.5 ring-1 ring-inset ring-brand-line/40">
                      <MTDTableFilterPanel
                        grouped
                        variant="orders"
                        records={magentoRecords}
                        producers={producers}
                        orderById={orderById}
                        filters={magentoFilters}
                        onChange={(patch) =>
                          setMagentoFilters((prev) => ({ ...prev, ...patch }))
                        }
                        onReset={() =>
                          setMagentoFilters(DEFAULT_MTD_TABLE_FILTERS)
                        }
                        form={form}
                        cheerSubtype={cheerSubtype}
                        danceSubtype={danceSubtype}
                      />
                      <MTDSortMenu
                        grouped
                        value={magentoFilters.sortBy ?? "newest"}
                        onChange={(sortBy) =>
                          setMagentoFilters((prev) => ({ ...prev, sortBy }))
                        }
                      />
                    </div>
                  </div>
                </header>
                <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
                  {magentoFiltered.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                      <Search className="h-5 w-5 text-brand-ink-tertiary" />
                      <p className="text-[13px] text-brand-ink-secondary">
                        No Magento forms in this tab
                      </p>
                    </div>
                  ) : (
                    magentoPageItems.map((o) => (
                      <SideRow
                        key={o.id}
                        order={o}
                        selected={selectedMagentoId === o.id}
                        onSelect={() =>
                          setSelectedMagentoId((prev) =>
                            prev === o.id ? null : o.id
                          )
                        }
                        onOpen={() => openOrder(o)}
                      />
                    ))
                  )}
                </div>
                <ListPagination
                  page={magentoSafePage}
                  pageSize={MATCH_PAGE_SIZE}
                  total={magentoFiltered.length}
                  onPageChange={setMagentoPage}
                />
              </section>

              {/* Manual column */}
              <section className="dashboard-panel dashboard-panel-framed flex min-h-0 flex-col overflow-hidden">
                <header className="space-y-2 border-b border-brand-line/40 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-[13px] font-bold tracking-wide text-brand-ink">
                        Manually added order
                      </h3>
                      <p className="text-[11px] text-brand-ink-secondary">
                        New Orders waiting for a Magento form
                      </p>
                    </div>
                    <span className="rounded-full bg-brand-bg px-2 py-0.5 text-[11px] font-semibold tabular-nums text-brand-ink-secondary ring-1 ring-inset ring-brand-line/40">
                      {suggestedManuals.length + otherManuals.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-ink-tertiary" />
                      <input
                        type="search"
                        value={manualSearch}
                        onChange={(e) => setManualSearch(e.target.value)}
                        placeholder="Search id or form fields…"
                        className="h-8 w-full rounded-lg border border-brand-line/60 bg-white py-1.5 pl-8 pr-2.5 text-[12px] text-brand-ink outline-none placeholder:text-brand-ink-tertiary focus:border-brand-signature/40 focus:ring-2 focus:ring-brand-signature/15"
                      />
                    </label>
                    <div className="inline-flex shrink-0 flex-wrap items-center gap-0.5 rounded-xl bg-brand-elevated/80 p-0.5 ring-1 ring-inset ring-brand-line/40">
                      <MTDTableFilterPanel
                        grouped
                        variant="orders"
                        records={manualRecords}
                        producers={producers}
                        orderById={orderById}
                        filters={manualFilters}
                        onChange={(patch) =>
                          setManualFilters((prev) => ({ ...prev, ...patch }))
                        }
                        onReset={() =>
                          setManualFilters(DEFAULT_MTD_TABLE_FILTERS)
                        }
                        form={form}
                        cheerSubtype={cheerSubtype}
                        danceSubtype={danceSubtype}
                      />
                      <MTDSortMenu
                        grouped
                        value={manualFilters.sortBy ?? "newest"}
                        onChange={(sortBy) =>
                          setManualFilters((prev) => ({ ...prev, sortBy }))
                        }
                      />
                    </div>
                  </div>
                </header>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-2">
                  {manualsOrdered.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                      <Search className="h-5 w-5 text-brand-ink-tertiary" />
                      <p className="text-[13px] text-brand-ink-secondary">
                        No unmatched manuals in this tab. Add a New Order on
                        Orders first.
                      </p>
                    </div>
                  ) : (
                    <>
                      {pageSuggestedManuals.length > 0 ? (
                        <div>
                          <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-brand-signature">
                            Suggested for you · {suggestedManuals.length}
                          </p>
                          <div className="space-y-0.5">
                            {pageSuggestedManuals.map((m) => (
                              <SideRow
                                key={m.id}
                                order={m}
                                suggested
                                onOpen={() => openOrder(m)}
                                matchAction={
                                  selectedMagento && !isViewOnly
                                    ? {
                                        label: "Match",
                                        onClick: () =>
                                          startMatch(selectedMagento, m),
                                      }
                                    : selectedMagento && isViewOnly
                                      ? {
                                          label: "Match",
                                          onClick: () => {},
                                          disabled: true,
                                        }
                                      : null
                                }
                              />
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {pageOtherManuals.length > 0 ? (
                        <div>
                          <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-brand-ink-tertiary">
                            {suggestedManuals.length > 0
                              ? "All other manuals"
                              : "All manuals"}
                          </p>
                          <div className="space-y-0.5">
                            {pageOtherManuals.map((m) => (
                              <SideRow
                                key={m.id}
                                order={m}
                                onOpen={() => openOrder(m)}
                                matchAction={
                                  selectedMagento && !isViewOnly
                                    ? {
                                        label: "Match",
                                        onClick: () =>
                                          startMatch(selectedMagento, m),
                                        disabled: !canMergeMagentoFormIntoManual(
                                          selectedMagento,
                                          m
                                        ),
                                      }
                                    : null
                                }
                              />
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
                <ListPagination
                  page={manualSafePage}
                  pageSize={MATCH_PAGE_SIZE}
                  total={manualsOrdered.length}
                  onPageChange={setManualPage}
                />
              </section>
            </div>
          </div>
        )}
      </div>

      <MatchConfirmModal
        open={Boolean(matchPair)}
        magento={matchPair?.magento ?? null}
        manual={matchPair?.manual ?? null}
        onClose={() => setMatchPair(null)}
        onMatched={() => setSelectedMagentoId(null)}
      />

      <OrderFormEditModal
        open={Boolean(editRecord)}
        record={editRecord}
        allOrders={allOrders}
        onClose={() => setEditOrder(null)}
      />
    </div>
  );
}
