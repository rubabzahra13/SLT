import { apiClient, ApiClientError, API_BASE_URL } from "./client";
import type { Producer, ProducerCompensationModel, ProducerManualInputField } from "@/types";
import { normalizeProducer } from "@/lib/producers";

export function resolveProducerApiId(producer: Pick<Producer, "id" | "uuid">): string {
  return producer.id || producer.uuid || "";
}

export interface BackendProducer {
  id: string;
  name: string;
  initials: string;
  email: string;
  categories?: string[] | null;
  avatar?: string | null;
  mixes_this_week: number;
  work_days: ("sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat")[];
  time_offs?: {
    id: string;
    start_date: string;
    end_date: string;
    type: "holiday" | "personal";
    reason: string;
  }[];
  max_mixes_per_day?: number | null;
  max_producer_cost_per_day?: number | null;
  extra_days?: string[];
  /** @deprecated read-only fallback while caches catch up */
  overtime_days?: string[];
  compensation_model?: ProducerCompensationModel;
  default_rate?: number | null;
  rates_by_category?: Record<string, number> | null;
  dance_voiceover_rate?: number | null;
  cheer_voiceover_rate?: number | null;
  rush_fee_rate?: number | null;
  rate_overrides?: Record<string, number> | null;
  manual_input_fields?: ProducerManualInputField[] | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export function transformProducer(bp: BackendProducer): Producer {
  const categories: string[] =
    Array.isArray(bp.categories) && bp.categories.length > 0
      ? bp.categories
      : [];

  return normalizeProducer({
    id: bp.id,
    uuid: bp.id,
    name: bp.name,
    initials: bp.initials,
    email: bp.email,
    categories,
    avatar: bp.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${bp.initials}`,
    mixesThisWeek: bp.mixes_this_week ?? 0,
    workDays: bp.work_days || ["mon", "tue", "wed", "thu", "fri"],
    timeOff: (bp.time_offs || []).map((to) => ({
      id: to.id,
      startDate: to.start_date,
      endDate: to.end_date || to.start_date,
      type: to.type,
      reason: to.reason,
    })),
    maxMixesPerDay: bp.max_mixes_per_day ?? null,
    maxProducerCostPerDay: bp.max_producer_cost_per_day ?? null,
    extraDays: bp.extra_days || bp.overtime_days || [],
    compensationModel: bp.compensation_model ?? null,
    defaultRate: bp.default_rate ?? null,
    ratesByCategory: bp.rates_by_category ?? null,
    danceVoiceoverRate: bp.dance_voiceover_rate ?? null,
    cheerVoiceoverRate: bp.cheer_voiceover_rate ?? null,
    rushFeeRate: bp.rush_fee_rate ?? null,
    rateOverrides: bp.rate_overrides ?? null,
    manualInputFields: bp.manual_input_fields ?? null,
    notes: bp.notes ?? null,
    createdAt: bp.created_at ?? null,
    updatedAt: bp.updated_at ?? null,
  });
}

export async function fetchProducersApi(): Promise<Producer[]> {
  const backendProducers = await apiClient.get<BackendProducer[]>("/api/producers");
  return backendProducers.map(transformProducer);
}

export async function fetchProducerApi(id: string): Promise<Producer> {
  const list = await fetchProducersApi();
  const match = list.find((p) => p.id === id || p.uuid === id);
  if (!match) {
    throw new ApiClientError("Producer not found", 404);
  }
  return match;
}

function isUuidLike(value: string | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function serializeTimeOffs(
  timeOff: Producer["timeOff"] | undefined
):
  | {
      id?: string;
      start_date: string;
      end_date: string;
      type: "holiday" | "personal";
      reason: string;
    }[]
  | undefined {
  if (timeOff === undefined) return undefined;
  return timeOff.map((entry) => ({
    ...(isUuidLike(entry.id) ? { id: entry.id } : {}),
    start_date: entry.startDate,
    end_date: entry.endDate || entry.startDate,
    type: entry.type,
    reason: entry.reason || "",
  }));
}

export async function createProducerApi(producer: Producer): Promise<Producer> {
  const payload = {
    name: producer.name,
    initials: producer.initials,
    email: producer.email,
    categories: producer.categories,
    avatar: producer.avatar,
    work_days: producer.workDays,
    time_offs: serializeTimeOffs(producer.timeOff) ?? [],
    max_mixes_per_day: producer.maxMixesPerDay,
    max_producer_cost_per_day: producer.maxProducerCostPerDay,
    extra_days: producer.extraDays,
    compensation_model: producer.compensationModel,
    default_rate: producer.defaultRate,
    rates_by_category: producer.ratesByCategory,
    dance_voiceover_rate: producer.danceVoiceoverRate,
    cheer_voiceover_rate: producer.cheerVoiceoverRate,
    rush_fee_rate: producer.rushFeeRate,
    rate_overrides: producer.rateOverrides,
    manual_input_fields: producer.manualInputFields,
    notes: producer.notes,
  };
  const res = await apiClient.post<BackendProducer>("/api/producers", payload);
  return transformProducer(res);
}

export type UpdateProducerOptions = {
  /** When set, server returns 409 if the row is newer. */
  ifMatchUpdatedAt?: string | null;
};

export function producerFromConflictError(err: unknown): Producer | null {
  if (!(err instanceof ApiClientError) || err.status !== 409) return null;
  const data = err.data;
  if (!data || typeof data !== "object") return null;
  const detail = (data as { detail?: unknown }).detail;
  if (!detail || typeof detail !== "object") return null;
  const producer = (detail as { producer?: BackendProducer }).producer;
  if (!producer || typeof producer !== "object" || !producer.id) return null;
  return transformProducer(producer);
}

export async function updateProducerApi(
  id: string,
  patch: Partial<Producer>,
  apiId?: string,
  options?: UpdateProducerOptions
): Promise<Producer> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.initials !== undefined) payload.initials = patch.initials;
  if (patch.email !== undefined) payload.email = patch.email;
  if (patch.categories !== undefined) payload.categories = patch.categories;
  if (patch.avatar !== undefined) payload.avatar = patch.avatar;
  if (patch.workDays !== undefined) payload.work_days = patch.workDays;
  if (patch.timeOff !== undefined) payload.time_offs = serializeTimeOffs(patch.timeOff);
  if (patch.maxMixesPerDay !== undefined) payload.max_mixes_per_day = patch.maxMixesPerDay;
  if (patch.maxProducerCostPerDay !== undefined) payload.max_producer_cost_per_day = patch.maxProducerCostPerDay;
  if (patch.extraDays !== undefined) payload.extra_days = patch.extraDays;
  if (patch.mixesThisWeek !== undefined) payload.mixes_this_week = patch.mixesThisWeek;
  if (patch.compensationModel !== undefined) payload.compensation_model = patch.compensationModel;
  if (patch.defaultRate !== undefined) payload.default_rate = patch.defaultRate;
  if (patch.ratesByCategory !== undefined) payload.rates_by_category = patch.ratesByCategory;
  if (patch.danceVoiceoverRate !== undefined) payload.dance_voiceover_rate = patch.danceVoiceoverRate;
  if (patch.cheerVoiceoverRate !== undefined) payload.cheer_voiceover_rate = patch.cheerVoiceoverRate;
  if (patch.rushFeeRate !== undefined) payload.rush_fee_rate = patch.rushFeeRate;
  if (patch.rateOverrides !== undefined) payload.rate_overrides = patch.rateOverrides;
  if (patch.manualInputFields !== undefined) payload.manual_input_fields = patch.manualInputFields;
  if (patch.notes !== undefined) payload.notes = patch.notes;
  if (options?.ifMatchUpdatedAt) {
    payload.if_match_updated_at = options.ifMatchUpdatedAt;
  }

  try {
    const res = await apiClient.patch<BackendProducer>(
      `/api/producers/${apiId || id}`,
      payload
    );
    return transformProducer(res);
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    throw err;
  }
}

export async function deleteProducerApi(id: string, apiId?: string): Promise<void> {
  try {
    await apiClient.delete(`/api/producers/${apiId || id}`);
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) {
      // Producer is already deleted/missing on backend DB; complete deletion gracefully
      return;
    }
    throw err;
  }
}

export type ProducerStreamEvent =
  | { type: "ready"; ok?: boolean }
  | { type: "producer.updated"; producer: BackendProducer }
  | { type: "producer.deleted"; id: string };

function authHeaderFromStorage(): string {
  if (typeof window === "undefined") return "Bearer token-usr-megan";
  try {
    const rawSession = localStorage.getItem("slt_auth_session");
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      const token = typeof parsed?.token === "string" ? parsed.token.trim() : "";
      const userId =
        typeof parsed?.user?.id === "string" ? parsed.user.id.trim() : "";
      if (userId) return `Bearer token-${userId}`;
      if (token) return `Bearer ${token}`;
    }
  } catch {
    /* ignore */
  }
  return "Bearer token-usr-megan";
}

/**
 * Authenticated fetch-based SSE (EventSource cannot set Authorization).
 * Hit the API host directly — Next.js rewrites buffer streams and break SSE.
 * Calls onEvent for each parsed message until aborted / connection drops.
 */
export async function subscribeProducerStream(
  onEvent: (event: ProducerStreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  // Prefer absolute API host in the browser so the Next proxy cannot buffer SSE.
  const base =
    typeof window !== "undefined" && (!API_BASE_URL || API_BASE_URL === "/")
      ? "http://127.0.0.1:8001"
      : API_BASE_URL || "http://127.0.0.1:8001";
  const url = `${base.replace(/\/$/, "")}/api/producers/stream`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      Authorization: authHeaderFromStorage(),
    },
    cache: "no-store",
    signal,
  });
  if (!response.ok || !response.body) {
    throw new ApiClientError(
      `Producer stream failed: ${response.status}`,
      response.status
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const flushBlock = (block: string) => {
    const lines = block.split(/\r?\n/);
    let data = "";
    let name = "message";
    for (const line of lines) {
      if (line.startsWith("event:")) {
        name = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        data += (data ? "\n" : "") + line.slice(5).trimStart();
      }
    }
    if (!data) return;
    try {
      const parsed = JSON.parse(data) as Record<string, unknown>;
      if (name === "ready") {
        onEvent({ type: "ready", ok: Boolean(parsed.ok) });
        return;
      }
      if (name === "producer.updated" && parsed.producer) {
        onEvent({
          type: "producer.updated",
          producer: parsed.producer as BackendProducer,
        });
        return;
      }
      if (name === "producer.deleted" && typeof parsed.id === "string") {
        onEvent({ type: "producer.deleted", id: parsed.id });
      }
    } catch {
      /* ignore malformed chunks */
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.search(/\r?\n\r?\n/)) !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep).replace(/^\r?\n\r?\n/, "");
      if (block.trim()) flushBlock(block);
    }
  }
}
