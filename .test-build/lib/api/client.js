"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiClient = exports.ApiClientError = exports.API_BASE_URL = void 0;
exports.formatApiClientError = formatApiClientError;
exports.API_BASE_URL = process.env.NEXT_PUBLIC_API_URL !== undefined
    ? process.env.NEXT_PUBLIC_API_URL
    : process.env.NODE_ENV === "production"
        ? ""
        : "http://localhost:8001";
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
const BACKEND_UNAVAILABLE_MESSAGE = `Backend unavailable at ${exports.API_BASE_URL}. Is the server running on port 8001?`;
function isNetworkFetchFailure(err) {
    if (!(err instanceof Error))
        return false;
    const message = err.message.toLowerCase();
    return (err.name === "TypeError" &&
        (message === "failed to fetch" ||
            message.includes("networkerror") ||
            message.includes("network request failed")));
}
function formatApiClientError(err, fallback = "Something went wrong. Please try again.") {
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
            const rawText = await response.text();
            try {
                errorData = JSON.parse(rawText);
            }
            catch {
                errorData = rawText;
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
        throw new ApiClientError(isNetworkFetchFailure(err)
            ? BACKEND_UNAVAILABLE_MESSAGE
            : err instanceof Error
                ? err.message
                : "Network error connecting to backend", 0);
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
