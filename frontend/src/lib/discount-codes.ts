import type { DiscountCode } from "../types";

export type CouponCodeMatchReason = "exact";

export type CouponCodeEvaluation = {
  status: "empty" | "matched" | "unmatched";
  match?: DiscountCode;
  reason?: CouponCodeMatchReason;
};

/** Trim + case-fold for comparison. Preserves the order's submitted value elsewhere. */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

export function normalizeDiscountCode(
  raw: Partial<DiscountCode> & { id: string }
): DiscountCode {
  return {
    id: raw.id,
    code: normalizeCouponCode(raw.code || ""),
  };
}

/**
 * Match an order coupon against configured codes.
 * Case-insensitive; leading/trailing whitespace ignored.
 * Does not rewrite or replace the submitted order value.
 */
export function evaluateCouponCode(
  input: string,
  discountCodes: DiscountCode[]
): CouponCodeEvaluation {
  const trimmed = input.trim();
  if (!trimmed) return { status: "empty" };

  const normalizedInput = normalizeCouponCode(trimmed);
  const match = discountCodes.find(
    (entry) => normalizeCouponCode(entry.code) === normalizedInput
  );
  if (match) {
    return { status: "matched", match, reason: "exact" };
  }
  return { status: "unmatched" };
}

export function lookupDiscountCode(
  code: string,
  discountCodes: DiscountCode[]
): DiscountCode | null {
  const evaluation = evaluateCouponCode(code, discountCodes);
  return evaluation.status === "matched" ? evaluation.match ?? null : null;
}

export function isValidDiscountCode(
  code: string,
  discountCodes: DiscountCode[]
): boolean {
  return evaluateCouponCode(code, discountCodes).status === "matched";
}

export function isDuplicateDiscountCode(
  code: string,
  discountCodes: DiscountCode[],
  excludeId?: string
): boolean {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return false;
  return discountCodes.some(
    (entry) =>
      entry.id !== excludeId && normalizeCouponCode(entry.code) === normalized
  );
}
