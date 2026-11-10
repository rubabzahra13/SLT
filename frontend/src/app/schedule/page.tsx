"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { SchedulePageToolbar } from "@/components/schedule/SchedulePageToolbar";
import { ScheduleSendPanel } from "@/components/schedule/ScheduleSendPanel";
import { ScheduleSendToolbar } from "@/components/schedule/ScheduleSendToolbar";
import { Tabs } from "@/components/ui/Tabs";
import { TeamScheduleMatrix } from "@/components/schedule/TeamScheduleMatrix";
import { TeamScheduleTodayView } from "@/components/schedule/TeamScheduleTodayView";
import { useAppState } from "@/context/AppStateContext";
import {
  fetchDashboardPulseApi,
  isDashboardPulseFresh,
  readDashboardPulseCache,
  type DashboardPulseApi,
} from "@/lib/api/dashboard";
import { openBookingsToStubMtd } from "@/lib/dashboard-pulse-charts";
import { todayIso } from "@/lib/date-filters";
import { doDateRangesOverlap } from "@/lib/dates";
import { isEligibleProducerScheduleRecord } from "@/lib/export-csv";
import { findProducerByAssignmentKey } from "@/lib/editor-assignment";
import { useOpenAssignedBookings } from "@/hooks/useOpenAssignedBookings";
import { collectOrdersBoardCachedOrders } from "@/lib/orders-board-cache";
import { collectOpenAssignedMixRecords } from "@/lib/producer-assigned-mixes";
import {
  aggregateColumns,
  buildScheduleColumnAggregates,
  buildTeamSchedule,
  filterTeamScheduleByStatus,
  scheduleSendFilterPeriod,
  sendPeriodLabel,
  statusLabel,
  type ScheduleSendPeriod,
  type ScheduleStatusFilter,
  type ScheduleViewRange,
} from "@/lib/schedule-view";
import {
  countProducersByCheerSubtype,
  countProducersByDanceSubtype,
  countProducersByForm,
  producerMatchesScheduleFormFilter,
  scheduleFormFilterLabel,
} from "@/lib/schedule-filters";
import {
  DEFAULT_CHEER_SUBTYPE,
  DEFAULT_DANCE_SUBTYPE,
  type MTDSortBy,
} from "@/lib/mtd-filters";
import type {
  CheerFormSubtypeFilter,
  DanceFormSubtypeFilter,
  Order,
  OrderFormType,
} from "@/types";

function orderHasScheduleAssignment(order: Order): boolean {
  return Boolean(
    order.assignedProducer?.trim() &&
      order.mixStartDate?.trim() &&
      order.mixEndDate?.trim()
  );
}

function mergeOrdersForSchedule(...lists: Order[][]): Order[] {
  const byId = new Map<string, Order>();
  for (const list of lists) {
    for (const order of list) {
      if (!order?.id) continue;
      const prev = byId.get(order.id);
      if (
        !prev ||
        (!orderHasScheduleAssignment(prev) && orderHasScheduleAssignment(order))
      ) {
        byId.set(order.id, order);
      }
    }
  }
  return [...byId.values()];
}

function bookingSpanKey(r: {
  assignedProducer?: string | null;
  mixStartDate?: string | null;
  mixEndDate?: string | null;
}): string {
  return `${(r.assignedProducer || "").trim().toUpperCase()}|${r.mixStartDate || ""}|${r.mixEndDate || ""}`;
}

