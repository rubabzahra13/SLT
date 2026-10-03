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

export type ProducerPayoutEstimateDetail = {
  /** Category payout from payroll price × rate (excludes rush / voiceover). */
  basePayout: number | null;
  /** Full payout including extras when known. */
  totalPayout: number | null;
  rushFeePayout: number;
  voiceoverPayout: number;
  extrasApplied: boolean;
  packagePrice: number | null;
  payrollPrice: number | null;
  /** True when payout can't be known yet (hourly / needs review). */
  unknownUntilPayroll: boolean;
};

/**
 * Estimated producer payout breakdown for a mix, same compliance / payroll
 * math as the Orders → Complete to Payroll pricing step.
 */
export function estimateRecordProducerPayoutDetail(
  rec: MTDRecord,
  producer: Producer | undefined | null,
  orderById: Map<string, Order>
): ProducerPayoutEstimateDetail {
  const order = orderById.get(rec.orderId || "");
  const meta = resolveMTDFormMeta(rec, orderById);
  const packagePrice =
    order?.finalCustomerPrice ?? rec.finalCustomerPrice ?? rec.price ?? null;
  const payrollPrice =
    rec.finalPayrollPrice ?? order?.finalPayrollPrice ?? rec.price ?? null;

  const calc = computeClientPayroll(
    producer,
    packagePrice ?? 0,
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

  const rushFeePayout = calc.rushFeePayout ?? 0;
  const voiceoverPayout = calc.voiceoverPayout ?? 0;
  const extrasApplied = rushFeePayout > 0 || voiceoverPayout > 0;

  const totalPayout =
    calc.producerPayout ??
    calc.newPricingPayout ??
    rec.producerPayout ??
    order?.producerPayout ??
    null;

  // Prefer explicit category payout; otherwise back out extras from total.
  let basePayout =
    calc.categoryPayout ??
    (totalPayout != null
      ? Math.max(0, Math.round((totalPayout - rushFeePayout - voiceoverPayout) * 100) / 100)
      : null);

  const unknownUntilPayroll =
    calc.status === "hourly_manual" ||
    calc.status === "needs_manual_review" ||
    (calc.isCaseyAmbiguous && calc.producerPayout == null);

  if (unknownUntilPayroll && basePayout == null) {
    basePayout = null;
  }

  return {
    basePayout,
    totalPayout,
    rushFeePayout,
    voiceoverPayout,
    extrasApplied,
    packagePrice: typeof packagePrice === "number" ? packagePrice : null,
    payrollPrice: typeof payrollPrice === "number" ? payrollPrice : null,
    unknownUntilPayroll,
  };
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
  return estimateRecordProducerPayoutDetail(rec, producer, orderById).totalPayout;
}

/** Base category payout only (no rush / voiceover) for daily cost-limit sums. */
export function estimateRecordBasePayout(
  rec: MTDRecord,
  producer: Producer | undefined | null,
  orderById: Map<string, Order>
): number | null {
  return estimateRecordProducerPayoutDetail(rec, producer, orderById).basePayout;
}

/** Cached base payout estimate per booked mix, for daily cost limit checks. */
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
    const value = estimateRecordBasePayout(rec, producer, orderById);
    cache.set(rec, value);
    return value;
  };
}
