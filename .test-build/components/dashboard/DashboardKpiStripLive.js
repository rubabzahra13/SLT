"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardKpiStripLive = DashboardKpiStripLive;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const DashboardKpiStrip_1 = require("@/components/dashboard/DashboardKpiStrip");
const AppStateContext_1 = require("@/context/AppStateContext");
const dashboard_1 = require("@/lib/dashboard");
function DashboardKpiStripLive() {
    const { mtdRecords, producers, schedule } = (0, AppStateContext_1.useAppState)();
    const pulse = (0, react_1.useMemo)(() => (0, dashboard_1.buildDashboardPulse)(mtdRecords, producers, schedule), [mtdRecords, producers, schedule]);
    const kpis = (0, react_1.useMemo)(() => [
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
    ], [pulse]);
    return (0, jsx_runtime_1.jsx)(DashboardKpiStrip_1.DashboardKpiStrip, { kpis: kpis, pulse: pulse });
}
