"use client";

import { useMemo, useRef, useState } from "react";
import { SoftSelect } from "@/components/ui/SoftSelect";
import {
  formatMixDuration,
  isValidMixDuration,
  MIX_LENGTH_OTHER_OPTION,
  mixLengthUsesDurationInputsOnly,
  normalizeMixDurationValue,
  parseMixDurationParts,
} from "@/lib/mix-duration";
import {
  isCheerOtherMixLength,
  mixLengthsForOrderForm,
  SCHOOL_CHEER_MAGENTO_MIX_OTHER,
  YOUTH_REC_MIX_OTHER,
} from "@/lib/pricing-engine";
import type {
  CheerFormSubtype,
  DanceFormSubtype,
  OrderFormType,
} from "@/types";

type SoftOption = { value: string; label: string };

type MixLengthFieldProps = {
  value: string;
  originalValue?: string;
  formType: OrderFormType;
  cheerSubtype?: CheerFormSubtype | null;
  danceSubtype?: DanceFormSubtype | null;
  onChange: (value: string) => void;
};

function sameOption(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function isOtherCatalogLabel(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (sameOption(trimmed, MIX_LENGTH_OTHER_OPTION)) return true;
  if (sameOption(trimmed, YOUTH_REC_MIX_OTHER)) return true;
  if (trimmed === SCHOOL_CHEER_MAGENTO_MIX_OTHER) return true;
  return /^other\b/i.test(trimmed);
}

function normalizeMixLength(
  raw: string,
  cheerSubtype?: CheerFormSubtype | null
): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (isOtherCatalogLabel(trimmed)) {
    return MIX_LENGTH_OTHER_OPTION;
  }
  // Prefer a leading m:ss (or Magento bare minutes) via shared normalizer.
  const asDuration = normalizeMixDurationValue(trimmed);
  if (asDuration && isValidMixDuration(asDuration)) {
    // Magento SoftSelect has no 2:15: map legacy Youth Rec 2:15 → 2:30.
    if (cheerSubtype === "youth-rec-cheer" && asDuration === "2:15") {
      return "2:30";
    }
    return asDuration;
  }
  if (/^tbd$/i.test(trimmed)) return "TBD";
  return trimmed;
}

function presetLengths(
  catalog: string[],
  cheerSubtype?: CheerFormSubtype | null
): string[] {
  const list: string[] = [];
  const seen = new Set<string>();
  for (const length of catalog) {
    const normalized = normalizeMixLength(length, cheerSubtype);
    if (!normalized || isOtherCatalogLabel(normalized)) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(normalized);
  }
  return list;
}

