import {
  calculateCheerOrderPricing,
  calculateDanceOrderPricing,
  calculateMarchingBandOrderPricing,
  calculateSchoolAnthemOrderPricing,
  calculateSportsEntertainmentOrderPricing,
  isCheerOtherMixLength,
  isSchoolCheerSubtype,
  SPORTS_ENTERTAINMENT_CUSTOMER_RUSH_FEE,
} from "@/lib/pricing-engine";
import { recordIsRushOrder } from "@/lib/forward-order-mail";
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
  isUnpriced?: boolean;
};

/** Needs Quote chip: SE OTHER, SoftSelect Other mix, or mix length not on rate card. */
export function orderNeedsManualPackageQuote(
  meta: MTDFormMeta | null | undefined,
  order: Order | null | undefined,
  engine?: EnginePriceResult | null
): boolean {
  if (!meta) return false;
  if (engine?.isUnpriced) return true;
  if (meta.formType === "sports-entertainment") {
    return (
      engine?.customerFacingPrice == null ||
      (typeof engine.customerFacingPrice === "number" &&
        engine.customerFacingPrice <= 0)
    );
  }
  if (
    meta.formType === "school-all-star-cheer" &&
    (isSchoolCheerSubtype(meta.cheerFormSubtype) ||
      meta.cheerFormSubtype === "youth-rec-cheer") &&
    isCheerOtherMixLength(order?.timeLengthOfMix)
  ) {
    return true;
  }
  return false;
}

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
  if (!query || !pkg) return false;
  if (query === pkg) return true;
  // Prevent Fight Song Plus from matching Fight Song / Fight Song Original.
  const queryPlus = /\bPLUS\b/.test(query);
  const pkgPlus = /\bPLUS\b/.test(pkg);
  if (queryPlus !== pkgPlus) return false;
  const queryOriginal = /\bORIGINAL\b/.test(query);
  const pkgOriginal = /\bORIGINAL\b/.test(pkg);
  if (queryPlus && pkgOriginal) return false;
  if (pkgPlus && queryOriginal) return false;
  // Substring only when the shorter label is a real package phrase (≥ 8 chars).
  // Blocks subtype labels like "POM" from matching "CUSTOM POM" ($850).
  const shorter = query.length <= pkg.length ? query : pkg;
  const longer = query.length <= pkg.length ? pkg : query;
  if (shorter.length < 8) return false;
  return longer.includes(shorter);
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

/** Dance-only: $15/song + $30/editing-time unit (Cheer/MB ignore these). */
export function danceExtraSongsPayrollTotal(
  rec: Pick<MTDRecord, "extraSongsQuantity" | "extraSongEditingTimeQuantity">,
  order?: Pick<
    Order,
    "extraSongsQuantity" | "extraSongEditingTimeQuantity"
  > | null,
  formType?: string | null
): number {
  if (formType && formType !== "school-all-star-dance") return 0;
  const songs = Math.max(
    0,
    parseInt(
      String(rec.extraSongsQuantity ?? order?.extraSongsQuantity ?? 0),
      10
    ) || 0
  );
  const time = Math.max(
    0,
    parseInt(
      String(
        rec.extraSongEditingTimeQuantity ??
          order?.extraSongEditingTimeQuantity ??
          0
      ),
      10
    ) || 0
  );
  return songs * 15 + time * 30;
}

