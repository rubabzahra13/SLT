import { apiClient } from "./client";
import {
  PACKAGE_CATALOG,
  getDefaultPackagePrices,
  getDefaultSecretMenuPricing,
  type SecretMenuPricing,
} from "@/lib/pricing";

export type BackendPackagePrice = {
  id: string;
  package_key: string;
  name: string;
  category: string;
  price: number | string;
};

export type BackendSecretMenuPricing = {
  id?: string;
  packageName: string;
  menuTitle: string;
  basePrice: number;
  extraSongTiers: SecretMenuPricing["extraSongTiers"];
};

export function packagePricesFromRows(
  rows: BackendPackagePrice[]
): Record<string, number> {
  const base = getDefaultPackagePrices();
  for (const row of rows) {
    const key = String(row.package_key || "").toUpperCase().trim();
    if (!key) continue;
    base[key] = Number(row.price) || 0;
  }
  return base;
}

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

export async function fetchPackagePricesApi(): Promise<Record<string, number>> {
  const rows = await apiClient.get<BackendPackagePrice[]>("/api/package-prices");
  return packagePricesFromRows(rows || []);
}

export async function savePackagePricesApi(
  prices: Record<string, number>
): Promise<Record<string, number>> {
  const payload = {
    prices: PACKAGE_CATALOG.map((entry) => ({
      package_key: entry.key,
      name: entry.name,
      category: entry.category,
      price: Number(prices[entry.key] ?? 0),
    })),
  };
  const rows = await apiClient.put<BackendPackagePrice[]>(
    "/api/package-prices",
    payload
  );
  return packagePricesFromRows(rows || []);
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
