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

/**
 * VO rows are stored as Cheer|Dance only. Map form tabs to that bucket, or null
 * for forms that must resolve via a linked mix (SE / Band / Anthem).
 */
export function voiceoverCategoryBucketForForm(
  form: OrderFormType
): "Cheer" | "Dance" | null {
  if (form === "school-all-star-dance") return "Dance";
  if (form === "school-all-star-cheer") return "Cheer";
  return null;
}

/** Resolve VO → mix by mtdId / orderId only (no program-name guess). */
function findLinkedMixById(
  addon: PayrollAddon,
  records: MTDRecord[]
): MTDRecord | null {
  const aMtd = addon.mtdId ? String(addon.mtdId).trim() : "";
  const aOrd = addon.orderId ? String(addon.orderId).trim() : "";
  if (aMtd) {
    const byMtd = records.find(
      (r) =>
        String(r.id).trim() === aMtd || String(r.orderId || "").trim() === aMtd
    );
    if (byMtd) return byMtd;
  }
  if (aOrd) {
    const byOrd = records.find(
      (r) =>
        String(r.orderId || "").trim() === aOrd || String(r.id).trim() === aOrd
    );
    if (byOrd) return byOrd;
  }
  return null;
}

/**
 * Whether a voiceover belongs on the current Send Statements / Voiceovers form tab.
 * Prefer the linked mix's form; unlinked VOs only appear on Cheer/Dance tabs.
 */
export function voiceoverMatchesFormFilter(
  addon: PayrollAddon,
  form: OrderFormType,
  cheerSubtype: CheerFormSubtypeFilter,
  danceSubtype: DanceFormSubtypeFilter,
  allPayrollRecords: MTDRecord[],
  orderById: Map<string, Order>
): boolean {
  if (addon.addonType !== "voiceover") return true;

  const linked = findLinkedMixById(addon, allPayrollRecords);
  if (linked) {
    return matchesFormFilter(
      linked,
      orderById,
      form,
      cheerSubtype,
      danceSubtype
    );
  }

  const bucket = voiceoverCategoryBucketForForm(form);
  if (!bucket) return false;
  const category = String(addon.category || "").trim();
  if (!category) return true;
  return category.toLowerCase() === bucket.toLowerCase();
}

/** Non-voiceover addons pass through; voiceovers are scoped to the form tab. */
export function filterPayrollAddonsForForm(
  payrollAddons: PayrollAddon[],
  form: OrderFormType,
  cheerSubtype: CheerFormSubtypeFilter,
  danceSubtype: DanceFormSubtypeFilter,
  allPayrollRecords: MTDRecord[],
  orderById: Map<string, Order>
): PayrollAddon[] {
  return payrollAddons.filter((addon) => {
    if (addon.addonType !== "voiceover") return true;
    return voiceoverMatchesFormFilter(
      addon,
      form,
      cheerSubtype,
      danceSubtype,
      allPayrollRecords,
      orderById
    );
  });
}

export function getPayrollSendProducerNames(
  payrollRecords: MTDRecord[],
  orderById: Map<string, Order>,
  producers: Producer[],
  form: OrderFormType,
  cheerSubtype: CheerFormSubtypeFilter,
  danceSubtype: DanceFormSubtypeFilter,
  filterPeriod: { start: string; end: string },
  payrollAddons: PayrollAddon[] = [],
  /** Full payroll board — used to resolve VO links outside the form-filtered set. */
  allPayrollRecords: MTDRecord[] = payrollRecords
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

  // VO-only producers must get statements even when they have no mix rows —
  // but only for VOs that belong to this form tab.
  for (const addon of payrollAddons) {
    if (addon.addonType !== "voiceover") continue;
    if (
      !voiceoverMatchesFormFilter(
        addon,
        form,
        cheerSubtype,
        danceSubtype,
        allPayrollRecords,
        orderById
      )
    ) {
      continue;
    }
    if (filterPeriod.start || filterPeriod.end) {
      const linked =
        findLinkedMixById(addon, allPayrollRecords) ||
        findLinkedMixById(addon, payrollRecords);
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
