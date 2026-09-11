"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiClient = exports.ApiClientError = exports.API_BASE_URL = void 0;
exports.API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
class ApiClientError extends Error {
    status;
    data;
    constructor(message, status, data) {
        super(message);
        this.name = "ApiClientError";
        this.status = status;
        this.data = data;
    }
}
exports.ApiClientError = ApiClientError;
async function request(endpoint, options = {}) {
    const url = `${exports.API_BASE_URL}${endpoint}`;
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
        }
        catch { }
    }
    if (!authHeader) {
        authHeader = "Bearer token-usr-megan";
    }
    const headers = {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...options.headers,
    };
    try {
        const response = await fetch(url, {
            cache: "no-store",
            ...options,
            headers,
        });
        if (!response.ok) {
            let errorData = null;
            try {
                errorData = await response.json();
            }
            catch {
                errorData = await response.text();
            }
            let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
            if (errorData &&
                typeof errorData === "object" &&
                "detail" in errorData &&
                typeof errorData.detail === "string") {
                errorMessage = errorData.detail;
            }
            throw new ApiClientError(errorMessage, response.status, errorData);
        }
        if (response.status === 204) {
            return {};
        }
        return (await response.json());
    }
    catch (err) {
        if (err instanceof ApiClientError) {
            throw err;
        }
        throw new ApiClientError(err instanceof Error ? err.message : "Network error connecting to backend", 0);
    }
}
exports.apiClient = {
    get: (endpoint, options) => request(endpoint, { ...options, method: "GET" }),
    post: (endpoint, body, options) => request(endpoint, {
        ...options,
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
    }),
    patch: (endpoint, body, options) => request(endpoint, {
        ...options,
        method: "PATCH",
        body: body ? JSON.stringify(body) : undefined,
    }),
    put: (endpoint, body, options) => request(endpoint, {
        ...options,
        method: "PUT",
        body: body ? JSON.stringify(body) : undefined,
    }),
    delete: (endpoint, options) => request(endpoint, { ...options, method: "DELETE" }),
};
