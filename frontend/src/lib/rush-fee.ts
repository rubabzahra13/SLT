import type { PayrollAddon } from "@/types";
import { SPORTS_ENTERTAINMENT_CUSTOMER_RUSH_FEE } from "@/lib/pricing-engine";

/** Default customer rush fee when the row has no stored unit amount. */
export const DEFAULT_RUSH_FEE_UNIT = 150;

export const MAX_RUSH_FEE_QUANTITY = 100;

/** Standard admin choices, as whole percents. Producer-specific rates are added beside these. */
export const STANDARD_RUSH_COMPENSATION_PERCENTS = [100, 72, 60, 50] as const;

export type RushRateSource = "producer" | "override" | "unset";

export type RushFeeSelection = {
  quantity: number;
  unitAmount: number;
  /** Customer rush fee: unit × quantity. Not added to the package price. */
  total: number;
  /** Fraction (0.93 = 93%), or null when nobody has configured a rate. */
  rate: number | null;
  rateSource: RushRateSource;
  /** Producer share of `total`. Zero when the rate is unset — never a silent 100%. */
  compensation: number;
  overridden: boolean;
};

export type RushFeeAddonInput = {
  amount: number;
  quantity?: number | null;
  unitAmount?: number | null;
  compensationRate?: number | null;
  compensationOverridden?: boolean;
  producerId?: string | null;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Canonical rates are fractions. Values above 1 are percents (93 → 0.93).
 * 1 stays 1 (100%), so a stored 0.93 is never treated as 0.93% or scaled twice.
 */
export function normalizeCompensationFraction(
  rate: number | null | undefined
): number | null {
  if (rate == null || Number.isNaN(rate)) return null;
  if (rate < 0) return null;
  if (rate > 100) return null;
  if (rate > 1) return Math.round((rate / 100) * 10000) / 10000;
  return Math.round(rate * 10000) / 10000;
}

export function formatCompensationPercent(rate: number): string {
  const fraction = normalizeCompensationFraction(rate);
  if (fraction == null) return "—";
  const pct = Math.round(fraction * 10000) / 100;
  const label = Number.isInteger(pct) ? String(pct) : String(Number(pct.toFixed(2)));
  return `${label}%`;
}

export function compensationRatesEqual(
  left: number | null | undefined,
  right: number | null | undefined
): boolean {
  const a = normalizeCompensationFraction(left);
  const b = normalizeCompensationFraction(right);
  if (a == null || b == null) return false;
  return Math.abs(a - b) < 0.0001;
}

export function rushCustomerTotal(unitAmount: number, quantity: number): number {
  return roundMoney(unitAmount * quantity);
}

export function rushFeeCompensation(
  unitAmount: number,
  quantity: number,
  rate: number | null | undefined
): number {
  const fraction = normalizeCompensationFraction(rate);
  if (fraction == null || quantity <= 0) return 0;
  return roundMoney(rushCustomerTotal(unitAmount, quantity) * fraction);
}

export function rushCompensationChoices(
  selected: number | null | undefined,
  producerRate: number | null | undefined
): number[] {
  const values = new Map<string, number>();
  const add = (raw: number | null | undefined) => {
    const fraction = normalizeCompensationFraction(raw);
    if (fraction == null) return;
    values.set(fraction.toFixed(4), fraction);
  };
  for (const pct of STANDARD_RUSH_COMPENSATION_PERCENTS) add(pct / 100);
  add(producerRate);
  add(selected);
  return [...values.values()].sort((a, b) => b - a);
}

function inferQuantityAndUnit(addon: RushFeeAddonInput | null): {
  quantity: number;
  unitAmount: number;
} {
  if (!addon) return { quantity: 0, unitAmount: DEFAULT_RUSH_FEE_UNIT };

  const quantity = addon.quantity;
  const unit = addon.unitAmount;
  if (
    typeof quantity === "number" &&
    quantity >= 0 &&
    typeof unit === "number" &&
    unit > 0
  ) {
    return { quantity, unitAmount: unit };
  }

  const amount = Number(addon.amount);
  if (typeof quantity === "number" && quantity > 0 && amount > 0) {
    return { quantity, unitAmount: roundMoney(amount / quantity) };
  }

  if (amount > 0 && amount % DEFAULT_RUSH_FEE_UNIT === 0) {
    const qty = amount / DEFAULT_RUSH_FEE_UNIT;
    if (qty >= 1 && qty <= MAX_RUSH_FEE_QUANTITY) {
      return { quantity: qty, unitAmount: DEFAULT_RUSH_FEE_UNIT };
    }
  }

  if (amount > 0) return { quantity: 1, unitAmount: amount };
  return { quantity: 1, unitAmount: DEFAULT_RUSH_FEE_UNIT };
}

function overrideApplies(
  addon: RushFeeAddonInput | null,
  assignedProducerId: string | null | undefined
): boolean {
  if (!addon?.compensationOverridden) return false;
  if (normalizeCompensationFraction(addon.compensationRate) == null) return false;
  const savedProducer = addon.producerId ? String(addon.producerId) : "";
  const assigned = assignedProducerId ? String(assignedProducerId) : "";
  if (savedProducer && assigned && savedProducer !== assigned) return false;
  return true;
}

/**
 * Resolve the rush fee for one payroll row.
 * Rush Order Yes only gates the controls — it does NOT invent a $150 fee.
 * Quantity stays 0 until a saved addon exists or the admin picks 1x/2x/+.
 * The producer rate is the default. A saved override is used only while the
 * same producer is still assigned. Non-rush rows contribute nothing.
 */
export function resolveRushFeeSelection(input: {
  isRush: boolean;
  producerRate?: number | null;
  producerId?: string | null;
  addon?: RushFeeAddonInput | null;
}): RushFeeSelection {
  if (!input.isRush) {
    return {
      quantity: 0,
      unitAmount: DEFAULT_RUSH_FEE_UNIT,
      total: 0,
      rate: null,
      rateSource: "unset",
      compensation: 0,
      overridden: false,
    };
  }

  const { quantity, unitAmount } = inferQuantityAndUnit(input.addon ?? null);
  const producerRate = normalizeCompensationFraction(input.producerRate);
  const overridden = overrideApplies(input.addon ?? null, input.producerId);
  // Only expose a rate once an amount is chosen — avoids showing 100% on an unset fee.
  const rate =
    quantity < 1
      ? null
      : overridden
        ? normalizeCompensationFraction(input.addon?.compensationRate)
        : producerRate;
  const rateSource: RushRateSource =
    quantity < 1
      ? "unset"
      : overridden
        ? "override"
        : producerRate != null
          ? "producer"
          : "unset";

  return {
    quantity,
    unitAmount,
    total: rushCustomerTotal(unitAmount, quantity),
    rate,
    rateSource,
    compensation: rushFeeCompensation(unitAmount, quantity, rate),
    overridden: quantity >= 1 && overridden,
  };
}

function rushAddonMatchesRecord(
  addon: PayrollAddon,
  recordId: string,
  orderId: string | null | undefined
): boolean {
  if (addon.addonType !== "rush_fee") return false;
  if (addon.mtdId != null && String(addon.mtdId) === String(recordId)) return true;
  return (
    orderId != null &&
    addon.orderId != null &&
    String(addon.orderId) === String(orderId)
  );
}

/** Higher means this row should win when duplicates exist for one payroll record. */
function rushAddonRank(addon: PayrollAddon): number {
  let rank = 0;
  if (addon.compensationOverridden && addon.compensationRate != null) rank += 100;
  if (typeof addon.quantity === "number") rank += 10;
  if (typeof addon.unitAmount === "number" && addon.unitAmount > 0) rank += 1;
  return rank;
}

export function rushFeeAddonsForRecord(
  recordId: string,
  orderId: string | null | undefined,
  addons: PayrollAddon[]
): PayrollAddon[] {
  return addons.filter((addon) => rushAddonMatchesRecord(addon, recordId, orderId));
}

export function rushFeeAddonForRecord(
  recordId: string,
  orderId: string | null | undefined,
  addons: PayrollAddon[]
): PayrollAddon | null {
  const matches = rushFeeAddonsForRecord(recordId, orderId, addons);
  if (matches.length === 0) return null;
  return matches.reduce((best, addon) => {
    const rankDiff = rushAddonRank(addon) - rushAddonRank(best);
    if (rankDiff !== 0) return rankDiff > 0 ? addon : best;
    const addonTime = Date.parse(addon.createdAt || "") || 0;
    const bestTime = Date.parse(best.createdAt || "") || 0;
    return addonTime >= bestTime ? addon : best;
  });
}

/**
 * Add rush compensation to the existing base payout exactly once.
 * Producers who are not paid for mixing stay at their base (usually $0).
 */
export function finalizeMixPayout(
  basePayout: number | null | undefined,
  payrollStatus: string | null | undefined,
  rush: RushFeeSelection
): number | null {
  if (basePayout == null || Number.isNaN(basePayout)) return null;
  if (payrollStatus === "not_paid_for_mixing") return basePayout;
  if (rush.quantity <= 0 || rush.compensation === 0) return basePayout;
  return roundMoney(basePayout + rush.compensation);
}

export type SportsEntertainmentIncludedRush = {
  /** Customer Magento rush baked into payroll base ($100 when applied). */
  feeAmount: number;
  /** Producer share of that fee via package compensation % (informational). */
  compensation: number;
  /** Fraction used for compensation (e.g. 0.55). */
  rate: number;
};

function isSportsEntertainmentForm(
  formType?: string | null,
  category?: string | null
): boolean {
  const form = String(formType || "").toLowerCase();
  if (form === "sports-entertainment" || form.includes("sports")) return true;
  return String(category || "").toLowerCase().includes("sports");
}

/**
 * Derive the Magento SE rush dollars already inside finalized payroll price.
 * Prefer payroll − customer when both exist and rush is Yes; else the flat $100.
 * Never invent a fee when Rush Order is No or the form is not SE.
 */
export function sportsEntertainmentIncludedRushFeeAmount(input: {
  isRush: boolean;
  formType?: string | null;
  category?: string | null;
  finalCustomerPrice?: number | null;
  finalPayrollPrice?: number | null;
}): number {
  if (!input.isRush) return 0;
  if (!isSportsEntertainmentForm(input.formType, input.category)) return 0;

  const cust = input.finalCustomerPrice;
  const pay = input.finalPayrollPrice;
  if (
    typeof cust === "number" &&
    !Number.isNaN(cust) &&
    typeof pay === "number" &&
    !Number.isNaN(pay) &&
    pay > cust
  ) {
    const delta = roundMoney(pay - cust);
    // SE engine only adds the flat Magento rush to payroll vs customer.
    if (delta > 0 && delta <= SPORTS_ENTERTAINMENT_CUSTOMER_RUSH_FEE + 0.009) {
      return delta;
    }
    // Admin raised payroll further — still attribute at most the Magento $100.
    if (delta > SPORTS_ENTERTAINMENT_CUSTOMER_RUSH_FEE) {
      return SPORTS_ENTERTAINMENT_CUSTOMER_RUSH_FEE;
    }
  }

  return SPORTS_ENTERTAINMENT_CUSTOMER_RUSH_FEE;
}

/**
 * Informational SE Magento rush compensation already inside producer payout
 * ($100 × producer rushFeeRate). Not a Rushby add-on — do not add again.
 */
export function sportsEntertainmentIncludedRushCompensation(input: {
  isRush: boolean;
  formType?: string | null;
  category?: string | null;
  finalCustomerPrice?: number | null;
  finalPayrollPrice?: number | null;
  /**
   * Producer rush fee compensation fraction or percent (producer.rushFeeRate).
   * Not the Sports Entertainment category package rate.
   */
  rushFeeRate?: number | null;
  /** @deprecated Use rushFeeRate — kept for older call sites. */
  packageRate?: number | null;
}): SportsEntertainmentIncludedRush | null {
  const feeAmount = sportsEntertainmentIncludedRushFeeAmount(input);
  if (feeAmount <= 0) return null;
  const rate = normalizeCompensationFraction(
    input.rushFeeRate ?? input.packageRate
  );
  if (rate == null) return null;
  return {
    feeAmount,
    rate,
    compensation: roundMoney(feeAmount * rate),
  };
}
