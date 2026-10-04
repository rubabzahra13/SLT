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
        body: "Mixes that still need a producer to be assigned.",
      };
    case "In queue":
    case "In Queue":
      return {
        title: "In queue",
        body: "Mixes that are scheduled but not currently being worked on.",
      };
    case "Today's Mixes":
    case "In production":
    case "In Production":
      return {
        title: "Today's Mixes",
        body: "Everything producers are scheduled to work on today, including mixes that started earlier and are still being worked on.",
      };
    case "Outsourced":
      return {
        title: "Outsourced",
        body: "Mixes that have been assigned to outsourced producers.",
      };
    default:
      return { title: label, body: detail ?? "View details" };
  }
}

export function producerInsight(
  producer: Producer,
  mixesToday = 0
): { title: string; body: string } {
  const mixCopy =
    mixesToday === 1
      ? "1 mix on the schedule today."
      : `${mixesToday} mixes on the schedule today.`;
  const limitCopy =
    producer.maxMixesPerDay != null
      ? ` Daily max: ${producer.maxMixesPerDay}.`
      : "";

  return {
    title: producer.name,
    body: `${producer.categories[0] || "Producer"} · ${mixCopy}${limitCopy}`,
  };
}

export function weekDayInsight(day: {
  label: string;
  dayLabel: string;
  atCapacity: number;
  hasCapacity: number;
  total: number;
  isToday: boolean;
}): { title: string; body: string } {
  const title = day.isToday
    ? `Today · ${day.dayLabel}`
    : `${day.dayLabel} · ${day.label}`;

  if (day.total === 0) {
    return {
      title,
      body: "No producers working this day.",
    };
  }

  const openLabel =
    day.hasCapacity === 1
      ? "1 can take more work"
      : `${day.hasCapacity} can take more work`;
  const fullLabel =
    day.atCapacity === 1
      ? "1 is full"
      : `${day.atCapacity} are full`;

  return {
    title,
    body: `${openLabel} · ${fullLabel}.`,
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
    Assigned: "Producer assigned. Track start and end dates on the schedule.",
    "Due this week": "Mix end date is within the next 7 days.",
    "Start today": "Scheduled to begin mixing today.",
    Overdue: "Past mix end date. Prioritize in MTD.",
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
    body: `Blue = full for the day. Orange = still open for new mixes.${pulse.busiestDay ? ` Peak day: ${pulse.busiestDay.dayLabel}.` : ""}`,
  };
}

export function pipelinePanelInsight(total: number): { title: string; body: string } {
  return {
    title: "Active pipeline",
    body: `${total} mix${total === 1 ? "" : "es"} on the MTD board by category. Completed and payroll rows excluded.`,
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
