import { apiClient } from "./client";
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
