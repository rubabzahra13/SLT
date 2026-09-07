import type { CheerFormSubtype, DiscountCode } from "../types";
import { parsePackage } from "./package";

export type ComplianceStatus =
  | "compliant"
  | "non-compliant"
  | "unknown-no-affiliate-field";

export type RateCardEntry = {
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "TITANIUM";
  limit: string; // e.g. "1:00", "1:30", "1:45", "2:00", "2:15", "2:30"
  customer: number;
  compliant: number;
  nonCompliant: number;
  isTitanium: boolean;
};

/** All-Star Cheer Pricing Table (Customer, Compliant, Non-Compliant) */
export const ALL_STAR_CHEER_RATE_CARD: RateCardEntry[] = [
  { tier: "GOLD", limit: "1:30", customer: 700, compliant: 600, nonCompliant: 700, isTitanium: false },
  { tier: "GOLD", limit: "2:00", customer: 950, compliant: 850, nonCompliant: 950, isTitanium: false },
  { tier: "GOLD", limit: "2:30", customer: 1100, compliant: 1000, nonCompliant: 1100, isTitanium: false },
  { tier: "PLATINUM", limit: "1:30", customer: 1050, compliant: 850, nonCompliant: 1050, isTitanium: false },
  { tier: "PLATINUM", limit: "2:00", customer: 1350, compliant: 1150, nonCompliant: 1350, isTitanium: false },
  { tier: "PLATINUM", limit: "2:30", customer: 1600, compliant: 1400, nonCompliant: 1600, isTitanium: false },
  { tier: "TITANIUM", limit: "1:30", customer: 1800, compliant: 1800, nonCompliant: 1800, isTitanium: true },
  { tier: "TITANIUM", limit: "2:00", customer: 2300, compliant: 2300, nonCompliant: 2300, isTitanium: true },
  { tier: "TITANIUM", limit: "2:30", customer: 2800, compliant: 2800, nonCompliant: 2800, isTitanium: true },
];

/** School Cheer Pricing Table (identical for VIROC Yes and VIROC No) */
export const SCHOOL_CHEER_RATE_CARD: RateCardEntry[] = [
  { tier: "SILVER", limit: "1:00", customer: 450, compliant: 350, nonCompliant: 450, isTitanium: false },
  { tier: "SILVER", limit: "1:30", customer: 570, compliant: 470, nonCompliant: 570, isTitanium: false },
  { tier: "SILVER", limit: "1:45", customer: 650, compliant: 550, nonCompliant: 650, isTitanium: false },
  { tier: "SILVER", limit: "2:00", customer: 750, compliant: 650, nonCompliant: 750, isTitanium: false },
  { tier: "SILVER", limit: "2:15", customer: 900, compliant: 800, nonCompliant: 900, isTitanium: false },
  { tier: "SILVER", limit: "2:30", customer: 900, compliant: 800, nonCompliant: 900, isTitanium: false },
  { tier: "GOLD", limit: "1:00", customer: 570, compliant: 470, nonCompliant: 570, isTitanium: false },
  { tier: "GOLD", limit: "1:30", customer: 700, compliant: 600, nonCompliant: 700, isTitanium: false },
  { tier: "GOLD", limit: "1:45", customer: 800, compliant: 700, nonCompliant: 800, isTitanium: false },
  { tier: "GOLD", limit: "2:00", customer: 950, compliant: 850, nonCompliant: 950, isTitanium: false },
  { tier: "GOLD", limit: "2:15", customer: 1100, compliant: 1000, nonCompliant: 1100, isTitanium: false },
  { tier: "GOLD", limit: "2:30", customer: 1100, compliant: 1000, nonCompliant: 1100, isTitanium: false },
  { tier: "PLATINUM", limit: "1:00", customer: 800, compliant: 700, nonCompliant: 800, isTitanium: false },
  { tier: "PLATINUM", limit: "1:30", customer: 1050, compliant: 850, nonCompliant: 1050, isTitanium: false },
  { tier: "PLATINUM", limit: "1:45", customer: 1200, compliant: 1000, nonCompliant: 1200, isTitanium: false },
  { tier: "PLATINUM", limit: "2:00", customer: 1350, compliant: 1150, nonCompliant: 1350, isTitanium: false },
  { tier: "PLATINUM", limit: "2:15", customer: 1600, compliant: 1400, nonCompliant: 1600, isTitanium: false },
  { tier: "PLATINUM", limit: "2:30", customer: 1600, compliant: 1400, nonCompliant: 1600, isTitanium: false },
  { tier: "TITANIUM", limit: "1:00", customer: 1500, compliant: 1500, nonCompliant: 1500, isTitanium: true },
  { tier: "TITANIUM", limit: "1:30", customer: 1800, compliant: 1800, nonCompliant: 1800, isTitanium: true },
  { tier: "TITANIUM", limit: "1:45", customer: 2000, compliant: 2000, nonCompliant: 2000, isTitanium: true },
  { tier: "TITANIUM", limit: "2:00", customer: 2300, compliant: 2300, nonCompliant: 2300, isTitanium: true },
  { tier: "TITANIUM", limit: "2:15", customer: 2800, compliant: 2800, nonCompliant: 2800, isTitanium: true },
  { tier: "TITANIUM", limit: "2:30", customer: 2800, compliant: 2800, nonCompliant: 2800, isTitanium: true },
];

