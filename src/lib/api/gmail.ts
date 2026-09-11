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

export async function getGmailStatus(token?: string | null): Promise<GmailStatusResponse> {
  return apiClient.get<GmailStatusResponse>("/api/gmail/status", {
    headers: authHeaders(token),
  });
}

export async function getGmailConnectUrl(token?: string | null): Promise<{ url: string }> {
  return apiClient.get<{ url: string }>("/api/gmail/connect", {
    headers: authHeaders(token),
  });
}

export async function disconnectGmail(token?: string | null): Promise<GenericResponse> {
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
