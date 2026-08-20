import type { MTDRecord, Order, Producer } from "@/types";

export type DashboardPulse = {
  toAssign: number;
  blocked: number;
  inProduction: number;
  availableProducers: number;
  totalProducers: number;
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

export function buildDashboardPulse(
  orders: Order[],
  mtdRecords: MTDRecord[],
  producers: Producer[]
): DashboardPulse {
  const toAssign = orders.filter(
    (o) =>
      o.status === "new" ||
      isFirstAvailable(o.requestedProducer) ||
      isFirstAvailable(o.editorRequest)
  ).length;

  const blockedOrders = orders.filter((o) => o.needsAttention).length;
  const blockedMtd = mtdRecords.filter(
    (r) => r.needsAttention && r.status !== "completed"
  ).length;

  const inProduction = mtdRecords.filter((r) => r.status === "active").length;
  const availableProducers = producers.filter(
    (p) => p.status === "available"
  ).length;

  return {
    toAssign,
    blocked: Math.max(blockedOrders, blockedMtd),
    inProduction,
    availableProducers,
    totalProducers: producers.length,
  };
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

export function buildCategoryPipeline(orders: Order[]): CategorySlice[] {
  const counts = new Map<string, number>();
  for (const order of orders) {
    if (order.status === "completed") continue;
    counts.set(order.category, (counts.get(order.category) || 0) + 1);
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
