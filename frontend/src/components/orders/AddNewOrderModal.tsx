"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Calendar, Loader2, AlertCircle } from "lucide-react";
import { FilterMenu } from "@/components/ui/FilterMenu";
import { MTDOrderDetails } from "@/components/mtd/MTDOrderDetails";
import { useAppState } from "@/context/AppStateContext";
import { formatApiClientError } from "@/lib/api/client";
import { orderPatchFromOrderField } from "@/lib/mtd-order-sync";
import { packageTypeDisplayValue } from "@/components/mtd/PackageTypeField";
import { getOrderIdentityName } from "@/lib/order-detail-sections";
import { normalizeOrder } from "@/lib/order-form";
import {
  addOrderDraftHasContent,
  applyMixFieldValues,
  blankAddOrderPerMixValues,
  getAddOrderMultiMixFieldKeys,
  MAX_ADD_ORDER_MIXES,
  orderWithoutMixFields,
  pickMixFieldValues,
  supportsAddOrderMultiMix,
} from "@/lib/add-order-mixes";
import {
  formatOrderEmailFormatBlockReason,
  getInvalidOrderEmailFields,
} from "@/lib/email-format";
import { parsePackage } from "@/lib/package";
import type {
  CheerFormSubtype,
  CheerFormSubtypeFilter,
  DanceFormSubtype,
  DanceFormSubtypeFilter,
  Order,
  OrderFormType,
} from "@/types";
import {
  CHEER_FORM_SUBTABS,
  DANCE_FORM_SUBTABS,
  MANUAL_MATCH_FORM_TABS,
  supportsManualMatchForm,
} from "@/types";

type AddNewOrderModalProps = {
  open: boolean;
  onClose: () => void;
  initialFormType?: OrderFormType;
  initialCheerSubtype?: CheerFormSubtypeFilter;
  initialDanceSubtype?: DanceFormSubtypeFilter;
  onAdd: (order: Partial<Order>) => Promise<Order>;
};

function composePackageLabel(tierOrPackage: string, mixLength?: string): string {
  const raw = tierOrPackage.trim();
  if (!raw) return mixLength?.trim() || "";
  const parsed = parsePackage(raw);
  const tier =
    parsed.tier && parsed.tier !== "-"
      ? parsed.tier
      : raw.replace(/\s+\d+:\d{2}\b/g, "").replace(/\s+TBD\b/i, "").trim();
  const length = (mixLength || "").trim();
  if (tier && length && length !== "-") return `${tier} ${length}`;
  return tier || raw;
}

function categoryLabelsForForm(
  formType: OrderFormType,
  cheerSubtype: CheerFormSubtype,
  danceSubtype: DanceFormSubtype
): { category: string; subcategory: string } {
  if (formType === "school-all-star-cheer") {
    const match = CHEER_FORM_SUBTABS.find((s) => s.id === cheerSubtype);
    return {
      category: "All Star Cheer",
      subcategory: match ? match.label : "All Star Cheer",
    };
  }
  if (formType === "school-all-star-dance") {
    const match = DANCE_FORM_SUBTABS.find((s) => s.id === danceSubtype);
    return {
      category: "All Star Dance",
      subcategory: match ? match.label : "POM",
    };
  }
  if (formType === "marching-band") {
    return { category: "Marching Band", subcategory: "Marching Band" };
  }
  if (formType === "sports-entertainment") {
    return {
      category: "Sports Entertainment",
      subcategory: "Sports Entertainment",
    };
  }
  if (formType === "school-anthem") {
    return { category: "School Anthems", subcategory: "School Anthem" };
  }
  return { category: "Cheer", subcategory: "" };
}

