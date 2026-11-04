import { apiClient } from "@/lib/api/client";

export type DashboardOrdersInDay = {
  iso: string;
  count: number;
  is_today?: boolean;
};

export type DashboardPulseApi = {
  unassigned: number;
  /** Pre-MTD Orders tab total (exclude open flags) — sidebar badge. */
  orders_tab?: number;
  in_queue: number;
  todays_mixes: number;
  outsourced: number;
  mtd_open?: number;
  /** Unpaid payroll rows — sidebar badge. */
  payroll_open?: number;
  orders_in_total?: number;
  orders_in_by_day?: DashboardOrdersInDay[];
  cached?: boolean;
  as_of_day?: string;
};

const PULSE_TTL_MS = 60_000;

let pulseMem: { at: number; pulse: DashboardPulseApi } | null = null;

export function readDashboardPulseCache(): DashboardPulseApi | null {
  if (!pulseMem) return null;
  if (Date.now() - pulseMem.at > PULSE_TTL_MS) return null;
  return pulseMem.pulse;
}

export function writeDashboardPulseCache(pulse: DashboardPulseApi): void {
  pulseMem = { at: Date.now(), pulse };
}

export function invalidateDashboardPulseCache(): void {
  pulseMem = null;
}

/** Home KPIs + orders-in — server-cached; invalidate on order/MTD writes. */
export async function fetchDashboardPulseApi(): Promise<DashboardPulseApi> {
  const pulse = await apiClient.get<DashboardPulseApi>("/api/dashboard/pulse");
  writeDashboardPulseCache(pulse);
  return pulse;
}
