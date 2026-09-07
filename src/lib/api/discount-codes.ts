import { apiClient } from "./client";
import type { DiscountCode } from "@/types";

export interface BackendDiscountCode {
  id: string;
  legacy_id?: string | null;
  code: string;
  description?: string | null;
  discount_type?: "fixed" | "percentage" | null;
  discount_value?: number | null;
}

export function transformDiscountCode(bd: BackendDiscountCode): DiscountCode {
  return {
    id: bd.legacy_id || bd.id,
    code: bd.code,
    description: bd.description || "",
    discountType:
      bd.discount_type === "percentage"
        ? "percentage"
        : bd.discount_type === "fixed"
        ? "fixed"
        : undefined,
    discountValue: typeof bd.discount_value === "number" ? bd.discount_value : undefined,
  };
}

export async function fetchDiscountCodesApi(): Promise<DiscountCode[]> {
  try {
    const backendCodes = await apiClient.get<BackendDiscountCode[]>("/api/discount-codes");
    return backendCodes.map(transformDiscountCode);
  } catch (err) {
    console.warn("Failed to fetch discount codes from backend API:", err);
    return [];
  }
}

export async function createDiscountCodeApi(dc: DiscountCode): Promise<DiscountCode> {
  const payload = {
    code: dc.code,
    description: dc.description,
    discount_type: dc.discountType,
    discount_value: dc.discountValue,
  };
  try {
    const res = await apiClient.post<BackendDiscountCode>("/api/discount-codes", payload);
    return transformDiscountCode(res);
  } catch (err) {
    console.warn("Failed to persist new discount code to backend API:", err);
    return dc;
  }
}

export async function updateDiscountCodeApi(
  id: string,
  patch: Partial<DiscountCode>
): Promise<DiscountCode> {
  const payload: Record<string, unknown> = {};
  if (patch.code !== undefined) payload.code = patch.code;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.discountType !== undefined) payload.discount_type = patch.discountType;
  if (patch.discountValue !== undefined) payload.discount_value = patch.discountValue;

  try {
    const res = await apiClient.patch<BackendDiscountCode>(`/api/discount-codes/${id}`, payload);
    return transformDiscountCode(res);
  } catch (err) {
    console.warn("Failed to persist discount code update to backend API:", err);
    return {
      id,
      code: patch.code || "",
      description: patch.description,
      discountType: patch.discountType,
      discountValue: patch.discountValue,
    };
  }
}

export async function deleteDiscountCodeApi(id: string): Promise<void> {
  try {
    await apiClient.delete(`/api/discount-codes/${id}`);
  } catch (err) {
    console.warn("Failed to delete discount code from backend API:", err);
  }
}
