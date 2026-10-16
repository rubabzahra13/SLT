import { apiClient } from "./client";
import type { DbBackedFormType } from "./pricing-rules";

export type BackendMusicAffiliateOption = {
  id: string;
  form_type: string;
  subtype_id?: string | null;
  option_key: string;
  label: string;
  is_compliant: boolean;
  enabled: boolean;
  sort_order: number;
};

export type MusicAffiliateOptionUpdate = {
  option_key: string;
  label: string;
  is_compliant: boolean;
  enabled?: boolean;
  sort_order?: number;
};

export async function fetchMusicAffiliatesApi(
  formType?: DbBackedFormType,
  subtypeId?: string | null,
  enabledOnly = false
): Promise<BackendMusicAffiliateOption[]> {
  const params = new URLSearchParams();
  if (formType) params.set("form_type", formType);
  if (subtypeId) params.set("subtype_id", subtypeId);
  if (enabledOnly) params.set("enabled_only", "true");
  const qs = params.toString() ? `?${params.toString()}` : "";
  const rows = await apiClient.get<BackendMusicAffiliateOption[]>(
    `/api/music-affiliates${qs}`
  );
  return Array.isArray(rows) ? rows : [];
}

export async function saveMusicAffiliatesApi(
  formType: DbBackedFormType,
  options: MusicAffiliateOptionUpdate[],
  subtypeId?: string | null
): Promise<BackendMusicAffiliateOption[]> {
  const body: {
    form_type: DbBackedFormType;
    options: MusicAffiliateOptionUpdate[];
    subtype_id?: string;
  } = {
    form_type: formType,
    options,
  };
  if (subtypeId) body.subtype_id = subtypeId;
  const rows = await apiClient.put<BackendMusicAffiliateOption[]>(
    "/api/music-affiliates",
    body
  );
  return Array.isArray(rows) ? rows : [];
}
