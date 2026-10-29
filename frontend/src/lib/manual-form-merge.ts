import type { Order } from "@/types";
import { rawFieldValue } from "@/lib/order-detail-fields";
import {
  getOrderDetailSections,
  getOrderIdentityName,
} from "@/lib/order-detail-sections";
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

  // marching-band / sports-entertainment / school-anthem: formType alone.
  return true;
}

/** Magento / customer form submission (never an admin New Order). */
export function isMagentoFormOrder(order: Order): boolean {
  return !order.isManualEntry;
}

/**
 * Only Magento forms may merge into a manual slot-holder, and only when
 * category + subcategory match. Manual↔manual and cross-category never merge.
 */
export function canMergeMagentoFormIntoManual(
  form: Order,
  manual: Order
): boolean {
  if (!isMagentoFormOrder(form)) return false;
  if (!manual.isManualEntry) return false;
  if (form.suppressManualFormMerge || manual.suppressManualFormMerge) {
    return false;
  }
  if (manual.status === "completed" || manual.status === "in_mtd") return false;
  return sameOrderCategory(form, manual);
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
  // Category taxonomy: never let a Magento form rewrite the manual's form type
  // (cross-category merges were wiping School Anthem → Cheer).
  "formType",
  "cheerFormSubtype",
  "danceFormSubtype",
  "category",
  "finalCustomerPrice",
  "finalCustomerPriceOverridden",
  "finalPayrollPrice",
  "systemCalculatedCustomerPrice",
  "pricingBreakdown",
  "rateUsed",
  "rateSource",
  "producerPayout",
  "manualPayoutInput",
]);

export type FieldDataSource = "form" | "manual";

/**
 * Single-field provenance for the edit UI (one value shown; no duplicated fields).
 * `shown` = which side the editor value comes from.
 * `alsoHas` = other side only when its non-empty value differs.
 */
export type FieldProvenance = {
  shown: FieldDataSource;
  alsoHas?: { source: FieldDataSource; value: string };
};

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

/** Reserved snapshot key listing fields that were empty on manual at match time. */
const FORM_ONLY_KEYS_SNAP = "__formOnlyKeys";

/** Keys that define the order category: never blanked on Split or form-wins. */
const SPLIT_PRESERVE_KEYS = new Set<string>([
  "formType",
  "cheerFormSubtype",
  "danceFormSubtype",
  "category",
  "programName",
]);

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

