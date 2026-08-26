import type { MTDRecord, Order, Producer, ScheduleEntry } from "@/types";
import { toIsoDateString } from "@/lib/dates";
import { getEditorWorkload } from "@/lib/editor-assignment";
import {
  getInProgressRecords,
  getOngoingRecords,
  getOutsourcedRecords,
} from "@/lib/mtd-filters";
import { canCompleteForPayroll, getPayrollRecords } from "@/lib/mtd-completion";
import {
  aggregateColumns,
  buildTeamSchedule,
  type ColumnAggregate,
} from "@/lib/schedule-view";

/** Dashboard “today” — matches schedule anchor (Aug 19, 2026). */
export const DASHBOARD_ANCHOR_DATE = new Date(2026, 7, 19);

export type DashboardPulse = {
  toAssign: number;
  blocked: number;
  inProduction: number;
  outgoing: number;
  outsourced: number;
  payrollCount: number;
  payrollValue: number;
  openValue: number;
  inProductionValue: number;
  readyToComplete: number;
  dueThisWeek: number;
  overdue: number;
  startingToday: number;
  availableProducers: number;
  totalProducers: number;
  bookedToday: number;
  busiestDay: Pick<ColumnAggregate, "dayLabel" | "label" | "unavailableCount" | "total"> | null;
};

export type EditorLoadRow = {
  editor: string;
  count: number;
};

export type WaitingOnRow = {
  label: string;
  count: number;
};

export type RevenueStage = {
  label: string;
  value: number;
  color: string;
  href: string;
};

export type WorkflowStage = {
  label: string;
  count: number;
  color: string;
  href: string;
};

export type WeekCapacityDay = {
  dayLabel: string;
  label: string;
  open: number;
  booked: number;
  total: number;
  isToday: boolean;
};

export type MixOpsSlice = {
  label: string;
  count: number;
  color: string;
  href: string;
};

export type BarChartRow = {
  label: string;
  value: number;
  color?: string;
};

export type PriorityItem = {
  id: string;
  href: string;
  title: string;
  meta: string;
  reason: string;
  tone: "assign" | "blocked" | "match";
  price?: number;
};

export type CategorySlice = {
  category: string;
  count: number;
  share: number;
};

function isFirstAvailable(value?: string | null) {
  if (!value) return false;
  return /^(fa|first available)$/i.test(value.trim());
}

function isOpenBoardRecord(rec: MTDRecord): boolean {
  return !rec.inPayroll && rec.status !== "completed";
}

