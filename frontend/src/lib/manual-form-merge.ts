import type { Order } from "@/types";
import { getOrderIdentityName } from "@/lib/order-detail-sections";
import { programNameSimilarity, programNamesMatch } from "@/lib/program-similarity";

function resolveCheerSubtype(order: Order): string {
  if (order.cheerFormSubtype) return order.cheerFormSubtype;
  const viroc = String(order.varsityVirocCustomer || "").trim().toLowerCase();
  if (viroc === "yes") return "school-cheer-viroc-yes";
  if (viroc === "no") return "school-cheer-viroc-no";
  return "";
}

function resolveDanceSubtype(order: Order): string {
  const raw = String(order.danceFormSubtype || "").trim();
  if (raw === "team-performance" || raw.startsWith("team-performance")) {
    return "team-performance-variety";
  }
  return raw;
}

/**
 * Form ↔ manual pairing only within the exact same category/subtype.
 * Cross-form or cross-subtype (incl. V!ROC Yes vs No) never merges.
 */
export function sameOrderCategory(a: Order, b: Order): boolean {
  const aForm = String(a.formType || "").trim();
  const bForm = String(b.formType || "").trim();
  if (!aForm || !bForm || aForm !== bForm) return false;

  if (aForm === "school-all-star-cheer") {
    const aSub = resolveCheerSubtype(a);
    const bSub = resolveCheerSubtype(b);
    // Both must have the same concrete cheer subtype (all-star / viroc / youth).
    return Boolean(aSub) && aSub === bSub;
  }

  if (aForm === "school-all-star-dance") {
    const aSub = resolveDanceSubtype(a);
    const bSub = resolveDanceSubtype(b);
    return Boolean(aSub) && aSub === bSub;
  }

  // marching-band / sports-entertainment / school-anthem — formType alone.
  return true;
}

function identityNamesMatch(a: Order, b: Order, threshold = 0.9): boolean {
  return programNamesMatch(
    getOrderIdentityName(a),
    getOrderIdentityName(b),
    threshold
  );
}

function identityNameSimilarity(a: Order, b: Order): number {
  return programNameSimilarity(getOrderIdentityName(a), getOrderIdentityName(b));
}

/** Keys never overwritten from a form order onto a manual order. */
const PROTECTED_ORDER_KEYS = new Set<string>([
  "id",
  "uuid",
  "legacyId",
  "isManualEntry",
  "createdAt",
  "status",
  "assignedProducer",
  "mixStartDate",
  "mixEndDate",
  "isReassigned",
  "missingDataEmailSentAt",
  "producerEmailSentAt",
  "producerEmailSentTo",
  "collectionStates",
  "orderStatus",
  "mergedFormOrderId",
  "mergedIntoManualOrderId",
  "manualOverlapSnapshot",
  "suppressManualFormMerge",
  "finalCustomerPrice",
  "finalCustomerPriceOverridden",
  "finalPayrollPrice",
  "systemCalculatedCustomerPrice",
  "pricingBreakdown",
  "rateUsed",
  "rateSource",
  "producerPayout",
  "manualPayoutInput",
  "sltPortion",
  "payrollFinalized",
  "payrollBreakdown",
]);

export type FieldDataSource = "form" | "manual";

export type ManualFormPair = {
  manual: Order;
  form: Order;
};

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return !value.trim();
  if (typeof value === "number") return Number.isNaN(value);
  if (typeof value === "boolean") return false;
  return false;
}

function orderKey(order: Order): string {
  return order.id || order.uuid || order.legacyId || "";
}

function ordersMatchId(order: Order, id: string | undefined | null): boolean {
  if (!id) return false;
  return order.id === id || order.uuid === id || order.legacyId === id;
}

export function isAbsorbedFormOrder(order: Order): boolean {
  return Boolean(order.mergedIntoManualOrderId) && !order.isManualEntry;
}

