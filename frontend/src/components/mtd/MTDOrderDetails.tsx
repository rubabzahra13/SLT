"use client";

import type { DiscountCode, Order, Producer } from "@/types";
import {
  isAddOrderPerMixFieldKey,
  isMixInformationSectionTitle,
  MAX_ADD_ORDER_MIXES,
} from "@/lib/add-order-mixes";
import { getOrderDetailSections } from "@/lib/order-detail-sections";
import { rawFieldValue } from "@/lib/order-detail-fields";
import type { FieldProvenance } from "@/lib/manual-form-merge";
import { SourceCue } from "@/components/orders/ManualFormPairBar";
import { CheerPerMixFields } from "@/components/orders/CheerPerMixFields";
import { CopyPlus, Trash2 } from "lucide-react";
import { CouponCodeField } from "@/components/mtd/CouponCodeField";
import { CountryField } from "@/components/mtd/CountryField";
import {
  formatRequestedProducerDisplay,
  RequestedProducerField,
} from "@/components/mtd/RequestedProducerField";
import {
  isFormCategoryLabel,
  packageTypeDisplayValue,
  PackageTypeField,
} from "@/components/mtd/PackageTypeField";
import { MixLengthField } from "@/components/mtd/MixLengthField";
import {
  normalizeTeamCoedAllGirl,
  TeamCoedField,
} from "@/components/mtd/TeamCoedField";
import { normalizeYesNo, YesNoField } from "@/components/mtd/YesNoField";
import {
  HowDidYouFindOutField,
  normalizeHowDidYouFindOut,
} from "@/components/mtd/HowDidYouFindOutField";
import {
  MusicAffiliateField,
  normalizeMusicAffiliateOption,
  musicAffiliateOptionsForOrder,
} from "@/components/mtd/MusicAffiliateField";
import {
  DanceMusicAffiliateField,
  formatDanceMusicAffiliates,
  parseDanceMusicAffiliates,
} from "@/components/mtd/DanceMusicAffiliateField";
import {
  CustomVoiceoversField,
  normalizeCustomVoiceovers,
} from "@/components/mtd/CustomVoiceoversField";
import {
  DanceStyleField,
  normalizeDanceStyle,
} from "@/components/mtd/DanceStyleField";
import {
  GamedayStyleField,
  normalizeGamedayStyle,
} from "@/components/mtd/GamedayStyleField";
import {
  normalizeVocalsPreference,
  VocalsPreferenceField,
} from "@/components/mtd/VocalsPreferenceField";
import {
  normalizeSplitOrNoSplit,
  SplitOrNoSplitField,
} from "@/components/mtd/SplitOrNoSplitField";
import {
  DetailInput,
  DetailTextarea,
  InlineDateInput,
} from "@/components/mtd/InlineFields";
import { parsePackage } from "@/lib/package";
import { normalizeCountryName } from "@/lib/countries";
import {
  isOptionalOrderFormField,
  isOrderFormFieldMissing,
} from "@/lib/order-form-missing";
import {
  isAcceptableOrderEmailValue,
  isOrderEmailFieldKey,
} from "@/lib/email-format";
import {
  isEmptyFieldToken,
  placeholderFieldErrorMessage,
} from "@/lib/empty-field-tokens";
import clsx from "clsx";

type MTDOrderDetailsProps = {
  order: Order;
  /** Snapshot from before edits (API / original submission). */
  originalOrder?: Order | null;
  discountCodes?: DiscountCode[];
  producers?: Producer[];
  editable?: boolean;
  onFieldChange?: (key: string, value: string) => void;
  /** Highlight empty form-only fields in red (default true). */
  highlightMissing?: boolean;
  /**
   * When set, only these keys can show as required/missing.
   * Used by Add New Order (identity name only).
   */
  requiredFieldKeys?: ReadonlySet<string> | string[];
  /** Per-field provenance when a Manual↔Form pair is present (single value, no dupes). */
  fieldSources?: Record<string, FieldProvenance>;
  /**
   * Add New Order: duplicate Mix Information into multiple mixes (max 10).
   * Each mix becomes its own order on save; shared sections stay single.
   */
  multiMix?: {
    mixes: Partial<Order>[];
    onMixFieldChange: (mixIndex: number, key: string, value: string) => void;
    onDuplicateMix: () => void;
    onRemoveMix: (mixIndex: number) => void;
    maxMixes?: number;
  };
};

