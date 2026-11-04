"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, Link2, Loader2, X } from "lucide-react";
import { useAppState } from "@/context/AppStateContext";
import {
  getOrderDetailSections,
  getOrderIdentityName,
  getFormTypeLabel,
} from "@/lib/order-detail-sections";
import { rawFieldValue } from "@/lib/order-detail-fields";
import { buildMatchDiffRows } from "@/lib/manual-form-merge";
import { isMatchBasisFieldKey } from "@/lib/manual-form-match-score";
import { normalizedTextEqual } from "@/lib/program-similarity";
import {
  formatMatchMissingFieldsReason,
  getMatchBlockingMissingFields,
} from "@/lib/order-form-missing";
import {
  buildOrderFormDirtyPatch,
  orderPatchFromOrderField,
} from "@/lib/mtd-order-sync";
import { stagingRecordFromOrder } from "@/lib/order-staging";
import { packageTypeDisplayValue } from "@/components/mtd/PackageTypeField";
import { OrderFormFieldControl } from "@/components/mtd/OrderFormFieldControl";
import { OrderFormEditModal } from "@/components/orders/OrderFormEditModal";
import { fetchOrderApi } from "@/lib/api/orders";
import { normalizeOrder } from "@/lib/order-form";
import { isRecentLocalOrderWrite } from "@/lib/orders-board-cache";
import type { Order } from "@/types";

type MatchConfirmModalProps = {
  open: boolean;
  magento: Order | null;
  manual: Order | null;
  onClose: () => void;
  onMatched?: () => void;
};