/** Youth Rec Cheer Pricing Table */
export const YOUTH_REC_CHEER_RATE_CARD: RateCardEntry[] = [
  { tier: "BRONZE", limit: "1:00", customer: 450, compliant: 350, nonCompliant: 450, isTitanium: false },
  { tier: "BRONZE", limit: "1:30", customer: 570, compliant: 470, nonCompliant: 570, isTitanium: false },
  { tier: "BRONZE", limit: "1:45", customer: 650, compliant: 550, nonCompliant: 650, isTitanium: false },
  { tier: "BRONZE", limit: "2:00", customer: 750, compliant: 650, nonCompliant: 750, isTitanium: false },
  { tier: "BRONZE", limit: "2:15", customer: 900, compliant: 800, nonCompliant: 900, isTitanium: false },
  { tier: "BRONZE", limit: "2:30", customer: 900, compliant: 800, nonCompliant: 900, isTitanium: false },
];

export const COMPLIANT_MUSIC_AFFILIATES = [
  "POWER MUSIC",
  "POWER MUSIC + UNLEASH THE BEATS",
  "UNLEASH THE BEATS",
  "LIBRARY MUSIC",
] as const;

export function getRateCardForSubtype(cheerFormSubtype: CheerFormSubtype): RateCardEntry[] {
  switch (cheerFormSubtype) {
    case "all-star-cheer":
      return ALL_STAR_CHEER_RATE_CARD;
    case "school-cheer-viroc-yes":
    case "school-cheer-viroc-no":
      return SCHOOL_CHEER_RATE_CARD;
    case "youth-rec-cheer":
      return YOUTH_REC_CHEER_RATE_CARD;
    default:
      return ALL_STAR_CHEER_RATE_CARD;
  }
}

export function determineComplianceStatus(
  cheerFormSubtype: CheerFormSubtype,
  musicAffiliate?: string
): ComplianceStatus {
  if (
    musicAffiliate === undefined ||
    musicAffiliate === null
  ) {
    return "unknown-no-affiliate-field";
  }

  const trimmed = musicAffiliate.trim();
  if (!trimmed) {
    return "unknown-no-affiliate-field";
  }

  const upper = trimmed.toUpperCase();

  const isCompliant =
    upper.includes("POWER MUSIC") ||
    upper.includes("UNLEASH THE BEATS") ||
    upper.includes("UNLEASH") ||
    upper.includes("LIBRARY MUSIC");

  return isCompliant ? "compliant" : "non-compliant";
}

export function lookupRateCardEntry(
  cheerFormSubtype: CheerFormSubtype,
  packageType: string,
  timeLengthOfMix?: string
): RateCardEntry | null {
  const rateCard = getRateCardForSubtype(cheerFormSubtype);
  const fullPkg = [packageType, timeLengthOfMix].filter(Boolean).join(" ");
  const parsed = parsePackage(fullPkg);

  let targetTier = parsed.tier.toUpperCase().replace(/\s+PACKAGE$/i, "").trim();
  let targetLimit = parsed.limit.trim();

  if (targetLimit === "-" && timeLengthOfMix?.trim()) {
    targetLimit = timeLengthOfMix.trim();
  }

  // Find exact match first
  let matched = rateCard.find(
    (entry) =>
      entry.tier.toUpperCase() === targetTier && entry.limit === targetLimit
  );

  if (matched) return matched;

  // Fallback: match by tier if limit isn't matched
  matched = rateCard.find((entry) => entry.tier.toUpperCase() === targetTier);
  if (matched) return matched;

  // Fallback 2: substring match on raw packageType
  const upperPkg = fullPkg.toUpperCase();
  matched = rateCard.find(
    (entry) => upperPkg.includes(entry.tier) && upperPkg.includes(entry.limit)
  );

  return matched ?? null;
}

