"use client";

import { useMemo, useState } from "react";
import { SoftSelect } from "@/components/ui/SoftSelect";

/** School Anthem customer-form vocals SoftSelect options. */
export const VOCALS_PREFERENCE_OPTIONS = [
  "Male vocals",
  "Female vocals",
  "Male and Female vocals (50/50)",
  "Male vocals version and Female vocals version (2 versions)",
] as const;

export function normalizeVocalsPreference(value: string): string {
  const raw = value?.trim() || "";
  if (!raw) return "";
  const exact = VOCALS_PREFERENCE_OPTIONS.find(
    (opt) => opt.toLowerCase() === raw.toLowerCase().replace(/\.$/, "")
  );
  if (exact) return exact;

  const lower = raw.toLowerCase();
  // Two separate versions ($250): check before generic male+female
  if (
    lower.includes("2 version") ||
    lower.includes("two version") ||
    (lower.includes("version") &&
      lower.includes("male") &&
      lower.includes("female"))
  ) {
    return "Male vocals version and Female vocals version (2 versions)";
  }
  // 50/50 mixed ($150)
  if (
    lower.includes("50/50") ||
    lower.includes("mixed") ||
    lower.includes("both") ||
    (lower.includes("male") && lower.includes("female"))
  ) {
    return "Male and Female vocals (50/50)";
  }
  if (lower.includes("male") && !lower.includes("female")) return "Male vocals";
  if (lower.includes("female") && !lower.includes("male")) {
    return "Female vocals";
  }
  // Unknown legacy values (e.g. choir/group): keep as-is for SoftSelect one-off
  return raw.replace(/\.$/, "");
}

type VocalsPreferenceFieldProps = {
  value: string;
  onChange: (value: string) => void;
  "aria-label"?: string;
};

export function VocalsPreferenceField({
  value,
  onChange,
  "aria-label": ariaLabel = "Vocals Preference",
}: VocalsPreferenceFieldProps) {
  const [open, setOpen] = useState(false);
  const normalized = normalizeVocalsPreference(value);
  const options = useMemo(() => {
    const base = VOCALS_PREFERENCE_OPTIONS.map((opt) => ({
      value: opt,
      label: opt,
    }));
    if (
      normalized &&
      !VOCALS_PREFERENCE_OPTIONS.some((opt) => opt === normalized)
    ) {
      return [{ value: normalized, label: normalized }, ...base];
    }
    return base;
  }, [normalized]);

  return (
    <SoftSelect
      aria-label={ariaLabel}
      size="md"
      placeholder="Please choose one…"
      placement="below"
      value={normalized || value}
      options={options}
      open={open}
      onOpenChange={setOpen}
      onChange={(next) => {
        onChange(normalizeVocalsPreference(next) || next);
        setOpen(false);
      }}
      className="w-full"
    />
  );
}
