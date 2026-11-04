import { apiClient } from "./client";

export type GmailStatusResponse = {
  connected: boolean;
  email: string | null;
  provider: string;
  updated_at?: string | null;
};

export type GenericResponse = {
  success: boolean;
  message: string;
};

function authHeaders(token?: string | null): Record<string, string> {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/** Avoid re-hitting /gmail/status every time Send Statements remounts. */
const GMAIL_STATUS_TTL_MS = 5 * 60_000;
let gmailStatusCache: {
  tokenKey: string;
  at: number;
  status: GmailStatusResponse;
} | null = null;

export function clearGmailStatusCache(): void {
  gmailStatusCache = null;
}

export async function getGmailStatus(
  token?: string | null
): Promise<GmailStatusResponse> {
  const tokenKey = token || "";
  if (
    gmailStatusCache &&
    gmailStatusCache.tokenKey === tokenKey &&
    Date.now() - gmailStatusCache.at < GMAIL_STATUS_TTL_MS
  ) {
    return gmailStatusCache.status;
  }
  const status = await apiClient.get<GmailStatusResponse>("/api/gmail/status", {
    headers: authHeaders(token),
    // Status probes should fail fast: don’t leave Settings stuck on “Checking…”.
    timeoutMs: 8000,
  });
  // Only cache a connected result — so Settings connect can refresh immediately.
  gmailStatusCache = status.connected
    ? { tokenKey, at: Date.now(), status }
    : null;
  return status;
}

export async function getGmailConnectUrl(token?: string | null): Promise<{ url: string }> {
  return apiClient.get<{ url: string }>("/api/gmail/connect", {
    headers: authHeaders(token),
  });
}

export async function disconnectGmail(token?: string | null): Promise<GenericResponse> {
  clearGmailStatusCache();
  return apiClient.post<GenericResponse>("/api/gmail/disconnect", undefined, {
    headers: authHeaders(token),
  });
}

export async function sendGmailTestEmail(token?: string | null): Promise<GenericResponse> {
  return apiClient.post<GenericResponse>("/api/gmail/test-email", undefined, {
    headers: authHeaders(token),
  });
}

export type SendGmailEmailAttachment = {
  filename: string;
  content_base64: string;
  mime_type?: string;
};

export type SendGmailEmailPayload = {
  to_email: string;
  subject: string;
  body: string;
  html_body?: string;
  attachments?: SendGmailEmailAttachment[];
};

export async function sendGmailEmail(
  payload: SendGmailEmailPayload,
  token?: string | null
): Promise<GenericResponse> {
  return apiClient.post<GenericResponse>("/api/gmail/send", payload, {
    headers: authHeaders(token),
  });
}
