import type { Producer } from "@/types";
import type { PricingBreakdown } from "./api/pricing";
import { orderCategoryToProducerCategory } from "./editor-assignment";

export function getFormTypeLabel(formType?: string): string {
  switch (formType) {
    case "school-all-star-cheer":
      return "School/All Star Cheer";
    case "school-all-star-dance":
      return "School/All Star Dance";
    case "marching-band":
      return "Marching Band";
    case "sports-entertainment":
      return "Sports Entertainment";
    case "school-anthem":
      return "School Anthems";
    default:
      return formType || "Cheer";
  }
}

export function getSubtypeLabel(subtypeId?: string | null): string {
  if (!subtypeId) return "";
  switch (subtypeId) {
    case "all-star-cheer":
      return "All-Star Cheer";
    case "school-cheer-viroc-yes":
      return "VIROC";
    case "school-cheer":
    case "school-cheer-viroc-no":
      return "School Cheer";
    case "youth-rec-cheer":
      return "Youth Rec Cheer";
    case "pom":
      return "POM";
    case "hip-hop":
      return "Hip Hop";
    case "team-performance-variety":
      return "Team Performance & Variety";
    case "gameday":
      return "Gameday";
    case "jazz-kick":
      return "Jazz / Kick";
    default:
      return subtypeId;
  }
}

export function getFullClassificationLabel(
  formType?: string,
  subtypeId?: string | null,
  packageName?: string
): string {
  const formLabel = getFormTypeLabel(formType);
  const subLabel = getSubtypeLabel(subtypeId);
  const pkgLabel = packageName || "TBD";

  if (subLabel && subLabel !== formLabel) {
    return `${formLabel} > ${subLabel} > ${pkgLabel}`;
  }
  return `${formLabel} > ${pkgLabel}`;
}

export interface CalculatedPayroll {
  status: "computed" | "hourly_manual" | "not_paid_for_mixing" | "needs_manual_review";
  producerPayout: number | null;
  sltPortion: number | null;
  rateUsed: number | null;
  rateSource: string;
  isCaseyAmbiguous: boolean;
  oldPricingPayout?: number;
  newPricingPayout?: number;
  categoryPayout?: number;
  rushFeePayout?: number;
  rushFeeQuantity?: number;
  rushFeeRateUsed?: number;
  voiceoverPayout?: number;
  voiceoverRateUsed?: number;
  message: string;
}

/**
 * Rate locked at Complete-to-Payroll (`rate_source === "manual_override"`).
 * Payroll must use this instead of re-resolving the producer category default.
 */
export function finalizedPayrollRate(order?: {
  rateSource?: string | null;
  rateUsed?: number | null;
} | null): number | null {
  if (!order || order.rateSource !== "manual_override") return null;
  if (order.rateUsed == null) return null;
  const r = Number(order.rateUsed);
  return Number.isFinite(r) ? r : null;
}

/**
 * Package mix payout SoT after finalize. Prefer the persisted producer_payout
 * when the rate was locked so Payroll/Statements don't drift after refresh.
 */
export function finalizedPackageProducerPayout(
  order:
    | {
        rateSource?: string | null;
        producerPayout?: number | null;
      }
    | null
    | undefined,
  calculatedPayout: number | null | undefined
): number | null {
  if (
    order?.rateSource === "manual_override" &&
    typeof order.producerPayout === "number" &&
    Number.isFinite(order.producerPayout)
  ) {
    return order.producerPayout;
  }
  if (typeof calculatedPayout === "number" && Number.isFinite(calculatedPayout)) {
    return calculatedPayout;
  }
  if (
    typeof order?.producerPayout === "number" &&
    Number.isFinite(order.producerPayout)
  ) {
    return order.producerPayout;
  }
  return null;
}

/**
 * Locked producer_payout wins when it was computed on the same payroll base
 * the Complete modal uses. When that saved base dropped music compliancy
 * (Cheer/Dance payroll higher than the compliant column), use the rate × the
 * modal's payroll base instead.
 */
