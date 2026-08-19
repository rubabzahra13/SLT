const PACKAGE_PRICES: Record<string, number> = {
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
};

const NON_COMPLIANT_SURCHARGE = 0.15;

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
  fallback = 0
): number {
  const key = packageName.toUpperCase().trim();
  let base = PACKAGE_PRICES[key] ?? fallback;

  if (base === 0) {
    for (const [pkg, price] of Object.entries(PACKAGE_PRICES)) {
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
