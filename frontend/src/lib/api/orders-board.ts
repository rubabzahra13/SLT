import { API_BASE_URL, apiClient } from "./client";
import { transformOrder, type BackendOrder } from "./orders";
import type { Order } from "@/types";

export type OrdersBoardCounts = {
  all: number;
  complete_data: number;
  missing_data: number;
  assigned: number;
  not_assigned: number;
  reassigned: number;
  flagged: number;
  /** Source menu totals (server). */
  form?: number;
  manual?: number;
  by_form_type: Record<string, number>;
  by_cheer_form_subtype?: Record<string, number>;
  by_dance_form_subtype?: Record<string, number>;
  /** Source menu scoped to selected form / subtype. */
  form_by_form_type?: Record<string, number>;
  manual_by_form_type?: Record<string, number>;
  form_by_cheer_form_subtype?: Record<string, number>;
  manual_by_cheer_form_subtype?: Record<string, number>;
  form_by_dance_form_subtype?: Record<string, number>;
  manual_by_dance_form_subtype?: Record<string, number>;
  /** Per-form range badges (form-agnostic /counts response). */
  complete_data_by_form_type?: Record<string, number>;
  missing_data_by_form_type?: Record<string, number>;
  assigned_by_form_type?: Record<string, number>;
  not_assigned_by_form_type?: Record<string, number>;
  reassigned_by_form_type?: Record<string, number>;
  /** Per-subtype range badges — Matches the Cheer/Dance board scope. */
  complete_data_by_cheer_form_subtype?: Record<string, number>;
  missing_data_by_cheer_form_subtype?: Record<string, number>;
  assigned_by_cheer_form_subtype?: Record<string, number>;
  not_assigned_by_cheer_form_subtype?: Record<string, number>;
  reassigned_by_cheer_form_subtype?: Record<string, number>;
  complete_data_by_dance_form_subtype?: Record<string, number>;
  missing_data_by_dance_form_subtype?: Record<string, number>;
  assigned_by_dance_form_subtype?: Record<string, number>;
  not_assigned_by_dance_form_subtype?: Record<string, number>;
  reassigned_by_dance_form_subtype?: Record<string, number>;
  /**
   * Complete ∩ assignment chips (Missing ∩ X = X − Complete ∩ X).
   * Scoped maps omit zero entries; absent globals = older payload.
   */
  complete_assigned?: number;
  complete_not_assigned?: number;
  complete_reassigned?: number;
  complete_assigned_by_form_type?: Record<string, number>;
  complete_not_assigned_by_form_type?: Record<string, number>;
  complete_reassigned_by_form_type?: Record<string, number>;
  complete_assigned_by_cheer_form_subtype?: Record<string, number>;
  complete_not_assigned_by_cheer_form_subtype?: Record<string, number>;
  complete_reassigned_by_cheer_form_subtype?: Record<string, number>;
  complete_assigned_by_dance_form_subtype?: Record<string, number>;
  complete_not_assigned_by_dance_form_subtype?: Record<string, number>;
  complete_reassigned_by_dance_form_subtype?: Record<string, number>;
};

export type OrdersBoardQuery = {
  formType?: string;
  cheerFormSubtype?: string;
  danceFormSubtype?: string;
  category?: string;
  source?: string;
  search?: string;
  range?: string;
  sortBy?: string;
  excludeFlagged?: boolean;
  /** Counts API: only open affiliate flags (Flagged Orders page). */
  flaggedOnly?: boolean;
  pageSize?: number;
  pageToken?: string | null;
};

function boardQueryString(q: OrdersBoardQuery): string {
  const qs = new URLSearchParams();
  if (q.formType) qs.set("form_type", q.formType);
  if (q.cheerFormSubtype) qs.set("cheer_form_subtype", q.cheerFormSubtype);
  if (q.danceFormSubtype) qs.set("dance_form_subtype", q.danceFormSubtype);
  if (q.category) qs.set("category", q.category);
  if (q.source) qs.set("source", q.source);
  if (q.search) qs.set("search", q.search);
  if (q.range) qs.set("range", q.range);
  if (q.sortBy) qs.set("sort_by", q.sortBy);
  if (q.excludeFlagged === false) qs.set("exclude_flagged", "false");
  if (q.flaggedOnly) qs.set("flagged_only", "true");
  qs.set("page_size", String(q.pageSize ?? 50));
  if (q.pageToken) qs.set("page_token", q.pageToken);
  return qs.toString();
}

export async function fetchOrdersBoardApi(
  query: OrdersBoardQuery = {}
): Promise<{ orders: Order[]; nextPageToken: string | null }> {
  const qs = boardQueryString(query);
  const res = await apiClient.get<{
    orders: BackendOrder[];
    next_page_token?: string | null;
  }>(`/api/orders/board?${qs}`);
  return {
    orders: (res.orders || []).map(transformOrder),
    nextPageToken: res.next_page_token ?? null,
  };
}

