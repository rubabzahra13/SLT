"use client";

import { useEffect, useMemo } from "react";
import { DashboardPanel } from "@/components/dashboard/DashboardPanel";
import { PipelineChart } from "@/components/dashboard/PipelineChart";
import { OrdersIncomingChart } from "@/components/dashboard/OrdersIncomingChart";
import { ScheduleWeekChart } from "@/components/dashboard/ScheduleWeekChart";
import { MixOpsChart } from "@/components/dashboard/MixOpsChart";
import { TeamRosterMarquee } from "@/components/dashboard/TeamRosterMarquee";
import { useAppState } from "@/context/AppStateContext";
import type { DashboardPulseApi } from "@/lib/api/dashboard";
import {
  buildCategoryPipeline,
  buildDashboardPulse,
  buildIncomingOrdersSeries,
  buildMixOpsSlices,
  buildWeeklyCapacity,
  sortProducersForCapacity,
  weekdayShortLabel,
  type IncomingOrdersPoint,
} from "@/lib/dashboard";
import {
  categoryPipelineFromPulse,
  mixOpsFromPulse,
  openBookingsToStubMtd,
} from "@/lib/dashboard-pulse-charts";
import {
  mixTimelineInsight,
  pipelinePanelInsight,
  teamPanelInsight,
  weekCapacityPanelInsight,
} from "@/lib/dashboard-tooltips";

function pulseOrdersInPoints(
  byDay: { iso: string; count: number; is_today?: boolean }[] | undefined,
  anchor: Date
): IncomingOrdersPoint[] | null {
  if (!byDay?.length) return null;
  return byDay.map((d) => {
    const day = new Date(`${d.iso}T12:00:00`);
    return {
      iso: d.iso,
      label: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      shortLabel: weekdayShortLabel(day),
      count: d.count,
      isToday:
        Boolean(d.is_today) ||
        d.iso ===
          `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, "0")}-${String(anchor.getDate()).padStart(2, "0")}`,
    };
  });
}

export function DashboardPageClient({
  pulseApi,
}: {
  pulseApi: DashboardPulseApi | null;
}) {
  const {
    activeOrders,
    pastOrders,
    producers,
    schedule,
    ensurePastOrdersLoaded,
    releasePastOrders,
  } = useAppState();

  useEffect(() => {
    // Fallback only — preferred series comes from /dashboard/pulse.
    if ((pulseApi?.orders_in_by_day?.length || 0) > 0) return;
    void ensurePastOrdersLoaded().catch(() => {
      /* chart stays on active-only until retry */
    });
    return () => {
      releasePastOrders();
    };
  }, [ensurePastOrdersLoaded, releasePastOrders, pulseApi?.orders_in_by_day]);

  const currentDate = new Date();

  // Pulse bookings replace a full live-MTD hydrate for capacity / roster.
  const bookingMtd = useMemo(
    () => openBookingsToStubMtd(pulseApi?.open_bookings),
    [pulseApi?.open_bookings]
  );

  const pulse = useMemo(() => {
    const local = buildDashboardPulse(
      bookingMtd,
      producers,
      schedule,
      currentDate
    );
    return {
      ...local,
      overdue: pulseApi?.overdue ?? local.overdue,
      startingToday: pulseApi?.starting_today ?? local.startingToday,
      dueThisWeek: pulseApi?.due_this_week ?? local.dueThisWeek,
      toAssign: pulseApi?.unassigned ?? local.toAssign,
      inQueue: pulseApi?.in_queue ?? local.inQueue,
      todaysMixes: pulseApi?.todays_mixes ?? local.todaysMixes,
      outsourced: pulseApi?.outsourced ?? local.outsourced,
    };
  }, [bookingMtd, producers, schedule, pulseApi, currentDate]);

  const pipelineFromPulse = useMemo(
    () => categoryPipelineFromPulse(pulseApi?.category_pipeline),
    [pulseApi?.category_pipeline]
  );
  const pipeline = useMemo(
    () => pipelineFromPulse ?? buildCategoryPipeline(bookingMtd),
    [pipelineFromPulse, bookingMtd]
  );

  const team = useMemo(
    () =>
      sortProducersForCapacity(producers, bookingMtd, schedule, currentDate),
    [producers, bookingMtd, schedule, currentDate]
  );

  const incomingFromPulse = useMemo(
    () => pulseOrdersInPoints(pulseApi?.orders_in_by_day, currentDate),
    [pulseApi?.orders_in_by_day, currentDate]
  );

  const incomingOrders = useMemo(
    () =>
      incomingFromPulse ??
      buildIncomingOrdersSeries(activeOrders, pastOrders, currentDate),
    [incomingFromPulse, activeOrders, pastOrders, currentDate]
  );

  const weekCapacity = useMemo(
    () => buildWeeklyCapacity(producers, schedule, bookingMtd, currentDate),
    [producers, schedule, bookingMtd, currentDate]
  );

  const mixOpsFromApi = useMemo(
    () => mixOpsFromPulse(pulseApi?.mix_ops),
    [pulseApi?.mix_ops]
  );
  const mixOps = useMemo(
    () => mixOpsFromApi ?? buildMixOpsSlices(bookingMtd, currentDate),
    [mixOpsFromApi, bookingMtd, currentDate]
  );

  const pipelineFromRecords = pipeline.reduce((sum, slice) => sum + slice.count, 0);
  const incomingTotal =
    pulseApi?.orders_in_total ??
    incomingOrders.reduce((sum, point) => sum + point.count, 0);
  // Prefer server open count so Music to do matches Mix timeline / pulse
  // even if a sticky local payroll merge briefly hides a row.
  const openOnTimeline =
    pulseApi?.mtd_open ??
    bookingMtd.filter((r) => r.status !== "completed" && !r.inPayroll).length;
  const pipelineTotal =
    typeof pulseApi?.mtd_open === "number" ? pulseApi.mtd_open : pipelineFromRecords;
  const teamTip = teamPanelInsight(pulse);
  const weekTip = weekCapacityPanelInsight(pulse);
  const pipelineTip = pipelinePanelInsight(pipelineTotal);
  const mixTip = mixTimelineInsight(pulse, openOnTimeline);

  return (
    <div className="dashboard-body-grid min-h-0">
      <div className="dashboard-ops-col min-h-0">
        <DashboardPanel
          className="min-h-0"
          title="All team today"
          count={pulse.totalProducers}
          href="/producers"
          linkLabel="Manage team"
          tip={teamTip}
        >
          <div className="flex min-h-0 flex-1 p-3">
            <TeamRosterMarquee
              team={team}
              mtdRecords={bookingMtd}
              currentDate={currentDate}
            />
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
          <PipelineChart
            pipeline={pipeline}
            openTotal={pipelineTotal}
            compact
            limit={4}
          />
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
            openTotal={openOnTimeline}
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