function dayOffsetFromAnchor(iso: string, anchor: Date): number | null {
  const normalized = toIsoDateString(iso);
  if (!normalized) return null;
  const anchorKey = anchor.toISOString().slice(0, 10);
  const start = new Date(`${anchorKey}T12:00:00`);
  const end = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function resolveWaitingOn(rec: MTDRecord): string {
  if (rec.waitingOn?.trim()) return rec.waitingOn.trim();
  return rec.eightCountSheet.includes("NEED")
    ? "Materials & customization"
    : "Voiceover / instrumentation";
}

function sumPrices(records: MTDRecord[]): number {
  return records.reduce((sum, rec) => sum + (rec.price || 0), 0);
}

/** Overview metrics aligned with MTD, outsourced, payroll, and schedule tabs. */
export function buildDashboardPulse(
  mtdRecords: MTDRecord[],
  producers: Producer[],
  schedule: ScheduleEntry[] = []
): DashboardPulse {
  const openBoard = mtdRecords.filter(isOpenBoardRecord);
  const open = mtdRecords.filter((r) => r.status !== "completed" && !r.inPayroll);
  const inProgress = getInProgressRecords(mtdRecords);
  const payroll = getPayrollRecords(mtdRecords);

  const toAssign = open.filter(
    (r) => !r.assignedProducer && r.editorRequest !== "NA"
  ).length;

  const blocked = open.filter((r) => r.needsAttention).length;
  const outgoing = getOngoingRecords(mtdRecords).length;
  const outsourced = getOutsourcedRecords(mtdRecords).length;

  const readyToComplete = openBoard.filter(
    (rec) => canCompleteForPayroll(rec).ready
  ).length;

  let dueThisWeek = 0;
  let overdue = 0;
  let startingToday = 0;

  for (const rec of openBoard) {
    const endOffset = rec.mixEndDate
      ? dayOffsetFromAnchor(rec.mixEndDate, DASHBOARD_ANCHOR_DATE)
      : null;
    const startOffset = rec.mixStartDate
      ? dayOffsetFromAnchor(rec.mixStartDate, DASHBOARD_ANCHOR_DATE)
      : null;

    if (endOffset != null) {
      if (endOffset < 0) overdue += 1;
      else if (endOffset <= 7) dueThisWeek += 1;
    }
    if (startOffset === 0) startingToday += 1;
  }

  const teamRows = buildTeamSchedule(
    producers,
    schedule,
    "week",
    DASHBOARD_ANCHOR_DATE,
    mtdRecords
  );
  const columns = aggregateColumns(teamRows, DASHBOARD_ANCHOR_DATE);
  const todayCol = columns.find((col) => col.isToday);
  const busiest =
    columns.reduce<ColumnAggregate | null>((best, col) => {
      if (!best || col.unavailableCount > best.unavailableCount) return col;
      return best;
    }, null) ?? null;

  return {
    toAssign,
    blocked,
    inProduction: inProgress.length,
    outgoing,
    outsourced,
    payrollCount: payroll.length,
    payrollValue: sumPrices(payroll),
    openValue: sumPrices(openBoard),
    inProductionValue: sumPrices(inProgress),
    readyToComplete,
    dueThisWeek,
    overdue,
    startingToday,
    availableProducers: producers.filter((p) => p.status === "available").length,
    totalProducers: producers.length,
    bookedToday: todayCol?.unavailableCount ?? 0,
    busiestDay: busiest
      ? {
          dayLabel: busiest.dayLabel,
          label: busiest.label,
          unavailableCount: busiest.unavailableCount,
          total: busiest.total,
        }
      : null,
  };
}

export function buildEditorLoad(
  mtdRecords: MTDRecord[],
  limit = 4
): EditorLoadRow[] {
  const workload = getEditorWorkload(mtdRecords);
  return [...workload.entries()]
    .map(([editor, count]) => ({ editor, count }))
    .sort((a, b) => b.count - a.count || a.editor.localeCompare(b.editor))
    .slice(0, limit);
}

export function buildWaitingOnBreakdown(
  mtdRecords: MTDRecord[],
  limit = 4
): WaitingOnRow[] {
  const counts = new Map<string, number>();
  for (const rec of getOutsourcedRecords(mtdRecords)) {
    const label = resolveWaitingOn(rec);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function buildPriorityQueue(
  orders: Order[],
  mtdRecords: MTDRecord[],
  mtdByOrderId: Map<string, string>
): PriorityItem[] {
  const items: PriorityItem[] = [];

  for (const order of orders) {
    const href = order.mtdId
      ? `/mtd/${order.mtdId}`
      : mtdByOrderId.get(order.id)
        ? `/mtd/${mtdByOrderId.get(order.id)}`
        : `/orders/${order.id}`;

    if (order.needsAttention) {
      items.push({
        id: `attn-${order.id}`,
        href,
        title: order.programName,
        meta: `${order.customerName} · ${order.category}`,
        reason: order.attentionReason || "Needs attention",
        tone: "blocked",
        price: order.price,
      });
      continue;
    }

    if (order.status === "new") {
      items.push({
        id: `new-${order.id}`,
        href,
        title: order.programName,
        meta: `${order.customerName} · ${order.category}`,
        reason: isFirstAvailable(order.requestedProducer)
          ? "New · match First Available"
          : `New · requested ${order.requestedProducer || "editor"}`,
        tone: isFirstAvailable(order.requestedProducer) ? "match" : "assign",
        price: order.price,
      });
      continue;
    }

    if (isFirstAvailable(order.requestedProducer) && !order.assignedProducer) {
      items.push({
        id: `fa-${order.id}`,
        href,
        title: order.programName,
        meta: `${order.customerName} · ${order.category}`,
        reason: "First Available — needs producer match",
        tone: "match",
        price: order.price,
      });
    }
  }

  // Surface a few MTD-only blockers not already covered by orders
  const coveredTitles = new Set(items.map((i) => i.title.toLowerCase()));
  for (const rec of mtdRecords) {
    if (!rec.needsAttention || rec.status === "completed") continue;
    if (coveredTitles.has(rec.programName.toLowerCase())) continue;
    items.push({
      id: `mtd-${rec.id}`,
      href: `/mtd/${rec.id}`,
      title: rec.programName,
      meta: `${rec.contactName || "MTD"} · ${rec.category}`,
      reason:
        rec.haveSongs?.toUpperCase().includes("NEED")
          ? "Missing songs / materials"
          : "MTD needs attention",
      tone: "blocked",
      price: rec.price,
    });
    if (items.length >= 12) break;
  }

  const weight = { blocked: 0, match: 1, assign: 2 } as const;
  return items
    .sort((a, b) => weight[a.tone] - weight[b.tone])
    .slice(0, 8);
}

export function buildCategoryPipeline(mtdRecords: MTDRecord[]): CategorySlice[] {
  const counts = new Map<string, number>();
  for (const rec of mtdRecords) {
    if (rec.status === "completed" || rec.inPayroll) continue;
    counts.set(rec.category, (counts.get(rec.category) || 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0) || 1;
  return [...counts.entries()]
    .map(([category, count]) => ({
      category,
      count,
      share: count / total,
    }))
    .sort((a, b) => b.count - a.count);
}

export function sortProducersForCapacity(producers: Producer[]): Producer[] {
  const rank = { unavailable: 0, limited: 1, available: 2 } as const;
  return [...producers].sort((a, b) => {
    const byStatus = rank[a.status] - rank[b.status];
    if (byStatus !== 0) return byStatus;
    return a.nextAvailable.localeCompare(b.nextAvailable);
  });
}

export function buildRevenueStages(pulse: DashboardPulse): RevenueStage[] {
  return [
    {
      label: "Open",
      value: pulse.openValue,
      color: "#1f8fb3",
      href: "/mtd",
    },
    {
      label: "In production",
      value: pulse.inProductionValue,
      color: "#52c8ee",
      href: "/outsourced",
    },
    {
      label: "Payroll",
      value: pulse.payrollValue,
      color: "#059669",
      href: "/payroll",
    },
  ];
}

export function buildWorkflowStages(pulse: DashboardPulse): WorkflowStage[] {
  return [
    {
      label: "Unassigned",
      count: pulse.toAssign,
      color: "#f07840",
      href: "/mtd",
    },
    {
      label: "In queue",
      count: pulse.blocked,
      color: "#1f8fb3",
      href: "/mtd",
    },
    {
      label: "Outgoing",
      count: pulse.outgoing,
      color: "#52c8ee",
      href: "/outsourced",
    },
    {
      label: "Outsourced",
      count: pulse.outsourced,
      color: "#6b7280",
      href: "/outsourced",
    },
    {
      label: "Payroll",
      count: pulse.payrollCount,
      color: "#059669",
      href: "/payroll",
    },
  ];
}

export function buildWeeklyCapacity(
  producers: Producer[],
  schedule: ScheduleEntry[],
  mtdRecords: MTDRecord[]
): WeekCapacityDay[] {
  const rows = buildTeamSchedule(
    producers,
    schedule,
    "week",
    DASHBOARD_ANCHOR_DATE,
    mtdRecords
  );
  return aggregateColumns(rows, DASHBOARD_ANCHOR_DATE).map((col) => ({
    dayLabel: col.dayLabel,
    label: col.label,
    open: col.total - col.unavailableCount,
    booked: col.unavailableCount,
    total: col.total,
    isToday: col.isToday,
  }));
}

export function buildMixOpsSlices(pulse: DashboardPulse): MixOpsSlice[] {
  return [
    {
      label: "Ready",
      count: pulse.readyToComplete,
      color: "#059669",
      href: "/mtd",
    },
    {
      label: "Due week",
      count: pulse.dueThisWeek,
      color: "#1f8fb3",
      href: "/mtd",
    },
    {
      label: "Overdue",
      count: pulse.overdue,
      color: "#f07840",
      href: "/mtd",
    },
    {
      label: "Start today",
      count: pulse.startingToday,
      color: "#52c8ee",
      href: "/schedule",
    },
  ];
}

export function toBarChartRows(
  rows: { label: string; count: number }[],
  color = "#1f8fb3"
): BarChartRow[] {
  return rows.map((row) => ({
    label: row.label,
    value: row.count,
    color,
  }));
}
