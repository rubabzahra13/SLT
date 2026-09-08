"use client";

import { useMemo } from "react";
import { DashboardKpiStrip } from "@/components/dashboard/DashboardKpiStrip";
import { useAppState } from "@/context/AppStateContext";
import { buildDashboardPulse } from "@/lib/dashboard";

export function DashboardKpiStripLive() {
  const { mtdRecords, producers, schedule } = useAppState();

  const pulse = useMemo(
    () => buildDashboardPulse(mtdRecords, producers, schedule),
    [mtdRecords, producers, schedule]
  );

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
        value: pulse.todaysMixes ?? pulse.inProduction,
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
