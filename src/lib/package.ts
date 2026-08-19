export type ParsedPackage = {
  tier: string;
  limit: string;
};

/** Split values like "PLATINUM 2:30 NO SPLIT" into tier + limit. */
export function parsePackage(packageStr: string): ParsedPackage {
  const value = packageStr.trim();
  if (!value) return { tier: "-", limit: "-" };

  const timeMatch = value.match(/\d+:\d+/);
  if (!timeMatch || timeMatch.index === undefined) {
    if (/\bTBD\b/i.test(value)) {
      const tier = value.replace(/\s+TBD\b/i, "").trim();
      return { tier: tier || value, limit: "TBD" };
    }
    return { tier: value, limit: "-" };
  }

  const tier = value.slice(0, timeMatch.index).trim();
  const limit = value.slice(timeMatch.index).trim();

  return {
    tier: tier || value,
    limit: limit || "-",
  };
}
