import {
  calculateCheerOrderPricing,
  calculateDanceOrderPricing,
  calculateMarchingBandOrderPricing,
  calculateSchoolAnthemOrderPricing,
  calculateSportsEntertainmentOrderPricing,
  type PricingEngineResult,
} from "@/lib/pricing-engine";
import { resolveMTDFormMeta, type MTDFormMeta } from "@/lib/mtd-filters";
import {
  getCategoryPricingSnapshot,
  loadPricingReferenceStore,
  type CategoryKey,
  type PricingReferenceRow,
  type PricingReferenceStore,
} from "@/lib/pricing-reference";
import { parsePackage } from "@/lib/package";
import type { MTDRecord, Order, PriceCompliance } from "@/types";

export const PRICING_REFERENCE_CHANGED_EVENT = "slt-pricing-reference-changed";

function categoryKeyForMeta(meta: MTDFormMeta): CategoryKey {
  if (meta.formType === "school-all-star-dance") {
    switch (meta.danceFormSubtype) {
      case "hip-hop":
        return "Hip Hop";
      case "team-performance-variety":
        return "Team Performance & Variety";
      case "gameday":
        return "Gameday";
      case "jazz-kick":
        return "Jazz/Kick";
      case "pom":
      default:
        return "Pom";
    }
  }
  if (meta.formType === "marching-band") return "Marching Band";
  if (meta.formType === "sports-entertainment") return "Sports Entertainment";
  if (meta.formType === "school-anthem") return "School Anthems";
  if (meta.cheerFormSubtype === "youth-rec-cheer") return "Youth Rec Cheer";
  if (
    meta.cheerFormSubtype === "school-cheer-viroc-yes" ||
    meta.cheerFormSubtype === "school-cheer-viroc-no"
  ) {
    return "School Cheer";
  }
  return "All-Star Cheer";
}

function findReferenceRow(
  rows: PricingReferenceRow[],
  packageType: string,
  timeLengthOfMix?: string | null
): PricingReferenceRow | null {
  const fullPkg = [packageType, timeLengthOfMix].filter(Boolean).join(" ");
  const parsed = parsePackage(fullPkg);
  const tier = parsed.tier.toUpperCase().replace(/\s+PACKAGE$/i, "").trim();
  let limit = parsed.limit.trim();
  if (limit === "-" && timeLengthOfMix?.trim()) limit = timeLengthOfMix.trim();
  const upperPkg = fullPkg.toUpperCase();

  for (const row of rows) {
    if (row.kind === "tier-time") {
      if (row.tier.toUpperCase() === tier && row.limit === limit) return row;
    } else {
      const pkg = row.package.toUpperCase();
      if (pkg === upperPkg || upperPkg.includes(pkg) || pkg.includes(upperPkg)) {
        return row;
      }
    }
  }
  for (const row of rows) {
    if (row.kind === "tier-time" && row.tier.toUpperCase() === tier) return row;
  }
  return null;
}

function runEngine(
  rec: MTDRecord,
  order: Order | null | undefined,
  meta: MTDFormMeta
): PricingEngineResult | null {
  const packageType = order?.packageType || rec.package;
  if (meta.formType === "school-all-star-dance") {
    return calculateDanceOrderPricing({
      danceFormSubtype: meta.danceFormSubtype,
      packageType,
      musicAffiliate: order?.musicAffiliate,
      hasTraditionalVoiceover: rec.hasTraditionalVoiceover,
      hasThemedVoiceover: rec.hasThemedVoiceover,
    });
  }
  if (meta.formType === "marching-band") {
    return calculateMarchingBandOrderPricing({
      packageType,
      musicAffiliate: order?.musicAffiliate,
      hasSheetMusicAdd: rec.hasSheetMusicAdd,
      hasAddVocals: rec.hasAddVocals,
    });
  }
  if (meta.formType === "sports-entertainment") {
    return calculateSportsEntertainmentOrderPricing({
      packageType,
      isRushOrder:
        rec.isRushOrder ??
        (order as Order & { isRushOrder?: boolean })?.isRushOrder,
    });
  }
  if (meta.formType === "school-anthem") {
    return calculateSchoolAnthemOrderPricing({ packageType });
  }
  return calculateCheerOrderPricing({
    cheerFormSubtype: meta.cheerFormSubtype,
    packageType,
    timeLengthOfMix: order?.timeLengthOfMix,
    musicAffiliate: order?.musicAffiliate,
    hasRallyMix: rec.hasRallyMix,
    hasExtend8ctAddon: rec.hasExtend8ctAddon,
    hasProcessing8ctSheetsAddon: rec.hasProcessing8ctSheetsAddon,
  });
}

