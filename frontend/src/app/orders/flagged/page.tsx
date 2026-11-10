"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Eye, Flag, Mail } from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "@/components/layout/PageHeader";
import { TruncatedText } from "@/components/ui/TruncatedText";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { HoverTip } from "@/components/ui/HoverTip";
import { OrderFormTabs } from "@/components/orders/OrderFormTabs";
import { OrderFormSubtypeTabs } from "@/components/orders/OrderFormSubtypeTabs";
import { OrderRequirementsCell } from "@/components/orders/OrderRequirementsCell";
import { OrderDataStatusBadge } from "@/components/orders/OrderStatusDropdown";
import {
  magentoPackageBoardLabel,
  packageTypeDisplayValue,
} from "@/components/mtd/PackageTypeField";
import { useAppState } from "@/context/AppStateContext";
import { OrdersLookupProvider } from "@/context/OrdersLookupContext";
import { useOrdersBoard } from "@/hooks/useOrdersBoard";
import {
  ordersReturnHref,
  warmOrdersReturnBoard,
} from "@/lib/board-nav-prefetch";

/** Heavy modals stay out of the first Flagged chunk (faster first paint). */
const ResolveAffiliateFlagModal = dynamic(
  () =>
    import("@/components/orders/ResolveAffiliateFlagModal").then((m) => ({
      default: m.ResolveAffiliateFlagModal,
    })),
  { ssr: false }
);
const FlaggedOrderViewModal = dynamic(
  () =>
    import("@/components/orders/FlaggedOrderViewModal").then((m) => ({
      default: m.FlaggedOrderViewModal,
    })),
  { ssr: false }
);
import {
  formatMusicAffiliateDisplay,
  getAffiliateSelections,
  isInvalidMultiAffiliateSelection,
} from "@/lib/affiliate-flag";
import { formatDisplayDateTime } from "@/lib/dates";
import {
  findLinkedOrder,
  formHasRequestedProducer,
  formatRequestedEditorLabel,
} from "@/lib/editor-assignment";
import {
  matchesFormFilter,
  resolveMTDFormMeta,
} from "@/lib/mtd-filters";
import { displayMixLengthLabel } from "@/lib/mix-duration";
import { parsePackage } from "@/lib/package";
import { listPreMtdOrderRecords } from "@/lib/order-staging";
import {
  getContactColumnHeader,
  getOrderContactPersonName,
  getOrderIdentityName,
  getProgramColumnHeader,
} from "@/lib/order-detail-sections";
import { orderFromMTDRecord } from "@/lib/order-detail-fields";
import {
  AFFILIATE_FLAG_CHEER_SUBTABS,
  AFFILIATE_FLAG_FORM_TABS,
  DANCE_FORM_SUBTABS,
  type CheerFormSubtypeFilter,
  type DanceFormSubtypeFilter,
  type MTDRecord,
  type Order,
  type OrderFormType,
} from "@/types";

const viewBtnClass =
  "inline-flex h-7 items-center justify-center gap-0.5 rounded-md border border-brand-line/60 bg-brand-elevated px-2 text-[10px] font-semibold leading-none text-brand-ink-secondary shadow-sm transition hover:border-brand-signature/35 hover:bg-brand-signature/8 hover:text-brand-signature";

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";
const DEFAULT_CHEER_SUBTYPE: CheerFormSubtypeFilter = "all-star-cheer";
const DEFAULT_DANCE_SUBTYPE: DanceFormSubtypeFilter = "pom";

const compactCellClass = "!px-1 !py-1 overflow-hidden";
const compactHeaderClass = "!px-2";
const compactTextClass = "text-[12px] leading-snug text-brand-ink";

const actionButtonClass = (filled: boolean, disabled = false) =>
  clsx(
    "mt-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition shadow-sm",
    disabled
      ? "cursor-not-allowed border-brand-line/50 bg-brand-bg/40 text-brand-ink-tertiary"
      : filled
        ? "border-brand-line/70 bg-brand-elevated text-brand-ink hover:border-brand-line hover:bg-brand-bg/50"
        : "border-brand-orange-deep bg-brand-orange text-white hover:bg-brand-orange-hover"
  );

