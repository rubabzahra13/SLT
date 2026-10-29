import {
  FIELDS_ALLOWING_NA_PLACEHOLDER,
  normalizeFieldToken,
} from "@/lib/empty-field-tokens";
import { getOrderDetailSections } from "@/lib/order-detail-sections";
import { rawFieldValue } from "@/lib/order-detail-fields";
import type { Order } from "@/types";

/**
 * Email keys that appear on Magento / Add Order category forms.
 * Any domain is fine (@gmail.com, @school.edu, …): format only.
 */
export const ORDER_EMAIL_FIELD_KEYS = new Set([
  "coachEmail",
  "coachEmailAddress",
  "billingPersonEmail",
  "billingContactEmail",
  "choreographerEmail",
  "virocChoreographerEmail",
  "musicContactEmail",
  "youthRecExtraEmailAddress",
  "emailAddress",
]);

/** Practical address check: local@domain.tld: not Gmail-only. */
const EMAIL_FORMAT =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

const NA_ALLOWED = new Set(["n/a", "n.a", "n.a.", "na", "#n/a", "#na", "not applicable"]);

export function isOrderEmailFieldKey(key: string): boolean {
  return ORDER_EMAIL_FIELD_KEYS.has(key) || /email/i.test(key);
}

export function isValidEmailFormat(value: string): boolean {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 254) return false;
  if (raw.includes("..") || raw.startsWith(".") || raw.includes("@.")) return false;
  return EMAIL_FORMAT.test(raw);
}

/**
 * Empty is allowed (optional on Add Order). Non-empty must be a valid email,
 * except Magento choreographer fields that may be N/A.
 */
export function isAcceptableOrderEmailValue(
  value: string | null | undefined,
  fieldKey?: string
): boolean {
  const raw = String(value ?? "").trim();
  if (!raw) return true;
  if (fieldKey && FIELDS_ALLOWING_NA_PLACEHOLDER.has(fieldKey)) {
    if (NA_ALLOWED.has(normalizeFieldToken(raw))) return true;
  }
  return isValidEmailFormat(raw);
}

export type OrderEmailFormatGap = {
  key: string;
  label: string;
  value: string;
};

/** Non-empty email fields on this order's form that fail format check. */
export function getInvalidOrderEmailFields(order: Order): OrderEmailFormatGap[] {
  const gaps: OrderEmailFormatGap[] = [];
  const seen = new Set<string>();
  for (const section of getOrderDetailSections(order)) {
    for (const field of section.fields) {
      if (!isOrderEmailFieldKey(field.key) || seen.has(field.key)) continue;
      seen.add(field.key);
      const value = rawFieldValue(order, field.key).trim();
      if (!value) continue;
      if (isAcceptableOrderEmailValue(value, field.key)) continue;
      gaps.push({ key: field.key, label: field.label, value });
    }
  }
  return gaps;
}

export function formatOrderEmailFormatBlockReason(
  gaps: OrderEmailFormatGap[]
): string {
  if (gaps.length === 0) return "";
  if (gaps.length === 1) {
    return `Enter a valid email for ${gaps[0].label}.`;
  }
  const labels = gaps.map((g) => g.label).slice(0, 4);
  const extra = gaps.length - labels.length;
  return [
    "Fix invalid email addresses:",
    labels.join(", ") + (extra > 0 ? ` (+${extra} more)` : ""),
  ].join("\n");
}
