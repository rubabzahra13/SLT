"use client";

import { useMemo, useState } from "react";
import { SoftSelect } from "@/components/ui/SoftSelect";

/** Standard dance customer-form voiceover SoftSelect options. */
export const CUSTOM_VOICEOVER_OPTIONS = [
  "No - None",
  "Yes - Traditional $25",
  "Yes - Themed (up to 5) $75",
  "Yes - Both $100",
] as const;

/** Gameday form uses a simpler Yes ($25) option. */
export const GAMEDAY_VOICEOVER_OPTIONS = ["No - None", "Yes ($25)"] as const;

export type CustomVoiceoverVariant = "dance" | "gameday";

export function normalizeCustomVoiceovers(
  value: string,
  variant: CustomVoiceoverVariant = "dance"
): string {
  const raw = value?.trim() || "";
  if (!raw) return "";
  const lower = raw.toLowerCase();
  const catalog =
    variant === "gameday"
      ? GAMEDAY_VOICEOVER_OPTIONS
      : CUSTOM_VOICEOVER_OPTIONS;

  const exact = catalog.find((opt) => opt.toLowerCase() === lower);
  if (exact) return exact;

  if (
    lower === "no" ||
    lower === "n" ||
    lower.startsWith("no -") ||
    lower.includes("none")
  ) {
    return "No - None";
  }

  if (variant === "gameday") {
    if (lower.startsWith("yes") || lower.includes("$25")) return "Yes ($25)";
    return raw;
  }

  if (lower.includes("both") || lower.includes("$100")) {
    return "Yes - Both $100";
  }
  if (lower.includes("themed") || lower.includes("$75")) {
    return "Yes - Themed (up to 5) $75";
  }
  if (
    lower.includes("traditional") ||
    lower.includes("$25") ||
    lower === "yes" ||
    lower.startsWith("yes")
  ) {
    return "Yes - Traditional $25";
  }
  return raw;
}

type CustomVoiceoversFieldProps = {
  value: string;
  onChange: (value: string) => void;
  variant?: CustomVoiceoverVariant;
  "aria-label"?: string;
};

export function CustomVoiceoversField({
  value,
  onChange,
  variant = "dance",
  "aria-label": ariaLabel = "Custom Voiceovers for your Mix?",
}: CustomVoiceoversFieldProps) {
  const [open, setOpen] = useState(false);
  const catalog =
    variant === "gameday"
      ? GAMEDAY_VOICEOVER_OPTIONS
      : CUSTOM_VOICEOVER_OPTIONS;
  const normalized = normalizeCustomVoiceovers(value, variant);
  const options = useMemo(() => {
    const base = catalog.map((opt) => ({
      value: opt,
      label: opt,
    }));
    if (normalized && !catalog.some((opt) => opt === normalized)) {
      return [{ value: normalized, label: normalized }, ...base];
    }
    return base;
  }, [catalog, normalized]);

  return (
    <SoftSelect
      aria-label={ariaLabel}
      size="md"
      placeholder="Select…"
      placement="below"
      value={normalized || value}
      options={options}
      open={open}
      onOpenChange={setOpen}
      onChange={(next) => {
        onChange(normalizeCustomVoiceovers(next, variant) || next);
        setOpen(false);
      }}
      className="w-full"
    />
  );
}