export type LiveOrderPricing = {
  customerPrice: number;
  payrollPrice: number;
  engineCustomerPrice: number | null;
  enginePayrollPrice: number | null;
  isOverridden: boolean;
};

/**
 * Live customer + payroll package amounts: Pricing Reference overlay on the
 * rate-card engine, then Orders price overrides when present.
 */
export function resolveLiveOrderPricing(
  rec: MTDRecord,
  order: Order | null | undefined,
  meta?: MTDFormMeta | null,
  orderById?: Map<string, Order>,
  referenceStore?: PricingReferenceStore
): LiveOrderPricing {
  const formMeta =
    meta ?? (orderById ? resolveMTDFormMeta(rec, orderById) : null);

  let engineCustomer: number | null = null;
  let enginePayroll: number | null = null;

  if (formMeta) {
    const engine = runEngine(rec, order, formMeta);
    if (engine) {
      engineCustomer =
        typeof engine.customerFacingPrice === "number"
          ? engine.customerFacingPrice
          : null;
      enginePayroll =
        typeof engine.payrollBasePrice === "number"
          ? engine.payrollBasePrice
          : null;
    }

    const store = referenceStore ?? loadPricingReferenceStore();
    const snapshot = getCategoryPricingSnapshot(
      categoryKeyForMeta(formMeta),
      store
    );
    const row = findReferenceRow(
      snapshot.rows,
      order?.packageType || rec.package || "",
      order?.timeLengthOfMix
    );
    if (row) {
      if (row.kind === "tier-time") {
        engineCustomer = row.customer;
        const compliant =
          engine?.complianceStatus === "non-compliant"
            ? row.nonCompliant
            : row.compliant;
        enginePayroll = row.isTitanium ? row.customer : compliant;
      } else if (row.customer != null) {
        engineCustomer = row.customer;
        const compliant =
          engine?.complianceStatus === "non-compliant"
            ? row.nonCompliant
            : row.compliant;
        if (typeof compliant === "number") enginePayroll = compliant;
        else enginePayroll = row.customer;
      }
    }
  }

  const isOverridden = Boolean(
    order?.finalCustomerPriceOverridden ?? rec.finalCustomerPriceOverridden
  );

  const customerPrice = isOverridden
    ? (order?.finalCustomerPrice ??
      rec.finalCustomerPrice ??
      engineCustomer ??
      order?.price ??
      rec.price ??
      0)
    : engineCustomer && engineCustomer > 0
      ? engineCustomer
      : (order?.finalCustomerPrice ?? order?.price ?? rec.price ?? 0);

  const payrollPrice =
    order?.finalPayrollPrice ??
    rec.finalPayrollPrice ??
    (isOverridden
      ? customerPrice
      : enginePayroll && enginePayroll > 0
        ? enginePayroll
        : customerPrice);

  return {
    customerPrice,
    payrollPrice,
    engineCustomerPrice: engineCustomer,
    enginePayrollPrice: enginePayroll,
    isOverridden,
  };
}

/** Live pricing-engine customer price for an Orders/MTD row (ignores overrides). */
export function resolveEngineCustomerPrice(
  rec: MTDRecord,
  order: Order | null | undefined,
  meta?: MTDFormMeta | null,
  orderById?: Map<string, Order>
): number | null {
  return resolveLiveOrderPricing(rec, order, meta, orderById).engineCustomerPrice;
}

/**
 * Same package amount the Orders price chip shows: overridden final price when
 * set, otherwise the live engine/reference price, else stored record/order price.
 */
export function resolveOrderPackageDisplayPrice(
  rec: MTDRecord,
  order: Order | null | undefined,
  meta?: MTDFormMeta | null,
  orderById?: Map<string, Order>
): number {
  return resolveLiveOrderPricing(rec, order, meta, orderById).customerPrice;
}

/** Patch written when editing the Orders/MTD package-price chip. */
export function buildRecordPriceSavePatch(
  rec: MTDRecord,
  order: Order | null | undefined,
  price: number,
  priceCompliance: PriceCompliance,
  meta?: MTDFormMeta | null,
  orderById?: Map<string, Order>
): {
  price: number;
  priceCompliance: PriceCompliance;
  finalCustomerPrice: number;
  finalCustomerPriceOverridden: boolean;
  finalPayrollPrice: number;
} {
  const engine = resolveEngineCustomerPrice(rec, order, meta, orderById);
  const overridden =
    engine == null || Math.round(price * 100) !== Math.round(engine * 100);
  return {
    price,
    priceCompliance,
    finalCustomerPrice: price,
    finalCustomerPriceOverridden: overridden,
    finalPayrollPrice: price,
  };
}
