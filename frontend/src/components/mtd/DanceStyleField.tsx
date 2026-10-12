"use client";

import { useMemo, useState } from "react";
import { SoftSelect } from "@/components/ui/SoftSelect";

/** Team Performance & Variety customer-form Style SoftSelect options. */
export const TPV_STYLE_OPTIONS = ["Team Performance", "Variety"] as const;

/** Jazz/Kick customer-form Style SoftSelect options. */
export const JAZZ_KICK_STYLE_OPTIONS = ["Jazz", "Kick"] as const;

export type DanceStyleVariant = "tpv" | "jazz-kick";

/** @deprecated Prefer TPV_STYLE_OPTIONS */
export const DANCE_STYLE_OPTIONS = TPV_STYLE_OPTIONS;

export function normalizeDanceStyle(
  value: string,
  variant: DanceStyleVariant = "tpv"
): string {
  const raw = value?.trim() || "";
  if (!raw) return "";
  const catalog =
    variant === "jazz-kick" ? JAZZ_KICK_STYLE_OPTIONS : TPV_STYLE_OPTIONS;
  const exact = catalog.find((opt) => opt.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const lower = raw.toLowerCase();
  if (variant === "jazz-kick") {
    if (lower.includes("kick")) return "Kick";
    if (lower.includes("jazz")) return "Jazz";
    return raw;
  }
  if (lower.includes("team") && lower.includes("performance")) {
    return "Team Performance";
  }
  if (lower.includes("variety")) return "Variety";
  return raw;
}

type DanceStyleFieldProps = {
  value: string;
  onChange: (value: string) => void;
  variant?: DanceStyleVariant;
  "aria-label"?: string;
};

export function DanceStyleField({
  value,
  onChange,
  variant = "tpv",
  "aria-label": ariaLabel = "Style",
}: DanceStyleFieldProps) {
  const [open, setOpen] = useState(false);
  const catalog =
    variant === "jazz-kick" ? JAZZ_KICK_STYLE_OPTIONS : TPV_STYLE_OPTIONS;
  const normalized = normalizeDanceStyle(value, variant);
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
      placeholder="Select style…"
      placement="below"
      value={normalized || value}
      options={options}
      open={open}
      onOpenChange={setOpen}
      onChange={(next) => {
        onChange(normalizeDanceStyle(next, variant) || next);
        setOpen(false);
      }}
      className="w-full"
    />
  );
}
