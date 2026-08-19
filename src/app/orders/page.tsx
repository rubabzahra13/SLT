"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPill } from "@/components/ui/FilterPill";
import { DataTable } from "@/components/ui/DataTable";
import { OrderSegmentTabs } from "@/components/orders/OrderSegment";
import { OrderFormFilters } from "@/components/orders/OrderFormFilters";
import { AddPastOrderModal } from "@/components/orders/AddPastOrderModal";
import { getOrderColumns } from "@/components/orders/order-columns";
import { useAppState } from "@/context/AppStateContext";
import type {
  CheerFormSubtype,
  DanceFormSubtype,
  Order,
  OrderFormType,
  OrderTab,
} from "@/types";
import { CHEER_FORM_SUBTABS, DANCE_FORM_SUBTABS, ORDER_FORM_TABS } from "@/types";

const activeFilters = ["All", "New", "Active", "Needs Attention", "In MTD"];
const pastCategoryFilters = ["All", "Cheer", "Dance", "Marching Band"];

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";
const DEFAULT_CHEER_SUBTYPE: CheerFormSubtype = "all-star-cheer";
const DEFAULT_DANCE_SUBTYPE: DanceFormSubtype = "pom";

type FormFilters = {
  cheerSubtype: CheerFormSubtype;
  danceSubtype: DanceFormSubtype;
};

function parseFormParam(value: string | null): OrderFormType {
  if (value && ORDER_FORM_TABS.some((tab) => tab.id === value)) {
    return value as OrderFormType;
  }
  return DEFAULT_FORM;
}

function parseCheerSubtypeParam(value: string | null): CheerFormSubtype {
  if (value && CHEER_FORM_SUBTABS.some((tab) => tab.id === value)) {
    return value as CheerFormSubtype;
  }
  return DEFAULT_CHEER_SUBTYPE;
}

