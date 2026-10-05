import {
  calculateCheerOrderPricing,
  calculateDanceOrderPricing,
  calculateMarchingBandOrderPricing,
  calculateSchoolAnthemOrderPricing,
  calculateSportsEntertainmentOrderPricing,
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

/** Shared fields every category engine returns that live pricing needs. */
type EnginePriceResult = {
  customerFacingPrice: number | null;
  payrollBasePrice: number | null;
  complianceStatus?: string | null;
};

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

function normalizeFlatPackageQuery(value: string): string {
  return value
    .toUpperCase()
    .replace(/\$[\d,]+(?:\.\d+)?/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function flatPackageCompatible(query: string, pkg: string): boolean {
  if (query === pkg) return true;
  // Prevent Fight Song Plus from matching Fight Song / Fight Song Original.
  const queryPlus = /\bPLUS\b/.test(query);
  const pkgPlus = /\bPLUS\b/.test(pkg);
  if (queryPlus !== pkgPlus) return false;
  const queryOriginal = /\bORIGINAL\b/.test(query);
  const pkgOriginal = /\bORIGINAL\b/.test(pkg);
  if (queryPlus && pkgOriginal) return false;
  if (pkgPlus && queryOriginal) return false;
  return query.includes(pkg) || pkg.includes(query);
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
  const upperPkg = normalizeFlatPackageQuery(fullPkg);

  for (const row of rows) {
    if (row.kind === "tier-time") {
      if (row.tier.toUpperCase() === tier && row.limit === limit) return row;
    }
  }

  // Exact flat-package match first (dropdown names are fixed).
  for (const row of rows) {
    if (row.kind !== "flat-package") continue;
    if (normalizeFlatPackageQuery(row.package) === upperPkg) return row;
  }

  // Longest compatible contains-match; never prefer a shorter ORIGINAL over PLUS.
  let best: PricingReferenceRow | null = null;
  let bestLen = -1;
  for (const row of rows) {
    if (row.kind !== "flat-package") continue;
    const pkg = normalizeFlatPackageQuery(row.package);
    if (!flatPackageCompatible(upperPkg, pkg)) continue;
    if (pkg.length > bestLen) {
      best = row;
      bestLen = pkg.length;
    }
  }
  if (best) return best;

  for (const row of rows) {
    if (row.kind === "tier-time" && row.tier.toUpperCase() === tier) return row;
  }
  return null;
}

function runEngine(
  rec: MTDRecord,
  order: Order | null | undefined,
  meta: MTDFormMeta
): EnginePriceResult | null {
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
 * rate-card engine (compliant/non-compliant by music affiliate). Customer
 * package-price overrides affect customerPrice only — not payroll/cost.
 */
export function resolveLiveOrderPricing(
  rec: MTDRecord,
  order: Order | null | undefined,
  meta?: MTDFormMeta | null,
  orderById?: Map<string, Order>,
  referenceStore?: PricingReferenceStore
): LiveOrderPricing {
  let formMeta = meta ?? null;
  if (!formMeta && orderById) {
    formMeta = resolveMTDFormMeta(rec, orderById);
  } else if (!formMeta && order) {
    const fallback = new Map<string, Order>();
    fallback.set(order.id, order);
    if (rec.orderId) fallback.set(rec.orderId, order);
    if (rec.id) fallback.set(rec.id, order);
    formMeta = resolveMTDFormMeta(rec, fallback);
  }

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
        // alwaysFixed (Fight Song / Alma Mater): both columns are the flat amount.
        const useNonCompliant =
          !row.alwaysFixedPayroll &&
          engine?.complianceStatus === "non-compliant";
        const payrollCol = useNonCompliant ? row.nonCompliant : row.compliant;
        if (typeof payrollCol === "number") enginePayroll = payrollCol;
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

  // Payroll/cost always follow Pricing Reference compliant vs non-compliant
  // columns for the order's music affiliate + package — never the edited
  // customer package price. (Customer override only affects customerPrice.)
  const payrollPrice =
    enginePayroll && enginePayroll > 0
      ? enginePayroll
      : (order?.finalPayrollPrice ??
        rec.finalPayrollPrice ??
        customerPrice);

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
 * Package amount the Orders/MTD price chip shows — same as Pricing modal
 * PACKAGE PRICE for the package/tier (live rate card). Per-order overrides
 * are ignored so the board stays in sync with Pricing edits.
 */
export function resolveOrderPackageDisplayPrice(
  rec: MTDRecord,
  order: Order | null | undefined,
  meta?: MTDFormMeta | null,
  orderById?: Map<string, Order>
): number {
  const live = resolveLiveOrderPricing(rec, order, meta, orderById);
  if (live.engineCustomerPrice != null && live.engineCustomerPrice > 0) {
    return live.engineCustomerPrice;
  }
  return live.customerPrice;
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
  const live = resolveLiveOrderPricing(rec, order, meta, orderById);
  const engine = live.engineCustomerPrice;
  const overridden =
    engine == null || Math.round(price * 100) !== Math.round(engine * 100);
  // Package-chip edits update customer price only. Payroll stays the live
  // compliant/non-compliant rate-card amount for cost math.
  const finalPayrollPrice = live.enginePayrollPrice ?? price;
  return {
    price,
    priceCompliance,
    finalCustomerPrice: price,
    finalCustomerPriceOverridden: overridden,
    finalPayrollPrice,
  };
}
