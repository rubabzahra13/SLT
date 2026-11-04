"use client";

import { useMemo } from "react";
import { DashboardKpiStrip } from "@/components/dashboard/DashboardKpiStrip";
import type { DashboardPulseApi } from "@/lib/api/dashboard";
import type { DashboardPulse } from "@/lib/dashboard";

const EMPTY_PULSE: DashboardPulse = {
  toAssign: 0,
  inQueue: 0,
  todaysMixes: 0,
  inProduction: 0,
  outsourced: 0,
  payrollCount: 0,
  payrollValue: 0,
  openValue: 0,
  inProductionValue: 0,
  readyToComplete: 0,
  dueThisWeek: 0,
  overdue: 0,
  startingToday: 0,
  availableProducers: 0,
  totalProducers: 0,
  bookedToday: 0,
  busiestDay: null,
  blocked: 0,
  assigned: 0,
  missingData: 0,
  outgoing: 0,
};

/** KPI strip from /dashboard/pulse only — no full MTD scan. */
export function DashboardKpiStripLive({
  pulseApi,
}: {
  pulseApi: DashboardPulseApi | null;
}) {
  const pulse = useMemo<DashboardPulse>(() => {
    if (!pulseApi) return EMPTY_PULSE;
    return {
      ...EMPTY_PULSE,
      toAssign: pulseApi.unassigned ?? 0,
      inQueue: pulseApi.in_queue ?? 0,
      todaysMixes: pulseApi.todays_mixes ?? 0,
      inProduction: pulseApi.todays_mixes ?? 0,
      outsourced: pulseApi.outsourced ?? 0,
      overdue: pulseApi.overdue ?? 0,
      startingToday: pulseApi.starting_today ?? 0,
      dueThisWeek: pulseApi.due_this_week ?? 0,
    };
  }, [pulseApi]);

  const kpis = useMemo(
    () => [
      {
        href: "/orders?assigned=Unassigned",
        label: "Unassigned",
        value: pulse.toAssign,
      },
      {
        href: "/mtd?schedule=scheduled",
        label: "In Queue",
        value: pulse.inQueue,
      },
      {
        href: "/schedule?view=today",
        label: "Today's Mixes",
        value: pulse.todaysMixes,
      },
      {
        href: "/mtd?assigned=Outsourced",
        label: "Outsourced",
        value: pulse.outsourced,
      },
    ],
    [pulse]
  );

  return <DashboardKpiStrip kpis={kpis} pulse={pulse} />;
}
