import { API_BASE_URL, apiClient } from "./client";
import { transformMTDRecord, type BackendMTDRecord } from "./mtd";
import type { MTDRecord } from "@/types";

export type MtdBoardCounts = {
  all: number;
  by_form_type: Record<string, number>;
  by_category: Record<string, number>;
  by_cheer_form_subtype?: Record<string, number>;
  by_dance_form_subtype?: Record<string, number>;
};

export type MtdBoardQuery = {
  scope?: "live" | "board" | "payroll" | "archive" | "all";
  formType?: string;
  cheerFormSubtype?: string;
  category?: string;
  search?: string;
  status?: string;
  /** Inclusive Timestamp window (ISO) — table Date filter. */
  createdAfter?: string;
  createdBefore?: string;
  pageSize?: number;
  pageToken?: string | null;
};

function mtdQueryString(q: MtdBoardQuery): string {
  const qs = new URLSearchParams();
  qs.set("scope", q.scope || "live");
  if (q.formType) qs.set("form_type", q.formType);
  if (q.cheerFormSubtype) qs.set("cheer_form_subtype", q.cheerFormSubtype);
  if (q.category) qs.set("category", q.category);
  if (q.search) qs.set("search", q.search);
  if (q.status) qs.set("status", q.status);
  if (q.createdAfter) qs.set("created_after", q.createdAfter);
  if (q.createdBefore) qs.set("created_before", q.createdBefore);
  qs.set("page_size", String(q.pageSize ?? 50));
  if (q.pageToken) qs.set("page_token", q.pageToken);
  return qs.toString();
}

export async function fetchMtdBoardApi(
  query: MtdBoardQuery = {}
): Promise<{ records: MTDRecord[]; nextPageToken: string | null }> {
  const res = await apiClient.get<{
    mtd: BackendMTDRecord[];
    next_page_token?: string | null;
  }>(`/api/mtd/board?${mtdQueryString(query)}`);
  return {
    records: (res.mtd || []).map(transformMTDRecord),
    nextPageToken: res.next_page_token ?? null,
  };
}

export async function fetchMtdCountsApi(
  query: Omit<MtdBoardQuery, "pageToken" | "pageSize" | "status"> = {}
): Promise<MtdBoardCounts> {
  const res = await apiClient.get<{ counts: MtdBoardCounts }>(
    `/api/mtd/counts?${mtdQueryString(query)}`
  );
  return res.counts;
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

/** Server-streamed CSV — same filters as /mtd/board, capped at 5,000 rows. */
export async function downloadMtdBoardCsv(
  query: MtdBoardQuery = {}
): Promise<void> {
  const qs = mtdQueryString({
    ...query,
    pageSize: undefined,
    pageToken: undefined,
  });
  const base =
    typeof window !== "undefined" && (!API_BASE_URL || API_BASE_URL === "/")
      ? ""
      : API_BASE_URL || "http://127.0.0.1:8001";
  const url = `${base.replace(/\/$/, "")}/api/mtd/export.csv?${qs}`;
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
  a.download = "mtd_export.csv";
  a.click();
  URL.revokeObjectURL(href);
}