function runEngine(
  rec: MTDRecord,
  order: Order | null | undefined,
  meta: MTDFormMeta
): EnginePriceResult | null {
  const packageType = order?.packageType || rec.package;
  if (meta.formType === "school-all-star-dance") {
    // Rate-card only here — Extra Songs / Editing Time are layered once in
    // resolveLiveOrderPricing so Pricing Reference overlay cannot wipe them.
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
    const rushSource = {
      ...rec,
      ...(order || {}),
      formType: meta.formType,
      category: order?.category || rec.category,
      clientRequestedRushOrder:
        (order as Order & { clientRequestedRushOrder?: unknown })
          ?.clientRequestedRushOrder ??
        (rec as MTDRecord & { clientRequestedRushOrder?: unknown })
          .clientRequestedRushOrder,
      isRushOrder:
        order?.isRushOrder ??
        rec.isRushOrder ??
        (order as Order & { isRushOrder?: boolean })?.isRushOrder,
    };
    return calculateSportsEntertainmentOrderPricing({
      packageType,
      isRushOrder: recordIsRushOrder(rushSource) ? "yes" : "no",
      clientRequestedRushOrder: rushSource.clientRequestedRushOrder,
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
    hasRallyMix: order?.hasRallyMix,
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

    // SoftSelect "Other" / custom mix / unpriced engine → do not overlay rate-card prices.
    if (
      engine?.isUnpriced ||
      ((isSchoolCheerSubtype(formMeta.cheerFormSubtype) ||
        formMeta.cheerFormSubtype === "youth-rec-cheer") &&
        isCheerOtherMixLength(order?.timeLengthOfMix))
    ) {
      engineCustomer = null;
      enginePayroll = null;
    } else {
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
        if (row.kind === "tier-time" && !row.isUnpriced && row.customer != null) {
          engineCustomer = row.customer;
          const compliant =
            engine?.complianceStatus === "non-compliant"
              ? row.nonCompliant
              : row.compliant;
          enginePayroll = row.isTitanium ? row.customer : compliant;
        } else if (row.kind === "flat-package" && row.customer != null) {
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

      // SE Magento rush ($100) is payroll-only. Pricing Reference overlay sets
      // flat package amounts — re-apply customer rush on top of package payroll.
      if (
        formMeta.formType === "sports-entertainment" &&
        engineCustomer != null &&
        engineCustomer > 0
      ) {
        const rushYes = recordIsRushOrder({
          ...rec,
          ...(order || {}),
          formType: formMeta.formType,
          category: order?.category || rec.category,
          clientRequestedRushOrder:
            (order as Order & { clientRequestedRushOrder?: unknown })
              ?.clientRequestedRushOrder ??
            (rec as MTDRecord & { clientRequestedRushOrder?: unknown })
              .clientRequestedRushOrder,
          isRushOrder: order?.isRushOrder ?? rec.isRushOrder,
        });
        enginePayroll =
          engineCustomer +
          (rushYes ? SPORTS_ENTERTAINMENT_CUSTOMER_RUSH_FEE : 0);
      }
    }

    // Dance Extra Songs ($15) + Editing Time ($30) sit on top of the rate-card
    // payroll column. Applied once after overlay so reference edits cannot
    // drop them (and Cheer/MB misc already inside runEngine is not doubled).
    if (enginePayroll != null && enginePayroll > 0) {
      enginePayroll += danceExtraSongsPayrollTotal(
        rec,
        order,
        formMeta.formType
      );
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
  // Extras are already folded into enginePayroll above.
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
 * Customer package price for staging / MTD seed: prefer a positive stored
 * order/MTD price, else Pricing Reference / rate-card engine (pricing_rules).
 */
export function resolveStoredOrEngineCustomerPrice(
  order: Order,
  rec?: MTDRecord | null
): number {
  const stored =
    (typeof order.price === "number" && order.price > 0 ? order.price : null) ??
    (typeof rec?.price === "number" && rec.price > 0 ? rec.price : null);
  if (stored != null) return stored;

  const stub: MTDRecord = rec ?? {
    id: order.id,
    orderId: order.id,
    package: order.package || order.packageType || "",
    category: order.category || "",
    formType: order.formType,
    cheerFormSubtype: order.cheerFormSubtype,
    danceFormSubtype: order.danceFormSubtype,
    price: 0,
    priceCompliance:
      order.priceCompliance ||
      ("compliant" as PriceCompliance),
  } as MTDRecord;

  const live = resolveLiveOrderPricing(stub, order);
  if (live.engineCustomerPrice != null && live.engineCustomerPrice > 0) {
    return live.engineCustomerPrice;
  }
  return live.customerPrice > 0 ? live.customerPrice : 0;
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
