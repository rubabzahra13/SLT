import { apiClient } from "./client";
import type { PayrollAddon } from "@/types";

export interface BackendPayrollAddon {
  id: string;
  program_name: string;
  contact_name?: string | null;
  team_name?: string | null;
  order_id?: string | null;
  mtd_id?: string | null;
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
  let mtdId = raw.mtd_id ?? null;
  let orderId = raw.order_id ?? null;

  if (raw.notes) {
    const mtdMatch = raw.notes.match(/mtd_id:([^\s\]]+)/);
    if (mtdMatch && !mtdId) mtdId = mtdMatch[1];
    const orderMatch = raw.notes.match(/order_id:([^\s\]]+)/);
    if (orderMatch && !orderId) orderId = orderMatch[1];
  }

  return {
    id: raw.id,
    programName: raw.program_name,
    contactName: raw.contact_name ?? null,
    teamName: raw.team_name ?? null,
    orderId,
    mtdId,
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
  teamName?: string | null;
  orderId?: string | null;
  mtdId?: string | null;
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
    team_name: payload.teamName ?? null,
    order_id: payload.orderId ?? null,
    mtd_id: payload.mtdId ?? null,
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