/** Best manual order whose program matches the form order at ≥ threshold. */
export function findMatchingManualOrder(
  formOrder: Order,
  orders: Order[],
  threshold = 0.9
): Order | null {
  if (formOrder.isManualEntry) return null;
  if (formOrder.suppressManualFormMerge) return null;

  let best: Order | null = null;
  let bestScore = threshold;
  for (const candidate of orders) {
    if (!candidate.isManualEntry) continue;
    if (candidate.suppressManualFormMerge) continue;
    if (candidate.status === "completed" || candidate.status === "in_mtd") continue;
    if (!sameOrderCategory(formOrder, candidate)) continue;
    const score = identityNameSimilarity(formOrder, candidate);
    if (score >= bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

function findFormLinkedToManual(
  manual: Order,
  allOrders: Order[]
): Order | null {
  const manualId = orderKey(manual);
  if (manual.mergedFormOrderId) {
    const byId = allOrders.find(
      (o) => !o.isManualEntry && ordersMatchId(o, manual.mergedFormOrderId)
    );
    if (byId) return byId;
  }

  const byAbsorbed = allOrders.find(
    (o) =>
      !o.isManualEntry &&
      (o.mergedIntoManualOrderId === manualId ||
        o.mergedIntoManualOrderId === manual.id ||
        o.mergedIntoManualOrderId === manual.uuid ||
        o.mergedIntoManualOrderId === manual.legacyId)
  );
  if (byAbsorbed) return byAbsorbed;

  if (manual.suppressManualFormMerge) return null;

  return (
    allOrders.find(
      (o) =>
        !o.isManualEntry &&
        !o.suppressManualFormMerge &&
        o.status !== "completed" &&
        sameOrderCategory(manual, o) &&
        identityNamesMatch(o, manual)
    ) || null
  );
}

function findManualLinkedToForm(
  form: Order,
  allOrders: Order[]
): Order | null {
  if (form.mergedIntoManualOrderId) {
    const byLink = allOrders.find(
      (o) =>
        o.isManualEntry && ordersMatchId(o, form.mergedIntoManualOrderId)
    );
    if (byLink) return byLink;
  }

  const byMergedForm = allOrders.find(
    (o) => o.isManualEntry && ordersMatchId(form, o.mergedFormOrderId)
  );
  if (byMergedForm) return byMergedForm;

  return findMatchingManualOrder(form, allOrders);
}

/** Resolve a manual↔form pair when both sides exist for this order. */
export function resolveManualFormPair(
  order: Order,
  allOrders: Order[]
): ManualFormPair | null {
  if (order.isManualEntry) {
    const form = findFormLinkedToManual(order, allOrders);
    if (!form) return null;
    return { manual: order, form };
  }

  const manual = findManualLinkedToForm(order, allOrders);
  if (!manual) return null;
  return { manual, form: order };
}

/**
 * Which side(s) contributed a non-empty value for this field.
 * Used for Form / Manual tags on the edit view.
 */
export function classifyFieldSources(
  key: string,
  manual: Order,
  form: Order
): FieldDataSource[] {
  if (PROTECTED_ORDER_KEYS.has(key)) return [];
  const manualVal = (manual as Record<string, unknown>)[key];
  const formVal = (form as Record<string, unknown>)[key];
  const sources: FieldDataSource[] = [];
  if (!isEmptyValue(manualVal)) sources.push("manual");
  if (!isEmptyValue(formVal)) sources.push("form");
  return sources;
}

/** Map of detail-field key → Form/Manual tags for the edit UI. */
export function buildFieldSourceMap(
  manual: Order,
  form: Order,
  fieldKeys: string[]
): Record<string, FieldDataSource[]> {
  const map: Record<string, FieldDataSource[]> = {};
  for (const key of fieldKeys) {
    const sources = classifyFieldSources(key, manual, form);
    if (sources.length > 0) map[key] = sources;
  }
  return map;
}

/**
 * Fill empty manual fields from form; keep manual values when present.
 * Result stays `isManualEntry: true` and records the absorbed form id.
 */
export function mergeFormIntoManualOrder(manual: Order, form: Order): Order {
  const out: Order = {
    ...manual,
    isManualEntry: true,
    mergedFormOrderId: form.id || form.uuid || form.legacyId,
  };

  for (const key of Object.keys(form) as (keyof Order)[]) {
    if (PROTECTED_ORDER_KEYS.has(key as string)) continue;
    const manualVal = manual[key];
    const formVal = form[key];
    if (isEmptyValue(manualVal) && !isEmptyValue(formVal)) {
      (out as Record<string, unknown>)[key as string] = formVal;
    }
  }

  // Prefer form taxonomy when the manual row was created without a real form type.
  if (!manual.formType && form.formType) out.formType = form.formType;
  if (!manual.cheerFormSubtype && form.cheerFormSubtype) {
    out.cheerFormSubtype = form.cheerFormSubtype;
  }
  if (!manual.danceFormSubtype && form.danceFormSubtype) {
    out.danceFormSubtype = form.danceFormSubtype;
  }

  // Keep Missing data flow: if either side needed attention, stay flagged until filled.
  if (manual.needsAttention || form.needsAttention) {
    out.needsAttention = true;
    out.attentionReason =
      manual.attentionReason || form.attentionReason || out.attentionReason;
  }

  return out;
}

/**
 * Admin Merge: form wins on overlap; keep manual-only fields.
 * Stashes overwritten manual values so Split can restore them.
 */
export function mergeFormWinsIntoManualOrder(manual: Order, form: Order): Order {
  const snapshot: Record<string, unknown> = {
    ...(manual.manualOverlapSnapshot || {}),
  };
  const out: Order = {
    ...manual,
    isManualEntry: true,
    mergedFormOrderId: form.id || form.uuid || form.legacyId,
    suppressManualFormMerge: false,
  };

  for (const key of Object.keys(form) as (keyof Order)[]) {
    if (PROTECTED_ORDER_KEYS.has(key as string)) continue;
    const manualVal = manual[key];
    const formVal = form[key];
    if (isEmptyValue(formVal)) continue;

    if (!isEmptyValue(manualVal) && manualVal !== formVal) {
      snapshot[key as string] = manualVal;
    }
    (out as Record<string, unknown>)[key as string] = formVal;
  }

  if (form.formType) out.formType = form.formType;
  if (form.cheerFormSubtype) out.cheerFormSubtype = form.cheerFormSubtype;
  if (form.danceFormSubtype) out.danceFormSubtype = form.danceFormSubtype;

  out.manualOverlapSnapshot =
    Object.keys(snapshot).length > 0 ? snapshot : undefined;

  if (manual.needsAttention || form.needsAttention) {
    out.needsAttention = true;
    out.attentionReason =
      manual.attentionReason || form.attentionReason || out.attentionReason;
  }

  return out;
}

/** Patch to persist form-wins merge onto the manual + absorb the form. */
export function mergeFormWinsPatches(
  manual: Order,
  form: Order
): { manualPatch: Partial<Order>; formPatch: Partial<Order> } {
  const merged = mergeFormWinsIntoManualOrder(manual, form);
  const manualPatch: Partial<Order> = {
    mergedFormOrderId: merged.mergedFormOrderId,
    manualOverlapSnapshot: merged.manualOverlapSnapshot ?? null,
  };

  for (const key of Object.keys(merged) as (keyof Order)[]) {
    if (PROTECTED_ORDER_KEYS.has(key as string) && key !== "mergedFormOrderId") {
      continue;
    }
    if (merged[key] !== manual[key]) {
      (manualPatch as Record<string, unknown>)[key as string] = merged[key];
    }
  }
  if (merged.formType !== manual.formType) manualPatch.formType = merged.formType;
  if (merged.cheerFormSubtype !== manual.cheerFormSubtype) {
    manualPatch.cheerFormSubtype = merged.cheerFormSubtype;
  }
  if (merged.danceFormSubtype !== manual.danceFormSubtype) {
    manualPatch.danceFormSubtype = merged.danceFormSubtype;
  }
  if (merged.needsAttention !== manual.needsAttention) {
    manualPatch.needsAttention = merged.needsAttention;
  }
  if (merged.attentionReason !== manual.attentionReason) {
    manualPatch.attentionReason = merged.attentionReason;
  }

  const formPatch: Partial<Order> = {
    mergedIntoManualOrderId: orderKey(manual) || manual.id,
    suppressManualFormMerge: false,
  };
  manualPatch.suppressManualFormMerge = false;

  return { manualPatch, formPatch };
}

/**
 * Split a paired manual+form back into two independent orders.
 * Restores stashed manual overlap values; clears form-only fills from manual.
 */
export function splitManualFormPair(
  manual: Order,
  form: Order
): { manual: Order; form: Order } {
  const snapshot = manual.manualOverlapSnapshot || {};
  const nextManual: Order = {
    ...manual,
    mergedFormOrderId: undefined,
    manualOverlapSnapshot: undefined,
    suppressManualFormMerge: true,
    isManualEntry: true,
  };

  for (const key of Object.keys(form) as (keyof Order)[]) {
    if (PROTECTED_ORDER_KEYS.has(key as string)) continue;
    const formVal = form[key];
    if (isEmptyValue(formVal)) continue;

    if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
      (nextManual as Record<string, unknown>)[key as string] = snapshot[key as string];
      continue;
    }

    // Form-only fill: clear from manual so each order stands alone.
    const manualVal = manual[key];
    if (manualVal === formVal || isEmptyValue(manualVal)) {
      (nextManual as Record<string, unknown>)[key as string] = "";
    }
  }

  const nextForm: Order = {
    ...form,
    mergedIntoManualOrderId: undefined,
    suppressManualFormMerge: true,
    isManualEntry: false,
  };

  return { manual: nextManual, form: nextForm };
}

/** Patches to persist a split. */
export function splitManualFormPatches(
  manual: Order,
  form: Order
): { manualPatch: Partial<Order>; formPatch: Partial<Order> } {
  const { manual: nextManual, form: nextForm } = splitManualFormPair(manual, form);
  const manualPatch: Partial<Order> = {
    mergedFormOrderId: null as unknown as undefined,
    manualOverlapSnapshot: null,
    suppressManualFormMerge: true,
  };
  for (const key of Object.keys(nextManual) as (keyof Order)[]) {
    if (PROTECTED_ORDER_KEYS.has(key as string)) continue;
    if (nextManual[key] !== manual[key]) {
      (manualPatch as Record<string, unknown>)[key as string] = nextManual[key];
    }
  }
  // Explicitly clear merge link even if undefined → null for API.
  (manualPatch as Record<string, unknown>).mergedFormOrderId = null;

  const formPatch: Partial<Order> = {
    mergedIntoManualOrderId: null as unknown as undefined,
    suppressManualFormMerge: true,
  };
  (formPatch as Record<string, unknown>).mergedIntoManualOrderId = null;

  void nextForm;
  return { manualPatch, formPatch };
}

type MergePair = { manualId: string; form: Order; score: number };

/**
 * Enrich manuals with matching form data and tag absorbed form orders.
 * Each manual / form is paired at most once (highest similarity ≥ 0.9).
 */
export function applyManualFormMerges(orders: Order[]): Order[] {
  const manuals = orders.filter(
    (o) => o.isManualEntry && !o.suppressManualFormMerge
  );
  const forms = orders.filter(
    (o) =>
      !o.isManualEntry &&
      !o.mergedIntoManualOrderId &&
      !o.suppressManualFormMerge
  );

  const pairs: MergePair[] = [];
  for (const form of forms) {
    for (const manual of manuals) {
      if (!sameOrderCategory(form, manual)) continue;
      const score = identityNameSimilarity(form, manual);
      if (score >= 0.9) {
        pairs.push({ manualId: orderKey(manual), form, score });
      }
    }
  }
  pairs.sort((a, b) => b.score - a.score);

  const usedManuals = new Set<string>();
  const formToManual = new Map<string, string>();
  const manualToForm = new Map<string, Order>();

  for (const pair of pairs) {
    const formId = orderKey(pair.form);
    if (!formId || !pair.manualId) continue;
    if (usedManuals.has(pair.manualId) || formToManual.has(formId)) continue;
    usedManuals.add(pair.manualId);
    formToManual.set(formId, pair.manualId);
    manualToForm.set(pair.manualId, pair.form);
  }

  return orders.map((order) => {
    const id = orderKey(order);
    if (order.isManualEntry && manualToForm.has(id)) {
      return mergeFormIntoManualOrder(order, manualToForm.get(id)!);
    }
    if (!order.isManualEntry && formToManual.has(id)) {
      return {
        ...order,
        mergedIntoManualOrderId: formToManual.get(id),
      };
    }
    return order;
  });
}

/** Overlay matching form fields onto a linked order for the form modal. */
export function enrichOrderWithMatchingForm(
  order: Order,
  allOrders: Order[]
): Order {
  if (!order.isManualEntry) return order;
  const pair = resolveManualFormPair(order, allOrders);
  if (!pair) return order;
  // Form-wins Merge already wrote preferred values onto the manual row.
  if (
    order.manualOverlapSnapshot &&
    Object.keys(order.manualOverlapSnapshot).length > 0
  ) {
    return order;
  }
  return mergeFormIntoManualOrder(order, pair.form);
}

/** Diff of fields the form filled on the manual (for updateOrder patches). */
export function mergePatchFromForm(manual: Order, form: Order): Partial<Order> {
  const merged = mergeFormIntoManualOrder(manual, form);
  const patch: Partial<Order> = { mergedFormOrderId: merged.mergedFormOrderId };
  for (const key of Object.keys(merged) as (keyof Order)[]) {
    if (PROTECTED_ORDER_KEYS.has(key as string) && key !== "mergedFormOrderId") {
      continue;
    }
    if (merged[key] !== manual[key]) {
      (patch as Record<string, unknown>)[key as string] = merged[key];
    }
  }
  if (merged.needsAttention !== manual.needsAttention) {
    patch.needsAttention = merged.needsAttention;
  }
  if (merged.attentionReason !== manual.attentionReason) {
    patch.attentionReason = merged.attentionReason;
  }
  if (merged.formType !== manual.formType) patch.formType = merged.formType;
  if (merged.cheerFormSubtype !== manual.cheerFormSubtype) {
    patch.cheerFormSubtype = merged.cheerFormSubtype;
  }
  if (merged.danceFormSubtype !== manual.danceFormSubtype) {
    patch.danceFormSubtype = merged.danceFormSubtype;
  }
  return patch;
}
