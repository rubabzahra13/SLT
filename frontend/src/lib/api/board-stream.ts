import { API_BASE_URL, ApiClientError } from "./client";
import {
  transformMTDRecord,
  type BackendMTDRecord,
} from "./mtd";
import { transformOrder, type BackendOrder } from "./orders";
import type { MTDRecord, Order } from "@/types";

export type BoardStreamEvent =
  | { type: "ready"; ok?: boolean }
  | { type: "order.updated"; order: Order }
  | { type: "mtd.updated"; record: MTDRecord };

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
 * Authenticated fetch-based SSE for order / MTD board price + field updates.
 * Hit the API host directly — Next.js rewrites buffer streams and break SSE.
 */
export async function subscribeBoardStream(
  onEvent: (event: BoardStreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const base =
    typeof window !== "undefined" && (!API_BASE_URL || API_BASE_URL === "/")
      ? "http://127.0.0.1:8001"
      : API_BASE_URL || "http://127.0.0.1:8001";
  const url = `${base.replace(/\/$/, "")}/api/orders/stream`;
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
      `Board stream failed: ${response.status}`,
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
      if (name === "order.updated" && parsed.order) {
        onEvent({
          type: "order.updated",
          order: transformOrder(parsed.order as BackendOrder),
        });
        return;
      }
      if (name === "mtd.updated" && parsed.mtd) {
        onEvent({
          type: "mtd.updated",
          record: transformMTDRecord(parsed.mtd as BackendMTDRecord),
        });
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
      flushBlock(block);
    }
  }
}
