import { apiClient } from "./client";
import type { Producer } from "@/types";

export interface BackendProducer {
  id: string;
  legacy_id?: string | null;
  name: string;
  initials: string;
  email: string;
  specialty: string;
  avatar?: string | null;
  mixes_this_week: number;
  next_available?: string | null;
  status: "available" | "limited" | "unavailable";
  work_days: ("sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat")[];
  time_offs?: {
    id: string;
    start_date: string;
    end_date: string;
    type: "holiday" | "personal";
    reason: string;
  }[];
  max_mixes_per_day?: number | null;
  overtime_days?: string[];
}

export function transformProducer(bp: BackendProducer): Producer {
  return {
    id: bp.legacy_id || bp.id,
    name: bp.name,
    initials: bp.initials,
    email: bp.email,
    specialty: bp.specialty,
    avatar: bp.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${bp.initials}`,
    mixesThisWeek: bp.mixes_this_week ?? 0,
    nextAvailable: bp.next_available || "Available",
    status: bp.status || "available",
    workDays: bp.work_days || ["mon", "tue", "wed", "thu", "fri"],
    timeOff: (bp.time_offs || []).map((to) => ({
      id: to.id,
      startDate: to.start_date,
      endDate: to.end_date,
      type: to.type,
      reason: to.reason,
    })),
    maxMixesPerDay: bp.max_mixes_per_day ?? null,
    overtimeDays: bp.overtime_days || [],
  };
}

export async function fetchProducersApi(): Promise<Producer[]> {
  const backendProducers = await apiClient.get<BackendProducer[]>("/api/producers");
  return backendProducers.map(transformProducer);
}

export async function createProducerApi(producer: Producer): Promise<Producer> {
  const payload = {
    name: producer.name,
    initials: producer.initials,
    email: producer.email,
    specialty: producer.specialty,
    avatar: producer.avatar,
    status: producer.status,
    work_days: producer.workDays,
    max_mixes_per_day: producer.maxMixesPerDay,
    overtime_days: producer.overtimeDays,
  };
  const res = await apiClient.post<BackendProducer>("/api/producers", payload);
  return transformProducer(res);
}

export async function updateProducerApi(
  id: string,
  patch: Partial<Producer>
): Promise<Producer> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.initials !== undefined) payload.initials = patch.initials;
  if (patch.email !== undefined) payload.email = patch.email;
  if (patch.specialty !== undefined) payload.specialty = patch.specialty;
  if (patch.avatar !== undefined) payload.avatar = patch.avatar;
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.workDays !== undefined) payload.work_days = patch.workDays;
  if (patch.maxMixesPerDay !== undefined) payload.max_mixes_per_day = patch.maxMixesPerDay;
  if (patch.overtimeDays !== undefined) payload.overtime_days = patch.overtimeDays;
  if (patch.mixesThisWeek !== undefined) payload.mixes_this_week = patch.mixesThisWeek;
  if (patch.nextAvailable !== undefined) payload.next_available = patch.nextAvailable;

  const res = await apiClient.patch<BackendProducer>(`/api/producers/${id}`, payload);
  return transformProducer(res);
}

export async function deleteProducerApi(id: string): Promise<void> {
  await apiClient.delete(`/api/producers/${id}`);
}