export function MatchConfirmModal({
  open,
  magento,
  manual,
  onClose,
  onMatched,
}: MatchConfirmModalProps) {
  const {
    matchManualWithMagento,
    isViewOnly,
    producers,
    discountCodes,
    allOrders,
  } = useAppState();
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewFull, setViewFull] = useState<{
    order: Order;
    fullFormFields: boolean;
  } | null>(null);
  const [showMissingValidation, setShowMissingValidation] = useState(false);
  const [validatedMissingKeys, setValidatedMissingKeys] = useState<string[]>(
    []
  );
  /** Magento-only gaps stay in the table after fill so rows don't vanish mid-edit. */
  const [revealedGapKeys, setRevealedGapKeys] = useState<string[]>([]);
  const [magentoDraft, setMagentoDraft] = useState<Order | null>(null);
  const [manualDraft, setManualDraft] = useState<Order | null>(null);
  /** Copies the drafts were seeded from — only real edits ride the match PATCH. */
  const baseRef = useRef<{ magento: Order; manual: Order } | null>(null);
  /** Props the drafts were last rebased on (identity changes = a saved edit). */
  const propsRef = useRef<{ magento: Order | null; manual: Order | null }>({
    magento: null,
    manual: null,
  });
  const confirmLockRef = useRef(false);
  const pairKey =
    magento && manual ? `${magento.id}::${manual.id}` : "";

  useEffect(() => {
    setMounted(true);
  }, []);

  /** New saved copy of one side; values typed here but not saved stay on top. */
  const rebaseDraft = useCallback(
    (side: "magento" | "manual", latest: Order) => {
      const base = baseRef.current;
      if (!base) return;
      const oldBase = base[side];
      const nextBase = normalizeOrder({ ...latest });
      baseRef.current = { ...base, [side]: nextBase };
      const setDraft = side === "magento" ? setMagentoDraft : setManualDraft;
      setDraft((draft) => {
        if (!draft) return nextBase;
        const pending = buildOrderFormDirtyPatch(oldBase, draft);
        return Object.keys(pending).length > 0
          ? normalizeOrder({ ...nextBase, ...pending })
          : nextBase;
      });
    },
    []
  );

  // Seed drafts only when the modal opens or the pair changes — not when
  // updateOrder refreshes live props mid-confirm (that re-enabled the button
  // and could match twice). Re-fetch so out-of-band API fills aren't stuck as "-".
  useEffect(() => {
    if (!open || !magento || !manual) {
      confirmLockRef.current = false;
      setSaving(false);
      setError(null);
      setShowMissingValidation(false);
      setValidatedMissingKeys([]);
      setRevealedGapKeys([]);
      setViewFull(null);
      setMagentoDraft(null);
      setManualDraft(null);
      baseRef.current = null;
      return;
    }
    confirmLockRef.current = false;
    setSaving(false);
    setError(null);
    setShowMissingValidation(false);
    setValidatedMissingKeys([]);
    setRevealedGapKeys([]);
    setViewFull(null);
    // Same normalize as AppState so open doesn't invent / drop defaults vs list.
    const seedMagento = normalizeOrder({ ...magento });
    const seedManual = normalizeOrder({ ...manual });
    baseRef.current = { magento: seedMagento, manual: seedManual };
    propsRef.current = { magento, manual };
    setMagentoDraft(seedMagento);
    setManualDraft(seedManual);
    // A list row can lag another server instance's cache; re-read it — except
    // one this tab just saved, whose PATCH may not have landed yet (the GET
    // would bring the old values back and Confirm would write them).
    const sides = [
      { side: "magento" as const, order: magento },
      { side: "manual" as const, order: manual },
    ].filter(({ order }) => !isRecentLocalOrderWrite(order));
    let cancelled = false;
    void Promise.all(
      sides.map(async ({ side, order }) => {
        try {
          const fresh = await fetchOrderApi(order.id);
          if (cancelled || isRecentLocalOrderWrite(order)) return;
          const freshAt = Date.parse(fresh.updatedAt || "") || 0;
          const shownAt = Date.parse(order.updatedAt || "") || 0;
          if (freshAt < shownAt) return;
          rebaseDraft(side, fresh);
        } catch {
          // Keep prop-seeded drafts if the refresh fails.
        }
      })
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pairKey gates identity; ignore live field churn
  }, [open, pairKey]);

  // Saves from View / View full (and other users' edits) reach the props:
  // follow them, keeping anything typed in the comparison. Never mid-confirm.
  useEffect(() => {
    if (!open || !magento || !manual || !baseRef.current) return;
    if (saving || confirmLockRef.current) return;
    const prev = propsRef.current;
    if (prev.magento === magento && prev.manual === manual) return;
    propsRef.current = { magento, manual };
    if (prev.magento && prev.magento !== magento) rebaseDraft("magento", magento);
    if (prev.manual && prev.manual !== manual) rebaseDraft("manual", manual);
  }, [open, magento, manual, saving, rebaseDraft]);

  const fieldMetaByKey = useMemo(() => {
    if (!magentoDraft) return new Map<string, { multiline: boolean }>();
    const map = new Map<string, { multiline: boolean }>();
    for (const section of getOrderDetailSections(magentoDraft)) {
      for (const field of section.fields) {
        map.set(field.key, { multiline: Boolean(field.multiline) });
      }
    }
    return map;
  }, [magentoDraft]);

  const viewFullRecord = useMemo(
    () => (viewFull ? stagingRecordFromOrder(viewFull.order) : null),
    [viewFull]
  );

  const missingRequired = useMemo(() => {
    if (!magentoDraft || !manualDraft) return [];
    return getMatchBlockingMissingFields(manualDraft, magentoDraft);
  }, [magentoDraft, manualDraft]);

  const fieldLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const gap of missingRequired) map.set(gap.key, gap.label);
    if (!magentoDraft) return map;
    for (const section of getOrderDetailSections(magentoDraft)) {
      for (const field of section.fields) {
        if (!map.has(field.key)) map.set(field.key, field.label);
      }
    }
    return map;
  }, [magentoDraft, missingRequired]);

  // Slim manuals hide Magento-only fields from the comparison — but those same
  // fields still block Confirm match when empty on both sides. Append them so
  // admins can fill the gate without hunting through View full.
  const diffRows = useMemo(() => {
    if (!magentoDraft || !manualDraft) return [];
    const base = buildMatchDiffRows(manualDraft, magentoDraft);
    const seen = new Set(base.map((row) => row.key));
    const extras = revealedGapKeys
      .filter((key) => !seen.has(key))
      .map((key) => {
        const manualRaw = rawFieldValue(manualDraft, key).trim();
        const formRaw = rawFieldValue(magentoDraft, key).trim();
        return {
          key,
          label: fieldLabelByKey.get(key) || key,
          manualValue: manualRaw || "-",
          formValue: formRaw || "-",
          matches:
            isMatchBasisFieldKey(key) &&
            Boolean(manualRaw) &&
            Boolean(formRaw) &&
            normalizedTextEqual(manualRaw, formRaw),
          differs: false,
          willOverwrite:
            Boolean(formRaw) &&
            (!manualRaw || !normalizedTextEqual(formRaw, manualRaw)),
        };
      });
    return extras.length > 0 ? [...base, ...extras] : base;
  }, [
    magentoDraft,
    manualDraft,
    revealedGapKeys,
    fieldLabelByKey,
  ]);

  useEffect(() => {
    if (missingRequired.length === 0) {
      setShowMissingValidation(false);
      setValidatedMissingKeys([]);
    }
  }, [missingRequired.length]);

  const missingRequiredKeys = useMemo(
    () => new Set(missingRequired.map((gap) => gap.key)),
    [missingRequired]
  );

  const revealedGapKeySet = useMemo(
    () => new Set(revealedGapKeys),
    [revealedGapKeys]
  );

  const enterValueKeys = useMemo(
    () => new Set(validatedMissingKeys),
    [validatedMissingKeys]
  );

  const matchBlockedReason = useMemo(
    () => formatMatchMissingFieldsReason(missingRequired),
    [missingRequired]
  );

  const handleEnterValue = useCallback((key: string, value: string) => {
    // Magento is SoT on match; filling here clears the both-empty gap.
    setMagentoDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, ...orderPatchFromOrderField(key, value, prev) };
    });
  }, []);

  if (!mounted || !open || !magento || !manual || !magentoDraft || !manualDraft) {
    return null;
  }

  const magentoName =
    getOrderIdentityName(magentoDraft).trim() ||
    magentoDraft.programName ||
    "Magento form";
  const manualName =
    getOrderIdentityName(manualDraft).trim() ||
    manualDraft.programName ||
    "Manual order";

  const handleConfirm = async () => {
    if (isViewOnly || saving || confirmLockRef.current) return;
    if (missingRequired.length > 0) {
      const gapKeys = missingRequired.map((gap) => gap.key);
      setShowMissingValidation(true);
      setValidatedMissingKeys(gapKeys);
      // Keep Magento-only gap rows visible after fill (don't vanish mid-edit).
      setRevealedGapKeys((prev) => Array.from(new Set([...prev, ...gapKeys])));
      setError(null);
      return;
    }
    confirmLockRef.current = true;
    setShowMissingValidation(false);
    setValidatedMissingKeys([]);
    setViewFull(null);
    setSaving(true);
    setError(null);
    try {
      const base = baseRef.current;
      // Drafts carry Magento notes/songs filled in this modal onto the manual.
      await matchManualWithMagento(manual.id, magento.id, {
        overwrite: true,
        manualOverride: manualDraft,
        formOverride: magentoDraft,
        manualEdits: buildOrderFormDirtyPatch(base?.manual ?? manual, manualDraft),
        manualBefore: base?.manual ?? manual,
        formEdits: buildOrderFormDirtyPatch(base?.magento ?? magento, magentoDraft),
        onApplied: () => {
          onMatched?.();
          onClose();
        },
      });
    } catch (err) {
      confirmLockRef.current = false;
      setError(
        err instanceof Error ? err.message : "Could not match these orders."
      );
      setSaving(false);
    }
  };

  return (
    <>
    {createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-confirm-title"
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-brand-line/40 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange ring-1 ring-inset ring-brand-orange/20">
              <Link2 className="h-4 w-4" strokeWidth={2} />
            </div>
            <div>
              <h2
                id="match-confirm-title"
                className="text-[15px] font-bold text-brand-ink"
              >
                Match Magento to manual
              </h2>
              <p className="mt-0.5 text-[12px] text-brand-ink-secondary">
                Magento becomes source of truth on overlapping fields.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-brand-ink-tertiary hover:bg-brand-bg hover:text-brand-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-brand-line/50 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-ink-tertiary">
                    Magento form
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-brand-ink">
                    {magentoName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-brand-ink-secondary">
                    {getFormTypeLabel(magentoDraft.formType)}
                    {magentoDraft.packageType
                      ? ` · ${packageTypeDisplayValue(magentoDraft.packageType)}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    if (saving) return;
                    setViewFull({
                      order: magentoDraft,
                      fullFormFields: true,
                    });
                  }}
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-brand-line/60 bg-white px-2.5 text-[11px] font-semibold text-brand-ink-secondary shadow-sm transition hover:border-brand-line hover:bg-brand-bg hover:text-brand-ink disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-brand-line/60 disabled:hover:bg-white disabled:hover:text-brand-ink-secondary"
                  title="View full Magento form"
                  aria-label={`View full ${magentoName}`}
                >
                  <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                  View full
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-brand-line/50 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-ink-tertiary">
                    Manual order
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-brand-ink">
                    {manualName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-brand-ink-secondary">
                    {getFormTypeLabel(manualDraft.formType)}
                    {manualDraft.packageType
                      ? ` · ${packageTypeDisplayValue(manualDraft.packageType)}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    if (saving) return;
                    setViewFull({
                      order: manualDraft,
                      fullFormFields: false,
                    });
                  }}
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-brand-line/60 bg-white px-2.5 text-[11px] font-semibold text-brand-ink-secondary shadow-sm transition hover:border-brand-line hover:bg-brand-bg hover:text-brand-ink disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-brand-line/60 disabled:hover:bg-white disabled:hover:text-brand-ink-secondary"
                  title="View full manual order"
                  aria-label={`View full ${manualName}`}
                >
                  <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                  View full
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-brand-line/50 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-line/40 px-3 py-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-ink-tertiary">
                  Field comparison
                </p>
                <p className="text-[11px] text-brand-ink-secondary">
                  Manual vs Magento
                  {diffRows.filter((r) => r.willOverwrite).length > 0
                    ? ` · ${diffRows.filter((r) => r.willOverwrite).length} Magento updates`
                    : ""}
                </p>
              </div>
            </div>
            {diffRows.length === 0 ? (
              <p className="px-3 py-4 text-[12px] text-brand-ink-secondary">
                No form fields for this category.
              </p>
            ) : (
              <div className="max-h-[min(420px,50vh)] overflow-y-auto">
                {/* table-fixed + max-w-0 on value cols: long SoftSelect labels
                    otherwise force the cell wider/taller (td min-width:auto).
                    Magento column is widest so enter-value placeholders stay readable. */}
                <table className="w-full table-fixed text-left text-[12px]">
                  <thead className="sticky top-0 bg-brand-bg/95 text-[10px] font-bold uppercase tracking-wider text-brand-ink-tertiary">
                    <tr>
                      <th className="w-[24%] px-3 py-2 font-bold">Field</th>
                      <th className="w-[28%] px-3 py-2 font-bold">Manual</th>
                      <th className="w-[48%] px-3 py-2 font-bold">Magento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffRows.map((row) => {
                      const stillMissing = missingRequiredKeys.has(row.key);
                      // Editors appear after Confirm match fails validation
                      // (same as before); revealed keys stay editable after fill.
                      const showEnterValue =
                        showMissingValidation &&
                        (enterValueKeys.has(row.key) ||
                          revealedGapKeySet.has(row.key));
                      const multiline =
                        fieldMetaByKey.get(row.key)?.multiline ?? false;
                      const canEdit = !isViewOnly && !saving;

                      return (
                        <tr
                          key={row.key}
                          className={
                            showEnterValue && stillMissing
                              ? "border-t border-brand-line/30 align-top bg-rose-50/80"
                              : showEnterValue
                                ? "border-t border-brand-line/30 align-top bg-rose-50/35"
                                : row.differs
                                  ? "border-t border-brand-line/30 align-top bg-brand-orange/5"
                                  : row.matches
                                    ? "border-t border-brand-line/30 align-top bg-emerald-50/70"
                                    : "border-t border-brand-line/30 align-top"
                          }
                        >
                          <td className="px-3 py-2 font-medium text-brand-ink">
                            <span className="line-clamp-2 break-words">
                              {row.label}
                            </span>
                            {showEnterValue && stillMissing ? (
                              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wider text-rose-700">
                                Required · empty on both
                              </span>
                            ) : null}
                          </td>
                          <td
                            className={
                              row.differs
                                ? "max-w-0 px-3 py-2 text-amber-900"
                                : row.matches
                                  ? "max-w-0 px-3 py-2 text-emerald-800"
                                  : "max-w-0 px-3 py-2 text-brand-ink-secondary"
                            }
                          >
                            <span className="block truncate" title={row.manualValue}>
                              {row.manualValue}
                            </span>
                          </td>
                          <td
                            className={
                              row.differs
                                ? "max-w-0 px-3 py-2 text-sky-800"
                                : row.matches
                                  ? "max-w-0 px-3 py-2 text-emerald-800"
                                  : "max-w-0 px-3 py-2 text-brand-ink-secondary"
                            }
                          >
                            {showEnterValue && canEdit ? (
                              <OrderFormFieldControl
                                fieldKey={row.key}
                                order={magentoDraft}
                                value={rawFieldValue(magentoDraft, row.key)}
                                multiline={multiline}
                                producers={producers}
                                discountCodes={discountCodes}
                                compact
                                emphasized={stillMissing}
                                readOnly={saving}
                                onChange={(value) =>
                                  handleEnterValue(row.key, value)
                                }
                              />
                            ) : (
                              <span
                                className="block truncate"
                                title={row.formValue}
                              >
                                {row.formValue}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="rounded-lg border border-brand-line/50 bg-brand-bg/70 px-3 py-2.5 text-[12px] leading-relaxed text-brand-ink-secondary">
            Magento overwrites overlapping fields. Blank Magento fields keep
            the manual values. Split later restores the original manual row.
          </p>

          {showMissingValidation && matchBlockedReason ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12px] leading-relaxed text-rose-800">
              {matchBlockedReason}
            </p>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-brand-line/40 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-9 rounded-xl border border-brand-line/70 bg-white px-3.5 text-[13px] font-semibold text-brand-ink hover:bg-brand-bg/60 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={saving || isViewOnly}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-cta px-3.5 text-[13px] font-semibold text-brand-cta-text shadow-sm hover:bg-brand-cta-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            {saving ? "Matching…" : "Confirm match"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )}
    <OrderFormEditModal
      open={Boolean(viewFull)}
      record={viewFullRecord}
      allOrders={allOrders}
      fullFormFields={Boolean(viewFull?.fullFormFields)}
      elevated
      onClose={() => setViewFull(null)}
    />
    </>
  );
}
