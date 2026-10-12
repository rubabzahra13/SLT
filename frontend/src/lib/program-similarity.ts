/** Normalize program labels for fuzzy matching. */
export function normalizeProgramName(name: string | null | undefined): string {
  return String(name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

/**
 * Similarity of two program names in [0, 1].
 * Exact normalized match → 1; empty either side → 0.
 */
export function programNameSimilarity(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  const left = normalizeProgramName(a);
  const right = normalizeProgramName(b);
  if (!left || !right) return 0;
  if (left === right) return 1;

  const maxLen = Math.max(left.length, right.length);
  if (maxLen === 0) return 0;
  return 1 - levenshtein(left, right) / maxLen;
}

/** True when program names match at least `threshold` (default 0.9 = 90%). */
export function programNamesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
  threshold = 0.9
): boolean {
  return programNameSimilarity(a, b) >= threshold;
}
