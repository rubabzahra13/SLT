"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { useAppProducers } from "@/context/AppStateContext";
import {
  prefetchOrdersMatchPoolQuery,
  refreshMatchCounts,
  useOrdersMatchPool,
} from "@/hooks/useOrdersMatchPool";
import {
  ordersReturnHref,
  warmOrdersReturnBoard,
} from "@/lib/board-nav-prefetch";
import type { OrdersMatchCounts } from "@/lib/api/orders-board";
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
import { setMatchOrdersPageOpen } from "@/lib/match-suggestion-notify";
import { canMergeMagentoFormIntoManual } from "@/lib/manual-form-merge";
import {
  filterMTDRecords,
  sortMTDRecordsBySortKey,
} from "@/lib/mtd-filters";
import {
  MATCH_POOL_SYNC_EVENT,
  readMatchCountsCache,
} from "@/lib/orders-board-cache";
import { stagingRecordFromOrder } from "@/lib/order-staging";
import {
  CHEER_FORM_SUBTABS,
  DANCE_FORM_SUBTABS,
  MANUAL_MATCH_FORM_TABS,
  supportsManualMatchForm,
} from "@/types";
import type {
  CheerFormSubtypeFilter,
  DanceFormSubtypeFilter,
  Order,
  OrderFormType,
  Producer,
} from "@/types";

/** Heavy modals stay out of the first Match chunk (faster first paint). */
const MatchConfirmModal = dynamic(
  () =>
    import("@/components/orders/MatchConfirmModal").then((m) => ({
      default: m.MatchConfirmModal,
    })),
  { ssr: false }
);
const OrderFormEditModal = dynamic(
  () =>
    import("@/components/orders/OrderFormEditModal").then((m) => ({
      default: m.OrderFormEditModal,
    })),
  { ssr: false }
);

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";
const DEFAULT_CHEER_SUBTYPE: CheerFormSubtypeFilter = "all-star-cheer";
const DEFAULT_DANCE_SUBTYPE: DanceFormSubtypeFilter = "pom";
const MATCH_FORM_KEY = "slt_match_form";
const MATCH_CHEER_KEY = "slt_match_cheer_subtype";
const MATCH_DANCE_KEY = "slt_match_dance_subtype";
/** Rows per Match panel page: small enough that dual panes page quickly. */
const MATCH_PAGE_SIZE = 5;

const VALID_MATCH_FORMS = MANUAL_MATCH_FORM_TABS.map((t) => t.id);
const VALID_CHEER: CheerFormSubtypeFilter[] = [
  "all-star-cheer",
  "school-cheer-viroc-yes",
  "school-cheer-viroc-no",
  "youth-rec-cheer",
];
const VALID_DANCE: DanceFormSubtypeFilter[] = [
  "pom",
  "hip-hop",
  "team-performance-variety",
  "gameday",
  "jazz-kick",
];

function readStoredMatchFilters(): {
  form: OrderFormType;
  cheerSubtype: CheerFormSubtypeFilter;
  danceSubtype: DanceFormSubtypeFilter;
} {
  if (typeof window === "undefined") {
    return {
      form: DEFAULT_FORM,
      cheerSubtype: DEFAULT_CHEER_SUBTYPE,
      danceSubtype: DEFAULT_DANCE_SUBTYPE,
    };
  }
  const formRaw = sessionStorage.getItem(MATCH_FORM_KEY) as OrderFormType | null;
  const cheerRaw = sessionStorage.getItem(
    MATCH_CHEER_KEY
  ) as CheerFormSubtypeFilter | null;
  const danceRaw = sessionStorage.getItem(
    MATCH_DANCE_KEY
  ) as DanceFormSubtypeFilter | null;
  return {
    form:
      formRaw && VALID_MATCH_FORMS.includes(formRaw) ? formRaw : DEFAULT_FORM,
    cheerSubtype:
      cheerRaw && VALID_CHEER.includes(cheerRaw)
        ? cheerRaw
        : DEFAULT_CHEER_SUBTYPE,
    danceSubtype:
      danceRaw && VALID_DANCE.includes(danceRaw)
        ? danceRaw
        : DEFAULT_DANCE_SUBTYPE,
  };
}

