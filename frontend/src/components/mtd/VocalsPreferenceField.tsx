"use client";

import { useMemo, useState } from "react";
import { SoftSelect } from "@/components/ui/SoftSelect";

/** School Anthem customer-form vocals SoftSelect options. */
export const VOCALS_PREFERENCE_OPTIONS = [
  "Male vocals",
  "Female vocals",
  "Mixed vocals",
  "Choir / Group vocals",
] as const;

export function normalizeVocalsPreference(value: string): string {
  const raw = value?.trim() || "";
  if (!raw) return "";
  const exact = VOCALS_PREFERENCE_OPTIONS.find(
    (opt) => opt.toLowerCase() === raw.toLowerCase().replace(/\.$/, "")
  );
  if (exact) return exact;
  const lower = raw.toLowerCase();
  if (lower.includes("male") && !lower.includes("female")) return "Male vocals";
  if (lower.includes("female")) return "Female vocals";
  if (lower.includes("mixed") || lower.includes("both")) return "Mixed vocals";
  if (lower.includes("choir") || lower.includes("group")) {
    return "Choir / Group vocals";
  }
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
