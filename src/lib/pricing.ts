export type PackagePriceEntry = {
  key: string;
  name: string;
  category: "Cheer" | "Dance" | "School" | "Marching Band" | "Other";
};

export const PACKAGE_CATALOG: PackagePriceEntry[] = [
  { key: "BRONZE 1:30 NO SPLIT", name: "Bronze 1:30 No Split", category: "Cheer" },
  { key: "SILVER 1:30 NO SPLIT", name: "Silver 1:30 No Split", category: "Cheer" },
  { key: "GOLD 1:30 NO SPLIT", name: "Gold 1:30 No Split", category: "Cheer" },
  { key: "GOLD 1:30 TBD", name: "Gold 1:30 TBD", category: "Cheer" },
  { key: "GOLD 1:45 NO SPLIT", name: "Gold 1:45 No Split", category: "Cheer" },
  { key: "GOLD 1:45 SPLIT", name: "Gold 1:45 Split", category: "Cheer" },
  { key: "GOLD 2:00 NO SPLIT", name: "Gold 2:00 No Split", category: "Cheer" },
  { key: "GOLD 2:30 NO SPLIT", name: "Gold 2:30 No Split", category: "Cheer" },
  { key: "PLATINUM 1:30 NO SPLIT", name: "Platinum 1:30 No Split", category: "Cheer" },
  { key: "PLATINUM 1:30 TBD", name: "Platinum 1:30 TBD", category: "Cheer" },
  { key: "PLATINUM 1:45 NO SPLIT", name: "Platinum 1:45 No Split", category: "Cheer" },
  { key: "PLATINUM 1:45 SPLIT", name: "Platinum 1:45 Split", category: "Cheer" },
  { key: "PLATINUM 1:45 TBD", name: "Platinum 1:45 TBD", category: "Cheer" },
  { key: "PLATINUM 2:00 NO SPLIT", name: "Platinum 2:00 No Split", category: "Cheer" },
  { key: "PLATINUM 2:30 NO SPLIT", name: "Platinum 2:30 No Split", category: "Cheer" },
  { key: "TITANIUM 2:30 NO SPLIT", name: "Titanium 2:30 No Split", category: "Cheer" },
  { key: "HOMECOMING MIX TBD", name: "Homecoming Mix TBD", category: "School" },
  { key: "BAND CHANT :30", name: "Band Chant :30", category: "Marching Band" },
];

const DEFAULT_PACKAGE_PRICES: Record<string, number> = {
  "BRONZE 1:30 NO SPLIT": 350,
  "SILVER 1:30 NO SPLIT": 470,
  "GOLD 1:30 NO SPLIT": 600,
  "GOLD 1:30 TBD": 600,
  "GOLD 1:45 NO SPLIT": 750,
  "GOLD 1:45 SPLIT": 800,
  "GOLD 2:00 NO SPLIT": 850,
  "GOLD 2:30 NO SPLIT": 1000,
  "PLATINUM 1:30 NO SPLIT": 850,
  "PLATINUM 1:30 TBD": 850,
  "PLATINUM 1:45 NO SPLIT": 1000,
  "PLATINUM 1:45 SPLIT": 1000,
  "PLATINUM 1:45 TBD": 1000,
  "PLATINUM 2:00 NO SPLIT": 1150,
  "PLATINUM 2:30 NO SPLIT": 1400,
  "TITANIUM 2:30 NO SPLIT": 1400,
  "HOMECOMING MIX TBD": 450,
  "BAND CHANT :30": 200,
};

const NON_COMPLIANT_SURCHARGE = 0.15;

export function getDefaultPackagePrices(): Record<string, number> {
  return { ...DEFAULT_PACKAGE_PRICES };
}

export function detectCompliance(musicTheme: string): "compliant" | "non-compliant" {
  const upper = musicTheme.toUpperCase();
  if (upper.includes("NON COMPLIANT") || upper.includes("NON-COMPLIANT")) {
    return "non-compliant";
  }
  return "compliant";
}

export function getPriceForPackage(
  packageName: string,
  compliance: "compliant" | "non-compliant",
  fallback = 0,
  prices: Record<string, number> = DEFAULT_PACKAGE_PRICES
): number {
  const key = packageName.toUpperCase().trim();
  let base = prices[key] ?? fallback;

  if (base === 0) {
    for (const [pkg, price] of Object.entries(prices)) {
      if (key.includes(pkg.split(" ")[0]) && key.includes(":")) {
        base = price;
        break;
      }
    }
  }

  if (base === 0) base = fallback || 1000;

  if (compliance === "non-compliant") {
    return Math.round(base * (1 + NON_COMPLIANT_SURCHARGE));
  }
  return base;
}

export function complianceLabel(compliance: "compliant" | "non-compliant"): string {
  return compliance === "compliant" ? "Compliant" : "Non-compliant";
}

export function parsePriceInput(value: string): number | null {
  const cleaned = value.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? Math.round(num) : null;
}