/** Prefer concrete Orders/MTD rows; fill gaps from slim pulse stubs. */
function mergeScheduleBookings<T extends { assignedProducer?: string | null; mixStartDate?: string | null; mixEndDate?: string | null }>(
  primary: T[],
  pulseFill: T[]
): T[] {
  if (pulseFill.length === 0) return primary;
  if (primary.length === 0) return pulseFill;
  const seen = new Set(primary.map(bookingSpanKey));
  const extras = pulseFill.filter((r) => {
    const key = bookingSpanKey(r);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...primary, ...extras];
}

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";

type SchedulePageTab = "view" | "send";

function SchedulePageContent() {
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view") || searchParams.get("range");

  const {
    producers,
    schedule,
    mtdRecords,
    allOrders,
    activeOrders,
    ensureLiveMtdLoaded,
  } = useAppState();

  const [pageTab, setPageTab] = useState<SchedulePageTab>("view");
  const [selectedEditor, setSelectedEditor] = useState("all");
  const [selectedSendEditor, setSelectedSendEditor] = useState("all");
  const [pulse, setPulse] = useState<DashboardPulseApi | null>(
    () => readDashboardPulseCache()
  );
  // Send Schedule needs real Assigned Orders + live MTD (program/invoice).
  // View Schedule stays on pulse stubs for egress.
  const {
    bookingRecords: sendHydratedBookings,
    conflictOrders: sendAssignedOrders,
  } = useOpenAssignedBookings(pageTab === "send", { alwaysFetch: true });

  // View Schedule: slim pulse open_bookings (same as Dashboard capacity) —
  // never pull full GET /api/mtd?scope=live on every Schedule visit.
  useEffect(() => {
    if (pageTab !== "view") return;
    const cached = readDashboardPulseCache();
    if (cached) setPulse(cached);
    if (isDashboardPulseFresh()) return;
    let cancelled = false;
    void fetchDashboardPulseApi()
      .then((next) => {
        if (!cancelled) setPulse(next);
      })
      .catch(() => {
        /* paint producers + any cached pulse */
      });
    return () => {
      cancelled = true;
    };
  }, [pageTab]);

  // Send Schedule needs program/invoice detail — hydrate live MTD once then.
  useEffect(() => {
    if (pageTab !== "send") return;
    void ensureLiveMtdLoaded().catch(() => {
      /* keep pulse / SWR */
    });
  }, [pageTab, ensureLiveMtdLoaded]);

  const [view, setView] = useState<ScheduleViewRange>(() => {
    if (viewParam === "today") return "today";
    return "week";
  });
  const [sendView, setSendView] = useState<ScheduleSendPeriod>("complete");
  const [sendSortBy, setSendSortBy] = useState<MTDSortBy>("newest");

  useEffect(() => {
    if (viewParam === "today") {
      setView("today");
    }
  }, [viewParam]);

  const [form, setForm] = useState<OrderFormType>(DEFAULT_FORM);
  const [cheerSubtype, setCheerSubtype] = useState<CheerFormSubtypeFilter>(
    DEFAULT_CHEER_SUBTYPE
  );
  const [danceSubtype, setDanceSubtype] = useState<DanceFormSubtypeFilter>(
    DEFAULT_DANCE_SUBTYPE
  );
  const [statusFilter, setStatusFilter] = useState<ScheduleStatusFilter>("all");
  const switchForm = useCallback((next: OrderFormType) => {
    setForm(next);
    if (next !== "school-all-star-cheer") {
      setCheerSubtype(DEFAULT_CHEER_SUBTYPE);
    }
    if (next !== "school-all-star-dance") {
      setDanceSubtype(DEFAULT_DANCE_SUBTYPE);
    }
  }, []);

  const formCounts = useMemo(() => countProducersByForm(producers), [producers]);
  const cheerSubtypeCounts = useMemo(
    () => countProducersByCheerSubtype(producers),
    [producers]
  );
  const danceSubtypeCounts = useMemo(
    () => countProducersByDanceSubtype(producers),
    [producers]
  );

  const categoryFilteredProducers = useMemo(
    () =>
      producers.filter((producer) =>
        producerMatchesScheduleFormFilter(producer, form, cheerSubtype, danceSubtype)
      ),
    [producers, form, cheerSubtype, danceSubtype]
  );

  useEffect(() => {
    if (selectedEditor === "all") return;
    const stillValid = producers.some(
      (producer) =>
        producer.id === selectedEditor ||
        producer.name.toUpperCase() === selectedEditor.toUpperCase()
    );
    if (!stillValid) setSelectedEditor("all");
  }, [producers, selectedEditor]);

  const viewFilteredProducers = useMemo(() => {
    // Board rows stay form-scoped; producer dropdown can pick anyone.
    const base = categoryFilteredProducers;
    if (selectedEditor === "all") return base;
    const selected = producers.filter(
      (producer) =>
        producer.id === selectedEditor ||
        producer.name.toUpperCase() === selectedEditor.toUpperCase()
    );
    return selected.length > 0 ? selected : base;
  }, [categoryFilteredProducers, producers, selectedEditor]);

  const currentDate = useMemo(() => new Date(), []);
  const anchorDate = useMemo(
    () => currentDate,
    [currentDate]
  );

  // Orders-tab Assigned + MTD mixes. View uses pulse (both sources) + any
  // in-memory board/MTD rows — no full live-MTD hydrate. Send uses hydrate.
  const scheduleBookings = useMemo(() => {
    const orders = mergeOrdersForSchedule(
      activeOrders,
      allOrders,
      collectOrdersBoardCachedOrders()
    );
    const fromMemory = collectOpenAssignedMixRecords(orders, mtdRecords);
    if (pageTab === "send") {
      return mergeScheduleBookings(fromMemory, sendHydratedBookings);
    }
    const pulseStubs = openBookingsToStubMtd(pulse?.open_bookings);
    return mergeScheduleBookings(fromMemory, pulseStubs);
  }, [
    pageTab,
    activeOrders,
    allOrders,
    mtdRecords,
    pulse?.open_bookings,
    sendHydratedBookings,
  ]);

  const teamRows = useMemo(
    () =>
      filterTeamScheduleByStatus(
        buildTeamSchedule(
          viewFilteredProducers,
          schedule,
          view,
          anchorDate,
          scheduleBookings,
        ),
        statusFilter,
        view
      ),
    [
      viewFilteredProducers,
      schedule,
      view,
      anchorDate,
      scheduleBookings,
      statusFilter,
    ]
  );

  const emptyMessage = useMemo(() => {
    if (selectedEditor !== "all") {
      const match = producers.find(
        (producer) =>
          producer.id === selectedEditor ||
          producer.name.toUpperCase() === selectedEditor.toUpperCase()
      );
      const name = match?.name ?? selectedEditor;
      return `No schedule rows for ${name} in this view.`;
    }
    if (statusFilter !== "all") {
      return `No producers marked ${statusLabel(statusFilter).toLowerCase()} in this view.`;
    }
    const label = scheduleFormFilterLabel(form, cheerSubtype, danceSubtype);
    return `No producers specialize in ${label}.`;
  }, [form, cheerSubtype, danceSubtype, statusFilter, selectedEditor, producers]);

  const columns = useMemo(
    () => aggregateColumns(teamRows, anchorDate),
    [teamRows, anchorDate]
  );

  const columnAggregates = useMemo(
    () => buildScheduleColumnAggregates(view, anchorDate),
    [view, anchorDate]
  );

  const offToday = useMemo(() => {
    const todayKey = todayIso();
    let count = 0;
    for (const r of teamRows) {
      const cell = r.cells.find((c) => c.key === todayKey);
      if (cell && cell.status === "off") count += 1;
    }
    return count;
  }, [teamRows]);

  const sendFilterPeriod = useMemo(
    () => scheduleSendFilterPeriod(sendView, anchorDate),
    [sendView, anchorDate]
  );

  // Send: every assigned mix in period (any category / subtype).
  const sendProducerNames = useMemo(() => {
    const eligibleRecords = scheduleBookings.filter((rec) =>
      isEligibleProducerScheduleRecord(rec)
    );
    const set = new Set<string>();
    for (const r of eligibleRecords) {
      if (!r.assignedProducer) continue;
      if (sendFilterPeriod) {
        const recStart = r.mixStartDate || r.completedAt || "";
        const recEnd = r.mixEndDate || r.mixStartDate || r.completedAt || "";
        if (
          !doDateRangesOverlap(
            { start: recStart, end: recEnd },
            sendFilterPeriod
          )
        ) {
          continue;
        }
      }
      const prodObj = findProducerByAssignmentKey(r.assignedProducer, producers);
      const name = prodObj?.name || r.assignedProducer;
      if (name) set.add(name);
    }
    return Array.from(set).sort();
  }, [scheduleBookings, producers, sendFilterPeriod]);

  const sendOrders = useMemo(
    () =>
      mergeOrdersForSchedule(
        allOrders,
        activeOrders,
        sendAssignedOrders,
        collectOrdersBoardCachedOrders()
      ),
    [allOrders, activeOrders, sendAssignedOrders]
  );

  useEffect(() => {
    if (selectedSendEditor === "all") return;
    const stillValid = producers.some(
      (producer) =>
        producer.name === selectedSendEditor ||
        producer.id === selectedSendEditor ||
        producer.name.toUpperCase() === selectedSendEditor.toUpperCase()
    );
    if (!stillValid) setSelectedSendEditor("all");
  }, [producers, selectedSendEditor]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        compact
        title="Producer Schedule"
        subtitle={
          pageTab === "view"
            ? "Team availability, bookings, and available capacity"
            : "Filter producers, preview schedules, and download to send"
        }
        tabs={
          <Tabs
            accent="orange"
            value={pageTab}
            onChange={(value) => setPageTab(value as SchedulePageTab)}
            options={[
              { value: "view", label: "View Schedule" },
              {
                value: "send",
                label: "Send Schedule",
                count: sendProducerNames.length || undefined,
              },
            ]}
          />
        }
        toolbar={
          pageTab === "view" ? (
            <SchedulePageToolbar
              form={form}
              cheerSubtype={cheerSubtype}
              danceSubtype={danceSubtype}
              formCounts={formCounts}
              cheerCounts={cheerSubtypeCounts}
              danceCounts={danceSubtypeCounts}
              view={view}
              statusFilter={statusFilter}
              offToday={offToday}
              totalProducers={teamRows.length}
              producers={producers}
              selectedEditor={selectedEditor}
              onEditorChange={setSelectedEditor}
              onFormChange={switchForm}
              onCheerSubtypeChange={setCheerSubtype}
              onDanceSubtypeChange={setDanceSubtype}
              onViewChange={setView}
              onStatusFilterChange={setStatusFilter}
            />
          ) : (
            <ScheduleSendToolbar
              producers={producers}
              selectedSendEditor={selectedSendEditor}
              onSelectedSendEditorChange={setSelectedSendEditor}
              sendView={sendView}
              onSendViewChange={setSendView}
              sortBy={sendSortBy}
              onSortByChange={setSendSortBy}
            />
          )
        }
      />

      <div className="min-h-0 flex-1 overflow-auto px-2 pb-6 pt-5 lg:px-3">
        {pageTab === "view" ? (
          view === "today" ? (
            <TeamScheduleTodayView
              rows={teamRows}
              date={anchorDate}
              emptyMessage={emptyMessage}
              className="w-full"
            />
          ) : (
            <TeamScheduleMatrix
              rows={teamRows}
              columns={columns}
              range={view}
              statusFilter={statusFilter}
              emptyMessage={emptyMessage}
              className="w-full"
            />
          )
        ) : (
          <ScheduleSendPanel
            producerNames={sendProducerNames}
            categoryProducers={producers}
            selectedSendEditor={selectedSendEditor}
            mtdRecords={mtdRecords}
            allOrders={sendOrders}
            producers={producers}
            filterPeriod={sendFilterPeriod}
            sendView={sendView}
            sortBy={sendSortBy}
          />
        )}
      </div>

    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={null}>
      <SchedulePageContent />
    </Suspense>
  );
}
