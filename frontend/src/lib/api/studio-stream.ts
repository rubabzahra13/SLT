import { API_BASE_URL, ApiClientError } from "./client";
import {
  transformMTDRecord,
  type BackendMTDRecord,
} from "./mtd";
import { transformOrder, type BackendOrder } from "./orders";
import type { BackendProducer } from "./producers";
import type { MTDRecord, Order } from "@/types";

export type StudioStreamEvent =
  | { type: "ready"; ok?: boolean }
  | { type: "order.updated"; order: Order }
  | { type: "order.deleted"; id: string }
  | { type: "mtd.updated"; record: MTDRecord }
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

/** Map one SSE event name + JSON payload into a typed studio stream event. */
export function mapStudioStreamEvent(
  name: string,
  parsed: Record<string, unknown>
): StudioStreamEvent | null {
  if (name === "ready") {
    return { type: "ready", ok: Boolean(parsed.ok) };
  }
  if (name === "order.updated" && parsed.order) {
    return {
      type: "order.updated",
      order: transformOrder(parsed.order as BackendOrder),
    };
  }
  if (name === "order.deleted" && typeof parsed.id === "string") {
    return { type: "order.deleted", id: parsed.id };
  }
  if (name === "mtd.updated" && parsed.mtd) {
    return {
      type: "mtd.updated",
      record: transformMTDRecord(parsed.mtd as BackendMTDRecord),
    };
  }
  if (name === "producer.updated" && parsed.producer) {
    return {
      type: "producer.updated",
      producer: parsed.producer as BackendProducer,
    };
  }
  if (name === "producer.deleted" && typeof parsed.id === "string") {
    return { type: "producer.deleted", id: parsed.id };
  }
  return null;
}

/** Parse a raw SSE block (event: / data: lines) into a studio stream event. */
export function parseStudioStreamBlock(block: string): StudioStreamEvent | null {
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
  if (!data) return null;
  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    return mapStudioStreamEvent(name, parsed);
  } catch {
    return null;
  }
}

/**
 * Single authenticated SSE for orders/MTD + producers.
 * Hit the API host directly: Next.js rewrites buffer streams and break SSE.
 */
export async function subscribeStudioStream(
  onEvent: (event: StudioStreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const base =
    typeof window !== "undefined" && (!API_BASE_URL || API_BASE_URL === "/")
      ? "http://127.0.0.1:8001"
      : API_BASE_URL || "http://127.0.0.1:8001";
  const url = `${base.replace(/\/$/, "")}/api/studio/stream`;
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
      `Studio stream failed: ${response.status}`,
      response.status
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.search(/\r?\n\r?\n/)) !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep).replace(/^\r?\n\r?\n/, "");
      if (!block.trim()) continue;
      const event = parseStudioStreamBlock(block);
      if (event) onEvent(event);
    }
  }
}
