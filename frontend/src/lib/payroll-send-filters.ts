import { doDateRangesOverlap } from "@/lib/dates";
import { findProducerByAssignmentKey } from "@/lib/editor-assignment";
import { matchesFormFilter } from "@/lib/mtd-filters";
import type {
  CheerFormSubtypeFilter,
  DanceFormSubtypeFilter,
  MTDRecord,
  Order,
  OrderFormType,
  Producer,
} from "@/types";

export function getPayrollSendProducerNames(
  payrollRecords: MTDRecord[],
  orderById: Map<string, Order>,
  producers: Producer[],
  form: OrderFormType,
  cheerSubtype: CheerFormSubtypeFilter,
  danceSubtype: DanceFormSubtypeFilter,
  filterPeriod: { start: string; end: string }
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

  return Array.from(set).sort();
}

export function resolvePayrollSendEditorProducers(
  producers: Producer[],
  sendProducerNames: string[]
): Producer[] {
  const allowed = new Set(sendProducerNames.map((name) => name.toUpperCase()));
  return producers.filter((producer) => allowed.has(producer.name.toUpperCase()));
}
