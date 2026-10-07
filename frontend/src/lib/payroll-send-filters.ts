import { doDateRangesOverlap } from "@/lib/dates";
import { findProducerByAssignmentKey } from "@/lib/editor-assignment";
import { matchesFormFilter } from "@/lib/mtd-filters";
import type {
  CheerFormSubtypeFilter,
  DanceFormSubtypeFilter,
  MTDRecord,
  Order,
  OrderFormType,
  PayrollAddon,
  Producer,
} from "@/types";

function resolveAddonProducerName(
  addon: PayrollAddon,
  producers: Producer[]
): string | null {
  if (addon.producerId) {
    const byId = producers.find((p) => p.id === addon.producerId);
    if (byId?.name) return byId.name;
  }
  if (addon.producerInitials) {
    const byKey = findProducerByAssignmentKey(addon.producerInitials, producers);
    if (byKey?.name) return byKey.name;
    return addon.producerInitials.trim() || null;
  }
  return null;
}

export function getPayrollSendProducerNames(
  payrollRecords: MTDRecord[],
  orderById: Map<string, Order>,
  producers: Producer[],
  form: OrderFormType,
  cheerSubtype: CheerFormSubtypeFilter,
  danceSubtype: DanceFormSubtypeFilter,
  filterPeriod: { start: string; end: string },
  payrollAddons: PayrollAddon[] = []
): string[] {
  const set = new Set<string>();

  for (const rec of payrollRecords) {
    if (!matchesFormFilter(rec, orderById, form, cheerSubtype, danceSubtype)) {
      continue;
    }
    const recStart = rec.completedAt || rec.mixStartDate || "";
    const recEnd = rec.completedAt || rec.mixEndDate || rec.mixStartDate || "";
    if (!doDateRangesOverlap({ start: recStart, end: recEnd }, filterPeriod)) {
      continue;
    }
    if (!rec.assignedProducer) continue;

    const prodObj = findProducerByAssignmentKey(rec.assignedProducer, producers);
    const name = prodObj?.name || rec.assignedProducer;
    if (name) set.add(name);
  }

  // VO-only producers must get statements even when they have no mix rows
  const formCategory = form === "school-all-star-dance" ? "Dance" : "Cheer";
  for (const addon of payrollAddons) {
    if (addon.addonType !== "voiceover") continue;
    if (addon.category && addon.category !== formCategory) continue;
    if (filterPeriod.start || filterPeriod.end) {
      const linked =
        (addon.mtdId &&
          payrollRecords.find(
            (r) => r.id === addon.mtdId || r.orderId === addon.mtdId
          )) ||
        (addon.orderId &&
          payrollRecords.find(
            (r) => r.orderId === addon.orderId || r.id === addon.orderId
          )) ||
        (addon.programName
          ? payrollRecords.find(
              (r) =>
                r.programName?.trim().toUpperCase() ===
                addon.programName.trim().toUpperCase()
            )
          : undefined);
      const rangeStart =
        linked?.completedAt || linked?.mixStartDate || addon.createdAt || "";
      const rangeEnd =
        linked?.completedAt ||
        linked?.mixEndDate ||
        linked?.mixStartDate ||
        addon.createdAt ||
        "";
      if (
        !doDateRangesOverlap(
          { start: rangeStart, end: rangeEnd },
          filterPeriod
        )
      ) {
        continue;
      }
    }
    const name = resolveAddonProducerName(addon, producers);
    if (name) set.add(name);
  }

  return Array.from(set).sort();
}

export function resolvePayrollSendEditorProducers(
  producers: Producer[],
  sendProducerNames: string[]
): Producer[] {
  const allowed = new Set(sendProducerNames.map((name) => name.toUpperCase()));
  return producers.filter((producer) => allowed.has(producer.name.toUpperCase()));
}
