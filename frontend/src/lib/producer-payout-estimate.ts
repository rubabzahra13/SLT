import type { MTDRecord, Order, Producer } from "@/types";
import { findProducerByAssignmentKey } from "@/lib/editor-assignment";
import { resolveMTDFormMeta } from "@/lib/mtd-filters";
import { resolveLiveOrderPricing } from "@/lib/order-package-price";
import { computeClientPayroll } from "@/lib/pricing-display";
import {
  loadDailyCostSettings,
  type DailyCostSettings,
} from "@/lib/daily-cost-settings";

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
  /**
   * Daily cost-cap amount for this mix (no add-ons). Follows daily-cost
   * settings: package price always; optional compliance column; optional
   * producer %.
   */
  dailyCostAmount: number | null;
  /** Full payout including extras when known. */
  totalPayout: number | null;
  rushFeePayout: number;
  voiceoverPayout: number;
  extrasApplied: boolean;
  packagePrice: number | null;
  payrollPrice: number | null;
  dailyCostSettings: DailyCostSettings;
  /** True when payout can't be known yet (hourly / needs review). */
  unknownUntilPayroll: boolean;
};

/**
 * Estimated producer payout breakdown for a mix, same compliance / payroll
 * math as the Orders → Complete to Payroll pricing step.
 *
 * Uses live Pricing Reference + engine payroll (compliant/non-compliant by
 * music affiliate). Customer package-price edits do not change this base.
 */
export function estimateRecordProducerPayoutDetail(
  rec: MTDRecord,
  producer: Producer | undefined | null,
  orderById: Map<string, Order>
): ProducerPayoutEstimateDetail {
  const order =
    orderById.get(rec.orderId || "") ||
    orderById.get(rec.id) ||
    (rec.uuid ? orderById.get(rec.uuid) : undefined) ||
    (rec.legacyId ? orderById.get(rec.legacyId) : undefined);
  const meta = resolveMTDFormMeta(rec, orderById);
  const live = resolveLiveOrderPricing(rec, order, meta, orderById);
  const packagePrice = live.customerPrice;
  const payrollPrice = live.payrollPrice;
  const dailyCostSettings = loadDailyCostSettings();

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
      ? Math.max(
          0,
          Math.round((totalPayout - rushFeePayout - voiceoverPayout) * 100) / 100
        )
      : null);

  const unknownUntilPayroll =
    calc.status === "hourly_manual" ||
    calc.status === "needs_manual_review" ||
    (calc.isCaseyAmbiguous && calc.producerPayout == null);

  if (unknownUntilPayroll && basePayout == null) {
    basePayout = null;
  }

  // Daily cost: package price always; optional compliance column; optional %.
  // Add-ons are intentionally never included here.
  const dollarBase = dailyCostSettings.includeCompliance
    ? (typeof payrollPrice === "number" && payrollPrice > 0
        ? payrollPrice
        : typeof packagePrice === "number"
          ? packagePrice
          : null)
    : typeof packagePrice === "number"
      ? packagePrice
      : null;

  let dailyCostAmount: number | null = null;
  if (dollarBase != null) {
    if (dailyCostSettings.includeProducerRate) {
      if (unknownUntilPayroll && basePayout == null) {
        dailyCostAmount = null;
      } else if (basePayout != null && dailyCostSettings.includeCompliance) {
        // Same path as today when both toggles are on.
        dailyCostAmount = basePayout;
      } else if (calc.rateUsed != null) {
        const rate =
          calc.rateUsed > 1 ? calc.rateUsed / 100 : calc.rateUsed;
        dailyCostAmount = Math.round(dollarBase * rate * 100) / 100;
      } else {
        dailyCostAmount = null;
      }
    } else {
      dailyCostAmount = Math.round(dollarBase * 100) / 100;
    }
  }

  return {
    basePayout,
    dailyCostAmount,
    totalPayout,
    rushFeePayout,
    voiceoverPayout,
    extrasApplied,
    packagePrice: typeof packagePrice === "number" ? packagePrice : null,
    payrollPrice: typeof payrollPrice === "number" ? payrollPrice : null,
    dailyCostSettings,
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

/**
 * Amount counted toward the producer daily cost cap for this mix.
 * Honors daily-cost settings; never includes 8ct / sheet / vocals / rush / VO.
 */
export function estimateRecordBasePayout(
  rec: MTDRecord,
  producer: Producer | undefined | null,
  orderById: Map<string, Order>
): number | null {
  return estimateRecordProducerPayoutDetail(rec, producer, orderById)
    .dailyCostAmount;
}

/** Cached base payout estimate per booked mix, for daily cost limit checks. */
export function createBookedCostEstimator(
  producers: Producer[],
  orderById: Map<string, Order>
): (rec: MTDRecord) => number | null {
  // Per-factory Map (not WeakMap): a new factory is created whenever prices /
  // rates change, so stale payouts can't stick across Pricing Reference edits.
  const cache = new Map<string, number | null>();
  return (rec) => {
    const key = rec.id || rec.orderId || rec.uuid || rec.legacyId || "";
    if (key && cache.has(key)) return cache.get(key) ?? null;
    const producer = rec.assignedProducer
      ? findProducerByAssignmentKey(rec.assignedProducer, producers)
      : undefined;
    const value = estimateRecordBasePayout(rec, producer, orderById);
    if (key) cache.set(key, value);
    return value;
  };
}