function FieldLabel({
  label,
  missing,
  optional,
  requiredMark,
  provenance,
}: {
  label: string;
  missing?: boolean;
  /** Soft cue that empty is OK (Google-style optional). */
  optional?: boolean;
  /** Always-on required cue (e.g. Add Order identity name) before save errors. */
  requiredMark?: boolean;
  provenance?: FieldProvenance;
}) {
  // Length of Mix Magento note — never show the parenthetical instruction.
  const shown = /^length of mix\b/i.test(label) ? "Length of Mix" : label;
  const also = provenance?.alsoHas;
  return (
    <div className="min-h-[28px] space-y-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <p
          className={clsx(
            "text-[10px] font-bold uppercase leading-snug tracking-[0.06em]",
            missing ? "text-[#901313]" : "text-brand-ink"
          )}
        >
          {shown}
          {requiredMark && !missing ? (
            <span
              className="ml-0.5 font-bold text-brand-orange"
              aria-hidden
            >
              *
            </span>
          ) : null}
          {optional && !missing && !requiredMark ? (
            <span className="ml-1 font-medium normal-case tracking-normal text-brand-ink-tertiary">
              (optional)
            </span>
          ) : null}
          {missing ? (
            <span className="ml-1 font-semibold normal-case tracking-normal">
              {" "}
              - required
            </span>
          ) : null}
        </p>
        {provenance ? (
          <SourceCue
            source={provenance.shown}
            tone={also ? "conflict" : "default"}
          />
        ) : null}
      </div>
      {also ? (
        <p className="px-0.5 text-[10px] leading-snug text-brand-ink-tertiary/80">
          <span className="font-medium">
            {also.source === "manual" ? "Manually added data" : "Form also has"}
          </span>
          {": "}
          <span className="break-words font-normal">{also.value}</span>
        </p>
      ) : null}
    </div>
  );
}

export function formatDetailDisplay(value: string): string {
  if (!value?.trim() || value === "—") return "";
  return value.replace(/\s*[—–]\s*/g, ", ").trim();
}

function fieldSpanClass(key: string, label: string): string {
  if (key === "numberOfCopies") {
    return "sm:col-span-2";
  }
  const haystack = `${key} ${label}`;
  if (
    /address|street|songList|suggestions|routineNotes|script/i.test(haystack)
  ) {
    return "sm:col-span-2 lg:col-span-3";
  }
  if (/howDidYouFindOut|find out/i.test(haystack)) {
    return "sm:col-span-2";
  }
  if (/pronunciation|choreographer/i.test(haystack)) {
    return "sm:col-span-2 lg:col-span-3";
  }
  return "";
}

