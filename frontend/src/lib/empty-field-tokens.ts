/**
 * Sentinel / placeholder tokens that customers type when a field is unset.
 *
 * Professional practice (OpenDMI placeholders, warehouse NULLIF cleanup,
 * form-validation blank sets) is to keep this as a frozen in-code dictionary -
 * not a DB table. These values rarely change and must stay identical across
 * collection pills and Move-to-MTD form validation.
 *
 * Intentionally omitted: "yes" / "no": valid answers on binary Magento fields
 * (8-count sheets, rush order, voiceovers, licensing).
 */

/** Canonical forms (lowercase, punctuation stripped where noted). */
export const EMPTY_FIELD_TOKENS = [
  // Explicit null / empty language
  "null",
  "nil",
  "none",
  "nothing",
  "empty",
  "[empty]",
  "blank",
  "missing",
  "undefined",
  "n/a",
  "n.a",
  "n.a.",
  "na",
  "#n/a",
  "#na",
  "not applicable",
  "not available",
  "not specified",
  "not provided",
  "not set",
  "not given",
  "no data",
  "no info",
  "no information",
  // Deferred / unknown
  "tbd",
  "tba",
  "pending",
  "unknown",
  "idk",
  "to be determined",
  "to be decided",
  "to be filled",
  "placeholder",
  "dummy",
  "test",
  // Punctuation-only / dash placeholders
  "-",
  "--",
  "---",
  ".",
  "..",
  "...",
  "…",
  // UI select leftovers (also checked in form-missing)
  "select",
  "select…",
  "select...",
  "please choose one",
  "please choose one…",
  "please choose one...",
] as const;

export type EmptyFieldToken = (typeof EMPTY_FIELD_TOKENS)[number];

/**
 * Fields where Magento copy tells the customer to type N/A when irrelevant.
 * Bare N/A (and close variants) count as filled for these keys only.
 */
export const FIELDS_ALLOWING_NA_PLACEHOLDER = new Set([
  "choreographerName",
  "choreographerEmail",
]);

const NA_ALLOWED_TOKENS = new Set([
  "n/a",
  "n.a",
  "n.a.",
  "na",
  "#n/a",
  "#na",
  "not applicable",
]);

/** Normalize for token match: trim, lowercase, collapse whitespace, unify dashes. */
export function normalizeFieldToken(value: string): string {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[_/\\|]+/g, "/")
    .replace(/\s+/g, " ")
    .replace(/^[\[\(\{]+|[\]\)\}]+$/g, "")
    .trim();
}

const TOKEN_SET = new Set<string>(
  EMPTY_FIELD_TOKENS.map((t) => normalizeFieldToken(t))
);

export type EmptyFieldCheckOptions = {
  /** When true, N/A-family tokens are treated as real content. */
  allowNa?: boolean;
  /** Order form field key: enables N/A allowlist for choreographer fields. */
  fieldKey?: string;
};

function allowsNa(options?: EmptyFieldCheckOptions): boolean {
  if (options?.allowNa) return true;
  if (options?.fieldKey && FIELDS_ALLOWING_NA_PLACEHOLDER.has(options.fieldKey)) {
    return true;
  }
  return false;
}

/** True when the whole string is a known empty/placeholder token. */
export function isEmptyFieldToken(
  value: string | null | undefined,
  options?: EmptyFieldCheckOptions
): boolean {
  if (value == null) return true;
  const normalized = normalizeFieldToken(String(value));
  if (!normalized) return true;
  if (allowsNa(options) && NA_ALLOWED_TOKENS.has(normalized)) return false;
  return TOKEN_SET.has(normalized);
}

/**
 * True when a string has meaningful content for mandatory / collection checks.
 * Empty string, whitespace-only, and EMPTY_FIELD_TOKENS → false.
 */
export function hasMeaningfulFieldValue(
  value: string | null | undefined,
  options?: EmptyFieldCheckOptions
): boolean {
  if (value == null) return false;
  const raw = String(value).trim();
  if (!raw) return false;
  return !isEmptyFieldToken(raw, options);
}

/** Human label for UI when the stored value is a placeholder. */
export function describeEmptyFieldToken(
  value: string | null | undefined
): string | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (!isEmptyFieldToken(raw)) return null;
  return raw;
}

/** Inline / modal hint when a field holds a dictionary placeholder. */
export function placeholderFieldErrorMessage(
  value: string | null | undefined
): string {
  const shown = String(value || "").trim() || "that value";
  return `“${shown}” is a placeholder. Enter a real value.`;
}

/**
 * Draft text for Songs/Notes/Mix “turn green” modal.
 * Never seed the textarea with a placeholder: admin types a real value.
 */
export function initialCollectionGreenDraft(
  currentText: string | null | undefined
): string {
  void currentText;
  return "";
}

/**
 * Detect placeholder text for the red→green collection modal amber panel.
 * Handles single tokens, comma-separated tokens, and labeled Dance cover blocks.
 */
export function resolveCollectionPlaceholderOnFile(
  currentText: string | null | undefined
): string | null {
  const raw = String(currentText || "").trim();
  if (!raw) return null;

  const exact = describeEmptyFieldToken(raw);
  if (exact) return exact;

  const powerMatch = raw.match(
    /Power Music Covers:\s*\n?\s*([^\n]+)/i
  );
  const unleashMatch = raw.match(
    /Unleash the Beats Covers:\s*\n?\s*([^\n]+)/i
  );
  if (powerMatch || unleashMatch) {
    const power = powerMatch?.[1]?.trim() || "";
    const unleash = unleashMatch?.[1]?.trim() || "";
    if (hasMeaningfulFieldValue(power) || hasMeaningfulFieldValue(unleash)) {
      return null;
    }
    const tokens: string[] = [];
    if (power && isEmptyFieldToken(power)) tokens.push(power);
    if (unleash && isEmptyFieldToken(unleash)) tokens.push(unleash);
    return tokens.length ? [...new Set(tokens)].join(", ") : null;
  }

  const parts = raw
    .split(/\s*(?:,|;|\||\/)\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (
    parts.length >= 2 &&
    parts.every((p) => isEmptyFieldToken(p))
  ) {
    return parts.join(", ");
  }

  return null;
}
