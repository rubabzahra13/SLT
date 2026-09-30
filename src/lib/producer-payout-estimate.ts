import type { MTDRecord, Order, Producer } from "@/types";
import { findProducerByAssignmentKey } from "@/lib/editor-assignment";
import { resolveMTDFormMeta } from "@/lib/mtd-filters";
import { computeClientPayroll } from "@/lib/pricing-display";

function rushFeeQuantity(rec: MTDRecord): number {
  if (typeof rec.rushFeeQuantity === "number") return rec.rushFeeQuantity;
  if (rec.rushFeeOption === "double") return 2;
  if (
    rec.rushFeeOption === "single" ||
    rec.isRushOrder === "yes" ||
    rec.isRushOrder === true
  ) {
    return 1;
  }
  return 0;
}

/**
 * Estimated producer payout for a mix (package payout plus voiceover add-ons
 * and rush fee), computed the same way as the Payroll tab. Returns null when
 * the payout can't be known before payroll (e.g. hourly producers).
 */
export function estimateRecordProducerPayout(
  rec: MTDRecord,
  producer: Producer | undefined | null,
  orderById: Map<string, Order>
): number | null {
  const order = orderById.get(rec.orderId || "");
  const meta = resolveMTDFormMeta(rec, orderById);
  const customerPrice =
    order?.finalCustomerPrice ?? rec.finalCustomerPrice ?? rec.price;
  const payrollPrice =
    rec.finalPayrollPrice ?? order?.finalPayrollPrice ?? rec.price;

  const calc = computeClientPayroll(
    producer,
    customerPrice,
    null,
    rec.rateUsed ?? order?.rateUsed ?? null,
    rec.manualPayoutInput ?? null,
    meta.canonicalSubtypeId,
    payrollPrice,
    {
      rushFeeQuantity: rushFeeQuantity(rec),
      rushFeeCompensationRate:
        rec.rushFeeCompensationRate ?? producer?.rushFeeRate ?? 1.0,
      danceVoiceover: rec.danceVoiceover,
      hasTraditionalVoiceover: rec.hasTraditionalVoiceover,
      hasThemedVoiceover: rec.hasThemedVoiceover,
      cheerVoiceover20: rec.cheerVoiceover20,
      cheerVoiceover40: rec.cheerVoiceover40,
      formType: meta.formType,
    }
  );

  return (
    calc.producerPayout ??
    calc.newPricingPayout ??
    rec.producerPayout ??
    order?.producerPayout ??
    null
  );
}

/** Cached payout estimate per booked mix, for daily cost limit checks. */
export function createBookedCostEstimator(
  producers: Producer[],
  orderById: Map<string, Order>
): (rec: MTDRecord) => number | null {
  const cache = new WeakMap<MTDRecord, number | null>();
  return (rec) => {
    if (cache.has(rec)) return cache.get(rec) ?? null;
    const producer = rec.assignedProducer
      ? findProducerByAssignmentKey(rec.assignedProducer, producers)
      : undefined;
    const value = estimateRecordProducerPayout(rec, producer, orderById);
    cache.set(rec, value);
    return value;
  };
}
