export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL !== undefined
    ? process.env.NEXT_PUBLIC_API_URL
    : process.env.NODE_ENV === "production"
      ? ""
      : "http://localhost:8001";

/** Default request timeout — shorter than Vercel maxDuration so UI can recover. */
export const API_TIMEOUT_MS = 20_000;

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

const BACKEND_UNAVAILABLE_MESSAGE = `Backend unavailable at ${API_BASE_URL || "/api"}. Is the server running?`;

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
      return BACKEND_UNAVAILABLE_MESSAGE;
    }
    return err.message;
  }
  if (isNetworkFetchFailure(err)) {
    return BACKEND_UNAVAILABLE_MESSAGE;
  }
  return err instanceof Error ? err.message : fallback;
}

function authHeaderFromStorage(): string {
  if (typeof window === "undefined") return "Bearer token-usr-megan";
  try {
    const rawSession = localStorage.getItem("slt_auth_session");
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      if (parsed?.token) return `Bearer ${parsed.token}`;
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
        ? BACKEND_UNAVAILABLE_MESSAGE
        : err instanceof Error
          ? err.message
          : "Network error connecting to backend",
      0
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    return await requestOnce<T>(endpoint, options, API_TIMEOUT_MS);
  } catch (err) {
    // One retry for cold-start / transient network failures only.
    if (
      err instanceof ApiClientError &&
      (err.status === 0 || err.status === 503 || err.status === 504)
    ) {
      return requestOnce<T>(endpoint, options, API_TIMEOUT_MS);
    }
    throw err;
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};