export function packagePayoutMatchingCompliance(
  order: {
    rateSource?: string | null;
    producerPayout?: number | null;
  } | null | undefined,
  calculatedPayout: number | null | undefined,
  savedPayrollPrice: number | null | undefined,
  livePayrollPrice: number | null | undefined,
  formType?: string | null
): number | null {
  const locked = finalizedPackageProducerPayout(order, calculatedPayout);
  const complianceForm =
    formType === "school-all-star-cheer" || formType === "school-all-star-dance";
  if (
    complianceForm &&
    locked != null &&
    calculatedPayout != null &&
    typeof savedPayrollPrice === "number" &&
    typeof livePayrollPrice === "number" &&
    livePayrollPrice + 0.05 < savedPayrollPrice
  ) {
    return calculatedPayout;
  }
  return locked;
}

export type PayrollOptions = {
  rushFeeQuantity?: number;
  rushFeeCompensationRate?: number | null;
  /**
   * When false, Cheer/Dance $150×qty rush still strips the customer rush
   * charge from the package base before % is applied, but that rush
   * compensation is not added to producerPayout (carry to Payroll Rushby).
   * Default true.
   */
  includeRushFeeInPayout?: boolean;
  /**
   * Sports Entertainment Magento rush dollars already inside payroll base
   * ($100 when Rush Order Yes). Subtracted before category %, then multiplied
   * by producer.rushFeeRate and always included in producerPayout.
   * Not the Cheer/Dance $150 Rushby add-on.
   */
  sportsEntertainmentRushFee?: number;
  danceVoiceover?: "25" | "75" | "100" | null;
  hasTraditionalVoiceover?: boolean;
  hasThemedVoiceover?: boolean;
  cheerVoiceover20?: boolean;
  cheerVoiceover40?: boolean;
  formType?: string | null;
};

/**
 * Resolves the category-specific compensation rate for a producer on an order category or subtype.
 */
export function getProducerCategoryRate(
  producer: Producer,
  categoryOrSubtype?: string | null,
  formType?: string | null
): { rate: number | null; source: string; categoryName: string } {
  const categoryName = orderCategoryToProducerCategory(
    formType || undefined,
    categoryOrSubtype || undefined,
    categoryOrSubtype || undefined
  );

  if (producer.ratesByCategory && Object.keys(producer.ratesByCategory).length > 0) {
    // 1. Direct canonical match
    if (categoryName && producer.ratesByCategory[categoryName] !== undefined) {
      const raw = producer.ratesByCategory[categoryName];
      return {
        rate: raw > 1 ? raw / 100 : raw,
        source: `rates_by_category[${categoryName}]`,
        categoryName,
      };
    }

    // 2. Case-insensitive / normalized match in ratesByCategory
    const targetKey = (categoryName || categoryOrSubtype || "").trim().toLowerCase();
    for (const [key, val] of Object.entries(producer.ratesByCategory)) {
      if (
        key.trim().toLowerCase() === targetKey ||
        orderCategoryToProducerCategory(undefined, undefined, key).trim().toLowerCase() === targetKey
      ) {
        return {
          rate: val > 1 ? val / 100 : val,
          source: `rates_by_category[${key}]`,
          categoryName: categoryName || key,
        };
      }
    }
  }

  return {
    rate: null,
    source: "no_rate_configured",
    categoryName: categoryName || categoryOrSubtype || "",
  };
}

