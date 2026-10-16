"use client";

import { useMemo, useRef, useState } from "react";
import { SoftSelect } from "@/components/ui/SoftSelect";
import {
  isSchoolCheerSubtype,
  mixLengthsForOrderForm,
  SCHOOL_CHEER_MAGENTO_MIX_OTHER,
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
  const match = trimmed.match(/\d+:\d{2}/);
  if (match) {
    // Magento SoftSelect has no 2:00 — map legacy School Cheer / VIROC → 2:15.
    if (isSchoolCheerSubtype(cheerSubtype) && match[0] === "2:00") {
      return "2:15";
    }
    return match[0];
  }
  if (/^tbd$/i.test(trimmed)) return "TBD";
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
      value={selectValue}
      options={options}
      open={open}
      onOpenChange={setOpen}
      onChange={(next) => {
        if (originalNormalized && sameOption(next, originalNormalized)) {
          onChange(originalNormalized);
        } else {
          onChange(next);
        }
        setOpen(false);
      }}
      className="w-full"
    />
  );
}