export function MixLengthField({
  value,
  originalValue,
  formType,
  cheerSubtype,
  danceSubtype,
  onChange,
}: MixLengthFieldProps) {
  const [open, setOpen] = useState(false);
  // True after user picks Other before a custom duration is saved.
  const [otherPicked, setOtherPicked] = useState(false);

  const originalRawRef = useRef<string | null>(null);
  if (originalRawRef.current === null) {
    originalRawRef.current = (originalValue ?? value).trim();
  }
  const originalRaw = originalRawRef.current;
  const originalNormalized = normalizeMixLength(originalRaw, cheerSubtype);
  const currentNormalized = normalizeMixLength(value, cheerSubtype);

  const catalog = useMemo(
    () => mixLengthsForOrderForm(formType, cheerSubtype, danceSubtype),
    [formType, cheerSubtype, danceSubtype]
  );

  const presets = useMemo(
    () => presetLengths(catalog, cheerSubtype),
    [catalog, cheerSubtype]
  );

  const valueIsPreset = presets.some((length) =>
    sameOption(length, currentNormalized)
  );
  const valueIsCustomDuration = isValidMixDuration(currentNormalized);
  const valueIsOtherToken =
    isCheerOtherMixLength(value) ||
    isOtherCatalogLabel(currentNormalized) ||
    currentNormalized === MIX_LENGTH_OTHER_OPTION;

  const showCustomTime =
    otherPicked ||
    valueIsOtherToken ||
    (Boolean(currentNormalized) && !valueIsPreset && valueIsCustomDuration);

  const options = useMemo(() => {
    const seen = new Set<string>();
    const list: SoftOption[] = [];
    const push = (length: string, label = length) => {
      const key = length.trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      list.push({ value: length, label });
    };

    for (const length of presets) push(length);

    // Always offer TBD (Add Order default); keep other non-duration labels too.
    push("TBD", "TBD");
    for (const label of [originalNormalized, currentNormalized]) {
      if (
        label &&
        !isOtherCatalogLabel(label) &&
        !presets.some((length) => sameOption(length, label)) &&
        !isValidMixDuration(label) &&
        !sameOption(label, "TBD")
      ) {
        list.unshift({ value: label, label });
        break;
      }
    }

    push(MIX_LENGTH_OTHER_OPTION, MIX_LENGTH_OTHER_OPTION);
    return list;
  }, [presets, originalNormalized, currentNormalized]);

  const selectValue = showCustomTime
    ? MIX_LENGTH_OTHER_OPTION
    : valueIsPreset
      ? presets.find((length) => sameOption(length, currentNormalized)) ||
        currentNormalized
      : currentNormalized && !isOtherCatalogLabel(currentNormalized)
        ? currentNormalized
        : "";

  // MB + SE: Magento freeform Time Length (often bare minutes).
  // Cheer/Dance: SoftSelect presets; custom/bare minutes open min:sec under Other.
  const durationOnly = mixLengthUsesDurationInputsOnly(formType);
  const mixParts = parseMixDurationParts(
    durationOnly || valueIsCustomDuration || showCustomTime
      ? currentNormalized
      : ""
  );

  const durationInputs = (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor="mix-length-other-minutes">
        Minutes
      </label>
      <input
        id="mix-length-other-minutes"
        type="number"
        inputMode="numeric"
        min={0}
        max={99}
        step={1}
        value={mixParts.minutes}
        onChange={(e) => {
          const nextMins = e.target.value.replace(/[^\d]/g, "").slice(0, 3);
          onChange(formatMixDuration(nextMins, mixParts.seconds || "00"));
        }}
        placeholder="0"
        className="h-10 w-[88px] rounded-xl border border-brand-line/60 bg-white px-3 text-center text-[13px] tabular-nums text-brand-ink shadow-[0_1px_1px_rgba(15,30,45,0.04)] outline-none transition-colors hover:border-brand-line-strong focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
        autoFocus={durationOnly || showCustomTime}
      />
      <span
        className="text-[15px] font-semibold text-brand-ink-secondary"
        aria-hidden
      >
        :
      </span>
      <label className="sr-only" htmlFor="mix-length-other-seconds">
        Seconds
      </label>
      <input
        id="mix-length-other-seconds"
        type="number"
        inputMode="numeric"
        min={0}
        max={59}
        step={1}
        value={mixParts.seconds}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d]/g, "").slice(0, 2);
          const capped =
            raw === ""
              ? ""
              : String(Math.min(59, Number(raw))).padStart(
                  raw.length >= 2 ? 2 : raw.length,
                  "0"
                );
          onChange(formatMixDuration(mixParts.minutes || "0", capped));
        }}
        placeholder="00"
        className="h-10 w-[88px] rounded-xl border border-brand-line/60 bg-white px-3 text-center text-[13px] tabular-nums text-brand-ink shadow-[0_1px_1px_rgba(15,30,45,0.04)] outline-none transition-colors hover:border-brand-line-strong focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15"
      />
      <span className="text-[11px] text-brand-ink-tertiary">min : sec</span>
    </div>
  );

  if (durationOnly) {
    return durationInputs;
  }

  return (
    <div className="space-y-2">
      <SoftSelect
        aria-label="Length of Mix"
        size="md"
        placeholder="Select length…"
        placement="auto"
        searchable={false}
        allowCustomValue={false}
        value={selectValue}
        options={options}
        open={open}
        onOpenChange={setOpen}
        onChange={(next) => {
          const resolved = normalizeMixLength(next, cheerSubtype) || next;
          if (sameOption(resolved, MIX_LENGTH_OTHER_OPTION)) {
            setOtherPicked(true);
            // Clear Magento "Other…" placeholder so Mix Time stays incomplete
            // until a real duration is entered.
            if (
              isCheerOtherMixLength(value) ||
              isOtherCatalogLabel(value) ||
              !isValidMixDuration(value)
            ) {
              onChange("");
            }
            setOpen(false);
            return;
          }
          setOtherPicked(false);
          if (originalNormalized && sameOption(resolved, originalNormalized)) {
            onChange(originalNormalized);
          } else {
            onChange(resolved);
          }
          setOpen(false);
        }}
        className="w-full"
      />

      {showCustomTime ? durationInputs : null}
    </div>
  );
}