function blankOrderDraft(
  formType: OrderFormType,
  cheerSubtype: CheerFormSubtype,
  danceSubtype: DanceFormSubtype
): Order {
  const { category } = categoryLabelsForForm(
    formType,
    cheerSubtype,
    danceSubtype
  );
  const draft = normalizeOrder({
    id: "",
    customerName: "",
    contactName: "",
    programName: "",
    category,
    package: "",
    musicTheme: "",
    editorRequest: "FA",
    requestedProducer: "",
    requestedEditor: "First Available",
    price: 0,
    status: "new",
    createdAt: new Date().toISOString(),
    needsAttention: true,
    attentionReason: null,
    formType,
    cheerFormSubtype:
      formType === "school-all-star-cheer" ? cheerSubtype : undefined,
    danceFormSubtype:
      formType === "school-all-star-dance" ? danceSubtype : undefined,
    varsityVirocCustomer:
      formType === "school-all-star-cheer" &&
      cheerSubtype === "school-cheer-viroc-yes"
        ? "Yes"
        : formType === "school-all-star-cheer" &&
            cheerSubtype === "school-cheer-viroc-no"
          ? "No"
          : undefined,
    country: "United States",
    numberOfCopies: "1",
    musicAffiliate: "",
    songListSuggestions: "",
    routineNotes: "",
    division: "",
  } as Order);

  // normalizeOrder may infer affiliate/songs: wipe for a true blank Google-style form.
  const cleared = {
    ...draft,
    isManualEntry: true,
    musicAffiliate: "",
    songListSuggestions: "",
    musicTheme: "",
    routineNotes: "",
    additionalNotes: "",
    division: "",
    package: "",
    packageType: "",
    timeLengthOfMix: "",
    // Identity / contact aliases empty so clearable coalesced getters stay blank.
    schoolOrganizationName: "",
    organizationName: "",
    schoolName: "",
    gymName: "",
    schoolProgramName: "",
    programName: "",
    teamName: "",
    schoolBillingAddress: "",
    gymBillingAddress: "",
    schoolAddress: "",
    schoolGymAddress: "",
    youthRecBillingAddress: "",
    organizationBillingAddress: "",
    city: "",
    stateProvince: "",
    zipPostalCode: "",
    musicContactName: "",
    musicContactPhone: "",
    musicContactEmail: "",
    coachName: "",
    coachContactFullName: "",
    coachPhone: "",
    coachEmail: "",
    coachEmailAddress: "",
    contactName: "",
    customerName: "",
    billingPersonName: "",
    billingPersonEmail: "",
    billingContactName: "",
    billingContactEmail: "",
    mascot: "",
    nicknames: "",
    schoolProgramColors: "",
    teamColors: "",
    vocalsPreference: "",
    instrumentationNotes: "",
    instrumentalStylePreference: "",
    lyricalNotes: "",
    couponCode: "",
  };
  if (formType === "school-anthem") {
    return {
      ...cleared,
      packageType: "SCHOOL ANTHEMS",
      package: "SCHOOL ANTHEMS",
      price: 1250,
      country: cleared.country || "United States",
    };
  }
  return cleared;
}

