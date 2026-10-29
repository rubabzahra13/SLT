import { apiClient, type ApiRequestOptions } from "./client";

/** AIP-158 list envelope (resource field name varies). */
export type ListPage<T> = {
  next_page_token?: string | null;
} & Record<string, T[] | string | null | undefined>;

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGES = 50;

function buildListUrl(
  path: string,
  pageSize: number,
  pageToken: string | null
): string {
  const qs = new URLSearchParams();
  qs.set("page_size", String(pageSize));
  if (pageToken) qs.set("page_token", pageToken);
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${qs.toString()}`;
}

/**
 * Walk AIP-158 pages until exhausted. Used by AppState loaders that still need
 * the full collection in memory.
 */
export async function fetchAllListPages<T>(
  path: string,
  itemsKey: string,
  options?: ApiRequestOptions & { pageSize?: number }
): Promise<T[]> {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { pageSize: _ps, ...requestOptions } = options ?? {};
  const items: T[] = [];
  let pageToken: string | null = null;

  for (let i = 0; i < MAX_PAGES; i += 1) {
    const url = buildListUrl(path, pageSize, pageToken);
    const page = await apiClient.get<ListPage<T>>(url, requestOptions);
    const chunk = page[itemsKey];
    if (Array.isArray(chunk)) {
      items.push(...chunk);
    }
    const next =
      typeof page.next_page_token === "string" && page.next_page_token
        ? page.next_page_token
        : null;
    if (!next) break;
    pageToken = next;
  }

  return items;
}
