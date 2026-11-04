/** Dev browser calls use same-origin `/api` (Next rewrites to uvicorn). SSR uses 127.0.0.1:8001. */
function resolveApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL !== undefined) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (process.env.NODE_ENV === "production") return "";
  if (typeof window !== "undefined") return "";
  return "http://127.0.0.1:8001";
}

export const API_BASE_URL = resolveApiBaseUrl();

/** Default request timeout: shorter than Vercel maxDuration so UI can recover. */
export const API_TIMEOUT_MS = 20_000;

/** Creates / updates often wait on DB + uvicorn reload; give them more headroom. */
export const API_MUTATION_TIMEOUT_MS = 45_000;

export class ApiClientError extends Error {
  public status: number;
  public data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.data = data;
  }
}

function backendUnavailableMessage(): string {
  const target = API_BASE_URL || "/api (proxied to port 8001)";
  return `Backend unavailable at ${target}. Start the API in a second terminal: cd backend && ./venv/bin/uvicorn app.main:app --reload --port 8001`;
}

function isNetworkFetchFailure(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message.toLowerCase();
  return (
    err.name === "TypeError" &&
    (message === "failed to fetch" ||
      message.includes("networkerror") ||
      message.includes("network request failed"))
  );
}

export function formatApiClientError(
  err: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (err instanceof ApiClientError) {
    if (err.status === 0 && isNetworkFetchFailure(err)) {
      return backendUnavailableMessage();
    }
    if (err.status === 0 && /timed out/i.test(err.message)) {
      return "The server took too long to respond. Please try again.";
    }
    return err.message;
  }
  if (isNetworkFetchFailure(err)) {
    return backendUnavailableMessage();
  }
  return err instanceof Error ? err.message : fallback;
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
      // Prefer durable token-{userId} so saves keep working after backend reload.
      if (userId) return `Bearer token-${userId}`;
      if (token) return `Bearer ${token}`;
    }
  } catch {
    // ignore corrupt session
  }
  return "Bearer token-usr-megan";
}

async function requestOnce<T>(
  endpoint: string,
  options: RequestInit,
  timeoutMs: number
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Honor caller abort while still applying our timeout.
  const callerSignal = options.signal;
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else {
      callerSignal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: authHeaderFromStorage(),
    ...(options.headers as Record<string, string>),
  };

  try {
    const response = await fetch(url, {
      cache: "no-store",
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorData: unknown = null;
      const rawText = await response.text();
      try {
        errorData = JSON.parse(rawText);
      } catch {
        errorData = rawText;
      }
      let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
      if (
        errorData &&
        typeof errorData === "object" &&
        "detail" in errorData &&
        typeof (errorData as { detail?: unknown }).detail === "string"
      ) {
        errorMessage = (errorData as { detail: string }).detail;
      }
      throw new ApiClientError(errorMessage, response.status, errorData);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiClientError(`Request timed out after ${timeoutMs}ms`, 0);
    }
    throw new ApiClientError(
      isNetworkFetchFailure(err)
        ? backendUnavailableMessage()
        : err instanceof Error
          ? err.message
          : "Network error connecting to backend",
      0
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export type ApiRequestOptions = RequestInit & {
  /** Override default 20s timeout. */
  timeoutMs?: number;
  /** When false, skip the cold-start retry (default true). */
  retry?: boolean;
};

/**
 * Identical concurrent GETs (prefetch + mount reload, sibling warms) share one
 * round-trip. In-flight only — nothing is cached after the response lands.
 */
const inflightGets = new Map<string, Promise<unknown>>();

/** Server state changed (mutation / live event): later GETs must not join older ones. */
export function invalidateInflightGets(): void {
  inflightGets.clear();
}

async function request<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const method = String(options.method || "GET").toUpperCase();
  if (method === "GET" && !options.signal && typeof window !== "undefined") {
    const key = `${authHeaderFromStorage()} ${endpoint}`;
    const existing = inflightGets.get(key);
    if (existing) return existing as Promise<T>;
    const pending = requestWithRetry<T>(endpoint, options, method).finally(() => {
      if (inflightGets.get(key) === pending) inflightGets.delete(key);
    });
    inflightGets.set(key, pending);
    return pending;
  }
  if (method === "GET" || method === "HEAD") {
    return requestWithRetry<T>(endpoint, options, method);
  }
  invalidateInflightGets();
  try {
    return await requestWithRetry<T>(endpoint, options, method);
  } finally {
    invalidateInflightGets();
  }
}

async function requestWithRetry<T>(
  endpoint: string,
  options: ApiRequestOptions,
  method: string
): Promise<T> {
  const isMutation = method !== "GET" && method !== "HEAD";
  const {
    timeoutMs = isMutation ? API_MUTATION_TIMEOUT_MS : API_TIMEOUT_MS,
    retry = true,
    ...init
  } = options;
  try {
    return await requestOnce<T>(endpoint, init, timeoutMs);
  } catch (err) {
    // One retry for cold-start / uvicorn reload / transient network failures.
    // Mutations also retry once on timeout: Add Order is create+patch and often
    // races a backend reload; a second attempt usually succeeds quickly.
    // GETs: retry network/503 only — not timeouts (badge counts use a short
    // budget; retrying doubles wait and can trip Next's error overlay).
    const timedOut =
      err instanceof ApiClientError && /timed out/i.test(err.message);
    if (retry && timedOut && isMutation) {
      return requestOnce<T>(endpoint, init, timeoutMs);
    }
    if (
      retry &&
      err instanceof ApiClientError &&
      (err.status === 0 || err.status === 503 || err.status === 504)
    ) {
      return requestOnce<T>(endpoint, init, timeoutMs);
    }
    throw err;
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: ApiRequestOptions) =>
    request<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string, options?: ApiRequestOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};