export async function fetchOrdersCountsApi(
  query: Omit<
    OrdersBoardQuery,
    "range" | "sortBy" | "pageToken" | "pageSize"
  > = {},
  options?: { timeoutMs?: number }
): Promise<OrdersBoardCounts> {
  const qs = boardQueryString({
    ...query,
    excludeFlagged: query.excludeFlagged,
    flaggedOnly: query.flaggedOnly,
  });
  const res = await apiClient.get<{ counts: OrdersBoardCounts }>(
    `/api/orders/counts?${qs}`,
    options?.timeoutMs != null ? { timeoutMs: options.timeoutMs } : undefined
  );
  return res.counts;
}

export type OrdersMatchCounts = {
  magento: number;
  manual: number;
  by_form_type: Record<string, number>;
  by_cheer_form_subtype: Record<string, number>;
  by_dance_form_subtype: Record<string, number>;
  manual_by_form_type: Record<string, number>;
  manual_by_cheer_form_subtype: Record<string, number>;
  manual_by_dance_form_subtype: Record<string, number>;
};

export async function fetchOrdersMatchCountsApi(options?: {
  timeoutMs?: number;
}): Promise<OrdersMatchCounts> {
  const res = await apiClient.get<{ counts: OrdersMatchCounts }>(
    "/api/orders/match-counts",
    options?.timeoutMs != null ? { timeoutMs: options.timeoutMs } : undefined
  );
  return res.counts;
}

export async function fetchOrdersMatchPoolApi(
  pageToken?: string | null,
  opts?: {
    pageSize?: number;
    formType?: string;
    cheerFormSubtype?: string;
    danceFormSubtype?: string;
    timeoutMs?: number;
  }
): Promise<{
  orders: Order[];
  nextPageToken: string | null;
}> {
  const qs = new URLSearchParams({
    page_size: String(opts?.pageSize ?? 50),
  });
  if (pageToken) qs.set("page_token", pageToken);
  if (opts?.formType) qs.set("form_type", opts.formType);
  if (opts?.cheerFormSubtype) qs.set("cheer_form_subtype", opts.cheerFormSubtype);
  if (opts?.danceFormSubtype) qs.set("dance_form_subtype", opts.danceFormSubtype);
  const res = await apiClient.get<{
    orders: BackendOrder[];
    next_page_token?: string | null;
  }>(
    `/api/orders/match-pool?${qs}`,
    opts?.timeoutMs != null ? { timeoutMs: opts.timeoutMs } : undefined
  );
  return {
    orders: (res.orders || []).map(transformOrder),
    nextPageToken: res.next_page_token ?? null,
  };
}

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

export async function downloadOrdersBoardCsv(
  query: OrdersBoardQuery = {}
): Promise<void> {
  const qs = boardQueryString(query);
  const base =
    typeof window !== "undefined" && (!API_BASE_URL || API_BASE_URL === "/")
      ? ""
      : API_BASE_URL || "http://127.0.0.1:8001";
  const url = `${base.replace(/\/$/, "")}/api/orders/export.csv?${qs}`;
  const response = await fetch(url, {
    headers: { Authorization: authHeaderFromStorage() },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Export failed: ${response.status}`);
  }
  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = "orders_export.csv";
  a.click();
  URL.revokeObjectURL(href);
}

export type ImportChunkRow = {
  external_id?: string | null;
  form_type?: string;
  school_gym_name?: string | null;
  team_name?: string | null;
  coach_name?: string | null;
  contact_name?: string | null;
  customer_name?: string | null;
  package?: string | null;
  music_affiliate?: string | null;
  status?: string;
  is_manual_entry?: boolean;
  assigned_producer?: string | null;
  extra?: Record<string, unknown>;
};

export type ImportChunkResult = {
  imported: number;
  failed: number;
  errors: { index: number; message: string; external_id?: string | null }[];
  order_ids: string[];
};

export async function importOrdersChunkApi(
  rows: ImportChunkRow[],
  opts?: { jobId?: string; chunkIndex?: number }
): Promise<ImportChunkResult> {
  return apiClient.post<ImportChunkResult>("/api/orders/import/chunk", {
    rows,
    job_id: opts?.jobId ?? null,
    chunk_index: opts?.chunkIndex ?? null,
  });
}

/** Client loop: send sheet rows in chunks of 100 with a stable job id. */
export async function importOrdersInChunks(
  rows: ImportChunkRow[],
  onProgress?: (done: number, total: number) => void
): Promise<ImportChunkResult> {
  const chunkSize = 100;
  const jobId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `import-${Date.now()}`;
  let imported = 0;
  let failed = 0;
  const errors: ImportChunkResult["errors"] = [];
  const order_ids: string[] = [];
  let chunkIndex = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const res = await importOrdersChunkApi(chunk, { jobId, chunkIndex });
    chunkIndex += 1;
    imported += res.imported;
    failed += res.failed;
    errors.push(
      ...res.errors.map((e) => ({
        ...e,
        index: e.index + i,
      }))
    );
    order_ids.push(...res.order_ids);
    onProgress?.(Math.min(i + chunk.length, rows.length), rows.length);
  }
  return { imported, failed, errors, order_ids };
}
