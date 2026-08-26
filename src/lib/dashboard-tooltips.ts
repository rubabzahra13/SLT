import type { DashboardPulse, MixOpsSlice } from "@/lib/dashboard";
import type { Producer } from "@/types";
import { formatPrice } from "@/lib/data";

export function kpiInsight(
  label: string,
  pulse: DashboardPulse,
  detail?: string
): { title: string; body: string } {
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
        body:
          pulse.payrollCount > 0
            ? `${pulse.payrollCount} completed mix${pulse.payrollCount === 1 ? "" : "es"} in payroll${detail ? ` · ${detail}` : ""}.`
            : "No mixes in payroll right now.",
      };
    default:
      return { title: label, body: detail ?? "View details" };
  }
}

export function producerInsight(producer: Producer): { title: string; body: string } {
  const statusCopy =
    producer.status === "available"
      ? "Open for new work in the current week view."
      : producer.status === "limited"
        ? "Partially booked — confirm schedule before assigning new mixes."
        : "Fully booked in the current schedule window.";

  return {
    title: producer.name,
    body: `${producer.specialty} · ${statusCopy} Next opening: ${producer.nextAvailable}.`,
  };
}

export function weekDayInsight(day: {
  label: string;
  dayLabel: string;
  available: number;
  booked: number;
  total: number;
  isToday: boolean;
}): { title: string; body: string } {
  const openPct =
    day.total > 0 ? Math.round((day.available / day.total) * 100) : 0;
  return {
    title: day.isToday ? `Today · ${day.dayLabel}` : `${day.dayLabel} · ${day.label}`,
    body: `${day.available} of ${day.total} producers available (${openPct}% open). ${day.booked} booked on this day.`,
  };
}

export function pipelineCategoryInsight(slice: {
  category: string;
  count: number;
  share: number;
}): { title: string; body: string } {
  const pct = Math.round(slice.share * 100);
  return {
    title: slice.category,
    body: `${slice.count} active mix${slice.count === 1 ? "" : "es"} · ${pct}% of music still on the MTD board.`,
  };
}

export function mixOpsInsight(slice: MixOpsSlice): { title: string; body: string } {
  const tips: Record<string, string> = {
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

export function ordersChartInsight(
  total: number,
  todayCount: number,
  peak: { label: string; count: number } | null
): { title: string; body: string } {
  const peakLine = peak
    ? ` Busiest day: ${peak.label} (${peak.count} order${peak.count === 1 ? "" : "s"}).`
    : "";
  return {
    title: "Incoming orders",
    body: `${total} orders in the last 14 days · ${todayCount} today.${peakLine}`,
  };
}

export function teamPanelInsight(pulse: DashboardPulse): { title: string; body: string } {
  const busiest = pulse.busiestDay;
  const busiestLine = busiest
    ? ` Busiest day this week: ${busiest.dayLabel} ${busiest.label} (${busiest.unavailableCount}/${busiest.total} booked).`
    : "";
  return {
    title: "Team capacity",
    body: `${pulse.availableProducers} of ${pulse.totalProducers} producers available today · ${pulse.bookedToday} booked.${busiestLine}`,
  };
}

export function weekCapacityPanelInsight(pulse: DashboardPulse): {
  title: string;
  body: string;
} {
  return {
    title: "Week at a glance",
    body: `Dark blue = booked days, orange = open capacity across the roster.${pulse.busiestDay ? ` Peak load: ${pulse.busiestDay.dayLabel}.` : ""}`,
  };
}

export function pipelinePanelInsight(total: number): { title: string; body: string } {
  return {
    title: "Active pipeline",
    body: `${total} mix${total === 1 ? "" : "es"} on the MTD board by category — completed and payroll rows excluded.`,
  };
}

export function mixTimelineInsight(pulse: DashboardPulse, total: number): {
  title: string;
  body: string;
} {
  return {
    title: "Mix timeline",
    body: `${total} tracked on the board · ${pulse.dueThisWeek} due this week · ${pulse.overdue} overdue · ${pulse.startingToday} starting today.`,
  };
}

export function formatPayrollDetail(pulse: DashboardPulse): string | undefined {
  return pulse.payrollCount > 0 ? formatPrice(pulse.payrollValue) : undefined;
}
