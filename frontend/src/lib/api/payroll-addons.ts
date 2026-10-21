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
  addon_type: "voiceover" | "rush_fee" | "misc_adjustment";
  amount: number;
  quantity?: number | null;
  unit_amount?: number | null;
  compensation_rate?: number | null;
  compensation_overridden?: boolean;
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
    quantity: raw.quantity ?? null,
    unitAmount:
      raw.unit_amount != null ? Number(raw.unit_amount) : null,
    compensationRate:
      raw.compensation_rate != null ? Number(raw.compensation_rate) : null,
    compensationOverridden: Boolean(raw.compensation_overridden),
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
  addonType: "voiceover" | "rush_fee" | "misc_adjustment";
  amount: number;
  quantity?: number | null;
  unitAmount?: number | null;
  compensationRate?: number | null;
  compensationOverridden?: boolean;
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
    quantity: payload.quantity ?? null,
    unit_amount: payload.unitAmount ?? null,
    compensation_rate: payload.compensationRate ?? null,
    compensation_overridden: Boolean(payload.compensationOverridden),
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


export interface UpdatePayrollAddonPayload {
  amount?: number;
  quantity?: number | null;
  unitAmount?: number | null;
  compensationRate?: number | null;
  compensationOverridden?: boolean;
  producerId?: string | null;
  producerInitials?: string | null;
  notes?: string | null;
}

export function mergePayrollAddonPatch(
  addon: PayrollAddon,
  patch: UpdatePayrollAddonPayload
): PayrollAddon {
  return {
    ...addon,
    amount: patch.amount ?? addon.amount,
    quantity: patch.quantity !== undefined ? patch.quantity : addon.quantity,
    unitAmount: patch.unitAmount !== undefined ? patch.unitAmount : addon.unitAmount,
    compensationRate:
      patch.compensationRate !== undefined
        ? patch.compensationRate
        : addon.compensationRate,
    compensationOverridden:
      patch.compensationOverridden !== undefined
        ? patch.compensationOverridden
        : addon.compensationOverridden,
    producerId: patch.producerId !== undefined ? patch.producerId : addon.producerId,
    producerInitials:
      patch.producerInitials !== undefined
        ? patch.producerInitials
        : addon.producerInitials,
    notes: patch.notes !== undefined ? patch.notes : addon.notes,
  };
}

export async function updatePayrollAddonApi(
  id: string,
  payload: UpdatePayrollAddonPayload,
  token?: string | null
): Promise<PayrollAddon> {
  const body: Record<string, unknown> = {};
  if (payload.amount !== undefined) body.amount = payload.amount;
  if (payload.quantity !== undefined) body.quantity = payload.quantity;
  if (payload.unitAmount !== undefined) body.unit_amount = payload.unitAmount;
  if (payload.compensationRate !== undefined) {
    body.compensation_rate = payload.compensationRate;
  }
  if (payload.compensationOverridden !== undefined) {
    body.compensation_overridden = payload.compensationOverridden;
  }
  if (payload.producerId !== undefined) body.producer_id = payload.producerId;
  if (payload.producerInitials !== undefined) {
    body.producer_initials = payload.producerInitials;
  }
  if (payload.notes !== undefined) body.notes = payload.notes;

  const data = await apiClient.patch<BackendPayrollAddon>(
    `/api/payroll-addons/${id}`,
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