export function MTDOrderDetails({
  order,
  originalOrder = null,
  discountCodes = [],
  producers = [],
  editable = false,
  onFieldChange,
  highlightMissing = true,
  requiredFieldKeys,
  fieldSources,
  multiMix,
}: MTDOrderDetailsProps) {
  const sections = getOrderDetailSections(order);
  const requiredKeys = requiredFieldKeys
    ? requiredFieldKeys instanceof Set
      ? requiredFieldKeys
      : new Set(requiredFieldKeys)
    : null;
  const maxMixes = multiMix?.maxMixes ?? MAX_ADD_ORDER_MIXES;

  if (sections.length === 0) {
    return (
      <p className="text-[13px] text-brand-ink-secondary">
        No order form fields available for this record.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((section) => {
        const mixMode =
          Boolean(multiMix) && isMixInformationSectionTitle(section.title);
        // Per-mix cheer fields live in Mix slots — hide elsewhere (Team, etc.).
        const sectionFields = multiMix
          ? section.fields.filter((f) => !isAddOrderPerMixFieldKey(f.key))
          : section.fields;
        if (!mixMode && sectionFields.length === 0) return null;

        return (
        <section
          key={section.title}
          className="overflow-hidden rounded-xl border border-brand-line/45 bg-white ring-1 ring-inset ring-brand-line/10"
        >
          <div className="flex items-center justify-between gap-2 border-b border-brand-line/35 bg-brand-bg-subtle/60 px-3 py-2">
            <div className="min-w-0">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                {section.title}
              </h3>
              {mixMode && multiMix && multiMix.mixes.length > 1 ? (
                <p className="mt-0.5 text-[10px] font-medium text-brand-ink-secondary">
                  One section · {multiMix.mixes.length} mixes (separate orders
                  on save). Affiliate & notes below are shared.
                </p>
              ) : null}
            </div>
            {mixMode && multiMix && editable ? (
              <div className="flex shrink-0 items-center gap-1">
                {multiMix.mixes.length < maxMixes ? (
                  <button
                    type="button"
                    onClick={() => multiMix.onDuplicateMix()}
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-brand-line/60 bg-white px-2 text-[11px] font-semibold text-brand-ink-secondary transition hover:bg-brand-bg hover:text-brand-ink"
                    title={`Add another mix (max ${maxMixes})`}
                  >
                    <CopyPlus className="h-3 w-3" strokeWidth={2.25} />
                    Add mix
                  </button>
                ) : null}
                <span className="pl-1 text-[10px] font-medium tabular-nums text-brand-ink-tertiary">
                  {multiMix.mixes.length}/{maxMixes}
                </span>
              </div>
            ) : null}
          </div>
          <div className="space-y-4 p-4">
            {mixMode && multiMix
              ? multiMix.mixes.map((mix, mixIndex) => (
                  <div
                    key={`mix-slot-${mixIndex}`}
                    className="rounded-xl border border-brand-line/50 bg-brand-bg/30 p-3"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-brand-ink">
                        Mix {mixIndex + 1}
                      </p>
                      {multiMix.mixes.length > 1 && editable ? (
                        <button
                          type="button"
                          onClick={() => multiMix.onRemoveMix(mixIndex)}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border border-brand-line/60 bg-white px-2 text-[11px] font-semibold text-brand-ink-secondary transition hover:bg-brand-bg hover:text-brand-ink"
                          title="Remove this mix"
                        >
                          <Trash2 className="h-3 w-3" strokeWidth={2.25} />
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <CheerPerMixFields
                      order={order}
                      mix={mix}
                      producers={producers}
                      editable={editable}
                      onChange={(key, value) =>
                        multiMix.onMixFieldChange(mixIndex, key, value)
                      }
                    />
                  </div>
                ))
              : null}
            {mixMode && multiMix && sectionFields.length > 0 ? (
              <p className="border-t border-brand-line/40 pt-3 text-[10px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                Shared for all mixes
              </p>
            ) : null}
            {sectionFields.length > 0 ? (
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {sectionFields.map((field) => {
              const rawValue = rawFieldValue(order, field.key);
              const displayValue = formatDetailDisplay(field.value);
              const spanClass = fieldSpanClass(field.key, field.label);
              const useTextarea = Boolean(field.multiline);
              const inRequiredAllowlist =
                !requiredKeys || requiredKeys.has(field.key);
              const missing =
                highlightMissing &&
                inRequiredAllowlist &&
                (requiredKeys
                  ? !rawFieldValue(order, field.key).trim()
                  : isOrderFormFieldMissing(order, field.key));
              const emailInvalid =
                editable &&
                isOrderEmailFieldKey(field.key) &&
                Boolean(rawValue.trim()) &&
                !isAcceptableOrderEmailValue(rawValue, field.key);
              // Placeholder dictionary (none, N/A, TBD, …) — warn live, never block save.
              const placeholderInvalid =
                editable &&
                Boolean(rawValue.trim()) &&
                isEmptyFieldToken(rawValue, { fieldKey: field.key });
              // Add Order allowlist: only identity is required; don't spam "(optional)".
              const optional =
                !requiredKeys && isOptionalOrderFormField(field.key, order);
              const requiredMark = Boolean(
                requiredKeys?.has(field.key)
              );

              if (field.key === "couponCode") {
                return (
                  <div key={field.key} className="min-w-0">
                    <CouponCodeField
                      value={rawValue}
                      discountCodes={discountCodes}
                      editable={editable}
                      onChange={
                        onFieldChange
                          ? (value) => onFieldChange(field.key, value)
                          : undefined
                      }
                    />
                  </div>
                );
              }

              if (field.key === "country") {
                const countryDisplay =
                  normalizeCountryName(rawValue) || displayValue;
                return (
                  <div
                    key={field.key}
                    className={clsx("flex min-w-0 flex-col", spanClass)}
                  >
                    <FieldLabel
                      label={field.label}
                      optional={optional}
                      requiredMark={requiredMark}
                      missing={missing}
                      provenance={fieldSources?.[field.key]}
                    />
                    <div className="mt-1">
                      {editable && onFieldChange ? (
                        <CountryField
                          value={rawValue}
                          onChange={(value) => onFieldChange(field.key, value)}
                        />
                      ) : countryDisplay ? (
                        <p className="text-[13px] font-normal text-brand-ink">
                          {countryDisplay}
                        </p>
                      ) : (
                        <p className="text-[13px] text-brand-ink-tertiary">
                          Not set
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              if (field.key === "teamCoedAllGirl") {
                const teamDisplay =
                  normalizeTeamCoedAllGirl(rawValue) || displayValue;
                return (
                  <div
                    key={field.key}
                    className={clsx("flex min-w-0 flex-col", spanClass)}
                  >
                    <FieldLabel
                      label={field.label}
                      optional={optional}
                      requiredMark={requiredMark}
                      missing={missing}
                      provenance={fieldSources?.[field.key]}
                    />
                    <div className="mt-1">
                      {editable && onFieldChange ? (
                        <TeamCoedField
                          value={rawValue}
                          onChange={(value) => onFieldChange(field.key, value)}
                        />
                      ) : teamDisplay ? (
                        <p className="text-[13px] font-normal text-brand-ink">
                          {teamDisplay}
                        </p>
                      ) : (
                        <p className="text-[13px] text-brand-ink-tertiary">
                          Not set
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              if (field.key === "splitOrNoSplit") {
                const splitDisplay =
                  normalizeSplitOrNoSplit(rawValue) || displayValue;
                return (
                  <div
                    key={field.key}
                    className={clsx("flex min-w-0 flex-col", spanClass)}
                  >
                    <FieldLabel
                      label={field.label}
                      optional={optional}
                      requiredMark={requiredMark}
                      missing={missing}
                      provenance={fieldSources?.[field.key]}
                    />
                    <div className="mt-1">
                      {editable && onFieldChange ? (
                        <SplitOrNoSplitField
                          value={rawValue}
                          aria-label={field.label}
                          onChange={(value) => onFieldChange(field.key, value)}
                        />
                      ) : splitDisplay ? (
                        <p className="text-[13px] font-normal text-brand-ink">
                          {splitDisplay}
                        </p>
                      ) : (
                        <p className="text-[13px] text-brand-ink-tertiary">
                          Not set
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              // Dance (POM+) — customer-form affiliate checkboxes.
              if (
                field.key === "musicAffiliate" &&
                order.formType === "school-all-star-dance"
              ) {
                const selected = parseDanceMusicAffiliates(rawValue);
                const affiliateDisplay =
                  formatDanceMusicAffiliates(selected) || displayValue;
                return (
                  <div
                    key={field.key}
                    className={clsx("flex min-w-0 flex-col", spanClass)}
                  >
                    <FieldLabel
                      label={field.label}
                      optional={optional}
                      requiredMark={requiredMark}
                      missing={missing}
                      provenance={fieldSources?.[field.key]}
                    />
                    <div className="mt-1">
                      {editable && onFieldChange ? (
                        <DanceMusicAffiliateField
                          value={rawValue}
                          aria-label={field.label}
                          onChange={(value) => onFieldChange(field.key, value)}
                        />
                      ) : affiliateDisplay ? (
                        <p className="text-[13px] font-normal text-brand-ink">
                          {affiliateDisplay}
                        </p>
                      ) : (
                        <p className="text-[13px] text-brand-ink-tertiary">
                          Not set
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              // Cheer Add Order / edit — SoftSelect with fuzzy spacing/caps/near-word match.
              if (
                field.key === "musicAffiliate" &&
                order.formType === "school-all-star-cheer" &&
                order.cheerFormSubtype !== "youth-rec-cheer"
              ) {
                const affiliateOptions = musicAffiliateOptionsForOrder(order);
                const affiliateDisplay =
                  normalizeMusicAffiliateOption(rawValue, affiliateOptions) ||
                  displayValue;
                return (
                  <div
                    key={field.key}
                    className={clsx("flex min-w-0 flex-col", spanClass)}
                  >
                    <FieldLabel
                      label={field.label}
                      optional={optional}
                      requiredMark={requiredMark}
                      missing={missing}
                      provenance={fieldSources?.[field.key]}
                    />
                    <div className="mt-1">
                      {editable && onFieldChange ? (
                        <MusicAffiliateField
                          value={rawValue}
                          formType={order.formType}
                          cheerSubtype={order.cheerFormSubtype}
                          packageType={
                            order.packageType || order.package || null
                          }
                          aria-label={field.label}
                          onChange={(value) => onFieldChange(field.key, value)}
                        />
                      ) : affiliateDisplay ? (
                        <p className="text-[13px] font-normal text-brand-ink">
                          {affiliateDisplay}
                        </p>
                      ) : (
                        <p className="text-[13px] text-brand-ink-tertiary">
                          Not set
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              if (field.key === "customVoiceovers") {
                const voVariant =
                  order.danceFormSubtype === "gameday" ||
                  order.danceFormSubtype === "jazz-kick"
                    ? "gameday"
                    : "dance";
                const voDisplay =
                  normalizeCustomVoiceovers(rawValue, voVariant) ||
                  displayValue;
                return (
                  <div
                    key={field.key}
                    className={clsx("flex min-w-0 flex-col", spanClass)}
                  >
                    <FieldLabel
                      label={field.label}
                      optional={optional}
                      requiredMark={requiredMark}
                      missing={missing}
                      provenance={fieldSources?.[field.key]}
                    />
                    <div className="mt-1">
                      {editable && onFieldChange ? (
                        <CustomVoiceoversField
                          value={rawValue}
                          variant={voVariant}
                          aria-label={field.label}
                          onChange={(value) => onFieldChange(field.key, value)}
                        />
                      ) : voDisplay ? (
                        <p className="text-[13px] font-normal text-brand-ink">
                          {voDisplay}
                        </p>
                      ) : (
                        <p className="text-[13px] text-brand-ink-tertiary">
                          Not set
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              if (field.key === "styleOfGamedayMix") {
                const styleDisplay =
                  normalizeGamedayStyle(rawValue) || displayValue;
                return (
                  <div
                    key={field.key}
                    className={clsx("flex min-w-0 flex-col", spanClass)}
                  >
                    <FieldLabel
                      label={field.label}
                      optional={optional}
                      requiredMark={requiredMark}
                      missing={missing}
                      provenance={fieldSources?.[field.key]}
                    />
                    <div className="mt-1">
                      {editable && onFieldChange ? (
                        <GamedayStyleField
                          value={rawValue}
                          aria-label={field.label}
                          onChange={(value) => onFieldChange(field.key, value)}
                        />
                      ) : styleDisplay ? (
                        <p className="text-[13px] font-normal text-brand-ink">
                          {styleDisplay}
                        </p>
                      ) : (
                        <p className="text-[13px] text-brand-ink-tertiary">
                          Not set
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              if (field.key === "style") {
                const styleVariant =
                  order.danceFormSubtype === "jazz-kick"
                    ? "jazz-kick"
                    : "tpv";
                const styleDisplay =
                  normalizeDanceStyle(rawValue, styleVariant) || displayValue;
                return (
                  <div
                    key={field.key}
                    className={clsx("flex min-w-0 flex-col", spanClass)}
                  >
                    <FieldLabel
                      label={field.label}
                      optional={optional}
                      requiredMark={requiredMark}
                      missing={missing}
                      provenance={fieldSources?.[field.key]}
                    />
                    <div className="mt-1">
                      {editable && onFieldChange ? (
                        <DanceStyleField
                          value={rawValue}
                          variant={styleVariant}
                          aria-label={field.label}
                          onChange={(value) => onFieldChange(field.key, value)}
                        />
                      ) : styleDisplay ? (
                        <p className="text-[13px] font-normal text-brand-ink">
                          {styleDisplay}
                        </p>
                      ) : (
                        <p className="text-[13px] text-brand-ink-tertiary">
                          Not set
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              if (
                field.key === "licensingRequired" ||
                field.key === "isRushOrder" ||
                field.key === "clientRequestedRushOrder"
              ) {
                const yesNoDisplay = normalizeYesNo(rawValue) || displayValue;
                return (
                  <div
                    key={field.key}
                    className={clsx("flex min-w-0 flex-col", spanClass)}
                  >
                    <FieldLabel
                      label={field.label}
                      optional={optional}
                      requiredMark={requiredMark}
                      missing={missing}
                      provenance={fieldSources?.[field.key]}
                    />
                    <div className="mt-1">
                      {editable && onFieldChange ? (
                        <YesNoField
                          value={rawValue}
                          aria-label={field.label}
                          onChange={(value) => onFieldChange(field.key, value)}
                        />
                      ) : yesNoDisplay ? (
                        <p className="text-[13px] font-normal text-brand-ink">
                          {yesNoDisplay}
                        </p>
                      ) : (
                        <p className="text-[13px] text-brand-ink-tertiary">
                          Not set
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              if (field.key === "vocalsPreference") {
                const vocalsDisplay =
                  normalizeVocalsPreference(rawValue) || displayValue;
                return (
                  <div
                    key={field.key}
                    className={clsx("flex min-w-0 flex-col", spanClass)}
                  >
                    <FieldLabel
                      label={field.label}
                      optional={optional}
                      requiredMark={requiredMark}
                      missing={missing}
                      provenance={fieldSources?.[field.key]}
                    />
                    <div className="mt-1">
                      {editable && onFieldChange ? (
                        <VocalsPreferenceField
                          value={rawValue}
                          aria-label={field.label}
                          onChange={(value) => onFieldChange(field.key, value)}
                        />
                      ) : vocalsDisplay ? (
                        <p className="text-[13px] font-normal text-brand-ink">
                          {vocalsDisplay}
                        </p>
                      ) : (
                        <p className="text-[13px] text-brand-ink-tertiary">
                          Not set
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              if (
                field.key === "mixEndDate" ||
                field.key === "clientRequestedMixDueDate"
              ) {
                return (
                  <div
                    key={field.key}
                    className={clsx("flex min-w-0 flex-col", spanClass)}
                  >
                    <FieldLabel
                      label={field.label}
                      optional={optional}
                      requiredMark={requiredMark}
                      missing={missing}
                      provenance={fieldSources?.[field.key]}
                    />
                    <div className="mt-1">
                      {editable && onFieldChange ? (
                        <InlineDateInput
                          value={rawValue}
                          onChange={(value) => onFieldChange(field.key, value)}
                          placeholder="Select date"
                          menuZIndex={110}
                          className="w-full max-w-[280px]"
                        />
                      ) : displayValue ? (
                        <p className="text-[13px] font-normal text-brand-ink">
                          {displayValue}
                        </p>
                      ) : (
                        <p className="text-[13px] text-brand-ink-tertiary">
                          Not set
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              if (
                field.key === "sendingEightCountSheets" ||
                field.key === "usingEightCountSheets"
              ) {
                const yesNoDisplay =
                  normalizeYesNo(rawValue) || displayValue;
                return (
                  <div
                    key={field.key}
                    className={clsx("flex min-w-0 flex-col", spanClass)}
                  >
                    <FieldLabel
                      label={field.label}
                      optional={optional}
                      requiredMark={requiredMark}
                      missing={missing}
                      provenance={fieldSources?.[field.key]}
                    />
                    <div className="mt-1">
                      {editable && onFieldChange ? (
                        <YesNoField
                          value={rawValue}
                          aria-label={field.label}
                          onChange={(value) => onFieldChange(field.key, value)}
                        />
                      ) : yesNoDisplay ? (
                        <p className="text-[13px] font-normal text-brand-ink">
                          {yesNoDisplay}
                        </p>
                      ) : (
                        <p className="text-[13px] text-brand-ink-tertiary">
                          Not set
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              if (field.key === "howDidYouFindOut") {
                const sourceDisplay =
                  normalizeHowDidYouFindOut(rawValue) || displayValue;
                return (
                  <div
                    key={field.key}
                    className={clsx("flex min-w-0 flex-col", spanClass)}
                  >
                    <FieldLabel
                      label={field.label}
                      optional={optional}
                      requiredMark={requiredMark}
                      missing={missing}
                      provenance={fieldSources?.[field.key]}
                    />
                    <div className="mt-1">
                      {editable && onFieldChange ? (
                        <HowDidYouFindOutField
                          value={rawValue}
                          aria-label={field.label}
                          onChange={(value) => onFieldChange(field.key, value)}
                        />
                      ) : sourceDisplay ? (
                        <p className="text-[13px] font-normal text-brand-ink">
                          {sourceDisplay}
                        </p>
                      ) : (
                        <p className="text-[13px] text-brand-ink-tertiary">
                          Not set
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              if (field.key === "requestedEditor") {
                const producerDisplay = formatRequestedProducerDisplay(
                  rawValue,
                  producers
                );
                return (
                  <div
                    key={field.key}
                    className={clsx("flex min-w-0 flex-col", spanClass)}
                  >
                    <FieldLabel
                      label={field.label}
                      optional={optional}
                      requiredMark={requiredMark}
                      missing={missing}
                      provenance={fieldSources?.[field.key]}
                    />
                    <div className="mt-1">
                      {editable && onFieldChange ? (
                        <RequestedProducerField
                          value={rawValue}
                          originalValue={
                            originalOrder
                              ? rawFieldValue(originalOrder, field.key)
                              : rawValue
                          }
                          producers={producers}
                          onChange={(value) => onFieldChange(field.key, value)}
                        />
                      ) : (
                        <p
                          className={clsx(
                            "text-[13px] font-normal",
                            producerDisplay === "First Available"
                              ? "text-brand-info"
                              : "text-brand-ink"
                          )}
                        >
                          {producerDisplay}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              if (field.key === "packageType") {
                const packageValue =
                  packageTypeDisplayValue(rawValue) ||
                  packageTypeDisplayValue(order.package || "") ||
                  "";
                const originalPackage =
                  packageTypeDisplayValue(
                    originalOrder
                      ? rawFieldValue(originalOrder, field.key)
                      : ""
                  ) ||
                  packageTypeDisplayValue(originalOrder?.package || "") ||
                  packageValue;

                return (
                  <div
                    key={field.key}
                    className={clsx("flex min-w-0 flex-col", spanClass)}
                  >
                    <FieldLabel
                      label={field.label}
                      optional={optional}
                      requiredMark={requiredMark}
                      missing={missing}
                      provenance={fieldSources?.[field.key]}
                    />
                    <div className="mt-1">
                      {editable && onFieldChange ? (
                        <PackageTypeField
                          value={packageValue}
                          originalValue={originalPackage}
                          formType={order.formType || "school-all-star-cheer"}
                          cheerSubtype={order.cheerFormSubtype}
                          danceSubtype={order.danceFormSubtype}
                          onChange={(value) => onFieldChange(field.key, value)}
                        />
                      ) : packageValue ? (
                        <p className="text-[13px] font-normal text-brand-ink">
                          {packageValue}
                        </p>
                      ) : (
                        <p className="text-[13px] text-brand-ink-tertiary">
                          Not set
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              if (field.key === "timeLengthOfMix") {
                // Non-cheer forms use free-text mix length (not rate-card SoftSelect).
                if (order.formType !== "school-all-star-cheer") {
                  const isGameday = order.danceFormSubtype === "gameday";
                  return (
                    <div
                      key={field.key}
                      className={clsx("flex min-w-0 flex-col", spanClass)}
                    >
                      <FieldLabel
                        label={field.label}
                        optional={optional}
                        requiredMark={requiredMark}
                        missing={missing || placeholderInvalid}
                        provenance={fieldSources?.[field.key]}
                      />
                      <div className="mt-1">
                        {editable && onFieldChange ? (
                          <DetailInput
                            value={rawValue}
                            placeholder={
                              isGameday
                                ? "This mix can be max 1:00"
                                : "1:50-1:55"
                            }
                            onChange={(value) =>
                              onFieldChange(field.key, value)
                            }
                            className={
                              missing || placeholderInvalid
                                ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                                : undefined
                            }
                          />
                        ) : displayValue ? (
                          <p className="text-[13px] font-normal tabular-nums text-brand-ink">
                            {displayValue}
                          </p>
                        ) : (
                          <p className="text-[13px] text-brand-ink-tertiary">
                            Not set
                          </p>
                        )}
                        {editable && placeholderInvalid ? (
                          <p className="mt-1 text-[11px] text-[#901313]">
                            {placeholderFieldErrorMessage(rawValue)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                }

                const fromPackage = parsePackage(
                  order.package || order.packageType || ""
                ).limit;
                const mixLengthValue =
                  rawValue.trim() ||
                  (fromPackage && fromPackage !== "-" ? fromPackage : "") ||
                  "";
                const originalMixLength = originalOrder
                  ? rawFieldValue(originalOrder, field.key).trim() ||
                    (() => {
                      const limit = parsePackage(
                        originalOrder.package ||
                          originalOrder.packageType ||
                          ""
                      ).limit;
                      return limit && limit !== "-" ? limit : "";
                    })() ||
                    mixLengthValue
                  : mixLengthValue;

                return (
                  <div
                    key={field.key}
                    className={clsx("flex min-w-0 flex-col", spanClass)}
                  >
                    <FieldLabel
                      label={field.label}
                      optional={optional}
                      requiredMark={requiredMark}
                      missing={missing}
                      provenance={fieldSources?.[field.key]}
                    />
                    <div className="mt-1">
                      {editable && onFieldChange ? (
                        <MixLengthField
                          value={mixLengthValue}
                          originalValue={originalMixLength}
                          formType={order.formType || "school-all-star-cheer"}
                          cheerSubtype={order.cheerFormSubtype}
                          danceSubtype={order.danceFormSubtype}
                          onChange={(value) => onFieldChange(field.key, value)}
                        />
                      ) : mixLengthValue ? (
                        <p className="text-[13px] font-normal tabular-nums text-brand-ink">
                          {mixLengthValue}
                        </p>
                      ) : (
                        <p className="text-[13px] text-brand-ink-tertiary">
                          Not set
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              if (field.key === "numberOfCopies") {
                const copiesDisplay = rawValue.trim() || "1";
                return (
                  <div
                    key={field.key}
                    className={clsx("flex min-w-0 flex-col", spanClass)}
                  >
                    <FieldLabel
                      label={field.label}
                      optional={optional}
                      requiredMark={requiredMark}
                      missing={missing}
                      provenance={fieldSources?.[field.key]}
                    />
                    <div className="mt-1">
                      {editable && onFieldChange ? (
                        <DetailInput
                          type="text"
                          inputMode="numeric"
                          value={rawValue}
                          placeholder="1"
                          onChange={(value) => {
                            // Allow empty while typing; clamp only when digits present.
                            const digits = value.replace(/[^\d]/g, "");
                            if (!digits) {
                              onFieldChange(field.key, "");
                              return;
                            }
                            const n = Math.min(40, parseInt(digits, 10) || 0);
                            onFieldChange(
                              field.key,
                              n < 1 ? digits : String(n)
                            );
                          }}
                          className="w-full max-w-[220px]"
                        />
                      ) : (
                        <p className="text-[13px] font-normal tabular-nums text-brand-ink">
                          {copiesDisplay}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              const emailField = isOrderEmailFieldKey(field.key);
              const inputInvalid =
                missing || emailInvalid || placeholderInvalid;

              return (
                <div
                  key={field.key}
                  className={clsx("flex min-w-0 flex-col", spanClass)}
                >
                  <FieldLabel
                    label={field.label}
                    optional={optional}
                    requiredMark={requiredMark}
                    missing={missing || emailInvalid || placeholderInvalid}
                    provenance={fieldSources?.[field.key]}
                  />
                  <div className="mt-1">
                    {editable && onFieldChange ? (
                      useTextarea ? (
                        <DetailTextarea
                          value={rawValue}
                          onChange={(value) => onFieldChange(field.key, value)}
                          rows={spanClass.includes("lg:col-span-3") ? 3 : 2}
                          className={
                            inputInvalid
                              ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                              : undefined
                          }
                        />
                      ) : (
                        <DetailInput
                          type={emailField ? "email" : "text"}
                          inputMode={emailField ? "email" : undefined}
                          value={rawValue}
                          onChange={(value) => onFieldChange(field.key, value)}
                          className={
                            inputInvalid
                              ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                              : undefined
                          }
                        />
                      )
                    ) : displayValue ? (
                      <p
                        className={
                          useTextarea
                            ? "whitespace-pre-wrap text-[13px] font-normal leading-snug text-brand-ink"
                            : "text-[13px] font-normal text-brand-ink"
                        }
                      >
                        {displayValue}
                      </p>
                    ) : (
                      <p className="text-[13px] text-brand-ink-tertiary">
                        Not set
                      </p>
                    )}
                    {editable && emailInvalid ? (
                      <p className="mt-1 text-[11px] text-[#901313]">
                        Enter a valid email
                      </p>
                    ) : null}
                    {editable && !emailInvalid && placeholderInvalid ? (
                      <p className="mt-1 text-[11px] text-[#901313]">
                        {placeholderFieldErrorMessage(rawValue)}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
            ) : null}
          </div>
        </section>
        );
      })}
    </div>
  );
}
