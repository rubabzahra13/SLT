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
    Overdue: "Past mix end date. Prioritize in MTD.",
    "Start today": "Scheduled to begin mixing today.",
    "Due this week": "Mix end date is within the next 7 days.",
    "Missing data": "Invoice, pricing, or materials still needed before payroll.",
    "On track": "Dated and ready — no deadline pressure this week.",
  };
  return {
    title: slice.label,
    body: `${slice.count} mix${slice.count === 1 ? "" : "es"}. ${tips[slice.label] ?? "Open MTD to review."}`,
  };
}

export type OrdersInInsightInput = {
  total: number;
  todayCount: number;
  peak: { label: string; count: number; isToday: boolean } | null;
  /** Days in the window that had at least one order. */
  activeDays: number;
  /** Orders created the calendar day before today (0 if none / unknown). */
  yesterdayCount: number;
};

function formatOrdersInInsight(stats: OrdersInInsightInput): {
  title: string;
  body: string;
} {
  const { total, todayCount, peak, activeDays, yesterdayCount } = stats;
  if (total <= 0) {
    return {
      title: "Incoming orders",
      body: "No new orders in the last 14 days.",
    };
  }

  const parts: string[] = [];
  if (peak && peak.count > 0) {
    const share = Math.round((peak.count / total) * 100);
    if (peak.isToday) {
      parts.push(
        `Today is the busiest day so far — ${peak.count} of ${total} (${share}%).`
      );
    } else if (share >= 40) {
      parts.push(
        `${peak.label} drove ${peak.count} of ${total} orders (${share}% of the window).`
      );
    } else {
      parts.push(
        `Peak day ${peak.label}: ${peak.count} order${peak.count === 1 ? "" : "s"}.`
      );
    }
  }

  if (todayCount === 0 && yesterdayCount > 0) {
    parts.push(`Quiet so far today vs ${yesterdayCount} yesterday.`);
  } else if (todayCount > 0 && yesterdayCount > todayCount) {
    parts.push(
      `Today ${todayCount} so far · yesterday finished at ${yesterdayCount}.`
    );
  } else if (todayCount > 0 && yesterdayCount === 0) {
    parts.push(`Today ${todayCount} · no orders yesterday.`);
  } else if (todayCount > 0) {
    parts.push(`Today ${todayCount}.`);
  } else {
    parts.push("None today yet.");
  }

  if (activeDays > 0 && activeDays < 14) {
    parts.push(`Activity on ${activeDays} of 14 days.`);
  }

  return {
    title: "Incoming orders",
    body: parts.join(" "),
  };
}

export function ordersChartInsight(
  total: number,
  todayCount: number,
  peak: { label: string; count: number; isToday?: boolean } | null,
  extras?: { activeDays?: number; yesterdayCount?: number }
): { title: string; body: string } {
  return formatOrdersInInsight({
    total,
    todayCount,
    peak: peak
      ? { label: peak.label, count: peak.count, isToday: Boolean(peak.isToday) }
      : null,
    activeDays: extras?.activeDays ?? 0,
    yesterdayCount: extras?.yesterdayCount ?? 0,
  });
}

export function ordersChartVolumeInsight(
  stats: OrdersInInsightInput
): { title: string; body: string } {
  const insight = formatOrdersInInsight(stats);
  return { title: insight.title, body: insight.body };
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
    body: `${total} open mix${total === 1 ? "" : "es"}, each counted once by soonest milestone · ${pulse.overdue} overdue · ${pulse.startingToday} start today · ${pulse.dueThisWeek} due this week.`,
  };
}

export function formatPayrollDetail(pulse: DashboardPulse): string | undefined {
  return pulse.payrollCount > 0 ? formatPrice(pulse.payrollValue) : undefined;
}
