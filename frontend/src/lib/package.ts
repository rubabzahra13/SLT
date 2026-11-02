export type ParsedPackage = {
  tier: string;
  /** Time limit like "2:30" or "TBD" */
  limit: string;
  /** "Split", "No Split", or "-" */
  split: string;
};

/**
 * Package type column is tier only (e.g. Gold / TBD). Strip mix length like
 * "1:00" that sometimes leaked into package_type from the legacy composed label.
 */
export function packageTierOnly(packageStr?: string | null): string {
  const value = String(packageStr ?? "").trim();
  if (!value) return "";
  const parsed = parsePackage(value);
  if (parsed.tier && parsed.tier !== "-") return parsed.tier;
  return value.replace(/\s+\d+:\d{2}\b/g, "").trim();
}

/** Split values like "PLATINUM 2:30 NO SPLIT" into tier, limit, and split. */
export function parsePackage(packageStr?: string | null): ParsedPackage {
  const value = String(packageStr ?? "").trim();
  if (!value) return { tier: "-", limit: "-", split: "-" };

  const upper = value.toUpperCase();
  let split = "-";
  if (/\bNO\s+SPLIT\b/.test(upper)) {
    split = "No Split";
  } else if (/\bSPLIT\b/.test(upper)) {
    split = "Split";
  }

  const withoutSplit = value
    .replace(/\s+NO\s+SPLIT\b/i, "")
    .replace(/\s+SPLIT\b/i, "")
    .trim();

  const timeMatch = withoutSplit.match(/\d+:\d+/);
  if (!timeMatch || timeMatch.index === undefined) {
    if (/\bTBD\b/i.test(withoutSplit)) {
      const tier = withoutSplit.replace(/\s+TBD\b/i, "").trim();
      return { tier: tier || withoutSplit, limit: "TBD", split };
    }
    return { tier: withoutSplit || value, limit: "-", split };
  }

  const tier = withoutSplit.slice(0, timeMatch.index).trim();
  const limit = timeMatch[0];

  return {
    tier: tier || withoutSplit,
    limit,
    split,
  };
}