export function computeClientPayroll(
  producer: Producer | undefined | null,
  finalCustomerPrice: number,
  breakdown: PricingBreakdown | null,
  selectedRate: number | null,
  manualPayoutInput: number | null,
  canonicalSubtypeId?: string | null,
  finalPayrollPriceOverride?: number | null,
  options?: PayrollOptions
): CalculatedPayroll {
  // percentage_of_payroll_base: MUST use final payroll price (payrollBase), never base customer/package price
  const payrollBase =
    typeof finalPayrollPriceOverride === "number" && !isNaN(finalPayrollPriceOverride)
      ? finalPayrollPriceOverride
      : (breakdown?.payroll_base_price ?? finalCustomerPrice);

  if (!producer) {
    return {
      status: "needs_manual_review",
      producerPayout: manualPayoutInput,
      sltPortion: manualPayoutInput !== null ? Math.max(0, payrollBase - manualPayoutInput) : null,
      rateUsed: null,
      rateSource: "no_producer",
      isCaseyAmbiguous: false,
      message: "No producer assigned. Enter manual payout.",
    };
  }

  const model = producer.compensationModel;

  if (model === "not_paid_for_mixing") {
    return {
      status: "not_paid_for_mixing",
      producerPayout: 0,
      sltPortion: payrollBase,
      rateUsed: 0,
      rateSource: "not_paid_for_mixing",
      isCaseyAmbiguous: false,
      message: `${producer.name} is not paid for mixing`,
    };
  }

  if (model === "hourly_manual") {
    return {
      status: "hourly_manual",
      producerPayout: manualPayoutInput,
      sltPortion: manualPayoutInput !== null ? Math.max(0, payrollBase - manualPayoutInput) : null,
      rateUsed: null,
      rateSource: "hourly_manual",
      isCaseyAmbiguous: false,
      message: `${producer.name} is paid manually via pay sheet`,
    };
  }

  // Cheer/Dance admin Rushby: $150 × qty × rushFeeRate (optional in total).
  const rushQty = options?.rushFeeQuantity ?? 0;
  const rushCustomerCharge = rushQty * 150;
  const rawRushRate = options?.rushFeeCompensationRate ?? producer.rushFeeRate ?? 1.0;
  const rushFeeRateUsed = rawRushRate > 1 ? rawRushRate / 100 : rawRushRate;
  const cheerRushFeePayoutComputed =
    Math.round(150 * rushQty * rushFeeRateUsed * 100) / 100;
  const includeRushFeeInPayout = options?.includeRushFeeInPayout !== false;
  const cheerRushFeePayout = includeRushFeeInPayout
    ? cheerRushFeePayoutComputed
    : 0;

  // Sports Entertainment Magento rush: flat $100 inside payroll base, paid at
  // rushFeeRate — never Cheer $150 and never category % on the combined total.
  const isSportsEntertainment =
    options?.formType === "sports-entertainment";
  const seRushFee = isSportsEntertainment
    ? Math.max(0, Number(options?.sportsEntertainmentRushFee) || 0)
    : 0;
  const seRushFeePayout =
    seRushFee > 0
      ? Math.round(seRushFee * rushFeeRateUsed * 100) / 100
      : 0;
  const rushFeePayoutComputed =
    seRushFee > 0 ? seRushFeePayout : cheerRushFeePayoutComputed;
  const rushFeePayout = seRushFee > 0 ? seRushFeePayout : cheerRushFeePayout;

  // Calculate Voiceover payout based on producer's specific VO rates
  let voiceoverPayout = 0;
  let voiceoverRateUsed: number | undefined;

  const isDance =
    options?.formType === "school-all-star-dance" ||
    Boolean(options?.danceVoiceover) ||
    Boolean(options?.hasTraditionalVoiceover) ||
    Boolean(options?.hasThemedVoiceover);

  if (isDance) {
    const rawDanceVo = producer.danceVoiceoverRate ?? 1.0;
    voiceoverRateUsed = rawDanceVo > 1 ? rawDanceVo / 100 : rawDanceVo;

    let voBase = 0;
    const danceVo = options?.danceVoiceover;
    const trad = Boolean(options?.hasTraditionalVoiceover);
    const themed = Boolean(options?.hasThemedVoiceover);

    if (danceVo === "100" || (trad && themed)) {
      voBase = 100;
    } else if (danceVo === "75" || themed) {
      voBase = 75;
    } else if (danceVo === "25" || trad) {
      voBase = 25;
    }
    voiceoverPayout = Math.round(voBase * voiceoverRateUsed * 100) / 100;
  } else {
    // Cheer Voiceover
    const rawCheerVo = producer.cheerVoiceoverRate ?? 1.0;
    voiceoverRateUsed = rawCheerVo > 1 ? rawCheerVo / 100 : rawCheerVo;

    let voBase = 0;
    if (options?.cheerVoiceover20) voBase += 20;
    if (options?.cheerVoiceover40) voBase += 40;
    voiceoverPayout = Math.round(voBase * voiceoverRateUsed * 100) / 100;
  }

  // Package payroll base excludes Cheer $150×qty and/or SE Magento $100 rush
  // so category % applies only to the package component.
  const basePackagePayrollPrice = Math.max(
    0,
    payrollBase - rushCustomerCharge - seRushFee
  );

  // Determine initial category rate if none selected
  let defaultRate: number | null = selectedRate;
  let source = "manual_override";
  let isCasey = false;
  let oldPayout: number | undefined;
  let newPayout: number | undefined;

  // Casey (CM): two historical rates — admin must pick one when no rate selected.
  if (producer.initials === "CM") {
    isCasey = true;
    const oldRate = 0.72;
    const newRate = 0.7;
    const oldCatPayout = Math.round(basePackagePayrollPrice * oldRate * 100) / 100;
    const newCatPayout = Math.round(basePackagePayrollPrice * newRate * 100) / 100;
    oldPayout = Math.round((oldCatPayout + rushFeePayout + voiceoverPayout) * 100) / 100;
    newPayout = Math.round((newCatPayout + rushFeePayout + voiceoverPayout) * 100) / 100;

    if (selectedRate === null) {
      // Unconfirmed trigger
      return {
        status: "computed",
        producerPayout: null,
        sltPortion: null,
        rateUsed: null,
        rateSource: "rate_overrides[old_pricing|new_pricing]",
        isCaseyAmbiguous: true,
        oldPricingPayout: oldPayout,
        newPricingPayout: newPayout,
        rushFeePayout: rushFeePayoutComputed,
        rushFeeQuantity: rushQty,
        rushFeeRateUsed,
        voiceoverPayout,
        voiceoverRateUsed,
        message: "Casey has two rates: Old (72%) & New (70%). Select rate to finalize.",
      };
    }
  }

  if (defaultRate === null) {
    const catOrSub = canonicalSubtypeId || breakdown?.canonical_subtype_id;
    const formType = breakdown?.form_type || options?.formType;
    const resolved = getProducerCategoryRate(producer, catOrSub, formType);
    defaultRate = resolved.rate;
    source = resolved.source;
  }

  if (defaultRate === null) {
    const catOrSub = canonicalSubtypeId || breakdown?.canonical_subtype_id || breakdown?.form_type || options?.formType || "this order";
    const rawFormType = breakdown?.form_type || options?.formType || undefined;
    const categoryName = orderCategoryToProducerCategory(rawFormType, canonicalSubtypeId || undefined, catOrSub || undefined) || catOrSub;
    return {
      status: "needs_manual_review",
      producerPayout: manualPayoutInput,
      sltPortion: manualPayoutInput !== null ? Math.max(0, payrollBase - manualPayoutInput) : null,
      rateUsed: null,
      rateSource: "no_rate_configured",
      isCaseyAmbiguous: false,
      message: `Compensation percentage is not configured for ${producer.name} on category "${categoryName}". Please configure it in Settings → Producers.`,
    };
  }

  const normalizedCategoryRate = defaultRate > 1 ? defaultRate / 100 : defaultRate;
  const categoryPayout = Math.round(basePackagePayrollPrice * normalizedCategoryRate * 100) / 100;
  const payout = Math.round((categoryPayout + rushFeePayout + voiceoverPayout) * 100) / 100;
  const slt = Math.round((payrollBase - payout) * 100) / 100;
  const addonsInPayout = rushFeePayout > 0 || voiceoverPayout > 0;

  return {
    status: "computed",
    producerPayout: payout,
    sltPortion: slt,
    rateUsed: defaultRate,
    rateSource: source,
    isCaseyAmbiguous: isCasey && selectedRate === null,
    oldPricingPayout: oldPayout,
    newPricingPayout: newPayout,
    categoryPayout,
    rushFeePayout: rushFeePayoutComputed,
    rushFeeQuantity: rushQty,
    rushFeeRateUsed,
    voiceoverPayout,
    voiceoverRateUsed,
    message: addonsInPayout
      ? `Payout: $${payout.toFixed(2)} (${Number((normalizedCategoryRate * 100).toFixed(4))}% base + addons)`
      : `Payout: $${payout.toFixed(2)} (${Number((normalizedCategoryRate * 100).toFixed(4))}%)`,
  };
}
