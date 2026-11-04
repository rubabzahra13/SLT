"use client";

import { useMemo } from "react";
import { DashboardKpiStrip } from "@/components/dashboard/DashboardKpiStrip";
import { useAppState } from "@/context/AppStateContext";
import type { DashboardPulseApi } from "@/lib/api/dashboard";
import { buildDashboardPulse } from "@/lib/dashboard";

export function DashboardKpiStripLive({
  pulseApi,
}: {
  pulseApi: DashboardPulseApi | null;
}) {
  const { mtdRecords, producers, schedule } = useAppState();

  const localPulse = useMemo(
    () => buildDashboardPulse(mtdRecords, producers, schedule),
    [mtdRecords, producers, schedule]
  );

  const kpis = useMemo(
    () => [
      {
        href: "/orders?assigned=Unassigned",
        label: "Unassigned",
        value: pulseApi?.unassigned ?? localPulse.toAssign,
      },
      {
        href: "/mtd?schedule=scheduled",
        label: "In Queue",
        value: pulseApi?.in_queue ?? localPulse.inQueue,
      },
      {
        href: "/schedule?view=today",
        label: "Today's Mixes",
        value:
          pulseApi?.todays_mixes ??
          localPulse.todaysMixes ??
          localPulse.inProduction,
      },
      {
        href: "/mtd?assigned=Outsourced",
        label: "Outsourced",
        value: pulseApi?.outsourced ?? localPulse.outsourced,
      },
    ],
    [pulseApi, localPulse]
  );

  return <DashboardKpiStrip kpis={kpis} pulse={localPulse} />;
}