export function AddNewOrderModal({
  open,
  onClose,
  initialFormType = "school-all-star-cheer",
  initialCheerSubtype = "all-star-cheer",
  initialDanceSubtype = "pom",
  onAdd,
}: AddNewOrderModalProps) {
  const { discountCodes, producers } = useAppState();
  const [mounted, setMounted] = useState(false);

  const [formType, setFormType] = useState<OrderFormType>(() =>
    supportsManualMatchForm(initialFormType)
      ? initialFormType
      : "school-all-star-cheer"
  );
  const [cheerSubtype, setCheerSubtype] = useState<CheerFormSubtype>(
    initialCheerSubtype === "all"
      ? "all-star-cheer"
      : (initialCheerSubtype as CheerFormSubtype)
  );
  const [danceSubtype, setDanceSubtype] = useState<DanceFormSubtype>(
    initialDanceSubtype === "all"
      ? "pom"
      : (initialDanceSubtype as DanceFormSubtype)
  );

  const [orderDraft, setOrderDraft] = useState<Order | null>(null);
  /** Mix Information copies: each becomes its own order on save (max 10). */
  const [mixes, setMixes] = useState<Partial<Order>[]>([{}]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** Google-style: only highlight required empties after Save is attempted. */
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setOrderDraft(null);
      setMixes([{}]);
      setError(null);
      setSaving(false);
      setShowValidation(false);
      return;
    }

    const nextForm =
      initialFormType && supportsManualMatchForm(initialFormType)
        ? initialFormType
        : "school-all-star-cheer";
    const nextCheer =
      !initialCheerSubtype || initialCheerSubtype === "all"
        ? "all-star-cheer"
        : (initialCheerSubtype as CheerFormSubtype);
    const nextDance =
      !initialDanceSubtype || initialDanceSubtype === "all"
        ? "pom"
        : (initialDanceSubtype as DanceFormSubtype);

    setFormType(nextForm);
    setCheerSubtype(nextCheer);
    setDanceSubtype(nextDance);
    const blank = blankOrderDraft(nextForm, nextCheer, nextDance);
    setOrderDraft(blank);
    const keys = getAddOrderMultiMixFieldKeys(blank);
    setMixes(
      keys.length > 0
        ? [pickMixFieldValues(blank, keys)]
        : [blankAddOrderPerMixValues()]
    );
    setError(null);
    setSaving(false);
  }, [open, initialFormType, initialCheerSubtype, initialDanceSubtype]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const applyFormMeta = useCallback(
    (
      nextForm: OrderFormType,
      nextCheer: CheerFormSubtype,
      nextDance: DanceFormSubtype
    ) => {
      setFormType(nextForm);
      setCheerSubtype(nextCheer);
      setDanceSubtype(nextDance);
      setOrderDraft((prev) => {
        const base = blankOrderDraft(nextForm, nextCheer, nextDance);
        if (!prev) return base;
        // Keep entered values; swap form meta so sections match the subcategory.
        return {
          ...prev,
          ...base,
          // Preserve common fields the user may already have typed.
          coachName: prev.coachName,
          coachPhone: prev.coachPhone,
          coachEmail: prev.coachEmail,
          contactName: prev.contactName || prev.coachName || "",
          customerName: prev.customerName || prev.coachName || "",
          teamName: prev.teamName,
          programName: prev.programName || prev.teamName || "",
          gymName: prev.gymName,
          schoolName: prev.schoolName,
          schoolProgramName: prev.schoolProgramName,
          city: prev.city,
          stateProvince: prev.stateProvince,
          zipPostalCode: prev.zipPostalCode,
          country: prev.country || base.country,
          packageType: base.packageType || "",
          package: base.package || "",
          timeLengthOfMix: "",
        };
      });
      // Reset per-mix slots when form/subtype changes.
      const baseForMix = blankOrderDraft(nextForm, nextCheer, nextDance);
      const keys = getAddOrderMultiMixFieldKeys(baseForMix);
      setMixes(
        keys.length > 0
          ? [pickMixFieldValues(baseForMix, keys)]
          : [blankAddOrderPerMixValues()]
      );
    },
    []
  );

  const mixKeys = useMemo(
    () => (orderDraft ? getAddOrderMultiMixFieldKeys(orderDraft) : []),
    [
      orderDraft?.formType,
      orderDraft?.cheerFormSubtype,
      orderDraft?.danceFormSubtype,
    ]
  );
  const multiMixEnabled = Boolean(
    orderDraft && supportsAddOrderMultiMix(orderDraft) && mixKeys.length > 0
  );

  const mixListForSave = useMemo(() => {
    if (!orderDraft) return [{}] as Partial<Order>[];
    if (multiMixEnabled && mixes.length > 0) return mixes;
    if (mixKeys.length > 0) return [pickMixFieldValues(orderDraft, mixKeys)];
    return [{}];
  }, [orderDraft, multiMixEnabled, mixes, mixKeys]);

  const draftHasContent = useMemo(
    () =>
      orderDraft
        ? addOrderDraftHasContent(orderDraft, mixListForSave, mixKeys)
        : false,
    [orderDraft, mixListForSave, mixKeys]
  );

  const handleFormChange = (nextForm: OrderFormType) => {
    applyFormMeta(
      nextForm,
      nextForm === "school-all-star-cheer" ? "all-star-cheer" : cheerSubtype,
      nextForm === "school-all-star-dance" ? "pom" : danceSubtype
    );
  };

  const handleFieldChange = useCallback(
    (key: string, value: string) => {
      setOrderDraft((prev) => {
        if (!prev) return prev;
        return { ...prev, ...orderPatchFromOrderField(key, value, prev) };
      });
      setError(null);
    },
    []
  );

  const handleMixFieldChange = useCallback(
    (mixIndex: number, key: string, value: string) => {
      setMixes((prev) => {
        const next = prev.map((m) => ({ ...m }));
        const base = orderDraft || ({} as Order);
        const patched = orderPatchFromOrderField(
          key,
          value,
          { ...base, ...next[mixIndex] } as Order
        );
        next[mixIndex] = { ...next[mixIndex], ...patched };
        return next;
      });
      // Keep mix[0] mirrored onto the shared draft for identity helpers.
      if (mixIndex === 0) {
        setOrderDraft((prev) => {
          if (!prev) return prev;
          return { ...prev, ...orderPatchFromOrderField(key, value, prev) };
        });
      }
      setError(null);
    },
    [orderDraft]
  );

  const handleDuplicateMix = useCallback(() => {
    // Add another empty mix slot (team / package / length / producer only).
    setMixes((prev) => {
      if (prev.length >= MAX_ADD_ORDER_MIXES) return prev;
      return [...prev, blankAddOrderPerMixValues()];
    });
    setError(null);
  }, []);

  const handleRemoveMix = useCallback((mixIndex: number) => {
    setMixes((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== mixIndex);
      return next.length > 0 ? next : [{}];
    });
    setError(null);
  }, []);

  const handleSave = async () => {
    if (!orderDraft) return;
    setError(null);

    const keys = mixKeys;
    const mixList = mixListForSave;

    // Admin Add Order: any field except coupon / how-did-you-find-out alone.
    // Footer error (near Save): only after this click via showValidation.
    if (!addOrderDraftHasContent(orderDraft, mixList, keys)) {
      setShowValidation(true);
      return;
    }

    const sharedBase = orderWithoutMixFields(orderDraft, keys);
    const fullOrders = mixList.map((mix) =>
      applyMixFieldValues(sharedBase, mix)
    );

    // Any filled email field must be a valid address (any domain).
    for (const full of fullOrders) {
      const emailGaps = getInvalidOrderEmailFields(full);
      if (emailGaps.length > 0) {
        setShowValidation(true);
        setError(formatOrderEmailFormatBlockReason(emailGaps));
        return;
      }
    }

    setSaving(true);

    const { category } = categoryLabelsForForm(
      formType,
      cheerSubtype,
      danceSubtype
    );

    try {
      for (const draft of fullOrders) {
        const tier =
          packageTypeDisplayValue(draft.packageType || "") ||
          packageTypeDisplayValue(draft.package || "");
        const mixLength = (draft.timeLengthOfMix || "").trim();
        const selectedPkg =
          formType === "school-all-star-cheer"
            ? composePackageLabel(tier, mixLength)
            : tier ||
              (draft.packageType || draft.package || "").trim();

        const contact =
          draft.coachName ||
          draft.coachContactFullName ||
          draft.musicContactName ||
          draft.contactName ||
          draft.customerName ||
          "";
        const program =
          getOrderIdentityName(draft) ||
          draft.teamName ||
          draft.programName ||
          "";

        await onAdd({
          ...draft,
          isManualEntry: true,
          category,
          package:
            formType === "school-anthem" ? "SCHOOL ANTHEMS" : selectedPkg,
          packageType:
            formType === "school-anthem"
              ? "SCHOOL ANTHEMS"
              : tier || draft.packageType,
          price: formType === "school-anthem" ? 1250 : draft.price,
          timeLengthOfMix: mixLength,
          contactName: contact,
          customerName: contact,
          programName: program,
          gymName:
            draft.gymName?.trim() ||
            (cheerSubtype === "all-star-cheer" ? program : ""),
          schoolName:
            draft.schoolName?.trim() || draft.gymName?.trim() || program,
          formType,
          cheerFormSubtype:
            formType === "school-all-star-cheer" ? cheerSubtype : undefined,
          danceFormSubtype:
            formType === "school-all-star-dance" ? danceSubtype : undefined,
          editorRequest:
            draft.requestedEditor === "First Available" ||
            !draft.requestedEditor
              ? "FA"
              : draft.requestedEditor,
          requestedProducer: draft.requestedEditor || "",
          musicTheme:
            draft.songListSuggestions ||
            draft.routineNotes ||
            draft.musicTheme ||
            "",
          mixStartDate: "",
          mixEndDate: "",
          assignedProducer: "",
        });
      }

      onClose();
    } catch (err: unknown) {
      setError(
        formatApiClientError(err, "Failed to create manual schedule entry.")
      );
    } finally {
      setSaving(false);
    }
  };

  const subtitle = useMemo(() => {
    if (formType === "school-all-star-cheer") {
      return (
        CHEER_FORM_SUBTABS.find((s) => s.id === cheerSubtype)?.label ||
        "All Star Cheer"
      );
    }
    if (formType === "school-all-star-dance") {
      return (
        DANCE_FORM_SUBTABS.find((s) => s.id === danceSubtype)?.label || "POM"
      );
    }
    return (
      MANUAL_MATCH_FORM_TABS.find((t) => t.id === formType)?.label ||
      "New order"
    );
  }, [formType, cheerSubtype, danceSubtype]);

  if (!mounted || !open || !orderDraft) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-new-order-title"
        className="relative flex max-h-[90vh] w-full max-w-[920px] flex-col overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-brand-line/60 bg-gradient-to-br from-brand-orange/10 via-brand-elevated to-brand-signature/8 px-6 pb-5 pt-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-orange/12 text-brand-orange ring-1 ring-inset ring-brand-orange/20">
              <Calendar className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                New order
              </p>
              <h2
                id="add-new-order-title"
                className="mt-0.5 truncate text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
              >
                Add New Order
              </h2>
              <p className="mt-0.5 truncate text-[13px] text-brand-ink-secondary">
                {subtitle} · assign producer later from Orders
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <FilterMenu
              label="Form"
              hideLabel
              portal
              portalZIndex={110}
              value={formType}
              onChange={(v) => handleFormChange(v as OrderFormType)}
              accent="orange"
              options={MANUAL_MATCH_FORM_TABS.map(({ id, label }) => ({
                value: id,
                label,
              }))}
            />

            {formType === "school-all-star-cheer" ? (
              <FilterMenu
                label="Cheer"
                hideLabel
                portal
                portalZIndex={110}
                value={cheerSubtype}
                onChange={(v) =>
                  applyFormMeta(formType, v as CheerFormSubtype, danceSubtype)
                }
                accent="orange"
                options={CHEER_FORM_SUBTABS.map(({ id, label }) => ({
                  value: id,
                  label,
                }))}
              />
            ) : null}

            {formType === "school-all-star-dance" ? (
              <FilterMenu
                label="Dance"
                hideLabel
                portal
                portalZIndex={110}
                value={danceSubtype}
                onChange={(v) =>
                  applyFormMeta(formType, cheerSubtype, v as DanceFormSubtype)
                }
                accent="orange"
                options={DANCE_FORM_SUBTABS.map(({ id, label }) => ({
                  value: id,
                  label,
                }))}
              />
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-line/60 bg-white text-brand-ink-secondary shadow-sm transition hover:border-brand-line hover:bg-brand-bg hover:text-brand-ink"
              aria-label="Close"
            >
              <X className="h-4 w-4" strokeWidth={2.25} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          {error ? (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-[13px] font-medium text-red-700 ring-1 ring-inset ring-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          ) : null}

          <MTDOrderDetails
            order={orderDraft}
            originalOrder={orderDraft}
            discountCodes={discountCodes}
            producers={producers}
            editable
            highlightMissing={showValidation}
            /** Empty allowlist: no field is mandatory / starred on Add Order. */
            requiredFieldKeys={[]}
            /** Magento-only fields stay hidden until Match fills them. */
            manualAddSlim
            onFieldChange={handleFieldChange}
            multiMix={
              multiMixEnabled
                ? {
                    mixes,
                    onMixFieldChange: handleMixFieldChange,
                    onDuplicateMix: handleDuplicateMix,
                    onRemoveMix: handleRemoveMix,
                    maxMixes: MAX_ADD_ORDER_MIXES,
                  }
                : undefined
            }
          />
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-brand-line/60 bg-brand-bg/40 px-6 py-4">
          {showValidation && !draftHasContent ? (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-[13px] font-medium text-red-700 ring-1 ring-inset ring-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>
                Add at least one order detail to save. Defaults, coupon codes,
                and “how did you find us?” don’t count on their own.
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-brand-line/70 bg-white px-4 py-2 text-[13px] font-semibold text-brand-ink-secondary shadow-sm transition hover:bg-brand-bg disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-orange-hover disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : multiMixEnabled && mixes.length > 1 ? (
                `Save ${mixes.length} Orders`
              ) : (
                "Save Order"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
