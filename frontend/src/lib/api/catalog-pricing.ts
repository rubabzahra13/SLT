import { apiClient } from "./client";
import {
  getDefaultSecretMenuPricing,
  type SecretMenuPricing,
} from "@/lib/pricing";

export type BackendSecretMenuPricing = {
  id?: string;
  packageName: string;
  menuTitle: string;
  basePrice: number;
  extraSongTiers: SecretMenuPricing["extraSongTiers"];
};

export function secretMenuFromBackend(
  raw: BackendSecretMenuPricing | null | undefined
): SecretMenuPricing {
  if (!raw) return getDefaultSecretMenuPricing();
  const tiers = Array.isArray(raw.extraSongTiers) ? raw.extraSongTiers : [];
  return {
    packageName: raw.packageName || getDefaultSecretMenuPricing().packageName,
    menuTitle: raw.menuTitle || getDefaultSecretMenuPricing().menuTitle,
    basePrice: Number(raw.basePrice) || 0,
    extraSongTiers: tiers.map((t) => ({
      extraSongs: Number((t as any).extraSongs ?? (t as any).extra_songs) || 0,
      extraCost: Number((t as any).extraCost ?? (t as any).extra_cost) || 0,
      editingMinutes:
        Number((t as any).editingMinutes ?? (t as any).editing_minutes) || 0,
    })),
  };
}

export async function fetchSecretMenuPricingApi(): Promise<SecretMenuPricing> {
  const raw = await apiClient.get<BackendSecretMenuPricing>(
    "/api/secret-menu-pricing"
  );
  return secretMenuFromBackend(raw);
}

export async function saveSecretMenuPricingApi(
  pricing: SecretMenuPricing
): Promise<SecretMenuPricing> {
  const raw = await apiClient.put<BackendSecretMenuPricing>(
    "/api/secret-menu-pricing",
    {
      packageName: pricing.packageName,
      menuTitle: pricing.menuTitle,
      basePrice: pricing.basePrice,
      extraSongTiers: pricing.extraSongTiers,
    }
  );
  return secretMenuFromBackend(raw);
}
