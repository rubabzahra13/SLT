export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

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

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  let authHeader = "";
  if (typeof window !== "undefined") {
    try {
      const rawSession = localStorage.getItem("slt_auth_session");
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        if (parsed?.token) {
          authHeader = `Bearer ${parsed.token}`;
        }
      }
    } catch {}
  }

  if (!authHeader) {
    authHeader = "Bearer token-usr-megan";
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(authHeader ? { Authorization: authHeader } : {}),
    ...(options.headers as Record<string, string>),
  };

  try {
    const response = await fetch(url, {
      cache: "no-store",
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData: unknown = null;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
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
      throw new ApiClientError(
        errorMessage,
        response.status,
        errorData
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    throw new ApiClientError(
      err instanceof Error ? err.message : "Network error connecting to backend",
      0
    );
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