/** Best manual slot whose program matches this Magento form at ≥ threshold. */
export function findMatchingManualOrder(
  formOrder: Order,
  orders: Order[],
  threshold = 0.9
): Order | null {
  if (!isMagentoFormOrder(formOrder)) return null;
  if (formOrder.suppressManualFormMerge) return null;
  // Already absorbed into a manual: do not re-match.
  if (formOrder.mergedIntoManualOrderId) return null;

  let best: Order | null = null;
  let bestScore = threshold;
  for (const candidate of orders) {
    if (!canMergeMagentoFormIntoManual(formOrder, candidate)) continue;
    // Already paired with a Magento form: one form per manual slot.
    if (candidate.mergedFormOrderId) continue;
    const score = identityNameSimilarity(formOrder, candidate);
    if (score >= bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

export type ManualFormReconcileMerge = {
  manualId: string;
  formId: string;
  manualPatch: Partial<Order>;
  formPatch: Partial<Order>;
};

/**
 * Name-match unlinked Magento forms into unlinked manual slots.
 * Used on bootstrap so CSV/DB-seeded forms get the same merge as receiveOrder.
 * Idempotent: already-linked pairs are left alone; each manual absorbs at most one form.
 */
export function reconcileUnlinkedManualFormPairs(
  orders: Order[],
  threshold = 0.9
): {
  orders: Order[];
  merges: ManualFormReconcileMerge[];
} {
  const claimedManualIds = new Set<string>();
  const claimedFormIds = new Set<string>();

  for (const order of orders) {
    const id = orderKey(order);
    if (!id) continue;
    if (order.isManualEntry && order.mergedFormOrderId) {
      claimedManualIds.add(id);
    }
    if (isMagentoFormOrder(order) && order.mergedIntoManualOrderId) {
      claimedFormIds.add(id);
      claimedManualIds.add(String(order.mergedIntoManualOrderId));
    }
  }

  const forms = orders
    .filter((o) => {
      const id = orderKey(o);
      return (
        Boolean(id) &&
        isMagentoFormOrder(o) &&
        !o.mergedIntoManualOrderId &&
        !o.suppressManualFormMerge &&
        !claimedFormIds.has(id)
      );
    })
    .slice()
    .sort((a, b) =>
      String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
    );

  let working = orders.slice();
  const merges: ManualFormReconcileMerge[] = [];

  for (const form of forms) {
    const formId = orderKey(form);
    if (!formId || claimedFormIds.has(formId)) continue;

    const candidates = working.filter((o) => {
      const id = orderKey(o);
      return Boolean(id) && !claimedManualIds.has(id);
    });

    const manual = findMatchingManualOrder(form, candidates, threshold);
    if (!manual) continue;
    const manualId = orderKey(manual);
    if (!manualId || claimedManualIds.has(manualId)) continue;

    const manualPatch: Partial<Order> = {
      ...mergePatchFromForm(manual, form),
      mergedFormOrderId: formId,
      suppressManualFormMerge: false,
    };
    const formPatch: Partial<Order> = {
      mergedIntoManualOrderId: manualId,
      suppressManualFormMerge: false,
    };

    const manualNext: Order = {
      ...manual,
      ...manualPatch,
      id: manual.id,
      isManualEntry: true,
    };
    const formNext: Order = {
      ...form,
      ...formPatch,
      id: form.id,
      isManualEntry: false,
    };

    working = working.map((o) => {
      const id = orderKey(o);
      if (id === manualId) return manualNext;
      if (id === formId) return formNext;
      return o;
    });

    claimedManualIds.add(manualId);
    claimedFormIds.add(formId);
    merges.push({ manualId, formId, manualPatch, formPatch });
  }

  return { orders: working, merges };
}

function findFormLinkedToManual(
  manual: Order,
  allOrders: Order[]
): Order | null {
  if (!manual.isManualEntry) return null;
  const manualId = orderKey(manual);

  // Only honor an existing Magento link: never invent a name match here.
  // Fresh name matches are created in receiveOrder / bootstrap reconcile, then persisted.
  if (manual.mergedFormOrderId) {
    const byId = allOrders.find(
      (o) => isMagentoFormOrder(o) && ordersMatchId(o, manual.mergedFormOrderId)
    );
    if (byId && canMergeMagentoFormIntoManual(byId, manual)) return byId;
  }

  const byAbsorbed = allOrders.find((o) => {
    if (!isMagentoFormOrder(o) || !o.mergedIntoManualOrderId) return false;
    return (
      o.mergedIntoManualOrderId === manualId ||
      (manual.id && o.mergedIntoManualOrderId === manual.id) ||
      (manual.uuid && o.mergedIntoManualOrderId === manual.uuid) ||
      (manual.legacyId && o.mergedIntoManualOrderId === manual.legacyId)
    );
  });
  if (byAbsorbed && canMergeMagentoFormIntoManual(byAbsorbed, manual)) {
    return byAbsorbed;
  }

  return null;
}

function findManualLinkedToForm(
  form: Order,
  allOrders: Order[]
): Order | null {
  if (!isMagentoFormOrder(form)) return null;

  // Link-only: name matching is exclusive to receiveOrder / bootstrap reconcile.
  if (form.mergedIntoManualOrderId) {
    const byLink = allOrders.find(
      (o) =>
        o.isManualEntry && ordersMatchId(o, form.mergedIntoManualOrderId)
    );
    if (byLink && canMergeMagentoFormIntoManual(form, byLink)) return byLink;
  }

  const byMergedForm = allOrders.find(
    (o) => o.isManualEntry && ordersMatchId(form, o.mergedFormOrderId)
  );
  if (byMergedForm && canMergeMagentoFormIntoManual(form, byMergedForm)) {
    return byMergedForm;
  }

  return null;
}

/** Resolve a Magento-form ↔ manual pair (never manual↔manual). */
export function resolveManualFormPair(
  order: Order,
  allOrders: Order[]
): ManualFormPair | null {
  if (order.isManualEntry) {
    const form = findFormLinkedToManual(order, allOrders);
    if (!form || !canMergeMagentoFormIntoManual(form, order)) return null;
    return { manual: order, form };
  }

  if (!isMagentoFormOrder(order)) return null;
  const manual = findManualLinkedToForm(order, allOrders);
  if (!manual || !canMergeMagentoFormIntoManual(order, manual)) return null;
  return { manual, form: order };
}

function fieldValueAsText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function fieldValuesEqual(a: unknown, b: unknown): boolean {
  return (
    fieldValueAsText(a).replace(/\s+/g, " ").toLowerCase() ===
    fieldValueAsText(b).replace(/\s+/g, " ").toLowerCase()
  );
}

/**
 * Which side(s) contributed a non-empty value for this field.
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

function snapshotHasFieldValues(
  snapshot: Record<string, unknown> | null | undefined
): boolean {
  if (!snapshot) return false;
  return Object.keys(snapshot).some(
    (k) => k !== FORM_ONLY_KEYS_SNAP && !isEmptyValue(snapshot[k])
  );
}

/** Read a UI field key from a frozen snapshot (supports alias keys). */
function snapshotValueForField(
  snapshot: Record<string, unknown> | null | undefined,
  key: string
): unknown {
  if (!snapshot) return undefined;
  if (key !== FORM_ONLY_KEYS_SNAP && !isEmptyValue(snapshot[key])) {
    return snapshot[key];
  }
  // Alias resolution: e.g. gymName snap for schoolProgramName field.
  const viaRaw = rawFieldValue(snapshot as unknown as Order, key).trim();
  return viaRaw || undefined;
}

/**
 * Provenance for one field: which value is shown, and the other side when it differs.
 * When form is SoT (matched Magento), show form and optionally the frozen
 * pre-form manual snapshot under the field.
 */
export function classifyFieldProvenance(
  key: string,
  manual: Order,
  form: Order,
  preferFormOnOverlap = false,
  frozenManualSnapshot?: Record<string, unknown> | null
): FieldProvenance | null {
  if (PROTECTED_ORDER_KEYS.has(key)) return null;
  // Use the same alias coalescing as the edit UI (gymName ↔ schoolName, etc.).
  const manualVal = rawFieldValue(manual, key);
  const formVal = rawFieldValue(form, key);
  const snapVal = snapshotValueForField(frozenManualSnapshot, key);
  const hasSnap = !isEmptyValue(snapVal);
  const hasManual = !isEmptyValue(manualVal);
  const hasForm = !isEmptyValue(formVal);

  // Form is client SoT after a match: prefer form + frozen prior manual slot.
  if (preferFormOnOverlap) {
    if (!hasForm && !hasManual && !hasSnap) return null;
    // Frozen snapshot always surfaces under the field, even after later edits.
    if (hasSnap) {
      const shown: FieldDataSource = hasForm || hasManual ? "form" : "manual";
      return {
        shown,
        alsoHas: { source: "manual", value: fieldValueAsText(snapVal) },
      };
    }
    if (hasForm && hasManual && !fieldValuesEqual(manualVal, formVal)) {
      return {
        shown: "form",
        alsoHas: { source: "manual", value: fieldValueAsText(manualVal) },
      };
    }
    if (hasForm) return { shown: "form" };
    if (hasManual) return { shown: "manual" };
    return null;
  }

  if (!hasManual && !hasForm) return null;
  if (hasManual && !hasForm) return { shown: "manual" };
  if (!hasManual && hasForm) return { shown: "form" };

  if (fieldValuesEqual(manualVal, formVal)) {
    return { shown: "manual" };
  }

  return {
    shown: "manual",
    alsoHas: { source: "form", value: fieldValueAsText(formVal) },
  };
}

/**
 * Undo a bad Magento merge that rewrote the manual's formType (e.g. Anthem → Cheer).
 * Restores stashed pre-merge values and clears the merge link.
 */
export function repairCorruptCrossCategoryFormMerge(order: Order): Order {
  if (!order.isManualEntry) return order;
  const snap = order.manualOverlapSnapshot;
  if (!snap || typeof snap !== "object") return order;
  const snapForm = snap.formType;
  if (typeof snapForm !== "string" || !snapForm.trim()) return order;
  if (snapForm === order.formType) return order;

  const restored: Order = {
    ...order,
    isManualEntry: true,
    mergedFormOrderId: undefined,
    manualOverlapSnapshot: undefined,
    suppressManualFormMerge: false,
  };
  for (const [key, value] of Object.entries(snap)) {
    if (key === FORM_ONLY_KEYS_SNAP) continue;
    (restored as Record<string, unknown>)[key] = value;
  }
  return restored;
}

/**
 * Ensure a paired manual has a frozen pre-form snapshot (form-wins).
 * Safe to call repeatedly: never rewrites an existing field snapshot.
 */
export function ensureManualFormSnapshot(manual: Order, form: Order): Order {
  if (snapshotHasFieldValues(manual.manualOverlapSnapshot)) {
    return manual;
  }
  // Already linked / snapshotted (even if only form-only fills, no overlaps).
  if (
    manual.mergedFormOrderId ||
    (manual.manualOverlapSnapshot &&
      Object.keys(manual.manualOverlapSnapshot).length > 0)
  ) {
    return manual;
  }
  return mergeFormWinsIntoManualOrder(manual, form);
}

/** Map of detail-field key → provenance for the edit UI. */
export function buildFieldSourceMap(
  manual: Order,
  form: Order,
  fieldKeys: string[],
  options?: {
    preferFormOnOverlap?: boolean;
    /** Frozen pre-form manual values; edits must not change these cues. */
    frozenManualSnapshot?: Record<string, unknown> | null;
  }
): Record<string, FieldProvenance> {
  // Prefer an explicit snapshot; otherwise freeze from current manual vs form.
  const ensured =
    options?.frozenManualSnapshot != null
      ? manual
      : ensureManualFormSnapshot(manual, form);
  const snapshot =
    options?.frozenManualSnapshot ??
    ensured.manualOverlapSnapshot ??
    manual.manualOverlapSnapshot ??
    null;
  const preferFormOnOverlap =
    options?.preferFormOnOverlap !== undefined
      ? Boolean(options.preferFormOnOverlap)
      : snapshotHasFieldValues(snapshot);
  const map: Record<string, FieldProvenance> = {};
  for (const key of fieldKeys) {
    const provenance = classifyFieldProvenance(
      key,
      // Compare against pre-ensure manual when we just froze, so alsoHas can
      // still fall back to live manual values if snap missed a key.
      manual,
      form,
      preferFormOnOverlap,
      snapshot
    );
    if (provenance) map[key] = provenance;
  }
  return map;
}

/**
 * Fill empty manual fields from form; keep manual values when present.
 * Result stays `isManualEntry: true` and records the absorbed form id.
 */
export function mergeFormIntoManualOrder(manual: Order, form: Order): Order {
  if (!canMergeMagentoFormIntoManual(form, manual)) {
    return manual;
  }

  const out: Order = {
    ...manual,
    isManualEntry: true,
    mergedFormOrderId: form.id || form.uuid || form.legacyId,
  };

  for (const key of Object.keys(form) as (keyof Order)[]) {
    if (PROTECTED_ORDER_KEYS.has(key as string)) continue;
    if (SPLIT_PRESERVE_KEYS.has(key as string)) continue;
    const manualVal = manual[key];
    const formVal = form[key];
    if (isEmptyValue(manualVal) && !isEmptyValue(formVal)) {
      (out as Record<string, unknown>)[key as string] = formVal;
    }
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
 * Form is SoT on overlap; keep manual-only fields.
 * Stashes overwritten manual values once (frozen) for UI + Split restore.
 */
export function mergeFormWinsIntoManualOrder(manual: Order, form: Order): Order {
  // Magento form → manual only; never cross category/subcategory or manual↔manual.
  if (!canMergeMagentoFormIntoManual(form, manual)) {
    return manual;
  }

  // Never rewrite an existing frozen snapshot: later edits must not change it.
  const existingSnap = manual.manualOverlapSnapshot || null;
  const hasFrozen = snapshotHasFieldValues(existingSnap);
  const snapshot: Record<string, unknown> = hasFrozen
    ? { ...existingSnap }
    : {};
  const formOnlyKeys = new Set<string>(
    Array.isArray(snapshot[FORM_ONLY_KEYS_SNAP])
      ? (snapshot[FORM_ONLY_KEYS_SNAP] as string[])
      : []
  );
  const out: Order = {
    ...manual,
    isManualEntry: true,
    mergedFormOrderId: form.id || form.uuid || form.legacyId,
    suppressManualFormMerge: false,
  };

  for (const key of Object.keys(form) as (keyof Order)[]) {
    if (PROTECTED_ORDER_KEYS.has(key as string)) continue;
    if (SPLIT_PRESERVE_KEYS.has(key as string)) continue;
    const manualVal = manual[key];
    const formVal = form[key];
    if (isEmptyValue(formVal)) continue;

    if (!hasFrozen && !isEmptyValue(manualVal) && manualVal !== formVal) {
      snapshot[key as string] = manualVal;
    } else if (!hasFrozen && isEmptyValue(manualVal)) {
      formOnlyKeys.add(key as string);
    }
    (out as Record<string, unknown>)[key as string] = formVal;
  }

  if (!hasFrozen && formOnlyKeys.size > 0) {
    snapshot[FORM_ONLY_KEYS_SNAP] = [...formOnlyKeys];
  }

  out.manualOverlapSnapshot = hasFrozen
    ? existingSnap
    : Object.keys(snapshot).length > 0
      ? snapshot
      : undefined;

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

/** Still on the Orders board (not forwarded to MTD / completed). */
export function orderStillOnOrdersBoard(order: Order): boolean {
  const status = String(order.status || "").trim();
  if (status === "in_mtd" || status === "completed") return false;
  return true;
}

/**
 * Admin Split is Orders-only. Once either side is in MTD (or past), Split is off -
 * rematch is not auto; use Match Orders again after a Split while still on Orders.
 */
export function canSplitManualFormPair(manual: Order, form: Order): boolean {
  if (!manual?.isManualEntry || !isMagentoFormOrder(form)) return false;
  if (!manual.mergedFormOrderId && !form.mergedIntoManualOrderId) return false;
  return orderStillOnOrdersBoard(manual) && orderStillOnOrdersBoard(form);
}

/**
 * Split a paired manual+form back into two independent orders.
 * Restores stashed manual overlap values; clears form-only fills from manual.
 * Does not suppress rematch: admin can Match again on Match Orders.
 */
export function splitManualFormPair(
  manual: Order,
  form: Order
): { manual: Order; form: Order } {
  const snapshot = { ...(manual.manualOverlapSnapshot || {}) };
  const formOnlyKeys = new Set<string>(
    Array.isArray(snapshot[FORM_ONLY_KEYS_SNAP])
      ? (snapshot[FORM_ONLY_KEYS_SNAP] as string[])
      : []
  );
  delete snapshot[FORM_ONLY_KEYS_SNAP];

  const nextManual: Order = {
    ...manual,
    mergedFormOrderId: undefined,
    manualOverlapSnapshot: undefined,
    suppressManualFormMerge: false,
    isManualEntry: true,
  };

  for (const key of Object.keys(form) as (keyof Order)[]) {
    if (PROTECTED_ORDER_KEYS.has(key as string)) continue;
    if (SPLIT_PRESERVE_KEYS.has(key as string)) continue;
    const formVal = form[key];
    if (isEmptyValue(formVal)) continue;

    if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
      (nextManual as Record<string, unknown>)[key as string] =
        snapshot[key as string];
      continue;
    }

    // Form-only fill (empty on manual at match): clear so each order stands alone.
    // Do not blank fields that already matched on both sides before the form arrived.
    if (formOnlyKeys.has(key as string)) {
      (nextManual as Record<string, unknown>)[key as string] = "";
      continue;
    }

    // Legacy pairs without __formOnlyKeys: only clear when manual is empty.
    const manualVal = manual[key];
    if (isEmptyValue(manualVal)) {
      (nextManual as Record<string, unknown>)[key as string] = "";
    }
  }

  const nextForm: Order = {
    ...form,
    mergedIntoManualOrderId: undefined,
    suppressManualFormMerge: false,
    isManualEntry: false,
  };

  return { manual: nextManual, form: nextForm };
}

export type SplitPreviewRow = {
  key: string;
  label: string;
  manualValue: string;
  formValue: string;
  /** Manual value changes from the current combined order. */
  manualRestored: boolean;
};

export type MatchDiffRow = {
  key: string;
  label: string;
  manualValue: string;
  formValue: string;
  /** Both sides filled and disagree (conflict highlight). */
  differs: boolean;
  /** Magento has a value that will replace the manual on match. */
  willOverwrite: boolean;
};

/**
 * Every New Order / Magento form field for this category (and cheer/dance
 * subtype): Match UI compares Manual vs Magento side by side.
 */
export function buildMatchDiffRows(manual: Order, form: Order): MatchDiffRow[] {
  // Magento form defines the expected field set for this category/subtype.
  const sections = getOrderDetailSections(form);
  const seen = new Set<string>();
  const rows: MatchDiffRow[] = [];

  for (const section of sections) {
    for (const field of section.fields) {
      if (seen.has(field.key)) continue;
      seen.add(field.key);
      const manualRaw = rawFieldValue(manual, field.key).trim();
      const formRaw = rawFieldValue(form, field.key).trim();
      // Conflict highlight: both sides filled and disagree.
      const differs =
        Boolean(manualRaw) && Boolean(formRaw) && manualRaw !== formRaw;
      // Overwrite on match: Magento filled and not equal to current manual.
      const willOverwrite = Boolean(formRaw) && formRaw !== manualRaw;
      rows.push({
        key: field.key,
        label: field.label,
        manualValue: manualRaw || "-",
        formValue: formRaw || "-",
        differs,
        willOverwrite,
      });
    }
  }

  return rows;
}

/** Field rows for the Split confirm modal (diff + restored values). */
export function buildSplitPreviewRows(
  manual: Order,
  form: Order
): { nextManual: Order; nextForm: Order; rows: SplitPreviewRow[] } {
  const { manual: nextManual, form: nextForm } = splitManualFormPair(
    manual,
    form
  );
  const sections = getOrderDetailSections(nextManual);
  const seen = new Set<string>();
  const rows: SplitPreviewRow[] = [];

  for (const section of sections) {
    for (const field of section.fields) {
      if (seen.has(field.key)) continue;
      seen.add(field.key);

      const beforeManual = rawFieldValue(manual, field.key).trim();
      const afterManual = rawFieldValue(nextManual, field.key).trim();
      const afterForm = rawFieldValue(nextForm, field.key).trim();
      const manualRestored = beforeManual !== afterManual;
      const sidesDiffer = afterManual !== afterForm;
      if (!manualRestored && !sidesDiffer) continue;

      rows.push({
        key: field.key,
        label: field.label,
        manualValue: afterManual || "-",
        formValue: afterForm || "-",
        manualRestored,
      });
    }
  }

  return { nextManual, nextForm, rows };
}

/**
 * Accept Magento form values and drop Manual/Form cues. Absorbed form stays hidden.
 * Fields Magento left blank keep whatever value is already on the slot
 * (e.g. Nicknames that only existed on the manual side).
 */
export function overwriteManualWithFormPatches(
  manual: Order,
  form: Order
): { manualPatch: Partial<Order>; formPatch: Partial<Order> } {
  // Form-wins fill: Magento values applied; blank Magento fields keep manual.
  const merged = mergeFormWinsIntoManualOrder(manual, form);
  const formId = form.id || form.uuid || form.legacyId || "";
  const manualId = manual.id || manual.uuid || manual.legacyId || "";

  const manualPatch: Partial<Order> = {
    ...Object.fromEntries(
      (Object.keys(merged) as (keyof Order)[])
        .filter((key) => {
          if (PROTECTED_ORDER_KEYS.has(key as string)) return false;
          // Snapshot is cleared below: do not copy the frozen one from merge.
          if (key === "manualOverlapSnapshot") return false;
          if (key === "isManualEntry") return false;
          return merged[key] !== manual[key];
        })
        .map((key) => [key, merged[key]])
    ),
    isManualEntry: false,
    manualOverlapSnapshot: null,
    mergedFormOrderId: formId || manual.mergedFormOrderId || null,
    suppressManualFormMerge: false,
  };
  (manualPatch as Record<string, unknown>).manualOverlapSnapshot = null;
  (manualPatch as Record<string, unknown>).isManualEntry = false;

  const formPatch: Partial<Order> = {
    mergedIntoManualOrderId: manualId || form.mergedIntoManualOrderId || null,
    suppressManualFormMerge: false,
  };

  return { manualPatch, formPatch };
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
    suppressManualFormMerge: false,
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
    suppressManualFormMerge: false,
  };
  (formPatch as Record<string, unknown>).mergedIntoManualOrderId = null;

  void nextForm;
  return { manualPatch, formPatch };
}

/**
 * Apply already-persisted Magento↔manual links for board display.
 * Does NOT invent new name matches: those are created by receiveOrder or
 * reconcileUnlinkedManualFormPairs (bootstrap) and then persisted as links.
 */
export function applyManualFormMerges(orders: Order[]): Order[] {
  const byId = new Map<string, Order>();
  for (const order of orders) {
    const id = orderKey(order);
    if (id) byId.set(id, order);
  }

  const manualToForm = new Map<string, Order>();
  const formToManual = new Map<string, string>();

  for (const order of orders) {
    if (!order.isManualEntry || !order.mergedFormOrderId) continue;
    const form =
      byId.get(order.mergedFormOrderId) ||
      orders.find(
        (o) =>
          isMagentoFormOrder(o) && ordersMatchId(o, order.mergedFormOrderId)
      );
    if (!form || !canMergeMagentoFormIntoManual(form, order)) continue;
    const manualId = orderKey(order);
    const formId = orderKey(form);
    if (!manualId || !formId) continue;
    manualToForm.set(manualId, form);
    formToManual.set(formId, manualId);
  }

  for (const order of orders) {
    if (!isMagentoFormOrder(order) || !order.mergedIntoManualOrderId) continue;
    const formId = orderKey(order);
    if (!formId || formToManual.has(formId)) continue;
    const manual =
      byId.get(order.mergedIntoManualOrderId) ||
      orders.find(
        (o) =>
          o.isManualEntry && ordersMatchId(o, order.mergedIntoManualOrderId)
      );
    if (!manual || !canMergeMagentoFormIntoManual(order, manual)) continue;
    const manualId = orderKey(manual);
    if (!manualId || manualToForm.has(manualId)) continue;
    manualToForm.set(manualId, order);
    formToManual.set(formId, manualId);
  }

  return orders.map((order) => {
    const id = orderKey(order);
    if (order.isManualEntry && manualToForm.has(id)) {
      const form = manualToForm.get(id)!;
      // Initial match uses form-wins. Once a snapshot exists, keep persisted
      // manual values (edit-modal saves) and only fill empties from the form -
      // hard form-wins on every board load was wiping those edits.
      if (
        order.manualOverlapSnapshot &&
        Object.keys(order.manualOverlapSnapshot).length > 0
      ) {
        return mergeFormIntoManualOrder(order, form);
      }
      return mergeFormWinsIntoManualOrder(order, form);
    }
    if (isMagentoFormOrder(order) && formToManual.has(id)) {
      return {
        ...order,
        mergedIntoManualOrderId: formToManual.get(id),
      };
    }
    return order;
  });
}

/**
 * Find the Magento form linked to this booking row for display.
 * Uses mergedFormOrderId / mergedIntoManualOrderId only: no name matching.
 * Works for in_mtd rows and non-isManualEntry bookings that still carry a link.
 */
export function findLinkedFormOrderForDisplay(
  order: Order,
  allOrders: Order[]
): Order | null {
  if (!order || !allOrders?.length) return null;

  if (order.mergedFormOrderId) {
    const byId = allOrders.find(
      (o) =>
        o.id !== order.id &&
        isMagentoFormOrder(o) &&
        ordersMatchId(o, order.mergedFormOrderId)
    );
    if (byId) return byId;
  }

  const absorbed = allOrders.find((o) => {
    if (!isMagentoFormOrder(o) || !o.mergedIntoManualOrderId) return false;
    if (o.id === order.id) return false;
    return ordersMatchId(order, o.mergedIntoManualOrderId);
  });
  return absorbed || null;
}

/**
 * Fill empty identity / package / contact fields from the linked Magento form.
 * Does not rewrite assignment dates (Orders SoT on the booking row) and does
 * not require isManualEntry: MTD-linked bookings often omit that flag.
 */
export function overlayMergedFormForDisplay(
  order: Order,
  allOrders: Order[]
): Order {
  const form = findLinkedFormOrderForDisplay(order, allOrders);
  if (!form) return order;

  const out: Order = { ...order };
  let changed = false;

  const identity = getOrderIdentityName(order).trim();
  const formIdentity = getOrderIdentityName(form).trim();
  if (!identity && formIdentity) {
    out.programName = formIdentity;
    out.schoolProgramName = formIdentity;
    out.schoolName = formIdentity;
    out.gymName = formIdentity;
    out.organizationName = formIdentity;
    out.schoolOrganizationName = formIdentity;
    changed = true;
  }

  const pkg =
    String(order.packageType || "").trim() ||
    String(order.package || "").trim();
  const formPkg =
    String(form.packageType || "").trim() ||
    String(form.package || "").trim();
  if ((!pkg || pkg.toUpperCase() === "TBD") && formPkg) {
    out.packageType = form.packageType || form.package || formPkg;
    if (!String(out.package || "").trim() || out.package === "TBD") {
      out.package = form.package || form.packageType || formPkg;
    }
    changed = true;
  }

  const contact =
    order.musicContactName ||
    order.coachName ||
    order.coachContactFullName ||
    order.contactName ||
    "";
  const formContact =
    form.musicContactName ||
    form.coachName ||
    form.coachContactFullName ||
    form.contactName ||
    "";
  if (!String(contact).trim() && String(formContact).trim()) {
    out.coachName = form.coachName || formContact;
    out.musicContactName = form.musicContactName || formContact;
    out.coachContactFullName = form.coachContactFullName || formContact;
    out.contactName = form.contactName || formContact;
    out.customerName = form.customerName || formContact;
    changed = true;
  }

  // Preserve booking-row assignment; only fill when the booking row is empty.
  if (!order.assignedProducer?.trim() && form.assignedProducer?.trim()) {
    out.assignedProducer = form.assignedProducer;
    changed = true;
  }
  if (!String(order.mixStartDate || "").trim() && form.mixStartDate) {
    out.mixStartDate = form.mixStartDate;
    changed = true;
  }
  if (!String(order.mixEndDate || "").trim() && form.mixEndDate) {
    out.mixEndDate = form.mixEndDate;
    changed = true;
  }

  return changed ? out : order;
}

/** Overlay matching form fields onto a linked order for the form modal. */
export function enrichOrderWithMatchingForm(
  order: Order,
  allOrders: Order[]
): Order {
  // Always apply linked-form display overlay first (covers in_mtd / non-manual).
  const overlaid = overlayMergedFormForDisplay(order, allOrders);

  if (!overlaid.isManualEntry) return overlaid;
  const pair = resolveManualFormPair(overlaid, allOrders);
  if (!pair) return overlaid;
  // Form already applied as SoT (snapshot frozen at match time).
  if (
    overlaid.manualOverlapSnapshot &&
    Object.keys(overlaid.manualOverlapSnapshot).length > 0
  ) {
    return overlaid;
  }
  // Pair exists but not yet form-wins persisted: show form SoT in the editor.
  return mergeFormWinsIntoManualOrder(overlaid, pair.form);
}

/**
 * Magento form matched a manual slot-holder: form is SoT on overlaps.
 * Stashes prior manual values once (frozen) for UI + Split restore.
 */
export function mergePatchFromForm(manual: Order, form: Order): Partial<Order> {
  // Do not rewrite an existing frozen snapshot on later form refreshes.
  if (
    manual.manualOverlapSnapshot &&
    Object.keys(manual.manualOverlapSnapshot).length > 0
  ) {
    const soft = mergeFormIntoManualOrder(manual, form);
    const patch: Partial<Order> = {
      mergedFormOrderId: soft.mergedFormOrderId,
    };
    for (const key of Object.keys(soft) as (keyof Order)[]) {
      if (
        PROTECTED_ORDER_KEYS.has(key as string) &&
        key !== "mergedFormOrderId"
      ) {
        continue;
      }
      if (soft[key] !== manual[key]) {
        (patch as Record<string, unknown>)[key as string] = soft[key];
      }
    }
    return patch;
  }
  return mergeFormWinsPatches(manual, form).manualPatch;
}
