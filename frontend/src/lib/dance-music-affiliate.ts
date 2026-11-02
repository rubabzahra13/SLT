/** POM / All-Star Dance Magento affiliate checkboxes. */
export const DANCE_MUSIC_AFFILIATE_OPTIONS = [
  "Power Music Covers",
  "Unleash the Beats Covers",
  "Non compliant",
] as const;

export type DanceMusicAffiliateOption =
  (typeof DANCE_MUSIC_AFFILIATE_OPTIONS)[number];

function splitSelections(raw: string): string[] {
  return raw
    .split(/[,;/|]+|\s+&\s+|\s+\+\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseDanceMusicAffiliates(value: string): string[] {
  const parts = splitSelections(value || "");
  const selected: string[] = [];
  for (const opt of DANCE_MUSIC_AFFILIATE_OPTIONS) {
    const hit = parts.some((part) => {
      const lower = part.toLowerCase();
      const optLower = opt.toLowerCase();
      if (lower === optLower) return true;
      if (opt === "Non compliant" && /non[\s-]?compliant/i.test(part)) {
        return true;
      }
      if (
        opt === "Power Music Covers" &&
        /power\s*music(\s*covers?)?/i.test(part)
      ) {
        return true;
      }
      if (
        opt === "Unleash the Beats Covers" &&
        /unleash(\s+the\s+beats)?(\s*covers?)?/i.test(part)
      ) {
        return true;
      }
      return false;
    });
    if (hit) selected.push(opt);
  }
  return selected;
}

export function formatDanceMusicAffiliates(selected: string[]): string {
  return selected.join(", ");
}

const COVER_OPTIONS: ReadonlySet<string> = new Set([
  "Power Music Covers",
  "Unleash the Beats Covers",
]);

/**
 * Power Music + Unleash may both be on. Non compliant is exclusive with either cover.
 */
export function normalizeDanceMusicAffiliates(selected: string[]): string[] {
  const ordered = DANCE_MUSIC_AFFILIATE_OPTIONS.filter((opt) =>
    selected.includes(opt)
  );
  const hasNonCompliant = ordered.includes("Non compliant");
  const covers = ordered.filter((opt) => COVER_OPTIONS.has(opt));
  if (hasNonCompliant && covers.length > 0) {
    return ["Non compliant"];
  }
  return ordered;
}

/**
 * Toggle one dance Music Affiliate checkbox with cover / Non compliant exclusivity.
 */
export function toggleDanceMusicAffiliate(
  selected: string[],
  option: DanceMusicAffiliateOption
): string[] {
  const current = normalizeDanceMusicAffiliates(selected);
  const isOn = current.includes(option);
  if (isOn) {
    return current.filter((item) => item !== option);
  }
  if (option === "Non compliant") {
    return ["Non compliant"];
  }
  return normalizeDanceMusicAffiliates([
    ...current.filter((item) => item !== "Non compliant"),
    option,
  ]);
}

/**
 * All-Star Dance may select both Power Music Covers and Unleash the Beats
 * Covers together: that pair alone is not a multi-affiliate flag.
 */
export function isAllowedAllStarDanceCoverPair(
  selections: string[] | null | undefined
): boolean {
  if (!selections || selections.length !== 2) return false;
  const set = new Set(selections);
  return (
    set.has("Power Music Covers") && set.has("Unleash the Beats Covers")
  );
}
