import { findLinkedOrder } from "@/lib/editor-assignment";
import { readOrdersBoardOrder } from "@/lib/orders-board-cache";
import type { MTDRecord, Order } from "@/types";

/**
 * Board Timestamp for MTD / Payroll rows.
 * Prefer the stamp on the board payload (order intake), then AppState link,
 * then Orders board cache — never depend on bootstrap allOrders alone.
 */
export function resolveMtdTimestamp(
  rec: MTDRecord,
  allOrders: Order[] = []
): string {
  if (rec.createdAt) return rec.createdAt;
  const linked = findLinkedOrder(rec, allOrders);
  if (linked?.createdAt) return linked.createdAt;
  for (const id of [rec.orderId, rec.id, rec.uuid, rec.legacyId]) {
    if (!id) continue;
    const cached = readOrdersBoardOrder(id);
    if (cached?.createdAt) return cached.createdAt;
  }
  return "";
}
