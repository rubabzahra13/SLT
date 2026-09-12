"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardPageClient = DashboardPageClient;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const DashboardPanel_1 = require("@/components/dashboard/DashboardPanel");
const PipelineChart_1 = require("@/components/dashboard/PipelineChart");
const OrdersIncomingChart_1 = require("@/components/dashboard/OrdersIncomingChart");
const ScheduleWeekChart_1 = require("@/components/dashboard/ScheduleWeekChart");
const MixOpsChart_1 = require("@/components/dashboard/MixOpsChart");
const TeamRosterMarquee_1 = require("@/components/dashboard/TeamRosterMarquee");
const AppStateContext_1 = require("@/context/AppStateContext");
const dashboard_1 = require("@/lib/dashboard");
const dashboard_tooltips_1 = require("@/lib/dashboard-tooltips");
function DashboardPageClient() {
    const { activeOrders, pastOrders, producers, mtdRecords, schedule } = (0, AppStateContext_1.useAppState)();
    const currentDate = new Date();
    const pulse = (0, react_1.useMemo)(() => (0, dashboard_1.buildDashboardPulse)(mtdRecords, producers, schedule, currentDate), [mtdRecords, producers, schedule]);
    const pipeline = (0, react_1.useMemo)(() => (0, dashboard_1.buildCategoryPipeline)(mtdRecords), [mtdRecords]);
    const team = (0, react_1.useMemo)(() => (0, dashboard_1.sortProducersForCapacity)(producers, mtdRecords, schedule, currentDate), [producers, mtdRecords, schedule]);
    const incomingOrders = (0, react_1.useMemo)(() => (0, dashboard_1.buildIncomingOrdersSeries)(activeOrders, pastOrders, currentDate), [activeOrders, pastOrders]);
    const weekCapacity = (0, react_1.useMemo)(() => (0, dashboard_1.buildWeeklyCapacity)(producers, schedule, mtdRecords), [producers, schedule, mtdRecords]);
    const mixOps = (0, react_1.useMemo)(() => (0, dashboard_1.buildMixOpsSlices)(pulse), [pulse]);
    const pipelineTotal = pipeline.reduce((sum, slice) => sum + slice.count, 0);
    const incomingTotal = incomingOrders.reduce((sum, point) => sum + point.count, 0);
    const teamTip = (0, dashboard_tooltips_1.teamPanelInsight)(pulse);
    const weekTip = (0, dashboard_tooltips_1.weekCapacityPanelInsight)(pulse);
    const pipelineTip = (0, dashboard_tooltips_1.pipelinePanelInsight)(pipelineTotal);
    const mixTip = (0, dashboard_tooltips_1.mixTimelineInsight)(pulse, mixOps.reduce((s, x) => s + x.count, 0));
    return ((0, jsx_runtime_1.jsxs)("div", { className: "dashboard-body-grid min-h-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "dashboard-ops-col min-h-0", children: [(0, jsx_runtime_1.jsx)(DashboardPanel_1.DashboardPanel, { className: "min-h-0", title: "All team", count: pulse.totalProducers, href: "/producers", linkLabel: "Manage team", tip: teamTip, children: (0, jsx_runtime_1.jsx)("div", { className: "flex min-h-0 flex-1 p-3", children: (0, jsx_runtime_1.jsx)(TeamRosterMarquee_1.TeamRosterMarquee, { team: team }) }) }), (0, jsx_runtime_1.jsx)(DashboardPanel_1.DashboardPanel, { fill: true, className: "min-h-0", title: "Week capacity", href: "/schedule", linkLabel: "Schedule", tip: weekTip, children: (0, jsx_runtime_1.jsx)(ScheduleWeekChart_1.ScheduleWeekChart, { days: weekCapacity, compact: true }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "dashboard-insights-col min-h-0", children: [(0, jsx_runtime_1.jsx)(DashboardPanel_1.DashboardPanel, { fill: true, className: "min-h-0", title: "Music to do", count: pipelineTotal, href: "/mtd", linkLabel: "MTD", tip: pipelineTip, children: (0, jsx_runtime_1.jsx)(PipelineChart_1.PipelineChart, { pipeline: pipeline, compact: true, limit: 4 }) }), (0, jsx_runtime_1.jsx)(DashboardPanel_1.DashboardPanel, { fill: true, className: "min-h-0", title: "Orders in", subtitle: `${incomingTotal} last 14 days`, href: "/orders", linkLabel: "Orders", children: (0, jsx_runtime_1.jsx)(OrdersIncomingChart_1.OrdersIncomingChart, { points: incomingOrders, compact: true }) }), (0, jsx_runtime_1.jsx)(DashboardPanel_1.DashboardPanel, { fill: true, className: "min-h-0", title: "Mix timeline", href: "/mtd", linkLabel: "MTD", tip: mixTip, children: (0, jsx_runtime_1.jsx)(MixOpsChart_1.MixOpsChart, { slices: mixOps, compact: true, summary: {
                                dueThisWeek: pulse.dueThisWeek,
                                overdue: pulse.overdue,
                                startingToday: pulse.startingToday,
                            } }) })] })] }));
}