const ordersMailTextButtonDisabledClass =
  "inline-flex h-7 cursor-not-allowed items-center justify-center gap-0.5 rounded-md border border-brand-line/50 bg-brand-bg/40 px-2 text-[10px] font-semibold leading-none text-brand-ink-tertiary shadow-sm";
const ordersMailCustomerButtonClass =
  "inline-flex h-7 items-center justify-center gap-0.5 rounded-md border border-brand-warning/35 bg-brand-warning/8 px-2 text-[10px] font-semibold leading-none text-brand-warning shadow-sm transition hover:border-brand-warning/50 hover:bg-brand-warning/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-warning/20";

export default function FlaggedOrdersPage() {
  // Do not ensureLiveMtdLoaded here — it raced Magento/board and made Flagged
  // feel stuck. Board orders + synthetic staging are enough for open flags.
  const { mtdRecords, producers, isViewOnly } = useAppState();

  const [form, setForm] = useState<OrderFormType>(DEFAULT_FORM);
  const [cheerSubtype, setCheerSubtype] =
    useState<CheerFormSubtypeFilter>(DEFAULT_CHEER_SUBTYPE);
  const [danceSubtype, setDanceSubtype] =
    useState<DanceFormSubtypeFilter>(DEFAULT_DANCE_SUBTYPE);
  const [affiliateFlagRecord, setAffiliateFlagRecord] =
    useState<MTDRecord | null>(null);
  const [affiliateFlagMode, setAffiliateFlagMode] = useState<"resolve" | "email">(
    "resolve"
  );
  const [viewRecord, setViewRecord] = useState<MTDRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // One board fetch for all open flags — form/subtype tabs filter client-side.
  // (Flagged volume is small; per-tab fetches made the page feel slow on open.)
  const boardQuery = useMemo(
    () => ({
      range: "flagged" as const,
      excludeFlagged: false as boolean,
      search: searchQuery.trim() || undefined,
      sortBy: "newest",
    }),
    [searchQuery]
  );

  const {
    orders: boardOrders,
    counts: boardCounts,
    nextPageToken,
    loading: boardLoading,
    loadingMore: boardLoadingMore,
    loadMore,
  } = useOrdersBoard(boardQuery);

  const allOrders = boardOrders;

  const orderById = useMemo(() => {
    const map = new Map<string, Order>();
    for (const order of boardOrders) {
      map.set(order.id, order);
      if (order.legacyId) map.set(order.legacyId, order);
      if (order.uuid) map.set(order.uuid, order);
    }
    return map;
  }, [boardOrders]);

  // Server already filters affiliate_flag_status=open for range=flagged.
  const flaggedRecords = useMemo(
    () => listPreMtdOrderRecords(boardOrders, mtdRecords),
    [boardOrders, mtdRecords]
  );

  // Server chip totals only (sticky via useOrdersBoard) — no page-local merge.
  const formCounts = useMemo(() => {
    return (boardCounts.by_form_type || {}) as Record<OrderFormType, number>;
  }, [boardCounts.by_form_type]);

  const cheerSubtypeCounts = useMemo(() => {
    return (boardCounts.by_cheer_form_subtype || {}) as Record<
      CheerFormSubtypeFilter,
      number
    >;
  }, [boardCounts.by_cheer_form_subtype]);

  const danceSubtypeCounts = useMemo(() => {
    return (boardCounts.by_dance_form_subtype || {}) as Record<
      DanceFormSubtypeFilter,
      number
    >;
  }, [boardCounts.by_dance_form_subtype]);

  const switchForm = useCallback(
    (next: OrderFormType) => {
      setForm(next);
      if (next === "school-all-star-cheer") {
        const nextCheer =
          AFFILIATE_FLAG_CHEER_SUBTABS.find(
            (t) => (cheerSubtypeCounts[t.id] ?? 0) > 0
          )?.id ?? DEFAULT_CHEER_SUBTYPE;
        setCheerSubtype(nextCheer);
        setDanceSubtype(DEFAULT_DANCE_SUBTYPE);
        return;
      }
      if (next === "school-all-star-dance") {
        const nextDance =
          DANCE_FORM_SUBTABS.find((t) => (danceSubtypeCounts[t.id] ?? 0) > 0)
            ?.id ?? DEFAULT_DANCE_SUBTYPE;
        setDanceSubtype(nextDance);
        setCheerSubtype(DEFAULT_CHEER_SUBTYPE);
        return;
      }
      setCheerSubtype(DEFAULT_CHEER_SUBTYPE);
      setDanceSubtype(DEFAULT_DANCE_SUBTYPE);
    },
    [cheerSubtypeCounts, danceSubtypeCounts]
  );

  // Land on a form/subtype that actually has open flags (Cheer default is often 0).
  // Only lock once some form badge is > 0 — never lock on empty pre-counts state.
  const didAutoSelectForm = useRef(false);
  useEffect(() => {
    if (didAutoSelectForm.current) return;
    const nextForm = AFFILIATE_FLAG_FORM_TABS.find(
      (t) => (formCounts[t.id] ?? 0) > 0
    )?.id;
    if (!nextForm) return;
    didAutoSelectForm.current = true;
    if (nextForm !== form) {
      switchForm(nextForm);
      return;
    }
    if (form === "school-all-star-dance") {
      const nextDance =
        DANCE_FORM_SUBTABS.find((t) => (danceSubtypeCounts[t.id] ?? 0) > 0)
          ?.id ?? danceSubtype;
      if (nextDance !== danceSubtype) setDanceSubtype(nextDance);
    }
  }, [form, formCounts, danceSubtype, danceSubtypeCounts, switchForm]);

  const categoryFiltered = useMemo(
    () =>
      flaggedRecords.filter((rec) =>
        matchesFormFilter(rec, orderById, form, cheerSubtype, danceSubtype)
      ),
    [flaggedRecords, orderById, form, cheerSubtype, danceSubtype]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categoryFiltered;
    return categoryFiltered.filter((rec) => {
      const linked = findLinkedOrder(rec, allOrders);
      const identity = getOrderIdentityName(
        linked || orderFromMTDRecord(rec)
      ).trim();
      const contact = getOrderContactPersonName(
        linked || orderFromMTDRecord(rec),
        rec.contactName,
        rec.programName
      ).trim();
      const selections = getAffiliateSelections(linked ?? null, rec);
      const hay = [identity, contact, ...selections].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [categoryFiltered, searchQuery, allOrders]);

  const contactHeader = getContactColumnHeader(
    form,
    cheerSubtype === "all" ? undefined : cheerSubtype,
    danceSubtype === "all" ? undefined : danceSubtype
  );
  const programHeader = getProgramColumnHeader(
    form,
    cheerSubtype === "all" ? undefined : cheerSubtype,
    danceSubtype === "all" ? undefined : danceSubtype
  );

  const showMusicAffiliate =
    form === "school-all-star-cheer" || form === "school-all-star-dance";
  const showFormProducer = formHasRequestedProducer(
    form,
    cheerSubtype === "all" ? undefined : cheerSubtype
  );

  const columns: Column<MTDRecord>[] = useMemo(() => {
    const baseCols: Column<MTDRecord>[] = [
      {
        key: "rowId",
        header: "ID",
        width: "56px",
        align: "center",
        sticky: "left" as const,
        render: (_rec, index) => (
          <span className="tabular-nums text-[12px] text-brand-ink">
            {index + 1}
          </span>
        ),
      },
      {
        key: "createdAt",
        header: "Timestamp",
        width: "128px",
        align: "center",
        nowrap: true,
        sticky: "left" as const,
        cellClassName: compactCellClass,
        headerClassName: compactHeaderClass,
        render: (rec) => {
          const linked = findLinkedOrder(rec, allOrders);
          return (
            <span className="whitespace-nowrap text-[11px] tabular-nums text-brand-ink-secondary">
              {formatDisplayDateTime(linked?.createdAt || "")}
            </span>
          );
        },
      },
      {
        key: "contact",
        header: contactHeader,
        width: contactHeader.length > 14 ? "150px" : "100px",
        align: "left",
        nowrap: false,
        sticky: "left" as const,
        cellClassName: clsx(
          compactCellClass,
          contactHeader.length > 14 ? "max-w-[150px]" : "max-w-[100px]"
        ),
        headerClassName: clsx(
          compactHeaderClass,
          contactHeader.length > 14 && "whitespace-normal leading-tight"
        ),
        render: (rec) => {
          const linked = findLinkedOrder(rec, allOrders);
          const name = getOrderContactPersonName(
            linked || orderFromMTDRecord(rec),
            rec.contactName,
            rec.programName
          ).trim();
          return (
            <TruncatedText
              text={name || "No data"}
              className={clsx(
                "w-full min-w-0 text-left",
                compactTextClass,
                !name && "text-brand-ink-tertiary"
              )}
              style={{ maxWidth: "100%" }}
            />
          );
        },
      },
      {
        key: "program",
        header: programHeader,
        width: programHeader.length > 14 ? "150px" : "100px",
        align: "left",
        nowrap: false,
        sticky: "left" as const,
        cellClassName: clsx(
          compactCellClass,
          programHeader.length > 14 ? "max-w-[150px]" : "max-w-[100px]"
        ),
        headerClassName: clsx(
          compactHeaderClass,
          "whitespace-normal leading-tight"
        ),
        render: (rec) => {
          const linked = findLinkedOrder(rec, allOrders);
          const name = getOrderIdentityName(
            linked || orderFromMTDRecord(rec)
          ).trim();
          return (
            <TruncatedText
              text={name || "No data"}
              className={clsx(
                "w-full min-w-0 text-left",
                compactTextClass,
                !name && "text-brand-ink-tertiary"
              )}
              style={{ maxWidth: "100%" }}
            />
          );
        },
      },
      {
        key: "package",
        header: "Package type",
        width: "120px",
        align: "center",
        nowrap: false,
        sticky: "left" as const,
        cellClassName: clsx(compactCellClass, "max-w-[120px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => {
          const linked = findLinkedOrder(rec, allOrders);
          const meta = resolveMTDFormMeta(rec, orderById);
          const raw =
            linked?.packageType || linked?.package || rec.package || "";
          const label = magentoPackageBoardLabel(
            meta.formType,
            raw,
            meta.danceFormSubtype,
            meta.cheerFormSubtype
          );
          return (
            <TruncatedText
              text={label || "No data"}
              className={clsx(
                "mx-auto w-full min-w-0 text-center font-medium",
                compactTextClass,
                !label && "text-brand-ink-tertiary"
              )}
              style={{ maxWidth: "100%" }}
            />
          );
        },
      },
      ...(form === "school-all-star-cheer"
        ? [
            {
              key: "limit",
              header: "Length of Mix",
              width: "100px",
              align: "center" as const,
              nowrap: false,
              cellClassName: clsx(compactCellClass, "max-w-[100px]"),
              headerClassName: clsx(
                compactHeaderClass,
                "whitespace-normal leading-tight"
              ),
              render: (rec: MTDRecord) => {
                const linked = findLinkedOrder(rec, allOrders);
                const meta = resolveMTDFormMeta(rec, orderById);
                const fromOrder = displayMixLengthLabel(
                  linked?.timeLengthOfMix || ""
                );
                const fromPackage = parsePackage(
                  packageTypeDisplayValue(rec.package)
                    ? rec.package
                    : linked?.package || ""
                ).limit;
                let limit =
                  fromOrder ||
                  displayMixLengthLabel(
                    fromPackage && fromPackage !== "-" ? fromPackage : ""
                  );
                if (
                  meta.cheerFormSubtype === "youth-rec-cheer" &&
                  limit === "2:15"
                ) {
                  limit = "2:30";
                }
                return (
                  <span
                    className={clsx(
                      "mx-auto block text-center tabular-nums",
                      compactTextClass,
                      !limit && "text-brand-ink-tertiary"
                    )}
                  >
                    {limit || "No data"}
                  </span>
                );
              },
            } satisfies Column<MTDRecord>,
          ]
        : []),
      ...(showMusicAffiliate
        ? [
            {
              key: "musicAffiliate",
              header: "Music Affiliate",
              width: "140px",
              align: "center" as const,
              nowrap: false,
              cellClassName: clsx(compactCellClass, "max-w-[140px]"),
              headerClassName: compactHeaderClass,
              render: (rec: MTDRecord) => {
                const linked = findLinkedOrder(rec, allOrders);
                const display = formatMusicAffiliateDisplay(linked ?? null, rec);
                if (!display) {
                  return (
                    <span
                      className={clsx(
                        "mx-auto block text-center text-brand-ink-tertiary",
                        compactTextClass
                      )}
                    >
                      No data
                    </span>
                  );
                }
                const invalidMulti = isInvalidMultiAffiliateSelection(
                  linked,
                  rec
                );
                return (
                  <TruncatedText
                    text={display}
                    className={clsx(
                      "mx-auto w-full min-w-0 text-center font-medium",
                      compactTextClass,
                      invalidMulti && "text-rose-600"
                    )}
                    style={{ maxWidth: "100%" }}
                  />
                );
              },
            } satisfies Column<MTDRecord>,
          ]
        : []),
      {
        key: "collections",
        header: "Collections",
        width: "140px",
        align: "center",
        nowrap: false,
        cellClassName: clsx(compactCellClass, "min-w-[140px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => (
          <OrderRequirementsCell record={rec} category="collections" />
        ),
      },
      {
        key: "songsArea",
        header: "Songs",
        width: "130px",
        align: "center",
        nowrap: false,
        cellClassName: clsx(compactCellClass, "min-w-[130px]"),
        headerClassName: compactHeaderClass,
        render: (rec) => (
          <OrderRequirementsCell record={rec} category="songs" />
        ),
      },
      {
        key: "dataStatus",
        header: "Form data",
        width: "130px",
        align: "center",
        nowrap: false,
        cellClassName: compactCellClass,
        headerClassName: compactHeaderClass,
        render: (rec) => <OrderDataStatusBadge record={rec} />,
      },
      ...(showFormProducer
        ? [
            {
              key: "requestedEditor",
              header: "Requested\nproducer",
              width: "100px",
              align: "center" as const,
              nowrap: false,
              cellClassName: clsx(compactCellClass, "max-w-[100px]"),
              headerClassName: clsx(
                compactHeaderClass,
                "whitespace-pre-line leading-tight"
              ),
              render: (rec: MTDRecord) => {
                const linked = findLinkedOrder(rec, allOrders);
                const label = formatRequestedEditorLabel(
                  rec,
                  producers,
                  linked
                );
                if (!label.trim()) {
                  return (
                    <span
                      className={clsx(
                        "font-medium text-brand-ink-tertiary",
                        compactTextClass
                      )}
                    >
                      -
                    </span>
                  );
                }
                const isFa = label === "First Available";
                return (
                  <span
                    className={clsx(
                      "font-medium",
                      compactTextClass,
                      isFa ? "text-brand-info" : "text-brand-ink"
                    )}
                  >
                    {label}
                  </span>
                );
              },
            } satisfies Column<MTDRecord>,
          ]
        : []),
      {
        key: "email",
        header: "Email",
        width: "120px",
        align: "center",
        nowrap: false,
        cellClassName: compactCellClass,
        headerClassName: compactHeaderClass,
        render: (rec) => (
          <div
            className="flex items-center justify-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <HoverTip
              label="Email customer to confirm which affiliate"
              placement="top"
            >
              <button
                type="button"
                disabled={isViewOnly}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => {
                  if (isViewOnly) return;
                  setAffiliateFlagMode("email");
                  setAffiliateFlagRecord(rec);
                }}
                className={
                  isViewOnly
                    ? ordersMailTextButtonDisabledClass
                    : ordersMailCustomerButtonClass
                }
                aria-label="Email customer about affiliate"
              >
                <Mail className="h-3 w-3 shrink-0" strokeWidth={2.25} />
                <span>Customer</span>
              </button>
            </HoverTip>
          </div>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        width: "240px",
        align: "center",
        nowrap: true,
        cellClassName: compactCellClass,
        headerClassName: compactHeaderClass,
        render: (rec) => {
          return (
            <div
              className="flex flex-wrap items-center justify-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <HoverTip
                label="View Magento order details (read only)"
                placement="top"
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setViewRecord(rec)}
                  className={viewBtnClass}
                  aria-label="View Magento order details"
                >
                  <Eye className="h-3 w-3 shrink-0" strokeWidth={2.25} />
                  <span>View</span>
                </button>
              </HoverTip>
              <HoverTip
                label="Choose one music affiliate - then lands on Orders"
                placement="top"
              >
                <button
                  type="button"
                  disabled={isViewOnly}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    if (isViewOnly) return;
                    setAffiliateFlagMode("resolve");
                    setAffiliateFlagRecord(rec);
                  }}
                  className={
                    isViewOnly
                      ? ordersMailTextButtonDisabledClass
                      : actionButtonClass(false)
                  }
                  aria-label="Resolve affiliate"
                >
                  <Flag className="mr-0.5 inline h-3 w-3" strokeWidth={2.25} />
                  Resolve
                </button>
              </HoverTip>
            </div>
          );
        },
      },
    ];

    return baseCols;
  }, [
    allOrders,
    orderById,
    isViewOnly,
    contactHeader,
    programHeader,
    form,
    cheerSubtype,
    showMusicAffiliate,
    showFormProducer,
    producers,
  ]);

  const totalFlagged = boardCounts.flagged || flaggedRecords.length;
  const backToOrdersHref = useMemo(() => ordersReturnHref(), []);

  return (
    <OrdersLookupProvider orders={boardOrders}>
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Flagged orders"
        badge={
          totalFlagged > 0
            ? `${filtered.length} of ${totalFlagged}`
            : undefined
        }
        subtitle="Resolve an affiliate to move the order to the Orders tab"
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: `${contactHeader}, program…`,
        }}
        headerActions={
          <Link
            href={backToOrdersHref}
            prefetch
            onMouseEnter={() => warmOrdersReturnBoard()}
            onPointerDown={() => warmOrdersReturnBoard()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-brand-line/60 bg-white px-3 text-[12px] font-medium text-brand-ink-secondary shadow-sm transition hover:border-brand-line hover:bg-brand-bg hover:text-brand-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
            Back to Orders
          </Link>
        }
        toolbar={
          <div className="space-y-2.5">
            <OrderFormTabs
              form={form}
              onFormChange={switchForm}
              formCounts={formCounts}
              tabs={AFFILIATE_FLAG_FORM_TABS}
            />
            <OrderFormSubtypeTabs
              form={form}
              cheerSubtype={cheerSubtype}
              danceSubtype={danceSubtype}
              onCheerSubtypeChange={setCheerSubtype}
              onDanceSubtypeChange={setDanceSubtype}
              cheerCounts={cheerSubtypeCounts}
              danceCounts={danceSubtypeCounts}
              cheerTabs={AFFILIATE_FLAG_CHEER_SUBTABS}
            />
          </div>
        }
      />

      <div className="min-h-0 flex-1 overflow-auto px-2 pb-6 pt-5 lg:px-3">
        <div className="dashboard-panel dashboard-panel-framed overflow-hidden">
          <DataTable
            key={`${form}-${cheerSubtype}-${danceSubtype}`}
            columns={columns}
            data={filtered}
            rowKey={(rec) => {
              const linked = findLinkedOrder(rec, allOrders);
              return linked?.id || rec.orderId || rec.id;
            }}
            emptyMessage="Nothing to resolve."
            loading={boardLoading && filtered.length === 0}
            pageSize={15}
            totalCount={boardCounts.flagged}
            hasMore={Boolean(nextPageToken)}
            onLoadMore={loadMore}
            loadingMore={boardLoadingMore}
            resetKey={`${form}-${cheerSubtype}-${danceSubtype}-${searchQuery}`}
            embedded
            showScrollIndicator
          />
        </div>
      </div>

      <ResolveAffiliateFlagModal
        open={Boolean(affiliateFlagRecord)}
        record={affiliateFlagRecord}
        allOrders={allOrders}
        mode={affiliateFlagMode}
        onClose={() => setAffiliateFlagRecord(null)}
      />

      <FlaggedOrderViewModal
        open={Boolean(viewRecord)}
        record={viewRecord}
        allOrders={allOrders}
        onClose={() => setViewRecord(null)}
        onResolve={
          isViewOnly
            ? undefined
            : (rec) => {
                setAffiliateFlagMode("resolve");
                setAffiliateFlagRecord(rec);
              }
        }
      />
    </div>
    </OrdersLookupProvider>
  );
}
