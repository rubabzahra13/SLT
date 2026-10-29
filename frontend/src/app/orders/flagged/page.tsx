"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Flag, Mail } from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "@/components/layout/PageHeader";
import { TruncatedText } from "@/components/ui/TruncatedText";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { HoverTip } from "@/components/ui/HoverTip";
import { FlaggedOrderViewModal } from "@/components/orders/FlaggedOrderViewModal";
import { OrderFormTabs } from "@/components/orders/OrderFormTabs";
import { OrderFormSubtypeTabs } from "@/components/orders/OrderFormSubtypeTabs";
import { OrderRequirementsCell } from "@/components/orders/OrderRequirementsCell";
import { OrderDataStatusBadge } from "@/components/orders/OrderStatusDropdown";
import { ResolveAffiliateFlagModal } from "@/components/orders/ResolveAffiliateFlagModal";
import {
  magentoPackageBoardLabel,
  packageTypeDisplayValue,
} from "@/components/mtd/PackageTypeField";
import { useAppState } from "@/context/AppStateContext";
import {
  getAffiliateSelections,
  isDanceFormOrder,
  isInvalidMultiAffiliateSelection,
  recordHeldOnAffiliateFlag,
} from "@/lib/affiliate-flag";
import { formatDanceMusicAffiliates } from "@/lib/dance-music-affiliate";
import { formatPrice, titleCase } from "@/lib/data";
import { formatDisplayDateTime } from "@/lib/dates";
import {
  findLinkedOrder,
  formHasRequestedProducer,
  formatRequestedEditorLabel,
} from "@/lib/editor-assignment";
import {
  countMTDByCheerSubtype,
  countMTDByDanceSubtype,
  countMTDByForm,
  matchesFormFilter,
  resolveMTDFormMeta,
} from "@/lib/mtd-filters";
import { resolveOrderPackageDisplayPrice } from "@/lib/order-package-price";
import { parsePackage } from "@/lib/package";
import { listPreMtdOrderRecords } from "@/lib/order-staging";
import {
  getContactColumnHeader,
  getOrderContactPersonName,
  getOrderIdentityName,
  getProgramColumnHeader,
} from "@/lib/order-detail-sections";
import { orderFromMTDRecord } from "@/lib/order-detail-fields";
import type {
  CheerFormSubtypeFilter,
  DanceFormSubtypeFilter,
  MTDRecord,
  Order,
  OrderFormType,
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
  const {
    mtdRecords,
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
  const [affiliateFlagRecord, setAffiliateFlagRecord] =
    useState<MTDRecord | null>(null);
  const [affiliateFlagMode, setAffiliateFlagMode] = useState<"resolve" | "email">(
    "resolve"
  );
  const [viewRecord, setViewRecord] = useState<MTDRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const orderById = useMemo(() => {
    const map = new Map<string, Order>();
    for (const order of allOrders) {
      map.set(order.id, order);
      if (order.legacyId) map.set(order.legacyId, order);
      if (order.uuid) map.set(order.uuid, order);
    }
    return map;
  }, [allOrders]);

  const flaggedRecords = useMemo(() => {
    const preMtd = listPreMtdOrderRecords(activeOrders, mtdRecords);
    return preMtd.filter((rec) => recordHeldOnAffiliateFlag(rec, orderById));
  }, [activeOrders, mtdRecords, orderById]);

  const formCounts = useMemo(
    () => countMTDByForm(flaggedRecords, orderById),
    [flaggedRecords, orderById]
  );

  const cheerSubtypeCounts = useMemo(
    () =>
      countMTDByCheerSubtype(
        flaggedRecords.filter((rec) =>
          matchesFormFilter(
            rec,
            orderById,
            "school-all-star-cheer",
            "all",
            danceSubtype
          )
        ),
        orderById
      ),
    [flaggedRecords, orderById, danceSubtype]
  );

  const danceSubtypeCounts = useMemo(
    () =>
      countMTDByDanceSubtype(
        flaggedRecords.filter((rec) =>
          matchesFormFilter(
            rec,
            orderById,
            "school-all-star-dance",
            cheerSubtype,
            "all"
          )
        ),
        orderById
      ),
    [flaggedRecords, orderById, cheerSubtype]
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
          const name = titleCase(
            getOrderContactPersonName(
              linked || orderFromMTDRecord(rec),
              rec.contactName,
              rec.programName
            )
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
        width: "100px",
        align: "center",
        nowrap: false,
        cellClassName: clsx(compactCellClass, "max-w-[100px]"),
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
                const fromOrder = (linked?.timeLengthOfMix || "").trim();
                const fromPackage = parsePackage(
                  packageTypeDisplayValue(rec.package)
                    ? rec.package
                    : linked?.package || ""
                ).limit;
                let limit =
                  fromOrder ||
                  (fromPackage && fromPackage !== "-" ? fromPackage : "");
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
                const selections = getAffiliateSelections(linked ?? null, rec);
                const affiliate =
                  linked?.musicAffiliate ??
                  (rec as MTDRecord & { musicAffiliate?: string }).musicAffiliate;
                if (!affiliate && selections.length === 0) {
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
                const danceOrder =
                  isDanceFormOrder(linked) || isDanceFormOrder(rec);
                const display =
                  selections.length >= 2
                    ? danceOrder
                      ? formatDanceMusicAffiliates(selections)
                      : selections.join(" · ")
                    : titleCase(affiliate || selections[0] || "");
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
        key: "packagePrice",
        header: "Package Price",
        width: "110px",
        align: "center",
        nowrap: false,
        cellClassName: "!px-2",
        headerClassName: "!px-2",
        render: (rec) => {
          const order = findLinkedOrder(rec, allOrders);
          const meta = resolveMTDFormMeta(rec, orderById);
          const displayPrice = resolveOrderPackageDisplayPrice(
            rec,
            order,
            meta,
            orderById
          );
          return (
            <span
              className={clsx(
                "mx-auto block text-center font-semibold tabular-nums",
                compactTextClass,
                displayPrice <= 0 && "text-brand-ink-tertiary"
              )}
            >
              {displayPrice > 0 ? formatPrice(displayPrice) : "-"}
            </span>
          );
        },
      },
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
                label="Choose one music affiliate: then lands on Orders"
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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Flagged orders"
        badge={
          flaggedRecords.length > 0
            ? `${filtered.length} of ${flaggedRecords.length}`
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
            href="/orders"
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
            />
            <OrderFormSubtypeTabs
              form={form}
              cheerSubtype={cheerSubtype}
              danceSubtype={danceSubtype}
              onCheerSubtypeChange={setCheerSubtype}
              onDanceSubtypeChange={setDanceSubtype}
              cheerCounts={cheerSubtypeCounts}
              danceCounts={danceSubtypeCounts}
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
            emptyMessage={
              isLoading ? "Loading flagged orders…" : "Nothing to resolve."
            }
            pageSize={15}
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
  );
}