function parseDanceSubtypeParam(value: string | null): DanceFormSubtype {
  if (value && DANCE_FORM_SUBTABS.some((tab) => tab.id === value)) {
    return value as DanceFormSubtype;
  }
  return DEFAULT_DANCE_SUBTYPE;
}

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const formParam = searchParams.get("form");
  const cheerFormParam = searchParams.get("cheerForm");
  const danceFormParam = searchParams.get("danceForm");
  const initialTab: OrderTab =
    tabParam === "past" ? "past" : tabParam === "all" ? "all" : "active";

  const {
    activeOrders,
    pastOrders,
    allOrders,
    addPastOrder,
  } = useAppState();

  const [tab, setTab] = useState<OrderTab>(initialTab);
  const [form, setForm] = useState<OrderFormType>(() => parseFormParam(formParam));
  const [cheerSubtype, setCheerSubtype] = useState<CheerFormSubtype>(() =>
    parseCheerSubtypeParam(cheerFormParam)
  );
  const [danceSubtype, setDanceSubtype] = useState<DanceFormSubtype>(() =>
    parseDanceSubtypeParam(danceFormParam)
  );
  const [activeFilter, setActiveFilter] = useState("All");
  const [pastCategory, setPastCategory] = useState("All");
  const [pastProducer, setPastProducer] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);

  const updateUrl = useCallback(
    (nextTab: OrderTab, nextForm: OrderFormType, filters: FormFilters) => {
      const params = new URLSearchParams();
      if (nextTab !== "active") params.set("tab", nextTab);
      if (nextForm !== DEFAULT_FORM) params.set("form", nextForm);
      if (
        nextForm === "school-all-star-cheer" &&
        filters.cheerSubtype !== DEFAULT_CHEER_SUBTYPE
      ) {
        params.set("cheerForm", filters.cheerSubtype);
      }
      if (
        nextForm === "school-all-star-dance" &&
        filters.danceSubtype !== DEFAULT_DANCE_SUBTYPE
      ) {
        params.set("danceForm", filters.danceSubtype);
      }
      const query = params.toString();
      router.replace(query ? `/orders?${query}` : "/orders", { scroll: false });
    },
    [router]
  );

  const switchTab = useCallback(
    (next: OrderTab) => {
      setTab(next);
      updateUrl(next, form, { cheerSubtype, danceSubtype });
    },
    [cheerSubtype, danceSubtype, form, updateUrl]
  );

  const switchForm = useCallback(
    (next: OrderFormType) => {
      setForm(next);
      const filters = {
        cheerSubtype:
          next === "school-all-star-cheer" ? cheerSubtype : DEFAULT_CHEER_SUBTYPE,
        danceSubtype:
          next === "school-all-star-dance" ? danceSubtype : DEFAULT_DANCE_SUBTYPE,
      };
      if (next !== "school-all-star-cheer") setCheerSubtype(DEFAULT_CHEER_SUBTYPE);
      if (next !== "school-all-star-dance") setDanceSubtype(DEFAULT_DANCE_SUBTYPE);
      updateUrl(tab, next, filters);
    },
    [cheerSubtype, danceSubtype, tab, updateUrl]
  );

  const switchCheerSubtype = useCallback(
    (next: CheerFormSubtype) => {
      setCheerSubtype(next);
      updateUrl(tab, form, { cheerSubtype: next, danceSubtype });
    },
    [danceSubtype, form, tab, updateUrl]
  );

  const switchDanceSubtype = useCallback(
    (next: DanceFormSubtype) => {
      setDanceSubtype(next);
      updateUrl(tab, form, { cheerSubtype, danceSubtype: next });
    },
    [cheerSubtype, form, tab, updateUrl]
  );

  const columns = getOrderColumns({
    mode: tab,
    formType: form,
    cheerFormSubtype: form === "school-all-star-cheer" ? cheerSubtype : undefined,
    danceFormSubtype: form === "school-all-star-dance" ? danceSubtype : undefined,
  });

  const matchesForm = useCallback(
    (order: Order) => {
      if (order.formType !== form) return false;
      if (form === "school-all-star-cheer") {
        return (order.cheerFormSubtype || DEFAULT_CHEER_SUBTYPE) === cheerSubtype;
      }
      if (form === "school-all-star-dance") {
        return (order.danceFormSubtype || DEFAULT_DANCE_SUBTYPE) === danceSubtype;
      }
      return true;
    },
    [cheerSubtype, danceSubtype, form]
  );

  const byForm = useCallback(
    (orders: Order[]) => orders.filter(matchesForm),
    [matchesForm]
  );

  const filteredActive = useMemo(() => {
    return byForm(activeOrders).filter((order) => {
      if (activeFilter === "All") return order.status !== "completed";
      if (activeFilter === "New") return order.status === "new";
      if (activeFilter === "Active") return order.status === "active";
      if (activeFilter === "Needs Attention") return order.needsAttention;
      if (activeFilter === "In MTD") return order.status === "in_mtd";
      return true;
    });
  }, [activeOrders, activeFilter, byForm]);

  const filteredPast = useMemo(() => {
    return byForm(pastOrders).filter((order) => {
      if (pastCategory !== "All" && order.category !== pastCategory) return false;
      if (pastProducer !== "All") {
        const prod = order.assignedProducer || order.requestedProducer;
        if (prod !== pastProducer) return false;
      }
      return true;
    });
  }, [pastOrders, pastCategory, pastProducer, byForm]);

  const formCounts = useMemo(() => {
    const source =
      tab === "active" ? activeOrders : tab === "past" ? pastOrders : allOrders;
    const counts = Object.fromEntries(
      ORDER_FORM_TABS.map(({ id }) => [id, 0])
    ) as Record<OrderFormType, number>;
    for (const order of source) {
      if (order.formType && counts[order.formType] !== undefined) {
        counts[order.formType] += 1;
      }
    }
    return counts;
  }, [activeOrders, allOrders, pastOrders, tab]);

  const cheerSubtypeCounts = useMemo(() => {
    const source =
      tab === "active" ? activeOrders : tab === "past" ? pastOrders : allOrders;
    const counts = Object.fromEntries(
      CHEER_FORM_SUBTABS.map(({ id }) => [id, 0])
    ) as Record<CheerFormSubtype, number>;
    for (const order of source) {
      if (order.formType !== "school-all-star-cheer") continue;
      const key = order.cheerFormSubtype || DEFAULT_CHEER_SUBTYPE;
      if (counts[key] !== undefined) counts[key] += 1;
    }
    return counts;
  }, [activeOrders, allOrders, pastOrders, tab]);

  const danceSubtypeCounts = useMemo(() => {
    const source =
      tab === "active" ? activeOrders : tab === "past" ? pastOrders : allOrders;
    const counts = Object.fromEntries(
      DANCE_FORM_SUBTABS.map(({ id }) => [id, 0])
    ) as Record<DanceFormSubtype, number>;
    for (const order of source) {
      if (order.formType !== "school-all-star-dance") continue;
      const key = order.danceFormSubtype || DEFAULT_DANCE_SUBTYPE;
      if (counts[key] !== undefined) counts[key] += 1;
    }
    return counts;
  }, [activeOrders, allOrders, pastOrders, tab]);

  const tableData =
    tab === "active"
      ? filteredActive
      : tab === "all"
        ? byForm(allOrders)
        : filteredPast;

  const showActiveFilters = tab === "active";
  const showPastFilters = tab === "past";

  return (
    <>
      <PageHeader
        title="Orders"
        action={
          tab === "past"
            ? { label: "Add Past Order", onClick: () => setModalOpen(true) }
            : { label: "New Order" }
        }
        tabs={
          <OrderSegmentTabs
            tab={tab}
            onChange={switchTab}
            activeCount={activeOrders.length}
            allCount={allOrders.length}
            pastCount={pastOrders.length}
          />
        }
      />

      <div className="px-6 py-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-brand-line bg-brand-surface shadow-[var(--shadow-premium-sm)]">
          <OrderFormFilters
            form={form}
            cheerSubtype={cheerSubtype}
            danceSubtype={danceSubtype}
            onFormChange={switchForm}
            onCheerSubtypeChange={switchCheerSubtype}
            onDanceSubtypeChange={switchDanceSubtype}
            formCounts={formCounts}
            cheerCounts={cheerSubtypeCounts}
            danceCounts={danceSubtypeCounts}
          />

          {(showActiveFilters || showPastFilters || tab === "all") && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-line bg-brand-bg/30 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-0.5">
                {showActiveFilters
                  ? activeFilters.map((filter) => (
                      <FilterPill
                        key={filter}
                        label={filter}
                        active={activeFilter === filter}
                        onClick={() => setActiveFilter(filter)}
                      />
                    ))
                  : null}
                {showPastFilters
                  ? pastCategoryFilters.map((filter) => (
                      <FilterPill
                        key={filter}
                        label={filter}
                        active={pastCategory === filter}
                        onClick={() => setPastCategory(filter)}
                      />
                    ))
                  : null}
              </div>
              <p className="text-[11px] font-medium tabular-nums text-brand-ink-tertiary">
                {tableData.length} {tableData.length === 1 ? "order" : "orders"}
              </p>
            </div>
          )}

          <DataTable
            key={`${tab}-${form}-${cheerSubtype}-${danceSubtype}-${activeFilter}-${pastCategory}-${pastProducer}`}
            columns={columns}
            data={tableData}
            rowKey={(order) => order.id}
            href={
              tab === "all"
                ? undefined
                : (order) =>
                    `/orders/${order.id}${tab === "past" ? "?from=past" : ""}`
            }
            emptyMessage="No orders match this filter."
            variant={tab === "past" ? "muted" : "default"}
            pageSize={8}
            embedded
          />
        </div>
      </div>

      <AddPastOrderModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={(order) => {
          addPastOrder(order);
          switchTab("past");
        }}
        producers={["CASEY", "MATT", "NATE", "ANNE", "STEVE"]}
      />
    </>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-[13px] text-brand-ink-secondary">Loading orders...</div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}
