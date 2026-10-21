import type { MTDRecord, Order } from "@/types";
import {
  COMPLIANT_AFFILIATE_OPTIONS,
  NON_COMPLIANT_AFFILIATE_OPTIONS,
} from "@/lib/pricing-reference";
import { affiliateCompactKey } from "@/lib/pricing-engine";
import { findLinkedOrder } from "@/lib/editor-assignment";
import {
  formatDanceMusicAffiliates,
  isAllowedAllStarDanceCoverPair,
  parseDanceMusicAffiliates,
} from "@/lib/dance-music-affiliate";

export type AffiliateFlagStatus = "open" | "resolved" | "released";

/** Cheer form affiliate labels (checkbox options) — excludes dance-only covers. */
export const CHEER_MUSIC_AFFILIATE_LABELS: string[] = [
  ...COMPLIANT_AFFILIATE_OPTIONS.filter((o) => !o.danceOnly).map((o) => o.label),
  ...NON_COMPLIANT_AFFILIATE_OPTIONS.map((o) => o.label),
].sort((a, b) => b.length - a.length); // longest-first for matching

function compact(value: string): string {
  return affiliateCompactKey(value);
}

export { isAllowedAllStarDanceCoverPair };

/**
 * Extract distinct known cheer affiliates from a raw musicAffiliate string.
 * Treats "Power Music + Unleash the Beats" as one option (longest-first match).
 */
export function parseSelectedMusicAffiliates(
  raw: string | null | undefined
): string[] {
  const text = String(raw || "").trim();
  if (!text) return [];

  // Exact single-option match (normalize whitespace/case only — keep + vs comma)
  const exactKey = text.toUpperCase().replace(/\s+/g, " ").trim();
  const exact = CHEER_MUSIC_AFFILIATE_LABELS.find(
    (label) => label.toUpperCase().replace(/\s+/g, " ").trim() === exactKey
  );
  if (exact) return [exact];

  const haystack = text;
  const found: { label: string; index: number }[] = [];
  const usedRanges: [number, number][] = [];

  for (const label of CHEER_MUSIC_AFFILIATE_LABELS) {
    const key = compact(label);
    if (!key) continue;
    // Scan compact forms via regex on original with flexible spacing
    // Preserve real "+" before escaping so it stays a required plus (not optional).
    const pattern = label
      .replace(/\+/g, "\0PLUS\0")
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\s+/g, "\\s+")
      .replace(/\0PLUS\0/g, "\\s*\\+\\s*");
    const re = new RegExp(pattern, "gi");
    let match: RegExpExecArray | null;
    while ((match = re.exec(haystack)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const overlaps = usedRanges.some(
        ([a, b]) => start < b && end > a
      );
      if (overlaps) continue;
      usedRanges.push([start, end]);
      found.push({ label, index: start });
    }
  }

  const fromLabels: string[] = [];
  const seenLabels = new Set<string>();
  for (const entry of found.sort((a, b) => a.index - b.index)) {
    const key = compact(entry.label);
    if (seenLabels.has(key)) continue;
    seenLabels.add(key);
    fromLabels.push(entry.label);
  }
  if (fromLabels.length >= 2) return fromLabels;

  // Fallback: split on common multi-select delimiters (not bare "+")
  const parts = text
    .split(/\s*(?:,|;|\||\/|\nand\n|\s+and\s+)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const mapped = parts.map((part) => {
      const known = CHEER_MUSIC_AFFILIATE_LABELS.find(
        (label) => compact(label) === compact(part)
      );
      return known || part;
    });
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const part of mapped) {
      const key = compact(part);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      unique.push(part);
    }
    if (unique.length >= 2) return unique;
  }

  if (fromLabels.length === 1) return fromLabels;
  return text ? [text] : [];
}

export function isMultiAffiliateSelection(
  raw: string | null | undefined
): boolean {
  return parseSelectedMusicAffiliates(raw).length >= 2;
}

type FormMeta = {
  formType?: Order["formType"] | null;
  category?: string | null;
};

export function isCheerFormOrder(order: FormMeta | null | undefined): boolean {
  if (!order) return false;
  if (order.formType === "school-all-star-cheer") return true;
  const cat = String(order.category || "").toLowerCase();
  return cat.includes("cheer") && !cat.includes("dance");
}

/** All-Star Dance Magento form (POM / Hip Hop / TPV / Gameday / Jazz-Kick). */
export function isDanceFormOrder(order: FormMeta | null | undefined): boolean {
  if (!order) return false;
  if (order.formType === "school-all-star-dance") return true;
  const cat = String(order.category || "").toLowerCase();
  return cat.includes("dance") && !cat.includes("cheer");
}

export function formatAffiliateSelectionsList(selections: string[]): string {
  return selections.map((s, i) => `${i + 1}. ${s}`).join("\n");
}

export function getOrderAffiliateFlagStatus(
  order: Order | null | undefined
): AffiliateFlagStatus | null {
  const status = order?.affiliateFlagStatus;
  if (status === "open" || status === "resolved" || status === "released") {
    return status;
  }
  return null;
}

