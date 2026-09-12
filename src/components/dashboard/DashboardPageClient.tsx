"use client";

import { useMemo } from "react";
import { DashboardPanel } from "@/components/dashboard/DashboardPanel";
import { PipelineChart } from "@/components/dashboard/PipelineChart";
import { OrdersIncomingChart } from "@/components/dashboard/OrdersIncomingChart";
import { ScheduleWeekChart } from "@/components/dashboard/ScheduleWeekChart";
import { MixOpsChart } from "@/components/dashboard/MixOpsChart";
import { TeamRosterMarquee } from "@/components/dashboard/TeamRosterMarquee";
import { useAppState } from "@/context/AppStateContext";
import {
  buildCategoryPipeline,
  buildDashboardPulse,
  buildIncomingOrdersSeries,
  buildMixOpsSlices,
  buildWeeklyCapacity,
  sortProducersForCapacity,
} from "@/lib/dashboard";
import {
  mixTimelineInsight,
  pipelinePanelInsight,
  teamPanelInsight,
  weekCapacityPanelInsight,
} from "@/lib/dashboard-tooltips";

export function DashboardPageClient() {
  const { activeOrders, pastOrders, producers, mtdRecords, schedule } = useAppState();
  const currentDate = new Date();

  const pulse = useMemo(
    () => buildDashboardPulse(mtdRecords, producers, schedule, currentDate),
    [mtdRecords, producers, schedule]
  );

  const pipeline = useMemo(() => buildCategoryPipeline(mtdRecords), [mtdRecords]);

  const team = useMemo(
    () => sortProducersForCapacity(producers, mtdRecords, schedule, currentDate),
    [producers, mtdRecords, schedule]
  );

  const incomingOrders = useMemo(
    () => buildIncomingOrdersSeries(activeOrders, pastOrders, currentDate),
    [activeOrders, pastOrders]
  );

  const weekCapacity = useMemo(
    () => buildWeeklyCapacity(producers, schedule, mtdRecords),
    [producers, schedule, mtdRecords]
  );

  const mixOps = useMemo(() => buildMixOpsSlices(pulse), [pulse]);

  const pipelineTotal = pipeline.reduce((sum, slice) => sum + slice.count, 0);
  const incomingTotal = incomingOrders.reduce((sum, point) => sum + point.count, 0);
  const teamTip = teamPanelInsight(pulse);
  const weekTip = weekCapacityPanelInsight(pulse);
  const pipelineTip = pipelinePanelInsight(pipelineTotal);
  const mixTip = mixTimelineInsight(pulse, mixOps.reduce((s, x) => s + x.count, 0));

  return (
    <div className="dashboard-body-grid min-h-0">
      <div className="dashboard-ops-col min-h-0">
        <DashboardPanel
          className="min-h-0"
          title="All team"
          count={pulse.totalProducers}
          href="/producers"
          linkLabel="Manage team"
          tip={teamTip}
        >
          <div className="flex min-h-0 flex-1 p-3">
            <TeamRosterMarquee team={team} />
          </div>
        </DashboardPanel>

        <DashboardPanel
          fill
          className="min-h-0"
          title="Week capacity"
          href="/schedule"
          linkLabel="Schedule"
          tip={weekTip}
        >
          <ScheduleWeekChart days={weekCapacity} compact />
        </DashboardPanel>
      </div>

      <div className="dashboard-insights-col min-h-0">
        <DashboardPanel
          fill
          className="min-h-0"
          title="Music to do"
          count={pipelineTotal}
          href="/mtd"
          linkLabel="MTD"
          tip={pipelineTip}
        >
          <PipelineChart pipeline={pipeline} compact limit={4} />
        </DashboardPanel>

        <DashboardPanel
          fill
          className="min-h-0"
          title="Orders in"
          subtitle={`${incomingTotal} last 14 days`}
          href="/orders"
          linkLabel="Orders"
        >
          <OrdersIncomingChart points={incomingOrders} compact />
        </DashboardPanel>

        <DashboardPanel fill className="min-h-0" title="Mix timeline" href="/mtd" linkLabel="MTD" tip={mixTip}>
          <MixOpsChart
            slices={mixOps}
            compact
            summary={{
              dueThisWeek: pulse.dueThisWeek,
              overdue: pulse.overdue,
              startingToday: pulse.startingToday,
            }}
          />
        </DashboardPanel>
      </div>
    </div>
  );
}
