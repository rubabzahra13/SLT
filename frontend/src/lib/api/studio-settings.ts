import { apiClient } from "./client";
import type { StudioPersonalReason } from "@/lib/producer-time-off";
import {
  normalizeStudioPersonalReason,
  ensurePersonalReasonsList,
} from "@/lib/producer-time-off";
import type { EmailTemplateCopy, EmailTemplateId, EmailTemplatesState } from "@/lib/email-templates";
import { normalizeEmailTemplates } from "@/lib/email-templates";

export interface BackendStudioPersonalReason {
  id: string;
  legacy_id?: string | null;
  name: string;
  enabled: boolean;
  is_other: boolean;
  sort_order?: number;
}

export interface BackendEmailTemplate {
  id: string;
  subject: string;
  greeting: string;
  intro: string;
  footer: string;
  signature: string;
}

function isUuidLike(value: string | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function transformStudioPersonalReason(
  row: BackendStudioPersonalReason
): StudioPersonalReason {
  return normalizeStudioPersonalReason({
    id: row.legacy_id || row.id,
    name: row.name,
    enabled: row.enabled,
    isOther: row.is_other,
  });
}

export async function fetchStudioPersonalReasonsApi(): Promise<
  StudioPersonalReason[]
> {
  try {
    const rows = await apiClient.get<BackendStudioPersonalReason[]>(
      "/api/studio-personal-reasons"
    );
    return ensurePersonalReasonsList(rows.map(transformStudioPersonalReason));
  } catch (err) {
    console.warn("Failed to fetch personal reasons:", err);
    return [];
  }
}

export async function createStudioPersonalReasonApi(
  reason: StudioPersonalReason
): Promise<StudioPersonalReason> {
  const payload = {
    legacy_id: isUuidLike(reason.id) ? undefined : reason.id,
    name: reason.name,
    enabled: reason.enabled,
    is_other: Boolean(reason.isOther),
  };
  const res = await apiClient.post<BackendStudioPersonalReason>(
    "/api/studio-personal-reasons",
    payload
  );
  return transformStudioPersonalReason(res);
}

export async function updateStudioPersonalReasonApi(
  id: string,
  patch: Partial<StudioPersonalReason>
): Promise<StudioPersonalReason> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.enabled !== undefined) payload.enabled = patch.enabled;
  if (patch.isOther !== undefined) payload.is_other = patch.isOther;
  const res = await apiClient.patch<BackendStudioPersonalReason>(
    `/api/studio-personal-reasons/${id}`,
    payload
  );
  return transformStudioPersonalReason(res);
}

export async function deleteStudioPersonalReasonApi(id: string): Promise<void> {
  await apiClient.delete(`/api/studio-personal-reasons/${id}`);
}

export async function fetchEmailTemplatesApi(): Promise<EmailTemplatesState | null> {
  try {
    const rows = await apiClient.get<BackendEmailTemplate[]>("/api/email-templates");
    if (!rows.length) return null;
    const raw: Partial<EmailTemplatesState> = {};
    for (const row of rows) {
      raw[row.id as EmailTemplateId] = {
        subject: row.subject,
        greeting: row.greeting,
        intro: row.intro,
        footer: row.footer,
        signature: row.signature,
      };
    }
    return normalizeEmailTemplates(raw);
  } catch (err) {
    console.warn("Failed to fetch email templates:", err);
    return null;
  }
}

export async function upsertEmailTemplateApi(
  id: EmailTemplateId,
  copy: EmailTemplateCopy
): Promise<EmailTemplateCopy> {
  const res = await apiClient.put<BackendEmailTemplate>(
    `/api/email-templates/${id}`,
    {
      subject: copy.subject,
      greeting: copy.greeting,
      intro: copy.intro,
      footer: copy.footer,
      signature: copy.signature,
    }
  );
  return {
    subject: res.subject,
    greeting: res.greeting,
    intro: res.intro,
    footer: res.footer,
    signature: res.signature,
  };
}