export type PricingEngineInput = {
  cheerFormSubtype: CheerFormSubtype;
  packageType: string;
  timeLengthOfMix?: string;
  musicAffiliate?: string;
  hasRallyMix?: boolean;
  hasExtend8ctAddon?: boolean;
  hasProcessing8ctSheetsAddon?: boolean;
  couponCode?: string;
  discountCodeObj?: DiscountCode | null;
};

export type PricingEngineResult = {
  customerFacingPrice: number;
  payrollBasePrice: number;
  compliantPayrollBasePrice: number;
  nonCompliantPayrollBasePrice: number;
  complianceStatus: ComplianceStatus;
  isTitanium: boolean;
  matchedEntry: RateCardEntry | null;
  packageName: string;
  timeLengthOfMix: string;
  discountAmount: number;
  discountType?: "fixed" | "percentage";
  discountValue?: number;
  preDiscountPayrollBasePrice: number;
  preDiscountCustomerFacingPrice: number;
};

export function calculateCheerOrderPricing(
  input: PricingEngineInput
): PricingEngineResult {
  const matchedEntry = lookupRateCardEntry(
    input.cheerFormSubtype,
    input.packageType,
    input.timeLengthOfMix
  );

  const complianceStatus = determineComplianceStatus(
    input.cheerFormSubtype,
    input.musicAffiliate
  );

  if (!matchedEntry) {
    return {
      customerFacingPrice: 0,
      payrollBasePrice: 0,
      compliantPayrollBasePrice: 0,
      nonCompliantPayrollBasePrice: 0,
      complianceStatus,
      isTitanium: false,
      matchedEntry: null,
      packageName: input.packageType,
      timeLengthOfMix: input.timeLengthOfMix ?? "",
      discountAmount: 0,
      preDiscountPayrollBasePrice: 0,
      preDiscountCustomerFacingPrice: 0,
    };
  }

  let addOnTotal = 0;
  if (
    (input.cheerFormSubtype === "school-cheer-viroc-yes" ||
      input.cheerFormSubtype === "school-cheer-viroc-no") &&
    input.hasRallyMix
  ) {
    addOnTotal += 350;
  }

  if (input.cheerFormSubtype === "youth-rec-cheer") {
    if (input.hasExtend8ctAddon) addOnTotal += 25;
    if (input.hasProcessing8ctSheetsAddon) addOnTotal += 50;
  }

  const preDiscountCustomerFacingPrice = matchedEntry.customer + addOnTotal;
  const compliantPayrollBasePrice = matchedEntry.compliant + addOnTotal;
  const nonCompliantPayrollBasePrice = matchedEntry.nonCompliant + addOnTotal;

  let preDiscountPayrollBasePrice = compliantPayrollBasePrice;
  if (matchedEntry.isTitanium) {
    preDiscountPayrollBasePrice = compliantPayrollBasePrice;
  } else if (complianceStatus === "non-compliant") {
    preDiscountPayrollBasePrice = nonCompliantPayrollBasePrice;
  } else if (complianceStatus === "compliant" || complianceStatus === "unknown-no-affiliate-field") {
    preDiscountPayrollBasePrice = compliantPayrollBasePrice;
  }

  // Calculate discount based on discountCodeObj
  let discountAmount = 0;
  const discObj = input.discountCodeObj;
  if (discObj && discObj.discountType && typeof discObj.discountValue === "number" && discObj.discountValue > 0) {
    if (discObj.discountType === "fixed") {
      discountAmount = Math.min(preDiscountPayrollBasePrice, Math.max(0, discObj.discountValue));
    } else if (discObj.discountType === "percentage") {
      const percentage = Math.max(0, Math.min(100, discObj.discountValue));
      discountAmount = Math.min(preDiscountPayrollBasePrice, Math.round(preDiscountPayrollBasePrice * (percentage / 100)));
    }
  }

  const payrollBasePrice = Math.max(0, preDiscountPayrollBasePrice - discountAmount);
  const customerFacingPrice = Math.max(0, preDiscountCustomerFacingPrice - discountAmount);

  return {
    customerFacingPrice,
    payrollBasePrice,
    compliantPayrollBasePrice,
    nonCompliantPayrollBasePrice,
    complianceStatus,
    isTitanium: matchedEntry.isTitanium,
    matchedEntry,
    packageName: matchedEntry.tier,
    timeLengthOfMix: matchedEntry.limit,
    discountAmount,
    discountType: discObj?.discountType,
    discountValue: discObj?.discountValue,
    preDiscountPayrollBasePrice,
    preDiscountCustomerFacingPrice,
  };
}
