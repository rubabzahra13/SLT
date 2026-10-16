"use client";

import { useMemo, useRef, useState } from "react";
import { SoftSelect } from "@/components/ui/SoftSelect";
import {
  isSchoolCheerSubtype,
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

function normalizeMixLength(
  raw: string,
  cheerSubtype?: CheerFormSubtype | null
): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Magento SoftSelect "Other…" — keep full label when already stored.
  if (
    isSchoolCheerSubtype(cheerSubtype) &&
    (trimmed === SCHOOL_CHEER_MAGENTO_MIX_OTHER ||
      /^other\b/i.test(trimmed))
  ) {
    return SCHOOL_CHEER_MAGENTO_MIX_OTHER;
  }
  if (
    cheerSubtype === "youth-rec-cheer" &&
    (trimmed === YOUTH_REC_MIX_OTHER || /^other\b/i.test(trimmed))
  ) {
    return YOUTH_REC_MIX_OTHER;
  }
  const match = trimmed.match(/\d+:\d{2}/);
  if (match) {
    // Magento SoftSelect has no 2:15 — map legacy Youth Rec 2:15 → 2:30.
    if (cheerSubtype === "youth-rec-cheer" && match[0] === "2:15") {
      return "2:30";
    }
    return match[0];
  }
  if (/^tbd$/i.test(trimmed)) return "TBD";
  return trimmed;
}

function resolveCustomMixLength(
  typed: string,
  cheerSubtype?: CheerFormSubtype | null
): string {
  const trimmed = typed.trim();
  if (!trimmed) return "";
  if (/^other\b/i.test(trimmed)) {
    return cheerSubtype === "youth-rec-cheer"
      ? YOUTH_REC_MIX_OTHER
      : isSchoolCheerSubtype(cheerSubtype)
        ? SCHOOL_CHEER_MAGENTO_MIX_OTHER
        : trimmed;
  }
  const match = trimmed.match(/\d+:\d{2}/);
  if (match) return match[0];
  return trimmed;
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

  const allowCustom =
    cheerSubtype === "youth-rec-cheer" || isSchoolCheerSubtype(cheerSubtype);

  const options = useMemo(() => {
    const seen = new Set<string>();
    const list: SoftOption[] = [];
    const push = (length: string) => {
      const key = length.trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      list.push({ value: length, label: length });
    };

    for (const length of catalog) push(length);

    if (
      originalNormalized &&
      !catalog.some((length) => sameOption(length, originalNormalized))
    ) {
      list.unshift({ value: originalNormalized, label: originalNormalized });
    }

    if (
      currentNormalized &&
      !list.some((opt) => sameOption(opt.value, currentNormalized))
    ) {
      list.unshift({ value: currentNormalized, label: currentNormalized });
    }

    return list;
  }, [catalog, originalNormalized, currentNormalized]);

  const selectValue = (() => {
    if (!currentNormalized) return "";
    const matched = catalog.find((length) =>
      sameOption(length, currentNormalized)
    );
    if (matched) return matched;
    return currentNormalized;
  })();

  return (
    <SoftSelect
      aria-label="Length of Mix"
      size="md"
      placeholder="Select length…"
      placement="below"
      searchable={allowCustom}
      searchPlaceholder={
        allowCustom ? "Search or type a custom limit…" : "Search…"
      }
      allowCustomValue={allowCustom}
      resolveCustomValue={(typed) =>
        resolveCustomMixLength(typed, cheerSubtype)
      }
      value={selectValue}
      options={options}
      open={open}
      onOpenChange={setOpen}
      onChange={(next) => {
        const resolved = normalizeMixLength(next, cheerSubtype) || next;
        if (originalNormalized && sameOption(resolved, originalNormalized)) {
          onChange(originalNormalized);
        } else {
          onChange(resolved);
        }
        setOpen(false);
      }}
      className="w-full"
    />
  );
}