/** Raw multi-select text: stored selections, else current musicAffiliate. */
export function getAffiliateSelectionsRaw(
  order: Order | null | undefined,
  record?: MTDRecord | null
): string {
  if (order?.musicAffiliateSelections?.trim()) {
    return order.musicAffiliateSelections.trim();
  }
  const fromOrder = order?.musicAffiliate?.trim() || "";
  if (fromOrder) return fromOrder;
  return (
    (record as MTDRecord & { musicAffiliate?: string })?.musicAffiliate?.trim() ||
    ""
  );
}

function formMetaFromOrderOrRecord(
  order: Order | null | undefined,
  record?: MTDRecord | null
): FormMeta | null {
  if (order) return order;
  if (!record) return null;
  return {
    formType: record.formType,
    category: record.category,
  };
}

export function getAffiliateSelections(
  order: Order | null | undefined,
  record?: MTDRecord | null
): string[] {
  const raw = getAffiliateSelectionsRaw(order, record);
  const meta = formMetaFromOrderOrRecord(order, record);
  if (isDanceFormOrder(meta)) {
    return parseDanceMusicAffiliates(raw);
  }
  return parseSelectedMusicAffiliates(raw);
}

/**
 * True when multi-affiliate selections should open / hold an affiliate flag.
 * All-Star Dance Power Music Covers + Unleash the Beats Covers is allowed.
 */
export function isInvalidMultiAffiliateSelection(
  order: Order | null | undefined,
  record?: MTDRecord | null
): boolean {
  if (!order && !record) return false;
  const selections = getAffiliateSelections(order, record);
  if (selections.length < 2) return false;
  const meta = formMetaFromOrderOrRecord(order, record);
  if (isDanceFormOrder(meta) && isAllowedAllStarDanceCoverPair(selections)) {
    return false;
  }
  return true;
}

/**
 * True when this booking should sit on Flagged only (not the Orders board).
 * Magento multi-affiliate forms stay here until an admin Resolves one affiliate.
 * `resolved` / `released` both belong on Orders.
 */
export function isHeldOnAffiliateFlag(
  order: Order | null | undefined,
  record?: MTDRecord | null
): boolean {
  if (!order && !record) return false;
  const status = getOrderAffiliateFlagStatus(order);
  if (status === "released" || status === "resolved") return false;
  if (status === "open") return true;

  // Auto-detect: cheer or dance form with invalid multi affiliates (API / hydrate).
  const meta = formMetaFromOrderOrRecord(order, record);
  if (meta && !isCheerFormOrder(meta) && !isDanceFormOrder(meta)) {
    return false;
  }
  return isInvalidMultiAffiliateSelection(order, record);
}

export function isAffiliateFlagResolved(
  order: Order | null | undefined
): boolean {
  return getOrderAffiliateFlagStatus(order) === "resolved";
}

export function recordHeldOnAffiliateFlag(
  record: MTDRecord,
  orders?: Order[] | Map<string, Order> | null
): boolean {
  let linked: Order | null = null;
  if (orders instanceof Map) {
    linked =
      (record.orderId ? orders.get(record.orderId) : undefined) ||
      orders.get(record.id) ||
      (record.uuid ? orders.get(record.uuid) : undefined) ||
      (record.legacyId ? orders.get(record.legacyId) : undefined) ||
      null;
  } else if (orders?.length) {
    linked = findLinkedOrder(record, orders) ?? null;
  }
  return isHeldOnAffiliateFlag(linked, record);
}

/** Patch to open a flag when invalid multi-affiliate form arrives. */
export function openAffiliateFlagPatch(order: Order): Partial<Order> | null {
  if (!isCheerFormOrder(order) && !isDanceFormOrder(order)) return null;
  if (getOrderAffiliateFlagStatus(order) === "released") return null;
  if (getOrderAffiliateFlagStatus(order) === "resolved") return null;
  if (getOrderAffiliateFlagStatus(order) === "open") return null;

  if (!isInvalidMultiAffiliateSelection(order)) return null;

  const raw =
    order.musicAffiliateSelections?.trim() || order.musicAffiliate || "";
  const selections = getAffiliateSelections(order);
  const stored =
    isDanceFormOrder(order) && selections.length
      ? formatDanceMusicAffiliates(selections)
      : raw;

  return {
    affiliateFlagStatus: "open",
    musicAffiliateSelections: stored,
    needsAttention: true,
    attentionReason: order.attentionReason || "Multiple music affiliates selected",
  };
}

export function resolveAffiliateFlagPatch(
  order: Order,
  chosenAffiliate: string
): Partial<Order> {
  const selections = getAffiliateSelections(order);
  const joined = isDanceFormOrder(order)
    ? formatDanceMusicAffiliates(selections)
    : selections.length
      ? selections.join(", ")
      : order.musicAffiliate || "";
  return {
    musicAffiliate: chosenAffiliate.trim(),
    musicAffiliateSelections:
      order.musicAffiliateSelections?.trim() || joined,
    // Resolved = chosen; also release so the order joins the normal Orders board.
    affiliateFlagStatus: "released",
    needsAttention: false,
  };
}

export function releaseAffiliateFlagPatch(): Partial<Order> {
  return {
    affiliateFlagStatus: "released",
  };
}
