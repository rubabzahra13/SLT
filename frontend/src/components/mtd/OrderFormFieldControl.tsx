"use client";

import { CouponCodeField } from "@/components/mtd/CouponCodeField";
import { CountryField } from "@/components/mtd/CountryField";
import { MixLengthField } from "@/components/mtd/MixLengthField";
import {
  PackageTypeField,
  packageTypeDisplayValue,
} from "@/components/mtd/PackageTypeField";
import { RequestedProducerField } from "@/components/mtd/RequestedProducerField";
import { TeamCoedField } from "@/components/mtd/TeamCoedField";
import { YesNoField } from "@/components/mtd/YesNoField";
import { HowDidYouFindOutField } from "@/components/mtd/HowDidYouFindOutField";
import { MusicAffiliateField } from "@/components/mtd/MusicAffiliateField";
import { DanceMusicAffiliateField } from "@/components/mtd/DanceMusicAffiliateField";
import { CustomVoiceoversField } from "@/components/mtd/CustomVoiceoversField";
import { DanceStyleField } from "@/components/mtd/DanceStyleField";
import { GamedayStyleField } from "@/components/mtd/GamedayStyleField";
import { VocalsPreferenceField } from "@/components/mtd/VocalsPreferenceField";
import { SplitOrNoSplitField } from "@/components/mtd/SplitOrNoSplitField";
import {
  DetailInput,
  DetailTextarea,
  InlineDateInput,
  InlineInput,
  InlineTextarea,
} from "@/components/mtd/InlineFields";
import { parsePackage } from "@/lib/package";
import { rawFieldValue } from "@/lib/order-detail-fields";
import clsx from "clsx";
import type { DiscountCode, Order, Producer } from "@/types";

type OrderFormFieldControlProps = {
  fieldKey: string;
  order: Order;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  producers?: Producer[];
  discountCodes?: DiscountCode[];
  readOnly?: boolean;
  className?: string;
  /** Compact styling for match-modal table cells. */
  compact?: boolean;
  emphasized?: boolean;
  /** Override empty-field placeholder (match modal hints edit later in Orders). */
  placeholder?: string;
};

/**
 * Same control types as MTDOrderDetails / Edit order form for a given field key.
 */
