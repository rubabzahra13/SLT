import { apiClient } from "./client";
import { fetchAllListPages } from "./pagination";
import type { DiscountCode } from "@/types";

export interface BackendDiscountCode {
  id: string;
  code: string;
}

export function transformDiscountCode(bd: BackendDiscountCode): DiscountCode {
  return {
    id: bd.id,
    code: (bd.code || "").trim(),
  };
}

export async function fetchDiscountCodesApi(): Promise<DiscountCode[]> {
  try {
    const backendCodes = await fetchAllListPages<BackendDiscountCode>(
      "/api/discount-codes",
      "discount_codes"
    );
    return backendCodes.map(transformDiscountCode);
  } catch (err) {
    console.warn("Failed to fetch coupon codes from backend API:", err);
    return [];
  }
}

export async function createDiscountCodeApi(
  dc: DiscountCode
): Promise<DiscountCode> {
  const payload = { code: dc.code };
  try {
    const res = await apiClient.post<BackendDiscountCode>(
      "/api/discount-codes",
      payload
    );
    return transformDiscountCode(res);
  } catch (err) {
    console.error("Failed to persist new coupon code to backend API:", err);
    throw err;
  }
}

export async function updateDiscountCodeApi(
  id: string,
  patch: Partial<DiscountCode>
): Promise<DiscountCode> {
  const payload: Record<string, unknown> = {};
  if (patch.code !== undefined) payload.code = patch.code;

  try {
    const res = await apiClient.patch<BackendDiscountCode>(
      `/api/discount-codes/${id}`,
      payload
    );
    return transformDiscountCode(res);
  } catch (err) {
    console.error("Failed to persist coupon code update to backend API:", err);
    throw err;
  }
}

export async function deleteDiscountCodeApi(
  id: string,
  options?: { allowMissing?: boolean }
): Promise<void> {
  const qs = options?.allowMissing !== false ? "?allow_missing=true" : "";
  try {
    await apiClient.delete(`/api/discount-codes/${id}${qs}`);
  } catch (err) {
    console.error("Failed to delete coupon code from backend API:", err);
    throw err;
  }
}
