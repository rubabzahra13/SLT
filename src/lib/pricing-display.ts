import type { Producer } from "@/types";
import type { PricingBreakdown } from "./api/pricing";
import { orderCategoryToProducerCategory } from "./editor-assignment";

export function getFormTypeLabel(formType?: string): string {
  switch (formType) {
    case "school-all-star-cheer":
      return "School / All-Star Cheer";
    case "school-all-star-dance":
      return "School / All-Star Dance";
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
    case "school-cheer":
    case "school-cheer-viroc-yes":
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
  message: string;
}

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

  // Fallback to producer.defaultRate if present
  if (producer.defaultRate !== undefined && producer.defaultRate !== null) {
    const raw = producer.defaultRate;
    return {
      rate: raw > 1 ? raw / 100 : raw,
      source: "default_rate",
      categoryName: categoryName || categoryOrSubtype || "",
    };
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
  finalPayrollPriceOverride?: number | null
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

  // Determine initial rate if none selected
  let defaultRate: number | null = selectedRate;
  let source = "manual_override";
  let isCasey = false;
  let oldPayout: number | undefined;
  let newPayout: number | undefined;

  if (producer.initials === "CM" || (producer.rateOverrides?.old_pricing && producer.rateOverrides?.new_pricing)) {
    isCasey = true;
    const oldRate = producer.rateOverrides?.old_pricing ?? 0.72;
    const newRate = producer.rateOverrides?.new_pricing ?? 0.70;
    oldPayout = Math.round(payrollBase * oldRate * 100) / 100;
    newPayout = Math.round(payrollBase * newRate * 100) / 100;

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
        message: "Casey has two rates: Old (72%) & New (70%). Select rate to finalize.",
      };
    }
  }

  if (defaultRate === null) {
    const catOrSub = canonicalSubtypeId || breakdown?.canonical_subtype_id;
    const formType = breakdown?.form_type;
    const resolved = getProducerCategoryRate(producer, catOrSub, formType);
    defaultRate = resolved.rate;
    source = resolved.source;
  }

  if (defaultRate === null) {
    const catOrSub = canonicalSubtypeId || breakdown?.canonical_subtype_id || breakdown?.form_type || "this order";
    const categoryName = orderCategoryToProducerCategory(breakdown?.form_type, canonicalSubtypeId || undefined, catOrSub || undefined) || catOrSub;
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

  const payout = Math.round(payrollBase * defaultRate * 100) / 100;
  const slt = Math.round((payrollBase - payout) * 100) / 100;

  return {
    status: "computed",
    producerPayout: payout,
    sltPortion: slt,
    rateUsed: defaultRate,
    rateSource: source,
    isCaseyAmbiguous: isCasey && selectedRate === null,
    oldPricingPayout: oldPayout,
    newPricingPayout: newPayout,
    message: `Payout: $${payout.toFixed(2)} (${(defaultRate * 100).toFixed(0)}%) · SLT: $${slt.toFixed(2)}`,
  };
}
