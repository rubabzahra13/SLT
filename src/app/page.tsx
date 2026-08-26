import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardKpiStrip } from "@/components/dashboard/DashboardKpiStrip";
import { DashboardPanel } from "@/components/dashboard/DashboardPanel";
import { PipelineChart } from "@/components/dashboard/PipelineChart";
import { OrdersIncomingChart } from "@/components/dashboard/OrdersIncomingChart";
import { ScheduleWeekChart } from "@/components/dashboard/ScheduleWeekChart";
import { MixOpsChart } from "@/components/dashboard/MixOpsChart";
import { TeamRosterMarquee } from "@/components/dashboard/TeamRosterMarquee";
import { getData } from "@/lib/data";
import {
  buildCategoryPipeline,
  buildDashboardPulse,
  buildIncomingOrdersSeries,
  buildMixOpsSlices,
  buildWeeklyCapacity,
  sortProducersForCapacity,
} from "@/lib/dashboard";
import {
  formatPayrollDetail,
  mixTimelineInsight,
  pipelinePanelInsight,
  teamPanelInsight,
  weekCapacityPanelInsight,
} from "@/lib/dashboard-tooltips";

const TODAY_LABEL = "Wednesday, August 19, 2026";

export default function DashboardPage() {
  const { orders, pastOrders, producers, mtdRecords, schedule } = getData();

  const pulse = buildDashboardPulse(mtdRecords, producers, schedule);
  const pipeline = buildCategoryPipeline(mtdRecords);
  const team = sortProducersForCapacity(producers);
  const incomingOrders = buildIncomingOrdersSeries(orders, pastOrders);
  const weekCapacity = buildWeeklyCapacity(producers, schedule, mtdRecords);
  const mixOps = buildMixOpsSlices(pulse);

  const kpis = [
    { href: "/mtd", label: "Unassigned", value: pulse.toAssign },
    { href: "/mtd", label: "In queue", value: pulse.blocked },
    { href: "/outsourced", label: "Outgoing", value: pulse.outgoing },
    { href: "/outsourced", label: "Outsourced", value: pulse.outsourced },
    {
      href: "/payroll",
      label: "In payroll",
      value: pulse.payrollCount,
      detail: formatPayrollDetail(pulse),
    },
  ];

  const pipelineTotal = pipeline.reduce((sum, slice) => sum + slice.count, 0);
  const incomingTotal = incomingOrders.reduce((sum, point) => sum + point.count, 0);
  const teamTip = teamPanelInsight(pulse);
  const weekTip = weekCapacityPanelInsight(pulse);
  const pipelineTip = pipelinePanelInsight(pipelineTotal);
  const mixTip = mixTimelineInsight(pulse, mixOps.reduce((s, x) => s + x.count, 0));

  return (
    <div className="dashboard-page flex h-[calc(100dvh-3.5rem-3.25rem)] flex-col overflow-hidden md:h-[calc(100dvh-3.25rem)]">
      <div className="shrink-0">
        <PageHeader
          compact
          title="Dashboard"
          subtitle={TODAY_LABEL}
        />
      </div>

      <div className="dashboard-fit px-6 pb-3 pt-2 lg:px-8">
        <DashboardKpiStrip kpis={kpis} pulse={pulse} />

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
      </div>
    </div>
  );
}
