"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Calendar, Loader2, AlertCircle } from "lucide-react";
import { FilterMenu } from "@/components/ui/FilterMenu";
import { MTDOrderDetails } from "@/components/mtd/MTDOrderDetails";
import { useAppState } from "@/context/AppStateContext";
import { formatApiClientError } from "@/lib/api/client";
import type { CreateManualSchedulePayload } from "@/lib/api/mtd";
import { orderPatchFromOrderField } from "@/lib/mtd-order-sync";
import { packageTypeDisplayValue } from "@/components/mtd/PackageTypeField";
import {
  getOrderIdentityFieldKey,
  getOrderIdentityName,
} from "@/lib/order-detail-sections";
import { normalizeOrder } from "@/lib/order-form";
import {
  formatAddOrderSaveBlockReason,
  getAddOrderRequiredGaps,
} from "@/lib/order-form-missing";
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
  ORDER_FORM_TABS,
} from "@/types";

type AddNewOrderModalProps = {
  open: boolean;
  onClose: () => void;
  initialFormType?: OrderFormType;
  initialCheerSubtype?: CheerFormSubtypeFilter;
  initialDanceSubtype?: DanceFormSubtypeFilter;
  onAdd: (payload: CreateManualSchedulePayload) => Promise<Order>;
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

  // normalizeOrder may infer affiliate/songs — wipe for a true blank Google-style form.
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
  const { discountCodes, producers, updateOrder } = useAppState();
  const [mounted, setMounted] = useState(false);

  const [formType, setFormType] = useState<OrderFormType>(initialFormType);
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
      setError(null);
      setSaving(false);
      setShowValidation(false);
      return;
    }

    const nextForm = initialFormType || "school-all-star-cheer";
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
    setOrderDraft(blankOrderDraft(nextForm, nextCheer, nextDance));
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
    },
    []
  );

  const handleFormChange = (nextForm: OrderFormType) => {
    applyFormMeta(
      nextForm,
      nextForm === "school-all-star-cheer" ? "all-star-cheer" : cheerSubtype,
      nextForm === "school-all-star-dance" ? "pom" : danceSubtype
    );
  };

  const handleFieldChange = useCallback((key: string, value: string) => {
    setOrderDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, ...orderPatchFromOrderField(key, value, prev) };
    });
    setError(null);
  }, []);

  const handleSave = async () => {
    if (!orderDraft) return;
    setError(null);

    // Admin Add Order: only identity name (Gym / School / Org) is required.
    const gaps = getAddOrderRequiredGaps(orderDraft);
    if (gaps.length > 0) {
      setShowValidation(true);
      setError(formatAddOrderSaveBlockReason(gaps));
      return;
    }

    setSaving(true);

    const { category, subcategory } = categoryLabelsForForm(
      formType,
      cheerSubtype,
      danceSubtype
    );

    const tier =
      packageTypeDisplayValue(orderDraft.packageType || "") ||
      packageTypeDisplayValue(orderDraft.package || "");
    const mixLength = (orderDraft.timeLengthOfMix || "").trim();
    const selectedPkg =
      formType === "school-all-star-cheer"
        ? composePackageLabel(tier, mixLength) || subcategory || category
        : (orderDraft.packageType || orderDraft.package || "").trim() ||
          subcategory ||
          category;

    const contact =
      orderDraft.coachName ||
      orderDraft.coachContactFullName ||
      orderDraft.musicContactName ||
      orderDraft.contactName ||
      orderDraft.customerName ||
      "";
    const program =
      getOrderIdentityName(orderDraft) ||
      orderDraft.teamName ||
      orderDraft.programName ||
      "";

    try {
      const created = await onAdd({
        category,
        subcategory,
        form_type: formType,
        cheer_form_subtype:
          formType === "school-all-star-cheer" ? cheerSubtype : undefined,
        dance_form_subtype:
          formType === "school-all-star-dance" ? danceSubtype : undefined,
        mix_start_date: null,
        mix_end_date: null,
        assigned_producer: null,
        contact_name: contact.trim() || null,
        email:
          orderDraft.coachEmail ||
          orderDraft.coachEmailAddress ||
          null,
        coach_email:
          orderDraft.coachEmail || orderDraft.coachEmailAddress || null,
        youth_rec_extra_email_address:
          cheerSubtype === "youth-rec-cheer"
            ? orderDraft.youthRecExtraEmailAddress?.trim() ||
              orderDraft.emailAddress?.trim() ||
              null
            : null,
        // Identity SoT is school_gym_name (Gym / School / Program / Org).
        program_name: null,
        school_gym_name:
          orderDraft.schoolName?.trim() ||
          orderDraft.gymName?.trim() ||
          orderDraft.schoolProgramName?.trim() ||
          program.trim() ||
          null,
        team_name: orderDraft.teamName?.trim() || null,
        package:
          formType === "school-anthem" ? "SCHOOL ANTHEMS" : selectedPkg,
        time_length_of_mix: mixLength || null,
        song_list_suggestions: orderDraft.songListSuggestions || null,
        power_music_covers: orderDraft.powerMusicCovers || null,
        routine_notes: orderDraft.routineNotes || null,
        custom_voiceovers: orderDraft.customVoiceovers || null,
        voiceover_script: orderDraft.voiceoverScript || null,
        pronunciation_guidance: orderDraft.pronunciationGuidance || null,
        received_eight_count_sheet: undefined,
        video_url: null,
        music_affiliate: orderDraft.musicAffiliate || undefined,
      });

      // Persist the full form draft onto the created order (same shape as edit).
      await updateOrder(
        created.id,
        {
          ...orderDraft,
          id: created.id,
          // Keep manual flag so Collections shows Form for every form type.
          isManualEntry: true,
          category,
          package:
            formType === "school-anthem" ? "SCHOOL ANTHEMS" : selectedPkg,
          packageType:
            formType === "school-anthem"
              ? "SCHOOL ANTHEMS"
              : tier || orderDraft.packageType,
          price: formType === "school-anthem" ? 1250 : orderDraft.price,
          timeLengthOfMix: mixLength,
          contactName: contact,
          customerName: contact,
          programName: program,
          gymName:
            orderDraft.gymName?.trim() ||
            (cheerSubtype === "all-star-cheer" ? program : ""),
          schoolName:
            orderDraft.schoolName?.trim() ||
            orderDraft.gymName?.trim() ||
            program,
          formType,
          cheerFormSubtype:
            formType === "school-all-star-cheer" ? cheerSubtype : undefined,
          danceFormSubtype:
            formType === "school-all-star-dance" ? danceSubtype : undefined,
          editorRequest:
            orderDraft.requestedEditor === "First Available" ||
            !orderDraft.requestedEditor
              ? "FA"
              : orderDraft.requestedEditor,
          requestedProducer: orderDraft.requestedEditor || "",
          musicTheme:
            orderDraft.songListSuggestions ||
            orderDraft.routineNotes ||
            orderDraft.musicTheme ||
            "",
        },
        created
      );

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
    return ORDER_FORM_TABS.find((t) => t.id === formType)?.label || "New order";
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
              options={ORDER_FORM_TABS.map(({ id, label }) => ({
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
            requiredFieldKeys={[
              getOrderIdentityFieldKey(formType, cheerSubtype, danceSubtype),
            ]}
            onFieldChange={handleFieldChange}
          />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-brand-line/60 bg-brand-bg/40 px-6 py-4">
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
            ) : (
              "Save Order"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
