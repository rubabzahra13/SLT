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
import { ProducerScheduleDrawer } from "@/components/schedule/ProducerScheduleDrawer";
import { useAppState } from "@/context/AppStateContext";
import { todayIso } from "@/lib/date-filters";
import { isEligibleProducerScheduleRecord } from "@/lib/export-csv";
import { findProducerByAssignmentKey } from "@/lib/editor-assignment";
import {
  aggregateColumns,
  buildScheduleColumnAggregates,
  buildTeamSchedule,
  filterTeamScheduleByStatus,
  statusLabel,
  type ScheduleCell,
  type ScheduleStatusFilter,
  type ScheduleViewRange,
  type TeamScheduleRow,
} from "@/lib/schedule-view";
import {
  countProducersByCheerSubtype,
  countProducersByDanceSubtype,
  countProducersByForm,
  producerMatchesScheduleFormFilter,
  scheduleFormFilterLabel,
} from "@/lib/schedule-filters";
import { DEFAULT_CHEER_SUBTYPE, DEFAULT_DANCE_SUBTYPE } from "@/lib/mtd-filters";
import type {
  CheerFormSubtypeFilter,
  DanceFormSubtypeFilter,
  OrderFormType,
} from "@/types";

const DEFAULT_FORM: OrderFormType = "school-all-star-cheer";

type SchedulePageTab = "view" | "send";

