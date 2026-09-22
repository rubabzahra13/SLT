import { apiClient } from "./client";
import type { PayrollAddon } from "@/types";

export interface BackendPayrollAddon {
  id: string;
  program_name: string;
  contact_name?: string | null;
  category: string;
  addon_type: "voiceover" | "rush_fee";
  amount: number;
  rate_source: "predefined" | "manual";
  producer_id?: string | null;
  producer_initials?: string | null;
  notes?: string | null;
  created_at: string;
}

function normalizePayrollAddon(raw: BackendPayrollAddon): PayrollAddon {
  return {
    id: raw.id,
    programName: raw.program_name,
    contactName: raw.contact_name ?? null,
    category: raw.category,
    addonType: raw.addon_type,
    amount: Number(raw.amount),
    rateSource: raw.rate_source,
    producerId: raw.producer_id ?? null,
    producerInitials: raw.producer_initials ?? null,
    notes: raw.notes ?? null,
    createdAt: raw.created_at,
  };
}

export async function fetchPayrollAddonsApi(
  token?: string | null
): Promise<PayrollAddon[]> {
  const data = await apiClient.get<BackendPayrollAddon[]>(
    "/api/payroll-addons",
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );
  return data.map(normalizePayrollAddon);
}

export interface CreatePayrollAddonPayload {
  programName: string;
  contactName?: string | null;
  category: string;
  addonType: "voiceover" | "rush_fee";
  amount: number;
  rateSource: "predefined" | "manual";
  producerId?: string | null;
  producerInitials?: string | null;
  notes?: string | null;
}

export async function createPayrollAddonApi(
  payload: CreatePayrollAddonPayload,
  token?: string | null
): Promise<PayrollAddon> {
  const body = {
    program_name: payload.programName,
    contact_name: payload.contactName ?? null,
    category: payload.category,
    addon_type: payload.addonType,
    amount: payload.amount,
    rate_source: payload.rateSource,
    producer_id: payload.producerId ?? null,
    producer_initials: payload.producerInitials ?? null,
    notes: payload.notes ?? null,
  };
  const data = await apiClient.post<BackendPayrollAddon>(
    "/api/payroll-addons",
    body,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );
  return normalizePayrollAddon(data);
}

export async function deletePayrollAddonApi(
  id: string,
  token?: string | null
): Promise<void> {
  await apiClient.delete<unknown>(
    `/api/payroll-addons/${id}`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );
}
