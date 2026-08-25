import type { DiscountCode } from "@/types";

export type CouponCodeMatchReason = "exact" | "spacing" | "typo";

export type CouponCodeSuggestion = {
  code: DiscountCode;
  reason: Exclude<CouponCodeMatchReason, "exact">;
};

export type CouponCodeEvaluation = {
  status: "empty" | "valid" | "potential" | "invalid";
  match?: DiscountCode;
  reason?: CouponCodeMatchReason;
  suggestions?: CouponCodeSuggestion[];
};

/** Uppercase and strip all whitespace for comparison. */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function normalizeDiscountCode(
  raw: Partial<DiscountCode> & { id: string }
): DiscountCode {
  return {
    id: raw.id,
    code: (raw.code || "").trim().toUpperCase(),
    description: (raw.description || "").trim(),
  };
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(0)
  );

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function maxTypoDistance(length: number): number {
  if (length <= 4) return 1;
  if (length <= 8) return 2;
  return 3;
}

function isSimilarTypo(input: string, candidate: string): boolean {
  if (!input || !candidate) return false;

  const distance = levenshtein(input, candidate);
  if (distance === 0) return false;

  const maxLen = Math.max(input.length, candidate.length);
  const lengthGap = Math.abs(input.length - candidate.length);
  if (lengthGap > 2) return false;
  if (distance > maxTypoDistance(maxLen)) return false;

  const similarity = 1 - distance / maxLen;
  return similarity >= 0.72;
}

export function evaluateCouponCode(
  input: string,
  discountCodes: DiscountCode[]
): CouponCodeEvaluation {
  const trimmed = input.trim();
  if (!trimmed) return { status: "empty" };

  const normalizedInput = normalizeCouponCode(trimmed);
  const upperInput = trimmed.toUpperCase();

  const exact = discountCodes.find(
    (entry) => entry.code.toUpperCase() === upperInput
  );
  if (exact) {
    return { status: "valid", match: exact, reason: "exact" };
  }

  const suggestions: CouponCodeSuggestion[] = [];
  const seen = new Set<string>();

  const addSuggestion = (
    entry: DiscountCode,
    reason: CouponCodeSuggestion["reason"]
  ) => {
    if (seen.has(entry.id)) return;
    seen.add(entry.id);
    suggestions.push({ code: entry, reason });
  };

  for (const entry of discountCodes) {
    const normalized = normalizeCouponCode(entry.code);
    const upperCode = entry.code.toUpperCase();

    if (normalized === normalizedInput && upperCode !== upperInput) {
      addSuggestion(entry, "spacing");
      continue;
    }

    if (normalized !== normalizedInput && isSimilarTypo(normalizedInput, normalized)) {
      addSuggestion(entry, "typo");
    }
  }

  if (suggestions.length > 0) {
    suggestions.sort((a, b) => {
      const reasonOrder = { spacing: 0, typo: 1 };
      if (reasonOrder[a.reason] !== reasonOrder[b.reason]) {
        return reasonOrder[a.reason] - reasonOrder[b.reason];
      }
      return (
        levenshtein(normalizedInput, normalizeCouponCode(a.code.code)) -
        levenshtein(normalizedInput, normalizeCouponCode(b.code.code))
      );
    });
    return { status: "potential", suggestions };
  }

  const normalizedExact = discountCodes.find(
    (entry) => normalizeCouponCode(entry.code) === normalizedInput
  );
  if (normalizedExact) {
    return { status: "valid", match: normalizedExact, reason: "exact" };
  }

  return { status: "invalid" };
}

export function lookupDiscountCode(
  code: string,
  discountCodes: DiscountCode[]
): DiscountCode | null {
  const evaluation = evaluateCouponCode(code, discountCodes);
  return evaluation.status === "valid" ? evaluation.match ?? null : null;
}

export function isValidDiscountCode(
  code: string,
  discountCodes: DiscountCode[]
): boolean {
  return evaluateCouponCode(code, discountCodes).status === "valid";
}

export function isDuplicateDiscountCode(
  code: string,
  discountCodes: DiscountCode[],
  excludeId?: string
): boolean {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return false;
  return discountCodes.some(
    (entry) =>
      entry.id !== excludeId && entry.code.toUpperCase() === normalized
  );
}
