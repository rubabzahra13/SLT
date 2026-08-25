import type { DiscountCode } from "@/types";

export function normalizeDiscountCode(
  raw: Partial<DiscountCode> & { id: string }
): DiscountCode {
  return {
    id: raw.id,
    code: (raw.code || "").trim().toUpperCase(),
    description: (raw.description || "").trim(),
  };
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
