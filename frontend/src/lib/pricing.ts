export type SecretMenuExtraSongTier = {
  extraSongs: number;
  extraCost: number;
  editingMinutes: number;
};

export type SecretMenuPricing = {
  packageName: string;
  menuTitle: string;
  basePrice: number;
  extraSongTiers: SecretMenuExtraSongTier[];
};

const DEFAULT_SECRET_MENU_PRICING: SecretMenuPricing = {
  packageName: "Semi-Custom Plus Package",
  menuTitle: "Semi-Custom Hip Hop & Custom POM Package Secret Menu",
  basePrice: 850,
  extraSongTiers: [
    { extraSongs: 1, extraCost: 15, editingMinutes: 30 },
    { extraSongs: 2, extraCost: 30, editingMinutes: 60 },
    { extraSongs: 3, extraCost: 45, editingMinutes: 90 },
    { extraSongs: 4, extraCost: 60, editingMinutes: 120 },
    { extraSongs: 5, extraCost: 75, editingMinutes: 150 },
    { extraSongs: 6, extraCost: 90, editingMinutes: 180 },
  ],
};

export function getDefaultSecretMenuPricing(): SecretMenuPricing {
  return {
    ...DEFAULT_SECRET_MENU_PRICING,
    extraSongTiers: DEFAULT_SECRET_MENU_PRICING.extraSongTiers.map((tier) => ({
      ...tier,
    })),
  };
}

export function getSecretMenuPerSongRates(pricing: SecretMenuPricing): {
  costPerSong: number;
  minutesPerSong: number;
} {
  const first =
    pricing.extraSongTiers.find((tier) => tier.extraSongs === 1) ??
    pricing.extraSongTiers[0];
  if (!first || first.extraSongs <= 0) {
    return { costPerSong: 0, minutesPerSong: 0 };
  }

  return {
    costPerSong: Math.round((first.extraCost / first.extraSongs) * 100) / 100,
    minutesPerSong: Math.round(first.editingMinutes / first.extraSongs),
  };
}

export function applySecretMenuPerSongRates(
  pricing: SecretMenuPricing,
  patch: {
    basePrice?: number;
    costPerSong?: number;
    minutesPerSong?: number;
  }
): SecretMenuPricing {
  const current = getSecretMenuPerSongRates(pricing);
  const costPerSong = patch.costPerSong ?? current.costPerSong;
  const minutesPerSong = patch.minutesPerSong ?? current.minutesPerSong;
  const basePrice = patch.basePrice ?? pricing.basePrice;

  const extraSongTiers =
    pricing.extraSongTiers.length > 0
      ? pricing.extraSongTiers.map((tier) => ({
          extraSongs: tier.extraSongs,
          extraCost: Math.round(costPerSong * tier.extraSongs),
          editingMinutes: Math.round(minutesPerSong * tier.extraSongs),
        }))
      : [{ extraSongs: 1, extraCost: costPerSong, editingMinutes: minutesPerSong }];

  return {
    ...pricing,
    basePrice,
    extraSongTiers,
  };
}

export function detectCompliance(musicTheme: string): "compliant" | "non-compliant" {
  const upper = musicTheme.toUpperCase();
  if (upper.includes("NON COMPLIANT") || upper.includes("NON-COMPLIANT")) {
    return "non-compliant";
  }
  return "compliant";
}

export function complianceLabel(compliance: "compliant" | "non-compliant"): string {
  return compliance === "compliant" ? "Compliant" : "Non-compliant";
}

export function parseIntegerInput(value: string): number | null {
  const cleaned = value.replace(/[^0-9]/g, "");
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? Math.round(num) : null;
}

export function parsePriceInput(value: string): number | null {
  const cleaned = value.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? Math.round(num) : null;
}
