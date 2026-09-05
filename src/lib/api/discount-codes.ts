import { apiClient } from "./client";
import type { DiscountCode } from "@/types";

export interface BackendDiscountCode {
  id: string;
  legacy_id?: string | null;
  code: string;
  description?: string | null;
}

export function transformDiscountCode(bd: BackendDiscountCode): DiscountCode {
  return {
    id: bd.legacy_id || bd.id,
    code: bd.code,
    description: bd.description || "",
  };
}

export async function fetchDiscountCodesApi(): Promise<DiscountCode[]> {
  const backendCodes = await apiClient.get<BackendDiscountCode[]>("/api/discount-codes");
  return backendCodes.map(transformDiscountCode);
}

export async function createDiscountCodeApi(dc: DiscountCode): Promise<DiscountCode> {
  const payload = {
    code: dc.code,
    description: dc.description,
  };
  const res = await apiClient.post<BackendDiscountCode>("/api/discount-codes", payload);
  return transformDiscountCode(res);
}

export async function updateDiscountCodeApi(
  id: string,
  patch: Partial<DiscountCode>
): Promise<DiscountCode> {
  const payload: Record<string, unknown> = {};
  if (patch.code !== undefined) payload.code = patch.code;
  if (patch.description !== undefined) payload.description = patch.description;

  const res = await apiClient.patch<BackendDiscountCode>(`/api/discount-codes/${id}`, payload);
  return transformDiscountCode(res);
}

export async function deleteDiscountCodeApi(id: string): Promise<void> {
  await apiClient.delete(`/api/discount-codes/${id}`);
}