function ListPagination({
  page,
  pageSize,
  total,
  displayTotal,
  hasMore = false,
  loadingMore = false,
  onPageChange,
  onLoadMore,
}: {
  page: number;
  pageSize: number;
  /** Rows currently loaded in memory. */
  total: number;
  /** Server-known total (Orders-style "of N"). */
  displayTotal?: number;
  hasMore?: boolean;
  loadingMore?: boolean;
  onPageChange: (page: number) => void;
  onLoadMore?: () => void;
}) {
  const knownTotal =
    typeof displayTotal === "number" && displayTotal >= 0
      ? Math.max(displayTotal, total)
      : total;
  if (pageSize <= 0 || knownTotal <= 0) return null;
  const loadedPages = Math.max(1, Math.ceil(total / pageSize));
  const knownTotalPages = Math.max(1, Math.ceil(knownTotal / pageSize));
  const safePage = Math.min(Math.max(0, page), Math.max(0, knownTotalPages - 1));
  const rangeStart = total === 0 ? 0 : safePage * pageSize + 1;
  const rangeEnd = Math.min(total, (safePage + 1) * pageSize);

  const goNext = () => {
    if (safePage < loadedPages - 1) {
      onPageChange(safePage + 1);
      return;
    }
    if (hasMore && onLoadMore && !loadingMore) {
      onLoadMore();
      onPageChange(safePage + 1);
      return;
    }
    if (safePage < knownTotalPages - 1) onPageChange(safePage + 1);
  };

  const canGoNext =
    safePage < loadedPages - 1 ||
    (hasMore && !loadingMore) ||
    safePage < knownTotalPages - 1;

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-brand-line/40 bg-brand-elevated/40 px-4 py-2.5">
      <p className="text-[12px] font-medium text-brand-ink-tertiary">
        {total === 0
          ? `0 of ${knownTotal}`
          : `${rangeStart}-${rangeEnd} of ${knownTotal}`}
        {loadingMore ? " · loading…" : null}
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
          {safePage + 1} / {knownTotalPages}
        </span>
        <button
          type="button"
          disabled={!canGoNext}
          onClick={goNext}
          aria-label="Next page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-ink-secondary transition hover:bg-brand-bg hover:text-brand-ink disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

/** Any Filters choice that can hide rows (Sort only reorders). */
function narrowsMatchList(filters: MTDTableFilterState): boolean {
  return (
    filters.packageTier !== "All" ||
    filters.timeLimit !== "All" ||
    filters.split !== "all" ||
    filters.assignedProducer !== "All" ||
    filters.requestedProducer !== "All" ||
    (filters.scheduleFilter ?? "all") !== "all" ||
    (filters.infoFilter ?? "all") !== "all" ||
    filters.dateFilter.type !== "all"
  );
}

/** Same Filters + Sort pipeline as Orders (via staging MTD rows).
 * Form/subtype are already applied by /orders/match-pool — do not re-filter
 * here (wiped keepPreviousData on Jazz/Kick switches → false empty state).
 */
function filterAndSortMatchOrders(
  orders: Order[],
  filters: MTDTableFilterState,
  producers: Producer[],
  orderById: Map<string, Order>
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

function MatchSideColumnSkeleton({ title, subtitle }: { title: string; subtitle: string }) {
  const widths = [72, 54, 66, 48, 60, 58, 70, 52];
  return (
    <section className="dashboard-panel dashboard-panel-framed flex min-h-0 flex-col overflow-hidden">
      <header className="space-y-2 border-b border-brand-line/40 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 space-y-1.5">
            <h3 className="text-[13px] font-bold tracking-wide text-brand-ink">
              {title}
            </h3>
            <p className="text-[11px] text-brand-ink-secondary">{subtitle}</p>
          </div>
          <span className="h-5 w-8 animate-pulse rounded-full bg-brand-line/70" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 min-w-0 flex-1 animate-pulse rounded-lg bg-brand-line/55" />
          <div className="h-8 w-20 shrink-0 animate-pulse rounded-xl bg-brand-line/55" />
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-1 overflow-hidden p-2" aria-hidden>
        {widths.map((w, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5"
          >
            <span className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-brand-line/65" />
            <div className="min-w-0 flex-1 space-y-2">
              <span
                className="block h-3.5 animate-pulse rounded-md bg-brand-line/70"
                style={{ width: `${w}%` }}
              />
              <span
                className="block h-3 animate-pulse rounded-md bg-brand-line/50"
                style={{ width: `${Math.max(32, w - 18)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MatchPoolSkeleton() {
  return (
    <div
      className="flex h-full min-h-0 flex-col gap-3"
      role="status"
      aria-label="Loading match pool"
    >
      <div className="shrink-0 border-b border-brand-line/50 pb-2">
        <div className="h-4 w-3/4 max-w-md animate-pulse rounded-md bg-brand-line/60" />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
        <MatchSideColumnSkeleton
          title="Incoming form data"
          subtitle="Customer submissions waiting to link"
        />
        <MatchSideColumnSkeleton
          title="Manually added order"
          subtitle="New Orders waiting for a Magento form"
        />
      </div>
    </div>
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
  const teamName = String(order.teamName || "").trim();
  const showTeam =
    order.formType === "school-all-star-cheer" &&
    (order.cheerFormSubtype === "all-star-cheer" ||
      order.cheerFormSubtype === "youth-rec-cheer" ||
      !order.cheerFormSubtype);
  const displayName = identity || (showTeam ? teamName : "") || "No name yet";
  const isPlaceholderName = displayName === "No name yet";
  const meta = [
    contact || null,
    showTeam && teamName && teamName !== displayName ? teamName : null,
    packageLabel(order),
  ]
    .filter(Boolean)
    .join(" · ");

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
              "truncate text-left text-[14px] font-semibold underline-offset-2 hover:underline",
              // Team-only manuals (no gym yet) still use full ink — only the
              // empty placeholder stays tertiary grey.
              isPlaceholderName ? "text-brand-ink-tertiary" : "text-brand-ink"
            )}
            title={
              isPlaceholderName
                ? "View order details"
                : `View ${displayName}`
            }
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
          {meta || "-"}
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

function MatchOrdersPageContent() {
  const searchParams = useSearchParams();
  const focusManualId = searchParams.get("manual");
  const focusFormId = searchParams.get("form");
  /** From Flagged Resolve (or notify): open Match Confirm for this pair. */
  const openConfirmOnFocus = searchParams.get("confirm") === "1";
  const { producers, isViewOnly } = useAppProducers();

  const [form, setFormState] = useState<OrderFormType>(() =>
    typeof window !== "undefined" ? readStoredMatchFilters().form : DEFAULT_FORM
  );
  const [cheerSubtype, setCheerSubtypeState] =
    useState<CheerFormSubtypeFilter>(() =>
      typeof window !== "undefined"
        ? readStoredMatchFilters().cheerSubtype
        : DEFAULT_CHEER_SUBTYPE
    );
  const [danceSubtype, setDanceSubtypeState] =
    useState<DanceFormSubtypeFilter>(() =>
      typeof window !== "undefined"
        ? readStoredMatchFilters().danceSubtype
        : DEFAULT_DANCE_SUBTYPE
    );
  const [filtersReady, setFiltersReady] = useState(
    () => typeof window !== "undefined"
  );

  const setForm = useCallback((next: OrderFormType) => {
    setFormState(next);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(MATCH_FORM_KEY, next);
    }
  }, []);
  const setCheerSubtype = useCallback((next: CheerFormSubtypeFilter) => {
    setCheerSubtypeState(next);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(MATCH_CHEER_KEY, next);
    }
  }, []);
  const setDanceSubtype = useCallback((next: DanceFormSubtypeFilter) => {
    setDanceSubtypeState(next);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(MATCH_DANCE_KEY, next);
    }
  }, []);

  useLayoutEffect(() => {
    const stored = readStoredMatchFilters();
    setFormState(stored.form);
    setCheerSubtypeState(stored.cheerSubtype);
    setDanceSubtypeState(stored.danceSubtype);
    setFiltersReady(true);
  }, []);

  const {
    orders: matchPool,
    nextPageToken: matchPoolNextPageToken,
    loading: matchPoolLoading,
    loadingMore: matchPoolLoadingMore,
    loadMore: loadMoreMatchPool,
  } = useOrdersMatchPool({
    enabled: filtersReady,
    formType: form,
    cheerFormSubtype:
      form === "school-all-star-cheer" ? cheerSubtype : undefined,
    danceFormSubtype:
      form === "school-all-star-dance" ? danceSubtype : undefined,
  });

  const [matchCounts, setMatchCounts] = useState<OrdersMatchCounts | null>(
    () => readMatchCountsCache()?.counts ?? null
  );
  // Live updates keep fresh badges current — only a stale / cold cache refetches.
  useEffect(() => {
    const cached = readMatchCountsCache();
    if (cached) setMatchCounts(cached.counts);
    if (!cached?.fresh) void refreshMatchCounts();
  }, []);
  // Matches, splits, edits and live updates move the cached badges.
  useEffect(() => {
    const onSync = () => {
      const hit = readMatchCountsCache();
      if (hit) setMatchCounts(hit.counts);
    };
    window.addEventListener(MATCH_POOL_SYNC_EVENT, onSync);
    return () => window.removeEventListener(MATCH_POOL_SYNC_EVENT, onSync);
  }, []);
  useEffect(() => {
    setMatchOrdersPageOpen(true);
    return () => setMatchOrdersPageOpen(false);
  }, []);

  const activeOrders = matchPool;
  const allOrders = matchPool;
  // Do not wait on AppState bootstrap — orders are paged via match-pool.
  const matchLoading = matchPoolLoading && matchPool.length === 0;

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
  const [focusSeedApplied, setFocusSeedApplied] = useState(false);

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

  // Deep-link from Orders MTD soft gate: focus a manual (+ optional form).
  useEffect(() => {
    if (focusSeedApplied || matchLoading) return;
    if (!focusManualId && !focusFormId) {
      setFocusSeedApplied(true);
      return;
    }
    const manual =
      unmatchedManuals.find(
        (o) =>
          o.id === focusManualId ||
          o.uuid === focusManualId ||
          o.legacyId === focusManualId
      ) ||
      allOrders.find(
        (o) =>
          o.id === focusManualId ||
          o.uuid === focusManualId ||
          o.legacyId === focusManualId
      );
    const formOrder =
      unmatchedMagento.find(
        (o) =>
          o.id === focusFormId ||
          o.uuid === focusFormId ||
          o.legacyId === focusFormId
      ) ||
      allOrders.find(
        (o) =>
          o.id === focusFormId ||
          o.uuid === focusFormId ||
          o.legacyId === focusFormId
      );

    const seed = formOrder || manual;
    if (seed?.formType && VALID_MATCH_FORMS.includes(seed.formType)) {
      setForm(seed.formType);
      if (seed.formType === "school-all-star-cheer") {
        setCheerSubtype(
          (seed.cheerFormSubtype as CheerFormSubtypeFilter) ||
            DEFAULT_CHEER_SUBTYPE
        );
      }
      if (seed.formType === "school-all-star-dance") {
        setDanceSubtype(
          (seed.danceFormSubtype as DanceFormSubtypeFilter) ||
            DEFAULT_DANCE_SUBTYPE
        );
      }
    }
    if (manual) {
      const identity = getOrderIdentityName(manual).trim();
      setManualSearch(identity || manual.id);
    }
    if (formOrder) {
      const identity = getOrderIdentityName(formOrder).trim();
      setMagentoSearch(identity || formOrder.id);
      setSelectedMagentoId(formOrder.id);
    }
    // Post-Flagged Resolve (and deep links): open Confirm like a new
    // single-affiliate Magento form that already has a Suggested manual.
    if (
      openConfirmOnFocus &&
      formOrder &&
      manual &&
      !formOrder.isManualEntry &&
      manual.isManualEntry &&
      !formOrder.mergedIntoManualOrderId &&
      !manual.mergedFormOrderId
    ) {
      setMatchPair({ magento: formOrder, manual });
    }
    setFocusSeedApplied(true);
  }, [
    focusSeedApplied,
    matchLoading,
    focusManualId,
    focusFormId,
    openConfirmOnFocus,
    unmatchedManuals,
    unmatchedMagento,
    allOrders,
  ]);

  // Server chip totals only (sticky via match-counts cache) — no pool-local merge.
  const formCounts = useMemo(() => {
    const counts = Object.fromEntries(
      MANUAL_MATCH_FORM_TABS.map(({ id }) => [id, 0])
    ) as Record<OrderFormType, number>;
    if (!matchCounts?.by_form_type) return counts;
    for (const tab of MANUAL_MATCH_FORM_TABS) {
      counts[tab.id] = matchCounts.by_form_type[tab.id] ?? 0;
    }
    return counts;
  }, [matchCounts]);

  const cheerSubtypeCounts = useMemo(() => {
    const fromServer = matchCounts?.by_cheer_form_subtype || {};
    return {
      all: Object.values(fromServer).reduce((a, b) => a + b, 0),
      ...Object.fromEntries(CHEER_FORM_SUBTABS.map(({ id }) => [id, 0])),
      ...fromServer,
    } as Record<CheerFormSubtypeFilter, number>;
  }, [matchCounts]);

  const danceSubtypeCounts = useMemo(() => {
    const fromServer = matchCounts?.by_dance_form_subtype || {};
    return {
      all: Object.values(fromServer).reduce((a, b) => a + b, 0),
      ...Object.fromEntries(DANCE_FORM_SUBTABS.map(({ id }) => [id, 0])),
      ...fromServer,
    } as Record<DanceFormSubtypeFilter, number>;
  }, [matchCounts]);

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

  const warmMatchForm = useCallback((next: OrderFormType) => {
    if (next === form) return;
    if (next === "school-all-star-cheer") {
      void prefetchOrdersMatchPoolQuery({
        formType: next,
        cheerFormSubtype: cheerSubtype,
      });
      return;
    }
    if (next === "school-all-star-dance") {
      void prefetchOrdersMatchPoolQuery({
        formType: next,
        danceFormSubtype: danceSubtype,
      });
      return;
    }
    void prefetchOrdersMatchPoolQuery({ formType: next });
  }, [form, cheerSubtype, danceSubtype]);

  const warmMatchCheer = useCallback(
    (next: CheerFormSubtypeFilter) => {
      if (next === cheerSubtype) return;
      void prefetchOrdersMatchPoolQuery({
        formType: "school-all-star-cheer",
        cheerFormSubtype: next,
      });
    },
    [cheerSubtype]
  );

  const warmMatchDance = useCallback(
    (next: DanceFormSubtypeFilter) => {
      if (next === danceSubtype) return;
      void prefetchOrdersMatchPoolQuery({
        formType: "school-all-star-dance",
        danceFormSubtype: next,
      });
    },
    [danceSubtype]
  );

  // Sibling Match tabs warm on form/subtype intent (hover/pointerdown) only —
  // no idle multi-pool prefetch while sitting on Match.

  // Pool is API-scoped; still filter client-side so a stale previous tab never
  // paints under Gameday (0) / empty subtypes.
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

  /** Header badge: server totals for the active form/subtype (Orders-style). */
  const headerMagentoCount = useMemo(() => {
    if (!matchCounts) return magentoInCategory.length;
    if (form === "school-all-star-cheer" && cheerSubtype !== "all") {
      return matchCounts.by_cheer_form_subtype[cheerSubtype] ?? 0;
    }
    if (form === "school-all-star-dance" && danceSubtype !== "all") {
      return matchCounts.by_dance_form_subtype[danceSubtype] ?? 0;
    }
    return matchCounts.by_form_type[form] ?? 0;
  }, [matchCounts, form, cheerSubtype, danceSubtype, magentoInCategory.length]);

  const headerManualCount = useMemo(() => {
    if (!matchCounts) return manualsInCategory.length;
    if (form === "school-all-star-cheer" && cheerSubtype !== "all") {
      return matchCounts.manual_by_cheer_form_subtype[cheerSubtype] ?? 0;
    }
    if (form === "school-all-star-dance" && danceSubtype !== "all") {
      return matchCounts.manual_by_dance_form_subtype[danceSubtype] ?? 0;
    }
    return matchCounts.manual_by_form_type[form] ?? 0;
  }, [matchCounts, form, cheerSubtype, danceSubtype, manualsInCategory.length]);

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
      orderById
    );
  }, [magentoInCategory, mq, magentoFilters, producers, orderById]);

  const manualsFiltered = useMemo(() => {
    let list = manualsInCategory;
    if (nq) list = list.filter((o) => orderSearchBlob(o).includes(nq));
    return filterAndSortMatchOrders(
      list,
      manualFilters,
      producers,
      orderById
    );
  }, [manualsInCategory, nq, manualFilters, producers, orderById]);

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

  const magentoLoadedPages = Math.max(
    1,
    Math.ceil(Math.max(magentoFiltered.length, 1) / MATCH_PAGE_SIZE)
  );
  const magentoSafePage = Math.min(
    magentoPage,
    Math.max(0, magentoLoadedPages - 1)
  );
  const magentoPageItems = magentoFiltered.slice(
    magentoSafePage * MATCH_PAGE_SIZE,
    magentoSafePage * MATCH_PAGE_SIZE + MATCH_PAGE_SIZE
  );

  // Prefetch next server page when the Magento pager reaches the last loaded page.
  useEffect(() => {
    if (!matchPoolNextPageToken || matchPoolLoadingMore) return;
    if (magentoSafePage < magentoLoadedPages - 1) return;
    void loadMoreMatchPool();
  }, [
    magentoSafePage,
    magentoLoadedPages,
    matchPoolNextPageToken,
    matchPoolLoadingMore,
    loadMoreMatchPool,
  ]);

  // Suggested stay visible in full; paginate only non-suggested manuals so
  // name matches don't push "All other manuals" onto later pages.
  const paginateOthersOnly =
    otherManuals.length > 0 && suggestedManuals.length > 0;
  const manualPageSource = paginateOthersOnly
    ? otherManuals
    : otherManuals.length > 0
      ? otherManuals
      : suggestedManuals;
  const manualTotalPages = Math.max(
    1,
    Math.ceil(manualPageSource.length / MATCH_PAGE_SIZE)
  );
  const manualSafePage = Math.min(manualPage, manualTotalPages - 1);
  const manualPageSlice = manualPageSource.slice(
    manualSafePage * MATCH_PAGE_SIZE,
    manualSafePage * MATCH_PAGE_SIZE + MATCH_PAGE_SIZE
  );
  const pageSuggestedForRender = paginateOthersOnly
    ? suggestedManuals
    : otherManuals.length === 0
      ? manualPageSlice
      : [];
  const pageOtherManuals = paginateOthersOnly
    ? manualPageSlice
    : otherManuals.length > 0
      ? manualPageSlice
      : [];
  const manualsOrderedCount = suggestedManuals.length + otherManuals.length;

  // Server totals only describe the unfiltered tab; a search or filter shows
  // what matched in the loaded rows instead.
  const magentoNarrowed = Boolean(mq) || narrowsMatchList(magentoFilters);
  const manualNarrowed = Boolean(nq) || narrowsMatchList(manualFilters);
  const magentoPanelCount = magentoNarrowed
    ? magentoFiltered.length
    : headerMagentoCount;
  const manualPanelCount = manualNarrowed
    ? manualsOrderedCount
    : headerManualCount;
  const magentoPagerTotal = magentoNarrowed ? undefined : headerMagentoCount;
  const manualPagerTotal = manualNarrowed
    ? undefined
    : paginateOthersOnly
      ? Math.max(0, headerManualCount - suggestedManuals.length)
      : headerManualCount;

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

  const backToOrdersHref = useMemo(() => ordersReturnHref(), []);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Match Orders"
        badge={`${headerMagentoCount} Magento · ${headerManualCount} manual`}
        subtitle={`Pick a Magento form, then link it to a manual ${programHeader.toLowerCase()} when names look alike`}
        headerActions={
          <Link
            href={backToOrdersHref}
            prefetch
            onMouseEnter={() => warmOrdersReturnBoard()}
            onPointerDown={() => warmOrdersReturnBoard()}
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
              onFormIntent={warmMatchForm}
              formCounts={formCounts}
              tabs={MANUAL_MATCH_FORM_TABS}
            />
            <OrderFormSubtypeTabs
              form={form}
              cheerSubtype={cheerSubtype}
              danceSubtype={danceSubtype}
              onCheerSubtypeChange={(s) => {
                setCheerSubtype(s);
                setSelectedMagentoId(null);
                setMagentoPage(0);
                setManualPage(0);
              }}
              onDanceSubtypeChange={(s) => {
                setDanceSubtype(s);
                setSelectedMagentoId(null);
                setMagentoPage(0);
                setManualPage(0);
              }}
              onCheerIntent={warmMatchCheer}
              onDanceIntent={warmMatchDance}
              cheerCounts={cheerSubtypeCounts}
              danceCounts={danceSubtypeCounts}
            />
          </div>
        }
      />

      <div className="min-h-0 flex-1 overflow-hidden px-2 pb-4 pt-4 lg:px-3">
        {matchLoading ? (
          <MatchPoolSkeleton />
        ) : magentoFiltered.length === 0 &&
          manualsFiltered.length === 0 &&
          !matchPoolNextPageToken &&
          // Counts can say "1" while the new subtype pool is still in flight —
          // don't flash the empty state over real Jazz/Kick (etc.) rows.
          headerMagentoCount === 0 &&
          headerManualCount === 0 ? (
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
                      {magentoPanelCount}
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
                    matchPoolLoading ? (
                      <div className="space-y-1 p-1" aria-busy="true">
                        {[72, 54, 66].map((w, i) => (
                          <div
                            key={i}
                            className="h-14 animate-pulse rounded-xl bg-brand-line/45"
                            style={{ width: `${w}%` }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                        <Search className="h-5 w-5 text-brand-ink-tertiary" />
                        <p className="text-[13px] text-brand-ink-secondary">
                          No Magento forms in this tab
                        </p>
                      </div>
                    )
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
                  displayTotal={magentoPagerTotal}
                  hasMore={Boolean(matchPoolNextPageToken)}
                  loadingMore={matchPoolLoadingMore}
                  onPageChange={setMagentoPage}
                  onLoadMore={loadMoreMatchPool}
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
                      {manualPanelCount}
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
                  {manualsOrderedCount === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                      <Search className="h-5 w-5 text-brand-ink-tertiary" />
                      <p className="text-[13px] text-brand-ink-secondary">
                        {supportsManualMatchForm(form)
                          ? "No unmatched manuals in this tab. Add a New Order on Orders first."
                          : `${
                              MANUAL_MATCH_FORM_TABS.find((t) => t.id === form)
                                ?.label ?? "This form"
                            } comes from Magento only — New Order can't create a manual for it, so there's nothing to link.`}
                      </p>
                    </div>
                  ) : (
                    <>
                      {pageSuggestedForRender.length > 0 ? (
                        <div>
                          <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-brand-signature">
                            Suggested for you · {suggestedManuals.length}
                          </p>
                          <div className="space-y-0.5">
                            {pageSuggestedForRender.map((m) => (
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
                  total={manualPageSource.length}
                  displayTotal={manualPagerTotal}
                  hasMore={Boolean(matchPoolNextPageToken)}
                  loadingMore={matchPoolLoadingMore}
                  onPageChange={setManualPage}
                  onLoadMore={loadMoreMatchPool}
                />
              </section>
            </div>
          </div>
        )}
      </div>

      <MatchConfirmModal
        open={Boolean(matchPair)}
        magento={
          matchPair
            ? orderById.get(matchPair.magento.id) ?? matchPair.magento
            : null
        }
        manual={
          matchPair
            ? orderById.get(matchPair.manual.id) ?? matchPair.manual
            : null
        }
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

export default function MatchOrdersPage() {
  return (
    <Suspense fallback={<MatchPoolSkeleton />}>
      <MatchOrdersPageContent />
    </Suspense>
  );
}
