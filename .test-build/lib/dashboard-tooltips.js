"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kpiInsight = kpiInsight;
exports.producerInsight = producerInsight;
exports.weekDayInsight = weekDayInsight;
exports.pipelineCategoryInsight = pipelineCategoryInsight;
exports.mixOpsInsight = mixOpsInsight;
exports.ordersChartInsight = ordersChartInsight;
exports.teamPanelInsight = teamPanelInsight;
exports.weekCapacityPanelInsight = weekCapacityPanelInsight;
exports.pipelinePanelInsight = pipelinePanelInsight;
exports.mixTimelineInsight = mixTimelineInsight;
exports.formatPayrollDetail = formatPayrollDetail;
const data_1 = require("@/lib/data");
function kpiInsight(label, pulse, detail) {
    switch (label) {
        case "Unassigned":
            return {
                title: "Needs assignment",
                body: `${pulse.toAssign} mix${pulse.toAssign === 1 ? "" : "es"} have no producer yet. ${pulse.assigned} already assigned on the active board.`,
            };
        case "In queue":
            return {
                title: "Blocked in MTD",
                body: `${pulse.blocked} waiting on materials, voiceover, or other attention flags before production can move.`,
            };
        case "Outgoing":
            return {
                title: "In production",
                body: `${pulse.outgoing} mixes actively in progress internally — not outsourced or closed.`,
            };
        case "Outsourced":
            return {
                title: "External production",
                body: `${pulse.outsourced} mixes handed off to outside editors or vendors.`,
            };
        case "In payroll":
            return {
                title: "Ready to pay",
                body: pulse.payrollCount > 0
                    ? `${pulse.payrollCount} completed mix${pulse.payrollCount === 1 ? "" : "es"} in payroll${detail ? ` · ${detail}` : ""}.`
                    : "No mixes in payroll right now.",
            };
        default:
            return { title: label, body: detail ?? "View details" };
    }
}
function producerInsight(producer) {
    const statusCopy = producer.status === "available"
        ? "Open for new work in the current week view."
        : producer.status === "limited"
            ? "Partially booked — confirm schedule before assigning new mixes."
            : "Fully booked in the current schedule window.";
    return {
        title: producer.name,
        body: `${producer.specialty} · ${statusCopy} Next opening: ${producer.nextAvailable}.`,
    };
}
function weekDayInsight(day) {
    const openPct = day.total > 0 ? Math.round((day.available / day.total) * 100) : 0;
    return {
        title: day.isToday ? `Today · ${day.dayLabel}` : `${day.dayLabel} · ${day.label}`,
        body: `${day.available} of ${day.total} producers available (${openPct}% open). ${day.booked} booked on this day.`,
    };
}
function pipelineCategoryInsight(slice) {
    const pct = Math.round(slice.share * 100);
    return {
        title: slice.category,
        body: `${slice.count} active mix${slice.count === 1 ? "" : "es"} · ${pct}% of music still on the MTD board.`,
    };
}
function mixOpsInsight(slice) {
    const tips = {
        "Missing data": "Invoice, pricing, or materials still needed before payroll.",
        Assigned: "Producer assigned — track start and end dates on the schedule.",
        "Due this week": "Mix end date is within the next 7 days.",
        "Start today": "Scheduled to begin mixing today.",
        Overdue: "Past mix end date — prioritize in MTD.",
    };
    return {
        title: slice.label,
        body: `${slice.count} mix${slice.count === 1 ? "" : "es"}. ${tips[slice.label] ?? "Open MTD to review."}`,
    };
}
function ordersChartInsight(total, todayCount, peak) {
    const peakLine = peak
        ? ` Busiest day: ${peak.label} (${peak.count} order${peak.count === 1 ? "" : "s"}).`
        : "";
    return {
        title: "Incoming orders",
        body: `${total} orders in the last 14 days · ${todayCount} today.${peakLine}`,
    };
}
function teamPanelInsight(pulse) {
    const busiest = pulse.busiestDay;
    const busiestLine = busiest
        ? ` Busiest day this week: ${busiest.dayLabel} ${busiest.label} (${busiest.unavailableCount}/${busiest.total} booked).`
        : "";
    return {
        title: "Team capacity",
        body: `${pulse.availableProducers} of ${pulse.totalProducers} producers available today · ${pulse.bookedToday} booked.${busiestLine}`,
    };
}
function weekCapacityPanelInsight(pulse) {
    return {
        title: "Week at a glance",
        body: `Dark blue = booked days, orange = open capacity across the roster.${pulse.busiestDay ? ` Peak load: ${pulse.busiestDay.dayLabel}.` : ""}`,
    };
}
function pipelinePanelInsight(total) {
    return {
        title: "Active pipeline",
        body: `${total} mix${total === 1 ? "" : "es"} on the MTD board by category — completed and payroll rows excluded.`,
    };
}
function mixTimelineInsight(pulse, total) {
    return {
        title: "Mix timeline",
        body: `${total} tracked on the board · ${pulse.dueThisWeek} due this week · ${pulse.overdue} overdue · ${pulse.startingToday} starting today.`,
    };
}
function formatPayrollDetail(pulse) {
    return pulse.payrollCount > 0 ? (0, data_1.formatPrice)(pulse.payrollValue) : undefined;
}