function SchedulePageContent() {
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view") || searchParams.get("range");

  const { producers, schedule, mtdRecords, allOrders } = useAppState();
  const [pageTab, setPageTab] = useState<SchedulePageTab>("view");
  const [selectedEditor, setSelectedEditor] = useState("all");
  const [selectedSendEditor, setSelectedSendEditor] = useState("all");

  const [view, setView] = useState<ScheduleViewRange>(() => {
    if (viewParam === "today") return "today";
    return "week";
  });

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
  const [drawerRow, setDrawerRow] = useState<TeamScheduleRow | null>(null);
  const [focusCell, setFocusCell] = useState<ScheduleCell | null>(null);
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
    const stillValid = categoryFilteredProducers.some(
      (producer) =>
        producer.id === selectedEditor ||
        producer.name.toUpperCase() === selectedEditor.toUpperCase()
    );
    if (!stillValid) setSelectedEditor("all");
  }, [categoryFilteredProducers, selectedEditor]);

  const viewFilteredProducers = useMemo(() => {
    if (selectedEditor === "all") return categoryFilteredProducers;
    return categoryFilteredProducers.filter(
      (producer) =>
        producer.id === selectedEditor ||
        producer.name.toUpperCase() === selectedEditor.toUpperCase()
    );
  }, [categoryFilteredProducers, selectedEditor]);

  const currentDate = useMemo(() => new Date(), []);
  const anchorDate = useMemo(
    () => currentDate,
    [currentDate]
  );

  const teamRows = useMemo(
    () =>
      filterTeamScheduleByStatus(
        buildTeamSchedule(
          viewFilteredProducers,
          schedule,
          view,
          anchorDate,
          mtdRecords
        ),
        statusFilter,
        view
      ),
    [viewFilteredProducers, schedule, view, anchorDate, mtdRecords, statusFilter]
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

  const handleSelectProducerRow = useCallback(
    (row: TeamScheduleRow, cell?: ScheduleCell) => {
      setDrawerRow(row);
      setFocusCell(cell ?? null);
    },
    []
  );

  const closeDrawer = useCallback(() => {
    setDrawerRow(null);
    setFocusCell(null);
  }, []);

  const columns = useMemo(
    () => aggregateColumns(teamRows, anchorDate),
    [teamRows, anchorDate]
  );

  const columnAggregates = useMemo(
    () => buildScheduleColumnAggregates(view, anchorDate),
    [view, anchorDate]
  );

  const availableToday = useMemo(() => {
    const todayKey = todayIso();
    let count = 0;
    for (const r of teamRows) {
      const cell = r.cells.find((c) => c.key === todayKey);
      if (cell && cell.status === "available") count += 1;
    }
    return count;
  }, [teamRows]);

  const offToday = useMemo(() => {
    const todayKey = todayIso();
    let count = 0;
    for (const r of teamRows) {
      const cell = r.cells.find((c) => c.key === todayKey);
      if (cell && cell.status === "off") count += 1;
    }
    return count;
  }, [teamRows]);

  const sendProducerNames = useMemo(() => {
    const allowed = new Set(
      categoryFilteredProducers.map((p) => p.name.toUpperCase())
    );
    const eligibleRecords = mtdRecords.filter(isEligibleProducerScheduleRecord);
    const set = new Set<string>();
    for (const r of eligibleRecords) {
      if (r.assignedProducer) {
        const prodObj = findProducerByAssignmentKey(r.assignedProducer, producers);
        const name = prodObj?.name || r.assignedProducer;
        if (name && allowed.has(name.toUpperCase())) {
          set.add(name);
        }
      }
    }
    return Array.from(set).sort();
  }, [mtdRecords, producers, categoryFilteredProducers]);

  const exportCategoryLabel = useMemo(
    () => scheduleFormFilterLabel(form, cheerSubtype, danceSubtype),
    [form, cheerSubtype, danceSubtype]
  );

  const sendEditorProducers = useMemo(() => {
    const allowed = new Set(sendProducerNames.map((name) => name.toUpperCase()));
    return categoryFilteredProducers.filter((producer) =>
      allowed.has(producer.name.toUpperCase())
    );
  }, [categoryFilteredProducers, sendProducerNames]);

  useEffect(() => {
    if (selectedSendEditor === "all") return;
    const stillValid = sendEditorProducers.some(
      (producer) =>
        producer.name === selectedSendEditor ||
        producer.id === selectedSendEditor ||
        producer.name.toUpperCase() === selectedSendEditor.toUpperCase()
    );
    if (!stillValid) setSelectedSendEditor("all");
  }, [sendEditorProducers, selectedSendEditor]);

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
              columns={columns}
              availableToday={availableToday}
              offToday={offToday}
              totalProducers={teamRows.length}
              producers={categoryFilteredProducers}
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
              form={form}
              cheerSubtype={cheerSubtype}
              danceSubtype={danceSubtype}
              formCounts={formCounts}
              cheerCounts={cheerSubtypeCounts}
              danceCounts={danceSubtypeCounts}
              sendEditorProducers={sendEditorProducers}
              selectedSendEditor={selectedSendEditor}
              onSelectedSendEditorChange={setSelectedSendEditor}
              onFormChange={switchForm}
              onCheerSubtypeChange={setCheerSubtype}
              onDanceSubtypeChange={setDanceSubtype}
            />
          )
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6 pt-5 lg:px-8">
        {pageTab === "view" ? (
          <div className="flex min-h-0 w-full flex-1 flex-col">
            {view === "today" ? (
              <TeamScheduleTodayView
                rows={teamRows}
                date={anchorDate}
                activeProducerId={drawerRow?.producer.id}
                onSelectProducer={handleSelectProducerRow}
                emptyMessage={emptyMessage}
                className="min-h-0 w-full flex-1"
              />
            ) : (
              <TeamScheduleMatrix
                rows={teamRows}
                columns={columns}
                range={view}
                statusFilter={statusFilter}
                activeProducerId={drawerRow?.producer.id}
                onSelectProducer={handleSelectProducerRow}
                emptyMessage={emptyMessage}
                className="min-h-0 w-full flex-1"
              />
            )}
          </div>
        ) : (
          <ScheduleSendPanel
            categoryLabel={exportCategoryLabel}
            producerNames={sendProducerNames}
            categoryProducers={categoryFilteredProducers}
            selectedSendEditor={selectedSendEditor}
            mtdRecords={mtdRecords}
            allOrders={allOrders}
            producers={producers}
          />
        )}
      </div>

      <ProducerScheduleDrawer
        open={Boolean(drawerRow)}
        producer={drawerRow?.producer ?? null}
        cells={drawerRow?.cells ?? []}
        range={view}
        focusCell={focusCell}
        onClose={closeDrawer}
      />

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