export function OrderFormFieldControl({
  fieldKey,
  order,
  value,
  onChange,
  multiline = false,
  producers = [],
  discountCodes = [],
  readOnly = false,
  className,
  compact = false,
  emphasized = false,
  placeholder,
}: OrderFormFieldControlProps) {
  const emptyPlaceholder =
    placeholder ||
    (compact ? "Enter value. You can change later in Orders" : "Enter value");
  if (readOnly) {
    return (
      <span className="text-[12px] text-brand-ink-secondary">
        {value.trim() || "-"}
      </span>
    );
  }

  // Emphasized rose border lives on the control itself — no wrapper ring
  // (that stacked with the input border and looked like a doubled line).
  // Compact match cells: size selects down so they don't dwarf text inputs.
  const wrapClass = clsx(
    "min-w-0 max-w-full overflow-hidden",
    compact &&
      // Lock SoftSelect triggers to one line — long affiliate labels must
      // ellipsis, not grow the match-table row.
      "[&_button]:!box-border [&_button]:!flex [&_button]:!h-8 [&_button]:!max-h-8 [&_button]:!min-h-8 [&_button]:!overflow-hidden [&_button]:!rounded-lg [&_button]:!px-2.5 [&_button]:!text-[12px] [&_button]:!whitespace-nowrap [&_button>span]:!min-w-0 [&_button>span]:!flex-1 [&_button>span]:!truncate",
    compact &&
      emphasized &&
      "[&_button]:!border-rose-300 [&_button]:!bg-rose-50/60 [&_button]:!text-rose-800",
    className
  );
  // Use InlineInput in compact mode — DetailInput stacks a second size scale
  // (min-h-36 / text-13) on top of h-8 and looks like a glitchy double style.
  const compactInputClass = clsx(
    compact && emphasized &&
      "!border-rose-300 !bg-rose-50/60 !text-rose-800 placeholder:!font-semibold placeholder:!text-rose-600/80 focus:!border-rose-400 focus:!ring-0",
    compact && !emphasized && "focus:!ring-brand-blue/15"
  );

  if (fieldKey === "couponCode") {
    return (
      <div className={wrapClass}>
        <CouponCodeField
          value={value}
          discountCodes={discountCodes}
          editable
          onChange={onChange}
        />
      </div>
    );
  }

  if (fieldKey === "country") {
    return (
      <div className={wrapClass}>
        <CountryField value={value} onChange={onChange} />
      </div>
    );
  }

  if (fieldKey === "teamCoedAllGirl") {
    return (
      <div className={wrapClass}>
        <TeamCoedField value={value} onChange={onChange} />
      </div>
    );
  }

  if (fieldKey === "splitOrNoSplit") {
    return (
      <div className={wrapClass}>
        <SplitOrNoSplitField
          value={value}
          aria-label="Split or no split"
          onChange={onChange}
        />
      </div>
    );
  }

  if (
    fieldKey === "musicAffiliate" &&
    order.formType === "school-all-star-dance"
  ) {
    return (
      <div className={wrapClass}>
        <DanceMusicAffiliateField
          value={value}
          aria-label="Music affiliate"
          onChange={onChange}
        />
      </div>
    );
  }

  if (
    fieldKey === "musicAffiliate" &&
    order.formType === "school-all-star-cheer" &&
    order.cheerFormSubtype !== "youth-rec-cheer"
  ) {
    return (
      <div className={wrapClass}>
        <MusicAffiliateField
          value={value}
          formType={order.formType}
          cheerSubtype={order.cheerFormSubtype}
          packageType={order.packageType || order.package || null}
          aria-label="Music affiliate"
          onChange={onChange}
        />
      </div>
    );
  }

  if (fieldKey === "customVoiceovers") {
    const voVariant =
      order.danceFormSubtype === "gameday" ||
      order.danceFormSubtype === "jazz-kick"
        ? "gameday"
        : "dance";
    return (
      <div className={wrapClass}>
        <CustomVoiceoversField
          value={value}
          variant={voVariant}
          aria-label="Custom voiceovers"
          onChange={onChange}
        />
      </div>
    );
  }

  if (fieldKey === "styleOfGamedayMix") {
    return (
      <div className={wrapClass}>
        <GamedayStyleField
          value={value}
          aria-label="Style of gameday mix"
          onChange={onChange}
        />
      </div>
    );
  }

  if (fieldKey === "style") {
    const styleVariant =
      order.danceFormSubtype === "jazz-kick" ? "jazz-kick" : "tpv";
    return (
      <div className={wrapClass}>
        <DanceStyleField
          value={value}
          variant={styleVariant}
          aria-label="Style"
          onChange={onChange}
        />
      </div>
    );
  }

  if (
    fieldKey === "licensingRequired" ||
    fieldKey === "isRushOrder" ||
    fieldKey === "clientRequestedRushOrder" ||
    fieldKey === "sendingEightCountSheets" ||
    fieldKey === "usingEightCountSheets"
  ) {
    return (
      <div className={wrapClass}>
        <YesNoField value={value} onChange={onChange} />
      </div>
    );
  }

  if (fieldKey === "vocalsPreference") {
    return (
      <div className={wrapClass}>
        <VocalsPreferenceField
          value={value}
          aria-label="Vocals preference"
          onChange={onChange}
        />
      </div>
    );
  }

  if (
    fieldKey === "mixEndDate" ||
    fieldKey === "clientRequestedMixDueDate"
  ) {
    return (
      <div className={wrapClass}>
        <InlineDateInput
          value={value}
          onChange={onChange}
          className="w-full"
          menuZIndex={120}
        />
      </div>
    );
  }

  if (fieldKey === "howDidYouFindOut") {
    return (
      <div className={wrapClass}>
        <HowDidYouFindOutField
          value={value}
          aria-label="How did you find out"
          onChange={onChange}
        />
      </div>
    );
  }

  if (fieldKey === "requestedEditor") {
    return (
      <div className={wrapClass}>
        <RequestedProducerField
          value={value}
          originalValue={value}
          producers={producers}
          onChange={onChange}
        />
      </div>
    );
  }

  if (fieldKey === "packageType") {
    const packageValue =
      packageTypeDisplayValue(value) ||
      packageTypeDisplayValue(order.package || "") ||
      "";
    return (
      <div className={wrapClass}>
        <PackageTypeField
          value={packageValue}
          originalValue={packageValue}
          formType={order.formType || "school-all-star-cheer"}
          cheerSubtype={order.cheerFormSubtype}
          danceSubtype={order.danceFormSubtype}
          onChange={onChange}
        />
      </div>
    );
  }

  if (fieldKey === "timeLengthOfMix") {
    const fromPackage = parsePackage(
      order.package || order.packageType || ""
    ).limit;
    const mixLengthValue =
      value.trim() ||
      (fromPackage && fromPackage !== "-" ? fromPackage : "") ||
      "";
    return (
      <div className={wrapClass}>
        <MixLengthField
          value={mixLengthValue}
          originalValue={mixLengthValue}
          formType={order.formType || "school-all-star-cheer"}
          cheerSubtype={order.cheerFormSubtype}
          danceSubtype={order.danceFormSubtype}
          onChange={onChange}
        />
      </div>
    );
  }

  if (fieldKey === "numberOfCopies") {
    const CopiesInput = compact ? InlineInput : DetailInput;
    return (
      <div className={wrapClass}>
        <CopiesInput
          type="text"
          inputMode="numeric"
          value={value}
          placeholder="1"
          onChange={(next) => {
            const digits = next.replace(/[^\d]/g, "");
            if (!digits) {
              onChange("");
              return;
            }
            const n = Math.min(40, parseInt(digits, 10) || 0);
            onChange(n < 1 ? digits : String(n));
          }}
          className={compactInputClass || undefined}
        />
      </div>
    );
  }

  // Same control type as Add Order / form editor: multiline → textarea.
  // Compact match table: fixed 2 rows + no resize so the row doesn't jump.
  if (multiline) {
    if (compact) {
      return (
        <div className={wrapClass}>
          <InlineTextarea
            value={value}
            onChange={onChange}
            rows={2}
            placeholder={emptyPlaceholder}
            className={clsx(
              "!resize-none !text-[12px] !leading-snug",
              compactInputClass || undefined
            )}
          />
        </div>
      );
    }
    return (
      <div className={wrapClass}>
        <DetailTextarea
          value={value}
          onChange={onChange}
          rows={3}
          placeholder={emptyPlaceholder}
        />
      </div>
    );
  }

  if (compact) {
    return (
      <div className={wrapClass}>
        <InlineInput
          value={value}
          onChange={onChange}
          placeholder={emptyPlaceholder}
          className={compactInputClass || undefined}
        />
      </div>
    );
  }

  return (
    <div className={wrapClass}>
      <DetailInput
        value={value}
        onChange={onChange}
        placeholder={emptyPlaceholder}
      />
    </div>
  );
}

/** Convenience: read current draft value for a key. */
export function orderFormControlValue(order: Order, fieldKey: string): string {
  return rawFieldValue(order, fieldKey);
}
